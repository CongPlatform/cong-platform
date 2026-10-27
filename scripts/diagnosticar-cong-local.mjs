// Somente leitura. Verifica se npm run dev está conectado ao backend LOCAL e não ao servidor público.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root=process.cwd();
const lines=[];
function getKey(filename,key){const path=resolve(root,filename);if(!existsSync(path))return null;const text=readFileSync(path,'utf8');return [...text.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/gm)].filter(m=>m[1]===key).at(-1)?.[2]?.trim().replace(/^['"]|['"]$/g,'')??null}
const configured=['.env','.env.local','.env.development','.env.development.local'].map(f=>({file:f,value:getKey(f,'VITE_API_URL')})).filter(x=>x.value);
const active=configured.at(-1);
if(active && active.value!=='/api'){
 lines.push('ATENÇÃO: '+active.file+' define VITE_API_URL diferente de /api. Isso pode enviar requisições do navegador para o ambiente hospedado.');
}
async function probe(url,label){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(4500),redirect:'manual'});const type=r.headers.get('content-type')||'';const text=(await r.text()).slice(0,170);
  if(!type.includes('application/json')){lines.push('ERRO '+label+': respondeu '+r.status+' '+(type||'sem MIME')+' em vez de JSON. Talvez o frontend esteja devolvendo HTML de fallback.');return false;}
  const v=JSON.parse(text);if(label==='API backend' && v.status!=='ok')lines.push('ATENÇÃO: backend não confirmou status=ok.');
  lines.push('OK '+label+' · HTTP '+r.status);return true;
 }catch(e){lines.push('ERRO '+label+': '+(e?.message||'não disponível'));return false}
}
const backend=await probe('http://127.0.0.1:3000/api/health','API backend');
const frontend=await probe('http://127.0.0.1:5173/api/health','Proxy Vite /api');
console.log('\nCONG · diagnóstico do ambiente local\n'+lines.join('\n'));
console.log('\nTeste usando npm run dev no CMD. Use banco de teste e agente configurado para a mesma API de desenvolvimento.');
if(!backend||!frontend||active&&active.value!=='/api')process.exitCode=1;
