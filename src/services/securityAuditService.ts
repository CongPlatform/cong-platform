import { apiGet, apiPost } from "./api";

export interface SecurityAuditEvent {
  id: string;
  occurredAt: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  organizationId: string | null;
  actorUserId: string | null;
  subjectUserId: string | null;
  actorDisplayName: string | null;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  context: Record<string, unknown>;
}
export interface SecurityCaseEvidence {
  reportId: string;
  capturedAt: string;
  reporterUserId: string | null;
  subjectUserId: string | null;
  targetType: string;
  originalTargetId: string;
  reason: string;
  details: string;
  contentExcerpt: string | null;
  statusAtCapture: string;
  retainedUntil: string;
  originalReportExists: boolean;
  archivedDecision: string | null;
  archivedDecisionNote: string | null;
}
export interface SecurityRetainedIdentity {
  userId: string;
  originalName: string;
  originalUsername: string | null;
  originalEmail: string | null;
  retentionReason: string;
  retainedUntil: string;
}
export function getSecurityEvents(
  userId?: string,
): Promise<SecurityAuditEvent[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return apiGet<{ events: SecurityAuditEvent[] }>(
    `/admin/security-audit/events${query}`,
  ).then((v) => v.events);
}
export function getSecurityCases(
  userId?: string,
): Promise<SecurityCaseEvidence[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return apiGet<{ cases: SecurityCaseEvidence[] }>(
    `/admin/security-audit/cases${query}`,
  ).then((v) => v.cases);
}
export function revealSecurityIdentity(
  userId: string,
  reason: string,
): Promise<SecurityRetainedIdentity | null> {
  return apiPost<{ identity: SecurityRetainedIdentity | null }>(
    `/admin/security-audit/identities/${encodeURIComponent(userId)}/reveal`,
    { reason },
  ).then((v) => v.identity);
}
export async function reviewArchivedSecurityCase(
  reportId: string,
  decision: string,
  note: string,
): Promise<void> {
  await apiPost(
    `/admin/security-audit/cases/${encodeURIComponent(reportId)}/review`,
    { decision, note },
  );
}
