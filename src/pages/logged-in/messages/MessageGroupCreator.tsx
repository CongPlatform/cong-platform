import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCamera, FiCheck, FiSearch, FiUsers, FiX } from "react-icons/fi";
import { createMessageGroup, searchMessageContacts, uploadGroupPhoto, type MessageContact, type MessageScope } from "../../../services/messagesService";
import styles from "./MessageGroupCreator.module.css";
import { prepareGroupPhoto } from "./messageGroupPhoto";

type Props={scope:MessageScope;onClose:()=>void;onCreated:(id:string,warning?:string)=>void};
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(s=>s[0]||"").join("").toUpperCase();}
export default function MessageGroupCreator({scope,onClose,onCreated}:Props){
  const [step,setStep]=useState<1|2>(1);
  const [query,setQuery]=useState("");
  const [matches,setMatches]=useState<MessageContact[]>([]);
  const [chosen,setChosen]=useState<MessageContact[]>([]);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [image,setImage]=useState<File|null>(null);
  const [preparing,setPreparing]=useState(false);
  const [preview,setPreview]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const searchRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{searchRef.current?.focus();},[]);
  useEffect(()=>{
    if(query.trim().length<2)return;
    let alive=true;
    const timer=window.setTimeout(()=>{
      void searchMessageContacts(scope,query.trim()).then(items=>{if(alive)setMatches(items);}).catch(()=>{if(alive)setError("Não foi possível buscar pessoas.");});
    },300);
    return()=>{alive=false;window.clearTimeout(timer);};
  },[query,scope]);
  useEffect(()=>{
    if(!image)return;
    const url=URL.createObjectURL(image);
    // Asynchronous callback to avoid a synchronous state update in an effect.
    const frame=requestAnimationFrame(()=>setPreview(url));
    return()=>{cancelAnimationFrame(frame);URL.revokeObjectURL(url);};
  },[image]);
  function toggle(person:MessageContact){setChosen(prev=>prev.some(p=>p.id===person.id)?prev.filter(p=>p.id!==person.id):prev.length>=49?prev:[...prev,person]);}
  async function choosePhoto(file?:File){
    if(!file)return;
    setPreparing(true);setError(null);
    try{const prepared=await prepareGroupPhoto(file);setImage(prepared);}
    catch(e){setError(e instanceof Error?e.message:"Não foi possível preparar a foto.");}
    finally{setPreparing(false);}
  }
  async function create(){
    if(busy||preparing||name.trim().length<2||!chosen.length)return;
    setBusy(true);setError(null);
    try{
      const id=await createMessageGroup(scope,name.trim(),chosen.map(p=>p.id),description.trim());
      if(image){
        try{await uploadGroupPhoto(scope,id,image);onCreated(id);}
        catch{onCreated(id,"Grupo criado, mas a foto não foi salva. Você pode enviá-la nos detalhes do grupo.");}
      }else onCreated(id);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível criar o grupo.");setBusy(false);}
  }
  const results=query.trim().length>=2?matches.filter(p=>!chosen.some(c=>c.id===p.id)):[];
  return <div className={styles.scrim} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
    <section className={styles.drawer} role="dialog" aria-modal="true" aria-label="Criar grupo"
      onKeyDown={e=>{if(e.key==="Escape"&&!busy){e.stopPropagation();onClose();}}}>
      <header className={styles.top}>
        <div className={styles.mini}><span>CONG / MENSAGENS</span><strong>Novo grupo</strong></div>
        <button type="button" className={styles.icon} disabled={busy} onClick={onClose} aria-label="Fechar"><FiX/></button>
      </header>
      <div className={styles.progress}><div className={step===1?styles.progressActive:""}/><div className={step===2?styles.progressActive:""}/></div>
      {step===1?<>
        <div className={styles.intro}><span className={styles.kicker}>01 / PARTICIPANTES</span><h2>Quem vai participar?</h2><p>Busque pessoas da CONG e escolha quem fará parte da conversa.</p></div>
        <label className={styles.search}><FiSearch/><input ref={searchRef} aria-label="Buscar participantes" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar pelo nome ou @usuário" maxLength={100}/></label>
        {chosen.length>0?<div className={styles.picked}>{chosen.map(p=><button key={p.id} type="button" onClick={()=>toggle(p)} title={`Remover ${p.name}`}><span>{p.name}</span><FiX/></button>)}</div>:null}
        <div className={styles.results}>
          {query.trim().length<2?<div className={styles.help}><FiUsers/><span>Digite ao menos duas letras para encontrar participantes.</span></div>:
           results.length?results.map(p=><button className={styles.person} key={p.id} type="button" onClick={()=>toggle(p)}>
             <span className={styles.avatar}>{p.avatarUrl?<img src={p.avatarUrl} alt=""/>:initials(p.name)}</span><span className={styles.personText}><strong>{p.name}</strong><small>{p.username?`@${p.username}`:"Membro da CONG"}</small></span><span className={styles.plus}>+</span>
           </button>):<p className={styles.help}>Nenhum novo resultado para essa busca.</p>}
        </div>
      </>:<>
        <div className={styles.intro}><span className={styles.kicker}>02 / IDENTIDADE</span><h2>Dê vida ao grupo</h2><p>Um nome é obrigatório. Foto e descrição são opcionais.</p></div>
        <div className={styles.setup}>
          <div className={styles.photoRow}><button type="button" className={styles.photo} title="Escolher foto do grupo" onClick={()=>fileRef.current?.click()}>
            {preview?<img src={preview} alt="Foto escolhida para o grupo"/>:<FiCamera/>}
          </button><span><strong>Foto do grupo</strong><small>JPG, PNG ou WebP · até 2 MB</small></span><button type="button" className={styles.changePhoto} onClick={()=>fileRef.current?.click()}>{image?"Trocar foto":"Adicionar"}</button></div>
          <input hidden ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void choosePhoto(e.target.files?.[0]);e.target.value="";}}/>
          <label>Nome do grupo <em>*</em><input value={name} onChange={e=>setName(e.target.value)} maxLength={100} placeholder="Ex.: Equipe de voluntários"/></label>
          <label>Descrição <small>(opcional)</small><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={500} rows={4} placeholder="Sobre o que vamos conversar neste grupo?"/></label>
          <div className={styles.summary}><FiUsers/><span>{chosen.length+1} participantes, incluindo você</span></div>
        </div>
      </>}
      {error?<p className={styles.error} role="alert">{error}</p>:null}
      <footer className={styles.footer}>
        {step===2?<button type="button" className={styles.secondary} disabled={busy} onClick={()=>setStep(1)}><FiArrowLeft/> Voltar</button>:<small>{chosen.length} de 49 pessoas selecionadas</small>}
        {step===1?<button type="button" className={styles.primary} disabled={!chosen.length} onClick={()=>setStep(2)}>Continuar <FiArrowRight/></button>:
        <button type="button" className={styles.primary} disabled={busy||preparing||name.trim().length<2} onClick={()=>void create()}><FiCheck/> {busy?"Criando...":preparing?"Preparando foto...":"Criar grupo"}</button>}
      </footer>
    </section>
  </div>;
}
