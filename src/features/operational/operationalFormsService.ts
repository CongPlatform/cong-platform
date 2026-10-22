import {apiRequest,apiTenantGet,apiTenantPost} from "../../services/api";
export type FormKind="text"|"textarea"|"email"|"phone"|"whatsapp"|"cep"|"cpf"|"cnpj"|"rg"|"number"|"integer"|"currency"|"percentage"|"date"|"time"|"url"|"select"|"radio";
export interface FormField {id:string;key:string;label:string;kind:FormKind;required:boolean;options?:string[];placeholder?:string;helpText?:string;mask?:"none"|"digits"|"letters"|"alphanumeric";minLength?:number;maxLength?:number;minValue?:number;maxValue?:number;showWhen?:{fieldKey:string;equals:string}}
export interface ConnectedForm {id:string;title:string;description:string;fields:FormField[];pageSlug:string;enabled:boolean;targetModuleId:string|null;bindings:Record<string,string>;revision:number;createdAt:string}
export interface FormSite {id:string;slug:string;pages:{slug:string;title:string;isHome:boolean}[]}
export interface FormSubmission {id:string;payload:Record<string,unknown>;status:"pending"|"approved"|"rejected";createdAt:string}
export const loadConnectedForms=(systemId:string)=>apiTenantGet<{forms:ConnectedForm[];site:FormSite|null}>(`/operational/systems/${systemId}/forms`);
export const createConnectedForm=(systemId:string)=>apiTenantPost<{id:string}>(`/operational/systems/${systemId}/forms`,{});
export const saveConnectedForm=(systemId:string,form:ConnectedForm)=>apiRequest<{saved:{id:string;revision:number}}>(`/operational/systems/${systemId}/forms/${form.id}`,{method:"PUT",organizationScoped:true,body:JSON.stringify({revision:form.revision,title:form.title,description:form.description,fields:form.fields,pageSlug:form.pageSlug,enabled:form.enabled,targetModuleId:form.targetModuleId,bindings:form.bindings})});
export const loadFormSubmissions=(systemId:string,formId:string)=>apiTenantGet<{submissions:FormSubmission[]}>(`/operational/systems/${systemId}/forms/${formId}/submissions`);
export const reviewFormSubmission=(systemId:string,formId:string,submissionId:string,decision:"approved"|"rejected")=>apiTenantPost(`/operational/systems/${systemId}/forms/${formId}/submissions/${submissionId}/review`,{decision});
export const publicConnectedForms=(slug:string,page:string)=>apiRequest<{forms:{id:string;title:string;description:string;fields:FormField[]}[]}>(`/public/sites/${encodeURIComponent(slug)}/forms?page=${encodeURIComponent(page)}`,{authenticated:false,retryOnUnauthorized:false});
export const submitConnectedForm=(slug:string,formId:string,data:Record<string,unknown>,website:string)=>apiRequest<{id?:string;received?:boolean}>(`/public/sites/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}`,{authenticated:false,retryOnUnauthorized:false,method:"POST",body:JSON.stringify({data,consent:true,website})});
export const formatFormValue=(kind:FormKind,value:string)=>{
  const numbers=value.replace(/\D/g,"");
  if(kind==="cep")return numbers.slice(0,5)+(numbers.length>5?`-${numbers.slice(5,8)}`:"");
  if(kind==="phone"||kind==="whatsapp")return numbers.length<=10?numbers.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/,(_,a:string,b:string,c:string)=>[a?`(${a}`:"",a.length===2?") ":"",b,c?`-${c}`:""].join("")):numbers.slice(0,11).replace(/^(\d{2})(\d{5})(\d{0,4})/,(_,a:string,b:string,c:string)=>`(${a}) ${b}${c?`-${c}`:""}`);
  if(kind==="cpf")return numbers.slice(0,11).replace(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/,(_,a:string,b:string,c:string,d:string)=>[a,b,c].filter(Boolean).join(".")+(d?`-${d}`:""));
  if(kind==="cnpj")return numbers.slice(0,14).replace(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})$/,(_,a:string,b:string,c:string,d:string,e:string)=>`${a}${b?`.${b}`:""}${c?`.${c}`:""}${d?`/${d}`:""}${e?`-${e}`:""}`);
  return value;
};
export const numericFormKinds=(kind:FormKind)=>["number","integer","currency","percentage"].includes(kind);
export const choiceFormKinds=(kind:FormKind)=>kind==="select"||kind==="radio";
export const isFormFieldVisible=(field:FormField,values:Record<string,string>)=>!field.showWhen||values[field.showWhen.fieldKey]===field.showWhen.equals;
export const formatCustomMask=(field:FormField,value:string)=>{
  if(field.kind!=="text")return formatFormValue(field.kind,value);
  if(field.mask==="digits")return value.replace(/\D/g,"");
  if(field.mask==="letters")return value.replace(/[^\p{L}\s]/gu,"");
  if(field.mask==="alphanumeric")return value.replace(/[^\p{L}\p{N}\s]/gu,"");
  return value;
};

export const availableSiteForms=(siteId:string)=>apiTenantGet<{forms:{id:string;title:string;enabled:boolean;fields:FormField[]}[]}>(`/operational/site-forms?siteId=${encodeURIComponent(siteId)}`);
export const publicPlacedForm=(slug:string,formId:string)=>apiRequest<{form:{id:string;title:string;description:string;fields:FormField[]}}>(`/public/sites/${encodeURIComponent(slug)}/forms/${encodeURIComponent(formId)}`,{authenticated:false,retryOnUnauthorized:false});

export interface SiteBuilderFormResource {id:string;title:string;description:string;fields:FormField[];systemId:string;systemName:string;status:"ready"|"disabled"|"other_site"}
export interface SiteBuilderAccessResources {
  published:boolean;
  systems:{id:string;name:string}[];
  portal:{systemId:string;enabled:boolean}|null;
}
export const loadSiteBuilderResources=(siteId:string)=>apiTenantGet<{forms:SiteBuilderFormResource[]}&SiteBuilderAccessResources>(`/operational/site-resources?siteId=${encodeURIComponent(siteId)}`);
export const activateSiteForm=(siteId:string,formId:string)=>apiTenantPost<{enabled:boolean;siteId:string}>(`/operational/site-resources/forms/${encodeURIComponent(formId)}/activate`,{siteId});
export const activateSitePortal=(siteId:string,systemId:string)=>apiTenantPost<{portal:{enabled:boolean}}>(`/operational/site-resources/portal/activate`,{siteId,systemId});
