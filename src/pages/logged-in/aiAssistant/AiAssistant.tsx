import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { study, type State as StudyState } from "../../../study-overlay/client";
import { Link } from "react-router-dom";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import { listInstitutionalSites, getInstitutionalSite } from "../../../services/institutionalService";
import { listOperationalSystems } from "../../../features/operational/operationalService";
import { createPortal } from "react-dom";
import { useWorkspace } from "../../../contexts/workspace-context";
import { buildAiDraft, existingDraft, SITE_LOOKS, SITE_PALETTES, type BuildResult, type SiteLook, type SitePalette } from "../../../features/aiBuilder/aiBuilder";
import { FiAlertCircle, FiArrowRight, FiFileText, FiLayers, FiMessageCircle, FiPlus, FiRefreshCw, FiSend, FiServer, FiXCircle, FiImage, FiDroplet, FiEdit3, FiArrowLeft, FiTrash2, FiInfo, FiClipboard, FiX } from "react-icons/fi";
import {
  aiCancel, aiDelete, aiDetail, aiReply, aiRetry, aiSessions, aiStart, aiStatus, aiSaveMemory, aiRevokeProject, aiInspectProject,
  type AiAvailability, type AiGoal, type AiMemory, type AiPlan, type AiSessionDetail, type AiSessionSummary, type AiProjectContext,
} from "../../../services/aiAssistantService";
import congMark from "../../../assets/brand/logo-mark.webp";
import mascotHappy from "../../../assets/mascot/cong-happy.webp";
import mascotThinking from "../../../assets/mascot/cong-thinking.webp";
import styles from "./AiAssistant.module.css";

const GOALS: { id: AiGoal; label: string; description: string }[] = [
  { id: "both", label: "Site e sistema", description: "Tudo conectado" },
  { id: "system", label: "Sistema", description: "Organização interna" },
  { id: "site", label: "Site", description: "Presença institucional" },
];
const STARTERS = [
  { title: "Explorar possibilidades", description: "Entenda como a CONG pode ajudar", message: "Quais possibilidades a CONG oferece? Quero entender sites, sistemas, formulários, integrações e o que já está disponível, sem começar a criar agora.", icon: FiMessageCircle },
  { title: "Tirar uma dúvida", description: "Pode perguntar qualquer coisa sobre a plataforma", message: "", icon: FiInfo },
  { title: "Planejar um site", description: "Descubra a melhor presença para a ONG", message: "Quero planejar um site para minha organização e descobrir uma identidade visual própria.", icon: FiServer },
  { title: "Organizar processos", description: "Construa um sistema adequado à rotina", message: "Quero estudar possibilidades para organizar os processos da minha organização usando os módulos da CONG.", icon: FiLayers },
  { title: "Conectar recursos", description: "Site, sistema e formulários juntos", message: "Quais formas existem de conectar um site, um sistema interno e formulários na CONG? Primeiro, quero entender as possibilidades.", icon: FiArrowRight },
];
type RecentProject={id:string;kind:"site"|"system";title:string;updatedAt:string;moduleCount?:number};
type ProjectPreview={status:"loading"|"ready"|"error";pages?:{title:string;sections:number}[]};
const projectKey=(project:RecentProject)=>`${project.kind}:${project.id}`;
const safeDate=(value:string)=>{const date=new Date(value);return Number.isNaN(date.getTime())?"Data não disponível":date.toLocaleDateString("pt-BR");};
// O foco nasce da conversa e pode mudar; escolher uma modalidade é opcional.
function inferGoal(message:string, previous:AiGoal):AiGoal{
 const normalized=message.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const create=/(?:\bcriar\b|\bmontar\b|\bconstruir\b|\bplanejar\b|\bgerar\b|\bdesenvolver\b|\bquero um\b|\bquero uma\b)/.test(normalized);
 if(!create)return previous;
 const site=/\bsite\b|\bpagina\b|\bwebsite\b/.test(normalized);
 const system=/\bsistema\b|\bsistemas\b|\bmodulo\b/.test(normalized);
 return site&&system?"both":site?"site":system?"system":previous;
}
const busy = (status?: string) => status === "pending" || status === "processing";
// Códigos internos da API/modelo e mensagens de infraestrutura não devem aparecer na interface.
// Detalhes técnicos continuam disponíveis no backend para diagnóstico.
const errorText = (error: unknown) => {
  const raw = error instanceof Error ? error.message : "";
  if (/401|unauthorized|autentica(?:ção|cao)|sess[aã]o expirada/i.test(raw))
    return "Sua sessão pode ter expirado. Entre novamente e tente outra vez.";
  if (/403|forbidden|permiss[aã]o|acesso negado/i.test(raw))
    return "Você não tem permissão para concluir esta ação neste projeto.";
  if (/429|rate.?limit|muitas solicita[cç][oõ]es/i.test(raw))
    return "Recebi muitos pedidos ao mesmo tempo. Tente novamente em instantes.";
  return "Não consegui concluir isso agora. Sua conversa continua salva; tente novamente.";
};

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

