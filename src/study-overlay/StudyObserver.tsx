import {useEffect,useMemo,useState} from 'react';
import {study,type ObserverRun} from './client';
import {getStoredAuthToken} from '../services/api';
import styles from './Study.module.css';
type ScenarioAudit={scenario_code:string;family:string;ngo:string;prompt_a:string;prompt_b:string;rubric:string};
const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function issueList(s:ScenarioAudit):string[]{const a=norm(s.prompt_a),b=norm(s.prompt_b),flags:string[]=[];const aa=new Set(a.split(' ').filter(x=>x.length>3)),bb=new Set(b.split(' ').filter(x=>x.length>3));const union=new Set([...aa,...bb]);const similarity=union.size?[...aa].filter(x=>bb.has(x)).length/union.size:0;if(a===b||similarity>0.77)flags.push('Versões A/B muito parecidas: verificar efeito de aprendizagem');if(/agenda|agendamento/.test(a+' '+b)&&(/horario|horas|as [0-9]{1,2}h/.test(a+' '+b)))flags.push('Solicita horário na agenda: confirmar suporte real na CONG');return flags;}
export default function StudyObserver(){
 const [key,setKey]=useState(''),[runs,setRuns]=useState<ObserverRun[]|null>(null),[scenarios,setScenarios]=useState<ScenarioAudit[]>([]),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[simIncluded,setSimIncluded]=useState(false),[auditOpen,setAuditOpen]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState<ObserverRun|null>(null);
 const [resetMode,setResetMode]=useState<'simulations'|'all'|null>(null),[confirmation,setConfirmation]=useState(''),[resetDone,setResetDone]=useState('');
 const [checks,setChecks]=useState<boolean[]>([false,false,false,false,false,false]),[help,setHelp]=useState(0),[errors,setErrors]=useState(0),[notes,setNotes]=useState('');
 const load=async()=>{setRuns(await study<ObserverRun[]>('/observer/runs'));try{setScenarios(await study<ScenarioAudit[]>('/observer/scenarios'));}catch{setScenarios([]);}};
 useEffect(()=>{let cancelled=false;void study<ObserverRun[]>('/observer/runs').then(items=>{if(!cancelled)setRuns(items);}).catch(()=>{});void study<ScenarioAudit[]>('/observer/scenarios').then(items=>{if(!cancelled)setScenarios(items);}).catch(()=>{});return()=>{cancelled=true;};},[]);
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
 const official=useMemo(()=>runs?.filter(r=>!r.is_simulation)??[],[runs]);
 const visible=useMemo(()=>{const base=simIncluded?(runs??[]):official;return base.filter(r=>(filter==='all'||(filter==='pending'?r.status!=='submitted':filter==='technical'?r.technical_issue:filter==='assess'?r.status==='submitted'&&!r.observer_criteria:r.condition===filter))&&`${r.participant_code} ${r.scenario_code} ${r.family} ${r.cohort}`.toLowerCase().includes(query.toLowerCase()));},[runs,official,simIncluded,filter,query]);
 const participantCount=new Set(official.map(r=>r.participant_code)).size;const complete=official.filter(r=>r.status==='submitted').length;const techCount=official.filter(r=>r.technical_issue).length;const assessed=official.filter(r=>Array.isArray(r.observer_criteria)).length;
 const times=official.filter(r=>r.status==='submitted'&&r.started_at&&r.submitted_at).map(r=>Math.max(0,(new Date(r.submitted_at!).getTime()-new Date(r.started_at!).getTime())/60000)).sort((a,b)=>a-b);const median=times.length?(times.length%2?times[(times.length-1)/2]!:(times[times.length/2-1]!+times[times.length/2]!)/2).toFixed(1):null;
 const warnings=scenarios.flatMap(sc=>issueList(sc).map(issue=>({code:sc.scenario_code,issue})));
 const durationsByCondition=[{key:'sem_ia',name:'Sem IA'},{key:'com_ia',name:'Com IA'}].map(c=>{const v=official.filter(r=>r.condition===c.key&&r.status==='submitted'&&r.started_at&&r.submitted_at).map(r=>(new Date(r.submitted_at!).getTime()-new Date(r.started_at!).getTime())/60000).filter(v=>Number.isFinite(v)&&v>=0).sort((a,b)=>a-b);return {...c,count:v.length,median:v.length?(v.length%2?v[(v.length-1)/2]!:(v[v.length/2-1]!+v[v.length/2]!)/2):null};});
 const conditions=[{key:'sem_ia',name:'Sem IA'},{key:'com_ia',name:'Com IA'}] as const;
 return <main className={styles.page}><section className={styles.card}><p className={styles.eyebrow}>CONG · Acesso restrito</p><h1>Painel do observador<span className={styles.heroDot}>.</span></h1><p className={styles.observerSubtitle}>Acompanhe a coleta, verifique entregas e explore os indicadores da pesquisa com clareza.</p>{error&&<p className={styles.error} role="alert">{error}</p>}
  {runs===null?<><p>Digite a credencial de observação configurada no servidor.</p><input className={styles.field} type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)}/><button className={styles.primary} disabled={busy} onClick={login}>Entrar</button></>:
  <><div className={styles.observerLead}><span className={styles.stepPill}>CENTRAL DE ACOMPANHAMENTO</span><h2>Visão geral da coleta</h2><p>Indicadores calculados com registros oficiais do servidor. Simulações locais ficam fora dos indicadores científicos.</p></div>
   <div className={styles.metrics}>
    <div className={styles.metric}><span>Participantes oficiais</span><strong>{participantCount}</strong><small>Códigos distintos</small></div>
    <div className={styles.metric}><span>Execuções enviadas</span><strong>{complete}</strong><small>De {official.length} atribuídas</small></div>
    <div className={styles.metric}><span>Verificadas pelo observador</span><strong>{assessed}</strong><small>Não equivale à conclusão declarada</small></div>
    <div className={styles.metric}><span>Falhas técnicas</span><strong>{techCount}</strong><small>Execuções com ocorrência</small></div>
    <div className={styles.metric}><span>Tempo mediano</span><strong>{median===null?'—':`${median} min`}</strong><small>{times.length} tempos válidos</small></div>
   </div>
   <div className={styles.analyticsGrid}><section className={styles.analyticsCard}><h3>Andamento por condição</h3><p>Quantidade de execuções oficiais; cada participante pode contribuir com duas.</p>{conditions.map(c=>{const rs=official.filter(r=>r.condition===c.key);return <div className={styles.barRow} key={c.key}><div><strong>{c.name}</strong><small>{rs.filter(r=>r.status==='submitted').length}/{rs.length} enviadas</small></div><div className={styles.barTrack}><div style={{width:`${rs.length?rs.filter(r=>r.status==='submitted').length/rs.length*100:0}%`}}/></div></div>;})}</section>
   <section className={styles.analyticsCard}><h3>Distribuição das respostas declaradas</h3><p>Somente execuções enviadas; “Não” e sem resposta não são tratados como sucesso.</p>{conditions.map(c=>{const rs=official.filter(r=>r.condition===c.key&&r.status==='submitted');const yes=rs.filter(r=>r.reported_completed===true).length;return <div className={styles.barRow} key={c.key}><div><strong>{c.name}</strong><small>{yes}/{rs.length} disseram concluir</small></div><div className={styles.barTrack}><div style={{width:`${rs.length?yes/rs.length*100:0}%`}}/></div></div>;})}</section></div>
   <section className={styles.analyticsCard}><h3>Comparação de tempos medianos</h3><p>Minutos entre início e envio da avaliação pós-tarefa. O tempo inclui o preenchimento da avaliação, não apenas a execução operacional; interprete com cautela.</p><div className={styles.compareTimes}>{durationsByCondition.map(c=><div className={styles.compareTime} key={c.key}><span>{c.name}</span><strong>{c.median===null?'Sem dados':`${c.median.toFixed(1)} min`}</strong><small>{c.count} execução(ões) com horários válidos</small></div>)}</div></section>
   <section className={styles.auditBox}><div className={styles.auditHeading}><div><span className={styles.stepPill}>QUALIDADE METODOLÓGICA</span><h3>Revisão dos cenários experimentais</h3><p>{scenarios.length} roteiros cadastrados · {warnings.length} alerta(s) heurístico(s). A lista auxilia a revisão humana; não altera os cenários no banco.</p></div><button className={styles.secondaryButton} onClick={()=>setAuditOpen(v=>!v)}>{auditOpen?'Ocultar auditoria':'Revisar cenários'}</button></div>{auditOpen&&<div className={styles.auditList}>{scenarios.map(sc=>{const issues=issueList(sc);return <details key={sc.scenario_code}><summary><strong>{sc.scenario_code} · {sc.family}</strong><span className={issues.length?styles.auditAlert:styles.auditOk}>{issues.length?`${issues.length} alerta(s)`:'Revisar manualmente'}</span></summary><div><h4>Versão A</h4><p>{sc.prompt_a}</p><h4>Versão B</h4><p>{sc.prompt_b}</p><h4>Critérios</h4><p>{sc.rubric}</p>{issues.map((w,i)=><p className={styles.warning} key={i}>{w}</p>)}</div></details>;})}</div>}</section>
