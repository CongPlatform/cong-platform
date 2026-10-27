import {useEffect,useState} from 'react';
import {study,type ObserverRun} from './client';
import {getStoredAuthToken} from '../services/api';
import styles from './Study.module.css';
export default function StudyObserver(){
 const [key,setKey]=useState(''),[runs,setRuns]=useState<ObserverRun[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState<ObserverRun|null>(null);
 const [resetMode,setResetMode]=useState<'simulations'|'all'|null>(null),[confirmation,setConfirmation]=useState(''),[resetDone,setResetDone]=useState('');
 const [checks,setChecks]=useState<boolean[]>([false,false,false,false,false,false]),[help,setHelp]=useState(0),[errors,setErrors]=useState(0),[notes,setNotes]=useState('');
 const load=async()=>{setRuns(await study<ObserverRun[]>('/observer/runs'));};
 useEffect(()=>{let cancelled=false;void study<ObserverRun[]>('/observer/runs').then(items=>{if(!cancelled)setRuns(items);}).catch(()=>{});return()=>{cancelled=true;};},[]);
 const login=async()=>{setBusy(true);try{await study('/observer/login',{key});setKey('');await load();setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const pick=(r:ObserverRun)=>{setSelected(r);setChecks(Array.isArray(r.observer_criteria)?r.observer_criteria:[false,false,false,false,false,false]);setHelp(r.observer_help_count);setErrors(r.observer_error_count);setNotes(r.observer_notes??'');};
 const save=async()=>{if(!selected)return;setBusy(true);try{await study(`/observer/run/${selected.id}/score`,{criteria:checks,help,errors,notes});await load();setSelected(null);setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const localPreview=import.meta.env.DEV;
 const simulate=async()=>{setBusy(true);setError('');try{await study('/observer/dev/simulate',{});window.location.assign('/pesquisa/entrar');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const reset=async()=>{
  if(!resetMode)return;
  const expected=resetMode==='all'?'REINICIAR PESQUISA':'APAGAR SIMULACOES';
  if(confirmation!==expected){setError('Digite a confirmação exatamente como exibida.');return;}
  const token=getStoredAuthToken();
  if(!token){setError('Entre na CONG com a conta administrativa antes de limpar dados.');return;}
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/study/observer/reset',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({mode:resetMode,confirmation,ackNoRecovery:true})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Não foi possível limpar dados');
   setResetDone(`${result.deletedParticipants} participante(s) removido(s).`);setConfirmation('');setResetMode(null);await load();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 const rubric=selected?.rubric.split(' / ')??[];
 return <main className={styles.page}><section className={styles.card}><p className={styles.eyebrow}>CONG · Acesso restrito</p><h1>Observador da pesquisa</h1>{error&&<p className={styles.error} role="alert">{error}</p>}
  {runs===null?<><p>Digite a credencial de observação configurada no servidor.</p><input className={styles.field} type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)}/><button className={styles.primary} disabled={busy} onClick={login}>Entrar</button></>:
  <><p><strong>{new Set(runs.map(r=>r.participant_code)).size} participantes registrados</strong> · {new Set(runs.filter(r=>r.cohort==='Adicional').map(r=>r.participant_code)).size} adicionais (P061+)</p><p>Resultados declarados pelos participantes não equivalem à correção. Confirme cada critério no artefato salvo antes de marcar.</p><section className={styles.adminTools} aria-label="Ferramentas de homologação">
    <h2>Ferramentas de homologação</h2><p>Os dados oficiais permanecem separados das simulações locais identificadas. Reiniciar uma coleta real é irreversível.</p>
    {localPreview&&<button disabled={busy} onClick={simulate}>Iniciar participante fictício local (sem familiaridade)</button>}
    <button disabled={busy} onClick={()=>{setResetMode('simulations');setConfirmation('');setResetDone('');}}>Apagar somente simulações</button>
    <button disabled={busy} onClick={()=>{setResetMode('all');setConfirmation('');setResetDone('');}}>Reiniciar toda a pesquisa</button>
    {resetMode&&<div className={styles.resetConfirm} role="dialog" aria-modal="true" aria-label="Confirmação de limpeza dos dados">
      <h3>{resetMode==='all'?'Reiniciar toda a coleta':'Apagar simulações locais'}</h3>
      <p>{resetMode==='all'?'Isso elimina todos os registros experimentais e libera os códigos para uma nova coleta. Não apaga contas, sites nem sistemas. Faça backup dos CSVs antes.':'Isso elimina apenas participantes fictícios criados pela simulação local, sem mexer nos participantes reais.'}</p>
      <p>Confirme digitando <strong>{resetMode==='all'?'REINICIAR PESQUISA':'APAGAR SIMULACOES'}</strong></p>
      <input aria-label="Frase de confirmação" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" />
      <button disabled={busy||confirmation!==(resetMode==='all'?'REINICIAR PESQUISA':'APAGAR SIMULACOES')} onClick={()=>void reset()}>Confirmar limpeza</button>
      <button disabled={busy} onClick={()=>{setResetMode(null);setConfirmation('');}}>Cancelar</button>
      <p>Exige sessão de observador e login na conta administrativa autorizada da CONG.</p>
    </div>}
    {resetDone&&<p role="status">{resetDone}</p>}
   </section><p><a href="/api/study/observer/export.csv" download>Exportar execuções (CSV)</a> · <a href="/api/study/observer/events.csv" download>Eventos (CSV)</a> · <a href="/api/study/observer/feedback.csv" download>Questionários (CSV)</a></p>
   <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Código</th><th>Roteiro</th><th>Amostra</th><th>Etapa</th><th>Condição</th><th>Status</th><th>Nota observada</th><th></th></tr></thead><tbody>{runs.map(r=><tr key={r.id}><td>{r.participant_code}</td><td>{r.scenario_code} {r.family}{r.is_simulation?' (SIMULAÇÃO)':r.reused_scenario?' (reutilizado)':''}</td><td>{r.cohort}</td><td>{r.sequence_number} · {r.version}</td><td>{r.condition==='com_ia'?'Com IA':'Sem IA'}</td><td>{r.status}</td><td>{r.observer_criteria?`${r.observer_criteria.filter(Boolean).length}/6`:'Não aferida'}</td><td><button disabled={r.status!=='submitted'} onClick={()=>pick(r)}>Avaliar</button></td></tr>)}</tbody></table></div>
  {selected&&<section className={styles.review}><h2>{selected.participant_code} · {selected.scenario_code} · execução {selected.sequence_number}</h2><p>Antes de pontuar, confira o resultado salvo pela CONG (inclusive após recarga). Não atribua pontos com base apenas no relato ou nos cliques.</p>
   {checks.map((v,i)=><label className={styles.checkbox} key={i}><input type="checkbox" checked={v} onChange={e=>setChecks(c=>c.map((x,j)=>i===j?e.target.checked:x))}/> Critério {i+1}: {rubric[i]??'Consultar protocolo'}</label>)}
   <label className={styles.field}>Intervenções humanas confirmadas<input type="number" min="0" max="99" value={help} onChange={e=>setHelp(Number(e.target.value))}/></label>
   <label className={styles.field}>Erros observados conforme protocolo<input type="number" min="0" max="99" value={errors} onChange={e=>setErrors(Number(e.target.value))}/></label>
   <label className={styles.field}>Observações do aplicador<textarea maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)} /></label><button className={styles.primary} disabled={busy} onClick={save}>Salvar avaliação verificada</button> <button onClick={()=>setSelected(null)}>Cancelar</button>
  </section>}</>}
 </section></main>;
}
