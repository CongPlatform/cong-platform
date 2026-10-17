import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import pool from "../config/database.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";
import { getAvatarPublicUrl } from "./avatar.service.js";
import { roleHasPermission } from "./authorization.service.js";
import type { OrganizationContext } from "./organization.service.js";

export type MessageContext = { scope: "global" } | { scope: "organization"; organization: OrganizationContext };
interface ModuleSettings { enabled: boolean; directMessagesEnabled: boolean; readReceiptsEnabled: boolean }
const defaults: ModuleSettings = { enabled: false, directMessagesEnabled: true, readReceiptsEnabled: true };
const orgId = (ctx: MessageContext) => ctx.scope === "organization" ? ctx.organization.organizationId : null;
const bucket = "cong-chat-files";
const permittedPreviewMimes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav", "video/webm", "video/mp4"]);

export async function getMessageViewer(authId: string) {
  const found = await pool.query<{id:string}>("select id from public.users where auth_user_id=$1 and active=true", [authId]);
  if (!found.rows[0]) throw new AppError("Conta indisponível.",403,"MESSAGE_USER_INACTIVE");
  return found.rows[0];
}
async function settingsFor(ctx: MessageContext): Promise<ModuleSettings> {
  if (ctx.scope === "global") return {enabled:true,directMessagesEnabled:true,readReceiptsEnabled:true};
  const result = await pool.query<{enabled:boolean;directMessagesEnabled:boolean;readReceiptsEnabled:boolean}>(
    `select enabled,direct_messages_enabled as "directMessagesEnabled",read_receipts_enabled as "readReceiptsEnabled" from public.message_module_settings where organization_id=$1`,[orgId(ctx)]);
  return result.rows[0] ?? defaults;
}
export async function getMessageModuleSettings(org: OrganizationContext) {
  const ctx: MessageContext = {scope:"organization", organization:org};
  return {...await settingsFor(ctx), canManage: await roleHasPermission(org.roleId,"organization.manage")};
}
export async function updateMessageModuleSettings(org: OrganizationContext, changes: Partial<ModuleSettings>) {
  if (!await roleHasPermission(org.roleId,"organization.manage")) throw new AppError("Sem permissão.",403,"MESSAGE_MANAGE_FORBIDDEN");
  const next = {...await settingsFor({scope:"organization",organization:org}),...changes};
  await pool.query(`insert into public.message_module_settings(organization_id,enabled,direct_messages_enabled,read_receipts_enabled)
    values($1,$2,$3,$4) on conflict(organization_id) do update set enabled=excluded.enabled,
    direct_messages_enabled=excluded.direct_messages_enabled,read_receipts_enabled=excluded.read_receipts_enabled`,
    [org.organizationId,next.enabled,next.directMessagesEnabled,next.readReceiptsEnabled]);
  return {...next,canManage:true};
}
async function enabled(ctx: MessageContext) {
  if (ctx.scope === "organization" && !(await settingsFor(ctx)).enabled) throw new AppError("Módulo de mensagens desativado.",403,"MESSAGE_MODULE_DISABLED");
}
async function eligible(client: PoolClient, viewer: string, target: string, ctx: MessageContext) {
  if (target === viewer) throw new AppError("Você não pode adicionar a si mesmo.",400,"MESSAGE_SELF");
  const result = await client.query(`select 1 from public.users u where u.id=$1 and u.active
    and ($2::uuid is null or exists(select 1 from public.organization_users ou where ou.user_id=u.id and ou.organization_id=$2 and ou.status='active'))
    and not exists(select 1 from public.community_user_blocks b
      where (b.blocker_user_id=$1 and b.blocked_user_id=$3) or (b.blocker_user_id=$3 and b.blocked_user_id=$1))`,
    [target,orgId(ctx),viewer]);
  if (!result.rowCount) throw new AppError("Pessoa indisponível ou bloqueada.",403,"MESSAGE_RECIPIENT_FORBIDDEN");
}
async function assertMember(client: PoolClient, viewer: string, conversation: string, ctx: MessageContext) {
  const found = await client.query<{kind:"group"|"direct";role:"owner"|"admin"|"member";status:string;createdBy:string|null;title:string|null}>(
    `select c.kind,p.role,c.contact_status as status,c.created_by as "createdBy",c.title
     from public.message_conversations c join public.message_conversation_participants p on p.conversation_id=c.id
     where c.id=$1 and p.user_id=$2 and c.scope=$3 and c.organization_id is not distinct from $4::uuid
     and ($4::uuid is null or exists(select 1 from public.organization_users ou where ou.user_id=$2 and ou.organization_id=$4 and ou.status='active'))`,
    [conversation,viewer,ctx.scope,orgId(ctx)]);
  if (!found.rows[0]) throw new AppError("Conversa indisponível.",404,"MESSAGE_NOT_FOUND");
  return found.rows[0];
}
async function ensureNoBlockedPeers(client:PoolClient,viewer:string,conversation:string) {
  const found = await client.query(`select 1 from public.message_conversation_participants p
   join public.community_user_blocks b on (b.blocker_user_id=p.user_id and b.blocked_user_id=$1)
      or (b.blocked_user_id=p.user_id and b.blocker_user_id=$1)
   where p.conversation_id=$2 and p.user_id<>$1 limit 1`,[viewer,conversation]);
  if(found.rowCount) throw new AppError("Há um bloqueio entre participantes.",403,"MESSAGE_BLOCKED");
}
export async function findMessageRecipients(viewer:string,ctx:MessageContext,q:string) {
  await enabled(ctx); if(q.trim().length<2) return [];
  const rows = await pool.query<{id:string;name:string;username:string|null;avatarPath:string|null}>(
    `select u.id,u.name,u.username,u.avatar_path as "avatarPath" from public.users u
     where u.active and u.id<>$1 and (u.name ilike $2 or u.username ilike $2)
     and ($3::uuid is null or exists(select 1 from public.organization_users ou where ou.user_id=u.id and ou.organization_id=$3 and ou.status='active'))
     and not exists(select 1 from public.community_user_blocks b
       where (b.blocker_user_id=u.id and b.blocked_user_id=$1) or (b.blocked_user_id=u.id and b.blocker_user_id=$1))
     order by u.name limit 25`,[viewer,`%${q.trim().replace(/[\\%_]/g,"\\$&")}%`,orgId(ctx)]);
  return rows.rows.map(({avatarPath,...rest})=>({...rest,avatarUrl:getAvatarPublicUrl(avatarPath)}));
}
export async function startDirectConversation(viewer:string,target:string,ctx:MessageContext) {
  await enabled(ctx);
  if(ctx.scope==="organization" && !(await settingsFor(ctx)).directMessagesEnabled)
    throw new AppError("Conversas diretas desativadas neste ambiente.",403,"MESSAGE_DIRECT_DISABLED");
  const client=await pool.connect(); try {
    await client.query("begin"); await eligible(client,viewer,target,ctx);
    const pair=[viewer,target].sort().join(":");
    const found=await client.query<{id:string}>(`insert into public.message_conversations(scope,organization_id,kind,direct_pair_key,created_by,contact_status)
      values($1,$2,'direct',$3,$4,'pending') on conflict do nothing returning id`,[ctx.scope,orgId(ctx),pair,viewer]);
    let id=found.rows[0]?.id;
    if(!id){ const previous=await client.query<{id:string}>(`select id from public.message_conversations where scope=$1 and organization_id is not distinct from $2::uuid and direct_pair_key=$3`,[ctx.scope,orgId(ctx),pair]);id=previous.rows[0]?.id;}
    if(!id) throw new Error("Could not create conversation");
    await client.query(`insert into public.message_conversation_participants(conversation_id,user_id,role)
      values($1,$2,'member'),($1,$3,'member') on conflict do nothing`,[id,viewer,target]);
    await client.query("commit"); return {id};
  }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}