// Formatação segura (sem HTML, scripts ou links arbitrários): evita mostrar **Markdown** cru.
function InlineText({value}:{value:string}){
 const pieces=value.split(/(\*\*[^*\n]+\*\*)/g);
 return <>{pieces.map((piece,i)=>piece.startsWith("**")&&piece.endsWith("**")?<strong key={i}>{piece.slice(2,-2)}</strong>:<span key={i}>{piece}</span>)}</>;
}
function ConversationalText({value}:{value:string}){
 const paragraphs:ReactNode[]=[];let pending:string[]=[];
 const flush=()=>{if(pending.length){const content=pending.join("\n");paragraphs.push(<p key={paragraphs.length}><InlineText value={content}/></p>);pending=[]}};
 for(const line of value.trim().split("\n")){
  const match=line.trim().match(/^(?:[-•]\s+|\d+[.)]\s+)(.+)$/);
  if(match){flush();paragraphs.push(<div className={styles.messageListLine} key={paragraphs.length}><span aria-hidden="true">•</span><span><InlineText value={match[1]}/></span></div>)}
  else if(!line.trim())flush();else pending.push(line);
 }
 flush();return <div className={styles.richMessage}>{paragraphs}</div>;
}

export default function AiAssistant() {
  const [studyAiBlocked,setStudyAiBlocked] = useState<boolean|null>(import.meta.env.VITE_STUDY_ENABLED === "true" ? null : false);
  useEffect(()=>{
    if(import.meta.env.VITE_STUDY_ENABLED !== "true")return;
    let active=true;
    study<StudyState>("/me").then(result=>{
      if(!active)return;
      setStudyAiBlocked(result.runs.some(run=>run.status === "running" && run.condition === "sem_ia"));
    }).catch(()=>{if(active)setStudyAiBlocked(false);});
    return ()=>{active=false;};
  },[]);
  const { workspace } = useWorkspace();
  const organizationName = workspace.kind === "organization" ? workspace.organization.name : "Organização";
  const workspaceIdentity=workspace.kind === "organization" ? workspace.organization.name : "pessoal";
  const [look,setLook] = useState<SiteLook>("human");
  const [palette,setPalette] = useState<SitePalette|null>(null);
  const [customPalette,setCustomPalette] = useState<SitePalette>({id:"personalizada",label:"Minha paleta",description:"Criada aqui, para este projeto",primary:"#275b95",secondary:"#479c91",accent:"#e5a54c",background:"#f8fafc",text:"#203047"});
  function changeCustomPalette(key:"primary"|"secondary"|"accent"|"background"|"text", value:string){
    setCustomPalette(old=>{const next={...old,[key]:value};setPalette(next);return next;});
  }

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
  const [goalChosen, setGoalChosen] = useState(() => new URLSearchParams(window.location.search).has("goal"));
  const [editingMemory,setEditingMemory] = useState<AiMemory|null>(null);
  const [savingMemory,setSavingMemory] = useState(false);
  const [recentProjects,setRecentProjects] = useState<RecentProject[]>([]);
  const [projectListOpen,setProjectListOpen] = useState(false);
  const [projectListError,setProjectListError] = useState("");
  const [projectPreviews,setProjectPreviews] = useState<Record<string,ProjectPreview>>({});
  const [projectBusy,setProjectBusy] = useState(false);
  const [projectConsent,setProjectConsent] = useState<AiProjectContext|null>(null);
  const [projectNotice,setProjectNotice] = useState("");
  const [confirmAction,setConfirmAction] = useState<{kind:"delete";id:string}|{kind:"project";project:RecentProject}|{kind:"build"}|null>(null);
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [error, setError] = useState("");
  // O estúdio ocupa a janela inteira, inclusive quando chamado de dentro
  // do layout autenticado. O conteúdo é montado diretamente no body.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const refresh = useCallback(async (id: string) => {
    const detail = await aiDetail(id);
    if (selectedRef.current === id) {setCurrent(detail);if(detail.session.memory.projectContext)setProjectConsent(detail.session.memory.projectContext);}
    return detail;
  }, []);
  const select = useCallback(async (id: string) => {
    const changingConversation=selectedRef.current!==id;
    selectedRef.current = id; setSessionId(id); setError(""); setLoading(true); setCurrent(null);setInsightsOpen(false);
    setApproved(false);setBuildError("");setBuildProgress("");setBuildResult(null);setEditingMemory(null);setProjectConsent(null);setProjectListOpen(false);setProjectListError("");setProjectNotice("");
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
  // Somente metadados de projetos que os endpoints autenticados permitem listar.
  // A consulta não autoriza criação, edição ou publicação.
  useEffect(() => {
    let disposed=false;
    void Promise.allSettled([listInstitutionalSites(),listOperationalSystems()]).then(([sites,systems])=>{
      if(disposed)return;
      const recent:RecentProject[]=[
        ...(sites.status==="fulfilled"?sites.value.map(p=>({id:p.id,kind:"site" as const,title:p.name,updatedAt:p.updatedAt})):[]),
        ...(systems.status==="fulfilled"?systems.value.map(p=>({id:p.id,kind:"system" as const,title:p.name,updatedAt:p.updatedAt,moduleCount:p.moduleCount})):[]),
      ].sort((a,b)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()).slice(0,24);
      setRecentProjects(recent);
    });
    return ()=>{disposed=true};
  },[workspaceIdentity]);
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
  async function readonlyProjectContext(project:RecentProject):Promise<AiProjectContext>{
    if(project.kind==="system"){
      // Este serviço expõe contagem de módulos, não dados internos do sistema.
      return {kind:"system",title:project.title,updated_at:project.updatedAt,
        structure:JSON.stringify({nome:project.title,quantidade_de_modulos:project.moduleCount??null,
          limite:"Os módulos internos e seus registros não foram obtidos por esta consulta. Não invente conteúdo."})};
    }
    const site=await getInstitutionalSite(project.id);
    const pages=site.pages.slice(0,16).map(page=>({
      titulo:page.title,
      secoes:page.sections.slice(0,16).map(section=>{
        const source=section as unknown as Record<string,unknown>;
        // Apenas campos editoriais conhecidos; exclui respostas de formulários, autenticação e registros pessoais.
        const details:Record<string,string>={tipo:section.sectionType};
        for(const key of ["title","subtitle","description","text","content","actionLabel"]){
          if(typeof source[key]==="string")details[key]=String(source[key]).slice(0,340);
        }
        return details;
      }),
    }));
    return {kind:"site",title:project.title,updated_at:project.updatedAt,
      structure:JSON.stringify({nome:project.title,paginas:pages,
        limite:"Conteúdo editorial conhecido; sem renderização visual, sem dados de inscrições."}).slice(0,9500)};
  }
  function matchingProject(message:string):RecentProject|undefined{
    const term=message.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const matches=recentProjects.filter(project=>term.includes(project.title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()));
    if(matches.length)return matches[0];
    if(/\b(?:meu|meus|me|o|um)\s+(?:site|sites)\b|\bsite\b/.test(term))return recentProjects.find(p=>p.kind==="site");
    if(/\b(?:meu|meus|o|um)\s+(?:sistema|sistemas)\b|\bsistema\b/.test(term))return recentProjects.find(p=>p.kind==="system");
    return undefined;
  }
  async function sendMessage(message:string) {
    if(!message.trim()||busy(current?.session.status)||submitting)return;
    setSubmitting(true); setError("");
    try {
      const inferredGoal=inferGoal(message,sessionId?(current?.session.goal??goal):goal);
      let context=projectConsent;
      // Ao citar um projeto, uso somente a leitura que a própria conta já possui.
      // Nunca solicito consentimento de EDIÇÃO para uma consulta e nunca altero o projeto aqui.
      const candidate=matchingProject(message);
      const changeFocus=Boolean(candidate && context && !context.title.includes(candidate.title));
      if(!context || changeFocus){
        const project=candidate;
        if(project){
          try{
            context=await readonlyProjectContext(project);
            const normalized=message.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
            const other=recentProjects.find(p=>p.kind!==project.kind);
            if(other && /site/.test(normalized) && /sistema/.test(normalized)){
              const second=await readonlyProjectContext(other);
              context={...context,title:`${context.title} + ${second.title}`.slice(0,150),
                structure:JSON.stringify({projetos:[{tipo:project.kind,estrutura:context.structure},{tipo:other.kind,estrutura:second.structure}]}).slice(0,10000)};
            }
            setProjectConsent(context);
          }catch{setProjectNotice("Não consegui ler esse projeto agora. Vou responder sem fingir que o examinei.");}
        }
      }
      const result = sessionId ? await aiReply(sessionId,message.trim(),context,inferredGoal) : await aiStart(inferredGoal,message.trim(),context);
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
  async function deleteConversation(id: string) {
    if (submitting || building) return;
    setSubmitting(true); setError("");
    try {
      await aiDelete(id);
      if (selectedRef.current === id) newConversation();
      await reloadList();
    } catch (e) { setError(errorText(e)); }
    finally { setSubmitting(false); }
  }
  function newConversation() { setConfirmAction(null);setProjectConsent(null);setProjectListOpen(false);setProjectListError("");setProjectNotice("");setEditingMemory(null);setInsightsOpen(false);selectedRef.current = null; setSessionId(null); setCurrent(null); setError(""); setText("");setApproved(false);setBuildResult(null);setExisting(false);setPalette(null);setLogoFile(null);setLogoPreview("");setLogoError(""); }
  async function buildConfirmedDraft(){
    if(!sessionId || !approved || building || current?.session.status!=="propose" || !current.session.plan || current.metrics?.coverage_status==="needs_review" || Boolean(current.metrics?.unmet_requirements?.length))return;
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
  const closeProjectPicker=useCallback(()=>setProjectListOpen(false),[]);
  async function findRecentProjects(){
    setProjectBusy(true);setProjectListError("");setProjectNotice("");setProjectListOpen(true);
    try{
      const [sitesResult,systemsResult]=await Promise.allSettled([listInstitutionalSites(),listOperationalSystems()]);
      const sites=sitesResult.status==="fulfilled"?sitesResult.value:[];
      const systems=systemsResult.status==="fulfilled"?systemsResult.value:[];
      // Reserve espaço para cada tipo: muitos sites recentes não podem esconder os sistemas.
      const newest=(a:RecentProject,b:RecentProject)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime();
      const siteProjects:RecentProject[]=sites.map((site):RecentProject=>({id:site.id,kind:"site",title:site.name,updatedAt:site.updatedAt})).sort(newest).slice(0,12);
      const systemProjects:RecentProject[]=systems.map((system):RecentProject=>({id:system.id,kind:"system",title:system.name,updatedAt:system.updatedAt,moduleCount:system.moduleCount})).sort(newest).slice(0,12);
      const items:RecentProject[]=[...siteProjects,...systemProjects].sort(newest);
      setRecentProjects(items);
      if(sitesResult.status==="rejected" && systemsResult.status==="rejected"){
        setProjectListError("Não consegui carregar seus projetos. Confira a conexão e tente de novo.");
      }else if(sitesResult.status==="rejected"){
        setProjectListError("Consegui carregar os sistemas, mas a lista de sites está indisponível agora.");
      }else if(systemsResult.status==="rejected"){
        setProjectListError("Consegui carregar os sites, mas a lista de sistemas está indisponível agora.");
      }
    }catch{
      setProjectListError("Não consegui carregar os projetos agora. Tente novamente.");
    }finally{setProjectBusy(false)}
  }
  async function previewProject(project:RecentProject){
    if(project.kind!=="site")return;
    const key=projectKey(project);
    if(projectPreviews[key])return;
    setProjectPreviews(old=>({...old,[key]:{status:"loading"}}));
    try{
      const detail=await getInstitutionalSite(project.id);
      const pages=detail.pages.slice(0,6).map(page=>({title:page.title,sections:page.sections.length}));
      setProjectPreviews(old=>({...old,[key]:{status:"ready",pages}}));
    }catch{
      setProjectPreviews(old=>({...old,[key]:{status:"error"}}));
    }
  }
  async function allowProject(project:RecentProject){
    setProjectBusy(true);setProjectNotice("");
    try{
      const context=await readonlyProjectContext(project);
      setProjectConsent(context);
      setProjectListOpen(false);
      const recentRequest=current?.session.turns.filter(t=>t.role==="usuario").at(-1)?.text??"";
      const shouldInspect=Boolean(sessionId && (current?.session.status==="clarify"||current?.session.status==="propose") && /\b(?:olha|analis\w*|avali\w*|revis\w*|examin\w*|explor\w*|o que acha|meu site|meu sistema)\b/i.test(recentRequest));
      if(shouldInspect && sessionId){
        setProjectNotice("Vou conferir a estrutura disponível. Ainda não vejo a aparência renderizada da página.");
        const result=await aiInspectProject(sessionId,context);
        await select(result.session_id); await reloadList();
      }else{
        setProjectNotice(busy(current?.session.status)
          ? "Projeto selecionado. Assim que eu terminar, posso analisar sua estrutura."
          : "Já posso usar a estrutura que consegui consultar. Posso analisá-la agora.");
      }
    }catch(e){setProjectNotice("Não consegui acessar esse projeto com suas permissões: "+errorText(e));}
    finally{setProjectBusy(false)}
  }
  async function revokeProject(){
    if(sessionId){
      setProjectBusy(true);
      try{await aiRevokeProject(sessionId);setProjectConsent(null);await refresh(sessionId);setProjectNotice("Retirei este projeto do contexto desta conversa.");}
      catch(e){setProjectNotice(errorText(e));}finally{setProjectBusy(false)}
    }else{setProjectConsent(null);setProjectNotice("Contexto desativado.");}
  }
  async function inspectCurrentProject(){
    if(!projectConsent || !sessionId || projectBusy || busy(current?.session.status))return;
    setProjectBusy(true);setProjectNotice("");
    try{
      const result=await aiInspectProject(sessionId,projectConsent);
      await select(result.session_id);
      await reloadList();
    }catch{
      setProjectNotice("Não consegui analisar este projeto agora. Você pode continuar a conversa e tentar de novo.");
    }finally{setProjectBusy(false)}
  }
  async function saveUnderstanding(){
    if(!sessionId||!editingMemory||savingMemory||busy(current?.session.status))return;
    setSavingMemory(true);setError("");
    try{
      await aiSaveMemory(sessionId,{summary:editingMemory.summary,facts:editingMemory.facts.filter(f=>f.key.trim()&&f.value.trim()),assumptions:editingMemory.assumptions.filter(Boolean)});
      setEditingMemory(null);await refresh(sessionId);
    }catch(e){setError(errorText(e));}finally{setSavingMemory(false)}
  }
  const isGuidance=current?.last_result?.phase==="guide"||current?.metrics?.conversation_mode==="guidance";
  const status = current?.session.status;
  const wordsFromUser = current?.session.turns.filter(t => t.role === "usuario").map(t => t.text) ?? [];
  const composerRef = useRef<HTMLTextAreaElement>(null);
  function focusComposer() { composerRef.current?.focus(); }
  if(studyAiBlocked===null)return <main style={{padding:32}} role="status">Conferindo a etapa da pesquisa…</main>;
  if(studyAiBlocked)return <main style={{maxWidth:620,margin:"64px auto",padding:28,lineHeight:1.6}}>
    <h1>Etapa sem assistência de IA</h1>
    <p>Esta atividade deve ser realizada sem o assistente para que a comparação do estudo seja válida.</p>
    <Link to="/pesquisa/entrar">Voltar à tarefa da pesquisa</Link>
  </main>;
  return createPortal(<><main className={styles.page} data-cong-ai-studio="true" aria-label="Criar com o CONG">
    <header className={styles.studioToolbar}>
      <div className={styles.studioIdentity}>
        <Link className={styles.backLink} to="/app/comunidade" title="Voltar à CONG"><FiArrowLeft aria-hidden="true"/><span>Voltar</span></Link>
        <span className={styles.toolbarDivider} aria-hidden="true"/>
        <img className={styles.studioMark} src={congMark} alt="" />
        <div className={styles.studioName}><strong>Criar com o CONG</strong><small>Estúdio de criação</small></div>
      </div>
      <div className={styles.toolbarActions}>
        <span className={availability?.worker_online ? styles.workerOnline : styles.workerOffline} role="status" aria-label={availability?.worker_online ? "Agente de IA disponível" : "Agente de IA indisponível"}>
          <i aria-hidden="true"/>{availability?.worker_online ? "IA disponível" : "IA indisponível"}
        </span>
        <button type="button" className={styles.insightToggle} aria-expanded={insightsOpen} aria-controls="cong-ai-understanding" onClick={() => setInsightsOpen(value => !value)}><FiClipboard aria-hidden="true"/> <span>O que entendi</span></button>
        <button className={styles.refreshButton} type="button" title="Atualizar disponibilidade" aria-label="Atualizar disponibilidade" onClick={() => {void Promise.allSettled([aiStatus().then(setAvailability),reloadList()]);}}><FiRefreshCw aria-hidden="true"/></button>
        <button type="button" className={styles.newButton} onClick={newConversation}><FiPlus aria-hidden="true"/> Nova conversa</button>
      </div>
    </header>
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="Conversas anteriores">
        <div className={styles.sidebarHeading}><h2>Conversas</h2><span>{sessions.length}</span></div>
        {sessions.length ? sessions.map(s => <div className={styles.historyEntry} key={s.id}>
          <button type="button" className={`${styles.historyItem} ${sessionId===s.id ? styles.active : ""}`} aria-current={sessionId===s.id ? "page" : undefined} onClick={() => {void select(s.id);}}>
            <FiMessageCircle aria-hidden="true"/><span><strong>{s.title?.trim() || (GOALS.find(g=>g.id===s.goal)?.label ?? s.goal)}</strong><small>{new Date(s.updated_at).toLocaleString("pt-BR")}</small></span>
          </button>
          <button type="button" className={styles.historyDelete} title="Excluir conversa" aria-label={`Excluir conversa de ${new Date(s.updated_at).toLocaleString("pt-BR")}`} onClick={() => setConfirmAction({kind:"delete",id:s.id})} disabled={submitting || building}><FiTrash2 aria-hidden="true"/></button>
        </div>) : <p className={styles.emptyHint}>Suas conversas aparecerão aqui.</p>}
        <p className={styles.historyPrivacy}><FiInfo aria-hidden="true"/> Cada conversa é privada para seu usuário nesta organização.</p>
      </aside>
      <section className={styles.chatPanel} aria-label="Conversa com o CONG">
        <div className={styles.chatScroll}>
          {!sessionId && <div className={styles.welcome}>
            <div className={styles.welcomeIntroduction}>
              <div className={styles.welcomePortrait}><img src={mascotHappy} alt="Mascote gorila da CONG" className={styles.welcomeMascot}/><span className={styles.portraitSparkle} aria-hidden="true">✦</span></div>
              <div className={styles.welcomeText}><span className={styles.welcomeEyebrow}><span aria-hidden="true" className={styles.welcomeSignal}/> Opa! Cheguei.</span>
                <h2>Chega mais! Eu sou o CONG.</h2>
                <p>Tem uma dúvida? Manda. Quer que eu dê uma olhada num projeto ou te ajude a criar algo do zero? Eu penso com você, sem pressa de sair construindo qualquer coisa.</p>
              </div>
            </div>
            <div className={styles.starterIntro}><strong>Como posso ajudar hoje?</strong><span>Escolha um caminho ou escreva do seu jeito.</span></div>
            <div className={styles.starterGrid}>{STARTERS.map(item => <button type="button" className={styles.starterCard} key={item.title} onClick={() => { if (item.message) {void sendMessage(item.message);} else {focusComposer();} }} disabled={submitting}>
              <span className={styles.starterIcon}><item.icon aria-hidden="true"/></span><span className={styles.starterText}><strong>{item.title}</strong><small>{item.description}</small></span><FiArrowRight className={styles.starterArrow} aria-hidden="true" />
            </button>)}</div>
            <details className={styles.creationOptions}><summary>Já sabe o que quer criar? <span>Escolher foco do projeto</span></summary>
              <div className={styles.goalGrid}>{GOALS.map(item => <button type="button" key={item.id} className={`${styles.goal} ${goalChosen && goal===item.id ? styles.selectedGoal : ""}`} onClick={() => {setGoal(item.id);setGoalChosen(true);focusComposer();}}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div>
            </details>
            <p className={styles.welcomeFootnote}>Nenhuma alteração será aplicada à sua organização sem confirmação. Também posso apenas conversar e orientar.</p>
          </div>}
          {loading && <div className={styles.processing}>Carregando conversa...</div>}
          {current?.session.turns.map((turn,i) => <div key={`${i}-${turn.time}`} className={`${styles.message} ${turn.role === "usuario" ? styles.user : styles.assistant}`}>
            {turn.role === "assistente" && <img src={mascotHappy} alt="" className={styles.messageMascot}/>}
            <div className={styles.messageBody}><div className={styles.messageLabel}>{turn.role === "usuario" ? "Você" : "CONG"}</div>
              <div className={styles.messageContent}>{turn.role==="assistente"?<ConversationalText value={turn.text.replace(/\nPergunta:\s*/i,"\n\n")}/>:turn.text}</div>
            </div></div>)}
          {status==="clarify"&&current?.metrics?.ui_choices && current.metrics.ui_choices.length>0 &&
            <section className={styles.choiceArea} aria-label="Sugestões de resposta do CONG">
              <span>Você pode escolher uma opção ou responder do seu jeito:</span>
              <div className={styles.choiceGrid}>{current.metrics.ui_choices.map(choice=><button key={choice} type="button" disabled={submitting} onClick={()=>{void sendMessage(choice);}}>{choice}<FiArrowRight aria-hidden="true"/></button>)}</div>
            </section>}
          {status === "clarify" && !isGuidance && Boolean(current?.session.plan) && wordsFromUser.length > 1 && <div className={styles.reviewActions}>
            <span>Já deu contexto suficiente? Você pode pedir que eu avance — sem inventar detalhes que faltam.</span>
            <div><button type="button" disabled={submitting} onClick={() => {void sendMessage("Quero avançar com as informações que já forneci. Prepare uma proposta personalizada somente se houver contexto suficiente; se faltar uma decisão indispensável, faça apenas essa pergunta. Não use modelos genéricos nem invente atividades.");}}><FiArrowRight aria-hidden="true"/> Avançar com o que contei</button></div>
          </div>}
          {busy(status) && <div className={styles.activeThinking} role="status" aria-live="polite">
            <span className={styles.thinkingPortrait}><img src={mascotThinking} alt=""/></span>
            <span className={styles.thinkingCopy}><strong>{status === "pending" ? "Já peguei sua mensagem!" : "Deixa comigo, tô juntando as ideias..."}</strong><small>{status === "pending" ? "Assim que chegar minha vez, te respondo." : "Só um instante, quero te ajudar direitinho."}</small></span>
            <span className={styles.thinkingDots} aria-hidden="true"><i/><i/><i/></span>
          </div>}
          {status === "failed" && <div className={styles.warning}><FiXCircle aria-hidden="true" /> Ops! Não consegui concluir essa resposta. Sua conversa está salva. <button type="button" onClick={() => {void action("retry");}} disabled={submitting}>Tentar novamente</button></div>}
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
                <div className={styles.customPalette}>
                  <div><strong>Quer ajustar as cores do seu jeito?</strong><small>Você pode montar sua própria combinação e ver na prévia. Nada fica definitivo até confirmar.</small></div>
                  <button type="button" className={styles.customPaletteToggle} onClick={()=>setPalette(customPalette)} disabled={building}>Usar minha combinação</button>
                  {palette?.id==="personalizada" && <div className={styles.customColorGrid}>
                    {([ ["primary","Principal"],["secondary","Apoio"],["accent","Destaque"],["background","Fundo"],["text","Texto"] ] as const).map(([key,label])=><label key={key}><input type="color" value={customPalette[key]} onChange={e=>changeCustomPalette(key,e.target.value)} disabled={building}/><span>{label}</span><small>{customPalette[key]}</small></label>)}
                  </div>}
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
              <button type="button" className={styles.buildButton} onClick={()=>setConfirmAction({kind:"build"})} disabled={!approved||building||current.metrics?.coverage_status==="needs_review"||Boolean(current.metrics?.unmet_requirements?.length)}>
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
        <form className={styles.composer} onSubmit={submit}><label htmlFor="cong-ai-text">{status === "propose" ? "Peça uma alteração ou esclarecimento" : "Converse com o CONG"}</label><div className={styles.composerBox}><textarea ref={composerRef} id="cong-ai-text" rows={3} maxLength={sessionId ? 3500 : 6500} placeholder={status === "propose" ? "O que você quer revisar?" : "Pergunte, tire dúvidas ou conte o que gostaria de criar..."} value={text} onChange={e => setText(e.target.value)} disabled={submitting || busy(status) || status === "cancelled"} onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing){e.preventDefault(); e.currentTarget.form?.requestSubmit();}}}/><button type="submit" disabled={submitting || busy(status) || status === "cancelled" || !text.trim()} aria-label="Enviar mensagem"><FiSend aria-hidden="true" /></button></div><div className={styles.composerBottom}><span>Enter envia · Shift+Enter pula linha · Você não precisa começar um projeto para tirar dúvidas</span>{busy(status) && <button type="button" onClick={() => {void action("cancel");}} disabled={submitting}>Cancelar tarefa</button>}</div></form>
      </section>
      <aside id="cong-ai-understanding" className={`${styles.briefPanel} ${insightsOpen ? styles.insightsOpen : ""}`} aria-label="O que o CONG entendeu">
        <button type="button" className={styles.insightClose} aria-label="Fechar entendimento" onClick={() => setInsightsOpen(false)}><FiX aria-hidden="true"/></button>
        <div className={styles.briefTop}><FiClipboard aria-hidden="true"/> Meu entendimento</div>
        <p className={styles.understandingIntro}>Vou juntando as peças da nossa conversa aqui. Se eu entender algo errado, você pode mudar direto.</p>
        <div className={styles.briefSection}>
          <h3>Estamos falando de</h3>
          <span className={styles.briefTag}>{!sessionId ? "Você decide" : isGuidance ? "Uma dúvida ou orientação" : current?.session.status === "propose" ? "Uma proposta para revisar" : "Conversando e descobrindo"}</span>
        </div>
        {Boolean(current?.session.memory.currentFocus?.trim()) && !editingMemory && <div className={styles.briefSection}>
          <h3>O que estamos resolvendo agora</h3>
          <p className={styles.memorySummary}>{current?.session.memory.currentFocus}</p>
          <small className={styles.memoryDisclaimer}>Resumo provisório. Você pode corrigir as informações abaixo.</small>
        </div>}
        <div className={styles.briefSection}>
          <h3>Projetos disponíveis para consulta</h3>
          <p className={styles.briefEmpty}>Posso ler a estrutura dos projetos aos quais você já tem acesso nesta organização. Nada será alterado sem sua aprovação.</p>
          {projectConsent && <div className={styles.consentCard}><strong>{projectConsent.kind==="site"?"Site":"Sistema"}: {projectConsent.title}</strong><small>Em foco nesta conversa · somente leitura. Edições exigem aprovação.</small>
            {sessionId && (status==="clarify"||status==="propose") && <button type="button" disabled={projectBusy} onClick={()=>void inspectCurrentProject()}>Analisar este projeto</button>}
            <button type="button" disabled={projectBusy||busy(status)} onClick={()=>void revokeProject()}>Retirar da conversa</button></div>}
          <button type="button" className={styles.editMemoryButton} disabled={projectBusy} onClick={()=>void findRecentProjects()}><FiLayers aria-hidden="true"/> {projectBusy?"Buscando projetos...":projectConsent?"Escolher outro projeto":"Consultar meus sites e sistemas"}</button>
          {projectNotice && <p className={styles.projectNotice} role="status">{projectNotice}</p>}
        </div>
        {sessionId && !editingMemory && <button type="button" className={styles.editMemoryButton} disabled={busy(status)||savingMemory} onClick={()=>setEditingMemory({summary:current?.session.memory.summary??"",facts:[...(current?.session.memory.facts??[])].map(f=>({...f})),assumptions:[...(current?.session.memory.assumptions??[])]})}><FiEdit3 aria-hidden="true"/> Editar o que entendi</button>}
        {editingMemory ? <div className={styles.memoryEditor}>
          <label>Resumo da conversa<textarea maxLength={1700} rows={4} value={editingMemory.summary} onChange={e=>setEditingMemory(m=>m?{...m,summary:e.target.value}:m)}/></label>
          <div className={styles.memoryEditorHeading}><strong>Informações confirmadas</strong><button type="button" disabled={editingMemory.facts.length>=30} onClick={()=>setEditingMemory(m=>m?{...m,facts:[...m.facts,{key:"",value:""}]}:m)}><FiPlus/> Adicionar</button></div>
          {editingMemory.facts.map((fact,index)=><div className={styles.factEditor} key={index}>
            <input aria-label={`Nome da informação ${index+1}`} maxLength={70} placeholder="Assunto" value={fact.key} onChange={e=>setEditingMemory(m=>m?{...m,facts:m.facts.map((f,i)=>i===index?{...f,key:e.target.value}:f)}:m)}/>
            <textarea aria-label={`Valor da informação ${index+1}`} maxLength={380} rows={2} placeholder="O que é correto?" value={fact.value} onChange={e=>setEditingMemory(m=>m?{...m,facts:m.facts.map((f,i)=>i===index?{...f,value:e.target.value}:f)}:m)}/>
            <button type="button" title="Remover informação" onClick={()=>setEditingMemory(m=>m?{...m,facts:m.facts.filter((_,i)=>i!==index)}:m)}><FiTrash2/> Remover</button>
          </div>)}
          <div className={styles.memoryEditorHeading}><strong>Suposições (não confirmadas)</strong><button type="button" disabled={editingMemory.assumptions.length>=12} onClick={()=>setEditingMemory(m=>m?{...m,assumptions:[...m.assumptions,""]}:m)}><FiPlus/> Adicionar</button></div>
          {editingMemory.assumptions.map((assumption,index)=><div className={styles.assumptionEditor} key={index}><textarea aria-label={`Suposição ${index+1}`} rows={2} maxLength={350} value={assumption} onChange={e=>setEditingMemory(m=>m?{...m,assumptions:m.assumptions.map((a,i)=>i===index?e.target.value:a)}:m)}/><button type="button" onClick={()=>setEditingMemory(m=>m?{...m,assumptions:m.assumptions.filter((_,i)=>i!==index)}:m)} aria-label="Remover suposição"><FiTrash2/></button></div>)}
          <div className={styles.memoryActions}><button type="button" onClick={()=>setEditingMemory(null)} disabled={savingMemory}>Cancelar</button><button type="button" onClick={()=>void saveUnderstanding()} disabled={savingMemory||busy(status)}>{savingMemory?"Salvando...":"Salvar entendimento"}</button></div>
          <p className={styles.memoryDisclaimer}>Só o que você salvar aqui será marcado como confirmação sua. Essas informações serão usadas nas próximas respostas desta conversa.</p>
        </div> : <>
          {current?.session.memory.summary?.trim() ? <div className={styles.briefSection}><h3>O que entendi até aqui</h3><p className={styles.memorySummary}>{current.session.memory.summary}</p></div> : null}
          <div className={styles.briefSection}><h3>O que já sei pela conversa</h3>
            {current?.session.memory.facts.length ? <ul className={styles.memoryList}>{current.session.memory.facts.map((fact,i)=><li key={`${fact.key}-${i}`}><div><strong>{fact.key}</strong><p>{fact.value}</p><small className={styles.factSource}>{current?.session.memory.verifiedFacts?.some(verified=>verified.key.toLowerCase()===fact.key.toLowerCase()) ? "Confirmado por você" : "Registrado a partir da conversa · ainda pode ser corrigido"}</small></div></li>)}</ul> : <p className={styles.briefEmpty}>Ainda não registrei informações suficientes. Tudo bem: podemos só conversar.</p>}
          </div>
          {Boolean(current?.session.memory.assumptions.length) && <div className={styles.briefSection}><h3>Ideias para confirmar <span className={styles.unconfirmed}>Hipóteses</span></h3><ul className={styles.memoryList}>{current?.session.memory.assumptions.map((assumption,i)=><li key={i}><p>{assumption}</p></li>)}</ul></div>}
          <p className={styles.memoryDisclaimer}>Isto é o contexto registrado da conversa, não o raciocínio privado do modelo. Nada aqui altera seu site ou sistema.</p>
        </>}
      </aside>
    </div>
  </main>
  <ModalMensagem
    aberto={projectListOpen}
    tamanho="grande"
    titulo="Escolha um projeto para analisar"
    mostrarBotaoOk={false}
    fecharAoClicarFora={!projectBusy}
    onFechar={closeProjectPicker}
    mensagem={<div className={styles.projectPicker}>
      <p className={styles.projectPickerIntro}>Posso consultar, em modo de leitura, os projetos que sua conta já consegue abrir nesta organização. Para criar, editar ou publicar qualquer coisa, sempre pedirei sua aprovação.</p>
      <div className={styles.projectPickerTop}>
        <span>{recentProjects.length} projeto(s) encontrado(s)</span>
        <button type="button" disabled={projectBusy} onClick={()=>void findRecentProjects()}><FiRefreshCw aria-hidden="true"/> Atualizar lista</button>
      </div>
      {projectBusy && <p className={styles.projectPickerState} role="status">Estou procurando seus projetos...</p>}
      {projectListError && <p className={styles.projectPickerWarning} role="status">{projectListError}</p>}
      {!projectBusy && !recentProjects.length && <p className={styles.projectPickerState}>Nenhum projeto disponível nesta organização. Confira se você está no espaço de trabalho correto.</p>}
      {(["site","system"] as const).map(kind=>{
        const projects=recentProjects.filter(item=>item.kind===kind);
        return <section key={kind} className={styles.projectPickerGroup}>
          <h3>{kind==="site"?"Meus sites":"Meus sistemas"}<span>{projects.length}</span></h3>
          {!projects.length ? <p className={styles.projectPickerEmpty}>Nenhum {kind==="site"?"site":"sistema"} encontrado.</p> : <div className={styles.projectPickerGrid}>
            {projects.map(project=>{
              const preview=projectPreviews[projectKey(project)];
              return <div key={projectKey(project)} className={styles.projectPickerCard}
                onMouseEnter={()=>void previewProject(project)} onFocus={()=>void previewProject(project)}>
                <button type="button" disabled={projectBusy} className={styles.projectPickerSelect}
                  onClick={()=>{void allowProject(project)}}>
                  <span className={styles.projectPickerIcon}>{project.kind==="site"?<FiServer aria-hidden="true"/>:<FiLayers aria-hidden="true"/>}</span>
                  <span className={styles.projectPickerDetails}><strong>{project.title}</strong><small>{kind==="site"?"Site":"Sistema"} · Atualizado em {safeDate(project.updatedAt)}</small></span>
                  <FiArrowRight aria-hidden="true" className={styles.projectPickerArrow}/>
                </button>
                <div className={styles.projectPickerPreview} aria-label={`Detalhes disponíveis de ${project.title}`}>
                  {project.kind==="site" ? <>
                    <strong>Estrutura do site</strong>
                    {preview?.status==="loading" ? <p>Buscando páginas...</p> : preview?.status==="error" ? <p>Não consegui carregar as páginas agora.</p> : preview?.pages?.length ?
                      <ul>{preview.pages.map((page,i)=><li key={`${i}-${page.title}`}><span>{page.title}</span><small>{page.sections} seção(ões)</small></li>)}</ul> :
                      <p>Abra os detalhes para conferir as páginas disponíveis.</p>}
                    <small className={styles.projectPickerCaution}>Prévia estrutural, não uma captura da aparência publicada.</small>
                  </> : <>
                    <strong>Resumo do sistema</strong>
                    <p>{typeof project.moduleCount==="number"?`${project.moduleCount} módulo(s) cadastrados` : "A lista não informa a quantidade de módulos."}</p>
                    <small className={styles.projectPickerCaution}>Os registros de pessoas e dados internos não são mostrados.</small>
                  </>}
                </div>
              </div>;
            })}
          </div>}
        </section>;
      })}
      <div className={styles.projectPickerFooter}><FiInfo aria-hidden="true"/> Selecionar abre a confirmação de acesso de leitura. O CONG não recebe seus dados pessoais nem altera o projeto.</div>
    </div>}
  />
  <ModalMensagem
    aberto={Boolean(confirmAction)}
    tamanho="medio"
    titulo={confirmAction?.kind==="delete" ? "Excluir conversa?" : confirmAction?.kind==="project" ? "Autorizar consulta do projeto?" : "Criar rascunhos editáveis?"}
    mostrarBotaoOk={false}
    fecharAoClicarFora={!submitting&&!building&&!projectBusy}
    onFechar={()=>{if(!submitting&&!building&&!projectBusy)setConfirmAction(null)}}
    mensagem={<div className={styles.confirmContent}>
      <p>{confirmAction?.kind==="delete"
        ? "Vou apagar esta conversa e seu contexto. Essa ação não pode ser desfeita, mas não apaga os projetos já criados."
        : confirmAction?.kind==="project"
        ? `Posso consultar a estrutura resumida de “${confirmAction.project.title}” nesta conversa? É um acesso de leitura, sem consultar cadastros de pessoas nem modificar o projeto. Você pode revogar depois.`
        : "Vou criar ou atualizar rascunhos reais na CONG. Nada será publicado nem ativado automaticamente."}</p>
      <div className={styles.confirmButtons}>
        <button type="button" disabled={submitting||building||projectBusy} onClick={()=>setConfirmAction(null)}>Cancelar</button>
        <button type="button" disabled={submitting||building||projectBusy} onClick={()=>{
          const action=confirmAction;setConfirmAction(null);
          if(action?.kind==="delete")void deleteConversation(action.id);
          if(action?.kind==="project")void allowProject(action.project);
          if(action?.kind==="build")void buildConfirmedDraft();
        }}>{confirmAction?.kind==="delete"?"Excluir conversa":confirmAction?.kind==="project"?"Permitir leitura":"Criar rascunhos"}</button>
      </div>
    </div>}
  />
  </>, document.body);
}
