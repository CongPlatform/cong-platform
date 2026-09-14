import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { getAvatarPublicUrl } from "./avatar.service.js";

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
        ) values ($1,$2,'moderation_report',$3,$4,$5)
        on conflict (dedupe_key) do update
          set is_read = false, created_at = now(), read_at = null
      `,
      [
        moderator.userId,
        reporterUserId,
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
      ) values ($1,$2,'moderation_action',$3,$4,$5)
      on conflict (dedupe_key) do update
        set is_read = false, created_at = now(), read_at = null
    `,
    [
      input.recipientUserId,
      input.moderatorUserId,
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

  return Promise.all(
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
              left(coalesce(nullif(summary, ''), nullif(content, ''), title), 320) as excerpt,
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

      return {
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
}

export async function reviewCommunityReport(
  authUserId: string,
  reportId: string,
  action: "review" | "dismiss" | "hide_content" | "restore_content",
  note = "",
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
  const client = await pool.connect();
  try {
    await client.query("begin");
    const status =
      action === "dismiss"
        ? "dismissed"
        : action === "hide_content" || action === "restore_content"
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
    await client.query(
      `insert into public.community_moderation_actions (report_id, moderator_user_id, action, note) values ($1,$2,$3,$4)`,
      [reportId, moderator.id, action, note.trim().slice(0, 1200)],
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
}
