import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type { PoolClient } from "pg";
import type { CreateTask, EditTask } from "./operational.schemas.js";
import {advanceTaskIfEnabled} from "./operational.execution.js";

const missing = () => new AppError("Tarefa ou sistema indisponível nesta organização.", 404, "OPERATIONAL_NOT_FOUND");
const conflict = () => new AppError("Esta tarefa foi alterada em outra sessão. Atualize e tente novamente.", 409, "TASK_VERSION_CONFLICT");

async function systemExists(client: PoolClient, org: string, systemId: string) {
  const check = await client.query("select 1 from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for share", [org,systemId]);
  if (!check.rowCount) throw missing();
}

async function validateLinks(client: PoolClient, org: string, systemId: string, values: {stepId?: string | null; moduleId?: string | null; recordId?: string | null; assigneeUserId?: string | null}) {
  if (values.stepId) {
    const result = await client.query("select 1 from public.operational_system_plans p, jsonb_array_elements(p.steps) step where p.organization_id=$1 and p.system_id=$2 and step->>'id'=$3 limit 1", [org,systemId,values.stepId]);
    if (!result.rowCount) throw new AppError("Essa etapa não pertence ao percurso atual.", 400, "INVALID_TASK_STEP");
  }
  if (values.moduleId) {
    const result = await client.query("select 1 from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3", [org,systemId,values.moduleId]);
    if (!result.rowCount) throw new AppError("Módulo inválido para este sistema.", 400, "INVALID_TASK_MODULE");
  }
  if (values.recordId) {
    if (!values.moduleId) throw new AppError("Escolha o módulo do registro.", 400, "INVALID_TASK_RECORD");
    const result = await client.query("select 1 from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4 and archived_at is null", [org,systemId,values.moduleId,values.recordId]);
    if (!result.rowCount) throw new AppError("O registro selecionado não está disponível.", 400, "INVALID_TASK_RECORD");
  }
  if (values.assigneeUserId) {
    const result = await client.query("select 1 from public.organization_users ou join public.users u on u.id=ou.user_id where ou.organization_id=$1 and ou.user_id=$2 and ou.status='active' and u.active limit 1", [org,values.assigneeUserId]);
    if (!result.rowCount) throw new AppError("Escolha um integrante ativo da organização.", 400, "INVALID_TASK_ASSIGNEE");
  }
}

const taskSelect = `select t.id,t.title,t.notes,t.status,t.priority,t.due_on as "dueOn",t.step_id as "stepId",t.module_id as "moduleId",t.record_id as "recordId",t.assignee_user_id as "assigneeUserId",u.name as "assigneeName",t.revision,t.created_at as "createdAt",t.updated_at as "updatedAt" from public.operational_tasks t left join public.users u on u.id=t.assignee_user_id`;

export async function listTeam(org: string) {
  const result = await pool.query(`select u.id,u.name from public.organization_users ou join public.users u on u.id=ou.user_id where ou.organization_id=$1 and ou.status='active' and u.active order by u.name asc limit 250`, [org]);
  return result.rows as {id:string;name:string}[];
}

export async function listTasks(org: string, systemId: string, offset: number) {
  const system = await pool.query("select 1 from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived'",[org,systemId]);
  if (!system.rowCount) throw missing();
  const [rows,total] = await Promise.all([
    pool.query(`${taskSelect} where t.organization_id=$1 and t.system_id=$2 and t.archived_at is null order by case t.status when 'todo' then 0 when 'progress' then 1 when 'blocked' then 2 else 3 end,t.due_on asc nulls last,t.created_at desc limit 100 offset $3`,[org,systemId,offset]),
    pool.query("select count(*)::int as count from public.operational_tasks where organization_id=$1 and system_id=$2 and archived_at is null",[org,systemId]),
  ]);
  return {tasks:rows.rows,total:total.rows[0]?.count??0};
}

