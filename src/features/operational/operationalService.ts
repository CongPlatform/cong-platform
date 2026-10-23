import { apiTenantGet, apiTenantPost, apiTenantPatch, apiTenantDeleteWithBody } from "../../services/api";

export type OperationalFieldType = "text"|"long_text"|"number"|"date"|"boolean"|"select"|"email"|"relation";
export interface OperationalField {key:string;label:string;type:OperationalFieldType;required:boolean;help:string;options?:string[];targetModuleId?:string}
export interface OperationalModule {id:string;systemId:string;blueprintKey:string;name:string;description:string;fields:OperationalField[];schemaVersion:number;position:number}
export interface OperationalSystem {id:string;name:string;description:string;status:"draft"|"active"|"archived";version:number;brandSiteId:string|null;dashboardConfig?:OperationalDashboardConfig;createdAt:string;updatedAt:string;modules:OperationalModule[]}
export interface OperationalSystemSummary {id:string;name:string;description:string;status:OperationalSystem["status"];version:number;moduleCount:number;updatedAt:string}
export interface OperationalBlueprint {key:"volunteers"|"projects"|"donations"|"agenda"|"board"|"dispatch"|"delivery_routes"|"availability"|"forms"|"inventory"|"events"|"assistance"|"partners"|"assets"|"messages"|"reservations"|"custom";name:string;description:string;fields:OperationalField[]}
export interface OperationalRecord {id:string;revision:number;data:Record<string,unknown>;createdAt:string;updatedAt:string}
export interface OperationalCapabilities {canCreate:boolean;canManageAll:boolean;canManageIds:string[]}
export const getOperationalCapabilities=()=>apiTenantGet<OperationalCapabilities>("/operational/capabilities");
export const listOperationalSystems = async () => (await apiTenantGet<{systems:OperationalSystemSummary[]}>("/operational/systems")).systems;
export const getOperationalSystem = async (id:string) => (await apiTenantGet<{system:OperationalSystem}>(`/operational/systems/${id}`)).system;
export const listOperationalBlueprints = async () => (await apiTenantGet<{blueprints:OperationalBlueprint[]}>("/operational/catalog")).blueprints;
export const createOperationalSystem = async (name:string,description:string) => (await apiTenantPost<{system:OperationalSystem}>("/operational/systems",{name,description})).system;
export const updateOperationalSystem = async (id:string,changes:{name?:string;description?:string}) => (await apiTenantPatch<{system:OperationalSystem}>(`/operational/systems/${id}`,changes)).system;
export const setOperationalStatus = async (system:OperationalSystem,status:"active"|"draft") => (await apiTenantPost<{system:OperationalSystem}>(`/operational/systems/${system.id}/status`,{status,version:system.version})).system;
export const installOperationalModule = async (systemId:string,blueprintKey:OperationalBlueprint["key"]) => (await apiTenantPost<{system:OperationalSystem}>(`/operational/systems/${systemId}/modules`,{blueprintKey})).system;
export const updateOperationalModule = async (systemId:string,module:OperationalModule,changes:{name?:string;description?:string;fields?:OperationalField[]}) => (await apiTenantPatch<{system:OperationalSystem}>(`/operational/systems/${systemId}/modules/${module.id}`,{...changes,schemaVersion:module.schemaVersion})).system;
export const getOperationalRecords = (systemId:string,moduleId:string,offset:number) => apiTenantGet<{records:OperationalRecord[];total:number}>(`/operational/systems/${systemId}/modules/${moduleId}/records?offset=${offset}`);
export const createOperationalRecord = async (systemId:string,moduleId:string,data:Record<string,unknown>) => (await apiTenantPost<{record:OperationalRecord}>(`/operational/systems/${systemId}/modules/${moduleId}/records`,{data})).record;
export const editOperationalRecord = async (systemId:string,moduleId:string,record:OperationalRecord,data:Record<string,unknown>) => (await apiTenantPatch<{record:OperationalRecord}>(`/operational/systems/${systemId}/modules/${moduleId}/records/${record.id}`,{data,revision:record.revision})).record;
export const archiveOperationalRecord = (systemId:string,moduleId:string,record:OperationalRecord) => apiTenantPost<void>(`/operational/systems/${systemId}/modules/${moduleId}/records/${record.id}/archive`,{revision:record.revision});

export type OperationalNeed = "people"|"resources"|"activities"|"monitoring"|"custom";
export type OperationalStepKind = "receive"|"review"|"prepare"|"assign"|"execute"|"monitor"|"custom";
export interface OperationalStep {id:string;kind:OperationalStepKind;title:string;description:string;moduleId:string|null}
export interface OperationalPlan {systemId:string;intent:string;needs:OperationalNeed[];steps:OperationalStep[];revision:number;updatedAt:string|null}
export const getOperationalPlan = async(systemId:string) => (await apiTenantGet<{plan:OperationalPlan}>(`/operational/systems/${systemId}/plan`)).plan;
export const updateOperationalPlan = async(systemId:string,plan:OperationalPlan) => (await apiTenantPatch<{plan:OperationalPlan}>(`/operational/systems/${systemId}/plan`,{revision:plan.revision,intent:plan.intent,needs:plan.needs,steps:plan.steps})).plan;

