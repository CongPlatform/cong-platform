import type { Request, Response } from "express";
import { AppError } from "../utils/app-error.js";
import { listSecurityAuditEvents, listSecurityCases, revealRetainedIdentity, reviewArchivedSecurityCase } from "../services/security-audit.service.js";

function queryText(input: unknown): string | undefined {return typeof input==='string' ? input : undefined;}
function queryNumber(input: unknown): number | undefined {const value=queryText(input);if(!value)return undefined;const n=Number(value);return Number.isSafeInteger(n)?n:undefined;}
function fail(res: Response,error: unknown): void {
  if(error instanceof AppError) {res.status(error.statusCode).json({error:error.message,code:error.code});return;}
  console.error("Security audit operation failed",error);
  res.status(500).json({error:"Não foi possível consultar a auditoria.",code:"SECURITY_AUDIT_FAILED"});
}
export async function events(req: Request, res: Response): Promise<void> {
  try {
    const organizationId = queryText(req.query.organizationId);
    const userId = queryText(req.query.userId);
    const eventType = queryText(req.query.eventType);
    const limit = queryNumber(req.query.limit);
    const offset = queryNumber(req.query.offset);
    const data = await listSecurityAuditEvents(res.locals.authUser.id, {
      ...(organizationId !== undefined ? { organizationId } : {}),
      ...(userId !== undefined ? { userId } : {}),
      ...(eventType !== undefined ? { eventType } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
    res.status(200).json({ events: data });
  } catch (error) { fail(res, error); }
}
export async function cases(req: Request, res: Response): Promise<void> {
  try {
    const userId = queryText(req.query.userId);
    const limit = queryNumber(req.query.limit);
    const offset = queryNumber(req.query.offset);
    const data = await listSecurityCases(res.locals.authUser.id, {
      ...(userId !== undefined ? { userId } : {}),
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
    });
    res.status(200).json({ cases: data });
  } catch (error) { fail(res, error); }
}
export async function identity(req:Request,res:Response):Promise<void> {
  try {const userId=req.params.userId;
    if(typeof userId!=='string')throw new AppError("ID inválido.",400,"AUDIT_INVALID_ID");
    const reason=typeof req.body?.reason==='string'?req.body.reason:'';
    const data=await revealRetainedIdentity(res.locals.authUser.id,userId,reason);
    res.status(200).json({identity:data});
  }catch(error){fail(res,error);}
}
export async function resolveCase(req:Request,res:Response):Promise<void> {
  try {const reportId=req.params.reportId;
    if(typeof reportId!=='string')throw new AppError("ID inválido.",400,"AUDIT_INVALID_ID");
    const decision=typeof req.body?.decision==='string'?req.body.decision:'';
    const note=typeof req.body?.note==='string'?req.body.note:'';
    if(!['substantiated','dismissed','needs_external_review'].includes(decision))throw new AppError("Decisão inválida.",400,"AUDIT_CASE_DECISION_INVALID");
    await reviewArchivedSecurityCase(res.locals.authUser.id,reportId,
      decision as 'substantiated'|'dismissed'|'needs_external_review',note);
    res.status(200).json({ok:true});
  }catch(error){fail(res,error);}
}
