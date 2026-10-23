import type { NextFunction, Request, Response } from "express";
import pool from "../config/database.js";
import { roleHasPermission } from "../services/authorization.service.js";
import { AppError } from "../utils/app-error.js";

export type InstitutionalAccessAction = "read" | "edit" | "publish";

const accessLevels: Record<InstitutionalAccessAction, string[]> = {
  read: ["viewer", "editor", "publisher"],
  edit: ["editor", "publisher"],
  publish: ["publisher"],
};

export async function canUseInstitutionalSites(context: { organizationId: string; roleId: string }, authUserId: string, action: InstitutionalAccessAction): Promise<boolean> {
  if (await roleHasPermission(context.roleId, `institutional.${action}`)) return true;

  const grant = await pool.query(
    `select 1 from public.institutional_member_access grant_access
      join public.organization_users membership
        on membership.organization_id=grant_access.organization_id and membership.user_id=grant_access.user_id
      join public.users person on person.id=grant_access.user_id
      where grant_access.organization_id=$1 and membership.status='active' and person.active=true
        and person.auth_user_id=$2 and grant_access.access_level=any($3::text[])
      limit 1`,
    [context.organizationId, authUserId, accessLevels[action]],
  );
  return (grant.rowCount ?? 0) > 0;
}

export function requireInstitutionalPermission(action: InstitutionalAccessAction) {
  return async function institutionalAccessMiddleware(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = res.locals.organizationContext;
      const user = res.locals.authUser;
      if (!context || !user) throw new AppError("Não foi possível identificar a organização ou a sessão.", 401, "INSTITUTIONAL_CONTEXT_REQUIRED");
      if (!await canUseInstitutionalSites(context, user.id, action)) {
        throw new AppError("Sua conta não possui permissão para esta ação nos sites da organização.", 403, "INSTITUTIONAL_PERMISSION_DENIED");
      }
      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      console.error("Institutional access check failure", error);
      res.status(500).json({ error: "Não foi possível conferir seu acesso aos sites.", code: "INSTITUTIONAL_ACCESS_CHECK_FAILED" });
    }
  };
}
