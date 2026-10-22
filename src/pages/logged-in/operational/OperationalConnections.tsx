import {useEffect,useState} from "react";
import {FiArrowRight,FiCheckCircle,FiClipboard,FiDatabase,FiGitMerge,FiRefreshCw,FiShield} from "react-icons/fi";
import CongLoadingState from "../../../components/feedback/CongLoadingState";
import {loadConnectedForms,saveConnectedForm,type ConnectedForm,type FormField,numericFormKinds,choiceFormKinds} from "../../../features/operational/operationalFormsService";
import type {OperationalField,OperationalSystem} from "../../../features/operational/operationalService";
import styles from "./OperationalConnections.module.css";

interface Props{system:OperationalSystem;onDirtyChange?:(dirty:boolean)=>void}
function compatible(source:FormField,target:OperationalField){
  if(target.type==="relation"||target.type==="boolean")return false;
  if(target.type==="number")return numericFormKinds(source.kind);
  if(numericFormKinds(source.kind))return false;
  if(target.type==="date")return source.kind==="date";
  if(target.type==="select")return choiceFormKinds(source.kind)&&Boolean(source.options?.every(value=>target.options?.includes(value)));
  if(target.type==="email")return source.kind==="email";
  return true;
}
export default function OperationalConnections(props:Props){return <ConnectionsContent key={props.system.id} {...props}/>;}
function ConnectionsContent({system,onDirtyChange}:Props){
  const [forms,setForms]=useState<ConnectedForm[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [draft,setDraft]=useState<ConnectedForm|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [dirty,setDirty]=useState(false);
  useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
  useEffect(()=>()=>{onDirtyChange?.(false);},[onDirtyChange]);
  useEffect(()=>{
    let alive=true;
    void loadConnectedForms(system.id).then(({forms:items})=>{if(!alive)return;setForms(items);setSelectedId(items[0]?.id??"");setDraft(items[0]??null);setDirty(false);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:"Não foi possível consultar os formulários.");}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[system.id]);
  const target=system.modules.find(m=>m.id===draft?.targetModuleId);
  const targetModules=system.modules.filter(m=>m.blueprintKey!=="forms"&&m.fields.length>0&&!(["agenda","board","dispatch","delivery_routes","availability"].includes(m.blueprintKey)));
  function change(fn:(form:ConnectedForm)=>ConnectedForm){setDraft(old=>old?fn(old):old);setDirty(true);setNotice("");}
  function selectForm(item:ConnectedForm){if(dirty||saving)return;setSelectedId(item.id);setDraft(item);setNotice("");setError("");}
  function selectTarget(id:string){change(f=>({...f,targetModuleId:id||null,bindings:{}}));}
  function mapField(key:string,targetKey:string){change(f=>{const bindings={...f.bindings};if(targetKey)bindings[key]=targetKey;else delete bindings[key];return {...f,bindings};});}
  async function save(){if(!draft||saving||!dirty)return;setSaving(true);setError("");setNotice("");try{
    const result=await saveConnectedForm(system.id,draft);
    const updated={...draft,revision:result.saved.revision};setDraft(updated);setForms(items=>items.map(item=>item.id===updated.id?updated:item));setDirty(false);setNotice("Conexão salva. Novas respostas continuarão exigindo revisão antes de criar registros.");
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar a conexão.");}finally{setSaving(false);}}
  return <div className={styles.root}>
    <div className={styles.heading}><div><span>CONEXÕES ENTRE PEÇAS</span><h2>De onde vêm os dados e para onde vão?</h2><p>Associe informações de um formulário a campos de uma peça. Você decide o que aproveitar.</p></div><button type="button" className={styles.refresh} disabled={loading||dirty||saving} onClick={()=>{setLoading(true);void loadConnectedForms(system.id).then(result=>{setForms(result.forms);const chosen=result.forms.find(f=>f.id===selectedId)??result.forms[0];setSelectedId(chosen?.id??"");setDraft(chosen??null);setError("");}).catch(e=>setError(String(e))).finally(()=>setLoading(false));}}><FiRefreshCw/> Atualizar</button></div>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    {notice&&<p role="status" className={styles.notice}><FiCheckCircle/>{notice}</p>}
    {loading?<CongLoadingState variant="cards" count={3} label="Preparando conexões"/>:!forms.length?<div className={styles.empty}><FiClipboard/><h3>Comece criando um formulário</h3><p>Ao criar um formulário na peça “Formulários conectados”, ele aparece aqui para ligar suas respostas a outra área do sistema.</p></div>:<>
      <div className={styles.selectRow}><label>Formulário de origem<select value={selectedId} disabled={saving||dirty} onChange={e=>{const item=forms.find(f=>f.id===e.target.value);if(item)selectForm(item);}}>{forms.map(form=><option key={form.id} value={form.id}>{form.title}</option>)}</select></label>{dirty&&<span role="status">Salve ou descarte as alterações antes de mudar de formulário.</span>}</div>
      {draft&&<>
        <div className={styles.diagram}>
          <div className={styles.node}><span className={styles.nodeIcon}><FiClipboard/></span><small>ORIGEM</small><strong>{draft.title}</strong><span>{draft.fields.length} campos disponíveis</span></div>
          <div className={styles.connector}><FiArrowRight/><small>Dados mapeados</small></div>
          <div className={styles.node}><span className={styles.nodeIcon}><FiShield/></span><small>ETAPA OBRIGATÓRIA</small><strong>Revisar resposta</strong><span>Gestor aprova ou recusa</span></div>
          <div className={styles.connector}><FiArrowRight/><small>Após aprovação</small></div>
          <div className={styles.node}><span className={styles.nodeIcon}><FiDatabase/></span><small>DESTINO</small><strong>{target?.name??"Nenhuma peça selecionada"}</strong><span>{target?"Cadastro interno autorizado":"Somente armazenar respostas"}</span></div>
        </div>
        <div className={styles.editor}><div className={styles.editorHead}><div><h3><FiGitMerge/> Correspondência de campos</h3><p>Escolha qual informação deve preencher cada campo no destino. Os dados só são gravados depois da aprovação.</p></div><label>Peça de destino<select value={draft.targetModuleId??""} onChange={e=>selectTarget(e.target.value)} disabled={saving}><option value="">Somente guardar respostas</option>{targetModules.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div>
          {target?<div className={styles.mappings}><div className={styles.legend}><span>Campo do formulário</span><span>Campo da peça</span></div>{draft.fields.map(field=><div className={styles.mapping} key={field.id}><span><strong>{field.label}</strong><small>{field.kind}{field.required?" · Obrigatório":""}</small></span><FiArrowRight className={styles.arrow}/><label><span className={styles.sr}>Destino para {field.label}</span><select value={draft.bindings[field.key]??""} disabled={saving} onChange={e=>mapField(field.key,e.target.value)}><option value="">Não utilizar</option>{target.fields.filter(dest=>compatible(field,dest)).map(dest=><option key={dest.key} value={dest.key}>{dest.label}{dest.required?" *":""}</option>)}</select></label></div>)}</div>:<div className={styles.unselected}>As respostas ficam disponíveis para análise sem criar registros automaticamente. Escolha uma peça se quiser reutilizá-las.</div>}
          <div className={styles.actions}><p><FiShield/> A CONG não conecta respostas de maneira irrestrita: a autorização e a validação continuam no servidor.</p><div><button type="button" className={styles.discard} onClick={()=>{setDraft(forms.find(f=>f.id===selectedId)??null);setDirty(false);setError("");}} disabled={!dirty||saving}>Descartar</button><button type="button" className={styles.save} onClick={()=>void save()} disabled={!dirty||saving}>{saving?"Salvando…":"Salvar conexão"}</button></div></div>
        </div>
      </>}
    </>}
  </div>;
}
