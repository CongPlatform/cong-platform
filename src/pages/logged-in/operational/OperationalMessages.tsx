import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import {FiHash,FiMessageCircle,FiPlus,FiRefreshCw,FiSend} from "react-icons/fi";
import type {OperationalModule,OperationalSystem} from "../../../features/operational/operationalService";
import {channels,createChannel,messages,sendMessage,type CollabChannel,type CollabMessage} from "../../../features/operational/operationalCollaborationService";
import CongLoadingState from "../../../components/feedback/CongLoadingState";
import styles from "./OperationalCollaboration.module.css";

interface Props{system:OperationalSystem;module:OperationalModule;canWrite:boolean}
export default function OperationalMessages({system,module,canWrite}:Props){
 const [items,setItems]=useState<CollabChannel[]>([]);
 const [selected,setSelected]=useState("");
 const [feed,setFeed]=useState<CollabMessage[]>([]);
 const [entry,setEntry]=useState("");
 const [channelName,setChannelName]=useState("");
 const [adding,setAdding]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const bottom=useRef<HTMLDivElement>(null);
 const refresh=useCallback(async()=>{
  const result=await channels(system.id,module.id);
  setItems(result);
  setSelected(previous=>result.some(item=>item.id===previous)?previous:result[0]?.id??"");
 },[system.id,module.id]);
 const refreshFeed=useCallback(async(id:string)=>{const result=await messages(system.id,module.id,id);setFeed(result);},[system.id,module.id]);
 useEffect(()=>{let active=true;void channels(system.id,module.id).then(result=>{if(!active)return;setItems(result);setSelected(result[0]?.id??"");}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível abrir as conversas.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[system.id,module.id]);
 useEffect(()=>{if(!selected)return;let active=true;void messages(system.id,module.id,selected).then(result=>{if(active)setFeed(result);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível buscar mensagens.");});const timer=window.setInterval(()=>{void messages(system.id,module.id,selected).then(result=>{if(active)setFeed(result);}).catch(()=>undefined);},8000);return()=>{active=false;window.clearInterval(timer);};},[selected,system.id,module.id]);
 useEffect(()=>{bottom.current?.scrollIntoView({block:"nearest"});},[feed.length]);
 async function addChannel(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!canWrite||busy||channelName.trim().length<2)return;setBusy(true);setError("");try{const item=await createChannel(system.id,module.id,channelName.trim());await refresh();setSelected(item.id);setChannelName("");setAdding(false);}catch(e){setError(e instanceof Error?e.message:"Não foi possível criar o canal.");}finally{setBusy(false);}}
 async function send(event:FormEvent<HTMLFormElement>){event.preventDefault();const body=entry.trim();if(!canWrite||busy||!selected||!body)return;setBusy(true);setError("");try{await sendMessage(system.id,module.id,selected,body);setEntry("");await refreshFeed(selected);}catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar a mensagem.");}finally{setBusy(false);}}
 return <section className={styles.shell}>
  <header className={styles.heading}><div><span className={styles.eyebrow}>COMUNICAÇÃO INTERNA</span><h2>{module.name}</h2><p>Converse com quem tem acesso a esta área do sistema.</p></div><button type="button" className={styles.secondary} onClick={()=>void refreshFeed(selected)} disabled={!selected} title="Atualizar mensagens"><FiRefreshCw/> Atualizar</button></header>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  {loading?<CongLoadingState/>:<div className={styles.chatGrid}>
   <aside className={styles.channels}><div className={styles.channelHeading}><strong>Canais</strong>{canWrite&&<button type="button" onClick={()=>setAdding(value=>!value)} title="Criar canal" aria-label="Criar canal"><FiPlus/></button>}</div>
    {adding&&<form onSubmit={e=>void addChannel(e)} className={styles.inlineForm}><input aria-label="Nome do novo canal" placeholder="Ex.: Organização" maxLength={60} value={channelName} onChange={e=>setChannelName(e.target.value)}/><button type="submit" disabled={busy||channelName.trim().length<2}>Criar</button></form>}
    {items.map(item=><button type="button" className={`${styles.channel} ${selected===item.id?styles.channelActive:""}`} key={item.id} onClick={()=>{setFeed([]);setSelected(item.id);}} aria-current={selected===item.id?"true":undefined}><FiHash/> {item.name}</button>)}
    {!items.length&&<p className={styles.muted}>Nenhum canal disponível.</p>}
   </aside>
   <div className={styles.conversation}>
    <div className={styles.conversationTitle}><FiMessageCircle/><strong>{items.find(item=>item.id===selected)?.name??"Escolha um canal"}</strong></div>
    <div className={styles.messages} aria-label="Histórico de mensagens" role="log" aria-live="polite">{!feed.length&&<div className={styles.empty}>Ainda não há mensagens. Inicie a conversa para organizar o trabalho da equipe.</div>}{feed.map(item=><article className={styles.message} key={item.id}><div><strong>{item.authorName}</strong><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}</time></div><p>{item.body}</p></article>)}<div ref={bottom}/></div>
    <form className={styles.composer} onSubmit={e=>void send(e)}><label htmlFor={`message-${module.id}`} className={styles.srOnly}>Mensagem</label><textarea id={`message-${module.id}`} rows={2} maxLength={2000} placeholder={canWrite?"Escreva para a equipe...":"Você tem acesso de leitura."} disabled={!canWrite||!selected||busy} value={entry} onChange={e=>setEntry(e.target.value)}/><button type="submit" className={styles.primary} disabled={!canWrite||!selected||busy||!entry.trim()}><FiSend/> Enviar</button></form>
   </div>
  </div>}
 </section>;
}
