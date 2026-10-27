/**
 * Converts a validated AI *proposal* into real CONG draft resources.
 * Uses the same authenticated APIs as the two native builders; never publishes.
 * The caller must obtain an explicit user confirmation. No model-side tools.
 * Keep IDs per organization/session for safe retry and incremental revisions.
 */
import { apiRequest, apiTenantPost } from "../../services/api";
import { getStoredActiveOrganizationId } from "../../services/organizationStorage";
import type { AiField, AiModule, AiPlan, AiPublicForm } from "../../services/aiAssistantService";
import {
  createOperationalSystem, getOperationalSystem, installOperationalModule,
  updateOperationalModule, getOperationalPlan, updateOperationalPlan,
  setOperationalBrandSite,
  type OperationalBlueprint, type OperationalField, type OperationalModule,
  type OperationalSystem,
} from "../operational/operationalService";
import {
  createInstitutionalSite, createInstitutionalPage, getInstitutionalSite,
  getInstitutionalVariants, addInstitutionalSection,
  updateInstitutionalSection, deleteInstitutionalSection, type InstitutionalSite,
  type InstitutionalSectionType, type InstitutionalVariant, type InstitutionalLayoutNode,
} from "../../services/institutionalService";
import { createDefaultSectionContent } from "../../data/institutional/sectionCatalog";

export type SiteLook = "human" | "impact" | "institutional";
export const SITE_LOOKS: Array<{ id: SiteLook; label: string; description: string }> = [
  {id:"human",label:"Acolhedor",description:"Pessoas, histórias e proximidade"},
  {id:"impact",label:"Moderno",description:"Ações, campanhas e resultados reais"},
  {id:"institutional",label:"Institucional",description:"Seriedade, clareza e confiança"},
];
// Tipos e opções usados pela tela de personalização do Estúdio CONG.
// Estas cores são sugestões opcionais, não templates aplicados automaticamente.
export type SitePalette = {
  id: string;
  label: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
};
export const SITE_PALETTES: SitePalette[] = [
  { id: "acolher", label: "Acolhimento", description: "Suave e próxima", primary: "#305E88", secondary: "#73A898", accent: "#DCAC58", background: "#F7F9F7", text: "#203247" },
  { id: "energia", label: "Vitalidade", description: "Viva e otimista", primary: "#246A5E", secondary: "#6DAE80", accent: "#E9AE42", background: "#F7F9F2", text: "#193C32" },
  { id: "confianca", label: "Confiança", description: "Clara e institucional", primary: "#274C77", secondary: "#6F91AF", accent: "#DA9551", background: "#FAFBFD", text: "#24354A" },
  { id: "expressiva", label: "Expressiva", description: "Criativa e acolhedora", primary: "#744A8F", secondary: "#B38DC9", accent: "#EAA96C", background: "#FBF8FC", text: "#392A47" },
];

export type BuildRecord = {
  organizationId: string;
  sessionId: string;
  systemId: string | null;
  siteId: string | null;
  formIds: Record<string,string>;
  lastPlanSignature: string;
  updatedAt: string;
};
export type BuildResult = { record: BuildRecord; warnings: string[]; modules: number; pages: number; forms: number };
const BLUEPRINTS = new Set<OperationalBlueprint["key"]>([
  "volunteers","projects","donations","agenda","board","dispatch","delivery_routes",
  "availability","forms","inventory","events","assistance","partners","assets","messages","reservations","custom",
]);
const NO_FIELDS = new Set(["agenda","board","dispatch","delivery_routes","availability","forms","messages","reservations"]);
const FIELD_TYPES = new Set(["text","long_text","number","date","boolean","select","email"]);
const STORAGE_PREFIX="cong:ai-builder:v2:";
const ascii=(input:string)=>input.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const norm=(input:string)=>ascii(input).replace(/[^a-z0-9]/g,"");

