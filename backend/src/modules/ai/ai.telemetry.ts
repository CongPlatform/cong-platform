/** Registros medidos da IA da CONG. Dados de texto e identidade não são incluídos. */
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import pool from "../../config/database.js";

const eventSchema = z.object({
 id:z.string().uuid(),
 kind:z.enum(["draft_started","draft_completed","draft_failed","manual_adjustment","revision_requested","review_opened","published"]),
 run_id:z.string().uuid().nullable().optional(),
 elapsed_ms:z.number().int().min(0).max(86400000).nullable().optional(),
 pages_created:z.number().int().min(0).max(500).nullable().optional(),
 modules_created:z.number().int().min(0).max(500).nullable().optional(),
 forms_prepared:z.number().int().min(0).max(500).nullable().optional(),
}).strict();
const idSchema=z.string().uuid();
const router=Router();
const org=(res:Response)=>res.locals.organizationContext.organizationId as string;
const actor=(res:Response)=>res.locals.authUser.id as string;
const hasSession=async(res:Response,id:string)=>Boolean((await pool.query(
 "select 1 from public.ai_sessions where id=$1 and organization_id=$2 and created_by_auth_user_id=$3",[id,org(res),actor(res)]
)).rowCount);
const failure=(res:Response,e:unknown)=>{console.error("AI telemetry failed", e instanceof Error?e.name:"unknown");res.status(500).json({error:"Não foi possível carregar as métricas."})};

router.post("/sessions/:sessionId/telemetry",async(req:Request,res:Response)=>{
 try{
  const id=idSchema.safeParse(req.params.sessionId), body=eventSchema.safeParse(req.body);
  if(!id.success||!body.success){res.status(422).json({error:"Evento inválido."});return;}
  if(!await hasSession(res,id.data)){res.status(404).json({error:"Conversa não encontrada."});return;}
  // Trava de volume para não permitir eventos ilimitados por sessão.
  const eventCount=await pool.query<{amount:string}>("select count(*)::text as amount from public.ai_session_telemetry where session_id=$1",[id.data]);
  if(Number(eventCount.rows[0]?.amount??0)>=300){res.status(429).json({error:"Limite de eventos atingido."});return;}
  const b=body.data;
  await pool.query(`insert into public.ai_session_telemetry
   (id,session_id,organization_id,actor_auth_user_id,event_kind,run_id,elapsed_ms,pages_created,modules_created,forms_prepared)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(id) do nothing`,[
    b.id,id.data,org(res),actor(res),b.kind,b.run_id??null,b.elapsed_ms??null,
    b.pages_created??null,b.modules_created??null,b.forms_prepared??null
  ]);
  res.json({ok:true});
 }catch(e){failure(res,e)}
});

