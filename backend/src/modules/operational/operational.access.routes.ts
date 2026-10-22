import { Router, type Request, type Response } from "express";
import pool from "../../config/database.js";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireOrganizationContext } from "../../middlewares/organization-context.js";
import { requirePermission } from "../../middlewares/require-permission.js";
import { validateBody } from "../../middlewares/validate.js";
import { AppError } from "../../utils/app-error.js";
import { ensureAccess, isSystemOwner, visibleModuleIds } from "./operational.access.js";
import * as management from "./operational.access-management.js";

const uuid=z.string().uuid();
const roleSchema=z.object({name:z.string().trim().min(2).max(80),canRead:z.boolean(),canWrite:z.boolean(),canConfigure:z.boolean()}).strict().refine(v=>(!v.canWrite||v.canRead)&&(!v.canConfigure||(v.canRead&&v.canWrite)),{message:"Configurar exige permissão de visualizar e editar."});
const grantSchema=z.object({userId:uuid,roleId:uuid}).strict();
const moduleSchema=z.object({userId:uuid,moduleId:uuid,level:z.enum(["none","read","write","inherit"])}).strict();
const decisionSchema=z.object({approved:z.boolean()}).strict();
const wrap=(fn:(req:Request,res:Response)=>Promise<void>)=>async(req:Request,res:Response)=>{try{await fn(req,res);}catch(error){if(error instanceof AppError){res.status(error.statusCode).json({error:error.message,code:error.code});return;}console.error("Operational access failure",error instanceof Error?error.name:"unknown");res.status(500).json({error:"Não foi possível atualizar os acessos.",code:"ACCESS_ERROR"});}};
const org=(res:Response)=>res.locals.organizationContext.organizationId as string;
const actor=(res:Response)=>res.locals.authUser.id as string;
const sys=(req:Request)=>uuid.parse(req.params.systemId);

export const organizationMembershipRouter=Router();
organizationMembershipRouter.use(authenticate,requireOrganizationContext);
organizationMembershipRouter.get("/join-requests",requirePermission("organization.manage"),wrap(async(_req,res)=>{res.json({requests:await management.getPendingMemberships(org(res))});}));
organizationMembershipRouter.post("/join-requests/:requestId/decision",requirePermission("organization.manage"),validateBody(decisionSchema),wrap(async(req,res)=>{await management.decideMembership(org(res),uuid.parse(req.params.requestId),req.body.approved,actor(res));res.status(204).end();}));

export const operationalAccessRouter=Router();
operationalAccessRouter.use(authenticate,requireOrganizationContext);
operationalAccessRouter.get("/systems/:systemId/access/me",wrap(async(req,res)=>{
  const systemId=sys(req),owner=await isSystemOwner(org(res),systemId,actor(res),res.locals.organizationContext.roleCode);
  await ensureAccess(org(res),systemId,actor(res),res.locals.organizationContext.roleCode,"read");
  const visible=await visibleModuleIds(org(res),systemId,actor(res),res.locals.organizationContext.roleCode);
  let canConfigure=owner,canWrite=owner;
  if(!owner){const grant=await pool.query<{canWrite:boolean;canConfigure:boolean}>(`select r.can_write as "canWrite",r.can_configure as "canConfigure" from public.operational_system_grants g join public.users u on u.id=g.user_id and u.auth_user_id=$3 join public.operational_access_roles r on r.id=g.role_id where g.organization_id=$1 and g.system_id=$2`,[org(res),systemId,actor(res)]);canConfigure=grant.rows[0]?.canConfigure??false;canWrite=grant.rows[0]?.canWrite??false;}
  const modules=await pool.query<{id:string}>(`select id from public.operational_modules where organization_id=$1 and system_id=$2`,[org(res),systemId]);
  const overrides=owner?{rows:[] as {moduleId:string;level:string}[]}:await pool.query<{moduleId:string;level:string}>(`select mg.module_id as "moduleId",mg.access_level as level from public.operational_module_grants mg join public.users u on u.id=mg.user_id and u.auth_user_id=$3 where mg.organization_id=$1 and mg.system_id=$2`,[org(res),systemId,actor(res)]);
  res.json({owner,canConfigure,canWrite,visibleModuleIds:visible,hasHiddenAreas:visible!==null&&visible.length<modules.rowCount!,modulePermissions:Object.fromEntries(overrides.rows.map(row=>[row.moduleId,row.level]))});
}));
operationalAccessRouter.get("/systems/:systemId/access",wrap(async(req,res)=>{await ensureAccess(org(res),sys(req),actor(res),res.locals.organizationContext.roleCode,"configure");res.json(await management.listSystemAccess(org(res),sys(req)));}));
operationalAccessRouter.post("/systems/:systemId/access/roles",validateBody(roleSchema),wrap(async(req,res)=>{await ensureAccess(org(res),sys(req),actor(res),res.locals.organizationContext.roleCode,"configure");res.status(201).json({role:await management.createAccessRole(org(res),sys(req),req.body.name,req.body.canRead,req.body.canWrite,req.body.canConfigure)});}));
operationalAccessRouter.patch("/systems/:systemId/access/grants",validateBody(grantSchema),wrap(async(req,res)=>{await ensureAccess(org(res),sys(req),actor(res),res.locals.organizationContext.roleCode,"configure");await management.grantSystemRole(org(res),sys(req),req.body.userId,req.body.roleId,actor(res));res.status(204).end();}));
operationalAccessRouter.delete("/systems/:systemId/access/grants/:userId",wrap(async(req,res)=>{await ensureAccess(org(res),sys(req),actor(res),res.locals.organizationContext.roleCode,"configure");await management.revokeSystemAccess(org(res),sys(req),uuid.parse(req.params.userId));res.status(204).end();}));
operationalAccessRouter.patch("/systems/:systemId/access/modules",validateBody(moduleSchema),wrap(async(req,res)=>{await ensureAccess(org(res),sys(req),actor(res),res.locals.organizationContext.roleCode,"configure");const {moduleId,userId,level}=req.body;if(level==="inherit")await management.resetModuleAccess(org(res),sys(req),moduleId,userId);else await management.setModuleAccess(org(res),sys(req),moduleId,userId,level);res.status(204).end();}));
