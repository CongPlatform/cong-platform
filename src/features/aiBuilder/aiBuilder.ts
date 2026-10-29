/**
 * Converts a validated AI *proposal* into real CONG draft resources.
 * Uses the same authenticated APIs as the two native builders; never publishes.
 * The caller must obtain an explicit user confirmation. No model-side tools.
 * Keep IDs per organization/session for safe retry and incremental revisions.
 */
import { apiRequest, apiTenantPost } from "../../services/api";
import { getStoredActiveOrganizationId } from "../../services/organizationStorage";
import type { AiField, AiModule, AiPlan, AiPublicForm, AiSection } from "../../services/aiAssistantService";
import {
  createOperationalSystem, getOperationalSystem, installOperationalModule,
  updateOperationalModule, getOperationalPlan, updateOperationalPlan,
  setOperationalBrandSite,
  type OperationalBlueprint, type OperationalField, type OperationalModule,
  type OperationalSystem,
} from "../operational/operationalService";
import {
  createInstitutionalSite, createInstitutionalPage, updateInstitutionalPage, deleteInstitutionalPage, getInstitutionalSite,
  updateInstitutionalSiteBrand, uploadInstitutionalMedia,
  getInstitutionalVariants, addInstitutionalSection,
  updateInstitutionalSection, deleteInstitutionalSection, type InstitutionalSite,
  type InstitutionalSectionType, type InstitutionalVariant, type InstitutionalLayoutNode,
} from "../../services/institutionalService";
import { createDefaultSectionContent } from "../../data/institutional/sectionCatalog";
import { findSiteComposition, settingsForComposition } from "../site-builder/compositions/compositionCatalog";
import { auditInstitutionalSite } from "./siteQuality";
import { createHybridComposition } from "./aiHybridLayouts";

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

/** Harmonias geradas a partir do tema da proposta aprovada. Sem valores aleatorios no servidor. */
function asHex(h:number, saturation:number, lightness:number):string {
  const c=(1-Math.abs(2*lightness-1))*saturation;
  const x=c*(1-Math.abs(((h/60)%2)-1)),m=lightness-c/2;
  const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return '#'+[r,g,b].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
}
export function createProjectPalettes(site:NonNullable<AiPlan["site"]>, seed=0):SitePalette[] {
  const subject=ascii(`${site.name} ${site.style} ${site.audience} ${site.pages.map(p=>p.title).join(' ')}`);
  const requested=ascii(site.style);
  const preferredHue=/verde/.test(requested)?145:/azul|marinho/.test(requested)?218:
    /roxo|lilas|violeta/.test(requested)?278:/rosa/.test(requested)?323:
    /amarelo|dourado/.test(requested)?43:/laranja/.test(requested)?27:
    /vermelho/.test(requested)?4:undefined;
  const preferredAccent=/amarelo|dourado/.test(requested)?44:
    /laranja/.test(requested)?28:/verde/.test(requested)&&preferredHue!==145?145:undefined;
  const theme=/alimento|doa|fome|solidari|comida/.test(subject)?34:
    /ambiente|natureza|florest|verde|animal/.test(subject)?145:
    /educa|escola|crianca|livro|ensino/.test(subject)?218:
    /saude|acolh|familia|cuidado/.test(subject)?326:
    /cultura|arte|criativ|musica/.test(subject)?274:200;
  let hash=2166136261;
  for (const char of subject) hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  const hue=((preferredHue??(theme + (hash%27)-13)) +seed*19+360)%360;
  return [
    {name:'Essencial', offset:0, sat:.54, light:.37, accent:39},
    {name:'Vibrante', offset:18, sat:.68, light:.41, accent:133},
    {name:'Serena', offset:-15, sat:.35, light:.32, accent:67},
  ].map((variant,index)=>({
    id:`projeto-${seed}-${index}`,label:`${variant.name} · ${site.name.slice(0,25)}`,
    description:preferredHue!==undefined?'Harmonia baseada nas cores pedidas para a ONG':'Harmonia criada a partir do tema da ONG',
    primary:asHex((hue+variant.offset+360)%360,variant.sat,variant.light),
    secondary:asHex((hue+62+variant.offset+360)%360, .39,.45),
    accent:asHex((preferredAccent!==undefined?preferredAccent+index*5:hue+variant.accent)%360,.79,.60),
    background:asHex((hue+24)%360,.24,.978),
    text:asHex((hue+14)%360,.23,.15),
  }));
}

/** Traduz tema da proposta em consulta ao acervo fotográfico integrado. */
export function suggestedStockQuery(site:NonNullable<AiPlan["site"]>):string {
 const subject=ascii(`${site.name} ${site.audience} ${site.pages.flatMap(p=>p.sections.map(s=>s.text)).join(' ')}`);
 if(/alimento|comida|fome|arrecad|cesta basica/.test(subject))return 'food donation volunteers';
 if(/animal|cachorro|gato|pet/.test(subject))return 'animal rescue volunteers';
 if(/escola|educac|material escolar|estudante|ensino/.test(subject))return 'education school children';
 if(/meio ambiente|ecologi|reciclag|florest|plantio/.test(subject))return 'environment forest volunteers';
 if(/saude|hospital|medic|cuidado/.test(subject))return 'community health volunteers';
 if(/idos|terceira idade/.test(subject))return 'senior care volunteers';
 return 'community volunteers charity';
}

/** Segunda busca independente para contextualizar paginas internas (nao repetir a capa). */
export function suggestedSecondaryStockQuery(site:NonNullable<AiPlan["site"]>):string {
 const text=ascii(`${site.name} ${site.audience} ${site.pages.flatMap(p=>p.sections.map(s=>`${s.title} ${s.text}`)).join(" ")}`);
 if(/alimento|fome|cesta|arrecad/.test(text))return "community food pantry donation";
 if(/animais|animal|cachorro|gato/.test(text))return "animal shelter rescue";
 if(/educac|escola|crianca|ensino/.test(text))return "school supplies education volunteers";
 if(/ambient|florest|plantio|natureza/.test(text))return "community tree planting nature";
 if(/saude|cuidado|hospital/.test(text))return "community health support";
 if(/idos|terceira idade/.test(text))return "elderly community care";
 return "community social project teamwork";
}

