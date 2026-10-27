const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const text = fs.readFileSync(path.join(__dirname,'../src/study-overlay/StudyPortal.tsx'),'utf8');

test('camada carrega sessao quando existe marcador do participante mesmo sem flag VITE',()=>{
  assert.match(text,/cong:study-workspace-participant/);
  assert.match(text,/const hasWorkspaceMarker=/);
  assert.match(text,/!hasWorkspaceMarker && !isEditor/);
  assert.match(text,/study<State>\('\/me'\)/);
});
test('falha na recuperacao nao pode ocultar silenciosamente a camada',()=>{
  assert.match(text,/setSessionIssue\(hasWorkspaceMarker\)/);
  assert.match(text,/Sessão experimental não encontrada/);
  assert.match(text,/Tentar retomar a pesquisa/);
});
test('mantem painel flutuante recolhivel, cronometro e link de conclusao',()=>{
  assert.match(text,/aria-label="Camada flutuante e permanente da pesquisa"/);
  assert.match(text,/setCollapsed/);
  assert.match(text,/clock\(active.started_at\)/);
  assert.match(text,/to="\/pesquisa\/entrar">Registrar conclusão/);
});
test('preserva acesso individual e guarda de sessao da conta CONG',()=>{
  assert.match(text,/study<\{accessToken:string;refreshToken:string;organizationId:string;participantCode:string\}>\('\/workspace\/access'/);
  assert.match(text,/await establishSession\(credentials.accessToken,credentials.refreshToken,false\)/);
  assert.match(text,/storeActiveOrganizationId\(credentials.organizationId\)/);
  assert.match(text,/marker!==state\?\.participantCode/);
});
