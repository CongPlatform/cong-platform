import pool from "../config/database.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

/**
 * Account deletion is intentionally different from deleting public.users.
 * The latter would cascade into records owned by NGOs. The user row remains
 * as a non-loginable, de-identified FK tombstone; Supabase Auth is removed.
 */
export async function deleteOwnAccount(authUserId: string): Promise<void> {
  // A identidade do provedor precisa ser obtida ANTES de remover o Auth.
  // Uma falha aqui impede a exclusão: não apagamos uma evidência necessária
  // sem conseguir registrá-la no arquivo restrito de segurança.
  const identityResult = await supabaseAdmin.auth.admin.getUserById(authUserId);
  if (identityResult.error || !identityResult.data.user) {
    throw new AppError(
      "Não foi possível confirmar sua identidade para exclusão. Tente novamente.",
      503,
      "ACCOUNT_DELETE_IDENTITY_UNAVAILABLE",
    );
  }
  const originalEmail = identityResult.data.user.email ?? null;
  const client = await pool.connect();
  let avatarPath: string | null;
  let deletedUserId: string;
  const filePaths: { bucket: string; path: string }[] = [];
  try {
    await client.query("begin");
    const result = await client.query<{
      id: string;
      name: string;
      username: string | null;
      avatarPath: string | null;
    }>(
      `select id, name, username, avatar_path as "avatarPath" from public.users
       where auth_user_id = $1 and deleted_at is null and active = true
       for update`,
      [authUserId],
    );
    const user = result.rows[0];
    if (!user)
      throw new AppError(
        "Conta indisponível para exclusão.",
        409,
        "ACCOUNT_DELETE_UNAVAILABLE",
      );

    // Never leave an NGO without a single other active team member.
    const soleMembership = await client.query<{ name: string }>(
      `select o.name from public.organization_users ou
       join public.organizations o on o.id=ou.organization_id
       where ou.user_id=$1 and ou.status='active' and o.active=true
       and not exists (
          select 1 from public.organization_users other
          join public.users member on member.id=other.user_id
          where other.organization_id=ou.organization_id and other.user_id<>$1
            and other.status='active' and member.active=true and member.deleted_at is null
            and exists (select 1 from public.roles r where r.id=other.role_id and r.code='organization_admin')
       ) limit 1`,
      [user.id],
    );
    if (soleMembership.rows[0]) {
      throw new AppError(
        `Antes de excluir sua conta, adicione outro responsável ativo à organização "${soleMembership.rows[0].name}". Assim o site continuará administrável.`,
        409,
        "ACCOUNT_ORGANIZATION_TRANSFER_REQUIRED",
      );
    }
    // A platform admin cannot remove the last active platform admin.
    const lastAdmin = await client.query<{ last: boolean }>(
      `select exists(select 1 from public.users me join public.roles r on r.id=me.platform_role_id
          where me.id=$1 and r.code='platform_admin')
       and not exists(select 1 from public.users other join public.roles r on r.id=other.platform_role_id
          where other.id<>$1 and other.active=true and other.deleted_at is null and r.code='platform_admin') as last`,
      [user.id],
    );
    if (lastAdmin.rows[0]?.last) {
      throw new AppError(
        "Cadastre outro administrador da plataforma antes de excluir esta conta.",
        409,
        "ACCOUNT_LAST_ADMIN",
      );
    }

    // A trilha de auditoria fica separada do perfil público. O perfil e o Auth
    // podem desaparecer, mas ações institucionais e denúncias com evidência
    // legítima permanecem investigáveis por administradores autorizados.
    const hasRelevantHistory = await client.query<{ tracked: boolean }>(
      `select (
         exists(select 1 from public.security_audit_events where actor_user_id=$1 or subject_user_id=$1)
         or exists(select 1 from public.security_report_evidence where reporter_user_id=$1 or subject_user_id=$1)
         or exists(select 1 from public.organization_users where user_id=$1)
         or exists(select 1 from public.institutional_sites where created_by=$1)
         or exists(select 1 from public.institutional_site_publications where published_by=$1)
       ) as tracked`,
      [user.id],
    );
    if (hasRelevantHistory.rows[0]?.tracked) {
      await client.query(
        `insert into public.security_audit_identities
          (user_id, original_name, original_username, original_email, retention_reason)
         values ($1,$2,$3,$4,$5)
         on conflict (user_id) do nothing`,
        [
          user.id,
          user.name,
          user.username,
          originalEmail,
          "Auditoria institucional ou preservação de evidências de denúncias.",
        ],
      );
    }
    await client.query("select set_config('cong.actor_user_id', $1, true)", [
      user.id,
    ]);
    await client.query(
      `insert into public.security_audit_events
        (event_type, entity_type, entity_id, actor_user_id, subject_user_id, after_state)
       values ('account.deleted', 'user', $1, $1, $1, $2::jsonb)`,
      [
        user.id,
        JSON.stringify({
          authenticationRemoved: false,
          profileAnonymized: true,
        }),
      ],
    );

    // Remove personal interactions. Keep institutional publications and
    // organizational resources intact; those retain anonymous authorship.
    await client.query(
      `delete from public.community_user_follows where follower_user_id=$1 or followed_user_id=$1`,
      [user.id],
    );
    await client.query(
      `delete from public.community_user_blocks where blocker_user_id=$1 or blocked_user_id=$1`,
      [user.id],
    );
    await client.query(
      `delete from public.message_reactions where user_id=$1`,
      [user.id],
    );
    const attachments = await client.query<{ storagePath: string }>(
      `select storage_path as "storagePath" from public.message_attachments where owner_id=$1`,
      [user.id],
    );
    filePaths.push(
      ...attachments.rows.map((row) => ({
        bucket: "cong-chat-files",
        path: row.storagePath,
      })),
    );
    // Personal community media is removed; organizational publication media stays.
    const personalMedia = await client.query<{ storagePath: string }>(
      `select m.storage_path as "storagePath" from public.community_media m
       left join public.community_posts p on p.id=m.post_id
       where m.owner_user_id=$1 and (m.post_id is null or p.author_organization_id is null)`,
      [user.id],
    );
    filePaths.push(
      ...personalMedia.rows.map((row) => ({
        bucket: "community-media",
        path: row.storagePath,
      })),
    );

    await client.query(
      `update public.message_entries
      set body='', attachment_id=null, deleted_for_all_at=coalesce(deleted_for_all_at,now())
      where sender_user_id=$1`,
      [user.id],
    );
    await client.query(
      `delete from public.message_attachments where owner_id=$1`,
      [user.id],
    );
    // Personal posts are removed; institutional posts are not deleted.
    await client.query(
      `delete from public.community_posts
      where author_user_id=$1 and author_organization_id is null`,
      [user.id],
    );
    await client.query(
      `delete from public.community_media m using public.community_posts p
      where m.post_id=p.id and m.owner_user_id=$1 and p.author_organization_id is null`,
      [user.id],
    );
    await client.query(
      `delete from public.community_media where owner_user_id=$1 and post_id is null`,
      [user.id],
    );
    await client.query(
      `delete from public.organization_users where user_id=$1`,
      [user.id],
    );
    await client.query(
      `delete from public.message_conversation_participants where user_id=$1`,
      [user.id],
    );
    // Preserve references required by published institutional templates.
    await client.query(
      `update public.collaboration_profiles set is_active=false, profile_data='{}'::jsonb where user_id=$1`,
      [user.id],
    );

    await client.query(
      `update public.users set
       active=false, name='Conta excluída', display_name=null, pronouns=null,
       username=null, bio=null, avatar_path=null, platform_role_id=null,
       last_access_at=null, self_deactivated_at=null,
       onboarding_roles='{}', onboarding_representations='{}',
       deletion_requested_at=coalesce(deletion_requested_at,now()),
       deleted_at=now(), updated_at=now()
      where id=$1`,
      [user.id],
    );
    await client.query(
      `insert into public.account_deletion_jobs (user_id, auth_user_id)
      values ($1,$2) on conflict(user_id) do nothing`,
      [user.id, authUserId],
    );
    await client.query("commit");
    avatarPath = user.avatarPath;
    deletedUserId = user.id;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  // The database is already anonymized and access blocked even if an external
  // provider is temporarily unavailable. The job remains visible for retry.
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
  if (error) {
    console.error(
      "Supabase Auth could not complete account deletion:",
      error.message,
    );
    await pool.query(
      `update public.account_deletion_jobs
      set attempt_count=attempt_count+1,last_failure_at=now() where user_id=$1`,
      [deletedUserId],
    );
    throw new AppError(
      "Os dados pessoais foram removidos e o acesso foi bloqueado, mas a exclusão da autenticação está pendente. Entre em contato com o suporte.",
      502,
      "ACCOUNT_AUTH_DELETION_PENDING",
    );
  }
  await pool.query(
    `update public.account_deletion_jobs
      set completed_at=now(),auth_user_id=null,last_failure_at=null where user_id=$1`,
    [deletedUserId],
  );
  if (avatarPath) filePaths.push({ bucket: "avatars", path: avatarPath });
  for (const bucketName of new Set(filePaths.map(({ bucket }) => bucket))) {
    const paths = filePaths
      .filter((item) => item.bucket === bucketName)
      .map((item) => item.path);
    for (let index = 0; index < paths.length; index += 80) {
      const { error: fileError } = await supabaseAdmin.storage
        .from(bucketName)
        .remove(paths.slice(index, index + 80));
      if (fileError)
        console.error(
          `Falha na remoção de mídia pessoal em ${bucketName}:`,
          fileError.message,
        );
    }
  }
}
