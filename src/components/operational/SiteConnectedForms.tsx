import {useEffect,useState,type FormEvent} from "react";
import {formatCustomMask,isFormFieldVisible,numericFormKinds,publicConnectedForms,publicPlacedForm,submitConnectedForm,type FormField} from "../../features/operational/operationalFormsService";
import styles from "./SiteConnectedForms.module.css";

interface PublicForm {id:string;title:string;description:string;fields:FormField[]}
function ConnectedForm({form,slug}:{form:PublicForm;slug:string}){
  const [values,setValues]=useState<Record<string,string>>({});
  const [consent,setConsent]=useState(false);
  const [website,setWebsite]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState(false);
  const edit=(field:FormField,value:string)=>setValues(old=>({...old,[field.key]:formatCustomMask(field,value)}));
  async function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||!consent)return;
    setBusy(true);setError("");
    try{
      const data=Object.fromEntries(form.fields.filter(field=>isFormFieldVisible(field,values)).map(field=>[field.key,values[field.key]??""]));
      await submitConnectedForm(slug,form.id,data,website);
      setValues({});setConsent(false);setSuccess(true);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível enviar. Tente novamente.");}
    finally{setBusy(false);}
  }
  function fieldControl(field:FormField){
    const value=values[field.key]??"";
    if(field.kind==="select")return <select value={value} required={field.required} onChange={e=>edit(field,e.target.value)}><option value="">Selecione</option>{field.options?.map(option=><option key={option} value={option}>{option}</option>)}</select>;
    if(field.kind==="textarea")return <textarea placeholder={field.placeholder} minLength={field.minLength} maxLength={field.maxLength??1000} rows={3} required={field.required} value={value} onChange={e=>edit(field,e.target.value)}/>;
    const type=field.kind==="email"?"email":field.kind==="url"?"url":field.kind==="date"?"date":field.kind==="time"?"time":numericFormKinds(field.kind)?"number":["phone","whatsapp"].includes(field.kind)?"tel":"text";
    const maxLength=field.kind==="cep"?9:field.kind==="cpf"?14:field.kind==="cnpj"?18:["phone","whatsapp"].includes(field.kind)?16:field.maxLength??250;
    const step=field.kind==="integer"?1:field.kind==="currency"?0.01:numericFormKinds(field.kind)?"any":undefined;
    return <input id={`form-${form.id}-${field.id}`} required={field.required} type={type} inputMode={["cep","cpf","cnpj"].includes(field.kind)||field.mask==="digits"?"numeric":numericFormKinds(field.kind)?"decimal":undefined} autoComplete={field.kind==="email"?"email":["phone","whatsapp"].includes(field.kind)?"tel":field.kind==="cep"?"postal-code":"off"} placeholder={field.placeholder} minLength={field.kind==="text"?field.minLength:undefined} maxLength={numericFormKinds(field.kind)||["date","time"].includes(field.kind)?undefined:maxLength} min={numericFormKinds(field.kind)?field.kind==="percentage"?field.minValue??0:field.minValue:undefined} max={numericFormKinds(field.kind)?field.kind==="percentage"?field.maxValue??100:field.maxValue:undefined} step={step} value={value} onChange={e=>edit(field,e.target.value)}/>;
  }
  return <section className={styles.formCard} aria-label={form.title}>
    <div className={styles.intro}><h2>{form.title}</h2>{form.description&&<p>{form.description}</p>}</div>
    {success?<div className={styles.success} role="status"><strong>Recebido!</strong><p>Suas informações foram encaminhadas à organização para análise.</p><button type="button" onClick={()=>setSuccess(false)}>Enviar outra resposta</button></div>
    :<form onSubmit={e=>void send(e)}>
      <div className={styles.fields}>{form.fields.filter(field=>isFormFieldVisible(field,values)).map(field=>field.kind==="radio"?<fieldset key={field.id} className={styles.radioField}><legend>{field.label}{field.required&&<b aria-label="obrigatório"> *</b>}</legend>{field.helpText&&<small className={styles.fieldHelp}>{field.helpText}</small>}<div className={styles.radioOptions}>{field.options?.map(option=><label key={option}><input type="radio" name={`${form.id}-${field.id}`} value={option} checked={values[field.key]===option} required={field.required} onChange={e=>edit(field,e.target.value)}/>{option}</label>)}</div></fieldset>
      :<label key={field.id}><span>{field.label}{field.required&&<b aria-label="obrigatório"> *</b>}</span>{fieldControl(field)}{field.helpText&&<small className={styles.fieldHelp}>{field.helpText}</small>}</label>)}</div>
      <label className={styles.honeypot} aria-hidden="true">Não preencher<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
      <label className={styles.consent}><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Autorizo o envio das informações à organização responsável, para a finalidade informada neste formulário.</span></label>
      {error&&<p className={styles.error} role="alert">{error}</p>}
      <button type="submit" disabled={busy||!consent}>{busy?"Enviando…":"Enviar resposta"}</button>
    </form>}
  </section>;
}
export default function SiteConnectedForms({slug,page,formId,excludedFormIds=[]}:{slug:string;page:string;formId?:string;excludedFormIds?:string[]}){
  const key=JSON.stringify([slug,page,formId??""]);
  const [response,setResponse]=useState<{key:string;forms:PublicForm[];unavailable:boolean}|null>(null);
  useEffect(()=>{
    let active=true;
    const request=formId?publicPlacedForm(slug,formId).then(result=>[result.form]):publicConnectedForms(slug,page).then(result=>result.forms);
    void request.then(items=>{if(active)setResponse({key,forms:items,unavailable:false});}).catch(()=>{if(active)setResponse({key,forms:[],unavailable:Boolean(formId)});});
    return()=>{active=false;};
  },[slug,page,formId,key]);
  const current=response?.key===key?response:null;
  const forms=current?.forms??[];
  const loading=!current;
  const unavailable=Boolean(current?.unavailable);
  const visible=forms.filter(form=>!excludedFormIds.includes(form.id));
  if(loading&&formId)return <div className={styles.embedded} aria-label="Preparando formulário" role="status"><div className={styles.loadingPreview} aria-hidden="true"><span/><span/><span/><span/></div></div>;
  if(unavailable&&formId)return <div className={styles.embedded}><div className={styles.unavailable} role="status"><strong>Formulário indisponível</strong><p>Este formulário não está recebendo respostas no momento. Consulte a organização responsável.</p></div></div>;
  if(!visible.length)return null;
  return <div className={formId?styles.embedded:styles.container}>{visible.map(form=><ConnectedForm key={form.id} form={form} slug={slug}/>)}</div>;
}
