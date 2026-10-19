import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiEdit3, FiImage, FiPlus, FiSearch, FiTrash2, FiUploadCloud, FiX } from "react-icons/fi";
import {
  uploadInstitutionalMedia,
  type InstitutionalCampaignValue, type InstitutionalChartValue,
  type InstitutionalFaqValue, type InstitutionalGalleryValue,
  type InstitutionalImageValue, type InstitutionalLayoutNode,
  type InstitutionalProgressValue, type InstitutionalStoryTabsValue,
  type InstitutionalVideoValue,
  type InstitutionalActionGridValue, type InstitutionalDonationChoicesValue,
  type InstitutionalTestimonialsValue, type InstitutionalTimelineValue,
} from "../../../services/institutionalService";
import { safeInstitutionalHref } from "../../../utils/institutionalLinks";
import { safeVideoEmbed } from "../renderer/RichElements";
import styles from "./RichElementInspector.module.css";
import FreeImageBrowser from "./FreeImageBrowser";

type RichKind = "campaign_card" | "media_gallery" | "video_embed" | "data_chart" | "story_tabs" | "faq" | "progress" | "community_timeline" | "testimonial_slider" | "action_grid" | "donation_choices";
type RichNode = Extract<InstitutionalLayoutNode, { type: "element" }>;
const kinds: readonly RichKind[] = ["campaign_card", "media_gallery", "video_embed", "data_chart", "story_tabs", "faq", "progress", "community_timeline", "testimonial_slider", "action_grid", "donation_choices"];
export function isRichElement(node: InstitutionalLayoutNode): node is RichNode {
  return node.type === "element" && kinds.some((kind) => kind === node.elementType);
}
const titles: Record<RichKind, string> = {
  campaign_card: "Campanha e arrecadação", media_gallery: "Galeria de fotos", video_embed: "Vídeo incorporado",
  data_chart: "Gráfico de impacto", story_tabs: "Abas interativas", faq: "Perguntas frequentes", progress: "Meta e progresso",
  community_timeline: "Linha do tempo", testimonial_slider: "Depoimentos navegáveis", action_grid: "Cartões de participação", donation_choices: "Opções de doação",
};
function Field({ label, value, onChange, multiline = false, hint, maxLength = 140 }: {
  label: string; value: string; onChange: (value: string) => void; multiline?: boolean; hint?: string; maxLength?: number;
}) {
  return <label className={styles.field}><span>{label}</span>{multiline
    ? <textarea rows={3} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} />
    : <input maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} />}
    {hint && <small>{hint}</small>}
  </label>;
}
function AddressField({ label, value, onChange, video = false }: { label: string; value: string; onChange: (value: string) => void; video?: boolean }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const valid = video
    ? !draft || safeVideoEmbed(draft) !== null || /^https:\/\/cdn\.pixabay\.com\/video\/[A-Za-z0-9/_-]+\.mp4$/.test(draft)
    : Boolean(safeInstitutionalHref(draft));
  return <label className={styles.field}><span>{label}</span>
    <input value={draft} maxLength={500} onChange={(event) => setDraft(event.target.value)}
      onBlur={() => { if (valid) onChange(draft.trim()); }}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (valid) { onChange(draft.trim()); event.currentTarget.blur(); } } }}
      aria-invalid={!valid} />
    {!valid && <small className={styles.error}>{video ? "Use um link HTTPS válido do YouTube, Vimeo ou Pixabay." : "Use uma página interna, URL HTTP(S), e-mail ou telefone válido."}</small>}
    <small>A alteração do endereço é aplicada ao sair do campo ou pressionar Enter.</small>
  </label>;
}

