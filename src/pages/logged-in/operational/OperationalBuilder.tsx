import {useCallback,useEffect,useRef,useState} from "react";
import {FiActivity,FiArrowDown,FiArrowRight,FiArrowUp,FiBox,FiCheck,FiChevronDown,FiClipboard,FiCompass,FiEdit3,FiGitMerge,FiMove,FiPlus,FiTrash2,FiUsers} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import {getOperationalPlan,updateOperationalPlan,getOperationalExecutionSettings,updateOperationalExecutionSettings,type OperationalExecutionSettings,type OperationalBlueprint,type OperationalNeed,type OperationalPlan,type OperationalStep,type OperationalStepKind,type OperationalSystem} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

type View="vision"|"journey";
const areas:{id:OperationalNeed;title:string;description:string;icon:typeof FiUsers;recommendations:OperationalBlueprint["key"][]}[]=[
  {id:"people",title:"Pessoas e equipes",description:"Quem participa, quem atende e quem colabora",icon:FiUsers,recommendations:["volunteers"]},
  {id:"resources",title:"Recursos e doações",description:"O que entra, sai e precisa ser acompanhado",icon:FiClipboard,recommendations:["donations"]},
  {id:"activities",title:"Atividades e serviços",description:"O que acontece no dia a dia da organização",icon:FiActivity,recommendations:["projects"]},
  {id:"monitoring",title:"Resultados e acompanhamento",description:"O que é importante observar e melhorar",icon:FiCompass,recommendations:[]},
  {id:"custom",title:"Uma necessidade específica",description:"Criar peças a partir do seu próprio trabalho",icon:FiEdit3,recommendations:["custom"]},
];
const stages:{kind:OperationalStepKind;title:string;hint:string;icon:typeof FiUsers}[]=[
  {kind:"receive",title:"Receber",hint:"Captar pedidos e informações",icon:FiClipboard},
  {kind:"review",title:"Analisar",hint:"Conferir e decidir",icon:FiCompass},
  {kind:"prepare",title:"Preparar",hint:"Organizar materiais e equipe",icon:FiActivity},
  {kind:"assign",title:"Distribuir",hint:"Definir responsáveis",icon:FiUsers},
  {kind:"execute",title:"Realizar",hint:"Executar o trabalho",icon:FiCheck},
  {kind:"monitor",title:"Acompanhar",hint:"Ver resultados",icon:FiGitMerge},
  {kind:"custom",title:"Personalizar",hint:"Definir outra etapa",icon:FiEdit3},
];
const blank=(systemId:string):OperationalPlan=>({systemId,intent:"",needs:[],steps:[],revision:0,updatedAt:null});
interface Props {system:OperationalSystem;catalog:OperationalBlueprint[];view:View;onInstall:(key:OperationalBlueprint["key"])=>Promise<void>;onOpenModule:(id:string)=>void;onShowPieces:()=>void;onShowJourney:()=>void;busy:boolean;onDirtyChange:(dirty:boolean)=>void}

