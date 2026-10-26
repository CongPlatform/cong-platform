import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../../../contexts/workspace-context";
import { buildAiDraft, existingDraft, SITE_LOOKS, SITE_PALETTES, type BuildResult, type SiteLook, type SitePalette } from "../../../features/aiBuilder/aiBuilder";
import { FiAlertCircle, FiArrowRight, FiCheckCircle, FiFileText, FiLayers, FiMessageCircle, FiPlus, FiRefreshCw, FiSend, FiServer, FiXCircle, FiImage, FiDroplet, FiEdit3 } from "react-icons/fi";
import {
  aiCancel, aiDelete, aiDetail, aiReply, aiRetry, aiSessions, aiStart, aiStatus,
  type AiAvailability, type AiGoal, type AiPlan, type AiSessionDetail, type AiSessionSummary,
} from "../../../services/aiAssistantService";
import mascotHappy from "../../../assets/mascot/cong-happy.webp";
import mascotThinking from "../../../assets/mascot/cong-thinking.webp";
import styles from "./AiAssistant.module.css";

const GOALS: { id: AiGoal; label: string; description: string }[] = [
  { id: "both", label: "Site e sistema", description: "Tudo conectado" },
  { id: "system", label: "Sistema", description: "Organização interna" },
  { id: "site", label: "Site", description: "Presença institucional" },
];
const busy = (status?: string) => status === "pending" || status === "processing";
const errorText = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";

