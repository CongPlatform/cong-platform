import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { getAvatarPublicUrl } from "./avatar.service.js";
import { emailModerationDecision, emailNewCommunityReport } from "./moderation-email.service.js";

export type CommunitySearchResultType =
  "post" | "user" | "organization" | "event";

export interface CommunitySearchResult {
  type: CommunitySearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  meta: string | null;
}

export interface CommunitySearchPayload {
  query: string;
  results: CommunitySearchResult[];
}

export type CommunityReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "misinformation"
  | "privacy"
  | "scam"
  | "other";

export type CommunityReportTarget =
  | { targetType: "post"; targetId: string }
  | { targetType: "comment"; targetId: string }
  | { targetType: "user"; targetId: string };

export type CreateCommunityReportInput = CommunityReportTarget & {
  reason: CommunityReportReason;
  details?: string;
};

export interface CommunityModerationReport {
  id: string;
  targetType: "post" | "comment" | "user";
  targetId: string;
  reason: CommunityReportReason;
  details: string;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  createdAt: Date;
  reporter: { id: string; displayName: string; username: string | null };
  target: {
    label: string;
    excerpt: string | null;
    authorUserId: string | null;
  };
  restriction: { status: "suspended" | "banned"; suspendedUntil: Date | null } | null;
  canRestrictUsers: boolean;
  contentHidden: boolean;
}

async function notifyCommunityModerators(
  reporterUserId: string,
  reportId: string,
  input: CreateCommunityReportInput,
): Promise<void> {
  const moderators = await pool.query<{ userId: string }>(
    `
      select distinct u.id as "userId"
      from public.users u
      join public.roles r on r.id = u.platform_role_id
      left join public.role_permissions rp on rp.role_id = r.id
      left join public.permissions p on p.id = rp.permission_id
      where u.active = true
        and (r.code in ('community_moderator', 'platform_admin') or p.code = 'community.moderate')
    `,
  );

  for (const moderator of moderators.rows) {
    if (moderator.userId === reporterUserId) continue;
    await pool.query(
      `
        insert into public.community_notifications (
          user_id, actor_user_id, notification_type, dedupe_key, post_id, comment_id
        ) values ($1, null, 'moderation_report', $2, $3, $4)
        on conflict (dedupe_key) do update
          set actor_user_id = null, is_read = false, created_at = now(), read_at = null
      `,
      [
        moderator.userId,
        `moderation_report:${reportId}:${moderator.userId}`,
        input.targetType === "post" ? input.targetId : null,
        input.targetType === "comment" ? input.targetId : null,
      ],
    );
  }
}

async function notifyModerationTarget(
  client: import("pg").PoolClient,
  input: {
    recipientUserId: string | null;
    moderatorUserId: string | null;
    reportId: string;
    action: "hide_content" | "restore_content" | "auto_hide";
    postId: string | null;
    commentId: string | null;
  },
): Promise<void> {
  if (!input.recipientUserId || input.recipientUserId === input.moderatorUserId)
    return;
  await client.query(
    `
      insert into public.community_notifications (
        user_id, actor_user_id, notification_type, dedupe_key, post_id, comment_id
      ) values ($1, null, 'moderation_action', $2, $3, $4)
      on conflict (dedupe_key) do update
        set actor_user_id = null, is_read = false, created_at = now(), read_at = null
    `,
    [
      input.recipientUserId,
      `moderation_action:${input.reportId}:${input.action}:${input.recipientUserId}`,
      input.postId,
      input.commentId,
    ],
  );
}

async function getViewer(authUserId: string): Promise<{ id: string }> {
  const result = await pool.query<{ id: string }>(
    `select id from public.users where auth_user_id = $1 and active = true limit 1`,
    [authUserId],
  );
  const user = result.rows[0];
  if (!user) {
    throw new AppError(
      "Usuário ativo não encontrado.",
      401,
      "COMMUNITY_USER_NOT_FOUND",
    );
  }
  return user;
}

export async function canModerateCommunity(
  authUserId: string,
): Promise<boolean> {
  const viewer = await getViewer(authUserId);
  const result = await pool.query<{ allowed: boolean }>(
    `
      select exists (
        select 1
        from public.users u
        join public.roles r on r.id = u.platform_role_id
        left join public.role_permissions rp on rp.role_id = r.id
        left join public.permissions p on p.id = rp.permission_id
        where u.id = $1
          and (r.code in ('community_moderator', 'platform_admin') or p.code = 'community.moderate')
      ) as allowed
    `,
    [viewer.id],
  );
  return Boolean(result.rows[0]?.allowed);
}