export default function OperationalBuilder({system,catalog,view,onInstall,onShowPieces,onShowJourney,busy,onDirtyChange}:Props){
  const [plan,setPlan]=useState<OperationalPlan>(()=>blank(system.id));
  const latest=useRef(plan);
  const savedRevision=useRef(0);
  const editCount=useRef(0);
  const writing=useRef(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [openNeeds,setOpenNeeds]=useState(false);
  const [openDescription,setOpenDescription]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [error,setError]=useState("");
  const [openInsertion,setOpenInsertion]=useState<number|null>(null);
  const [editingStep,setEditingStep]=useState<string|null>(null);
  const [dragged,setDragged]=useState<string|null>(null);
  const [execution,setExecution]=useState<OperationalExecutionSettings|null>(null);
  const [executionBusy,setExecutionBusy]=useState(false);
  const [executionError,setExecutionError]=useState("");
  const [pendingStepDelete,setPendingStepDelete]=useState<string|null>(null);
  const editable=system.status==="draft";

  useEffect(()=>{
    let live=true;
    void getOperationalPlan(system.id).then(result=>{if(!live)return;latest.current=result;savedRevision.current=result.revision;editCount.current=0;setPlan(result);setOpenNeeds(result.needs.length>0);setOpenDescription(Boolean(result.intent));setDirty(false);onDirtyChange(false);setError("");}).catch(e=>{if(live)setError(e instanceof Error?e.message:"Não foi possível abrir este percurso.");}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[system.id,onDirtyChange]);

  useEffect(()=>{
    let live=true;
    void getOperationalExecutionSettings(system.id).then(settings=>{if(live)setExecution(settings);}).catch(e=>{if(live)setExecutionError(e instanceof Error?e.message:"Não foi possível carregar a regra.");});
    return()=>{live=false;};
  },[system.id]);
  async function toggleExecution(){
    if(!execution||executionBusy||dirty||saving)return;
    setExecutionBusy(true);setExecutionError("");
    try{setExecution(await updateOperationalExecutionSettings(system.id,execution,!execution.advanceOnCompletion));}
    catch(e){setExecutionError(e instanceof Error?e.message:"Não foi possível alterar a regra.");}
    finally{setExecutionBusy(false);}
  }

  function change(update:(previous:OperationalPlan)=>OperationalPlan){
    if(!editable)return;
    const result=update(latest.current);
    latest.current=result;
    editCount.current+=1;
    setPlan(result);
    setDirty(true);
    onDirtyChange(true);
    setError("");
  }
  const persist=useCallback(async()=>{
    if(!editable||writing.current||!dirty||error||latest.current.steps.some(step=>step.title.trim().length<2))return;
    writing.current=true;
    setSaving(true);
    const snapshot=latest.current;
    const localEdition=editCount.current;
    try{
      const saved=await updateOperationalPlan(system.id,{...snapshot,revision:savedRevision.current});
      savedRevision.current=saved.revision;
      if(editCount.current===localEdition){latest.current=saved;setPlan(saved);setDirty(false);onDirtyChange(false);}
      else{latest.current={...latest.current,revision:saved.revision,updatedAt:saved.updatedAt};setPlan(latest.current);setDirty(true);}
    }catch(e){setError(e instanceof Error?e.message:"Falha ao salvar. Suas alterações continuam nesta tela.");}
    finally{writing.current=false;setSaving(false);}
  },[editable,dirty,error,system.id,onDirtyChange]);
  useEffect(()=>{
    if(!editable||!dirty||saving||error||loading)return;
    const handle=window.setTimeout(()=>void persist(),900);
    return()=>window.clearTimeout(handle);
  },[plan,dirty,saving,error,loading,editable,persist]);
  useEffect(()=>{
    if(!dirty)return;
    const onLeave=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",onLeave);
    return()=>window.removeEventListener("beforeunload",onLeave);
  },[dirty]);

  function insert(kind:OperationalStepKind,index:number){
    const template=stages.find(item=>item.kind===kind)??stages[0];
    change(current=>({...current,steps:[...current.steps.slice(0,index),{id:crypto.randomUUID(),kind,title:template.title,description:"",moduleId:null},...current.steps.slice(index)]}));
    setOpenInsertion(null);
  }
  function adjust(id:string,changes:Partial<OperationalStep>){change(p=>({...p,steps:p.steps.map(s=>s.id===id?{...s,...changes}:s)}));}
  function reposition(from:number,to:number){
    if(from===to||from<0||to<0||from>=plan.steps.length||to>=plan.steps.length)return;
    change(p=>{const steps=[...p.steps];const [item]=steps.splice(from,1);if(!item)return p;steps.splice(to,0,item);return {...p,steps};});
  }
  const selectedStep=plan.steps.find(step=>step.id===editingStep)??null;
  const recommended=[...new Set(areas.filter(a=>plan.needs.includes(a.id)).flatMap(a=>a.recommendations))];
  const suggestions=catalog.filter(b=>recommended.includes(b.key));
  if(loading)return <div className={styles.builderLoading} role="status">Preparando seu espaço de construção...</div>;
  return <div className={styles.visualBuilder}>
    {view==="journey"&&<div className={styles.builderHeading}><div><span className={styles.eyebrow}>SEU PERCURSO</span><h2>Como o trabalho acontece?</h2><p>Adicione e organize etapas como cartões conectados. Você pode começar por qualquer ponto.</p></div></div>}
    {(saving||error)&&<span className={`${styles.autosaveState} ${error?styles.autosaveError:""}`} role="status" aria-live="polite">{error?"Falha ao salvar":"Salvando…"}</span>}
    {error&&<div className={styles.error} role="alert">{error} <button type="button" className={styles.textButton} onClick={()=>{setError("");void persist();}}>Tentar novamente</button></div>}
    {view==="vision"?<>
      <section className={styles.builderStartPanel}>
        <div className={styles.builderStartIntro}><span className={styles.eyebrow}>VAMOS CONSTRUIR?</span><h2>O que você quer fazer agora?</h2><p>Escolha um caminho. Você pode mudar ou combinar peças a qualquer momento.</p></div>
        <div className={styles.builderStartChoices}>
          <button type="button" className={styles.builderStartChoice} onClick={onShowPieces}><span className={styles.builderStartIcon}><FiBox/></span><strong>Adicionar peças</strong><span>Escolha cadastros e funções para o seu trabalho.</span><FiArrowRight className={styles.builderStartArrow}/></button>
          <button type="button" className={styles.builderStartChoice} onClick={onShowJourney}><span className={styles.builderStartIcon}><FiGitMerge/></span><strong>Desenhar percurso</strong><span>Ligue as etapas do trabalho de forma visual.</span><FiArrowRight className={styles.builderStartArrow}/></button>
          <button type="button" className={styles.builderStartChoice} aria-expanded={openNeeds} onClick={()=>setOpenNeeds(value=>!value)}><span className={styles.builderStartIcon}><FiCompass/></span><strong>Receber sugestões</strong><span>Explore possibilidades para sua organização.</span><FiChevronDown className={styles.builderStartArrow}/></button>
        </div>
        {openNeeds&&<div className={styles.builderGuide}>
          <div className={styles.builderSubhead}><div><h3>Que necessidades você tem?</h3><p>Marque apenas o que fizer sentido.</p></div></div>
          <div className={styles.needsGrid}>{areas.map(area=>{const Icon=area.icon;const selected=plan.needs.includes(area.id);return <button type="button" disabled={!editable} key={area.id} aria-pressed={selected} className={`${styles.needCard} ${selected?styles.needSelected:""}`} onClick={()=>change(p=>({...p,needs:selected?p.needs.filter(n=>n!==area.id):[...p.needs,area.id]}))}><span className={styles.needSymbol}><Icon/></span><strong>{area.title}</strong><span>{area.description}</span><span className={styles.needCheck}>{selected?<><FiCheck/> Selecionada</>:"Selecionar"}</span></button>;})}</div>
          {suggestions.length>0&&<div className={styles.builderSuggested}><div className={styles.builderSubhead}><h3>Peças sugeridas</h3></div><div className={styles.recommendations}>{suggestions.map(blueprint=>{const installed=system.modules.some(m=>m.blueprintKey===blueprint.key&&blueprint.key!=="custom");return <div className={styles.recommendation} key={blueprint.key}><span className={styles.needSymbol}><FiClipboard/></span><div><strong>{blueprint.name}</strong><p>{blueprint.description}</p></div><button type="button" className={styles.ghostButton} disabled={busy||!editable||installed||system.modules.length>=20} onClick={()=>void onInstall(blueprint.key)}>{installed?<><FiCheck/> Adicionada</>:<><FiPlus/> Adicionar</>}</button></div>;})}</div></div>}
          <button type="button" className={styles.builderDescriptionToggle} aria-expanded={openDescription} onClick={()=>setOpenDescription(value=>!value)}><span><FiEdit3/> {plan.intent?"Editar descrição do trabalho":"Prefiro descrever com minhas palavras"}</span><FiChevronDown/></button>
          {openDescription&&<label className={styles.builderPrompt}>O que deseja facilitar?<textarea disabled={!editable} maxLength={1200} rows={3} placeholder="Ex.: Receber pedidos e organizar as entregas..." value={plan.intent} onChange={event=>change(p=>({...p,intent:event.target.value}))}/></label>}
        </div>}
      </section>
    </>:<>
      <div className={styles.builderSurface}><div className={styles.builderSubhead}><div><h3>Seu percurso</h3><p>Você conhece a operação; nós organizamos a ligação entre as etapas.</p></div><span>{plan.steps.length} de 12 etapas</span></div>
      <div className={styles.journeyCanvas} aria-label="Sequência visual do processo"><div className={styles.journeyStart}>Início do trabalho</div>
        {plan.steps.length===0&&<p className={styles.journeyEmpty}>Comece por qualquer etapa. Você poderá mudar a ordem depois.</p>}
        {plan.steps.map((step,index)=>{const template=stages.find(s=>s.kind===step.kind)??stages[6];const Icon=template.icon;const attached=system.modules.find(m=>m.id===step.moduleId);return <div className={styles.journeyGroup} key={step.id}>
          <div className={styles.journeyBridge}><span className={styles.journeyLine}/><button type="button" disabled={!editable||plan.steps.length>=12} className={styles.journeyConnector} aria-label={`Inserir etapa antes de ${step.title}`} title="Adicionar uma etapa nesta ligação" onClick={()=>setOpenInsertion(index)}><FiPlus/></button><span className={styles.journeyLine}/></div>
          <div className={`${styles.journeyNode} ${dragged===step.id?styles.journeyDragging:""}`} draggable={editable} onDragStart={e=>{setDragged(step.id);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",step.id);}} onDragEnd={()=>setDragged(null)} onDragOver={e=>{if(editable)e.preventDefault();}} onDrop={e=>{e.preventDefault();const id=e.dataTransfer.getData("text/plain");const from=plan.steps.findIndex(s=>s.id===id);if(editable)reposition(from,index);setDragged(null);}}>
            <span className={styles.journeyStepNumber}>{String(index+1).padStart(2,"0")}</span><span className={styles.journeyNodeIcon}><Icon/></span><div className={styles.journeyCopy}><span>{template.title} · {attached?attached.name:"Etapa livre"}</span><strong>{step.title}</strong>{step.description&&<p>{step.description}</p>}</div>
            <div className={styles.journeyActions}><button type="button" className={styles.journeyEdit} aria-label={`Editar etapa ${step.title}`} onClick={()=>setEditingStep(step.id)}><FiEdit3/> <span>Editar</span></button><button type="button" disabled={!editable||index===0} title="Mover para cima" aria-label={`Mover ${step.title} para cima`} onClick={()=>reposition(index,index-1)}><FiArrowUp/></button><button type="button" disabled={!editable||index===plan.steps.length-1} title="Mover para baixo" aria-label={`Mover ${step.title} para baixo`} onClick={()=>reposition(index,index+1)}><FiArrowDown/></button><FiMove className={styles.dragHandle} aria-hidden="true"/></div>
          </div></div>;})}
        <div className={styles.journeyBridge}><span className={styles.journeyLine}/><button className={styles.journeyConnector} disabled={!editable||plan.steps.length>=12} aria-label="Adicionar etapa ao final" onClick={()=>setOpenInsertion(plan.steps.length)}><FiPlus/></button><span className={styles.journeyLine}/></div><div className={styles.journeyEnd}><FiCheck/> Final do percurso</div>
      </div>
      <div className={styles.journeyExecution}>
        <div><strong>Avançar tarefas automaticamente</strong><p>Ao concluir uma tarefa vinculada a uma etapa, criar uma tarefa para a etapa seguinte. Responsável e prazo ficam com a equipe.</p></div>
        <button type="button" className={styles.ghostButton} aria-pressed={execution?.advanceOnCompletion??false} disabled={!execution||executionBusy||dirty||saving||plan.steps.length<2} onClick={()=>void toggleExecution()}>{execution?.advanceOnCompletion?"Desativar":"Ativar"}</button>
      </div>
      {executionError&&<div className={styles.error} role="alert">{executionError}</div>}
      </div>
    </>}
    <ModalMensagem aberto={openInsertion!==null} titulo="Qual etapa vem aqui?" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora onFechar={()=>setOpenInsertion(null)} mensagem={<div className={styles.stagePicker}><p>Escolha o que a equipe faz neste ponto. Depois você poderá personalizar e conectar a peça correspondente.</p><div className={styles.stagePickerGrid}>{stages.map(stage=>{const Icon=stage.icon;return <button type="button" key={stage.kind} onClick={()=>{if(openInsertion!==null)insert(stage.kind,openInsertion);}}><Icon/><strong>{stage.title}</strong><span>{stage.hint}</span></button>;})}</div></div>}/>
    <ModalMensagem aberto={Boolean(selectedStep)} titulo="Ajustar etapa" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora onFechar={()=>setEditingStep(null)} mensagem={selectedStep?<div className={styles.stageEditor}><label>O que acontece nesta etapa?<input disabled={!editable} maxLength={100} value={selectedStep.title} onChange={e=>adjust(selectedStep.id,{title:e.target.value})}/></label><label>Explique para a equipe<textarea disabled={!editable} maxLength={360} value={selectedStep.description} onChange={e=>adjust(selectedStep.id,{description:e.target.value})}/></label><label>Qual peça ajuda nesta etapa?<select disabled={!editable} value={selectedStep.moduleId??""} onChange={e=>adjust(selectedStep.id,{moduleId:e.target.value||null})}><option value="">Nenhuma por enquanto</option>{system.modules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><div className={styles.stageEditorActions}><button type="button" className={styles.primaryButton} onClick={()=>setEditingStep(null)}>Concluir</button><button type="button" className={styles.textButton} disabled={!editable} onClick={()=>{setPendingStepDelete(selectedStep.id);setEditingStep(null);}}><FiTrash2/> Remover etapa</button></div></div>:null}/>
    <ConfirmActionModal open={Boolean(pendingStepDelete)} title="Remover esta etapa do percurso?" tone="danger" confirmLabel="Remover etapa" description={<p>A ligação entre as demais etapas será reorganizada automaticamente. Etapas com tarefas vinculadas não podem ser removidas.</p>} onCancel={()=>setPendingStepDelete(null)} onConfirm={()=>{change(p=>({...p,steps:p.steps.filter(step=>step.id!==pendingStepDelete)}));setPendingStepDelete(null);}}/>
  </div>;
}