export async function createGroupConversation(viewer:string,title:string,targets:string[],ctx:MessageContext,description:string|null=null){
  await enabled(ctx); const ids=[...new Set(targets)].filter(id=>id!==viewer);
  if(ids.length<1||ids.length>49)throw new AppError("Escolha de 1 a 49 participantes.",400,"MESSAGE_GROUP_SIZE");
  const client=await pool.connect();try{
    await client.query("begin");
    for(const id of ids) await eligible(client,viewer,id,ctx);
    const created=await client.query<{id:string}>(`insert into public.message_conversations(scope,organization_id,kind,title,description,created_by,contact_status)
      values($1,$2,'group',$3,$4,$5,'accepted') returning id`,[ctx.scope,orgId(ctx),title,description,viewer]);
    const id=created.rows[0]?.id;
    if(!id)throw new Error("Could not create group");
    for(const member of [viewer,...ids]) await client.query(`insert into public.message_conversation_participants(conversation_id,user_id,role)
      values($1,$2,$3)`,[id,member,member===viewer?"owner":"member"]);
    await client.query("commit");return{id};
  }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}
export async function manageGroup(viewer:string,conversation:string,ctx:MessageContext,action:"add"|"remove"|"leave"|"rename"|"describe"|"promote"|"demote",userId?:string,title?:string) {
  await enabled(ctx); const client=await pool.connect();try {
    await client.query("begin");
    const meta=await assertMember(client,viewer,conversation,ctx);
    if(meta.kind!=="group")throw new AppError("Apenas grupos.",400,"MESSAGE_NOT_GROUP");
    if(action==="leave") {
      if(meta.role==="owner") {
        const successor=await client.query(`select user_id from public.message_conversation_participants where conversation_id=$1 and user_id<>$2
          order by case role when 'admin' then 0 else 1 end,joined_at limit 1`,[conversation,viewer]);
        if(successor.rows[0])await client.query(`update public.message_conversation_participants set role='owner' where conversation_id=$1 and user_id=$2`,[conversation,successor.rows[0].user_id]);
      }
      await client.query(`delete from public.message_conversation_participants where conversation_id=$1 and user_id=$2`,[conversation,viewer]);
      const remaining=await client.query(`select 1 from public.message_conversation_participants where conversation_id=$1 limit 1`,[conversation]);
      if(!remaining.rowCount)await client.query(`delete from public.message_conversations where id=$1`,[conversation]);
    } else {
      if(!["owner","admin"].includes(meta.role))throw new AppError("Somente administradores.",403,"MESSAGE_GROUP_ADMIN_REQUIRED");
      if(action==="rename") await client.query(`update public.message_conversations set title=$1 where id=$2`,[title,conversation]);
      else if(action==="describe") await client.query(`update public.message_conversations set description=$1 where id=$2`,[title?.trim()||null,conversation]);
      else if(action==="add" && userId){
        const count=await client.query<{size:number}>(`select count(*)::int as size from public.message_conversation_participants where conversation_id=$1`,[conversation]);
        if((count.rows[0]?.size??0)>=50)throw new AppError("O grupo atingiu o limite de 50 pessoas.",409,"MESSAGE_GROUP_FULL");
        await eligible(client,viewer,userId,ctx);
        const blocked=await client.query(`select 1 from public.community_user_blocks b
           join public.message_conversation_participants p on p.user_id in (b.blocker_user_id,b.blocked_user_id)
           where p.conversation_id=$1 and ((b.blocker_user_id=$2 and p.user_id=b.blocked_user_id)
             or (b.blocked_user_id=$2 and p.user_id=b.blocker_user_id)) limit 1`,[conversation,userId]);
        if(blocked.rowCount)throw new AppError("Esta pessoa não pode ser adicionada ao grupo.",403,"MESSAGE_GROUP_BLOCKED");
        await client.query(`insert into public.message_conversation_participants(conversation_id,user_id) values($1,$2) on conflict do nothing`,[conversation,userId]);
      }
      else if((action==="promote"||action==="demote") && userId){
        if(meta.role!=="owner")throw new AppError("Somente o responsável pode alterar administradores.",403,"MESSAGE_OWNER_REQUIRED");
        await client.query(`update public.message_conversation_participants set role=$3
          where conversation_id=$1 and user_id=$2 and role in ('admin','member')`,
          [conversation,userId,action==="promote"?"admin":"member"]);
      }
      else if(action==="remove" && userId){
        const victim=await client.query<{role:string}>(`select role from public.message_conversation_participants where conversation_id=$1 and user_id=$2`,[conversation,userId]);
        if(!victim.rows[0] || victim.rows[0].role==="owner" || (meta.role==="admin"&&victim.rows[0].role==="admin")) throw new AppError("Você não pode remover esta pessoa.",403,"MESSAGE_GROUP_ROLE");
        await client.query(`delete from public.message_conversation_participants where conversation_id=$1 and user_id=$2`,[conversation,userId]);
      }
    }
    await client.query(`update public.message_conversations set updated_at=now() where id=$1`,[conversation]);
    await client.query("commit");return{ok:true};
  }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}
