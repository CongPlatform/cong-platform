import { Router, type Request, type Response, type NextFunction } from "express";
import { randomBytes, createHash, createHmac, timingSafeEqual } from "node:crypto";
import pool from "../config/database.js";
import { chooseAdditionalAssignment, type CountCell, type ScenarioUse } from "./allocation.js";

const router=Router();
router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
const COOKIE='cong_study_session', ADMIN_COOKIE='cong_study_observer';
// Mirror only for /api/ai so the assistant API can enforce the experimental condition.
// The original study cookie remains scoped to /api/study.
const AI_COOKIE='cong_study_ai_access';
const bridgeSecret=process.env.STUDY_BRIDGE_SECRET || '';
const adminKey=process.env.STUDY_OBSERVER_KEY || '';
const enabled=process.env.STUDY_ENABLED==='true';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const cookieValue=(req:Request,key:string)=>req.headers.cookie?.split(';').map(c=>c.trim()).find(x=>x.startsWith(`${key}=`))?.slice(key.length+1)??'';
const sessionCookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production'||process.env.VERCEL==='1',sameSite:'lax' as const,path:'/api/study',maxAge:24*3600*1000};
const adminCookieOptions={...sessionCookieOptions,maxAge:8*3600*1000};
const aiCookieOptions={...sessionCookieOptions,path:'/api/ai'};
const fresh=()=>randomBytes(32).toString('base64url');
const safeEqual=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);};
const error=(res:Response,status:number,message:string)=>res.status(status).json({error:message});
const runGroups:Record<string,[['A'|'B','sem_ia'|'com_ia'],['A'|'B','sem_ia'|'com_ia']]>= {
 G1:[['A','sem_ia'],['B','com_ia']],G2:[['A','com_ia'],['B','sem_ia']],G3:[['B','sem_ia'],['A','com_ia']],G4:[['B','com_ia'],['A','sem_ia']]
};
interface Ticket {v:number;sourceId:string;exp:number;nonce:string;score?:number|null;taskResults?:unknown;}
function verifyTicket(ticket:unknown):Ticket {
 if(typeof ticket!=='string'||ticket.length>12000)throw new Error('Código de transferência inválido');
 const parts=ticket.split('.'); if(parts.length!==2||!parts[0]||!parts[1]||bridgeSecret.length<32)throw new Error('Transferência indisponível');
 const mac=createHmac('sha256',bridgeSecret).update(parts[0]).digest('hex');
 if(!safeEqual(mac,parts[1]))throw new Error('Assinatura inválida');
 const p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8')) as Ticket;
 if(p.v!==1 || typeof p.sourceId!=='string'||!(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(p.sourceId)) || typeof p.nonce!=='string' || p.nonce.length<16 || !Number.isFinite(p.exp) || p.exp*1000<Date.now() || p.exp*1000>Date.now()+15*60_000)throw new Error('Transferência expirada ou inválida');
 return p;
}
async function current(req:Request){
 const token=cookieValue(req,COOKIE);if(!token)return null;
 const r=await pool.query('SELECT * FROM public.study_overlay_participants WHERE session_hash=$1 AND session_expires_at>now() AND status IN (\'active\',\'completed\')',[hash(token)]);
 return r.rows[0]??null;
}
async function observer(req:Request){
 const token=cookieValue(req,ADMIN_COOKIE); if(!token)return false;
 const r=await pool.query('SELECT 1 FROM public.study_overlay_observer_sessions WHERE session_hash=$1 AND expires_at>now()',[hash(token)]);
 return r.rowCount===1;
}
async function checkParticipant(req:Request,res:Response,next:NextFunction){try{if(!await current(req)){error(res,401,'Sessão de pesquisa ausente ou expirada');return;}
  // Refresh the AI-scoped cookie even for participants admitted before this patch.
  const token=cookieValue(req,COOKIE);if(token)res.cookie(AI_COOKIE,token,aiCookieOptions);
  next();}catch(nextError){next(nextError);}}
async function checkObserver(req:Request,res:Response,next:NextFunction){try{if(!await observer(req)){error(res,401,'Acesso do observador necessário');return;}next();}catch(nextError){next(nextError);}}
if(!enabled){router.use((_req,res)=>{error(res,503,'Pesquisa desativada no servidor');});}