export type BuildRecord = {
  organizationId: string;
  sessionId: string;
  systemId: string | null;
  siteId: string | null;
  formIds: Record<string,string>;
  lastPlanSignature: string;
  updatedAt: string;
  contentVersion?: number;
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
/** Converte listas de projetos e formas de ajudar em coleções reais. A IA
 * frequentemente descreve cada item como uma seção livre: isso produzia uma
 * página de vários blocos enormes de texto em vez de um conjunto de cartões. */
function composeSitePlan(plan:NonNullable<AiPlan["site"]>):NonNullable<AiPlan["site"]>{
 return {...plan,pages:plan.pages.map(page=>{
   const context=ascii(`${page.title} ${page.slug}`);
   const kind=/como-ajud|apoi|doa|voluntari|particip/.test(context)?"cta":
     /projet|iniciativa|programa/.test(context)?"gallery":null;
   if(!kind)return page;
   const candidates=page.sections.map((section,index)=>({section,index})).filter(({section})=>
     ["text","features","cta","gallery"].includes(section.type) &&
     section.title.trim().length>2 && !section.items?.length && section.text.trim().length>0 &&
     (kind==="gallery" || /doa|parcer|voluntar|ajud|particip|contribu|apoi|campanha|arrecad/.test(ascii(section.title))));
   if(candidates.length<2)return page;
   const chosen=new Set(candidates.map(c=>c.index));
   const first=candidates[0].index;
   const combined:AiSection={type:kind,title:kind==="cta"?page.title:"Nossas iniciativas",
     text:kind==="cta"?"Escolha como participar das atividades da organização.":"Conheça as iniciativas apresentadas pela organização.",
     action_label:"",linked_module_alias:"",items:candidates.slice(0,8).map(({section})=>({
       title:section.title,description:section.text.slice(0,500),kind:"",
     }))};
   return {...page,sections:page.sections.flatMap((section,index)=>
     index===first?[combined]:chosen.has(index)?[]:[section])};
 })};
}

function sectionsVariant(type:InstitutionalSectionType,variants:InstitutionalVariant[],pageIndex:number,sectionIndex:number){
 const published=variants.filter(v=>v.sectionType===type && v.status==="published" && v.visibility==="public");
 if(published.length<2)return variantOf(type,variants);
 return published[(pageIndex+sectionIndex)%Math.min(published.length,4)];
}
/** Biblioteca segura: usa apenas composições sem dados demonstrativos fixos.
 * As composições gráficas ricas com números, depoimentos ou datas de exemplo
 * permanecem disponíveis no editor, mas não são publicadas automaticamente. */
const AI_COMPOSITIONS: Partial<Record<InstitutionalSectionType,readonly string[]>> = {
 organization_intro:["hero-editorial","hero-photo-first","hero-manifesto"],
 organization_about:["about-editorial","about-conversation","about-portrait"],
 projects_showcase:["projects-gallery","projects-report","projects-two-up"],
 support_actions:["support-cards","support-pathways"],
 organization_contact:["contact-split","contact-centered"],
};
function selectEditorialComposition(type:InstitutionalSectionType,section:AiSection|undefined,
 pageTitle:string,used:Set<string>){
 const candidates=(AI_COMPOSITIONS[type]??[]).map(id=>findSiteComposition(id)).filter((v):v is NonNullable<typeof v>=>Boolean(v));
 if(!candidates.length)return undefined;
 const hay=ascii(`${pageTitle} ${section?.title??""} ${section?.text??""}`);
 const count=section?.items?.length??0;
 const words=(section?.text??"").trim().split(/\s+/).filter(Boolean).length;
 const score=(id:string)=>{
   let value=used.has(id)?-7:5;
   if(id==="hero-photo-first" && /foto|imagem|pessoas|comunidade|familia|voluntari|acolh/.test(hay))value+=6;
   if(id==="hero-manifesto" && /direito|transforma|mobiliza|causa|manifesto|urgente/.test(hay))value+=4;
   if(id==="hero-editorial" && words>65)value+=4;
   if(id==="about-portrait" && /equipe|historia|pessoas|quem somos|trajetoria/.test(hay))value+=7;
   if(id==="about-editorial" && words>75)value+=5;
   if(id==="about-conversation" && /escuta|acolhimento|dialogo|comunidade/.test(hay))value+=4;
   if(id==="projects-two-up" && count===2)value+=9;
   if(id==="projects-gallery" && count>=3 && count<=4)value+=9;
   if(id==="projects-report" && count>=5)value+=9;
   if(id==="support-pathways" && count>=4)value+=7;
   if(id==="support-cards" && count>=1 && count<=3)value+=7;
   if(id==="contact-centered" && words<40)value+=7;
   if(id==="contact-split" && words>=40)value+=7;
   return value;
 };
 const selected=[...candidates].sort((a,b)=>score(b.id)-score(a.id)||a.id.localeCompare(b.id))[0];
 used.add(selected.id);
 return selected;
}
function compositionStyle(type:InstitutionalSectionType,variant:InstitutionalVariant|undefined,
 composition?:ReturnType<typeof selectEditorialComposition>,position=0){
 if(composition&&variant){
   return {...settingsForComposition(composition,variant),aiCompositionVersion:6,aiCompositionManaged:true};
 }
 const alternating=position%3;
 return {sectionStyle:{
   spacing:type==="site_header"?"compact":type==="site_footer"?"comfortable":type==="custom_content"?"comfortable":"normal",
   contentWidth:type==="organization_intro"?"wide":"normal",
   backgroundColor:type==="site_footer"?"primary.deep":"background",
   backgroundDecor:type==="site_footer"?"none":alternating===1?"wash":"none",
   backgroundDecorIntensity:alternating===1?16:0,
 },aiCompositionVersion:6,aiCompositionManaged:true};
}

function expectedNavigation(plan:NonNullable<AiPlan["site"]>){
 return plan.pages.slice(0,8).map(page=>({id:crypto.randomUUID(),label:page.title.slice(0,60),
   href:page.slug===plan.pages[0]?.slug?"/":`/${page.slug}`}));
}
function navigationAction(plan:NonNullable<AiPlan["site"]>){
 const page=plan.pages.find(p=>/como-ajud|doa|particip|voluntar/.test(ascii(`${p.title} ${p.slug}`)))
   ??plan.pages.find(p=>/contat/.test(ascii(`${p.title} ${p.slug}`)));
 return page?{label:page.title.slice(0,70),href:page.slug===plan.pages[0]?.slug?"/":`/${page.slug}`}:null;
}
function legacyHeaderSafeToRefresh(section:InstitutionalSite["pages"][number]["sections"][number],plan:NonNullable<AiPlan["site"]>){
 if(section.settings.aiCompositionManaged || (section.settings.contentGuidance as {source?:string}|undefined)?.source==="ai-confirmed-draft")return true;
 const links=Array.isArray(section.content.links)?section.content.links:[];
 if(links.length>2)return false;
 // Atalho inicial simples gerado anteriormente pela CONG, antes de haver navegação completa.
 const pageNames=new Set(plan.pages.map(p=>ascii(p.title)));
 return links.every(link=>link&&typeof link==="object"&&
   (pageNames.has(ascii(String((link as {label?:string}).label??"")))||
    /^(inicio|home|como ajudar|contato)$/i.test(String((link as {label?:string}).label??""))));
}
async function ensureGlobalSiteShell(site:InstitutionalSite,plan:NonNullable<AiPlan["site"]>,variants:InstitutionalVariant[],
 report:(text:string)=>void,warnings:string[]):Promise<InstitutionalSite>{
 const home=site.pages.find(p=>p.isHome)??site.pages[0];
 if(!home)throw new Error("O site não possui página inicial para receber o cabeçalho e o rodapé.");
 const allSections=site.pages.flatMap(p=>p.sections);
 const header=allSections.find(s=>s.sectionType==="site_header");
 const links=expectedNavigation(plan);
 const content={brandLabel:site.name.slice(0,120),links,primaryAction:navigationAction(plan)};
 if(!header){
   const variant=variantOf("site_header",variants);
   if(!variant)throw new Error("O catálogo de cabeçalhos institucionais não está disponível.");
   report("Criando cabeçalho e navegação de todas as páginas...");
   site=await addInstitutionalSection(home.id,{sectionType:"site_header",variantVersionId:variant.versionId,content,
     settings:{...compositionStyle("site_header",variantOf("site_header",variants)),contentGuidance:{source:"ai-confirmed-draft",needsReview:true}}});
 }else if(legacyHeaderSafeToRefresh(header,plan)){
   const old=Array.isArray(header.content.links)?header.content.links:[];
   const keptIds=new Map<string,string>(old.filter((x):x is {id:string;href:string;label:string}=>!!x&&typeof x==="object"&&typeof x.id==="string"&&typeof x.href==="string")
      .map(x=>[x.href,x.id] as const));
   report("Atualizando o menu com as páginas realmente criadas...");
   site=await updateInstitutionalSection(header.id,{visible:true,content:{...content,links:links.map(l=>({...l,id:keptIds.get(l.href)??l.id}))},
     settings:{...header.settings,...compositionStyle("site_header",variantOf("site_header",variants))}});
 }else if(links.length>2){
   warnings.push("O cabeçalho já tinha navegação personalizada; ela foi mantida. Revise os links no editor.");
 }
 const footer=site.pages.flatMap(p=>p.sections).find(s=>s.sectionType==="site_footer");
 if(!footer){
   const variant=variantOf("site_footer",variants);
   if(!variant)throw new Error("O catálogo de rodapés institucionais não está disponível.");
   const homeText=plan.pages[0]?.sections.find(s=>s.text.trim())?.text.trim()??"";
   const confirmedEmail=site.pages.flatMap(p=>p.sections).filter(s=>s.sectionType==="organization_contact")
     .map(s=>s.content.email).find((value):value is string=>typeof value==="string"&&value.trim().length>0)??"";
   report("Criando rodapé global para todas as páginas...");
   site=await addInstitutionalSection(home.id,{sectionType:"site_footer",variantVersionId:variant.versionId,
     content:{title:site.name.slice(0,160),description:homeText.slice(0,250),email:confirmedEmail,phone:"",copyright:`© ${new Date().getFullYear()} ${site.name}.`,socialLinks:[]},
     settings:{...compositionStyle("site_footer",variantOf("site_footer",variants)),visualStyle:"footer-rich",contentGuidance:{source:"ai-confirmed-draft",needsReview:true}}});
 }else if(footer.settings.aiCompositionManaged ||
   (footer.settings.contentGuidance as {source?:string}|undefined)?.source==="ai-confirmed-draft"){
   site=await updateInstitutionalSection(footer.id,{visible:true,content:{...footer.content,title:site.name.slice(0,160)},
     settings:{...footer.settings,...compositionStyle("site_footer",variantOf("site_footer",variants))}});
 }
 return site;
}

function variantOf(type:InstitutionalSectionType,variants:InstitutionalVariant[]){
 return variants.find(v=>v.sectionType===type&&v.status==="published"&&v.visibility==="public")
  ??variants.find(v=>v.sectionType===type&&v.status==="published")
  ??variants.find(v=>v.sectionType===type);
}
/** Usa apenas informações do plano ou das mensagens confirmadas, sem dados de catálogo. */
function siteNameInText(text:string,oldName:string,newName:string):string{
 if(!oldName.trim() || ascii(oldName)===ascii(newName))return text;
 const escaped=oldName.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 return text.replace(new RegExp(escaped,"gi"),newName);
}
function withSiteIdentity(plan:NonNullable<AiPlan["site"]>,newName:string,oldName=plan.name):NonNullable<AiPlan["site"]>{
 if(ascii(newName)===ascii(oldName))return plan;
 return {...plan,name:newName,pages:plan.pages.map(page=>({...page,
   title:siteNameInText(page.title,oldName,newName),
   sections:page.sections.map(section=>({...section,
     title:siteNameInText(section.title,oldName,newName),text:siteNameInText(section.text,oldName,newName),
     items:section.items?.map(item=>({...item,title:siteNameInText(item.title,oldName,newName),description:siteNameInText(item.description,oldName,newName)})),
   }))}))};
}
function actionHref(site:NonNullable<AiPlan["site"]>,label:string):string|null{
 const words=ascii(label);
 const desired=/contat|convers|mensag|falar/.test(words)?/contat/:
   /doa|ajud|apoi|partici|volunt|parcer/.test(words)?/ajud|doa|volunt|contat/:
   /projet|iniciativa|conhec/.test(words)?/projet|sobre/:/contat|ajud/;
 const target=site.pages.find(page=>desired.test(ascii(`${page.title} ${page.slug}`)));
 return target?`/${target.slug}`:null;
}
function namedInitiatives(turns:string[]):Array<{title:string;description:string}>{
 // Só extrai uma lista expressamente descrita pelo participante como projetos/iniciativas.
 const text=turns.join("\n");
 const matches=[...text.matchAll(/(?:projetos|iniciativas)(?:\s+\w+){0,4}\s*:\s*([^\n.!?]+)/gi)];
 const match=matches.at(-1);
 if(!match)return [];
 const names=match[1].split(/,|\s+e\s+/i).map(v=>v.replace(/^[\s\-\d.]+|\s+$/g,"")).filter(v=>v.length>=3&&v.length<=100);
 return names.length>=2&&names.length<=8?names.map(title=>({title,description:""})):[];
}
function explicitItems(section:AiSection):Array<{title:string;description:string;kind?:string}>{
 const typed=(section.items??[]).filter(x=>x.title.trim()).slice(0,8).map(x=>({title:x.title.trim(),description:x.description.trim(),kind:x.kind}));
 if(typed.length)return typed;
 // Fallback para propostas antigas: transformar linhas da IA em itens editáveis.
 const lines=section.text.split(/\n|\s*;\s*|\s*•\s*/).map(s=>s.replace(/^\s*(?:[-*]|\d+[.)])\s*/,"").trim()).filter(Boolean);
 if(lines.length<2)return [];
 return lines.slice(0,8).map(line=>{
   const [head,...tail]=line.split(/:\s+/);
   return {title:(tail.length?head:line).slice(0,100),description:tail.join(": ").slice(0,400)};
 });
}
function supportKind(text:string):"donate"|"volunteer"|"partner"|"materials"|"share"|"other"{
 const normalized=ascii(text);
 if(/voluntar|particip/.test(normalized))return "volunteer";
 if(/parcer|empresa|patrocin/.test(normalized))return "partner";
 if(/roupa|alimento|material|livro|produto/.test(normalized))return "materials";
 if(/divulg|compartilh/.test(normalized))return "share";
 if(/doa|contribu|apoi|arrecad/.test(normalized))return "donate";
 return "other";
}
function contentFor(type:InstitutionalSectionType,section:AiSection,site:NonNullable<AiPlan["site"]>,turns:string[]){
 const {title,text,action_label:action}=section;
 const base:Record<string,unknown>={...createDefaultSectionContent(type)};
 for(const [key,value] of Object.entries(base)){
   if(Array.isArray(value))base[key]=[];
   if(typeof value==="string"&&/^(eyebrow|subtitle|caption|address|email|phone|whatsapp|location|contactText|image|imageUrl|imageAlt|alt|quote|author|website|hours)$/i.test(key))base[key]="";
 }
 const description=text.slice(0,type==="organization_intro"?700:type==="organization_contact"?1600:2200);
 const content={...base,title:title.slice(0,180),description};
 if(type==="organization_contact"){
   // Somente dados explícitos do texto aprovado ou um contato identificado
   // nas falas do participante. Nunca usamos o e-mail da conta como contato da ONG.
   const emailPattern=/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/;
   const email=text.match(emailPattern)?.[0] ?? turns.join("\n").match(/(?:e-mail|email|contato(?: oficial)?)\s*:\s*([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,})/i)?.[1]??"";
   return {...content,email:email.slice(0,160)};
 }
 if(type==="organization_intro")return {...content,eyebrow:site.name.slice(0,100),image:null,
   primaryAction:action&&actionHref(site,action)?{label:action,href:actionHref(site,action)!}:null,secondaryAction:null};
 if(type==="organization_about")return {...content,eyebrow:"Quem somos",image:null,action:null};
 if(type==="projects_showcase"){
   let items=explicitItems(section);
   if(!items.length)items=namedInitiatives(turns);
   if(!items.length&&text.trim())items=[{title:title||"Nosso projeto",description:text.slice(0,500)}];
   return {...content,items:items.slice(0,12).map(item=>({id:crypto.randomUUID(),title:item.title.slice(0,120),
     description:item.description.slice(0,500),category:"",image:null,action:null}))};
 }
 if(type==="support_actions"){
   let items=explicitItems(section);
   if(!items.length){
     // Só desdobrar estas frentes se foram realmente solicitadas pelo participante.
     const described=ascii(`${text} ${turns.join(" ")}`);
     const candidates=[
       {pattern:/doa|arrecad|contribu/,title:"Doações",kind:"donate",description:"Apoie as iniciativas da organização por meio de doações."},
       {pattern:/voluntari/,title:"Voluntariado",kind:"volunteer",description:"Saiba como participar das atividades voluntárias."},
       {pattern:/parcer/,title:"Parcerias",kind:"partner",description:"Conheça as possibilidades de parceria com a organização."},
     ];
     items=candidates.filter(item=>item.pattern.test(described)).map(({title,kind,description})=>({title,kind,description}));
   }
   if(!items.length&&text.trim())items=[{title:action||title,description:text.slice(0,400)}];
   const contact=site.pages.find(p=>/contat|fale-conosco/.test(ascii(`${p.slug} ${p.title}`)));
   return {...content,items:items.slice(0,8).map(item=>{
     const kind=supportKind(item.kind||item.title);
     const call=contact?{label:kind==="volunteer"?"Quero participar":kind==="donate"||kind==="materials"?"Quero contribuir":
       kind==="partner"?"Quero ser parceiro":"Entrar em contato",href:`/${contact.slug}`}:null;
     return {id:crypto.randomUUID(),kind,title:item.title.slice(0,100),description:item.description.slice(0,400),action:call};
   })};
 }
 return content;
}
type SelectedAiPhoto={id:string;url:string;query:string;page:number};
async function applySelectedCoverPhoto(site:InstitutionalSite,plan:NonNullable<AiPlan["site"]>,
 photo:SelectedAiPhoto|null|undefined,report:(text:string)=>void,warnings:string[]):Promise<InstitutionalSite>{
 if(!photo)return site;
 const home=site.pages.find(p=>p.isHome)??site.pages[0];
 const hero=home?.sections.find(s=>s.sectionType==="organization_intro"&&s.visible);
 if(!hero){warnings.push("Nenhuma capa visível foi encontrada para a fotografia selecionada.");return site;}
 if(hero.settings.aiPhotoSourceId===photo.id&&hero.content.image)return site;
 try{
   report("Adicionando a fotografia ao componente de imagem da capa...");
   const {importPixabayImage}=await import("../../services/stockMediaService");
   const imported=await importPixabayImage({id:photo.id,url:photo.url} as import("../../services/stockMediaService").StockMediaItem,photo.query,photo.page);
   const image={assetId:imported.asset.id,url:imported.asset.url,alt:`Fotografia ilustrativa sobre a atuação de ${plan.name}`};
   const previousStyle=typeof hero.settings.sectionStyle==="object"&&hero.settings.sectionStyle
     ? {...hero.settings.sectionStyle as Record<string,unknown>} : {};
   // O patch anterior aplicava a imagem APENAS como fundo; isso deixava o slot
   // da capa vazio. Remover somente o fundo que foi gerado pela própria IA.
   if(hero.settings.aiPhotoSourceId)delete previousStyle.backgroundImage;
   return await updateInstitutionalSection(hero.id,{content:{...hero.content,image},
     settings:{...hero.settings,sectionStyle:previousStyle,aiPhotoCredit:imported.credit,aiPhotoSourceId:photo.id}});
 }catch{
   warnings.push("Não foi possível importar a foto da capa. Selecione uma imagem no editor antes de publicar.");return site;
 }
}
async function applySupportingPhoto(site:InstitutionalSite,photo:SelectedAiPhoto|null|undefined,
 report:(text:string)=>void,warnings:string[]):Promise<InstitutionalSite>{
 if(!photo)return site;
 const all=site.pages.flatMap(page=>page.sections.map(section=>({page,section})));
 const about=all.find(x=>x.section.sectionType==="organization_about"&&x.section.visible);
 const projects=all.find(x=>x.section.sectionType==="projects_showcase"&&x.section.visible&&Array.isArray(x.section.content.items)&&x.section.content.items.length>0);
 const target=about??projects;
 if(!target){warnings.push("Nenhuma seção de Sobre/Projetos aceita imagem adicional. Você poderá adicioná-la no editor.");return site;}
 if(target.section.settings.aiSupportingPhotoSourceId===photo.id &&
   (target.section.content.image||(Array.isArray(target.section.content.items)&&target.section.content.items.some((item:unknown)=>
     !!item&&typeof item==="object"&&"image" in item&&Boolean((item as {image?:unknown}).image)))))return site;
 try{
   report(`Inserindo imagem no conteúdo de ${target.page.title}...`);
   const {importPixabayImage}=await import("../../services/stockMediaService");
   const imported=await importPixabayImage({id:photo.id,url:photo.url} as import("../../services/stockMediaService").StockMediaItem,photo.query,photo.page);
   const image={assetId:imported.asset.id,url:imported.asset.url,alt:`Fotografia ilustrativa relacionada a ${target.page.title}`};
   const updatedContent={...target.section.content};
   if(target.section.sectionType==="organization_about")updatedContent.image=image;
   else if(Array.isArray(updatedContent.items))updatedContent.items=updatedContent.items.map((item:unknown,index:number)=>index===0&&item&&typeof item==="object"?{...item,image}:item);
   return await updateInstitutionalSection(target.section.id,{content:updatedContent,
     settings:{...target.section.settings,aiSupportingPhotoCredit:imported.credit,aiSupportingPhotoSourceId:photo.id}});
 }catch{
   warnings.push("Não foi possível inserir a imagem complementar. Confira o acervo no editor.");return site;
 }
}

