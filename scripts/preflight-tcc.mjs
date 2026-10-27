#!/usr/bin/env node
/** Safe, READ-ONLY preflight: no credentials, participant writes or migrations. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const args=new Set(process.argv.slice(2));
const mode=args.has('--public')?'public':args.has('--local')?'local':'source';
let failures=0,warnings=0;
function result(kind,label,detail=''){
 console.log(`${kind==='fail'?'FALHA':kind==='warn'?'ATENÇÃO':'OK'} | ${label}${detail?` — ${detail}`:''}`);
 if(kind==='fail')failures++;if(kind==='warn')warnings++;
}
const read=(path)=>{try{return readFileSync(resolve(root,path),'utf8');}catch{return '';}};
function config(path,name){
 const value=read(path).match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`,'m'))?.[1]?.trim().replace(/^['"]|['"]$/g,'');
 return value===undefined?'ausente':value==='true'?'true':value==='false'?'false':'definido (não exibido)';
}
console.log('\nCONG — PRÉ-VOO DA PESQUISA (somente leitura)');
console.log(`Modo: ${mode}\n`);
const files=['backend/src/study-overlay/routes.ts','src/study-overlay/StudyPortal.tsx','src/study-overlay/client.ts','backend/src/modules/ai/ai.routes.ts','src/features/aiBuilder/aiBuilder.ts'];
for(const p of files) result(existsSync(resolve(root,p))?'ok':'fail',`Arquivo ${p}`);
if(!read('backend/src/modules/ai/ai.routes.ts').includes('STUDY_AI_DISABLED'))result('fail','Bloqueio de IA na condição sem IA ausente');
else result('ok','Bloqueio de IA presente no backend');
if(config('backend/.env','STUDY_ENABLED')!=='true')result('warn','Backend: STUDY_ENABLED',`valor: ${config('backend/.env','STUDY_ENABLED')} (confira hospedagem separadamente)`);
if(config('.env','VITE_STUDY_ENABLED')!=='true')result('warn','Frontend: VITE_STUDY_ENABLED',`valor: ${config('.env','VITE_STUDY_ENABLED')} (confira hospedagem separadamente)`);
const csvs=['data/Sorteio_60_OFICIAL.csv','data/Roteiros_60_CONG_ATUAL.csv'];
for(const p of csvs)result(existsSync(resolve(root,p))?'ok':'warn',`CSV oficial ${p}`,existsSync(resolve(root,p))?'':'necessário para validar a alocação oficial; NÃO invente dados');

async function probe(base,path,{expected=[],allowHtml=false}={}){
 const target=new URL(path,base);try{
  const r=await fetch(target,{redirect:'follow',signal:AbortSignal.timeout(9000),headers:{'Accept':'application/json, text/html;q=0.9'}});
  const type=r.headers.get('content-type')||'';
  const body=(await r.text()).slice(0,220);
  if(expected.length&&!expected.includes(r.status)){
   result('fail',`${target} (${r.status})`,`esperado ${expected.join('/')}; tipo ${type}`);return;
  }
  if(path.startsWith('/api/')&&(type.includes('text/html')||body.toLowerCase().includes('<!doctype html'))){
   result('fail',`${target}`, 'API respondeu HTML: provavelmente redirecionamento/fallback incorreto');return;
  }
  if(!allowHtml&&!type.includes('json')&&expected.length)result('warn',`${target} (${r.status})`,`tipo inesperado ${type}`);
  else result('ok',`${target} (${r.status})`,type);
 }catch(e){result('warn',`${target}`,`não acessível: ${e?.cause?.code||e.message}`);}
}
if(mode==='public'){
 await probe('https://teste.cong.com.br','/',{expected:[200],allowHtml:true});
 await probe('https://cong.com.br','/pesquisa/entrar',{expected:[200],allowHtml:true});
 await probe('https://cong.com.br','/api/study/me',{expected:[401]});
 await probe('https://cong.com.br','/api/ai/status',{expected:[401,403,503]});
 await probe('https://cong.com.br','/assets/__cong_preflight_missing__.js',{expected:[404],allowHtml:true});
}
if(mode==='local'){
 await probe('http://127.0.0.1:5173','/',{expected:[200],allowHtml:true});
 await probe('http://127.0.0.1:5173','/api/study/me',{expected:[401]});
 await probe('http://127.0.0.1:5173','/api/ai/status',{expected:[401,403,503]});
}
console.log(`\nResumo: ${failures} falha(s), ${warnings} alerta(s).`);
console.log('Importante: este teste NÃO cria participante, não testa banco/Ollama e NÃO substitui um piloto com consentimento.');
process.exitCode=failures?1:0;
