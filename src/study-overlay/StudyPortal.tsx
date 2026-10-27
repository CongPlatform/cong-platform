import {useCallback,useEffect,useRef,useState} from 'react';
import {Link, useLocation, useSearchParams} from 'react-router-dom';
import {study,type State} from './client';
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
 const [sp]=useSearchParams();const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[form,setForm]=useState(empty),[final,setFinal]=useState<Record<string,string>>({});
 const [done,setDone]=useState(false),[tick,setTick]=useState(0);const handoffSeen=useRef(false);
 const refresh=useCallback(async()=>{try{setState(await study<State>('/me'));setError('');}catch(e){setError((e as Error).message);}},[]);
 useEffect(()=>{const ticket=sp.get('ticket');if(ticket && !handoffSeen.current){handoffSeen.current=true;window.history.replaceState(null,'',window.location.pathname);setBusy(true);study('/handoff',{ticket}).then(refresh).catch(e=>setError((e as Error).message)).finally(()=>setBusy(false));}else {void refresh();}},[sp,refresh]);
 useEffect(()=>{const id=window.setInterval(()=>setTick(x=>x+1),1000);return()=>clearInterval(id);},[]);
 const action=async(fn:()=>Promise<unknown>)=>{setBusy(true);setError('');try{await fn();await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const current=state?.runs.find(r=>r.status!=='submitted');
 const active=state?.runs.find(r=>r.status==='running');
 const start=()=>current&&action(()=>study(`/run/${current.sequence_number}/start`,{}));
 const finish=()=>active&&action(async()=>{await study(`/run/${active.sequence_number}/finish`,form);setForm({...empty});});
 const submitFinal=()=>action(async()=>{await study('/finish',{answers:final});setDone(true);});
 return <main className={styles.page}>
  <section className={styles.card}>
   <p className={styles.eyebrow}>CONG · Pesquisa experimental</p><h1>Etapa de utilização da CONG</h1>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   {busy&&<p role="status">Salvando no servidor…</p>}
   {!state&&!busy&&<p>Para iniciar, conclua o teste de familiaridade em <a href="https://teste.cong.com.br">teste.cong.com.br</a> e use o botão de continuação. O código dessa etapa é temporário e válido uma única vez.</p>}
   {state&&<><div className={styles.kpis}><span>Participante <strong>{state.participantCode}</strong></span><span>Etapas concluídas <strong>{state.runs.filter(r=>r.status==='submitted').length}/2</strong></span></div>
    {state.status==='completed'||done?<><h2>Avaliação finalizada</h2><p>Obrigado pela participação. Seus registros foram enviados. O aplicador fará a conferência dos critérios do protocolo.</p></>:
    current?<>
     <p className={styles.eyebrow}>{current.scenario_code} · {current.family} · {current.ngo} · execução {current.sequence_number} de 2</p>
     <h2>{current.condition==='com_ia'?'Condição: com IA':'Condição: sem IA'} · Versão {current.version}</h2>
     <div className={styles.instructions}><strong>Enunciado da tarefa</strong><p>{current.prompt}</p></div>
     {current.status==='assigned'?<><p>Leia as instruções. Ao iniciar, o servidor registra o horário e disponibiliza o painel de acompanhamento sobre a CONG.</p>
       <button className={styles.primary} disabled={busy} onClick={start}>Iniciar execução {current.sequence_number}</button></>:
       <><p className={styles.clock} key={tick}>Tempo decorrido: {clock(current.started_at)}</p>
        <p>O painel flutuante acompanha você durante a navegação. Use somente o ambiente de demonstração autorizado pelo aplicador. Não inclua dados de pessoas reais.</p>
        <nav aria-label="Acessar os construtores da CONG" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          <Link className={styles.primaryLink} to="/app/sistemas">Abrir sistemas</Link>
          <Link className={styles.primaryLink} to="/app/site-institucional">Abrir sites</Link>
          {current.condition==='com_ia'&&<Link className={styles.primaryLink} to="/app/assistente-ia">Abrir assistente CONG</Link>}
        </nav>
        <p className={styles.warning}>Acesse a área de Sistemas Operacionais da ONG fictícia disponibilizada pelo aplicador. A condição com/sem IA depende de configuração e validação técnica do ambiente; se uma ação do enunciado estiver indisponível, registre uma falha técnica. Não declare uma tarefa como concluída se não a realizou.</p>
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
 const [state,setState]=useState<State|null>(null),[collapsed,setCollapsed]=useState(false),[,setTick]=useState(0),[status,setStatus]=useState('');const location=useLocation();
 const active=state?.runs.find(r=>r.status==='running');
 useEffect(()=>{if(import.meta.env.VITE_STUDY_ENABLED!=='true')return;void study<State>('/me').then(setState).catch(()=>setState(null));},[location.pathname]);
 useEffect(()=>{const t=window.setInterval(()=>setTick(x=>x+1),1000);return()=>clearInterval(t);},[]);
 useEffect(()=>{if(!active)return; const path=window.location.pathname;if(path.startsWith('/pesquisa'))return;
  void study(`/run/${active.sequence_number}/event`,{type:'navigation',details:path.slice(0,150)}).catch(()=>{});
 },[active,location.pathname]);
 if(window.location.pathname.startsWith('/pesquisa')||!active)return null;
 const event=async(type:string)=>{try{await study(`/run/${active.sequence_number}/event`,{type,details:type==='help_request'?'Participante solicitou ajuda':'Participante informou falha técnica'});setStatus('Registro enviado ao aplicador.');}catch{setStatus('Não foi possível registrar. Retorne à pesquisa.');}};
 return <aside className={styles.dock} aria-label="Painel da pesquisa"><button className={styles.dockHead} onClick={()=>setCollapsed(!collapsed)} aria-expanded={!collapsed}>Pesquisa · {state?.participantCode} · {clock(active.started_at)} · {collapsed?'+':'−'}</button>{!collapsed&&<div className={styles.dockBody}>
  <p><strong>{active.condition==='com_ia'?'Com IA':'Sem IA'}</strong> · versão {active.version} · {active.ngo}</p><p>{active.prompt}</p>
  <button onClick={()=>void event('help_request')}>Pedir ajuda ao observador</button><button onClick={()=>void event('technical_issue')}>Registrar falha técnica</button>
  <Link to="/pesquisa/entrar">Voltar e concluir a execução</Link>{status&&<small role="status">{status}</small>}
 </div>}</aside>;
}