async function requireModerator(authUserId: string): Promise<{ id: string }> {
  const viewer = await getViewer(authUserId);
  const result = await pool.query<{ allowed: boolean }>(
    `
      select exists (
        select 1
        from public.users u
        join public.roles r on r.id = u.platform_role_id
        left join public.role_permissions rp on rp.role_id = r.id
        left join public.permissions p on p.id = rp.permission_id
        where u.id = $1
          and (r.code in ('community_moderator', 'platform_admin') or p.code = 'community.moderate')
      ) as allowed
    `,
    [viewer.id],
  );
  if (!result.rows[0]?.allowed) {
    throw new AppError(
      "Você não possui permissão para moderar a comunidade.",
      403,
      "COMMUNITY_MODERATION_FORBIDDEN",
    );
  }
  return viewer;
}

export async function searchCommunity(
  authUserId: string,
  rawQuery: string,
  limit = 20,
): Promise<CommunitySearchPayload> {
  const viewer = await getViewer(authUserId);
  const query = rawQuery.trim().slice(0, 120);
  if (query.length < 2) return { query, results: [] };
  const take = Math.min(30, Math.max(4, limit));
  const pattern = `%${query.replace(/[%_]/g, "\\$&")}%`;

  const [posts, users, organizations, events] = await Promise.all([
    pool.query<{
      id: string;
      title: string;
      subtitle: string;
      kind: string;
    }>(
      `
        select cp.id, cp.title, cp.description as subtitle, cp.post_type as kind
        from public.community_posts cp
        where cp.status = 'published'
          and not exists (
            select 1 from public.community_content_moderation cm
            where cm.target_type = 'post' and cm.target_id = cp.id and cm.state = 'hidden'
          )
          and not exists (
            select 1 from public.community_user_blocks b
            where (b.blocker_user_id = $1 and b.blocked_user_id = cp.author_user_id)
               or (b.blocker_user_id = cp.author_user_id and b.blocked_user_id = $1)
          )
          and (
            cp.title ilike $2 escape '\\'
            or cp.description ilike $2 escape '\\'
            or cp.content ilike $2 escape '\\'
            or exists (select 1 from unnest(cp.searchable_tags) tag where tag ilike $2 escape '\\')
          )
        order by coalesce(cp.boosted_at, cp.published_at) desc
        limit $3
      `,
      [viewer.id, pattern, Math.max(4, Math.floor(take / 2))],
    ),
    pool.query<{
      id: string;
      displayName: string;
      username: string | null;
      avatarPath: string | null;
    }>(
      `
        select u.id, coalesce(u.display_name, u.name) as "displayName", u.username, u.avatar_path as "avatarPath"
        from public.users u
        where u.active = true and u.id <> $1
          and not exists (
            select 1 from public.community_user_blocks b
            where (b.blocker_user_id = $1 and b.blocked_user_id = u.id)
               or (b.blocker_user_id = u.id and b.blocked_user_id = $1)
          )
          and (coalesce(u.display_name, u.name) ilike $2 escape '\\' or u.username ilike $2 escape '\\')
        order by coalesce(u.display_name, u.name) asc
        limit $3
      `,
      [viewer.id, pattern, Math.max(4, Math.floor(take / 3))],
    ),
    pool.query<{
      id: string;
      name: string;
      organizationType: string;
    }>(
      `
        select o.id, o.name, o.organization_type as "organizationType"
        from public.organizations o
        where o.active = true
          and (o.name ilike $1 escape '\\' or coalesce(o.description, '') ilike $1 escape '\\')
        order by o.name asc
        limit $2
      `,
      [pattern, Math.max(4, Math.floor(take / 3))],
    ),
    pool.query<{
      id: string;
      title: string;
      description: string;
      startsAt: Date;
    }>(
      `
        select e.id, e.title, e.description, e.starts_at as "startsAt"
        from public.community_events e
        where e.status = 'published'
          and not exists (
            select 1 from public.community_user_blocks b
            where (b.blocker_user_id = $1 and b.blocked_user_id = e.organizer_user_id)
               or (b.blocker_user_id = e.organizer_user_id and b.blocked_user_id = $1)
          )
          and (e.title ilike $2 escape '\\' or e.description ilike $2 escape '\\' or coalesce(e.location, '') ilike $2 escape '\\')
        order by e.starts_at desc
        limit $3
      `,
      [viewer.id, pattern, Math.max(3, Math.floor(take / 4))],
    ),
  ]);

  const result: CommunitySearchResult[] = [
    ...users.rows.map((row) => ({
      type: "user" as const,
      id: row.id,
      title: row.displayName,
      subtitle: row.username ? `@${row.username}` : null,
      avatarUrl: getAvatarPublicUrl(row.avatarPath),
      meta: "Pessoa",
    })),
    ...organizations.rows.map((row) => ({
      type: "organization" as const,
      id: row.id,
      title: row.name,
      subtitle: null,
      avatarUrl: null,
      meta: row.organizationType === "ngo" ? "ONG" : "Organização",
    })),
    ...posts.rows.map((row) => ({
      type: "post" as const,
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      avatarUrl: null,
      meta:
        row.kind === "request"
          ? "Oportunidade"
          : row.kind === "update"
            ? "Projeto / atualização"
            : row.kind === "resource"
              ? "Recurso / módulo"
              : "Publicação",
    })),
    ...events.rows.map((row) => ({
      type: "event" as const,
      id: row.id,
      title: row.title,
      subtitle: row.description || null,
      avatarUrl: null,
      meta: `Evento · ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(row.startsAt)}`,
    })),
  ].slice(0, take);

  return { query, results: result };
}

