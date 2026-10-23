import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let ts;
try { ts=require('typescript'); }
catch { ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js'); }

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cong-ai-patch-'));
const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'backend/src/modules/ai');
const files=['ai.coverage','ai.intent','ai.routes','ai.contract','ai.prompt'];
for(const f of files){
 let code=fs.readFileSync(path.join(source,f+'.ts'),'utf8');
 const res=ts.transpileModule(code,{fileName:f+'.ts',reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 assert.equal(res.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length||0,0,f+' TS transpile failed');
 // local unit imports only
 if(['ai.coverage','ai.intent'].includes(f))fs.writeFileSync(path.join(dir,f+'.mjs'),res.outputText.replaceAll('./ai.coverage.js','./ai.coverage.mjs'));
}
const {auditAiPlan}=await import('file://'+dir+'/ai.coverage.mjs');
const {intentWithoutGeneration,explainProposal}=await import('file://'+dir+'/ai.intent.mjs');
const text='Sou da ONG Vestindo Esperança, usamos WhatsApp e planilhas e precisamos de um site para solicitar roupas, oferecer doações e cadastrar voluntários. Também quero estoque, beneficiários, doações, campanhas e entregas no sistema, com formulários conectados.';
const turns=[{role:'usuario',text}];
const bare={system:{modules:[{alias:'donations',blueprint_key:'donations',name:'Doações'},{alias:'doacoes_1',blueprint_key:'donations',name:'Doações recebidas'},{alias:'estoque',blueprint_key:'inventory',name:'Estoque'},{alias:'beneficiarios',blueprint_key:'custom',name:'Beneficiários'},{alias:'entregas',blueprint_key:'custom',name:'Entregas'},{alias:'voluntarios',blueprint_key:'volunteers',name:'Voluntários'}]},site:{pages:[{title:'Início',slug:'inicio',sections:[]}]},connection:{link_system:true,public_forms:[]},limitations:[]};
const actual=auditAiPlan('both',turns,bare);
for(const needed of ['form_clothing','form_volunteers','form_donations','campaigns','possible_duplicates'])assert(actual.some(i=>i.code===needed),'missing: '+needed);
console.log('PASS - oferta de doações, pedidos, voluntários, campanhas e duplicações são identificados');
const complete=structuredClone(bare);
complete.system.modules=complete.system.modules.filter(m=>m.alias!=='doacoes_1');
complete.system.modules.push({alias:'campanhas',name:'Campanhas',blueprint_key:'events'});
const mappings=[['f_pedido','Beneficiários','beneficiarios'],['f_voluntario','Voluntários','voluntarios'],['f_doacao','Doações','donations']];
complete.system.modules.push(...mappings.map(([alias])=>({alias,blueprint_key:'forms',name:'Formulário'})));
complete.connection.public_forms=mappings.map(([alias,name,target])=>({name,page_slug:'inicio',form_module_alias:alias,target_module_alias:target,fields:[{key:'nome',type:'text'}],bindings:[{form_field_key:'nome',module_field_key:'nome'}]}));
complete.site.pages[0].sections=mappings.map(([alias])=>({type:'form',linked_module_alias:alias}));
const results=auditAiPlan('both',turns,complete);
assert.equal(results.length,0,JSON.stringify(results));
console.log('PASS - três formulários com vínculos presentes removem pendências conhecidas');
const noChange=['não','Não obrigado','sem alterações','deixa assim','por enquanto não'];
for(const x of noChange)assert.equal(intentWithoutGeneration(x),'decline',x);
for(const x of ['não entendi','mal da para entender nesse formato, então não','explica melhor'])assert.equal(intentWithoutGeneration(x),'explain',x);
for(const x of ['não temos estoque, crie um','não, preciso de voluntários','corrija os nomes'])assert.equal(intentWithoutGeneration(x),null,x);
assert(explainProposal(complete).includes('No sistema interno'));
console.log('PASS - não gerar nova proposta para recusa/dúvida; pedidos de mudança seguem para worker');
const pasted='/mnt/data/Texto colado(20261023-044726).txt';
if(fs.existsSync(pasted)){
 const raw=fs.readFileSync(pasted,'utf8');
 const start=raw.indexOf('=== JSON COMPLETO ===');
 if(start>=0){
  let data=raw.slice(start+'=== JSON COMPLETO ==='.length).trimStart(),depth=0,inString=false,esc=false,end=-1;
  for(let i=0;i<data.length;i++){const c=data[i];if(inString){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')inString=false;}else if(c==='"')inString=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break}}
  const parsed=JSON.parse(data.slice(0,end));
  const issues=auditAiPlan('both',turns,parsed.proposal.plan);
  assert(issues.some(x=>x.code==='form_clothing'));
  console.log('PASS - reproduz falsa aprovação da sessão real: formulário ausente marcado pendente');
 }
}
// Validate all modified .tsx parsing without bringing npm dependencies.
const reactFile=fs.readFileSync(path.join(root,'src/pages/logged-in/aiAssistant/AiAssistant.tsx'),'utf8');
const transformed=ts.transpileModule(reactFile,{fileName:'AiAssistant.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
assert.equal(transformed.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length||0,0);
console.log('PASS - frontend TSX parses');
fs.rmSync(dir,{recursive:true,force:true});
