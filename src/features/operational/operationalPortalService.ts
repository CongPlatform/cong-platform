import {apiRequest,apiTenantGet,apiTenantPost} from "../../services/api";

export interface SitePortal {id:string;siteId:string;systemId:string;siteSlug:string;enabled:boolean;intakeModuleId:string|null}
export interface PortalMember {id:string;name:string;role:"volunteer"|"beneficiary"}
export interface PortalTeamCandidate {id:string;name:string;email:string;currentRole:"volunteer"|"beneficiary"|null}
export interface PortalRequest {id:string;status:"pending"|"approved"|"rejected";createdAt:string;requestedBy?:string;moduleName?:string;data?:Record<string,unknown>}
export interface PortalTask {id:string;title:string;notes:string;status:string;priority:string;dueOn:string|null;revision:number}
export interface PortalFormField {key:string;label:string;type:string;required:boolean;options?:string[]}
export interface PortalOverview {role:"volunteer"|"beneficiary";systemName:string;userName:string;tasks:PortalTask[];requests:PortalRequest[];formFields:PortalFormField[];workspace?:{organizationId:string;systemId:string}|null}
export const publicPortalInfo=(slug:string)=>apiRequest<{portal:{id:string;organizationName:string}|null}>(`/public/sites/${encodeURIComponent(slug)}/portal`,{authenticated:false,retryOnUnauthorized:false});
export const myPortal=(slug:string)=>(apiRequest<PortalOverview>(`/portal/${encodeURIComponent(slug)}/me`));
export const submitPortalRequest=(slug:string,data:Record<string,unknown>)=>apiRequest<{id:string}>(`/portal/${encodeURIComponent(slug)}/requests`,{method:"POST",body:JSON.stringify({data,consent:true})});
export const updateMyPortalTask=(slug:string,task:PortalTask,status:"progress"|"done")=>apiRequest<void>(`/portal/${encodeURIComponent(slug)}/tasks/${task.id}`,{method:"PATCH",body:JSON.stringify({status,revision:task.revision})});
export const getPortalSettings=(systemId:string)=>apiTenantGet<{portal:SitePortal|null;members:PortalMember[]}>(`/operational/systems/${systemId}/portal`);
export const savePortalSettings=(systemId:string,enabled:boolean,intakeModuleId:string|null)=>apiRequest<{portal:SitePortal}>(`/operational/systems/${systemId}/portal`,{method:"PUT",organizationScoped:true,body:JSON.stringify({enabled,intakeModuleId})});
export const addPortalMember=(systemId:string,email:string,role:"volunteer"|"beneficiary")=>apiTenantPost(`/operational/systems/${systemId}/portal/members`,{email,role});
export const removePortalMember=(systemId:string,id:string)=>apiRequest<void>(`/operational/systems/${systemId}/portal/members/${id}`,{method:"DELETE",organizationScoped:true});
export const listPortalRequests=(systemId:string)=>apiTenantGet<{requests:PortalRequest[]}>(`/operational/systems/${systemId}/portal/requests`);
export const reviewPortalRequest=(systemId:string,id:string,decision:"approved"|"rejected")=>apiTenantPost<void>(`/operational/systems/${systemId}/portal/requests/${id}/review`,{decision});

export const listPortalTeamCandidates=(systemId:string)=>apiTenantGet<{people:PortalTeamCandidate[]}>(`/operational/systems/${systemId}/portal/team-candidates`);
export const addPortalTeamBatch=(systemId:string,userIds:string[])=>apiTenantPost<{added:number}>(`/operational/systems/${systemId}/portal/members/batch`,{userIds});
