/** CONG IA hosted queue: never executes model output against a builder. */
import { Router, type Request, type Response } from "express";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import pool from "../../config/database.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireOrganizationContext } from "../../middlewares/organization-context.js";
import { roleHasPermission } from "../../services/authorization.service.js";
import { canUseInstitutionalSites } from "../../middlewares/require-institutional-permission.js";
import { systemPrompt } from "./ai.prompt.js";
import { validateProposal } from "./ai.contract.js";
import { auditAiPlan } from "./ai.coverage.js";
import { intentWithoutGeneration, explainProposal } from "./ai.intent.js";

const enabled = () => process.env.CONG_AI_ENABLED === "true";
const workerSecret = () => process.env.CONG_AI_WORKER_TOKEN || "";
const uuid = z.string().uuid();
const createInput = z.object({ goal: z.enum(["system", "site", "both"]), prompt: z.string().trim().min(12).max(6500) }).strict();
const answerInput = z.object({ answer: z.string().trim().min(1).max(3500) }).strict();
const workerId = z.string().regex(/^[a-zA-Z0-9_-]{2,60}$/);
const workerSignal = z.object({ model: z.string().max(120), busy: z.boolean() });
const leaseInput = z.object({ lease_token: z.string().min(32).max(128) });
const failInput = leaseInput.extend({ error_code: z.string().regex(/^[A-Z0-9_]{2,50}$/).default("MODEL_ERROR") });
const completeInput = leaseInput.extend({proposal:z.unknown(),metrics:z.record(z.string(),z.unknown()).optional()});
const emptyMemory = {summary:"",facts:[],assumptions:[]};
// A fila pertence ao backend publicado: nenhuma URL temporaria / trycloudflare e usada.
const MAX_DAILY_SESSIONS=12;
const MAX_DAILY_JOBS=80;
async function dailyQuota(org:string,user:string){
 const q=await pool.query<{sessions:string;jobs:string}>(`select
 (select count(*)::text from public.ai_sessions s where s.organization_id=$1 and s.created_by_auth_user_id=$2 and s.created_at>=now()-interval '1 day') as sessions,
 (select count(*)::text from public.ai_jobs j join public.ai_sessions s on s.id=j.session_id where s.organization_id=$1 and s.created_by_auth_user_id=$2 and j.created_at>=now()-interval '1 day') as jobs`,[org,user]);
 return {sessions:Number(q.rows[0]?.sessions||0),jobs:Number(q.rows[0]?.jobs||0)};
}
const hash = (v:string) => createHash("sha256").update(v).digest("hex");
const equal = (a:string,b:string) => a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
function error(res:Response,code:number,message:string,key:string):void {res.status(code).json({error:message,code:key});}
const sendError = (res:Response,e:unknown) => {
  console.error("AI request failed",e instanceof Error?e.name:"unknown");
  error(res,500,"Não foi possível concluir a operação da IA.","AI_INTERNAL_ERROR");
};
const invoke=(f:(req:Request,res:Response)=>Promise<void>)=> async (req:Request,res:Response)=>{try{await f(req,res)}catch(e){sendError(res,e)}};
const rowCount = async() => Number((await pool.query<{total:string}>("select count(*)::text as total from public.ai_jobs where status in ('pending','processing')")).rows[0]?.total||0);
const actorId=(res:Response)=>res.locals.authUser.id as string;
const orgId=(res:Response)=>res.locals.organizationContext.organizationId as string;