function Amount({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className={styles.field}><span>{label}</span><input type="number" min={0} max={1000000000} value={value}
    onChange={(event) => onChange(Math.max(0, Math.min(1e9, Number(event.target.value) || 0)))} /></label>;
}
export function CommonsSearch({ onChosen }: {
  onChosen: (file: File, label: string) => Promise<void>;
}) {
  return <FreeImageBrowser onChosen={onChosen} compact />;
}

function MediaPicker({ image, onChange, label = "Imagem", onClear }: {
  image: InstitutionalImageValue | null; onChange: (next: InstitutionalImageValue) => void; label?: string; onClear: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<"upload" | "library">("upload");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function send(file: File, alt?: string) {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
      setError("Use JPG, PNG ou WebP até 12 MB."); return;
    }
    setError(""); setWorking(true);
    try {
      const asset = await uploadInstitutionalMedia(file);
      onChange({ assetId: asset.id, url: asset.url, alt: (alt || image?.alt || label).slice(0, 240) });
      return true;
    } catch { setError("Falha ao enviar. Verifique sua conexão e tente novamente."); return false; }
    finally { setWorking(false); }
  }
  return <div className={styles.mediaPicker} onPaste={(event) => {
    const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
    if (file) { event.preventDefault(); void send(file); }
  }}>
    <div className={styles.mediaPreview}>{image?.url ? <img src={image.url} alt={image.alt} /> : <div><FiImage /><span>Escolha uma fotografia</span></div>}</div>
    <div className={styles.pickerActions}>
      <button type="button" data-active={source === "upload"} onClick={() => setSource("upload")}><FiUploadCloud /> Do computador</button>
      <button type="button" data-active={source === "library"} onClick={() => setSource("library")}><FiSearch /> Acervo gratuito</button>
      {image && <button type="button" onClick={onClear}><FiTrash2 /> Remover</button>}
    </div>
    {source === "upload" ? <div className={styles.uploadTarget} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files[0]) void send(event.dataTransfer.files[0]); }}>
      <FiUploadCloud /><span>Arraste, cole com Ctrl+V ou escolha uma imagem.</span>
      <button type="button" disabled={working} onClick={() => input.current?.click()}>{working ? "Enviando..." : "Escolher arquivo"}</button>
      <input hidden ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => { if (event.target.files?.[0]) void send(event.target.files[0]); event.target.value = ""; }} />
    </div> : <CommonsSearch onChosen={async (file, label) => { if (!(await send(file, label))) throw new Error("Não foi possível salvar a imagem na CONG."); }} />}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {image && <Field label="Descrição acessível da foto" maxLength={240} value={image.alt} onChange={(alt) => onChange({ ...image, alt: alt.slice(0, 240) })} />}
  </div>;
}
export default function RichElementInspector({ node, onChange }: { node: RichNode; onChange: (next: unknown) => void }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const kind = node.elementType as RichKind;
  useEffect(() => { if (!open) return; closeRef.current?.focus(); const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); opener.current?.focus(); }
    if (event.key === "Tab" && dialogRef.current) {
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }; document.addEventListener("keydown", onKey); return () => document.removeEventListener("keydown", onKey); }, [open]);
  const value = node.value;
  const setValue = (next: unknown) => onChange(next);
  useEffect(() => {
    const openOnDoubleClick = (event: Event) => {
      if ((event as CustomEvent<{ nodeId: string }>).detail?.nodeId === node.id) setOpen(true);
    };
    window.addEventListener("cong:edit-rich-element", openOnDoubleClick);
    return () => window.removeEventListener("cong:edit-rich-element", openOnDoubleClick);
  }, [node.id]);
  return <>
    <div className={styles.inspectorCard}>
      <span className={styles.kicker}>Edição separada do design</span>
      <strong>{titles[kind]}</strong>
      <p>Dê dois cliques no componente ou use o botão abaixo para abrir as configurações. O site exibe somente o design.</p>
      <button type="button" ref={opener} className={styles.openButton} onClick={() => setOpen(true)}><FiEdit3 /> Editar conteúdo e dados</button>
    </div>
    {open && typeof document !== "undefined" && createPortal(<div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) { setOpen(false); opener.current?.focus(); } }}>
      <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-label={`Editar ${titles[kind]}`}>
        <header className={styles.dialogHead}><div><span className={styles.kicker}>CONG · Estúdio de conteúdo</span><h2>{titles[kind]}</h2><p>As alterações aparecem imediatamente na composição. Salve a página ao terminar.</p></div>
          <button type="button" ref={closeRef} onClick={() => { setOpen(false); opener.current?.focus(); }} aria-label="Fechar edição"><FiX /></button>
        </header><div className={styles.dialogBody}>
          {kind === "data_chart" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalChartValue;
            return <><div className={styles.twoCol}><Field label="Título" value={v.title} onChange={(title) => setValue({ ...v, title })} />
              <Field label="Unidade" value={v.unit} onChange={(unit) => setValue({ ...v, unit })} /></div>
              <Field label="Descrição" maxLength={300} value={v.subtitle} onChange={(subtitle) => setValue({ ...v, subtitle })} />
              <div className={styles.formatRow}><span>Apresentação do gráfico</span><button data-selected={v.format === "bar"} type="button" onClick={() => setValue({ ...v, format: "bar" })}>Barras horizontais</button><button data-selected={v.format === "donut"} type="button" onClick={() => setValue({ ...v, format: "donut" })}>Rosca</button><button data-selected={v.format === "columns"} type="button" onClick={() => setValue({ ...v, format: "columns" })}>Colunas</button><button data-selected={v.format === "line"} type="button" onClick={() => setValue({ ...v, format: "line" })}>Linha</button></div>
              <h3>Categorias e valores</h3><div className={styles.rows}>{v.items.map((item) => <div key={item.id} className={styles.dataRow}>
                <input aria-label="Nome da categoria" value={item.label} onChange={(event) => setValue({ ...v, items: v.items.map((entry) => entry.id === item.id ? { ...entry, label: event.target.value } : entry) })} />
                <input aria-label={`Valor de ${item.label}`} type="number" min={0} max={1e9} value={item.value} onChange={(event) => setValue({ ...v, items: v.items.map((entry) => entry.id === item.id ? { ...entry, value: Math.max(0, Number(event.target.value) || 0) } : entry) })} />
                <button aria-label={`Remover ${item.label}`} type="button" disabled={v.items.length <= 1} onClick={() => setValue({ ...v, items: v.items.filter((entry) => entry.id !== item.id) })}><FiTrash2 /></button>
              </div>)}</div>{v.items.length < 8 && <button type="button" className={styles.addButton} onClick={() => setValue({ ...v, items: [...v.items, { id: crypto.randomUUID(), label: "Nova categoria", value: 0 }] })}><FiPlus /> Adicionar categoria</button>}
              <p className={styles.note}>Use somente dados confirmados. Gráficos demonstrativos não representam resultados reais.</p></>;
          })() : null}
          {kind === "campaign_card" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalCampaignValue; return <><MediaPicker image={v.image} label="Foto da campanha" onChange={(image) => setValue({ ...v, image })} onClear={() => setValue({ ...v, image: null })} />
              <div className={styles.twoCol}><Field label="Categoria" value={v.tag} onChange={(tag) => setValue({ ...v, tag })} /><Field label="Título" value={v.title} onChange={(title) => setValue({ ...v, title })} /></div>
              <Field label="Descrição" maxLength={600} multiline value={v.description} onChange={(description) => setValue({ ...v, description })} />
              <div className={styles.threeCol}><Amount label="Arrecadado" value={v.raised} onChange={(raised) => setValue({ ...v, raised })} /><Amount label="Meta" value={v.goal} onChange={(goal) => setValue({ ...v, goal: Math.max(1, goal) })} /><Field label="Unidade" value={v.unit} onChange={(unit) => setValue({ ...v, unit })} /></div>
              <div className={styles.twoCol}><Field label="Texto do botão" maxLength={80} value={v.action.label} onChange={(label) => setValue({ ...v, action: { ...v.action, label } })} />
                <AddressField label="Destino seguro" value={v.action.href} onChange={(href) => setValue({ ...v, action: { ...v.action, href } })} /></div>
</>;
          })() : null}
          {kind === "media_gallery" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalGalleryValue;
            const update = (id: string, patch: Partial<InstitutionalGalleryValue["items"][number]>) => setValue({ ...v, items: v.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
            return <><Field label="Título da galeria" value={v.title} onChange={(title) => setValue({ ...v, title })} />
              {v.items.map((item, index) => <div className={styles.galleryEntry} key={item.id}><div className={styles.galleryEntryHead}><strong>Foto {index + 1}</strong>{v.items.length > 1 && <button type="button" aria-label="Excluir foto" onClick={() => setValue({ ...v, items: v.items.filter((entry) => entry.id !== item.id) })}><FiTrash2 /> Remover</button>}</div>
                <MediaPicker image={item.image} label={`Foto ${index + 1}`} onChange={(image) => update(item.id, { image })} onClear={() => update(item.id, { image: null })} />
                <Field label="Legenda" maxLength={160} value={item.caption} onChange={(caption) => update(item.id, { caption })} />
                <div className={styles.twoCol}><label className={styles.field}><span>Recorte horizontal</span><input type="range" min={0} max={100} value={item.focalX} onChange={(event) => update(item.id, { focalX: Number(event.target.value) })} /></label>
                <label className={styles.field}><span>Recorte vertical</span><input type="range" min={0} max={100} value={item.focalY} onChange={(event) => update(item.id, { focalY: Number(event.target.value) })} /></label></div>
              </div>)}
              {v.items.length < 10 && <button type="button" className={styles.addButton} onClick={() => setValue({ ...v, items: [...v.items, { id: crypto.randomUUID(), image: null, caption: "Nova fotografia", focalX: 50, focalY: 50 }] })}><FiPlus /> Adicionar fotografia</button>}
            </>;
          })() : null}
          {kind === "video_embed" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalVideoValue; return <><Field label="Título do vídeo" value={v.title} onChange={(title) => setValue({ ...v, title })} />
              <AddressField label="Endereço do YouTube, Vimeo ou Pixabay" video value={v.url} onChange={(url) => setValue({ ...v, url })} />
              <Field label="Legenda" maxLength={300} value={v.caption} onChange={(caption) => setValue({ ...v, caption })} /></>;
          })() : null}
          {kind === "story_tabs" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalStoryTabsValue; return <><Field label="Título do conjunto" value={v.title} onChange={(title) => setValue({ ...v, title })} />
              {v.items.map((item, index) => <div key={item.id} className={styles.galleryEntry}><div className={styles.galleryEntryHead}><strong>Aba {index + 1}</strong>{v.items.length > 1 && <button type="button" onClick={() => setValue({ ...v, items: v.items.filter((entry) => entry.id !== item.id) })}><FiTrash2 /> Remover</button>}</div>
                <Field label="Título da aba" maxLength={90} value={item.title} onChange={(title) => setValue({ ...v, items: v.items.map((entry) => entry.id === item.id ? { ...entry, title } : entry) })} />
                <Field label="Conteúdo" multiline maxLength={1000} value={item.description} onChange={(description) => setValue({ ...v, items: v.items.map((entry) => entry.id === item.id ? { ...entry, description } : entry) })} /></div>)}
              {v.items.length < 8 && <button type="button" className={styles.addButton} onClick={() => setValue({ ...v, items: [...v.items, { id: crypto.randomUUID(), title: "Nova aba", description: "Conteúdo da nova aba" }] })}><FiPlus /> Nova aba</button>}</>;
          })() : null}
          {kind === "faq" && value && typeof value === "object" && "items" in value ? (() => {
            const v = value as InstitutionalFaqValue; return <>{v.items.map((item, index) => <div key={item.id} className={styles.galleryEntry}>
              <div className={styles.galleryEntryHead}><strong>Pergunta {index + 1}</strong>{v.items.length > 1 && <button type="button" onClick={() => setValue({ ...v, items: v.items.filter((entry) => entry.id !== item.id) })}><FiTrash2 /> Remover</button>}</div>
              <Field label="Pergunta" maxLength={240} value={item.question} onChange={(question) => setValue({ ...v, items: v.items.map((entry) => entry.id === item.id ? { ...entry, question } : entry) })} />
              <Field label="Resposta" multiline maxLength={2000} value={item.answer} onChange={(answer) => setValue({ ...v, items: v.items.map((entry) => entry.id === item.id ? { ...entry, answer } : entry) })} /></div>)}
              {v.items.length < 12 && <button type="button" className={styles.addButton} onClick={() => setValue({ ...v, items: [...v.items, { id: crypto.randomUUID(), question: "Nova pergunta", answer: "Escreva a resposta." }] })}><FiPlus /> Nova pergunta</button>}</>;
          })() : null}
          {kind === "community_timeline" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalTimelineValue;
            const change = (id: string, patch: Partial<InstitutionalTimelineValue["items"][number]>) => setValue({ ...v, items: v.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
            return <><Field label="Chamada superior" maxLength={90} value={v.eyebrow} onChange={(eyebrow) => setValue({ ...v, eyebrow })}/><Field label="Título" value={v.title} onChange={(title) => setValue({ ...v, title })}/>
              {v.items.map((item, index) => <div className={styles.galleryEntry} key={item.id}><div className={styles.galleryEntryHead}><strong>Marco {index+1}</strong>{v.items.length>1 && <button type="button" onClick={() => setValue({ ...v, items: v.items.filter((entry) => entry.id !== item.id) })}><FiTrash2 /> Remover</button>}</div>
                <div className={styles.twoCol}><Field label="Ano ou período" maxLength={36} value={item.year} onChange={(year) => change(item.id, { year })}/><Field label="Título do marco" maxLength={130} value={item.title} onChange={(title) => change(item.id, { title })}/></div>
                <Field label="Descrição" maxLength={450} multiline value={item.description} onChange={(description) => change(item.id, { description })}/></div>)}
              {v.items.length<10 && <button type="button" className={styles.addButton} onClick={() => setValue({ ...v, items:[...v.items,{ id:crypto.randomUUID(),year:"Hoje",title:"Novo marco",description:"Descreva um fato confirmado." }] })}><FiPlus/> Novo marco</button>}</>;
          })() : null}
          {kind === "testimonial_slider" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalTestimonialsValue;
            const change = (id: string, patch: Partial<InstitutionalTestimonialsValue["items"][number]>) => setValue({ ...v, items: v.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
            return <><Field label="Título" value={v.title} onChange={(title) => setValue({ ...v, title })}/><Field label="Introdução" maxLength={300} multiline value={v.subtitle} onChange={(subtitle) => setValue({ ...v, subtitle })}/>
              {v.items.map((item,index) => <div key={item.id} className={styles.galleryEntry}><div className={styles.galleryEntryHead}><strong>Depoimento {index+1}</strong>{v.items.length>1 && <button type="button" onClick={() => setValue({ ...v, items: v.items.filter((entry) => entry.id !== item.id) })}><FiTrash2 /> Remover</button>}</div>
                <Field label="Texto do depoimento" maxLength={650} multiline value={item.quote} onChange={(quote) => change(item.id,{quote})}/>
                <div className={styles.twoCol}><Field label="Nome ou identificação autorizada" maxLength={100} value={item.author} onChange={(author) => change(item.id,{author})}/><Field label="Vínculo ou contexto" maxLength={100} value={item.role} onChange={(role) => change(item.id,{role})}/></div></div>)}
              {v.items.length<10 && <button type="button" className={styles.addButton} onClick={() => setValue({ ...v, items:[...v.items,{ id:crypto.randomUUID(),quote:"Novo depoimento autorizado.",author:"Nome",role:"Contexto" }] })}><FiPlus/> Novo depoimento</button>}
              <p className={styles.note}>Obtenha autorização antes de publicar identificação e depoimentos reais de pessoas.</p></>;
          })() : null}
          {kind === "action_grid" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalActionGridValue;
            const change = (id: string, patch: Partial<InstitutionalActionGridValue["items"][number]>) => setValue({ ...v, items: v.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
            const icons: InstitutionalActionGridValue["items"][number]["icon"][] = ["heart","hand","book","home","globe","users"];
            return <><Field label="Título" value={v.title} onChange={(title) => setValue({ ...v, title })}/><Field label="Descrição" maxLength={300} multiline value={v.subtitle} onChange={(subtitle) => setValue({ ...v, subtitle })}/>
              {v.items.map((item,index) => <div className={styles.galleryEntry} key={item.id}><div className={styles.galleryEntryHead}><strong>Cartão {index+1}</strong>{v.items.length>1 && <button type="button" onClick={() => setValue({ ...v, items: v.items.filter((entry) => entry.id !== item.id) })}><FiTrash2 /> Remover</button>}</div>
                <div className={styles.twoCol}><Field label="Categoria" maxLength={56} value={item.eyebrow} onChange={(eyebrow) => change(item.id,{eyebrow})}/><Field label="Título" maxLength={120} value={item.title} onChange={(title) => change(item.id,{title})}/></div>
                <Field label="Descrição do cartão" maxLength={380} multiline value={item.description} onChange={(description) => change(item.id,{description})}/>
                <div className={styles.formatRow}><span>Ícone</span>{icons.map((icon) => <button type="button" key={icon} data-selected={item.icon===icon} onClick={() => change(item.id,{icon})}>{({heart:"Amor",hand:"Apoio",book:"Livro",home:"Casa",globe:"Mundo",users:"Pessoas"})[icon]}</button>)}</div>
                <div className={styles.twoCol}><Field label="Texto da ação" maxLength={80} value={item.action.label} onChange={(label) => change(item.id,{action:{...item.action,label}})}/>
                <AddressField label="Destino" value={item.action.href} onChange={(href) => change(item.id,{action:{...item.action,href}})}/></div></div>)}
              {v.items.length<8 && <button type="button" className={styles.addButton} onClick={() => setValue({ ...v, items:[...v.items,{id:crypto.randomUUID(),eyebrow:"PARTICIPE",title:"Nova oportunidade",description:"Explique como participar.",icon:"heart",action:{label:"Saiba mais",href:"#"}}] })}><FiPlus/> Novo cartão</button>}</>;
          })() : null}
          {kind === "donation_choices" && value && typeof value === "object" && "kind" in value ? (() => {
            const v = value as InstitutionalDonationChoicesValue;
            const change = (id: string, patch: Partial<InstitutionalDonationChoicesValue["items"][number]>) => setValue({ ...v, items: v.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
            return <><Field label="Título" value={v.title} onChange={(title) => setValue({ ...v, title })}/><Field label="Descrição" maxLength={300} value={v.subtitle} onChange={(subtitle) => setValue({ ...v, subtitle })}/>
              <p className={styles.note}>A escolha do valor é visual. Para concluir pagamentos, configure uma página interna ou checkout externo. Este bloco não cobra nem transmite o valor selecionado.</p>
              {v.items.map((item,index) => <div className={styles.galleryEntry} key={item.id}><div className={styles.galleryEntryHead}><strong>Valor {index+1}</strong>{v.items.length>1 && <button type="button" onClick={() => setValue({ ...v, items:v.items.filter((entry) => entry.id!==item.id) })}><FiTrash2/> Remover</button>}</div>
                <div className={styles.twoCol}><Amount label="Valor sugerido (R$)" value={item.amount} onChange={(amount) => change(item.id,{amount:Math.max(1,Math.min(1e6,amount))})}/><Field label="Descrição" maxLength={130} value={item.description} onChange={(description) => change(item.id,{description})}/></div></div>)}
              {v.items.length<8 && <button type="button" className={styles.addButton} onClick={() => setValue({ ...v, items:[...v.items,{id:crypto.randomUUID(),amount:50,description:"Apoie uma iniciativa"}] })}><FiPlus/> Adicionar valor</button>}
              <div className={styles.twoCol}><Field label="Texto do botão" maxLength={80} value={v.action.label} onChange={(label) => setValue({ ...v,action:{...v.action,label}})}/><AddressField label="Destino seguro" value={v.action.href} onChange={(href) => setValue({ ...v,action:{...v.action,href}})}/></div>
              <Field label="Informação de confiança" maxLength={240} multiline value={v.trustNote} onChange={(trustNote) => setValue({ ...v,trustNote })}/></>;
          })() : null}
          {kind === "progress" && value && typeof value === "object" && "percent" in value ? (() => {
            const v = value as InstitutionalProgressValue; return <><Field label="Título da meta" value={v.label} onChange={(label) => setValue({ ...v, label })} />
              <label className={styles.field}><span>Progresso: {v.percent}%</span><input type="range" min={0} max={100} value={v.percent} onChange={(event) => setValue({ ...v, percent: Number(event.target.value) })} /></label>
              <Field label="Descrição" maxLength={240} value={v.detail} onChange={(detail) => setValue({ ...v, detail })} /></>;
          })() : null}
        </div><footer className={styles.footer}><span><FiCheck /> Prévia atualizada</span><button type="button" onClick={() => { setOpen(false); opener.current?.focus(); }}>Concluir edição</button></footer>
      </section>
    </div>, document.body)}
  </>;
}
