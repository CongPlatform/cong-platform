import {useEffect,useMemo,useState,type DragEvent} from "react";
import {FiArrowRight,FiCheck,FiCheckCircle,FiExternalLink,FiGlobe,FiLink2,FiLock,FiRefreshCw,FiServer,FiXCircle} from "react-icons/fi";
import {getOperationalSystem,listOperationalSystems,setOperationalBrandSite,type OperationalSystem,type OperationalSystemSummary} from "../../../features/operational/operationalService";
import {getInstitutionalSite,listInstitutionalSites,type InstitutionalSite,type InstitutionalSiteSummary} from "../../../services/institutionalService";
import CongLoadingState from "../../feedback/CongLoadingState";
import styles from "./SiteSystemConnectionPanel.module.css";

type SiteContext={siteId:string;siteName:string;published:boolean;onConnected?:()=>void;system?:never;onSystem?:never};
type SystemContext={system:OperationalSystem;onSystem:(updated:OperationalSystem)=>void;siteId?:never;siteName?:never;published?:never;onConnected?:never};
type Props=SiteContext|SystemContext;
type PendingAction="link"|"move"|"remove"|null;
const isReady=(site:InstitutionalSiteSummary)=>Boolean(site.publishedAt&&site.isPrimary);

export default function SiteSystemConnectionPanel(props:Props){
  const key=typeof props.siteId==="string"?`site:${props.siteId}`:`system:${props.system.id}:${props.system.brandSiteId??""}`;
  return <ConnectionContent key={key} {...props}/>;
}
function ConnectionContent(props:Props){
  const fromSite=typeof props.siteId==="string";
  const currentSiteId=fromSite?props.siteId:undefined;
  const currentSystem=fromSite?undefined:props.system;
  const [systems,setSystems]=useState<OperationalSystemSummary[]>([]);
  const [sites,setSites]=useState<InstitutionalSiteSummary[]>([]);
  const [selectedSystemId,setSelectedSystemId]=useState("");
  const [selectedSiteId,setSelectedSiteId]=useState<string|null>(currentSystem?.brandSiteId??null);
  const [systemDetail,setSystemDetail]=useState<OperationalSystem|null>(null);
  const [linkedSite,setLinkedSite]=useState<InstitutionalSite|null>(null);
  const [loading,setLoading]=useState(true);
  const [inspecting,setInspecting]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [pending,setPending]=useState<PendingAction>(null);
  const [revision,setRevision]=useState(0);
  const [dragOver,setDragOver]=useState(false);
  const system=fromSite?(systemDetail?.id===selectedSystemId?systemDetail:null):currentSystem;
  const site=useMemo(()=>fromSite?null:sites.find(item=>item.id===selectedSiteId)??null,[fromSite,sites,selectedSiteId]);
  const siteId=fromSite?currentSiteId:selectedSiteId;
  const siteName=fromSite?props.siteName:site?.name??linkedSite?.name??"Escolha um site";
  const published=fromSite?props.published:Boolean(site&&isReady(site));
  const connected=Boolean(system&&siteId&&system.brandSiteId===siteId);
  const existingElsewhere=Boolean(system?.brandSiteId&&system.brandSiteId!==siteId);
  const canLink=Boolean(system&&siteId&&published&&system.status==="active"&&!connected);
  const sourceReady=fromSite?Boolean(props.published):Boolean(site&&isReady(site));
  const systemReady=Boolean(system&&system.status==="active");
  const isSelecting=fromSite?!system:!site;

  useEffect(()=>{
    let alive=true;
    const job=fromSite?listOperationalSystems().then(items=>{if(alive)setSystems(items);}):listInstitutionalSites().then(items=>{if(alive)setSites(items);});
    void job.catch(caught=>{if(alive)setError(caught instanceof Error?caught.message:"Não foi possível consultar os recursos da ONG.");}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[fromSite,currentSiteId,currentSystem?.id,revision]);

  useEffect(()=>{
    if(!fromSite||!selectedSystemId)return;
    let alive=true;
    void getOperationalSystem(selectedSystemId).then(item=>{if(alive)setSystemDetail(item);}).catch(caught=>{if(alive)setError(caught instanceof Error?caught.message:"Não foi possível abrir o sistema.");}).finally(()=>{if(alive)setInspecting(false);});
    return()=>{alive=false;};
  },[fromSite,selectedSystemId,revision]);

  useEffect(()=>{
    if(fromSite||!currentSystem?.brandSiteId)return;
    let alive=true;
    void getInstitutionalSite(currentSystem.brandSiteId).then(item=>{if(alive)setLinkedSite(item);}).catch(()=>{if(alive)setLinkedSite(null);});
    return()=>{alive=false;};
  },[fromSite,currentSystem?.brandSiteId]);

  const chooseSystem=(id:string)=>{setSelectedSystemId(id);setSystemDetail(null);setInspecting(Boolean(id));setPending(null);setNotice("");setError("");};
  const chooseSite=(id:string)=>{setSelectedSiteId(id);setPending(null);setNotice("");setError("");};
  const dropCandidate=(event:DragEvent<HTMLDivElement>)=>{
    event.preventDefault();setDragOver(false);
    const kind=event.dataTransfer.getData("application/x-cong-link-kind");
    const id=event.dataTransfer.getData("application/x-cong-link-id");
    if(kind===(fromSite?"system":"site")&&id){if(fromSite)chooseSystem(id);else chooseSite(id);}
  };
  async function save(nextSiteId:string|null){
    if(!system||busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      let latest=system;
      if(fromSite){
        latest=await getOperationalSystem(system.id);
        if(latest.brandSiteId!==system.brandSiteId){setSystemDetail(latest);throw new Error("O vínculo deste sistema mudou desde a última consulta. Confira a ligação e tente novamente.");}
      }
      const updated=await setOperationalBrandSite(latest,nextSiteId);
      if(fromSite){setSystemDetail(updated);props.onConnected?.();}
      else {setSelectedSiteId(nextSiteId);props.onSystem?.(updated);}
      setPending(null);
      setNotice(nextSiteId?`Ligação salva: “${updated.name}” está conectado ao site.`:"Conexão removida. O sistema e seus dados foram preservados.");
      setLoading(true);setRevision(value=>value+1);
    }catch(caught){setPending(null);setError(caught instanceof Error?caught.message:"Não foi possível salvar a conexão.");}
    finally{setBusy(false);}
  }
  const requestedAction:PendingAction=connected?"remove":existingElsewhere?"move":"link";
  function requestLink(){if(canLink)setPending(requestedAction);}
  const shownSystem=system?.name??"Escolha um sistema";
  const shownSite=siteName;
  const candidateCount=fromSite?systems.length:sites.length;
  const orderedSystems=[...systems].sort((a,b)=>Number(b.status==="active")-Number(a.status==="active")||a.name.localeCompare(b.name,"pt-BR"));
  const orderedSites=[...sites].sort((a,b)=>Number(b.id===currentSystem?.brandSiteId)-Number(a.id===currentSystem?.brandSiteId)||Number(isReady(b))-Number(isReady(a))||a.name.localeCompare(b.name,"pt-BR"));

  return <section className={styles.root} aria-label="Conexões entre site e sistema">
    <div className={styles.intro}><div><span className={styles.eyebrow}>CONG / CONEXÕES</span><h3>Ligue seu site ao sistema</h3><p>Escolha as duas pontas e faça a ligação. Você vê o resultado antes de salvar, como no Percurso.</p></div><button type="button" className={styles.refresh} disabled={loading||busy} onClick={()=>{setLoading(true);setRevision(value=>value+1);setNotice("");}} title="Atualizar" aria-label="Atualizar recursos"><FiRefreshCw/></button></div>
    <div className={styles.canvas} data-connected={connected} data-drop={dragOver}>
      <div className={styles.gridPattern} aria-hidden="true"/>
      <div className={styles.canvasHeading}><span><FiLink2/> MAPA DA CONEXÃO</span><span className={connected?styles.readyChip:styles.draftChip}>{connected?<><FiCheck/> Conectado</>:"Aguardando ligação"}</span></div>
      <div className={styles.diagram}>
        <div className={styles.node} data-ready={sourceReady} data-fixed={fromSite} onDragOver={!fromSite?event=>{event.preventDefault();setDragOver(true);}:undefined} onDragLeave={!fromSite?()=>setDragOver(false):undefined} onDrop={!fromSite?dropCandidate:undefined}>
          <div className={styles.nodeTop}><span className={styles.nodeIcon}><FiGlobe/></span><span className={styles.nodeType}>SITE INSTITUCIONAL</span></div>
          <strong title={shownSite}>{shownSite}</strong>
          <small>{!siteId?"Selecione um site abaixo":published?"Publicado · pronto para conexão":"Precisa ser publicado como principal"}</small>
          <span className={styles.socketRight} aria-hidden="true"/>
        </div>
        <div className={styles.wire} aria-hidden="true"><svg viewBox="0 0 160 100" preserveAspectRatio="none"><path className={styles.wireBase} d="M0 50 C52 50 36 50 80 50 S108 50 160 50"/><path className={connected?styles.wireLive:styles.wirePreview} d="M0 50 C52 50 36 50 80 50 S108 50 160 50"/><circle cx="80" cy="50" r="7" className={connected?styles.wirePointLive:styles.wirePoint}/></svg><span className={styles.wireLabel}>{connected?"Ligação ativa":isSelecting?"Escolha uma ponta":"Pronto para ligar"}</span></div>
        <div className={styles.node} data-ready={systemReady} data-fixed={!fromSite} onDragOver={fromSite?event=>{event.preventDefault();setDragOver(true);}:undefined} onDragLeave={fromSite?()=>setDragOver(false):undefined} onDrop={fromSite?dropCandidate:undefined}>
          <span className={styles.socketLeft} aria-hidden="true"/>
          <div className={styles.nodeTop}><span className={styles.nodeIcon}><FiServer/></span><span className={styles.nodeType}>SISTEMA OPERACIONAL</span></div>
          <strong title={shownSystem}>{shownSystem}</strong>
          <small>{!system?"Selecione um sistema abaixo":system.status==="active"?`${system.modules.length} peças · em uso`:"Ative o sistema para conectá-lo"}</small>
        </div>
      </div>
      <div className={styles.hint}><FiLink2/> {fromSite?"Selecione um sistema na lista ou arraste-o até a peça da direita.":"Selecione um site na lista ou arraste-o até a peça da esquerda."}</div>
    </div>
    <div className={styles.libraryHead}><div><strong>{fromSite?"Seus sistemas":"Seus sites"}</strong><p>{fromSite?"Escolha qual sistema será utilizado neste site.":"Escolha em qual site este sistema ficará disponível."}</p></div><span>{candidateCount} {fromSite?"sistemas":"sites"}</span></div>
    {loading?<CongLoadingState variant="inline" label="Consultando recursos"/>:
      candidateCount===0?<div className={styles.empty}>Ainda não há {fromSite?"sistemas":"sites"} disponíveis. <a href={fromSite?"/app/sistemas":"/app/site-institucional"} target="_blank" rel="noopener noreferrer">Abrir área de criação <FiExternalLink/></a></div>:
      <div className={styles.choices} role="group" aria-label={fromSite?"Selecione um sistema":"Selecione um site"}>
        {fromSite?orderedSystems.map(item=><button type="button" key={item.id} draggable={!busy} onDragStart={event=>{event.dataTransfer.setData("application/x-cong-link-kind","system");event.dataTransfer.setData("application/x-cong-link-id",item.id);}} onClick={()=>chooseSystem(item.id)} aria-pressed={selectedSystemId===item.id} className={styles.choice} data-selected={selectedSystemId===item.id} disabled={busy}><span className={styles.choiceIcon}><FiServer/></span><span className={styles.choiceName}><strong>{item.name}</strong><small>{item.moduleCount} {item.moduleCount===1?"peça":"peças"} · {item.status==="active"?"Em uso":item.status==="draft"?"Em construção":"Arquivado"}</small></span><span className={styles.choiceStatus}>{selectedSystemId===item.id?<FiCheckCircle/>:<FiArrowRight/>}</span></button>):
        orderedSites.map(item=><button type="button" key={item.id} draggable={!busy} onDragStart={event=>{event.dataTransfer.setData("application/x-cong-link-kind","site");event.dataTransfer.setData("application/x-cong-link-id",item.id);}} onClick={()=>chooseSite(item.id)} aria-pressed={selectedSiteId===item.id} className={styles.choice} data-selected={selectedSiteId===item.id} disabled={busy}><span className={styles.choiceIcon}><FiGlobe/></span><span className={styles.choiceName}><strong>{item.name}</strong><small>{isReady(item)?"Publicado · principal":item.publishedAt?"Publicado · não principal":"Não publicado"}</small></span><span className={styles.choiceStatus}>{selectedSiteId===item.id?<FiCheckCircle/>:<FiArrowRight/>}</span></button>)}
      </div>}
    {inspecting&&<CongLoadingState variant="inline" label="Conferindo sistema"/>}
    {!loading&&!inspecting&&<div className={styles.actionArea}>
      {connected?<div className={styles.activeNotice}><FiCheckCircle/><div><strong>Site e sistema conectados</strong><span>Os recursos públicos ainda precisam ser habilitados individualmente. Os dados internos permanecem protegidos.</span></div></div>:!siteId||!system?<div className={styles.stateNotice}>Selecione {fromSite?"um sistema":"um site"} para preparar a ligação.</div>:!published?<div className={styles.alert}><FiLock/> O site precisa estar publicado como principal antes de fazer a ligação.</div>:system.status!=="active"?<div className={styles.alert}><FiLock/> Ative o sistema no modo Construir para poder conectá-lo ao site.</div>:existingElsewhere?<div className={styles.alert}><FiLock/> Este sistema está ligado a outro site. A mudança interromperá a ligação anterior e deverá ser confirmada.</div>:<div className={styles.stateNotice}>Os dois recursos estão prontos. Clique em <strong>Ligar site e sistema</strong> para salvar.</div>}
      <div className={styles.actions}>
        {!connected&&<button type="button" className={styles.primary} disabled={!canLink||busy} onClick={requestLink}><FiLink2/> {existingElsewhere?"Trocar ligação":"Ligar site e sistema"} <FiArrowRight/></button>}
        {connected&&<><a className={styles.openSite} href={fromSite?`/app/sistemas/${encodeURIComponent(system!.id)}`:`/o/${encodeURIComponent(site?.publicSlug??linkedSite?.publicSlug??"")}`} target="_blank" rel="noopener noreferrer">{fromSite?"Abrir sistema":"Ver site"} <FiExternalLink/></a><button type="button" className={styles.detach} onClick={()=>setPending("remove")} disabled={busy}><FiXCircle/> Desconectar</button></>}
      </div>
      {pending&&<div className={styles.confirm} role="group" aria-label="Confirmar alteração de conexão"><div><strong>{pending==="remove"?"Desconectar este sistema?":pending==="move"?"Trocar o site conectado?":"Confirmar esta ligação?"}</strong><p>{pending==="remove"?"O acesso e os formulários publicados podem parar de funcionar neste site. Os dados do sistema não serão apagados.":pending==="move"?"O vínculo anterior será substituído. Verifique os formulários e o portal do site antigo após a mudança.":"O vínculo ficará salvo no sistema. Os formulários e o login exigem ativação própria."}</p></div><div><button type="button" onClick={()=>setPending(null)} disabled={busy}>Cancelar</button><button type="button" className={styles.confirmButton} disabled={busy} onClick={()=>void save(pending==="remove"?null:siteId??null)}>{busy?"Salvando…":pending==="remove"?"Desconectar":pending==="move"?"Confirmar troca":"Confirmar ligação"}</button></div></div>}
      {notice&&<div className={styles.success} role="status"><FiCheckCircle/> {notice}</div>}
      {error&&<div className={styles.error} role="alert">{error}</div>}
    </div>}
    <div className={styles.footer}><span><FiLock/> A ligação não expõe dados pessoais nem autoriza usuários automaticamente.</span><span>Formulários e acesso CONG são configurados depois da ligação.</span></div>
  </section>;
}