type JobRow={id:string;status:string;attempts:number;metrics:unknown;created_at:string;updated_at:string};
type EventRow={id:string;event_kind:string;run_id:string|null;elapsed_ms:number|null;pages_created:number|null;modules_created:number|null;forms_prepared:number|null;created_at:string};
const object=(value:unknown):Record<string,unknown> => value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
const quantity=(v:unknown):number|null=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0&&v<=1e9?v:null;
const firstQuantity=(...values:unknown[]):number|null=>{for(const value of values){const number=quantity(value);if(number!==null)return number;}return null;};
const rate=(name:string):number|null=>{const v=process.env[name];if(!v||!/^\d+(?:\.\d+)?$/.test(v))return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1e5?n:null;};
function jobConsumption(metrics:unknown){
 const m=object(metrics), usage=object(m.usage);
 const input=firstQuantity(usage.input_tokens,usage.prompt_tokens,m.input_tokens,m.prompt_tokens);
 const output=firstQuantity(usage.output_tokens,usage.completion_tokens,m.output_tokens,m.completion_tokens);
 const model=typeof m.model==="string"?m.model.slice(0,120):null;
 const workerDuration=firstQuantity(m.duration_ms);
 return {model,input_tokens:input,output_tokens:output,worker_duration_ms:workerDuration};
}
router.get("/sessions/:sessionId/telemetry",async(req:Request,res:Response)=>{
 try{
  const id=idSchema.safeParse(req.params.sessionId);
  if(!id.success){res.status(422).json({error:"Identificador inválido."});return;}
  if(!await hasSession(res,id.data)){res.status(404).json({error:"Conversa não encontrada."});return;}
  const [jobs,events]=await Promise.all([
   pool.query<JobRow>("select id,status,attempts,metrics,created_at,updated_at from public.ai_jobs where session_id=$1 and organization_id=$2 order by created_at",[id.data,org(res)]),
   pool.query<EventRow>("select id,event_kind,run_id,elapsed_ms,pages_created,modules_created,forms_prepared,created_at from public.ai_session_telemetry where session_id=$1 and organization_id=$2 and actor_auth_user_id=$3 order by created_at,id limit 300",[id.data,org(res),actor(res)]),
  ]);
  const jobSummaries=jobs.rows.map(j=>({status:j.status,attempts:j.attempts,created_at:j.created_at,updated_at:j.updated_at,...jobConsumption(j.metrics)}));
  const complete=jobSummaries.filter(j=>j.status==="completed");
  const fullyMeasured=complete.length>0&&complete.every(j=>j.input_tokens!==null&&j.output_tokens!==null);
  const inputTokens=complete.reduce((sum,j)=>sum+(j.input_tokens??0),0);
  const outputTokens=complete.reduce((sum,j)=>sum+(j.output_tokens??0),0);
  // Só mostra custo se TODOS os jobs completos têm tokens reais e o preço deste modelo foi configurado.
  const configuredModel=process.env.CONG_AI_COST_MODEL??"";
  const inputRate=rate("CONG_AI_INPUT_USD_PER_1M"), outputRate=rate("CONG_AI_OUTPUT_USD_PER_1M");
  const allSameModel=complete.length>0&&complete.every(j=>j.model===configuredModel);
  const costReady=fullyMeasured&&Boolean(configuredModel)&&allSameModel&&inputRate!==null&&outputRate!==null;
  const estimate=costReady ? (inputTokens*inputRate!+outputTokens*outputRate!)/1e6 : null;
  const finalEvents=events.rows;
  const draftsCompleted=finalEvents.filter(e=>e.event_kind==="draft_completed");
  res.json({
   session_id:id.data,
   summary:{
    ai_jobs:jobs.rows.length,ai_completed:complete.length,ai_failed:jobs.rows.filter(j=>j.status==="failed").length,
    worker_attempts:jobs.rows.reduce((s,j)=>s+Math.max(0,j.attempts),0),
    draft_attempts:finalEvents.filter(e=>e.event_kind==="draft_started").length,
    draft_completed:draftsCompleted.length,draft_failed:finalEvents.filter(e=>e.event_kind==="draft_failed").length,
    manual_adjustments:finalEvents.filter(e=>e.event_kind==="manual_adjustment").length,
    revision_requests:finalEvents.filter(e=>e.event_kind==="revision_requested").length,
    reviews:finalEvents.filter(e=>e.event_kind==="review_opened").length,
    publications:finalEvents.filter(e=>e.event_kind==="published").length,
    build_elapsed_ms:draftsCompleted.reduce((s,e)=>s+(e.elapsed_ms??0),0),
    build_timing_samples:draftsCompleted.filter(e=>e.elapsed_ms!==null).length,
    input_tokens:fullyMeasured?inputTokens:null,output_tokens:fullyMeasured?outputTokens:null,
    token_coverage:complete.filter(j=>j.input_tokens!==null&&j.output_tokens!==null).length,
    estimated_usd:estimate,pricing_model:costReady?configuredModel:null,
    pricing_note:costReady?"Estimativa de tokens informados pelo worker, sem hospedagem, armazenamento, imagens ou impostos.":
      "Sem custo estimado: faltam tokens medidos de todos os jobs concluídos, ou preços do modelo configurados no backend."
   },
   jobs:jobSummaries,events:finalEvents,
  });
 }catch(e){failure(res,e)}
});
export default router;