export async function respondToContactRequest(viewer:string,id:string,decision:"accepted"|"rejected",ctx:MessageContext){
  await enabled(ctx);const client=await pool.connect();try{
    await assertMember(client,viewer,id,ctx);
    const update=await client.query(`update public.message_conversations set contact_status=$1,contact_decided_at=now()
      where id=$2 and kind='direct' and contact_status='pending' and created_by<>$3 returning id`,[decision,id,viewer]);
    if(!update.rowCount)throw new AppError("Solicitação indisponível.",409,"MESSAGE_REQUEST_INVALID");
    return{ok:true,contactStatus:decision};
  }finally{client.release();}
}
export async function listMessageConversations(viewer:string,ctx:MessageContext) {
  await enabled(ctx);
  const result=await pool.query<{id:string;kind:"direct"|"group";title:string|null;peerId:string|null;peerName:string|null;peerUsername:string|null;avatarPath:string|null;groupAvatarPath:string|null;description:string|null;createdBy:string|null;contactStatus:string;lastMessage:string|null;lastMessageAt:Date|null;unreadCount:number;memberCount:number}>(
    `select c.id,c.kind,c.title,other_user.id as "peerId",other_user.name as "peerName",other_user.username as "peerUsername",
      other_user.avatar_path as "avatarPath",c.avatar_path as "groupAvatarPath",c.description,c.created_by as "createdBy",c.contact_status as "contactStatus",
      latest.body as "lastMessage", latest.created_at as "lastMessageAt",
      (select count(*)::int from public.message_entries e where e.conversation_id=c.id and e.sender_user_id<>$1
        and e.created_at>mine.last_read_at and e.deleted_for_all_at is null) as "unreadCount",
      (select count(*)::int from public.message_conversation_participants p2 where p2.conversation_id=c.id) as "memberCount"
     from public.message_conversations c
     join public.message_conversation_participants mine on mine.conversation_id=c.id and mine.user_id=$1
     left join public.message_conversation_participants other on other.conversation_id=c.id and other.user_id<>$1 and c.kind='direct'
     left join public.users other_user on other_user.id=other.user_id and other_user.active
     left join lateral (select body,created_at from public.message_entries m where m.conversation_id=c.id and m.deleted_for_all_at is null
       order by created_at desc,id desc limit 1) latest on true
     where c.scope=$2 and c.organization_id is not distinct from $3::uuid
       and ($3::uuid is null or exists(select 1 from public.organization_users ou
         where ou.user_id=$1 and ou.organization_id=$3 and ou.status='active'))
     order by coalesce(latest.created_at,c.updated_at) desc limit 100`,[viewer,ctx.scope,orgId(ctx)]);
  // Inbox retrieval acknowledges server delivery without marking the conversation as read.
  await pool.query(`update public.message_conversation_participants mine set last_delivered_at=incoming.latest
    from (select m.conversation_id,max(m.created_at) as latest from public.message_entries m
      where m.sender_user_id<>$1 and m.deleted_for_all_at is null group by m.conversation_id) incoming
    where mine.conversation_id=incoming.conversation_id and mine.user_id=$1
      and (mine.last_delivered_at is null or mine.last_delivered_at<incoming.latest)
      and exists(select 1 from public.message_conversations c where c.id=mine.conversation_id
        and c.scope=$2 and c.organization_id is not distinct from $3::uuid)`,
    [viewer,ctx.scope,orgId(ctx)]);
  return Promise.all(result.rows.map(async ({avatarPath,groupAvatarPath,...row})=>({
    ...row,avatarUrl:row.kind==="group" ? await signedGroupAvatar(groupAvatarPath) : getAvatarPublicUrl(avatarPath),
  })));
}
export async function listConversationMessages(viewer:string,id:string,ctx:MessageContext){
  await enabled(ctx);const client=await pool.connect();try{
    await assertMember(client,viewer,id,ctx);
    const revealRead=(await settingsFor(ctx)).readReceiptsEnabled;
    const result=await client.query(`select m.id,m.sender_user_id as "senderUserId",u.name as "senderName",u.avatar_path as "avatarPath",
        m.body,m.attachment_id as "attachmentId",m.reply_to_id as "replyToId",m.created_at as "createdAt",m.deleted_for_all_at as "deletedForAllAt",
        attachment.file_name as "attachmentName",attachment.mime_type as "attachmentMime",attachment.size_bytes::int as "attachmentSize",
        reply.body as "replyBody",replyer.name as "replySenderName",
        coalesce((select jsonb_agg(jsonb_build_object('emoji',r.emoji,'userId',r.user_id)) from public.message_reactions r where r.message_id=m.id),'[]'::jsonb) as reactions
       from public.message_entries m join public.users u on u.id=m.sender_user_id
       left join public.message_attachments attachment on attachment.id=m.attachment_id
       left join public.message_entries reply on reply.id=m.reply_to_id
       left join public.users replyer on replyer.id=reply.sender_user_id
       where m.conversation_id=$1 and not exists(select 1 from public.message_hidden_entries h where h.message_id=m.id and h.user_id=$2)
       order by m.created_at desc,m.id desc limit 100`,[id,viewer]);
    const peers=await client.query<{userId:string;name:string;avatarPath:string|null;role:string;lastReadAt:Date|null;lastDeliveredAt:Date|null}>(
      `select p.user_id as "userId",u.name,u.avatar_path as "avatarPath",p.role,p.last_read_at as "lastReadAt",p.last_delivered_at as "lastDeliveredAt"
       from public.message_conversation_participants p join public.users u on u.id=p.user_id
       where p.conversation_id=$1`,[id]);
    return {messages:result.rows.reverse().map(({avatarPath,...row})=>({...row,avatarUrl:getAvatarPublicUrl(avatarPath)})),
      participants:peers.rows.map(({avatarPath,...row})=>({...row,lastReadAt:revealRead||row.userId===viewer?row.lastReadAt:null,avatarUrl:getAvatarPublicUrl(avatarPath)}))};
  }finally{client.release();}
}
export async function sendConversationMessage(viewer:string,id:string,clientMessageId:string,body:string,ctx:MessageContext,attachmentId?:string,replyToId?:string){
  await enabled(ctx);const client=await pool.connect();try{
    await client.query("begin");const meta=await assertMember(client,viewer,id,ctx);
    if(meta.status==="rejected")throw new AppError("Solicitação recusada.",403,"MESSAGE_REJECTED");
    if(meta.status==="pending"){
      if(meta.createdBy!==viewer)throw new AppError("Aceite a solicitação para responder.",403,"MESSAGE_REQUEST_PENDING");
      const previous=await client.query(`select 1 from public.message_entries where conversation_id=$1 limit 1`,[id]);
      if(previous.rowCount)throw new AppError("Aguarde a aceitação do contato.",403,"MESSAGE_REQUEST_PENDING");
    }
    await ensureNoBlockedPeers(client,viewer,id);
    if(attachmentId){
      if(meta.status!=="accepted")throw new AppError("Aceite o contato para enviar arquivos.",403,"MESSAGE_ATTACHMENT_PENDING");
      const found=await client.query(`select 1 from public.message_attachments where id=$1 and conversation_id=$2 and owner_id=$3 and linked_message_id is null`,[attachmentId,id,viewer]);
      if(!found.rowCount)throw new AppError("Anexo inválido.",403,"MESSAGE_ATTACHMENT_FORBIDDEN");
    }
    if(replyToId){const found=await client.query(`select 1 from public.message_entries where id=$1 and conversation_id=$2`,[replyToId,id]);
      if(!found.rowCount)throw new AppError("Resposta inválida.",400,"MESSAGE_REPLY_INVALID");}
    const created=await client.query<{id:string}>(`insert into public.message_entries(conversation_id,sender_user_id,client_message_id,body,attachment_id,reply_to_id)
      values($1,$2,$3,$4,$5,$6) on conflict(sender_user_id,client_message_id) do nothing returning id`,[id,viewer,clientMessageId,body,attachmentId??null,replyToId??null]);
    if(attachmentId && created.rows[0]) await client.query(`update public.message_attachments set linked_message_id=$1 where id=$2`,[created.rows[0].id,attachmentId]);
    await client.query("commit");return{ok:true};
  }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}
