import {useCallback,useEffect,useState,type FormEvent} from "react";
import {Link,useParams} from "react-router-dom";
import {FiArrowLeft,FiCheck,FiClock,FiSend,FiUser} from "react-icons/fi";
import {myPortal,submitPortalRequest,updateMyPortalTask,type PortalOverview,type PortalFormField,type PortalTask} from "../../features/operational/operationalPortalService";
import styles from "./OperationalPortal.module.css";
import {storeActiveOrganizationId} from "../../services/organizationStorage";
import SiteConnectedForms from "../../components/operational/SiteConnectedForms";

function FieldInput({field,value,onChange}:{field:PortalFormField;value:unknown;onChange:(value:unknown)=>void}){
  const common={id:`portal-${field.key}`,required:field.required};
  return <label className={styles.field} htmlFor={common.id}><span>{field.label}</span>
    {field.type==="select"?<select {...common} value={String(value??"")} onChange={e=>onChange(e.target.value)}><option value="">Selecionar</option>{field.options?.map(option=><option key={option}>{option}</option>)}</select>
    :field.type==="long_text"?<textarea {...common} maxLength={4000} value={String(value??"")} onChange={e=>onChange(e.target.value)}/>
    :field.type==="boolean"?<select {...common} value={value===true?"yes":value===false?"no":""} onChange={e=>onChange(e.target.value==="yes")}><option value="">Selecionar</option><option value="yes">Sim</option><option value="no">Não</option></select>
    :<input {...common} type={field.type==="number"?"number":field.type==="email"?"email":field.type==="date"?"date":"text"} maxLength={field.type==="text"?300:undefined} value={String(value??"")} onChange={e=>onChange(field.type==="number"?(e.target.value===""?null:Number(e.target.value)):e.target.value)}/>}
  </label>;
}

export default function OperationalPortal(){
  const {slug=""}=useParams<{slug:string}>();
  const [overview,setOverview]=useState<PortalOverview|null>(null);
  const [values,setValues]=useState<Record<string,unknown>>({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [consent,setConsent]=useState(false);
  const reload=useCallback(async()=>{const loaded=await myPortal(slug);setOverview(loaded);},[slug]);
  useEffect(()=>{let mounted=true;void myPortal(slug).then(data=>{if(mounted)setOverview(data);}).catch(e=>{if(mounted)setError(e instanceof Error?e.message:"Acesso indisponível.");}).finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false;};},[slug]);
  async function send(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;setBusy(true);setError("");setNotice("");try{await submitPortalRequest(slug,values);setValues({});setConsent(false);await reload();setNotice("Solicitação enviada para análise.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar.");}finally{setBusy(false);}}
  async function change(task:PortalTask,status:"progress"|"done"){if(busy)return;setBusy(true);setError("");setNotice("");try{await updateMyPortalTask(slug,task,status);await reload();setNotice("Tarefa atualizada.");}catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar.");}finally{setBusy(false);}}
  if(loading)return <main className={styles.state}>Verificando seu acesso…</main>;
  if(!overview)return <main className={styles.state}><div><h1>Área restrita</h1><p>{error||"Peça à organização para liberar sua conta CONG."}</p><Link to="/app/comunidade">Voltar à CONG</Link></div></main>;
  return <div className={styles.shell}>
    <header className={styles.header}><Link to="/app/comunidade" className={styles.back}><FiArrowLeft/> CONG</Link><span className={styles.org}>{overview.systemName}</span><span className={styles.account}><FiUser/> {overview.userName}</span></header>
    <main className={styles.content}>
      <p className={styles.eyebrow}>{overview.role==="volunteer"?"ÁREA DO VOLUNTÁRIO":"ÁREA DO BENEFICIÁRIO"}</p>
      <h1>{overview.role==="volunteer"?"Meu trabalho":"Minhas solicitações"}</h1>
      {overview.workspace&&<p><Link to={`/app/sistemas/${overview.workspace.systemId}`} onClick={()=>storeActiveOrganizationId(overview.workspace!.organizationId)}>Abrir sistema da organização →</Link></p>}
      <p className={styles.lead}>{overview.role==="volunteer"?"Acompanhe somente as atividades atribuídas a você.":"Envie pedidos e acompanhe a situação de cada solicitação."}</p>
      {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.notice} role="status">{notice}</p>}
      {overview.role==="volunteer"?<div className={styles.cards}>{overview.tasks.length===0?<div className={styles.empty}>Nenhuma tarefa atribuída no momento.</div>:overview.tasks.map(task=><article className={styles.card} key={task.id}><div><span className={styles.muted}>{task.dueOn?new Date(`${task.dueOn}T12:00:00`).toLocaleDateString("pt-BR"):"Sem prazo"}</span><h2>{task.title}</h2>{task.notes&&<p>{task.notes}</p>}</div><div className={styles.actions}><span>{task.status==="done"?"Concluída":task.status==="progress"?"Em andamento":"A fazer"}</span>{task.status!=="done"&&<button disabled={busy} onClick={()=>void change(task,task.status==="progress"?"done":"progress")}>{task.status==="progress"?<><FiCheck/> Concluir</>:<><FiClock/> Iniciar</>}</button>}</div></article>)}</div>
      :<><section className={styles.requests}><h2>Histórico</h2>{overview.requests.length===0?<p>Nenhuma solicitação registrada.</p>:<ul>{overview.requests.map(request=><li key={request.id}><span>{new Date(request.createdAt).toLocaleDateString("pt-BR")}</span><strong>{request.status==="pending"?"Em análise":request.status==="approved"?"Aprovada":"Não aprovada"}</strong></li>)}</ul>}</section>
      <SiteConnectedForms slug={slug} page=""/>
      {overview.formFields.length>0&&<section className={styles.formSection}><h2>Nova solicitação</h2><form onSubmit={e=>void send(e)}>{overview.formFields.map(field=><FieldInput key={field.key} field={field} value={values[field.key]} onChange={value=>setValues(old=>({...old,[field.key]:value}))}/>)}<label className={styles.consent}><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> Autorizo o envio destes dados à organização para avaliação desta solicitação.</label><button className={styles.submit} type="submit" disabled={busy||!consent}><FiSend/> {busy?"Enviando…":"Enviar para análise"}</button></form></section>}</>}
    </main>
  </div>;
}