/** Imagens distintas nos cartões dos projetos, sem sobrescrever fotos humanas ou
 * publicar imagens se a fonte de mídia não estiver configurada. */
async function applyProjectPhotos(site:InstitutionalSite,plan:NonNullable<AiPlan["site"]>,
  excludedIds:string[],report:(t:string)=>void,warnings:string[]):Promise<InstitutionalSite>{
 const galleries=site.pages.flatMap(page=>page.sections.filter(section=>
   section.sectionType==="projects_showcase" && section.visible &&
   (section.settings.contentGuidance as {source?:string}|undefined)?.source==="ai-confirmed-draft"));
 const pending=galleries.filter(s=>Array.isArray(s.content.items)&&
   s.content.items.some((item:unknown)=>!!item&&typeof item==="object"&&!(item as {image?:unknown}).image));
 if(!pending.length)return site;
 try{
   const {searchPixabay,importPixabayImage}=await import("../../services/stockMediaService");
   const query=suggestedSecondaryStockQuery(plan);
   report("Selecionando fotografias complementares para os projetos...");
   const found=await searchPixabay("image",query,1);
   if(!found.configured)return site;
   const unique=found.items.filter(item=>item.id&&item.url&&!excludedIds.includes(item.id)).slice(0,5);
   const used=new Set(excludedIds);
   for(const target of pending.slice(0,2)){
     const items=Array.isArray(target.content.items)?[...target.content.items]:[];
     let changed=false;
     const credits:Array<{author:string;sourceUrl:string;license:string}>=[];
     for(let i=0;i<Math.min(items.length,3);i++){
       const item=items[i] as {image?:unknown}|undefined;
       if(!item||item.image)continue;
       const photo=unique.find(candidate=>!used.has(candidate.id));
       if(!photo)break;
       used.add(photo.id);
       try{
         const imported=await importPixabayImage(photo,query,1);
         items[i]={...item,image:{assetId:imported.asset.id,url:imported.asset.url,
           alt:`Fotografia ilustrativa relacionada a ${String((item as {title?:unknown}).title??"projeto")}`}};
         credits.push(imported.credit);changed=true;
       }catch{continue;}
     }
     if(changed){
       site=await updateInstitutionalSection(target.id,{content:{...target.content,items},
         settings:{...target.settings,aiProjectPhotoCredits:credits}});
     }
   }
 }catch{
   warnings.push("Algumas fotografias dos projetos não foram inseridas. Revise as imagens no editor.");
 }
 return site;
}


