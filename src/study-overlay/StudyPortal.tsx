import {useCallback,useEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {Link, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {study,type State} from './client';
import {getStoredAuthToken} from '../services/api';
import {storeActiveOrganizationId} from '../services/organizationStorage';
import {useAuth} from '../contexts/auth-context';
import styles from './Study.module.css';

const empty={completed:null as boolean|null,help:null as boolean|null,difficulty:0,confidence:0,understood:'',difficultyText:''};
const finalQuestions=[
 'Foi fácil entender os passos necessários para utilizar a CONG.',
 'Consegui encontrar os recursos necessários para concluir a tarefa.',
 'A CONG deixou claro quando uma configuração foi salva ou apresentou erro.',
 'Consegui realizar as atividades com autonomia.',
 'As explicações da IA foram compreensíveis.',
 'As configurações propostas pela IA atenderam à solicitação.',
 'Consegui conferir e corrigir a proposta antes de salvá-la.',
 'A ajuda da IA reduziu minha necessidade de pedir orientação a outra pessoa.',
 'Confiei nas orientações recebidas da IA.',
 'Gostaria de ter o assistente disponível ao utilizar a CONG.'
];
function clock(t:string|null):string {if(!t)return '--:--';const delta=Math.max(0,Math.floor((Date.now()-new Date(t).getTime())/1000));return `${String(Math.floor(delta/60)).padStart(2,'0')}:${String(delta%60).padStart(2,'0')}`;}
export function StudyPortal(){
 const {establishSession} = useAuth();
 const [sp]=useSearchParams();const navigate=useNavigate();const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[form,setForm]=useState(empty),[final,setFinal]=useState<Record<string,string>>({});
 const [done,setDone]=useState(false),[tick,setTick]=useState(0);const handoffSeen=useRef(false);
 const refresh=useCallback(async()=>{try{setState(await study<State>('/me'));setError('');}catch(e){setError((e as Error).message);}},[]);
 useEffect(()=>{const ticket=sp.get('ticket');if(ticket && !handoffSeen.current){handoffSeen.current=true;setBusy(true);study('/handoff',{ticket}).then(()=>{window.history.replaceState(null,'',window.location.pathname);return refresh();}).catch(e=>setError((e as Error).message)).finally(()=>setBusy(false));}else {void refresh();}},[sp,refresh]);
 useEffect(()=>{const id=window.setInterval(()=>setTick(x=>x+1),1000);return()=>clearInterval(id);},[]);
 useEffect(()=>{
   if(!state?.runs.some(r=>r.status==='running'))return;
   const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
   window.addEventListener('beforeunload',warn);
   return()=>window.removeEventListener('beforeunload',warn);
 },[state]);

 const action=async(fn:()=>Promise<unknown>,afterSuccess?:()=>void)=>{setBusy(true);setError('');try{await fn();await refresh();afterSuccess?.();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const current=state?.runs.find(r=>r.status!=='submitted');
 const active=state?.runs.find(r=>r.status==='running');
 const enterWorkspace=()=>current&&action(async()=>{
  const currentToken=getStoredAuthToken();
  const marker=sessionStorage.getItem('cong:study-workspace-participant');
  if(currentToken && marker!==state?.participantCode){
   throw new Error('Este navegador está conectado a outra conta. Abra a pesquisa em janela anônima para não substituir uma sessão pessoal.');
  }
  const credentials=await study<{accessToken:string;refreshToken:string;organizationId:string;participantCode:string}>('/workspace/access',{});
  await establishSession(credentials.accessToken,credentials.refreshToken,false);
  storeActiveOrganizationId(credentials.organizationId);
  sessionStorage.setItem('cong:study-workspace-participant',credentials.participantCode);
  if(current.status==='assigned')await study(`/run/${current.sequence_number}/start`,{});
 },()=>{
  const isSystem=/sistem|gest[aã]o|cadastro/i.test(`${current.family} ${current.prompt}`);
  const destination=current.condition==='com_ia'?'/app/assistente-ia':isSystem?'/app/sistemas':'/app/site-institucional';
  navigate(destination,{replace:true});
 });
 const start=enterWorkspace;
 const finish=()=>active&&action(async()=>{await study(`/run/${active.sequence_number}/finish`,form);setForm({...empty});});
 const submitFinal=()=>action(async()=>{await study('/finish',{answers:{...final,instrument_version:'cong_v4_13_2026_10_27'}});setDone(true);});
 const answerCount=Array.from({length:10},(_,i)=>final[`Q${String(i+1).padStart(2,'0')}`]).filter(Boolean).length;
 const canFinishRun=typeof form.completed==='boolean'&&typeof form.help==='boolean'&&form.difficulty>=1&&form.confidence>=1&&!!form.understood;
 return <main className={styles.page}>
  <section className={styles.card}>
   <div className={styles.hero}><div className={styles.heroOrbit} aria-hidden="true">✳</div><p className={styles.eyebrow}>CONG / LABORATÓRIO DE PESQUISA</p><h1>Seu espaço de pesquisa<span className={styles.heroDot}>.</span></h1><p>Um ambiente reservado para executar as tarefas e registrar suas percepções com tranquilidade.</p></div><p className={styles.notice}>Seus registros são salvos no servidor. Para continuar uma sessão iniciada, utilize este mesmo navegador.</p>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {busy&&<p role="status">Salvando no servidor…</p>}
   {!state&&!busy&&<p>Para iniciar, conclua o teste de familiaridade em <a href="https://teste.cong.com.br">teste.cong.com.br</a> e use o botão de continuação. O código dessa etapa é temporário e válido uma única vez.</p>}
   {state&&<><div className={styles.kpis}><span>Identificação <strong>{state.participantCode}</strong></span><span>Execuções concluídas <strong>{state.runs.filter(r=>r.status==='submitted').length} de 2</strong></span><span>Situação <strong>{state.status==='completed'?'Finalizada':'Em andamento'}</strong></span></div><div className={styles.progressTrack} role="progressbar" aria-label="Execuções concluídas" aria-valuemin={0} aria-valuemax={2} aria-valuenow={state.runs.filter(r=>r.status==='submitted').length}><div style={{width:`${state.runs.filter(r=>r.status==='submitted').length*50}%`}}/></div>
    {state.status==='completed'||done?<><h2>Avaliação finalizada</h2><p>Obrigado pela participação. Seus registros foram enviados. O aplicador fará a conferência dos critérios do protocolo.</p></>:
    current?<>
     <p className={styles.eyebrow}>{current.scenario_code} · {current.family} · {current.ngo} · execução {current.sequence_number} de 2</p>
     <h2>Execução {current.sequence_number} <span className={styles.tag}>{current.condition==='com_ia'?'Assistência com IA':'Sem assistência de IA'}</span></h2>
     <div className={styles.instructions}><strong>Enunciado da tarefa</strong><p>{current.prompt}</p></div>
     {current.status==='assigned'?<><p>Leia o desafio com atenção. Ao começar, abriremos seu ambiente individual na CONG; o painel de acompanhamento poderá ser movido pela tela.</p>
       <button className={styles.primary} disabled={busy} onClick={start}>Iniciar execução {current.sequence_number}</button></>:
       <><p className={styles.clock} key={tick}>Tempo decorrido: {clock(current.started_at)}</p>
        <p>A tarefa está em andamento. Você pode explorar a CONG com a camada flutuante. Você está em uma sessão individual do laboratório; seus projetos não são compartilhados com outros participantes.</p>
        <nav aria-label="Acessar a CONG" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          <button className={styles.primary} disabled={busy} onClick={enterWorkspace}>Entrar no editor da tarefa</button>
          {getStoredAuthToken()&&<>
          <Link className={styles.primaryLink} to="/app/sistemas">Abrir sistemas</Link>
          <Link className={styles.primaryLink} to="/app/site-institucional">Abrir sites</Link>
          {current.condition==='com_ia'&&<Link className={styles.primaryLink} to="/app/assistente-ia">Abrir assistente CONG</Link>}
          </>}
        </nav>
        <p className={styles.warning}>A condição com/sem IA depende de validação técnica; se uma ação do enunciado estiver indisponível, registre uma falha técnica. Não declare uma tarefa como concluída se não a realizou.</p>
        <div className={styles.formIntro}><span className={styles.stepPill}>AVALIAÇÃO PÓS-TAREFA</span><h3>Como foi sua experiência?</h3><p>Responda sobre a execução que você acabou de realizar. Não existem respostas certas ou erradas. Se alguma exigência não estava disponível na CONG, informe no campo de dificuldades.</p></div>
        <label className={styles.field}><span>Você conseguiu concluir a tarefa?</span><select value={form.completed===null?'':String(form.completed)} onChange={e=>setForm(f=>({...f,completed:e.target.value==='true'}))}><option value="" disabled>Selecione sua resposta</option><option value="true">Sim, acredito que concluí</option><option value="false">Não consegui concluir</option></select></label>
        <label className={styles.field}><span>Você precisou de ajuda humana?</span><select value={form.help===null?'':String(form.help)} onChange={e=>setForm(f=>({...f,help:e.target.value==='true'}))}><option value="" disabled>Selecione sua resposta</option><option value="false">Não</option><option value="true">Sim</option></select></label>
        <div className={styles.field}><span>Facilidade percebida (1 muito difícil, 5 muito fácil)</span><div className={styles.scale} role="radiogroup" aria-label="Facilidade da tarefa">{[1,2,3,4,5].map(n=><label key={n} className={form.difficulty===n?styles.chosen:''}><input type="radio" name="difficulty" value={n} checked={form.difficulty===n} onChange={()=>setForm(f=>({...f,difficulty:n}))}/>{n}</label>)}</div><div className={styles.scaleEnds}><span>Muito difícil</span><span>Muito fácil</span></div></div>
        <div className={styles.field}><span>Confiança no resultado (1 baixa, 5 alta)</span><div className={styles.scale} role="radiogroup" aria-label="Confiança no resultado">{[1,2,3,4,5].map(n=><label key={n} className={form.confidence===n?styles.chosen:''}><input type="radio" name="confidence" value={n} checked={form.confidence===n} onChange={()=>setForm(f=>({...f,confidence:n}))}/>{n}</label>)}</div><div className={styles.scaleEnds}><span>Muito baixa</span><span>Muito alta</span></div></div>
        <label className={styles.field}><span>Você compreendeu o resultado?</span><select value={form.understood} onChange={e=>setForm(f=>({...f,understood:e.target.value}))}><option value=''>Selecione</option><option value='sim'>Sim</option><option value='parcialmente'>Parcialmente</option><option value='nao'>Não</option></select></label>
        <label className={styles.field}><span>Dificuldade encontrada (opcional)</span><textarea maxLength={500} value={form.difficultyText} onChange={e=>setForm(f=>({...f,difficultyText:e.target.value}))}/></label>
        <button className={styles.primary} disabled={busy||!canFinishRun} onClick={finish}>Enviar avaliação da execução {current.sequence_number} <span aria-hidden="true">→</span></button><p className={styles.hint}>Ao enviar, esta execução será encerrada no servidor. {current.sequence_number===1?'Em seguida você verá as orientações da segunda execução.':'Em seguida será exibido o questionário final.'}</p></>}
    </>:<>
     <div className={styles.formIntro}><span className={styles.stepPill}>ETAPA FINAL · {answerCount}/10 RESPOSTAS</span><h2>Avaliação da experiência</h2><p>Pense nas duas execuções realizadas. Leia cada afirmação e indique o quanto você concorda, de 1 (discordo totalmente) a 5 (concordo totalmente).</p><p className={styles.hint}>Nas afirmações sobre IA, escolha “Não se aplica” apenas quando você realmente não teve contato com a assistência de IA.</p></div>
     <div className={styles.progressTrack} role="progressbar" aria-label="Questões respondidas" aria-valuemin={0} aria-valuemax={10} aria-valuenow={answerCount}><div style={{width:`${answerCount*10}%`}}/></div>
     <div className={styles.surveyGroup}><h3>01 / Experiência na CONG</h3><p>Avalie a navegação, as configurações e a autonomia durante as tarefas.</p>
     {finalQuestions.slice(0,4).map((q,i)=>{const code=`Q${String(i+1).padStart(2,'0')}`;return <fieldset className={styles.question} key={code}><legend><span className={styles.questionNumber}>{code}</span> {q}</legend><div className={styles.scale}>{[1,2,3,4,5].map(n=><label key={n} className={final[code]===String(n)?styles.chosen:''}><input type="radio" name={code} value={n} checked={final[code]===String(n)} onChange={()=>setFinal(v=>({...v,[code]:String(n)}))}/>{n}</label>)}</div><div className={styles.scaleEnds}><span>Discordo totalmente</span><span>Concordo totalmente</span></div></fieldset>;})}</div>
     <div className={styles.surveyGroup}><h3>02 / Assistência de IA</h3><p>Considere somente a execução na qual a assistência estava disponível.</p>
     {finalQuestions.slice(4).map((q,i)=>{const code=`Q${String(i+5).padStart(2,'0')}`;return <fieldset className={styles.question} key={code}><legend><span className={styles.questionNumber}>{code}</span> {q}</legend><div className={styles.scale}>{[1,2,3,4,5].map(n=><label key={n} className={final[code]===String(n)?styles.chosen:''}><input type="radio" name={code} value={n} checked={final[code]===String(n)} onChange={()=>setFinal(v=>({...v,[code]:String(n)}))}/>{n}</label>)}</div><label className={styles.naOption}><input type="radio" name={code} checked={final[code]==='na'} onChange={()=>setFinal(v=>({...v,[code]:'na'}))}/> Não se aplica — não tive contato real com a IA</label><div className={styles.scaleEnds}><span>Discordo totalmente</span><span>Concordo totalmente</span></div></fieldset>;})}</div>
     <div className={styles.surveyGroup}><h3>03 / Comentários opcionais</h3><p>Suas observações ajudam a interpretar dificuldades que as escalas não conseguem representar.</p>
     <label className={styles.field}>Qual foi sua maior dificuldade?<textarea maxLength={600} placeholder="Descreva uma dificuldade, caso tenha ocorrido" value={final.dificuldade_aberta??''} onChange={e=>setFinal(f=>({...f,dificuldade_aberta:e.target.value}))}/></label>
     <label className={styles.field}>O que mudaria na plataforma ou na assistência?<textarea maxLength={600} placeholder="Sugestões e observações (opcional)" value={final.mudaria_aberta??''} onChange={e=>setFinal(f=>({...f,mudaria_aberta:e.target.value}))}/></label></div>
     <button className={styles.primary} disabled={busy||answerCount<10} onClick={submitFinal}>Enviar respostas e finalizar pesquisa <span aria-hidden="true">→</span></button>
     {answerCount<10&&<p className={styles.hint}>Faltam {10-answerCount} resposta(s) para concluir. Nenhuma resposta será enviada antes de você confirmar.</p>}
    </>}
   </>}
  </section>
  <p className={styles.small}><Link to="/pesquisa/observador">Área do observador</Link></p>
 </main>;
}

export function StudyDock(){
 const [state,setState]=useState<State|null>(null),[,setTick]=useState(0),[status,setStatus]=useState(''),[collapsed,setCollapsed]=useState(()=>localStorage.getItem('cong:study-dock-collapsed')==='1'),[sessionIssue,setSessionIssue]=useState(false);const location=useLocation();
 const [position,setPosition]=useState<{x:number;y:number}|null>(()=>{try{const v=JSON.parse(localStorage.getItem('cong:study-dock-position')||'null');return v&&Number.isFinite(v.x)&&Number.isFinite(v.y)?v:null;}catch{return null;}});
 const dockRef=useRef<HTMLElement|null>(null),dragRef=useRef<{id:number;x:number;y:number;startX:number;startY:number}|null>(null);
 const clampPosition=useCallback((p:{x:number;y:number})=>({x:Math.max(8,Math.min(p.x,window.innerWidth-(dockRef.current?.offsetWidth||390)-8)),y:Math.max(8,Math.min(p.y,window.innerHeight-(dockRef.current?.offsetHeight||90)-8))}),[]);
 const dragStart=(e:PointerEvent<HTMLDivElement>)=>{if((e.target as HTMLElement).closest('button,a')||e.button!==0)return;const rect=dockRef.current?.getBoundingClientRect();if(!rect)return;dragRef.current={id:e.pointerId,x:e.clientX,y:e.clientY,startX:rect.left,startY:rect.top};e.currentTarget.setPointerCapture(e.pointerId);};
 const dragMove=(e:PointerEvent<HTMLDivElement>)=>{const d=dragRef.current;if(!d||d.id!==e.pointerId)return;setPosition(clampPosition({x:d.startX+e.clientX-d.x,y:d.startY+e.clientY-d.y}));};
 const dragEnd=(e:PointerEvent<HTMLDivElement>)=>{if(dragRef.current?.id!==e.pointerId)return;dragRef.current=null;try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}};
 const moveKey=(e:KeyboardEvent<HTMLDivElement>)=>{const directions:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};const d=directions[e.key];if(!d)return;e.preventDefault();const rect=dockRef.current?.getBoundingClientRect();if(!rect)return;setPosition(clampPosition({x:rect.left+d[0]*(e.shiftKey?40:16),y:rect.top+d[1]*(e.shiftKey?40:16)}));};
 useEffect(()=>{localStorage.setItem('cong:study-dock-collapsed',collapsed?'1':'0');},[collapsed]);
 useEffect(()=>{if(position)localStorage.setItem('cong:study-dock-position',JSON.stringify(position));},[position]);
 useEffect(()=>{const onResize=()=>setPosition(p=>p?clampPosition(p):null);window.addEventListener('resize',onResize);return()=>window.removeEventListener('resize',onResize);},[clampPosition]);
 const active=state?.runs.find(r=>r.status==='running');
 // A conta tecnica e a sessao experimental sao coisas distintas. Depois que o
 // participante entra no laboratorio, a camada deve funcionar mesmo quando o
 // frontend foi iniciado sem VITE_STUDY_ENABLED. O backend valida o cookie real.
 useEffect(()=>{
  const hasWorkspaceMarker=Boolean(sessionStorage.getItem('cong:study-workspace-participant'));
  const isEditor=location.pathname.startsWith('/app/');
  if(import.meta.env.VITE_STUDY_ENABLED!=='true' && !hasWorkspaceMarker && !isEditor)return;
  let mounted=true;
  void study<State>('/me').then(value=>{
   if(!mounted)return;
   setState(value);setSessionIssue(false);
  }).catch(()=>{
   if(!mounted)return;
   setState(null);setSessionIssue(hasWorkspaceMarker);
  });
  return()=>{mounted=false;};
 },[location.pathname]);
 useEffect(()=>{const t=window.setInterval(()=>setTick(x=>x+1),1000);return()=>clearInterval(t);},[]);
 useEffect(()=>{if(!active)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',warn);
  return()=>window.removeEventListener('beforeunload',warn);
 },[active?.id]);
 useEffect(()=>{if(!active || window.location.pathname.startsWith('/pesquisa'))return;
  void study(`/run/${active.sequence_number}/event`,{type:'navigation',details:window.location.pathname.slice(0,150)}).catch(()=>{});
 },[active,location.pathname]);
 if(window.location.pathname.startsWith('/pesquisa'))return null;
 if(!active){
  // Nao esconder silenciosamente a pesquisa se o cookie nao puder ser retomado.
  // O marcador e apenas local: nunca concede acesso e nao contem a tarefa.
  if(sessionIssue && sessionStorage.getItem('cong:study-workspace-participant') && location.pathname.startsWith('/app/')){
   return <aside className={styles.dock} role="status" aria-label="Acompanhamento da pesquisa indisponivel">
    <div className={styles.dockHead}>
     <span>CONG · Pesquisa</span><strong>Sessão experimental não encontrada</strong>
    </div>
    <div className={styles.dockBody}>
     <p>Seu acesso ao laboratório está ativo, mas não foi possível recuperar a tarefa. Não continue sem o acompanhamento.</p>
     <Link className={styles.primaryLink} to="/pesquisa/entrar">Tentar retomar a pesquisa</Link>
    </div>
   </aside>;
  }
  return null;
 }
 const event=async(type:'help_request'|'technical_issue')=>{try{await study(`/run/${active.sequence_number}/event`,{type,details:type==='help_request'?'Participante solicitou ajuda':'Participante informou falha técnica'});setStatus('Registro enviado ao aplicador.');}catch{setStatus('Não foi possível registrar. Retorne à pesquisa.');}};
 return <aside ref={dockRef} style={position?{left:position.x,top:position.y,right:'auto',bottom:'auto'}:undefined} className={`${styles.dock} ${collapsed?styles.dockCollapsed:''}`} aria-label="Camada flutuante e permanente da pesquisa">
  <div className={styles.dockHead} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd} onKeyDown={moveKey} role="group" tabIndex={0} aria-label="Mover painel: arraste ou use as setas do teclado" title="Arraste para mover · setas do teclado para ajustar"><span className={styles.dragLabel}>⋮⋮ &nbsp; CONG / PESQUISA <span className={styles.liveDot} aria-hidden="true"/></span><strong>{state?.participantCode} <span aria-hidden="true">·</span> {clock(active.started_at)}</strong><button type="button" aria-expanded={!collapsed} aria-controls="cong-study-dock-body" onClick={()=>setCollapsed(v=>!v)}>{collapsed?'Expandir':'Recolher'}</button></div>
  <div id="cong-study-dock-body" className={styles.dockBody} hidden={collapsed}>
   <div className={styles.dockMeta}><span>EXECUÇÃO {active.sequence_number} / 2</span><span className={styles.dockChip}>{active.condition==='com_ia'?'Com IA':'Sem IA'}</span></div>
   <div className={styles.dockProgress}><div style={{width:`${active.sequence_number*50}%`}}/></div>
   <p className={styles.dockLabel}>SUA MISSÃO</p><p className={styles.dockPrompt}>{active.prompt}</p>
   <p className={styles.dockTip}>Você pode mover este painel pelo cabeçalho, recolhê-lo e continuar trabalhando na CONG.</p>
   <div className={styles.dockActions}><button onClick={()=>void event('help_request')}>Solicitar ajuda</button><button onClick={()=>void event('technical_issue')}>Relatar problema</button></div>
   <Link className={styles.dockFinish} to="/pesquisa/entrar">Registrar conclusão da tarefa <span aria-hidden="true">→</span></Link><small>Abra a avaliação mesmo que não tenha conseguido realizar a tarefa. O registro no servidor é concluído quando você envia as respostas.</small>
   {status&&<small role="status">{status}</small>}
  </div>
 </aside>;
}
