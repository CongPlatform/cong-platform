import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
  const [availability, setAvailability] = useState<AiAvailability | null>(null);
  const [sessions, setSessions] = useState<AiSessionSummary[]>([]);
  const [current, setCurrent] = useState<AiSessionDetail | null>(null);
  const [goal, setGoal] = useState<AiGoal>("both");
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
  function newConversation() { selectedRef.current = null; setSessionId(null); setCurrent(null); setError(""); setText(""); }
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
          {status === "propose" && current?.session.plan && <Proposal plan={current.session.plan} coverage={current.metrics?.coverage_status} missing={current.metrics?.unmet_requirements} />}
          <div ref={bottomRef} />
        </div>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <form className={styles.composer} onSubmit={submit}><label htmlFor="cong-ai-text">{status === "propose" ? "Peça uma alteração ou esclarecimento" : status === "clarify" ? "Sua resposta" : "Descreva sua necessidade"}</label><div className={styles.composerBox}><textarea id="cong-ai-text" rows={3} maxLength={sessionId ? 3500 : 6500} placeholder={status === "propose" ? "Queria incluir roupas infantis, e também..." : "Escreva como preferir. Não precisa responder em uma frase."} value={text} onChange={e => setText(e.target.value)} disabled={submitting || busy(status) || status === "cancelled"} onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing){e.preventDefault(); e.currentTarget.form?.requestSubmit();}}}/><button type="submit" disabled={submitting || busy(status) || status === "cancelled" || (sessionId ? !text.trim() : text.trim().length<12)} aria-label="Enviar mensagem"><FiSend aria-hidden="true" /></button></div><div className={styles.composerBottom}><span>Enter envia · Shift+Enter quebra linha · Até 4 perguntas por versão</span>{busy(status) && <button type="button" onClick={() => {void action("cancel");}} disabled={submitting}>Cancelar tarefa</button>}</div></form>
      </section>
    </div>
  </main>;
}
