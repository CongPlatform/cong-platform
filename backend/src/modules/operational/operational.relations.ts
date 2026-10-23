import type { Pool, PoolClient } from "pg";
import { AppError } from "../../utils/app-error.js";
import type { ModuleField } from "./operational.schemas.js";

const unavailable = () => new AppError("O registro relacionado não está disponível neste sistema.",400,"INVALID_OPERATIONAL_RELATION");

export async function validateOperationalRelationFields(client:PoolClient,org:string,systemId:string,sourceModuleId:string,fields:ModuleField[]){
  const targetIds=[...new Set(fields.filter(f=>f.type==="relation").map(f=>f.targetModuleId).filter((id):id is string=>Boolean(id)))];
  for(const targetId of targetIds){
    if(targetId===sourceModuleId)throw new AppError("Escolha uma peça diferente para criar o vínculo.",400,"SELF_OPERATIONAL_RELATION");
    const result=await client.query("select blueprint_key from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3",[org,systemId,targetId]);
    if(!result.rowCount||["agenda","board","dispatch"].includes(result.rows[0]?.blueprint_key))throw new AppError("A peça relacionada precisa existir neste mesmo sistema e armazenar registros.",400,"INVALID_RELATION_MODULE");
  }
}

export async function syncOperationalRelations(client:PoolClient,org:string,systemId:string,sourceModuleId:string,sourceRecordId:string,fields:ModuleField[],data:Record<string,string|number|boolean|null>){
  await client.query("delete from public.operational_record_links where organization_id=$1 and system_id=$2 and source_module_id=$3 and source_record_id=$4",[org,systemId,sourceModuleId,sourceRecordId]);
  for(const field of fields){
    if(field.type!=="relation"||!data[field.key])continue;
    const targetId=field.targetModuleId;
    if(!targetId||targetId===sourceModuleId)throw unavailable();
    const recordId=data[field.key];
    const row=await client.query("select id from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4 and archived_at is null for share",[org,systemId,targetId,recordId]);
    if(!row.rowCount)throw unavailable();
    await client.query("insert into public.operational_record_links(organization_id,system_id,source_module_id,source_record_id,source_field_key,target_module_id,target_record_id) values ($1,$2,$3,$4,$5,$6,$7)",[org,systemId,sourceModuleId,sourceRecordId,field.key,targetId,recordId]);
  }
}

export async function assertRecordNotReferenced(client:PoolClient,org:string,systemId:string,moduleId:string,recordId:string){
  const used=await client.query("select 1 from public.operational_record_links where organization_id=$1 and system_id=$2 and target_module_id=$3 and target_record_id=$4 limit 1",[org,systemId,moduleId,recordId]);
  if(used.rowCount)throw new AppError("Este registro está relacionado a outro cadastro. Remova esses vínculos antes de arquivar.",409,"RECORD_HAS_RELATIONS");
}

export async function listOperationalRecordOptions(client:Pool,org:string,systemId:string,moduleId:string,q:string,ids:string[]){
  const module=await client.query("select blueprint_key from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3",[org,systemId,moduleId]);
  if(!module.rowCount||["agenda","board","dispatch"].includes(module.rows[0]?.blueprint_key))throw unavailable();
  const label="left(coalesce(nullif(r.data->>'nome',''),nullif(r.data->>'titulo',''),nullif(r.data->>'item',''),nullif(r.data->>'name',''),nullif(r.data->>'descricao',''),'Registro '||left(r.id::text,8)),110)";
  const selection=ids.length?"and r.id=any($4::uuid[])":`and ${label} ilike $4`;
  const result=await client.query(`select r.id,${label} as label from public.operational_records r where r.organization_id=$1 and r.system_id=$2 and r.module_id=$3 and r.archived_at is null ${selection} order by r.created_at desc limit 50`,[org,systemId,moduleId,ids.length?ids:`%${q}%`]);
  return result.rows as {id:string;label:string}[];
}
