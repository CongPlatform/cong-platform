import {
  apiGet,
  apiPost,
  apiTenantGet,
  apiTenantPatch,
  apiTenantPost,
  getStoredAuthToken,
} from "./api";
import { getStoredActiveOrganizationId } from "./organizationStorage";
import type {
  EncryptedPayload,
  MessageParticipantKey,
  MessagePublicKey,
} from "./messageCrypto";

export type MessageScope = "global" | "organization";
export interface MessageContact {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
}
export interface MessageConversation {
  id: string;
  peerId: string;
  peerName: string;
  peerUsername: string | null;
  avatarUrl: string | null;
  createdBy: string | null;
  contactStatus: "pending" | "accepted" | "rejected";
  lastMessageAt: string | null;
  unreadCount: number;
}
export interface MessageEntry {
  id: string;
  senderUserId: string;
  senderName: string;
  avatarUrl: string | null;
  encryptedPayload: EncryptedPayload | null;
  createdAt: string;
  deletedForAllAt: string | null;
}
export interface MessageMessageReceipt {
  peerLastReadAt: string | null;
  peerLastDeliveredAt: string | null;
}
export interface MessageModuleSettings {
  enabled: boolean;
  directMessagesEnabled: boolean;
  readReceiptsEnabled: boolean;
  canManage: boolean;
}
export interface MessageIdentity {
  publicKey: MessagePublicKey;
  keyVersion: number;
}
const prefix = (scope: MessageScope) => `/messages/${scope}`;
const get = <T>(scope: MessageScope, path: string) =>
  scope === "organization"
    ? apiTenantGet<T>(`${prefix(scope)}${path}`)
    : apiGet<T>(`${prefix(scope)}${path}`);
const post = <T>(scope: MessageScope, path: string, data?: unknown) =>
  scope === "organization"
    ? apiTenantPost<T>(`${prefix(scope)}${path}`, data)
    : apiPost<T>(`${prefix(scope)}${path}`, data);
export async function searchMessageContacts(
  scope: MessageScope,
  search: string,
) {
  const data = await get<{ users: MessageContact[] }>(
    scope,
    `/people?q=${encodeURIComponent(search)}`,
  );
  return data.users;
}
export function fetchConversations(scope: MessageScope) {
  return get<{ viewerId: string; conversations: MessageConversation[] }>(
    scope,
    "/conversations",
  );
}
export async function fetchGlobalMessageUnreadCount() {
  const response = await fetchConversations("global");
  return response.conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );
}
export async function beginConversation(
  scope: MessageScope,
  recipientUserId: string,
) {
  const response = await post<{ conversation: { id: string } }>(
    scope,
    "/conversations",
    { recipientUserId },
  );
  return response.conversation.id;
}
export async function respondToContactRequest(
  scope: MessageScope,
  conversationId: string,
  decision: "accepted" | "rejected",
) {
  return post<{ ok: boolean; contactStatus: string }>(
    scope,
    `/conversations/${conversationId}/contact`,
    { decision },
  );
}
export async function deleteMessage(
  scope: MessageScope,
  conversationId: string,
  messageId: string,
  mode: "me" | "everyone",
) {
  return post<{ ok: boolean }>(
    scope,
    `/conversations/${conversationId}/messages/${messageId}/delete`,
    { mode },
  );
}
export function fetchMessages(scope: MessageScope, conversationId: string) {
  return get<{ messages: MessageEntry[]; receipt: MessageMessageReceipt }>(
    scope,
    `/conversations/${conversationId}/messages`,
  );
}
export async function fetchConversationKeys(
  scope: MessageScope,
  conversationId: string,
) {
  const response = await get<{ keys: MessageParticipantKey[] }>(
    scope,
    `/conversations/${conversationId}/keys`,
  );
  return response.keys;
}
export async function sendMessage(
  scope: MessageScope,
  conversationId: string,
  clientMessageId: string,
  encryptedPayload: EncryptedPayload,
  attachmentId?: string,
) {
  const response = await post<{ message: MessageEntry }>(
    scope,
    `/conversations/${conversationId}/messages`,
    { clientMessageId, encryptedPayload, attachmentId },
  );
  return response.message;
}
export function acknowledgeMessages(
  scope: MessageScope,
  conversationId: string,
) {
  return post<{ ok: boolean }>(scope, `/conversations/${conversationId}/read`);
}
export async function getMessageIdentity() {
  return apiGet<{ viewerId: string; identity: MessageIdentity | null }>(
    "/messages/identity",
  );
}
export async function registerMessageIdentity(publicKey: MessagePublicKey) {
  const result = await apiPost<{ identity: MessageIdentity }>(
    "/messages/identity",
    { publicKey },
  );
  return result.identity;
}
export async function resetMessageIdentity(publicKey: MessagePublicKey) {
  const result = await apiPost<{ identity: MessageIdentity }>(
    "/messages/identity/reset",
    {
      publicKey,
      confirmation: "PERDER_HISTORICO",
    },
  );
  return result.identity;
}
export async function fetchMessageSettings() {
  const response = await apiTenantGet<{ settings: MessageModuleSettings }>(
    "/messages/organization/settings",
  );
  return response.settings;
}
export async function saveMessageSettings(
  changes: Partial<Omit<MessageModuleSettings, "canManage">>,
) {
  const response = await apiTenantPatch<{ settings: MessageModuleSettings }>(
    "/messages/organization/settings",
    changes,
  );
  return response.settings;
}

const apiBase = (
  import.meta.env.VITE_API_URL?.trim() || (import.meta.env.DEV ? "/api" : "")
).replace(/\/$/, "");
export async function uploadEncryptedAttachment(
  scope: MessageScope,
  conversationId: string,
  bytes: Blob,
) {
  const data = new FormData();
  data.append("file", bytes, "encrypted.bin");
  const token = getStoredAuthToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (scope === "organization") {
    const organization = getStoredActiveOrganizationId();
    if (organization) headers["X-Organization-Id"] = organization;
  }
  const response = await fetch(
    `${apiBase}${prefix(scope)}/conversations/${conversationId}/attachments`,
    {
      method: "POST",
      headers,
      body: data,
    },
  );
  const result = (await response.json()) as {
    attachmentId?: string;
    error?: string;
  };
  if (!response.ok || !result.attachmentId)
    throw new Error(result.error || "Falha ao enviar o anexo.");
  return result.attachmentId;
}
export async function downloadEncryptedAttachment(
  scope: MessageScope,
  conversationId: string,
  attachmentId: string,
) {
  return get<{ ciphertext: string }>(
    scope,
    `/conversations/${conversationId}/attachments/${attachmentId}`,
  );
}
