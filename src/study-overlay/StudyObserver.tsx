import {useEffect,useState} from 'react';
import {study,type ObserverRun} from './client';
import styles from './Study.module.css';
export default function StudyObserver(){
 const [key,setKey]=useState(''),[runs,setRuns]=useState<ObserverRun[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState<ObserverRun|null>(null);
 const [checks,setChecks]=useState<boolean[]>([false,false,false,false,false,false]),[help,setHelp]=useState(0),[errors,setErrors]=useState(0),[notes,setNotes]=useState('');
 const load=async()=>{setRuns(await study<ObserverRun[]>('/observer/runs'));};
 useEffect(()=>{let cancelled=false;void study<ObserverRun[]>('/observer/runs').then(items=>{if(!cancelled)setRuns(items);}).catch(()=>{});return()=>{cancelled=true;};},[]);
 const login=async()=>{setBusy(true);try{await study('/observer/login',{key});setKey('');await load();setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const pick=(r:ObserverRun)=>{setSelected(r);setChecks(Array.isArray(r.observer_criteria)?r.observer_criteria:[false,false,false,false,false,false]);setHelp(r.observer_help_count);setErrors(r.observer_error_count);setNotes(r.observer_notes??'');};
 const save=async()=>{if(!selected)return;setBusy(true);try{await study(`/observer/run/${selected.id}/score`,{criteria:checks,help,errors,notes});await load();setSelected(null);setError('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const rubric=selected?.rubric.split(' / ')??[];
 return <main className={styles.page}><section className={styles.card}><p className={styles.eyebrow}>CONG · Acesso restrito</p><h1>Observador da pesquisa</h1>{error&&<p className={styles.error} role="alert">{error}</p>}
  {runs===null?<><p>Digite a credencial de observação configurada no servidor.</p><input className={styles.field} type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)}/><button className={styles.primary} disabled={busy} onClick={login}>Entrar</button></>:
  <><p><strong>{new Set(runs.map(r=>r.participant_code)).size} participantes registrados</strong> · {new Set(runs.filter(r=>r.cohort==='Adicional').map(r=>r.participant_code)).size} adicionais (P061+)</p><p>Resultados declarados pelos participantes não equivalem à correção. Confirme cada critério no artefato salvo antes de marcar.</p><p><a href="/api/study/observer/export.csv" download>Exportar execuções (CSV)</a> · <a href="/api/study/observer/events.csv" download>Eventos (CSV)</a> · <a href="/api/study/observer/feedback.csv" download>Questionários (CSV)</a></p>
   <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Código</th><th>Roteiro</th><th>Amostra</th><th>Etapa</th><th>Condição</th><th>Status</th><th>Nota observada</th><th></th></tr></thead><tbody>{runs.map(r=><tr key={r.id}><td>{r.participant_code}</td><td>{r.scenario_code} {r.family}{r.reused_scenario?' (reutilizado)':''}</td><td>{r.cohort}</td><td>{r.sequence_number} · {r.version}</td><td>{r.condition==='com_ia'?'Com IA':'Sem IA'}</td><td>{r.status}</td><td>{r.observer_criteria?`${r.observer_criteria.filter(Boolean).length}/6`:'Não aferida'}</td><td><button disabled={r.status!=='submitted'} onClick={()=>pick(r)}>Avaliar</button></td></tr>)}</tbody></table></div>
  {selected&&<section className={styles.review}><h2>{selected.participant_code} · {selected.scenario_code} · execução {selected.sequence_number}</h2><p>Antes de pontuar, confira o resultado salvo pela CONG (inclusive após recarga). Não atribua pontos com base apenas no relato ou nos cliques.</p>
   {checks.map((v,i)=><label className={styles.checkbox} key={i}><input type="checkbox" checked={v} onChange={e=>setChecks(c=>c.map((x,j)=>i===j?e.target.checked:x))}/> Critério {i+1}: {rubric[i]??'Consultar protocolo'}</label>)}
   <label className={styles.field}>Intervenções humanas confirmadas<input type="number" min="0" max="99" value={help} onChange={e=>setHelp(Number(e.target.value))}/></label>
   <label className={styles.field}>Erros observados conforme protocolo<input type="number" min="0" max="99" value={errors} onChange={e=>setErrors(Number(e.target.value))}/></label>
   <label className={styles.field}>Observações do aplicador<textarea maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)} /></label><button className={styles.primary} disabled={busy} onClick={save}>Salvar avaliação verificada</button> <button onClick={()=>setSelected(null)}>Cancelar</button>
  </section>}</>}
 </section></main>;
}
