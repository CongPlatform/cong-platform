export type Run = {id:string;sequence_number:1|2;version:'A'|'B';condition:'sem_ia'|'com_ia';status:'assigned'|'running'|'submitted';started_at:string|null;submitted_at:string|null;participant_code:string;group_code:string;cohort:string;reused_scenario?:boolean;family:string;scenario_code:string;ngo:string;prompt:string;reported_completed:boolean|null;difficulty:number|null;confidence:number|null};
export type State={participantCode:string;status:'active'|'completed'|'withdrawn';runs:Run[]};
export type ObserverRun=Run & {observer_help_count:number;observer_error_count:number;observer_criteria:boolean[]|null;observer_notes:string|null;technical_issue:boolean;is_simulation?:boolean;rubric:string};
export async function study<T>(path:string,body?:unknown):Promise<T>{
 const r=await fetch(`/api/study${path}`,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await r.json().catch(()=>({error:'Resposta inválida do servidor'}));
 if(!r.ok)throw new Error(data.error||`Erro ${r.status}`);return data as T;
}