export const deleteOperationalSystem = (system:OperationalSystemSummary) => apiTenantDeleteWithBody(`/operational/systems/${system.id}`,{confirmation:system.name,version:system.version});
export type OperationalTaskStatus = "todo"|"progress"|"blocked"|"done";
export type OperationalTaskPriority = "low"|"normal"|"high";
export interface OperationalTask {id:string;title:string;notes:string;status:OperationalTaskStatus;priority:OperationalTaskPriority;dueOn:string|null;stepId:string|null;moduleId:string|null;recordId:string|null;assigneeUserId:string|null;assigneeName:string|null;revision:number;createdAt:string;updatedAt:string}
export interface OperationalTeamMember {id:string;name:string}
export interface OperationalTaskInput {title:string;notes:string;priority:OperationalTaskPriority;dueOn:string|null;stepId:string|null;moduleId:string|null;recordId:string|null;assigneeUserId:string|null}
export const listOperationalTeam=async(systemId?:string)=>(await apiTenantGet<{members:OperationalTeamMember[]}>(systemId?`/operational/systems/${systemId}/team`:"/operational/team")).members;
export const listOperationalTasks=(id:string,offset=0)=>apiTenantGet<{tasks:OperationalTask[];total:number}>(`/operational/systems/${id}/tasks?offset=${offset}`);
export const createOperationalTask=async(id:string,data:OperationalTaskInput)=>(await apiTenantPost<{task:OperationalTask}>(`/operational/systems/${id}/tasks`,data)).task;
export const editOperationalTask=async(id:string,task:OperationalTask,data:Partial<OperationalTaskInput>&{status?:OperationalTaskStatus})=>(await apiTenantPatch<{task:OperationalTask}>(`/operational/systems/${id}/tasks/${task.id}`,{...data,revision:task.revision})).task;
export const archiveOperationalTask=(id:string,task:OperationalTask)=>apiTenantPost<void>(`/operational/systems/${id}/tasks/${task.id}/archive`,{revision:task.revision});

export const createOperationalFoodIntake=(systemId:string,moduleId:string,items:{item:string;quantidade:number;unidade:string}[])=>apiTenantPost<{ids:string[]}>(`/operational/systems/${systemId}/modules/${moduleId}/food-intake`,{items});

export interface OperationalDashboardModule {id:string;name:string;blueprintKey:string;total:number}
export interface OperationalDashboardTaskCounts {total:number;todo:number;progress:number;blocked:number;done:number}
export interface OperationalMetricSpec {id:string;moduleId:string;fieldKey:string;operation:"sum"|"average"|"distribution";title:string}
export interface OperationalMetricResult extends OperationalMetricSpec {value:number|null;distribution:{label:string;count:number}[]}
export interface OperationalDashboard {modules:OperationalDashboardModule[];tasks:OperationalDashboardTaskCounts;metrics:OperationalMetricResult[]}
export interface OperationalDashboardConfig {visibleModuleIds?:string[]|null;showTasks?:boolean;metrics?:OperationalMetricSpec[]}
export const getOperationalDashboard=async(id:string)=>(await apiTenantGet<{dashboard:OperationalDashboard}>(`/operational/systems/${id}/dashboard`)).dashboard;
export const saveOperationalDashboard=async(system:OperationalSystem,config:{visibleModuleIds:string[]|null;showTasks:boolean;metrics:OperationalMetricSpec[]})=>(await apiTenantPatch<{system:OperationalSystem}>(`/operational/systems/${system.id}/dashboard`,{version:system.version,...config})).system;
export const setOperationalBrandSite=async(system:OperationalSystem,siteId:string|null)=>(await apiTenantPatch<{system:OperationalSystem}>(`/operational/systems/${system.id}/identity`,{version:system.version,siteId})).system;

export interface OperationalRecordOption {id:string;label:string}
export const getOperationalRecordOptions=async(systemId:string,moduleId:string,query="",ids:string[]=[])=>(await apiTenantGet<{options:OperationalRecordOption[]}>(`/operational/systems/${systemId}/modules/${moduleId}/record-options?${ids.length?`ids=${ids.map(encodeURIComponent).join(",")}`:`q=${encodeURIComponent(query)}`}`)).options;
export const listOperationalAgenda=async(systemId:string,month:string)=>(await apiTenantGet<{tasks:OperationalTask[]}>(`/operational/systems/${systemId}/agenda?month=${encodeURIComponent(month)}`)).tasks;

export interface OperationalExecutionSettings {advanceOnCompletion:boolean;revision:number}
export const getOperationalExecutionSettings=async(id:string)=>(await apiTenantGet<{settings:OperationalExecutionSettings}>(`/operational/systems/${id}/execution`)).settings;
export const updateOperationalExecutionSettings=async(id:string,settings:OperationalExecutionSettings,advanceOnCompletion:boolean)=>(await apiTenantPatch<{settings:OperationalExecutionSettings}>(`/operational/systems/${id}/execution`,{revision:settings.revision,advanceOnCompletion})).settings;

