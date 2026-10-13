import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../config/supabase.js";
import type { z } from "zod";
import type {
  encryptedPayloadSchema,
  ecdhPublicKeySchema,
} from "../validators/messages.validator.js";

import pool from "../config/database.js";
import { getAvatarPublicUrl } from "./avatar.service.js";
import { AppError } from "../utils/app-error.js";
import { roleHasPermission } from "./authorization.service.js";
import type { OrganizationContext } from "./organization.service.js";

type Context =
  | { scope: "global" }
  | { scope: "organization"; organization: OrganizationContext };
interface Viewer {
  id: string;
}
type EncryptedPayload = z.infer<typeof encryptedPayloadSchema>;
type PublicKey = z.infer<typeof ecdhPublicKeySchema>;
interface ModuleSettings {
  enabled: boolean;
  directMessagesEnabled: boolean;
  readReceiptsEnabled: boolean;
}

const settingsDefaults: ModuleSettings = {
  enabled: false,
  directMessagesEnabled: true,
  readReceiptsEnabled: true,
};

function organizationId(context: Context): string | null {
  return context.scope === "organization"
    ? context.organization.organizationId
    : null;
}

export async function getMessageViewer(authUserId: string): Promise<Viewer> {
  const result = await pool.query<Viewer>(
    `select id from public.users where auth_user_id = $1 and active = true limit 1`,
    [authUserId],
  );
  if (!result.rows[0]) {
    throw new AppError(
      "Conta inexistente ou inativa.",
      403,
      "MESSAGE_USER_INACTIVE",
    );
  }
  return result.rows[0];
}

async function settingsFor(
  organization: OrganizationContext,
): Promise<ModuleSettings> {
  const result = await pool.query<ModuleSettings>(
    `select enabled, direct_messages_enabled as "directMessagesEnabled",
            read_receipts_enabled as "readReceiptsEnabled"
       from public.message_module_settings where organization_id = $1`,
    [organization.organizationId],
  );
  return result.rows[0] ?? settingsDefaults;
}

export async function getMessageModuleSettings(
  organization: OrganizationContext,
) {
  const settings = await settingsFor(organization);
  const canManage = await roleHasPermission(
    organization.roleId,
    "organization.manage",
  );
  return { ...settings, canManage };
}

export async function updateMessageModuleSettings(
  organization: OrganizationContext,
  changes: Partial<ModuleSettings>,
) {
  const canManage = await roleHasPermission(
    organization.roleId,
    "organization.manage",
  );
  if (!canManage)
    throw new AppError(
      "Sem permissão para configurar o módulo.",
      403,
      "MESSAGE_MANAGE_FORBIDDEN",
    );

  const previous = await settingsFor(organization);
  const next = { ...previous, ...changes };
  await pool.query(
    `insert into public.message_module_settings
       (organization_id, enabled, direct_messages_enabled, read_receipts_enabled)
     values ($1, $2, $3, $4)
     on conflict (organization_id) do update set
       enabled = excluded.enabled,
       direct_messages_enabled = excluded.direct_messages_enabled,
       read_receipts_enabled = excluded.read_receipts_enabled`,
    [
      organization.organizationId,
      next.enabled,
      next.directMessagesEnabled,
      next.readReceiptsEnabled,
    ],
  );
  return { ...next, canManage };
}

async function ensureScopeEnabled(context: Context): Promise<void> {
  if (context.scope === "global") return;
  const settings = await settingsFor(context.organization);
  if (!settings.enabled || !settings.directMessagesEnabled) {
    throw new AppError(
      "Mensagens diretas não estão ativadas nesta organização.",
      403,
      "MESSAGE_MODULE_DISABLED",
    );
  }
}

