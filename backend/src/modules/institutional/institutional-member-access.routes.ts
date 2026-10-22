import { Router, type Request, type Response } from "express";
import { z } from "zod";
import pool from "../../config/database.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { requireOrganizationContext } from "../../middlewares/organization-context.js";
import { requirePermission } from "../../middlewares/require-permission.js";
import { validateBody } from "../../middlewares/validate.js";
import { AppError } from "../../utils/app-error.js";

const userIdSchema = z.string().uuid();
const levelSchema = z.object({ level: z.enum(["none", "viewer", "editor", "publisher"]) }).strict();
const router = Router();
router.use(authenticate, requireOrganizationContext);

function handle(error: unknown, res: Response): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message, code: error.code });
    return;
  }
  console.error("Institutional permission management failure", error);
  res.status(500).json({ error: "Não foi possível consultar ou atualizar as permissões dos sites.", code: "INSTITUTIONAL_MEMBER_ACCESS_ERROR" });
}

router.get("/people", requirePermission("organization.manage"), async (_req: Request, res: Response) => {
  try {
    const organizationId = res.locals.organizationContext.organizationId as string;
    const result = await pool.query(`select u.id, u.name, au.email, r.name as "roleName", r.code as "roleCode",
      coalesce(a.access_level,'none') as "level",
      exists(select 1 from public.role_permissions rp join public.permissions p on p.id=rp.permission_id
        where rp.role_id=ou.role_id and p.code in ('institutional.read','institutional.edit','institutional.publish')) as "roleHasSiteAccess"
      from public.organization_users ou join public.users u on u.id=ou.user_id and u.active=true
      join auth.users au on au.id=u.auth_user_id and au.email_confirmed_at is not null
      join public.roles r on r.id=ou.role_id
      left join public.institutional_member_access a on a.organization_id=ou.organization_id and a.user_id=ou.user_id
      where ou.organization_id=$1 and ou.status='active' order by lower(u.name), u.id limit 500`, [organizationId]);
    res.json({ people: result.rows });
  } catch (error) { handle(error, res); }
});

router.put("/people/:userId", requirePermission("organization.manage"), validateBody(levelSchema), async (req: Request, res: Response) => {
  try {
    const organizationId = res.locals.organizationContext.organizationId as string;
    const userId = userIdSchema.parse(req.params.userId);
    const level = req.body.level as "none" | "viewer" | "editor" | "publisher";
    const target = await pool.query<{ roleCode: string; roleHasSiteAccess: boolean }>(`select r.code as "roleCode",
      exists(select 1 from public.role_permissions rp join public.permissions p on p.id=rp.permission_id
      where rp.role_id=ou.role_id and p.code in ('institutional.read','institutional.edit','institutional.publish')) as "roleHasSiteAccess"
      from public.organization_users ou join public.users u on u.id=ou.user_id and u.active=true
      join auth.users au on au.id=u.auth_user_id and au.email_confirmed_at is not null
      join public.roles r on r.id=ou.role_id
      where ou.organization_id=$1 and ou.user_id=$2 and ou.status='active' limit 1`, [organizationId, userId]);
    const member = target.rows[0];
    if (!member) throw new AppError("Esta pessoa não possui uma conta verificada e ativa nesta organização.", 400, "SITE_ACCESS_INVALID_PERSON");
    if (member.roleCode === "organization_admin" || member.roleHasSiteAccess) throw new AppError("O perfil institucional dessa pessoa já concede acesso aos sites. Altere as permissões do papel organizacional para modificar esse acesso.", 409, "SITE_ACCESS_ROLE_PROTECTED");
    if (level === "none") {
      await pool.query("delete from public.institutional_member_access where organization_id=$1 and user_id=$2", [organizationId, userId]);
    } else {
      await pool.query(`insert into public.institutional_member_access (organization_id,user_id,access_level,granted_by_auth_user_id,updated_at)
        values ($1,$2,$3,$4,now())
        on conflict(organization_id,user_id) do update set access_level=excluded.access_level,
          granted_by_auth_user_id=excluded.granted_by_auth_user_id,updated_at=now()`,
        [organizationId, userId, level, res.locals.authUser.id]);
    }
    res.status(204).end();
  } catch (error) { handle(error, res); }
});

export default router;
