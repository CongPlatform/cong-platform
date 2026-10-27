const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const portal=fs.readFileSync('src/study-overlay/StudyPortal.tsx','utf8');
const observer=fs.readFileSync('src/study-overlay/StudyObserver.tsx','utf8');
const backend=fs.readFileSync('backend/src/study-overlay/routes.ts','utf8');
const css=fs.readFileSync('src/study-overlay/Study.module.css','utf8');
test('dock arrastavel, recolhivel e com persistencia',()=>{
 for(const token of ['onPointerDown={dragStart}','onPointerMove={dragMove}','clampPosition','cong:study-dock-position','onKeyDown={moveKey}','cong:study-dock-collapsed'])assert.ok(portal.includes(token),token);
});
test('avaliacao pos-tarefa nao possui escolhas pre-preenchidas',()=>{
 for(const token of ['completed:null as boolean|null','help:null as boolean|null','difficulty:0','confidence:0','!canFinishRun'])assert.ok(portal.includes(token),token);
});
test('questionario final versionado, grupos e escala sem valor padrao',()=>{
 for(const token of ['instrument_version:',"finalQuestions.slice(0,4)","finalQuestions.slice(4)","final[code]===String(n)",'answerCount<10'])assert.ok(portal.includes(token),token);
 assert.ok(backend.includes("'instrument_version'"));
});
test('dashboard usa apenas registros oficiais nos indicadores',()=>{
 for(const token of ['filter(r=>!r.is_simulation)','participantCount','durationsByCondition','observer_criteria','technical_issue'])assert.ok(observer.includes(token),token);
});
test('auditoria dos cenarios protegida e leitura apenas',()=>{
 assert.ok(backend.includes("router.get('/observer/scenarios',checkObserver"));
 assert.ok(backend.includes('SELECT scenario_code,family,ngo,prompt_a,prompt_b,rubric'));
 assert.ok(observer.includes('Revisão dos cenários experimentais'));
 assert.ok(observer.includes('confirmar suporte real na CONG'));
});
test('simulacao alterna roteiros e grupos',()=>{
 assert.ok(backend.includes('scenario.rows[(number-1)%scenario.rows.length]'));
 assert.ok(backend.includes("['G1','G2','G3','G4']"));
});
test('estilos contemplam drag e dashboard responsivo',()=>{
 for(const token of ['touch-action:none','.metrics','.analyticsGrid','.dockFinish','@media(max-width:620px)'])assert.ok(css.includes(token),token);
});