async function ensureEligibleRecipient(
  client: PoolClient,
  viewerId: string,
  recipientId: string,
  context: Context,
): Promise<void> {
  if (viewerId === recipientId)
    throw new AppError(
      "Não é possível conversar consigo mesmo.",
      400,
      "MESSAGE_SELF_RECIPIENT",
    );
  const result = await client.query<{ id: string }>(
    `select u.id from public.users u
     where u.id = $1 and u.active = true
     and ($2::uuid is null or exists (
       select 1 from public.organization_users ou
       where ou.user_id = u.id and ou.organization_id = $2 and ou.status = 'active'
     ))
     and not exists (
       select 1 from public.community_user_blocks b
       where (b.blocker_user_id = $1 and b.blocked_user_id = $3)
          or (b.blocker_user_id = $3 and b.blocked_user_id = $1)
     )`,
    [recipientId, organizationId(context), viewerId],
  );
  if (!result.rows[0])
    throw new AppError(
      "Destinatário indisponível.",
      404,
      "MESSAGE_RECIPIENT_UNAVAILABLE",
    );
}

async function ensureNotBlocked(
  client: PoolClient,
  first: string,
  second: string,
): Promise<void> {
  const blocked = await client.query(
    `select 1 from public.community_user_blocks
     where (blocker_user_id = $1 and blocked_user_id = $2)
        or (blocker_user_id = $2 and blocked_user_id = $1)
     limit 1`,
    [first, second],
  );
  if (blocked.rowCount)
    throw new AppError(
      "Não é possível enviar mensagens para este usuário.",
      403,
      "MESSAGE_CONTACT_BLOCKED",
    );
}

export async function findMessageRecipients(
  viewerId: string,
  context: Context,
  query: string,
) {
  await ensureScopeEnabled(context);
  if (query.trim().length < 2) return [];
  const result = await pool.query<{
    id: string;
    name: string;
    username: string | null;
    avatarPath: string | null;
  }>(
    `select u.id, u.name, u.username, u.avatar_path as "avatarPath"
     from public.users u
     where u.active = true and u.id <> $1
       and (u.name ilike $2 or u.username ilike $2)
       and ($3::uuid is null or exists (
         select 1 from public.organization_users ou
         where ou.user_id = u.id and ou.organization_id = $3 and ou.status = 'active'
       ))
       and not exists (
         select 1 from public.community_user_blocks b
         where (b.blocker_user_id = $1 and b.blocked_user_id = u.id)
            or (b.blocker_user_id = u.id and b.blocked_user_id = $1)
       )
     order by u.name asc limit 20`,
    [
      viewerId,
      `%${query.trim().replace(/[\\%_]/g, "\\$&")}%`,
      organizationId(context),
    ],
  );
  return result.rows.map(({ avatarPath, ...row }) => ({
    ...row,
    avatarUrl: getAvatarPublicUrl(avatarPath),
  }));
}

