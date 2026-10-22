import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type { PoolClient } from "pg";
import type { OperationalStepRuleInput } from "./operational.schemas.js";

import {type OperationalStepRule} from "./operational.step-rule-logic.js";
const unavailable=()=>new AppError("Sistema ou etapa indisponível.",404,"OPERATIONAL_NOT_FOUND");
const stale=()=>new AppError("A regra foi alterada em outra sessão. Recarregue o percurso.",409,"STEP_RULE_VERSION_CONFLICT");

export async function listStepRules(org:string,systemId:string){
  const system=await pool.query("select 1 from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived'",[org,systemId]);
  if(!system.rowCount)throw unavailable();
  const result=await pool.query<OperationalStepRule>(`select step_id as "stepId",revision,enabled,priority,assignment,due_days as "dueDays" from public.operational_step_rules where organization_id=$1 and system_id=$2 order by updated_at desc`,[org,systemId]);
  return result.rows;
}

export async function saveStepRule(org:string,systemId:string,actor:string,stepId:string,values:OperationalStepRuleInput){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const system=await client.query("select status from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for update",[org,systemId]);
    if(!system.rowCount)throw unavailable();
    if(system.rows[0]?.status!=="draft")throw new AppError("Volte o sistema ao rascunho para alterar regras.",409,"SYSTEM_NOT_DRAFT");
    const plan=await client.query<{steps:unknown}>("select steps from public.operational_system_plans where organization_id=$1 and system_id=$2",[org,systemId]);
    const steps=plan.rows[0]?.steps;
    if(!Array.isArray(steps))throw unavailable();
    const index=steps.findIndex(step=>step&&typeof step==="object"&&step.id===stepId);
    if(index<0)throw unavailable();
    if(values.enabled&&index===steps.length-1)throw new AppError("A última etapa não possui próxima tarefa.",400,"STEP_RULE_LAST_STEP");
    const existing=await client.query<{revision:number}>("select revision from public.operational_step_rules where organization_id=$1 and system_id=$2 and step_id=$3 for update",[org,systemId,stepId]);
    if((existing.rows[0]?.revision??0)!==values.revision)throw stale();
    const saved=await client.query<OperationalStepRule>(`insert into public.operational_step_rules(organization_id,system_id,step_id,enabled,priority,assignment,due_days,updated_by_auth_user_id) values ($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict(organization_id,system_id,step_id) do update set enabled=excluded.enabled,priority=excluded.priority,assignment=excluded.assignment,due_days=excluded.due_days,updated_by_auth_user_id=excluded.updated_by_auth_user_id,updated_at=now(),revision=public.operational_step_rules.revision+1
      returning step_id as "stepId",revision,enabled,priority,assignment,due_days as "dueDays"`,[org,systemId,stepId,values.enabled,values.priority,values.assignment,values.dueDays,actor]);
    await client.query("insert into public.operational_events(organization_id,system_id,action,actor_auth_user_id) values($1,$2,'step_rule.updated',$3)",[org,systemId,actor]);
    await client.query("COMMIT");
    return saved.rows[0];
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}

export async function getRuleForTask(client:PoolClient,org:string,systemId:string,stepId:string){
  const result=await client.query<OperationalStepRule>(`select step_id as "stepId",revision,enabled,priority,assignment,due_days as "dueDays" from public.operational_step_rules where organization_id=$1 and system_id=$2 and step_id=$3`,[org,systemId,stepId]);
  return result.rows[0]??null;
}

export async function listStepRuns(org:string,systemId:string,stepId:string){
  const system=await pool.query("select 1 from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived'",[org,systemId]);
  if(!system.rowCount)throw unavailable();
  const plan=await pool.query<{steps:unknown}>("select steps from public.operational_system_plans where organization_id=$1 and system_id=$2",[org,systemId]);
  if(!Array.isArray(plan.rows[0]?.steps)||!plan.rows[0].steps.some(step=>step&&typeof step==="object"&&step.id===stepId))throw unavailable();
  const runs=await pool.query<{id:string;title:string;status:string;createdAt:string}>(`select next.id,next.title,next.status,next.created_at as "createdAt" from public.operational_tasks original join public.operational_tasks next on next.source_task_id=original.id and next.organization_id=original.organization_id and next.system_id=original.system_id where original.organization_id=$1 and original.system_id=$2 and original.step_id=$3 order by next.created_at desc limit 15`,[org,systemId,stepId]);
  return runs.rows;
}
