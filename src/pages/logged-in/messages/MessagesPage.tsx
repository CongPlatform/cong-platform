import { useCallback,useEffect,useMemo,useRef,useState,type ChangeEvent,type ClipboardEvent,type DragEvent,type FormEvent } from "react";
import { FiArrowLeft,FiBold,FiCamera,FiCheckCircle,FiChevronDown,FiCopy,FiEdit2,FiFile,FiItalic,FiMessageCircle,FiMic,FiPaperclip,FiSearch,FiSend,FiSettings,FiTrash2,FiUsers,FiVideo,FiX } from "react-icons/fi";
import { supabase } from "../../../services/supabase";
import { getStoredAuthToken } from "../../../services/api";
import { useWorkspace } from "../../../contexts/workspace-context";
import { useAuth } from "../../../contexts/auth-context";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import MessageImageEditor from "./MessageImageEditor";
import MessageAttachmentDisplay from "./MessageAttachmentDisplay";
import MessageGroupCreator from "./MessageGroupCreator";
import MessageConversationDetails from "./MessageConversationDetails";
import InlineCameraCapture from "./InlineCameraCapture";
import InlineVoiceRecorder from "./InlineVoiceRecorder";
import { prepareMessageFile } from "./MessageMediaTools";
import {
  acknowledgeMessages,beginConversation,deleteMessage,fetchConversations,fetchMessages,fetchMessageSettings,
  respondToContactRequest,saveMessageSettings,searchMessageContacts,sendMessage,toggleMessageReaction,
  uploadMessageAttachment,type MessageContact,type MessageConversation,type MessageEntry,type MessageParticipant,type MessageModuleSettings,type MessageScope,
} from "../../../services/messagesService";
import {PREVIEW_IMAGE_TYPES} from "../../../services/messageAttachments";
import styles from "./MessagesPage.module.css";

const EMOJIS=["❤️","👍","😂","😮","😢","🙏"] as const;
function initials(name:string){return name.split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()??"").join("")||"?";}
function Avatar({name,url,size="default"}:{name:string;url?:string|null;size?:"default"|"small"}){
  return <span className={`${styles.avatar} ${size==="small"?styles.avatarSmall:""}`}>{url?<img src={url} alt=""/>:initials(name)}</span>;
}
function errorText(error:unknown){return error instanceof Error?error.message:"Não foi possível concluir a operação.";}
function dayLabel(value:string){const date=new Date(value);const now=new Date();if(date.toDateString()===now.toDateString())return"Hoje";
  const prev=new Date(now);prev.setDate(prev.getDate()-1);if(date.toDateString()===prev.toDateString())return"Ontem";
  return date.toLocaleDateString("pt-BR");}
