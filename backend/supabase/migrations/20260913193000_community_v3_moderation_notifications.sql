-- CONG Community V3.0
-- Notificações relacionadas a denúncias e ações de moderação.

alter table public.community_notifications
  drop constraint if exists community_notifications_type_check;

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