export function functionalKey(module: Pick<AiModule,"name"|"alias"|"blueprint_key">):string{
 const hay=ascii(`${module.name} ${module.alias}`);
 if(/voluntari/.test(hay))return "volunteers";
 if(/estoque|inventari/.test(hay))return "inventory";
 if(/doa[cç][a-z]*|doador|arrecad/.test(hay))return "donations";
 if(/beneficiar|familia|solicita[cç]|pedido.*roupa/.test(hay))return "beneficiaries";
 if(/entrega|distribui[cç]/.test(hay))return "deliveries";
 if(/evento|campanha/.test(hay))return "events";
 if(/formul[aá]rio|inscri[cç]/.test(hay))return "forms";
 return module.blueprint_key!=="custom"?module.blueprint_key:norm(module.name).slice(0,40);
}

export function dedupeModules(modules:AiModule[]):AiModule[]{
 const chosen=new Map<string,AiModule>();
 for(const item of modules){
   const key=functionalKey(item);
   if(key==="forms")continue; // Public forms are created by the dedicated CONG form builder.
   const prior=chosen.get(key);
   if(!prior){chosen.set(key,item);continue;}
   // Keep the most complete schema and merge unique missing fields, never drop information.
   const richest=item.fields.length>prior.fields.length?item:prior;
   const other=richest===item?prior:item;
   const unique=new Map([...richest.fields,...other.fields].map(f=>[f.key,f]));
   chosen.set(key,{...richest,fields:[...unique.values()].slice(0,32)});
 }
 return [...chosen.values()].slice(0,20);
}

function safeFields(fields:AiField[]):OperationalField[]{
 const seen=new Set<string>();
 return fields.flatMap(f=>{
  if(!FIELD_TYPES.has(f.type)||seen.has(f.key))return [];
  seen.add(f.key);
  const options=f.type==="select"?[...new Set(f.options)].filter(Boolean).slice(0,24):[];
  return [{key:f.key,label:f.label.slice(0,75),type:f.type as OperationalField["type"],
    required:f.required,help:f.help.slice(0,240),...(f.type==="select"?{options}: {})}];
 }).filter(f=>f.type!=="select" || (f.options?.length??0)>=2).slice(0,32);
}
function schemeCompatible(existing:OperationalModule, proposed:OperationalField[]){
 const merged=new Map(existing.fields.map(f=>[f.key,f]));
 for(const field of proposed) if(!merged.has(field.key))merged.set(field.key,field);
 return [...merged.values()].slice(0,32);
}
function blueprintOf(m:AiModule):OperationalBlueprint["key"]{
 const kind=functionalKey(m);
 if(kind==="beneficiaries"||kind==="deliveries")return "custom";
 if(BLUEPRINTS.has(kind as OperationalBlueprint["key"]))return kind as OperationalBlueprint["key"];
 return BLUEPRINTS.has(m.blueprint_key as OperationalBlueprint["key"])?m.blueprint_key as OperationalBlueprint["key"]:"custom";
}

function key(sessionId:string){
 const org=getStoredActiveOrganizationId();
 if(!org)throw new Error("Selecione a organização antes de criar um rascunho.");
 return { org, key:`${STORAGE_PREFIX}${org}:${sessionId}` };
}
export function existingDraft(sessionId:string):BuildRecord|null{
 try{
  const v=localStorage.getItem(key(sessionId).key);
  if(!v)return null;
  const data=JSON.parse(v) as BuildRecord;
  return data.organizationId===getStoredActiveOrganizationId()&&data.sessionId===sessionId?data:null;
 }catch{return null;}
}
function saveDraft(record:BuildRecord){localStorage.setItem(key(record.sessionId).key,JSON.stringify(record));}

