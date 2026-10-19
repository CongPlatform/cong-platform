import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireSecurityAdministrator(
  authUserId: string,
): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `
    select u.id from public.users u
    join public.roles r on r.id = u.platform_role_id
    where u.auth_user_id=$1 and u.active=true and u.deleted_at is null
      and r.code='platform_admin' limit 1`,
    [authUserId],
  );
  if (!result.rows[0])
    throw new AppError(
      "Acesso restrito aos administradores de segurança da CONG.",
      403,
      "SECURITY_AUDIT_FORBIDDEN",
    );
  return result.rows[0].id;
}

function validateOptionalUUID(value: string | undefined): string | null {
  if (!value) return null;
  if (!uuidPattern.test(value))
    throw new AppError("Identificador UUID inválido.", 400, "AUDIT_INVALID_ID");
  return value;
}

export async function listSecurityAuditEvents(
  authUserId: string,
  params: {
    organizationId?: string;
    userId?: string;
    eventType?: string;
    limit?: number;
    offset?: number;
  },
): Promise<unknown[]> {
  await requireSecurityAdministrator(authUserId);
  const organizationId = validateOptionalUUID(params.organizationId);
  const userId = validateOptionalUUID(params.userId);
  const eventType = params.eventType?.slice(0, 80) || null;
  const take = Math.max(1, Math.min(50, params.limit ?? 30));
  const skip = Math.max(0, Math.min(5000, params.offset ?? 0));
  const result = await pool.query(
    `
    select e.id,e.occurred_at as "occurredAt",e.event_type as "eventType",
      e.entity_type as "entityType",e.entity_id as "entityId",
      e.organization_id as "organizationId",e.actor_user_id as "actorUserId",
      e.subject_user_id as "subjectUserId",e.before_state as "beforeState",
      e.after_state as "afterState",e.context,
      case when au.deleted_at is not null then 'Conta excluída' else au.name end as "actorDisplayName"
    from public.security_audit_events e
    left join public.users au on au.id=e.actor_user_id
    where ($1::uuid is null or e.organization_id=$1)
      and ($2::uuid is null or e.actor_user_id=$2 or e.subject_user_id=$2)
      and ($3::text is null or e.event_type=$3)
    order by e.occurred_at desc,e.id desc limit $4 offset $5`,
    [organizationId, userId, eventType, take, skip],
  );
  return result.rows;
}

export async function listSecurityCases(
  authUserId: string,
  params: {
    userId?: string;
    limit?: number;
    offset?: number;
  },
): Promise<unknown[]> {
  await requireSecurityAdministrator(authUserId);
  const userId = validateOptionalUUID(params.userId);
  const take = Math.max(1, Math.min(50, params.limit ?? 30));
  const skip = Math.max(0, Math.min(5000, params.offset ?? 0));
  const result = await pool.query(
    `
    select e.report_id as "reportId",e.captured_at as "capturedAt",
      e.reporter_user_id as "reporterUserId",e.subject_user_id as "subjectUserId",
      e.target_type as "targetType",e.original_target_id as "originalTargetId",
      e.reason,e.details,e.content_excerpt as "contentExcerpt",
      e.status_at_capture as "statusAtCapture",e.retained_until as "retainedUntil",
      r.id is not null as "originalReportExists",
      v.decision as "archivedDecision",v.note as "archivedDecisionNote",v.reviewed_at as "archivedReviewedAt"
    from public.security_report_evidence e
    left join public.community_reports r on r.id=e.report_id
    left join public.security_archived_case_reviews v on v.report_id=e.report_id
    where ($1::uuid is null or e.reporter_user_id=$1 or e.subject_user_id=$1)
    order by e.captured_at desc limit $2 offset $3`,
    [userId, take, skip],
  );
  return result.rows;
}

/** Consulta excepcional, com JUSTIFICATIVA obrigatória e registro de acesso. */
export async function revealRetainedIdentity(
  authUserId: string,
  userId: string,
  reason: string,
): Promise<unknown> {
  const adminId = await requireSecurityAdministrator(authUserId);
  validateOptionalUUID(userId);
  const cleanReason = reason.trim();
  if (cleanReason.length < 10 || cleanReason.length > 500) {
    throw new AppError(
      "Explique em 10 a 500 caracteres por que precisa consultar a identidade.",
      400,
      "AUDIT_ACCESS_REASON_REQUIRED",
    );
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `
      select user_id as "userId",original_name as "originalName",
       original_username as "originalUsername",original_email as "originalEmail",
       retention_reason as "retentionReason",retained_until as "retainedUntil"
      from public.security_audit_identities
      where user_id=$1 and retained_until > now()`,
      [userId],
    );
    await client.query(
      `insert into public.security_audit_events
      (event_type,entity_type,entity_id,actor_user_id,subject_user_id,after_state)
      values ('security.identity_access','user',$1,$2,$1,$3::jsonb)`,
      [
        userId,
        adminId,
        JSON.stringify({
          reason: cleanReason,
          recordFound: result.rows.length > 0,
        }),
      ],
    );
    await client.query("commit");
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function reviewArchivedSecurityCase(
  authUserId: string,
  reportId: string,
  decision: "substantiated" | "dismissed" | "needs_external_review",
  note: string,
): Promise<void> {
  const adminId = await requireSecurityAdministrator(authUserId);
  validateOptionalUUID(reportId);
  if (
    !["substantiated", "dismissed", "needs_external_review"].includes(decision)
  ) {
    throw new AppError("Decisão inválida.", 400, "AUDIT_CASE_DECISION_INVALID");
  }
  const cleanNote = note.trim();
  if (cleanNote.length < 10 || cleanNote.length > 1200) {
    throw new AppError(
      "Informe uma justificativa de 10 a 1200 caracteres.",
      400,
      "AUDIT_CASE_NOTE_REQUIRED",
    );
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const evidence = await client.query<{ subjectUserId: string | null }>(
      `
      select subject_user_id as "subjectUserId" from public.security_report_evidence
      where report_id=$1 and retained_until>now() for key share`,
      [reportId],
    );
    if (!evidence.rows[0])
      throw new AppError(
        "Evidência não encontrada ou expirada.",
        404,
        "AUDIT_CASE_NOT_FOUND",
      );
    await client.query(
      `insert into public.security_archived_case_reviews
      (report_id,reviewed_by_user_id,decision,note) values($1,$2,$3,$4)`,
      [reportId, adminId, decision, cleanNote],
    );
    await client.query(
      `insert into public.security_audit_events
      (event_type,entity_type,entity_id,actor_user_id,subject_user_id,after_state)
      values ('security.archived_case_review','community_report',$1,$2,$3,$4::jsonb)`,
      [
        reportId,
        adminId,
        evidence.rows[0].subjectUserId,
        JSON.stringify({ decision, note: cleanNote }),
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new AppError(
        "Este caso já recebeu uma decisão arquivada.",
        409,
        "AUDIT_CASE_ALREADY_REVIEWED",
      );
    }
    throw error;
  } finally {
    client.release();
  }
}
