import CongLoadingState from "../../feedback/CongLoadingState";
import {useEffect,useMemo,useState} from "react";
import {FiFileText,FiRefreshCw,FiLock,FiArrowUpRight,FiCheckCircle,FiSearch} from "react-icons/fi";
import {useSiteBuilderResources} from "./useSiteBuilderResources";
import {activateSiteForm,activateSitePortal,type SiteBuilderFormResource} from "../../../features/operational/operationalFormsService";
import styles from "./CongResourceGallery.module.css";

function formInsertValue(form:SiteBuilderFormResource){
  return JSON.stringify({kind:"cong_form",formId:form.id,title:form.title});
}

type GalleryProps={siteId:string;disabled:boolean;canInsert:boolean;onInsert:(initialValue:string)=>void;onInsertLogin:()=>void;onHeaderAccess?:(position:"menu"|"primary")=>void;onConnectSystem?:()=>void;siteConnectionRevision?:number};
export default function CongResourceGallery(props:GalleryProps){return <GalleryContent key={props.siteId} {...props}/>;}
function GalleryContent({siteId,disabled,canInsert,onInsert,onInsertLogin,onHeaderAccess,onConnectSystem,siteConnectionRevision}:GalleryProps){
  const {forms,access,loading,error,refresh}=useSiteBuilderResources(siteId);
  useEffect(()=>{if(siteConnectionRevision)refresh();},[siteConnectionRevision,refresh]);
  const [pendingForm,setPendingForm]=useState<SiteBuilderFormResource|null>(null);
  const [confirmPortal,setConfirmPortal]=useState(false);
  const [systemId,setSystemId]=useState("");
  const [actionBusy,setActionBusy]=useState(false);
  const [actionError,setActionError]=useState("");
  const [actionNotice,setActionNotice]=useState("");
  const effectiveSystemId=systemId||(access?.systems.length===1?access.systems[0].id:"");
  async function enableForm(){
    if(!pendingForm||actionBusy)return;
    setActionBusy(true);setActionError("");setActionNotice("");
    try{await activateSiteForm(siteId,pendingForm.id);setActionNotice(`O formulário “${pendingForm.title}” está habilitado neste site. Publique a versão atualizada da página para mostrar o bloco.`);setPendingForm(null);refresh();}
    catch(caught){setActionError(caught instanceof Error?caught.message:"Não foi possível habilitar este formulário.");}
    finally{setActionBusy(false);}
  }
  async function enablePortal(){
    if(!effectiveSystemId||actionBusy)return;
    setActionBusy(true);setActionError("");setActionNotice("");
    try{await activateSitePortal(siteId,effectiveSystemId);setActionNotice("O acesso CONG está habilitado. Autorize os participantes no sistema operacional e publique o site para disponibilizar o botão.");setConfirmPortal(false);refresh();}
    catch(caught){setActionError(caught instanceof Error?caught.message:"Não foi possível habilitar o portal.");}
    finally{setActionBusy(false);}
  }
  const [search,setSearch]=useState("");
  const [confirmReplace,setConfirmReplace]=useState(false);
  const normalized=search.trim().toLocaleLowerCase("pt-BR");
  const matches=useMemo(()=>forms.filter(form=>`${form.title} ${form.description} ${form.systemName}`.toLocaleLowerCase("pt-BR").includes(normalized)),[forms,normalized]);
  const ready=forms.filter(form=>form.status==="ready").length;
  return <div className={styles.catalog}>
    <div className={styles.heading}><div><strong>Recursos da sua ONG</strong><small>{loading?<CongLoadingState variant="inline" label="Preparando recursos"/>:`${forms.length} formulário(s) encontrado(s) · ${ready} disponível(is) para este site`}</small></div><button type="button" onClick={refresh} disabled={loading} aria-label="Atualizar recursos" title="Atualizar recursos"><FiRefreshCw/></button></div>
    <p className={styles.intro}>Escolha um recurso criado pela ONG, coloque na página e habilite seu uso público aqui mesmo.</p>
    {actionNotice&&<p className={styles.successMessage} role="status">{actionNotice}</p>}
    {actionError&&<p className={styles.error} role="alert">{actionError}</p>}
    {access&&!access.published&&<p className={styles.setupNotice}>Este site ainda não é o site principal publicado. Os recursos podem ser posicionados, mas precisam da publicação para funcionar.</p>}
    <div className={styles.groupLabel}>Acesso ao portal</div>
    <div className={styles.access}>
      <div className={styles.accessHead}><FiLock/><div><strong>Entrar na CONG</strong><small>Para voluntários e beneficiários autorizados</small></div></div>
      <div className={styles.actions}><button type="button" onClick={()=>setConfirmReplace(true)} disabled={disabled||!onHeaderAccess}>Botão no cabeçalho</button><button type="button" onClick={()=>onHeaderAccess?.("menu")} disabled={disabled||!onHeaderAccess}>Item no menu</button></div>
      {confirmReplace&&<div className={styles.confirmReplace}><strong>Substituir a ação principal?</strong><small>O botão atual será guardado para você poder restaurá-lo depois.</small><div><button type="button" onClick={()=>setConfirmReplace(false)}>Cancelar</button><button type="button" onClick={()=>{onHeaderAccess?.("primary");setConfirmReplace(false);}}>Confirmar</button></div></div>}
      <button type="button" className={styles.insert} onClick={onInsertLogin} disabled={disabled||!canInsert}>Inserir bloco de acesso na página <FiArrowUpRight/></button>
      {access?.portal?.enabled?<p className={styles.statusEnabled}><FiCheckCircle/> Acesso público configurado. Somente contas autorizadas podem entrar.</p>
       :<div className={styles.portalSetup}><strong>Ativar o acesso no site</strong>
         {access?.systems.length?<><label className={styles.systemSelector}>Sistema vinculado<select value={effectiveSystemId} onChange={event=>setSystemId(event.target.value)}><option value="">Selecione</option>{access.systems.map(system=><option key={system.id} value={system.id}>{system.name}</option>)}</select></label>
         {!confirmPortal?<button type="button" className={styles.insert} disabled={!access.published||!effectiveSystemId||disabled} onClick={()=>setConfirmPortal(true)}>Configurar acesso CONG</button>
         :<div className={styles.confirmReplace}><small>Apenas pessoas autorizadas no sistema poderão entrar. Nenhuma conta ganha acesso automaticamente.</small><div><button type="button" disabled={actionBusy} onClick={()=>setConfirmPortal(false)}>Cancelar</button><button type="button" disabled={actionBusy} onClick={()=>void enablePortal()}>{actionBusy?"Ativando…":"Ativar acesso"}</button></div></div>}</>
         :<small>Use “Conectar site” na barra de páginas para escolher o sistema.</small>}
       </div>}
      <small className={styles.note}>Após a ativação, autorize os participantes no sistema operacional. O login reutiliza a autenticação CONG.</small>
    </div>
    <div className={styles.groupLine}><span>Formulários criados</span><strong>{forms.length}</strong></div>
    <label className={styles.search}><FiSearch aria-hidden="true"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar formulário ou sistema" aria-label="Buscar recursos da ONG"/></label>
    {error&&<p className={styles.error} role="alert">{error} <button type="button" onClick={refresh}>Tentar novamente</button></p>}
    {!loading&&!error&&forms.length===0&&<div className={styles.empty}>Nenhum formulário criado ainda. Crie um no Construtor de Sistemas e volte aqui para adicioná-lo ao site.</div>}
    {!loading&&!error&&forms.length>0&&matches.length===0&&<div className={styles.empty}>Nenhum formulário corresponde à busca.</div>}
    <div className={styles.formList}>{matches.map(form=>{
      const available=form.status==="ready";
      return <article className={styles.formCard} key={form.id} data-ready={available}>
        <div className={styles.cardTitle}><FiFileText aria-hidden="true"/><div><strong title={form.title}>{form.title}</strong><small>{form.systemName} · {form.fields.length} campo(s)</small></div>{available?<FiCheckCircle className={styles.check} aria-label="Disponível"/>:<FiLock className={styles.lock} aria-label="Configuração necessária"/>}</div>
        {form.description&&<p>{form.description}</p>}
        <div className={styles.fields}>{form.fields.slice(0,3).map(field=><span key={field.id}>{field.label}</span>)}{form.fields.length>3&&<span>+{form.fields.length-3}</span>}</div>
        <button type="button" className={styles.insert} onClick={()=>onInsert(formInsertValue(form))} disabled={disabled||!canInsert} draggable={!disabled&&canInsert} onDragStart={event=>{event.dataTransfer.effectAllowed="copy";event.dataTransfer.setData("application/x-cong-element","cong_form");event.dataTransfer.setData("application/x-cong-element-value",formInsertValue(form));}}>{available?"Adicionar à página":"Adicionar como prévia"} <FiArrowUpRight aria-hidden="true"/></button>
        {!available&&<div className={styles.unavailable}>
          {form.status==="disabled"?<>O formulário está apenas em prévia. Para receber respostas, habilite-o neste site.
          <button className={styles.activate} type="button" disabled={actionBusy||disabled||!access?.published} onClick={()=>{setPendingForm(form);setActionError("");}}>Habilitar recebimento</button></>
          :<>Este formulário pertence a um sistema ainda não vinculado a este site. <button className={styles.activate} type="button" onClick={onConnectSystem} disabled={disabled||!onConnectSystem}>Ver conexões</button></>}
          <a href={`/app/sistemas/${encodeURIComponent(form.systemId)}`} target="_blank" rel="noopener noreferrer">Abrir sistema <FiArrowUpRight aria-hidden="true"/></a>
        </div>}
        {pendingForm?.id===form.id&&<div className={styles.confirmPublication}>
          <strong>Disponibilizar “{form.title}” ao público?</strong>
          <small>Visitantes poderão enviar os campos deste formulário. Cada resposta ficará privada e pendente de análise pela ONG. Confira a finalidade da coleta e os dados pessoais solicitados.</small>
          <div><button type="button" disabled={actionBusy} onClick={()=>setPendingForm(null)}>Cancelar</button><button type="button" disabled={actionBusy} onClick={()=>void enableForm()}>{actionBusy?"Habilitando…":"Confirmar publicação"}</button></div>
        </div>}
      </article>;
    })}</div>
    {!canInsert&&<small className={styles.hint}>Selecione uma seção de conteúdo da página (fora do cabeçalho e rodapé) para inserir um recurso.</small>}
  </div>;
}