function sectionType(sectionType:string):InstitutionalSectionType{
 switch(sectionType){
  case "hero":return "organization_intro";
  case "features":return "organization_about";
  case "impact":return "custom_content";
  case "cta":return "support_actions";
  case "contact":return "organization_contact";
  case "gallery":return "projects_showcase";
  default:return "custom_content";
 }
}
function variantOf(type:InstitutionalSectionType,variants:InstitutionalVariant[]){
 return variants.find(v=>v.sectionType===type&&v.status==="published"&&v.visibility==="public")
  ??variants.find(v=>v.sectionType===type&&v.status==="published")
  ??variants.find(v=>v.sectionType===type);
}
function contentFor(type:InstitutionalSectionType,title:string,text:string,action:string){
 // O catálogo fornece apenas a estrutura técnica exigida pelo editor. Não devem sobrar
 // itens, números, depoimentos, imagens ou endereços demonstrativos como se fossem reais.
 const base:Record<string,unknown>={...createDefaultSectionContent(type)};
 for(const [key,value] of Object.entries(base)){
   if(Array.isArray(value) && /^(items|projects|photos|images|metrics|stats|testimonials|partners|services|gallery|numbers|highlights|cards)$/i.test(key))base[key]=[];
   // Não confundir os dados demonstrativos do catálogo com dados confirmados da ONG.
   if(typeof value==="string" && /^(eyebrow|subtitle|caption|address|email|phone|whatsapp|location|contactText|image|imageUrl|imageAlt|alt|quote|author|website)$/i.test(key))base[key]="";
 }
 const content={...base,title,description:text};
 if(type==="organization_intro")return {...content,eyebrow:"",
   // Sem destino validado o botão continua rascunho, não é ativado/publicado.
   primaryAction:action?{label:action,href:"#"}:null};
 if(type==="organization_about")return {...content,eyebrow:""};
 return content;
}
async function writeSite(plan:NonNullable<AiPlan["site"]>,record:BuildRecord,report:(t:string)=>void,warnings:string[]){
 // Criação livre: a IA determina páginas e seções, não um modelo institucional pré-selecionado.
 // Os componentes do editor são reutilizados por funcionalidade, nunca como uma página-demo.
 const freshSite=!record.siteId;
 let originalSeedIds:string[]=[];
 if(freshSite){
  report("Criando um site em branco para a proposta personalizada...");
  const created=await createInstitutionalSite({name:plan.name.slice(0,100),templateId:null,
    identityMode:"custom"});
  record.siteId=created.id;saveDraft(record);
  originalSeedIds=created.pages.flatMap(page=>page.sections.filter(section=>section.sectionType!=="site_footer").map(section=>section.id));
 }
 const usedSeedIds=new Set<string>();
 const variants=await getInstitutionalVariants();
 const confirmedSiteId=record.siteId;
 if(!confirmedSiteId)throw new Error("Não foi possível identificar o site criado. Nenhuma alteração adicional foi aplicada.");
 let site=await getInstitutionalSite(confirmedSiteId);
 for(const [index,pagePlan] of plan.pages.entries()){
  report(`Criando página ${index+1}/${plan.pages.length}: ${pagePlan.title}`);
  let page=site.pages.find(p=>p.slug===pagePlan.slug);
  if(!page){site=await createInstitutionalPage(site.id,{title:pagePlan.title,slug:pagePlan.slug});page=site.pages.find(p=>p.slug===pagePlan.slug);}
  if(!page){warnings.push(`Não foi possível localizar a página ${pagePlan.title}.`);continue;}
  // O próprio plano define quantas seções cada página precisa (até o limite validado).
  // Os componentes do editor continuam nativos, mas o conteúdo não vem de templates.
  for(const section of pagePlan.sections){
    const type=sectionType(section.type);
    if(section.type==="impact"){
      warnings.push(`A seção "${section.title}" foi criada sem números de impacto não confirmados.`);
    }
    const matching=page.sections.find(s=>s.sectionType===type);
    if(matching){
      // AI may update only sections it owns. First application can initialize a template section.
      const guide=matching.settings.contentGuidance;
      const aiOwned=guide&&typeof guide==="object"&&"source" in guide&&guide.source==="ai-confirmed-draft";
      if(!record.lastPlanSignature||aiOwned){
        if(freshSite)usedSeedIds.add(matching.id);
        site=await updateInstitutionalSection(matching.id,{
          content:freshSite?contentFor(type,section.title,section.text,section.action_label)
            :{...matching.content,...contentFor(type,section.title,section.text,section.action_label)},
          settings:{...matching.settings,contentGuidance:{source:"ai-confirmed-draft",needsReview:true}},
        });
        page=site.pages.find(p=>p.id===page?.id)??page;
      }
      continue;
    }
    const variant=variantOf(type,variants);
    if(!variant){warnings.push(`Não há variante do editor disponível para a seção ${section.title}.`);continue;}
    site=await addInstitutionalSection(page.id,{sectionType:type,variantVersionId:variant.versionId,
      content:contentFor(type,section.title,section.text,section.action_label),
      settings:{contentGuidance:{source:"ai-confirmed-draft",needsReview:true}}});
    page=site.pages.find(p=>p.id===page?.id)??page;
  }
 }
 // Evitar que os blocos exemplificativos criados automaticamente pelo editor
 // apareçam como se fossem dados verdadeiros desta organização.
 for(const seedId of originalSeedIds){
  if(usedSeedIds.has(seedId))continue;
  await deleteInstitutionalSection(seedId);
 }
 return site;
}

