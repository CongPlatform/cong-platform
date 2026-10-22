import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
import {FiCheck,FiChevronDown,FiExternalLink,FiLock,FiMail,FiSearch,FiTrash2,FiUsers} from "react-icons/fi";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {
  addPortalMember,addPortalTeamBatch,getPortalSettings,listPortalRequests,listPortalTeamCandidates,
  removePortalMember,reviewPortalRequest,savePortalSettings,
  type PortalMember,type PortalRequest,type PortalTeamCandidate,type SitePortal,
} from "../../../features/operational/operationalPortalService";
import {type OperationalSystem} from "../../../features/operational/operationalService";
import styles from "./OperationalPortalSettings.module.css";

type Action=
  |{kind:"remove";id:string;name:string}
  |{kind:"review";id:string;decision:"approved"|"rejected"}
  |{kind:"batch";ids:string[]};
const supportedTypes=new Set(["text","long_text","email","number","date","select","boolean"]);
const requestStatus=(status:PortalRequest["status"])=>status==="pending"?"Em análise":status==="approved"?"Aprovado":"Recusado";

export default function OperationalPortalSettings({system}:{system:OperationalSystem}){
  const [opened,setOpened]=useState(false);
  const [portal,setPortal]=useState<SitePortal|null>(null);
  const [members,setMembers]=useState<PortalMember[]>([]);
  const [candidates,setCandidates]=useState<PortalTeamCandidate[]>([]);
  const [enabled,setEnabled]=useState(false);
  const [moduleId,setModuleId]=useState("");
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<"volunteer"|"beneficiary">("beneficiary");
  const [source,setSource]=useState<"team"|"email">("team");
  const [search,setSearch]=useState("");
  const [shown,setShown]=useState(8);
  const [selected,setSelected]=useState<string[]>([]);
  const [requests,setRequests]=useState<PortalRequest[]>([]);
  const [requestsOpen,setRequestsOpen]=useState(false);
  const [requestsLoading,setRequestsLoading]=useState(false);
  const [requestsError,setRequestsError]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [action,setAction]=useState<Action|null>(null);
  const canConfigure=Boolean(system.brandSiteId);
  const activeSystem=system.status==="active";
  const availableModules=system.modules.filter(item=>item.fields.length>0&&item.fields.every(field=>supportedTypes.has(field.type)));
  const changed=enabled!==Boolean(portal?.enabled)||moduleId!==(portal?.intakeModuleId??"");
  const availableCandidates=useMemo(()=>candidates.filter(person=>!person.currentRole),[candidates]);
  const filtered=useMemo(()=>availableCandidates.filter(person=>`${person.name} ${person.email}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))),[availableCandidates,search]);
  const visible=filtered.slice(0,shown);
  const canEditMembers=Boolean(portal)&&!changed&&!busy;

  const refresh=useCallback(async()=>{
    const result=await getPortalSettings(system.id);
    setPortal(result.portal);
    setMembers(result.members);
    setEnabled(Boolean(result.portal?.enabled));
    setModuleId(result.portal?.intakeModuleId??"");
    if(result.portal){
      const roster=await listPortalTeamCandidates(system.id);
      setCandidates(roster.people);
    }else setCandidates([]);
  },[system.id]);

  useEffect(()=>{
    if(!opened)return;
    let valid=true;
    void Promise.all([getPortalSettings(system.id),listPortalTeamCandidates(system.id)]).then(([result,roster])=>{
      if(!valid)return;
      setPortal(result.portal);setMembers(result.members);setEnabled(Boolean(result.portal?.enabled));
      setModuleId(result.portal?.intakeModuleId??"");setCandidates(roster.people);
    }).catch(caught=>{if(valid)setError(caught instanceof Error?caught.message:"Não foi possível consultar os acessos.");})
      .finally(()=>{if(valid)setLoading(false);});
    return()=>{valid=false;};
  },[opened,system.id]);

  useEffect(()=>{
    if(!opened||!requestsOpen)return;
    let valid=true;
    void listPortalRequests(system.id).then(result=>{if(valid)setRequests(result.requests);})
      .catch(caught=>{if(valid)setRequestsError(caught instanceof Error?caught.message:"Não foi possível consultar os pedidos existentes.");})
      .finally(()=>{if(valid)setRequestsLoading(false);});
    return()=>{valid=false;};
  },[opened,requestsOpen,system.id]);

  async function run(task:()=>Promise<unknown>,success:string){
    if(busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      await task();
      await refresh();
      setNotice(success);
    }catch(caught){setError(caught instanceof Error?caught.message:"Não foi possível concluir a ação.");}
    finally{setBusy(false);}
  }

  async function save(){
    if(!canConfigure||busy||!changed)return;
    if(enabled&&!activeSystem){setError("Ative o sistema no modo Construir antes de disponibilizar o acesso.");return;}
    await run(()=>savePortalSettings(system.id,enabled,moduleId||null),"Configuração de acesso salva.");
  }

  async function grant(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!canEditMembers||!email.trim())return;
    const address=email.trim();
    await run(async()=>{await addPortalMember(system.id,address,role);setEmail("");},"Acesso autorizado para a conta informada.");
  }

  async function executeAction(){
    if(!action||busy)return;
    const current=action;
    setAction(null);
    if(current.kind==="batch"){
      await run(async()=>{
        const result=await addPortalTeamBatch(system.id,current.ids);
        setSelected([]);
        return result;
      },"Integrantes selecionados autorizados. Cada pessoa acessa somente suas próprias tarefas.");
      return;
    }
    await run(async()=>{
      if(current.kind==="remove")await removePortalMember(system.id,current.id);
      else{
        await reviewPortalRequest(system.id,current.id,current.decision);
        const response=await listPortalRequests(system.id);
        setRequests(response.requests);
      }
    },current.kind==="remove"?"Acesso retirado.":current.decision==="approved"?"Registro aprovado.":"Registro recusado.");
  }

  function togglePerson(id:string){setSelected(previous=>previous.includes(id)?previous.filter(value=>value!==id):previous.length>=50?previous:[...previous,id]);}
  const selectedEligible=selected.filter(id=>availableCandidates.some(person=>person.id===id));

  return <>
    <button className={styles.open} type="button" onClick={()=>{setOpened(true);setSource("team");setSearch("");setShown(8);setError("");setNotice("");setSelected([]);setLoading(true);setRequestsOpen(false);setRequests([]);}}><FiUsers/> Acesso de pessoas</button>
    <ModalMensagem aberto={opened} titulo="Quem pode acessar o sistema" tamanho="medio" mostrarBotaoOk={false} fecharAoClicarFora={!busy&&!action} onFechar={()=>{if(!busy&&!action)setOpened(false);}} mensagem={
      <div className={styles.panel}>
        <p className={styles.intro}>Escolha quem entra pelo site da ONG. O login utiliza a conta CONG da pessoa, e as permissões continuam sendo verificadas pelo servidor.</p>
        {loading?<CongLoadingState variant="list" count={3} label="Consultando os acessos"/>:<>
          {!canConfigure&&<div className={styles.warning} role="status">Conecte primeiro este sistema a um site institucional pelo botão <strong>Conexões</strong> no cabeçalho.</div>}
          <section className={styles.section} aria-labelledby="portal-on-title">
            <div className={styles.sectionHead}><span className={styles.iconBadge}><FiLock aria-hidden="true"/></span><div className={styles.headCopy}><h3 id="portal-on-title">Acesso pelo site</h3><p>As pessoas autorizadas entram pela conta CONG, sem criar outra senha.</p></div><span className={`${styles.status} ${portal?.enabled?styles.statusOn:styles.statusOff}`}>{portal?.enabled?"Ativo":"Inativo"}</span></div>
            <div className={styles.inlineControls}><label className={styles.switchRow}><span><strong>Permitir entrada</strong><small>Somente contas autorizadas terão acesso.</small></span><input type="checkbox" checked={enabled} disabled={busy||!canConfigure} onChange={event=>setEnabled(event.target.checked)}/></label><button className={styles.primary} type="button" disabled={busy||!canConfigure||!changed} onClick={()=>void save()}>{busy?"Salvando…":changed?"Salvar acesso":"Salvo"}</button></div>
            {enabled&&!activeSystem&&<p className={styles.warning}>Este sistema precisa estar ativo antes de habilitar a entrada.</p>}
            <p className={styles.muted}>Para exibir o botão “Entrar” no site, adicione o elemento <strong>Acesso CONG</strong> no Site Builder.</p>
            {portal?.enabled&&<a href={`/app/portal/${encodeURIComponent(portal.siteSlug)}`} className={styles.preview} target="_blank" rel="noreferrer">Abrir área autorizada <FiExternalLink aria-hidden="true"/></a>}
          </section>
          <section className={styles.section} aria-labelledby="portal-people-title">
            <div className={styles.sectionHead}><span className={styles.iconBadge}><FiUsers aria-hidden="true"/></span><div className={styles.headCopy}><h3 id="portal-people-title">Pessoas com acesso</h3><p>Selecione integrantes existentes ou autorize uma conta específica.</p></div><span className={styles.count}>{members.length} autorizado(s)</span></div>
            {!portal&&<p className={styles.softNotice}>Salve a configuração de acesso acima para começar a selecionar pessoas. Ela pode permanecer desativada enquanto organiza a lista.</p>}
            {changed&&<p className={styles.softNotice}>Salve as alterações de acesso antes de editar as pessoas autorizadas.</p>}
            <div className={styles.tabs} role="group" aria-label="Como selecionar pessoas">
              <button type="button" className={source==="team"?styles.tabActive:styles.tab} onClick={()=>setSource("team")} aria-pressed={source==="team"}><FiUsers aria-hidden="true"/> Da equipe</button>
              <button type="button" className={source==="email"?styles.tabActive:styles.tab} onClick={()=>setSource("email")} aria-pressed={source==="email"}><FiMail aria-hidden="true"/> Outra conta</button>
            </div>
            {source==="team"?<div className={styles.roster}>
              <p className={styles.muted}>Lista de integrantes ativos da ONG com conta e e-mail confirmados. Não concede acesso automaticamente com base em e-mails digitados em cadastros.</p>
              <label className={styles.search}><FiSearch aria-hidden="true"/><input type="search" value={search} onChange={event=>{setSearch(event.target.value);setShown(8);}} placeholder="Buscar integrante por nome ou e-mail" aria-label="Buscar integrantes" disabled={!portal}/></label>
              {availableCandidates.length===0?<p className={styles.empty}>Não há integrantes elegíveis aguardando autorização. Os que já têm acesso aparecem abaixo.</p>:
                filtered.length===0?<p className={styles.empty}>Nenhum integrante corresponde à busca.</p>:
                <><button className={styles.linkButton} type="button" disabled={!canEditMembers} onClick={()=>setSelected(previous=>Array.from(new Set([...previous,...visible.map(person=>person.id)])).slice(0,50))}>Selecionar os {visible.length} exibidos</button><div className={styles.rosterList} role="group" aria-label="Integrantes disponíveis">{visible.map(person=><label key={person.id} className={selected.includes(person.id)?styles.personSelected:styles.person}><input type="checkbox" checked={selected.includes(person.id)} onChange={()=>togglePerson(person.id)} disabled={!canEditMembers}/><span className={styles.avatar} aria-hidden="true">{person.name.slice(0,1).toLocaleUpperCase("pt-BR")}</span><span className={styles.personText}><strong>{person.name}</strong><small>{person.email}</small></span></label>)}</div></>}
              {filtered.length>shown&&<button className={styles.linkButton} type="button" onClick={()=>setShown(value=>value+8)}>Mostrar mais {Math.min(8,filtered.length-shown)} <FiChevronDown aria-hidden="true"/></button>}
              {selectedEligible.length>=50&&<p className={styles.muted}>Você pode autorizar até 50 integrantes por vez.</p>}
              {selectedEligible.length>0&&<div className={styles.bulkBar}><span>{selectedEligible.length} selecionado(s)</span><button type="button" className={styles.primary} disabled={!canEditMembers} onClick={()=>setAction({kind:"batch",ids:selectedEligible})}>Autorizar selecionados</button><button type="button" className={styles.clearButton} onClick={()=>setSelected([])}>Limpar</button></div>}
            </div>:<form className={styles.memberForm} onSubmit={event=>void grant(event)}>
              <p className={styles.muted}>Para uma pessoa que não está na equipe, informe o e-mail de uma conta CONG verificada. A pessoa só terá as ações previstas para o perfil escolhido.</p>
              <label className={styles.field}>E-mail da conta CONG<input type="email" required maxLength={254} value={email} placeholder="pessoa@exemplo.com" onChange={event=>setEmail(event.target.value)} disabled={!canEditMembers}/></label>
              <fieldset className={styles.roles} disabled={!canEditMembers}><legend>Tipo de acesso</legend>
                <label className={role==="beneficiary"?styles.roleSelected:styles.role}><input type="radio" name="portal-role" checked={role==="beneficiary"} onChange={()=>setRole("beneficiary")}/><span><strong>Pessoa atendida</strong><small>Visualiza apenas recursos habilitados para seu perfil.</small></span></label>
                <label className={role==="volunteer"?styles.roleSelected:styles.role}><input type="radio" name="portal-role" checked={role==="volunteer"} onChange={()=>setRole("volunteer")}/><span><strong>Integrante</strong><small>Realiza tarefas próprias; precisa fazer parte da equipe da ONG.</small></span></label>
              </fieldset>
              <button className={styles.primary} type="submit" disabled={!canEditMembers||!email.trim()}>Autorizar conta</button>
            </form>}
            {members.length>0&&<details className={styles.authorized}>
              <summary><span>Ver e gerenciar {members.length} pessoa(s) autorizada(s)</span><FiChevronDown aria-hidden="true"/></summary>
              <ul className={styles.list}>{members.map(member=><li key={member.id}><div><strong>{member.name}</strong><small>{member.role==="volunteer"?"Integrante · tarefas próprias":"Pessoa atendida"}</small></div><button type="button" disabled={!canEditMembers} aria-label={`Retirar acesso de ${member.name}`} onClick={()=>setAction({kind:"remove",id:member.id,name:member.name})}><FiTrash2 aria-hidden="true"/></button></li>)}</ul>
            </details>}
          </section>
          <section className={styles.separate} aria-label="Coleta de informações no site">
            <strong>Quer receber inscrições, cadastros ou outros dados no site?</strong>
            <p>Isso é configurado em <strong>Formulários Conectados</strong> e nas peças do Site Builder. Cada ONG decide o que coletar e para onde enviar; o acesso de pessoas não obriga ninguém a usar pedidos de atendimento.</p>
          </section>
          <details className={styles.legacy}>
            <summary><span>Pedidos do portal antigo {moduleId?"· configurado":"· opcional"}</span><FiChevronDown aria-hidden="true"/></summary>
            <p>Esta é uma função específica para registrar pedidos na área de pessoas atendidas, diferente dos formulários do site. Use somente se sua ONG precisar desse fluxo.</p>
            <label className={styles.field}>Destino dos pedidos aprovados
              <select value={moduleId} onChange={event=>setModuleId(event.target.value)} disabled={!canConfigure||busy}>
                <option value="">Não receber pedidos pelo portal</option>
                {availableModules.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            {moduleId&&!availableModules.some(item=>item.id===moduleId)&&<p className={styles.warning}>O destino anterior não é compatível com esse fluxo. Escolha outro destino ou desative os pedidos.</p>}
            {changed&&<button className={styles.primary} type="button" disabled={busy||!canConfigure||Boolean(moduleId&&!availableModules.some(item=>item.id===moduleId))} onClick={()=>void save()}>Salvar configuração dos pedidos</button>}
            <button type="button" className={styles.linkButton} onClick={()=>{if(!requestsOpen){setRequestsLoading(true);setRequestsError("");}setRequestsOpen(value=>!value);}} aria-expanded={requestsOpen}> {requestsOpen?"Ocultar pedidos existentes":"Ver pedidos existentes"} <FiChevronDown aria-hidden="true"/></button>
            {requestsOpen&&<div className={styles.requestArea}>{requestsLoading?<CongLoadingState variant="list" count={2} label="Consultando pedidos"/>:requestsError?<p className={styles.warning} role="alert">{requestsError}</p>:requests.length===0?<p className={styles.empty}>Nenhum pedido recebido.</p>:<ul className={styles.list}>{requests.map(request=><li key={request.id} className={styles.requestItem}><div><strong>{request.requestedBy??"Pessoa atendida"}</strong><small>{request.moduleName??"Registro"} · {requestStatus(request.status)}</small><details className={styles.requestData}><summary>Ver dados</summary><dl>{Object.entries(request.data??{}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{typeof value==="boolean"?(value?"Sim":"Não"):String(value??"—")}</dd></div>)}</dl></details></div>{request.status==="pending"&&<div className={styles.review}><button type="button" disabled={busy||changed} onClick={()=>setAction({kind:"review",id:request.id,decision:"approved"})}><FiCheck aria-hidden="true"/> Aprovar</button><button type="button" disabled={busy||changed} onClick={()=>setAction({kind:"review",id:request.id,decision:"rejected"})}>Recusar</button></div>}</li>)}</ul>}</div>}
          </details>
        </>}
        {error&&<p className={styles.warning} role="alert">{error}</p>}
        {notice&&<p className={styles.success} role="status">{notice}</p>}
      </div>
    }/>
    <ConfirmActionModal open={Boolean(action)} title={action?.kind==="batch"?`Autorizar ${action.ids.length} integrante(s)?`:action?.kind==="remove"?"Retirar acesso?":"Analisar pedido?"} description={action?.kind==="batch"?"As pessoas selecionadas poderão entrar como integrantes e visualizar apenas suas próprias tarefas. Nenhum outro cadastro ou dado da ONG será publicado.":action?.kind==="remove"?`Retirar o acesso de ${action.name}?`:action?.decision==="approved"?"Confirmar aprovação e registro do pedido?":"Recusar este pedido?"} confirmLabel={action?.kind==="batch"?"Autorizar selecionados":action?.kind==="remove"?"Retirar acesso":action?.decision==="approved"?"Aprovar":"Recusar"} tone={action?.kind==="remove"||action?.kind==="review"&&action.decision==="rejected"?"danger":"primary"} onConfirm={()=>{void executeAction();}} onCancel={()=>setAction(null)}/>
  </>;
}
