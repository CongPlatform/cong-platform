import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type { PoolClient } from "pg";
import {nextExecutionStep} from "./operational.execution-rule.js";
import {getRuleForTask} from "./operational.step-rules.js";
import {ruleAllowsPriority,dueDateFromDays} from "./operational.step-rule-logic.js";

const missing = () => new AppError("Sistema indisponível nesta organização.",404,"OPERATIONAL_NOT_FOUND");
const conflict = () => new AppError("As regras mudaram em outra sessão. Atualize e tente novamente.",409,"EXECUTION_VERSION_CONFLICT");

export async function getExecutionSettings(org:string,systemId:string){
  const found=await pool.query("select id from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived'",[org,systemId]);
  if(!found.rowCount)throw missing();
  const result=await pool.query<{advanceOnCompletion:boolean;revision:number}>(`select advance_on_completion as "advanceOnCompletion",revision from public.operational_execution_settings where organization_id=$1 and system_id=$2`,[org,systemId]);
  return result.rows[0]??{advanceOnCompletion:false,revision:0};
}

export async function updateExecutionSettings(org:string,systemId:string,actor:string,revision:number,advanceOnCompletion:boolean){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const system=await client.query("select id from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for update",[org,systemId]);
    if(!system.rowCount)throw missing();
    const current=await client.query<{revision:number}>("select revision from public.operational_execution_settings where organization_id=$1 and system_id=$2 for update",[org,systemId]);
    if((current.rows[0]?.revision??0)!==revision)throw conflict();
    if(advanceOnCompletion){
      const plan=await client.query<{steps:unknown}>("select steps from public.operational_system_plans where organization_id=$1 and system_id=$2",[org,systemId]);
      if(!Array.isArray(plan.rows[0]?.steps)||plan.rows[0].steps.length<2)throw new AppError("Crie pelo menos duas etapas no percurso antes de habilitar esta ação.",400,"EXECUTION_NO_STEPS");
    }
    const updated=await client.query<{advanceOnCompletion:boolean;revision:number}>(`insert into public.operational_execution_settings (organization_id,system_id,advance_on_completion,revision,updated_by_auth_user_id) values ($1,$2,$3,1,$4)
      on conflict (organization_id,system_id) do update set advance_on_completion=excluded.advance_on_completion,revision=public.operational_execution_settings.revision+1,updated_by_auth_user_id=excluded.updated_by_auth_user_id,updated_at=now()
      returning advance_on_completion as "advanceOnCompletion",revision`,[org,systemId,advanceOnCompletion,actor]);
    await client.query("insert into public.operational_events(organization_id,system_id,action,actor_auth_user_id) values($1,$2,'automation.updated',$3)",[org,systemId,actor]);
    await client.query("COMMIT");
    return updated.rows[0];
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}

export async function advanceTaskIfEnabled(client:PoolClient,org:string,systemId:string,actor:string,task:{id:string;step_id:string|null;status:string;module_id:string|null;record_id:string|null;priority:string;assignee_user_id:string|null},nextStatus:string){
  if(task.status==="done"||nextStatus!=="done"||!task.step_id)return null;
  const rule=await getRuleForTask(client,org,systemId,task.step_id);
  if(rule){
    if(!ruleAllowsPriority(rule,task.priority))return null;
  }else{
    const settings=await client.query<{advance_on_completion:boolean}>("select advance_on_completion from public.operational_execution_settings where organization_id=$1 and system_id=$2",[org,systemId]);
    if(!settings.rows[0]?.advance_on_completion)return null;
  }
  const plan=await client.query<{steps:unknown}>("select steps from public.operational_system_plans where organization_id=$1 and system_id=$2",[org,systemId]);
  const next=nextExecutionStep(plan.rows[0]?.steps,task.step_id);
  if(!next)return null;
  let assignee:string|null=null;
  if(rule?.assignment==="keep"&&task.assignee_user_id){
    const active=await client.query("select 1 from public.organization_users ou join public.users u on u.id=ou.user_id where ou.organization_id=$1 and ou.user_id=$2 and ou.status='active' and u.active limit 1",[org,task.assignee_user_id]);
    if(active.rowCount)assignee=task.assignee_user_id;
  }
  const dueOn=rule?dueDateFromDays(rule.dueDays,new Date()):null;
  const result=await client.query<{id:string}>(`insert into public.operational_tasks(organization_id,system_id,title,notes,status,priority,step_id,module_id,record_id,assignee_user_id,due_on,created_by_auth_user_id,source_task_id)
    values ($1,$2,$3,'','todo',$4,$5,$6,$7,$8,$9,$10,$11)
    on conflict (organization_id,system_id,source_task_id) where source_task_id is not null do nothing returning id`,[
      org,systemId,next.title,task.priority,next.id,
      next.moduleId&&next.moduleId===task.module_id?next.moduleId:null,
      next.moduleId&&next.moduleId===task.module_id?task.record_id:null,assignee,dueOn,actor,task.id
    ]);
  const id=result.rows[0]?.id;
  if(id)await client.query("insert into public.operational_task_events(organization_id,system_id,task_id,action,actor_auth_user_id) values($1,$2,$3,'auto_created',$4)",[org,systemId,id,actor]);
  return id??null;
}
