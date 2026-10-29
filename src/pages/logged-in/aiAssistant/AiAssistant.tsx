import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import { listInstitutionalSites, getInstitutionalSite, publishInstitutionalSite, canPublishAdditionalInstitutionalSites, type InstitutionalSite } from "../../../services/institutionalService";
import { ApiError } from "../../../services/api";
import { institutionalRootDomain, institutionalPublicUrl } from "../../../utils/institutionalDomain";
import PublicSiteQr from "../../../components/publication/PublicSiteQr";
import InstitutionalSiteView from "../../../components/institutional/renderer/InstitutionalSiteView";
import {searchPixabay, type StockMediaItem} from "../../../services/stockMediaService";
import { listOperationalSystems } from "../../../features/operational/operationalService";
import { createPortal } from "react-dom";
import { useWorkspace } from "../../../contexts/workspace-context";
import { auditInstitutionalSiteWithForms, type SiteQualityReport } from "../../../features/aiBuilder/siteQuality";
import { buildAiDraft, existingDraft, SITE_LOOKS, createProjectPalettes, editorialWarnings, suggestedStockQuery, suggestedSecondaryStockQuery, type BuildResult, type SiteLook, type SitePalette } from "../../../features/aiBuilder/aiBuilder";
import { FiAlertCircle, FiArrowRight, FiFileText, FiLayers, FiMessageCircle, FiPlus, FiRefreshCw, FiSend, FiServer, FiXCircle, FiImage, FiDroplet, FiEdit3, FiArrowLeft, FiTrash2, FiInfo, FiClipboard, FiX, FiGlobe, FiExternalLink, FiLink, FiCopy, FiBarChart2, FiDownload } from "react-icons/fi";
import {
  aiCancel, aiDelete, aiDetail, aiReply, aiRetry, aiSessions, aiStart, aiStatus, aiSaveMemory, aiRevokeProject, aiInspectProject, aiGetTelemetry, aiTrackEvent,
  type AiAvailability, type AiGoal, type AiMemory, type AiPlan, type AiSessionDetail, type AiSessionSummary, type AiProjectContext, type AiSessionTelemetry, type AiMetricEventKind, type AiMetricEventInput,
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
  if (/catálogo de seções institucionais|Não existe seção publicada compatível/i.test(raw))
    return "O catálogo de componentes do editor não está disponível. Confira a configuração do construtor antes de tentar novamente.";
  if (/montagem do site ficou incompleta|página inicial|A IA não definiu uma página inicial/i.test(raw))
    return "A montagem ainda não terminou. O rascunho foi preservado; tente novamente nesta conversa para completar a página inicial.";
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

/**
 * Comparação ilustrativa: preço padrão de API por 1 milhão de tokens (USD).
 * Referências consultadas em 29/10/2026:
 * https://developers.openai.com/api/docs/models/gpt-5.4-mini
 * https://ai.google.dev/gemini-api/docs/pricing
 * https://platform.claude.com/docs/en/about-claude/pricing
 * Não representa despesa ou cobrança da IA local da CONG.
 */
const MARKET_REFERENCE_MODELS = [
  { name: "GPT-5.4 mini", input: 0.75, output: 4.5 },
  { name: "Gemini 2.5 Flash", input: 0.3, output: 2.5 },
  { name: "Claude Haiku 4.5", input: 1, output: 5 },
] as const;
const MARKET_INPUT_USD_PER_M = MARKET_REFERENCE_MODELS.reduce((total,model)=>total+model.input,0)/MARKET_REFERENCE_MODELS.length;
const MARKET_OUTPUT_USD_PER_M = MARKET_REFERENCE_MODELS.reduce((total,model)=>total+model.output,0)/MARKET_REFERENCE_MODELS.length;
const marketEquivalentUsd = (inputTokens:number|null,outputTokens:number|null):number|null => {
  if(inputTokens===null||outputTokens===null)return null;
  if(!Number.isFinite(inputTokens)||!Number.isFinite(outputTokens)||inputTokens<0||outputTokens<0)return null;
  return (inputTokens*MARKET_INPUT_USD_PER_M+outputTokens*MARKET_OUTPUT_USD_PER_M)/1_000_000;
};

/** O relatório contém somente metadados de desempenho, nunca o briefing do participante. */
function MetricReport({report,error,onRefresh,onManual,onExport,open,onToggle}:{report:AiSessionTelemetry|null;error:string;onRefresh:()=>void;onManual:()=>void;onExport:()=>void;open:boolean;onToggle:()=>void}){
 const m=report?.summary;
 const seconds=m&&m.build_timing_samples>0?(m.build_elapsed_ms/1000).toLocaleString("pt-BR",{maximumFractionDigits:1})+" s":"Não registrado";
 const tokens=m&&m.input_tokens!==null&&m.output_tokens!==null?`${(m.input_tokens+m.output_tokens).toLocaleString("pt-BR")} tokens`:"Não informados";
 const marketValue=m?marketEquivalentUsd(m.input_tokens,m.output_tokens):null;
 const price=marketValue!==null?`US$ ${marketValue.toFixed(5)}`:"Sem dados";
 return <section className={styles.metricsPanel} aria-label="Métricas de criação para testes internos">
   <button type="button" className={styles.metricsToggle} onClick={onToggle} aria-expanded={open}><FiBarChart2/> Métricas desta conversa <span>{open?"Ocultar":"Ver relatório"}</span></button>
   {open&&<div className={styles.metricsBody}>
     <p>Dados medidos por esta sessão, separados das avaliações de qualidade. A contagem de ações no editor manual não é automática.</p>
     {error&&<p role="status" className={styles.metricsWarning}>{error}</p>}
     <div className={styles.metricsGrid}>
       <div><span>Gerações da IA</span><strong>{m?m.ai_completed:"—"}</strong></div>
       <div><span>Falhas da IA</span><strong>{m?m.ai_failed:"—"}</strong></div>
       <div><span>Montagens concluídas</span><strong>{m?m.draft_completed:"—"}</strong></div>
       <div><span>Montagens com erro</span><strong>{m?m.draft_failed:"—"}</strong></div>
       <div><span>Tempo de montagem*</span><strong>{seconds}</strong></div>
       <div><span>Intervenções anotadas / revisões</span><strong>{m?`${m.manual_adjustments} / ${m.revision_requests}`:"—"}</strong></div>
       <div><span>Consumo IA</span><strong>{tokens}</strong></div>
       <div><span>Equivalente em APIs comerciais</span><strong>{price}</strong></div>
     </div>
     <small>*Tempo observado pelo navegador apenas nas montagens concluídas; não inclui entrevista, revisão e publicação. A CONG usa IA local e não paga tarifas por token. O equivalente comercial não mede o custo de eletricidade, hardware ou hospedagem.</small>
     {m&&<p className={styles.metricsNote}>Valor hipotético baseado na média simples dos preços padrão do GPT-5.4 mini, Gemini 2.5 Flash e Claude Haiku 4.5 (referência: 29/10/2026), aplicada aos tokens reais de entrada e saída. Não é cobrança nem custo operacional da CONG. Registros de consumo: {m.token_coverage}/{m.ai_completed} gerações concluídas.</p>}
     <div className={styles.metricsActions}>
       <button type="button" onClick={onManual}>Registrar ajuste manual</button>
       <button type="button" onClick={onRefresh}><FiRefreshCw/> Atualizar</button>
       <button type="button" onClick={onExport} disabled={!report}><FiDownload/> Exportar CSV</button>
     </div>
     <small>Os registros incluem apenas os eventos capturados após a instalação deste patch; não reconstituem o histórico de montagens anteriores.</small>
   </div>}
 </section>;
}

/** Usa exatamente o renderer nativo da CONG, com dados ja salvos no servidor. */
function LiveSitePreview({site,canReview}:{site:InstitutionalSite;canReview:boolean}){
 const home=site.pages.find(page=>page.isHome)??site.pages[0];
 return <section className={styles.liveSitePanel} aria-label="Site sendo criado pela CONG">
   <div className={styles.liveSiteHeader}><div><strong><FiServer/> Site sendo montado</strong><small>Visualização real do construtor, atualizada após cada gravação concluída.</small></div><span>{site.pages.length} página(s) no projeto</span></div>
   <div className={styles.liveBrowser} onClickCapture={event=>{
      if((event.target as HTMLElement).closest("a,button"))event.preventDefault();
    }} onSubmitCapture={event=>event.preventDefault()}>
      {home?<InstitutionalSiteView site={site} page={home}/>:<p className={styles.livePlaceholder}>Aguardando a primeira página.</p>}
   </div>
   {canReview?<Link to={`/app/site-institucional/${site.id}/editor`}>Abrir no editor para revisar <FiArrowRight/></Link>:<small>Continue acompanhando: ainda estamos salvando as seções.</small>}
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
  const { workspace } = useWorkspace();
  const organizationName = workspace.kind === "organization" ? workspace.organization.name : "Organização";
  const workspaceIdentity=workspace.kind === "organization" ? workspace.organization.name : "pessoal";
  const [look,setLook] = useState<SiteLook>("human");
  const [palette,setPalette] = useState<SitePalette|null>(null);
  const [paletteSeed,setPaletteSeed] = useState(0);
  const [photoQuery,setPhotoQuery] = useState("");
  const [stockPhotos,setStockPhotos] = useState<StockMediaItem[]>([]);
  const [selectedPhoto,setSelectedPhoto] = useState<StockMediaItem|null>(null);
  const [photoStatus,setPhotoStatus] = useState("");
  const [secondaryPhotoQuery,setSecondaryPhotoQuery] = useState("");
  const [secondaryPhotos,setSecondaryPhotos] = useState<StockMediaItem[]>([]);
  const [selectedSecondaryPhoto,setSelectedSecondaryPhoto] = useState<StockMediaItem|null>(null);
  const [secondaryPhotoStatus,setSecondaryPhotoStatus] = useState("");
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
  const [buildSteps,setBuildSteps] = useState<string[]>([]);
  const [buildResult,setBuildResult] = useState<BuildResult|null>(null);
  const [buildSite,setBuildSite] = useState<InstitutionalSite|null>(null);
  const [existing,setExisting] = useState(false);
  const [buildError,setBuildError] = useState("");
  const [publicationTarget,setPublicationTarget] = useState<string|null>(null);
  const [publicationSlug,setPublicationSlug] = useState("");
  const [publicationOrgName,setPublicationOrgName] = useState("");
  const [slugManuallyEdited,setSlugManuallyEdited] = useState(false);
  const [publicationOldSlug,setPublicationOldSlug] = useState("");
  const [publicationWarning,setPublicationWarning] = useState("");
  const [publicationApproval,setPublicationApproval] = useState(false);
  const [publicationBusy,setPublicationBusy] = useState(false);
  const [multiPublishEnabled,setMultiPublishEnabled] = useState(false);
  const [publicationError,setPublicationError] = useState("");
  const [publicationAudit,setPublicationAudit] = useState<SiteQualityReport|null>(null);
  const [publicationSuccess,setPublicationSuccess] = useState<{siteId:string;url:string;slug:string}|null>(null);
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
  const [telemetry,setTelemetry]=useState<AiSessionTelemetry|null>(null);
  const [telemetryError,setTelemetryError]=useState("");
  const [telemetryOpen,setTelemetryOpen]=useState(false);
  const [error, setError] = useState("");
  // O estúdio ocupa a janela inteira, inclusive quando chamado de dentro
  // do layout autenticado. O conteúdo é montado diretamente no body.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  const planSite=current?.session.plan?.site??null;
  const projectPalettes=useMemo(()=>planSite?createProjectPalettes(planSite,paletteSeed):[],[planSite,paletteSeed]);
  const editorialIssues=useMemo(()=>planSite?editorialWarnings(planSite):[],[planSite]);
  // A paleta padrão é derivada do plano, sem setState em efeito.
  const activePalette=palette??projectPalettes[0]??null;
  const expectedPhotoQuery=planSite?suggestedStockQuery(planSite):"";
  const expectedSecondaryPhotoQuery=planSite?suggestedSecondaryStockQuery(planSite):"";
  const photosCurrent=Boolean(planSite)&&photoQuery===expectedPhotoQuery;
  const secondaryPhotosCurrent=Boolean(planSite)&&secondaryPhotoQuery===expectedSecondaryPhotoQuery;
  const visibleStockPhotos=photosCurrent?stockPhotos:[];
  const visibleSecondaryPhotos=secondaryPhotosCurrent?secondaryPhotos:[];
  const activeSelectedPhoto=photosCurrent?selectedPhoto:null;
  const activeSelectedSecondaryPhoto=secondaryPhotosCurrent?selectedSecondaryPhoto:null;
  useEffect(()=>{
    if(!planSite)return;
    const query=suggestedStockQuery(planSite);
    const otherQuery=suggestedSecondaryStockQuery(planSite);
    let cancelled=false;
    // A atualização do estado ocorre nas respostas assíncronas do acervo.
    // O resultado é associado à query para não reutilizar fotos da ONG anterior.
    void searchPixabay("image",otherQuery,1).then(response=>{
      if(cancelled)return;
      setSecondaryPhotoQuery(otherQuery);
      setSecondaryPhotos(response.items.slice(0,6));setSelectedSecondaryPhoto(response.items[0]??null);
      setSecondaryPhotoStatus(!response.configured?"O acervo precisa de PIXABAY_API_KEY no backend.":response.items.length?"Imagem sugerida para outra seção do site.":"Nenhuma imagem adicional encontrada.");
    }).catch(()=>{if(!cancelled){setSecondaryPhotoQuery(otherQuery);setSecondaryPhotoStatus("Não foi possível buscar uma segunda imagem.");setSecondaryPhotos([]);setSelectedSecondaryPhoto(null);}});
    void searchPixabay("image",query,1).then(response=>{
      if(cancelled)return;
      setPhotoQuery(query);
      setStockPhotos(response.items.slice(0,6));
      setSelectedPhoto(response.items[0]??null);
      setPhotoStatus(!response.configured?"O acervo de fotos precisa de PIXABAY_API_KEY no backend.":
        response.items.length?"Fotos relacionadas ao tema encontradas. Escolha uma para a capa.":"Nenhuma fotografia encontrada para este tema.");
    }).catch(()=>{if(!cancelled){setPhotoQuery(query);setPhotoStatus("Não foi possível acessar o acervo agora; você ainda pode criar o site.");setStockPhotos([]);setSelectedPhoto(null);}});
    return ()=>{cancelled=true;};
  },[planSite]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const reloadTelemetry=useCallback(async(id:string)=>{
    try{const result=await aiGetTelemetry(id);if(selectedRef.current===id){setTelemetry(result);setTelemetryError("");}}
    catch{if(selectedRef.current===id)setTelemetryError("As métricas não estão disponíveis. Confira se a migration do Patch 3 foi aplicada.");}
  },[]);
  const trackMetric=useCallback(async(id:string,kind:AiMetricEventKind,props:Partial<AiMetricEventInput>={})=>{
    try{await aiTrackEvent(id,{id:crypto.randomUUID(),kind,...props});await reloadTelemetry(id);}
    catch{if(selectedRef.current===id)setTelemetryError("Não foi possível registrar um evento. As ações de criação permanecem disponíveis.");}
  },[reloadTelemetry]);
  const refresh = useCallback(async (id: string) => {
    const detail = await aiDetail(id);
    if (selectedRef.current === id) {setCurrent(detail);if(detail.session.memory.projectContext)setProjectConsent(detail.session.memory.projectContext);}
    void reloadTelemetry(id);
    return detail;
  }, [reloadTelemetry]);
  const select = useCallback(async (id: string) => {
    const changingConversation=selectedRef.current!==id;
    selectedRef.current = id; setSessionId(id); setError(""); setLoading(true); setCurrent(null);setInsightsOpen(false);setTelemetry(null);setTelemetryError("");
    setApproved(false);setBuildError("");setBuildProgress("");setBuildSteps([]);setBuildResult(null);setBuildSite(null);setPublicationTarget(null);setPublicationSuccess(null);setEditingMemory(null);setProjectConsent(null);setProjectListOpen(false);setProjectListError("");setProjectNotice("");
    setExisting(Boolean(existingDraft(id)));
    if(changingConversation){setPalette(null);setPaletteSeed(0);setLogoFile(null);setLogoPreview("");setLogoError("");}
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
      const wasRevision=Boolean(sessionId&&current?.session.status==="propose");
      const result = sessionId ? await aiReply(sessionId,message.trim(),context,inferredGoal) : await aiStart(inferredGoal,message.trim(),context);
      setText("");
      await select(result.session_id);
      if(wasRevision)void trackMetric(result.session_id,"revision_requested");
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
  function newConversation() { setTelemetry(null);setTelemetryError("");setTelemetryOpen(false); setPublicationTarget(null);setPublicationSuccess(null);setConfirmAction(null);setProjectConsent(null);setProjectListOpen(false);setProjectListError("");setProjectNotice("");setEditingMemory(null);setInsightsOpen(false);selectedRef.current = null; setSessionId(null); setCurrent(null); setError(""); setText("");setApproved(false);setBuildResult(null);setBuildSite(null);setExisting(false);setPalette(null);setPaletteSeed(0);setLogoFile(null);setLogoPreview("");setLogoError(""); }
  // O backend determina disponibilidade e publica; o modelo nunca seleciona o domínio.
  const normalizePublicSlug=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,45);
  const validPublicSlug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publicationSlug) && publicationSlug.length>=3 && publicationSlug.length<=45;
  async function preparePublication(siteId:string){
    if(publicationBusy)return;
    setPublicationError("");setPublicationWarning("");setPublicationApproval(false);setPublicationSlug("");setPublicationOrgName("");setSlugManuallyEdited(false);setPublicationOldSlug("");setPublicationTarget(siteId);setPublicationAudit(null);
    setPublicationBusy(true);
    try{
      const [site,sites,additional]=await Promise.all([getInstitutionalSite(siteId),listInstitutionalSites(),canPublishAdditionalInstitutionalSites()]);
      setMultiPublishEnabled(additional);
      setPublicationAudit(await auditInstitutionalSiteWithForms(site));
      const existing=sites.find(item=>item.id!==siteId&&item.isPrimary&&item.publishedAt);
      const ownPublished=Boolean(site.publishedAt);
      setPublicationOldSlug(ownPublished?site.publicSlug:"");
      if(additional){
        if(ownPublished)setPublicationWarning(`Este site já está disponível em ${site.publicSlug}.${institutionalRootDomain()}. Alterar o nome deste MESMO site invalidará esse endereço.`);
      }else if(existing){
        setPublicationWarning(`A organização já publicou “${existing.name}”. Publicar este novo site irá substituí-lo como site principal, e a mudança de endereço poderá invalidar links anteriores.`);
      }else if(ownPublished){
        setPublicationWarning(`Este site já está publicado. Escolher outro endereço pode invalidar os links antigos (${site.publicSlug}.${institutionalRootDomain()}).`);
      }
      if(!site.pages.length||!site.pages.some(page=>page.isHome)){
        setPublicationError("Antes de publicar, abra o editor e confirme que existe uma página inicial.");
      }
    }catch(e){
      setPublicationError(e instanceof ApiError && e.status===403?"Sua conta não tem acesso a esse site.":"Não consegui verificar os dados do site. Tente novamente.");
    }finally{setPublicationBusy(false);}
  }
  async function confirmPublication(){
    if(!publicationTarget||publicationBusy||!validPublicSlug||publicationOrgName.trim().length<2||!publicationApproval)return;
    setPublicationBusy(true);setPublicationError("");
    try{
      // Bloqueia publicação acidental de páginas sem conteúdo, inclusive rascunhos
      // gerados antes da correção da Home. Validação no momento da confirmação.
      const publishable=await getInstitutionalSite(publicationTarget);
      const audit=await auditInstitutionalSiteWithForms(publishable);
      setPublicationAudit(audit);
      if(audit.blockers.length){
        setPublicationError(`A auditoria encontrou ${audit.blockers.length} problema(s) que impedem a publicação. Corrija-os no editor e reabra este modal para conferir.`);
        return;
      }
      const home=publishable.pages.find(page=>page.isHome);
      if(!home?.sections.some(section=>section.visible&&!["site_header","site_footer"].includes(section.sectionType))){
        setPublicationError("A página inicial ainda está vazia. Conclua a criação com a IA ou abra o editor antes de publicar.");
        return;
      }
      const result=await publishInstitutionalSite(publicationTarget,{
        publicSlug:publicationSlug,confirmReplace:!multiPublishEnabled&&Boolean(publicationWarning)&&publicationApproval,
        publishAsAdditional:multiPublishEnabled,
      });
      const slug=result.publicSlug||publicationSlug;
      setPublicationSuccess({siteId:publicationTarget,slug,url:institutionalPublicUrl(slug)});
      if(sessionId)void trackMetric(sessionId,"published");
      setPublicationTarget(null);setPublicationApproval(false);
    }catch(e){
      if(e instanceof ApiError){
        if(e.code==="PUBLIC_SITE_SLUG_TAKEN")setPublicationError("Esse endereço já está sendo usado. Pergunte outro nome e tente novamente.");
        else if(e.code==="PUBLIC_SITE_SLUG_INVALID")setPublicationError("Esse nome é reservado ou inválido. Escolha outro.");
        else if(e.code==="PUBLIC_SITE_REPLACE_CONFIRMATION_REQUIRED")setPublicationError("Há outro site publicado para esta organização. Verifique e confirme a substituição.");
        else if(e.code==="PUBLIC_SITE_MULTI_NOT_ALLOWED")setPublicationError("A publicação de vários sites precisa ser autorizada na configuração do servidor.");
        else if(e.status===403)setPublicationError("Seu perfil não possui permissão para publicar sites nesta organização.");
        else setPublicationError("Não consegui publicar. O site continua salvo; confira sua conexão e tente novamente.");
      }else setPublicationError("Não consegui confirmar a publicação. Verifique o status do site antes de tentar novamente.");
    }finally{setPublicationBusy(false);}
  }
  async function copyPublicationUrl(url:string){
    try{await navigator.clipboard.writeText(url);}catch{setPublicationError("Não foi possível copiar automaticamente. Selecione o endereço exibido.");}
  }
  async function buildConfirmedDraft(){
    if(!sessionId || !approved || building || current?.session.status!=="propose" || !current.session.plan || current.metrics?.coverage_status==="needs_review" || Boolean(current.metrics?.unmet_requirements?.length))return;
    const measuredSessionId=sessionId;
    const runId=crypto.randomUUID();const startAt=performance.now();
    void trackMetric(measuredSessionId,"draft_started",{run_id:runId});
    setBuilding(true);setBuildError("");setBuildSite(null);setBuildSteps(["Preparando os construtores..."]);setBuildProgress("Preparando os construtores...");
    try{
      const plan=current.session.plan;
      const userSiteName=nameSite.trim() || plan.site?.name || `Site de ${organizationName}`;
      const userSystemName=nameSystem.trim() || `Sistema de ${organizationName}`;
      const adjusted:AiPlan={...plan,
        system:plan.system?{...plan.system,name:userSystemName}:null,
        site:plan.site?{...plan.site,name:userSiteName}:null};
      const result=await buildAiDraft({plan:adjusted,sessionId,sourceSiteName:plan.site?.name,
        turns:current.session.turns.filter(t=>t.role==="usuario").map(t=>t.text),look,palette:activePalette,logoFile,
        photo:activeSelectedPhoto?{id:activeSelectedPhoto.id,url:activeSelectedPhoto.url,query:expectedPhotoQuery,page:1}:null,
        secondaryPhoto:activeSelectedSecondaryPhoto?{id:activeSelectedSecondaryPhoto.id,url:activeSelectedSecondaryPhoto.url,query:expectedSecondaryPhotoQuery,page:1}:null,
        onSiteSnapshot:setBuildSite,
        report:(message)=>{setBuildProgress(message);setBuildSteps(prev=>[...prev.slice(-7),message]);}});
      void trackMetric(measuredSessionId,"draft_completed",{run_id:runId,elapsed_ms:Math.round(performance.now()-startAt),pages_created:result.pages,modules_created:result.modules,forms_prepared:result.forms});
      setBuildResult(result);setExisting(true);setBuildProgress("Rascunhos criados. Abra os construtores para revisar e finalizar.");
    }catch(e){void trackMetric(measuredSessionId,"draft_failed",{run_id:runId,elapsed_ms:Math.round(performance.now()-startAt)});setBuildError(errorText(e));setBuildProgress("Alguns recursos podem ter sido criados. Verifique os links e tente novamente na mesma sessão.");setExisting(Boolean(existingDraft(sessionId)));}
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
  function exportTelemetry(){
    if(!telemetry)return;
    const summary=telemetry.summary;
    const metrics:[string,string|number|null][]=[
      ["session_id",telemetry.session_id],["ai_jobs",summary.ai_jobs],["ai_completed",summary.ai_completed],
      ["ai_failed",summary.ai_failed],["draft_attempts",summary.draft_attempts],["draft_completed",summary.draft_completed],
      ["draft_failed",summary.draft_failed],["manual_adjustments",summary.manual_adjustments],["revision_requests",summary.revision_requests],
      ["reviews",summary.reviews],["publications",summary.publications],
      ["build_elapsed_ms",summary.build_timing_samples>0?summary.build_elapsed_ms:null],
      ["input_tokens",summary.input_tokens],["output_tokens",summary.output_tokens],
      ["estimated_usd",summary.estimated_usd], // Mantém o dado original do backend: NÃO é a comparação de mercado.
      ["market_equivalent_usd",marketEquivalentUsd(summary.input_tokens,summary.output_tokens)],
      ["market_input_usd_per_1m",MARKET_INPUT_USD_PER_M],
      ["market_output_usd_per_1m",MARKET_OUTPUT_USD_PER_M],
      ["market_reference_models",MARKET_REFERENCE_MODELS.map(model=>model.name).join(" / ")],
      ["market_price_reference_date","2026-10-29"],
      ["market_estimate_type","hipotetico_nao_e_cobranca_real"],
      ["token_coverage",summary.token_coverage],
    ];
    const csv="indicador,valor\n"+metrics.map(([key,value])=>`${key},${value??""}`).join("\n");
    const uri=URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=uri;link.download=`cong-metricas-${telemetry.session_id}.csv`;link.click();
    window.setTimeout(()=>URL.revokeObjectURL(uri),1000);
  }
  function focusComposer() { composerRef.current?.focus(); }
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
            {planSite && <section className={styles.reviewActions} aria-label="Revisão editorial do site">
              <strong>Revisão do conteúdo antes de criar</strong>
              <span>{planSite.pages.length} página(s) · {planSite.pages.reduce((total,page)=>total+page.sections.length,0)} seções planejadas.</span>
              {editorialIssues.length>0 ? <>
                <div className={styles.warning}><FiAlertCircle aria-hidden="true" /> Encontrei {editorialIssues.length} ponto(s) para melhorar na proposta.
                  <ul>{editorialIssues.slice(0,4).map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul>
                </div>
                <div><button type="button" disabled={submitting||building} onClick={()=>{void sendMessage("Reescreva a proposta inteira do site com textos institucionais completos e diferentes para cada página, 3 a 5 seções relevantes por página quando houver conteúdo suficiente, descrições individualizadas das iniciativas e chamadas para ação coerentes. Preserve o que eu confirmei, não invente fatos, estatísticas ou contatos. Mostre o novo plano para eu aprovar antes de construir.");}}><FiFileText/> Pedir redação mais completa à IA</button></div>
              </>:<span>O plano não apresenta os problemas editoriais básicos detectados. Revise os dados antes de confirmar.</span>}
            </section>}
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
                <div className={styles.paletteHead}><strong><FiDroplet aria-hidden="true"/> Identidade visual deste projeto</strong><small>Cores harmonizadas a partir do tema e estilo do plano da IA. Você pode ajustar antes de criar.</small></div>
                <button type="button" className={styles.generatedPaletteRefresh} onClick={()=>{const next=paletteSeed+1;setPaletteSeed(next);if(planSite)setPalette(createProjectPalettes(planSite,next)[0]);}} disabled={building}><FiRefreshCw/> Explorar novas combinações</button>
                <div className={styles.paletteGrid} role="radiogroup" aria-label="Paleta de cores">
                  {projectPalettes.map(p=><label className={styles.paletteCard} key={p.id} data-selected={activePalette?.id===p.id}>
                    <input type="radio" name="cong-palette" checked={activePalette?.id===p.id} onChange={()=>setPalette(p)} disabled={building}/>
                    <span className={styles.palettePreview} style={{background:p.background,color:p.text}} aria-hidden="true"><i style={{background:p.primary}}/><i style={{background:p.secondary}}/><i style={{background:p.accent}}/></span>
                    <span><strong>{p.label}</strong><small>{p.description}</small></span>
                  </label>)}
                </div>
                <div className={styles.customPalette}>
                  <div><strong>Quer ajustar as cores do seu jeito?</strong><small>Você pode montar sua própria combinação e ver na prévia. Nada fica definitivo até confirmar.</small></div>
                  <button type="button" className={styles.customPaletteToggle} onClick={()=>setPalette(customPalette)} disabled={building}>Usar minha combinação</button>
                  {activePalette?.id==="personalizada" && <div className={styles.customColorGrid}>
                    {([ ["primary","Principal"],["secondary","Apoio"],["accent","Destaque"],["background","Fundo"],["text","Texto"] ] as const).map(([key,label])=><label key={key}><input type="color" value={customPalette[key]} onChange={e=>changeCustomPalette(key,e.target.value)} disabled={building}/><span>{label}</span><small>{customPalette[key]}</small></label>)}
                  </div>}
                </div>
                {activePalette&&<div className={styles.siteMockup} style={{"--preview-main":activePalette.primary,"--preview-secondary":activePalette.secondary,"--preview-accent":activePalette.accent,"--preview-bg":activePalette.background,"--preview-text":activePalette.text} as CSSProperties}>
                  <div className={styles.siteMockupNav}><span>{nameSite.trim()||organizationName}</span><span className={styles.siteMockupMenu}>{current.session.plan.site.pages.slice(0,3).map(page => page.title).join(" · ")}</span></div>
                  <div className={styles.siteMockupBody} style={activeSelectedPhoto?{backgroundImage:`linear-gradient(90deg, ${activePalette.background} 6%, ${activePalette.background}E5 55%, transparent),url(${JSON.stringify(activeSelectedPhoto.thumbnail||activeSelectedPhoto.url)})`,backgroundSize:"cover",backgroundPosition:"center"}:undefined}><small>PRÉVIA DO CONTEÚDO PLANEJADO</small><strong>{current.session.plan.site.pages[0]?.sections[0]?.title || current.session.plan.site.name}</strong><p>{current.session.plan.site.pages[0]?.sections[0]?.text || current.session.plan.site.audience}</p>{current.session.plan.site.pages[0]?.sections[0]?.action_label && <span>{current.session.plan.site.pages[0].sections[0].action_label}</span>}</div>
                </div>}
                <section className={styles.aiMediaPicker} aria-label="Imagens do projeto">
                  <div className={styles.aiMediaHeading}><FiImage aria-hidden="true"/><div><strong>Fotografia para a capa do site</strong><small>A CONG procura imagens no acervo a partir do conteúdo planejado. A seleção será salva no projeto se a importação for bem-sucedida.</small></div></div>
                  {(photosCurrent?photoStatus:"Pesquisando fotografias relacionadas ao projeto...")&&<p className={styles.aiMediaStatus}>{photosCurrent?photoStatus:"Pesquisando fotografias relacionadas ao projeto..."}</p>}
                  {visibleStockPhotos.length>0&&<div className={styles.aiMediaGrid}>
                    <button type="button" className={styles.aiMediaNone} data-selected={!activeSelectedPhoto} onClick={()=>setSelectedPhoto(null)} disabled={building}><FiXCircle/><span>Sem fotografia</span></button>
                    {visibleStockPhotos.map(item=><button type="button" key={item.id} className={styles.aiMediaOption} data-selected={activeSelectedPhoto?.id===item.id} onClick={()=>setSelectedPhoto(item)} disabled={building} aria-label={`Usar foto de ${item.author}`}>
                      <img src={item.thumbnail||item.url} alt={item.title||"Fotografia do acervo"} loading="lazy"/>
                      <span>{item.author} · Pixabay</span>
                    </button>)}
                  </div>}
                  {activeSelectedPhoto&&<p className={styles.aiMediaCredit}>Foto sugerida: {activeSelectedPhoto.author} · <a href={activeSelectedPhoto.sourceUrl} target="_blank" rel="noreferrer">ver fonte e licença</a>. Você poderá substituí-la no editor.</p>}
                </section>
                <section className={styles.aiMediaPicker} aria-label="Imagem para as páginas internas">
                  <div className={styles.aiMediaHeading}><FiImage aria-hidden="true"/><div><strong>Outra fotografia para o site</strong><small>Sugestão contextual para a seção de projetos ou sobre a ONG. Você decide se a imagem será adicionada.</small></div></div>
                  {(secondaryPhotosCurrent?secondaryPhotoStatus:"Procurando imagem complementar...")&&<p className={styles.aiMediaStatus}>{secondaryPhotosCurrent?secondaryPhotoStatus:"Procurando imagem complementar..."}</p>}
                  {visibleSecondaryPhotos.length>0&&<div className={styles.aiMediaGrid}>
                    <button type="button" className={styles.aiMediaNone} data-selected={!activeSelectedSecondaryPhoto} onClick={()=>setSelectedSecondaryPhoto(null)} disabled={building}><FiXCircle/><span>Não usar</span></button>
                    {visibleSecondaryPhotos.map(item=><button type="button" key={item.id} className={styles.aiMediaOption} data-selected={activeSelectedSecondaryPhoto?.id===item.id} onClick={()=>setSelectedSecondaryPhoto(item)} disabled={building} aria-label={`Usar imagem complementar de ${item.author}`}>
                      <img src={item.thumbnail||item.url} alt={item.title||"Fotografia do acervo"} loading="lazy"/>
                      <span>{item.author} · Pixabay</span>
                    </button>)}
                  </div>}
                  {activeSelectedSecondaryPhoto&&<p className={styles.aiMediaCredit}>Fonte: <a href={activeSelectedSecondaryPhoto.sourceUrl} target="_blank" rel="noreferrer">ver imagem e licença</a>. A CONG só marcará como incorporada após a importação.</p>}
                </section>
                <div className={styles.logoSection}>
                  <div><strong><FiImage aria-hidden="true"/> Sua organização já tem uma logo?</strong><p>Se tiver, pode usar aqui. Se não tiver, seguimos sem problema. A logo será enviada apenas ao editor do seu site, quando você confirmar a criação.</p></div>
                  <label className={styles.uploadLogo}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>chooseLogo(e.target.files?.[0])} disabled={building}/> {logoFile?"Trocar logo":"Escolher imagem"}</label>
                  {logoPreview&&<div className={styles.logoPreview}><img src={logoPreview} alt="Prévia da logo escolhida"/><span>{logoFile?.name}</span><button type="button" disabled={building} onClick={()=>chooseLogo(undefined)} aria-label="Retirar logo"><FiXCircle/></button></div>}
                  {logoError&&<small role="alert" className={styles.fieldError}>{logoError}</small>}
                </div>
                <label className={styles.builderField}>Nome do site (opcional)
                  <input value={nameSite} onChange={e=>setNameSite(e.target.value)} maxLength={100} placeholder={current.session.plan.site?.name||`Site de ${organizationName}`} disabled={building}/>
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
                    {draft.siteId && <><Link to={`/app/site-institucional/${draft.siteId}/editor`}>Revisar site</Link><button type="button" onClick={()=>void preparePublication(draft.siteId!)}><FiGlobe/> Escolher endereço e publicar</button></>}
                  </div>
                  <small>Os links são recuperados deste navegador; as permissões continuam verificadas pela API da CONG.</small>
                </div>;
              })()}
              {buildProgress && <div className={styles.aiBuildTimeline} aria-label="Etapas reais da criação"><strong><FiLayers/> Construção em andamento</strong><ol>{buildSteps.map((step,index)=><li key={`${index}-${step}`} data-current={index===buildSteps.length-1}>{step}</li>)}</ol><p role="status">{buildProgress}</p></div>}
              {(building||buildResult||buildSite)&&current.session.plan.site&&<div className={styles.liveBuildPreview}>
                {buildSite?<LiveSitePreview site={buildSite} canReview={!building}/>:<div className={styles.liveBuildWaiting} role="status"><FiServer/> A prévia aparecerá conforme as páginas forem salvas no construtor.</div>}
              </div>}
              {buildError && <p className={styles.error} role="alert">{buildError}</p>}
              {buildResult && <div className={styles.buildSuccess}>
                <strong>Rascunhos criados nos construtores</strong>
                <p>{buildResult.modules} módulo(s) · {buildResult.pages} página(s) · {buildResult.forms} formulário(s) preparado(s).</p>
                <div className={styles.buildLinks}>
                  {buildResult.record.systemId && <Link to={`/app/sistemas/${buildResult.record.systemId}`}><FiLayers/> Abrir sistema</Link>}
                  {buildResult.record.siteId && <><Link to={`/app/site-institucional/${buildResult.record.siteId}/editor`} onClick={()=>{if(sessionId)void trackMetric(sessionId,"review_opened");}}><FiArrowRight/> Revisar no editor</Link><button type="button" onClick={()=>void preparePublication(buildResult.record.siteId!)}><FiGlobe/> Escolher endereço e publicar</button></>}
                </div>
                {buildResult.warnings.length>0 && <ul>{buildResult.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul>}
                <small>Os formulários são criados desativados. Para receber respostas, revise e ative cada um no sistema operacional; a publicação do site não ativa o formulário automaticamente.</small>
              </div>}
              {publicationSuccess && <div className={styles.publicationResult} role="status">
                <div className={styles.publicationResultHead}><FiGlobe aria-hidden="true"/><div><strong>Seu site foi publicado!</strong><p>Agora você pode mostrar o endereço para outras pessoas.</p></div></div>
                <a href={publicationSuccess.url} target="_blank" rel="noopener noreferrer" className={styles.publicationAddress}><FiExternalLink aria-hidden="true"/>{publicationSuccess.url}</a>
                <div className={styles.publicationResultGrid}>
                  <PublicSiteQr url={publicationSuccess.url}/>
                  <div className={styles.publicationActions}>
                    <button type="button" onClick={()=>void copyPublicationUrl(publicationSuccess.url)}><FiCopy/> Copiar link</button>
                    <a href={publicationSuccess.url} target="_blank" rel="noopener noreferrer"><FiExternalLink/> Abrir em nova aba</a>
                    <small>Teste com outro celular antes de apresentar. Para funcionar no subdomínio, o DNS, o HTTPS e a hospedagem precisam aceitar *.{institutionalRootDomain()}.</small>
                    <small>Alternativa por endereço da plataforma: <a href={`https://${institutionalRootDomain()}/o/${publicationSuccess.slug}`} target="_blank" rel="noopener noreferrer">/{`o/${publicationSuccess.slug}`}</a></small>
                  </div>
                </div>
              </div>}
              
            </section>
          </>}
          {sessionId&&<MetricReport report={telemetry} error={telemetryError}
            open={telemetryOpen} onToggle={()=>setTelemetryOpen(value=>!value)}
            onRefresh={()=>void reloadTelemetry(sessionId)}
            onManual={()=>void trackMetric(sessionId,"manual_adjustment")}
            onExport={exportTelemetry}/>}
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
    aberto={Boolean(publicationTarget)}
    tamanho="medio"
    titulo="Escolha o endereço antes de publicar"
    mostrarBotaoOk={false}
    fecharAoClicarFora={!publicationBusy}
    onFechar={()=>{if(!publicationBusy)setPublicationTarget(null);}}
    mensagem={<div className={styles.publishDialog}>
      <p>Como se chama a ONG que vai aparecer neste endereço? O CONG sugere o link a partir do nome, mas você pode ajustá-lo. A publicação só acontece após aprovação.</p>
      <label htmlFor="ai-ong-name">Nome da ONG</label>
      <input id="ai-ong-name" className={styles.publishNameInput} autoComplete="organization" maxLength={100} value={publicationOrgName} onChange={e=>{
        const name=e.target.value;setPublicationOrgName(name);
        if(!slugManuallyEdited)setPublicationSlug(normalizePublicSlug(name));
      }} placeholder="Ex.: Projeto Girassol" disabled={publicationBusy}/>
      {publicationOrgName.trim().length>0&&publicationOrgName.trim().length<2&&<p className={styles.publishHint}>Informe o nome da ONG.</p>}
      <label htmlFor="ai-public-slug">Endereço público sugerido (editável)</label>
      <div className={styles.publishSlugField}>
        <input id="ai-public-slug" autoComplete="off" spellCheck={false} maxLength={45} value={publicationSlug} onChange={e=>{setSlugManuallyEdited(true);setPublicationSlug(normalizePublicSlug(e.target.value));if(!publicationError.includes("página inicial"))setPublicationError("");}} placeholder="nome-da-ong" disabled={publicationBusy}/>
        <span>.{institutionalRootDomain()}</span>
      </div>
      {publicationSlug && !validPublicSlug && <p className={styles.publishHint}>Use pelo menos 3 caracteres: letras, números ou hífens.</p>}
      {publicationSlug && validPublicSlug && <p className={styles.publishLinkPreview}><FiLink aria-hidden="true"/> https://{publicationSlug}.{institutionalRootDomain()}</p>}
      {multiPublishEnabled?<p className={styles.publishNotice}><strong>Publicação múltipla habilitada:</strong> este site terá seu próprio endereço, sem substituir os outros sites publicados da organização. Os nomes disponíveis são verificados no servidor.</p>:<p className={styles.publishNotice}>A organização mantém apenas um site principal publicado por vez. Alguns nomes já podem estar ocupados; a disponibilidade será validada pelo servidor.</p>}
      {publicationOldSlug && publicationOldSlug!==publicationSlug && <p className={styles.publishNotice}>Endereço atual {multiPublishEnabled?"deste site":"da organização"}: <strong>{publicationOldSlug}.{institutionalRootDomain()}</strong>. Alterá-lo pode afetar links existentes.</p>}
      <div className={styles.qualityAudit} role="status" aria-live="polite">
        <strong><FiClipboard aria-hidden="true"/> Auditoria antes da publicação</strong>
        {!publicationAudit ? <p>Conferindo as páginas salvas...</p> : <>
          <p>{publicationAudit.checkedPages} página(s) · {publicationAudit.checkedLinks} link(s) examinados · {publicationAudit.checkedImages} campo(s) de imagem · {publicationAudit.checkedForms} formulário(s)</p>
          {publicationAudit.blockers.length ? <p className={styles.publishDanger}><FiAlertCircle aria-hidden="true"/> {publicationAudit.blockers.length} problema(s) que precisam ser corrigidos.</p> : <p>Nenhum erro estrutural impeditivo detectado.</p>}
          {publicationAudit.warnings.length>0 && <p>{publicationAudit.warnings.length} recomendação(ões) de revisão.</p>}
          {(publicationAudit.blockers.length>0 || publicationAudit.warnings.length>0) && <ul>
            {[...publicationAudit.blockers,...publicationAudit.warnings].slice(0,15).map((issue,i)=><li key={`${issue.code}-${i}`}><strong>{issue.severity==="blocker"?"Corrigir":"Revisar"}</strong> {issue.page?`${issue.page}: `:""}{issue.message}</li>)}
          </ul>}
          {publicationAudit.blockers.length>0 && publicationTarget && <Link to={`/app/site-institucional/${publicationTarget}/editor`} onClick={()=>setPublicationTarget(null)}>Abrir editor para corrigir</Link>}
          <small>Verificação estrutural: não testa abertura de links externos, entrega de formulários, imagens no navegador nem acessibilidade completa. Teste no celular antes de divulgar.</small>
        </>}
      </div>
      {publicationWarning && <p className={styles.publishDanger}><FiAlertCircle aria-hidden="true"/>{publicationWarning}</p>}
      {publicationError && <p className={styles.error} role="alert">{publicationError}</p>}
      <label className={styles.publishConsent}><input type="checkbox" checked={publicationApproval} onChange={e=>setPublicationApproval(e.target.checked)} disabled={publicationBusy}/> Revisei o site e autorizo sua publicação pública neste endereço{multiPublishEnabled?", sem substituir os outros sites da organização.":", ciente de que ele será o site principal da organização."}</label>
      <div className={styles.confirmButtons}>
        <button type="button" onClick={()=>setPublicationTarget(null)} disabled={publicationBusy}>Voltar e revisar</button>
        <button type="button" onClick={()=>void confirmPublication()} disabled={publicationBusy||publicationOrgName.trim().length<2||!validPublicSlug||!publicationApproval||!publicationAudit||publicationAudit.blockers.length>0||Boolean(publicationError&&publicationError.includes("página inicial"))}><FiGlobe aria-hidden="true"/>{publicationBusy?"Publicando...":"Confirmar e publicar"}</button>
      </div>
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
