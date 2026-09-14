import { useState } from "react";
import {
  FiBell,
  FiCheck,
  FiHeart,
  FiMessageCircle,
  FiShield,
  FiUserPlus,
  FiUsers,
  FiX,
} from "react-icons/fi";

import {
  markAllCommunityNotificationsRead,
  markCommunityNotificationRead,
  type CommunityNotification,
  type CommunityNotificationsPayload,
} from "../../services/communityService";
import styles from "./CommunityNotificationsPanel.module.css";

interface Props {
  payload: CommunityNotificationsPayload;
  onClose: () => void;
  onChanged: (payload: CommunityNotificationsPayload) => void;
  onOpenPost: (postId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenModeration: () => void;
}

function iconFor(type: CommunityNotification["type"]) {
  if (type === "post_like") return FiHeart;
  if (type === "post_comment" || type === "comment_reply")
    return FiMessageCircle;
  if (type === "user_follow") return FiUserPlus;
  if (type === "survey_response" || type === "survey_results_published")
    return FiUsers;
  if (type === "moderation_report" || type === "moderation_action")
    return FiShield;
  return FiBell;
}

function textFor(notification: CommunityNotification) {
  const actor = notification.actor?.displayName ?? "Alguém";
  switch (notification.type) {
    case "post_mention":
      return `${actor} mencionou você em uma publicação`;
    case "post_like":
      return `${actor} apoiou sua publicação`;
    case "post_comment":
      return `${actor} comentou na sua publicação`;
    case "comment_reply":
      return `${actor} respondeu seu comentário`;
    case "user_follow":
      return `${actor} começou a seguir você`;
    case "survey_response":
      return `${actor} respondeu sua pesquisa`;
    case "survey_results_published":
      return `${actor} publicou os resultados de uma pesquisa`;
    case "event_update":
      return notification.event?.status === "cancelled"
        ? `${actor} cancelou um evento em que você estava participando`
        : `${actor} atualizou um evento em que você está participando`;
    case "moderation_report":
      return `${actor} enviou uma denúncia que aguarda moderação`;
    case "moderation_action":
      return notification.actor
        ? `${actor} registrou uma ação de moderação no seu conteúdo`
        : "A moderação retirou temporariamente seu conteúdo para revisão";
  }
}

function formatTime(value: string) {
  const time = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export default function CommunityNotificationsPanel({
  payload,
  onClose,
  onChanged,
  onOpenPost,
  onOpenEvent,
  onOpenModeration,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markOne = async (notification: CommunityNotification) => {
    if (busyId) return;
    setBusyId(notification.id);
    setError(null);
    try {
      if (!notification.isRead) {
        await markCommunityNotificationRead(notification.id);
        onChanged({
          unreadCount: Math.max(0, payload.unreadCount - 1),
          notifications: payload.notifications.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
        });
      }
      if (notification.type === "moderation_report") {
        onOpenModeration();
        return;
      }
      if (notification.post) onOpenPost(notification.post.id);
      if (notification.event) onOpenEvent(notification.event.id);
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Não foi possível abrir esta notificação.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    if (payload.unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    setError(null);
    try {
      await markAllCommunityNotificationsRead();
      onChanged({
        unreadCount: 0,
        notifications: payload.notifications.map((item) => ({
          ...item,
          isRead: true,
        })),
      });
    } catch (markError) {
      setError(
        markError instanceof Error
          ? markError.message
          : "Não foi possível marcar as notificações como lidas.",
      );
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div
      className={styles.panel}
      role="dialog"
      aria-label="Notificações da comunidade"
    >
      <header>
        <div>
          <strong>Notificações</strong>
          <span>
            {payload.unreadCount
              ? `${payload.unreadCount} não lida${payload.unreadCount === 1 ? "" : "s"}`
              : "Tudo em dia"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar notificações"
        >
          <FiX />
        </button>
      </header>
      <div className={styles.toolbar}>
        <button
          type="button"
          onClick={() => void markAll()}
          disabled={payload.unreadCount === 0 || markingAll}
        >
          <FiCheck /> {markingAll ? "Salvando..." : "Marcar todas como lidas"}
        </button>
      </div>
      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}
      <div className={styles.list}>
        {payload.notifications.length === 0 ? (
          <div className={styles.empty}>
            <FiBell />
            <strong>Nenhuma notificação ainda</strong>
            <span>Interações da comunidade aparecerão aqui.</span>
          </div>
        ) : (
          payload.notifications.map((notification) => {
            const Icon = iconFor(notification.type);
            return (
              <button
                key={notification.id}
                type="button"
                className={styles.item}
                data-unread={!notification.isRead}
                onClick={() => void markOne(notification)}
                disabled={busyId === notification.id}
              >
                <span className={styles.icon}>
                  <Icon />
                </span>
                <span className={styles.copy}>
                  <strong>{textFor(notification)}</strong>
                  {notification.post ? (
                    <small>{notification.post.title}</small>
                  ) : notification.event ? (
                    <small>{notification.event.title}</small>
                  ) : null}
                  <em>{formatTime(notification.createdAt)}</em>
                </span>
                {!notification.isRead ? <i aria-label="Não lida" /> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
