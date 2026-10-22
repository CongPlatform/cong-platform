import type { Request, Response, NextFunction } from "express";
import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import { roleHasPermission } from "../../services/authorization.service.js";

export type AccessAction = "read" | "write" | "configure";
export type AccessLevel = "none" | "read" | "write";

export async function isSystemOwner(org: string, systemId: string, authId: string, roleCode: string): Promise<boolean> {
  if (roleCode === "organization_admin") return true;
  const owner = await pool.query(`select 1 from public.operational_systems where organization_id=$1 and id=$2 and created_by_auth_user_id=$3`, [org, systemId, authId]);
  return Boolean(owner.rowCount);
}

export async function ensureAccess(org: string, systemId: string, authId: string, roleCode: string, action: AccessAction, moduleId?: string, broad = false): Promise<void> {
  const exists = await pool.query(`select 1 from public.operational_systems where organization_id=$1 and id=$2 and status<>'archived'`,[org,systemId]);
  if (!exists.rowCount) throw new AppError("Sistema não encontrado.",404,"SYSTEM_NOT_FOUND");
  if(await isSystemOwner(org,systemId,authId,roleCode)) return;
  const grants = await pool.query<{canRead:boolean;canWrite:boolean;canConfigure:boolean;level:AccessLevel|null}>(`
    select r.can_read as "canRead",r.can_write as "canWrite",r.can_configure as "canConfigure",
      mg.access_level as level
    from public.operational_system_grants g
    join public.users u on u.id=g.user_id and u.auth_user_id=$3 and u.active=true
    join public.organization_users ou on ou.organization_id=$1 and ou.user_id=u.id and ou.status='active'
    join public.operational_access_roles r on r.organization_id=g.organization_id and r.system_id=g.system_id and r.id=g.role_id
    left join public.operational_module_grants mg on mg.organization_id=g.organization_id and mg.system_id=g.system_id and mg.user_id=g.user_id and mg.module_id=$4::uuid
    where g.organization_id=$1 and g.system_id=$2 limit 1`,[org,systemId,authId,moduleId??null]);
  const grant=grants.rows[0];
  if(!grant)throw new AppError("Você não recebeu acesso a este sistema.",403,"SYSTEM_ACCESS_DENIED");
  if(action==="configure" && !grant.canConfigure)throw new AppError("Sem permissão de configuração.",403,"SYSTEM_CONFIGURE_DENIED");
  if(action==="write" && !grant.canWrite && !(moduleId && grant.level==="write"))throw new AppError("Sem permissão de escrita.",403,"SYSTEM_WRITE_DENIED");
  if(action==="read" && !grant.canRead)throw new AppError("Sem permissão de visualização.",403,"SYSTEM_READ_DENIED");
  if(moduleId) {
    if(grant.level==="none" || (action==="write" && grant.level==="read"))throw new AppError("Sem permissão nesta área.",403,"MODULE_ACCESS_DENIED");
  }
  if(broad && action!=="configure") {
    const forbidden=await pool.query(`select 1 from public.operational_modules m
      join public.operational_system_grants g on g.organization_id=m.organization_id and g.system_id=m.system_id
      join public.users u on u.id=g.user_id and u.auth_user_id=$3
      left join public.operational_module_grants mg on mg.organization_id=m.organization_id and mg.system_id=m.system_id and mg.module_id=m.id and mg.user_id=u.id
      where m.organization_id=$1 and m.system_id=$2 and (mg.access_level='none' ${action==="write"?"or mg.access_level='read'":""}) limit 1`,[org,systemId,authId]);
    if(forbidden.rowCount)throw new AppError("Esta operação requer acesso a todas as áreas do sistema.",403,"SYSTEM_BROAD_ACCESS_DENIED");
  }
}

export function operationalAccess(action:AccessAction,broad=false) {
  return async(req:Request,res:Response,next:NextFunction)=>{
    try{
      const context=res.locals.organizationContext;
      if(!context)throw new AppError("Organização não identificada.",403,"ORG_REQUIRED");
      const systemId=req.params.systemId;
      if(typeof systemId!=="string") {
        if(action==="configure"){
          if(!await roleHasPermission(context.roleId,"operational.configure"))throw new AppError("Sem permissão para criar ou configurar sistemas.",403,"ORG_CONFIGURE_DENIED");
        }
      } else {
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(systemId))throw new AppError("Identificador inválido.",400,"INVALID_SYSTEM_ID");
        await ensureAccess(context.organizationId,systemId,res.locals.authUser.id,context.roleCode,action,typeof req.params.moduleId==="string"?req.params.moduleId:undefined,broad);
      }
      next();
    }catch(error){if(error instanceof AppError){res.status(error.statusCode).json({error:error.message,code:error.code});return;}console.error("Access check failed",error instanceof Error?error.name:"unknown");res.status(500).json({error:"Não foi possível verificar o acesso.",code:"ACCESS_CHECK_ERROR"});}
  };
}

export async function allowedSystemIds(org:string,authId:string,roleCode:string):Promise<string[]|null> {
  if(roleCode==="organization_admin")return null;
  const result=await pool.query<{id:string}>(`select s.id from public.operational_systems s where s.organization_id=$1 and (s.created_by_auth_user_id=$2 or exists(select 1 from public.operational_system_grants g join public.users u on u.id=g.user_id and u.auth_user_id=$2 join public.organization_users ou on ou.user_id=u.id and ou.organization_id=$1 and ou.status='active' join public.operational_access_roles r on r.id=g.role_id and r.can_read=true where g.organization_id=$1 and g.system_id=s.id))`,[org,authId]);
  return result.rows.map(row=>row.id);
}

export async function visibleModuleIds(org:string,systemId:string,authId:string,roleCode:string):Promise<string[]|null> {
  if(await isSystemOwner(org,systemId,authId,roleCode))return null;
  const result=await pool.query<{id:string}>(`select m.id from public.operational_modules m join public.operational_system_grants g on g.organization_id=m.organization_id and g.system_id=m.system_id join public.users u on u.id=g.user_id and u.auth_user_id=$3 left join public.operational_module_grants mg on mg.organization_id=m.organization_id and mg.system_id=m.system_id and mg.module_id=m.id and mg.user_id=u.id where m.organization_id=$1 and m.system_id=$2 and coalesce(mg.access_level,'read')<>'none'`,[org,systemId,authId]);
  return result.rows.map(row=>row.id);
}
