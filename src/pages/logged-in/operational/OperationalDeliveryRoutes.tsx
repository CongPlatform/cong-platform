import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {useEffect,useState,type FormEvent} from "react";
import {FiArrowRight,FiCalendar,FiCheck,FiMapPin,FiNavigation,FiPlus,FiRefreshCw,FiTrash2,FiTruck,FiUsers} from "react-icons/fi";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import OperationalModalFeedback from "./OperationalModalFeedback";
import {useOperationalModalFeedback} from "./useOperationalModalFeedback";
import {
  cancelDeliveryDemand,confirmDeliveryPlan,getDeliveryBoard,listOperationalTeam,registerDeliveryDemand,setDeliveryAvailability,getMyDeliveryAvailability,saveMyDeliveryAvailability,importDeliveryDemandRecords,setDeliveryRoutingPreference,searchOperationalAddress,
  type DeliveryAvailable,type DeliveryBoard,type DeliveryDemand,type DeliveryRoute,type OperationalSystem,type OperationalTeamMember,type MyDeliveryAvailability,
} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

type View="demands"|"team"|"plan";
type FeedbackScope="demand"|"team"|"self"|"import";
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const pointFromMap=(value:string):{lat:number;lon:number}|null=>{
  const match=value.trim().match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/)
    ??value.trim().match(/(?:q=|ll=|center=)(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/)
    ??value.trim().match(/^(-?\d{1,3}(?:\.\d+)?)[,;\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if(!match)return null;
  const lat=Number(match[1]),lon=Number(match[2]);
  return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat,lon}:null;
};
const routeLinks=(route:DeliveryRoute,origin:DeliveryAvailable)=>{
  const coords=(point:{lat:number;lon:number})=>`${point.lat},${point.lon}`;
  const result:{href:string;label:string}[]=[];
  for(let index=0;index<route.stops.length;index+=4){
    const chunk=route.stops.slice(index,index+4);
    const source=index===0?origin:route.stops[index-1]!;
    const params=new URLSearchParams({api:"1",origin:coords(source),destination:coords(chunk[chunk.length-1]!),travelmode:"driving"});
    if(chunk.length>1)params.set("waypoints",chunk.slice(0,-1).map(coords).join("|"));
    result.push({href:`https://www.google.com/maps/dir/?${params.toString()}`,label:route.stops.length>4?`Abrir trecho ${result.length+1}`:"Abrir no Google Maps"});
  }
  return result;
};
const explainError=(error:unknown)=>error instanceof Error?error.message:"Não foi possível concluir a operação.";
export default function OperationalDeliveryRoutes({system,onOpenForms}:{system:OperationalSystem;onOpenForms?:()=>void}){
  const [day,setDay]=useState(localToday);
  const [view,setView]=useState<View>("demands");
  const [board,setBoard]=useState<DeliveryBoard|null>(null);
  const [team,setTeam]=useState<OperationalTeamMember[]>([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const {feedback,clearFeedback,showError,showInfo,showSuccess}=useOperationalModalFeedback();
  const [feedbackScope,setFeedbackScope]=useState<FeedbackScope|null>(null);
  const [feedbackPlacement,setFeedbackPlacement]=useState<"form"|"geocoding">("form");
  const [confirmationError,setConfirmationError]=useState("");
  const [notice,setNotice]=useState("");
  const [demandOpen,setDemandOpen]=useState(false);
  const [availabilityUser,setAvailabilityUser]=useState<OperationalTeamMember|null>(null);
  const [cancelTarget,setCancelTarget]=useState<DeliveryDemand|null>(null);
  const [confirmOpen,setConfirmOpen]=useState(false);
  const [routingConfirmOpen,setRoutingConfirmOpen]=useState(false);
  const [label,setLabel]=useState("");
  const [address,setAddress]=useState("");
  const [mapPoint,setMapPoint]=useState("");
  const [geoResults,setGeoResults]=useState<{lat:number;lon:number;label:string}[]>([]);
  const [geoTarget,setGeoTarget]=useState<"demand"|"origin">("demand");
  const [geoConfirm,setGeoConfirm]=useState(false);
  const [capacity,setCapacity]=useState(4);
  const [origin,setOrigin]=useState("");
  const [reload,setReload]=useState(0);
  const [myAvailability,setMyAvailability]=useState<MyDeliveryAvailability|null>(null);
  const [selfOpen,setSelfOpen]=useState(false);
  const [importOpen,setImportOpen]=useState(false);
  const [importSource,setImportSource]=useState("");
  const [importFields,setImportFields]=useState({labelField:"",addressField:"",latitudeField:"",longitudeField:""});
  const sourceModules=system.modules.filter(module=>module.fields.length>0&&module.blueprintKey!=="delivery_routes");
  const source=sourceModules.find(module=>module.id===importSource);

  const modalFeedbackFor=(scope:FeedbackScope,placement:"form"|"geocoding")=>feedbackScope===scope&&feedbackPlacement===placement?feedback:null;
  const resetModalFeedback=()=>{clearFeedback();setFeedbackScope(null);setFeedbackPlacement("form");};
  const reportModalError=(scope:FeedbackScope,error:unknown)=>{setFeedbackScope(scope);showError(explainError(error));};
  const startGeoSearch=(target:"demand"|"origin")=>{resetModalFeedback();setGeoTarget(target);setGeoResults([]);setGeoConfirm(true);};
  const closeDemand=()=>{setDemandOpen(false);resetModalFeedback();setGeoResults([]);};
  const closeSelf=()=>{setSelfOpen(false);resetModalFeedback();setGeoResults([]);};
  const closeTeam=()=>{setAvailabilityUser(null);resetModalFeedback();setGeoResults([]);};
  const closeImport=()=>{setImportOpen(false);resetModalFeedback();};
  const point=pointFromMap(mapPoint);
  async function locateAddress(){
    const query=geoTarget==="demand"?address:origin;
    if(query.trim().length<8)return;
    const scope:FeedbackScope=geoTarget==="demand"?"demand":selfOpen?"self":"team";
    setBusy(true);setError("");resetModalFeedback();setGeoResults([]);setGeoConfirm(false);
    try{
      const results=await searchOperationalAddress(system.id,query);
      setGeoResults(results);
      setFeedbackScope(scope);setFeedbackPlacement("geocoding");
      if(!results.length)showError("Não foi encontrado um local correspondente. Confira endereço e cidade.");
      else showInfo("Confira as sugestões e selecione a localização correta.");
    }catch(e){setFeedbackPlacement("geocoding");reportModalError(scope,e);}finally{setBusy(false);}
  }
  function chooseGeocoded(item:{lat:number;lon:number;label:string}){
    if(geoTarget==="demand")setMapPoint(`${item.lat}, ${item.lon}`);else setOrigin(`${item.lat}, ${item.lon}`);
    setGeoResults([]);
    setFeedbackScope(geoTarget==="demand"?"demand":selfOpen?"self":"team");setFeedbackPlacement("geocoding");
    showSuccess("Localização selecionada.");
  }
  const originPoint=pointFromMap(origin);
  useEffect(()=>{
    let current=true;
    void Promise.resolve().then(()=>{if(current)setLoading(true);});
    void Promise.all([getDeliveryBoard(system.id,day),listOperationalTeam(system.id),getMyDeliveryAvailability(system.id,day)]).then(([data,members,mine])=>{
      if(current){setBoard(data);setTeam(members);setMyAvailability(mine);setError("");}
    }).catch(e=>{if(current)setError(explainError(e));}).finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[system.id,day,reload]);
  const refresh=()=>setReload(value=>value+1);
  const resetDemand=()=>{setLabel("");setAddress("");setMapPoint("");};
  async function saveDemand(event:FormEvent){
    event.preventDefault();
    if(!point||busy)return;
    setBusy(true);setError("");resetModalFeedback();
    try{
      await registerDeliveryDemand(system.id,{day,label:label.trim(),address:address.trim(),...point});
      closeDemand();resetDemand();setNotice("Entrega recebida.");refresh();
    }catch(e){reportModalError("demand",e);}finally{setBusy(false);}
  }
  function editAvailability(member:OperationalTeamMember){
    const existing=board?.members.find(item=>item.userId===member.id);
    resetModalFeedback();setGeoResults([]);setAvailabilityUser(member);
    setCapacity(existing?.capacity??4);
    setOrigin(existing?`${existing.lat}, ${existing.lon}`:"");
  }
  async function saveAvailability(event:FormEvent){
    event.preventDefault();
    if(!availabilityUser||!originPoint||busy)return;
    setBusy(true);setError("");resetModalFeedback();
    try{
      await setDeliveryAvailability(system.id,{day,userId:availabilityUser.id,capacity,...originPoint});
      closeTeam();setNotice("Disponibilidade atualizada.");refresh();
    }catch(e){reportModalError("team",e);}finally{setBusy(false);}
  }
  function startMyAvailability(){
    resetModalFeedback();setGeoResults([]);
    setCapacity(myAvailability?.capacity??4);
    setOrigin(myAvailability?.lat!=null&&myAvailability.lon!=null?`${myAvailability.lat}, ${myAvailability.lon}`:"");
    setSelfOpen(true);
  }
  async function saveMyAvailability(event:FormEvent){
    event.preventDefault();
    if((capacity>0&&!originPoint)||busy)return;
    setBusy(true);setError("");resetModalFeedback();
    try{
      await saveMyDeliveryAvailability(system.id,{day,capacity,...(originPoint??{lat:0,lon:0})});
      closeSelf();setNotice("Sua disponibilidade foi atualizada.");refresh();
    }catch(e){reportModalError("self",e);}finally{setBusy(false);}
  }
  async function importFromModule(event:FormEvent){
    event.preventDefault();
    if(!importSource||busy||Object.values(importFields).some(value=>!value))return;
    setBusy(true);setError("");resetModalFeedback();
    try{
      const outcome=await importDeliveryDemandRecords(system.id,{day,moduleId:importSource,...importFields});
      closeImport();setNotice(`${outcome.imported} importadas; ${outcome.skipped} ignoradas (sem localização, repetidas ou inválidas).`);refresh();
    }catch(e){reportModalError("import",e);}finally{setBusy(false);}
  }
  async function updateRouting(enabled:boolean){
    if(busy)return;
    setBusy(true);setError("");setConfirmationError("");
    try{await setDeliveryRoutingPreference(system.id,enabled);setRoutingConfirmOpen(false);refresh();}
    catch(e){setConfirmationError(explainError(e));}finally{setBusy(false);}
  }
  async function cancelDemand(){
    if(!cancelTarget||busy)return;
    setBusy(true);setError("");setConfirmationError("");
    try{await cancelDeliveryDemand(system.id,cancelTarget,day);setCancelTarget(null);refresh();}
    catch(e){setConfirmationError(explainError(e));}finally{setBusy(false);}
  }
  async function confirm(){
    if(!board||busy)return;
    setBusy(true);setError("");setConfirmationError("");
    try{
      const result=await confirmDeliveryPlan(system.id,day,board.proposal.snapshotHash);
      setConfirmOpen(false);setNotice(`${result.assignedCount} ${result.assignedCount===1?"entrega atribuída":"entregas atribuídas"}.`);refresh();
    }catch(e){setConfirmOpen(false);setError(explainError(e));refresh();}
    finally{setBusy(false);}
  }
  const pending=board?.demands.filter(item=>item.status==="pending")??[];
  const assigned=board?.demands.filter(item=>item.status==="assigned")??[];
  const delivered=board?.demands.filter(item=>item.status==="delivered")??[];
  const ready=board?.proposal.routes.reduce((sum,route)=>sum+route.stops.length,0)??0;
  return <section className={styles.deliveryWorkspace} aria-label="Planejamento de entregas">
    <header className={styles.deliveryTop}>
      <div><h2>Planejamento de entregas</h2><p>Pedidos, equipe e roteiros no mesmo lugar.</p></div>
      <div className={styles.deliveryTopActions}>
        <label className={styles.deliveryDay}><FiCalendar/><span className={styles.deliverySrOnly}>Dia das entregas</span><input aria-label="Dia das entregas" type="date" value={day} onChange={e=>setDay(e.target.value)} min="2020-01-01" max="2100-12-31"/></label>
        <button type="button" className={styles.deliveryIconButton} onClick={refresh} disabled={loading||busy} aria-label="Atualizar"><FiRefreshCw/></button>
      </div>
    </header>
    {error&&<div className={styles.error} role="alert">{error}</div>}
    {notice&&<div className={styles.deliveryNotice} role="status">{notice}<button type="button" onClick={()=>setNotice("")}>Fechar</button></div>}
    <div className={styles.deliveryStages} role="group" aria-label="Organização das entregas">
      <button type="button" aria-pressed={view==="demands"} onClick={()=>setView("demands")}><FiMapPin/> Pedidos <span>{pending.length}</span></button>
      <button type="button" aria-pressed={view==="team"} onClick={()=>setView("team")}><FiUsers/> Equipe <span>{board?.members.length??0}</span></button>
      <button type="button" aria-pressed={view==="plan"} onClick={()=>setView("plan")}><FiNavigation/> Roteiros <span>{ready}</span></button>
    </div>
    {loading&&!board?<div className={styles.deliveryEmpty}><CongLoadingState variant="cards" count={3} label="Preparando entregas"/></div>:null}
    {view==="demands"&&<div className={styles.deliverySection}>
      <div className={styles.deliverySectionTitle}><h3>Entregas do dia</h3><div className={styles.deliveryTopActions}><button type="button" className={styles.deliveryNext} onClick={()=>{resetModalFeedback();setImportOpen(true);}}>Importar de peça</button><button type="button" className={styles.primaryButton} onClick={()=>{resetModalFeedback();setGeoResults([]);setDemandOpen(true);}}><FiPlus/> Receber pedido</button></div></div>
      {pending.length===0?<div className={styles.deliveryEmpty}>Ainda não há pedidos pendentes para este dia.</div>:<div className={styles.deliveryDemandList}>{pending.map(item=><article className={styles.deliveryDemand} key={item.id}>
        <span className={styles.deliveryPin}><FiMapPin/></span><div><strong>{item.label}</strong><span>{item.address}</span></div><button type="button" className={styles.deliveryIconButton} aria-label={`Cancelar pedido de ${item.label}`} title="Cancelar pedido" onClick={()=>{setConfirmationError("");setCancelTarget(item);}}><FiTrash2/></button>
      </article>)}</div>}
      {assigned.length+delivered.length>0&&<p className={styles.deliverySecondary}>{assigned.length} em execução · {delivered.length} concluídas neste dia.</p>}
      {pending.length>0&&<button type="button" className={styles.deliveryNext} onClick={()=>setView("team")}>Ver quem pode entregar <FiArrowRight/></button>}
    </div>}
    {view==="team"&&<div className={styles.deliverySection}>
      <div className={styles.deliverySectionTitle}><div><h3>Equipe disponível</h3><p className={styles.deliverySecondary}>Cada integrante pode informar sua disponibilidade. A equipe também pode ajudar no cadastro.</p></div><button type="button" className={styles.deliveryNext} onClick={startMyAvailability}>Minha disponibilidade</button></div>
      {team.length===0?<div className={styles.deliveryEmpty}>Nenhum integrante ativo disponível para selecionar.</div>:<div className={styles.deliveryTeamGrid}>{team.map(member=>{
        const available=board?.members.find(item=>item.userId===member.id);
        return <button type="button" key={member.id} className={styles.deliveryMember} onClick={()=>editAvailability(member)}><span className={styles.deliveryAvatar}>{member.name.trim().slice(0,1).toUpperCase()}</span><span><strong>{member.name}</strong><small>{available?`${available.capacity} paradas disponíveis`:'Não confirmado neste dia'}</small></span>{available?<FiCheck/>:<FiPlus/>}</button>;
      })}</div>}
      <button type="button" className={styles.deliveryNext} onClick={()=>setView("plan")}>Montar roteiros <FiArrowRight/></button>
    </div>}
    {view==="plan"&&<div className={styles.deliverySection}>
      <div className={styles.deliverySectionTitle}><div><h3>Distribuição sugerida</h3><p className={styles.deliverySecondary}>{board?.proposal.routingNotice??"Calculando a distribuição…"}</p><button type="button" className={styles.deliveryRoutePreference} disabled={busy} onClick={()=>{setConfirmationError("");if(board?.routingEnabled)void updateRouting(false);else setRoutingConfirmOpen(true);}}>{board?.routingEnabled?"Desativar cálculo viário":"Ativar cálculo por vias"}</button></div><button type="button" className={styles.primaryButton} disabled={busy||ready===0} onClick={()=>setConfirmOpen(true)}><FiCheck/> Confirmar distribuição</button></div>
      {ready>0&&board?.proposal.routingMode==="road"&&<div className={styles.deliveryMetric}>Distância total estimada: <strong>{board.proposal.approxKm.toLocaleString("pt-BR")} km</strong> · Tempo de deslocamento estimado: <strong>{board.proposal.roadMinutes} min</strong></div>}
      {ready===0?<div className={styles.deliveryEmpty}>Cadastre destinos e disponibilidade para gerar uma proposta.</div>:<div className={styles.deliveryRouteGrid}>{board?.proposal.routes.filter(route=>route.stops.length>0).map(route=>{
        const member=board.members.find(item=>item.userId===route.userId);
        return <article className={styles.deliveryRoute} key={route.userId}>
          <div className={styles.deliveryRouteHeader}><span className={styles.deliveryAvatar}><FiTruck/></span><div><strong>{route.name}</strong><small>{route.stops.length} paradas · {route.approxKm.toLocaleString("pt-BR")} km {board?.proposal.routingMode==="road"?"por vias":"em linha reta"}</small></div></div>
          <ol>{route.stops.map(stop=><li key={stop.id}><span>{stop.position}</span><div><strong>{stop.label}</strong><small>{stop.address}</small></div></li>)}</ol>
          {member&&<div className={styles.deliveryRouteLinks}>{routeLinks(route,member).map(item=><a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">{item.label} <FiArrowRight/></a>)}</div>}
        </article>;
      })}</div>}
      {board&&board.proposal.unassigned.length>0&&<p className={styles.deliveryUnassigned}>{board.proposal.unassigned.length} {board.proposal.unassigned.length===1?"pedido ficará pendente":"pedidos ficarão pendentes"} por falta de capacidade.</p>}
      {board&&board.plans.length>0&&<div className={styles.deliveryHistory}><h4>Distribuições confirmadas</h4>{board.plans.map(item=><div key={item.id}>{new Date(item.createdAt).toLocaleString("pt-BR")} · {item.routes.reduce((sum,route)=>sum+route.stops.length,0)} entregas</div>)}</div>}
    </div>}
    <ModalMensagem aberto={selfOpen} titulo="Minha disponibilidade" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busy} onFechar={()=>{if(!busy)closeSelf();}} mensagem={<form className={styles.deliveryForm} onSubmit={e=>void saveMyAvailability(e)}><OperationalModalFeedback feedback={modalFeedbackFor("self","form")}/>
      <p>Marque quantas entregas pode fazer em {day.split("-").reverse().join("/")}. Sua identificação vem da conta CONG.</p>
      <label>Quantidade máxima de entregas<input type="number" required min={0} max={12} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>
      {capacity>0&&<><label>Ponto de saída<input required value={origin} onChange={e=>{setOrigin(e.target.value);setGeoResults([]);resetModalFeedback();}} placeholder="Rua, número e cidade ou localização do mapa"/></label><button type="button" className={styles.deliveryNext} disabled={busy||origin.trim().length<8} onClick={()=>startGeoSearch("origin")}>Localizar ponto de saída</button><OperationalModalFeedback feedback={modalFeedbackFor("self","geocoding")}/>{geoTarget==="origin"&&geoResults.length>0&&<div className={styles.deliveryGeoOptions} aria-label="Sugestões de localização">{geoResults.map(item=><button key={`${item.lat}-${item.lon}`} type="button" onClick={()=>chooseGeocoded(item)}>{item.label}</button>)}</div>}</>}
      <p>Use 0 para indicar indisponibilidade. A equipe verá somente a capacidade e o ponto de saída que você confirmar.</p>
      <div className={styles.deliveryFormActions}><button type="button" className={styles.ghostButton} onClick={closeSelf}>Cancelar</button><button className={styles.primaryButton} disabled={busy||(capacity>0&&!originPoint)||capacity<0||capacity>12} type="submit">{busy?"Salvando…":"Confirmar"}</button></div>
    </form>}/>
    <ModalMensagem aberto={importOpen} titulo="Receber pedidos de outra peça" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busy} onFechar={()=>{if(!busy)closeImport();}} mensagem={<form className={styles.deliveryForm} onSubmit={e=>void importFromModule(e)}><OperationalModalFeedback feedback={modalFeedbackFor("import","form")}/>
      <p>Importe registros de outra peça ou crie um formulário para receber informações pelo site.</p><button type="button" className={styles.deliveryNext} onClick={()=>{closeImport();onOpenForms?.();}}>Criar ou abrir formulário</button><p className={styles.deliverySecondary}>Para planejamento automático, os registros importados ainda precisam de localização confirmada no mapa.</p>
      <label>Peça de origem<select required value={importSource} onChange={e=>{setImportSource(e.target.value);setImportFields({labelField:"",addressField:"",latitudeField:"",longitudeField:""});}}><option value="">Escolher peça</option>{sourceModules.map(module=><option key={module.id} value={module.id}>{module.name}</option>)}</select></label>
      {source&&<div className={styles.deliveryImportFields}>{([{key:"labelField",title:"Identificação"},{key:"addressField",title:"Endereço"},{key:"latitudeField",title:"Latitude"},{key:"longitudeField",title:"Longitude"}] as const).map(item=><label key={item.key}>{item.title}<select required value={importFields[item.key]} onChange={e=>setImportFields(prev=>({...prev,[item.key]:e.target.value}))}><option value="">Escolher campo</option>{source.fields.map(field=><option value={field.key} key={field.key}>{field.label}</option>)}</select></label>)}</div>}
      {!sourceModules.length&&<p>Crie uma peça com campos de endereço, latitude e longitude antes de importar demandas.</p>}
      <div className={styles.deliveryFormActions}><button type="button" className={styles.ghostButton} onClick={closeImport}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={busy||!importSource||Object.values(importFields).some(value=>!value)}>{busy?"Importando…":"Importar pedidos"}</button></div>
    </form>}/>
    <ModalMensagem aberto={demandOpen} titulo="Nova entrega" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busy} onFechar={()=>{if(!busy)closeDemand();}} mensagem={<form className={styles.deliveryForm} onSubmit={e=>void saveDemand(e)}><OperationalModalFeedback feedback={modalFeedbackFor("demand","form")}/>
      <label>Identificação do pedido<input autoFocus required minLength={2} maxLength={100} value={label} onChange={e=>setLabel(e.target.value)} placeholder="Ex.: Pedido 124"/></label>
      <label>Endereço<input required minLength={5} maxLength={300} value={address} onChange={e=>{setAddress(e.target.value);setMapPoint("");setGeoResults([]);resetModalFeedback();}} placeholder="Rua, número, bairro, cidade"/></label>
      <button type="button" className={styles.deliveryNext} disabled={busy||address.trim().length<8} onClick={()=>startGeoSearch("demand")}>Localizar endereço no mapa</button><OperationalModalFeedback feedback={modalFeedbackFor("demand","geocoding")}/>
      {point&&<p className={styles.deliverySecondary}>Localização selecionada para o planejamento.</p>}
      {geoTarget==="demand"&&geoResults.length>0&&<div className={styles.deliveryGeoOptions} aria-label="Sugestões de localização">{geoResults.map(item=><button key={`${item.lat}-${item.lon}`} type="button" onClick={()=>chooseGeocoded(item)}>{item.label}</button>)}</div>}
      <details><summary>Informar localização manualmente</summary><label>Coordenadas ou link do mapa<input value={mapPoint} onChange={e=>{setMapPoint(e.target.value);resetModalFeedback();}} placeholder="Coordenadas ou link"/></label></details>
      <div className={styles.deliveryFormActions}><button type="button" className={styles.ghostButton} onClick={closeDemand}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={busy||!point||label.trim().length<2||address.trim().length<5}>{busy?"Salvando…":"Adicionar entrega"}</button></div>
    </form>}/>
    <ModalMensagem aberto={Boolean(availabilityUser)} titulo="Disponibilidade para entregas" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busy} onFechar={()=>{if(!busy)closeTeam();}} mensagem={<form className={styles.deliveryForm} onSubmit={e=>void saveAvailability(e)}><OperationalModalFeedback feedback={modalFeedbackFor("team","form")}/>
      <strong>{availabilityUser?.name}</strong>
      <label>Quantas entregas pode realizar?<input type="number" min={0} max={12} required value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>
      <label>Ponto de saída<input required value={origin} onChange={e=>{setOrigin(e.target.value);setGeoResults([]);resetModalFeedback();}} placeholder="Endereço com rua, número e cidade"/></label>
      <button type="button" className={styles.deliveryNext} disabled={busy||origin.trim().length<8} onClick={()=>startGeoSearch("origin")}>Localizar ponto de saída</button><OperationalModalFeedback feedback={modalFeedbackFor("team","geocoding")}/>
      {geoTarget==="origin"&&geoResults.length>0&&<div className={styles.deliveryGeoOptions} aria-label="Sugestões de localização">{geoResults.map(item=><button key={`${item.lat}-${item.lon}`} type="button" onClick={()=>chooseGeocoded(item)}>{item.label}</button>)}</div>}
      <div className={styles.deliveryFormActions}><button type="button" className={styles.ghostButton} onClick={closeTeam}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={busy||(capacity>0&&!originPoint)||capacity<0||capacity>12}>{busy?"Salvando…":"Atualizar disponibilidade"}</button></div>
    </form>}/>
    <ConfirmActionModal open={geoConfirm} title="Consultar endereço?" description="O endereço informado será enviado ao serviço externo de localização configurado no servidor. Não inclua dados pessoais desnecessários." confirmLabel="Buscar localização" busy={busy} onCancel={()=>setGeoConfirm(false)} onConfirm={()=>void locateAddress()}/>
    <ConfirmActionModal open={Boolean(cancelTarget)} title="Cancelar este pedido?" tone="danger" confirmLabel="Cancelar pedido" busy={busy} description={<><p>O pedido será retirado da próxima distribuição. A ação não remove tarefas já atribuídas.</p>{confirmationError&&<div className={styles.error} role="alert">{confirmationError}</div>}</>} onCancel={()=>{setCancelTarget(null);setConfirmationError("");}} onConfirm={()=>void cancelDemand()}/>
    <ConfirmActionModal open={routingConfirmOpen} title="Ativar cálculo por vias?" confirmLabel="Autorizar roteamento" busy={busy} description={<><p>Para calcular percursos pelas ruas, as coordenadas dos pontos de saída e entrega serão enviadas ao serviço de roteamento configurado pela CONG. Ative somente se a ONG estiver autorizada a compartilhar essas localizações. Sem serviço configurado, o planejamento permanecerá aproximado.</p>{confirmationError&&<div className={styles.error} role="alert">{confirmationError}</div>}</>} onCancel={()=>{setRoutingConfirmOpen(false);setConfirmationError("");}} onConfirm={()=>void updateRouting(true)}/>
    <ConfirmActionModal open={confirmOpen} title="Confirmar distribuição?" confirmLabel="Criar tarefas de entrega" busy={busy} description={<p>As entregas da proposta serão atribuídas à equipe e aparecerão na Central de Despacho, Agenda e Kanban. Confira destinos e responsáveis antes de continuar.</p>} onCancel={()=>setConfirmOpen(false)} onConfirm={()=>void confirm()}/>
  </section>;
}
