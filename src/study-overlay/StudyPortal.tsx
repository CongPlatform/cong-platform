import {useCallback,useEffect,useRef,useState} from 'react';
import {Link, useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {study,type State} from './client';
import {getStoredAuthToken} from '../services/api';
import {storeActiveOrganizationId} from '../services/organizationStorage';
import {useAuth} from '../contexts/auth-context';
import styles from './Study.module.css';

const empty={completed:false,help:false,difficulty:3,confidence:3,understood:'',difficultyText:''};
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
 const submitFinal=()=>action(async()=>{await study('/finish',{answers:final});setDone(true);});
 return <main className={styles.page}>
  <section className={styles.card}>
   <p className={styles.eyebrow}>CONG · Pesquisa experimental</p><h1>Seu espaço de pesquisa</h1><p className={styles.warning}>Esta etapa continua mesmo se você atualizar ou fechar a aba. Para retomar, abra este mesmo endereço no mesmo navegador. Seus registros ficam salvos no servidor.</p>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {busy&&<p role="status">Salvando no servidor…</p>}
   {!state&&!busy&&<p>Para iniciar, conclua o teste de familiaridade em <a href="https://teste.cong.com.br">teste.cong.com.br</a> e use o botão de continuação. O código dessa etapa é temporário e válido uma única vez.</p>}
   {state&&<><div className={styles.kpis}><span>Participante <strong>{state.participantCode}</strong></span><span>Etapas concluídas <strong>{state.runs.filter(r=>r.status==='submitted').length}/2</strong></span></div>
    {state.status==='completed'||done?<><h2>Avaliação finalizada</h2><p>Obrigado pela participação. Seus registros foram enviados. O aplicador fará a conferência dos critérios do protocolo.</p></>:
    current?<>
     <p className={styles.eyebrow}>{current.scenario_code} · {current.family} · {current.ngo} · execução {current.sequence_number} de 2</p>
     <h2>{current.condition==='com_ia'?'Condição: com IA':'Condição: sem IA'} · Versão {current.version}</h2>
     <div className={styles.instructions}><strong>Enunciado da tarefa</strong><p>{current.prompt}</p></div>
     {current.status==='assigned'?<><p>Leia as instruções. Ao iniciar, uma conta de laboratório exclusiva será aberta automaticamente na CONG, com acompanhamento flutuante visível. Seu horário será registrado no servidor.</p>
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
        <h3>Encerrar execução</h3>
        <label className={styles.field}><span>Você conseguiu concluir a tarefa?</span><select value={String(form.completed)} onChange={e=>setForm(f=>({...f,completed:e.target.value==='true'}))}><option value="false">Não</option><option value="true">Sim, acredito que concluí</option></select></label>
        <label className={styles.field}><span>Você precisou de ajuda humana?</span><select value={String(form.help)} onChange={e=>setForm(f=>({...f,help:e.target.value==='true'}))}><option value="false">Não</option><option value="true">Sim</option></select></label>
        <label className={styles.field}><span>Facilidade percebida (1 muito difícil, 5 muito fácil)</span><select value={form.difficulty} onChange={e=>setForm(f=>({...f,difficulty:Number(e.target.value)}))}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>
        <label className={styles.field}><span>Confiança no resultado (1 baixa, 5 alta)</span><select value={form.confidence} onChange={e=>setForm(f=>({...f,confidence:Number(e.target.value)}))}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>
        <label className={styles.field}><span>Você compreendeu o resultado?</span><select value={form.understood} onChange={e=>setForm(f=>({...f,understood:e.target.value}))}><option value=''>Selecione</option><option value='sim'>Sim</option><option value='parcialmente'>Parcialmente</option><option value='nao'>Não</option></select></label>
        <label className={styles.field}><span>Dificuldade encontrada (opcional)</span><textarea maxLength={500} value={form.difficultyText} onChange={e=>setForm(f=>({...f,difficultyText:e.target.value}))}/></label>
        <button className={styles.primary} disabled={busy||!form.understood} onClick={finish}>Registrar e finalizar esta execução</button></>}
    </>:<>
     <h2>Questionário final</h2><p>Você terminou as duas execuções. Registre suas percepções antes de encerrar.</p>
     {finalQuestions.map((q,i)=><label className={styles.field} key={i}><span>Q{String(i+1).padStart(2,'0')} — {q}</span><select value={final[`Q${String(i+1).padStart(2,'0')}`]??''} onChange={e=>setFinal(f=>({...f,[`Q${String(i+1).padStart(2,'0')}`]:e.target.value}))}><option value=''>Selecione</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}{i>=4&&<option value='na'>Não aplicável (não tive acesso real à IA)</option>}</select></label>)}
     <label className={styles.field}>Qual foi sua maior dificuldade?<textarea maxLength={600} value={final.dificuldade_aberta??''} onChange={e=>setFinal(f=>({...f,dificuldade_aberta:e.target.value}))}/></label>
     <label className={styles.field}>O que mudaria na plataforma ou na assistência?<textarea maxLength={600} value={final.mudaria_aberta??''} onChange={e=>setFinal(f=>({...f,mudaria_aberta:e.target.value}))}/></label>
     <p className={styles.warning}>Q05–Q10 só devem ser respondidas quando houve contato real com a IA. Se não houve, selecione Não aplicável.</p>
     <button className={styles.primary} disabled={busy||Array.from({length:10},(_,i)=>final[`Q${String(i+1).padStart(2,'0')}`]).some(v=>!v)} onClick={submitFinal}>Enviar questionário e concluir</button>
    </>}
   </>}
  </section>
  <p className={styles.small}><Link to="/pesquisa/observador">Área do observador</Link></p>
 </main>;
}

export function StudyDock(){
 const [state,setState]=useState<State|null>(null),[,setTick]=useState(0),[status,setStatus]=useState(''),[collapsed,setCollapsed]=useState(false),[sessionIssue,setSessionIssue]=useState(false);const location=useLocation();
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
 return <aside className={`${styles.dock} ${collapsed?styles.dockCollapsed:''}`} aria-label="Camada flutuante e permanente da pesquisa">
  <div className={styles.dockHead}><span>CONG · Pesquisa em andamento</span><strong>{state?.participantCode} · {clock(active.started_at)}</strong><button type="button" aria-expanded={!collapsed} aria-controls="cong-study-dock-body" onClick={()=>setCollapsed(v=>!v)}>{collapsed?'Expandir':'Recolher'}</button></div>
  <div id="cong-study-dock-body" className={styles.dockBody} hidden={collapsed}>
   <p><strong>Etapa {active.sequence_number} de 2 · {active.condition==='com_ia'?'Com IA':'Sem IA'}</strong></p>
   <p className={styles.dockPrompt}>{active.prompt}</p>
   <p>O acompanhamento permanece até você registrar a conclusão. Se fechar a página, retorne no mesmo navegador.</p>
   <button onClick={()=>void event('help_request')}>Pedir ajuda ao observador</button>
   <button onClick={()=>void event('technical_issue')}>Registrar falha técnica</button>
   <Link className={styles.primaryLink} to="/pesquisa/entrar">Registrar conclusão da tarefa</Link>
   {status&&<small role="status">{status}</small>}
  </div>
 </aside>;
}
