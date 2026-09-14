import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArchive,
  FiBookmark,
  FiCheckCircle,
  FiEdit2,
  FiFlag,
  FiHeart,
  FiLink,
  FiMessageCircle,
  FiRefreshCw,
  FiRotateCcw,
  FiShield,
  FiMoreHorizontal,
  FiSend,
  FiShare2,
  FiSlash,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import {
  archiveCommunityPost,
  blockCommunityUser,
  bookmarkCommunityPost,
  boostCommunityPost,
  createCommunityComment,
  deleteCommunityComment,
  deleteCommunityPost,
  getCommunityPostComments,
  followCommunityUser,
  unfollowCommunityUser,
  likeCommunityPost,
  restoreCommunityPost,
  unlikeCommunityPost,
  unbookmarkCommunityPost,
  updateCommunityComment,
  type CommunityComment,
  type CommunityPost,
} from "../../services/communityService";
import CommunityPostComposer from "./CommunityPostComposer";
import CommunityResearchPanel from "./CommunityResearchPanel";
import CommunityPostTemplate from "./post-templates/CommunityPostTemplates";
import CommunityPostMedia from "./CommunityPostMedia";
import CommunityRichText from "./CommunityRichText";
import CommunityReportModal from "./CommunityReportModal";
import styles from "./CommunityPostCard.module.css";

interface CommunityPostCardProps {
  post: CommunityPost;
  onUpdated?: (post: CommunityPost) => void;
  onDeleted?: (postId: string) => void;
  onRelatedPostCreated?: (post: CommunityPost) => void;
  onAuthorFollowChanged?: (userId: string, followed: boolean) => void;
  onAuthorBlocked?: (userId: string) => void;
  onNotice?: (message: string) => void;
}

