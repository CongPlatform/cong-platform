import {useState} from "react";
import {FiArrowDownCircle,FiArrowUpCircle,FiCalendar,FiCheckCircle,FiClock,FiEdit2,FiMail,FiPackage,FiSearch,FiUser,FiUsers} from "react-icons/fi";
import type {OperationalModule,OperationalRecord} from "../../../features/operational/operationalService";
import styles from "./OperationalSpecialistView.module.css";

type Props={module:OperationalModule;records:OperationalRecord[];total:number;canWrite:boolean;busy:boolean;loading:boolean;onCreate:()=>void;onEdit:(record:OperationalRecord)=>void;onArchive:(record:OperationalRecord)=>void;onUpdate:(record:OperationalRecord,patch:Record<string,unknown>)=>Promise<void>;offset:number;onPage:(offset:number)=>void};
const val=(record:OperationalRecord,key:string)=>String(record.data[key]??"").trim();
const num=(record:OperationalRecord,key:string)=>typeof record.data[key]==="number"&&Number.isFinite(record.data[key])?record.data[key] as number:null;
const validDate=(raw:string)=>/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(`${raw}T12:00:00`):null;
const prettyDate=(raw:string)=>{const date=validDate(raw);return date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).format(date):"Sem data";};
const text=(record:OperationalRecord,keys:string[],fallback="Sem título")=>keys.map(key=>val(record,key)).find(Boolean)??fallback;
const fieldPresent=(module:OperationalModule,key:string)=>module.fields.some(field=>field.key===key);
const allowedStatus=(module:OperationalModule,key:string)=>module.fields.find(field=>field.key===key&&field.type==="select")?.options??[];
const stateField=(key:string)=>key==="assets"?"estado":"situacao";
const buckets:Record<string,string[]>={projects:["Planejado","Em andamento","Concluído","Suspenso"],assistance:["Recebido","Em análise","Em atendimento","Concluído"],events:["Planejado","Inscrições abertas","Concluído","Cancelado"],donations:["Pendente","Recebida","Cancelada"],assets:["Disponível","Em uso","Em manutenção","Inativo"]};
const headings:Record<string,{eyebrow:string;description:string;empty:string}>={
 volunteers:{eyebrow:"PESSOAS",description:"Consulte a equipe, encontre contatos e acompanhe quem está em atividade.",empty:"Nenhum voluntário cadastrado nesta área."},
 projects:{eyebrow:"PROJETOS",description:"Acompanhe cada iniciativa por etapa, sem perder os registros.",empty:"Nenhum projeto registrado."},
 donations:{eyebrow:"RECEBIMENTOS",description:"Confira o que foi recebido e o que ainda precisa ser confirmado.",empty:"Nenhuma doação registrada."},
 inventory:{eyebrow:"ESTOQUE",description:"Consulte saldos e registre entradas ou saídas de materiais.",empty:"Nenhum material cadastrado."},
 events:{eyebrow:"PROGRAMAÇÃO",description:"Consulte os próximos eventos por data e atualize a situação.",empty:"Nenhum evento cadastrado."},
 assistance:{eyebrow:"ATENDIMENTOS",description:"Acompanhe o andamento dos atendimentos e atualize a situação.",empty:"Nenhum atendimento registrado."},
 partners:{eyebrow:"PARCERIAS",description:"Encontre parceiros, contatos e acompanhe a colaboração.",empty:"Nenhum parceiro cadastrado."},
 assets:{eyebrow:"PATRIMÔNIO",description:"Acompanhe onde estão os bens e quais precisam de manutenção.",empty:"Nenhum bem cadastrado."},
};
const formatCount=(count:number)=>new Intl.NumberFormat("pt-BR").format(count);

