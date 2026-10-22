import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import { fieldsSchema } from "./operational.schemas.js";
import { validateRecord } from "./operational.validation.js";
import {advanceTaskIfEnabled} from "./operational.execution.js";
import {portalIntakeCompatible} from "./operational.portal.policy.js";

const missing = () => new AppError("Portal não encontrado ou acesso não autorizado.",404,"PORTAL_NOT_AVAILABLE");
const allowed = new Set(["text","long_text","email","number","date","select","boolean"]);

export async function readPortalSettings(org:string,systemId:string){
  const result=await pool.query(`select p.id,p.site_id as "siteId",p.system_id as "systemId",p.enabled,p.intake_module_id as "intakeModuleId",s.slug as "siteSlug",s.published_at as "publishedAt"
    from public.operational_site_portals p join public.institutional_sites s on s.id=p.site_id and s.organization_id=p.organization_id
    where p.organization_id=$1 and p.system_id=$2 limit 1`,[org,systemId]);
  return result.rows[0]??null;
}

export async function configurePortal(org:string,systemId:string,enabled:boolean,intakeModuleId:string|null){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const system=await client.query(`select brand_site_id as "siteId",status from public.operational_systems where organization_id=$1 and id=$2 and status<>'archived' for update`,[org,systemId]);
    if(!system.rowCount)throw missing();
    const siteId=system.rows[0]?.siteId as string|null;
    if(!siteId)throw new AppError("Conecte um site publicado ao sistema em “Conexões” antes de habilitar o acesso.",400,"PORTAL_SITE_REQUIRED");
    const site=await client.query(`select 1 from public.institutional_sites where organization_id=$1 and id=$2 and published_at is not null`,[org,siteId]);
    if(!site.rowCount)throw new AppError("O site precisa estar publicado.",400,"PORTAL_SITE_UNPUBLISHED");
    if(enabled&&system.rows[0]?.status!=="active")throw new AppError("Ative o sistema antes de abrir o portal.",400,"PORTAL_SYSTEM_INACTIVE");
    if(intakeModuleId){
      const mod=await client.query(`select schema_fields from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3`,[org,systemId,intakeModuleId]);
      if(!mod.rowCount)throw new AppError("Peça de destino inválida.",400,"PORTAL_INVALID_MODULE");
      const fields=fieldsSchema.parse(mod.rows[0]?.schema_fields);
      if(!portalIntakeCompatible(fields))throw new AppError("O formulário só aceita peças com campos simples, sem relacionamentos.",400,"PORTAL_UNSAFE_FIELDS");
    }
    const conflicts=await client.query(`select id from public.operational_site_portals where organization_id=$1 and site_id=$2 and system_id<>$3`,[org,siteId,systemId]);
    if(conflicts.rowCount)throw new AppError("Este site já possui um portal associado a outro sistema.",409,"PORTAL_SITE_IN_USE");
    const existing=await client.query(`select id from public.operational_site_portals where organization_id=$1 and system_id=$2 limit 1 for update`,[org,systemId]);
    if(existing.rowCount){
      await client.query(`update public.operational_site_portals set site_id=$3,enabled=$4,intake_module_id=$5 where organization_id=$1 and system_id=$2`,[org,systemId,siteId,enabled,intakeModuleId]);
    }else{
      await client.query(`insert into public.operational_site_portals (organization_id,site_id,system_id,enabled,intake_module_id) values($1,$2,$3,$4,$5)`,[org,siteId,systemId,enabled,intakeModuleId]);
    }
    await client.query("COMMIT");
    return readPortalSettings(org,systemId);
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function listPortalMembers(org:string,systemId:string){
  const result=await pool.query(`select m.id,u.name,m.access_role as "role",m.created_at as "createdAt"
    from public.operational_portal_members m join public.operational_site_portals p on p.id=m.portal_id and p.organization_id=m.organization_id
    join public.users u on u.id=m.user_id where p.organization_id=$1 and p.system_id=$2 order by u.name limit 250`,[org,systemId]);
  return result.rows;
}

export async function listPortalTeamCandidates(org:string,systemId:string){
  const portal=await readPortalSettings(org,systemId);
  if(!portal) return [];
  const result=await pool.query(`select u.id,u.name,au.email,m.access_role as "currentRole"
    from public.organization_users ou
    join public.users u on u.id=ou.user_id and u.active=true
    join auth.users au on au.id=u.auth_user_id and au.email_confirmed_at is not null
    left join public.operational_portal_members m on m.portal_id=$2 and m.user_id=u.id and m.organization_id=$1
    where ou.organization_id=$1 and ou.status='active'
    order by u.name,u.id limit 300`,[org,portal.id]);
  return result.rows as {id:string;name:string;email:string;currentRole:"volunteer"|"beneficiary"|null}[];
}

export async function grantPortalTeamBatch(org:string,systemId:string,actor:string,userIds:string[]){
  const portal=await readPortalSettings(org,systemId);
  if(!portal)throw new AppError("Configure o acesso pelo site antes de autorizar integrantes.",400,"PORTAL_NOT_CONFIGURED");
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const eligible=await client.query(`select u.id from public.organization_users ou
      join public.users u on u.id=ou.user_id and u.active=true
      join auth.users au on au.id=u.auth_user_id and au.email_confirmed_at is not null
      where ou.organization_id=$1 and ou.status='active' and u.id=any($2::uuid[])
      for share of ou,u,au`,[org,userIds]);
    if(eligible.rowCount!==userIds.length)throw new AppError("A lista mudou. Atualize os integrantes e selecione novamente somente contas ativas e verificadas.",409,"PORTAL_CANDIDATES_CHANGED");
    const result=await client.query(`insert into public.operational_portal_members
      (organization_id,portal_id,user_id,access_role,granted_by_auth_user_id)
      select $1,$2,u.id,'volunteer',$3 from public.users u where u.id=any($4::uuid[])
      on conflict(portal_id,user_id) do nothing returning id`,[org,portal.id,actor,userIds]);
    await client.query("COMMIT");
    return {added:result.rowCount??0};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function grantPortalMember(org:string,systemId:string,actor:string,email:string,role:"volunteer"|"beneficiary"){
  const portal=await readPortalSettings(org,systemId);
  if(!portal)throw new AppError("Configure o portal antes de autorizar participantes.",400,"PORTAL_NOT_CONFIGURED");
  const account=await pool.query(`select u.id from auth.users au join public.users u on u.auth_user_id=au.id
    where lower(au.email)=lower($1) and u.active=true and au.email_confirmed_at is not null limit 1`,[email]);
  if(!account.rowCount)throw new AppError("Conta CONG ativa e com e-mail confirmado não encontrada.",404,"PORTAL_USER_NOT_FOUND");
  if(role==="volunteer"){
    const membership=await pool.query(`select 1 from public.organization_users where organization_id=$1 and user_id=$2 and status='active' limit 1`,[org,account.rows[0]?.id]);
    if(!membership.rowCount)throw new AppError("Vincule primeiro esta conta como integrante da organização para atribuir tarefas.",400,"PORTAL_VOLUNTEER_MEMBERSHIP_REQUIRED");
  }
  const result=await pool.query(`insert into public.operational_portal_members(organization_id,portal_id,user_id,access_role,granted_by_auth_user_id)
    values($1,$2,$3,$4,$5) on conflict(portal_id,user_id) do update set access_role=excluded.access_role,granted_by_auth_user_id=excluded.granted_by_auth_user_id returning id`,[org,portal.id,account.rows[0]?.id,role,actor]);
  return result.rows[0];
}

export async function revokePortalMember(org:string,systemId:string,memberId:string){
  const result=await pool.query(`delete from public.operational_portal_members m using public.operational_site_portals p
    where m.portal_id=p.id and m.organization_id=$1 and p.organization_id=$1 and p.system_id=$2 and m.id=$3 returning m.id`,[org,systemId,memberId]);
  if(!result.rowCount)throw missing();
}

export async function publicPortalLink(slug:string){
  const result=await pool.query(`select p.id,p.system_id as "systemId",o.name as "organizationName"
    from public.operational_site_portals p join public.institutional_sites s on s.id=p.site_id and s.organization_id=p.organization_id
    join public.organizations o on o.id=p.organization_id
    join public.operational_systems os on os.id=p.system_id and os.organization_id=p.organization_id
    join public.organization_brand_profiles b on b.organization_id=s.organization_id
    where (s.slug=$1 or b.public_slug=$1) and s.is_primary=true and s.published_at is not null and p.enabled=true and os.status='active' limit 1`,[slug]);
  return result.rows[0]??null;
}

async function portalAccess(slug:string,authId:string){
  const client=await pool.connect();
  try{
    const result=await client.query(`select p.id,p.organization_id as "organizationId",p.system_id as "systemId",p.intake_module_id as "intakeModuleId",os.name as "systemName",
      coalesce(m.access_role,case when ou.id is not null and (ar.can_read=true or os.created_by_auth_user_id=$2 or org_role.code='organization_admin') then 'volunteer' end) as role,
      u.id as "userId",u.name as "userName",
      (ou.id is not null and (ar.can_read=true or os.created_by_auth_user_id=$2 or org_role.code='organization_admin')) as "workspaceAllowed"
      from public.operational_site_portals p join public.institutional_sites s on s.id=p.site_id and s.organization_id=p.organization_id
      join public.operational_systems os on os.id=p.system_id and os.organization_id=p.organization_id
      join public.users u on u.auth_user_id=$2 and u.active=true
      join public.organization_brand_profiles b on b.organization_id=s.organization_id
      left join public.operational_portal_members m on m.portal_id=p.id and m.user_id=u.id
      left join public.organization_users ou on ou.organization_id=p.organization_id and ou.user_id=u.id and ou.status='active'
      left join public.roles org_role on org_role.id=ou.role_id
      left join public.operational_system_grants g on g.organization_id=p.organization_id and g.system_id=p.system_id and g.user_id=u.id
      left join public.operational_access_roles ar on ar.id=g.role_id and ar.organization_id=g.organization_id and ar.system_id=g.system_id
      where (s.slug=$1 or b.public_slug=$1) and s.is_primary=true and s.published_at is not null and p.enabled=true and os.status='active' limit 1`,[slug,authId]);
    const context=result.rows[0];
    if(!context||!context.role)throw missing();
    return context as {id:string;organizationId:string;systemId:string;intakeModuleId:string|null;systemName:string;role:"volunteer"|"beneficiary";userId:string;userName:string;workspaceAllowed:boolean};
  }finally{client.release();}
}

export async function portalOverview(slug:string,authId:string){
  const context=await portalAccess(slug,authId);
  if(context.role==="volunteer"){
    const tasks=await pool.query(`select id,title,notes,status,priority,due_on as "dueOn",revision
      from public.operational_tasks where organization_id=$1 and system_id=$2 and assignee_user_id=$3 and archived_at is null order by due_on asc nulls last,created_at desc limit 100`,[context.organizationId,context.systemId,context.userId]);
    return {role:context.role,systemName:context.systemName,userName:context.userName,tasks:tasks.rows,requests:[],formFields:[],workspace:context.workspaceAllowed?{organizationId:context.organizationId,systemId:context.systemId}:null};
  }
  const [requests,mod]=await Promise.all([
    pool.query(`select id,status,created_at as "createdAt" from public.operational_portal_requests where organization_id=$1 and portal_id=$2 and user_id=$3 order by created_at desc limit 50`,[context.organizationId,context.id,context.userId]),
    context.intakeModuleId?pool.query(`select schema_fields from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3`,[context.organizationId,context.systemId,context.intakeModuleId]):Promise.resolve({rows:[]}),
  ]);
  const fields=mod.rows[0]?fieldsSchema.parse(mod.rows[0].schema_fields).filter(field=>allowed.has(field.type)):[];
  return {role:context.role,systemName:context.systemName,userName:context.userName,tasks:[],requests:requests.rows,formFields:fields,workspace:context.workspaceAllowed?{organizationId:context.organizationId,systemId:context.systemId}:null};
}

export async function submitPortalRequest(slug:string,authId:string,data:Record<string,unknown>){
  const context=await portalAccess(slug,authId);
  if(context.role!=="beneficiary"||!context.intakeModuleId)throw missing();
  const mod=await pool.query(`select schema_fields from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3`,[context.organizationId,context.systemId,context.intakeModuleId]);
  if(!mod.rowCount)throw missing();
  const fields=fieldsSchema.parse(mod.rows[0]?.schema_fields);
  if(!portalIntakeCompatible(fields))throw new AppError("Configuração do formulário indisponível.",400,"PORTAL_FIELDS_CHANGED");
  const clean=validateRecord(fields,data);
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const recent=await client.query(`select count(*)::int as n from public.operational_portal_requests where portal_id=$1 and user_id=$2 and created_at>now()-interval '1 hour'`,[context.id,context.userId]);
    if((recent.rows[0]?.n??0)>=5)throw new AppError("Limite de cinco solicitações por hora.",429,"PORTAL_REQUEST_LIMIT");
    const result=await client.query(`insert into public.operational_portal_requests(organization_id,portal_id,module_id,user_id,data) values($1,$2,$3,$4,$5::jsonb) returning id`,[context.organizationId,context.id,context.intakeModuleId,context.userId,JSON.stringify(clean)]);
    await client.query("COMMIT");
    return result.rows[0]?.id as string;
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function updateMyPortalTask(slug:string,authId:string,taskId:string,revision:number,status:"progress"|"done"){
  const context=await portalAccess(slug,authId);
  if(context.role!=="volunteer")throw missing();
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const prior=await client.query(`select * from public.operational_tasks where id=$1 and organization_id=$2 and system_id=$3 and assignee_user_id=$4 and archived_at is null for update`,[taskId,context.organizationId,context.systemId,context.userId]);
    if(!prior.rowCount||prior.rows[0]?.revision!==revision||prior.rows[0]?.status==="done")throw new AppError("Tarefa alterada ou indisponível.",409,"PORTAL_TASK_CONFLICT");
    await client.query(`update public.operational_tasks set status=$5,revision=revision+1
      where id=$1 and organization_id=$2 and system_id=$3 and assignee_user_id=$4`,[taskId,context.organizationId,context.systemId,context.userId,status]);
    await client.query(`update public.operational_delivery_demands set status=$4,revision=revision+1 where organization_id=$1 and system_id=$2 and task_id=$3 and status in ('assigned','delivered') and status<>$4`,[context.organizationId,context.systemId,taskId,status==='done'?'delivered':'assigned']);
    await advanceTaskIfEnabled(client,context.organizationId,context.systemId,authId,prior.rows[0],status);
    await client.query(`insert into public.operational_task_events(organization_id,system_id,task_id,action,actor_auth_user_id) values($1,$2,$3,'updated',$4)`,[context.organizationId,context.systemId,taskId,authId]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function portalRequestsForManager(org:string,systemId:string){
  const result=await pool.query(`select r.id,r.status,r.data,r.created_at as "createdAt",u.name as "requestedBy",m.name as "moduleName"
    from public.operational_portal_requests r join public.operational_site_portals p on p.id=r.portal_id
    join public.users u on u.id=r.user_id join public.operational_modules m on m.id=r.module_id
    where r.organization_id=$1 and p.system_id=$2 order by r.created_at desc limit 100`,[org,systemId]);
  return result.rows;
}

export async function reviewPortalRequest(org:string,systemId:string,authId:string,requestId:string,decision:"approved"|"rejected"){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query(`select r.*,m.schema_fields from public.operational_portal_requests r
      join public.operational_site_portals p on p.id=r.portal_id and p.organization_id=r.organization_id
      join public.operational_modules m on m.id=r.module_id and m.system_id=p.system_id and m.organization_id=r.organization_id
      where r.organization_id=$1 and p.system_id=$2 and r.id=$3 for update of r`,[org,systemId,requestId]);
    const req=result.rows[0];
    if(!req||req.status!=="pending")throw new AppError("Solicitação já analisada ou não encontrada.",409,"PORTAL_REQUEST_REVIEWED");
    let recordId:string|null=null;
    if(decision==="approved"){
      const fields=fieldsSchema.parse(req.schema_fields);
      const clean=validateRecord(fields,req.data);
      const created=await client.query(`insert into public.operational_records (organization_id,system_id,module_id,data,created_by_auth_user_id)
        values($1,$2,$3,$4::jsonb,$5) returning id`,[org,systemId,req.module_id,JSON.stringify(clean),authId]);
      recordId=created.rows[0]?.id as string;
      await client.query(`insert into public.operational_events(organization_id,system_id,module_id,record_id,action,actor_auth_user_id)
        values($1,$2,$3,$4,'record.created',$5)`,[org,systemId,req.module_id,recordId,authId]);
    }
    await client.query(`update public.operational_portal_requests set status=$2,record_id=$3,reviewed_by_auth_user_id=$4,reviewed_at=now() where id=$1`,[requestId,decision,recordId,authId]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function siteBuilderPortalResources(orgId:string,siteId:string){
  const site=await pool.query(`select id,published_at,is_primary from public.institutional_sites
    where id=$1 and organization_id=$2`,[siteId,orgId]);
  if(!site.rowCount)throw new AppError("Site não encontrado nesta organização.",404,"SITE_NOT_FOUND");
  const systems=await pool.query(`select id,name from public.operational_systems
    where organization_id=$1 and brand_site_id=$2 and status='active' order by name limit 50`,[orgId,siteId]);
  const portal=await pool.query(`select system_id as "systemId",enabled from public.operational_site_portals
    where organization_id=$1 and site_id=$2 limit 1`,[orgId,siteId]);
  return {
    published:Boolean(site.rows[0]?.published_at)&&Boolean(site.rows[0]?.is_primary),
    systems:systems.rows as {id:string;name:string}[],
    portal:portal.rows[0]??null
  };
}

export async function activatePortalOnSite(orgId:string,siteId:string,systemId:string){
  const resources=await siteBuilderPortalResources(orgId,siteId);
  if(!resources.published)throw new AppError("Publique este site como principal antes de habilitar o portal.",409,"PORTAL_SITE_UNPUBLISHED");
  if(!resources.systems.some(system=>system.id===systemId))throw new AppError("Conecte o sistema a este site usando “Conexões” antes de habilitar o acesso.",409,"PORTAL_SYSTEM_SITE_MISMATCH");
  if(resources.portal?.systemId&&resources.portal.systemId!==systemId)throw new AppError("Este site já está vinculado ao portal de outro sistema.",409,"PORTAL_SITE_IN_USE");
  const configured=await readPortalSettings(orgId,systemId);
  return configurePortal(orgId,systemId,true,configured?.intakeModuleId??null);
}
