const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const study=read('backend/src/study-overlay/routes.ts');
const auth=read('backend/src/middlewares/authenticate.ts');
const ai=read('backend/src/modules/ai/ai.routes.ts');
const portal=read('src/study-overlay/StudyPortal.tsx');
const migration=read('backend/supabase/migrations/20261027054500_study_overlay_workspaces.sql');
test('conta isolada por participante e nenhuma senha persistida',()=>{
 assert.match(migration,/participant_id uuid PRIMARY KEY/);
 assert.match(migration,/auth_user_id uuid NOT NULL UNIQUE/);
 assert.match(migration,/organization_id uuid NOT NULL UNIQUE/);
 assert.match(study,/FOR UPDATE/);
 assert.match(study,/auth.admin.createUser/);
 assert.match(study,/public.organization_users/);
 assert.match(study,/organization_admin/);
 assert.doesNotMatch(study,/INSERT INTO public.study_overlay_workspaces\([^)]*password/i);
});
test('ambiente depende da sessao valida, flag e autentica separadamente',()=>{
 assert.match(study,/router.post\('\/workspace\/access',checkParticipant/);
 assert.match(study,/STUDY_WORKSPACES_ENABLED/);
 assert.match(study,/session_expires_at>now\(\) FOR UPDATE/);
 assert.match(auth,/STUDY_SESSION_EXPIRED/);
 assert.match(auth,/study_overlay_workspaces/);
});
test('IA nao depende de cookie para bloquear condicao sem IA',()=>{
 assert.match(ai,/study_overlay_workspaces/);
 assert.match(ai,/w.auth_user_id=\$1/);
 assert.match(ai,/condition!=='com_ia'/);
 assert.match(ai,/STUDY_AI_DISABLED/);
});
test('encaminhamento para o editor com conta individual preservando camada',()=>{
 assert.match(portal,/establishSession\(credentials.accessToken,credentials.refreshToken,false\)/);
 assert.match(portal,/storeActiveOrganizationId/);
 assert.match(portal,/await study\(`\/run\/\$\{current.sequence_number\}\/start`/);
 assert.match(portal,/condition==='com_ia'/);
 assert.match(portal,/export function StudyDock/);
});
test('reset inativa somente organizacoes de laboratorio',()=>{
 assert.match(study,/settings->>'studyExperiment'='true'/);
 assert.match(study,/DELETE FROM public.study_overlay_workspaces/);
 assert.match(study,/UPDATE public.organizations SET active=false/);
 assert.match(auth,/cong_study_workspace===true/);
 assert.match(study,/pendingAuthCleanup/);
});