type Turn={role:"usuario"|"assistente";text:string;time:string};
type SessionRow={id:string;organization_id:string;created_by_auth_user_id:string;goal:"system"|"site"|"both";status:string;round:number;asked:number;revision_count:number;retries:number;turns:Turn[];memory:{summary:string;facts:{key:string;value:string}[];assumptions:string[]};plan:unknown;last_job_id:string|null;updated_at:string};
const summary=(s:SessionRow)=>({id:s.id,goal:s.goal,status:s.status,round:s.round,asked:s.asked,revision_count:s.revision_count,turns:s.turns,memory:s.memory,plan:s.plan,last_job_id:s.last_job_id,updated_at:s.updated_at});
function conversation(s:Pick<SessionRow,"goal"|"memory"|"plan"|"turns">):string {
 // A model-generated summary is not a factual source. Every job instead
 // receives the participant's own words and the previous draft as an
 // explicitly unconfirmed reference (never a source of NGO activities).
 const plan=s.plan && typeof s.plan==="object" ? JSON.stringify(s.plan).slice(0,4300):"";
 const start=`META: ${s.goal}\n${plan?`PLANO_ATUAL (rascunho não confirmado; descarte qualquer detalhe que contrarie o participante): ${plan}\n`:""}HISTÓRICO:\n`;
 const all=s.turns.map(t=>`${t.role}: ${t.text}`).join("\n");
 // Preserve the first description and recent corrections even in a long chat.
 const room=Math.max(1000,23000-start.length);
 const body=all.length>room ? s.turns.slice(0,2).map(t=>`${t.role}: ${t.text}`).join("\n").slice(0,1800)+"\n"+all.slice(-(room-1850)) : all;
 return (start+body).slice(0,23000);
}
async function ensureGoalAllowed(res:Response,goal:"system"|"site"|"both") {
 const context=res.locals.organizationContext;
 if(goal!=="site" && !await roleHasPermission(context.roleId,"operational.configure"))return false;
 if(goal!=="system" && !await canUseInstitutionalSites(context,actorId(res),"edit"))return false;
 return true;
}
async function getSession(res:Response,id:string,lock=false,client?:import("pg").PoolClient):Promise<SessionRow|null>{
 const db=client??pool;
 return (await db.query<SessionRow>(`select * from public.ai_sessions where id=$1 and organization_id=$2 and created_by_auth_user_id=$3 ${lock?'for update':''}`,[id,orgId(res),actorId(res)])).rows[0]??null;
}
async function enqueue(client:import("pg").PoolClient, session:SessionRow){
 const job=(await client.query<{id:string}>(`insert into public.ai_jobs(session_id,organization_id,goal,status,system_prompt,history,round,asked,memory) values($1,$2,$3,'pending',$4,$5,$6,$7,$8::jsonb) returning id`,[session.id,session.organization_id,session.goal,systemPrompt(session.goal,session.round,session.asked),conversation(session),session.round,session.asked,JSON.stringify(session.memory)])).rows[0]!;
 await client.query("update public.ai_sessions set last_job_id=$2,status='pending',updated_at=now() where id=$1",[session.id,job.id]);
 return job.id;
}
const sessionRouter=Router();
sessionRouter.use((_,res,next)=>{if(!enabled())return error(res,503,"IA indisponível neste ambiente.","AI_DISABLED");next()});
sessionRouter.use(authenticate,requireOrganizationContext);
sessionRouter.get("/status",invoke(async(_,res)=>{
 const workers=await pool.query<{worker_id:string;model:string;busy:boolean}>("select worker_id,model,busy from public.ai_workers where last_seen_at>now()-interval '45 seconds' order by last_seen_at desc limit 1");
 res.json({worker_online:workers.rows.length>0,model:workers.rows[0]?.model??"",busy:workers.rows[0]?.busy??false,queue_size:await rowCount()});
}));
sessionRouter.get("/sessions",invoke(async(req,res)=>{
 const data=await pool.query("select id,goal,status,updated_at from public.ai_sessions where organization_id=$1 and created_by_auth_user_id=$2 order by updated_at desc limit 20",[orgId(res),actorId(res)]);
 res.json({sessions:data.rows});
}));
sessionRouter.post("/sessions",invoke(async(req,res)=>{
 const parsed=createInput.safeParse(req.body);if(!parsed.success)return error(res,422,"Descrição ou objetivo inválido.","AI_VALIDATION_ERROR");
 if(!await ensureGoalAllowed(res,parsed.data.goal))return error(res,403,"Sem permissão para configurar esse tipo de projeto.","AI_PERMISSION_DENIED");
 if((await rowCount())>=30)return error(res,429,"Fila de IA temporariamente cheia.","AI_QUEUE_FULL");
 const quota=await dailyQuota(orgId(res),actorId(res));
 if(quota.sessions>=MAX_DAILY_SESSIONS||quota.jobs>=MAX_DAILY_JOBS)return error(res,429,"Limite diário da IA atingido. Tente novamente amanhã.","AI_DAILY_LIMIT");
 const c=await pool.connect();try{
 await c.query("begin");
 const value=parsed.data;
 const rows=await c.query<SessionRow>(`insert into public.ai_sessions(organization_id,created_by_auth_user_id,goal,turns,memory) values($1,$2,$3,$4::jsonb,$5::jsonb) returning *`,[orgId(res),actorId(res),value.goal,JSON.stringify([{role:"usuario",text:value.prompt,time:new Date().toISOString()}]),JSON.stringify(emptyMemory)]);
 const session=rows.rows[0]!;const job=await enqueue(c,session);await c.query("commit");
 res.status(202).json({session_id:session.id,job_id:job,status:"pending"});
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}));
sessionRouter.get("/sessions/:sessionId",invoke(async(req,res)=>{
 const id=uuid.safeParse(req.params.sessionId);if(!id.success)return error(res,400,"ID inválido.","AI_INVALID_ID");
 const s=await getSession(res,id.data);if(!s)return error(res,404,"Conversa não encontrada.","AI_SESSION_NOT_FOUND");
 const job=s.last_job_id?await pool.query<{status:string;error_code:string|null;metrics:unknown;proposal:unknown}>("select status,error_code,metrics,proposal from public.ai_jobs where id=$1 and organization_id=$2",[s.last_job_id,orgId(res)]):null;
 res.json({session:summary(s),last_job_status:job?.rows[0]?.status??"",last_result:job?.rows[0]?.proposal??null,metrics:job?.rows[0]?.metrics??null,error_code:job?.rows[0]?.error_code??null});
}));
sessionRouter.post("/sessions/:sessionId/reply",invoke(async(req,res)=>{
 const id=uuid.safeParse(req.params.sessionId),answer=answerInput.safeParse(req.body);
 if(!id.success||!answer.success)return error(res,422,"Resposta inválida.","AI_VALIDATION_ERROR");
 const c=await pool.connect();try{
 await c.query("begin");
 const s=await getSession(res,id.data,true,c);if(!s){await c.query("rollback");return error(res,404,"Conversa não encontrada.","AI_SESSION_NOT_FOUND")}
 if(!await ensureGoalAllowed(res,s.goal)){await c.query("rollback");return error(res,403,"Sem permissão.","AI_PERMISSION_DENIED")}
 if(!["clarify","propose"].includes(s.status)){await c.query("rollback");return error(res,409,"Aguarde o processamento ou retome uma tarefa com erro.","AI_NOT_READY")}
 // Uma resposta como "não", "não entendi" ou "mal dá para entender"
 // não deve refazer a proposta, gastar GPU nem substituir os campos anteriores.
 const localAction=s.status==="propose"?intentWithoutGeneration(answer.data.answer):null;
 if(localAction){
   s.turns.push({role:"usuario",text:answer.data.answer,time:new Date().toISOString()});
   const reply=localAction==="explain"?explainProposal(s.plan):"Tudo bem. Não vou alterar a proposta. Ela continua disponível para você revisar quando quiser; nada foi aplicado ao sistema.";
   s.turns.push({role:"assistente",text:reply,time:new Date().toISOString()});
   await c.query("update public.ai_sessions set turns=$2::jsonb,updated_at=now() where id=$1",[s.id,JSON.stringify(s.turns)]);
   await c.query("commit");
   res.json({session_id:s.id,job_id:s.last_job_id,status:"propose",no_generation:true});return;
 }
 const quota=await dailyQuota(orgId(res),actorId(res));
 if(quota.jobs>=MAX_DAILY_JOBS){await c.query("rollback");return error(res,429,"Limite diário de mensagens atingido.","AI_DAILY_LIMIT")}
 if((await rowCount())>=30){await c.query("rollback");return error(res,429,"Fila temporariamente cheia.","AI_QUEUE_FULL")}
 if(s.status==="propose"){
  if(s.revision_count>=8){await c.query("rollback");return error(res,429,"Limite de revisões atingido.","AI_REVISION_LIMIT")}
  s.round=0;s.asked=0;s.revision_count+=1;
 }
 s.turns.push({role:"usuario",text:answer.data.answer,time:new Date().toISOString()});
 await c.query(`update public.ai_sessions set round=$2,asked=$3,revision_count=$4,turns=$5::jsonb where id=$1`,[s.id,s.round,s.asked,s.revision_count,JSON.stringify(s.turns)]);
 const job=await enqueue(c,s);await c.query("commit");res.status(202).json({session_id:s.id,job_id:job,status:"pending"});
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}));
sessionRouter.post("/sessions/:sessionId/retry",invoke(async(req,res)=>{
 const id=uuid.safeParse(req.params.sessionId);if(!id.success)return error(res,400,"ID inválido.","AI_INVALID_ID");
 const c=await pool.connect();try{
 await c.query("begin");const s=await getSession(res,id.data,true,c);
 if(!s){await c.query("rollback");return error(res,404,"Conversa não encontrada.","AI_SESSION_NOT_FOUND")}
 if(!await ensureGoalAllowed(res,s.goal)){await c.query("rollback");return error(res,403,"Sem permissão para retomar esta proposta.","AI_PERMISSION_DENIED")}
 if(s.status!=="failed"||s.retries>=2){await c.query("rollback");return error(res,409,"Esta conversa não pode ser retomada.","AI_RETRY_DENIED")}
 s.retries++;await c.query("update public.ai_sessions set retries=$2 where id=$1",[s.id,s.retries]);
 const job=await enqueue(c,s);await c.query("commit");res.status(202).json({session_id:s.id,job_id:job,status:"pending"});
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}));
sessionRouter.post("/sessions/:sessionId/cancel",invoke(async(req,res)=>{
 const id=uuid.safeParse(req.params.sessionId);if(!id.success)return error(res,400,"ID inválido.","AI_INVALID_ID");
 const s=await getSession(res,id.data);if(!s)return error(res,404,"Conversa não encontrada.","AI_SESSION_NOT_FOUND");
 await pool.query("update public.ai_sessions set status='cancelled',updated_at=now() where id=$1 and organization_id=$2 and created_by_auth_user_id=$3",[id.data,orgId(res),actorId(res)]);
 await pool.query("update public.ai_jobs set status='cancelled',updated_at=now() where session_id=$1 and status in ('pending','processing')",[id.data]);
 res.json({ok:true});
}));

// Direito de excluir o historico completo desta conversa: trabalhos sao apagados por CASCADE.
sessionRouter.delete("/sessions/:sessionId",invoke(async(req,res)=>{
 const id=uuid.safeParse(req.params.sessionId);if(!id.success)return error(res,400,"ID inválido.","AI_INVALID_ID");
 const result=await pool.query(`delete from public.ai_sessions where id=$1 and organization_id=$2 and created_by_auth_user_id=$3 returning id`,[id.data,orgId(res),actorId(res)]);
 if(!result.rowCount)return error(res,404,"Conversa não encontrada.","AI_SESSION_NOT_FOUND");
 res.json({ok:true});
}));

const workerRouter=Router();
workerRouter.use((req,res,next)=>{
 if(!enabled())return error(res,503,"IA desativada.","AI_DISABLED");
 const configured=workerSecret();const received=req.header("authorization")??"";
 if(configured.length<40||!received.startsWith("Bearer ")||!equal(received.slice(7),configured))return error(res,401,"Credencial do agente inválida.","AI_WORKER_UNAUTHORIZED");
 const w=workerId.safeParse(req.header("x-cong-worker-id"));if(!w.success)return error(res,422,"Identificador do agente inválido.","AI_WORKER_ID_INVALID");
 res.locals.aiWorkerId=w.data;next();
});
workerRouter.post("/heartbeat",invoke(async(req,res)=>{
 const p=workerSignal.safeParse(req.body);if(!p.success)return error(res,422,"Sinal inválido.","AI_HEARTBEAT_INVALID");
 await pool.query(`insert into public.ai_workers(worker_id,model,busy,last_seen_at) values($1,$2,$3,now()) on conflict(worker_id) do update set model=excluded.model,busy=excluded.busy,last_seen_at=now()`,[res.locals.aiWorkerId,p.data.model,p.data.busy]);res.json({ok:true});
}));
workerRouter.post("/claim",invoke(async(_,res)=>{
 const c=await pool.connect();try{
 await c.query("begin");
 await c.query(`update public.ai_jobs set status='pending',worker_id=null,lease_token_hash=null,lease_expires_at=null,updated_at=now() where status='processing' and lease_expires_at<now() and attempts<3`);
 const expired=await c.query<{session_id:string}>(`update public.ai_jobs set status='failed',error_code='LEASE_EXPIRED',updated_at=now() where status='processing' and lease_expires_at<now() and attempts>=3 returning session_id`);
 for(const row of expired.rows)await c.query("update public.ai_sessions set status='failed',updated_at=now() where id=$1",[row.session_id]);
 const job=await c.query<{id:string;session_id:string;goal:string;system_prompt:string;history:string;round:number;asked:number;memory:unknown}>(`select id,session_id,goal,system_prompt,history,round,asked,memory from public.ai_jobs where status='pending' order by created_at for update skip locked limit 1`);
 if(!job.rows[0]){await c.query("commit");res.json({job:null});return;}
 const token=randomBytes(32).toString("hex"),j=job.rows[0];
 await c.query(`update public.ai_jobs set status='processing',worker_id=$2,lease_token_hash=$3,lease_expires_at=now()+interval '90 seconds',attempts=attempts+1,updated_at=now() where id=$1`,[j.id,res.locals.aiWorkerId,hash(token)]);
 await c.query("update public.ai_sessions set status='processing',updated_at=now() where id=$1",[j.session_id]);
 await c.query("commit");res.json({job:{...j,lease_token:token}});
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}));
async function leased(req:Request,res:Response,c:import("pg").PoolClient){
 const p=leaseInput.safeParse(req.body);const id=uuid.safeParse(req.params.jobId);
 if(!p.success||!id.success)return null;
 const j=(await c.query<{id:string;session_id:string;goal:"system"|"site"|"both";asked:number;status:string;worker_id:string|null;lease_token_hash:string|null;active:boolean}>(`select id,session_id,goal,asked,status,worker_id,lease_token_hash,(lease_expires_at>now()) as active from public.ai_jobs where id=$1 for update`,[id.data])).rows[0];
 if(!j||j.status!=="processing"||!j.active||j.worker_id!==res.locals.aiWorkerId||!j.lease_token_hash||!equal(hash(p.data.lease_token),j.lease_token_hash))return null;
 return j;
}
workerRouter.post("/jobs/:jobId/renew",invoke(async(req,res)=>{
 const c=await pool.connect();try{await c.query("begin");const j=await leased(req,res,c);if(!j){await c.query("rollback");return error(res,409,"Reserva inválida.","AI_LEASE_INVALID")}
 await c.query("update public.ai_jobs set lease_expires_at=now()+interval '90 seconds' where id=$1",[j.id]);await c.query("commit");res.json({ok:true});
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}));
workerRouter.post("/jobs/:jobId/fail",invoke(async(req,res)=>{
 const f=failInput.safeParse(req.body);if(!f.success)return error(res,422,"Falha inválida.","AI_FAIL_INVALID");
 const c=await pool.connect();try{await c.query("begin");const j=await leased(req,res,c);if(!j){await c.query("rollback");return error(res,409,"Reserva inválida.","AI_LEASE_INVALID")}
 await c.query("update public.ai_jobs set status='failed',error_code=$2,updated_at=now() where id=$1",[j.id,f.data.error_code]);await c.query("update public.ai_sessions set status='failed',updated_at=now() where id=$1",[j.session_id]);await c.query("commit");res.json({ok:true});
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}));
workerRouter.post("/jobs/:jobId/complete",invoke(async(req,res)=>{
 const p=completeInput.safeParse(req.body);if(!p.success)return error(res,422,"Resultado inválido.","AI_RESULT_INVALID");
 const c=await pool.connect();try{await c.query("begin");const j=await leased(req,res,c);if(!j){await c.query("rollback");return error(res,409,"Reserva inválida ou expirada.","AI_LEASE_INVALID")}
 if(!validateProposal(p.data.proposal,j.goal,j.asked)){await c.query("rollback");return error(res,422,"Proposta incompatível com o contrato.","AI_PROPOSAL_INVALID")}
 const v=p.data.proposal; // validateProposal e um type guard: conserva o tipo validado, inclusive v.plan.
 const s=(await c.query<SessionRow>("select * from public.ai_sessions where id=$1 for update",[j.session_id])).rows[0];
 if(!s||s.status==="cancelled"){await c.query("rollback");return error(res,409,"Sessão cancelada.","AI_SESSION_CANCELLED")}
 // Nunca usar a autodeclaracao "passed" enviada pelo proprio modelo como veredito.
 // Inspeciona solicitacoes reais do usuario, mapeamentos, duplicacoes e contradicoes.
 const issues=v.phase==="propose"?auditAiPlan(s.goal,s.turns,v.plan,s.plan):[];
 const suppliedChoices=(p.data.metrics??{}).ui_choices;
 const uiChoices=v.phase==="clarify"&&Array.isArray(suppliedChoices)
   ?[...new Set(suppliedChoices.filter((choice):choice is string=>typeof choice==="string"&&choice.length>=2&&choice.length<=95&&!/[\r\n<>]/.test(choice)))].slice(0,4)
   :[];
 const metrics={...(p.data.metrics??{}),ui_choices:uiChoices,coverage_status:v.phase==="propose"?(issues.length?"needs_review":"no_known_gaps"):"not_applicable",unmet_requirements:issues.map(i=>i.message),coverage_codes:issues.map(i=>i.code),coverage_verified_by:"cong_backend_v2"};
 await c.query(`update public.ai_jobs set status='completed',proposal=$2::jsonb,metrics=$3::jsonb,updated_at=now() where id=$1`,[j.id,JSON.stringify(v),JSON.stringify(metrics)]);
 const turns=s.turns.concat({role:"assistente",text:v.reply+(v.questions.length?"\n\n"+v.questions[0]:""),time:new Date().toISOString()});
 const text=turns.filter(t=>t.role==="usuario").map(t=>t.text).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const facts=new Map<string,string>(); // Do not perpetuate an outdated model assumption after participant corrections.
 for(const f of v.memory.facts){
   const key=f.key.toLowerCase();
   if(["meta","goal","objetivo","modo"].includes(key))continue; // Objetivo pertence a sessão autenticada, não ao modelo.
   const n=f.value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
   if(n.length>2&&text.includes(n)){
     // An explicit negation is not affirmative evidence for a model-made fact.
     const pos=text.lastIndexOf(n);
     const context=text.slice(Math.max(0,pos-45),pos);
     if(!/\b(?:nao|nunca|sem|nem)\b.{0,38}$/.test(context))facts.set(f.key,f.value);
   }
 }
 const memory={summary:v.memory.summary,facts:[...facts].slice(-30).map(([key,value])=>({key,value})),assumptions:v.memory.assumptions};
 await c.query(`update public.ai_sessions set status=$2,round=round+$3,asked=asked+$3,turns=$4::jsonb,memory=$5::jsonb,plan=$6::jsonb,updated_at=now() where id=$1`,[s.id,v.phase,v.phase==="clarify"?1:0,JSON.stringify(turns),JSON.stringify(memory),JSON.stringify(v.phase==="propose"?v.plan:s.plan)]);
 await c.query("commit");res.json({ok:true});
 }catch(e){await c.query("rollback");throw e}finally{c.release()}
}));
export {sessionRouter, workerRouter};