export async function getCommunityBlockStatus(
  authUserId: string,
  targetUserId: string,
): Promise<{ blockedByMe: boolean; blocksMe: boolean }> {
  const viewer = await getViewer(authUserId);
  const result = await pool.query<{ blockedByMe: boolean; blocksMe: boolean }>(
    `
      select
        exists(select 1 from public.community_user_blocks where blocker_user_id = $1 and blocked_user_id = $2) as "blockedByMe",
        exists(select 1 from public.community_user_blocks where blocker_user_id = $2 and blocked_user_id = $1) as "blocksMe"
    `,
    [viewer.id, targetUserId],
  );
  return result.rows[0] ?? { blockedByMe: false, blocksMe: false };
}

export async function blockCommunityUser(
  authUserId: string,
  targetUserId: string,
): Promise<void> {
  const viewer = await getViewer(authUserId);
  if (viewer.id === targetUserId) {
    throw new AppError(
      "Você não pode bloquear a própria conta.",
      400,
      "COMMUNITY_SELF_BLOCK_NOT_ALLOWED",
    );
  }
  const target = await pool.query(
    `select 1 from public.users where id = $1 and active = true`,
    [targetUserId],
  );
  if (!target.rowCount) {
    throw new AppError(
      "Perfil da comunidade não encontrado.",
      404,
      "COMMUNITY_PROFILE_NOT_FOUND",
    );
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into public.community_user_blocks (blocker_user_id, blocked_user_id) values ($1,$2) on conflict do nothing`,
      [viewer.id, targetUserId],
    );
    await client.query(
      `delete from public.community_user_follows where (follower_user_id = $1 and followed_user_id = $2) or (follower_user_id = $2 and followed_user_id = $1)`,
      [viewer.id, targetUserId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

}

export async function unblockCommunityUser(
  authUserId: string,
  targetUserId: string,
): Promise<void> {
  const viewer = await getViewer(authUserId);
  await pool.query(
    `delete from public.community_user_blocks where blocker_user_id = $1 and blocked_user_id = $2`,
    [viewer.id, targetUserId],
  );
}

async function resolveReportTarget(
  viewerId: string,
  input: CreateCommunityReportInput,
): Promise<{ authorUserId: string | null; postId: string | null }> {
  if (input.targetType === "post") {
    const result = await pool.query<{ authorUserId: string; postId: string }>(
      `select author_user_id as "authorUserId", id as "postId" from public.community_posts where id = $1`,
      [input.targetId],
    );
    const row = result.rows[0];
    if (!row)
      throw new AppError(
        "Publicação não encontrada.",
        404,
        "COMMUNITY_POST_NOT_FOUND",
      );
    if (row.authorUserId === viewerId)
      throw new AppError(
        "Você não pode denunciar sua própria publicação.",
        400,
        "COMMUNITY_SELF_REPORT_NOT_ALLOWED",
      );
    return row;
  }
  if (input.targetType === "comment") {
    const result = await pool.query<{ authorUserId: string; postId: string }>(
      `select author_user_id as "authorUserId", post_id as "postId" from public.community_post_comments where id = $1`,
      [input.targetId],
    );
    const row = result.rows[0];
    if (!row)
      throw new AppError(
        "Comentário não encontrado.",
        404,
        "COMMUNITY_COMMENT_NOT_FOUND",
      );
    if (row.authorUserId === viewerId)
      throw new AppError(
        "Você não pode denunciar seu próprio comentário.",
        400,
        "COMMUNITY_SELF_REPORT_NOT_ALLOWED",
      );
    return row;
  }
  const result = await pool.query<{ id: string }>(
    `select id from public.users where id = $1 and active = true`,
    [input.targetId],
  );
  if (!result.rows[0])
    throw new AppError(
      "Perfil não encontrado.",
      404,
      "COMMUNITY_PROFILE_NOT_FOUND",
    );
  if (input.targetId === viewerId)
    throw new AppError(
      "Você não pode denunciar sua própria conta.",
      400,
      "COMMUNITY_SELF_REPORT_NOT_ALLOWED",
    );
  return { authorUserId: input.targetId, postId: null };
}

export async function createCommunityReport(
  authUserId: string,
  input: CreateCommunityReportInput,
): Promise<{ id: string; status: string }> {
  const viewer = await getViewer(authUserId);
  const target = await resolveReportTarget(viewer.id, input);
  const column =
    input.targetType === "post"
      ? "post_id"
      : input.targetType === "comment"
        ? "comment_id"
        : "reported_user_id";
  try {
    const result = await pool.query<{ id: string; status: string }>(
      `
        insert into public.community_reports (reporter_user_id, ${column}, reason, details)
        values ($1,$2,$3,$4)
        returning id, status
      `,
      [
        viewer.id,
        input.targetId,
        input.reason,
        input.details?.trim().slice(0, 1200) ?? "",
      ],
    );
    const report = result.rows[0];
    if (!report)
      throw new AppError(
        "Não foi possível registrar a denúncia.",
        500,
        "COMMUNITY_REPORT_FAILED",
      );

    if (input.targetType !== "user") {
      const threshold = await pool.query<{ count: number }>(
        `select count(distinct reporter_user_id)::int as count from public.community_reports where ${column} = $1 and status = 'pending'`,
        [input.targetId],
      );
      if ((threshold.rows[0]?.count ?? 0) >= 3) {
        await pool.query(
          `
            insert into public.community_content_moderation (target_type, target_id, state, reason, source)
            values ($1,$2,'hidden','Ocultado automaticamente após múltiplas denúncias pendentes.','report_threshold')
            on conflict (target_type, target_id) do update
              set state = 'hidden', reason = excluded.reason, source = excluded.source, updated_by_user_id = null, updated_at = now()
          `,
          [input.targetType, input.targetId],
        );
        const notificationClient = await pool.connect();
        try {
          await notifyModerationTarget(notificationClient, {
            recipientUserId: target.authorUserId,
            moderatorUserId: null,
            reportId: report.id,
            action: "auto_hide",
            postId:
              input.targetType === "post" ? input.targetId : target.postId,
            commentId: input.targetType === "comment" ? input.targetId : null,
          });
        } finally {
          notificationClient.release();
        }
      }
    }
    await notifyCommunityModerators(viewer.id, report.id, input);
    // O registro e o aviso interno já existem mesmo se o provedor de e-mail falhar.
    try {
      await emailNewCommunityReport({ reportId: report.id, reporterUserId: viewer.id, targetType: input.targetType });
    } catch (error) {
      console.error("Não foi possível consultar os e-mails dos moderadores", { reportId: report.id, error });
    }
    return report;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      throw new AppError(
        "Você já denunciou este conteúdo.",
        409,
        "COMMUNITY_REPORT_ALREADY_EXISTS",
      );
    }
    throw error;
  }
}

export async function listCommunityModerationReports(
  authUserId: string,
  status = "pending",
): Promise<CommunityModerationReport[]> {
  await requireModerator(authUserId);
  // Se a migration das sanções não foi aplicada neste banco, a central de
  // denúncias continua acessível; apenas as ações disciplinares são bloqueadas.
  // Não ocultar falhas de consultas reais ou outras permissões.
  const schema = await pool.query<{ sanctionsReady: boolean }>(
    `select to_regclass('public.community_user_sanctions') is not null as "sanctionsReady"`,
  );
  const canRestrictUsers = schema.rows[0]?.sanctionsReady === true;
  const allowed = new Set([
    "pending",
    "reviewed",
    "actioned",
    "dismissed",
    "all",
  ]);
  const normalized = allowed.has(status) ? status : "pending";

  const result = await pool
    .query<{
      id: string;
      postId: string | null;
      commentId: string | null;
      reportedUserId: string | null;
      reason: CommunityReportReason;
      details: string;
      status: CommunityModerationReport["status"];
      createdAt: Date;
      reporterId: string;
      reporterName: string;
      reporterUsername: string | null;
    }>(
      `
      select
        report.id,
        report.post_id as "postId",
        report.comment_id as "commentId",
        report.reported_user_id as "reportedUserId",
        report.reason,
        report.details,
        report.status,
        report.created_at as "createdAt",
        reporter.id as "reporterId",
        coalesce(reporter.display_name, reporter.name) as "reporterName",
        reporter.username as "reporterUsername"
      from public.community_reports report
      join public.users reporter on reporter.id = report.reporter_user_id
      where ($1::text = 'all' or report.status = $1::text)
      order by report.created_at desc
      limit 100
    `,
      [normalized],
    )
    .catch((error: unknown) => {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";
      if (code === "42P01" || code === "42703") {
        throw new AppError(
          "A estrutura de moderação ainda não foi aplicada ao banco. Execute a migration de correção da Community V3.0.",
          503,
          "COMMUNITY_MODERATION_SCHEMA_MISSING",
        );
      }
      throw error;
    });

  try {
    return await Promise.all(
    result.rows.map(async (row): Promise<CommunityModerationReport> => {
      let targetLabel = "Conteúdo indisponível";
      let targetExcerpt: string | null = null;
      let targetAuthorUserId: string | null = null;

      if (row.postId) {
        const target = await pool.query<{
          title: string;
          excerpt: string | null;
          authorUserId: string;
        }>(
          `
            select
              title,
              left(coalesce(nullif(description, ''), nullif(content, ''), title), 320) as excerpt,
              author_user_id as "authorUserId"
            from public.community_posts
            where id = $1
            limit 1
          `,
          [row.postId],
        );
        if (target.rows[0]) {
          targetLabel = target.rows[0].title;
          targetExcerpt = target.rows[0].excerpt;
          targetAuthorUserId = target.rows[0].authorUserId;
        }
      } else if (row.commentId) {
        const target = await pool.query<{
          content: string;
          authorUserId: string;
        }>(
          `
            select
              left(content, 320) as content,
              author_user_id as "authorUserId"
            from public.community_post_comments
            where id = $1
            limit 1
          `,
          [row.commentId],
        );
        if (target.rows[0]) {
          targetLabel =
            target.rows[0].content.slice(0, 120) || "Comentário denunciado";
          targetExcerpt = target.rows[0].content;
          targetAuthorUserId = target.rows[0].authorUserId;
        }
      } else if (row.reportedUserId) {
        const target = await pool.query<{
          displayName: string;
          username: string | null;
        }>(
          `
            select
              coalesce(display_name, name) as "displayName",
              username
            from public.users
            where id = $1
            limit 1
          `,
          [row.reportedUserId],
        );
        if (target.rows[0]) {
          targetLabel = target.rows[0].displayName;
          targetExcerpt = target.rows[0].username
            ? `@${target.rows[0].username}`
            : null;
          targetAuthorUserId = row.reportedUserId;
        }
      }

      const restriction = targetAuthorUserId && canRestrictUsers ? await pool.query<{
        status: "suspended" | "banned"; suspendedUntil: Date | null;
      }>(`select status, suspended_until as "suspendedUntil"
          from public.community_user_sanctions
          where user_id = $1 and (status = 'banned' or suspended_until > now())`,
          [targetAuthorUserId]) : null;
      const contentState = (row.postId || row.commentId) ? await pool.query<{ state: string }>(
        `select state from public.community_content_moderation
         where target_type = $1 and target_id = $2 limit 1`,
        [row.postId ? "post" : "comment", row.postId ?? row.commentId],
      ) : null;
      return {
        contentHidden: contentState?.rows[0]?.state === "hidden",
        restriction: restriction?.rows[0] ?? null,
        canRestrictUsers,
        id: row.id,
        targetType: row.postId ? "post" : row.commentId ? "comment" : "user",
        targetId: row.postId ?? row.commentId ?? row.reportedUserId ?? "",
        reason: row.reason,
        details: row.details,
        status: row.status,
        createdAt: row.createdAt,
        reporter: {
          id: row.reporterId,
          displayName: row.reporterName,
          username: row.reporterUsername,
        },
        target: {
          label: targetLabel,
          excerpt: targetExcerpt,
          authorUserId: targetAuthorUserId,
        },
      };
    }),
  );
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "") : "";
    if (code === "42P01" || code === "42703") {
      console.error("Estrutura SQL de moderação incompleta", { code });
      throw new AppError(
        "A central de moderação precisa das migrations de banco atualizadas. Confira community_user_sanctions e community_reports no Supabase.",
        503,
        "COMMUNITY_MODERATION_SCHEMA_MISSING",
      );
    }
    throw error;
  }
}

export async function reviewCommunityReport(
  authUserId: string,
  reportId: string,
  action: "review" | "dismiss" | "hide_content" | "restore_content" | "warn_user" | "suspend_24h" | "suspend_7d" | "ban_user" | "lift_restriction",
  note = "",
  guidance = "",
  responseHours: 24 | 168 | null = null,
): Promise<void> {
  const moderator = await requireModerator(authUserId);
  const reportResult = await pool.query<{
    postId: string | null;
    commentId: string | null;
    reportedUserId: string | null;
  }>(
    `
      select
        post_id as "postId",
        comment_id as "commentId",
        reported_user_id as "reportedUserId"
      from public.community_reports
      where id = $1
      limit 1
    `,
    [reportId],
  );
  const baseReport = reportResult.rows[0];
  let report:
    | {
        postId: string | null;
        commentId: string | null;
        targetAuthorUserId: string | null;
        targetPostId: string | null;
      }
    | undefined;

  if (baseReport?.postId) {
    const target = await pool.query<{ authorUserId: string }>(
      `select author_user_id as "authorUserId" from public.community_posts where id = $1 limit 1`,
      [baseReport.postId],
    );
    report = {
      postId: baseReport.postId,
      commentId: null,
      targetAuthorUserId: target.rows[0]?.authorUserId ?? null,
      targetPostId: baseReport.postId,
    };
  } else if (baseReport?.commentId) {
    const target = await pool.query<{ authorUserId: string; postId: string }>(
      `select author_user_id as "authorUserId", post_id as "postId" from public.community_post_comments where id = $1 limit 1`,
      [baseReport.commentId],
    );
    report = {
      postId: null,
      commentId: baseReport.commentId,
      targetAuthorUserId: target.rows[0]?.authorUserId ?? null,
      targetPostId: target.rows[0]?.postId ?? null,
    };
  } else if (baseReport?.reportedUserId) {
    report = {
      postId: null,
      commentId: null,
      targetAuthorUserId: baseReport.reportedUserId,
      targetPostId: null,
    };
  }
  if (!report)
    throw new AppError(
      "Denúncia não encontrada.",
      404,
      "COMMUNITY_REPORT_NOT_FOUND",
    );
  if (
    (action === "hide_content" || action === "restore_content") &&
    !report.postId &&
    !report.commentId
  ) {
    throw new AppError(
      "Esta ação só se aplica a publicações ou comentários.",
      400,
      "COMMUNITY_MODERATION_ACTION_INVALID",
    );
  }
  if (responseHours !== null && responseHours !== 24 && responseHours !== 168) {
    throw new AppError("Prazo de resposta inválido.", 400, "MODERATION_DEADLINE_INVALID");
  }
  if (guidance.trim().length > 600) {
    throw new AppError("As orientações devem ter até 600 caracteres.", 400, "MODERATION_GUIDANCE_TOO_LONG");
  }
  const userAction = ["warn_user", "suspend_24h", "suspend_7d", "ban_user", "lift_restriction"].includes(action);
  const restricting = ["suspend_24h", "suspend_7d", "ban_user", "lift_restriction"].includes(action);
  if (userAction && !report.targetAuthorUserId) {
    throw new AppError("A denúncia não possui um usuário válido.", 400, "COMMUNITY_TARGET_INVALID");
  }
  if (userAction && (note.trim().length < 5 || note.trim().length > 1200)) {
    throw new AppError("Informe um motivo de pelo menos 5 caracteres.", 400, "MODERATION_REASON_REQUIRED");
  }
  if (userAction && report.targetAuthorUserId === moderator.id) {
    throw new AppError("Não é permitido moderar a própria conta.", 403, "MODERATION_SELF_FORBIDDEN");
  }
  if (userAction) {
    const target = await pool.query<{ role: string | null }>(
      `select r.code as role from public.users u left join public.roles r on r.id = u.platform_role_id where u.id = $1`,
      [report.targetAuthorUserId],
    );
    if (!target.rows[0]) throw new AppError("Usuário não encontrado.", 404, "COMMUNITY_TARGET_NOT_FOUND");
    if (target.rows[0].role === "platform_admin") {
      throw new AppError("Contas administradoras não podem ser sancionadas por este painel.", 403, "MODERATION_ADMIN_PROTECTED");
    }
    if (restricting && target.rows[0].role === "community_moderator") {
      const admin = await pool.query<{ allowed: boolean }>(
        `select exists(select 1 from public.users u join public.roles r on r.id = u.platform_role_id
         where u.id = $1 and r.code = 'platform_admin') as allowed`, [moderator.id],
      );
      if (!admin.rows[0]?.allowed) {
        throw new AppError("Apenas administradores podem restringir contas de moderadores.", 403, "MODERATION_MODERATOR_PROTECTED");
      }
    }
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    // Serializa decisões e rejeita repetição: um relatório resolvido não pode
    // ser "revisado" infinitamente nem receber a mesma sanção duas vezes.
    const locked = await client.query<{ status: CommunityModerationReport["status"] }>(
      `select status from public.community_reports where id = $1 for update`, [reportId],
    );
    const previousStatus = locked.rows[0]?.status;
    if (!previousStatus) throw new AppError("Denúncia não encontrada.", 404, "COMMUNITY_REPORT_NOT_FOUND");
    const reversible = action === "lift_restriction" || action === "restore_content";
    const escalation = previousStatus === "reviewed" && userAction && action !== "lift_restriction";
    if (previousStatus !== "pending" && !(reversible && previousStatus === "actioned") && !escalation) {
      throw new AppError("Esta denúncia já foi concluída. Atualize a lista para consultar a decisão.", 409, "COMMUNITY_REPORT_ALREADY_RESOLVED");
    }
    if (["suspend_24h", "suspend_7d", "ban_user"].includes(action) && report.targetAuthorUserId) {
      const existing = await client.query<{ status: string; suspendedUntil: Date | null }>(
        `select status, suspended_until as "suspendedUntil" from public.community_user_sanctions
         where user_id = $1 for update`, [report.targetAuthorUserId],
      );
      if (existing.rows[0]?.status === "banned") {
        throw new AppError("A conta já está banida. Reavalie a restrição existente.", 409, "MODERATION_ALREADY_BANNED");
      }
    }
    if (action === "lift_restriction") {
      if (!report.targetAuthorUserId) throw new AppError("Usuário inválido.", 400, "COMMUNITY_TARGET_INVALID");
      const activeSanction = await client.query(`select 1 from public.community_user_sanctions
        where user_id = $1 and (status = 'banned' or suspended_until > now()) for update`,
        [report.targetAuthorUserId]);
      if (!activeSanction.rowCount) throw new AppError("Esta conta não possui restrição ativa.", 409, "MODERATION_NOT_RESTRICTED");
    }
    if (action === "restore_content") {
      const visibleState = await client.query(`select 1 from public.community_content_moderation
        where target_type = $1 and target_id = $2 and state = 'hidden' for update`,
        [report.postId ? "post" : "comment", report.postId ?? report.commentId]);
      if (!visibleState.rowCount) throw new AppError("O conteúdo já está visível.", 409, "MODERATION_CONTENT_ALREADY_VISIBLE");
    }
    const status =
      action === "dismiss"
        ? "dismissed"
        : action === "hide_content" || action === "restore_content" || userAction ||
          (action === "review" && Boolean(report.postId || report.commentId))
          ? "actioned"
          : "reviewed";
    await client.query(
      `update public.community_reports set status = $2, reviewed_at = now(), reviewed_by_user_id = $3 where id = $1`,
      [reportId, status, moderator.id],
    );
    if (action === "hide_content" || action === "restore_content") {
      const targetType = report.postId ? "post" : "comment";
      const targetId = report.postId ?? report.commentId;
      await client.query(
        `
          insert into public.community_content_moderation (target_type, target_id, state, reason, source, updated_by_user_id)
          values ($1,$2,$3,$4,'manual',$5)
          on conflict (target_type, target_id) do update
            set state = excluded.state, reason = excluded.reason, source = 'manual', updated_by_user_id = excluded.updated_by_user_id, updated_at = now()
        `,
        [
          targetType,
          targetId,
          action === "hide_content" ? "hidden" : "visible",
          note.trim().slice(0, 1200) || null,
          moderator.id,
        ],
      );
    }
    // Uma denúncia procedente sobre publicação/comentário deve retirar o
    // conteúdo da comunidade na mesma transação que registra a decisão.
    // Dispensar não oculta; restaurar continua sendo uma ação explícita.
    const contentDecision = ["review", "warn_user", "suspend_24h", "suspend_7d", "ban_user"].includes(action);
    if (contentDecision && (report.postId || report.commentId)) {
      const targetType = report.postId ? "post" : "comment";
      const targetId = report.postId ?? report.commentId;
      await client.query(
        `insert into public.community_content_moderation
         (target_type, target_id, state, reason, source, updated_by_user_id)
         values ($1,$2,'hidden',$3,'manual',$4)
         on conflict (target_type, target_id) do update
           set state = 'hidden', reason = excluded.reason, source = 'manual',
               updated_by_user_id = excluded.updated_by_user_id, updated_at = now()`,
        [targetType, targetId, note.trim().slice(0, 1200) || 'Denúncia analisada e considerada procedente.', moderator.id],
      );
      await notifyModerationTarget(client, {
        recipientUserId: report.targetAuthorUserId,
        moderatorUserId: moderator.id,
        reportId,
        action: "hide_content",
        postId: report.targetPostId,
        commentId: report.commentId,
      });
    }
    // A ocultação por limite de denúncias é provisória. Assim que as denúncias
    // forem revisadas e a contagem voltar abaixo do limite, reexiba somente
    // conteúdos ocultados AUTOMATICAMENTE; nunca desfaça decisão manual.
    if ((action === "dismiss" || action === "review") && (report.postId || report.commentId)) {
      const targetType = report.postId ? "post" : "comment";
      const targetId = report.postId ?? report.commentId;
      const reportColumn = report.postId ? "post_id" : "comment_id";
      const restoration = await client.query<{ targetId: string }>(
        `
          update public.community_content_moderation cm
          set state = 'visible', reason = null, updated_by_user_id = $3, updated_at = now()
          where cm.target_type = $1
            and cm.target_id = $2
            and cm.state = 'hidden'
            and cm.source = 'report_threshold'
            and (
              select count(distinct cr.reporter_user_id)
              from public.community_reports cr
              where cr.${reportColumn} = $2 and cr.status = 'pending'
            ) < 3
          returning cm.target_id as "targetId"
        `,
        [targetType, targetId, moderator.id],
      );
      if (restoration.rowCount) {
        await notifyModerationTarget(client, {
          recipientUserId: report.targetAuthorUserId,
          moderatorUserId: moderator.id,
          reportId,
          action: "restore_content",
          postId: report.targetPostId,
          commentId: report.commentId,
        });
      }
    }
    if (userAction && report.targetAuthorUserId) {
      if (["suspend_24h", "suspend_7d", "ban_user"].includes(action) && report.targetAuthorUserId) {
      const existing = await client.query<{ status: string; suspendedUntil: Date | null }>(
        `select status, suspended_until as "suspendedUntil" from public.community_user_sanctions
         where user_id = $1 for update`, [report.targetAuthorUserId],
      );
      if (existing.rows[0]?.status === "banned") {
        throw new AppError("A conta já está banida. Reavalie a restrição existente.", 409, "MODERATION_ALREADY_BANNED");
      }
    }
    if (action === "lift_restriction") {
        await client.query(`delete from public.community_user_sanctions where user_id = $1`, [report.targetAuthorUserId]);
      } else if (restricting) {
        const hours = action === "suspend_24h" ? 24 : action === "suspend_7d" ? 168 : null;
        await client.query(`insert into public.community_user_sanctions
          (user_id, status, suspended_until, reason, updated_by_user_id)
          values ($1,$2,case when $3::int is null then null else now() + ($3::int * interval '1 hour') end,$4,$5)
          on conflict (user_id) do update set status = excluded.status,
            suspended_until = excluded.suspended_until, reason = excluded.reason,
            updated_by_user_id = excluded.updated_by_user_id, updated_at = now()`,
          [report.targetAuthorUserId, action === "ban_user" ? "banned" : "suspended", hours, note.trim(), moderator.id]);
      }
      // A identidade de quem aplicou a medida fica somente na auditoria administrativa.
      // Não incluir moderator.id nas notificações entregues ao usuário afetado.
      await client.query(`insert into public.community_notifications
        (user_id, actor_user_id, notification_type, dedupe_key, moderation_message)
        values ($1, null, 'moderation_action', $2, $3)`,
        [report.targetAuthorUserId, `moderation:${reportId}:${action}:${Date.now()}`,
         `${action === "warn_user" ? "Advertência" : action === "ban_user" ? "Banimento" : action === "lift_restriction" ? "Restrição removida" : "Suspensão"}: ${note.trim()}`]);
    }
    await client.query(
      `insert into public.community_moderation_actions (report_id, moderator_user_id, action, note) values ($1,$2,$3,$4)`,
      [reportId, moderator.id, action, [note.trim(), guidance.trim() ? `Orientação ao destinatário: ${guidance.trim()}` : "", responseHours ? `Prazo informativo de resposta: ${responseHours / 24} dia(s)` : ""].filter(Boolean).join("\n").slice(0, 1200)],
    );
    if (action === "hide_content" || action === "restore_content") {
      await notifyModerationTarget(client, {
        recipientUserId: report.targetAuthorUserId,
        moderatorUserId: moderator.id,
        reportId,
        action,
        postId: report.targetPostId,
        commentId: report.commentId,
      });
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  // O e-mail só é disparado após a transação ser confirmada.
  if (report.targetAuthorUserId && ["warn_user", "suspend_24h", "suspend_7d", "ban_user", "lift_restriction", "hide_content", "restore_content"].includes(action)) {
    await emailModerationDecision({
      reportId,
      recipientUserId: report.targetAuthorUserId,
      action: action as "warn_user" | "suspend_24h" | "suspend_7d" | "ban_user" | "lift_restriction" | "hide_content" | "restore_content",
      reason: note,
      guidance,
      responseHours,
    });
  } else if (action === "review" && (report.postId || report.commentId) && report.targetAuthorUserId) {
    await emailModerationDecision({
      reportId, recipientUserId: report.targetAuthorUserId,
      action: "hide_content", reason: note,
    });
  }
}
