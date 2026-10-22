import pool from "../../config/database.js";
import { AppError } from "../../utils/app-error.js";
import type { PoolClient } from "pg";
import {validateReservationRange as validReservationRange} from "./operational.reservation-rules.js";

const missing = () => new AppError("Recurso não encontrado neste sistema.",404,"OPERATIONAL_RESOURCE_NOT_FOUND");

async function requirePiece(client:PoolClient,org:string,systemId:string,moduleId:string,key:"messages"|"reservations") {
  const result=await client.query("select 1 from public.operational_modules where organization_id=$1 and system_id=$2 and id=$3 and blueprint_key=$4",[org,systemId,moduleId,key]);
  if(!result.rowCount)throw missing();
}

export async function listChannels(org:string,systemId:string,moduleId:string) {
  const client=await pool.connect();
  try {
    await requirePiece(client,org,systemId,moduleId,"messages");
    const result=await client.query(`select id,name,created_at as "createdAt" from public.operational_message_channels where organization_id=$1 and system_id=$2 and module_id=$3 order by created_at asc limit 50`,[org,systemId,moduleId]);
    return result.rows;
  }finally{client.release();}
}

export async function addChannel(org:string,systemId:string,moduleId:string,actor:string,name:string) {
  const client=await pool.connect();
  try {
    await client.query("begin");
    await requirePiece(client,org,systemId,moduleId,"messages");
    const count=await client.query("select count(*)::int as total from public.operational_message_channels where organization_id=$1 and system_id=$2 and module_id=$3",[org,systemId,moduleId]);
    if(Number(count.rows[0]?.total)>=20)throw new AppError("Limite de canais atingido.",409,"CHANNEL_LIMIT");
    const result=await client.query(`insert into public.operational_message_channels(organization_id,system_id,module_id,name,created_by_auth_user_id) values($1,$2,$3,$4,$5) returning id,name,created_at as "createdAt"`,[org,systemId,moduleId,name,actor]);
    await client.query("commit");
    return result.rows[0];
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

async function requireChannel(client:PoolClient,org:string,systemId:string,moduleId:string,channelId:string){
  const check=await client.query("select 1 from public.operational_message_channels where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4",[org,systemId,moduleId,channelId]);
  if(!check.rowCount)throw missing();
}

export async function listMessages(org:string,systemId:string,moduleId:string,channelId:string,before:string|undefined) {
  const client=await pool.connect();
  try{
    await requirePiece(client,org,systemId,moduleId,"messages");
    await requireChannel(client,org,systemId,moduleId,channelId);
    const result=await client.query(`select m.id,m.body,m.created_at as "createdAt",m.author_auth_user_id as "authorId",coalesce(u.name,'Integrante') as "authorName" from public.operational_channel_messages m left join public.users u on u.auth_user_id=m.author_auth_user_id where m.organization_id=$1 and m.system_id=$2 and m.module_id=$3 and m.channel_id=$4 and ($5::timestamptz is null or m.created_at < $5::timestamptz) order by m.created_at desc,m.id desc limit 80`,[org,systemId,moduleId,channelId,before??null]);
    return result.rows.reverse();
  }finally{client.release();}
}

export async function sendMessage(org:string,systemId:string,moduleId:string,channelId:string,actor:string,body:string){
  const client=await pool.connect();
  try{
    await client.query("begin");
    await requirePiece(client,org,systemId,moduleId,"messages");
    await requireChannel(client,org,systemId,moduleId,channelId);
    await client.query("select pg_advisory_xact_lock(hashtext($1),hashtext($2))",[org,actor]);
    const recent=await client.query("select 1 from public.operational_channel_messages where organization_id=$1 and system_id=$2 and author_auth_user_id=$3 and created_at > now() - interval '1 second' limit 1",[org,systemId,actor]);
    if(recent.rowCount)throw new AppError("Aguarde um instante antes de enviar outra mensagem.",429,"MESSAGE_RATE_LIMIT");
    const result=await client.query(`insert into public.operational_channel_messages(organization_id,system_id,module_id,channel_id,author_auth_user_id,body) values($1,$2,$3,$4,$5,$6) returning id`,[org,systemId,moduleId,channelId,actor,body]);
    await client.query("commit");
    const messages=await listMessages(org,systemId,moduleId,channelId,undefined);
    return messages.find(item=>item.id===result.rows[0]?.id)??null;
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function listResources(org:string,systemId:string,moduleId:string){
  const client=await pool.connect();
  try{
    await requirePiece(client,org,systemId,moduleId,"reservations");
    const rows=await client.query(`select id,name,description,active from public.operational_reservation_resources where organization_id=$1 and system_id=$2 and module_id=$3 order by name asc limit 200`,[org,systemId,moduleId]);
    return rows.rows;
  }finally{client.release();}
}

export async function addResource(org:string,systemId:string,moduleId:string,name:string,description:string){
  const client=await pool.connect();
  try{
    await client.query("begin");
    await requirePiece(client,org,systemId,moduleId,"reservations");
    const count=await client.query("select count(*)::int as total from public.operational_reservation_resources where organization_id=$1 and system_id=$2 and module_id=$3",[org,systemId,moduleId]);
    if(Number(count.rows[0]?.total)>=100)throw new AppError("Limite de recursos atingido.",409,"RESOURCES_LIMIT");
    const result=await client.query(`insert into public.operational_reservation_resources(organization_id,system_id,module_id,name,description) values($1,$2,$3,$4,$5) returning id,name,description,active`,[org,systemId,moduleId,name,description]);
    await client.query("commit");return result.rows[0];
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export function validateReservationRange(start:string,end:string){
  const begin=Date.parse(start),finish=Date.parse(end);
  if(!validReservationRange(start,end))throw new AppError("Escolha um intervalo válido de até 14 dias.",400,"INVALID_RESERVATION_RANGE");
  return {begin,finish};
}

export async function listReservations(org:string,systemId:string,moduleId:string,from:string,to:string,actor:string,owner:boolean){
  const client=await pool.connect();
  try{
    await requirePiece(client,org,systemId,moduleId,"reservations");
    const result=await client.query(`select b.id,b.resource_id as "resourceId",r.name as "resourceName",b.title,b.starts_at as "startsAt",b.ends_at as "endsAt",b.created_by_auth_user_id as "createdBy",(b.created_by_auth_user_id=$6::uuid or $7::boolean) as "canCancel",coalesce(u.name,'Integrante') as "createdByName" from public.operational_resource_reservations b join public.operational_reservation_resources r on r.id=b.resource_id left join public.users u on u.auth_user_id=b.created_by_auth_user_id where b.organization_id=$1 and b.system_id=$2 and b.module_id=$3 and b.cancelled_at is null and b.starts_at<$5::timestamptz and b.ends_at>$4::timestamptz order by b.starts_at limit 300`,[org,systemId,moduleId,from,to,actor,owner]);
    return result.rows;
  }finally{client.release();}
}

export async function bookResource(org:string,systemId:string,moduleId:string,actor:string,resourceId:string,title:string,start:string,end:string){
  validateReservationRange(start,end);
  const client=await pool.connect();
  try{
    await client.query("begin");
    await requirePiece(client,org,systemId,moduleId,"reservations");
    const resource=await client.query("select id from public.operational_reservation_resources where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4 and active=true for update",[org,systemId,moduleId,resourceId]);
    if(!resource.rowCount)throw missing();
    const conflict=await client.query("select 1 from public.operational_resource_reservations where organization_id=$1 and system_id=$2 and module_id=$3 and resource_id=$4 and cancelled_at is null and starts_at<$6::timestamptz and ends_at>$5::timestamptz limit 1",[org,systemId,moduleId,resourceId,start,end]);
    if(conflict.rowCount)throw new AppError("Este recurso já está reservado nesse horário.",409,"RESERVATION_CONFLICT");
    const result=await client.query(`insert into public.operational_resource_reservations(organization_id,system_id,module_id,resource_id,title,starts_at,ends_at,created_by_auth_user_id) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,[org,systemId,moduleId,resourceId,title,start,end,actor]);
    await client.query("commit");return result.rows[0];
  }catch(error){await client.query("rollback");throw error;}finally{client.release();}
}

export async function cancelReservation(org:string,systemId:string,moduleId:string,reservationId:string,actor:string,owner:boolean){
  const result=await pool.query(`update public.operational_resource_reservations set cancelled_at=now() where organization_id=$1 and system_id=$2 and module_id=$3 and id=$4 and cancelled_at is null and (created_by_auth_user_id=$5 or $6::boolean) returning id`,[org,systemId,moduleId,reservationId,actor,owner]);
  if(!result.rowCount)throw new AppError("Reserva indisponível ou você não tem autorização para cancelá-la.",403,"RESERVATION_CANCEL_DENIED");
}