function typeOfPublicField(field:AiField){
 if(field.type==="long_text")return "textarea";
 if(field.type==="boolean")return "text"; // not eligible for connection
 return field.type;
}
function makeLegacyInferredForms(plan:AiPlan, turns:string[]):AiPublicForm[]{
 const result=[...plan.connection.public_forms];
 if(result.length||!plan.system||!plan.site)return result;
 const modules=dedupeModules(plan.system.modules);
 const words=ascii(turns.join(" "));
 const suggestions:Array<{pattern:RegExp; kind:string; name:string}>=[
  {pattern:/doa[cç]|doar|arrecad/,kind:"donations",name:"Oferecer doação"},
  {pattern:/voluntari/,kind:"volunteers",name:"Cadastro de voluntários"},
  {pattern:/solicit|pedido|beneficiar|receber.*roupa/,kind:"beneficiaries",name:"Solicitar atendimento"},
 ];
 const slug=plan.site.pages.find(p=>/contat|doa|ajud|volunt/.test(ascii(p.slug)))?.slug??plan.site.pages[0]?.slug;
 if(!slug)return [];
 for(const item of suggestions){
  if(!item.pattern.test(words))continue;
  const mod=modules.find(m=>functionalKey(m)===item.kind);
  if(!mod||!mod.fields.length)continue;
  const fields=mod.fields.filter(f=>f.type!=="boolean"&&f.type!=="select"||f.type==="select"&&f.options.length>=2).slice(0,12);
  if(!fields.length)continue;
  result.push({name:item.name,page_slug:slug,form_module_alias:"forms",target_module_alias:mod.alias,
   fields,bindings:fields.map(f=>({form_field_key:f.key,module_field_key:f.key}))});
 }
 return result;
}

