-- Privacidade nas notificações de denúncias e decisões de moderação.
-- Remove a identificação do denunciante e do moderador dos avisos já criados.
-- Não altera o histórico administrativo de auditoria e não apaga denúncias.
update public.community_notifications
set actor_user_id = null
where notification_type in ('moderation_action', 'moderation_report')
  and actor_user_id is not null;
