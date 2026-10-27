/** No external requests or database writes: guards against breaking the experiment. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname,'..');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');

test('research admission remains signed and allocation remains transactional', () => {
  const code = read('backend/src/study-overlay/routes.ts');
  assert.match(code,/createHmac\('sha256',bridgeSecret\)/);
  assert.match(code,/pg_advisory_xact_lock\(26023, 6071\)/);
  assert.match(code,/source_participant_id/);
  assert.match(code,/session_hash/);
  assert.match(code,/runGroups/);
});

test('study mirror cookie is narrow, opaque and HttpOnly', () => {
  const code = read('backend/src/study-overlay/routes.ts');
  assert.match(code,/const AI_COOKIE='cong_study_ai_access'/);
  assert.match(code,/const aiCookieOptions=\{\.\.\.sessionCookieOptions,path:'\/api\/ai'\}/);
  assert.match(code,/httpOnly:true/);
  assert.match(code,/cookie\(AI_COOKIE,session,aiCookieOptions\)/);
  assert.match(code,/cookie\(AI_COOKIE,token,aiCookieOptions\)/);
});

test('backend blocks IA only for active research runs marked sem_ia', () => {
  const code = read('backend/src/modules/ai/ai.routes.ts');
  assert.match(code,/sessionRouter\.use\(enforceStudyCondition\)/);
  assert.match(code,/STUDY_ENABLED!=="true"/);
  assert.match(code,/study_overlay_participants p/);
  assert.match(code,/p\.session_hash=\$1/);
  assert.match(code,/r\.status='running'/);
  assert.match(code,/condition==="sem_ia"/);
  assert.match(code,/STUDY_AI_DISABLED/);
});

test('research portal never offers AI entry during sem_ia', () => {
  const code = read('src/study-overlay/StudyPortal.tsx');
  assert.match(code,/current\.condition==='com_ia'&&<Link/);
  assert.match(code,/to="\/app\/sistemas"/);
  assert.match(code,/to="\/app\/site-institucional"/);
  assert.match(code,/setForm\(\{\.\.\.empty\}\)/);
});

test('assistant verifies condition rather than relying on selected project mode', () => {
  const code = read('src/pages/logged-in/aiAssistant/AiAssistant.tsx');
  assert.match(code,/study<StudyState>\("\/me"\)/);
  assert.match(code,/run\.status === "running" && run\.condition === "sem_ia"/);
  assert.match(code,/if\(studyAiBlocked\)return/);
});

test('draft creation remains confirmation-gated and never publishes public forms', () => {
  const ui = read('src/pages/logged-in/aiAssistant/AiAssistant.tsx');
  const builder=read('src/features/aiBuilder/aiBuilder.ts');
  assert.match(ui,/if\(!sessionId \|\| !approved \|\| building/);
  assert.match(ui,/\{kind:"build"\}/);
  assert.match(ui,/await buildAiDraft\(/);
  assert.match(builder,/enabled:false/);
  assert.match(builder,/status!=="draft"/);
});

test('research overlay is registered, recording navigation/help and final questionnaire', () => {
  const api=read('backend/src/routes/index.ts');
  const code=read('backend/src/study-overlay/routes.ts');
  const portal=read('src/study-overlay/StudyPortal.tsx');
  assert.match(api,/router\.use\("\/api\/study", studyOverlayRouter\)/);
  assert.match(code,/observer_help/);
  assert.match(code,/help_request/);
  assert.match(portal,/questionário|Questionário/);
  assert.match(portal,/\/finish/);
});
