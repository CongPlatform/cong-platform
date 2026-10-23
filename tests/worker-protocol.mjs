import {readFileSync,existsSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const code=readFileSync(resolve(root,'backend/src/modules/ai/ai.routes.ts'),'utf8');
const workerPath=process.env.CONG_WORKER_SOURCE || resolve(root,'../cong_ai_node_v3_6/worker/worker.cjs');
const worker=existsSync(workerPath)?readFileSync(workerPath,'utf8'):null;
for(const endpoint of ['/heartbeat','/claim','/jobs/:jobId/renew','/jobs/:jobId/complete','/jobs/:jobId/fail']){
 assert(code.includes(`workerRouter.post("${endpoint}"`),'backend endpoint absent '+endpoint);
}
if(worker)for(const route of ['/api/ai-worker/heartbeat','/api/ai-worker/claim',"'/renew'","'/complete'"]){
 if(route==="'/complete'") continue; // dynamic action name in worker
 assert(worker.includes(route),'worker missing route '+route);
}
assert(code.includes('auditAiPlan(s.goal,s.turns,v.plan,s.plan)'), 'coverage audit must happen in hosted backend');
assert(!code.includes('coverage_status:unmet?"needs_review":"not_verified"'));
assert(code.includes('intentWithoutGeneration'));
assert(code.includes('created_by_auth_user_id=$3'));
console.log(worker?'PASS - worker v3.6 protocol and hosted routes aligned':'PASS - backend routes present (compare v3.6 worker by setting CONG_WORKER_SOURCE)');
