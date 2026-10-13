import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react";
import { FiArrowLeft, FiBold, FiCamera, FiCheckSquare, FiCopy, FiCornerUpLeft, FiFile, FiItalic, FiMessageCircle, FiMic, FiPaperclip, FiSearch, FiSend, FiSettings, FiShield, FiTrash2, FiUsers, FiVideo, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import { prepareMessageFile } from "./MessageMediaTools";
import MessageImageEditor from "./MessageImageEditor";
import InlineCameraCapture from "./InlineCameraCapture";
import InlineVoiceRecorder from "./InlineVoiceRecorder";
import MessageAttachmentDisplay from "./MessageAttachmentDisplay";
import { MESSAGE_EMOJIS, parseChatContent, serializeText, type ChatReply } from "./messageContent";
import { getStoredAuthToken } from "../../../services/api";
import { supabase } from "../../../services/supabase";
import { encryptAttachment, readSecureAttachment } from "../../../services/messageAttachments";

import { useWorkspace } from "../../../contexts/workspace-context";
import { useAuth } from "../../../contexts/auth-context";
import {
  acceptPeerTrust,
  checkPeerTrust,
  decryptMessage,
  encryptMessage,
  generateDeviceIdentity,
  identityMatches,
  readDeviceIdentity,
  saveDeviceIdentity,
  type MessageParticipantKey,
} from "../../../services/messageCrypto";
import {
  acknowledgeMessages,
  beginConversation,
  deleteMessage, uploadEncryptedAttachment, respondToContactRequest,
  fetchConversations,
  fetchConversationKeys,
  fetchMessages,
  fetchMessageSettings,
  getMessageIdentity,
  registerMessageIdentity,
  resetMessageIdentity,
  saveMessageSettings,
  searchMessageContacts,
  sendMessage,
  type MessageContact,
  type MessageConversation,
  type MessageEntry,
  type MessageModuleSettings,
  type MessageScope,
} from "../../../services/messagesService";
import styles from "./MessagesPage.module.css";

type UiMessage = MessageEntry & {
  body: string;
  status: "sending" | "sent" | "delivered" | "read" | "error";
  optimistic?: boolean;
};

export default function MessagesPage({ scope }: { scope: MessageScope }) {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const organizationId = workspace.kind === "organization" ? workspace.organization.id : null;

  return (
    <MessagesScreen
      key={`${scope}:${organizationId}:${user?.id}`}
      scope={scope}
      organizationId={organizationId}
      authUserId={user?.id ?? null}
    />
  );
}

function MessagesScreen({
  scope,
  organizationId,
  authUserId,
}: {
  scope: MessageScope;
  organizationId: string | null;
  authUserId: string | null;
}) {
  const workspaceValid = scope === "global" || organizationId !== null;
  const [settings, setSettings] = useState<MessageModuleSettings | null>(null);
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [identity, setIdentity] = useState<Awaited<ReturnType<typeof generateDeviceIdentity>> | null>(null);
  const [identityIssue, setIdentityIssue] = useState<string | null>(null);
  const [peerKeys, setPeerKeys] = useState<MessageParticipantKey[]>([]);
  const [peerTrusted, setPeerTrusted] = useState(true);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [peerLastDeliveredAt, setPeerLastDeliveredAt] = useState<string | null>(null);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [multiSelect, setMultiSelect] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatReply | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ messages: UiMessage[]; mode: "me" | "everyone" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"device" | "peer" | null>(null);
  const [pendingContact, setPendingContact] = useState<MessageContact | null>(null);
  const [contactIntroduction, setContactIntroduction] = useState("");
  const [imageToEdit, setImageToEdit] = useState<File | null>(null);
  const [captureMode, setCaptureMode] = useState<"photo" | "video" | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [selectionToolbar, setSelectionToolbar] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentAt = useRef(0);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "offline">("connecting");
  const [mobileListVisible, setMobileListVisible] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldScrollToEnd = useRef(true);
  const decryptedCache = useRef(new Map<string, string>());
  const requestSequence = useRef(0);
  const activeRef = useRef<string | null>(null);

  const enabled = workspaceValid && (scope === "global" || (settings?.enabled && settings.directMessagesEnabled));
  const current = conversations.find((conversation) => conversation.id === activeId);
  const searchMode = search.trim().length >= 2;
  const requestPending = current?.contactStatus === "pending";
  const outgoingRequest = requestPending && current?.createdBy === viewerId;
  const incomingRequest = requestPending && current?.createdBy !== viewerId;
  const requestAlreadySent = requestPending && messages.some((message) => message.senderUserId === viewerId);
  const canWrite = current?.contactStatus === "accepted" || (outgoingRequest && !requestAlreadySent);
  const canAttach = current?.contactStatus === "accepted";
  const selectedMessages = messages.filter((message) => selectedMessageIds.includes(message.id) && !message.optimistic);
  const visibleMessages = messages.filter((message) => !parseChatContent(message.body).reaction);
  const reactions = useMemo(() => {
    const latest = new Map<string, { target: string; emoji: string; user: string; remove: boolean }>();
    for (const item of messages) {
      if (item.deletedForAllAt) continue;
      const reaction = parseChatContent(item.body).reaction;
      if (reaction) latest.set(`${reaction.target}:${reaction.emoji}:${item.senderUserId}`, { target: reaction.target, emoji: reaction.emoji, user: item.senderUserId, remove: Boolean(reaction.remove) });
    }
    const result = new Map<string, { emoji: string; count: number; own: boolean }[]>();
    for (const event of latest.values()) {
      if (event.remove) continue;
      const list = result.get(event.target) || [];
      const existing = list.find((part) => part.emoji === event.emoji);
      if (existing) { existing.count++; if (event.user === viewerId) existing.own = true; }
      else list.push({ emoji: event.emoji, count: 1, own: event.user === viewerId });
      result.set(event.target, list);
    }
    return result;
  }, [messages, viewerId]);
  const recipientHasKey = peerKeys.some((person) => person.userId === current?.peerId && Boolean(person.publicKey));

  const loadIdentity = useCallback(async () => {
    setIdentityIssue(null);
    const remote = await getMessageIdentity();
    let local = await readDeviceIdentity(remote.viewerId);

    if (!local && remote.identity) {
      setIdentity(null);
      setIdentityIssue("Suas mensagens seguras estão vinculadas a outro navegador. Para usar este dispositivo, será necessário substituir a chave atual.");
      return;
    }

    if (!local) {
      local = await generateDeviceIdentity();
      await saveDeviceIdentity(remote.viewerId, local);
    }

    const active = remote.identity ?? (await registerMessageIdentity(local.publicKey));
    if (!active || !identityMatches(local.publicKey, active.publicKey)) {
      setIdentity(null);
      setIdentityIssue("Não foi possível validar a proteção desta conta neste dispositivo. Revise o acesso ou substitua a chave.");
      return;
    }

    setIdentity(local);
    setViewerId(remote.viewerId);
  }, []);

  const inspectKeys = useCallback(
    async (conversationId: string, nextViewerId?: string | null) => {
      const effectiveViewerId = nextViewerId ?? viewerId;
      if (!effectiveViewerId) return null;
      const keys = await fetchConversationKeys(scope, conversationId);
      const peer = keys.find((item) => item.userId !== effectiveViewerId);
      setPeerKeys(keys);

      if (!peer?.publicKey) {
        setPeerTrusted(true);
        return keys;
      }

      const trust = await checkPeerTrust(effectiveViewerId, peer.userId, peer.publicKey);
      if (activeRef.current === conversationId) {
        setPeerTrusted(trust.trusted);
      }
      return keys;
    },
    [scope, viewerId],
  );

  const refreshConversations = useCallback(async () => {
    if (scope === "organization" && !organizationId) return;
    const response = await fetchConversations(scope);
    setViewerId(response.viewerId);
    setConversations(response.conversations);
    return response;
  }, [scope, organizationId]);

  const refreshMessages = useCallback(
    async (conversationId: string) => {
      if (scope === "organization" && !organizationId) return;
      const requestId = ++requestSequence.current;
      const response = await fetchMessages(scope, conversationId);
      if (requestId !== requestSequence.current || activeRef.current !== conversationId) return;
      if (!identity || !viewerId) return;

      const nextMessages = await Promise.all(
        response.messages.map(async (message) => {
          if (message.deletedForAllAt || !message.encryptedPayload) {
            decryptedCache.current.delete(message.id);
            return { ...message, body: "Mensagem apagada", status: "sent" as const } satisfies UiMessage;
          }
          try {
            let body = decryptedCache.current.get(message.id);
            if (body === undefined) {
              body = await decryptMessage(message.encryptedPayload, conversationId, viewerId, identity.privateKey);
              decryptedCache.current.set(message.id, body);
            }
            return {
              ...message,
              body,
              status: statusForMessage(message, viewerId, response.receipt.peerLastReadAt, response.receipt.peerLastDeliveredAt),
            } satisfies UiMessage;
          } catch {
            return {
              ...message,
              body: "Não foi possível abrir esta mensagem neste dispositivo.",
              status: statusForMessage(message, viewerId, response.receipt.peerLastReadAt, response.receipt.peerLastDeliveredAt),
            } satisfies UiMessage;
          }
        }),
      );

      if (requestId !== requestSequence.current || activeRef.current !== conversationId) return;
      setPeerLastReadAt(response.receipt.peerLastReadAt);
      setPeerLastDeliveredAt(response.receipt.peerLastDeliveredAt);
      setMessages((previous) => {
        const pending = previous.filter((item) => item.optimistic || item.status === "error");
        const mergedPending = pending.filter(
          (item) => !nextMessages.some((serverItem) =>
            serverItem.senderUserId === item.senderUserId
            && serverItem.encryptedPayload?.nonce === item.encryptedPayload?.nonce,
          ),
        );
        return [...nextMessages, ...mergedPending].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
      });
      void acknowledgeMessages(scope, conversationId).then(() => {
        window.dispatchEvent(new Event("cong:messages-local-change"));
      }).catch(() => undefined);
    },
    [scope, organizationId, identity, viewerId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!workspaceValid || (scope === "organization" && !organizationId)) return;

    async function initialize() {
      try {
        const nextSettings = scope === "organization" ? await fetchMessageSettings() : null;
        if (cancelled) return;
        setSettings(nextSettings);

        if (scope === "global" || (nextSettings?.enabled && nextSettings.directMessagesEnabled)) {
          await loadIdentity();
          const response = await fetchConversations(scope);
          if (!cancelled) {
            setConversations(response.conversations);
            setViewerId(response.viewerId);
          }
        }
      } catch (reason) {
        if (!cancelled) setError(messageFor(reason));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [scope, organizationId, workspaceValid, loadIdentity]);

  useEffect(() => {
    if (!enabled || !identity || !authUserId) return;
    const onRealtimeEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ conversationId?: string }>).detail;
      void refreshConversations().catch(() => undefined);
      const active = activeRef.current;
      if (active && (!detail?.conversationId || detail.conversationId === active)) {
        void refreshMessages(active).catch((error: unknown) => console.warn("Atualização de mensagens falhou", error));
      }
    };
    const onStatus = (event: Event) => {
      const status = (event as CustomEvent<"connecting" | "connected" | "offline">).detail;
      setRealtimeStatus(status);
    };
    window.addEventListener("cong:messages-event", onRealtimeEvent);
    window.addEventListener("cong:messages-status", onStatus);
    return () => {
      window.removeEventListener("cong:messages-event", onRealtimeEvent);
      window.removeEventListener("cong:messages-status", onStatus);
    };
  }, [enabled, identity, authUserId, refreshConversations, refreshMessages]);

  useEffect(() => {
    if (!enabled || !identity) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshConversations().catch(() => undefined);
      if (activeRef.current) {
        void refreshMessages(activeRef.current).catch(() => undefined);
        if (!recipientHasKey) void inspectKeys(activeRef.current).catch(() => undefined);
      }
    }, realtimeStatus === "connected" ? 7000 : 3000);
    return () => window.clearInterval(timer);
  }, [enabled, identity, refreshConversations, refreshMessages, realtimeStatus, recipientHasKey, inspectKeys]);

  // Presence and typing are ephemeral: they never enter the message database.
  useEffect(() => {
    if (!activeId || !viewerId || !enabled || current?.contactStatus !== "accepted") return;
    let closed = false;
    const channel = supabase.channel(`cong:conversation:${activeId}`, {
      config: { private: true, presence: { key: viewerId } },
    });
    presenceChannelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => {
        if (closed) return;
        const members = channel.presenceState();
        setPeerOnline(Object.entries(members).some(([key, entries]) => key !== viewerId && entries.length > 0));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (closed || payload.userId === viewerId) return;
        setPeerTyping(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setPeerTyping(false), 2400);
      });
    async function connect() {
      const token = getStoredAuthToken();
      if (!token) return;
      await supabase.realtime.setAuth(token);
      if (closed) return;
      channel.subscribe((status) => {
        if (!closed && status === "SUBSCRIBED") void channel.track({ userId: viewerId });
      });
    }
    void connect().catch(() => undefined);
    return () => {
      closed = true;
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      presenceChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [activeId, viewerId, enabled, current?.contactStatus]);

  useEffect(() => {
    if (!searchMode || !enabled || (scope === "organization" && !organizationId)) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchMessageContacts(scope, search)
        .then((result) => {
          if (!cancelled) setContacts(result);
        })
        .catch((reason) => {
          if (!cancelled) setError(messageFor(reason));
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scope, organizationId, search, enabled, searchMode]);

  useEffect(() => {
    const container = listRef.current;
    if (container && shouldScrollToEnd.current) container.scrollTop = container.scrollHeight;
  }, [messages.length, activeId, peerTyping]);

  const openConversation = useCallback(async (conversationId: string) => {
    activeRef.current = conversationId;
    shouldScrollToEnd.current = true;
    ++requestSequence.current;
    decryptedCache.current.clear();
    setActiveId(conversationId);
    setMessages([]);
    setError(null);
    setPeerTrusted(true);
    setPeerLastReadAt(null);
    setPeerLastDeliveredAt(null);
    setPeerTyping(false);
    setPeerOnline(false);
    setSelectedMessageIds([]);
    setMultiSelect(false);
    setReplyingTo(null);
    setPendingFile(null);
    setVoiceMode(false);
    setCaptureMode(null);
    setMobileListVisible(false);
    try {
      await Promise.all([refreshMessages(conversationId), inspectKeys(conversationId)]);
    } catch (reason) {
      setError(messageFor(reason));
    }
  }, [inspectKeys, refreshMessages]);

  async function startConversation(recipientUserId: string, introduction: string) {
    if (busy) return;
    let missingRecipientKey = false;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const conversationId = await beginConversation(scope, recipientUserId);
      if (introduction.trim() && identity && viewerId) {
        const keys = await fetchConversationKeys(scope, conversationId);
        if (keys.length === 2 && keys.every((person) => Boolean(person.publicKey && person.keyVersion))) {
          const nonce = crypto.randomUUID();
          const encrypted = await encryptMessage(introduction.trim(), conversationId, nonce, keys);
          await sendMessage(scope, conversationId, nonce, encrypted);
        } else {
          missingRecipientKey = true;
        }
      }
      setPendingContact(null);
      setContactIntroduction("");
      setSearch("");
      setContacts([]);
      await refreshConversations();
      await openConversation(conversationId);
      if (missingRecipientKey) setNotice("Solicitação enviada. O texto de apresentação não pôde ser entregue porque o contato ainda não ativou as mensagens. Você poderá escrever quando ele ativar.");
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  }

  function pickFile(file: File) {
    if (!canAttach) { setError("Aceite o contato antes de enviar anexos."); return; }
    if (file.type.startsWith("image/") && file.type !== "image/svg+xml" && file.type !== "image/gif") {
      setImageToEdit(file);
      return;
    }
    void prepareMessageFile(file).then(setPendingFile).catch((reason) => setError(messageFor(reason)));
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(event.clipboardData.files || []).find((item) => item.type.startsWith("image/"));
    if (file) { event.preventDefault(); pickFile(file); }
  }

  function onSelectionChange() {
    const field = composerRef.current;
    setSelectionToolbar(Boolean(field && field.selectionStart < field.selectionEnd));
  }

  function toggleSelection(id: string, additive = false) {
    setSelectedMessageIds((previous) => {
      if (multiSelect || additive) return previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id];
      return previous.length === 1 && previous[0] === id ? [] : [id];
    });
  }

  function clearSelection() { setSelectedMessageIds([]); setMultiSelect(false); }

  async function copySelectedMessages() {
    const text = selectedMessages.filter((item) => !item.deletedForAllAt && !readSecureAttachment(item.body))
      .map((item) => parseChatContent(item.body).text).filter(Boolean).join("\n");
    if (!text) { setNotice("Selecione mensagens de texto para copiar."); return; }
    try { await navigator.clipboard.writeText(text); clearSelection(); }
    catch { setError("Não foi possível copiar as mensagens."); }
  }

  function replyToMessage(item: UiMessage) {
    if (!canWrite || !recipientHasKey || !peerTrusted || item.deletedForAllAt || item.optimistic) return;
    const parsed = parseChatContent(item.body);
    const attachment = readSecureAttachment(item.body);
    setReplyingTo({ id: item.id, author: item.senderUserId === viewerId ? "Você" : item.senderName,
      preview: (attachment ? (attachment.caption || `📎 ${attachment.name}`) : parsed.text).slice(0, 180) });
    clearSelection();
    composerRef.current?.focus();
  }

  async function toggleReaction(item: UiMessage, emoji: string) {
    if (!activeId || !viewerId || !identity || busy || !peerTrusted || !recipientHasKey || current?.contactStatus !== "accepted" || item.optimistic || item.deletedForAllAt) return;
    const own = reactions.get(item.id)?.some((value) => value.emoji === emoji && value.own) ?? false;
    setBusy(true);
    setError(null);
    try {
      const nonce = crypto.randomUUID();
      const content = JSON.stringify({ kind: "cong-reaction-v1", target: item.id, emoji, remove: own });
      const encryptedPayload = await encryptMessage(content, activeId, nonce, peerKeys);
      const saved = await sendMessage(scope, activeId, nonce, encryptedPayload);
      decryptedCache.current.set(saved.id, content);
      setMessages((previous) => [...previous, { ...saved, body: content, status: "sent" }]);
      clearSelection();
      window.dispatchEvent(new Event("cong:messages-local-change"));
    } catch (reason) { setError(messageFor(reason)); }
    finally { setBusy(false); }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPreparedMessage();
  }

  async function sendPreparedMessage(fileOverride?: File): Promise<boolean> {
    if (!activeId || !viewerId || !identity || busy || !peerTrusted || !canWrite || !recipientHasKey) return false;
    if (!draft.trim() && !pendingFile && !fileOverride) return false;
    if ((pendingFile || fileOverride) && !canAttach) return false;

    const clientMessageId = crypto.randomUUID();
    const previousDraft = draft;
    const previousFile = fileOverride ?? pendingFile;
    const previousReply = replyingTo;
    const text = fileOverride ? "" : draft.trim();
    const preview = previousFile ? `📎 ${previousFile.name}` : serializeText(text, previousReply);
    const optimistic: UiMessage = {
      id: `optimistic:${clientMessageId}`, senderUserId: viewerId, senderName: "Você", avatarUrl: null,
      encryptedPayload: {
        version: 1, nonce: clientMessageId, iv: "", ciphertext: "",
        ephemeralPublicKey: { kty: "EC", crv: "P-256", x: "", y: "" }, hkdfSalt: "", boxes: [],
      },
      createdAt: new Date().toISOString(), deletedForAllAt: null, body: preview,
      status: "sending", optimistic: true,
    };

    if (!fileOverride) { setDraft(""); setPendingFile(null); setReplyingTo(null); }
    shouldScrollToEnd.current = true;
    setMessages((previous) => [...previous, optimistic]);
    setBusy(true);
    try {
      let content = serializeText(text, previousReply);
      let attachmentId: string | undefined;
      if (previousFile) {
        const encryptedFile = await encryptAttachment(previousFile);
        attachmentId = await uploadEncryptedAttachment(scope, activeId, encryptedFile.bytes);
        const caption = !fileOverride && previousFile.type.startsWith("image/") ? text : "";
        content = JSON.stringify({ ...encryptedFile.metadata, id: attachmentId, ...(caption ? { caption } : {}), ...(previousReply ? { reply: previousReply } : {}) });
      }
      const encryptedPayload = await encryptMessage(content, activeId, clientMessageId, peerKeys);
      const saved = await sendMessage(scope, activeId, clientMessageId, encryptedPayload, attachmentId);
      decryptedCache.current.set(saved.id, content);
      if (fileOverride) setReplyingTo(null);
      setMessages((previous) => {
        const alreadySaved = previous.some((message) => message.id === saved.id);
        return previous.flatMap((message) => {
          if (message.id === optimistic.id) {
            return alreadySaved ? [] : [{ ...saved, body: content, status: statusForMessage(saved, viewerId, peerLastReadAt, peerLastDeliveredAt) }];
          }
          return [message];
        });
      });
      void refreshConversations().catch(() => undefined);
      window.dispatchEvent(new Event("cong:messages-local-change"));
      return true;
    } catch (reason) {
      setMessages((previous) => previous.map((message) => message.id === optimistic.id ? { ...message, status: "error" } : message));
      if (!fileOverride) { setDraft(previousDraft); setPendingFile(previousFile); setReplyingTo(previousReply); }
      setError(messageFor(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function decideRequest(decision: "accepted" | "rejected") {
    if (!activeId || busy) return;
    setBusy(true); setError(null);
    try {
      await respondToContactRequest(scope, activeId, decision);
      await refreshConversations();
      if (decision === "rejected") { activeRef.current = null; setActiveId(null); setMessages([]); }
    } catch (reason) { setError(messageFor(reason)); }
    finally { setBusy(false); }
  }

  async function removeMessages(items: UiMessage[], mode: "me" | "everyone") {
    if (!activeId || busy || items.length === 0 || items.some((item) => item.optimistic)) return;
    setBusy(true); setError(null);
    let removed = 0;
    try {
      for (const item of items) {
        try {
          await deleteMessage(scope, activeId, item.id, mode);
          decryptedCache.current.delete(item.id);
          removed++;
        } catch (reason) {
          setError(`${removed} de ${items.length} mensagens apagadas. ${messageFor(reason)}`);
          break;
        }
      }
      clearSelection();
      setConfirmDelete(null);
      await refreshMessages(activeId);
      if (removed === items.length) setNotice(removed === 1 ? "Mensagem apagada." : `${removed} mensagens apagadas.`);
    } finally { setBusy(false); }
  }

  function formatSelection(marker: string) {
    const field = composerRef.current;
    const start = field?.selectionStart ?? draft.length;
    const end = field?.selectionEnd ?? draft.length;
    const selection = draft.slice(start, end) || "texto";
    setDraft(draft.slice(0, start) + marker + selection + marker + draft.slice(end));
    window.requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + marker.length, start + marker.length + selection.length);
    });
  }

  function onDraftChange(value: string) {
    setDraft(value);
    if (!viewerId || !presenceChannelRef.current || Date.now() - lastTypingSentAt.current < 1200) return;
    lastTypingSentAt.current = Date.now();
    void presenceChannelRef.current.send({ type: "broadcast", event: "typing", payload: { userId: viewerId } });
  }

  async function toggleSetting(key: "enabled" | "directMessagesEnabled", value: boolean) {
    if (!settings?.canManage) return;
    setBusy(true);
    setError(null);
    try {
      const next = await saveMessageSettings({ [key]: value });
      setSettings(next);
      if (next.enabled && next.directMessagesEnabled) {
        await loadIdentity();
        await refreshConversations();
      } else {
        activeRef.current = null;
        setActiveId(null);
        setMessages([]);
        setConversations([]);
      }
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  }

  async function replaceDevice() {
    setBusy(true);
    setError(null);
    try {
      const remote = await getMessageIdentity();
      const replacement = await generateDeviceIdentity();
      await resetMessageIdentity(replacement.publicKey);
      await saveDeviceIdentity(remote.viewerId, replacement);
      setIdentity(replacement);
      setIdentityIssue(null);
      setViewerId(remote.viewerId);
      activeRef.current = null;
      setActiveId(null);
      setMessages([]);
      setPeerKeys([]);
      await refreshConversations();
    } catch (reason) {
      setError(messageFor(reason));
    } finally {
      setBusy(false);
    }
  }

  async function trustChangedPeer() {
    if (!viewerId || !current) return;
    const peer = peerKeys.find((item) => item.userId === current.peerId);
    if (!peer?.publicKey) return;
    await acceptPeerTrust(viewerId, peer.userId, peer.publicKey);
    setPeerTrusted(true);
    setConfirmAction(null);
  }

  const listTitle = useMemo(() => (searchMode ? "Resultados" : "Conversas"), [searchMode]);

  if (!workspaceValid) {
    return (
      <main className={styles.standalonePage}>
        <h1>Mensagens internas</h1>
        <p>Selecione uma organização para acessar as conversas deste ambiente.</p>
        <Link to="/app/mensagens">Ir para mensagens da comunidade</Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {error ? (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setError(null)}>
            <FiX />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className={styles.infoBanner} role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setNotice(null)}><FiX /></button>
        </div>
      ) : null}

      {identityIssue ? (
        <div className={styles.alertCard} role="alert">
          <div>
            <strong>Não foi possível liberar suas mensagens seguras neste dispositivo.</strong>
            <p>{identityIssue}</p>
          </div>
          <button type="button" className={styles.secondaryAction} disabled={busy} onClick={() => setConfirmAction("device")}>
            Substituir dispositivo
          </button>
        </div>
      ) : null}

      {scope === "organization" && settings && showSettings ? (
        <section className={styles.settingsPanel} aria-label="Configurações do módulo de mensagens">
          <div className={styles.settingsHeader}>
            <div>
              <p className={styles.eyebrow}>Módulo</p>
              <h2>Mensagens internas</h2>
            </div>
            <button type="button" className={styles.iconOnlyButton} onClick={() => setShowSettings(false)} aria-label="Fechar configurações">
              <FiX />
            </button>
          </div>
          {([
            ["enabled", "Ativar módulo de mensagens"],
            ["directMessagesEnabled", "Permitir conversas diretas"],
          ] as const).map(([key, label]) => (
            <label key={key} className={styles.settingRow}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={settings[key]}
                disabled={!settings.canManage || busy}
                onChange={(event) => void toggleSetting(key, event.target.checked)}
              />
            </label>
          ))}
        </section>
      ) : null}

      {loading ? (
        <section className={styles.emptyState}>
          <FiMessageCircle aria-hidden="true" />
          <h2>Carregando mensagens...</h2>
        </section>
      ) : !enabled ? (
        <section className={styles.emptyState}>
          <FiMessageCircle aria-hidden="true" />
          <h2>Mensagens indisponíveis</h2>
          <p>
            {scope === "organization"
              ? settings?.canManage
                ? "Ative o módulo para liberar as conversas internas desta organização."
                : "Este módulo ainda não foi ativado para a organização."
              : "As mensagens não estão disponíveis agora."}
          </p>
          {scope === "organization" && settings?.canManage ? (
            <button type="button" className={styles.primaryAction} onClick={() => setShowSettings(true)}>
              <FiSettings /> Configurar módulo
            </button>
          ) : null}
        </section>
      ) : !identity ? (
        <section className={styles.emptyState}>
          <FiShield aria-hidden="true" />
          <h2>Prepare seu dispositivo</h2>
          <p>Finalize a proteção das suas mensagens para começar a conversar.</p>
        </section>
      ) : (
        <section className={styles.chatShell} aria-label="Mensagens">
          <aside className={`${styles.sidebar} ${!mobileListVisible ? styles.sidebarHiddenMobile : ""}`}>
            <div className={styles.sidebarHeader}>
              <div>
                <p className={styles.eyebrow}>{scope === "global" ? "Comunidade CONG" : "Ambiente interno"}</p>
                <h1>Mensagens</h1>
              </div>
              {scope === "organization" && settings?.canManage ? (
                <button type="button" className={styles.iconOnlyButton} onClick={() => setShowSettings(true)} aria-label="Configurar mensagens internas">
                  <FiSettings />
                </button>
              ) : null}
            </div>

            <div className={styles.searchWrap}>
              <FiSearch aria-hidden="true" />
              <input
                aria-label="Buscar pessoas para conversar"
                placeholder="Buscar pessoas"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  if (!event.target.value.trim()) setContacts([]);
                }}
                maxLength={100}
              />
            </div>

            <div className={styles.sectionTitleRow}>
              <span>{listTitle}</span>
              {!searchMode ? <small>{conversations.length}</small> : null}
            </div>

            <div className={styles.listArea}>
              {searchMode ? (
                contacts.length > 0 ? (
                  contacts.map((contact) => (
                    <button
                      className={styles.conversationItem}
                      key={contact.id}
                      disabled={busy}
                      type="button"
                      onClick={() => { setPendingContact(contact); setContactIntroduction(""); }}
                    >
                      <UserAvatar name={contact.name} url={contact.avatarUrl} className={styles.avatar} />
                      <span className={styles.conversationMeta}>
                        <strong>{contact.name}</strong>
                        <small>{contact.username ? `@${contact.username}` : "Iniciar conversa"}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className={styles.listHint}>Nenhuma pessoa encontrada.</div>
                )
              ) : conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`${styles.conversationItem} ${activeId === conversation.id ? styles.conversationItemActive : ""}`}
                    onClick={() => void openConversation(conversation.id)}
                  >
                    <UserAvatar name={conversation.peerName} url={conversation.avatarUrl} className={styles.avatar} />
                    <span className={styles.conversationMeta}>
                      <strong>{conversation.peerName}</strong>
                      <small>{conversation.contactStatus === "pending" ? (conversation.createdBy === viewerId ? "Solicitação enviada" : "Solicitação de contato") : conversation.contactStatus === "rejected" ? "Solicitação recusada" : conversation.lastMessageAt ? "Conversa ativa" : "Comece a conversar"}</small>
                    </span>
                    <span className={styles.conversationAside}>
                      {conversation.lastMessageAt ? <time>{formatConversationTime(conversation.lastMessageAt)}</time> : null}
                      {conversation.unreadCount > 0 ? <b>{Math.min(99, conversation.unreadCount)}</b> : null}
                    </span>
                  </button>
                ))
              ) : (
                <div className={styles.listHint}>Encontre alguém para iniciar a primeira conversa.</div>
              )}
            </div>
          </aside>

          <div className={`${styles.thread} ${mobileListVisible ? styles.threadHiddenMobile : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragActive(false); }}
            onDrop={handleDrop}>
            {activeId && current ? (
              <>
                <header className={styles.threadHeader}>
                  <div className={styles.threadIdentity}>
                    <button type="button" className={styles.backButton} onClick={() => setMobileListVisible(true)} aria-label="Voltar para a lista de conversas">
                      <FiArrowLeft />
                    </button>
                    <UserAvatar name={current.peerName} url={current.avatarUrl} className={styles.avatar} />
                    <div>
                      <strong>{current.peerName}</strong>
                      <small>{peerOnline ? <span className={styles.onlineLabel} title="Com esta conversa aberta"><i /> Online</span> : <span className={styles.offlineLabel} title="Sem esta conversa aberta"><i /> Offline</span>}</small>
                    </div>
                  </div>
                  <span className={styles.securityChip}><FiShield /> Criptografia de ponta a ponta</span>
                </header>

                <div className={styles.threadNotices}>
                {selectedMessageIds.length > 0 ? (
                  <div className={styles.selectedToolbar} role="toolbar" aria-label="Ações das mensagens selecionadas">
                    <strong>{selectedMessageIds.length} {selectedMessageIds.length === 1 ? "mensagem selecionada" : "mensagens selecionadas"}</strong>
                    {selectedMessages.length === 1 && !multiSelect ? (
                      <><button type="button" onClick={() => replyToMessage(selectedMessages[0])}><FiCornerUpLeft /> Responder</button>
                        <span className={styles.reactionQuick} aria-label="Reagir à mensagem">{MESSAGE_EMOJIS.map((emoji) => (
                          <button type="button" key={emoji} disabled={busy} aria-label={`Reagir com ${emoji}`} onClick={() => void toggleReaction(selectedMessages[0], emoji)}>{emoji}</button>
                        ))}</span></>
                    ) : null}
                    <button type="button" onClick={() => setMultiSelect(true)} disabled={multiSelect}><FiCheckSquare /> Selecionar várias</button>
                    <button type="button" onClick={() => void copySelectedMessages()}><FiCopy /> Copiar</button>
                    <button type="button" onClick={() => setConfirmDelete({ messages: selectedMessages, mode: "me" })}><FiTrash2 /> Apagar para mim</button>
                    {selectedMessages.length > 0 && selectedMessages.every((item) => item.senderUserId === viewerId && !item.deletedForAllAt && Date.now() - new Date(item.createdAt).getTime() <= 15 * 60_000)
                      ? <button type="button" onClick={() => setConfirmDelete({ messages: selectedMessages, mode: "everyone" })}><FiTrash2 /> Apagar para todos</button> : null}
                    <button type="button" onClick={clearSelection} aria-label="Cancelar seleção"><FiX /></button>
                  </div>
                ) : null}
                {requestPending ? (
                  <div className={styles.requestBanner}>
                    {incomingRequest ? (
                      <><div><strong>Solicitação de contato</strong><span>Você pode aceitar o contato para começar a conversar.</span></div>
                        <div className={styles.requestActions}>
                          <button type="button" disabled={busy} onClick={() => void decideRequest("rejected")}>Recusar</button>
                          <button type="button" disabled={busy} onClick={() => void decideRequest("accepted")}>Aceitar contato</button>
                        </div></>
                    ) : (
                      <span>{requestAlreadySent ? "Aguardando a pessoa aceitar sua solicitação." : !recipientHasKey ? "Solicitação enviada. Você poderá enviar a primeira mensagem quando o contato ativar as mensagens." : "Envie uma mensagem de texto para solicitar contato."}</span>
                    )}
                  </div>
                ) : null}
                {current.contactStatus === "rejected" ? <div className={styles.requestBanner}>Esta solicitação foi recusada.</div> : null}
                {!peerTrusted ? (
                  <div className={styles.inlineNotice}>
                    <span>Por segurança, confirme a identidade deste contato antes de enviar novas mensagens.</span>
                    <button type="button" className={styles.secondaryAction} onClick={() => setConfirmAction("peer")}>
                      Confirmar contato
                    </button>
                  </div>
                ) : null}

                </div>

                <div className={styles.messageList} ref={listRef} role="log" aria-live="polite" onScroll={(event) => {
                  const el = event.currentTarget;
                  shouldScrollToEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
                }}>
                  {visibleMessages.length === 0 ? (
                    <div className={styles.threadPlaceholder}>
                      <FiUsers aria-hidden="true" />
                      <h2>Sua conversa começa aqui</h2>
                      <p>Envie a primeira mensagem para continuar.</p>
                    </div>
                  ) : (
                    visibleMessages.map((message, index) => {
                      const mine = message.senderUserId === viewerId;
                      const attachment = readSecureAttachment(message.body);
                      const parsed = parseChatContent(message.body);
                      const messageReactions = reactions.get(message.id) || [];
                      const day = new Date(message.createdAt).toDateString();
                      const priorDay = index ? new Date(visibleMessages[index - 1].createdAt).toDateString() : null;
                      return (
                        <div className={styles.messageCluster} key={message.id} id={`cong-message-${message.id}`}>
                          {day !== priorDay ? <div className={styles.dateDivider}><span>{formatMessageDay(message.createdAt)}</span></div> : null}
                          <article className={`${styles.messageRow} ${mine ? styles.messageRowMine : ""}`}>
                            {multiSelect && !message.optimistic ? <button type="button" className={styles.selectMessage}
                              aria-label={selectedMessageIds.includes(message.id) ? "Desmarcar mensagem" : "Selecionar mensagem"}
                              aria-pressed={selectedMessageIds.includes(message.id)} onClick={() => toggleSelection(message.id)}>
                              <FiCheckSquare />
                            </button> : null}
                            {!mine ? <UserAvatar name={message.senderName} url={message.avatarUrl} className={styles.messageAvatar} /> : null}
                            <div className={styles.messageWithReactions}>
                            <div role="button" tabIndex={0} aria-pressed={selectedMessageIds.includes(message.id)}
                              aria-label="Selecionar mensagem para ações" onClick={(event) => {
                                if (!message.optimistic && !window.getSelection()?.toString()) toggleSelection(message.id, event.ctrlKey || event.metaKey || event.shiftKey);
                              }} onKeyDown={(event) => {
                                if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                                  event.preventDefault(); toggleSelection(message.id);
                                }
                              }}
                              className={`${styles.bubble} ${mine ? styles.bubbleMine : ""} ${message.status === "error" ? styles.bubbleError : ""} ${message.deletedForAllAt ? styles.bubbleDeleted : ""} ${attachment && !message.deletedForAllAt ? styles.bubbleMedia : ""} ${selectedMessageIds.includes(message.id) ? styles.bubbleSelected : ""}`}>

                              {parsed.reply && !message.deletedForAllAt ? (
                                <button type="button" className={styles.replyQuote} onClick={(event) => {
                                  event.stopPropagation();
                                  const original = document.getElementById(`cong-message-${parsed.reply?.id}`);
                                  original?.scrollIntoView({ behavior: "smooth", block: "center" });
                                }} aria-label="Ir para a mensagem respondida">
                                  <strong>{parsed.reply.author}</strong><span>{visibleMessages.find((item) => item.id === parsed.reply?.id)?.deletedForAllAt ? "Mensagem apagada" : parsed.reply.preview}</span>
                                </button>
                              ) : null}
                              {attachment && !message.deletedForAllAt ? (
                                <MessageAttachmentDisplay attachment={attachment} scope={scope} conversationId={activeId} onError={setError} />
                              ) : message.deletedForAllAt ? <p><em>Esta mensagem foi apagada.</em></p>
                                : <p><FormattedText value={parsed.text} /></p>}
                              <footer>
                                <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                                {mine ? <MessageStatus status={message.status} /> : null}
                              </footer>
                            </div>
                            {messageReactions.length > 0 ? (
                              <div className={`${styles.reactionChips} ${mine ? styles.reactionChipsMine : ""}`} aria-label="Reações a esta mensagem">
                                {messageReactions.map((reaction) => (
                                  <button type="button" key={reaction.emoji} aria-label={`${reaction.emoji}: ${reaction.count} ${reaction.count === 1 ? "reação" : "reações"}${reaction.own ? ", você reagiu" : ""}`}
                                    title={reaction.own ? "Clique para remover sua reação" : "Clique para reagir também"}
                                    aria-pressed={reaction.own}
                                    disabled={busy || !peerTrusted || !recipientHasKey || current?.contactStatus !== "accepted"}
                                    onClick={(event) => { event.stopPropagation(); void toggleReaction(message, reaction.emoji); }}>
                                    <span aria-hidden="true">{reaction.emoji}</span><small>{reaction.count}</small>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            </div>
                          </article>
                        </div>
                      );
                    })
                  )}
                  {peerTyping ? (
                    <div className={styles.typingRow} role="status" aria-label="Contato digitando">
                      <UserAvatar name={current.peerName} url={current.avatarUrl} className={styles.messageAvatar} />
                      <div className={styles.typingBubble} aria-hidden="true"><span /><span /><span /></div>
                    </div>
                  ) : null}

                </div>

                <form className={`${styles.composer} ${dragActive ? styles.composerDragging : ""}`}
                  onSubmit={(event) => void submitMessage(event)}>

                  {captureMode ? (
                    <div className={styles.cameraPanel}>
                      <InlineCameraCapture
                        mode={captureMode}
                        onCancel={() => setCaptureMode(null)}
                        onReady={(file) => { setCaptureMode(null); pickFile(file); }}
                        onError={setError}
                      />
                    </div>
                  ) : voiceMode ? (
                    <div className={styles.voicePanel}>
                      <InlineVoiceRecorder
                        onCancel={() => setVoiceMode(false)}
                        onSend={(file) => sendPreparedMessage(file)}
                        onError={setError}
                      />
                    </div>
                  ) : (
                    <>
                  {replyingTo ? <div className={styles.replyComposer}>
                    <FiCornerUpLeft aria-hidden="true" /><div><strong>Respondendo a {replyingTo.author}</strong><span>{replyingTo.preview}</span></div>
                    <button type="button" onClick={() => setReplyingTo(null)} aria-label="Cancelar resposta"><FiX /></button>
                  </div> : null}
                  {pendingFile ? <PendingMediaPreview key={`${pendingFile.name}:${pendingFile.size}:${pendingFile.lastModified}`} file={pendingFile} onRemove={() => setPendingFile(null)} onEdit={() => setImageToEdit(pendingFile)} /> : null}
                  <div className={styles.composerTools}>
                    <button type="button" title="Anexar" aria-label="Anexar arquivo" disabled={!canAttach || busy} onClick={() => fileInputRef.current?.click()}><FiPaperclip /></button>
                    <button type="button" title="Gravar áudio" aria-label="Gravar áudio" disabled={!canAttach || busy || Boolean(pendingFile)} onClick={() => setVoiceMode(true)}><FiMic /></button>
                    <button type="button" title="Tirar foto" aria-label="Abrir câmera para tirar foto" disabled={!canAttach || busy || Boolean(pendingFile)} onClick={() => setCaptureMode("photo")}><FiCamera /></button>
                    <button type="button" title="Gravar vídeo" aria-label="Gravar vídeo" disabled={!canAttach || busy || Boolean(pendingFile)} onClick={() => setCaptureMode("video")}><FiVideo /></button>
                    <input ref={fileInputRef} type="file" className={styles.hiddenInput} onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) pickFile(file);
                      event.target.value = "";
                    }} />
                  </div>
                  {selectionToolbar ? <div role="toolbar" className={styles.selectionToolbar} aria-label="Formatar texto selecionado" onMouseDown={(event) => event.preventDefault()}>
                    <button type="button" title="Negrito (Ctrl+B)" onClick={() => { formatSelection("**"); setSelectionToolbar(false); }}><FiBold /></button>
                    <button type="button" title="Itálico (Ctrl+I)" onClick={() => { formatSelection("_"); setSelectionToolbar(false); }}><FiItalic /></button>
                    <button type="button" title="Tachado" onClick={() => { formatSelection("~~"); setSelectionToolbar(false); }}><span className={styles.strikeIcon}>S</span></button>
                  </div> : null}
                  <div className={styles.composerEntry}>
                    <textarea
                      ref={composerRef}
                      aria-label="Escreva uma mensagem"
                      maxLength={4000}
                      rows={1}
                      placeholder={outgoingRequest && requestAlreadySent ? "Aguardando a aceitação" : !recipientHasKey ? "Aguardando o contato ativar mensagens" : incomingRequest ? "Aceite o contato para responder" : pendingFile?.type.startsWith("image/") ? "Adicionar uma legenda (opcional)" : "Escreva uma mensagem"}
                      value={draft}
                      disabled={!canWrite || !recipientHasKey}
                      onChange={(event) => onDraftChange(event.target.value)}
                      onSelect={onSelectionChange}
                      onPaste={handlePaste}
                      onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && ["b", "i"].includes(event.key.toLowerCase())) {
                          event.preventDefault(); formatSelection(event.key.toLowerCase() === "b" ? "**" : "_"); setSelectionToolbar(false); return;
                        }
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                    <button type="submit" disabled={busy || !peerTrusted || !canWrite || !recipientHasKey || (!draft.trim() && !pendingFile) || !identity} aria-label="Enviar mensagem">
                      <FiSend />
                    </button>
                  </div>
                    </>
                  )}
                </form>
              </>
            ) : (
              <div className={styles.threadEmpty}>
                <FiMessageCircle aria-hidden="true" />
                <h2>Selecione uma conversa</h2>
                <p>Use a busca para começar uma nova conversa ou escolha uma existente.</p>
              </div>
            )}
          </div>
        </section>
      )}
      <ModalMensagem aberto={Boolean(pendingContact)} titulo={pendingContact ? `Solicitar contato com ${pendingContact.name}` : "Solicitar contato"}
        tamanho="medio" mostrarBotaoOk={false} onFechar={() => setPendingContact(null)} mensagem={
        <div className={styles.contactModal}>
          <p>Antes de iniciar a conversa, envie uma solicitação de contato. A pessoa poderá aceitar ou recusar.</p>
          <label>Breve apresentação (opcional)
            <textarea maxLength={300} value={contactIntroduction} placeholder="Olá! Gostaria de conversar sobre..." onChange={(event) => setContactIntroduction(event.target.value)} rows={3} />
          </label>
          <p className={styles.modalHint}>A apresentação será enviada criptografada se o contato já tiver ativado suas mensagens. Caso contrário, somente a solicitação será registrada.</p>
          <div className={styles.modalActions}>
            <button type="button" disabled={busy} onClick={() => setPendingContact(null)}>Cancelar</button>
            <button type="button" disabled={busy || !pendingContact} onClick={() => { if (pendingContact) void startConversation(pendingContact.id, contactIntroduction); }}>{busy ? "Enviando..." : "Enviar solicitação"}</button>
          </div>
        </div>
      } />
      <ConfirmActionModal open={Boolean(confirmDelete)} title={confirmDelete?.mode === "everyone" ? "Apagar para todos?" : "Apagar para você?"}
        description={confirmDelete?.mode === "everyone" ? `As ${confirmDelete.messages.length} mensagens selecionadas serão removidas para todos. Isso não apaga cópias já salvas.` : `Apagar ${confirmDelete?.messages.length ?? 0} mensagem(ns) somente da sua conversa?`}
        confirmLabel="Apagar mensagem" tone="danger" busy={busy} onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) void removeMessages(confirmDelete.messages, confirmDelete.mode); }} />
      <ConfirmActionModal open={confirmAction === "device"} title="Substituir proteção deste dispositivo?"
        description="O histórico anterior pode deixar de ser acessível neste navegador. Esta ação não pode ser desfeita."
        confirmLabel="Substituir" tone="danger" busy={busy} onCancel={() => setConfirmAction(null)}
        onConfirm={() => { void replaceDevice(); setConfirmAction(null); }} />
      <ConfirmActionModal open={confirmAction === "peer"} title="Confirmar contato?"
        description="Confirme por outro meio que a pessoa realmente trocou de dispositivo antes de permitir novas mensagens."
        confirmLabel="Confirmar identidade" busy={busy} onCancel={() => setConfirmAction(null)} onConfirm={() => void trustChangedPeer()} />
      {imageToEdit ? <MessageImageEditor key={`${imageToEdit.name}:${imageToEdit.size}:${imageToEdit.lastModified}`} file={imageToEdit} onClose={() => setImageToEdit(null)} onReady={setPendingFile} /> : null}
    </main>
  );
}

function PendingMediaPreview({ file, onRemove, onEdit }: { file: File; onRemove: () => void; onEdit: () => void }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <div className={styles.attachmentPreview}>
    {url && file.type.startsWith("image/") ? <img src={url} alt="Prévia do anexo" /> :
      url && file.type.startsWith("audio/") ? <audio controls src={url} /> :
      url && file.type.startsWith("video/") ? <video controls src={url} /> : <FiFile />}
    <span><strong>{file.name}</strong><small>{file.type.startsWith("image/") ? "Legenda opcional no campo abaixo" : `${formatSize(file.size)} · Pronto para enviar`}</small></span>
    {file.type.startsWith("image/") ? <button type="button" onClick={onEdit}>Editar</button> : null}
    <button type="button" onClick={onRemove} aria-label="Remover anexo"><FiX /></button>
  </div>;
}

function MessageStatus({ status }: { status: UiMessage["status"] }) {
  if (status === "sending") return <span className={styles.messageStatus}>Enviando...</span>;
  if (status === "error") return <span className={styles.messageStatusError}>Falhou</span>;
  if (status === "read") return <span className={styles.messageStatusRead} title="Lida">✓✓</span>;
  if (status === "delivered") return <span className={styles.messageStatus} title="Recebida">✓✓</span>;
  return <span className={styles.messageStatus}>✓</span>;
}

function statusForMessage(message: Pick<MessageEntry, "senderUserId" | "createdAt">, viewerId: string | null, peerLastReadAt: string | null, peerLastDeliveredAt: string | null) {
  if (!viewerId || message.senderUserId !== viewerId) return "sent" as const;
  if (peerLastReadAt && +new Date(message.createdAt) <= +new Date(peerLastReadAt)) return "read" as const;
  if (peerLastDeliveredAt && +new Date(message.createdAt) <= +new Date(peerLastDeliveredAt)) return "delivered" as const;
  return "sent" as const;
}

function UserAvatar({ name, url, className }: { name: string; url?: string | null; className: string }) {
  const [failed, setFailed] = useState(false);
  return <span className={className}>{url && !failed ? <img src={url} alt={name} onError={() => setFailed(true)} /> : initials(name)}</span>;
}

function FormattedText({ value }: { value: string }) {
  // Safe React nodes (never HTML injection). Supports simple **bold**, _italic_, ~~strike~~.
  const parts = value.split(/(\*\*[^*\n]+\*\*|~~[^~\n]+~~|_[^_\n]+_)/g);
  return <>{parts.map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong>
    : part.startsWith("~~") && part.endsWith("~~")
      ? <s key={index}>{part.slice(2, -2)}</s>
      : part.startsWith("_") && part.endsWith("_")
        ? <em key={index}>{part.slice(1, -1)}</em>
        : part)}</>;
}

function formatMessageDay(value: string) {
  const day = new Date(value);
  const today = new Date();
  if (day.toDateString() === today.toDateString()) return "Hoje";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === yesterday.toDateString()) return "Ontem";
  return day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatSize(value: number) { return value >= 1000 ? `${Math.round(value / 1000)} KB` : `${value} bytes`; }

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return date.toLocaleString("pt-BR", sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit" });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function messageFor(reason: unknown) {
  return reason instanceof Error ? reason.message : "Não foi possível concluir a operação.";
}
