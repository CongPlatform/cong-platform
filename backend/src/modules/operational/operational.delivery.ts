import {createHash} from "node:crypto";
import pool from "../../config/database.js";
import {AppError} from "../../utils/app-error.js";
import type {PoolClient} from "pg";
import {type AvailableMember,type Delivery} from "./operational.routing-logic.js";
import {proposeRoadDeliveries} from "./operational.road-routing.js";

const missing=()=>new AppError("Sistema indisponível nesta organização.",404,"OPERATIONAL_NOT_FOUND");
const invalid=()=>new AppError("Dados de planejamento alterados. Atualize a proposta antes de confirmar.",409,"DELIVERY_SNAPSHOT_CONFLICT");

async function assertSystem(client:PoolClient,org:string,id:string,lock=false){
  const result=await client.query(`select id from public.operational_systems where organization_id=$1 and id=$2 and status <> 'archived' ${lock?'for update':''}`,[org,id]);
  if(!result.rowCount)throw missing();
  const installed=await client.query("select 1 from public.operational_modules where organization_id=$1 and system_id=$2 and blueprint_key='delivery_routes' limit 1",[org,id]);
  if(!installed.rowCount)throw new AppError("Adicione a peça Planejamento de Entregas ao sistema.",409,"DELIVERY_MODULE_REQUIRED");
}
async function getData(client:PoolClient,org:string,systemId:string,day:string){
  const [d,a]=await Promise.all([
    client.query(`select id,recipient_label as label,address,latitude as lat,longitude as lon,status,revision,task_id as "taskId" from public.operational_delivery_demands where organization_id=$1 and system_id=$2 and service_day=$3 order by created_at,id limit 500`,[org,systemId,day]),
    client.query(`select a.member_user_id as "userId",u.name,a.capacity,a.start_latitude as lat,a.start_longitude as lon from public.operational_delivery_availability a join public.organization_users ou on ou.organization_id=a.organization_id and ou.user_id=a.member_user_id and ou.status='active' join public.users u on u.id=ou.user_id and u.active where a.organization_id=$1 and a.system_id=$2 and a.service_day=$3 and a.capacity>0 order by u.name,a.member_user_id limit 100`,[org,systemId,day]),
  ]);
  const demands=d.rows as (Delivery&{status:string;revision:number;taskId:string|null})[];
  const members=a.rows as AvailableMember[];
  return {demands,members};
}
const calculate=async(day:string,data:Awaited<ReturnType<typeof getData>>,routingEnabled:boolean)=>{
  const pending=data.demands.filter(d=>d.status==='pending').sort((a,b)=>a.id.localeCompare(b.id));
  const available=[...data.members].sort((a,b)=>a.userId.localeCompare(b.userId));
  const allocation=await proposeRoadDeliveries(pending,available,routingEnabled);
  const snapshotHash=createHash('sha256').update(JSON.stringify({day,pending,available,mode:allocation.routingMode,routes:allocation.routes,unassigned:allocation.unassigned})).digest('hex');
  return {snapshotHash,...allocation};
};
export async function getDeliveryBoard(org:string,systemId:string,day:string){
  const client=await pool.connect();
  try{
    await assertSystem(client,org,systemId);
    const data=await getData(client,org,systemId,day);
    const config=await client.query(`select external_routing_enabled as enabled from public.operational_systems where organization_id=$1 and id=$2`,[org,systemId]);
    const routingEnabled=Boolean(config.rows[0]?.enabled);
    return {...data,day,routingEnabled,providerConfigured:Boolean(process.env.OSRM_ROUTING_BASE_URL?.trim()),proposal:await calculate(day,data,routingEnabled)};
  }finally{client.release();}
}
export async function registerDemand(org:string,systemId:string,actor:string,input:{day:string;label:string;address:string;lat:number;lon:number}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assertSystem(client,org,systemId,true);
    const count=await client.query("select count(*)::int as total from public.operational_delivery_demands where organization_id=$1 and system_id=$2 and service_day=$3",[org,systemId,input.day]);
    if(Number(count.rows[0]?.total??0)>=200)throw new AppError('Limite de 200 destinos por dia.',409,'DELIVERY_LIMIT');
    const result=await client.query(`insert into public.operational_delivery_demands(organization_id,system_id,service_day,recipient_label,address,latitude,longitude,created_by_auth_user_id) values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,[org,systemId,input.day,input.label,input.address,input.lat,input.lon,actor]);
    await client.query('COMMIT');
    return result.rows[0];
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function cancelDemand(org:string,systemId:string,day:string,demandId:string,revision:number){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assertSystem(client,org,systemId,true);
    const updated=await client.query(`update public.operational_delivery_demands set status='cancelled',revision=revision+1 where organization_id=$1 and system_id=$2 and id=$3 and service_day=$4 and revision=$5 and status='pending' returning id`,[org,systemId,demandId,day,revision]);
    if(!updated.rowCount)throw new AppError('Pedido já alterado ou incluído em uma rota.',409,'DELIVERY_DEMAND_CONFLICT');
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function setAvailability(org:string,systemId:string,actor:string,input:{day:string;userId:string;capacity:number;lat:number;lon:number}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assertSystem(client,org,systemId,true);
    const member=await client.query("select 1 from public.organization_users ou join public.users u on u.id=ou.user_id where ou.organization_id=$1 and ou.user_id=$2 and ou.status='active' and u.active",[org,input.userId]);
    if(!member.rowCount)throw new AppError('Escolha um integrante ativo da organização.',400,'INVALID_DELIVERY_MEMBER');
    await client.query(`insert into public.operational_delivery_availability(organization_id,system_id,service_day,member_user_id,capacity,start_latitude,start_longitude,updated_by_auth_user_id) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(organization_id,system_id,service_day,member_user_id) do update set capacity=excluded.capacity,start_latitude=excluded.start_latitude,start_longitude=excluded.start_longitude,updated_by_auth_user_id=excluded.updated_by_auth_user_id,updated_at=now()`,[org,systemId,input.day,input.userId,input.capacity,input.lat,input.lon,actor]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function confirmDeliveryPlan(org:string,systemId:string,actor:string,day:string,hash:string){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assertSystem(client,org,systemId,true);
    const data=await getData(client,org,systemId,day);
    const setting=await client.query(`select external_routing_enabled as enabled from public.operational_systems where organization_id=$1 and id=$2`,[org,systemId]);
    const proposal=await calculate(day,data,Boolean(setting.rows[0]?.enabled));
    if(proposal.snapshotHash!==hash)throw invalid();
    const usable=proposal.routes.filter(route=>route.stops.length>0);
    const tasksCount=await client.query("select count(*)::int as count from public.operational_tasks where organization_id=$1 and system_id=$2 and archived_at is null",[org,systemId]);
    if(Number(tasksCount.rows[0]?.count??0)+usable.reduce((sum,route)=>sum+route.stops.length,0)>5000)throw new AppError('Limite de tarefas atingido neste sistema.',409,'TASK_LIMIT');
    if(!usable.length)throw new AppError('Nenhuma entrega pode ser atribuída com a disponibilidade atual.',409,'DELIVERY_NO_CAPACITY');
    const allStops:unknown[]=[];
    for(const route of usable){
      const stops=[];
      for(const stop of route.stops){
        const task=await client.query(`insert into public.operational_tasks(organization_id,system_id,title,notes,status,priority,due_on,assignee_user_id,created_by_auth_user_id) values($1,$2,$3,$4,'todo','normal',$5,$6,$7) returning id`,[org,systemId,`Entregar cesta — ${stop.label}`.slice(0,140),stop.address,day,route.userId,actor]);
        const taskId=task.rows[0]?.id as string;
        const updated=await client.query("update public.operational_delivery_demands set status='assigned',task_id=$4,revision=revision+1 where organization_id=$1 and system_id=$2 and id=$3 and status='pending' returning id",[org,systemId,stop.id,taskId]);
        if(!updated.rowCount)throw invalid();
        await client.query("insert into public.operational_task_events(organization_id,system_id,task_id,action,actor_auth_user_id) values($1,$2,$3,'created',$4)",[org,systemId,taskId,actor]);
        stops.push({...stop,taskId});
      }
      allStops.push({...route,stops});
    }
    const saved=await client.query("insert into public.operational_delivery_plans(organization_id,system_id,service_day,snapshot_hash,route_data,created_by_auth_user_id) values($1,$2,$3,$4,$5::jsonb,$6) returning id",[org,systemId,day,hash,JSON.stringify(allStops),actor]);
    await client.query('COMMIT');
    return {planId:saved.rows[0]?.id as string,assignedCount:usable.reduce((sum,r)=>sum+r.stops.length,0)};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function listConfirmedPlans(org:string,systemId:string,day:string){
  const result=await pool.query("select id,service_day as day,route_data as routes,created_at as createdAt from public.operational_delivery_plans where organization_id=$1 and system_id=$2 and service_day=$3 order by created_at desc limit 10",[org,systemId,day]);
  return result.rows;
}

async function assertAvailabilitySystem(client:PoolClient,org:string,systemId:string){
  const result=await client.query(`select 1 from public.operational_systems s join public.operational_modules m on m.organization_id=s.organization_id and m.system_id=s.id where s.organization_id=$1 and s.id=$2 and s.status <> 'archived' and m.blueprint_key in ('availability','delivery_routes') limit 1`,[org,systemId]);
  if(!result.rowCount)throw missing();
}
export async function listMyDeliveryWeek(org:string,systemId:string,actor:string,start:string){
  const client=await pool.connect();
  try{
    await assertAvailabilitySystem(client,org,systemId);
    const member=await client.query(`select u.id from public.users u join public.organization_users ou on ou.user_id=u.id and ou.organization_id=$1 and ou.status='active' where u.auth_user_id=$2 and u.active limit 1`,[org,actor]);
    if(!member.rowCount)throw missing();
    const rows=await client.query(`select to_char(service_day,'YYYY-MM-DD') as day,capacity,start_latitude as lat,start_longitude as lon from public.operational_delivery_availability where organization_id=$1 and system_id=$2 and member_user_id=$3 and service_day >= $4::date and service_day < ($4::date + interval '7 days') order by service_day`,[org,systemId,member.rows[0].id,start]);
    return rows.rows as {day:string;capacity:number;lat:number;lon:number}[];
  }finally{client.release();}
}
export async function getMyDeliveryAvailability(org:string,systemId:string,authUserId:string,day:string){
  const client=await pool.connect();
  try{
    await assertAvailabilitySystem(client,org,systemId);
    const result=await client.query(`select u.id as "userId",u.name,a.capacity,a.start_latitude as lat,a.start_longitude as lon
      from public.users u join public.organization_users ou on ou.user_id=u.id and ou.organization_id=$1 and ou.status='active'
      left join public.operational_delivery_availability a on a.organization_id=$1 and a.system_id=$2 and a.member_user_id=u.id and a.service_day=$4
      where u.auth_user_id=$3 and u.active limit 1`,[org,systemId,authUserId,day]);
    if(!result.rowCount)throw missing();
    return result.rows[0] as {userId:string;name:string;capacity:number|null;lat:number|null;lon:number|null};
  }finally{client.release();}
}
export async function setMyDeliveryAvailability(org:string,systemId:string,actor:string,input:{day:string;capacity:number;lat:number;lon:number}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assertAvailabilitySystem(client,org,systemId);
    const member=await client.query(`select u.id from public.users u join public.organization_users ou on ou.user_id=u.id and ou.organization_id=$1 and ou.status='active' where u.auth_user_id=$2 and u.active limit 1`,[org,actor]);
    if(!member.rowCount)throw missing();
    await client.query(`insert into public.operational_delivery_availability(organization_id,system_id,service_day,member_user_id,capacity,start_latitude,start_longitude,updated_by_auth_user_id)
      values($1,$2,$3,$4,$5,$6,$7,$8)
      on conflict(organization_id,system_id,service_day,member_user_id) do update set capacity=excluded.capacity,start_latitude=excluded.start_latitude,start_longitude=excluded.start_longitude,updated_by_auth_user_id=excluded.updated_by_auth_user_id,updated_at=now()`,[org,systemId,input.day,member.rows[0].id,input.capacity,input.lat,input.lon,actor]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function importModuleDeliveryDemands(org:string,systemId:string,actor:string,input:{day:string;moduleId:string;labelField:string;addressField:string;latitudeField:string;longitudeField:string}){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assertSystem(client,org,systemId,true);
    const module=await client.query(`select schema_fields from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3 and blueprint_key not in ('agenda','board','dispatch','delivery_routes') for share`,[org,systemId,input.moduleId]);
    if(!module.rowCount)throw new AppError('Escolha uma peça de registros deste sistema.',400,'DELIVERY_IMPORT_MODULE');
    const fields=module.rows[0].schema_fields as {key:string;type:string}[];
    const byKey=(key:string)=>fields.find(field=>field.key===key);
    if(!['labelField','addressField','latitudeField','longitudeField'].every(field=>Boolean(byKey(input[field as keyof typeof input] as string))))throw new AppError('Um dos campos escolhidos não pertence à peça.',400,'DELIVERY_IMPORT_FIELDS');
    const count=await client.query('select count(*)::int as total from public.operational_delivery_demands where organization_id=$1 and system_id=$2 and service_day=$3',[org,systemId,input.day]);
    if(Number(count.rows[0]?.total??0)>=200)throw new AppError('Limite de 200 destinos por dia.',409,'DELIVERY_LIMIT');
    const records=await client.query(`select id,data from public.operational_records where organization_id=$1 and system_id=$2 and module_id=$3 and archived_at is null order by created_at desc,id desc limit 200`,[org,systemId,input.moduleId]);
    let imported=0,skipped=0;
    for(const record of records.rows){
      if(Number(count.rows[0]?.total??0)+imported>=200){skipped++;continue;}
      const data=record.data as Record<string,unknown>;
      const label=String(data[input.labelField]??'').trim();
      const address=String(data[input.addressField]??'').trim();
      const lat=Number(data[input.latitudeField]);
      const lon=Number(data[input.longitudeField]);
      if(label.length<2||label.length>100||address.length<5||address.length>300||data[input.latitudeField]==null||data[input.longitudeField]==null||String(data[input.latitudeField]).trim()===''||String(data[input.longitudeField]).trim()===''||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){skipped++;continue;}
      const result=await client.query(`insert into public.operational_delivery_demands(organization_id,system_id,service_day,recipient_label,address,latitude,longitude,created_by_auth_user_id,source_module_id,source_record_id)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict do nothing returning id`,[org,systemId,input.day,label,address,lat,lon,actor,input.moduleId,record.id]);
      if(result.rowCount)imported++;else skipped++;
    }
    await client.query('COMMIT');
    return {imported,skipped};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function setDeliveryRoutingPreference(org:string,systemId:string,actor:string,enabled:boolean){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await assertSystem(client,org,systemId,true);
    await client.query('update public.operational_systems set external_routing_enabled=$3 where organization_id=$1 and id=$2',[org,systemId,enabled]);
    await client.query(`insert into public.operational_events(organization_id,system_id,action,actor_auth_user_id) values($1,$2,$3,$4)`,[org,systemId,enabled?'delivery.routing_enabled':'delivery.routing_disabled',actor]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
