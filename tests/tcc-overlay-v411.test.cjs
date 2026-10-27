const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const route = fs.readFileSync(path.join(root,'backend/src/study-overlay/routes.ts'),'utf8');
const portal = fs.readFileSync(path.join(root,'src/study-overlay/StudyPortal.tsx'),'utf8');
const observer = fs.readFileSync(path.join(root,'src/study-overlay/StudyObserver.tsx'),'utf8');
const client = fs.readFileSync(path.join(root,'src/study-overlay/client.ts'),'utf8');
test('reset exige observador, autenticacao CONG e verificacao admin',()=>{
 assert.match(route,/router\.post\('\/observer\/reset',checkObserver,authenticate,checkResetAdmin/);
 assert.match(route,/res\.locals\.authUser\?\.email/);
 assert.match(route,/ackNoRecovery/);
 assert.match(route,/REINICIAR PESQUISA/);
});
test('simulacao so roda local com confirmacao explicita e observador',()=>{
 assert.match(route,/router\.post\('\/observer\/dev\/simulate',checkObserver,checkLocalSimulation/);
 assert.match(route,/STUDY_DEV_SIMULATION_DB_ACK/);
 assert.match(route,/NODE_ENV==='production'/);
 assert.match(route,/__simulation:'local'/);
});
test('CSV oficiais excluem simulacoes',()=>{
 const count=(route.match(/COALESCE\(p\.source_data->>'__simulation',''\)<>'local'/g)||[]).length;
 assert.equal(count,3);
});
test('camada acompanha editores e avisa ao tentar sair durante a tarefa',()=>{
 assert.match(portal,/export function StudyDock\(\)/);
 assert.match(portal,/beforeunload/g);
 assert.match(portal,/aria-label="Camada flutuante e permanente da pesquisa"/);
 assert.match(portal,/setCollapsed/);
 assert.match(portal,/aria-expanded/);
});
test('retomada segura no mesmo navegador',()=>{
 assert.match(route,/maxAge:72\*3600\*1000/);
 assert.match(route,/GREATEST\(session_expires_at/);
 assert.match(portal,/useSearchParams/);
});
test('interface permite limpar simulacoes e exige frase no reset',()=>{
 assert.match(observer,/Apagar somente simulações/);
 assert.match(observer,/REINICIAR PESQUISA/);
 assert.match(observer,/getStoredAuthToken/);
 assert.match(client,/is_simulation\?:boolean/);
});
