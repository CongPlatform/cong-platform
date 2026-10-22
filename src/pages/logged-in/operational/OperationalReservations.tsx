import {useCallback,useEffect,useState,type FormEvent} from "react";
import {FiCalendar,FiClock,FiPlus,FiRefreshCw,FiX} from "react-icons/fi";
import type {OperationalModule,OperationalSystem} from "../../../features/operational/operationalService";
import {resources,createResource,reservations,book,cancelBooking,type ReservableResource,type ResourceReservation} from "../../../features/operational/operationalCollaborationService";
import CongLoadingState from "../../../components/feedback/CongLoadingState";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import styles from "./OperationalCollaboration.module.css";

interface Props{system:OperationalSystem;module:OperationalModule;canWrite:boolean}
const dateTimeValue=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}T${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
export default function OperationalReservations({system,module,canWrite}:Props){
 const [available,setAvailable]=useState<ReservableResource[]>([]);
 const [scheduled,setScheduled]=useState<ResourceReservation[]>([]);
 const [resourceId,setResourceId]=useState("");
 const [title,setTitle]=useState("");
 const [start,setStart]=useState(()=>dateTimeValue(new Date(Date.now()+3600000)));
 const [end,setEnd]=useState(()=>dateTimeValue(new Date(Date.now()+7200000)));
 const [newName,setNewName]=useState("");
 const [newDescription,setNewDescription]=useState("");
 const [adding,setAdding]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [pendingCancel,setPendingCancel]=useState<ResourceReservation|null>(null);
 const requestBookings=useCallback(async()=>{
  const today=new Date();
  const from=new Date(today.getFullYear(),today.getMonth(),today.getDate()-1);
  const to=new Date(from.getTime()+14*86400000);
  const [list,slots]=await Promise.all([
   resources(system.id,module.id),
   reservations(system.id,module.id,from.toISOString(),to.toISOString()),
  ]);
  return {list,slots};
 },[system.id,module.id]);
 const applyBookings=useCallback(({list,slots}:{list:ReservableResource[];slots:ResourceReservation[]})=>{
  setAvailable(list);
  setResourceId(previous=>list.some(item=>item.id===previous)?previous:list[0]?.id??"");
  setScheduled(slots);
 },[]);
 const load=useCallback(async()=>{
  applyBookings(await requestBookings());
 },[applyBookings,requestBookings]);
 useEffect(()=>{
  let active=true;
  void requestBookings()
   .then(result=>{if(active)applyBookings(result);})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível abrir as reservas.");})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[applyBookings,requestBookings]);
 async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!canWrite||busy||newName.trim().length<2)return;setBusy(true);setError("");try{await createResource(system.id,module.id,newName.trim(),newDescription.trim());setNewName("");setNewDescription("");setAdding(false);await load();}catch(e){setError(e instanceof Error?e.message:"Não foi possível adicionar o recurso.");}finally{setBusy(false);}}
 async function reserve(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!canWrite||busy||!resourceId||!title.trim())return;setBusy(true);setError("");setNotice("");try{const startsAt=new Date(start).toISOString(),endsAt=new Date(end).toISOString();if(Date.parse(endsAt)<=Date.parse(startsAt))throw new Error("O horário final deve ser posterior ao inicial.");await book(system.id,module.id,{resourceId,title:title.trim(),startsAt,endsAt});setTitle("");setNotice("Reserva confirmada. O horário já está bloqueado para os demais integrantes.");await load();}catch(e){setError(e instanceof Error?e.message:"Não foi possível reservar o recurso.");}finally{setBusy(false);}}
 async function cancel(id:string){if(!canWrite||busy)return;setBusy(true);setError("");setNotice("");try{await cancelBooking(system.id,module.id,id);setNotice("Reserva cancelada.");setPendingCancel(null);await load();}catch(e){setError(e instanceof Error?e.message:"Não foi possível cancelar a reserva.");}finally{setBusy(false);}}
 return <section className={styles.shell}>
  <header className={styles.heading}><div><span className={styles.eyebrow}>AGENDA DE RECURSOS</span><h2>{module.name}</h2><p>Compartilhe salas, veículos e equipamentos sem choque de horários.</p></div><button type="button" className={styles.secondary} onClick={()=>void load().catch(e=>setError(e instanceof Error?e.message:"Erro ao atualizar."))}><FiRefreshCw/> Atualizar</button></header>
  {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.success} role="status">{notice}</p>}
  {loading?<CongLoadingState/>:<div className={styles.bookingLayout}>
   <div className={styles.bookingSide}>
    {canWrite&&<><div className={styles.card}><div className={styles.cardHeading}><h3>Nova reserva</h3><FiCalendar/></div>{available.length?<form onSubmit={e=>void reserve(e)} className={styles.formStack}><label>Recurso<select value={resourceId} onChange={e=>setResourceId(e.target.value)} required>{available.filter(item=>item.active).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Finalidade<input value={title} onChange={e=>setTitle(e.target.value)} minLength={2} maxLength={120} placeholder="Ex.: Oficina de capacitação" required/></label><div className={styles.twoCols}><label>Início<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required/></label><label>Término<input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} required/></label></div><button className={styles.primary} type="submit" disabled={busy||!resourceId||title.trim().length<2}><FiClock/> Confirmar reserva</button></form>:<p className={styles.muted}>Cadastre um recurso para começar a reservar.</p>}</div>
    <div className={styles.card}><div className={styles.cardHeading}><h3>Recursos disponíveis</h3><button type="button" className={styles.iconButton} onClick={()=>setAdding(value=>!value)} aria-label="Adicionar recurso"><FiPlus/></button></div>{available.map(item=><div className={styles.resourceRow} key={item.id}><strong>{item.name}</strong>{item.description&&<small>{item.description}</small>}</div>)}{adding&&<form className={styles.formStack} onSubmit={e=>void create(e)}><label>Nome<input required minLength={2} maxLength={100} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Sala de reuniões"/></label><label>Descrição opcional<input maxLength={300} value={newDescription} onChange={e=>setNewDescription(e.target.value)}/></label><button type="submit" className={styles.primary} disabled={busy||newName.trim().length<2}>Adicionar recurso</button></form>}</div>
   </>}
   {!canWrite&&<div className={styles.card}><strong>Recursos compartilhados</strong>{available.map(item=><p key={item.id}>{item.name}</p>)}</div>}
   </div>
   <div className={styles.card}><div className={styles.cardHeading}><h3>Agenda dos próximos 14 dias</h3><FiCalendar/></div><div className={styles.legend}>As reservas confirmadas impedem novas ocupações no mesmo intervalo.</div>{scheduled.length?scheduled.map(item=><article className={styles.booking} key={item.id}><div className={styles.bookingDate}><strong>{new Date(item.startsAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</strong><span>{new Date(item.startsAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span></div><div className={styles.bookingBody}><strong>{item.title}</strong><span>{item.resourceName}</span><small>{new Date(item.startsAt).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})} até {new Date(item.endsAt).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</small><small>Responsável: {item.createdByName}</small></div>{canWrite&&item.canCancel&&<button type="button" className={styles.iconButton} title="Cancelar esta reserva" aria-label={`Cancelar ${item.title}`} disabled={busy} onClick={()=>setPendingCancel(item)}><FiX/></button>}</article>):<div className={styles.empty}>Nenhuma reserva registrada para este período.</div>}</div>
  </div>}
  <ConfirmActionModal open={Boolean(pendingCancel)} title="Cancelar reserva?" description={<p>{pendingCancel?`A reserva “${pendingCancel.title}” será liberada para novos agendamentos.`:""}</p>} confirmLabel="Cancelar reserva" tone="danger" busy={busy} onCancel={()=>{if(!busy)setPendingCancel(null);}} onConfirm={()=>{if(pendingCancel)void cancel(pendingCancel.id);}}/>
 </section>;
}