const areaLabels: Record<CommunityPost["area"], string> = {
  desenvolvimento: "Desenvolvimento",
  design: "Design",
  pesquisa: "Pesquisa",
  documentacao: "Documentação",
  voluntariado: "Voluntariado",
  ongs: "ONGs",
};

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function CommentAvatar({ comment }: { comment: CommunityComment }) {
  if (comment.author.avatarUrl) {
    return (
      <img
        className={styles.commentAvatarImage}
        src={comment.author.avatarUrl}
        alt=""
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <span className={styles.commentAvatar}>
      {getInitials(comment.author.displayName)}
    </span>
  );
}

export default function CommunityPostCard({
  post,
  onUpdated,
  onDeleted,
  onRelatedPostCreated,
  onAuthorFollowChanged,
  onAuthorBlocked,
  onNotice,
}: CommunityPostCardProps) {
  const navigate = useNavigate();
  const authorName = post.author.organization?.name ?? post.author.displayName;
  const roleLabels: Record<string, string> = {
    developer: "Desenvolvedor",
    designer: "Designer",
    translator: "Tradutor",
    volunteer: "Voluntário",
  };
  const authorContext = post.author.organization
    ? "Organização"
    : post.author.collaborationProfile?.role
      ? (roleLabels[post.author.collaborationProfile.role] ??
        post.author.collaborationProfile.role)
      : areaLabels[post.area];
  const authorHandle =
    !post.author.organization && post.author.username
      ? `@${post.author.username}`
      : null;
  const moderatedHidden = post.moderation?.state === "hidden";
  const requestType =
    post.kind === "request"
      ? ((post.details as { requestType?: string } | null)?.requestType ??
        undefined)
      : undefined;

  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [actionBusy, setActionBusy] = useState<
    "like" | "save" | "delete" | "archive" | "restore" | "boost" | null
  >(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: "post" | "comment";
    id: string;
    label: string;
  } | null>(null);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Set<string>>(
    () => new Set(),
  );
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [menuOpen]);

  const updateParentPost = (nextPost: CommunityPost) => {
    onUpdated?.(nextPost);
  };

  const handleToggleLike = async () => {
    if (actionBusy) return;
    setActionBusy("like");
    setFeedback(null);

    const optimistic: CommunityPost = {
      ...post,
      engagement: {
        ...post.engagement,
        likedByMe: !post.engagement.likedByMe,
        likeCount: Math.max(
          0,
          post.engagement.likeCount + (post.engagement.likedByMe ? -1 : 1),
        ),
      },
    };
    updateParentPost(optimistic);

    try {
      const serverPost = post.engagement.likedByMe
        ? await unlikeCommunityPost(post.id)
        : await likeCommunityPost(post.id);
      updateParentPost(serverPost);
    } catch (error) {
      updateParentPost(post);
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar o apoio.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const handleToggleFollow = async () => {
    if (followBusy || post.permissions.canEdit || post.author.organization)
      return;
    setFollowBusy(true);
    setFeedback(null);
    const nextFollowed = !post.author.followedByMe;

    try {
      if (nextFollowed) {
        await followCommunityUser(post.author.userId);
      } else {
        await unfollowCommunityUser(post.author.userId);
      }

      onAuthorFollowChanged?.(post.author.userId, nextFollowed);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar quem você segue.",
      );
    } finally {
      setFollowBusy(false);
    }
  };

  const handleBlockAuthor = async () => {
    if (blockBusy || post.permissions.canEdit || post.author.organization)
      return;
    const confirmed = window.confirm(
      `Bloquear ${post.author.displayName}? As publicações e interações entre vocês deixarão de aparecer.`,
    );
    if (!confirmed) return;
    setBlockBusy(true);
    setFeedback(null);
    try {
      await blockCommunityUser(post.author.userId);
      onAuthorBlocked?.(post.author.userId);
      onNotice?.(`${post.author.displayName} foi bloqueado.`);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível bloquear este perfil.",
      );
    } finally {
      setBlockBusy(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (actionBusy) return;
    setActionBusy("save");
    setFeedback(null);

    const optimistic: CommunityPost = {
      ...post,
      engagement: {
        ...post.engagement,
        savedByMe: !post.engagement.savedByMe,
      },
    };
    updateParentPost(optimistic);

    try {
      const serverPost = post.engagement.savedByMe
        ? await unbookmarkCommunityPost(post.id)
        : await bookmarkCommunityPost(post.id);
      updateParentPost(serverPost);
    } catch (error) {
      updateParentPost(post);
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a publicação.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/comunidade?post=${post.id}`;
    setFeedback(null);

    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: post.summary, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setFeedback("Link copiado.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback("Não foi possível compartilhar a publicação.");
    }
  };

  const handleArchivePost = async () => {
    if (!post.permissions.canEdit || actionBusy) return;
    setActionBusy("archive");
    setFeedback(null);
    try {
      const updated = await archiveCommunityPost(post.id);
      updateParentPost(updated);
      onNotice?.(
        "Publicação arquivada. Ela ficou disponível em Minha atividade > Arquivadas.",
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível arquivar a publicação.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const handleRestorePost = async () => {
    if (!post.permissions.canEdit || actionBusy) return;
    setActionBusy("restore");
    setFeedback(null);
    try {
      const updated = await restoreCommunityPost(post.id);
      updateParentPost(updated);
      onNotice?.("Publicação restaurada no feed.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível restaurar a publicação.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const handleBoostPost = async () => {
    if (!post.permissions.canEdit || actionBusy) return;
    setActionBusy("boost");
    setFeedback(null);
    try {
      const updated = await boostCommunityPost(post.id);
      updateParentPost(updated);
      onNotice?.(
        "Publicação recolocada no topo. O impulso é limitado para manter o feed equilibrado.",
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível recolocar a publicação no topo.",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const handleDeletePost = async () => {
    if (!post.permissions.canDelete || actionBusy) return;
    setActionBusy("delete");
    setFeedback(null);
    try {
      await deleteCommunityPost(post.id);
      onDeleted?.(post.id);
      onNotice?.("Publicação excluída.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a publicação.",
      );
      setActionBusy(null);
    }
  };

  const loadComments = async () => {
    if (commentsLoading || comments.length > 0) return;
    setCommentsLoading(true);
    setFeedback(null);
    try {
      setComments(await getCommunityPostComments(post.id));
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os comentários.",
      );
    } finally {
      setCommentsLoading(false);
    }
  };

  const openComments = () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    void loadComments();
  };

  const handleCreateComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content || commentSubmitting) return;

    setCommentSubmitting(true);
    setFeedback(null);
    try {
      const created = await createCommunityComment(
        post.id,
        content,
        replyTo?.id ?? null,
      );
      setComments((current) => [...current, created]);
      setCommentText("");
      setReplyTo(null);
      updateParentPost({
        ...post,
        engagement: {
          ...post.engagement,
          commentCount: post.engagement.commentCount + 1,
        },
      });
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Não foi possível comentar.",
      );
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleSaveComment = async (commentId: string) => {
    const content = editingCommentText.trim();
    if (!content) return;
    setFeedback(null);

    try {
      const updated = await updateCommunityComment(commentId, content);
      setComments((current) =>
        current.map((comment) =>
          comment.id === commentId ? updated : comment,
        ),
      );
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível editar o comentário.",
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Excluir este comentário?")) return;
    setFeedback(null);

    try {
      await deleteCommunityComment(commentId);
      const removedIds = new Set([
        commentId,
        ...comments
          .filter((item) => item.parentCommentId === commentId)
          .map((item) => item.id),
      ]);
      setComments((current) =>
        current.filter((comment) => !removedIds.has(comment.id)),
      );
      updateParentPost({
        ...post,
        engagement: {
          ...post.engagement,
          commentCount: Math.max(
            0,
            post.engagement.commentCount - removedIds.size,
          ),
        },
      });
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o comentário.",
      );
    }
  };

  const topLevelComments = comments.filter(
    (comment) => !comment.parentCommentId,
  );
  const visibleTopLevelComments = showAllComments
    ? topLevelComments
    : topLevelComments.slice(0, 3);
  const hiddenCommentCount = Math.max(
    0,
    topLevelComments.length - visibleTopLevelComments.length,
  );

  return (
    <article
      className={styles.card}
      data-kind={post.kind}
      data-status={post.status}
      data-request-type={requestType}
      id={`community-post-${post.id}`}
    >
      <span className={styles.postDecoration} aria-hidden="true" />
      <header className={styles.header}>
        <button
          type="button"
          className={styles.authorLink}
          onClick={() =>
            navigate(
              post.author.organization
                ? `/app/comunidade/perfil/organization/${post.author.organization.id}`
                : `/app/comunidade/perfil/user/${post.author.userId}`,
            )
          }
          aria-label={`Abrir perfil de ${authorName}`}
        >
          {post.author.avatarUrl && !post.author.organization ? (
            <img
              className={styles.avatarImage}
              src={post.author.avatarUrl}
              alt=""
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className={styles.avatar}>{getInitials(authorName)}</span>
          )}

          <span className={styles.author}>
            <span>
              <strong>{authorName}</strong>
              {post.author.organization ? (
                <FiCheckCircle title="Organização" aria-label="Organização" />
              ) : null}
            </span>
            <small>
              {[
                authorHandle,
                authorContext,
                areaLabels[post.area],
                formatPublishedAt(post.publishedAt),
              ]
                .filter(Boolean)
                .join(" · ")}
            </small>
            {post.status === "archived" ? (
              <span className={styles.archivedBadge}>Arquivada</span>
            ) : null}
            {post.status === "published" && post.boostedAt ? (
              <span className={styles.boostedBadge}>
                Recolocada no topo {formatPublishedAt(post.boostedAt)}
              </span>
            ) : null}
          </span>
        </button>

        {!moderatedHidden &&
        !post.permissions.canEdit &&
        !post.author.organization ? (
          <button
            type="button"
            className={`${styles.followButton} ${post.author.followedByMe ? styles.followButtonActive : ""}`}
            onClick={() => void handleToggleFollow()}
            disabled={followBusy}
          >
            {followBusy
              ? "..."
              : post.author.followedByMe
                ? "Seguindo"
                : "Seguir"}
          </button>
        ) : null}

        <div className={styles.postMenuWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.moreButton}
            aria-label="Mais opções"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <FiMoreHorizontal />
          </button>
          {menuOpen ? (
            <div className={styles.postMenu}>
              {!moderatedHidden && post.permissions.canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                >
                  <FiEdit2 /> Editar publicação
                </button>
              ) : null}
              {!moderatedHidden &&
              post.permissions.canEdit &&
              post.status === "published" ? (
                <button
                  type="button"
                  title="Disponível após 24 h. Máximo de 1 impulso por dia, 7 dias entre impulsos do mesmo post e 3 impulsos por publicação."
                  onClick={() => {
                    setMenuOpen(false);
                    void handleBoostPost();
                  }}
                  disabled={actionBusy === "boost"}
                >
                  <FiRefreshCw /> Recolocar no topo{" "}
                  {post.boostCount ? `(${post.boostCount}/3)` : ""}
                </button>
              ) : null}
              {!moderatedHidden &&
              post.permissions.canEdit &&
              post.status === "published" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleArchivePost();
                  }}
                  disabled={actionBusy === "archive"}
                >
                  <FiArchive /> Arquivar publicação
                </button>
              ) : null}
              {!moderatedHidden &&
              post.permissions.canEdit &&
              post.status === "archived" ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void handleRestorePost();
                  }}
                  disabled={actionBusy === "restore"}
                >
                  <FiRotateCcw /> Restaurar publicação
                </button>
              ) : null}
              {!moderatedHidden && post.status === "published" ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleShare();
                    setMenuOpen(false);
                  }}
                >
                  <FiLink /> Copiar / compartilhar link
                </button>
              ) : null}
              {!moderatedHidden && !post.permissions.canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setReportTarget({
                      type: "post",
                      id: post.id,
                      label: post.title,
                    });
                  }}
                >
                  <FiFlag /> Denunciar publicação
                </button>
              ) : null}
              {!moderatedHidden &&
              !post.permissions.canEdit &&
              !post.author.organization ? (
                <button
                  type="button"
                  className={styles.dangerAction}
                  onClick={() => {
                    setMenuOpen(false);
                    void handleBlockAuthor();
                  }}
                  disabled={blockBusy}
                >
                  <FiSlash /> {blockBusy ? "Bloqueando..." : "Bloquear perfil"}
                </button>
              ) : null}
              {post.permissions.canDelete ? (
                <button
                  type="button"
                  className={styles.dangerAction}
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <FiTrash2 /> Excluir publicação
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {deleteConfirmOpen ? (
        <div
          className={styles.deleteConfirm}
          role="alertdialog"
          aria-label="Confirmar exclusão da publicação"
        >
          <div>
            <strong>Excluir publicação?</strong>
            <span>Esta ação não poderá ser desfeita.</span>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={actionBusy === "delete"}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.deleteConfirmAction}
              onClick={() => void handleDeletePost()}
              disabled={actionBusy === "delete"}
            >
              {actionBusy === "delete" ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      ) : null}

      {moderatedHidden ? (
        <section
          className={styles.moderationNotice}
          aria-label="Publicação removida pela moderação"
        >
          <div className={styles.moderationNoticeIcon}>
            <FiShield />
          </div>
          <div>
            <span className={styles.moderationEyebrow}>
              Removido pela moderação
            </span>
            <strong>Esta publicação não aparece mais para a comunidade.</strong>
            <p>
              {post.moderation?.moderatorDisplayName
                ? `${post.moderation.moderatorDisplayName} removeu esta publicação`
                : "A equipe de moderação removeu esta publicação"}
              {post.moderation?.reason
                ? ` pelo motivo: ${post.moderation.reason}`
                : "."}
            </p>
            {post.moderation?.moderatedAt ? (
              <small>
                Registrado {formatPublishedAt(post.moderation.moderatedAt)}.
              </small>
            ) : null}
          </div>
        </section>
      ) : editing ? (
        <div className={styles.editorWrap}>
          <CommunityPostComposer
            initialPost={post}
            onClose={() => setEditing(false)}
            onUpdated={(updated) => {
              updateParentPost(updated);
              setEditing(false);
            }}
          />
        </div>
      ) : (
        <CommunityPostTemplate
          post={post}
          onOpenComments={openComments}
          onOpenResearch={() => {
            setCommentsOpen(false);
            setResearchOpen((current) => !current);
          }}
        />
      )}

      {!moderatedHidden && !editing ? <CommunityPostMedia post={post} /> : null}

      {!moderatedHidden && !editing && post.status === "published" ? (
        <>
          <div className={styles.engagementMeta}>
            <span>
              {post.engagement.likeCount}{" "}
              {post.engagement.likeCount === 1 ? "apoio" : "apoios"}
            </span>
            <button type="button" onClick={openComments}>
              {post.engagement.commentCount}{" "}
              {post.kind === "question"
                ? post.engagement.commentCount === 1
                  ? "resposta"
                  : "respostas"
                : post.engagement.commentCount === 1
                  ? "comentário"
                  : "comentários"}
            </button>
          </div>

          <footer className={styles.engagement}>
            <div>
              <button
                type="button"
                onClick={() => void handleToggleLike()}
                disabled={actionBusy === "like"}
                className={
                  post.engagement.likedByMe ? styles.activeAction : undefined
                }
              >
                <FiHeart /> {post.engagement.likedByMe ? "Apoiou" : "Apoiar"}
              </button>
              <button type="button" onClick={openComments}>
                <FiMessageCircle />{" "}
                {post.kind === "question" ? "Respostas" : "Comentários"}
              </button>
              <button type="button" onClick={() => void handleShare()}>
                <FiShare2 /> Compartilhar
              </button>
            </div>
            <button
              type="button"
              className={`${styles.saveButton} ${post.engagement.savedByMe ? styles.activeAction : ""}`}
              onClick={() => void handleToggleBookmark()}
              disabled={actionBusy === "save"}
              aria-label={
                post.engagement.savedByMe
                  ? "Remover dos salvos"
                  : "Salvar publicação"
              }
            >
              <FiBookmark />{" "}
              <span>{post.engagement.savedByMe ? "Salvo" : "Salvar"}</span>
            </button>
          </footer>
        </>
      ) : null}

      {researchOpen &&
      !moderatedHidden &&
      !editing &&
      post.status === "published" &&
      post.kind === "research" ? (
        <CommunityResearchPanel
          post={post}
          onClose={() => setResearchOpen(false)}
          onRelatedPostCreated={onRelatedPostCreated}
        />
      ) : null}

      {commentsOpen &&
      !moderatedHidden &&
      !editing &&
      post.status === "published" ? (
        <section
          className={styles.commentsSection}
          aria-label={post.kind === "question" ? "Respostas" : "Comentários"}
        >
          <header className={styles.commentsHeader}>
            <div>
              <strong>
                {post.kind === "question" ? "Respostas" : "Comentários"}
              </strong>
              <small>Conversa vinculada a esta publicação</small>
            </div>
            <button
              type="button"
              onClick={() => setCommentsOpen(false)}
              aria-label="Fechar comentários"
            >
              <FiX />
            </button>
          </header>

          {commentsLoading ? (
            <p className={styles.commentsStatus}>Carregando...</p>
          ) : null}
          {!commentsLoading && topLevelComments.length === 0 ? (
            <p className={styles.commentsStatus}>
              Ainda não há{" "}
              {post.kind === "question" ? "respostas" : "comentários"}.
            </p>
          ) : null}

          <div className={styles.commentList}>
            {visibleTopLevelComments.map((comment) => {
              const replies = comments.filter(
                (item) => item.parentCommentId === comment.id,
              );
              const repliesExpanded =
                showAllComments || expandedReplyThreads.has(comment.id);
              const visibleReplies = repliesExpanded
                ? replies
                : replies.slice(0, 2);
              const hiddenReplies = Math.max(
                0,
                replies.length - visibleReplies.length,
              );

              return (
                <div key={comment.id} className={styles.commentThread}>
                  <article className={styles.comment}>
                    <CommentAvatar comment={comment} />
                    <div className={styles.commentBody}>
                      <header>
                        <strong>{comment.author.displayName}</strong>
                        <small>{formatPublishedAt(comment.createdAt)}</small>
                      </header>
                      {editingCommentId === comment.id ? (
                        <div className={styles.commentEdit}>
                          <textarea
                            rows={2}
                            maxLength={2000}
                            value={editingCommentText}
                            onChange={(e) =>
                              setEditingCommentText(e.target.value)
                            }
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveComment(comment.id)}
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p>
                          <CommunityRichText text={comment.content} />
                        </p>
                      )}
                      <div className={styles.commentActions}>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyTo(comment);
                            setCommentsOpen(true);
                          }}
                        >
                          Responder
                        </button>
                        {comment.permissions.canEdit &&
                        editingCommentId !== comment.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditingCommentText(comment.content);
                            }}
                          >
                            Editar
                          </button>
                        ) : null}
                        {comment.permissions.canDelete ? (
                          <button
                            type="button"
                            onClick={() => void handleDeleteComment(comment.id)}
                          >
                            Excluir
                          </button>
                        ) : null}
                        {!comment.permissions.canEdit ? (
                          <button
                            type="button"
                            onClick={() =>
                              setReportTarget({
                                type: "comment",
                                id: comment.id,
                                label: `Comentário de ${comment.author.displayName}`,
                              })
                            }
                          >
                            Denunciar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>

                  {visibleReplies.map((reply) => (
                    <article
                      key={reply.id}
                      className={`${styles.comment} ${styles.reply}`}
                    >
                      <CommentAvatar comment={reply} />
                      <div className={styles.commentBody}>
                        <header>
                          <strong>{reply.author.displayName}</strong>
                          <small>{formatPublishedAt(reply.createdAt)}</small>
                        </header>
                        {editingCommentId === reply.id ? (
                          <div className={styles.commentEdit}>
                            <textarea
                              rows={2}
                              maxLength={2000}
                              value={editingCommentText}
                              onChange={(e) =>
                                setEditingCommentText(e.target.value)
                              }
                            />
                            <div>
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveComment(reply.id)}
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p>
                            <CommunityRichText text={reply.content} />
                          </p>
                        )}
                        <div className={styles.commentActions}>
                          {reply.permissions.canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(reply.id);
                                  setEditingCommentText(reply.content);
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteComment(reply.id)
                                }
                              >
                                Excluir
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setReportTarget({
                                  type: "comment",
                                  id: reply.id,
                                  label: `Comentário de ${reply.author.displayName}`,
                                })
                              }
                            >
                              Denunciar
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}

                  {hiddenReplies > 0 ? (
                    <button
                      type="button"
                      className={styles.showMoreReplies}
                      onClick={() =>
                        setExpandedReplyThreads((current) => {
                          const next = new Set(current);
                          next.add(comment.id);
                          return next;
                        })
                      }
                    >
                      Ver mais {hiddenReplies}{" "}
                      {hiddenReplies === 1 ? "resposta" : "respostas"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {hiddenCommentCount > 0 ? (
            <button
              type="button"
              className={styles.showMoreComments}
              onClick={() => setShowAllComments(true)}
            >
              Ver mais {hiddenCommentCount}{" "}
              {post.kind === "question" ? "respostas" : "comentários"}
            </button>
          ) : null}

          {replyTo ? (
            <div className={styles.replyingTo}>
              <span>
                Respondendo a <strong>{replyTo.author.displayName}</strong>
              </span>
              <button type="button" onClick={() => setReplyTo(null)}>
                <FiX />
              </button>
            </div>
          ) : null}

          <form
            className={styles.commentComposer}
            onSubmit={handleCreateComment}
          >
            <textarea
              rows={2}
              maxLength={2000}
              value={commentText}
              placeholder={
                replyTo
                  ? `Responder a ${replyTo.author.displayName}...`
                  : post.kind === "question"
                    ? "Escreva uma resposta..."
                    : "Escreva um comentário..."
              }
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              disabled={commentSubmitting || !commentText.trim()}
            >
              <FiSend />
              <span>{commentSubmitting ? "Enviando..." : "Enviar"}</span>
            </button>
          </form>
        </section>
      ) : null}

      {feedback ? (
        <p className={styles.actionFeedback} role="status">
          {feedback}
        </p>
      ) : null}

      {reportTarget ? (
        <CommunityReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetLabel={reportTarget.label}
          onClose={() => setReportTarget(null)}
          onSubmitted={() => onNotice?.("Denúncia enviada para análise.")}
        />
      ) : null}
    </article>
  );
}
