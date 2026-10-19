import { useId, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { FiArrowRight, FiCamera, FiChevronLeft, FiChevronRight, FiFilm, FiImage, FiPlus, FiTrash2, FiUploadCloud } from "react-icons/fi";
import {
  uploadInstitutionalMedia,
  type InstitutionalCampaignValue,
  type InstitutionalChartValue,
  type InstitutionalGalleryValue,
  type InstitutionalImageValue,
  type InstitutionalIllustration,
  type InstitutionalStoryTabsValue,
  type InstitutionalVideoValue,
} from "../../../services/institutionalService";
import { safeInstitutionalHref } from "../../../utils/institutionalLinks";
import styles from "./RichElements.module.css";

type RichValue = InstitutionalCampaignValue | InstitutionalGalleryValue | InstitutionalVideoValue | InstitutionalChartValue | InstitutionalStoryTabsValue;
type Common<T extends RichValue> = { value: T; editable: boolean; onChange?: (next: T) => void };

const captionPlaceholder = "Inclua uma foto para ilustrar esta parte.";
function safeNumber(value: number): number { return Number.isFinite(value) ? Math.max(0, value) : 0; }
function formatted(value: number): string { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(safeNumber(value)); }
function accessibleLink(raw: string): string | null {
  const href = safeInstitutionalHref(raw);
  return href && href !== "#" ? href : null;
}

/** All media files use the platform's authenticated, tenant-scoped uploader. */
function MediaFrame({ image, editable, label, illustration, position, onUploaded, onPosition }: {
  image: InstitutionalImageValue | null;
  editable: boolean;
  label: string;
  illustration?: InstitutionalIllustration;
  position?: { x: number; y: number };
  onUploaded?: (image: InstitutionalImageValue) => void;
  onPosition?: (x: number, y: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function accept(file: File | undefined) {
    if (!file || !file.type.startsWith("image/") || !editable || !onUploaded) return;
    setError(""); setUploading(true);
    try {
      const asset = await uploadInstitutionalMedia(file);
      onUploaded({ assetId: asset.id, alt: label, url: asset.url });
    } catch {
      setError("Não foi possível enviar a imagem. Tente novamente.");
    } finally { setUploading(false); }
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    if (!editable) return;
    event.preventDefault(); event.stopPropagation();
    void accept(event.dataTransfer.files[0]);
  }
  const illustrativeUrl = illustration ? `/institutional/examples/${illustration}.webp` : null;
  return <div className={styles.mediaFrame} tabIndex={editable ? 0 : undefined}
    aria-label={editable ? `${label}: selecione e pressione Ctrl+V para colar uma imagem` : label}
    onPaste={(event) => {
      const imageFile = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
      if (imageFile && editable) { event.preventDefault(); void accept(imageFile); }
    }} onDragOver={(event) => { if (editable) event.preventDefault(); }} onDrop={drop}>
    {(image?.url || illustrativeUrl) ? <img src={image?.url || illustrativeUrl || ""} alt={image?.alt || label} loading="lazy"
      style={{ objectPosition: `${position?.x ?? 50}% ${position?.y ?? 50}%` }} />
      : <div className={styles.mediaEmpty} aria-label={label}><FiImage aria-hidden="true" /><span>{label}</span></div>}
    {!image?.url && illustrativeUrl && <span className={styles.exampleImageTag}>Imagem ilustrativa · substitua pela sua</span>}
    {editable && <div className={styles.mediaTools}>
      <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}><FiUploadCloud aria-hidden="true" />{uploading ? "Enviando..." : image?.url ? "Trocar foto" : "Adicionar foto"}</button>
      <input hidden ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => {
        void accept(event.target.files?.[0]); event.target.value = "";
      }} />
      {image?.url && onPosition && <label className={styles.focalControl}>Enquadramento horizontal
        <input aria-label={`Enquadramento horizontal de ${label}`} type="range" min={0} max={100} value={position?.x ?? 50}
          onChange={(event) => onPosition(Number(event.target.value), position?.y ?? 50)} />
      </label>}
    </div>}
    {error && <small className={styles.error} role="alert">{error}</small>}
  </div>;
}

function Field({ label, value, onChange, multiline = false, maxLength = 140 }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; maxLength?: number }) {
  return <label className={styles.editorField}><span>{label}</span>
    {multiline ? <textarea rows={3} maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} />
      : <input maxLength={maxLength} value={value} onChange={(event) => onChange(event.target.value)} />}
  </label>;
}

