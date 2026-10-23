import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type { OperationalPlan } from "./operational.schemas.js";

const emptyPlan = (systemId: string) => ({systemId, intent:"", needs:[] as string[], steps:[] as OperationalPlan["steps"], revision:0, updatedAt:null as string|null});
const unavailable = () => new AppError("Sistema não encontrado nesta organização.",404,"OPERATIONAL_NOT_FOUND");
const stale = () => new AppError("O planejamento foi alterado em outra aba. Atualize antes de salvar.",409,"OPERATIONAL_PLAN_CONFLICT");

export async function getOperationalPlan(organizationId:string,systemId:string) {
  const result = await pool.query(`select p.system_id as "systemId", p.intent, p.needs, p.steps, p.revision, p.updated_at as "updatedAt"
    from public.operational_systems s left join public.operational_system_plans p
    on p.organization_id=s.organization_id and p.system_id=s.id
    where s.organization_id=$1 and s.id=$2 and s.status<>'archived'`,[organizationId,systemId]);
  if(!result.rowCount)throw unavailable();
  const row=result.rows[0];
  return row?.revision===null?emptyPlan(systemId):row;
}

export async function updateOperationalPlan(organizationId:string,systemId:string,actor:string,plan:OperationalPlan) {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const system=await client.query(`select id,status from public.operational_systems where organization_id=$1 and id=$2 and status<>'archived' for update`,[organizationId,systemId]);
    if(!system.rowCount)throw unavailable();
    if(system.rows[0]?.status!=="draft")throw new AppError("Volte ao modo de construção para editar o percurso.",409,"OPERATIONAL_SYSTEM_ACTIVE");
    const row=await client.query(`select revision from public.operational_system_plans where organization_id=$1 and system_id=$2 for update`,[organizationId,systemId]);
    const current=row.rows[0]?.revision??0;
    if(current!==plan.revision)throw stale();
    const links=plan.steps.map(step=>step.moduleId).filter((value):value is string=>Boolean(value));
    const taskLinks=await client.query("select distinct step_id from public.operational_tasks where organization_id=$1 and system_id=$2 and step_id is not null and archived_at is null",[organizationId,systemId]);
    const nextIds=new Set(plan.steps.map(step=>step.id));
    if(taskLinks.rows.some(item=>!nextIds.has(item.step_id as string)))throw new AppError("Há tarefas vinculadas a uma etapa removida. Realoque as tarefas antes de removê-la.",409,"PLAN_STEP_IN_USE");
    if(links.length){
      const found=await client.query(`select id from public.operational_modules where organization_id=$1 and system_id=$2 and id=any($3::uuid[])`,[organizationId,systemId,links]);
      const actual=new Set(found.rows.map(item=>item.id as string));
      if(links.some(id=>!actual.has(id)))throw new AppError("Uma etapa indica um módulo que não pertence a este sistema.",400,"OPERATIONAL_INVALID_PLAN_LINK");
    }
    if(current===0){
      await client.query(`insert into public.operational_system_plans (organization_id,system_id,intent,needs,steps,revision,updated_by_auth_user_id) values ($1,$2,$3,$4::jsonb,$5::jsonb,1,$6)`,[organizationId,systemId,plan.intent,JSON.stringify(plan.needs),JSON.stringify(plan.steps),actor]);
    }else{
      await client.query(`update public.operational_system_plans set intent=$3,needs=$4::jsonb,steps=$5::jsonb,revision=revision+1,updated_by_auth_user_id=$6,updated_at=now() where organization_id=$1 and system_id=$2`,[organizationId,systemId,plan.intent,JSON.stringify(plan.needs),JSON.stringify(plan.steps),actor]);
    }
    await client.query("delete from public.operational_step_rules where organization_id=$1 and system_id=$2 and not (step_id=any($3::uuid[]))",[organizationId,systemId,plan.steps.map(step=>step.id)]);
    await client.query(`insert into public.operational_events (organization_id,system_id,action,actor_auth_user_id) values ($1,$2,'plan.updated',$3)`,[organizationId,systemId,actor]);
    await client.query("COMMIT");
    return getOperationalPlan(organizationId,systemId);
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
