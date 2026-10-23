import {useEffect,useMemo,useState,type FormEvent} from "react";
import {FiArrowLeft,FiArrowRight,FiCalendar,FiCheck,FiPlus,FiRefreshCw} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import {createOperationalTask,editOperationalTask,listOperationalAgenda,type OperationalSystem,type OperationalTask} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

const names=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const dateKey=(date:Date)=>date.toISOString().slice(0,10);
const monthKey=(date:Date)=>date.toISOString().slice(0,7);
const shifted=(month:string,amount:number)=>new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-1+amount,1));
const labelMonth=(month:string)=>new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"}).format(shifted(month,0));
const taskStatus:Record<OperationalTask["status"],string>={todo:"A fazer",progress:"Em andamento",blocked:"Precisa de atenção",done:"Concluída"};

export default function OperationalAgenda({system}:{system:OperationalSystem}){
  const todayKey=()=>{const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;};
  const [month,setMonth]=useState(()=>todayKey().slice(0,7));
  const [selectedDate,setSelectedDate]=useState(()=>todayKey());
  const [tasks,setTasks]=useState<OperationalTask[]>([]);
  const [selectedTask,setSelectedTask]=useState<OperationalTask|null>(null);
  const [creating,setCreating]=useState(false);
  const [draftTitle,setDraftTitle]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const monthStart=useMemo(()=>shifted(month,0),[month]);
  const days=useMemo(()=>{const first=new Date(monthStart.getTime());first.setUTCDate(first.getUTCDate()-first.getUTCDay());return Array.from({length:42},(_,i)=>new Date(first.getTime()+i*86400000));},[monthStart]);
  const byDate=useMemo(()=>{const map=new Map<string,OperationalTask[]>();for(const task of tasks){if(!task.dueOn)continue;const key=task.dueOn.slice(0,10);map.set(key,[...(map.get(key)??[]),task]);}return map;},[tasks]);
  const selectedTasks=byDate.get(selectedDate)??[];
  const activeCount=tasks.filter(t=>t.status!=="done").length;
  useEffect(()=>{
    if(!notice)return;
    const timeout=window.setTimeout(()=>setNotice(""),4500);
    return()=>window.clearTimeout(timeout);
  },[notice]);
  useEffect(()=>{
    let active=true;
    void listOperationalAgenda(system.id,month).then(result=>{if(active){setTasks(result);setSelectedTask(null);setError("");}}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível abrir a agenda.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[system.id,month]);
  async function refresh(){setTasks(await listOperationalAgenda(system.id,month));}
  async function move(task:OperationalTask,day:string){
    if(busy||task.dueOn?.slice(0,10)===day)return;
    setBusy(true);setError("");setNotice("");
    try{
      const changed=await editOperationalTask(system.id,task,{dueOn:day});
      if(day.startsWith(month)){setTasks(old=>old.map(t=>t.id===changed.id?changed:t));}
      else await refresh();
      setSelectedTask(changed);setNotice(`“${changed.title}” remarcada para ${day.split("-").reverse().join("/")}.`);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível remarcar a tarefa.");}
    finally{setBusy(false);}
  }
  async function create(e:FormEvent){
    e.preventDefault();if(draftTitle.trim().length<2||busy)return;
    setBusy(true);setError("");
    try{
      await createOperationalTask(system.id,{title:draftTitle.trim(),notes:"",priority:"normal",dueOn:selectedDate,stepId:null,moduleId:null,recordId:null,assigneeUserId:null});
      await refresh();setCreating(false);setDraftTitle("");setNotice("Tarefa adicionada à agenda.");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível criar a tarefa.");}
    finally{setBusy(false);}
  }
  const canMove=Boolean(selectedTask&&selectedTask.dueOn?.slice(0,10)!==selectedDate);
  return <div className={styles.agendaWorkspace}>
    <header className={styles.agendaIntro}>
      <div><h2>Agenda</h2><p>Organize datas e compromissos da equipe.</p></div>
      <button type="button" className={styles.primaryButton} onClick={()=>{setDraftTitle("");setCreating(true);}}><FiPlus/> Nova tarefa</button>
    </header>
    {error&&<div className={styles.error} role="alert">{error}</div>}
    {notice&&<div className={styles.notice} role="status"><FiCheck/>{notice}</div>}
    <div className={styles.agendaToolbar}>
      <div className={styles.agendaMonth}>
        <button type="button" className={styles.ghostButton} aria-label="Mês anterior" onClick={()=>{setMonth(monthKey(shifted(month,-1)));setSelectedDate(dateKey(shifted(month,-1)));setSelectedTask(null);setLoading(true);}}><FiArrowLeft/></button>
        <h3>{labelMonth(month)}</h3>
        <button type="button" className={styles.ghostButton} aria-label="Próximo mês" onClick={()=>{setMonth(monthKey(shifted(month,1)));setSelectedDate(dateKey(shifted(month,1)));setSelectedTask(null);setLoading(true);}}><FiArrowRight/></button>
        <button type="button" className={styles.textButton} onClick={()=>{setMonth(todayKey().slice(0,7));setSelectedDate(todayKey());}}>Hoje</button>
      </div>
      <span className={styles.agendaCount}><FiCalendar/> {activeCount} em aberto neste mês</span>
    </div>
    <div className={styles.agendaLayout}>
      <div className={styles.agendaCalendar} aria-label="Calendário de tarefas">
        <div className={styles.agendaWeekdays}>{names.map(name=><span key={name}>{name}</span>)}</div>
        <div className={styles.agendaGrid} aria-busy={loading}>
          {days.map(day=>{
            const key=dateKey(day);const current=key.startsWith(month);const chosen=selectedDate===key;const today=key===todayKey();const dayTasks=byDate.get(key)??[];
            return <div key={key} className={`${styles.agendaDay} ${!current?styles.agendaOutside:""} ${chosen?styles.agendaChosen:""}`} onDragOver={e=>{if(current&&!busy)e.preventDefault();}} onDrop={e=>{if(!current||busy)return;e.preventDefault();const id=e.dataTransfer.getData("text/plain");const task=tasks.find(t=>t.id===id);if(task)void move(task,key);setSelectedDate(key);}}>
              <button type="button" className={`${styles.agendaDate} ${today?styles.agendaToday:""}`} aria-label={`Selecionar ${key.split("-").reverse().join("/")}, ${dayTasks.length} tarefas`} onClick={()=>{setSelectedDate(key);}}>{day.getUTCDate()}</button>
              {current&&<div className={styles.agendaEvents}>{dayTasks.slice(0,3).map(task=><button type="button" draggable={!busy} onDragStart={e=>{e.dataTransfer.setData("text/plain",task.id);e.dataTransfer.effectAllowed="move";}} onClick={()=>{setSelectedDate(key);setSelectedTask(task);}} key={task.id} className={styles.agendaEvent} data-status={task.status} title={`${task.title} — ${taskStatus[task.status]}`} aria-label={`Selecionar tarefa ${task.title}, ${taskStatus[task.status]}`}>{task.title}</button>)}{dayTasks.length>3&&<span className={styles.agendaMore}>+ {dayTasks.length-3} tarefas</span>}</div>}
            </div>;
          })}
        </div>
        {loading&&<p className={styles.agendaLoading} role="status"><FiRefreshCw/> Atualizando calendário...</p>}
      </div>
      <aside className={styles.agendaDetails}>
        
        <h3>{new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"long",timeZone:"UTC"}).format(new Date(`${selectedDate}T12:00:00Z`))}</h3>
        {selectedTasks.length?<div className={styles.agendaDayTasks}>{selectedTasks.map(task=><button key={task.id} type="button" className={`${styles.agendaDetailTask} ${selectedTask?.id===task.id?styles.agendaDetailSelected:""}`} onClick={()=>setSelectedTask(task)}><strong>{task.title}</strong><small>{taskStatus[task.status]}{task.assigneeName?` · ${task.assigneeName}`:""}</small></button>)}</div>:<p className={styles.muted}>Nenhuma tarefa neste dia.</p>}
        {selectedTask?<div className={styles.agendaMove}><strong>Remarcar</strong><p>{selectedTask.title}</p><button type="button" className={styles.primaryButton} disabled={!canMove||busy} onClick={()=>{if(selectedTask)void move(selectedTask,selectedDate);}}>Mover para este dia</button><button type="button" className={styles.textButton} onClick={()=>setSelectedTask(null)}>Cancelar seleção</button></div>:null}
        <button type="button" className={styles.ghostButton} onClick={()=>{setDraftTitle("");setCreating(true);}}><FiPlus/> Adicionar neste dia</button>
      </aside>
    </div>
    <ModalMensagem aberto={creating} titulo="Agendar uma tarefa" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busy} onFechar={()=>{if(!busy)setCreating(false);}} mensagem={<form onSubmit={e=>void create(e)} className={styles.agendaQuickForm}><p>Para {selectedDate.split("-").reverse().join("/")}. Você poderá detalhar e atribuir esta tarefa no quadro da equipe.</p><label>Qual atividade precisa acontecer?<input value={draftTitle} onChange={e=>setDraftTitle(e.target.value)} minLength={2} maxLength={140} required autoFocus placeholder="Ex.: Separar cestas para entrega"/></label><div className={styles.actions}><button className={styles.primaryButton} type="submit" disabled={busy||draftTitle.trim().length<2}>{busy?"Registrando...":"Criar tarefa"}</button><button className={styles.ghostButton} type="button" onClick={()=>setCreating(false)} disabled={busy}>Cancelar</button></div></form>}/>
  </div>;
}