/** Completa os slots de mídia da IA por seção e item, não só uma foto por site.
 * Mantém qualquer imagem existente e usa somente o catálogo autorizado. */
async function completeAiImages(site:InstitutionalSite,plan:NonNullable<AiPlan["site"]>,
 report:(text:string)=>void,warnings:string[]):Promise<InstitutionalSite>{
 const {searchPixabay,importPixabayImage}=await import("../../services/stockMediaService");
 const globalQuery=suggestedStockQuery(plan);
 const used=new Set<string>();
 const queryCache=new Map<string,Awaited<ReturnType<typeof searchPixabay>>["items"]>();
 // IDs previamente importados pela IA devem ser respeitados para não repetir fotografias.
 for(const pg of site.pages)for(const section of pg.sections){
   for(const value of [section.settings.aiPhotoSourceId,section.settings.aiSupportingPhotoSourceId,
     ...(Array.isArray(section.settings.aiMediaSources)?section.settings.aiMediaSources:[])]){
     if(typeof value==="string")used.add(value);
   }
 }
 const select=async(query:string)=>{
   for(const q of [query,globalQuery,"community volunteers charity"]){
     for(const page of [1,2]){
       const key=`${q}:${page}`;
       let choices=queryCache.get(key);
       if(!choices){
         try{const result=await searchPixabay("image",q,page);choices=result.configured?result.items:[];}
         catch{choices=[];}
         queryCache.set(key,choices);
       }
       const found=choices.find(candidate=>candidate.id&&candidate.url&&!used.has(candidate.id));
       if(found){used.add(found.id);return {photo:found,query:q,page};}
     }
   }
   return null;
 };
 const queryFor=(title:string,body:string)=>{
   const input=ascii(`${title} ${body}`);
   if(/escola|mochila|educac|material escolar|estudant/.test(input))return "school supplies education volunteers";
   if(/roupa|inverno|agasalh|vestuari/.test(input))return "clothing donation volunteers";
   if(/alimento|cesta|refeic|fome|comida|mesa solid/.test(input))return "food donation community volunteers";
   if(/animal|abrigo|cachorro|gato/.test(input))return "animal rescue shelter volunteers";
   if(/ambient|planti|florest|reciclag|natureza/.test(input))return "environment volunteers community";
   if(/saude|atendimento|medic|hospital/.test(input))return "community health volunteers";
   return globalQuery;
 };
 let filled=0;
 const MAX_IMAGES=22;
 for(const pagePlan of plan.pages){
   let page=site.pages.find(p=>p.slug===pagePlan.slug);
   if(!page)continue;
   for(const section of [...page.sections]){
     if(filled>=MAX_IMAGES)break;
     if(!section.visible || !section.settings.aiSectionKey)continue;
     if(!["organization_intro","organization_about","projects_showcase","custom_content"].includes(section.sectionType))continue;
     const aiLayout=section.settings.layoutOverride as InstitutionalLayoutNode|undefined;
     if(section.sectionType==="custom_content"&&!imageNodes(aiLayout).some(node=>!node.value))continue;
     const content={...section.content};
     const sources=Array.isArray(section.settings.aiMediaSources)?
       [...section.settings.aiMediaSources.filter((v):v is string=>typeof v==="string")]:[];
     const title=String(content.title??page.title);
     const desc=String(content.description??"");
     const importPhoto=async(name:string,body:string)=>{
       const selected=await select(queryFor(name,body));
       if(!selected)return null;
       try{
         const imported=await importPixabayImage(selected.photo,selected.query,selected.page);
         sources.push(selected.photo.id);filled++;
         return {assetId:imported.asset.id,url:imported.asset.url,alt:`Fotografia ilustrativa: ${name.slice(0,110)}`};
       }catch{return null;}
     };
     let changed=false;
     if((section.sectionType==="organization_intro"||section.sectionType==="organization_about")&&!content.image){
       report(`Escolhendo imagem para ${page.title} · ${title}...`);
       const photo=await importPhoto(title,desc);
       if(photo){content.image=photo;changed=true;}
       else warnings.push(`Não encontrei fotografia para "${title}". Escolha uma imagem no editor.`);
     }
     let updatedLayout:InstitutionalLayoutNode|undefined;
     if(section.sectionType==="custom_content" && aiLayout){
       let next=aiLayout;
       const missing=imageNodes(aiLayout).filter(n=>!n.value).length;
       for(let i=0;i<missing && filled<MAX_IMAGES;i++){
         const mediaTitle=nextLayoutImageSubject(next,title);
         report(`Ilustrando seção editorial: ${mediaTitle}...`);
         const photo=await importPhoto(mediaTitle,mediaTitle===title?desc:"");
         if(!photo)break;
         next=fillLayoutImage(next,photo);changed=true;
       }
       if(changed)updatedLayout=next;
     }
     if(section.sectionType==="projects_showcase"&&Array.isArray(content.items)){
       const items=[...content.items];
       for(let i=0;i<items.length&&filled<MAX_IMAGES;i++){
         const item=items[i];
         if(!item||typeof item!=="object"||(item as {image?:unknown}).image)continue;
         const title=String((item as {title?:unknown}).title??page.title);
         report(`Ilustrando projeto: ${title}...`);
         const photo=await importPhoto(title,String((item as {description?:unknown}).description??""));
         if(photo){items[i]={...item,image:photo};changed=true;}
       }
       if(changed)content.items=items;
       if(items.some(item=>item && typeof item==="object"&&!('image' in item && Boolean(item.image))))
          warnings.push(`Alguns projetos de "${page.title}" ainda precisam de fotografias.`);
     }
     if(changed){
       site=await updateInstitutionalSection(section.id,{content,
         settings:{...section.settings,aiMediaSources:sources,...(updatedLayout?{layoutOverride:updatedLayout}:{})}});
       page=site.pages.find(p=>p.slug===pagePlan.slug)??page;
     }
   }
 }
 return site;
}

