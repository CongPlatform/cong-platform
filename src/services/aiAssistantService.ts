import { apiTenantGet, apiTenantPost, apiTenantDelete, apiTenantPatch } from "./api";

export interface AiProjectContext { kind: "site" | "system"; title: string; updated_at: string; structure: string }
export type AiGoal = "system" | "site" | "both";
export type AiPhase = "clarify" | "propose" | "guide";
export type AiStatus = "pending" | "processing" | AiPhase | "failed" | "cancelled";
export interface AiTurn { role: "usuario" | "assistente"; text: string; time: string }
export interface AiField { key: string; label: string; type: string; required: boolean; help: string; options: string[] }
export interface AiModule { alias: string; blueprint_key: string; name: string; description: string; fields: AiField[] }
export interface AiWorkflow { kind: string; title: string; description: string; module_alias: string }
export interface AiSection { type: string; title: string; text: string; action_label: string; linked_module_alias: string; items?: {title:string;description:string;kind?:string}[] }
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
export interface AiMemory { summary: string; facts: { key: string; value: string }[]; assumptions: string[]; verifiedFacts?: {key:string;value:string}[]; excludedFacts?: string[]; verifiedSummary?: string; currentFocus?: string; projectContext?: AiProjectContext | null }
export interface AiProposal {
  schema_version: "cong.assistant.v2"; phase: AiPhase; reply: string; questions: string[];
  memory: AiMemory;
  plan: AiPlan;
}
export interface AiSession {
  id: string; goal: AiGoal; status: AiStatus; round: number; asked: number; revision_count: number;
  turns: AiTurn[]; memory: AiProposal["memory"]; plan: AiPlan | null; last_job_id: string | null; updated_at: string;
}
export interface AiSessionDetail {
  session: AiSession; last_job_status: string; last_result: AiProposal | null;
  metrics: { coverage_status?: string; unmet_requirements?: string[]; ui_choices?: string[]; conversation_mode?: string; duration_ms?: number; model?: string } | null;
  error_code: string | null;
}
export interface AiAvailability { worker_online: boolean; model: string; busy: boolean; queue_size: number }
export interface AiSessionSummary { id: string; goal: AiGoal; status: AiStatus; updated_at: string; title?: string }
export interface AiAccepted { session_id: string; job_id: string; status: "pending" }
export const aiStatus = () => apiTenantGet<AiAvailability>("/ai/status");
export const aiSessions = () => apiTenantGet<{ sessions: AiSessionSummary[] }>("/ai/sessions");
export const aiDetail = (id: string) => apiTenantGet<AiSessionDetail>(`/ai/sessions/${encodeURIComponent(id)}`);
export const aiStart = (goal: AiGoal, prompt: string, project_context?:AiProjectContext|null) => apiTenantPost<AiAccepted>("/ai/sessions", { goal, prompt, ...(project_context === undefined ? {} : {project_context}) });
export const aiReply = (id: string, answer: string, project_context?:AiProjectContext|null, goal?:AiGoal) => apiTenantPost<AiAccepted>(`/ai/sessions/${encodeURIComponent(id)}/reply`, { answer, ...(project_context === undefined ? {} : {project_context}), ...(goal ? {goal} : {}) });
export const aiInspectProject = (id:string, project_context:AiProjectContext) => apiTenantPost<AiAccepted>(`/ai/sessions/${encodeURIComponent(id)}/inspect-project`, {project_context});
export const aiRetry = (id: string) => apiTenantPost<AiAccepted>(`/ai/sessions/${encodeURIComponent(id)}/retry`, {});
export const aiCancel = (id: string) => apiTenantPost<{ ok: boolean }>(`/ai/sessions/${encodeURIComponent(id)}/cancel`, {});

export const aiRevokeProject = (id:string) => apiTenantDelete<{ok:boolean}>(`/ai/sessions/${encodeURIComponent(id)}/project-context`);
export const aiSaveMemory = (id: string, memory: Pick<AiMemory,"summary"|"facts"|"assumptions">) => apiTenantPatch<{memory:AiMemory}>(`/ai/sessions/${encodeURIComponent(id)}/memory`, memory);
export const aiDelete = (id: string) => apiTenantDelete<{ok:boolean}>(`/ai/sessions/${encodeURIComponent(id)}`);

// Telemetria de testes internos: não transmite prompts nem dados de pessoas atendidas.
export type AiMetricEventKind="draft_started"|"draft_completed"|"draft_failed"|"manual_adjustment"|"revision_requested"|"review_opened"|"published";
export type AiMetricEventInput={id:string;kind:AiMetricEventKind;run_id?:string|null;elapsed_ms?:number|null;pages_created?:number;modules_created?:number;forms_prepared?:number};
export type AiMetricEvent={id:string;event_kind:AiMetricEventKind;run_id:string|null;elapsed_ms:number|null;pages_created:number|null;modules_created:number|null;forms_prepared:number|null;created_at:string};
export type AiSessionTelemetry={
 session_id:string;
 summary:{ai_jobs:number;ai_completed:number;ai_failed:number;worker_attempts:number;draft_attempts:number;draft_completed:number;draft_failed:number;manual_adjustments:number;revision_requests:number;reviews:number;publications:number;build_elapsed_ms:number;build_timing_samples:number;input_tokens:number|null;output_tokens:number|null;token_coverage:number;estimated_usd:number|null;pricing_model:string|null;pricing_note:string};
 jobs:Array<{status:string;attempts:number;created_at:string;updated_at:string;model:string|null;input_tokens:number|null;output_tokens:number|null;worker_duration_ms:number|null}>;
 events:AiMetricEvent[];
};
export const aiGetTelemetry=(id:string)=>apiTenantGet<AiSessionTelemetry>(`/ai/sessions/${encodeURIComponent(id)}/telemetry`);
export const aiTrackEvent=(id:string,event:AiMetricEventInput)=>apiTenantPost<{ok:boolean}>(`/ai/sessions/${encodeURIComponent(id)}/telemetry`,event);
