import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {useEffect,useState,type FormEvent} from "react";
import {FiCalendar,FiCheck,FiChevronLeft,FiChevronRight,FiMapPin,FiRefreshCw} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import {listMyDeliveryWeek,saveMyDeliveryAvailability,type MyDeliveryWeekDay,type OperationalSystem} from "../../../features/operational/operationalService";
import styles from "./Operational.module.css";

const dateIso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const dateAt=(iso:string)=>new Date(`${iso}T12:00:00`);
const moveDays=(iso:string,days:number)=>{const d=dateAt(iso);d.setDate(d.getDate()+days);return dateIso(d);};
const weekStart=()=>dateIso(new Date());
const pointFrom=(text:string)=>{
  const match=text.trim().match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/)??text.trim().match(/(?:q=|ll=|center=)(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/)??text.trim().match(/^(-?\d{1,3}(?:\.\d+)?)[,;\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if(!match)return null;
  const lat=Number(match[1]),lon=Number(match[2]);
  return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat,lon}:null;
};

export default function OperationalAvailability({system}:{system:OperationalSystem}){
  const [start,setStart]=useState(weekStart);
  const [days,setDays]=useState<MyDeliveryWeekDay[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [capacity,setCapacity]=useState(4);
  const [origin,setOrigin]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let alive=true;
    void listMyDeliveryWeek(system.id,start).then(result=>{if(alive){setDays(result);setError("");}}).catch(e=>{if(alive)setError(e instanceof Error?e.message:"Não foi possível carregar a escala.");}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[system.id,start,revision]);
  const point=pointFrom(origin);
  const open=(day:string)=>{
    const entry=days.find(item=>item.day===day);
    const reference=entry??days.find(item=>item.lat!=null&&item.lon!=null);
    setCapacity(entry?.capacity??4);
    setOrigin(reference?`${reference.lat}, ${reference.lon}`:"");
    setSelected(day);
  };
  async function save(event:FormEvent){
    event.preventDefault();
    if(!selected||(capacity>0&&!point)||busy)return;
    setBusy(true);setError("");
    try{
      await saveMyDeliveryAvailability(system.id,{day:selected,capacity,...(point??{lat:0,lon:0})});
      setSelected(null);setNotice("Disponibilidade registrada.");setRevision(value=>value+1);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar a escala.");}
    finally{setBusy(false);}
  }
  return <section className={styles.shiftWorkspace} aria-label="Minha escala de entregas">
    <header className={styles.shiftHeader}><div><h2>Minha escala</h2><p>Escolha os dias em que pode ajudar.</p></div><button type="button" className={styles.deliveryIconButton} title="Atualizar" aria-label="Atualizar escala" onClick={()=>setRevision(value=>value+1)}><FiRefreshCw/></button></header>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {notice&&<p role="status" className={styles.deliveryNotice}>{notice}</p>}
    <div className={styles.shiftWeekNav}><button type="button" onClick={()=>{setLoading(true);setStart(value=>moveDays(value,-7));}} aria-label="Semana anterior"><FiChevronLeft/></button><strong><FiCalendar/> Próximos sete dias a partir de {dateAt(start).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</strong><button type="button" onClick={()=>{setLoading(true);setStart(value=>moveDays(value,7));}} aria-label="Semana seguinte"><FiChevronRight/></button></div>
    {loading?<div className={styles.deliverySecondary}><CongLoadingState variant="list" count={4} label="Preparando escala"/></div>:<div className={styles.shiftWeekGrid}>{Array.from({length:7},(_,index)=>{
      const day=moveDays(start,index),entry=days.find(item=>item.day===day),on=(entry?.capacity??0)>0;
      return <button type="button" key={day} className={styles.shiftDay} data-active={on} onClick={()=>open(day)} aria-label={`${dateAt(day).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}, ${on?`${entry?.capacity} entregas disponíveis`:"indisponível"}`}><span>{dateAt(day).toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","")}</span><strong>{dateAt(day).getDate()}</strong>{on?<small><FiCheck/> {entry?.capacity} paradas</small>:<small>Não marcado</small>}</button>;
    })}</div>}
    <p className={styles.shiftHint}><FiMapPin/> O local de saída só é utilizado para planejar a distribuição da equipe. Confirme sempre sua disponibilidade antes da organização das rotas.</p>
    <ModalMensagem aberto={Boolean(selected)} titulo="Disponibilidade do dia" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busy} onFechar={()=>{if(!busy)setSelected(null);}} mensagem={<form className={styles.deliveryForm} onSubmit={e=>void save(e)}>
      <strong>{selected?dateAt(selected).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}):""}</strong>
      <label>Quantas entregas consegue realizar?<input type="number" required min={0} max={12} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></label>
      {capacity>0&&<label>Ponto de saída<input required value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="Coordenadas ou link do mapa"/></label>}
      <p>Selecione 0 para indicar indisponibilidade.</p>
      <div className={styles.deliveryFormActions}><button type="button" className={styles.ghostButton} onClick={()=>setSelected(null)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={busy||(capacity>0&&!point)||capacity<0||capacity>12}>{busy?"Salvando…":"Confirmar"}</button></div>
    </form>}/>
  </section>;
}