function makeInferredForms(plan:AiPlan, turns:string[]):AiPublicForm[]{
 const existing=makeLegacyInferredForms(plan,turns);
 if(existing.length||!plan.system||!plan.site||!plan.connection.link_system)return existing;
 const request=ascii(turns.filter(Boolean).slice(-8).join(" "));
 if(!/formular|inscri|cadastro|solicita|registr.*site|colet.*site/.test(request))return existing;
 const modules=dedupeModules(plan.system.modules).filter(m=>m.fields.length>0&&blueprintOf(m)!=="forms");
 if(!modules.length)return existing;
 // O próprio plano (etapa receive) indica o receptor; não existe cadastro inventado.
 const receiving=plan.system.workflow.find(w=>w.kind==="receive"&&modules.some(m=>m.alias===w.module_alias));
 const target=receiving?modules.find(m=>m.alias===receiving.module_alias):modules.length===1?modules[0]:
   modules.find(m=>/inscri|cadastro|solicit|registro/.test(ascii(m.name)));
 if(!target)return existing; // Ambiguidade: revisão humana, sem mapeamento incorreto.
 const fields=target.fields.filter(f=>f.type!=="boolean"&&(f.type!=="select"||f.options.length>=2)).slice(0,24);
 if(!fields.length||target.fields.some(f=>f.required&&!fields.some(s=>s.key===f.key)))return existing;
 const page=plan.site.pages.find(p=>/inscri|cadastro|formul|particip|contat/.test(ascii(p.slug)))??plan.site.pages[0];
 if(!page)return existing;
 return [{name:`Formulário de ${target.name}`.slice(0,110),page_slug:page.slug,
   form_module_alias:"forms",target_module_alias:target.alias,fields,
   bindings:fields.map(f=>({form_field_key:f.key,module_field_key:f.key}))}];
}

async function placeFormInSite(siteId:string,pageSlug:string,formId:string,title:string,warnings:string[]){
 try{
  let site=await getInstitutionalSite(siteId);
  let page=site.pages.find(p=>p.slug===pageSlug);
  if(!page){warnings.push(`Formulário ${title}: página ${pageSlug} ainda não existe.`);return;}
  let section=page.sections.find(s=>s.sectionType==="custom_content")
    ??page.sections.find(s=>s.sectionType==="organization_contact");
  if(!section){
    const variants=await getInstitutionalVariants();
    const variant=variantOf("custom_content",variants);
    if(!variant){warnings.push(`Formulário ${title}: não há seção editável disponível.`);return;}
    site=await addInstitutionalSection(page.id,{sectionType:"custom_content",variantVersionId:variant.versionId,
      content:contentFor("custom_content",title,"Preencha o formulário para falar com a organização.",""),
      settings:{contentGuidance:{source:"ai-confirmed-draft",needsReview:true}}});
    page=site.pages.find(p=>p.id===page?.id)??page;
    section=page.sections.filter(s=>s.sectionType==="custom_content").at(-1);
  }
  if(!section){warnings.push(`Formulário ${title}: não foi possível criar a seção.`);return;}
  const base=(section.settings.layoutOverride as InstitutionalLayoutNode|undefined)??section.layout;
  const element:InstitutionalLayoutNode={type:"element",id:crypto.randomUUID(),elementType:"cong_form",
    value:{kind:"cong_form",formId,title},style:{width:"100",radius:"large"}};
  const hasForm=(node:InstitutionalLayoutNode):boolean=>{
   if(node.type==="element")return node.elementType==="cong_form"&&node.value!==null&&typeof node.value==="object"
      &&"formId" in node.value&&node.value.formId===formId;
   if(node.type==="repeat")return hasForm(node.item);
   if(node.type==="stack"||node.type==="columns"||node.type==="grid")return node.children.some(hasForm);
   return false;
  };
  if(hasForm(base))return;
  const layout:InstitutionalLayoutNode=base.type==="stack"?{...base,children:[...base.children,element]}:
    {type:"stack",gap:"medium",children:[base,element]};
  await updateInstitutionalSection(section.id,{settings:{...section.settings,layoutOverride:layout}});
 }catch(error){warnings.push(`Formulário ${title}: criei o cadastro e o vínculo, mas a inserção na página ficou pendente (${error instanceof Error?error.message:"erro"}).`);}
}

