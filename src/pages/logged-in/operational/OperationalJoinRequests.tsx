import {useEffect,useState} from "react";
import {FiCheck,FiUserCheck,FiX} from "react-icons/fi";
import {pendingJoinRequests,reviewJoinRequest,type JoinRequest} from "../../../features/operational/operationalAccessService";
import css from "./OperationalAccessManager.module.css";

export default function OperationalJoinRequests({onClose}:{onClose:()=>void}){
  const [requests,setRequests]=useState<JoinRequest[]>([]);
  const [busy,setBusy]=useState(false);
  const [confirmDecline,setConfirmDecline]=useState<string|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{let active=true;void pendingJoinRequests().then(items=>{if(active)setRequests(items);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível carregar pedidos.");});return()=>{active=false;};},[]);
  async function decide(id:string,approved:boolean){setBusy(true);setError("");try{await reviewJoinRequest(id,approved);setRequests(prev=>prev.filter(item=>item.id!==id));}catch(e){setError(e instanceof Error?e.message:"Falha ao avaliar solicitação.");}finally{setBusy(false);}}
  return <div className={css.backdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><section className={css.dialog} role="dialog" aria-modal="true" aria-labelledby="joining-title"><header className={css.header}><div><span className={css.kicker}>SUA ORGANIZAÇÃO</span><h2 id="joining-title">Pedidos para participar</h2><p>Analise quem pediu vínculo à ONG durante o onboarding. Aprovar não libera acesso a sistemas automaticamente.</p></div><button className={css.close} aria-label="Fechar" onClick={onClose}><FiX/></button></header><div className={css.body}>{error&&<p className={css.error} role="alert">{error}</p>}{requests.length===0?<p className={css.muted}>Nenhuma solicitação pendente.</p>:requests.map(person=><div className={css.person} key={person.id}><div className={css.personLabel}><strong>{person.name}</strong><small>{person.email}</small></div><div className={css.actions}><button disabled={busy} onClick={()=>void decide(person.id,true)}><FiCheck/> Aprovar</button>{confirmDecline===person.id?<><button className={css.secondary} disabled={busy} onClick={()=>void decide(person.id,false)}>Confirmar recusa</button><button className={css.secondary} onClick={()=>setConfirmDecline(null)}>Cancelar</button></>:<button className={css.secondary} disabled={busy} onClick={()=>setConfirmDecline(person.id)}>Recusar</button>}</div></div>)}</div><footer className={css.footer}><span><FiUserCheck/> Somente a gestão da ONG pode aprovar.</span><button className={css.secondary} onClick={onClose}>Fechar</button></footer></section></div>;
}
