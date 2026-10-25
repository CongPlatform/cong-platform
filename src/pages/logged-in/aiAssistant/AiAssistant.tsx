import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../../../contexts/workspace-context";
import { buildAiDraft, existingDraft, SITE_LOOKS, type BuildResult, type SiteLook } from "../../../features/aiBuilder/aiBuilder";
import { FiAlertCircle, FiArrowRight, FiCheckCircle, FiCpu, FiFileText, FiLayers, FiMessageCircle, FiPlus, FiRefreshCw, FiSend, FiServer, FiXCircle } from "react-icons/fi";
import {
  aiCancel, aiDelete, aiDetail, aiReply, aiRetry, aiSessions, aiStart, aiStatus,
  type AiAvailability, type AiGoal, type AiPlan, type AiSessionDetail, type AiSessionSummary,
} from "../../../services/aiAssistantService";
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
    <div className={styles.proposalHead}><FiFileText aria-hidden="true" /><div><strong>Proposta para revisão</strong><p>Confira as sugestões. O resultado da IA é um rascunho: módulos, páginas e formulários não foram criados nem publicados na CONG.</p></div></div>
    {coverage === "needs_review" && <div className={styles.warning}><FiAlertCircle aria-hidden="true" /> Existem requisitos que precisam ser revisados antes de implementar.</div>}
    {Boolean(missing?.length) && <div className={styles.notice}><strong>Necessidades pendentes</strong><ul>{missing?.map((text, index) => <li key={`${index}-${text}`}>{text}</li>)}</ul></div>}
    {plan.system && <article className={styles.previewCard}><div className={styles.previewTitle}><FiLayers aria-hidden="true" /><strong>{plan.system.name}</strong></div><p>{plan.system.description}</p><h3>Módulos sugeridos</h3><div className={styles.modules}>{plan.system.modules.map(module => <div className={styles.module} key={module.alias}><strong>{module.name}</strong><span>{module.description}</span><small>{module.fields.length ? `${module.fields.length} campo(s) configuráveis` : `Módulo ${module.blueprint_key}`}</small></div>)}</div>{plan.system.workflow.length > 0 && <><h3>Fluxo proposto</h3><ol>{plan.system.workflow.map((step, i) => <li key={`${i}-${step.module_alias}`}>{step.title}</li>)}</ol></>}</article>}
    {plan.site && <article className={styles.previewCard}><div className={styles.previewTitle}><FiServer aria-hidden="true" /><strong>{plan.site.name}</strong></div><p>Estilo: {plan.site.style} · Público: {plan.site.audience}</p><h3>Páginas sugeridas</h3><div className={styles.modules}>{plan.site.pages.map(page => <div className={styles.module} key={page.slug}><strong>{page.title}</strong><small>/{page.slug}</small><span>{page.sections.map(section => section.title).filter(Boolean).join(" · ")}</span></div>)}</div></article>}
    {plan.connection.link_system && <article className={styles.previewCard}><div className={styles.previewTitle}><FiArrowRight aria-hidden="true" /><strong>Conexão site e sistema</strong></div>{plan.connection.public_forms.length ? <div className={styles.modules}>{plan.connection.public_forms.map((form, index) => <div className={styles.module} key={`${form.form_module_alias}-${index}`}><strong>{form.name}</strong><span>Destino: {form.target_module_alias} · Página: {form.page_slug}</span><small>{form.bindings.length} campo(s) vinculado(s)</small></div>)}</div> : <p>Nenhum formulário público foi mapeado. Essa conexão ainda exige revisão.</p>}</article>}
    {plan.confirmations.length > 0 && <div className={styles.notice}><strong>Decisões a confirmar</strong><ul>{plan.confirmations.map((text,i) => <li key={i}>{text}</li>)}</ul></div>}
    {plan.limitations.length > 0 && <div className={styles.notice}><strong>Limitações da proposta</strong><ul>{plan.limitations.map((text,i) => <li key={i}>{text}</li>)}</ul></div>}
    <button type="button" className={styles.textButton} onClick={() => setRawOpen(!rawOpen)} aria-expanded={rawOpen}>{rawOpen ? "Ocultar JSON da proposta" : "Ver JSON completo da proposta"}</button>
    {rawOpen && <pre className={styles.rawJson}>{JSON.stringify(plan,null,2)}</pre>}
  </section>;
}