router.post('/handoff',async(req,res,next)=>{
 try {
  const ticket=verifyTicket(req.body?.ticket);const session=fresh();const sessionHash=hash(session);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   // Uma admissão por vez: impede corrida entre o último slot do lote e P061+.
   await client.query('SELECT pg_advisory_xact_lock(26023, 6071)');
   const existing=await client.query('SELECT 1 FROM public.study_overlay_participants WHERE source_participant_id=$1',[ticket.sourceId]);
   if(existing.rowCount){await client.query('ROLLBACK');error(res,409,'Essa participação já foi iniciada. Abra a pesquisa no mesmo navegador para continuar.');return;}
   const selected=await client.query(`SELECT s.participant_code,s.scenario_code,s.group_code
    FROM public.study_overlay_slots s LEFT JOIN public.study_overlay_participants p ON p.participant_code=s.participant_code
    WHERE s.claimed_at IS NULL AND p.id IS NULL ORDER BY s.order_number LIMIT 1 FOR UPDATE OF s SKIP LOCKED`);
   // Ao esgotar P001-P060, distribuir sem limite e SEM substituir histórico.
   // Escolhas independem completamente da pontuação de familiaridade.
   let slot: {participant_code:string;scenario_code:string;group_code:string};
   if(selected.rowCount){
     slot=selected.rows[0] as typeof slot;
   }else{
     const countRows=await client.query(`SELECT family,group_code,count(*)::int AS n
       FROM public.study_overlay_slots WHERE claimed_at IS NOT NULL GROUP BY family,group_code`);
     const usageRows=await client.query(`SELECT c.scenario_code,c.family,count(s.participant_code) FILTER (WHERE s.claimed_at IS NOT NULL)::int AS uses
       FROM public.study_overlay_scenarios c LEFT JOIN public.study_overlay_slots s ON s.scenario_code=c.scenario_code
       GROUP BY c.scenario_code,c.family`);
     const extra=chooseAdditionalAssignment(countRows.rows as CountCell[],usageRows.rows as ScenarioUse[]);
     const next=await client.query(`SELECT COALESCE(MAX(order_number),0)+1 AS n FROM public.study_overlay_slots`);
     const orderNumber=Number(next.rows[0].n);
     if(!Number.isSafeInteger(orderNumber)||orderNumber<61)throw new Error('Sequência de alocação inválida');
     slot={participant_code:'P'+String(orderNumber).padStart(3,'0'),scenario_code:extra.scenarioCode,group_code:extra.group};
     await client.query(`INSERT INTO public.study_overlay_slots
       (participant_code,scenario_code,cohort,family,group_code,order_number,claimed_at,reused_scenario)
       VALUES($1,$2,'Adicional',$3,$4,$5,now(),true)`,
       [slot.participant_code,slot.scenario_code,extra.family,slot.group_code,orderNumber]);
   }
   await client.query('UPDATE public.study_overlay_slots SET claimed_at=now() WHERE participant_code=$1',[slot.participant_code]);
   const p=await client.query(`INSERT INTO public.study_overlay_participants(participant_code,source_participant_id,source_score,source_data,session_hash,session_expires_at)
    VALUES($1,$2,$3,$4,$5,now()+interval '24 hours') RETURNING id`,[
     slot.participant_code,ticket.sourceId,typeof ticket.score==='number'?ticket.score:null,JSON.stringify(ticket.taskResults??{}),sessionHash
    ]);
   const id=p.rows[0].id;
   for(const [i,[version,condition]] of (runGroups[slot.group_code]??[]).entries()){
    await client.query('INSERT INTO public.study_overlay_runs(participant_id,sequence_number,version,condition) VALUES($1,$2,$3,$4)',[id,i+1,version,condition]);
   }
   await client.query('COMMIT');res.cookie(COOKIE,session,sessionCookieOptions).cookie(AI_COOKIE,session,aiCookieOptions).json({ok:true});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e;}finally{client.release();}
 }catch(e){if(e instanceof Error && /transfer|assinatura|expirad|inválid/i.test(e.message)){error(res,400,e.message);return;}next(e);}
});

