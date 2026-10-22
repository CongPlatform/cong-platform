import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";

export async function getPendingMemberships(org:string){
  const response=await pool.query(`select ou.id,u.name,au.email,ou.created_at as "createdAt" from public.organization_users ou join public.users u on u.id=ou.user_id join auth.users au on au.id=u.auth_user_id where ou.organization_id=$1 and ou.status='pending' order by ou.created_at asc limit 200`,[org]);
  return response.rows;
}

export async function decideMembership(org:string,id:string,approved:boolean,actor:string){
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const pending=await client.query<{userId:string}>(`select user_id as "userId" from public.organization_users where organization_id=$1 and id=$2 and status='pending' for update`,[org,id]);
    if(!pending.rowCount)throw new AppError("Pedido não encontrado ou já analisado.",409,"MEMBERSHIP_ALREADY_REVIEWED");
    await client.query(`insert into public.operational_membership_decisions(organization_id,applicant_user_id,request_id,approved,decided_by_auth_user_id) values($1,$2,$3,$4,$5)`,[org,pending.rows[0]?.userId,id,approved,actor]);
    if(approved){
      const role=await client.query<{id:string}>(`select id from public.roles where code='organization_member' and scope='organization' limit 1`);
      if(!role.rows[0])throw new AppError("A migration de integrantes ainda não foi aplicada.",503,"MEMBER_ROLE_NOT_INSTALLED");
      await client.query(`update public.organization_users set status='active',role_id=$3,joined_at=now(),updated_at=now() where organization_id=$1 and id=$2`,[org,id,role.rows[0].id]);
    }
    else await client.query(`delete from public.organization_users where organization_id=$1 and id=$2`,[org,id]);
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}

export async function ensureAccessRolePresets(org:string,systemId:string){
  await pool.query(`insert into public.operational_access_roles(organization_id,system_id,name,can_read,can_write,can_configure,preset_code)
    values($1,$2,'Administrador',true,true,true,'administrator'),($1,$2,'Editor',true,true,false,'editor'),($1,$2,'Leitor',true,false,false,'viewer')
    on conflict(organization_id,system_id,preset_code) do nothing`,[org,systemId]);
}

export async function listSystemAccess(org:string,systemId:string){
  await ensureAccessRolePresets(org,systemId);
  const [roles,people,grants,modules]=await Promise.all([
    pool.query(`select id,name,can_read as "canRead",can_write as "canWrite",can_configure as "canConfigure",preset_code as "presetCode" from public.operational_access_roles where organization_id=$1 and system_id=$2 order by preset_code nulls last,name`,[org,systemId]),
    pool.query(`select u.id,u.name,au.email,(s.created_by_auth_user_id=u.auth_user_id or r.code='organization_admin') as protected from public.organization_users ou join public.users u on u.id=ou.user_id and u.active=true join auth.users au on au.id=u.auth_user_id and au.email_confirmed_at is not null join public.roles r on r.id=ou.role_id join public.operational_systems s on s.organization_id=ou.organization_id and s.id=$2 where ou.organization_id=$1 and ou.status='active' order by u.name limit 400`,[org,systemId]),
    pool.query(`select g.user_id as "userId",g.role_id as "roleId",coalesce(jsonb_object_agg(mg.module_id::text,mg.access_level) filter(where mg.module_id is not null),'{}'::jsonb) as "modules" from public.operational_system_grants g left join public.operational_module_grants mg on mg.organization_id=g.organization_id and mg.system_id=g.system_id and mg.user_id=g.user_id where g.organization_id=$1 and g.system_id=$2 group by g.user_id,g.role_id`,[org,systemId]),
    pool.query(`select id,name,blueprint_key as "blueprintKey" from public.operational_modules where organization_id=$1 and system_id=$2 order by position`,[org,systemId]),
  ]);
  return {roles:roles.rows,people:people.rows,grants:grants.rows,modules:modules.rows};
}

export async function createAccessRole(org:string,systemId:string,name:string,canRead:boolean,canWrite:boolean,canConfigure:boolean){
  const result=await pool.query(`insert into public.operational_access_roles(organization_id,system_id,name,can_read,can_write,can_configure)
    values($1,$2,$3,$4,$5,$6) returning id,name`,[org,systemId,name,canRead,canWrite,canConfigure]);
  return result.rows[0];
}

async function ensureAssignablePerson(org:string,systemId:string,userId:string){
  const target=await pool.query<{protected:boolean}>(`select (r.code='organization_admin' or s.created_by_auth_user_id=u.auth_user_id) as protected from public.organization_users ou join public.users u on u.id=ou.user_id join public.roles r on r.id=ou.role_id join public.operational_systems s on s.organization_id=ou.organization_id and s.id=$2 where ou.organization_id=$1 and ou.user_id=$3 and ou.status='active'`,[org,systemId,userId]);
  if(!target.rowCount)throw new AppError("Esta pessoa não pertence à organização ativa.",403,"MEMBER_NOT_ACTIVE");
  if(target.rows[0]?.protected)throw new AppError("A gestão principal e o criador mantêm acesso integral ao sistema.",403,"PROTECTED_MANAGER_ACCESS");
}

export async function grantSystemRole(org:string,systemId:string,userId:string,roleId:string,actor:string){
  await ensureAssignablePerson(org,systemId,userId);
  const user=await pool.query(`select 1 from public.organization_users ou join public.users u on u.id=ou.user_id and u.active=true join auth.users au on au.id=u.auth_user_id and au.email_confirmed_at is not null where ou.organization_id=$1 and ou.user_id=$2 and ou.status='active'`,[org,userId]);
  if(!user.rowCount)throw new AppError("Selecione uma conta ativa, verificada e integrante da ONG.",400,"MEMBER_NOT_ELIGIBLE");
  const role=await pool.query(`select 1 from public.operational_access_roles where organization_id=$1 and system_id=$2 and id=$3`,[org,systemId,roleId]);
  if(!role.rowCount)throw new AppError("Perfil não pertence a este sistema.",400,"INVALID_ACCESS_ROLE");
  await pool.query(`insert into public.operational_system_grants(organization_id,system_id,user_id,role_id,granted_by_auth_user_id) values($1,$2,$3,$4,$5) on conflict(organization_id,system_id,user_id) do update set role_id=excluded.role_id,granted_by_auth_user_id=excluded.granted_by_auth_user_id`,[org,systemId,userId,roleId,actor]);
}

export async function setModuleAccess(org:string,systemId:string,moduleId:string,userId:string,level:"none"|"read"|"write"){
  await ensureAssignablePerson(org,systemId,userId);
  const result=await pool.query(`insert into public.operational_module_grants (organization_id,system_id,module_id,user_id,access_level) values($1,$2,$3,$4,$5) on conflict(organization_id,system_id,module_id,user_id) do update set access_level=excluded.access_level returning module_id`,[org,systemId,moduleId,userId,level]);
  if(!result.rowCount)throw new AppError("Não foi possível alterar a permissão.",400,"MODULE_GRANT_FAILED");
}

export async function resetModuleAccess(org:string,systemId:string,moduleId:string,userId:string){
  await ensureAssignablePerson(org,systemId,userId);
  await pool.query(`delete from public.operational_module_grants where organization_id=$1 and system_id=$2 and module_id=$3 and user_id=$4`,[org,systemId,moduleId,userId]);
}

export async function revokeSystemAccess(org:string,systemId:string,userId:string){
  await ensureAssignablePerson(org,systemId,userId);
  await pool.query(`delete from public.operational_system_grants where organization_id=$1 and system_id=$2 and user_id=$3`,[org,systemId,userId]);
}