export default function AiAssistant() {
  const { workspace } = useWorkspace();
  const organizationName = workspace.kind === "organization" ? workspace.organization.name : "Organização";
  const [look,setLook] = useState<SiteLook>("human");
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
    selectedRef.current = id; setSessionId(id); setError(""); setLoading(true); setCurrent(null);
    setApproved(false);setBuildError("");setBuildProgress("");setBuildResult(null);
    setExisting(Boolean(existingDraft(id)));
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const message = text.trim();
    if (!message || busy(current?.session.status) || submitting) return;
    setSubmitting(true); setError("");
    try {
      const result = sessionId ? await aiReply(sessionId,message) : await aiStart(goal,message);
      setText("");
      await select(result.session_id);
      await reloadList();
    } catch (e) { setError(errorText(e)); } finally { setSubmitting(false); }
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
  function newConversation() { selectedRef.current = null; setSessionId(null); setCurrent(null); setError(""); setText("");setApproved(false);setBuildResult(null);setExisting(false); }
  async function buildConfirmedDraft(){
    if(!sessionId || !approved || building || current?.session.status!=="propose" || !current.session.plan)return;
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
        turns:current.session.turns.filter(t=>t.role==="usuario").map(t=>t.text),look,
        report:setBuildProgress});
      setBuildResult(result);setExisting(true);setBuildProgress("Rascunhos criados. Abra os construtores para revisar e finalizar.");
    }catch(e){setBuildError(errorText(e));setBuildProgress("Alguns recursos podem ter sido criados. Verifique os links e tente novamente na mesma sessão.");setExisting(Boolean(existingDraft(sessionId)));}
    finally{setBuilding(false);}
  }
  const status = current?.session.status;
  return <main className={styles.page}>
    <header className={styles.header}><div><div className={styles.eyebrow}><FiCpu aria-hidden="true" /> CONG IA · Assistente da organização</div><h1>Construa conversando</h1><p>Explique suas necessidades com suas próprias palavras. A IA pode esclarecer detalhes, sugerir uma solução e ajudar a revisá-la. Nenhuma alteração é aplicada automaticamente.</p><p className={styles.privacyNote}>As mensagens são enviadas ao agente de IA autorizado, que pode estar em outro computador. Não informe dados pessoais reais de beneficiários nesta fase.</p></div><div className={styles.headerActions}><button type="button" className={styles.newButton} onClick={newConversation}><FiPlus aria-hidden="true" /> Nova conversa</button>{sessionId&&<button type="button" className={styles.deleteButton} onClick={()=>{void deleteConversation();}} disabled={submitting}>Excluir conversa</button>}</div></header>
    <div className={styles.statusBar}><span className={availability?.worker_online ? styles.online : styles.offline}>{availability?.worker_online ? <FiCheckCircle aria-hidden="true" /> : <FiAlertCircle aria-hidden="true" />}{availability?.worker_online ? `Agente conectado · ${availability.model}` : "Agente não conectado"}</span><span>Fila: {availability?.queue_size ?? "—"}</span><button type="button" className={styles.textButton} onClick={() => {void Promise.allSettled([aiStatus().then(setAvailability),reloadList()]);}}><FiRefreshCw aria-hidden="true" /> Atualizar status</button></div>
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="Conversas anteriores"><h2>Suas conversas</h2>{sessions.length ? sessions.map(s => <button type="button" className={`${styles.historyItem} ${sessionId===s.id ? styles.active : ""}`} key={s.id} onClick={() => {void select(s.id);}}><FiMessageCircle aria-hidden="true" /><span><strong>{GOALS.find(g=>g.id===s.goal)?.label ?? s.goal}</strong><small>{new Date(s.updated_at).toLocaleString("pt-BR")}</small></span></button>) : <p className={styles.emptyHint}>As conversas desta organização aparecerão aqui.</p>}</aside>
      <section className={styles.chatPanel} aria-label="Conversa com a IA">
        <div className={styles.chatScroll}>
          {!sessionId && <div className={styles.welcome}><FiMessageCircle aria-hidden="true" /><h2>Por onde começamos?</h2><p>Você não precisa saber programar. Pode explicar o problema de maneira simples, como faria numa conversa.</p><div className={styles.goalGrid}>{GOALS.map(item => <button type="button" key={item.id} className={`${styles.goal} ${goal===item.id ? styles.selectedGoal : ""}`} onClick={() => setGoal(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div><div className={styles.example}>Exemplo: “A gente recebe doações e ajuda famílias, mas tudo fica perdido no WhatsApp. Queria um site e um jeito de organizar isso.”</div></div>}
          {loading && <div className={styles.processing}>Carregando conversa...</div>}
          {current?.session.turns.map((turn,i) => <div key={`${i}-${turn.time}`} className={`${styles.message} ${turn.role === "usuario" ? styles.user : styles.assistant}`}><div className={styles.messageLabel}>{turn.role === "usuario" ? "Você" : "CONG IA"}</div><div className={styles.messageContent}>{turn.text}</div></div>)}
          {busy(status) && <div className={styles.processing}><FiCpu aria-hidden="true" /> {status === "pending" ? "Aguardando agente disponível na fila..." : "A IA está preparando uma resposta..."}</div>}
          {status === "failed" && <div className={styles.warning}><FiXCircle aria-hidden="true" /> Não foi possível gerar a resposta ({current?.error_code || "erro de processamento"}). <button type="button" onClick={() => {void action("retry");}} disabled={submitting}>Tentar novamente</button></div>}
          {status === "cancelled" && <div className={styles.notice}>Esta conversa foi cancelada. Inicie outra conversa para continuar.</div>}
          {status === "propose" && current?.session.plan && <>
            <Proposal plan={current.session.plan} coverage={current.metrics?.coverage_status} missing={current.metrics?.unmet_requirements} />
            <section className={styles.realBuilder} aria-label="Montar projeto de verdade">
              <h2>Montar de verdade na CONG</h2>
              <p>O próximo passo usa os construtores reais da CONG. Você escolhe o visual e confirma a criação de <strong>rascunhos editáveis</strong>. Nada é ativado ou publicado automaticamente.</p>
              {current.session.plan.site && <>
                <strong>Qual aparência você prefere para o site?</strong>
                <div className={styles.lookGrid} role="radiogroup" aria-label="Estilo do site">
                  {SITE_LOOKS.map(style => <label key={style.id} className={styles.lookCard} data-selected={look===style.id}>
                    <input type="radio" name="ai-site-look" checked={look===style.id} onChange={()=>setLook(style.id)} disabled={building}/>
                    <span><strong>{style.label}</strong><small>{style.description}</small></span>
                  </label>)}
                </div>
                <label className={styles.builderField}>Nome do site (opcional)
                  <input value={nameSite} onChange={e=>setNameSite(e.target.value)} maxLength={100} placeholder={`Site de ${organizationName}`} disabled={building}/>
                </label>
              </>}
              {current.session.plan.system && <label className={styles.builderField}>Nome do sistema (opcional)
                <input value={nameSystem} onChange={e=>setNameSystem(e.target.value)} maxLength={100} placeholder={`Sistema de ${organizationName}`} disabled={building}/>
              </label>}
              {Boolean(current.metrics?.unmet_requirements?.length) && <div className={styles.warning}>
                <FiAlertCircle aria-hidden="true"/> Existem pendências na proposta. A CONG tentará montar os componentes válidos; confira os avisos e os vínculos antes de publicar.
              </div>}
              <label className={styles.buildConsent}><input type="checkbox" checked={approved} disabled={building} onChange={e=>setApproved(e.target.checked)}/>
                Confirmo a criação de rascunhos reais na minha organização e entendo que precisarei revisá-los antes de ativar/publicar.
              </label>
              <button type="button" className={styles.buildButton} onClick={()=>{void buildConfirmedDraft();}} disabled={!approved||building}>
                <FiLayers aria-hidden="true"/>{building?"Montando rascunhos...":existing?"Atualizar rascunhos existentes":"Criar sistema e/ou site de verdade"}
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
        <form className={styles.composer} onSubmit={submit}><label htmlFor="cong-ai-text">{status === "propose" ? "Peça uma alteração ou esclarecimento" : status === "clarify" ? "Sua resposta" : "Descreva sua necessidade"}</label><div className={styles.composerBox}><textarea id="cong-ai-text" rows={3} maxLength={sessionId ? 3500 : 6500} placeholder={status === "propose" ? "Queria incluir roupas infantis, e também..." : "Escreva como preferir. Não precisa responder em uma frase."} value={text} onChange={e => setText(e.target.value)} disabled={submitting || busy(status) || status === "cancelled"} onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing){e.preventDefault(); e.currentTarget.form?.requestSubmit();}}}/><button type="submit" disabled={submitting || busy(status) || status === "cancelled" || (sessionId ? !text.trim() : text.trim().length<12)} aria-label="Enviar mensagem"><FiSend aria-hidden="true" /></button></div><div className={styles.composerBottom}><span>Enter envia · Shift+Enter quebra linha · Até 4 perguntas por versão</span>{busy(status) && <button type="button" onClick={() => {void action("cancel");}} disabled={submitting}>Cancelar tarefa</button>}</div></form>
      </section>
    </div>
  </main>;
}