async function autoChoosePhoto(plan:NonNullable<AiPlan["site"]>,secondary:boolean,report:(text:string)=>void):Promise<SelectedAiPhoto|null>{
 try{
   const {searchPixabay}=await import("../../services/stockMediaService");
   const query=secondary?suggestedSecondaryStockQuery(plan):suggestedStockQuery(plan);
   report(secondary?"Buscando imagem para as páginas internas...":"Buscando fotografia para a capa...");
   const found=await searchPixabay("image",query,1);
   const first=found.configured?found.items.filter(item=>item.id&&item.url)[secondary?1:0]??found.items[0]:null;
   return first?{id:first.id,url:first.url,query,page:1}:null;
 }catch{return null;}
}

/** A API cria uma Home vazia quando não se escolhe template. A primeira
 * página do plano precisa ser essa Home, nunca uma página interna invisível. */
async function alignHomePage(site:InstitutionalSite,plan:NonNullable<AiPlan["site"]>,report:(text:string)=>void){
 const first=plan.pages[0];
 if(!first)throw new Error("A IA não definiu uma página inicial. Revise a proposta antes de construir.");
 const currentHome=site.pages.find(page=>page.isHome);
 const intended=site.pages.find(page=>page.slug===first.slug);
 if(intended?.isHome)return site;
 report("Definindo a página inicial do projeto...");
 if(intended){
   site=await updateInstitutionalPage(site.id,intended.id,{isHome:true});
   // Remove apenas a Home artificial completamente vazia. Se houver header/footer,
   // mantenha-a para não excluir componentes globais compartilhados.
   const oldHome=currentHome&&site.pages.find(page=>page.id===currentHome.id);
   if(oldHome&&oldHome.slug==="home"&&!plan.pages.some(page=>page.slug==="home")&&
      oldHome.sections.length===0){
     site=await deleteInstitutionalPage(site.id,oldHome.id);
   }
   return site;
 }
 if(currentHome && !currentHome.sections.some(section=>!["site_header","site_footer"].includes(section.sectionType))){
   return updateInstitutionalPage(site.id,currentHome.id,{title:first.title,slug:first.slug});
 }
 // A Home já tem conteúdo próprio: não apagá-la; preserve e crie nova página.
 site=await createInstitutionalPage(site.id,{title:first.title,slug:first.slug});
 const created=site.pages.find(page=>page.slug===first.slug);
 if(!created)throw new Error("Não foi possível localizar a nova página inicial.");
 return updateInstitutionalPage(site.id,created.id,{isHome:true});
}

