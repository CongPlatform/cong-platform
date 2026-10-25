import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type { OperationalMetricSpec } from "./operational.schemas.js";

const missing = () => new AppError("Sistema não encontrado nesta organização.", 404, "OPERATIONAL_NOT_FOUND");
const conflict = () => new AppError("O sistema foi alterado em outra sessão. Atualize a página.", 409, "OPERATIONAL_VERSION_CONFLICT");

export async function getOperationalDashboard(org: string, systemId: string) {
  const present = await pool.query<{dashboard_config:{metrics?:OperationalMetricSpec[]}|null}>("select dashboard_config from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived'", [org, systemId]);
  if (!present.rowCount) throw missing();
  const [modules, tasks] = await Promise.all([
    pool.query<{id:string;name:string;blueprintKey:string;total:number}>(`
      select m.id,m.name,m.blueprint_key as "blueprintKey",case when m.blueprint_key='availability' then (select count(*)::int from public.operational_delivery_availability a where a.organization_id=m.organization_id and a.system_id=m.system_id and a.capacity>0 and a.service_day>=current_date and a.service_day<current_date+interval '7 days') when m.blueprint_key in ('agenda','board','dispatch') then (select count(*)::int from public.operational_tasks t where t.organization_id=m.organization_id and t.system_id=m.system_id and t.archived_at is null and (m.blueprint_key in ('board','dispatch') or t.due_on is not null)) else count(r.id)::int end as total
      from public.operational_modules m
      left join public.operational_records r on r.organization_id=m.organization_id
        and r.system_id=m.system_id and r.module_id=m.id and r.archived_at is null
      where m.organization_id=$1 and m.system_id=$2
      group by m.id,m.name,m.blueprint_key,m.position order by m.position,m.name`, [org,systemId]),
    pool.query<{total:number;todo:number;progress:number;blocked:number;done:number}>(`
      select count(*)::int as total,
        count(*) filter (where status='todo')::int as todo,
        count(*) filter (where status='progress')::int as progress,
        count(*) filter (where status='blocked')::int as blocked,
        count(*) filter (where status='done')::int as done
      from public.operational_tasks
      where organization_id=$1 and system_id=$2 and archived_at is null`, [org,systemId]),
  ]);
  const dbConfig=present.rows[0]?.dashboard_config;
  const specs:OperationalMetricSpec[]=Array.isArray(dbConfig?.metrics)?dbConfig.metrics.slice(0,8):[];
  const configuredModules=await pool.query<{id:string;fields:{key:string;type:string}[]}>("select id,schema_fields as fields from public.operational_modules where organization_id=$1 and system_id=$2",[org,systemId]);
  const allowed=new Map(configuredModules.rows.map(item=>[item.id,item.fields]));
  const valid=specs.filter(spec=>{
    const field=allowed.get(spec.moduleId)?.find(f=>f.key===spec.fieldKey);
    return Boolean(field&&(spec.operation==="distribution"?field.type==="select":field.type==="number"));
  });
  const metrics=await Promise.all(valid.map(async spec=>{
    if(spec.operation==="distribution"){
      const result=await pool.query<{label:string;count:number}>(`select coalesce(nullif(trim(data ->> $4),''),'Não informado') as label,count(*)::int as count
        from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and archived_at is null
        group by 1 order by count desc,label limit 10`,[org,systemId,spec.moduleId,spec.fieldKey]);
      return {...spec,value:null,distribution:result.rows};
    }
    const result=await pool.query<{value:string|null}>(`select ${spec.operation==="sum"?"sum":"avg"}(case when length(data->>$4)<=24 and (data->>$4) ~ '^-?[0-9]+([.][0-9]+)?$' then (data->>$4)::numeric else null end) as value
      from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and archived_at is null`,[org,systemId,spec.moduleId,spec.fieldKey]);
    const value=result.rows[0]?.value;
    return {...spec,value:value===null||value===undefined?null:Number(value),distribution:[]};
  }));
  return {modules:modules.rows,tasks:tasks.rows[0]??{total:0,todo:0,progress:0,blocked:0,done:0},metrics};
}

export async function configureOperationalDashboard(org:string,actor:string,systemId:string,version:number,visibleModuleIds:string[]|null,showTasks:boolean,metrics:OperationalMetricSpec[]=[]) {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const system=await client.query<{version:number;status:string}>("select version,status from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for update",[org,systemId]);
    if (!system.rowCount) throw missing();
    if (system.rows[0]?.version!==version) throw conflict();
    if (visibleModuleIds!==null) {
      const modules=await client.query<{id:string}>("select id from public.operational_modules where organization_id=$1 and system_id=$2",[org,systemId]);
      const valid=new Set(modules.rows.map(item=>item.id));
      if (visibleModuleIds.some(id=>!valid.has(id))) throw new AppError("Uma peça não pertence a este sistema.",400,"INVALID_DASHBOARD_MODULE");
    }
    const modulesForMetrics=await client.query<{id:string;fields:{key:string;type:string}[]}>("select id,schema_fields as fields from public.operational_modules where organization_id=$1 and system_id=$2",[org,systemId]);
    const allowed=new Map(modulesForMetrics.rows.map(module=>[module.id,module.fields]));
    for(const metric of metrics){
      const field=allowed.get(metric.moduleId)?.find(item=>item.key===metric.fieldKey);
      if(!field||(metric.operation==="distribution"?field.type!=="select":field.type!=="number"))throw new AppError("Selecione um campo numérico ou de opções válido deste sistema.",400,"INVALID_DASHBOARD_METRIC");
    }
    const config={visibleModuleIds,showTasks,metrics};
    await client.query("update public.operational_systems set dashboard_config=$3::jsonb,version=version+1 where organization_id=$1 and id=$2",[org,systemId,JSON.stringify(config)]);
    await client.query("insert into public.operational_events (organization_id,system_id,action,actor_auth_user_id) values ($1,$2,'system.updated',$3)",[org,systemId,actor]);
    await client.query("COMMIT");
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}

export async function setOperationalBrandSite(org:string,actor:string,systemId:string,version:number,siteId:string|null) {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const system=await client.query<{version:number;status:string}>("select version,status from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' for update",[org,systemId]);
    if (!system.rowCount) throw missing();
    if (system.rows[0]?.version!==version) throw conflict();
    if(siteId){
      const site=await client.query("select id from public.institutional_sites where organization_id=$1 and id=$2 and (published_at is not null or $3='draft')",[org,siteId,system.rows[0]?.status]);
      if(!site.rowCount) throw new AppError("Escolha um site da sua organização. Se o sistema estiver ativo, o site precisa estar publicado.",400,"INVALID_OPERATIONAL_BRAND_SITE");
    }
    await client.query("update public.operational_systems set brand_site_id=$3,version=version+1 where organization_id=$1 and id=$2",[org,systemId,siteId]);
    await client.query("insert into public.operational_events (organization_id,system_id,action,actor_auth_user_id) values ($1,$2,'system.updated',$3)",[org,systemId,actor]);
    await client.query("COMMIT");
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}
