const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const portal=fs.readFileSync(path.join(root,'src/study-overlay/StudyPortal.tsx'),'utf8');
const css=fs.readFileSync(path.join(root,'src/study-overlay/Study.module.css'),'utf8');
test('iniciar abre editor autenticado de laboratorio, sem retornar a home',()=>{
 assert.match(portal,/useNavigate/);
 assert.match(portal,/navigate\(destination,\{replace:true\}\)/);
 assert.match(portal,/Entrar no editor da tarefa/);
});
test('janela realmente flutuante e recolhivel sem dispensar',()=>{
 assert.match(portal,/dockCollapsed/);
 assert.match(portal,/aria-expanded/);
 assert.match(portal,/Registrar conclus[aã]o da tarefa/);
 assert.match(css,/\.dock\{position:fixed;top:auto/);
 assert.match(css,/\.dockCollapsed \.dockBody\{display:none/);
});
test('acesso ao editor obtem tokens individuais pela sessao do estudo',()=>{
 assert.match(portal,/\/workspace\/access/);
 assert.match(portal,/establishSession/);
 assert.match(portal,/Este navegador está conectado a outra conta/);
});
test('conserva alerta de saida e sessoes pela API do estudo',()=>{
 assert.match(portal,/beforeunload/);
 assert.match(portal,/study<State>\('\/me'\)/);
 assert.match(portal,/study\(`\/run\/\$\{current.sequence_number\}\/start`/);
});