export interface OperationalStepRule {stepId:string;revision:number;enabled:boolean;priority:"any"|"low"|"normal"|"high";assignment:"unassigned"|"keep";dueDays:number}
export interface OperationalRuleRun {id:string;title:string;status:string;createdAt:string}
export const listOperationalStepRules=async(id:string)=>(await apiTenantGet<{rules:OperationalStepRule[]}>(`/operational/systems/${id}/step-rules`)).rules;
export const saveOperationalStepRule=async(id:string,rule:OperationalStepRule)=>(await apiTenantPatch<{rule:OperationalStepRule}>(`/operational/systems/${id}/step-rules/${rule.stepId}`,{revision:rule.revision,enabled:rule.enabled,priority:rule.priority,assignment:rule.assignment,dueDays:rule.dueDays})).rule;
export const listOperationalRuleRuns=async(id:string,stepId:string)=>(await apiTenantGet<{runs:OperationalRuleRun[]}>(`/operational/systems/${id}/step-rules/${stepId}/runs`)).runs;

export interface DeliveryDemand {id:string;label:string;address:string;lat:number;lon:number;status:"pending"|"assigned"|"delivered"|"cancelled";revision:number;taskId:string|null}
export interface DeliveryAvailable {userId:string;name:string;lat:number;lon:number;capacity:number}
export interface DeliveryStop {id:string;label:string;address:string;lat:number;lon:number;position:number;taskId?:string}
export interface DeliveryRoute {userId:string;name:string;capacity:number;approxKm:number;stops:DeliveryStop[]}
export interface DeliveryProposal {snapshotHash:string;routes:DeliveryRoute[];unassigned:DeliveryStop[];approxKm:number;routingMode:"road"|"estimate";roadMinutes:number|null;routingNotice:string}
export interface DeliveryPlan {id:string;day:string;routes:DeliveryRoute[];createdAt:string}
export interface DeliveryBoard {day:string;routingEnabled:boolean;providerConfigured:boolean;demands:DeliveryDemand[];members:DeliveryAvailable[];proposal:DeliveryProposal;plans:DeliveryPlan[]}
export const getDeliveryBoard=(systemId:string,day:string)=>apiTenantGet<DeliveryBoard>(`/operational/systems/${systemId}/deliveries?day=${encodeURIComponent(day)}`);
export const registerDeliveryDemand=(systemId:string,value:{day:string;label:string;address:string;lat:number;lon:number})=>apiTenantPost(`/operational/systems/${systemId}/deliveries`,value);
export const cancelDeliveryDemand=(systemId:string,record:DeliveryDemand,day:string)=>apiTenantPost(`/operational/systems/${systemId}/deliveries/${record.id}/cancel`,{day,revision:record.revision});
export const setDeliveryAvailability=(systemId:string,value:{day:string;userId:string;capacity:number;lat:number;lon:number})=>apiTenantPatch(`/operational/systems/${systemId}/deliveries/availability`,value);
export const confirmDeliveryPlan=(systemId:string,day:string,snapshotHash:string)=>apiTenantPost<{planId:string;assignedCount:number}>(`/operational/systems/${systemId}/deliveries/confirm`,{day,snapshotHash});

export interface MyDeliveryAvailability {userId:string;name:string;capacity:number|null;lat:number|null;lon:number|null}
export const getMyDeliveryAvailability=async(systemId:string,day:string)=>(await apiTenantGet<{availability:MyDeliveryAvailability}>(`/operational/systems/${systemId}/deliveries/me?day=${encodeURIComponent(day)}`)).availability;
export const saveMyDeliveryAvailability=(systemId:string,value:{day:string;capacity:number;lat:number;lon:number})=>apiTenantPatch<void>(`/operational/systems/${systemId}/deliveries/me`,value);
export interface DeliveryImportMapping {day:string;moduleId:string;labelField:string;addressField:string;latitudeField:string;longitudeField:string}
export const importDeliveryDemandRecords=(systemId:string,value:DeliveryImportMapping)=>apiTenantPost<{imported:number;skipped:number}>(`/operational/systems/${systemId}/deliveries/import`,value);

export interface MyDeliveryWeekDay {day:string;capacity:number;lat:number;lon:number}
export const listMyDeliveryWeek=async(systemId:string,start:string)=>(await apiTenantGet<{days:MyDeliveryWeekDay[]}>(`/operational/systems/${systemId}/deliveries/my-week?day=${encodeURIComponent(start)}`)).days;

export const setDeliveryRoutingPreference=(systemId:string,enabled:boolean)=>apiTenantPatch<void>(`/operational/systems/${systemId}/deliveries/routing-preference`,{enabled});

export const searchOperationalAddress=async(systemId:string,address:string)=>(await apiTenantPost<{results:{lat:number;lon:number;label:string}[]}>(`/operational/systems/${systemId}/geocoding/search`,{address,consent:true})).results;
