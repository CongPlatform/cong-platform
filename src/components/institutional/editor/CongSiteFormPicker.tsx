import CongLoadingState from "../../feedback/CongLoadingState";
import {useState} from "react";
import {FiCheckCircle,FiFileText,FiRefreshCw,FiSearch} from "react-icons/fi";
import {useSiteBuilderResources} from "./useSiteBuilderResources";
import styles from "./CongResourceGallery.module.css";

export default function CongSiteFormPicker({siteId,value,onChange}:{siteId?:string;value:string;onChange:(form:{id:string;title:string})=>void}){
  const {forms,error,loading,refresh}=useSiteBuilderResources(siteId);
  const [search,setSearch]=useState("");
  const visible=forms.filter(form=>`${form.title} ${form.systemName}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")));
  return <div className={styles.picker}>
    <div className={styles.heading}><div><strong>Formulário exibido</strong><small>Escolha um recurso criado pela organização</small></div><button type="button" disabled={loading} onClick={refresh} title="Atualizar lista" aria-label="Atualizar formulários"><FiRefreshCw/></button></div>
    <label className={styles.search}><FiSearch/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar formulário" aria-label="Buscar formulário"/></label>
    {loading&&<CongLoadingState variant="inline" label="Preparando formulários"/>}
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {!loading&&!error&&!forms.length&&<small>Ainda não há formulários criados para esta organização.</small>}
    <div className={styles.pickerList}>{visible.map(form=><button type="button" key={form.id} className={styles.pickerChoice} data-selected={value===form.id}  onClick={()=>onChange(form)}><FiFileText aria-hidden="true"/><span><strong>{form.title}</strong><small>{form.systemName} · {form.fields.length} campo(s){form.status!=="ready"?" · Prévia, publicação pendente":""}</small></span>{value===form.id?<FiCheckCircle aria-label="Selecionado"/>:null}</button>)}</div>
    {value&&!forms.some(form=>form.id===value)&&!loading&&<small role="status">O formulário vinculado não foi encontrado. Confira se ainda existe e está disponível.</small>}
    <small className={styles.note}>As respostas continuam passando pela revisão configurada no operacional.</small>
  </div>;
}
