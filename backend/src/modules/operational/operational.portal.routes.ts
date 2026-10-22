import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireOrganizationContext } from "../../middlewares/organization-context.js";
import { operationalAccess } from "./operational.access.js";
import { validateBody } from "../../middlewares/validate.js";
import { AppError } from "../../utils/app-error.js";
import { ensureId } from "./operational.service.js";
import * as portal from "./operational.portal.js";

const slugSchema=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
const setupSchema=z.object({enabled:z.boolean(),intakeModuleId:z.string().uuid().nullable()}).strict();
const memberSchema=z.object({email:z.email().max(254),role:z.enum(["volunteer","beneficiary"])}).strict();
const batchSchema=z.object({userIds:z.array(z.string().uuid()).min(1).max(50).refine(ids=>new Set(ids).size===ids.length)}).strict();
const requestSchema=z.object({data:z.record(z.string(),z.unknown()),consent:z.literal(true)}).strict();
const taskSchema=z.object({revision:z.number().int().positive(),status:z.enum(["progress","done"])}).strict();
const reviewSchema=z.object({decision:z.enum(["approved","rejected"])}).strict();
const execute=(fn:(req:Request,res:Response)=>Promise<void>)=>async(req:Request,res:Response)=>{
  try{await fn(req,res);}catch(e){if(e instanceof AppError){res.status(e.statusCode).json({error:e.message,code:e.code});return;}console.error("Portal operational error:",e instanceof Error?e.name:"unknown");res.status(500).json({error:"Não foi possível concluir esta operação.",code:"PORTAL_ERROR"});}
};
const slug=(req:Request)=>{const parsed=slugSchema.safeParse(req.params.slug);if(!parsed.success)throw new AppError("Endereço inválido.",400,"INVALID_PORTAL_SLUG");return parsed.data;};
const org=(res:Response)=>res.locals.organizationContext.organizationId as string;
const actor=(res:Response)=>res.locals.authUser.id as string;
const id=(req:Request,key:string)=>ensureId(req.params[key]);

export const publicPortalRouter=Router();
publicPortalRouter.get("/sites/:slug/portal",execute(async(req,res)=>{res.json({portal:await portal.publicPortalLink(slug(req))});}));

export const memberPortalRouter=Router();
memberPortalRouter.use(authenticate);
memberPortalRouter.get("/:slug/me",execute(async(req,res)=>{res.json(await portal.portalOverview(slug(req),actor(res)));}));
memberPortalRouter.post("/:slug/requests",validateBody(requestSchema),execute(async(req,res)=>{res.status(201).json({id:await portal.submitPortalRequest(slug(req),actor(res),req.body.data)});}));
memberPortalRouter.patch("/:slug/tasks/:taskId",validateBody(taskSchema),execute(async(req,res)=>{await portal.updateMyPortalTask(slug(req),actor(res),id(req,"taskId"),req.body.revision,req.body.status);res.status(204).end();}));

export const managementPortalRouter=Router();
managementPortalRouter.use(authenticate,requireOrganizationContext);
managementPortalRouter.get("/systems/:systemId/portal",operationalAccess("configure"),execute(async(req,res)=>{const systemId=id(req,"systemId");res.json({portal:await portal.readPortalSettings(org(res),systemId),members:await portal.listPortalMembers(org(res),systemId)});}));
managementPortalRouter.put("/systems/:systemId/portal",operationalAccess("configure"),validateBody(setupSchema),execute(async(req,res)=>{res.json({portal:await portal.configurePortal(org(res),id(req,"systemId"),req.body.enabled,req.body.intakeModuleId)});}));
managementPortalRouter.get("/systems/:systemId/portal/team-candidates",operationalAccess("configure"),execute(async(req,res)=>{res.json({people:await portal.listPortalTeamCandidates(org(res),id(req,"systemId"))});}));
managementPortalRouter.post("/systems/:systemId/portal/members/batch",operationalAccess("configure"),validateBody(batchSchema),execute(async(req,res)=>{res.json(await portal.grantPortalTeamBatch(org(res),id(req,"systemId"),actor(res),req.body.userIds));}));
managementPortalRouter.post("/systems/:systemId/portal/members",operationalAccess("configure"),validateBody(memberSchema),execute(async(req,res)=>{res.status(201).json({member:await portal.grantPortalMember(org(res),id(req,"systemId"),actor(res),req.body.email,req.body.role)});}));
managementPortalRouter.delete("/systems/:systemId/portal/members/:memberId",operationalAccess("configure"),execute(async(req,res)=>{await portal.revokePortalMember(org(res),id(req,"systemId"),id(req,"memberId"));res.status(204).end();}));
managementPortalRouter.get("/systems/:systemId/portal/requests",operationalAccess("write",true),execute(async(req,res)=>{res.json({requests:await portal.portalRequestsForManager(org(res),id(req,"systemId"))});}));
managementPortalRouter.post("/systems/:systemId/portal/requests/:requestId/review",operationalAccess("write",true),validateBody(reviewSchema),execute(async(req,res)=>{await portal.reviewPortalRequest(org(res),id(req,"systemId"),actor(res),id(req,"requestId"),req.body.decision);res.status(204).end();}));