/** Seções livres usam elementos reais do editor, não apenas metadados content. */
function freeSectionLayout(section:AiSection,href:string|null,sectionIndex:number):InstitutionalLayoutNode{
 const {title,text:body,action_label:action}=section;
 const heading:InstitutionalLayoutNode={type:"element",id:crypto.randomUUID(),elementType:"heading",value:title||"Conheça nosso trabalho",
   style:{width:"100",color:"primary.strong",fontSize:sectionIndex===0?44:36}};
 const paragraphNodes:InstitutionalLayoutNode[]=body.trim().split(/\n\s*\n/).filter(Boolean).slice(0,5).map(paragraph=>({
   type:"element",id:crypto.randomUUID(),elementType:"text",value:paragraph.trim(),style:{width:"100",color:"text",fontSize:18},
 }));
 const actionNode:InstitutionalLayoutNode[]=(action.trim()&&href)?[{type:"element",id:crypto.randomUUID(),elementType:"button",
   value:{label:action.trim(),href},style:{width:"auto"}}]:[];
 const items=section.items?.length?explicitItems(section):[];
 if(items.length>=2){
   const cards:InstitutionalLayoutNode[]=items.map(item=>({type:"stack",gap:"small",surface:"card",children:[
     ...(section.type==="features"?[{type:"element" as const,id:crypto.randomUUID(),elementType:"image" as const,value:null,
       style:{width:"100" as const,imageAspect:"4:3" as const,imageFit:"cover" as const,imageFrame:"rounded" as const}}]:[]),
     {type:"element",id:crypto.randomUUID(),elementType:"heading",value:item.title,style:{width:"100",fontSize:25,color:"text"}},
     ...(item.description?[{type:"element" as const,id:crypto.randomUUID(),elementType:"text" as const,
       value:item.description,style:{width:"100" as const,color:"text" as const,fontSize:16}}]:[]),
   ]}));
   return {type:"stack",gap:"large",children:[heading,...paragraphNodes,...actionNode,
     {type:"grid",columns:cards.length>=3?3:2,gap:"medium",children:cards}]};
 }
 if(paragraphNodes.length>1 && !actionNode.length && section.type==="text" && body.length>=190){
   const photo:InstitutionalLayoutNode={type:"element",id:crypto.randomUUID(),elementType:"image",value:null,
     style:{width:"100",imageFit:"cover",imageAspect:"4:3",imageFrame:"rounded"}};
   return {type:"stack",gap:"large",children:[heading,{type:"columns",ratio:"3:2",gap:"large",children:[
     {type:"stack",gap:"medium",children:paragraphNodes},
     {type:"stack",gap:"medium",children:[photo]},
   ]},...actionNode]};
 }
 if(paragraphNodes.length>1 && !actionNode.length){
   return {type:"stack",gap:"large",children:[heading,{type:"columns",ratio:"3:2",gap:"large",children:[
     {type:"stack",gap:"medium",children:paragraphNodes.slice(0,1)},
     {type:"stack",gap:"medium",surface:"highlight",children:paragraphNodes.slice(1)},
   ]}]};
 }
 // Páginas com uma única seção de texto ainda recebem composição editorial,
 // sem duplicar ou inventar conteúdo para preencher espaço em branco.
 if(paragraphNodes.length===1&&!actionNode.length){
   const bodyNode:InstitutionalLayoutNode=body.length>180?
     {type:"stack",gap:"medium",children:[...paragraphNodes,
       {type:"element",id:crypto.randomUUID(),elementType:"image",value:null,
         style:{width:"100",imageFit:"cover",imageAspect:"4:3",imageFrame:"rounded"}}]}:
     {type:"stack",gap:"medium",surface:"highlight",children:paragraphNodes};
   return {type:"columns",ratio:"2:3",gap:"large",children:[
     {type:"stack",gap:"small",children:[heading]},bodyNode,
   ]};
 }
 if(paragraphNodes.length && actionNode.length){
   return {type:"columns",ratio:"3:2",gap:"large",children:[
     {type:"stack",gap:"medium",children:[heading,...paragraphNodes]},
     {type:"stack",gap:"medium",surface:"highlight",children:actionNode},
   ]};
 }
 return {type:"stack",gap:"medium",children:[heading,...paragraphNodes,...actionNode]};
}

/** Altera apenas a mídia de slots gerados pela IA. Não substitui fotos do editor. */
function imageNodes(layout:InstitutionalLayoutNode|undefined):Array<Extract<InstitutionalLayoutNode,{type:"element"}>>{
 if(!layout)return [];
 if(layout.type==="element")return layout.elementType==="image"?[layout]:[];
 if(layout.type==="stack"||layout.type==="columns"||layout.type==="grid")return layout.children.flatMap(imageNodes);
 if(layout.type==="repeat")return imageNodes(layout.item);
 return [];
}
function restoreLayoutImages(previous:InstitutionalLayoutNode|undefined,layout:InstitutionalLayoutNode):InstitutionalLayoutNode{
 const saved=imageNodes(previous).map(node=>node.value).filter(Boolean);
 if(!saved.length)return layout;
 let index=0;
 const visit=(node:InstitutionalLayoutNode):InstitutionalLayoutNode=>{
   if(node.type==="element"&&node.elementType==="image"&&!node.value){
     const found=saved[index++];return found?{...node,value:found}:node;
   }
   if(node.type==="columns")return {...node,children:[visit(node.children[0]),visit(node.children[1])]};
   if(node.type==="stack"||node.type==="grid")return {...node,children:node.children.map(visit)};
   if(node.type==="repeat")return {...node,item:visit(node.item)};
   return node;
 };
 return visit(layout);
}
/** Nos cartões de características, identifica o título do próprio cartão,
 * em vez de pesquisar a mesma imagem genérica para a página inteira. */
function nextLayoutImageSubject(layout:InstitutionalLayoutNode,fallback:string):string{
 const firstHeading=(node:InstitutionalLayoutNode):string|undefined=>{
   if(node.type==="element"&&node.elementType==="heading"&&typeof node.value==="string")return node.value;
   if(node.type==="stack"||node.type==="columns"||node.type==="grid"){
     for(const child of node.children){const label=firstHeading(child);if(label)return label;}
   }
   return undefined;
 };
 const visit=(node:InstitutionalLayoutNode):string|undefined=>{
   if(node.type==="stack"||node.type==="columns"||node.type==="grid"){
     const hasDirectImage=node.children.some(child=>child.type==="element"&&child.elementType==="image"&&!child.value);
     if(hasDirectImage)return node.children.map(firstHeading).find(Boolean)??fallback;
     for(const child of node.children){const subject=visit(child);if(subject)return subject;}
   }
   if(node.type==="repeat")return visit(node.item);
   if(node.type==="element"&&node.elementType==="image"&&!node.value)return fallback;
   return undefined;
 };
 return visit(layout)??fallback;
}
function fillLayoutImage(layout:InstitutionalLayoutNode,asset:{assetId:string;url:string;alt:string}):InstitutionalLayoutNode{
 let done=false;
 const visit=(node:InstitutionalLayoutNode):InstitutionalLayoutNode=>{
   if(node.type==="element"&&node.elementType==="image"&&!node.value&&!done){done=true;return {...node,value:asset};}
   if(node.type==="columns")return {...node,children:[visit(node.children[0]),visit(node.children[1])]};
   if(node.type==="stack"||node.type==="grid")return {...node,children:node.children.map(visit)};
   if(node.type==="repeat")return {...node,item:visit(node.item)};
   return node;
 };
 return visit(layout);
}

function isSitePlanRendered(site:InstitutionalSite,plan:NonNullable<AiPlan["site"]>):boolean{
 const home=site.pages.find(page=>page.isHome);
 if(!home||home.slug!==plan.pages[0]?.slug)return false;
 const all=site.pages.flatMap(p=>p.sections);
 const header=all.find(s=>s.sectionType==="site_header"&&s.visible);
 const footer=all.find(s=>s.sectionType==="site_footer"&&s.visible);
 if(!header||!footer)return false;
 const nav=Array.isArray(header.content.links)?header.content.links:[];
 if(header.settings.aiCompositionManaged && plan.pages.some(p=>!nav.some(l=>l&&typeof l==="object"&&
   (l as {href?:string}).href===(p.slug===plan.pages[0].slug?"/":`/${p.slug}`))))return false;
 return plan.pages.every(pagePlan=>{
   const page=site.pages.find(item=>item.slug===pagePlan.slug);
   if(!page)return false;
   // Exigir cada seção do plano identificada por chave estável, impedindo sucesso falso.
   return pagePlan.sections.every((source,index)=>page.sections.some(section=>{
     if(!section.visible||section.settings.aiSectionKey!==`${pagePlan.slug}:${index}`)return false;
     if(section.sectionType==="custom_content")return Boolean(section.settings.layoutOverride);
     if(["projects_showcase","support_actions"].includes(section.sectionType)){
       if((source.text.trim()||source.items?.length)&&(!Array.isArray(section.content.items)||section.content.items.length===0))return false;
     }
     return true;
   }));
 });
}