export async function markConversationRead(viewer:string,id:string,ctx:MessageContext){
  await enabled(ctx);const client=await pool.connect();try{
    await assertMember(client,viewer,id,ctx);
    await client.query(`update public.message_conversation_participants set last_read_at=now(),last_delivered_at=now()
      where conversation_id=$1 and user_id=$2 and exists(select 1 from public.message_entries m
        where m.conversation_id=$1 and m.sender_user_id<>$2 and m.created_at>last_read_at)`,[id,viewer]);
    return{ok:true};
  }finally{client.release();}
}
export async function deleteConversationMessage(viewer:string,id:string,msg:string,mode:"me"|"everyone",ctx:MessageContext){
  await enabled(ctx);const client=await pool.connect();try{
    await client.query("begin");await assertMember(client,viewer,id,ctx);
    const found=await client.query<{sender:string;createdAt:Date;deleted:Date|null}>(`select sender_user_id as sender,created_at as "createdAt",deleted_for_all_at as deleted from public.message_entries
      where id=$1 and conversation_id=$2 for update`,[msg,id]);
    if(!found.rows[0])throw new AppError("Mensagem indisponível.",404,"MESSAGE_NOT_FOUND");
    let attachmentPath: string | null = null;
    if(mode==="me")await client.query(`insert into public.message_hidden_entries(message_id,user_id) values($1,$2) on conflict do nothing`,[msg,viewer]);
    else{
      const attachment=await client.query<{storagePath:string}>(`select storage_path as "storagePath" from public.message_attachments where linked_message_id=$1`,[msg]);
      attachmentPath=attachment.rows[0]?.storagePath??null;
      if(found.rows[0].sender!==viewer)throw new AppError("Você só pode apagar suas mensagens.",403,"MESSAGE_DELETE_FORBIDDEN");
      if(Date.now()-new Date(found.rows[0].createdAt).getTime()>15*60_000)throw new AppError("Prazo de 15 minutos encerrado.",409,"MESSAGE_DELETE_EXPIRED");
      await client.query(`update public.message_entries set body='',attachment_id=null,deleted_for_all_at=now() where id=$1`,[msg]);
    }
    await client.query("commit");
    if(attachmentPath){
      const removed=await supabaseAdmin.storage.from(bucket).remove([attachmentPath]);
      if(removed.error)console.warn("CONG chat: limpeza de arquivo adiada",removed.error.message);
      else await pool.query(`delete from public.message_attachments where linked_message_id=$1`,[msg]).catch(error=>console.warn("CONG chat: arquivo removido, registro pendente",error));
    }
    return{ok:true};
  }catch(e){await client.query("rollback").catch(()=>undefined);throw e;}finally{client.release();}
}
export async function toggleMessageReaction(viewer:string,id:string,msg:string,emoji:string,ctx:MessageContext){
  await enabled(ctx);const client=await pool.connect();try{
    await client.query("begin");await assertMember(client,viewer,id,ctx);
    const found=await client.query(`select 1 from public.message_entries where id=$1 and conversation_id=$2 and deleted_for_all_at is null`,[msg,id]);
    if(!found.rowCount)throw new AppError("Mensagem indisponível.",404,"MESSAGE_NOT_FOUND");
    const removed=await client.query(`delete from public.message_reactions where message_id=$1 and user_id=$2 and emoji=$3`,[msg,viewer,emoji]);
    if(!removed.rowCount)await client.query(`insert into public.message_reactions(message_id,user_id,emoji) values($1,$2,$3)`,[msg,viewer,emoji]);
    await client.query("commit");return{ok:true};
  }catch(e){await client.query("rollback");throw e;}finally{client.release();}
}
export async function createAttachmentGrant(viewer:string,id:string,ctx:MessageContext,file:{fileName:string;mimeType:string;size:number}){
  await enabled(ctx);const client=await pool.connect();try{
    const meta=await assertMember(client,viewer,id,ctx);if(meta.status!=="accepted")throw new AppError("Aceite o contato primeiro.",403,"MESSAGE_ATTACHMENT_PENDING");
    await ensureNoBlockedPeers(client,viewer,id);
    const key=randomUUID();const path=`${id}/${key}`;
    const requestedMime=file.mimeType.toLowerCase().split(";", 1)[0] ?? "";
    // Active content is always sent as a document; inline preview only uses a strict allowlist.
    const storageMime=permittedPreviewMimes.has(requestedMime)&&file.size<=5_000_000 ? requestedMime : "application/octet-stream";
    const signed=await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if(signed.error||!signed.data)throw new AppError("Falha ao preparar upload.",502,"MESSAGE_UPLOAD_FAILED");
    const stored=await client.query<{id:string}>(`insert into public.message_attachments(conversation_id,owner_id,storage_path,file_name,mime_type,size_bytes)
       values($1,$2,$3,$4,$5,$6) returning id`,[id,viewer,path,file.fileName,storageMime,file.size]);
    const attachmentId=stored.rows[0]?.id;
    if(!attachmentId)throw new Error("Attachment registration failed");
    return{attachmentId,path,token:signed.data.token,bucket};
  }finally{client.release();}
}
export async function getAttachmentUrl(viewer:string,id:string,attachment:string,ctx:MessageContext){
  await enabled(ctx);const client=await pool.connect();try{
    await assertMember(client,viewer,id,ctx);
    const found=await client.query<{storagePath:string;name:string;mime:string;size:number}>(`select a.storage_path as "storagePath",a.file_name as name,a.mime_type as mime,a.size_bytes::int as size
      from public.message_attachments a join public.message_entries m on m.attachment_id=a.id and m.deleted_for_all_at is null
      where a.id=$1 and a.conversation_id=$2 and not exists(select 1 from public.message_hidden_entries h where h.message_id=m.id and h.user_id=$3)`,[attachment,id,viewer]);
    const item=found.rows[0];
    if(!item)throw new AppError("Arquivo indisponível.",404,"MESSAGE_ATTACHMENT_NOT_FOUND");
    const signed=await supabaseAdmin.storage.from(bucket).createSignedUrl(item.storagePath,60);
    if(signed.error||!signed.data?.signedUrl)throw new AppError("Não foi possível abrir o arquivo.",502,"MESSAGE_DOWNLOAD_FAILED");
    return{url:signed.data.signedUrl,name:item.name,mime:item.mime,size:item.size};
  }finally{client.release();}
}

