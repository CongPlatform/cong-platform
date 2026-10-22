import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {useEffect,useState,type FormEvent} from "react";
import {FiArrowRight,FiCalendar,FiCheck,FiPlus,FiRefreshCw,FiUser} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import {createOperationalTask,editOperationalTask,listOperationalTasks,type OperationalSystem,type OperationalTask,type OperationalTaskStatus} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

const lanes:{id:OperationalTaskStatus;title:string}[]=[
  {id:"todo",title:"A fazer"},
  {id:"progress",title:"Em andamento"},
  {id:"blocked",title:"Em espera"},
  {id:"done",title:"Concluídas"},
];

export default function OperationalBoard({system}:{system:OperationalSystem}){
  const [tasks,setTasks]=useState<OperationalTask[]>([]);
  const [total,setTotal]=useState(0);
  const [offset,setOffset]=useState(0);
  const [busyId,setBusyId]=useState("");
  const [dragId,setDragId]=useState("");
  const [creating,setCreating]=useState(false);
  const [title,setTitle]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    void listOperationalTasks(system.id,offset).then(result=>{if(active){setTasks(result.tasks);setTotal(result.total);setError("");}}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Erro ao carregar o quadro.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[system.id,offset]);
  async function reload(){const result=await listOperationalTasks(system.id,offset);setTasks(result.tasks);setTotal(result.total);}
  async function move(task:OperationalTask,status:OperationalTaskStatus){
    if(task.status===status||busyId)return;
    setBusyId(task.id);setError("");
    try{
      const saved=await editOperationalTask(system.id,task,{status});
      setTasks(current=>current.map(item=>item.id===saved.id?saved:item));
      if(status==="done")await reload();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível mover a tarefa.");}
    finally{setBusyId("");setDragId("");}
  }
  async function add(event:FormEvent){
    event.preventDefault();if(busyId||title.trim().length<2)return;
    setBusyId("new");setError("");
    try{
      await createOperationalTask(system.id,{title:title.trim(),notes:"",priority:"normal",dueOn:null,stepId:null,moduleId:null,recordId:null,assigneeUserId:null});
      setTitle("");setCreating(false);setOffset(0);
      if(offset===0)await reload();
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível criar a tarefa.");}
    finally{setBusyId("");}
  }
  return <section className={styles.operationBoard} aria-label="Quadro de operações">
    <header className={styles.operationBoardHeader}>
      <div><h2>Quadro de operações</h2><p>Mova os cartões conforme o trabalho avança.</p></div>
      <button type="button" className={styles.primaryButton} onClick={()=>setCreating(true)}><FiPlus/> Nova tarefa</button>
    </header>
    {error&&<div className={styles.error} role="alert">{error} <button type="button" className={styles.textButton} onClick={()=>void reload()}><FiRefreshCw/> Atualizar</button></div>}
    {loading?<div className={styles.builderLoading}><CongLoadingState variant="cards" count={3} label="Preparando quadro"/></div>:<>
      <div className={styles.operationBoardLanes}>
        {lanes.map(lane=>{
          const items=tasks.filter(task=>task.status===lane.id);
          return <section key={lane.id} className={`${styles.operationBoardLane} ${dragId?styles.operationBoardDropActive:""}`} data-status={lane.id} aria-label={`${lane.title}, ${items.length} tarefas`} onDragOver={event=>{if(dragId)event.preventDefault();}} onDrop={event=>{event.preventDefault();const task=tasks.find(item=>item.id===event.dataTransfer.getData("text/plain"));if(task)void move(task,lane.id);}}>
            <header><span className={styles.operationBoardDot}/><h3>{lane.title}</h3><span>{items.length}</span></header>
            <div className={styles.operationBoardCards}>
              {items.map(task=><article className={styles.operationBoardCard} key={task.id} draggable={!busyId} onDragStart={event=>{setDragId(task.id);event.dataTransfer.setData("text/plain",task.id);event.dataTransfer.effectAllowed="move";}} onDragEnd={()=>setDragId("")}>
                <strong>{task.title}</strong>
                {(task.dueOn||task.assigneeName)&&<div className={styles.operationBoardMeta}>{task.assigneeName&&<span><FiUser aria-hidden="true"/> {task.assigneeName}</span>}{task.dueOn&&<span><FiCalendar aria-hidden="true"/> {new Date(`${task.dueOn.slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR")}</span>}</div>}
                <label className={styles.operationBoardMove}><span className={styles.visuallyHidden}>Mover tarefa {task.title}</span><select aria-label={`Mover ${task.title} para`} value={task.status} disabled={Boolean(busyId)} onChange={event=>void move(task,event.target.value as OperationalTaskStatus)}>{lanes.map(option=><option key={option.id} value={option.id}>{option.title}</option>)}</select><FiArrowRight aria-hidden="true"/></label>
              </article>)}
              {items.length===0&&<div className={styles.operationBoardEmpty}>Solte um cartão aqui</div>}
            </div>
          </section>;
        })}
      </div>
      {total>100&&<div className={styles.operationBoardPagination}><span>{total} tarefas</span><div className={styles.actions}><button type="button" className={styles.ghostButton} disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-100))}>Anterior</button><button type="button" className={styles.ghostButton} disabled={offset+100>=total} onClick={()=>setOffset(offset+100)}>Próxima</button></div></div>}
    </>}
    <ModalMensagem aberto={creating} titulo="Nova tarefa" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busyId} onFechar={()=>{if(!busyId)setCreating(false);}} mensagem={<form onSubmit={event=>void add(event)} className={styles.agendaQuickForm}><label>O que precisa ser feito?<input autoFocus value={title} onChange={event=>setTitle(event.target.value)} required minLength={2} maxLength={140} placeholder="Ex.: Preparar materiais"/></label><div className={styles.actions}><button type="submit" className={styles.primaryButton} disabled={Boolean(busyId)||title.trim().length<2}><FiCheck/> Adicionar</button><button type="button" className={styles.ghostButton} disabled={Boolean(busyId)} onClick={()=>setCreating(false)}>Cancelar</button></div></form>}/>
  </section>;
}