function inputReportComposition(report:(message:string)=>void,page:string,section:string,composition:string){
 report(`Compondo ${page} · ${section} com ${composition}...`);
}
/** Auditoria editorial orientativa: nunca inventa fatos para preencher páginas. */
export function editorialWarnings(plan:NonNullable<AiPlan["site"]>):string[]{
 const warnings:string[]=[];
 for(const page of plan.pages){
   const words=page.sections.reduce((sum,section)=>sum+section.text.trim().split(/\s+/).filter(Boolean).length+
     (section.items??[]).reduce((n,item)=>n+item.description.trim().split(/\s+/).filter(Boolean).length,0),0);
   const contact=/contat|fale-conosco/.test(ascii(`${page.slug} ${page.title}`));
   if(page.sections.length<(contact?2:3))warnings.push(`Página "${page.title}": a proposta contém poucas seções; solicite à IA uma revisão editorial antes de publicar.`);
   if(words<(contact?50:100))warnings.push(`Página "${page.title}": apenas ${words} palavras planejadas. Peça textos mais desenvolvidos para esta página.`);
   const repeated=new Set<string>();
   for(const section of page.sections){
     const normalized=norm(section.text);
     if(normalized.length>45){if(repeated.has(normalized))warnings.push(`Página "${page.title}": há textos repetidos; revise antes de publicar.`);repeated.add(normalized);}
     if(/\b(?:exemplo|lorem ipsum|insira aqui|digite aqui|placeholder)\b/i.test(section.text))
       warnings.push(`Página "${page.title}": um texto parece demonstrativo e precisa de revisão.`);
     if((section.type==="gallery"||section.type==="cta")&&(!section.items||section.items.length===0))
       warnings.push(`Seção "${section.title}": solicite itens individualizados à IA.`);
   }
 }
 return warnings;
}