router.get('/me',checkParticipant,async(req,res,next)=>{
 try{
  const p=await current(req);
  const r=await pool.query(`SELECT r.id,r.sequence_number,r.version,r.condition,r.status,r.started_at,r.submitted_at,r.reported_completed,r.difficulty,r.confidence,
   s.participant_code,s.group_code,s.cohort,s.family,s.scenario_code,c.ngo,
   CASE WHEN r.version='A' THEN c.prompt_a ELSE c.prompt_b END AS prompt
   FROM public.study_overlay_runs r JOIN public.study_overlay_slots s ON s.participant_code=$1
   JOIN public.study_overlay_scenarios c ON c.scenario_code=s.scenario_code WHERE r.participant_id=$2 ORDER BY r.sequence_number`,[p.participant_code,p.id]);
  res.json({participantCode:p.participant_code,status:p.status,runs:r.rows});
 }catch(e){next(e);}
});
router.post('/run/:sequence/start',checkParticipant,async(req,res,next)=>{
 try{
  const p=await current(req), n=Number(req.params.sequence);
  if(![1,2].includes(n)||p.status!=='active')return error(res,409,'Execução indisponível');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const runs=await client.query('SELECT id,sequence_number,status FROM public.study_overlay_runs WHERE participant_id=$1 ORDER BY sequence_number FOR UPDATE',[p.id]);
   const prior=runs.rows.find(x=>x.sequence_number===1),run=runs.rows.find(x=>x.sequence_number===n);
   if(!run || run.status==='submitted' || (n===2 && prior?.status!=='submitted')){await client.query('ROLLBACK');return error(res,409,'Conclua a primeira execução antes de iniciar a próxima');}
   if(run.status==='assigned'){
    await client.query("UPDATE public.study_overlay_runs SET status='running',started_at=now() WHERE id=$1",[run.id]);
    await client.query("INSERT INTO public.study_overlay_events(participant_id,run_id,actor,event_type) VALUES($1,$2,'system','run_started')",[p.id,run.id]);
   }
   await client.query('COMMIT');res.json({ok:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }catch(e){next(e);}
});
router.post('/run/:sequence/event',checkParticipant,async(req,res,next)=>{
 try{
  const p=await current(req),n=Number(req.params.sequence),type=req.body?.type,details=req.body?.details;
  if(![1,2].includes(n)||!['navigation','help_request','technical_issue'].includes(type)||typeof details!=='string'||details.length>500)return error(res,400,'Evento inválido');
  const run=await pool.query("SELECT id FROM public.study_overlay_runs WHERE participant_id=$1 AND sequence_number=$2 AND status='running'",[p.id,n]);
  if(!run.rowCount)return error(res,409,'Execução não iniciada');
  await pool.query('INSERT INTO public.study_overlay_events(participant_id,run_id,actor,event_type,details) VALUES($1,$2,\'participant\',$3,$4)',[p.id,run.rows[0].id,type,details]);
  if(type==='technical_issue')await pool.query('UPDATE public.study_overlay_runs SET technical_issue=true WHERE id=$1',[run.rows[0].id]);
  res.json({ok:true});
 }catch(e){next(e);}
});
router.post('/run/:sequence/finish',checkParticipant,async(req,res,next)=>{
 try{
  const p=await current(req),n=Number(req.params.sequence),body=req.body??{};
  if(![1,2].includes(n)||typeof body.completed!=='boolean'||typeof body.help!=='boolean'||!['sim','parcialmente','nao'].includes(body.understood)||typeof body.difficultyText!=='string'||body.difficultyText.length>500||!Number.isInteger(body.difficulty)||body.difficulty<1||body.difficulty>5||!Number.isInteger(body.confidence)||body.confidence<1||body.confidence>5)return error(res,400,'Responda conclusão, ajuda, dificuldade e confiança');
  const r=await pool.query(`UPDATE public.study_overlay_runs SET status='submitted',submitted_at=now(),reported_completed=$3,
   self_reported_help=$4,difficulty=$5,confidence=$6,understood_result=$7,reported_difficulty=$8
   WHERE participant_id=$1 AND sequence_number=$2 AND status='running' RETURNING id`,[p.id,n,body.completed,body.help,body.difficulty,body.confidence,body.understood,body.difficultyText]);
  if(!r.rowCount)return error(res,409,'A execução não está em andamento ou já foi enviada');
  await pool.query("INSERT INTO public.study_overlay_events(participant_id,run_id,actor,event_type) VALUES($1,$2,'system','run_submitted')",[p.id,r.rows[0].id]);
  res.json({ok:true});
 }catch(e){next(e);}
});
router.post('/finish',checkParticipant,async(req,res,next)=>{
 try{
  const p=await current(req), answers=req.body?.answers;
  if(!answers || typeof answers!=='object'||Array.isArray(answers)||JSON.stringify(answers).length>6000)return error(res,400,'Questionário inválido');
  for(let i=1;i<=10;i++){const ans=answers[`Q${String(i).padStart(2,'0')}`]; if(!['1','2','3','4','5',...(i>=5?['na']:[])].includes(ans))return error(res,400,`Resposta inválida em Q${i}`);}
  const runs=await pool.query("SELECT count(*)::int AS n FROM public.study_overlay_runs WHERE participant_id=$1 AND status='submitted'",[p.id]);
  if(runs.rows[0].n!==2)return error(res,409,'As duas execuções precisam ser enviadas');
  await pool.query("INSERT INTO public.study_overlay_feedback(participant_id,answers) VALUES($1,$2) ON CONFLICT(participant_id) DO NOTHING",[p.id,JSON.stringify(answers)]);
  await pool.query("UPDATE public.study_overlay_participants SET status='completed',completed_at=coalesce(completed_at,now()) WHERE id=$1",[p.id]);
  res.json({ok:true});
 }catch(e){next(e);}
});
router.post('/withdraw',checkParticipant,async(req,res,next)=>{
 try{const p=await current(req);await pool.query("UPDATE public.study_overlay_participants SET status='withdrawn' WHERE id=$1 AND status='active'",[p.id]);res.clearCookie(COOKIE,sessionCookieOptions).clearCookie(AI_COOKIE,aiCookieOptions).json({ok:true});}catch(e){next(e);}
});

router.post('/observer/login',async(req,res,next)=>{
 try{
  if(adminKey.length<32 || typeof req.body?.key!=='string'||!safeEqual(adminKey,req.body.key))return error(res,401,'Credencial de observador inválida');
  const token=fresh();await pool.query("INSERT INTO public.study_overlay_observer_sessions(session_hash,expires_at) VALUES($1,now()+interval '8 hours')",[hash(token)]);
  res.cookie(ADMIN_COOKIE,token,adminCookieOptions).json({ok:true});
 }catch(e){next(e);}
});
router.get('/observer/runs',checkObserver,async(_req,res,next)=>{
 try{
  const q=await pool.query(`SELECT r.id,r.sequence_number,r.version,r.condition,r.status,r.started_at,r.submitted_at,
    r.reported_completed,r.self_reported_help,r.difficulty,r.confidence,r.understood_result,r.reported_difficulty,r.observer_help_count,r.observer_error_count,
    r.observer_criteria,r.observer_notes,r.technical_issue,p.participant_code,s.scenario_code,s.family,s.group_code,s.cohort,s.reused_scenario,
    c.ngo,c.rubric FROM public.study_overlay_runs r
    JOIN public.study_overlay_participants p ON p.id=r.participant_id
    JOIN public.study_overlay_slots s ON s.participant_code=p.participant_code
    JOIN public.study_overlay_scenarios c ON c.scenario_code=s.scenario_code
    ORDER BY s.order_number,r.sequence_number`);
  res.json(q.rows);
 }catch(e){next(e);}
});
router.post('/observer/run/:id/score',checkObserver,async(req,res,next)=>{
 try{
  const body=req.body??{},criteria=body.criteria;
  if(!Array.isArray(criteria)||criteria.length!==6||criteria.some(x=>typeof x!=='boolean')||!Number.isInteger(body.help)||body.help<0||body.help>99||!Number.isInteger(body.errors)||body.errors<0||body.errors>99||typeof body.notes!=='string'||body.notes.length>500)return error(res,400,'Informe seis critérios verificados, contagens e observações');
  const r=await pool.query("UPDATE public.study_overlay_runs SET observer_criteria=$2,observer_help_count=$3,observer_error_count=$4,observer_notes=$5,observer_assessed_at=now() WHERE id=$1 AND status='submitted' RETURNING id",[
    req.params.id,JSON.stringify(criteria),body.help,body.errors,body.notes
  ]);
  if(!r.rowCount)return error(res,409,'A execução precisa estar concluída para receber avaliação');
  res.json({ok:true});
 }catch(e){next(e);}
});
router.post('/observer/run/:id/event',checkObserver,async(req,res,next)=>{
 try{
  const kind=req.body?.type,details=req.body?.details;
  if(!['observer_help','observer_error','observation','technical_issue'].includes(kind)||typeof details!=='string'||details.length>500)return error(res,400,'Evento inválido');
  const r=await pool.query('SELECT participant_id FROM public.study_overlay_runs WHERE id=$1',[req.params.id]);
  if(!r.rowCount)return error(res,404,'Execução não encontrada');
  await pool.query("INSERT INTO public.study_overlay_events(participant_id,run_id,actor,event_type,details) VALUES($1,$2,'observer',$3,$4)",[r.rows[0].participant_id,req.params.id,kind,details]);
  res.json({ok:true});
 }catch(e){next(e);}
});
router.get('/observer/export.csv',checkObserver,async(_req,res,next)=>{
 try{
  const q=await pool.query(`SELECT p.participant_code,s.cohort,s.scenario_code,s.family,s.group_code,r.sequence_number,r.version,r.condition,
   r.status,r.started_at,r.submitted_at,EXTRACT(EPOCH FROM(r.submitted_at-r.started_at))*1000 AS total_wall_ms,
   r.reported_completed,r.self_reported_help,r.difficulty,r.confidence,r.understood_result,r.reported_difficulty,r.observer_help_count,r.observer_error_count,
   r.observer_criteria,r.observer_notes,r.technical_issue,p.source_score,s.reused_scenario,
   CASE WHEN jsonb_typeof(r.observer_criteria)='array' THEN (SELECT count(*)::int FROM jsonb_array_elements(r.observer_criteria) v WHERE v='true'::jsonb) ELSE NULL END AS score_0_6,
   CASE WHEN r.observer_criteria IS NULL THEN NULL ELSE
      (r.status='submitted' AND NOT r.technical_issue AND r.observer_help_count=0
       AND r.self_reported_help IS FALSE
       AND NOT EXISTS (SELECT 1 FROM public.study_overlay_events ev WHERE ev.run_id=r.id AND ev.event_type IN ('help_request','observer_help'))
       AND (SELECT count(*) FROM jsonb_array_elements(r.observer_criteria) v WHERE v='true'::jsonb)=6)
    END AS success_full_without_human
   FROM public.study_overlay_runs r JOIN public.study_overlay_participants p ON p.id=r.participant_id
   JOIN public.study_overlay_slots s ON s.participant_code=p.participant_code ORDER BY s.order_number,r.sequence_number`);
  const names=Object.keys(q.rows[0]??{participant_code:'',cohort:'',scenario_code:'',family:'',group_code:'',sequence_number:'',version:'',condition:'',status:'',started_at:'',submitted_at:'',total_wall_ms:'',reported_completed:'',self_reported_help:'',difficulty:'',confidence:'',observer_help_count:'',observer_error_count:'',observer_criteria:'',observer_notes:'',technical_issue:'',source_score:'',reused_scenario:'',score_0_6:'',success_full_without_human:''});
  // eslint-disable-next-line no-control-regex -- Controle ASCII intencional na sanitizacao de entrada.
  const esc=(v:unknown)=>{ const raw=v===null||v===undefined?'':typeof v==='object'?JSON.stringify(v):String(v); const safe=/^[\s\x00-\x1f]*[=+@-]/.test(raw)?`'${raw}`:raw; return `"${safe.replaceAll('"','""')}"`; };
  const csv=[names.join(','),...q.rows.map(row=>names.map(n=>esc(row[n])).join(','))].join('\r\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="cong-study-overlay.csv"');res.send('\uFEFF'+csv);
 }catch(e){next(e);}
});
router.get('/observer/feedback.csv',checkObserver,async(_req,res,next)=>{
 try{
  const q=await pool.query(`SELECT p.participant_code,f.questionnaire_version,f.submitted_at,f.answers
    FROM public.study_overlay_feedback f JOIN public.study_overlay_participants p ON p.id=f.participant_id
    ORDER BY p.participant_code`);
  // eslint-disable-next-line no-control-regex -- Controle ASCII intencional na sanitizacao de entrada.
  const safe=(v:unknown)=>{const raw=String(v??'');return `"${(/^[\s\x00-\x1f]*[=+@-]/.test(raw)?"'"+raw:raw).replaceAll('"','""')}"`;};
  const names=['participant_code','questionnaire_version','submitted_at',...Array.from({length:10},(_,i)=>`Q${String(i+1).padStart(2,'0')}`),'dificuldade_aberta','mudaria_aberta'];
  const lines=q.rows.map(row=>names.map(name=>safe(name in row?row[name]:(row.answers??{})[name])).join(','));
  res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="cong-study-feedback.csv"');
  res.send('\uFEFF'+[names.join(','),...lines].join('\r\n'));
 }catch(e){next(e);}
});
router.get('/observer/events.csv',checkObserver,async(_req,res,next)=>{
 try{
  const q=await pool.query(`SELECT p.participant_code,r.sequence_number,e.actor,e.event_type,e.details,e.created_at
    FROM public.study_overlay_events e JOIN public.study_overlay_participants p ON p.id=e.participant_id
    LEFT JOIN public.study_overlay_runs r ON r.id=e.run_id ORDER BY e.created_at`);
  const names=['participant_code','sequence_number','actor','event_type','details','created_at'];
  // eslint-disable-next-line no-control-regex -- Controle ASCII intencional na sanitizacao de entrada.
  const esc=(v:unknown)=>{const raw=String(v??'');return `"${(/^[\s\x00-\x1f]*[=+@-]/.test(raw)?"'"+raw:raw).replaceAll('"','""')}"`;};
  res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="cong-study-events.csv"');
  res.send('\uFEFF'+[names.join(','),...q.rows.map(row=>names.map(n=>esc(row[n])).join(','))].join('\r\n'));
 }catch(e){next(e);}
});
export default router;