async function writeForms(plan:AiPlan,turns:string[],record:BuildRecord,
  actual:OperationalSystem|null,report:(t:string)=>void,warnings:string[]):Promise<number>{
 if(!actual||!record.siteId||!plan.system||!plan.site)return 0;
 const possible=makeInferredForms(plan,turns);
 const byAlias=new Map(plan.system.modules.map(m=>[m.alias,functionalKey(m)]));
 const actualByKind=new Map(actual.modules.map(m=>[functionalKey({name:m.name,alias:m.name,blueprint_key:m.blueprintKey}),m]));
 let done=0;
 for(const config of possible){
   const targetKind=byAlias.get(config.target_module_alias);
   const target=targetKind?actualByKind.get(targetKind):null;
   if(!target){warnings.push(`Formulário ${config.name}: módulo de destino não encontrado.`);continue;}
   const k=norm(config.name)+"__"+norm(target.name);
   if(record.formIds[k]){
     done++;
     await placeFormInSite(record.siteId,config.page_slug,record.formIds[k],config.name,warnings);
     warnings.push(`O formulário ${config.name} já existe; revise seus campos caso o pedido tenha mudado.`);
     continue;
   }
   const fields=config.fields.filter(f=>f.type!=="boolean"&&target.fields.some(t=>t.key===f.key&&t.type===f.type)).slice(0,24);
   const bindings=Object.fromEntries(config.bindings.filter(b=>fields.some(f=>f.key===b.form_field_key)
     &&target.fields.some(t=>t.key===b.module_field_key)).map(b=>[b.form_field_key,b.module_field_key]));
   const required=target.fields.filter(f=>f.required);
   const mappingComplete=required.every(f=>Object.values(bindings).includes(f.key));
   if(!mappingComplete){warnings.push(`Formulário ${config.name}: campos obrigatórios do destino precisam ser vinculados no editor.`);continue;}
   report(`Configurando formulário "${config.name}" no sistema...`);
   const {id:formId}=await apiTenantPost<{id:string}>(`/operational/systems/${actual.id}/forms`,{});
   // Native builder creates an editable disabled form. Publishing requires separate authorization.
   await apiRequest(`/operational/systems/${actual.id}/forms/${formId}`,{
     method:"PUT",organizationScoped:true,body:JSON.stringify({revision:1,title:config.name.slice(0,110),description:"Preparado com auxílio da CONG IA. Revise antes de publicar.",
       fields:fields.map(f=>({id:crypto.randomUUID(),key:f.key,label:f.label,kind:typeOfPublicField(f),
         required:f.required,...(f.type==="select"?{options:f.options}:{})})),
       enabled:false,pageSlug:config.page_slug,targetModuleId:target.id,bindings}),
   });
   record.formIds[k]=formId;saveDraft(record);done++;
   await placeFormInSite(record.siteId,config.page_slug,formId,config.name,warnings);
 }
 return done;
}

