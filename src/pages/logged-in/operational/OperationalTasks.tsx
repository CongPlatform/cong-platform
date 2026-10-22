import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {useEffect,useState,type FormEvent} from "react";
import {FiCalendar,FiCheck,FiClipboard,FiPlus,FiTrash2,FiUser,FiX} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import {archiveOperationalTask,createOperationalTask,editOperationalTask,getOperationalPlan,listOperationalTasks,listOperationalTeam,type OperationalPlan,type OperationalSystem,type OperationalTask,type OperationalTaskInput,type OperationalTaskPriority,type OperationalTaskStatus,type OperationalTeamMember} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

type TaskDraft=OperationalTaskInput&{status:OperationalTaskStatus};
const statusOptions:{id:OperationalTaskStatus;title:string;hint:string}[]=[
  {id:"todo",title:"A fazer",hint:"Aguardando início"},
  {id:"progress",title:"Em andamento",hint:"A equipe está cuidando"},
  {id:"blocked",title:"Precisa de atenção",hint:"Algo impede a conclusão"},
  {id:"done",title:"Concluídas",hint:"Trabalho registrado"},
];
const newTask=():TaskDraft=>({title:"",notes:"",priority:"normal",dueOn:null,stepId:null,moduleId:null,recordId:null,assigneeUserId:null,status:"todo"});
export default function OperationalTasks({system}:{system:OperationalSystem}){
  const [tasks,setTasks]=useState<OperationalTask[]>([]);
  const [team,setTeam]=useState<OperationalTeamMember[]>([]);
  const [plan,setPlan]=useState<OperationalPlan|null>(null);
  const [total,setTotal]=useState(0);
  const [offset,setOffset]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [editing,setEditing]=useState<OperationalTask|null|"new">(null);
  const [draft,setDraft]=useState<TaskDraft>(newTask);
  const [archiving,setArchiving]=useState<OperationalTask|null>(null);
  useEffect(()=>{
    let live=true;
    void Promise.all([listOperationalTasks(system.id,offset),listOperationalTeam(system.id),getOperationalPlan(system.id)]).then(([result,members,journey])=>{if(!live)return;setTasks(result.tasks);setTotal(result.total);setTeam(members);setPlan(journey);}).catch(e=>{if(live)setError(e instanceof Error?e.message:"Não foi possível carregar as tarefas.");}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[system.id,offset]);
  function edit(task:OperationalTask|null){setEditing(task??"new");setDraft(task?{title:task.title,notes:task.notes,priority:task.priority,dueOn:task.dueOn?task.dueOn.slice(0,10):null,stepId:task.stepId,moduleId:task.moduleId,recordId:task.recordId,assigneeUserId:task.assigneeUserId,status:task.status}:newTask());setError("");setNotice("");}
  async function refresh(){const result=await listOperationalTasks(system.id,offset);setTasks(result.tasks);setTotal(result.total);}
  async function save(e:FormEvent){e.preventDefault();if(draft.title.trim().length<2||busy)return;setBusy(true);setError("");
    try{
      if(editing==="new"){await createOperationalTask(system.id,{title:draft.title.trim(),notes:draft.notes,priority:draft.priority,dueOn:draft.dueOn,stepId:draft.stepId,moduleId:draft.moduleId,recordId:draft.recordId,assigneeUserId:draft.assigneeUserId});}
      else if(editing){await editOperationalTask(system.id,editing,{...draft,title:draft.title.trim()});}
      await refresh();setEditing(null);setNotice("Tarefa registrada no sistema.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar a tarefa.");}
    finally{setBusy(false);}
  }
  async function quickStatus(task:OperationalTask,status:OperationalTaskStatus){if(busy||status===task.status)return;setBusy(true);setError("");
    try{const updated=await editOperationalTask(system.id,task,{status});setTasks(items=>items.map(item=>item.id===updated.id?updated:item));setNotice(`“${task.title}” movida para ${statusOptions.find(s=>s.id===status)?.title.toLowerCase()}.`);}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível mover a tarefa.");}
    finally{setBusy(false);}
  }
  async function archive(){if(!archiving||busy)return;setBusy(true);setError("");
    try{await archiveOperationalTask(system.id,archiving);setArchiving(null);await refresh();setNotice("Tarefa arquivada.");}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível arquivar a tarefa.");}
    finally{setBusy(false);}
  }
  return <div className={styles.taskWorkspace}>
    <div className={styles.builderHeading}><div><span className={styles.eyebrow}>OPERAR O SISTEMA</span><h2>Trabalho da equipe</h2><p>Transforme seu percurso em tarefas, escolha responsáveis e acompanhe o que realmente está acontecendo.</p></div><button className={styles.primaryButton} type="button" onClick={()=>edit(null)}><FiPlus/> Nova tarefa</button></div>
    {error&&<div className={styles.error} role="alert">{error}</div>}{notice&&<div className={styles.notice} role="status"><FiCheck/>{notice}</div>}
    {loading?<div className={styles.builderLoading}><CongLoadingState variant="list" count={4} label="Preparando tarefas"/></div>:<>
      <div className={styles.taskBoard}>{statusOptions.map(column=><section className={styles.taskColumn} key={column.id} aria-label={column.title}><header><span className={styles.taskColumnDot} data-status={column.id}/><strong>{column.title}</strong><span>{tasks.filter(t=>t.status===column.id).length}</span></header><p>{column.hint}</p><div className={styles.taskCards}>{tasks.filter(t=>t.status===column.id).map(task=><article className={styles.taskCard} key={task.id}><button type="button" className={styles.taskCardTitle} onClick={()=>edit(task)}>{task.title}</button>{task.notes&&<p>{task.notes}</p>}{task.stepId&&<span className={styles.taskTag}><FiClipboard/> {plan?.steps.find(s=>s.id===task.stepId)?.title??"Etapa vinculada"}</span>}{task.assigneeName&&<span className={styles.taskTag}><FiUser/> {task.assigneeName}</span>}{task.dueOn&&<span className={styles.taskTag}><FiCalendar/> {new Date(`${task.dueOn.slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR")}</span>}<div className={styles.taskCardFooter}><button className={styles.textButton} type="button" onClick={()=>edit(task)}>Abrir</button><select aria-label={`Mudar situação de ${task.title}`} disabled={busy} value={task.status} onChange={event=>void quickStatus(task,event.target.value as OperationalTaskStatus)}>{statusOptions.map(option=><option value={option.id} key={option.id}>{option.title}</option>)}</select></div></article>)}</div>{!tasks.some(t=>t.status===column.id)&&<span className={styles.taskEmpty}>Nenhuma tarefa aqui</span>}</section>)}</div>
      {total>100&&<div className={styles.pagination}><span>Exibindo até 100 tarefas por página, {total} no total.</span><div className={styles.actions}><button className={styles.ghostButton} disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-100))}>Anterior</button><button className={styles.ghostButton} disabled={offset+100>=total} onClick={()=>setOffset(offset+100)}>Próxima</button></div></div>}
    </>}
    <ModalMensagem aberto={editing!==null} titulo={editing==="new"?"Nova tarefa":"Detalhes da tarefa"} tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busy} onFechar={()=>{if(!busy)setEditing(null);}} mensagem={<form className={styles.taskForm} onSubmit={e=>void save(e)}><p>Você pode começar pelo nome e adicionar informações conforme o trabalho avançar.</p><label>O que precisa ser feito?<input autoFocus required minLength={2} maxLength={140} value={draft.title} placeholder="Ex.: Separar cestas para entrega" onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label><div className={styles.taskFormGrid}><label>Responsável<select value={draft.assigneeUserId??""} onChange={e=>setDraft(d=>({...d,assigneeUserId:e.target.value||null}))}><option value="">A definir</option>{team.map(member=><option key={member.id} value={member.id}>{member.name}</option>)}</select></label><label>Etapa do percurso<select value={draft.stepId??""} onChange={e=>setDraft(d=>({...d,stepId:e.target.value||null}))}><option value="">Sem etapa vinculada</option>{plan?.steps.map(step=><option key={step.id} value={step.id}>{step.title}</option>)}</select></label><label>Peça relacionada<select value={draft.moduleId??""} onChange={e=>setDraft(d=>({...d,moduleId:e.target.value||null,recordId:null}))}><option value="">Nenhuma</option>{system.modules.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Prazo (opcional)<input type="date" value={draft.dueOn??""} onChange={e=>setDraft(d=>({...d,dueOn:e.target.value||null}))}/></label><label>Prioridade<select value={draft.priority} onChange={e=>setDraft(d=>({...d,priority:e.target.value as OperationalTaskPriority}))}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option></select></label>{editing!=="new"&&<label>Situação<select value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value as OperationalTaskStatus}))}>{statusOptions.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}</div><label>Orientações<textarea rows={3} maxLength={1600} value={draft.notes} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))}/></label>{error&&<p className={styles.error} role="alert">{error}</p>}<div className={styles.stageEditorActions}><button className={styles.primaryButton} disabled={busy||draft.title.trim().length<2} type="submit">{busy?"Salvando...":"Salvar tarefa"}</button><button type="button" className={styles.ghostButton} onClick={()=>setEditing(null)} disabled={busy}><FiX/> Fechar</button>{editing!=="new"&&editing&&<button type="button" className={styles.textButton} disabled={busy} onClick={()=>{setArchiving(editing);setEditing(null);}}><FiTrash2/> Arquivar</button>}</div></form>}/>
    <ConfirmActionModal open={Boolean(archiving)} title="Arquivar esta tarefa?" description={<p>A tarefa deixará de aparecer no painel. Os demais registros do sistema serão preservados.</p>} tone="danger" confirmLabel="Arquivar tarefa" busy={busy} onCancel={()=>{if(!busy)setArchiving(null);}} onConfirm={()=>void archive()}/>
  </div>;
}