export function CampaignCard({ value, editable, onChange }: Common<InstitutionalCampaignValue>) {
  const [hrefDraft, setHrefDraft] = useState(value.action.href);
  const hrefDraftValid = Boolean(safeInstitutionalHref(hrefDraft));
  const progress = value.goal > 0 ? Math.min(100, Math.round(safeNumber(value.raised) / value.goal * 100)) : 0;
  const href = accessibleLink(value.action.href);
  return <article className={styles.campaign}>
    <div className={styles.campaignVisual}>
      <MediaFrame image={value.image} illustration={value.illustration} editable={editable} label="Imagem da campanha" onUploaded={(image) => onChange?.({ ...value, image })} />
      <span className={styles.campaignBadge}>{value.tag || "Campanha"}</span>
    </div>
    <div className={styles.campaignBody}>
      {editable ? <>
        <Field label="Categoria" maxLength={64} value={value.tag} onChange={(tag) => onChange?.({ ...value, tag })} />
        <Field label="Título" value={value.title} onChange={(title) => onChange?.({ ...value, title })} />
        <Field label="Descrição" maxLength={600} value={value.description} multiline onChange={(description) => onChange?.({ ...value, description })} />
        {value.image && <Field label="Descrição acessível da foto" maxLength={240} value={value.image.alt} onChange={(alt) => onChange?.({ ...value, image: value.image ? { ...value.image, alt } : null })} />}
      </> : <><h3>{value.title}</h3><p>{value.description}</p></>}
      <div className={styles.campaignProgress}>
        <div className={styles.progressTexts}><strong>{value.unit} {formatted(value.raised)}</strong><span>de {value.unit} {formatted(value.goal)}</span></div>
        <div className={styles.progressRail} role="progressbar" aria-label={`Progresso de ${value.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
        <small>{progress}% da meta</small>
      </div>
      {editable ? <div className={styles.editorGrid}>
        <label className={styles.editorField}><span>Arrecadado</span><input type="number" min={0} max={1_000_000_000} value={value.raised} onChange={(event) => onChange?.({ ...value, raised: safeNumber(Number(event.target.value)) })} /></label>
        <label className={styles.editorField}><span>Meta</span><input type="number" min={1} max={1_000_000_000} value={value.goal} onChange={(event) => onChange?.({ ...value, goal: Math.max(1, safeNumber(Number(event.target.value))) })} /></label>
        <Field label="Unidade" maxLength={24} value={value.unit} onChange={(unit) => onChange?.({ ...value, unit })} />
        <Field label="Texto da ação" maxLength={80} value={value.action.label} onChange={(label) => onChange?.({ ...value, action: { ...value.action, label } })} />
        <div className={styles.editorWide}><label className={styles.editorField}><span>Destino (página ou link)</span>
          <input value={hrefDraft} onChange={(event) => setHrefDraft(event.target.value)} onBlur={() => {
            if (hrefDraftValid) onChange?.({ ...value, action: { ...value.action, href: hrefDraft } });
          }} />
        </label>{!hrefDraftValid && <small role="alert" className={styles.error}>Use um link seguro (HTTPS, página interna, e-mail ou telefone).</small>}</div>
      </div> : href ? <a className={styles.cta} href={href}>{value.action.label}<FiArrowRight aria-hidden="true" /></a>
        : <span className={styles.inactiveCta}>Configure um destino para participar</span>}
    </div>
  </article>;
}

export function MediaGallery({ value, editable, onChange }: Common<InstitutionalGalleryValue>) {
  const [active, setActive] = useState(0);
  const selected = Math.min(active, Math.max(value.items.length - 1, 0));
  const updateItem = (id: string, patch: Partial<InstitutionalGalleryValue["items"][number]>) => onChange?.({ ...value, items: value.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const photos = value.items;
  return <section className={styles.gallery} aria-label={value.title || "Galeria"}>
    {editable ? <Field label="Título da galeria" value={value.title} onChange={(title) => onChange?.({ ...value, title })} /> : <h3>{value.title}</h3>}
    <div className={styles.galleryFeatured}>
      {photos[selected] && <MediaFrame key={photos[selected].id} image={photos[selected].image} illustration={photos[selected].illustration} label={photos[selected].caption || captionPlaceholder} editable={editable}
        position={{ x: photos[selected].focalX, y: photos[selected].focalY }} onUploaded={(image) => updateItem(photos[selected].id, { image })}
        onPosition={(focalX, focalY) => updateItem(photos[selected].id, { focalX, focalY })} />}
      {photos.length > 1 && <div className={styles.galleryArrows}>
        <button type="button" aria-label="Imagem anterior" onClick={() => setActive((selected + photos.length - 1) % photos.length)}><FiChevronLeft /></button>
        <span>{selected + 1} / {photos.length}</span>
        <button type="button" aria-label="Próxima imagem" onClick={() => setActive((selected + 1) % photos.length)}><FiChevronRight /></button>
      </div>}
    </div>
    {editable && photos[selected] ? <Field label="Legenda da imagem selecionada" maxLength={160} value={photos[selected].caption} onChange={(caption) => updateItem(photos[selected].id, { caption, ...(photos[selected].image ? { image: { ...photos[selected].image!, alt: caption } } : {}) })} /> : photos[selected]?.caption ? <p className={styles.galleryCaption}>{photos[selected].caption}</p> : null}
    <div className={styles.galleryThumbnails} aria-label="Selecionar imagem">
      {photos.map((item, i) => <button type="button" key={item.id} data-active={i === selected} aria-label={`Imagem ${i + 1}: ${item.caption}`} aria-pressed={i === selected} onClick={() => setActive(i)}>
        {item.image?.url || item.illustration ? <img src={item.image?.url || `/institutional/examples/${item.illustration}.webp`} alt="" loading="lazy" style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }} /> : <FiCamera aria-hidden="true" />}
      </button>)}
      {editable && photos.length < 10 && <button type="button" className={styles.galleryAdd} onClick={() => {
        onChange?.({ ...value, items: [...photos, { id: crypto.randomUUID(), image: null, caption: "Nova imagem", focalX: 50, focalY: 50 }] });
        setActive(photos.length);
      }} aria-label="Adicionar imagem"><FiPlus /></button>}
    </div>
    {editable && photos.length > 1 && <button className={styles.remove} type="button" onClick={() => {
      onChange?.({ ...value, items: photos.filter((_, index) => index !== selected) });
      setActive(Math.max(0, selected - 1));
    }}><FiTrash2 /> Remover imagem selecionada</button>}
  </section>;
}

/** Parses only fixed, supported hosts; never interpolates an untrusted embed URL. */
export function safeVideoEmbed(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let id: string | undefined;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (["youtube.com", "www.youtube.com", "www.youtube-nocookie.com"].includes(host))
      id = url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : url.pathname === "/watch" ? url.searchParams.get("v") ?? undefined : undefined;
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const match = url.pathname.match(/^(?:\/video)?\/(\d{6,12})\/?$/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
    return null;
  } catch { return null; }
}

export function VideoEmbed({ value, editable, onChange }: Common<InstitutionalVideoValue>) {
  const [urlDraft, setUrlDraft] = useState(value.url);
  const embed = safeVideoEmbed(value.url);
  const directVideo = /^https:\/\/cdn\.pixabay\.com\/video\/[A-Za-z0-9/_-]+\.mp4$/.test(value.url) ? value.url : null;
  const validDraft = !urlDraft || safeVideoEmbed(urlDraft) !== null || /^https:\/\/cdn\.pixabay\.com\/video\/[A-Za-z0-9/_-]+\.mp4$/.test(urlDraft);
  return <section className={styles.videoCard} aria-label={value.title || "Vídeo"}>
    {editable ? <Field label="Título" value={value.title} onChange={(title) => onChange?.({ ...value, title })} /> : <h3>{value.title}</h3>}
    <div className={styles.videoFrame}>
      {embed ? <iframe src={embed} title={value.title || "Vídeo da organização"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
        : directVideo ? <video controls preload="metadata" playsInline src={directVideo} aria-label={value.title || "Vídeo da organização"} />
        : <div className={styles.videoEmpty}><FiFilm /><strong>Seu vídeo aqui</strong><span>{editable ? "Cole o endereço de um vídeo para visualizar" : "Vídeo ainda não disponível"}</span></div>}
    </div>
    {editable ? <>
      <label className={styles.editorField}><span>Link HTTPS do YouTube, Vimeo ou Pixabay</span>
        <input value={urlDraft} onChange={(event) => setUrlDraft(event.target.value)} onBlur={() => {
          if (validDraft) onChange?.({ ...value, url: urlDraft });
        }} />
      </label>
      {!validDraft && <small role="alert" className={styles.error}>Informe um endereço de vídeo válido antes de sair do campo.</small>}
      <Field label="Legenda" maxLength={300} value={value.caption} onChange={(caption) => onChange?.({ ...value, caption })} />
    </> : value.caption ? <p className={styles.videoCaption}>{value.caption}</p> : null}
  </section>;
}

const palette = [
  "var(--org-primary, #284d91)", "var(--org-accent, #ecb843)",
  "var(--org-secondary, #578d78)", "var(--org-primary-light, #8bb0d9)",
  "var(--org-secondary-strong, #36756a)", "var(--org-accent-strong, #cc9b32)",
  "var(--org-primary-deep, #1b3966)", "var(--org-secondary-light, #8bb9a9)",
];
export function DataChart({ value, editable, onChange }: Common<InstitutionalChartValue>) {
  const total = value.items.reduce((sum, item) => sum + safeNumber(item.value), 0);
  const max = Math.max(1, ...value.items.map((item) => safeNumber(item.value)));
  let accumulated = 0;
  const stops = value.items.map((item, index) => {
    const start = total ? accumulated / total * 100 : 0;
    accumulated += safeNumber(item.value);
    return `${palette[index % palette.length]} ${start}% ${total ? accumulated / total * 100 : 0}%`;
  });
  const updateItem = (id: string, patch: Partial<InstitutionalChartValue["items"][number]>) => onChange?.({ ...value, items: value.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
  return <section className={styles.chartCard} aria-label={value.title}>
    <div className={styles.chartHead}>
      <div>{editable ? <><Field label="Título" value={value.title} onChange={(title) => onChange?.({ ...value, title })} />
        <Field label="Descrição" maxLength={300} value={value.subtitle} onChange={(subtitle) => onChange?.({ ...value, subtitle })} /></> : <><h3>{value.title}</h3><p>{value.subtitle}</p></>}</div>
      {editable && <div className={styles.chartStyleSwitch} role="group" aria-label="Tipo de gráfico">
        <button type="button" data-active={value.format === "bar"} onClick={() => onChange?.({ ...value, format: "bar" })}>Barras</button>
        <button type="button" data-active={value.format === "donut"} onClick={() => onChange?.({ ...value, format: "donut" })}>Rosca</button>
        <button type="button" data-active={value.format === "columns"} onClick={() => onChange?.({ ...value, format: "columns" })}>Colunas</button>
        <button type="button" data-active={value.format === "line"} onClick={() => onChange?.({ ...value, format: "line" })}>Linha</button>
      </div>}
    </div>
    {value.format === "bar" ? <div className={styles.chartBars} role="img" aria-label={value.items.map((item) => `${item.label}: ${formatted(item.value)} ${value.unit}`).join("; ")}>
      {value.items.map((item, index) => <div key={item.id} className={styles.chartBarRow}>
        <span>{item.label}</span><div className={styles.chartBarTrack}><div style={{ width: `${safeNumber(item.value) / max * 100}%`, background: palette[index % palette.length] }} /></div>
        <strong>{formatted(item.value)}</strong>
      </div>)}
    </div> : value.format === "columns" ? <div className={styles.congChartColumns} role="img" aria-label={value.items.map((item) => `${item.label}: ${formatted(item.value)} ${value.unit}`).join("; ")}>
      {value.items.map((item, index) => <div key={item.id} className={styles.congChartColumn}>
        <strong>{formatted(item.value)}</strong>
        <div className={styles.congChartColumnTrack}><span style={{ height: `${Math.max(2, safeNumber(item.value) / max * 100)}%`, background: palette[index % palette.length] }} /></div>
        <span title={item.label}>{item.label}</span>
      </div>)}
    </div> : value.format === "line" ? <div className={styles.congChartLine} role="img" aria-label={value.items.map((item) => `${item.label}: ${formatted(item.value)} ${value.unit}`).join("; ")}>
      <svg viewBox="0 0 620 250" role="presentation" preserveAspectRatio="none">
        {[0,1,2,3,4].map((line) => <line key={line} x1="12" x2="608" y1={24 + line * 48} y2={24 + line * 48} className={styles.congChartGridline} />)}
        <polyline fill="none" stroke="var(--org-primary, #265c88)" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round"
          points={value.items.map((item, index) => `${12 + index * (596 / Math.max(1, value.items.length - 1))},${216 - safeNumber(item.value) / max * 190}`).join(" ")} />
        {value.items.map((item, index) => <circle key={item.id} cx={12 + index * (596 / Math.max(1, value.items.length - 1))} cy={216 - safeNumber(item.value) / max * 190} r="7" fill={palette[index % palette.length]} stroke="var(--org-background, white)" strokeWidth="3" />)}
      </svg>
      <div className={styles.congChartLineLegend}>{value.items.map((item, index) => <span key={item.id}><i style={{background:palette[index % palette.length]}} />{item.label} <strong>{formatted(item.value)}</strong></span>)}</div>
    </div> : <div className={styles.chartDonutLayout}>
      <div className={styles.chartDonut} role="img" aria-label={value.items.map((item) => `${item.label}: ${formatted(item.value)} ${value.unit}`).join("; ")}
        style={{ background: total > 0 ? `conic-gradient(${stops.join(",")})` : "var(--org-background, #eee)" }}>
        <div><strong>{formatted(total)}</strong><span>{value.unit}</span></div>
      </div><div className={styles.chartLegend}>{value.items.map((item, index) => <div key={item.id}><i style={{ background: palette[index % palette.length] }} /> <span>{item.label}</span><strong>{formatted(item.value)}</strong></div>)}</div>
    </div>}
    {editable && <div className={styles.chartEdit}>
      <div className={styles.chartEditTop}><strong>Dados do gráfico</strong><Field label="Unidade" maxLength={24} value={value.unit} onChange={(unit) => onChange?.({ ...value, unit })} /></div>
      {value.items.map((item) => <div key={item.id} className={styles.chartDataRow}>
        <input aria-label="Nome da categoria" value={item.label} onChange={(event) => updateItem(item.id, { label: event.target.value })} />
        <input aria-label={`Valor de ${item.label}`} type="number" min={0} max={1_000_000_000} value={item.value} onChange={(event) => updateItem(item.id, { value: safeNumber(Number(event.target.value)) })} />
        <button type="button" disabled={value.items.length === 1} aria-label={`Remover ${item.label}`} onClick={() => onChange?.({ ...value, items: value.items.filter((other) => other.id !== item.id) })}><FiTrash2 /></button>
      </div>)}
      {value.items.length < 8 && <button type="button" className={styles.inlineAdd} onClick={() => onChange?.({ ...value, items: [...value.items, { id: crypto.randomUUID(), label: "Nova categoria", value: 0 }] })}><FiPlus /> Adicionar categoria</button>}
    </div>}
  </section>;
}

export function StoryTabs({ value, editable, onChange }: Common<InstitutionalStoryTabsValue>) {
  const [active, setActive] = useState(0);
  const prefix = useId();
  const selected = Math.min(active, value.items.length - 1);
  const item = value.items[selected];
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? value.items.length - 1 : (selected + (event.key === "ArrowRight" ? 1 : -1) + value.items.length) % value.items.length;
    setActive(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  return <section className={styles.tabsCard}>
    {editable ? <Field label="Título" value={value.title} onChange={(title) => onChange?.({ ...value, title })} /> : <h3>{value.title}</h3>}
    <div role="tablist" aria-label={value.title || "Informações"} className={styles.tabsNav} onKeyDown={onKeyDown}>
      {value.items.map((entry, index) => <button type="button" role="tab" key={entry.id} id={`${prefix}-tab-${entry.id}`} aria-controls={`${prefix}-panel-${entry.id}`}
        aria-selected={index === selected} tabIndex={index === selected ? 0 : -1} onClick={() => setActive(index)}>{entry.title || `Aba ${index + 1}`}</button>)}
    </div>
    {item && <div role="tabpanel" className={styles.tabsPanel} id={`${prefix}-panel-${item.id}`} aria-labelledby={`${prefix}-tab-${item.id}`} tabIndex={0}>
      {editable ? <><Field label="Nome da aba" maxLength={90} value={item.title} onChange={(title) => onChange?.({ ...value, items: value.items.map((entry) => entry.id === item.id ? { ...entry, title } : entry) })} />
        <Field label="Conteúdo" maxLength={1000} value={item.description} multiline onChange={(description) => onChange?.({ ...value, items: value.items.map((entry) => entry.id === item.id ? { ...entry, description } : entry) })} />
        {value.items.length > 1 && <button type="button" className={styles.remove} onClick={() => { onChange?.({ ...value, items: value.items.filter((entry) => entry.id !== item.id) }); setActive(0); }}><FiTrash2 /> Excluir aba</button>}
      </> : <><h4>{item.title}</h4><p>{item.description}</p></>}
    </div>}
    {editable && value.items.length < 8 && <button type="button" className={styles.inlineAdd} onClick={() => { onChange?.({ ...value, items: [...value.items, { id: crypto.randomUUID(), title: "Nova aba", description: "Descreva este assunto." }] }); setActive(value.items.length); }}><FiPlus /> Adicionar aba</button>}
  </section>;
}