export default function OperationalSpecialistView({module,records,total,canWrite,busy,loading,onCreate,onEdit,onArchive,onUpdate,offset,onPage}:Props){
 const key=module.blueprintKey;
 const copy=headings[key]??{eyebrow:"REGISTROS",description:"Consulte os registros.",empty:"Nenhum registro."};
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("all");
 const [stockRecord,setStockRecord]=useState<OperationalRecord|null>(null);
 const [movement,setMovement]=useState<"in"|"out">("in");
 const [movementQuantity,setMovementQuantity]=useState(1);
 const [workingId,setWorkingId]=useState("");
 const [actionError,setActionError]=useState("");
 const statusKey=stateField(key);
 const statuses=allowedStatus(module,statusKey);
 const hasStatus=fieldPresent(module,statusKey)&&statuses.length>0;
 const current=(()=>{
   const needle=query.trim().toLocaleLowerCase("pt-BR");
   return records.filter(record=>{
     const found=!needle||module.fields.some(field=>String(record.data[field.key]??"").toLocaleLowerCase("pt-BR").includes(needle));
     if(!found)return false;
     if(filter==="all")return true;
     if(key==="volunteers"||key==="partners")return String(record.data.ativo??"")===filter;
     if(key==="inventory")return filter==="repor"?record.data.repor===true:record.data.repor!==true;
     return val(record,statusKey)===filter;
   });
 })();
 const sorted=key==="events"?[...current].sort((a,b)=>(val(a,"data")||"9999-12-31").localeCompare(val(b,"data")||"9999-12-31")):current;
 const overview=(()=>{
   if((key==="volunteers"||key==="partners")&&fieldPresent(module,"ativo"))return [
     {label:"Em atividade",value:records.filter(record=>record.data.ativo===true).length},
     {label:"Sem confirmação",value:records.filter(record=>record.data.ativo!==true).length},
   ];
   if(key==="inventory")return [
     {label:"Itens nesta página",value:records.length},
     ...(fieldPresent(module,"repor")?[{label:"Marcados para reposição",value:records.filter(record=>record.data.repor===true).length}]:[]),
   ];
   if(key==="events")return [
     ...(fieldPresent(module,"data")?[{label:"Eventos com data futura",value:records.filter(record=>{const date=val(record,"data");return date&&date>=`${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`;}).length}]:[]),
     ...(fieldPresent(module,"situacao")?[{label:"Inscrições abertas",value:records.filter(record=>val(record,"situacao")==="Inscrições abertas").length}]:[]),
   ];
   return fieldPresent(module,statusKey)?(buckets[key]??[]).slice(0,4).map(value=>({label:value,value:records.filter(record=>val(record,statusKey)===value).length})):[];
 })();
 const patch=async(record:OperationalRecord,changes:Record<string,unknown>):Promise<boolean>=>{setWorkingId(record.id);setActionError("");try{await onUpdate(record,changes);return true;}catch(e){setActionError(e instanceof Error?e.message:"Não foi possível atualizar o registro.");return false;}finally{setWorkingId("");}};
 const moveStock=async()=>{
   if(!stockRecord||!fieldPresent(module,"saldo")||!Number.isFinite(movementQuantity)||movementQuantity<=0)return;
   const previous=num(stockRecord,"saldo");
   if(previous===null||previous<0)return;
   const next=previous+(movement==="in"?movementQuantity:-movementQuantity);
   if(next<0)return;
   if(await patch(stockRecord,{saldo:next})){setStockRecord(null);setMovementQuantity(1);}
 };
 const renderOptions=(record:OperationalRecord,field:string)=>{
   const currentStatus=val(record,field);
   return canWrite&&allowedStatus(module,field).length>0?<label className={styles.quickSelect}><span className={styles.srOnly}>Situação de {text(record,["titulo","nome","protocolo","bem","item"])}</span><select value={currentStatus} disabled={busy||Boolean(workingId)} onChange={e=>void patch(record,{[field]:e.target.value})}>{!allowedStatus(module,field).includes(currentStatus)&&<option value={currentStatus}>{currentStatus||"Não definida"}</option>}{allowedStatus(module,field).map(option=><option key={option} value={option}>{option}</option>)}</select></label>:<span className={styles.status}>{currentStatus||"Não definida"}</span>;
 };
 const actionButtons=(record:OperationalRecord)=><div className={styles.actions}>{canWrite&&<button type="button" onClick={()=>onEdit(record)} disabled={busy} aria-label={`Editar ${text(record,["nome","titulo","material","bem","protocolo","item"])}`}><FiEdit2/> Editar</button>}{canWrite&&<button type="button" className={styles.archive} onClick={()=>onArchive(record)} disabled={busy}>Arquivar</button>}</div>;
 return <section className={styles.specialist} aria-label={`Área ${module.name}`}>
   <header className={styles.heading}><div><span className={styles.eyebrow}>{copy.eyebrow}</span><h2>{module.name}</h2><p>{copy.description}</p></div>{canWrite&&<button type="button" className={styles.primary} disabled={busy} onClick={onCreate}>+ {key==="inventory"?"Cadastrar material":key==="events"?"Novo evento":key==="assistance"?"Novo atendimento":key==="partners"?"Novo parceiro":key==="projects"?"Novo projeto":key==="assets"?"Cadastrar bem":key==="volunteers"?"Adicionar pessoa":"Nova doação"}</button>}</header>
   {actionError&&!stockRecord&&<p role="alert" className={styles.warning}>{actionError}</p>}
   <div className={styles.metrics}><div className={styles.metric}><small>Total de registros</small><strong>{formatCount(total)}</strong></div>{overview.slice(0,3).map(item=><div className={styles.metric} key={item.label}><small>{item.label}</small><strong>{formatCount(item.value)}</strong></div>)}</div>
   <div className={styles.toolbar}><label className={styles.search}><FiSearch aria-hidden="true"/><span className={styles.srOnly}>Buscar nesta página</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar entre os registros desta página"/></label><label className={styles.filter}><span className={styles.srOnly}>Filtrar registros</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todos nesta página</option>{(key==="volunteers"||key==="partners")?<><option value="true">Em atividade</option><option value="false">Outros</option></>:key==="inventory"&&fieldPresent(module,"repor")?<><option value="repor">Para repor</option><option value="normal">Demais materiais</option></>:hasStatus?statuses.map(option=><option key={option} value={option}>{option}</option>):null}</select></label></div>
   {!loading&&total>50&&<p className={styles.pageNotice}>Os indicadores de situação e a busca consideram somente os até 50 registros desta página. O total considera todos os registros da área.</p>}
   {loading?<div className={styles.loadingList} role="status" aria-live="polite"><span className={styles.srOnly}>Carregando os registros desta área</span>{[1,2,3].map(item=><div key={item} className={styles.loadingRow} aria-hidden="true"><span/><span/><span/></div>)}</div>:records.length===0?<div className={styles.empty}><FiPackage/><h3>{copy.empty}</h3><p>Os dados serão apresentados aqui quando houver registros.</p>{canWrite&&<button type="button" className={styles.primary} onClick={onCreate}>Começar agora</button>}</div>:sorted.length===0?<div className={styles.empty}><FiSearch/><p>Nenhum registro corresponde à busca ou ao filtro.</p><button type="button" onClick={()=>{setQuery("");setFilter("all");}}>Limpar filtros</button></div>:<>
     {(key==="projects"||key==="assistance")?<div className={styles.lanes}>{(buckets[key]??[]).map(stage=>{const group=sorted.filter(record=>val(record,"situacao")===stage);return <section key={stage} className={styles.lane}><div className={styles.laneHeading}><h3>{stage}</h3><span>{group.length}</span></div>{group.length===0?<p className={styles.laneEmpty}>Nenhum registro nesta etapa</p>:group.map(record=><article key={record.id} className={styles.ticket}><strong>{text(record,key==="projects"?["titulo"]:["protocolo","assunto"])}</strong>{key==="projects"?<p>{val(record,"descricao")||"Sem descrição"}</p>:<p>{val(record,"assunto")||"Sem assunto"}</p>}{fieldPresent(module,"situacao")&&renderOptions(record,"situacao")}{actionButtons(record)}</article>)}</section>;})}{sorted.some(record=>!(buckets[key]??[]).includes(val(record,"situacao")))&&<section className={styles.lane}><h3>Outras situações</h3>{sorted.filter(record=>!(buckets[key]??[]).includes(val(record,"situacao"))).map(record=><article className={styles.ticket} key={record.id}><strong>{text(record,["titulo","protocolo","assunto"])}</strong>{hasStatus&&renderOptions(record,"situacao")}{actionButtons(record)}</article>)}</section>}</div>:null}
     {key==="volunteers"&&<div className={styles.people}>{sorted.map(record=><article key={record.id} className={styles.person}><span className={styles.avatar} aria-hidden="true"><FiUser/></span><div className={styles.personInfo}><strong>{text(record,["nome"])}</strong><small>{val(record,"area")||"Área não informada"}</small>{val(record,"email")&&<a href={`mailto:${val(record,"email")}`}><FiMail/> {val(record,"email")}</a>}{val(record,"disponibilidade")&&<small>Disponibilidade: {val(record,"disponibilidade")}</small>}</div><div className={styles.personActions}>{fieldPresent(module,"ativo")&&<span className={record.data.ativo===true?styles.active:styles.status}>{record.data.ativo===true?"Em atividade":"Sem confirmação"}</span>}{canWrite&&fieldPresent(module,"ativo")&&<button type="button" disabled={busy} onClick={()=>void patch(record,{ativo:record.data.ativo!==true})}>{record.data.ativo===true?"Marcar inativo":"Marcar ativo"}</button>}{actionButtons(record)}</div></article>)}</div>}
     {key==="partners"&&<div className={styles.cardGrid}>{sorted.map(record=><article key={record.id} className={styles.infoCard}><span className={styles.avatar}><FiUsers/></span><h3>{text(record,["nome"])}</h3><p>{val(record,"tipo")||"Parceiro"}</p>{val(record,"contato")&&<a href={`mailto:${val(record,"contato")}`}>{val(record,"contato")}</a>}{val(record,"atuacao")&&<p>{val(record,"atuacao")}</p>}{fieldPresent(module,"ativo")&&<p className={record.data.ativo===true?styles.active:styles.status}>{record.data.ativo===true?"Parceria ativa":"Parceria a confirmar"}</p>}{canWrite&&fieldPresent(module,"ativo")&&<button type="button" disabled={busy} onClick={()=>void patch(record,{ativo:record.data.ativo!==true})}>{record.data.ativo===true?"Pausar parceria":"Ativar parceria"}</button>}{actionButtons(record)}</article>)}</div>}
     {key==="inventory"&&<div className={styles.cardGrid}>{sorted.map(record=><article key={record.id} className={styles.infoCard}><span className={styles.avatar}><FiPackage/></span><h3>{text(record,["material"])}</h3><p>{val(record,"categoria")||"Sem categoria"} · {val(record,"local")||"Local não informado"}</p><div className={styles.balance}><strong>{num(record,"saldo")??"—"}</strong><small>{val(record,"unidade")}</small></div>{record.data.repor===true&&<span className={styles.warning}>Reposição indicada</span>}{canWrite&&fieldPresent(module,"saldo")&&<button className={styles.outline} type="button" disabled={busy} onClick={()=>{setStockRecord(record);setMovement("in");setMovementQuantity(1);}}>Registrar entrada ou saída</button>}{actionButtons(record)}</article>)}</div>}
     {key==="events"&&<div className={styles.eventList}>{sorted.map(record=><article key={record.id} className={styles.event}><div className={styles.eventDate}><FiCalendar/><strong>{prettyDate(val(record,"data"))}</strong></div><div><h3>{text(record,["nome"])}</h3><p>{val(record,"local")||"Local não informado"}</p>{fieldPresent(module,"vagas")&&<small>{num(record,"vagas")??"—"} vagas previstas</small>}</div><div className={styles.eventActions}>{hasStatus&&renderOptions(record,"situacao")}{actionButtons(record)}</div></article>)}</div>}
     {key==="donations"&&<div className={styles.eventList}>{sorted.map(record=><article key={record.id} className={styles.event}><div className={styles.eventDate}><FiPackage/></div><div><h3>{text(record,["item"])}</h3><p>{num(record,"quantidade")??"—"} {val(record,"unidade")} · {prettyDate(val(record,"data"))}</p></div><div className={styles.eventActions}>{hasStatus&&renderOptions(record,"situacao")}{actionButtons(record)}</div></article>)}</div>}
     {key==="assets"&&<div className={styles.cardGrid}>{sorted.map(record=><article key={record.id} className={styles.infoCard}><span className={styles.avatar}><FiPackage/></span><h3>{text(record,["bem"])}</h3><small>{val(record,"codigo")||"Sem código"}</small><p>{val(record,"local")||"Local não informado"}</p><p>Responsável: {val(record,"responsavel")||"Não atribuído"}</p>{fieldPresent(module,"estado")&&renderOptions(record,"estado")}{actionButtons(record)}</article>)}</div>}
   </>}
   {!loading&&total>0&&<footer className={styles.pager}><span>Exibindo {Math.min(offset+1,total)}–{Math.min(offset+records.length,total)} de {total}</span><div><button type="button" disabled={offset===0||busy} onClick={()=>onPage(Math.max(0,offset-50))}>Anterior</button><button type="button" disabled={offset+50>=total||busy} onClick={()=>onPage(offset+50)}>Próxima</button></div></footer>}
   {stockRecord&&<div className={styles.backdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setStockRecord(null);}}><section className={styles.movementModal} role="dialog" aria-modal="true" aria-labelledby="stock-movement-title" onKeyDown={e=>{if(e.key==="Escape"&&!busy)setStockRecord(null);}}><h3 id="stock-movement-title">Movimentar estoque</h3><p><strong>{text(stockRecord,["material"])}</strong> · saldo atual: {num(stockRecord,"saldo")??"—"} {val(stockRecord,"unidade")}</p><div className={styles.movementChoices}><button type="button" autoFocus aria-pressed={movement==="in"} onClick={()=>setMovement("in")}><FiArrowDownCircle/> Entrada</button><button type="button" aria-pressed={movement==="out"} onClick={()=>setMovement("out")}><FiArrowUpCircle/> Saída</button></div><label>Quantidade<input type="number" min="0.001" step="any" value={movementQuantity} onChange={e=>setMovementQuantity(Number(e.target.value))}/></label>{movement==="out"&&num(stockRecord,"saldo")!==null&&movementQuantity>(num(stockRecord,"saldo")??0)&&<p className={styles.warning} role="alert">A saída não pode ultrapassar o saldo atual.</p>}{actionError&&<p role="alert" className={styles.warning}>{actionError}</p>}<p className={styles.disclaimer}><FiClock/> Esta operação atualiza o saldo e gera o evento geral de edição. O histórico detalhado de movimentações ainda não está disponível.</p><div className={styles.actions}><button type="button" className={styles.primary} disabled={busy||!Number.isFinite(movementQuantity)||movementQuantity<=0||num(stockRecord,"saldo")===null||(movement==="out"&&movementQuantity>(num(stockRecord,"saldo")??0))} onClick={()=>void moveStock()}><FiCheckCircle/> Confirmar</button><button type="button" disabled={busy} onClick={()=>setStockRecord(null)}>Cancelar</button></div></section></div>}
 </section>;
}