function Proposal({ plan, coverage, missing }: { plan: AiPlan; coverage?: string; missing?: string[] }) {
  const [rawOpen, setRawOpen] = useState(false);
  return <section className={styles.proposal} aria-label="Proposta para revisão">
    <div className={styles.proposalHead}><FiFileText aria-hidden="true" /><div><strong>O que vamos construir</strong><p>Organizei o que você me contou nestas partes. Veja se faz sentido. Depois da sua confirmação, criaremos os rascunhos editáveis na CONG.</p></div></div>
    {coverage === "needs_review" && <div className={styles.warning}><FiAlertCircle aria-hidden="true" /> Existem requisitos que precisam ser revisados antes de implementar.</div>}
    {Boolean(missing?.length) && <div className={styles.notice}><strong>Necessidades pendentes</strong><ul>{missing?.map((text, index) => <li key={`${index}-${text}`}>{text}</li>)}</ul></div>}
    {plan.system && <article className={styles.previewCard}><div className={styles.previewTitle}><FiLayers aria-hidden="true" /><strong>{plan.system.name}</strong></div><p>{plan.system.description}</p><h3>Módulos sugeridos</h3><div className={styles.modules}>{plan.system.modules.map(module => <div className={styles.module} key={module.alias}><strong>{module.name}</strong><span>{module.description}</span><small>{module.fields.length ? `${module.fields.length} campo(s) configuráveis` : `Módulo ${module.blueprint_key}`}</small></div>)}</div>{plan.system.workflow.length > 0 && <><h3>Fluxo proposto</h3><ol>{plan.system.workflow.map((step, i) => <li key={`${i}-${step.module_alias}`}>{step.title}</li>)}</ol></>}</article>}
    {plan.site && <article className={styles.previewCard}><div className={styles.previewTitle}><FiServer aria-hidden="true" /><strong>{plan.site.name}</strong></div><p>Estilo: {plan.site.style} · Público: {plan.site.audience}</p><h3>Páginas sugeridas</h3><div className={styles.modules}>{plan.site.pages.map(page => <div className={styles.module} key={page.slug}><strong>{page.title}</strong><small>/{page.slug}</small><span>{page.sections.map(section => section.title).filter(Boolean).join(" · ")}</span></div>)}</div></article>}
    {plan.connection.link_system && <article className={styles.previewCard}><div className={styles.previewTitle}><FiArrowRight aria-hidden="true" /><strong>Conexão site e sistema</strong></div>{plan.connection.public_forms.length ? <div className={styles.modules}>{plan.connection.public_forms.map((form, index) => <div className={styles.module} key={`${form.form_module_alias}-${index}`}><strong>{form.name}</strong><span>Destino: {form.target_module_alias} · Página: {form.page_slug}</span><small>{form.bindings.length} campo(s) vinculado(s)</small></div>)}</div> : <p>Nenhum formulário público foi mapeado. Essa conexão ainda exige revisão.</p>}</article>}
    {plan.confirmations.length > 0 && <div className={styles.notice}><strong>Decisões a confirmar</strong><ul>{plan.confirmations.map((text,i) => <li key={i}>{text}</li>)}</ul></div>}
    {plan.limitations.length > 0 && <div className={styles.notice}><strong>Limitações da proposta</strong><ul>{plan.limitations.map((text,i) => <li key={i}>{text}</li>)}</ul></div>}
    <button type="button" className={styles.textButton} onClick={() => setRawOpen(!rawOpen)} aria-expanded={rawOpen}>{rawOpen ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos (JSON)"}</button>
    {rawOpen && <pre className={styles.rawJson}>{JSON.stringify(plan,null,2)}</pre>}
  </section>;
}

export default function AiAssistant() {
  const { workspace } = useWorkspace();
  const organizationName = workspace.kind === "organization" ? workspace.organization.name : "Organização";
  const [look,setLook] = useState<SiteLook>("human");
  const [palette,setPalette] = useState<SitePalette|null>(null);
  const [logoFile,setLogoFile] = useState<File|null>(null);
  const [logoError,setLogoError] = useState("");
  const [logoPreview,setLogoPreview] = useState("");
  useEffect(()=>{
    if(!logoFile)return;
    let active=true;
    const reader=new FileReader();
    reader.onload=()=>{if(active && typeof reader.result==="string")setLogoPreview(reader.result);};
    reader.readAsDataURL(logoFile);
    return ()=>{active=false;if(reader.readyState===FileReader.LOADING)reader.abort();};
  },[logoFile]);
  const [nameSite,setNameSite] = useState("");
  const [nameSystem,setNameSystem] = useState("");
  const [approved,setApproved] = useState(false);
  const [building,setBuilding] = useState(false);
  const [buildProgress,setBuildProgress] = useState("");
  const [buildResult,setBuildResult] = useState<BuildResult|null>(null);
  const [existing,setExisting] = useState(false);
  const [buildError,setBuildError] = useState("");
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  const [sessions, setSessions] = useState<AiSessionSummary[]>([]);
  const [current, setCurrent] = useState<AiSessionDetail | null>(null);
  const [goal, setGoal] = useState<AiGoal>(()=>{ const q=new URLSearchParams(window.location.search).get("goal"); return q==="site"||q==="system"?q:"both"; });
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const refresh = useCallback(async (id: string) => {
    const detail = await aiDetail(id);
    if (selectedRef.current === id) setCurrent(detail);
    return detail;
  }, []);
  const select = useCallback(async (id: string) => {
    const changingConversation=selectedRef.current!==id;
    selectedRef.current = id; setSessionId(id); setError(""); setLoading(true); setCurrent(null);
    setApproved(false);setBuildError("");setBuildProgress("");setBuildResult(null);
    setExisting(Boolean(existingDraft(id)));
    if(changingConversation){setPalette(null);setLogoFile(null);setLogoPreview("");setLogoError("");}
    try { await refresh(id); } catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  }, [refresh]);
  const reloadList = useCallback(async () => { const response = await aiSessions(); setSessions(response.sessions); }, []);
  useEffect(() => {
    let disposed = false;
    void Promise.allSettled([aiStatus(), aiSessions()]).then(values => {
      if (disposed) return;
      if (values[0].status === "fulfilled") setAvailability(values[0].value);
      if (values[1].status === "fulfilled") setSessions(values[1].value.sessions);
      if (values[1].status === "rejected") setError(errorText(values[1].reason));
    });
    return () => { disposed = true; };
  }, []);
  useEffect(() => {
    if (!sessionId || !busy(current?.session.status)) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void refresh(sessionId).then(() => {
        if (!cancelled) void Promise.allSettled([reloadList(),aiStatus().then(setAvailability)]);
      }).catch(e => { if (!cancelled) setError(errorText(e)); });
    }, 3500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [sessionId,current?.session.status,refresh,reloadList]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [current?.session.turns.length, current?.session.status]);
  async function sendMessage(message:string) {
    if(!message.trim()||busy(current?.session.status)||submitting)return;
    setSubmitting(true); setError("");
    try {
      const result = sessionId ? await aiReply(sessionId,message.trim()) : await aiStart(goal,message.trim());
      setText("");
      await select(result.session_id);
      await reloadList();
    } catch (e) { setError(errorText(e)); } finally { setSubmitting(false); }
  }
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();await sendMessage(text);}
  function chooseLogo(file:File|undefined){
    setLogoError("");
    if(!file){setLogoFile(null);setLogoPreview("");return;}
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5_000_000){
      setLogoError("Escolha uma imagem PNG, JPG ou WebP de até 5 MB.");return;
    }
    setLogoPreview("");setLogoFile(file);
  }
  async function action(kind: "retry" | "cancel") {
    if (!sessionId || submitting) return;
    setSubmitting(true); setError("");
    try {
      if (kind === "retry") await aiRetry(sessionId); else await aiCancel(sessionId);
      await refresh(sessionId); await reloadList();
    } catch (e) { setError(errorText(e)); } finally { setSubmitting(false); }
  }
  async function deleteConversation() {
    if(!sessionId || submitting || !window.confirm("Excluir permanentemente esta conversa e suas propostas?"))return;
    setSubmitting(true);setError("");
    try {await aiDelete(sessionId);newConversation();await reloadList();}
    catch(e){setError(errorText(e));}
    finally {setSubmitting(false);}
  }
  function newConversation() { selectedRef.current = null; setSessionId(null); setCurrent(null); setError(""); setText("");setApproved(false);setBuildResult(null);setExisting(false);setPalette(null);setLogoFile(null);setLogoPreview("");setLogoError(""); }
  async function buildConfirmedDraft(){
    if(!sessionId || !approved || building || current?.session.status!=="propose" || !current.session.plan || current.metrics?.coverage_status==="needs_review" || Boolean(current.metrics?.unmet_requirements?.length))return;
    if(!window.confirm("Criar ou atualizar rascunhos REAIS nos construtores da sua ONG? Nada será publicado ou ativado automaticamente."))return;
    setBuilding(true);setBuildError("");setBuildProgress("Preparando os construtores...");
    try{
      const plan=current.session.plan;
      const userSiteName=nameSite.trim() || `Site de ${organizationName}`;
      const userSystemName=nameSystem.trim() || `Sistema de ${organizationName}`;
      const adjusted:AiPlan={...plan,
        system:plan.system?{...plan.system,name:userSystemName}:null,
        site:plan.site?{...plan.site,name:userSiteName}:null};
      const result=await buildAiDraft({plan:adjusted,sessionId,
        turns:current.session.turns.filter(t=>t.role==="usuario").map(t=>t.text),look,palette,logoFile,
        report:setBuildProgress});
      setBuildResult(result);setExisting(true);setBuildProgress("Rascunhos criados. Abra os construtores para revisar e finalizar.");
    }catch(e){setBuildError(errorText(e));setBuildProgress("Alguns recursos podem ter sido criados. Verifique os links e tente novamente na mesma sessão.");setExisting(Boolean(existingDraft(sessionId)));}
    finally{setBuilding(false);}
  }
  const status = current?.session.status;
  const wordsFromUser = current?.session.turns.filter(t => t.role === "usuario").map(t => t.text) ?? [];
  const phaseIndex = status === "propose" ? 2 : sessionId ? 1 : 0;
  const composerRef = useRef<HTMLTextAreaElement>(null);
  function focusComposer() { composerRef.current?.focus(); }
  return <main className={styles.page}>
    <header className={styles.header}><div><div className={styles.eyebrow}><FiMessageCircle aria-hidden="true" /> CONG · Estúdio de criação</div><h1>Vamos construir algo que seja realmente seu.</h1><p>Conte como sua organização funciona. Eu ajudo a definir os recursos essenciais, preparar uma proposta sob medida e criar rascunhos editáveis.</p><p className={styles.privacyNote}>Para responder, utilizo um mecanismo de IA que pode funcionar em outro computador. Não informe dados pessoais reais de beneficiários nesta fase.</p></div><div className={styles.headerActions}><button type="button" className={styles.newButton} onClick={newConversation}><FiPlus aria-hidden="true" /> Nova conversa</button>{sessionId&&<button type="button" className={styles.deleteButton} onClick={()=>{void deleteConversation();}} disabled={submitting}>Excluir conversa</button>}</div></header>
    <div className={styles.statusBar}><span className={availability?.worker_online ? styles.online : styles.offline}>{availability?.worker_online ? <FiCheckCircle aria-hidden="true" /> : <FiAlertCircle aria-hidden="true" />}{availability?.worker_online ? `CONG disponível para conversar` : "CONG está indisponível no momento"}</span><span>Fila: {availability?.queue_size ?? "—"}</span><button type="button" className={styles.textButton} onClick={() => {void Promise.allSettled([aiStatus().then(setAvailability),reloadList()]);}}><FiRefreshCw aria-hidden="true" /> Atualizar status</button></div>
    <nav className={styles.stageBar} aria-label="Etapas da criação">
      {(["Sua ideia", "Conversa", "Revisão e criação"] as const).map((label, i) => <span key={label} className={styles.stageStep} data-active={phaseIndex===i} data-done={phaseIndex>i} aria-current={phaseIndex===i?"step":undefined}><strong>{i+1}</strong>{label}</span>)}
    </nav>
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="Conversas anteriores"><h2>Suas conversas</h2>{sessions.length ? sessions.map(s => <button type="button" className={`${styles.historyItem} ${sessionId===s.id ? styles.active : ""}`} key={s.id} onClick={() => {void select(s.id);}}><FiMessageCircle aria-hidden="true" /><span><strong>{GOALS.find(g=>g.id===s.goal)?.label ?? s.goal}</strong><small>{new Date(s.updated_at).toLocaleString("pt-BR")}</small></span></button>) : <p className={styles.emptyHint}>As conversas desta organização aparecerão aqui.</p>}</aside>
      <section className={styles.chatPanel} aria-label="Conversa com o CONG">
        <div className={styles.chatScroll}>
          {!sessionId && <div className={styles.welcome}><img src={mascotHappy} alt="" className={styles.welcomeMascot}/><h2>Primeiro, sua ideia. Depois, seu projeto.</h2><p>Não é preciso conhecer programação. Você explica o que faz e o que precisa; eu faço apenas as perguntas que realmente mudam a solução.</p><div className={styles.goalGrid}>{GOALS.map(item => <button type="button" key={item.id} className={`${styles.goal} ${goal===item.id ? styles.selectedGoal : ""}`} onClick={() => setGoal(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div><div className={styles.example}>Exemplo: “Nossa ONG oferece aulas de reforço e precisamos organizar turmas, matrículas e mostrar nossos projetos.” Conte sua própria realidade — nada será criado antes da sua confirmação.</div></div>}
          {loading && <div className={styles.processing}>Carregando conversa...</div>}
          {current?.session.turns.map((turn,i) => <div key={`${i}-${turn.time}`} className={`${styles.message} ${turn.role === "usuario" ? styles.user : styles.assistant}`}>
            {turn.role === "assistente" && <img src={mascotHappy} alt="" className={styles.messageMascot}/>}
            <div className={styles.messageBody}><div className={styles.messageLabel}>{turn.role === "usuario" ? "Você" : "CONG"}</div>
              <div className={styles.messageContent}>{turn.role==="assistente"?turn.text.replace(/\nPergunta:\s*/i,"\n\n"):turn.text}</div>
            </div></div>)}
          {status==="clarify"&&current?.metrics?.ui_choices && current.metrics.ui_choices.length>0 &&
            <section className={styles.choiceArea} aria-label="Sugestões de resposta do CONG">
              <span>Você pode escolher uma opção ou responder do seu jeito:</span>
              <div className={styles.choiceGrid}>{current.metrics.ui_choices.map(choice=><button key={choice} type="button" disabled={submitting} onClick={()=>{void sendMessage(choice);}}>{choice}<FiArrowRight aria-hidden="true"/></button>)}</div>
            </section>}
          {status === "clarify" && wordsFromUser.length > 1 && <div className={styles.reviewActions}>
            <span>Já deu contexto suficiente? Você pode pedir que eu avance — sem inventar detalhes que faltam.</span>
            <div><button type="button" disabled={submitting} onClick={() => {void sendMessage("Quero avançar com as informações que já forneci. Prepare uma proposta personalizada somente se houver contexto suficiente; se faltar uma decisão indispensável, faça apenas essa pergunta. Não use modelos genéricos nem invente atividades.");}}><FiArrowRight aria-hidden="true"/> Avançar com o que contei</button></div>
          </div>}
          {busy(status) && <div className={styles.processing}><img src={mascotThinking} alt="" className={styles.processingMascot} /> {status === "pending" ? "Já já eu continuo com você. Estou aguardando minha vez..." : "Estou organizando as ideias para o seu projeto..."}</div>}
          {status === "failed" && <div className={styles.warning}><FiXCircle aria-hidden="true" /> Não foi possível gerar a resposta ({current?.error_code || "erro de processamento"}). <button type="button" onClick={() => {void action("retry");}} disabled={submitting}>Tentar novamente</button></div>}
          {status === "cancelled" && <div className={styles.notice}>Esta conversa foi cancelada. Inicie outra conversa para continuar.</div>}
          {status === "propose" && current?.session.plan && <>
            <Proposal plan={current.session.plan} coverage={current.metrics?.coverage_status} missing={current.metrics?.unmet_requirements} />
            <div className={styles.reviewActions}><span>Quer ajustar alguma coisa antes de montar?</span><div>
              {current.session.plan.site&&<button type="button" disabled={submitting} onClick={()=>{setText("CONG, quero revisar as páginas do site: ");}}><FiEdit3/> Rever páginas</button>}
              {current.session.plan.system&&<button type="button" disabled={submitting} onClick={()=>{setText("CONG, quero revisar as funções do sistema: ");}}><FiLayers/> Rever sistema</button>}
              <button type="button" disabled={submitting} onClick={()=>{setText("CONG, tenho outra ideia para acrescentar: ");}}><FiPlus/> Acrescentar ideia</button>
            </div></div>
            <section className={styles.realBuilder} aria-label="Montar projeto de verdade">
              <div className={styles.sectionEyebrow}><FiDroplet aria-hidden="true"/> Agora vamos dar vida ao seu projeto</div>
              <h2>{current.session.plan.site?"Vamos escolher a cara do seu site?":"Vamos preparar seu sistema."}</h2>
              <p>Você poderá revisar tudo no editor depois. Só criarei o rascunho após sua confirmação.</p>
              {current.session.plan.site && <>
                <strong>Qual aparência você prefere para o site?</strong>
                <div className={styles.lookGrid} role="radiogroup" aria-label="Estilo do site">
                  {SITE_LOOKS.map(style => <label key={style.id} className={styles.lookCard} data-selected={look===style.id}>
                    <input type="radio" name="ai-site-look" checked={look===style.id} onChange={()=>setLook(style.id)} disabled={building}/>
                    <span className={`${styles.lookIllustration} ${styles[`look_${style.id}`]}`} aria-hidden="true"><i/><i/><i/></span>
                    <span className={styles.lookCopy}><strong>{style.label}</strong><small>{style.description}</small></span>
                  </label>)}
                </div>
                <div className={styles.paletteHead}><strong><FiDroplet aria-hidden="true"/> Que cores combinam com sua organização?</strong><small>Uma escolha visual, não uma decisão definitiva. Você poderá editar depois.</small></div>
                <div className={styles.paletteGrid} role="radiogroup" aria-label="Paleta de cores">
                  {SITE_PALETTES.map(p=><label className={styles.paletteCard} key={p.id} data-selected={palette?.id===p.id}>
                    <input type="radio" name="cong-palette" checked={palette?.id===p.id} onChange={()=>setPalette(p)} disabled={building}/>
                    <span className={styles.palettePreview} style={{background:p.background,color:p.text}} aria-hidden="true"><i style={{background:p.primary}}/><i style={{background:p.secondary}}/><i style={{background:p.accent}}/></span>
                    <span><strong>{p.label}</strong><small>{p.description}</small></span>
                  </label>)}
                </div>
                {palette&&<div className={styles.siteMockup} style={{"--preview-main":palette.primary,"--preview-secondary":palette.secondary,"--preview-accent":palette.accent,"--preview-bg":palette.background,"--preview-text":palette.text} as CSSProperties}>
                  <div className={styles.siteMockupNav}><span>{nameSite.trim()||organizationName}</span><span className={styles.siteMockupMenu}>{current.session.plan.site.pages.slice(0,3).map(page => page.title).join(" · ")}</span></div>
                  <div className={styles.siteMockupBody}><small>PRÉVIA DO CONTEÚDO PLANEJADO</small><strong>{current.session.plan.site.pages[0]?.sections[0]?.title || current.session.plan.site.name}</strong><p>{current.session.plan.site.pages[0]?.sections[0]?.text || current.session.plan.site.audience}</p>{current.session.plan.site.pages[0]?.sections[0]?.action_label && <span>{current.session.plan.site.pages[0].sections[0].action_label}</span>}</div>
                </div>}
                <div className={styles.logoSection}>
                  <div><strong><FiImage aria-hidden="true"/> Sua organização já tem uma logo?</strong><p>Se tiver, pode usar aqui. Se não tiver, seguimos sem problema. A logo será enviada apenas ao editor do seu site, quando você confirmar a criação.</p></div>
                  <label className={styles.uploadLogo}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>chooseLogo(e.target.files?.[0])} disabled={building}/> {logoFile?"Trocar logo":"Escolher imagem"}</label>
                  {logoPreview&&<div className={styles.logoPreview}><img src={logoPreview} alt="Prévia da logo escolhida"/><span>{logoFile?.name}</span><button type="button" disabled={building} onClick={()=>chooseLogo(undefined)} aria-label="Retirar logo"><FiXCircle/></button></div>}
                  {logoError&&<small role="alert" className={styles.fieldError}>{logoError}</small>}
                </div>
                <label className={styles.builderField}>Nome do site (opcional)
                  <input value={nameSite} onChange={e=>setNameSite(e.target.value)} maxLength={100} placeholder={`Site de ${organizationName}`} disabled={building}/>
                </label>
              </>}
              {current.session.plan.system && <label className={styles.builderField}>Nome do sistema (opcional)
                <input value={nameSystem} onChange={e=>setNameSystem(e.target.value)} maxLength={100} placeholder={`Sistema de ${organizationName}`} disabled={building}/>
              </label>}
              {Boolean(current.metrics?.unmet_requirements?.length) && <div className={styles.warning}>
                <FiAlertCircle aria-hidden="true"/> Encontrei pontos que precisam ser corrigidos antes de criar os rascunhos. Me diga o que ajustar na conversa acima; não vou montar algo incompleto.
              </div>}
              <label className={styles.buildConsent}><input type="checkbox" checked={approved} disabled={building} onChange={e=>setApproved(e.target.checked)}/>
                Confirmo a criação de rascunhos reais na minha organização e entendo que precisarei revisá-los antes de ativar/publicar.
              </label>
              <button type="button" className={styles.buildButton} onClick={()=>{void buildConfirmedDraft();}} disabled={!approved||building||current.metrics?.coverage_status==="needs_review"||Boolean(current.metrics?.unmet_requirements?.length)}>
                <FiLayers aria-hidden="true"/>{building?"Montando rascunhos...":current.metrics?.coverage_status==="needs_review"||Boolean(current.metrics?.unmet_requirements?.length)?"Resolva as pendências para construir":existing?"Atualizar rascunhos existentes":"Criar meus rascunhos"}
              </button>
              {existing && !buildResult && sessionId && (()=>{
                const draft=existingDraft(sessionId);
                return draft && <div className={styles.buildSuccess}>
                  <strong>Esta conversa já possui rascunhos salvos</strong>
                  <div className={styles.buildLinks}>
                    {draft.systemId && <Link to={`/app/sistemas/${draft.systemId}`}>Abrir sistema criado</Link>}
                    {draft.siteId && <Link to={`/app/site-institucional/${draft.siteId}/editor`}>Abrir site criado</Link>}
                  </div>
                  <small>Os links são recuperados deste navegador; as permissões continuam verificadas pela API da CONG.</small>
                </div>;
              })()}
              {buildProgress && <p className={styles.buildProgress} role="status">{buildProgress}</p>}
              {buildError && <p className={styles.error} role="alert">{buildError}</p>}
              {buildResult && <div className={styles.buildSuccess}>
                <strong>Rascunhos criados nos construtores</strong>
                <p>{buildResult.modules} módulo(s) · {buildResult.pages} página(s) · {buildResult.forms} formulário(s) preparado(s).</p>
                <div className={styles.buildLinks}>
                  {buildResult.record.systemId && <Link to={`/app/sistemas/${buildResult.record.systemId}`}><FiLayers/> Abrir sistema</Link>}
                  {buildResult.record.siteId && <Link to={`/app/site-institucional/${buildResult.record.siteId}/editor`}><FiArrowRight/> Editar site</Link>}
                </div>
                {buildResult.warnings.length>0 && <ul>{buildResult.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul>}
                <small>Os formulários ficam desativados até a publicação e a ativação dos respectivos recursos. Revise seus campos e a associação ao site antes disso.</small>
              </div>}
            </section>
          </>}
          <div ref={bottomRef} />
        </div>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <form className={styles.composer} onSubmit={submit}><label htmlFor="cong-ai-text">{status === "propose" ? "Peça uma alteração ou esclarecimento" : status === "clarify" ? "Sua resposta" : "Descreva sua necessidade"}</label><div className={styles.composerBox}><textarea ref={composerRef} id="cong-ai-text" rows={3} maxLength={sessionId ? 3500 : 6500} placeholder={status === "propose" ? "CONG, quero mudar uma parte do projeto..." : "Me conta. Estou ouvindo."} value={text} onChange={e => setText(e.target.value)} disabled={submitting || busy(status) || status === "cancelled"} onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing){e.preventDefault(); e.currentTarget.form?.requestSubmit();}}}/><button type="submit" disabled={submitting || busy(status) || status === "cancelled" || (sessionId ? !text.trim() : text.trim().length<12)} aria-label="Enviar mensagem"><FiSend aria-hidden="true" /></button></div><div className={styles.composerBottom}><span>Enter envia · Shift+Enter quebra linha · Converse como preferir</span>{busy(status) && <button type="button" onClick={() => {void action("cancel");}} disabled={submitting}>Cancelar tarefa</button>}</div></form>
      </section>
      <aside className={styles.briefPanel} aria-label="Acompanhamento do projeto">
        <div className={styles.briefTop}><FiFileText aria-hidden="true"/> Meu projeto</div>
        <h2>{status === "propose" ? "Pronto para revisar" : sessionId ? "Estamos entendendo sua ideia" : "Cada ONG tem sua história"}</h2>
        <p>{status === "propose" ? "Veja a proposta ao lado. Nada é publicado sem você confirmar." : "Tudo começa com o que você conta. O assistente não deve inventar a atuação da sua organização."}</p>
        <div className={styles.briefSection}>
          <h3>Você está criando</h3>
          <span className={styles.briefTag}>{GOALS.find(g => g.id === (current?.session.goal ?? goal))?.label ?? "Projeto"}</span>
        </div>
        <div className={styles.briefSection}>
          <h3>O que você informou</h3>
          {wordsFromUser.length ? wordsFromUser.slice(-3).map((entry, i) => <p className={styles.briefQuote} key={`${i}-${entry.slice(0,25)}`}>{entry.length > 190 ? `${entry.slice(0,190)}…` : entry}</p>) : <div className={styles.briefEmpty}>Suas próprias respostas aparecerão aqui, sem suposições.</div>}
        </div>
        {current?.session.plan && <div className={styles.briefSection}><h3>Rascunho da proposta</h3>
          {current.session.plan.site && <p>{current.session.plan.site.pages.length} página(s) planejada(s) para o site</p>}
          {current.session.plan.system && <p>{current.session.plan.system.modules.length} módulo(s) planejado(s) para o sistema</p>}
          <p>Revise todas as decisões antes de criar.</p></div>}
        <div className={styles.briefSection}><div className={styles.briefHint}>O CONG deve perguntar só o que muda seu projeto. Você pode corrigir qualquer informação a qualquer momento.</div>
          <button className={styles.briefAction} type="button" onClick={focusComposer}>Escrever ou corrigir algo</button>
        </div>
      </aside>
    </div>
  </main>;
}