// Group pictures are private. Authorization is enforced before this helper is called.
// Cache short-lived signed URLs so inbox polling does not regenerate them every 6 seconds.
const groupAvatarCache=new Map<string,{url:string;until:number}>();
async function signedGroupAvatar(path:string|null):Promise<string|null>{
  if(!path)return null;
  const previous=groupAvatarCache.get(path);
  if(previous&&previous.until>Date.now())return previous.url;
  const {data,error}=await supabaseAdmin.storage.from(bucket).createSignedUrl(path,3600);
  if(error||!data?.signedUrl)return null;
  if(groupAvatarCache.size>250)groupAvatarCache.clear();
  groupAvatarCache.set(path,{url:data.signedUrl,until:Date.now()+10*60_000});
  return data.signedUrl;
}
function verifyImage(data:Buffer,mime:string):string{
  if(data.length<16||data.length>2_000_000)throw new AppError("A foto deve ter até 2 MB.",413,"MESSAGE_GROUP_PHOTO_LIMIT");
  const jpg=mime==="image/jpeg"&&data[0]===0xff&&data[1]===0xd8&&data[2]===0xff;
  const png=mime==="image/png"&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp=mime==="image/webp"&&data.toString("ascii",0,4)==="RIFF"&&data.toString("ascii",8,12)==="WEBP";
  if(!jpg&&!png&&!webp)throw new AppError("Use uma imagem JPG, PNG ou WebP válida.",400,"MESSAGE_GROUP_PHOTO_TYPE");
  return jpg?"jpg":png?"png":"webp";
}
export async function uploadGroupPhoto(viewer:string,id:string,ctx:MessageContext,file:Express.Multer.File){
  await enabled(ctx);
  const client=await pool.connect();
  let nextPath:string|null=null;
  let previousPath:string|null=null;
  try{
    const meta=await assertMember(client,viewer,id,ctx);
    if(meta.kind!=="group"||meta.role==="member")throw new AppError("Somente administradores podem alterar a foto.",403,"MESSAGE_GROUP_ADMIN_REQUIRED");
    const ext=verifyImage(file.buffer,file.mimetype);
    nextPath=`group-avatars/${id}/${randomUUID()}.${ext}`;
    const uploaded=await supabaseAdmin.storage.from(bucket).upload(nextPath,file.buffer,{contentType:file.mimetype,cacheControl:"3600",upsert:false});
    if(uploaded.error)throw new AppError("Não foi possível enviar a foto.",502,"MESSAGE_GROUP_PHOTO_UPLOAD");
    const existing=await client.query<{path:string|null}>(`select avatar_path as path from public.message_conversations where id=$1`,[id]);
    const changed=await client.query(`update public.message_conversations c set avatar_path=$1,updated_at=now()
      where c.id=$2 and exists(select 1 from public.message_conversation_participants p
      where p.conversation_id=c.id and p.user_id=$3 and p.role in ('owner','admin'))`,[nextPath,id,viewer]);
    if(!changed.rowCount)throw new AppError("Grupo não encontrado.",404,"MESSAGE_NOT_FOUND");
    previousPath=existing.rows[0]?.path??null;
    return {avatarUrl:await signedGroupAvatar(nextPath)};
  }catch(e){if(nextPath)await supabaseAdmin.storage.from(bucket).remove([nextPath]).catch(()=>undefined);throw e;}
  finally{
    client.release();
    if(previousPath){
      const cleanup=await supabaseAdmin.storage.from(bucket).remove([previousPath]).catch(()=>null);
      if(!cleanup||cleanup.error)console.warn("CONG chat: foto antiga pendente de limpeza");
    }
  }
}
export async function deleteGroupPhoto(viewer:string,id:string,ctx:MessageContext){
  await enabled(ctx);const client=await pool.connect();try{
    const meta=await assertMember(client,viewer,id,ctx);
    if(meta.kind!=="group"||meta.role==="member")throw new AppError("Somente administradores podem alterar a foto.",403,"MESSAGE_GROUP_ADMIN_REQUIRED");
    const old=await client.query<{path:string|null}>(`select avatar_path as path from public.message_conversations where id=$1`,[id]);
    const removed=await client.query(`update public.message_conversations c set avatar_path=null,updated_at=now()
      where c.id=$1 and exists(select 1 from public.message_conversation_participants p
      where p.conversation_id=c.id and p.user_id=$2 and p.role in ('owner','admin'))`,[id,viewer]);
    if(!removed.rowCount)throw new AppError("Grupo indisponível.",404,"MESSAGE_NOT_FOUND");
    if(old.rows[0]?.path){
      const cleanup=await supabaseAdmin.storage.from(bucket).remove([old.rows[0].path]).catch(()=>null);
      if(!cleanup||cleanup.error)console.warn("CONG chat: foto removida do banco, pendente no armazenamento");
    }
    return{ok:true};
  }finally{client.release();}
}
export async function listConversationMedia(viewer:string,id:string,ctx:MessageContext,offset:number){
  await enabled(ctx);const client=await pool.connect();try{
    await assertMember(client,viewer,id,ctx);
    const result=await client.query<{id:string;messageId:string;name:string;mime:string;size:number;createdAt:Date;storagePath:string}>(
      `select a.id,m.id as "messageId",a.file_name as name,a.mime_type as mime,a.size_bytes::int as size,
         m.created_at as "createdAt",a.storage_path as "storagePath"
       from public.message_attachments a join public.message_entries m on m.attachment_id=a.id
       where a.conversation_id=$1 and m.deleted_for_all_at is null
       and not exists(select 1 from public.message_hidden_entries h where h.message_id=m.id and h.user_id=$2)
       order by m.created_at desc,m.id desc limit 31 offset $3`,[id,viewer,offset]);
    const items=result.rows.slice(0,30);
    const signed=items.length?await supabaseAdmin.storage.from(bucket).createSignedUrls(items.map(x=>x.storagePath),600):null;
    if(signed?.error)throw new AppError("Não foi possível abrir as mídias.",502,"MESSAGE_MEDIA_FAILED");
    return{items:items.map((item,i)=>({id:item.id,messageId:item.messageId,name:item.name,mime:item.mime,
      size:item.size,createdAt:item.createdAt,url:signed?.data?.[i]?.signedUrl??null})),hasMore:result.rows.length>30};
  }finally{client.release();}
}