export async function buildAiDraft(input:{plan:AiPlan;sessionId:string;turns:string[];look:SiteLook;
 palette?:SitePalette|null;logoFile?:File|null;report:(text:string)=>void}):Promise<BuildResult>{
 const {org}=key(input.sessionId);
 let record:BuildRecord=existingDraft(input.sessionId)??{
   organizationId:org,sessionId:input.sessionId,systemId:null,siteId:null,formIds:{},lastPlanSignature:"",updatedAt:"",
 };
  const warnings:string[]=[];
  // A criação livre deste construtor ainda não possui implementação de persistência
  // de paleta/logotipo. Informar essa pendência explicitamente em vez de ignorar
  // as escolhas visuais do usuário de forma silenciosa.
  if(input.palette)warnings.push("A paleta escolhida aparece na prévia, mas precisa ser aplicada no editor do site após criar o rascunho.");
  if(input.logoFile)warnings.push("O logotipo selecionado precisa ser enviado pelo editor do site após criar o rascunho.");
 const signature=JSON.stringify(input.plan);
 if(record.lastPlanSignature===signature){
   input.report("Esse rascunho já foi montado. Não serão criados itens repetidos.");
   return {record,warnings,modules:0,pages:0,forms:Object.keys(record.formIds).length};
 }
 let operational:OperationalSystem|null=null;
 if(input.plan.system){
   if(!record.systemId){
     input.report("Criando sistema real no construtor operacional...");
     const created=await createOperationalSystem(input.plan.system.name,input.plan.system.description);
     record.systemId=created.id;saveDraft(record);
   }
   operational=await getOperationalSystem(record.systemId);
   if(operational.status!=="draft")throw new Error("O sistema já está ativo. Volte-o ao modo rascunho antes de atualizar pela IA.");
   const modules=dedupeModules(input.plan.system.modules);
   for(const [index,source] of modules.entries()){
     input.report(`Configurando módulo ${index+1}/${modules.length}: ${source.name}`);
     const kind=functionalKey(source);
     let current=operational.modules.find(m=>functionalKey({name:m.name,alias:m.name,blueprint_key:m.blueprintKey})===kind);
     const newlyCreated=!current;
     if(!current){operational=await installOperationalModule(operational.id,blueprintOf(source));current=operational.modules.at(-1);}
     if(!current)throw new Error("Falha ao instalar módulo do sistema.");
     const restricted=NO_FIELDS.has(current.blueprintKey);
     const proposed=restricted?[]:safeFields(source.fields);
     // On first creation, use the AI schema rather than unrelated defaults from a generic blueprint.
     // On subsequent revisions, keep existing fields and add only genuinely new ones.
     const fields=restricted?undefined:newlyCreated?(proposed.length?proposed:current.fields):schemeCompatible(current,proposed);
     operational=await updateOperationalModule(operational.id,current,{
       name:source.name.slice(0,100),description:source.description.slice(0,800),...(fields?{fields}:{})});
     saveDraft(record);
   }
   if(input.plan.system.workflow.length){
     input.report("Organizando o fluxo do trabalho...");
     const current=await getOperationalPlan(operational.id);
     const aliasToType=new Map(input.plan.system.modules.map(m=>[m.alias,functionalKey(m)]));
     const steps=input.plan.system.workflow.slice(0,12).map(step=>{
       const wanted=aliasToType.get(step.module_alias);
       const module=wanted?operational?.modules.find(m=>functionalKey({name:m.name,alias:m.name,blueprint_key:m.blueprintKey})===wanted):null;
       return {id:crypto.randomUUID(),kind:step.kind as "receive"|"review"|"prepare"|"assign"|"execute"|"monitor"|"custom",
         title:step.title,description:step.description,moduleId:module?.id??null};
     });
     // Preserve previous steps and append genuinely new ones during revisions.
     const names=new Set(current.steps.map(s=>norm(s.title)));
     const merged=[...current.steps,...steps.filter(s=>!names.has(norm(s.title)))].slice(0,12);
     await updateOperationalPlan(operational.id,{...current,intent:input.plan.system.description.slice(0,1200),
       needs:[...new Set([...current.needs,"people" as const,"resources" as const,"activities" as const])],steps:merged});
   }
 }
 let site:InstitutionalSite|null=null;
 if(input.plan.site){site=await writeSite(input.plan.site,record,input.report,warnings);}
 if(operational&&site){
   input.report("Associando site e sistema no construtor...");
   operational=await getOperationalSystem(operational.id);
   if(operational.brandSiteId!==site.id)operational=await setOperationalBrandSite(operational,site.id);
 }
 let count=0;
 if(operational&&site)count=await writeForms(input.plan,input.turns,record,operational,input.report,warnings);
 if(input.plan.connection.link_system&&(!operational||!site))warnings.push("A conexão solicitada exige um site e um sistema.");
 if(input.plan.connection.link_system&&count===0&&Object.keys(record.formIds).length===0)
   warnings.push("Nenhum formulário conectado pôde ser gerado; abra o editor de formulários para concluir.");
 record={...record,lastPlanSignature:signature,updatedAt:new Date().toISOString()};saveDraft(record);
 return {record,warnings,modules:operational?.modules.length??0,pages:site?.pages.length??0,forms:Object.keys(record.formIds).length};
}