<section className={styles.adminTools} aria-label="Ferramentas de homologação">
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
   <div className={styles.tableHeader}><div><h2>Execuções e avaliação</h2><p>Busque e filtre os registros; clique em avaliar para registrar os seis critérios observados.</p></div><button className={styles.secondaryButton} disabled={busy} onClick={()=>void load()}>↻ Atualizar dados</button></div>
   <div className={styles.filters}><label><span>Buscar participante ou roteiro</span><input type="search" placeholder="Ex.: P063, cenário, família…" value={query} onChange={e=>setQuery(e.target.value)}/></label><label><span>Filtrar execução</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas as situações</option><option value="pending">Em andamento / atribuída</option><option value="assess">Aguardando avaliação</option><option value="technical">Com falha técnica</option><option value="com_ia">Com IA</option><option value="sem_ia">Sem IA</option></select></label><label className={styles.toggleField}><input type="checkbox" checked={simIncluded} onChange={e=>setSimIncluded(e.target.checked)}/> Incluir simulações na tabela</label></div><p className={styles.hint}>Mostrando {visible.length} de {simIncluded?(runs??[]).length:official.length} execuções. Os gráficos acima sempre excluem simulações.</p>
   <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Código</th><th>Roteiro</th><th>Amostra</th><th>Etapa</th><th>Condição</th><th>Status</th><th>Nota observada</th><th></th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{r.participant_code}</td><td>{r.scenario_code} {r.family}{r.is_simulation?' (SIMULAÇÃO)':r.reused_scenario?' (reutilizado)':''}</td><td>{r.cohort}</td><td>{r.sequence_number} · {r.version}</td><td>{r.condition==='com_ia'?'Com IA':'Sem IA'}</td><td>{r.status}</td><td>{r.observer_criteria?`${r.observer_criteria.filter(Boolean).length}/6`:'Não aferida'}</td><td><button disabled={r.status!=='submitted'} onClick={()=>pick(r)}>Avaliar</button></td></tr>)}</tbody></table></div>
  {selected&&<section className={styles.review}><h2>{selected.participant_code} · {selected.scenario_code} · execução {selected.sequence_number}</h2><p>Antes de pontuar, confira o resultado salvo pela CONG (inclusive após recarga). Não atribua pontos com base apenas no relato ou nos cliques.</p>
   {checks.map((v,i)=><label className={styles.checkbox} key={i}><input type="checkbox" checked={v} onChange={e=>setChecks(c=>c.map((x,j)=>i===j?e.target.checked:x))}/> Critério {i+1}: {rubric[i]??'Consultar protocolo'}</label>)}
   <label className={styles.field}>Intervenções humanas confirmadas<input type="number" min="0" max="99" value={help} onChange={e=>setHelp(Number(e.target.value))}/></label>
   <label className={styles.field}>Erros observados conforme protocolo<input type="number" min="0" max="99" value={errors} onChange={e=>setErrors(Number(e.target.value))}/></label>
   <label className={styles.field}>Observações do aplicador<textarea maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)} /></label><button className={styles.primary} disabled={busy} onClick={save}>Salvar avaliação verificada</button> <button onClick={()=>setSelected(null)}>Cancelar</button>
  </section>}</>}
 </section></main>;
}
