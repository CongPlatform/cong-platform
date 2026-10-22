import {useCallback,useEffect,useRef,useState} from "react";
import {FiArrowDown,FiArrowUp,FiCheck,FiClipboard,FiPlus,FiRefreshCw} from "react-icons/fi";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import {
  createConnectedForm,loadConnectedForms,loadFormSubmissions,reviewFormSubmission,saveConnectedForm,numericFormKinds,choiceFormKinds,
  type ConnectedForm,type FormField,type FormKind,type FormSite,type FormSubmission,
} from "../../../features/operational/operationalFormsService";
import type {OperationalSystem} from "../../../features/operational/operationalService";
import styles from "./OperationalForms.module.css";

const kindGroups:{title:string;items:{kind:FormKind;name:string}[]}[]=[
  {title:"Texto e contato",items:[{kind:"text",name:"Texto curto"},{kind:"textarea",name:"Texto longo"},{kind:"email",name:"E-mail"},{kind:"phone",name:"Telefone"},{kind:"whatsapp",name:"WhatsApp"},{kind:"url",name:"Link"}]},
  {title:"Documentos e endereço",items:[{kind:"cep",name:"CEP"},{kind:"cpf",name:"CPF"},{kind:"cnpj",name:"CNPJ"},{kind:"rg",name:"RG"}]},
  {title:"Números e datas",items:[{kind:"number",name:"Número decimal"},{kind:"integer",name:"Número inteiro"},{kind:"currency",name:"Valor em R$"},{kind:"percentage",name:"Porcentagem"},{kind:"date",name:"Data"},{kind:"time",name:"Horário"}]},
  {title:"Escolhas",items:[{kind:"select",name:"Lista de opções"},{kind:"radio",name:"Escolha visível"}]},
];
const kinds=kindGroups.flatMap(group=>group.items);
const fieldNumericValue=(value:string)=>value.trim()===""?undefined:Number(value);
const makeKey=(label:string)=>label.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,38);
export default function OperationalForms({system}:{system:OperationalSystem}){
  const [forms,setForms]=useState<ConnectedForm[]>([]);
  const [site,setSite]=useState<FormSite|null>(null);
  const [chosen,setChosen]=useState("");
  const [draft,setDraft]=useState<ConnectedForm|null>(null);
  const [fieldId,setFieldId]=useState("");
  const [pending,setPending]=useState(false);
  const [saving,setSaving]=useState(false);
  const [modified,setModified]=useState(false);
  const [message,setMessage]=useState("");
  const [queue,setQueue]=useState<FormSubmission[]>([]);
  const [review,setReview]=useState<{id:string;decision:"approved"|"rejected"}|null>(null);
  const draftRef=useRef<ConnectedForm|null>(null);
  const inFlight=useRef(false);
  const stamp=useRef(0);
  const selected= draft?.fields.find(field=>field.id===fieldId);
  const earlierChoiceFields=draft?.fields.slice(0,Math.max(0,draft.fields.findIndex(field=>field.id===fieldId))).filter(field=>choiceFormKinds(field.kind))??[];
  const invalidField=draft?.fields.find(field=>(field.minLength!==undefined&&field.maxLength!==undefined&&field.minLength>field.maxLength)||(field.kind==="text"&&field.maxLength!==undefined&&field.maxLength>250)||(field.minValue!==undefined&&field.maxValue!==undefined&&field.minValue>field.maxValue)||(choiceFormKinds(field.kind)&&(!field.options?.length||new Set(field.options).size!==field.options.length)));
  const invalidFieldMessage=invalidField?`Revise os limites ou as opções do campo “${invalidField.label}” para continuar o salvamento.`:"";
  const refresh=useCallback(async()=>{const result=await loadConnectedForms(system.id);setForms(result.forms);setSite(result.site);return result;},[system.id]);
  useEffect(()=>{let live=true;void loadConnectedForms(system.id).then(result=>{if(live){setForms(result.forms);setSite(result.site);setChosen(result.forms[0]?.id??"");setDraft(result.forms[0]??null);setFieldId(result.forms[0]?.fields[0]?.id??"");draftRef.current=result.forms[0]??null;}}).catch(e=>{if(live)setMessage(e instanceof Error?e.message:"Não foi possível carregar.");});return()=>{live=false;};},[system.id]);
  useEffect(()=>{if(!chosen)return;let live=true;void loadFormSubmissions(system.id,chosen).then(result=>{if(live)setQueue(result.submissions);}).catch(()=>{if(live)setQueue([]);});return()=>{live=false;};},[system.id,chosen]);
  function update(change:(form:ConnectedForm)=>ConnectedForm){
    if(!draftRef.current)return;
    const changed=change(draftRef.current);
    const next={...changed,fields:changed.fields.map((field,index)=>{
      if(!field.showWhen)return field;
      const origin=changed.fields.slice(0,index).find(item=>item.key===field.showWhen?.fieldKey);
      return origin&&choiceFormKinds(origin.kind)&&origin.options?.includes(field.showWhen.equals)?field:{...field,showWhen:undefined};
    })};
    stamp.current++;
    draftRef.current=next;setDraft(next);setModified(true);setMessage("");
  }
  useEffect(()=>{
    if(!modified||!draft||inFlight.current||invalidFieldMessage)return;
    if(draft.title.trim().length<2||draft.fields.length<1||draft.fields.some(field=>field.label.trim().length<2||!field.key||(choiceFormKinds(field.kind)&&!field.options?.length)))return;
    const timer=window.setTimeout(()=>{
      const now=draftRef.current;if(!now||inFlight.current)return;
      inFlight.current=true;setSaving(true);const revision=stamp.current;
      void saveConnectedForm(system.id,now).then(result=>{
        const current=draftRef.current;
        if(current?.id===now.id){draftRef.current={...current,revision:result.saved.revision};setDraft(draftRef.current);if(stamp.current===revision)setModified(false);}
        setForms(old=>old.map(item=>item.id===now.id?{...now,revision:result.saved.revision}:item));
      }).catch(e=>setMessage(e instanceof Error?e.message:"Não foi possível salvar.")).finally(()=>{inFlight.current=false;setSaving(false);});
    },900);
    return()=>window.clearTimeout(timer);
  },[draft,modified,system.id,saving,invalidFieldMessage]);
  function choose(form:ConnectedForm){if(modified||inFlight.current){setMessage("Aguarde o salvamento da edição atual.");return;}setChosen(form.id);setDraft(form);draftRef.current=form;setFieldId(form.fields[0]?.id??"");setMessage("");}
  async function create(){if(pending||modified||inFlight.current)return;setPending(true);try{const result=await createConnectedForm(system.id);const listed=await refresh();const added=listed.forms.find(item=>item.id===result.id);if(added)choose(added);}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível criar.");}finally{setPending(false);}}
  function addField(kind:FormKind){
    const id=crypto.randomUUID(),base=kinds.find(item=>item.kind===kind)?.name??"Campo";
    update(form=>{const used=new Set(form.fields.map(item=>item.key));const root=makeKey(base)||"campo";let key=root;let n=2;while(used.has(key)){key=`${root}_${n++}`;}
      const field:FormField={id,key,label:base,kind,required:false,...(choiceFormKinds(kind)?{options:["Opção 1","Opção 2"]}:{})};
      return {...form,fields:[...form.fields,field]};});setFieldId(id);
  }
  function editField(fn:(field:FormField)=>FormField){if(!selected)return;update(form=>({...form,fields:form.fields.map(field=>field.id===fieldId?fn(field):field)}));}
  function reorder(dir:number){update(form=>{const index=form.fields.findIndex(field=>field.id===fieldId),target=index+dir;if(index<0||target<0||target>=form.fields.length)return form;const fields=[...form.fields];[fields[index],fields[target]]=[fields[target],fields[index]];return {...form,fields};});}
  async function reviewNow(){if(!review||!draft||pending)return;setPending(true);try{await reviewFormSubmission(system.id,draft.id,review.id,review.decision);const result=await loadFormSubmissions(system.id,draft.id);setQueue(result.submissions);setReview(null);}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível analisar.");}finally{setPending(false);}}
  return <div className={styles.root}>
    <header className={styles.header}><div><h2>Formulários</h2><p>Crie uma pergunta, receba respostas e conecte-as ao trabalho.</p></div><button type="button" onClick={()=>void create()} disabled={pending||saving||modified}><FiPlus/> Novo formulário</button></header>
    {message&&<p className={styles.error} role="alert">{message}</p>}
    {invalidFieldMessage&&<p className={styles.error} role="alert">{invalidFieldMessage}</p>}
    <div className={styles.layout}>
      <aside className={styles.list} aria-label="Formulários"><div className={styles.listTitle}>Seus formulários</div>{forms.map(form=><button key={form.id} type="button" aria-pressed={chosen===form.id} onClick={()=>choose(form)}><FiClipboard/><span>{form.title}</span>{form.enabled&&<FiCheck/>}</button>)}{!forms.length&&<p>Nenhum formulário ainda.</p>}</aside>
      {draft&&<main className={styles.canvas}>
        <div className={styles.top}><label className={styles.titleLabel}>Título<input value={draft.title} maxLength={110} onChange={e=>update(form=>({...form,title:e.target.value}))}/></label><span className={styles.save} aria-live="polite">{saving?"Salvando…":modified?"Alterações pendentes":""}</span></div>
        <label className={styles.description}>Descrição opcional<input maxLength={300} value={draft.description} onChange={e=>update(form=>({...form,description:e.target.value}))}/></label>
        <div className={styles.fieldList}>{draft.fields.map((field,index)=><button type="button" className={styles.field} data-selected={fieldId===field.id} onClick={()=>setFieldId(field.id)} key={field.id}><span>{index+1}</span><strong>{field.label}</strong><small>{kinds.find(item=>item.kind===field.kind)?.name}{field.showWhen?" · Condicional":""}</small></button>)}</div>
        <details className={styles.picker}><summary><FiPlus/> Adicionar campo</summary><div className={styles.kindGroups}>{kindGroups.map(group=><div key={group.title}><h4>{group.title}</h4><div className={styles.kinds}>{group.items.map(item=><button type="button" onClick={()=>addField(item.kind)} key={item.kind}>{item.name}</button>)}</div></div>)}</div></details>
        <div className={styles.publish}><div><strong>Onde receber respostas?</strong><small>O formulário pode aparecer no site publicado, sem exigir login.</small></div><label>Página<select value={draft.pageSlug} onChange={e=>update(form=>({...form,pageSlug:e.target.value}))}><option value="">Página inicial</option>{site?.pages.filter(page=>!page.isHome).map(page=><option key={page.slug} value={page.slug}>{page.title}</option>)}</select></label><label className={styles.checkbox}><input type="checkbox" checked={draft.enabled} disabled={!site} onChange={e=>update(form=>({...form,enabled:e.target.checked}))}/>Disponibilizar no site</label>{!site&&<p>Abra “Conexões · ligar site” no cabeçalho do sistema e ligue um site publicado. Você pode montar o formulário agora.</p>}</div>
        <div className={styles.publish}><div><strong>Conectar as respostas</strong><small>Associe cada informação a um campo de outra peça. As respostas serão revisadas antes de virar registros.</small></div><label>Peça de destino<select value={draft.targetModuleId??""} onChange={e=>update(form=>({...form,targetModuleId:e.target.value||null,bindings:{}}))}><option value="">Somente guardar respostas</option>{system.modules.filter(module=>module.fields.length>0&&module.blueprintKey!=="forms").map(module=><option key={module.id} value={module.id}>{module.name}</option>)}</select></label>{draft.targetModuleId&&<div className={styles.bindings}>{draft.fields.map(field=><label key={field.id}>{field.label}<span>→</span><select value={draft.bindings[field.key]??""} onChange={e=>update(form=>{const bindings={...form.bindings};if(e.target.value)bindings[field.key]=e.target.value;else delete bindings[field.key];return {...form,bindings};})}><option value="">Não usar</option>{system.modules.find(module=>module.id===draft.targetModuleId)?.fields.filter(target=>{
      if(target.type==="relation"||target.type==="boolean")return false;
      if(target.type==="number")return numericFormKinds(field.kind);
      if(numericFormKinds(field.kind))return false;
      if(target.type==="select")return choiceFormKinds(field.kind)&&field.options?.every(value=>target.options?.includes(value));
      if(target.type==="date")return field.kind==="date";
      if(target.type==="email")return field.kind==="email";
      return true;
    }).map(target=><option key={target.key} value={target.key}>{target.label}{target.required?" *":""}</option>)}</select></label>)}</div>}</div>
        <section className={styles.responses}><div><h3>Respostas recebidas</h3><button onClick={()=>void loadFormSubmissions(system.id,draft.id).then(r=>setQueue(r.submissions))} type="button" aria-label="Atualizar respostas"><FiRefreshCw/></button></div>{!queue.length&&<p>Nenhuma resposta ainda.</p>}{queue.map(item=><article key={item.id}><div><strong>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</strong><span>{item.status==="pending"?"Em análise":item.status==="approved"?"Aprovada":"Recusada"}</span></div><dl>{Object.entries(item.payload).map(([key,value])=><div key={key}><dt>{draft.fields.find(field=>field.key===key)?.label??key}</dt><dd>{String(value??"—")}</dd></div>)}</dl>{item.status==="pending"&&<div className={styles.review}><button type="button" onClick={()=>setReview({id:item.id,decision:"approved"})}>Aprovar</button><button type="button" onClick={()=>setReview({id:item.id,decision:"rejected"})}>Recusar</button></div>}</article>)}</section>
      </main>}
      {draft&&selected&&<aside className={styles.inspector} aria-label="Propriedades do campo"><h3>Campo selecionado</h3><label>Rótulo<input maxLength={80} value={selected.label} onChange={e=>editField(f=>({...f,label:e.target.value}))}/></label><label>Identificador<output>{selected.key}</output></label><label>Tipo<select value={selected.kind} onChange={e=>editField(f=>({...f,kind:e.target.value as FormKind,options:choiceFormKinds(e.target.value as FormKind)?["Opção 1","Opção 2"]:undefined,mask:undefined,minValue:undefined,maxValue:undefined,minLength:undefined,maxLength:undefined}))}>{kinds.map(item=><option key={item.kind} value={item.kind}>{item.name}</option>)}</select></label>{choiceFormKinds(selected.kind)&&<label>Opções (uma por linha)<textarea rows={5} value={selected.options?.join("\n")??""} onChange={e=>editField(f=>({...f,options:e.target.value.split("\n").map(v=>v.trim()).filter(Boolean)}))}/></label>}{["cpf","cnpj","rg"].includes(selected.kind)&&<p className={styles.fieldPrivacy}>Solicite documentos apenas quando necessários. A validação do RG confere o formato, não a autenticidade.</p>}
        <div className={styles.inspectorDivider}>Apresentação</div>
        <label>Texto de exemplo<input value={selected.placeholder??""} maxLength={100} placeholder="Ex.: Informe seu nome completo" onChange={e=>editField(f=>({...f,placeholder:e.target.value||undefined}))}/></label>
        <label>Texto de ajuda<input value={selected.helpText??""} maxLength={180} placeholder="Orientação exibida abaixo do campo" onChange={e=>editField(f=>({...f,helpText:e.target.value||undefined}))}/></label>
        {selected.kind==="text"&&<label>Formato aceito<select value={selected.mask??"none"} onChange={e=>editField(f=>({...f,mask:e.target.value as FormField["mask"]}))}><option value="none">Texto livre</option><option value="digits">Somente números (dígitos)</option><option value="letters">Somente letras e espaços</option><option value="alphanumeric">Letras e números</option></select></label>}
        {["text","textarea"].includes(selected.kind)&&<div className={styles.fieldRange}><label>Mínimo de caracteres<input type="number" min={0} max={1000} value={selected.minLength??""} onChange={e=>editField(f=>({...f,minLength:fieldNumericValue(e.target.value)}))}/></label><label>Máximo de caracteres<input type="number" min={1} max={selected.kind==="text"?250:1000} value={selected.maxLength??""} onChange={e=>editField(f=>({...f,maxLength:fieldNumericValue(e.target.value)}))}/></label></div>}
        {numericFormKinds(selected.kind)&&<div className={styles.fieldRange}><label>Valor mínimo<input type="number" step="any" value={selected.minValue??""} onChange={e=>editField(f=>({...f,minValue:fieldNumericValue(e.target.value)}))}/></label><label>Valor máximo<input type="number" step="any" value={selected.maxValue??""} onChange={e=>editField(f=>({...f,maxValue:fieldNumericValue(e.target.value)}))}/></label></div>}
        <div className={styles.inspectorDivider}>Exibição condicional</div>
        <label>Mostrar quando<select value={selected.showWhen?.fieldKey??""} onChange={e=>editField(f=>({...f,showWhen:e.target.value?{fieldKey:e.target.value,equals:draft.fields.find(item=>item.key===e.target.value)?.options?.[0]??""}:undefined}))}><option value="">Sempre visível</option>{earlierChoiceFields.map(item=><option key={item.id} value={item.key}>{item.label}</option>)}</select></label>
        {selected.showWhen&&<label>Resposta que revela este campo<select value={selected.showWhen.equals} onChange={e=>editField(f=>({...f,showWhen:{...f.showWhen!,equals:e.target.value}}))}>{draft.fields.find(item=>item.key===selected.showWhen?.fieldKey)?.options?.map(option=><option key={option} value={option}>{option}</option>)}</select></label>}
        {earlierChoiceFields.length===0&&<small className={styles.fieldTip}>Para criar uma condição, adicione antes deste campo uma lista de opções ou escolha visível.</small>}<label className={styles.checkbox}><input type="checkbox" checked={selected.required} onChange={e=>editField(f=>({...f,required:e.target.checked}))}/>Obrigatório</label><div className={styles.fieldActions}><button type="button" onClick={()=>reorder(-1)} disabled={draft.fields[0]?.id===fieldId} title="Subir"><FiArrowUp/></button><button type="button" onClick={()=>reorder(1)} disabled={draft.fields[draft.fields.length-1]?.id===fieldId} title="Descer"><FiArrowDown/></button><button type="button" disabled={draft.fields.length===1} onClick={()=>{const index=draft.fields.findIndex(f=>f.id===fieldId);update(form=>({...form,fields:form.fields.filter(f=>f.id!==fieldId),bindings:Object.fromEntries(Object.entries(form.bindings).filter(([key])=>key!==selected.key))}));setFieldId(draft.fields[Math.max(0,index-1)]?.id??"");}}>Remover</button></div></aside>}
    </div>
    <ConfirmActionModal open={Boolean(review)} title={review?.decision==="approved"?"Aprovar resposta?":"Recusar resposta?"} description={review?.decision==="approved"?"Se os campos estiverem conectados, esta resposta também criará um registro na peça de destino.":"A resposta ficará arquivada como recusada."} confirmLabel="Confirmar" busy={pending} onCancel={()=>setReview(null)} onConfirm={()=>void reviewNow()}/>
  </div>;
}
