import {useCallback,useEffect,useRef,useState, type DragEvent} from "react";
import {FiArrowRight,FiArrowUp,FiArrowDown,FiBox,FiCalendar,FiCheck,FiChevronDown,FiClipboard,FiEdit2,FiGitMerge,FiGrid,FiLayers,FiPlus,FiSearch,FiSettings,FiTrash2,FiUsers,FiTruck,FiX,FiInbox,FiSearch as FiSearchStep,FiPackage,FiActivity,FiMove,FiFlag,FiMessageCircle,FiBookOpen} from "react-icons/fi";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import {
  getOperationalPlan,updateOperationalPlan,installOperationalModule,updateOperationalModule,
  getOperationalExecutionSettings,updateOperationalExecutionSettings,
  type OperationalBlueprint,type OperationalField,type OperationalFieldType,
  type OperationalPlan,type OperationalStep,type OperationalStepKind,type OperationalSystem,type OperationalExecutionSettings,
} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";
import OperationalStepRuleEditor from "./OperationalStepRuleEditor";
import OperationalPiecePreview from "./OperationalPiecePreview";
import OperationalConnections from "./OperationalConnections";
import CongLoadingState from "../../../components/feedback/CongLoadingState";

type Selection={kind:"module"|"step";id:string}|null;
type PaletteTab="modules"|"steps";
type StageTab="modules"|"journey"|"connections";
interface Props {system:OperationalSystem;catalog:OperationalBlueprint[];onSystem:(system:OperationalSystem)=>void;onDirtyChange:(dirty:boolean)=>void;onTrySystem:(moduleId?:string)=>void}
const stagePresets:{kind:OperationalStepKind;name:string}[]=[
  {kind:"receive",name:"Receber"},{kind:"review",name:"Analisar"},{kind:"prepare",name:"Preparar"},
  {kind:"assign",name:"Distribuir"},{kind:"execute",name:"Executar"},{kind:"monitor",name:"Acompanhar"},{kind:"custom",name:"Etapa livre"},
];
const fieldTypes:{type:OperationalFieldType;name:string}[]=[
  {type:"text",name:"Texto"},{type:"long_text",name:"Texto longo"},{type:"number",name:"Número"},
  {type:"date",name:"Data"},{type:"email",name:"E-mail"},{type:"boolean",name:"Sim/Não"},
  {type:"select",name:"Opções"},{type:"relation",name:"Vínculo"},
];
const moduleIcon=(key:string)=>key==="messages"?FiMessageCircle:key==="reservations"?FiBookOpen:key==="forms"?FiClipboard:key==="agenda"?FiCalendar:key==="board"?FiGrid:key==="delivery_routes"?FiTruck:key==="availability"?FiCalendar:key==="dispatch"?FiTruck:key==="volunteers"?FiUsers:key==="donations"?FiClipboard:FiBox;
const stepIcon=(kind:OperationalStepKind)=>kind==="receive"?FiInbox:kind==="review"?FiSearchStep:kind==="prepare"?FiPackage:kind==="assign"?FiUsers:kind==="execute"?FiTruck:kind==="monitor"?FiActivity:FiFlag;
const keyFor=(text:string)=>text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").replace(/^[^a-z]+/,"").slice(0,38);
const initialPlan=(systemId:string):OperationalPlan=>({systemId,intent:"",needs:[],steps:[],revision:0,updatedAt:null});
const validFields=(fields:OperationalField[])=>fields.length<=32&&new Set(fields.map(f=>f.key)).size===fields.length&&fields.every(f=>f.label.trim().length>=2&&f.label.trim().length<=75&&(f.type!=="select"||Boolean(f.options?.length))&&(f.type!=="relation"||Boolean(f.targetModuleId)));

