/* Isolated orchestration test; external APIs are mocked, not a live deploy. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let ts;
try { ts = require('typescript'); } catch { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); }
const path = require('node:path');
const store = new Map();
const state = { site: null, system: null, calls: [], forms: [] };
const log = name => {state.calls.push(name);};
let id = 10;
const uuid = () => `00000000-0000-4000-8000-${String(++id).padStart(12,'0')}`;
const sectionTypes = ['organization_intro','organization_about','custom_content','organization_contact'];
const variants=sectionTypes.map(sectionType=>({sectionType,status:'published',visibility:'public',versionId:uuid()}));
const app = {
 '../../services/api': {
  apiTenantPost: async (endpoint) => {log(endpoint);const form={id:uuid()};state.forms.push(form);return form;},
  apiRequest: async (endpoint, input) => {log(endpoint);assert.equal(input.method,'PUT');const p=JSON.parse(input.body);assert.equal(p.enabled,false);assert.ok(p.targetModuleId);assert.ok(Object.keys(p.bindings).length);return {};},
 },
 '../../services/organizationStorage':{getStoredActiveOrganizationId:()=> 'ORG_ONE'},
 '../operational/operationalService': {
  createOperationalSystem: async (name,description) => {log('createSystem');state.system={id:uuid(),name,description,status:'draft',version:1,brandSiteId:null,modules:[]};return state.system;},
  getOperationalSystem:async ()=>state.system,
  installOperationalModule:async (_,blueprintKey)=>{log('installModule');state.system.modules.push({id:uuid(),name:'Módulo',blueprintKey,fields:[],schemaVersion:1});return state.system;},
  updateOperationalModule:async (_,old,changes)=>{log('updateModule');const ref=state.system.modules.find(m=>m.id===old.id);Object.assign(ref,changes);ref.schemaVersion++;return state.system;},
  getOperationalPlan:async ()=>({systemId:state.system.id,intent:'',needs:[],steps:[],revision:0}),
  updateOperationalPlan:async ()=>({}),
  setOperationalBrandSite:async (system,siteId)=>{log('linkDrafts');system.brandSiteId=siteId;return system;},
 },
 '../../services/institutionalService':{
  createInstitutionalSite:async ({name,templateId})=>{log('createSite');assert.ok(templateId);state.site={id:uuid(),name,brand:{logoAssetId:null,primaryColor:'#222222',secondaryColor:'#333333',accentColor:'#444444',backgroundColor:'#ffffff',textColor:'#111111',headingFont:'system',bodyFont:'system'},pages:[{id:uuid(),slug:'inicio',sections:[]}]};return state.site;},
  createInstitutionalPage:async (_,page)=>{log('createPage');state.site.pages.push({id:uuid(),...page,sections:[]});return state.site;},
  getInstitutionalSite:async ()=>state.site,
  uploadInstitutionalMedia:async ()=>{log('uploadLogo');return {id:uuid()};},
  updateInstitutionalSiteBrand:async (_,data)=>{log('updateBrand');Object.assign(state.site.brand,data);return state.site.brand;},
  getInstitutionalTemplates:async ()=>[{id:uuid(),name:'Acolher',isExample:false}],
  getInstitutionalVariants:async ()=>variants,
  addInstitutionalSection:async (pageId,data)=>{log('addSection');const page=state.site.pages.find(p=>p.id===pageId);page.sections.push({id:uuid(),sectionType:data.sectionType,content:data.content,settings:data.settings,layout:{type:'stack',gap:'medium',children:[]}});return state.site;},
  updateInstitutionalSection:async (sectionId,data)=>{log('updateSection');const section=state.site.pages.flatMap(p=>p.sections).find(s=>s.id===sectionId);Object.assign(section,data);return state.site;},
 },
 '../../data/institutional/sectionCatalog':{createDefaultSectionContent:()=>({title:'',description:''})},
};
const sourcePath=path.resolve(__dirname,'../src/features/aiBuilder/aiBuilder.ts');
const js=ts.transpileModule(fs.readFileSync(sourcePath,'utf8'),{fileName:sourcePath,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const fakeModule={exports:{}};
vm.runInNewContext(js,{module:fakeModule,exports:fakeModule.exports,require:(name)=>{if(!app[name])throw new Error(`Missing stub ${name}`);return app[name];},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},crypto:require('node:crypto').webcrypto,console,Map,Set,Date,JSON,Promise,Error,String,Array,Object,RegExp},{filename:sourcePath});
const builder=fakeModule.exports;
const field=(key,type='text')=>({key,label:key,type,required:true,help:'',options:type==='select'?['P','M']:[]});
const donation={alias:'doacoes',blueprint_key:'donations',name:'Doações',description:'Entrada',fields:[field('item'),field('quantidade','number')]};
const duplicated={alias:'doacoes_1',blueprint_key:'donations',name:'Registro de doações',description:'Duplicado',fields:[field('item'),field('quantidade','number')]};
const volunteer={alias:'voluntarios',blueprint_key:'volunteers',name:'Voluntários',description:'Equipe',fields:[field('nome')]};
assert.equal(builder.dedupeModules([donation,duplicated,volunteer]).length,2,'Doações semanticamente repetidas are merged');
assert.equal(builder.functionalKey({name:'Estoque de roupas',alias:'estoque',blueprint_key:'custom'}),'inventory');
const plan={system:{name:'Sistema Teste',description:'Controlar doações e voluntários.',modules:[donation,duplicated,volunteer],workflow:[]},site:{name:'Site Teste',audience:'Público',style:'Acolhedor',pages:[{title:'Início',slug:'inicio',sections:[{type:'hero',title:'Teste',text:'Ajudamos famílias',action_label:'Doar',linked_module_alias:''}]}]},connection:{link_system:true,public_forms:[]},limitations:[],confirmations:[]};
(async()=>{
 const a=await builder.buildAiDraft({plan,sessionId:'SESSION_A',look:'human',turns:['Quero um site para receber doações de roupas e voluntários'],report:()=>{}});
 assert.equal(a.modules,2); assert.ok(a.record.siteId);assert.ok(a.record.systemId);assert.equal(a.forms,2);
 assert.ok(state.calls.includes('linkDrafts'));assert.ok(state.calls.some(c=>c.includes('/forms/')),'forms use native API');
 assert.ok(state.calls.includes('updateSection'),'native section receives actual cong_form layout override');
 assert.equal(state.site.publishedAt,undefined,'site remains unpublished');
 const before=state.calls.length;
 const b=await builder.buildAiDraft({plan,sessionId:'SESSION_A',look:'human',turns:['Quero um site para receber doações de roupas e voluntários'],report:()=>{}});
 assert.equal(state.calls.length,before,'repeat does not duplicate resources');assert.equal(JSON.stringify(b.record.formIds),JSON.stringify(a.record.formIds));
 const revised={...plan,system:{...plan.system,modules:[...plan.system.modules,{alias:'estoque',blueprint_key:'inventory',name:'Estoque de roupas',description:'Separar tamanhos',fields:[field('tamanho')]}]}};
 const c=await builder.buildAiDraft({plan:revised,sessionId:'SESSION_A',look:'human',turns:['Quero um site para receber doações de roupas e voluntários'],report:()=>{}});
 assert.equal(c.modules,3);assert.equal(c.record.systemId,a.record.systemId,'same system is updated');assert.equal(c.record.siteId,a.record.siteId,'same site is updated');
 const palette=builder.SITE_PALETTES.find(p=>p.id==='oceano');
 const logoFile={name:'identidade.png',size:1024,lastModified:1234,type:'image/png'};
 const d=await builder.buildAiDraft({plan:revised,sessionId:'SESSION_A',look:'human',palette,logoFile,
   turns:['Quero um site para receber doações de roupas e voluntários'],report:()=>{}});
 assert.ok(d.record.siteId);assert.equal(state.site.brand.primaryColor,palette.primary);
 assert.equal(state.site.brand.secondaryColor,palette.secondary);
 assert.equal(state.site.brand.backgroundColor,palette.background);
 assert.equal(state.site.brand.textColor,palette.text);
 assert.equal(state.site.brand.logoAssetId,d.record.logoAssetId);
 assert.equal(state.calls.filter(c=>c==='uploadLogo').length,1);
 const afterBrand=state.calls.length;
 await builder.buildAiDraft({plan:revised,sessionId:'SESSION_A',look:'human',palette,logoFile,
   turns:['Quero um site para receber doações de roupas e voluntários'],report:()=>{}});
 assert.equal(state.calls.length,afterBrand,'repeat brand application must not duplicate uploads or resources');
 console.log('PASS semantic module dedupe');
 console.log('PASS real draft creation + disabled mapped forms');
 console.log('PASS native site sections and site/system draft association');
 console.log('PASS idempotent retry and incremental revision');
 console.log('PASS real brand palette and logo persistence');
})().catch(e=>{console.error(e);process.exitCode=1});
