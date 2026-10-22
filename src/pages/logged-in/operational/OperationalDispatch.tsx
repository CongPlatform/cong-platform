import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {useEffect,useState,type FormEvent} from "react";
import {FiCheck,FiChevronLeft,FiChevronRight,FiPlus,FiRefreshCw} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import {
  createOperationalTask,editOperationalTask,listOperationalTasks,listOperationalTeam,getOperationalPlan,
  type OperationalSystem,type OperationalTask,type OperationalTeamMember,type OperationalStep,
} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

type QueueFilter="all"|"unassigned"|"assigned"|"done";
const filterOptions:{id:QueueFilter;label:string}[]=[
  {id:"all",label:"Pendentes"},{id:"unassigned",label:"Sem responsável"},
  {id:"assigned",label:"Distribuídas"},{id:"done",label:"Concluídas"},
];
const formatDay=(value:string|null)=>value?new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR"):null;
const errorText=(error:unknown)=>error instanceof Error?error.message:"Não foi possível concluir a operação.";

export default function OperationalDispatch({system}:{system:OperationalSystem}){
  const [tasks,setTasks]=useState<OperationalTask[]>([]);
  const [team,setTeam]=useState<OperationalTeamMember[]>([]);
  const [steps,setSteps]=useState<OperationalStep[]>([]);
  const [total,setTotal]=useState(0);
  const [offset,setOffset]=useState(0);
  const [filter,setFilter]=useState<QueueFilter>("all");
  const [loading,setLoading]=useState(true);
  const [busyId,setBusyId]=useState("");
  const [error,setError]=useState("");
  const [createOpen,setCreateOpen]=useState(false);
  const [finishTask,setFinishTask]=useState<OperationalTask|null>(null);
  const [title,setTitle]=useState("");
  const [assignee,setAssignee]=useState("");
  const [dueOn,setDueOn]=useState("");
  const [stepId,setStepId]=useState("");

  useEffect(()=>{
    let current=true;
    void Promise.all([listOperationalTasks(system.id,offset),listOperationalTeam(system.id),getOperationalPlan(system.id)])
      .then(([result,members,plan])=>{if(!current)return;setTasks(result.tasks);setTotal(result.total);setTeam(members);setSteps(plan.steps);setError("");})
      .catch(e=>{if(current)setError(errorText(e));})
      .finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[system.id,offset]);

  async function refresh(){
    const result=await listOperationalTasks(system.id,offset);
    setTasks(result.tasks);setTotal(result.total);
  }
  async function patch(task:OperationalTask,changes:{assigneeUserId?:string|null;status?:"todo"|"progress"|"blocked"|"done"}){
    if(busyId)return;
    setBusyId(task.id);setError("");
    try{
      const updated=await editOperationalTask(system.id,task,changes);
      setTasks(current=>current.map(item=>item.id===updated.id?updated:item));
      if(changes.status==="done")await refresh();
      return true;
    }catch(e){setError(errorText(e));await refresh().catch(()=>{});return false;}
    finally{setBusyId("");}
  }
  async function finish(){
    if(!finishTask)return;
    const task=finishTask;
    const success=await patch(task,{status:"done"});
    if(success)setFinishTask(null);
  }
  async function create(event:FormEvent){
    event.preventDefault();
    if(busyId||title.trim().length<2)return;
    setBusyId("create");setError("");
    try{
      await createOperationalTask(system.id,{
        title:title.trim(),notes:"",priority:"normal",dueOn:dueOn||null,stepId:stepId||null,
        moduleId:null,recordId:null,assigneeUserId:assignee||null,
      });
      setCreateOpen(false);setTitle("");setDueOn("");setAssignee("");setStepId("");
      setFilter("all");
      if(offset!==0){setLoading(true);setOffset(0);}
      else await refresh();
    }catch(e){setError(errorText(e));}
    finally{setBusyId("");}
  }
  const counts={
    open:tasks.filter(t=>t.status!=="done").length,
    unassigned:tasks.filter(t=>t.status!=="done"&&!t.assigneeUserId).length,
    progress:tasks.filter(t=>t.status==="progress").length,
  };
  const visible=tasks.filter(task=>{
    if(filter==="done")return task.status==="done";
    if(task.status==="done")return false;
    if(filter==="unassigned")return !task.assigneeUserId;
    if(filter==="assigned")return Boolean(task.assigneeUserId);
    return true;
  });
  return <section className={styles.dispatchWorkspace} aria-label="Central de despacho">
    <header className={styles.dispatchHeader}>
      <div><h2>Central de despacho</h2><p>Distribua atividades e acompanhe a execução.</p></div>
      <div className={styles.dispatchHeaderActions}>
        <button type="button" className={styles.ghostButton} onClick={()=>void refresh().catch(e=>setError(errorText(e)))} disabled={Boolean(busyId)||loading} aria-label="Atualizar tarefas"><FiRefreshCw/></button>
        <button type="button" className={styles.primaryButton} onClick={()=>setCreateOpen(true)}><FiPlus/> Nova atividade</button>
      </div>
    </header>
    {error&&<div className={styles.error} role="alert">{error}</div>}
    <div className={styles.dispatchSummary}>
      <div className={styles.dispatchMetric}><span>Em aberto</span><strong>{counts.open}</strong></div>
      <div className={styles.dispatchMetric}><span>Sem responsável</span><strong>{counts.unassigned}</strong></div>
      <div className={styles.dispatchMetric}><span>Em execução</span><strong>{counts.progress}</strong></div>
    </div>
    <div role="group" aria-label="Filtrar atividades" className={styles.dispatchFilter}>
      {filterOptions.map(option=><button type="button" key={option.id} aria-pressed={filter===option.id} onClick={()=>setFilter(option.id)}>{option.label}</button>)}
    </div>
    {loading?<div className={styles.dispatchEmpty} role="status"><CongLoadingState variant="list" count={4} label="Preparando atividades"/></div>:
      visible.length===0?<div className={styles.dispatchEmpty}>Nenhuma atividade nesta página para este filtro.</div>:
      <ul className={styles.dispatchQueue}>{visible.map(task=><li key={task.id} className={styles.dispatchItem}>
        <div><div className={styles.dispatchTaskTitle}>{task.title}</div><div className={styles.dispatchTaskMeta}>{task.status==="progress"?"Em execução":task.status==="blocked"?"Precisa de atenção":task.status==="done"?"Concluída":"Aguardando início"}{formatDay(task.dueOn)&&<span>Prazo: {formatDay(task.dueOn)}</span>}{task.stepId&&<span>{steps.find(step=>step.id===task.stepId)?.title??"Etapa do percurso"}</span>}</div></div>
        <label className={styles.dispatchAssign}>Responsável
          <select value={task.assigneeUserId??""} disabled={Boolean(busyId)||task.status==="done"} onChange={e=>void patch(task,{assigneeUserId:e.target.value||null})}>
            <option value="">Atribuir a alguém</option>
            {team.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
        <div className={styles.dispatchActions}>
          {task.status==="todo"||task.status==="blocked"?<button type="button" disabled={Boolean(busyId)||!task.assigneeUserId} title={!task.assigneeUserId?"Escolha um responsável antes de iniciar":undefined} onClick={()=>void patch(task,{status:"progress"})}>Iniciar</button>:null}
          {task.status!=="done"?<button type="button" disabled={Boolean(busyId)} onClick={()=>setFinishTask(task)}><FiCheck/> Concluir</button>:<span>Finalizada</span>}
        </div>
      </li>)}</ul>}
    {total>100&&<div className={styles.pagination}><span>Mostrando até 100 de {total} atividades. Os indicadores acima consideram a página exibida.</span><div className={styles.actions}><button type="button" className={styles.ghostButton} disabled={offset===0} onClick={()=>{setLoading(true);setOffset(Math.max(0,offset-100));}}><FiChevronLeft/> Anterior</button><button type="button" className={styles.ghostButton} disabled={offset+100>=total} onClick={()=>{setLoading(true);setOffset(offset+100);}}>Próxima <FiChevronRight/></button></div></div>}
    <ModalMensagem aberto={createOpen} titulo="Nova atividade" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busyId} onFechar={()=>{if(!busyId)setCreateOpen(false);}} mensagem={<form onSubmit={e=>void create(e)} className={styles.dispatchCreate}>
      <label>O que precisa ser realizado?<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} minLength={2} maxLength={140} required placeholder="Ex.: Entregar cestas do bairro"/></label>
      <label>Responsável<select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Definir depois</option>{team.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label>Prazo<input type="date" value={dueOn} onChange={e=>setDueOn(e.target.value)}/></label>
      {steps.length>0&&<label>Etapa do percurso<select value={stepId} onChange={e=>setStepId(e.target.value)}><option value="">Sem etapa vinculada</option>{steps.map(step=><option key={step.id} value={step.id}>{step.title}</option>)}</select></label>}
      <div className={styles.dispatchCreateActions}><button type="button" className={styles.ghostButton} disabled={Boolean(busyId)} onClick={()=>setCreateOpen(false)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={Boolean(busyId)||title.trim().length<2}>{busyId?"Salvando…":"Adicionar atividade"}</button></div>
    </form>}/>
    <ConfirmActionModal open={Boolean(finishTask)} title="Concluir atividade?" confirmLabel="Confirmar conclusão" busy={Boolean(busyId)} description={<p>O andamento será registrado no sistema e poderá avançar o percurso, caso essa regra esteja habilitada.</p>} onCancel={()=>setFinishTask(null)} onConfirm={()=>void finish()}/>
  </section>;
}