function hour(value:string){return new Date(value).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
function formatText(text:string){return text.split(/(\*\*[^*\n]+\*\*|~~[^~\n]+~~|_[^_\n]+_)/g).map((p,i)=>p.startsWith("**")&&p.endsWith("**")?<strong key={i}>{p.slice(2,-2)}</strong>:p.startsWith("~~")&&p.endsWith("~~")?<s key={i}>{p.slice(2,-2)}</s>:p.startsWith("_")&&p.endsWith("_")?<em key={i}>{p.slice(1,-1)}</em>:p);}
function messagePreview(m:MessageConversation){if(m.lastMessage)return m.lastMessage.length>55?m.lastMessage.slice(0,55)+"…":m.lastMessage;return m.kind==="group"?`${m.memberCount} participantes`:m.contactStatus==="pending"?"Solicitação de contato":"Inicie a conversa";}

export default function MessagesPage({scope}:{scope:MessageScope}){
  const {workspace}=useWorkspace();const {user}=useAuth();
  const orgId=workspace.kind==="organization"?workspace.organization.id:null;
  return <MessageScreen key={`${scope}:${orgId}:${user?.id}`} scope={scope} organizationId={orgId}/>;
}
function MessageScreen({scope,organizationId}:{scope:MessageScope;organizationId:string|null}){
  const valid=scope==="global"||Boolean(organizationId);
  const [settings,setSettings]=useState<MessageModuleSettings|null>(null);
  const [conversations,setConversations]=useState<MessageConversation[]>([]);
  const [viewer,setViewer]=useState<string|null>(null);
  const [activeId,setActiveId]=useState<string|null>(null);
  const [messages,setMessages]=useState<MessageEntry[]>([]);
  const [participants,setParticipants]=useState<MessageParticipant[]>([]);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [draft,setDraft]=useState("");
  const [search,setSearch]=useState("");
  const [contacts,setContacts]=useState<MessageContact[]>([]);
  const [requestContact,setRequestContact]=useState<MessageContact|null>(null);
  const [intro,setIntro]=useState("");
  const [groupCreator,setGroupCreator]=useState(false);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [peerOnline,setPeerOnline]=useState(false);
  const [peerTyping,setPeerTyping]=useState<string|null>(null);
  const presenceRef=useRef<ReturnType<typeof supabase.channel>|null>(null);
  const typingAt=useRef(0);
  const typingTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [selected,setSelected]=useState<string[]>([]);
  const [replyTo,setReplyTo]=useState<MessageEntry|null>(null);
  const [deleteTarget,setDeleteTarget]=useState<{items:MessageEntry[];mode:"me"|"everyone"}|null>(null);
  const [pendingFile,setPendingFile]=useState<File|null>(null);
  const [previewUrl,setPreviewUrl]=useState<string|null>(null);
  const [imageEdit,setImageEdit]=useState<File|null>(null);
  const [voice,setVoice]=useState(false);
  const [camera,setCamera]=useState<"photo"|"video"|null>(null);
  const [mobileList,setMobileList]=useState(true);
  const [dragging,setDragging]=useState(false);
  const [selectionFormat,setSelectionFormat]=useState(false);
  const listRef=useRef<HTMLDivElement>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const composerRef=useRef<HTMLTextAreaElement>(null);
  const activeRef=useRef<string|null>(null);
  const latestFetch=useRef(0);
  const current=conversations.find(item=>item.id===activeId);
  const enabled=valid&&(scope==="global"||Boolean(settings?.enabled));
  const pending=current?.contactStatus==="pending";
  const isRequester=pending&&current?.createdBy===viewer;
  const canSend=Boolean(current)&&(current?.contactStatus==="accepted"||(isRequester&&!messages.length));
  const canAttach=Boolean(current)&&current?.contactStatus==="accepted";
  const searchMode=search.trim().length>=2;
  const selectedEntries=useMemo(()=>messages.filter(m=>selected.includes(m.id)),[selected,messages]);

  const refreshConversations=useCallback(async()=>{
    if(!valid)return;
    const data=await fetchConversations(scope);
    setViewer(data.viewerId);setConversations(data.conversations);
  },[scope,valid]);
  const refreshMessages=useCallback(async(id:string)=>{
    const sequence=++latestFetch.current;
    const data=await fetchMessages(scope,id);
    if(activeRef.current!==id||sequence!==latestFetch.current)return;
    setMessages(data.messages);setParticipants(data.participants);
  },[scope]);
  const openConversation=useCallback(async(id:string)=>{
    activeRef.current=id;setActiveId(id);setMobileList(false);
    setMessages([]);setParticipants([]);setSelected([]);setReplyTo(null);setDraft("");setPendingFile(null);
    setPeerTyping(null);setPeerOnline(false);setDetailsOpen(false);
    try{await refreshMessages(id);await acknowledgeMessages(scope,id);await refreshConversations();}
    catch(reason){setError(errorText(reason));}
  },[refreshMessages,refreshConversations,scope]);

  useEffect(()=>{
    if(!valid)return;
    let alive=true;
    async function init(){try{
      if(scope==="organization")setSettings(await fetchMessageSettings());
      await refreshConversations();
    }catch(reason){if(alive)setError(errorText(reason));}finally{if(alive)setLoading(false);}}
    void init();return()=>{alive=false;};
  },[scope,valid,refreshConversations]);
  useEffect(()=>{
    if(!valid||!enabled)return;
    const update=()=>{
      if(document.visibilityState!=="visible")return;
      void refreshConversations().catch(()=>undefined);
      const id=activeRef.current;if(id)void refreshMessages(id).then(()=>acknowledgeMessages(scope,id)).catch(()=>undefined);
    };
    const timer=window.setInterval(update,6000);
    window.addEventListener("cong:messages-event",update);
    window.addEventListener("cong:messages-local-change",update);
    return()=>{window.clearInterval(timer);window.removeEventListener("cong:messages-event",update);window.removeEventListener("cong:messages-local-change",update);};
  },[scope,valid,enabled,refreshConversations,refreshMessages]);
  useEffect(()=>{const node=listRef.current;if(node)node.scrollTop=node.scrollHeight;},[messages.length,activeId]);
  useEffect(()=>{
    if(search.trim().length<2)return;
    let cancelled=false;
    const timer=window.setTimeout(()=>void searchMessageContacts(scope,search).then(items=>{if(!cancelled)setContacts(items);}).catch(()=>{if(!cancelled)setContacts([]);}),300);
    return()=>{cancelled=true;window.clearTimeout(timer);};
  },[search,scope]);
  useEffect(()=>{
    if(!activeId||current?.contactStatus!=="accepted"||!viewer)return;
    let ended=false;
    const channel=supabase.channel(`cong:conversation:${activeId}`,{config:{private:true,presence:{key:viewer}}});
    presenceRef.current=channel;
    channel.on("presence",{event:"sync"},()=>{
      const state=channel.presenceState();
      setPeerOnline(Object.keys(state).some(key=>key!==viewer));
    }).on("broadcast",{event:"typing"},({payload})=>{
      const author=payload?.userId as string|undefined;
      if(!author||author===viewer)return;
      const sender=participants.find(person=>person.userId===author)?.name||"Alguém";
      setPeerTyping(sender);
      if(typingTimer.current)window.clearTimeout(typingTimer.current);
      typingTimer.current=window.setTimeout(()=>setPeerTyping(null),2400);
    });
    async function join(){
      const token=getStoredAuthToken();if(token)await supabase.realtime.setAuth(token);
      if(ended)return;
      channel.subscribe(status=>{if(status==="SUBSCRIBED"&&!ended)void channel.track({userId:viewer});});
    }
    void join().catch(()=>undefined);
    return()=>{
      ended=true;
      if(typingTimer.current)window.clearTimeout(typingTimer.current);
      if(presenceRef.current===channel)presenceRef.current=null;
      void supabase.removeChannel(channel);
    };
    // Participant labels are retrieved by the active conversation polling flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[activeId,current?.contactStatus,viewer]);
  useEffect(()=>{
    if(!pendingFile)return;
    const url=URL.createObjectURL(pendingFile);
    const frame=window.requestAnimationFrame(()=>setPreviewUrl(url));
    return()=>{window.cancelAnimationFrame(frame);URL.revokeObjectURL(url);};
  },[pendingFile]);

  async function startDirect(){if(!requestContact)return;setBusy(true);setError(null);
    try{const id=await beginConversation(scope,requestContact.id);const text=intro.trim();setRequestContact(null);setSearch("");
      await refreshConversations();await openConversation(id);
      if(text)await sendText(text,id);
    }catch(reason){setError(errorText(reason));}finally{setBusy(false);}
  }
  async function createdGroup(id:string,warning?:string){
    setGroupCreator(false);setSearch("");setContacts([]);
    try{await refreshConversations();await openConversation(id);if(warning)setError(warning);}
    catch(reason){setError(errorText(reason));}
  }
  async function refreshGroupDetails(){await refreshConversations();if(activeRef.current)await refreshMessages(activeRef.current);}
  function leftGroup(){setDetailsOpen(false);setActiveId(null);activeRef.current=null;setMobileList(true);void refreshConversations();}
  async function decideRequest(decision:"accepted"|"rejected"){
    if(!activeId)return;setBusy(true);
    try{await respondToContactRequest(scope,activeId,decision);await refreshConversations();
      if(decision==="rejected"){setActiveId(null);activeRef.current=null;setMobileList(true);}else await refreshMessages(activeId);
    }catch(reason){setError(errorText(reason));}finally{setBusy(false);}
  }
  async function sendText(value:string,overrideId?:string,file?:File){
    const id=overrideId??activeRef.current;if(!id)return false;
    const body=value.trim();if(!body&&!file)return false;
    setBusy(true);setError(null);
    try{
      const attachmentId=file?await uploadMessageAttachment(scope,id,file):undefined;
      await sendMessage(scope,id,crypto.randomUUID(),body,attachmentId,replyTo?.id);
      if(!overrideId){setDraft("");setPendingFile(null);setReplyTo(null);}
      await Promise.all([refreshMessages(id),refreshConversations()]);
      window.dispatchEvent(new Event("cong:messages-local-change"));return true;
    }catch(reason){setError(errorText(reason));return false;}finally{setBusy(false);}
  }
  function updateDraft(value:string){
    setDraft(value);
    if(!viewer||!presenceRef.current||Date.now()-typingAt.current<1200)return;
    typingAt.current=Date.now();
    void presenceRef.current.send({type:"broadcast",event:"typing",payload:{userId:viewer}});
  }
  function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(canSend)void sendText(draft,undefined,pendingFile??undefined);}
  async function chooseFile(file:File){
    try{const prepared=await prepareMessageFile(file);setPendingFile(prepared);setVoice(false);setCamera(null);
      if(PREVIEW_IMAGE_TYPES.has(prepared.type)&&prepared.size<=5_000_000)setImageEdit(prepared);
    }catch(reason){setError(errorText(reason));}
  }
  function formatSelected(marker:string){const input=composerRef.current;if(!input)return;
    const start=input.selectionStart;const end=input.selectionEnd;const selection=draft.slice(start,end);
    if(!selection)return;
    setDraft(draft.slice(0,start)+marker+selection+marker+draft.slice(end));setSelectionFormat(false);
    window.requestAnimationFrame(()=>{input.focus();input.setSelectionRange(start+marker.length,end+marker.length);});
  }
  function paste(event:ClipboardEvent<HTMLTextAreaElement>){const image=Array.from(event.clipboardData.files).find(f=>f.type.startsWith("image/"));if(image){event.preventDefault();void chooseFile(image);}}
  function drop(event:DragEvent<HTMLFormElement>){event.preventDefault();setDragging(false);const file=event.dataTransfer.files[0];if(file)void chooseFile(file);}
  async function removeSelected(){if(!deleteTarget||!activeId)return;setBusy(true);
    try{for(const item of deleteTarget.items)await deleteMessage(scope,activeId,item.id,deleteTarget.mode);
      setDeleteTarget(null);setSelected([]);await refreshMessages(activeId);
    }catch(reason){setError(errorText(reason));}finally{setBusy(false);}
  }
  async function react(msg:MessageEntry,emoji:string){if(!activeId)return;
    try{await toggleMessageReaction(scope,activeId,msg.id,emoji);await refreshMessages(activeId);}catch(reason){setError(errorText(reason));}
  }
  async function changeSetting(key:"enabled"|"directMessagesEnabled",value:boolean){setBusy(true);
    try{setSettings(await saveMessageSettings({[key]:value}));}catch(reason){setError(errorText(reason));}finally{setBusy(false);}
  }
  const bulkCanDelete=selectedEntries.length>0&&selectedEntries.every(m=>m.senderUserId===viewer && Date.now()-new Date(m.createdAt).getTime()<=900_000);
  if(!valid)return <main className={styles.page}><div className={styles.empty}><h2>Selecione uma organização</h2><p>As mensagens deste módulo pertencem a um ambiente institucional.</p></div></main>;
  return <main className={styles.page}>
    {error?<div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={()=>setError(null)} aria-label="Fechar"><FiX/></button></div>:null}
    {loading?<div className={styles.empty}>Carregando conversas...</div>:!enabled?<div className={styles.empty}><FiMessageCircle/><h2>Mensagens indisponíveis</h2><p>O módulo ainda não está ativo neste ambiente.</p>
      {settings?.canManage?<button onClick={()=>setSettingsOpen(true)}>Configurar módulo</button>:null}</div>:
    <section className={styles.shell} aria-label="Mensagens da CONG">
      <aside className={`${styles.sidebar} ${!mobileList?styles.hideMobile:""}`}>
        <header className={styles.sideHeader}><div><small>{scope==="global"?"Comunidade CONG":"Ambiente institucional"}</small><h1>Mensagens</h1></div>
          <div className={styles.actions}><button type="button" className={styles.newGroup} title="Criar novo grupo" onClick={()=>setGroupCreator(true)}><FiUsers/><span>Novo grupo</span></button>
          {scope==="organization"&&settings?.canManage?<button type="button" title="Configurar módulo" onClick={()=>setSettingsOpen(true)}><FiSettings/></button>:null}</div></header>
        <label className={styles.search}><FiSearch/><input value={search} onChange={event=>{setSearch(event.target.value);if(!event.target.value)setContacts([]);}} placeholder="Buscar pessoas ou conversas"/></label>
        <div className={styles.sectionLabel}>{searchMode?"Pessoas":"Conversas"}<span>{searchMode?contacts.length:conversations.length}</span></div>
        <div className={styles.conversationList}>{searchMode?contacts.map(p=><button key={p.id} className={styles.conversation} onClick={()=>{setRequestContact(p);setIntro("");}}>
          <Avatar name={p.name} url={p.avatarUrl}/><span className={styles.conversationInfo}><strong>{p.name}</strong><small>{p.username?`@${p.username}`:"Enviar solicitação"}</small></span>
        </button>):conversations.map(c=><button key={c.id} type="button" className={`${styles.conversation} ${c.id===activeId?styles.active:""}`} onClick={()=>void openConversation(c.id)}>
          <Avatar name={c.kind==="group"?c.title||"Grupo":c.peerName||"Contato"} url={c.avatarUrl}/>
          <span className={styles.conversationInfo}><strong>{c.kind==="group"?c.title:c.peerName}</strong><small>{messagePreview(c)}</small></span>
          <span className={styles.meta}>{c.lastMessageAt?hour(c.lastMessageAt):""}{c.unreadCount?<b>{c.unreadCount}</b>:null}</span>
        </button>)}
        {!searchMode&&!conversations.length?<p className={styles.listHint}>Busque uma pessoa ou crie um grupo para começar.</p>:null}
        </div>
        <footer className={styles.sidebarFoot}><span className={styles.tape}/>Um lugar para conectar boas ideias.</footer>
      </aside>
      <section className={`${styles.thread} ${mobileList?styles.hideThreadMobile:""}`}>
        {current?<>
          <header className={styles.threadHeader}>
            <button type="button" className={styles.back} title="Voltar" onClick={()=>setMobileList(true)}><FiArrowLeft/></button>
            <button type="button" className={styles.headerProfile} onClick={()=>setDetailsOpen(true)} title="Abrir detalhes da conversa">
              <Avatar name={current.kind==="group"?current.title||"Grupo":current.peerName||"Contato"} url={current.avatarUrl}/>
              <span className={styles.headerInfo}><strong>{current.kind==="group"?current.title:current.peerName}</strong><small>{current.kind==="group"?`${current.memberCount} participantes · toque para detalhes`:current.contactStatus==="accepted"?(peerOnline?"Online · ver perfil":"Offline · ver perfil"):"Ver perfil"}</small></span>
            </button>
          </header>
          {pending?<div className={styles.requestBar}>{isRequester?<span>Aguardando esta pessoa aceitar o contato.</span>:<><span>Esta pessoa deseja conversar com você.</span><button onClick={()=>void decideRequest("rejected")}>Recusar</button><button onClick={()=>void decideRequest("accepted")}>Aceitar</button></>}</div>:null}
          {current.contactStatus==="rejected"?<div className={styles.requestBar}>Esta solicitação foi recusada.</div>:null}
          {selected.length>0?<div className={styles.selectionBar}>
            <button onClick={()=>setSelected([])} title="Cancelar seleção"><FiX/></button><strong>{selected.length} selecionada(s)</strong>
            <button onClick={()=>{void navigator.clipboard.writeText(selectedEntries.filter(m=>!m.attachmentId).map(m=>m.body).join("\n"));setSelected([]);}} title="Copiar"><FiCopy/></button>
            {selected.length===1?<button title="Responder" onClick={()=>{setReplyTo(selectedEntries[0]);setSelected([]);composerRef.current?.focus();}}><FiMessageCircle/></button>:null}
            <button title="Apagar para mim" onClick={()=>setDeleteTarget({items:selectedEntries,mode:"me"})}><FiTrash2/></button>
            {bulkCanDelete?<button title="Apagar para todos" onClick={()=>setDeleteTarget({items:selectedEntries,mode:"everyone"})}>Para todos</button>:null}
          </div>:null}
          <div className={styles.history} ref={listRef} role="log" aria-live="polite">
            {!messages.length?<div className={styles.emptyChat}><FiMessageCircle/><strong>Sua conversa começa aqui</strong><small>Converse com pessoas e organizações da CONG.</small></div>:null}
            {messages.map((m,index)=>{
              const mine=m.senderUserId===viewer;const day=new Date(m.createdAt).toDateString();
              const prev=index?new Date(messages[index-1].createdAt).toDateString():null;
              const reactions=[...new Set(m.reactions.map(r=>r.emoji))];
              const recipients=participants.filter(p=>p.userId!==viewer);
              const read=recipients.length>0&&recipients.every(p=>p.lastReadAt&&new Date(p.lastReadAt).getTime()>=new Date(m.createdAt).getTime());
              const delivered=recipients.length>0&&recipients.every(p=>p.lastDeliveredAt&&new Date(p.lastDeliveredAt).getTime()>=new Date(m.createdAt).getTime());
              return <div className={styles.cluster} key={m.id}>
                {day!==prev?<div className={styles.day}><span>{dayLabel(m.createdAt)}</span></div>:null}
                <div className={`${styles.messageRow} ${mine?styles.mine:""}`}>
                  {!mine?<Avatar name={m.senderName} url={m.avatarUrl} size="small"/>:null}
                  <div className={`${styles.bubble} ${mine?styles.bubbleMine:""} ${selected.includes(m.id)?styles.bubbleSelected:""} ${m.attachmentId?styles.bubbleAttachment:""}`}>
                    <button type="button" className={styles.messageSelect} title="Selecionar mensagem" onClick={()=>setSelected(items=>items.includes(m.id)?items.filter(x=>x!==m.id):[...items,m.id])}>
                      {selected.includes(m.id)?<FiCheckCircle/>:<FiChevronDown/>}
                    </button>
                    {!mine&&current.kind==="group"?<span className={styles.sender}>{m.senderName}</span>:null}
                    {m.replyToId?<button className={styles.quote} onClick={()=>document.getElementById(`msg-${m.replyToId}`)?.scrollIntoView({block:"center",behavior:"smooth"})}><strong>{m.replySenderName||"Mensagem"}</strong><span>{(m.replyBody||"Mensagem apagada").slice(0,120)}</span></button>:null}
                    <div id={`msg-${m.id}`}>
                      {m.deletedForAllAt?<p className={styles.deleted}>Esta mensagem foi apagada.</p>:<>
                        {m.attachmentId?<MessageAttachmentDisplay key={m.attachmentId} scope={scope} conversationId={current.id} id={m.attachmentId} name={m.attachmentName||"Arquivo"} mime={m.attachmentMime||"application/octet-stream"} size={m.attachmentSize||0} caption={m.body} onError={setError}/>:null}
                        {m.body?<p className={styles.body}>{formatText(m.body)}</p>:null}
                      </>}
                    </div>
                    <footer className={styles.messageFooter}><time>{hour(m.createdAt)}</time>{mine?<span className={read?styles.receiptRead:""} title={read?"Lida":delivered?"Recebida":"Enviada"}>{read||delivered?"✓✓":"✓"}</span>:null}</footer>
                    {!m.deletedForAllAt?<div className={styles.reactionBar}>{reactions.map(emoji=><button type="button" key={emoji} title="Adicionar ou remover reação" className={m.reactions.some(r=>r.emoji===emoji&&r.userId===viewer)?styles.myReaction:""} onClick={()=>void react(m,emoji)}>{emoji} {m.reactions.filter(r=>r.emoji===emoji).length}</button>)}
                      <span className={styles.quickReactions}>{EMOJIS.map(emoji=><button key={emoji} type="button" title={`Reagir ${emoji}`} onClick={()=>void react(m,emoji)}>{emoji}</button>)}</span></div>:null}
                  </div>
                </div>
              </div>;
            })}
            {peerTyping?<div className={styles.typingRow} role="status" aria-label={`${peerTyping} está digitando`}><div className={styles.typingBubble}><i/><i/><i/></div><small>{current.kind==="group"?peerTyping:""}</small></div>:null}
          </div>
          <form className={`${styles.composer} ${dragging?styles.dragging:""}`} onSubmit={submit}
            onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={drop}>
            {camera?<InlineCameraCapture mode={camera} onCancel={()=>setCamera(null)} onReady={file=>{setCamera(null);void chooseFile(file);}} onError={setError}/>:voice?<InlineVoiceRecorder onCancel={()=>setVoice(false)} onSend={file=>sendText("",undefined,file)} onError={setError}/>:<>
              {replyTo?<div className={styles.replyPreview}><span><strong>Respondendo a {replyTo.senderName}</strong><small>{replyTo.body||"Anexo"}</small></span><button type="button" onClick={()=>setReplyTo(null)}><FiX/></button></div>:null}
              {pendingFile?<div className={styles.filePreview}>{previewUrl&&PREVIEW_IMAGE_TYPES.has(pendingFile.type)?<img src={previewUrl} alt="Prévia"/>:<FiFile/>}<span><strong>{pendingFile.name}</strong><small>{(pendingFile.size/1_000_000).toFixed(2)} MB · {pendingFile.size>5_000_000?"Como documento":"Pronto para enviar"}</small></span>
                {PREVIEW_IMAGE_TYPES.has(pendingFile.type)&&pendingFile.size<=5_000_000?<button type="button" onClick={()=>setImageEdit(pendingFile)} title="Editar imagem"><FiEdit2/></button>:null}
                <button type="button" onClick={()=>setPendingFile(null)} title="Remover"><FiX/></button></div>:null}
              <div className={styles.composerRow}>
                <div className={styles.tools}>
                  <button type="button" title="Anexar arquivo" disabled={!canAttach||busy} onClick={()=>fileRef.current?.click()}><FiPaperclip/></button>
                  <button type="button" title="Gravar áudio" disabled={!canAttach||busy} onClick={()=>setVoice(true)}><FiMic/></button>
                  <button type="button" title="Tirar foto" disabled={!canAttach||busy} onClick={()=>setCamera("photo")}><FiCamera/></button>
                  <button type="button" title="Gravar vídeo" disabled={!canAttach||busy} onClick={()=>setCamera("video")}><FiVideo/></button>
                  <input ref={fileRef} type="file" hidden onChange={(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];if(file)void chooseFile(file);event.target.value="";}}/>
                </div>
                <div className={styles.writeArea}>
                  {selectionFormat?<div className={styles.formatToolbar} onMouseDown={event=>event.preventDefault()}><button type="button" title="Negrito" onClick={()=>formatSelected("**")}><FiBold/></button><button type="button" title="Itálico" onClick={()=>formatSelected("_")}><FiItalic/></button><button type="button" title="Tachado" onClick={()=>formatSelected("~~")}>S̶</button></div>:null}
                  <textarea ref={composerRef} value={draft} onChange={event=>updateDraft(event.target.value)} onPaste={paste} onSelect={event=>setSelectionFormat(event.currentTarget.selectionStart<event.currentTarget.selectionEnd)}
                    onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&["b","i"].includes(event.key.toLowerCase())){event.preventDefault();formatSelected(event.key.toLowerCase()==="b"?"**":"_");}
                      else if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}
                    placeholder={!canSend?"Aguardando a aceitação do contato":pendingFile?"Adicione uma legenda...":"Escreva uma mensagem"} rows={1} maxLength={4000} disabled={!canSend}/>
                </div>
                <button className={styles.send} type="submit" title="Enviar" disabled={!canSend||busy||(!draft.trim()&&!pendingFile)}><FiSend/></button>
              </div>
            </>}
          </form>
        </>:<div className={styles.emptyChat}><FiMessageCircle/><h2>Escolha uma conversa</h2><p>Ou procure uma pessoa para começar.</p></div>}
      </section>
    </section>}
    <ModalMensagem aberto={Boolean(requestContact)} titulo={`Solicitar contato${requestContact?` com ${requestContact.name}`:""}`} tamanho="medio" mostrarBotaoOk={false} onFechar={()=>setRequestContact(null)} mensagem={<div className={styles.modalBody}>
      <p>Essa pessoa poderá aceitar ou recusar a conversa.</p><label>Breve apresentação (opcional)<textarea value={intro} maxLength={300} rows={3} onChange={event=>setIntro(event.target.value)} placeholder="Olá! Gostaria de conversar sobre..."/></label>
      <div className={styles.modalButtons}><button onClick={()=>setRequestContact(null)}>Cancelar</button><button disabled={busy} onClick={()=>void startDirect()}>Enviar solicitação</button></div></div>}/>
    {groupCreator?<MessageGroupCreator scope={scope} onClose={()=>setGroupCreator(false)} onCreated={(id,warning)=>void createdGroup(id,warning)}/>:null}
    {detailsOpen&&current?<MessageConversationDetails key={current.id} scope={scope} conversation={current} participants={participants} viewerId={viewer} onClose={()=>setDetailsOpen(false)} onUpdated={refreshGroupDetails} onLeft={leftGroup}/>:null}
    <ModalMensagem aberto={settingsOpen&&Boolean(settings)} titulo="Mensagens deste ambiente" mostrarBotaoOk={false} onFechar={()=>setSettingsOpen(false)} mensagem={<div className={styles.modalBody}>
      <label><input type="checkbox" checked={Boolean(settings?.enabled)} onChange={e=>void changeSetting("enabled",e.target.checked)}/> Ativar mensagens</label>
      <label><input type="checkbox" checked={Boolean(settings?.directMessagesEnabled)} onChange={e=>void changeSetting("directMessagesEnabled",e.target.checked)}/> Permitir conversas diretas</label>
      <div className={styles.modalButtons}><button onClick={()=>setSettingsOpen(false)}>Concluir</button></div>
    </div>}/>
    <ConfirmActionModal open={Boolean(deleteTarget)} title={deleteTarget?.mode==="everyone"?"Apagar para todos?":"Apagar para mim?"} description={deleteTarget?.mode==="everyone"?"As mensagens serão removidas da conversa. Cópias já baixadas não podem ser eliminadas.":"As mensagens deixarão de aparecer apenas para você."} confirmLabel="Apagar" tone="danger" busy={busy} onCancel={()=>setDeleteTarget(null)} onConfirm={()=>void removeSelected()}/>
    <MessageImageEditor file={imageEdit} onClose={()=>setImageEdit(null)} onReady={file=>setPendingFile(file)}/>
  </main>;
}
