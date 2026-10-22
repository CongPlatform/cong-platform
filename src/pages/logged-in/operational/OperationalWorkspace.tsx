import {useEffect,useRef,useState,type FormEvent} from "react";
import {FiArrowLeft,FiBox,FiCalendar,FiCheck,FiChevronLeft,FiChevronRight,FiEdit2,FiPlus,FiSettings,FiTrash2,FiUsers,FiFolder,FiHeart,FiColumns,FiTruck,FiMapPin,FiClock,FiClipboard,FiGrid,FiList,FiChevronsLeft,FiChevronsRight,FiMessageCircle,FiBookOpen} from "react-icons/fi";
import {Link,useParams} from "react-router-dom";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import {
  archiveOperationalRecord,createOperationalRecord,editOperationalRecord,getOperationalRecordOptions,
  getOperationalRecords,getOperationalSystem,listOperationalBlueprints,setOperationalStatus,
  type OperationalBlueprint,type OperationalField,type OperationalModule,type OperationalRecord,
  type OperationalRecordOption,type OperationalSystem,
} from "../../../features/operational/operationalService";
import OperationalAgenda from "./OperationalAgenda";
import OperationalBoard from "./OperationalBoard";
import OperationalDashboard from "./OperationalDashboard";
import OperationalDispatch from "./OperationalDispatch";
import OperationalDeliveryRoutes from "./OperationalDeliveryRoutes";
import OperationalAvailability from "./OperationalAvailability";
import OperationalForms from "./OperationalForms";
import OperationalMessages from "./OperationalMessages";
import OperationalReservations from "./OperationalReservations";
import OperationalFoodIntake from "./OperationalFoodIntake";
import OperationalSpecialistView from "./OperationalSpecialistView";
import OperationalIdentity from "./OperationalIdentity";
import OperationalStudio from "./OperationalStudio";
import OperationalTasks from "./OperationalTasks";
import OperationalAccessManager from "./OperationalAccessManager";
import {myOperationalAccess,type MyAccess} from "../../../features/operational/operationalAccessService";
import CongLoadingState from "../../../components/feedback/CongLoadingState";
import styles from "./Operational.module.css";

type WorkMode="use"|"configure";
type UseView="dashboard"|"tasks"|"records";
const specialistKeys=new Set(["volunteers","projects","donations","inventory","events","assistance","partners","assets"]);
const fieldValue=(value:unknown)=>value===null||value===undefined||value===""?"—":typeof value==="boolean"?(value?"Sim":"Não"):String(value);

