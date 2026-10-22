import {useEffect,useState} from "react";
import {loadSiteBuilderResources,type FormField} from "../../../features/operational/operationalFormsService";
import {FiClipboard,FiLock,FiArrowUpRight} from "react-icons/fi";
import SiteConnectedForms from "../../operational/SiteConnectedForms";
import type {InstitutionalLayoutNode,InstitutionalConnectedFormValue,InstitutionalLoginValue} from "../../../services/institutionalService";
import {useCongSite} from "./CongSiteContext";
import styles from "./CongSiteElement.module.css";

export default function CongSiteElement({node}:{node:Extract<InstitutionalLayoutNode,{type:"element"}>}){
  const ctx=useCongSite();
  const formValue=node.elementType==="cong_form"?node.value as InstitutionalConnectedFormValue:null;
  const [formFields,setFormFields]=useState<FormField[]>([]);
  useEffect(()=>{
    if(!ctx?.editable||!ctx.siteId||!formValue?.formId)return;
    let active=true;
    void loadSiteBuilderResources(ctx.siteId).then(result=>{
      if(active)setFormFields(result.forms.find(form=>form.id===formValue.formId)?.fields??[]);
    }).catch(()=>{if(active)setFormFields([]);});
    return()=>{active=false;};
  },[ctx?.editable,ctx?.siteId,formValue?.formId]);
  if(node.elementType==="cong_form"){
    const value=node.value as InstitutionalConnectedFormValue;
    if(!ctx||ctx.editable)return <div className={styles.preview}>
      <span className={styles.eyebrow}><FiClipboard/> Formulário conectado</span>
      <strong>{value.formId?(value.title||"Formulário selecionado"):"Selecione um formulário em Propriedades"}</strong>
      {formFields.length?formFields.slice(0,5).map(field=><label className={styles.mockField} key={field.id}>
        <span>{field.label}{field.required?" *":""}</span><span className={styles.mockInput}>{field.placeholder||""}</span>
      </label>):<><span className={styles.mockInput}/><span className={styles.mockInput}/></>}
      <span className={styles.mockButton}>Enviar resposta</span>
      <small>Prévia de edição · nenhuma resposta será enviada</small>
    </div>;
    if(!ctx.slug||!value.formId)return <div className={styles.unavailable} role="status"><span className={styles.eyebrow}><FiClipboard aria-hidden="true"/> Formulário conectado</span><p>Este formulário ainda não foi configurado para receber respostas.</p></div>;
    return <SiteConnectedForms slug={ctx.slug} page={ctx.page} formId={value.formId}/>;
  }
  const value=node.value as InstitutionalLoginValue;
  if(!ctx||ctx.editable)return <div className={styles.preview}>
    <span className={styles.eyebrow}><FiLock/> Acesso CONG</span>
    <strong>{value.label||"Entrar com minha conta CONG"}</strong>
    {value.caption&&<p>{value.caption}</p>}
    <span className={styles.mockButton}>Entrar <FiArrowUpRight/></span>
    <small>Prévia de edição · autenticação reutilizada no portal</small>
  </div>;
  if(!ctx.portalEnabled||!ctx.portalHref)return <div className={styles.unavailable} role="status"><span className={styles.eyebrow}><FiLock aria-hidden="true"/> Acesso CONG</span><p>O acesso da organização ainda não está disponível. Entre em contato com a equipe responsável.</p></div>;
  return <div className={styles.login}>
    <div><span className={styles.eyebrow}><FiLock/> Área da organização</span>
      {value.caption&&<p>{value.caption}</p>}</div>
    <a href={ctx.portalHref}>{value.label||"Entrar com minha conta CONG"} <FiArrowUpRight aria-hidden="true"/></a>
  </div>;
}
