import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCamera,
  FiDownload,
  FiEdit2,
  FiFile,
  FiFileText,
  FiImage,
  FiLogOut,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import {
  fetchConversationMedia,
  manageMessageGroup,
  removeGroupPhoto,
  searchMessageContacts,
  uploadGroupPhoto,
  type MessageContact,
  type MessageConversation,
  type MessageGalleryItem,
  type MessageParticipant,
  type MessageScope,
} from "../../../services/messagesService";
import MessageMediaViewer from "./MessageMediaViewer";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import styles from "./MessageConversationDetails.module.css";
import { prepareGroupPhoto } from "./messageGroupPhoto";

type Props = {
  scope: MessageScope;
  conversation: MessageConversation;
  participants: MessageParticipant[];
  viewerId: string | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
  onLeft: () => void;
};
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0] || "")
    .join("")
    .toUpperCase();
}
function Avatar({ name, url }: { name: string; url?: string | null }) {
  return (
    <span className={styles.avatar}>
      {url ? <img src={url} alt="" /> : initials(name)}
    </span>
  );
}
export default function MessageConversationDetails({
  scope,
  conversation,
  participants,
  viewerId,
  onClose,
  onUpdated,
  onLeft,
}: Props) {
  const group = conversation.kind === "group";
  const ownRole =
    participants.find((p) => p.userId === viewerId)?.role || "member";
  const admin = group && ownRole !== "member";
  const [tab, setTab] = useState<"media" | "members">("media");
  const [items, setItems] = useState<MessageGalleryItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(conversation.title || "");
  const [description, setDescription] = useState(
    conversation.description || "",
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<MessageContact[]>([]);
  const [viewerMedia, setViewerMedia] = useState<MessageGalleryItem | null>(
    null,
  );
  const [confirmLeave, setConfirmLeave] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const loadMore = useCallback(
    async (offset: number) => {
      setMediaBusy(true);
      try {
        const data = await fetchConversationMedia(
          scope,
          conversation.id,
          offset,
        );
        setItems((prev) =>
          offset === 0
            ? data.items
            : [
                ...prev,
                ...data.items.filter(
                  (next) => !prev.some((old) => old.id === next.id),
                ),
              ],
        );
        setHasMore(data.hasMore);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar as mídias.",
        );
      } finally {
        setMediaBusy(false);
      }
    },
    [scope, conversation.id],
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() => void loadMore(0));
    return () => cancelAnimationFrame(frame);
  }, [loadMore]);
  useEffect(() => {
    if (!admin || memberSearch.trim().length < 2) return;
    let valid = true;
    const timer = window.setTimeout(() => {
      void searchMessageContacts(scope, memberSearch)
        .then((users) => {
          if (valid) setMemberResults(users);
        })
        .catch(() => {
          if (valid) setMemberResults([]);
        });
    }, 300);
    return () => {
      valid = false;
      window.clearTimeout(timer);
    };
  }, [scope, memberSearch, admin]);
  async function update(
    action: "add" | "remove" | "promote" | "demote",
    id: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      await manageMessageGroup(scope, conversation.id, { action, userId: id });
      await onUpdated();
      if (action === "add") setMemberSearch("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível atualizar o grupo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveDetails() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (title.trim() !== conversation.title)
        await manageMessageGroup(scope, conversation.id, {
          action: "rename",
          title: title.trim(),
        });
      if (description.trim() !== (conversation.description || ""))
        await manageMessageGroup(scope, conversation.id, {
          action: "describe",
          description: description.trim(),
        });
      await onUpdated();
      setEditing(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar as informações.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function photoChanged(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareGroupPhoto(file);
      await uploadGroupPhoto(scope, conversation.id, prepared);
      await onUpdated();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível alterar a foto.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function clearPhoto() {
    setBusy(true);
    try {
      await removeGroupPhoto(scope, conversation.id);
      await onUpdated();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível remover a foto.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function leave() {
    setConfirmLeave(false);
    setBusy(true);
    try {
      await manageMessageGroup(scope, conversation.id, { action: "leave" });
      onLeft();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível sair do grupo.",
      );
      setBusy(false);
    }
  }
  const shown = items;
  return (
    <div
      className={styles.scrim}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={group ? "Informações do grupo" : "Informações do contato"}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <header className={styles.top}>
          <strong>Detalhes da conversa</strong>
          <button type="button" title="Fechar" onClick={onClose}>
            <FiX />
          </button>
        </header>
        <div className={styles.scroll}>
          <div className={styles.hero}>
            <div className={styles.avatarWrap}>
              <Avatar
                name={
                  group
                    ? conversation.title || "Grupo"
                    : conversation.peerName || "Contato"
                }
                url={conversation.avatarUrl}
              />
              {admin ? (
                <button
                  className={styles.camera}
                  onClick={() => fileInput.current?.click()}
                  title="Alterar foto do grupo"
                  disabled={busy}
                >
                  <FiCamera />
                </button>
              ) : null}
              <input
                hidden
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  void photoChanged(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <h2>{group ? conversation.title : conversation.peerName}</h2>
            <p>
              {group
                ? `${participants.length} participantes`
                : conversation.peerUsername
                  ? `@${conversation.peerUsername}`
                  : "Pessoa da comunidade"}
            </p>
            {group && conversation.description ? (
              <div className={styles.description}>
                {conversation.description}
              </div>
            ) : null}
            {admin ? (
              <div className={styles.manageButtons}>
                <button
                  type="button"
                  onClick={() => {
                    setTitle(conversation.title || "");
                    setDescription(conversation.description || "");
                    setEditing(!editing);
                  }}
                >
                  <FiEdit2 /> Editar informações
                </button>
                {conversation.avatarUrl ? (
                  <button
                    type="button"
                    onClick={() => void clearPhoto()}
                    disabled={busy}
                    title="Remover foto"
                  >
                    <FiTrash2 />
                  </button>
                ) : null}
              </div>
            ) : null}
            {!group && conversation.peerId ? (
              <Link
                className={styles.profileLink}
                to={`/app/comunidade/perfil/user/${conversation.peerId}`}
              >
                Ver perfil completo
              </Link>
            ) : null}
          </div>
          {editing && admin ? (
            <div className={styles.editor}>
              <label>
                Nome do grupo
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                Descrição (opcional)
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </label>
              <button
                disabled={busy || title.trim().length < 2}
                onClick={() => void saveDetails()}
              >
                {busy ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                className={styles.cancel}
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            </div>
          ) : null}
          <nav className={styles.tabs} aria-label="Seções da conversa">
            <button
              type="button"
              className={tab === "media" ? styles.active : ""}
              onClick={() => setTab("media")}
            >
              <FiImage /> Mídias e arquivos
            </button>
            {group ? (
              <button
                type="button"
                className={tab === "members" ? styles.active : ""}
                onClick={() => setTab("members")}
              >
                <FiUsers /> Pessoas
              </button>
            ) : null}
          </nav>
          {tab === "media" ? (
            <div className={styles.mediaSection}>
              <div className={styles.galleryTitle}>
                <p className={styles.sectionHint}>
                  Fotos, vídeos, áudios e documentos compartilhados
                </p>
                <button
                  type="button"
                  title="Atualizar mídias"
                  disabled={mediaBusy}
                  onClick={() => void loadMore(0)}
                >
                  <FiRefreshCw />
                </button>
              </div>
              <div className={styles.mediaGrid}>
                {shown.map((item) => {
                  const image = item.mime.startsWith("image/");
                  const video = item.mime.startsWith("video/");
                  const audio = item.mime.startsWith("audio/");
                  return image || video ? (
                    <button
                      type="button"
                      key={item.id}
                      className={styles.mediaTile}
                      disabled={!item.url}
                      onClick={() => setViewerMedia(item)}
                      aria-label={`Abrir ${item.name}`}
                    >
                      {image && item.url ? (
                        <img src={item.url} alt={item.name} loading="lazy" />
                      ) : video && item.url ? (
                        <video
                          src={item.url}
                          muted
                          preload="metadata"
                          playsInline
                        />
                      ) : (
                        <FiImage />
                      )}
                      <span>{video ? "Vídeo" : "Foto"}</span>
                    </button>
                  ) : (
                    <div className={styles.fileTile} key={item.id}>
                      <span className={styles.fileIcon}>
                        {audio ? <FiFile /> : <FiFileText />}
                      </span>
                      <span className={styles.fileInfo}>
                        <strong title={item.name}>{item.name}</strong>
                        <small>{(item.size / 1_000_000).toFixed(2)} MB</small>
                      </span>
                      {item.url ? (
                        <a
                          href={item.url}
                          download={item.name}
                          title="Baixar arquivo"
                        >
                          <FiDownload />
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {!mediaBusy && !items.length ? (
                <div className={styles.empty}>
                  <FiImage />
                  <p>As fotos e os arquivos enviados aparecerão aqui.</p>
                </div>
              ) : null}
              {hasMore ? (
                <button
                  className={styles.more}
                  type="button"
                  disabled={mediaBusy}
                  onClick={() => void loadMore(items.length)}
                >
                  {mediaBusy ? "Carregando..." : "Carregar mais"}
                </button>
              ) : null}
              {mediaBusy && !items.length ? (
                <p className={styles.sectionHint}>Carregando mídias...</p>
              ) : null}
            </div>
          ) : (
            <div className={styles.members}>
              {admin ? (
                <div className={styles.addMember}>
                  <label>
                    <FiSearch />
                    <input
                      placeholder="Adicionar participante"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </label>
                  {memberSearch.trim().length >= 2 ? (
                    <div className={styles.searchResults}>
                      {memberResults
                        .filter(
                          (p) => !participants.some((m) => m.userId === p.id),
                        )
                        .map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            disabled={busy}
                            onClick={() => void update("add", p.id)}
                          >
                            {p.name}
                            <span>Adicionar</span>
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {participants.map((p) => (
                <div className={styles.member} key={p.userId}>
                  <Link
                    to={`/app/comunidade/perfil/user/${p.userId}`}
                    className={styles.memberProfile}
                  >
                    <span className={styles.miniAvatar}>
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt="" />
                      ) : (
                        initials(p.name)
                      )}
                    </span>
                    <span>
                      <strong>
                        {p.name}
                        {p.userId === viewerId ? " (você)" : ""}
                      </strong>
                      <small>
                        {p.role === "owner"
                          ? "Responsável"
                          : p.role === "admin"
                            ? "Administrador"
                            : "Participante"}
                      </small>
                    </span>
                  </Link>
                  {admin && p.userId !== viewerId && p.role !== "owner" ? (
                    <div className={styles.memberActions}>
                      {ownRole === "owner" ? (
                        <button
                          type="button"
                          disabled={busy}
                          title={
                            p.role === "admin"
                              ? "Remover administração"
                              : "Tornar administrador"
                          }
                          onClick={() =>
                            void update(
                              p.role === "admin" ? "demote" : "promote",
                              p.userId,
                            )
                          }
                        >
                          <FiUsers />
                        </button>
                      ) : null}
                      {ownRole === "owner" || p.role === "member" ? (
                        <button
                          type="button"
                          disabled={busy}
                          title="Remover do grupo"
                          onClick={() => void update("remove", p.userId)}
                        >
                          <FiX />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
              <button
                className={styles.leave}
                type="button"
                onClick={() => setConfirmLeave(true)}
              >
                <FiLogOut /> Sair do grupo
              </button>
            </div>
          )}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </section>
      {viewerMedia?.url ? (
        <MessageMediaViewer
          url={viewerMedia.url}
          name={viewerMedia.name}
          kind={viewerMedia.mime.startsWith("image/") ? "image" : "video"}
          onClose={() => setViewerMedia(null)}
        />
      ) : null}
      <ConfirmActionModal
        open={confirmLeave}
        title="Sair do grupo?"
        description="Você deixará de receber mensagens e perderá acesso aos arquivos desta conversa."
        confirmLabel="Sair do grupo"
        tone="danger"
        busy={busy}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => void leave()}
      />
    </div>
  );
}