async function writeSite(plan:NonNullable<AiPlan["site"]>,record:BuildRecord,report:(t:string)=>void,warnings:string[], photo?:{id:string;url:string;query:string;page:number}|null,
 secondaryPhoto?:{id:string;url:string;query:string;page:number}|null,onSiteSnapshot?:(site:InstitutionalSite)=>void,turns:string[]=[],originalName?:string,look:SiteLook="human"){
 plan=composeSitePlan(plan);
 warnings.push(...editorialWarnings(plan));
 const freshSite=!record.siteId;
 if(freshSite){
   report("Criando o site institucional na CONG...");
   const created=await createInstitutionalSite({name:plan.name.slice(0,100),templateId:null,identityMode:"custom"});
   record.siteId=created.id;
   saveDraft(record); // permite retomar após uma falha de rede
 }
 const siteId=record.siteId;
 if(!siteId)throw new Error("O site não foi identificado.");
 let site=await getInstitutionalSite(siteId);
 // Rascunhos antigos recebem o nome que realmente está salvo na organização.
 plan=withSiteIdentity(plan,site.name,originalName??plan.name);
 site=await alignHomePage(site,plan,report);
 onSiteSnapshot?.(site);
 const variants=await getInstitutionalVariants();
 if(!variants.length)throw new Error("O catálogo de seções institucionais não está disponível. Nenhuma página vazia será considerada pronta.");
 const compositionsUsed=new Set<string>();
 for(const [index,pagePlan] of plan.pages.entries()){
   report(`Montando página ${index+1}/${plan.pages.length}: ${pagePlan.title}`);
   let page=site.pages.find(p=>p.slug===pagePlan.slug);
   if(!page){site=await createInstitutionalPage(site.id,{title:pagePlan.title,slug:pagePlan.slug});page=site.pages.find(p=>p.slug===pagePlan.slug);}
   if(!page)throw new Error(`Não foi possível criar a página ${pagePlan.title}.`);
   const claimed=new Set<string>();
   for(const [sectionIndex,section] of pagePlan.sections.entries()){
     const type=section.type==="features"&&section.items?.length?"custom_content":sectionType(section.type);
     const sectionKey=`${pagePlan.slug}:${sectionIndex}`;
     if(section.type==="impact")warnings.push(`A seção "${section.title}" não possui números de impacto não confirmados.`);
     const matching=page.sections.find(s=>s.settings.aiSectionKey===sectionKey)
       ??page.sections.find(s=>!claimed.has(s.id)&&s.sectionType===type&&
         s.settings.contentGuidance && typeof s.settings.contentGuidance==="object"&&
         (s.settings.contentGuidance as {source?:string}).source==="ai-confirmed-draft"&&
         String(s.content.title??"")===section.title)
       ??(freshSite?page.sections.find(s=>!claimed.has(s.id)&&s.sectionType===type&&
         !s.settings.aiSectionKey):undefined);
     const content=contentFor(type,section,plan,turns);
     if(section.action_label.trim() && !actionHref(plan,section.action_label) && (type==="custom_content"||type==="organization_intro"))
       warnings.push(`O botão “${section.action_label}” em “${pagePlan.title}” não tem página de destino. Revise antes de publicar.`);
     // A IA pode montar composições autorais com elementos NATIVOS da CONG.
     // Quando a composição híbrida não serve ao conteúdo, usa o acervo original.
     // Não aceitamos HTML, scripts ou CSS arbitrário do modelo.
     const hybrid=createHybridComposition({type,section,siteStyle:plan.style,
       pageSlug:pagePlan.slug,pageIndex:index,sectionIndex,look});
     const composition=hybrid?undefined:selectEditorialComposition(type,section,pagePlan.title,compositionsUsed);
     const availableVariant=sectionsVariant(type,variants,index,sectionIndex);
     const variant=composition ? (variants.find(v=>v.sectionType===type&&v.status==="published"&&v.visibility==="public"&&
       v.familyKey===composition.preferredFamily)??availableVariant) : availableVariant;
     if(!variant)throw new Error(`Não existe seção publicada compatível com "${section.title}" (${type}).`);
     inputReportComposition(report,pagePlan.title,section.title,hybrid?.title??composition?.title??"Composição editorial personalizada");
     const settings={contentGuidance:{source:"ai-confirmed-draft",needsReview:true},aiSectionKey:sectionKey,
       ...compositionStyle(type,variant,composition,index+sectionIndex),
       ...(hybrid?{layoutOverride:hybrid.layout,sectionStyle:hybrid.sectionStyle,
         compositionId:hybrid.id,visualStyle:"ai-hybrid-editorial",aiHybridLayoutVersion:1}:{}),
       ...(type==="custom_content"?{layoutOverride:freeSectionLayout(section,actionHref(plan,section.action_label),sectionIndex)}:{})};
     if(matching && matching.sectionType!==type &&
       (matching.settings.contentGuidance as {source?:string}|undefined)?.source==="ai-confirmed-draft"){
       // Uma página antes formada por textos individuais agora pode virar uma
       // coleção; só substituir se a seção anterior pertencia à montagem da IA.
       site=await deleteInstitutionalSection(matching.id);
       page=site.pages.find(p=>p.id===page?.id)??page;
     }
     if(matching && matching.sectionType===type){
       claimed.add(matching.id);
       // Nunca sobrescrever seções alteradas manualmente. Só recuperar conteúdo da IA.
       const guide=matching.settings.contentGuidance;
       const aiOwned=!!guide&&typeof guide==="object"&&"source" in guide&&guide.source==="ai-confirmed-draft";
       if(aiOwned||freshSite){
         const preserved:Record<string,unknown>={...content};
         // Preserve imagens escolhidas no editor, mas atualize o texto dos itens
         // quando a IA reescrever a proposta. O código anterior preservava a lista
         // inteira e impedia revisões editoriais dos cartões.
         if(matching.content.image)preserved.image=matching.content.image;
         const generatedItems:unknown="items" in content?content.items:undefined;
         if(Array.isArray(generatedItems)&&Array.isArray(matching.content.items)){
           const oldItems=matching.content.items.filter((item):item is Record<string,unknown>=>
             !!item&&typeof item==="object");
           preserved.items=generatedItems.map((item:unknown,index:number)=>{
             if(!item||typeof item!=="object")return item;
             const next=item as Record<string,unknown>;
             const previous=oldItems.find(old=>ascii(String(old.title??""))===ascii(String(next.title??"")))??oldItems[index];
             return previous?{...next,id:previous.id??next.id,image:previous.image??next.image}:next;
           });
         }
         const previousLayout=matching.settings.layoutOverride as InstitutionalLayoutNode|undefined;
         const nextLayout=settings.layoutOverride as InstitutionalLayoutNode|undefined;
         const restored=nextLayout?restoreLayoutImages(previousLayout,nextLayout):undefined;
         site=await updateInstitutionalSection(matching.id,{content:preserved,
           settings:{...matching.settings,...settings,...(restored?{layoutOverride:restored}:{})},visible:true});
       }
     }else{
       site=await addInstitutionalSection(page.id,{sectionType:type,variantVersionId:variant.versionId,content,settings});
     }
     page=site.pages.find(p=>p.id===page?.id)??page;
     onSiteSnapshot?.(site);
   }
   // Remove apenas seções obsoletas comprovadamente criadas pela IA, quando
   // vários textos passaram a formar uma coleção (não afeta seções manuais).
   const expectedKeys=new Set(pagePlan.sections.map((_,i)=>`${pagePlan.slug}:${i}`));
   const currentPage=site.pages.find(p=>p.id===page?.id);
   for(const obsolete of currentPage?.sections??[]){
     const k=obsolete.settings.aiSectionKey;
     if(typeof k!=="string"||!k.startsWith(`${pagePlan.slug}:`)||expectedKeys.has(k))continue;
     if((obsolete.settings.contentGuidance as {source?:string}|undefined)?.source!=="ai-confirmed-draft")continue;
     site=await deleteInstitutionalSection(obsolete.id);
   }
 }
 report("Finalizando a navegação e o rodapé do site...");
 site=await ensureGlobalSiteShell(site,plan,variants,report,warnings);
 onSiteSnapshot?.(site);
 // Nunca declarar sucesso para uma Home vazia ou para seções que não foram gravadas.
 site=await getInstitutionalSite(site.id);
 if(!isSitePlanRendered(site,plan))throw new Error("A montagem do site ficou incompleta. Reabra esta conversa e retome o rascunho.");
 site=await applySelectedCoverPhoto(site,plan,photo,report,warnings);
 onSiteSnapshot?.(site);
 site=await applySupportingPhoto(site,secondaryPhoto,report,warnings);
 onSiteSnapshot?.(site);
 site=await applyProjectPhotos(site,plan,[photo?.id??"",secondaryPhoto?.id??""],report,warnings);
 site=await completeAiImages(site,plan,report,warnings);
 onSiteSnapshot?.(site);
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
      content:{title,description:"Preencha o formulário para falar com a organização."},
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

async function applyVisuals(siteId:string, palette:SitePalette|null|undefined, logoFile:File|null|undefined,
  look:SiteLook, report:(text:string)=>void,warnings:string[]){
  // A opcao de estilo realmente altera tokens da marca no construtor,
  // sem depender da narrativa visual do assistente.
  const lookDesign=look==="impact" ? {
    headingFamily:"sans" as const,bodyFamily:"sans" as const,headingScale:"expressive" as const,
    bodyScale:"standard" as const,spacing:"spacious" as const,corners:"subtle" as const,
  } : look==="institutional" ? {
    headingFamily:"sans" as const,bodyFamily:"sans" as const,headingScale:"compact" as const,
    bodyScale:"standard" as const,spacing:"standard" as const,corners:"square" as const,
  } : {
    headingFamily:"humanist" as const,bodyFamily:"humanist" as const,headingScale:"standard" as const,
    bodyScale:"relaxed" as const,spacing:"spacious" as const,corners:"rounded" as const,
  };
  try{
    report("Aplicando a identidade visual ao site...");
    const site=await getInstitutionalSite(siteId);
    let logoAssetId=site.brand.logoAssetId;
    if(logoFile){
      const media=await uploadInstitutionalMedia(logoFile);
      logoAssetId=media.id;
    }
    await updateInstitutionalSiteBrand(siteId,{
      logoAssetId,
      primaryColor:palette?.primary??site.brand.primaryColor,
      secondaryColor:palette?.secondary??site.brand.secondaryColor,
      accentColor:palette?.accent??site.brand.accentColor,
      backgroundColor:palette?.background??site.brand.backgroundColor,
      textColor:palette?.text??site.brand.textColor,
      headingFont:site.brand.headingFont,
      bodyFont:site.brand.bodyFont,
      designSystem:{...site.brand.designSystem,...lookDesign},
    });
  }catch{
    warnings.push("O conteúdo do site foi criado, mas não consegui aplicar completamente as cores ou o logotipo. Abra o editor antes de publicar.");
  }
}

export async function buildAiDraft(input:{plan:AiPlan;sessionId:string;turns:string[];look:SiteLook;
 palette?:SitePalette|null;logoFile?:File|null;photo?:{id:string;url:string;query:string;page:number}|null;
 secondaryPhoto?:{id:string;url:string;query:string;page:number}|null;sourceSiteName?:string;onSiteSnapshot?:(site:InstitutionalSite)=>void;report:(text:string)=>void}):Promise<BuildResult>{
 const {org}=key(input.sessionId);
 let record:BuildRecord=existingDraft(input.sessionId)??{
   organizationId:org,sessionId:input.sessionId,systemId:null,siteId:null,formIds:{},lastPlanSignature:"",updatedAt:"",
 };
  const warnings:string[]=[];
 const signature=JSON.stringify(input.plan);
 // Uma assinatura salva não prova que houve conteúdo na Home. Corrige projetos
 // criados antes deste patch, sem criar outro site e sem exigir nova sessão.
 let alreadyComplete=false;
 if(record.lastPlanSignature===signature && record.siteId && input.plan.site && record.contentVersion===6){
   const saved=await getInstitutionalSite(record.siteId);
   alreadyComplete=isSitePlanRendered(saved,composeSitePlan(input.plan.site));
 }
 if(record.lastPlanSignature===signature && ((alreadyComplete&&record.contentVersion===6)||!input.plan.site)){
   input.report("Esse rascunho já foi montado. Não serão criados itens repetidos.");
   if(record.siteId){
     await applyVisuals(record.siteId,input.palette,input.logoFile,input.look,input.report,warnings);
     if(input.plan.site){
       const site=await getInstitutionalSite(record.siteId);
       const autoCover=input.photo??await autoChoosePhoto(input.plan.site,false,input.report);
       const autoSecondary=input.secondaryPhoto??await autoChoosePhoto(input.plan.site,true,input.report);
       if(!autoCover)warnings.push("A CONG não encontrou foto de capa no acervo. Adicione uma imagem no editor para concluir o visual.");
       const withCover=await applySelectedCoverPhoto(site,input.plan.site,autoCover,input.report,warnings);
       const withPhotos=await applySupportingPhoto(withCover,autoSecondary,input.report,warnings);
       const completed=await applyProjectPhotos(withPhotos,composeSitePlan(input.plan.site),
         [autoCover?.id??"",autoSecondary?.id??""],input.report,warnings);
       const illustrated=await completeAiImages(completed,composeSitePlan(input.plan.site),input.report,warnings);
       input.onSiteSnapshot?.(await getInstitutionalSite(illustrated.id));
     }
   }
   if(record.siteId){
     const audit=auditInstitutionalSite(await getInstitutionalSite(record.siteId));
     if(audit.blockers.length)warnings.push(`Auditoria: ${audit.blockers.length} pendência(s) bloqueiam a publicação.`);
     warnings.push(...[...audit.blockers,...audit.warnings].slice(0,12).map(issue=>`${issue.page?issue.page+": ":""}${issue.message}`));
   }
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
 if(input.plan.site){
   const cover=input.photo??await autoChoosePhoto(input.plan.site,false,input.report);
   const secondary=input.secondaryPhoto??await autoChoosePhoto(input.plan.site,true,input.report);
   if(!cover)warnings.push("A CONG não encontrou foto de capa no acervo. Adicione uma imagem no editor para concluir o visual.");
   site=await writeSite(input.plan.site,record,input.report,warnings,cover,secondary,input.onSiteSnapshot,input.turns,input.sourceSiteName,input.look);
   if(site){
     await applyVisuals(site.id,input.palette,input.logoFile,input.look,input.report,warnings);
     input.onSiteSnapshot?.(await getInstitutionalSite(site.id));
   }
 }
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
 if(site){
   const saved=await getInstitutionalSite(site.id);
   const audit=auditInstitutionalSite(saved);
   if(audit.blockers.length)warnings.push(`Auditoria: ${audit.blockers.length} pendência(s) impedem a publicação até revisão.`);
   for(const issue of [...audit.blockers,...audit.warnings].slice(0,12))warnings.push(`${issue.page?issue.page+": ":""}${issue.message}`);
 }
 record={...record,lastPlanSignature:signature,contentVersion:6,updatedAt:new Date().toISOString()};saveDraft(record);
 return {record,warnings,modules:operational?.modules.length??0,pages:site?.pages.length??0,forms:Object.keys(record.formIds).length};
}