export async function startDirectConversation(
  viewerId: string,
  recipientId: string,
  context: Context,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await ensureEligibleRecipient(client, viewerId, recipientId, context);
    const directPairKey = [viewerId, recipientId].sort().join(":");
    const created = await client.query<{ id: string }>(
      `insert into public.message_conversations
        (scope, organization_id, direct_pair_key, created_by, contact_status)
       values ($1,$2,$3,$4,'pending')
       on conflict do nothing returning id`,
      [context.scope, organizationId(context), directPairKey, viewerId],
    );
    let conversationId = created.rows[0]?.id;
    if (!conversationId) {
      const existing = await client.query<{ id: string }>(
        `select id from public.message_conversations
         where scope = $1 and organization_id is not distinct from $2::uuid
           and direct_pair_key = $3 limit 1`,
        [context.scope, organizationId(context), directPairKey],
      );
      conversationId = existing.rows[0]?.id;
    }
    if (!conversationId) throw new Error("Conversation insert failed");
    await client.query(
      `insert into public.message_conversation_participants (conversation_id, user_id)
       values ($1,$2), ($1,$3) on conflict do nothing`,
      [conversationId, viewerId, recipientId],
    );
    await client.query("commit");
    return { id: conversationId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function requireConversation(
  client: PoolClient,
  conversationId: string,
  viewerId: string,
  context: Context,
): Promise<void> {
  const result = await client.query<{ id: string }>(
    `select c.id from public.message_conversations c
     join public.message_conversation_participants p
       on p.conversation_id = c.id and p.user_id = $2
     where c.id = $1 and c.scope = $3 and c.organization_id is not distinct from $4::uuid
       and ($4::uuid is null or exists (
         select 1 from public.organization_users ou
         where ou.user_id = $2 and ou.organization_id = $4 and ou.status = 'active'
       ))`,
    [conversationId, viewerId, context.scope, organizationId(context)],
  );
  if (!result.rows[0])
    throw new AppError(
      "Conversa não encontrada.",
      404,
      "MESSAGE_CONVERSATION_NOT_FOUND",
    );
}

export async function respondToContactRequest(
  viewerId: string,
  conversationId: string,
  decision: "accepted" | "rejected",
  context: Context,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await requireConversation(client, conversationId, viewerId, context);
    const updated = await client.query(
      `update public.message_conversations
         set contact_status = $1, contact_decided_at = now()
       where id = $2 and contact_status = 'pending' and created_by <> $3
       returning id`,
      [decision, conversationId, viewerId],
    );
    if (!updated.rowCount)
      throw new AppError(
        "Esta solicitação não está disponível.",
        409,
        "MESSAGE_REQUEST_UNAVAILABLE",
      );
    await client.query("commit");
    return { ok: true, contactStatus: decision };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteConversationMessage(
  viewerId: string,
  conversationId: string,
  messageId: string,
  mode: "me" | "everyone",
  context: Context,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await requireConversation(client, conversationId, viewerId, context);
    const result = await client.query<{
      senderUserId: string;
      deletedForAllAt: Date | null;
      createdAt: Date;
    }>(
      `select sender_user_id as "senderUserId", deleted_for_all_at as "deletedForAllAt", created_at as "createdAt"
         from public.message_entries where id = $1 and conversation_id = $2 for update`,
      [messageId, conversationId],
    );
    const message = result.rows[0];
    if (!message)
      throw new AppError("Mensagem não encontrada.", 404, "MESSAGE_NOT_FOUND");
    if (mode === "me") {
      await client.query(
        `insert into public.message_hidden_entries (message_id, user_id) values ($1,$2) on conflict do nothing`,
        [messageId, viewerId],
      );
    } else {
      if (message.senderUserId !== viewerId)
        throw new AppError(
          "Você só pode apagar suas próprias mensagens para todos.",
          403,
          "MESSAGE_DELETE_FORBIDDEN",
        );
      if (message.deletedForAllAt)
        throw new AppError(
          "Mensagem já apagada.",
          409,
          "MESSAGE_ALREADY_DELETED",
        );
      const age = Date.now() - new Date(message.createdAt).getTime();
      if (age < 0 || age > 15 * 60_000)
        throw new AppError(
          "O prazo de 15 minutos para apagar para todos terminou.",
          409,
          "MESSAGE_DELETE_TIME_EXPIRED",
        );
      await client.query(
        `update public.message_entries set encrypted_payload = null, deleted_for_all_at = now() where id = $1`,
        [messageId],
      );
    }
    const attachment =
      mode === "everyone"
        ? await client.query<{ storagePath: string }>(
            `select storage_path as "storagePath" from public.message_attachments where linked_message_id = $1`,
            [messageId],
          )
        : { rows: [] as { storagePath: string }[] };
    await client.query("commit");
    if (attachment.rows.length) {
      void supabaseAdmin.storage
        .from("cong-message-attachments")
        .remove(attachment.rows.map((item) => item.storagePath))
        .catch((error: unknown) =>
          console.error("Encrypted attachment cleanup failed", error),
        );
    }
    return { ok: true };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function uploadEncryptedMessageAttachment(
  viewerId: string,
  conversationId: string,
  ciphertext: Buffer,
  context: Context,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await requireConversation(client, conversationId, viewerId, context);
    const accepted = await client.query(
      `select 1 from public.message_conversations where id = $1 and contact_status = 'accepted'`,
      [conversationId],
    );
    if (!accepted.rowCount)
      throw new AppError(
        "Aguarde a aceitação antes de enviar anexos.",
        403,
        "MESSAGE_REQUEST_PENDING",
      );
    const id = randomUUID();
    const storagePath = `${conversationId}/${id}.bin`;
    const bucket = supabaseAdmin.storage.from("cong-message-attachments");
    const upload = await bucket.upload(storagePath, ciphertext, {
      contentType: "application/octet-stream",
      upsert: false,
    });
    if (upload.error)
      throw new AppError(
        "Não foi possível enviar o anexo.",
        502,
        "MESSAGE_ATTACHMENT_UPLOAD_FAILED",
      );
    try {
      await client.query(
        `insert into public.message_attachments (id, conversation_id, owner_id, storage_path)
         values ($1,$2,$3,$4)`,
        [id, conversationId, viewerId, storagePath],
      );
    } catch (error) {
      await bucket.remove([storagePath]);
      throw error;
    }
    return { attachmentId: id };
  } finally {
    client.release();
  }
}

export async function downloadEncryptedMessageAttachment(
  viewerId: string,
  conversationId: string,
  attachmentId: string,
  context: Context,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await requireConversation(client, conversationId, viewerId, context);
    const found = await client.query<{ storagePath: string }>(
      `select a.storage_path as "storagePath"
         from public.message_attachments a
         join public.message_entries m on m.id = a.linked_message_id
        where a.id = $1 and a.conversation_id = $2 and m.deleted_for_all_at is null
          and not exists (select 1 from public.message_hidden_entries h
                           where h.message_id = m.id and h.user_id = $3)`,
      [attachmentId, conversationId, viewerId],
    );
    if (!found.rows[0])
      throw new AppError(
        "Anexo indisponível.",
        404,
        "MESSAGE_ATTACHMENT_NOT_FOUND",
      );
    const { data, error } = await supabaseAdmin.storage
      .from("cong-message-attachments")
      .download(found.rows[0].storagePath);
    if (error || !data)
      throw new AppError(
        "Não foi possível baixar o anexo.",
        502,
        "MESSAGE_ATTACHMENT_FETCH_FAILED",
      );
    return {
      ciphertext: Buffer.from(await data.arrayBuffer()).toString("base64"),
    };
  } finally {
    client.release();
  }
}

export async function listMessageConversations(
  viewerId: string,
  context: Context,
) {
  await ensureScopeEnabled(context);
  const result = await pool.query<{
    id: string;
    peerId: string;
    peerName: string;
    peerUsername: string | null;
    avatarPath: string | null;
    contactStatus: string;
    createdBy: string | null;
    lastMessage: string | null;
    lastMessageAt: Date | null;
    unreadCount: number;
  }>(
    `select c.id,
       other_user.id as "peerId", other_user.name as "peerName",
       other_user.username as "peerUsername", other_user.avatar_path as "avatarPath",
       c.contact_status as "contactStatus", c.created_by as "createdBy",
       null::text as "lastMessage", latest.created_at as "lastMessageAt",
       (select count(*)::int from public.message_entries unread
        where unread.conversation_id = c.id and unread.sender_user_id <> $1
          and unread.deleted_for_all_at is null and unread.created_at > mine.last_read_at) as "unreadCount"
     from public.message_conversations c
     join public.message_conversation_participants mine
       on mine.conversation_id = c.id and mine.user_id = $1
     join public.message_conversation_participants other
       on other.conversation_id = c.id and other.user_id <> $1
     join public.users other_user on other_user.id = other.user_id and other_user.active = true
     left join lateral (
       select created_at from public.message_entries m
       where m.conversation_id = c.id
       order by created_at desc, id desc limit 1
     ) latest on true
     where c.scope = $2 and c.organization_id is not distinct from $3::uuid
       and ($3::uuid is null or exists (
         select 1 from public.organization_users ou
         where ou.user_id = $1 and ou.organization_id = $3 and ou.status = 'active'
       ))
     order by coalesce(latest.created_at, c.created_at) desc limit 100`,
    [viewerId, context.scope, organizationId(context)],
  );
  // A client that retrieved the inbox has received the encrypted message metadata.
  // Receipt is recorded only when there are previously undelivered incoming messages.
  await pool.query(
    `update public.message_conversation_participants mine
       set last_delivered_at = unread.latest_created_at
      from (select m.conversation_id, max(m.created_at) as latest_created_at
              from public.message_entries m
             where m.sender_user_id <> $1 and m.deleted_for_all_at is null
             group by m.conversation_id) unread
     where mine.conversation_id = unread.conversation_id and mine.user_id = $1
       and (mine.last_delivered_at is null or mine.last_delivered_at < unread.latest_created_at)
       and exists (select 1 from public.message_conversations c where c.id = mine.conversation_id
         and c.scope = $2 and c.organization_id is not distinct from $3::uuid)`,
    [viewerId, context.scope, organizationId(context)],
  );
  return result.rows.map(({ avatarPath, ...row }) => ({
    ...row,
    avatarUrl: getAvatarPublicUrl(avatarPath),
  }));
}

export async function listConversationMessages(
  viewerId: string,
  conversationId: string,
  context: Context,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await requireConversation(client, conversationId, viewerId, context);
    const meta = await client.query<{
      peerLastReadAt: Date | null;
      peerLastDeliveredAt: Date | null;
      readReceiptsEnabled: boolean;
    }>(
      `select peer.last_read_at as "peerLastReadAt", peer.last_delivered_at as "peerLastDeliveredAt",
              case
                when $3::uuid is null then true
                else coalesce(settings.read_receipts_enabled, true)
              end as "readReceiptsEnabled"
         from public.message_conversation_participants mine
         join public.message_conversation_participants peer
           on peer.conversation_id = mine.conversation_id and peer.user_id <> mine.user_id
         left join public.message_module_settings settings on settings.organization_id = $3::uuid
        where mine.conversation_id = $1 and mine.user_id = $2
        limit 1`,
      [conversationId, viewerId, organizationId(context)],
    );
    const result = await client.query<{
      id: string;
      encryptedPayload: EncryptedPayload | null;
      senderUserId: string;
      senderName: string;
      createdAt: Date;
      deletedForAllAt: Date | null;
      avatarPath: string | null;
    }>(
      `select m.id, m.encrypted_payload as "encryptedPayload", m.sender_user_id as "senderUserId",
         u.name as "senderName", u.avatar_path as "avatarPath", m.created_at as "createdAt",
         m.deleted_for_all_at as "deletedForAllAt"
       from public.message_entries m join public.users u on u.id = m.sender_user_id
       where m.conversation_id = $1
         and not exists (select 1 from public.message_hidden_entries h
                         where h.message_id = m.id and h.user_id = $2)
       order by m.created_at desc, m.id desc limit 100`,
      [conversationId, viewerId],
    );
    return {
      messages: result.rows
        .reverse()
        .map(({ avatarPath, ...row }) => ({
          ...row,
          avatarUrl: getAvatarPublicUrl(avatarPath),
        })),
      receipt: {
        peerLastReadAt: meta.rows[0]?.readReceiptsEnabled
          ? (meta.rows[0]?.peerLastReadAt ?? null)
          : null,
        peerLastDeliveredAt: meta.rows[0]?.peerLastDeliveredAt ?? null,
      },
    };
  } finally {
    client.release();
  }
}

export async function getOwnMessageIdentity(userId: string) {
  const result = await pool.query<{ publicKey: PublicKey; keyVersion: number }>(
    `select public_key as "publicKey", key_version as "keyVersion"
     from public.message_identity_keys where user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

// The first device to register becomes authoritative. Never silently replace its key.
export async function registerMessageIdentity(
  userId: string,
  publicKey: PublicKey,
) {
  await pool.query(
    `insert into public.message_identity_keys (user_id, public_key) values ($1, $2::jsonb)
     on conflict (user_id) do nothing`,
    [userId, JSON.stringify(publicKey)],
  );
  return getOwnMessageIdentity(userId);
}

export async function resetMessageIdentity(
  userId: string,
  publicKey: PublicKey,
) {
  await pool.query(
    `insert into public.message_identity_keys (user_id, public_key)
     values ($1, $2::jsonb) on conflict (user_id) do update
     set public_key = excluded.public_key,
         key_version = message_identity_keys.key_version + 1,
         updated_at = now()`,
    [userId, JSON.stringify(publicKey)],
  );
  return getOwnMessageIdentity(userId);
}

export async function getConversationKeys(
  viewerId: string,
  conversationId: string,
  context: Context,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await requireConversation(client, conversationId, viewerId, context);
    const result = await client.query<{
      userId: string;
      publicKey: PublicKey | null;
      keyVersion: number | null;
    }>(
      `select p.user_id as "userId", k.public_key as "publicKey", k.key_version as "keyVersion"
       from public.message_conversation_participants p
       left join public.message_identity_keys k on k.user_id = p.user_id
       where p.conversation_id = $1 order by p.user_id`,
      [conversationId],
    );
    return result.rows;
  } finally {
    client.release();
  }
}

export async function sendConversationMessage(
  viewerId: string,
  conversationId: string,
  clientMessageId: string,
  encryptedPayload: EncryptedPayload,
  context: Context,
  attachmentId?: string,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await requireConversation(client, conversationId, viewerId, context);
    const consent = await client.query<{
      contactStatus: string;
      createdBy: string | null;
    }>(
      `select contact_status as "contactStatus", created_by as "createdBy"
         from public.message_conversations where id = $1 for update`,
      [conversationId],
    );
    const relationship = consent.rows[0];
    if (!relationship || relationship.contactStatus === "rejected") {
      throw new AppError(
        "Contato indisponível.",
        403,
        "MESSAGE_REQUEST_REJECTED",
      );
    }
    if (relationship.contactStatus === "pending") {
      if (relationship.createdBy !== viewerId) {
        throw new AppError(
          "Aceite a solicitação antes de responder.",
          403,
          "MESSAGE_REQUEST_PENDING",
        );
      }
      const hasMessage = await client.query(
        `select 1 from public.message_entries where conversation_id = $1 limit 1`,
        [conversationId],
      );
      if (hasMessage.rowCount) {
        throw new AppError(
          "Aguarde a aceitação antes de enviar outra mensagem.",
          403,
          "MESSAGE_REQUEST_PENDING",
        );
      }
    }
    const people = await client.query<{
      userId: string;
      keyVersion: number | null;
    }>(
      `select p.user_id as "userId", k.key_version as "keyVersion"
       from public.message_conversation_participants p
       left join public.message_identity_keys k on k.user_id = p.user_id
       where p.conversation_id = $1 order by p.user_id for share of p`,
      [conversationId],
    );
    if (
      people.rows.length !== 2 ||
      !people.rows.some((p) => p.userId === viewerId)
    ) {
      throw new AppError(
        "Participantes da conversa inválidos.",
        409,
        "MESSAGE_INVALID_PARTICIPANTS",
      );
    }
    const recipient = people.rows.find((p) => p.userId !== viewerId);
    if (!recipient || !recipient.keyVersion) {
      throw new AppError(
        "O destinatário ainda não ativou as mensagens seguras.",
        409,
        "MESSAGE_RECIPIENT_KEY_MISSING",
      );
    }
    await ensureEligibleRecipient(client, viewerId, recipient.userId, context);
    await ensureNotBlocked(client, viewerId, recipient.userId);
    const expected = people.rows.map((person) => ({
      userId: person.userId,
      keyVersion: person.keyVersion,
    }));
    const supplied = encryptedPayload.boxes;
    if (
      expected.some(
        (person) =>
          !person.keyVersion ||
          supplied.filter(
            (box) =>
              box.userId === person.userId &&
              box.keyVersion === person.keyVersion,
          ).length !== 1,
      )
    ) {
      throw new AppError(
        "As chaves de um participante mudaram. Recarregue a conversa.",
        409,
        "MESSAGE_KEY_VERSION_CONFLICT",
      );
    }
    if (encryptedPayload.nonce !== clientMessageId) {
      throw new AppError(
        "Identificador de mensagem inválido.",
        400,
        "MESSAGE_INVALID_NONCE",
      );
    }
    const inserted = await client.query<{
      id: string;
      encryptedPayload: EncryptedPayload;
      senderUserId: string;
      createdAt: Date;
    }>(
      `insert into public.message_entries (conversation_id, sender_user_id, client_message_id, encrypted_payload)
       values ($1, $2, $3, $4::jsonb)
       on conflict (sender_user_id, client_message_id) do nothing
       returning id, encrypted_payload as "encryptedPayload", sender_user_id as "senderUserId", created_at as "createdAt"`,
      [
        conversationId,
        viewerId,
        clientMessageId,
        JSON.stringify(encryptedPayload),
      ],
    );
    if (!inserted.rows[0]) {
      const existing = await client.query<{
        id: string;
        encryptedPayload: EncryptedPayload;
        senderUserId: string;
        createdAt: Date;
      }>(
        `select id, encrypted_payload as "encryptedPayload", sender_user_id as "senderUserId",
           created_at as "createdAt" from public.message_entries
         where sender_user_id = $1 and client_message_id = $2 and conversation_id = $3
          and encrypted_payload = $4::jsonb`,
        [
          viewerId,
          clientMessageId,
          conversationId,
          JSON.stringify(encryptedPayload),
        ],
      );
      if (!existing.rows[0]) {
        throw new AppError(
          "Identificador de mensagem já utilizado.",
          409,
          "MESSAGE_DUPLICATE_NONCE",
        );
      }
      await client.query("commit");
      return existing.rows[0];
    }
    if (attachmentId) {
      const linked = await client.query(
        `update public.message_attachments set linked_message_id = $1
         where id = $2 and conversation_id = $3 and owner_id = $4 and linked_message_id is null
         returning id`,
        [inserted.rows[0].id, attachmentId, conversationId, viewerId],
      );
      if (!linked.rowCount)
        throw new AppError(
          "Anexo inválido ou já utilizado.",
          409,
          "MESSAGE_ATTACHMENT_UNAVAILABLE",
        );
    }
    await client.query(
      `update public.message_conversations set updated_at = now() where id = $1`,
      [conversationId],
    );
    await client.query("commit");
    return inserted.rows[0];
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function markConversationRead(
  viewerId: string,
  conversationId: string,
  context: Context,
) {
  await ensureScopeEnabled(context);
  const client = await pool.connect();
  try {
    await requireConversation(client, conversationId, viewerId, context);
    await client.query(
      `update public.message_conversation_participants mine
          set last_read_at = unread.latest_created_at
         from (
           select max(created_at) as latest_created_at
             from public.message_entries
            where conversation_id = $1
              and sender_user_id <> $2
         ) unread
        where mine.conversation_id = $1
          and mine.user_id = $2
          and unread.latest_created_at is not null
          and mine.last_read_at < unread.latest_created_at`,
      [conversationId, viewerId],
    );
    return { ok: true };
  } finally {
    client.release();
  }
}

export type MessageContext = Context;