export default function OperationalWorkspace(){
  const {systemId}=useParams<{systemId:string}>();
  const [system,setSystem]=useState<OperationalSystem|null>(null);
  const [catalog,setCatalog]=useState<OperationalBlueprint[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [mode,setMode]=useState<WorkMode>("configure");
  const [useView,setUseView]=useState<UseView>("dashboard");
  const [planDirty,setPlanDirty]=useState(false);
  const [accessPanel,setAccessPanel]=useState(false);
  const [myAccess,setMyAccess]=useState<MyAccess|null>(null);
  const [records,setRecords]=useState<OperationalRecord[]>([]);
  const [total,setTotal]=useState(0);
  const [recordsLoading,setRecordsLoading]=useState(false);
  const [offset,setOffset]=useState(0);
  const [recordEditor,setRecordEditor]=useState<OperationalRecord|"new"|null>(null);
  const [values,setValues]=useState<Record<string,unknown>>({});
  const [search,setSearch]=useState<Record<string,string>>({});
  const [relationOptions,setRelationOptions]=useState<Record<string,OperationalRecordOption[]>>({});
  const [relationLabels,setRelationLabels]=useState<Record<string,string>>({});
  const [archiveTarget,setArchiveTarget]=useState<OperationalRecord|null>(null);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [confirmDeactivate,setConfirmDeactivate]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [recordError,setRecordError]=useState("");
  const recordErrorRef=useRef<HTMLParagraphElement>(null);
  const [navCollapsed,setNavCollapsed]=useState(()=>{try{return localStorage.getItem("cong.operational.nav.collapsed")==="1";}catch{return false;}});
  useEffect(()=>{if(recordError)recordErrorRef.current?.focus();},[recordError]);
  function toggleNav(){setNavCollapsed(value=>{try{localStorage.setItem("cong.operational.nav.collapsed",value?"0":"1");}catch{return !value;}return !value;});}
  const module=system?.modules.find(item=>item.id===selectedId)??null;
  const sidebarGroups=[
    {label:"Cadastros e gestão",id:"manage",items:system?.modules.filter(item=>["volunteers","projects","donations","inventory","events","assistance","partners","assets"].includes(item.blueprintKey))??[]},
    {label:"Planejamento e operações",id:"operations",items:system?.modules.filter(item=>["agenda","board","dispatch","delivery_routes","availability","reservations"].includes(item.blueprintKey))??[]},
    {label:"Comunicação e dados",id:"data",items:system?.modules.filter(item=>["forms","messages"].includes(item.blueprintKey))??[]},
    {label:"Outras áreas",id:"other",items:system?.modules.filter(item=>!["volunteers","projects","donations","inventory","events","assistance","partners","assets","agenda","board","dispatch","delivery_routes","availability","forms","reservations","messages"].includes(item.blueprintKey))??[]},
  ].filter(group=>group.items.length>0);
  const navDetails:Record<string,{label:string;icon:typeof FiBox;tone:string}>={
    volunteers:{label:"Pessoas e participação",icon:FiUsers,tone:"people"},
    projects:{label:"Iniciativas e progresso",icon:FiFolder,tone:"projects"},
    donations:{label:"Entradas e recebimentos",icon:FiHeart,tone:"donations"},
    agenda:{label:"Datas e compromissos",icon:FiCalendar,tone:"calendar"},
    board:{label:"Fluxo de atividades",icon:FiColumns,tone:"board"},
    dispatch:{label:"Atribuições da equipe",icon:FiTruck,tone:"dispatch"},
    delivery_routes:{label:"Destinos e trajetos",icon:FiMapPin,tone:"routes"},
    availability:{label:"Turnos e disponibilidade",icon:FiClock,tone:"schedule"},
    forms:{label:"Respostas e conexões",icon:FiClipboard,tone:"forms"},
    inventory:{label:"Materiais e saldo",icon:FiBox,tone:"donations"},
    events:{label:"Datas e inscrições",icon:FiCalendar,tone:"calendar"},
    assistance:{label:"Acompanhamento de atendimentos",icon:FiHeart,tone:"people"},
    partners:{label:"Contatos e parcerias",icon:FiUsers,tone:"projects"},
    assets:{label:"Bens e equipamentos",icon:FiFolder,tone:"dispatch"},
    messages:{label:"Conversas internas",icon:FiMessageCircle,tone:"people"},
    reservations:{label:"Uso de salas e equipamentos",icon:FiBookOpen,tone:"schedule"},
  };
  const mayWriteCurrent=Boolean(myAccess&&(myAccess.modulePermissions[module?.id??""]==="write"||(myAccess.canWrite&&!(["none","read"].includes(myAccess.modulePermissions[module?.id??""]??"")))));
  const dataModule=module&&!(["agenda","board","dispatch","delivery_routes","availability","forms","messages","reservations"].includes(module.blueprintKey))?module:null;

  useEffect(()=>{
    if(!systemId)return;
    let active=true;
    void Promise.all([getOperationalSystem(systemId),listOperationalBlueprints(),myOperationalAccess(systemId)]).then(([item,blueprints,access])=>{
      if(!active)return;
      setSystem(item);setCatalog(blueprints);setSelectedId(item.modules[0]?.id??"");setMyAccess(access);
      setMode(!access.canConfigure||item.status==="active"?"use":"configure");
      if(access.hasHiddenAreas){setUseView("records");}
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível abrir o sistema.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[systemId]);

  useEffect(()=>{
    if(!systemId||mode!=="use"||useView!=="records"||!dataModule)return;
    let active=true;
    void getOperationalRecords(systemId,dataModule.id,offset).then(result=>{
      if(active){setRecords(result.records);setTotal(result.total);setRecordsLoading(false);}
    }).catch(e=>{if(active){setError(e instanceof Error?e.message:"Não foi possível carregar os registros.");setRecordsLoading(false);}});
    return()=>{active=false;};
  },[systemId,mode,useView,dataModule,offset]);

  useEffect(()=>{
    if(!systemId||!dataModule||mode!=="use"||useView!=="records")return;
    let active=true;
    const related=dataModule.fields.filter(field=>field.type==="relation"&&field.targetModuleId);
    void Promise.all(related.map(async field=>{
      const ids=[...new Set(records.map(record=>record.data[field.key]).filter((value):value is string=>typeof value==="string"))];
      return ids.length?getOperationalRecordOptions(systemId,field.targetModuleId!,"",ids.slice(0,50)):[];
    })).then(groups=>{if(active)setRelationLabels(Object.fromEntries(groups.flat().map(item=>[item.id,item.label])));}).catch(()=>{if(active)setRelationLabels({});});
    return()=>{active=false;};
  },[systemId,dataModule,mode,useView,records]);

  useEffect(()=>{
    if(!systemId||!dataModule||recordEditor===null)return;
    let active=true;
    const timer=window.setTimeout(()=>{
      void Promise.all(dataModule.fields.filter(field=>field.type==="relation"&&field.targetModuleId).map(async field=>{
        const options=await getOperationalRecordOptions(systemId,field.targetModuleId!,search[field.key]??"");
        const chosen=values[field.key];
        if(typeof chosen==="string"&&!options.some(item=>item.id===chosen)){
          const existing=await getOperationalRecordOptions(systemId,field.targetModuleId!,"",[chosen]);
          return [field.key,[...existing,...options]] as const;
        }
        return [field.key,options] as const;
      })).then(items=>{if(active)setRelationOptions(Object.fromEntries(items.map(([key,options])=>[key,[...options]])));}).catch(()=>{if(active)setRelationOptions({});});
    },250);
    return()=>{active=false;window.clearTimeout(timer);};
  },[systemId,dataModule,recordEditor,search,values]);

  function openModule(item:OperationalModule){
    setSelectedId(item.id);setUseView("records");setOffset(0);setRecords([]);setTotal(0);setRecordsLoading(true);
    setRecordEditor(null);setError("");setNotice("");
  }
  function startRecord(item:OperationalRecord|null){
    setValues(item?{...item.data}:{});setRecordEditor(item??"new");
    setRelationOptions({});setSearch({});setError("");setRecordError("");
  }
  function switchMode(next:WorkMode){
    if(next==="use"&&planDirty){setError("Aguarde o salvamento automático antes de abrir o sistema.");return;}
    setMode(next);setError("");setNotice("");
    if(next==="use"&&useView==="records"&&dataModule)setRecordsLoading(true);
    
  }
  async function changeStatus(){
    if(!system||busy||planDirty)return;
    setBusy(true);setError("");
    try{
      const updated=await setOperationalStatus(system,system.status==="active"?"draft":"active");
      setSystem(updated);
      if(updated.status==="active")setMode("use");
      else setMode("configure");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível alterar o status do sistema.");}
    finally{setBusy(false);}
  }
  async function refreshRecords(){
    if(!systemId||!dataModule)return;
    const result=await getOperationalRecords(systemId,dataModule.id,offset);
    setRecords(result.records);setTotal(result.total);setRecordsLoading(false);
  }
  async function saveRecord(event:FormEvent){
    event.preventDefault();
    if(!systemId||!dataModule||!recordEditor||busy)return;
    setBusy(true);setError("");
    try{
      const data:Record<string,unknown>={};
      for(const field of dataModule.fields){
        const value=values[field.key];
        data[field.key]=value===undefined||value===""?null:value;
      }
      if(recordEditor==="new")await createOperationalRecord(systemId,dataModule.id,data);
      else await editOperationalRecord(systemId,dataModule.id,recordEditor,data);
      setRecordEditor(null);setRecordError("");setNotice("Registro salvo.");await refreshRecords();
    }catch(e){setRecordError(e instanceof Error?e.message:"Não foi possível salvar o registro.");}
    finally{setBusy(false);}
  }
  async function archiveSelected(){
    if(!systemId||!dataModule||!archiveTarget||busy)return;
    setBusy(true);setError("");
    try{await archiveOperationalRecord(systemId,dataModule.id,archiveTarget);setArchiveTarget(null);setNotice("Registro arquivado.");await refreshRecords();}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível arquivar o registro.");}
    finally{setBusy(false);}
  }
  async function quickUpdateRecord(record:OperationalRecord,patch:Record<string,unknown>){
    if(!systemId||!dataModule||busy||!mayWriteCurrent)throw new Error("Você não possui permissão para alterar esta área.");
    setBusy(true);setError("");setNotice("");
    try{
      await editOperationalRecord(systemId,dataModule.id,record,{...record.data,...patch});
      await refreshRecords();
      setNotice("Alteração salva.");
    }catch(e){
      const message=e instanceof Error?e.message:"Não foi possível salvar a alteração.";
      throw new Error(message,{cause:e});
    }finally{setBusy(false);}
  }
  function recordField(field:OperationalField){
    const value=values[field.key];
    const update=(next:unknown)=>setValues(current=>({...current,[field.key]:next}));
    const required=Boolean(field.required);
    return <label key={field.key}>{field.label}{required&&" *"}
      {field.type==="relation"?<div className={styles.relationPicker}>
        <input type="search" aria-label={`Buscar ${field.label}`} placeholder="Buscar registro" value={search[field.key]??""} onChange={e=>setSearch(current=>({...current,[field.key]:e.target.value}))}/>
        <select required={required} value={String(value??"")} onChange={e=>update(e.target.value||null)}><option value="">Nenhum vínculo</option>{(relationOptions[field.key]??[]).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>
      </div>:field.type==="boolean"?<select required={required} value={value===true?"true":value===false?"false":""} onChange={e=>update(e.target.value===""?null:e.target.value==="true")}><option value="">Não informado</option><option value="true">Sim</option><option value="false">Não</option></select>:field.type==="select"?<select required={required} value={String(value??"")} onChange={e=>update(e.target.value)}><option value="">Selecione...</option>{field.options?.map(option=><option key={option}>{option}</option>)}</select>:field.type==="long_text"?<textarea required={required} maxLength={4000} value={String(value??"")} onChange={e=>update(e.target.value)}/>:<input required={required} type={field.type==="date"?"date":field.type==="number"?"number":field.type==="email"?"email":"text"} step={field.type==="number"?"any":undefined} maxLength={field.type==="number"||field.type==="date"?undefined:300} value={String(value??"")} onChange={e=>update(field.type==="number"?(e.target.value===""?null:Number(e.target.value)):e.target.value)}/>}
      {field.help&&<small>{field.help}</small>}
    </label>;
  }

  if(loading)return <main className={styles.page}><CongLoadingState variant="page" count={5} label="Abrindo sistema"/></main>;
  if(!system)return <main className={styles.page}><Link to="/app/sistemas">← Meus sistemas</Link><p className={styles.error}>{error||"Sistema não encontrado."}</p></main>;
  return <main className={`${styles.page} ${styles.operationalAppShell} ${mode==="configure"?styles.studioPage:""}`}>
    <header className={styles.operationalShellBar}>
      <Link to="/app/sistemas" className={styles.operationalExit} aria-label="Voltar aos meus sistemas" title="Meus sistemas"><FiArrowLeft/><span>Meus sistemas</span></Link>
      <OperationalIdentity system={system} onSystem={setSystem}/>
      <div className={styles.operationalShellActions}>
        {myAccess?.canConfigure&&<button type="button" className={styles.ghostButton} onClick={()=>setAccessPanel(true)}><FiUsers/> Pessoas e acessos</button>}
        <div className={styles.modeControl} role="group" aria-label="Modo de trabalho">
          {myAccess?.canConfigure&&<button type="button" className={mode==="configure"?styles.activeMode:""} onClick={()=>switchMode("configure")}><FiSettings/> Construir</button>}
          <button type="button" className={mode==="use"?styles.activeMode:""} onClick={()=>switchMode("use")}>Usar</button>
        </div>
        {myAccess?.canConfigure&&<button className={system.status==="active"?styles.ghostButton:styles.primaryButton} type="button" disabled={busy||planDirty} onClick={()=>system.status==="active"?setConfirmDeactivate(true):void changeStatus()}>{system.status==="active"?"Desativar":"Ativar"}</button>}
      </div>
    </header>
    {error&&<div role="alert" className={styles.error}>{error}</div>}
    {notice&&mode==="use"&&<div role="status" className={styles.notice}><FiCheck/>{notice}</div>}
    {mode==="configure"?<OperationalStudio system={system} catalog={catalog} onSystem={setSystem} onDirtyChange={setPlanDirty} onTrySystem={id=>{if(planDirty){setError("Aguarde o salvamento do percurso.");return;}if(id){const item=system.modules.find(m=>m.id===id);if(item)openModule(item);}else setUseView("dashboard");switchMode("use");}}/>:<div className={`${styles.workspaceGrid} ${navCollapsed?styles.workspaceGridCompact:""}`}>
      <aside className={`${styles.moduleSidebar} ${navCollapsed?styles.moduleSidebarCompact:""}`} aria-label="Navegação do sistema">
        <div className={styles.sidebarHeader}><strong>Áreas do sistema</strong><button type="button" className={styles.sidebarToggle} aria-label={navCollapsed?"Expandir barra de navegação":"Recolher barra de navegação"} title={navCollapsed?"Expandir navegação":"Recolher navegação"} aria-expanded={!navCollapsed} onClick={toggleNav}>{navCollapsed?<FiChevronsRight/>:<FiChevronsLeft/>}</button></div>
        <div className={styles.navPrimary}>
          {!myAccess?.hasHiddenAreas&&<button type="button" title="Visão geral · Resumo do sistema" aria-label="Visão geral" aria-current={useView==="dashboard"?"page":undefined} className={`${styles.moduleNav} ${styles.sidebarFeature} ${useView==="dashboard"?styles.moduleNavActive:""}`} onClick={()=>setUseView("dashboard")}><span className={styles.sidebarIcon}><FiGrid aria-hidden="true"/></span><span className={styles.sidebarCopy}><strong>Visão geral</strong></span></button>}
          {!myAccess?.hasHiddenAreas&&<button type="button" title="Tarefas da equipe · O que precisa ser feito" aria-label="Tarefas da equipe" aria-current={useView==="tasks"?"page":undefined} className={`${styles.moduleNav} ${styles.sidebarFeature} ${useView==="tasks"?styles.moduleNavActive:""}`} onClick={()=>setUseView("tasks")}><span className={styles.sidebarIcon}><FiList aria-hidden="true"/></span><span className={styles.sidebarCopy}><strong>Tarefas da equipe</strong></span></button>}
        </div>
        {system.modules.length>0&&<div className={styles.sidebarTitle}><span>SEU SISTEMA</span><span>{system.modules.length}</span></div>}
        {sidebarGroups.map(group=><div key={group.id} className={styles.sidebarGroup}><div className={styles.sidebarGroupLabel}>{group.label}</div>{group.items.map(item=>{
          const detail=navDetails[item.blueprintKey]??{label:item.description||"Dados e atividades",icon:FiBox,tone:"other"};
          const Icon=detail.icon;
          const active=useView==="records"&&item.id===selectedId;
          return <button key={item.id} type="button" title={`${item.name} · ${detail.label}`} aria-label={item.name} aria-current={active?"page":undefined} className={`${styles.moduleNav} ${styles.sidebarArea} ${active?styles.moduleNavActive:""}`} onClick={()=>openModule(item)}><span className={styles.sidebarIcon} data-tone={detail.tone}><Icon aria-hidden="true"/></span><span className={styles.sidebarCopy}><strong>{item.name}</strong></span><FiChevronRight className={styles.sidebarChevron} aria-hidden="true"/></button>;
        })}</div>)}
      </aside>
      <section className={styles.workArea}>
        {useView==="dashboard"?<OperationalDashboard system={system} onSystem={setSystem} onOpenModule={id=>{const item=system.modules.find(m=>m.id===id);if(item)openModule(item);}} onOpenTasks={()=>setUseView("tasks")}/>:useView==="tasks"?<OperationalTasks system={system}/>:!module?<div className={styles.emptyState}>Escolha uma área do sistema no menu ou volte ao construtor.</div>:module.blueprintKey==="agenda"?<OperationalAgenda system={system}/>:module.blueprintKey==="board"?<OperationalBoard system={system}/>:module.blueprintKey==="dispatch"?<OperationalDispatch system={system}/>:module.blueprintKey==="delivery_routes"?<OperationalDeliveryRoutes system={system} onOpenForms={()=>{const forms=system.modules.find(item=>item.blueprintKey==="forms");if(forms)openModule(forms);else switchMode("configure");}}/>:module.blueprintKey==="availability"?<OperationalAvailability system={system}/>:module.blueprintKey==="forms"?<OperationalForms system={system}/>:module.blueprintKey==="messages"?<OperationalMessages key={module.id} system={system} module={module} canWrite={mayWriteCurrent}/>:module.blueprintKey==="reservations"?<OperationalReservations key={module.id} system={system} module={module} canWrite={mayWriteCurrent}/>:dataModule&&specialistKeys.has(module.blueprintKey)?<><OperationalSpecialistView key={module.id} module={module} records={records} total={total} loading={recordsLoading} offset={offset} onPage={next=>{setRecordsLoading(true);setOffset(next);}} canWrite={mayWriteCurrent} busy={busy} onCreate={()=>startRecord(null)} onEdit={startRecord} onArchive={setArchiveTarget} onUpdate={quickUpdateRecord}/>{module.blueprintKey==="donations"&&mayWriteCurrent&&<OperationalFoodIntake systemId={system.id} module={module} onRecorded={()=>{void refreshRecords().catch(e=>setError(e instanceof Error?e.message:"Erro ao atualizar."));}}/>}</>:<>
          <div className={styles.sectionHeading}><div><h2>{module.name}</h2></div><div className={styles.actions}>{module.blueprintKey==="donations"&&mayWriteCurrent&&<OperationalFoodIntake systemId={system.id} module={module} onRecorded={()=>{void refreshRecords().catch(e=>setError(e instanceof Error?e.message:"Erro ao atualizar."));}}/>}{mayWriteCurrent&&<button className={styles.primaryButton} type="button" onClick={()=>startRecord(null)}><FiPlus/> Novo registro</button>}</div></div>
          <div className={styles.panel}><div className={styles.tableScroll}><table className={styles.table}><thead><tr>{module.fields.slice(0,5).map(field=><th key={field.key}>{field.label}</th>)}<th>Ações</th></tr></thead><tbody>{records.map(record=><tr key={record.id}>{module.fields.slice(0,5).map(field=><td key={field.key}>{field.type==="relation"&&typeof record.data[field.key]==="string"?relationLabels[record.data[field.key] as string]??"Registro vinculado":fieldValue(record.data[field.key])}</td>)}<td><div className={styles.actions}>{mayWriteCurrent&&<><button className={styles.textButton} onClick={()=>startRecord(record)}><FiEdit2/> Editar</button><button className={styles.textButton} disabled={busy} onClick={()=>setArchiveTarget(record)}><FiTrash2/> Arquivar</button></>}</div></td></tr>)}</tbody></table></div>{records.length===0&&<div className={styles.tableEmpty}>Nenhum registro ainda.</div>}<div className={styles.pagination}><span>{total} registro(s)</span><div className={styles.actions}><button type="button" className={styles.ghostButton} disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-50))}><FiChevronLeft/> Anterior</button><button type="button" className={styles.ghostButton} disabled={offset+50>=total} onClick={()=>setOffset(offset+50)}>Próxima <FiChevronRight/></button></div></div></div>
        </>}
      </section>
    </div>}
    {accessPanel&&<OperationalAccessManager systemId={system.id} onClose={()=>setAccessPanel(false)}/>}
    <ConfirmActionModal open={confirmDeactivate} title="Desativar sistema?" tone="danger" confirmLabel="Desativar" busy={busy} description={<p>O sistema voltará ao estado de rascunho. Os dados e as peças serão preservados.</p>} onCancel={()=>setConfirmDeactivate(false)} onConfirm={()=>{setConfirmDeactivate(false);void changeStatus();}}/>
    <ConfirmActionModal open={Boolean(archiveTarget)} title="Arquivar registro?" tone="danger" confirmLabel="Arquivar" busy={busy} description={<p>O registro sairá das consultas, mas o histórico será preservado.</p>} onCancel={()=>setArchiveTarget(null)} onConfirm={()=>void archiveSelected()}/>
    {recordEditor!==null&&dataModule&&<div className={styles.overlay} role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setRecordEditor(null);}}><section className={styles.recordModal} role="dialog" aria-modal="true" aria-label={recordEditor==="new"?"Novo registro":"Editar registro"}><header><h2>{recordEditor==="new"?"Novo registro":"Editar registro"}</h2><p>{dataModule.name}</p></header><form onSubmit={event=>void saveRecord(event)}><div className={styles.recordFields}>{dataModule.fields.map(recordField)}</div>{recordError&&<p ref={recordErrorRef} tabIndex={-1} role="alert" className={styles.recordModalError}>{recordError}</p>}<div className={styles.actions}><button type="submit" disabled={busy} className={styles.primaryButton}>{busy?"Salvando…":"Salvar registro"}</button><button type="button" className={styles.ghostButton} onClick={()=>setRecordEditor(null)}>Cancelar</button></div></form></section></div>}
  </main>;
}
