import {Router,type Request,type Response} from "express";
import {z} from "zod";
import {authenticate} from "../../middlewares/authenticate.js";
import {requireOrganizationContext} from "../../middlewares/organization-context.js";
import {requirePermission} from "../../middlewares/require-permission.js";
import {operationalAccess} from "./operational.access.js";
import {validateBody} from "../../middlewares/validate.js";
import {AppError} from "../../utils/app-error.js";
import {ensureId} from "./operational.service.js";
import {formSettingsSchema,formSubmissionSchema,formReviewSchema} from "./operational.forms.schema.js";
import * as forms from "./operational.forms.js";
import pool from "../../config/database.js";
import {siteBuilderPortalResources,activatePortalOnSite} from "./operational.portal.js";

const slugSchema=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
const id=(req:Request,key:string)=>ensureId(req.params[key]);
const slug=(req:Request)=>{const parsed=slugSchema.safeParse(req.params.slug);if(!parsed.success)throw new AppError("Endereço inválido.",400,"FORM_SLUG_INVALID");return parsed.data;};
const org=(res:Response)=>res.locals.organizationContext.organizationId as string;
const actor=(res:Response)=>res.locals.authUser.id as string;
const handler=(fn:(req:Request,res:Response)=>Promise<void>)=>async(req:Request,res:Response)=>{
  try{await fn(req,res);}catch(error){if(error instanceof AppError){res.status(error.statusCode).json({error:error.message,code:error.code});return;}console.error("Form operation failed:",error instanceof Error?error.name:"unknown");res.status(500).json({error:"Não foi possível concluir esta solicitação.",code:"FORM_UNAVAILABLE"});}
};
const attempts=new Map<string,{count:number;reset:number}>();
const limit=(req:Request,formId:string)=>{
  const now=Date.now();
  if(attempts.size>20000)for(const [key,item] of attempts){if(item.reset<now)attempts.delete(key);}
  const key=`${formId}:${req.ip}`;
  const stored=attempts.get(key);
  const next=!stored||stored.reset<now?{count:1,reset:now+900000}:{count:stored.count+1,reset:stored.reset};
  attempts.set(key,next);
  if(next.count>5)throw new AppError("Muitas tentativas. Aguarde alguns minutos.",429,"FORM_RATE_LIMIT");
};
export const publicFormRouter=Router();
publicFormRouter.get("/sites/:slug/forms",handler(async(req,res)=>{
  const page=typeof req.query.page==="string"?req.query.page:"";
  if(!/^[a-z0-9-]{0,80}$/.test(page))throw new AppError("Página inválida.",400,"FORM_PAGE_INVALID");
  res.json({forms:await forms.publicForms(slug(req),page)});
}));
publicFormRouter.get("/sites/:slug/forms/:formId",handler(async(req,res)=>{
  res.json({form:await forms.publicPlacedForm(slug(req),id(req,"formId"))});
}));
publicFormRouter.post("/sites/:slug/forms/:formId",validateBody(formSubmissionSchema),handler(async(req,res)=>{
  const formId=id(req,"formId");limit(req,formId);
  if(req.body.website){res.status(201).json({received:true});return;}
  const submissionId=await forms.publicFormSubmit(slug(req),formId,req.body.data);
  res.status(201).json({id:submissionId});
}));
export const managementFormRouter=Router();
managementFormRouter.use(authenticate,requireOrganizationContext);
const read=requirePermission("operational.read");
const configure=requirePermission("operational.configure");
managementFormRouter.get("/site-resources",read,handler(async(req,res)=>{
  const siteId=ensureId(String(req.query.siteId??""));
  const [available,access]=await Promise.all([forms.siteBuilderResources(org(res),siteId),siteBuilderPortalResources(org(res),siteId)]);
  res.json({forms:available,...access});
}));
managementFormRouter.post("/site-resources/forms/:formId/activate",configure,validateBody(z.object({siteId:z.string().uuid()}).strict()),handler(async(req,res)=>{
  res.json(await forms.activateFormOnSite(org(res),req.body.siteId,id(req,"formId")));
}));
managementFormRouter.post("/site-resources/portal/activate",configure,validateBody(z.object({siteId:z.string().uuid(),systemId:z.string().uuid()}).strict()),handler(async(req,res)=>{
  res.json({portal:await activatePortalOnSite(org(res),req.body.siteId,req.body.systemId)});
}));
managementFormRouter.get("/site-forms",read,handler(async(req,res)=>{
  const siteId=ensureId(String(req.query.siteId??""));
  res.json({forms:await forms.availableSiteForms(org(res),siteId)});
}));
managementFormRouter.get("/systems/:systemId/forms",operationalAccess("read",true),handler(async(req,res)=>{
  const systemId=id(req,"systemId"),site=await forms.formSite(org(res),systemId);
  const pages=site?await pool.query(`select slug,title,is_home as "isHome" from public.institutional_pages where site_id=$1 order by position`,[site.id]):{rows:[]};
  res.json({forms:await forms.listForms(org(res),systemId),site:site?{...site,pages:pages.rows}:null});
}));
managementFormRouter.post("/systems/:systemId/forms",operationalAccess("configure"),handler(async(req,res)=>{
  const formId=await forms.createForm(org(res),id(req,"systemId"));res.status(201).json({id:formId});
}));
managementFormRouter.put("/systems/:systemId/forms/:formId",operationalAccess("configure"),validateBody(formSettingsSchema),handler(async(req,res)=>{
  res.json({saved:await forms.saveForm(org(res),id(req,"systemId"),id(req,"formId"),req.body)});
}));
managementFormRouter.get("/systems/:systemId/forms/:formId/submissions",operationalAccess("write",true),handler(async(req,res)=>{
  res.json({submissions:await forms.formSubmissions(org(res),id(req,"systemId"),id(req,"formId"))});
}));
managementFormRouter.post("/systems/:systemId/forms/:formId/submissions/:submissionId/review",operationalAccess("write",true),validateBody(formReviewSchema),handler(async(req,res)=>{
  res.json(await forms.reviewSubmission(org(res),id(req,"systemId"),id(req,"formId"),id(req,"submissionId"),req.body.decision,actor(res)));
}));