export async function createTask(org:string,actor:string,systemId:string,values:CreateTask) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await systemExists(client,org,systemId);
    const count = await client.query("select count(*)::int as n from public.operational_tasks where organization_id=$1 and system_id=$2 and archived_at is null",[org,systemId]);
    if ((count.rows[0]?.n??0)>=5000) throw new AppError("Limite de tarefas atingido neste sistema.",409,"TASK_LIMIT");
    await validateLinks(client,org,systemId,values);
    const result = await client.query(`insert into public.operational_tasks(organization_id,system_id,title,notes,status,priority,due_on,step_id,module_id,record_id,assignee_user_id,created_by_auth_user_id) values ($1,$2,$3,$4,'todo',$5,$6,$7,$8,$9,$10,$11) returning id`,[org,systemId,values.title,values.notes,values.priority,values.dueOn,values.stepId,values.moduleId,values.recordId,values.assigneeUserId,actor]);
    const taskId = result.rows[0]?.id as string;
    await client.query("insert into public.operational_task_events(organization_id,system_id,task_id,action,actor_auth_user_id) values ($1,$2,$3,'created',$4)",[org,systemId,taskId,actor]);
    await client.query("COMMIT");
    return await getTask(org,systemId,taskId);
  } catch(e) {await client.query("ROLLBACK");throw e;} finally{client.release();}
}

async function getTask(org:string,systemId:string,taskId:string) {
  const result = await pool.query(`${taskSelect} where t.organization_id=$1 and t.system_id=$2 and t.id=$3 and t.archived_at is null`,[org,systemId,taskId]);
  if (!result.rowCount) throw missing();
  return result.rows[0];
}

export async function updateTask(org:string,actor:string,systemId:string,taskId:string,values:EditTask) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await systemExists(client,org,systemId);
    const old = await client.query("select * from public.operational_tasks where organization_id=$1 and system_id=$2 and id=$3 and archived_at is null for update",[org,systemId,taskId]);
    if (!old.rowCount) throw missing();
    if (old.rows[0]?.revision!==values.revision) throw conflict();
    const original = old.rows[0];
    const next = {
      title:values.title??original.title,
      notes:values.notes??original.notes,
      status:values.status??original.status,
      priority:values.priority??original.priority,
      dueOn:values.dueOn===undefined?(original.due_on ? new Date(original.due_on).toISOString().slice(0,10) : null):values.dueOn,
      stepId:values.stepId===undefined?original.step_id:values.stepId,
      moduleId:values.moduleId===undefined?original.module_id:values.moduleId,
      recordId:values.recordId===undefined?original.record_id:values.recordId,
      assigneeUserId:values.assigneeUserId===undefined?original.assignee_user_id:values.assigneeUserId,
    };
    await validateLinks(client,org,systemId,next);
    await client.query(`update public.operational_tasks set title=$4,notes=$5,status=$6,priority=$7,due_on=$8,step_id=$9,module_id=$10,record_id=$11,assignee_user_id=$12,revision=revision+1 where organization_id=$1 and system_id=$2 and id=$3`,[org,systemId,taskId,next.title,next.notes,next.status,next.priority,next.dueOn,next.stepId,next.moduleId,next.recordId,next.assigneeUserId]);
    await client.query("insert into public.operational_task_events(organization_id,system_id,task_id,action,actor_auth_user_id) values ($1,$2,$3,'updated',$4)",[org,systemId,taskId,actor]);
    await advanceTaskIfEnabled(client,org,systemId,actor,original,next.status);
    await client.query("COMMIT");
    return await getTask(org,systemId,taskId);
  } catch(e) {await client.query("ROLLBACK");throw e;} finally{client.release();}
}

export async function archiveTask(org:string,actor:string,systemId:string,taskId:string,revision:number) {
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await systemExists(client,org,systemId);
    const result=await client.query("update public.operational_tasks set archived_at=now(),revision=revision+1 where organization_id=$1 and system_id=$2 and id=$3 and revision=$4 and archived_at is null returning id",[org,systemId,taskId,revision]);
    if(!result.rowCount){const present=await client.query("select 1 from public.operational_tasks where organization_id=$1 and system_id=$2 and id=$3 and archived_at is null",[org,systemId,taskId]);if(present.rowCount)throw conflict();throw missing();}
    await client.query("insert into public.operational_task_events(organization_id,system_id,task_id,action,actor_auth_user_id) values ($1,$2,$3,'archived',$4)",[org,systemId,taskId,actor]);
    await client.query("COMMIT");
  }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}

export async function listAgendaTasks(org:string,systemId:string,month:string) {
  const year=Number(month.slice(0,4));
  if(year<2000||year>2100)throw new AppError("Mês fora do intervalo permitido.",400,"INVALID_MONTH");
  const client=await pool.connect();
  try {
    await systemExists(client,org,systemId);
    const result=await client.query(`${taskSelect} where t.organization_id=$1 and t.system_id=$2 and t.archived_at is null and t.due_on >= $3::date and t.due_on < ($3::date + interval '1 month') order by t.due_on asc,t.created_at asc limit 500`,[org,systemId,`${month}-01`]);
    return result.rows;
  } finally {client.release();}
}
