import { apiTenantGet, apiTenantPost, apiTenantDelete } from "./api";

export type AiGoal = "system" | "site" | "both";
export type AiPhase = "clarify" | "propose";
export type AiStatus = "pending" | "processing" | AiPhase | "failed" | "cancelled";
export interface AiTurn { role: "usuario" | "assistente"; text: string; time: string }
export interface AiField { key: string; label: string; type: string; required: boolean; help: string; options: string[] }
export interface AiModule { alias: string; blueprint_key: string; name: string; description: string; fields: AiField[] }
export interface AiWorkflow { kind: string; title: string; description: string; module_alias: string }
export interface AiSection { type: string; title: string; text: string; action_label: string; linked_module_alias: string }
export interface AiPage { title: string; slug: string; sections: AiSection[] }
export interface AiPublicForm {
  name: string; page_slug: string; form_module_alias: string; target_module_alias: string;
  fields: AiField[]; bindings: { form_field_key: string; module_field_key: string }[];
}
export interface AiPlan {
  system: { name: string; description: string; modules: AiModule[]; workflow: AiWorkflow[] } | null;
  site: { name: string; audience: string; style: string; pages: AiPage[] } | null;
  connection: { link_system: boolean; public_forms: AiPublicForm[] };
  limitations: string[]; confirmations: string[];
}
export interface AiProposal {
  schema_version: "cong.assistant.v2"; phase: AiPhase; reply: string; questions: string[];
  memory: { summary: string; facts: { key: string; value: string }[]; assumptions: string[] };
  plan: AiPlan;
}
export interface AiSession {
  id: string; goal: AiGoal; status: AiStatus; round: number; asked: number; revision_count: number;
  turns: AiTurn[]; memory: AiProposal["memory"]; plan: AiPlan | null; last_job_id: string | null; updated_at: string;
}
export interface AiSessionDetail {
  session: AiSession; last_job_status: string; last_result: AiProposal | null;
  metrics: { coverage_status?: string; unmet_requirements?: string[]; ui_choices?: string[]; duration_ms?: number; model?: string } | null;
  error_code: string | null;
}
export interface AiAvailability { worker_online: boolean; model: string; busy: boolean; queue_size: number }
export interface AiSessionSummary { id: string; goal: AiGoal; status: AiStatus; updated_at: string }
export interface AiAccepted { session_id: string; job_id: string; status: "pending" }
export const aiStatus = () => apiTenantGet<AiAvailability>("/ai/status");
export const aiSessions = () => apiTenantGet<{ sessions: AiSessionSummary[] }>("/ai/sessions");
export const aiDetail = (id: string) => apiTenantGet<AiSessionDetail>(`/ai/sessions/${encodeURIComponent(id)}`);
export const aiStart = (goal: AiGoal, prompt: string) => apiTenantPost<AiAccepted>("/ai/sessions", { goal, prompt });
export const aiReply = (id: string, answer: string) => apiTenantPost<AiAccepted>(`/ai/sessions/${encodeURIComponent(id)}/reply`, { answer });
export const aiRetry = (id: string) => apiTenantPost<AiAccepted>(`/ai/sessions/${encodeURIComponent(id)}/retry`, {});
export const aiCancel = (id: string) => apiTenantPost<{ ok: boolean }>(`/ai/sessions/${encodeURIComponent(id)}/cancel`, {});

export const aiDelete = (id: string) => apiTenantDelete<{ok:boolean}>(`/ai/sessions/${encodeURIComponent(id)}`);