export default function OperationalStudio({system,catalog,onSystem,onDirtyChange,onTrySystem}:Props){
  const editable=system.status==="draft";
  const [palette,setPalette]=useState<PaletteTab>("modules");
  const [stage,setStage]=useState<StageTab>("modules");
  const [connectionDirty,setConnectionDirty]=useState(false);
  const [search,setSearch]=useState("");
  const [selection,setSelection]=useState<Selection>(null);
  const [plan,setPlan]=useState<OperationalPlan>(()=>initialPlan(system.id));
  const [loading,setLoading]=useState(true);
  const [dirty,setDirty]=useState(false);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [installing,setInstalling]=useState(false);
  const [moduleDraft,setModuleDraft]=useState<{id:string;name:string;description:string;fields:OperationalField[]}|null>(null);
  const [moduleDirty,setModuleDirty]=useState(false);
  const [moduleSaving,setModuleSaving]=useState(false);
  const [fieldSelected,setFieldSelected]=useState("");
  const [newField,setNewField]=useState("");
  const [newFieldType,setNewFieldType]=useState<OperationalFieldType>("text");
  const [showAdvanced,setShowAdvanced]=useState(false);
  const [pendingDelete,setPendingDelete]=useState<string|null>(null);
  const [execution,setExecution]=useState<OperationalExecutionSettings|null>(null);
  const [executionBusy,setExecutionBusy]=useState(false);
  const planRef=useRef(plan);
  const planRevision=useRef(0);
  const planEditing=useRef(0);
  const planWriting=useRef(false);
  const moduleEditing=useRef(0);
  const moduleWriting=useRef(false);
  const planModified=useRef(false);
  const moduleModified=useRef(false);
  const syncDirty=useCallback(()=>onDirtyChange(planModified.current||moduleModified.current||connectionDirty),[onDirtyChange,connectionDirty]);
  useEffect(()=>{syncDirty();},[connectionDirty,syncDirty]);
  function requestStage(next:StageTab){if(connectionDirty&&next!=="connections"){setMessage("Salve ou descarte a conexão antes de trocar de aba.");return false;}setStage(next);setMessage("");return true;}
  const selectedModule=selection?.kind==="module"?system.modules.find(m=>m.id===selection.id)??null:null;
  const selectedStep=selection?.kind==="step"?plan.steps.find(s=>s.id===selection.id)??null:null;
  const fieldDraft=(moduleDraft?.id===selectedModule?.id?moduleDraft?.fields:selectedModule?.fields)?.find(f=>f.key===fieldSelected);
  const selectedStepModule=selectedStep?.moduleId?system.modules.find(m=>m.id===selectedStep.moduleId):null;
  const filtered=catalog.filter(item=>`${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase().trim()));
  const busy=installing||saving||moduleSaving||executionBusy;

  useEffect(()=>{
    let live=true;
    void Promise.all([getOperationalPlan(system.id),getOperationalExecutionSettings(system.id)]).then(([p,exec])=>{
      if(!live)return;
      planRef.current=p;planRevision.current=p.revision;planEditing.current=0;
      setPlan(p);setExecution(exec);setDirty(false);planModified.current=false;moduleModified.current=false;syncDirty();setMessage("");
    }).catch(e=>{if(live)setMessage(e instanceof Error?e.message:"Não foi possível carregar o palco.");}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[system.id,syncDirty]);


  useEffect(()=>{
    if(!dirty)return;
    const handle=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",handle);
    return()=>window.removeEventListener("beforeunload",handle);
  },[dirty]);

  function changePlan(update:(p:OperationalPlan)=>OperationalPlan){
    if(!editable)return;
    const next=update(planRef.current);
    planRef.current=next;planEditing.current+=1;planModified.current=true;setPlan(next);setDirty(true);syncDirty();setMessage("");
  }
  useEffect(()=>{
    if(!dirty||!editable||saving||planWriting.current||loading||!plan.steps.every(item=>item.title.trim().length>=2))return;
    const timeout=window.setTimeout(()=>{
      if(planWriting.current)return;
      planWriting.current=true;setSaving(true);
      const snapshot=planRef.current;const edition=planEditing.current;
      void updateOperationalPlan(system.id,{...snapshot,revision:planRevision.current}).then(updated=>{
        planRevision.current=updated.revision;
        if(planEditing.current===edition){planRef.current=updated;setPlan(updated);setDirty(false);planModified.current=false;syncDirty();}
        else{planRef.current={...planRef.current,revision:updated.revision,updatedAt:updated.updatedAt};setPlan(planRef.current);}
      }).catch(e=>setMessage(e instanceof Error?e.message:"Não foi possível salvar o percurso.")).finally(()=>{planWriting.current=false;setSaving(false);});
    },780);
    return()=>window.clearTimeout(timeout);
  },[dirty,plan,system.id,editable,loading,saving,syncDirty]);

  function editModule(update:(m:NonNullable<typeof moduleDraft>)=>NonNullable<typeof moduleDraft>){
    if(!editable)return;
    const current=moduleDraft??(selectedModule?{id:selectedModule.id,name:selectedModule.name,description:selectedModule.description,fields:selectedModule.fields}:null);
    if(!current)return;
    moduleEditing.current+=1;moduleModified.current=true;setModuleDraft(update(current));setModuleDirty(true);syncDirty();setMessage("");
  }
  useEffect(()=>{
    if(!moduleDirty||!editable||!moduleDraft||moduleSaving||moduleWriting.current)return;
    if(moduleDraft.name.trim().length<2||!validFields(moduleDraft.fields))return;
    const target=system.modules.find(m=>m.id===moduleDraft.id);
    if(!target)return;
    const timeout=window.setTimeout(()=>{
      if(moduleWriting.current)return;
      moduleWriting.current=true;setModuleSaving(true);
      const snapshot=moduleDraft;const edition=moduleEditing.current;
      void updateOperationalModule(system.id,target,{name:snapshot.name.trim(),description:snapshot.description.trim(),fields:snapshot.fields}).then(updated=>{
        onSystem(updated);
        if(moduleEditing.current===edition){moduleModified.current=false;setModuleDirty(false);setModuleDraft(null);syncDirty();}
      }).catch(e=>setMessage(e instanceof Error?e.message:"Não foi possível salvar a peça.")).finally(()=>{moduleWriting.current=false;setModuleSaving(false);});
    },950);
    return()=>window.clearTimeout(timeout);
  },[moduleDirty,moduleDraft,moduleSaving,system,editable,onSystem,syncDirty]);

  function chooseModule(id:string){
    if(moduleDirty||moduleWriting.current){setMessage("Aguarde a gravação da peça antes de selecionar outra.");return;}
    const m=system.modules.find(item=>item.id===id);
    if(m){setModuleDraft({id:m.id,name:m.name,description:m.description,fields:m.fields});setModuleDirty(false);moduleModified.current=false;syncDirty();}
    setSelection({kind:"module",id});setStage("modules");setPalette("modules");setFieldSelected("");setShowAdvanced(false);setMessage("");
  }
  function chooseStep(id:string){
    if(moduleDirty||moduleWriting.current){setMessage("Aguarde a gravação da peça antes de selecionar uma etapa.");return;}
    setSelection({kind:"step",id});setStage("journey");setMessage("");
  }
  async function addModule(key:OperationalBlueprint["key"],includeStep=false,insertAt?:number){
    if(!editable||installing||system.modules.length>=20)return;
    setInstalling(true);setMessage("");
    try{
      const next=await installOperationalModule(system.id,key);
      onSystem(next);
      const installed=next.modules[next.modules.length-1];
      if(installed){
        if(includeStep){
          const step={id:crypto.randomUUID(),kind:"custom" as OperationalStepKind,title:installed.name.slice(0,100),description:"",moduleId:installed.id};
          changePlan(p=>({...p,steps:p.steps.length>=12?p.steps:[...p.steps.slice(0,insertAt??p.steps.length),step,...p.steps.slice(insertAt??p.steps.length)]}));
          setStage("journey");setSelection({kind:"step",id:step.id});
        }else{setStage("modules");setModuleDraft({id:installed.id,name:installed.name,description:installed.description,fields:installed.fields});setModuleDirty(false);moduleModified.current=false;syncDirty();setSelection({kind:"module",id:installed.id});setFieldSelected("");}
      }
    }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível adicionar a peça.");}
    finally{setInstalling(false);}
  }
  function addStep(kind:OperationalStepKind,index:number,moduleId:string|null=null){
    if(!editable||planRef.current.steps.length>=12)return;
    const step:OperationalStep={id:crypto.randomUUID(),kind,title:moduleId?system.modules.find(m=>m.id===moduleId)?.name.slice(0,100)??"Nova etapa":stagePresets.find(s=>s.kind===kind)?.name??"Nova etapa",description:"",moduleId};
    changePlan(p=>({...p,steps:[...p.steps.slice(0,index),step,...p.steps.slice(index)]}));
    chooseStep(step.id);
  }
  function readDrag(event:DragEvent<HTMLElement>):{kind:"module"|"step"|"installed";key:string}|null{
    const raw=event.dataTransfer.getData("application/x-cong-block");
    if(!raw)return null;
    const [kind,key]=raw.split(":");
    if((kind!=="module"&&kind!=="step"&&kind!=="installed")||!key)return null;
    return {kind,key};
  }
  function dragStart(event:DragEvent<HTMLElement>,kind:"module"|"step"|"installed",key:string){
    event.dataTransfer.setData("application/x-cong-block",`${kind}:${key}`);
    event.dataTransfer.setData("text/plain",key);
    event.dataTransfer.effectAllowed="copy";
  }
  function dropOnStage(event:DragEvent<HTMLElement>,index:number){
    event.preventDefault();event.stopPropagation();
    if(!editable)return;
    const data=readDrag(event);
    if(!data)return;
    if(data.kind==="step"){addStep(data.key as OperationalStepKind,index);return;}
    if(data.kind==="installed"){const item=system.modules.find(m=>m.id===data.key);if(item)addStep("custom",index,item.id);return;}
    if(stage==="journey"){if(planRef.current.steps.length>=12){setMessage("Este percurso atingiu o limite de 12 etapas.");return;}void addModule(data.key as OperationalBlueprint["key"],true,index);return;}
    void addModule(data.key as OperationalBlueprint["key"]);
  }
  function updateField(key:string,changes:Partial<OperationalField>){
    editModule(m=>({...m,fields:m.fields.map(f=>f.key===key?{...f,...changes}:f)}));
  }
  function createField(){
    const label=newField.trim();const current=moduleDraft?.fields??selectedModule?.fields??[];
    if(!editable||!label||label.length<2||current.length>=32)return;
    const root=keyFor(label);if(!root){setMessage("Use um nome com letras para o campo.");return;}
    let key=root;let suffix=2;
    while(current.some(f=>f.key===key)){key=`${root.slice(0,36)}_${suffix++}`;}
    const related=system.modules.find(m=>m.id!==selectedModule?.id&&!(["agenda","board","dispatch","delivery_routes","availability","forms","messages","reservations"].includes(m.blueprintKey)));
    if(newFieldType==="relation"&&!related){setMessage("Adicione outra peça de cadastro antes de criar um vínculo.");return;}
    const field:OperationalField={key,label,type:newFieldType,required:false,help:"",...(newFieldType==="select"?{options:["Opção 1","Opção 2"]}:{}),...(newFieldType==="relation"&&related?{targetModuleId:related.id}:{})};
    editModule(m=>({...m,fields:[...m.fields,field]}));setNewField("");setFieldSelected(key);
  }
  async function reloadPlan(){
    if(planWriting.current||moduleWriting.current)return;
    setLoading(true);setMessage("");
    try{
      const latest=await getOperationalPlan(system.id);
      planRef.current=latest;planRevision.current=latest.revision;planEditing.current=0;
      planModified.current=false;setPlan(latest);setDirty(false);syncDirty();
      setSelection(current=>current?.kind==="step"&&!latest.steps.some(step=>step.id===current.id)?null:current);
    }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível recarregar o percurso.");}
    finally{setLoading(false);}
  }
  async function toggleExecution(){
    if(!editable||!execution||saving||dirty||executionBusy)return;
    setExecutionBusy(true);setMessage("");
    try{setExecution(await updateOperationalExecutionSettings(system.id,execution,!execution.advanceOnCompletion));}
    catch(e){setMessage(e instanceof Error?e.message:"Não foi possível alterar a regra.");}
    finally{setExecutionBusy(false);}
  }
  if(loading)return <div className={styles.studioLoading}><CongLoadingState variant="page" count={5} label="Preparando o estúdio"/></div>;
  return <div className={styles.studio} aria-label="Estúdio de criação de sistemas">
    <aside className={styles.studioLibrary} aria-label="Biblioteca de blocos">
      <div className={styles.studioPaneTitle}><FiLayers/><strong>Biblioteca</strong></div>
      <div className={styles.studioSwitch} role="group" aria-label="Tipo de bloco"><button type="button" aria-pressed={palette==="modules"} onClick={()=>setPalette("modules")}>Peças</button><button type="button" aria-pressed={palette==="steps"} onClick={()=>{if(requestStage("journey"))setPalette("steps");}}>Etapas</button></div>
      {palette==="modules"?<>
        <label className={styles.studioSearch}><FiSearch aria-hidden="true"/><span className={styles.studioSrOnly}>Buscar na biblioteca</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar peças"/></label>
        <div className={styles.studioPaletteList}>{filtered.map(item=>{const Icon=moduleIcon(item.key);const exists=system.modules.some(m=>m.blueprintKey===item.key&&item.key!=="custom");return <button type="button" draggable={editable&&!exists} onDragStart={e=>dragStart(e,"module",item.key)} disabled={!editable||busy||exists||system.modules.length>=20} onClick={()=>void addModule(item.key)} key={item.key} className={styles.studioPaletteItem} title="Clique ou arraste para o palco"><span className={styles.studioPaletteIcon}><Icon/></span><span><strong>{item.name}</strong><small>{exists?"Já instalado":item.key==="forms"?"Criar e publicar formulários":item.key==="agenda"?"Calendário":item.key==="board"?"Kanban":item.key==="delivery_routes"?"Demandas e roteiros":item.key==="availability"?"Escala de trabalho":item.key==="dispatch"?"Distribuir tarefas":item.key==="custom"?"Campos livres":item.key==="messages"?"Conversas em equipe":item.key==="reservations"?"Agendar recursos compartilhados":item.key==="inventory"?"Itens e quantidades":item.key==="events"?"Eventos e datas":item.key==="assistance"?"Histórico de atendimentos":item.key==="partners"?"Rede de parceiros":item.key==="assets"?"Bens e equipamentos":"Dados e atividades"}</small></span>{exists?<FiCheck/>:<FiPlus/>}</button>;})}</div>
      </>:<div className={styles.studioPaletteList}>{stagePresets.map(item=><button type="button" key={item.kind} draggable={editable} onDragStart={e=>dragStart(e,"step",item.kind)} className={styles.studioPaletteItem} disabled={!editable||plan.steps.length>=12} onClick={()=>{setStage("journey");addStep(item.kind,plan.steps.length);}}><span className={styles.studioPaletteIcon}><FiGitMerge/></span><span><strong>{item.name}</strong><small>Etapa do trabalho</small></span><FiPlus/></button>)}</div>}
      <div className={styles.studioLibraryFoot}>{palette==="modules"?"Arraste uma peça para o palco ou clique para adicionar.":"Arraste para uma conexão ou clique para adicionar ao final."}</div>
    </aside>
    <section className={styles.studioMain} aria-label="Palco de construção">
      <header className={styles.studioToolbar}><div className={styles.studioPaneTitle}><FiGrid/><strong>Palco</strong></div><div className={styles.studioSwitch} role="group" aria-label="Visualização do palco"><button type="button" aria-pressed={stage==="modules"} onClick={()=>requestStage("modules")}><FiBox/> Estrutura</button><button type="button" aria-pressed={stage==="journey"} onClick={()=>requestStage("journey")}><FiGitMerge/> Percurso</button><button type="button" aria-pressed={stage==="connections"} onClick={()=>requestStage("connections")}><FiGitMerge/> Conexões</button></div><div className={styles.studioToolbarActions} role="status" aria-live="polite">{busy?"Salvando…":message?"Verifique as alterações":dirty||moduleDirty?"Alterações pendentes":""}</div></header>
      {message&&<div role="alert" className={styles.studioError}>{message}<span className={styles.studioErrorActions}>{dirty&&<button type="button" onClick={()=>void reloadPlan()}>Recarregar percurso</button>}<button type="button" aria-label="Fechar aviso" onClick={()=>setMessage("")}><FiX/></button></span></div>}
      <div className={styles.studioCanvas} onDragOver={e=>{if(editable)e.preventDefault();}} onDrop={e=>{const dropped=readDrag(e);if(stage==="modules"&&dropped?.kind==="module")dropOnStage(e,plan.steps.length);else if(stage==="journey"&&e.target===e.currentTarget)dropOnStage(e,plan.steps.length);}}>
        {stage==="connections"?<OperationalConnections system={system} onDirtyChange={setConnectionDirty}/>:stage==="modules"?<>
          <div className={styles.studioCanvasHeading}><h2>Estrutura</h2><span>{system.modules.length} {system.modules.length===1?"peça":"peças"}</span></div>
          {system.modules.length? <div className={styles.studioModuleGrid}>{system.modules.map(m=>{const Icon=moduleIcon(m.blueprintKey);const active=selection?.kind==="module"&&selection.id===m.id;const linked=plan.steps.filter(step=>step.moduleId===m.id).length;return <button type="button" key={m.id} onClick={()=>chooseModule(m.id)} aria-pressed={active} className={`${styles.studioModuleNode} ${active?styles.studioSelected:""}`}><span className={styles.studioNodeTop}><span className={styles.studioNodeSymbol}><Icon/></span><span className={styles.studioNodeName}>{m.name}</span><FiSettings/></span><div className={styles.studioModulePreview} aria-hidden="true"><OperationalPiecePreview type={m.blueprintKey} name={m.name}/></div><span className={styles.studioNodeBottom}>{linked?`${linked} ${linked===1?"etapa vinculada":"etapas vinculadas"}`:m.fields.length?`${m.fields.length} campos`:"Peça visual"}<FiArrowRight/></span></button>;})}</div> : <div className={styles.studioEmpty}><FiBox/><strong>Comece por uma peça</strong><span>Escolha na biblioteca à esquerda ou arraste até aqui.</span><button type="button" className={styles.studioCanvasAction} onClick={()=>setPalette("modules")}>Explorar biblioteca <FiArrowRight/></button></div>}
          <div className={styles.studioDropZone} onDragOver={e=>e.preventDefault()} onDrop={e=>dropOnStage(e,plan.steps.length)}><FiPlus/> Solte aqui para acrescentar uma peça</div>
        </>:<>
          <div className={styles.studioCanvasHeading}><h2>Percurso</h2><span>{plan.steps.length} {plan.steps.length===1?"etapa":"etapas"}</span></div>
          <div className={styles.studioJourneyCanvas} aria-label="Sequência visual do processo">
            <div className={styles.studioJourneyStart}>Início do trabalho</div>
            {plan.steps.length===0&&<p className={styles.studioFlowHelp}>Escolha uma etapa na biblioteca à esquerda para começar.</p>}
            {plan.steps.map((step,index)=>{const linked=system.modules.find(m=>m.id===step.moduleId);const active=selection?.kind==="step"&&selection.id===step.id;const Icon=stepIcon(step.kind);const preset=stagePresets.find(p=>p.kind===step.kind);return <div key={step.id} className={styles.studioJourneyGroup}>
              <div className={styles.studioJourneyBridge} onDragOver={e=>e.preventDefault()} onDrop={e=>dropOnStage(e,index)}><span className={styles.studioJourneyLine}/><button type="button" disabled={!editable||plan.steps.length>=12} onClick={()=>{setPalette("steps");addStep("custom",index);}} aria-label={`Inserir etapa antes de ${step.title}`} title="Adicionar etapa nesta ligação"><FiPlus/></button><span className={styles.studioJourneyLine}/></div>
              <div className={`${styles.studioJourneyNode} ${active?styles.studioJourneySelected:""}`} draggable={editable} onDragStart={e=>{e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("application/x-cong-move",step.id);}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();e.stopPropagation();const fromId=e.dataTransfer.getData("application/x-cong-move");if(fromId){const from=plan.steps.findIndex(s=>s.id===fromId);if(from>=0&&from!==index)changePlan(p=>{const list=[...p.steps];const [item]=list.splice(from,1);list.splice(index,0,item);return {...p,steps:list};});}else dropOnStage(e,index);}}>
                <button type="button" className={styles.studioJourneySelect} onClick={()=>chooseStep(step.id)} aria-pressed={active}>
                  <span className={styles.studioJourneyNumber}>{String(index+1).padStart(2,"0")}</span>
                  <span className={styles.studioJourneyIcon}><Icon aria-hidden="true"/></span>
                  <span className={styles.studioJourneyCopy}><small>{preset?.name??"Etapa"}{linked?` · ${linked.name}`:""}</small><strong>{step.title}</strong>{step.description&&<span>{step.description}</span>}</span>
                </button>
                <div className={styles.studioJourneyActions}>
                  <button type="button" onClick={()=>chooseStep(step.id)} aria-label={`Editar etapa ${step.title}`} title="Editar etapa"><FiEdit2/></button>
                  <button type="button" disabled={!editable||index===0} onClick={()=>changePlan(p=>{const list=[...p.steps];[list[index-1],list[index]]=[list[index],list[index-1]];return {...p,steps:list};})} aria-label={`Mover ${step.title} para cima`} title="Subir"><FiArrowUp/></button>
                  <button type="button" disabled={!editable||index===plan.steps.length-1} onClick={()=>changePlan(p=>{const list=[...p.steps];[list[index+1],list[index]]=[list[index],list[index+1]];return {...p,steps:list};})} aria-label={`Mover ${step.title} para baixo`} title="Descer"><FiArrowDown/></button>
                  <FiMove aria-hidden="true" className={styles.studioJourneyDrag}/>
                </div>
              </div>
            </div>;})}
            <div className={styles.studioJourneyBridge} onDragOver={e=>e.preventDefault()} onDrop={e=>dropOnStage(e,plan.steps.length)}><span className={styles.studioJourneyLine}/><button type="button" disabled={!editable||plan.steps.length>=12} onClick={()=>{setPalette("steps");addStep("custom",plan.steps.length);}} aria-label="Adicionar etapa ao final" title="Adicionar etapa"><FiPlus/></button><span className={styles.studioJourneyLine}/></div>
            <div className={styles.studioJourneyEnd}><FiCheck aria-hidden="true"/> Fim do percurso</div>
          </div>
          {plan.steps.length>=2&&<div className={styles.studioAutomation}><div><strong>Avançar automaticamente</strong><small>Ao concluir uma tarefa, criar a da próxima etapa.</small></div><button type="button" aria-pressed={Boolean(execution?.advanceOnCompletion)} disabled={!editable||busy||dirty||!execution} onClick={()=>void toggleExecution()}>{execution?.advanceOnCompletion?"Ligado":"Desligado"}</button></div>}
        </>}
      </div>
    </section>
    <aside className={styles.studioInspector} aria-label="Propriedades do bloco selecionado">
      <div className={styles.studioPaneTitle}><FiSettings/><strong>Propriedades</strong></div>
      {!selection?<div className={styles.studioNoSelection}><FiEdit2/><strong>Selecione no palco</strong><span>Ajuste as peças e etapas aqui, sem sair do construtor.</span></div>:selectedModule?<div className={styles.studioInspectorBody} key={selectedModule.id}>
        <span className={styles.studioInspectorKind}>PEÇA</span>
        <label className={styles.studioControl}>Nome<input disabled={!editable} maxLength={100} value={moduleDraft?.id===selectedModule.id?moduleDraft.name:selectedModule.name} onChange={e=>editModule(m=>({...m,name:e.target.value}))}/></label>
        {(["agenda","board","dispatch","delivery_routes","availability","forms","messages","reservations"].includes(selectedModule.blueprintKey))?<div className={styles.studioVisualSummary}><FiGrid/><span>Visualização operacional</span><button type="button" onClick={()=>onTrySystem(selectedModule.id)}>Abrir peça <FiArrowRight/></button></div>:<>
          <div className={styles.studioInspectorSubhead}><strong>Campos</strong><span>{moduleDraft?.fields.length??selectedModule.fields.length}</span></div>
          <div className={styles.studioFieldList}>{(moduleDraft?.id===selectedModule.id?moduleDraft.fields:selectedModule.fields).map(f=><button type="button" key={f.key} className={fieldSelected===f.key?styles.studioFieldActive:""} onClick={()=>setFieldSelected(v=>v===f.key?"":f.key)}><span>{f.label}</span><small>{fieldTypes.find(t=>t.type===f.type)?.name}</small><FiChevronDown/></button>)}</div>
          {fieldDraft&&<div className={styles.studioFieldEditor}>
            <label className={styles.studioControl}>Nome<input maxLength={75} disabled={!editable} value={fieldDraft.label} onChange={e=>updateField(fieldDraft.key,{label:e.target.value})}/></label>
            <label className={styles.studioControl}>Tipo<select disabled={!editable} value={fieldDraft.type} onChange={e=>{const type=e.target.value as OperationalFieldType;const target=system.modules.find(m=>m.id!==selectedModule.id&&!(["agenda","board","dispatch","delivery_routes","availability","forms","messages","reservations"].includes(m.blueprintKey)));if(type==="relation"&&!target){setMessage("Adicione outra peça de cadastro antes de criar vínculos.");return;}updateField(fieldDraft.key,{type,options:type==="select"?["Opção 1","Opção 2"]:undefined,targetModuleId:type==="relation"?target?.id:undefined});}}>{fieldTypes.map(item=><option key={item.type} value={item.type}>{item.name}</option>)}</select></label>
            {fieldDraft.type==="relation"&&<label className={styles.studioControl}>Vincular a<select disabled={!editable} value={fieldDraft.targetModuleId??""} onChange={e=>updateField(fieldDraft.key,{targetModuleId:e.target.value})}>{system.modules.filter(m=>m.id!==selectedModule.id&&!(["agenda","board","dispatch","delivery_routes","availability","forms","messages","reservations"].includes(m.blueprintKey))).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
            {fieldDraft.type==="select"&&<label className={styles.studioControl}>Opções<textarea disabled={!editable} rows={3} value={(fieldDraft.options??[]).join("\n")} onChange={e=>updateField(fieldDraft.key,{options:e.target.value.split("\n").map(v=>v.trim()).filter(Boolean)})}/></label>}
            <label className={styles.studioCheck}><input type="checkbox" disabled={!editable} checked={fieldDraft.required} onChange={e=>updateField(fieldDraft.key,{required:e.target.checked})}/> Obrigatório</label>
            <button type="button" className={styles.studioDanger} disabled={!editable} onClick={()=>{editModule(m=>({...m,fields:m.fields.filter(f=>f.key!==fieldDraft.key)}));setFieldSelected("");}}><FiTrash2/> Remover campo</button>
          </div>}
          {editable&&<div className={styles.studioNewField}><label className={styles.studioSrOnly} htmlFor="studio-new-field">Nome do novo campo</label><input id="studio-new-field" placeholder="Novo campo" value={newField} maxLength={75} onChange={e=>setNewField(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")createField();}}/><select aria-label="Tipo do novo campo" value={newFieldType} onChange={e=>setNewFieldType(e.target.value as OperationalFieldType)}>{fieldTypes.map(t=><option key={t.type} value={t.type}>{t.name}</option>)}</select><button type="button" disabled={!newField.trim()||busy} onClick={createField}><FiPlus/> Adicionar</button></div>}
        </>}
        <button type="button" className={styles.studioAdvancedToggle} aria-expanded={showAdvanced} onClick={()=>setShowAdvanced(v=>!v)}>Mais opções <FiChevronDown/></button>
        {editable&&<button type="button" className={styles.studioLinkAction} onClick={()=>addStep("custom",plan.steps.length,selectedModule.id)} disabled={plan.steps.length>=12||busy}><FiGitMerge/> Incluir no percurso <FiArrowRight/></button>}
        {showAdvanced&&<label className={styles.studioControl}>Descrição<textarea disabled={!editable} rows={3} value={moduleDraft?.description??selectedModule.description} onChange={e=>editModule(m=>({...m,description:e.target.value}))}/></label>}
        {!validFields(moduleDraft?.fields??selectedModule.fields)&&<p className={styles.studioValidation}>Revise o nome ou as opções do campo para salvar.</p>}
      </div>:selectedStep?<div className={styles.studioInspectorBody}>
        <span className={styles.studioInspectorKind}>ETAPA {plan.steps.findIndex(s=>s.id===selectedStep.id)+1}</span>
        <label className={styles.studioControl}>O que acontece?<input disabled={!editable} maxLength={100} value={selectedStep.title} onChange={e=>changePlan(p=>({...p,steps:p.steps.map(s=>s.id===selectedStep.id?{...s,title:e.target.value}:s)}))}/></label>
        <label className={styles.studioControl}>Peça utilizada<select disabled={!editable} value={selectedStep.moduleId??""} onChange={e=>changePlan(p=>({...p,steps:p.steps.map(s=>s.id===selectedStep.id?{...s,moduleId:e.target.value||null}:s)}))}><option value="">Nenhuma por enquanto</option>{system.modules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <button type="button" className={styles.studioAdvancedToggle} aria-expanded={showAdvanced} onClick={()=>setShowAdvanced(v=>!v)}>Instruções da etapa <FiChevronDown/></button>
        {showAdvanced&&<label className={styles.studioControl}>Orientação para a equipe<textarea disabled={!editable} rows={3} maxLength={360} value={selectedStep.description} onChange={e=>changePlan(p=>({...p,steps:p.steps.map(s=>s.id===selectedStep.id?{...s,description:e.target.value}:s)}))}/></label>}
        <div className={styles.studioStepActions}><button type="button" disabled={!editable||plan.steps.findIndex(s=>s.id===selectedStep.id)===0} onClick={()=>changePlan(p=>{const list=[...p.steps],i=list.findIndex(s=>s.id===selectedStep.id);[list[i-1],list[i]]=[list[i],list[i-1]];return {...p,steps:list};})}>↑ Subir</button><button type="button" disabled={!editable||plan.steps.findIndex(s=>s.id===selectedStep.id)===plan.steps.length-1} onClick={()=>changePlan(p=>{const list=[...p.steps],i=list.findIndex(s=>s.id===selectedStep.id);[list[i+1],list[i]]=[list[i],list[i+1]];return {...p,steps:list};})}>↓ Descer</button></div>
        <OperationalStepRuleEditor key={selectedStep.id} systemId={system.id} stepId={selectedStep.id} stepTitle={selectedStep.title} nextTitle={plan.steps[plan.steps.findIndex(s=>s.id===selectedStep.id)+1]?.title??null} editable={editable} planPending={dirty||saving||busy}/>
        <button type="button" className={styles.studioDanger} disabled={!editable||busy} onClick={()=>setPendingDelete(selectedStep.id)}><FiTrash2/> Remover etapa</button>
        {selectedStepModule&&<span className={styles.studioLinked}>Ligada a {selectedStepModule.name}</span>}
      </div>:<div className={styles.studioNoSelection}><FiBox/> Selecione outra peça.</div>}
    </aside>
    <ConfirmActionModal open={Boolean(pendingDelete)} title="Remover etapa?" tone="danger" confirmLabel="Remover" description={<p>A ligação entre as demais etapas será reorganizada. Etapas com tarefas vinculadas não poderão ser excluídas pelo servidor.</p>} onCancel={()=>setPendingDelete(null)} onConfirm={()=>{changePlan(p=>({...p,steps:p.steps.filter(s=>s.id!==pendingDelete)}));setSelection(null);setPendingDelete(null);}}/>
  </div>;
}
