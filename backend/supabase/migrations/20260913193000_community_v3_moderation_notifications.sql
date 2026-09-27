-- =========================================================
-- CONG - Comunidade V3.0
-- Notificações relacionadas a denúncias e ações de moderação.
-- =========================================================

-- Atualiza a restrição dos tipos de notificação para incluir
-- eventos relacionados ao sistema de moderação.
--
-- A restrição anterior é removida antes de ser recriada,
-- permitindo que a lista de valores suportados seja atualizada.
alter table public.community_notifications
  drop constraint if exists community_notifications_type_check;

-- Mantém os tipos de interação já existentes e adiciona:
-- - moderation_report: notificação relacionada a uma denúncia;
-- - moderation_action: notificação relacionada a uma ação de moderação.
alter table public.community_notifications
  add constraint community_notifications_type_check check (
    notification_type in (
      'post_like',
      'post_comment',
      'comment_reply',
      'user_follow',
      'survey_response',
      'survey_results_published',
      'event_update',
      'post_mention',
      'moderation_report',
      'moderation_action'
    )
  );
