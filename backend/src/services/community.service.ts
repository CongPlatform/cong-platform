import type { PoolClient } from "pg";

import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { getAvatarPublicUrl } from "./avatar.service.js";

import type {
  CommunityArea,
  CommunityPostKind,
  CommunityTargetRole,
  CreateCommunityPostInput,
} from "../validators/community.validator.js";

type CommunityPostStatus = "published" | "archived";
type CommunityPostDetails = CreateCommunityPostInput["details"];

interface UserRow {
  id: string;
  active: boolean;
}

interface CommunityPostRow {
  id: string;
  authorUserId: string;
  authorCollaborationProfileId: string | null;
  authorOrganizationId: string | null;
  area: CommunityArea;
  kind: CommunityPostKind;
  title: string;
  summary: string;
  content: string;
  targetRoles: CommunityTargetRole[];
  status: CommunityPostStatus;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  authorDisplayName: string;
  authorUsername: string | null;
  authorAvatarPath: string | null;
  authorCollaborationRole: string | null;
  authorOrganizationName: string | null;
  authorOrganizationType: "ngo" | "company" | null;
  details: CommunityPostDetails;
}

export interface CommunityPost {
  id: string;
  area: CommunityArea;
  kind: CommunityPostKind;
  title: string;
  summary: string;
  content: string;
  targetRoles: CommunityTargetRole[];
  status: CommunityPostStatus;
  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  details: CommunityPostDetails;
  author: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    collaborationProfile:
      | {
          id: string;
          role: string;
        }
      | null;
    organization:
      | {
          id: string;
          name: string;
          organizationType: "ngo" | "company";
        }
      | null;
  };
}

const communityPostSelect = `
  select
    cp.id,
    cp.author_user_id as "authorUserId",
    cp.author_collaboration_profile_id as "authorCollaborationProfileId",
    cp.author_organization_id as "authorOrganizationId",
    cp.area,
    cp.post_type as "kind",
    cp.title,
    cp.description as "summary",
    cp.content,
    cp.target_roles as "targetRoles",
    cp.status,
    cp.published_at as "publishedAt",
    cp.created_at as "createdAt",
    cp.updated_at as "updatedAt",

    coalesce(u.display_name, u.name) as "authorDisplayName",
    u.username as "authorUsername",
    u.avatar_path as "authorAvatarPath",

    collaboration_profile.role as "authorCollaborationRole",

    organization.name as "authorOrganizationName",
    organization.organization_type as "authorOrganizationType",

    case cp.post_type
      when 'general' then jsonb_build_object(
        'generalType', general_post.general_type,
        'tags', coalesce(general_post.tags, '{}'::text[])
      )

      when 'question' then jsonb_build_object(
        'topic', question_post.topic,
        'resolved', question_post.resolved
      )

      when 'request' then
        jsonb_build_object(
          'requestType', request_post.request_type,
          'deadline', request_post.deadline,
          'engagementMode', request_post.engagement_mode,
          'peopleNeeded', request_post.people_needed,
          'skills', coalesce(request_post.skills, '{}'::text[])
        ) || coalesce(request_post.request_data, '{}'::jsonb)

      when 'research' then jsonb_build_object(
        'researchType', research_post.research_type,
        'estimatedMinutes', research_post.estimated_minutes,
        'deadline', research_post.deadline,
        'responseUrl', research_post.response_url,
        'criteria', research_post.criteria
      )

      when 'update' then jsonb_build_object(
        'entityType', update_post.entity_type,
        'entityLabel', update_post.entity_label,
        'version', update_post.version,
        'progress', update_post.progress,
        'referenceUrl', update_post.reference_url
      )

      when 'resource' then jsonb_build_object(
        'resourceType', resource_post.resource_type,
        'resourceUrl', resource_post.resource_url,
        'version', resource_post.version,
        'license', resource_post.license,
        'tags', coalesce(resource_post.tags, '{}'::text[])
      )

      when 'announcement' then jsonb_build_object(
        'priority', announcement_post.priority
      )

      else '{}'::jsonb
    end as "details"

  from public.community_posts cp

  join public.users u
    on u.id = cp.author_user_id

  left join public.collaboration_profiles collaboration_profile
    on collaboration_profile.id = cp.author_collaboration_profile_id

  left join public.organizations organization
    on organization.id = cp.author_organization_id

  left join public.community_post_general general_post
    on general_post.post_id = cp.id

  left join public.community_post_questions question_post
    on question_post.post_id = cp.id

  left join public.community_post_requests request_post
    on request_post.post_id = cp.id

  left join public.community_post_research research_post
    on research_post.post_id = cp.id

  left join public.community_post_updates update_post
    on update_post.post_id = cp.id

  left join public.community_post_resources resource_post
    on resource_post.post_id = cp.id

  left join public.community_post_announcements announcement_post
    on announcement_post.post_id = cp.id
`;

function toCommunityPost(row: CommunityPostRow): CommunityPost {
  return {
    id: row.id,
    area: row.area,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    content: row.content,
    targetRoles: row.targetRoles,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    details: row.details,
    author: {
      userId: row.authorUserId,
      displayName: row.authorDisplayName,
      username: row.authorUsername,
      avatarUrl: getAvatarPublicUrl(row.authorAvatarPath),
      collaborationProfile:
        row.authorCollaborationProfileId && row.authorCollaborationRole
          ? {
              id: row.authorCollaborationProfileId,
              role: row.authorCollaborationRole,
            }
          : null,
      organization:
        row.authorOrganizationId &&
        row.authorOrganizationName &&
        row.authorOrganizationType
          ? {
              id: row.authorOrganizationId,
              name: row.authorOrganizationName,
              organizationType: row.authorOrganizationType,
            }
          : null,
    },
  };
}

async function getActiveUser(
  client: PoolClient,
  authUserId: string,
): Promise<UserRow> {
  const result = await client.query<UserRow>(
    `
      select id, active
      from public.users
      where auth_user_id = $1
      limit 1
    `,
    [authUserId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError(
      "Conta de usuário não encontrada.",
      404,
      "USER_ACCOUNT_NOT_FOUND",
    );
  }

  if (!user.active) {
    throw new AppError("A conta está inativa.", 403, "USER_INACTIVE");
  }

  return user;
}

async function validateCollaborationProfile(
  client: PoolClient,
  userId: string,
  profileId: string,
): Promise<void> {
  const result = await client.query<{ id: string }>(
    `
      select id
      from public.collaboration_profiles
      where id = $1
        and user_id = $2
      limit 1
    `,
    [profileId, userId],
  );

  if (!result.rows[0]) {
    throw new AppError(
      "Este perfil de colaboração não pertence à conta autenticada.",
      403,
      "COMMUNITY_PROFILE_ACCESS_DENIED",
    );
  }
}

async function validateOrganization(
  client: PoolClient,
  userId: string,
  organizationId: string,
): Promise<void> {
  const result = await client.query<{ id: string }>(
    `
      select ou.id
      from public.organization_users ou
      join public.organizations o
        on o.id = ou.organization_id
      where ou.user_id = $1
        and ou.organization_id = $2
        and ou.status = 'active'
        and o.active = true
      limit 1
    `,
    [userId, organizationId],
  );

  if (!result.rows[0]) {
    throw new AppError(
      "Você não pode publicar em nome desta organização.",
      403,
      "COMMUNITY_ORGANIZATION_ACCESS_DENIED",
    );
  }
}

async function insertPostDetails(
  client: PoolClient,
  postId: string,
  input: CreateCommunityPostInput,
): Promise<void> {
  switch (input.kind) {
    case "general": {
      await client.query(
        `
          insert into public.community_post_general (
            post_id,
            general_type,
            tags
          )
          values ($1, $2, $3)
        `,
        [postId, input.details.generalType, input.details.tags],
      );
      return;
    }

    case "question": {
      await client.query(
        `
          insert into public.community_post_questions (
            post_id,
            topic
          )
          values ($1, $2)
        `,
        [postId, input.details.topic],
      );
      return;
    }

    case "request": {
      const {
        requestType,
        deadline,
        engagementMode,
        peopleNeeded,
        skills,
        ...requestData
      } = input.details;

      await client.query(
        `
          insert into public.community_post_requests (
            post_id,
            request_type,
            deadline,
            engagement_mode,
            people_needed,
            skills,
            request_data
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb)
        `,
        [
          postId,
          requestType,
          deadline ?? null,
          engagementMode,
          peopleNeeded ?? null,
          skills,
          JSON.stringify(requestData),
        ],
      );
      return;
    }

    case "research": {
      await client.query(
        `
          insert into public.community_post_research (
            post_id,
            research_type,
            estimated_minutes,
            deadline,
            response_url,
            criteria
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
        [
          postId,
          input.details.researchType,
          input.details.estimatedMinutes ?? null,
          input.details.deadline ?? null,
          input.details.responseUrl ?? null,
          input.details.criteria || null,
        ],
      );
      return;
    }

    case "update": {
      await client.query(
        `
          insert into public.community_post_updates (
            post_id,
            entity_type,
            entity_label,
            version,
            progress,
            reference_url
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
        [
          postId,
          input.details.entityType,
          input.details.entityLabel,
          input.details.version || null,
          input.details.progress ?? null,
          input.details.referenceUrl ?? null,
        ],
      );
      return;
    }

    case "resource": {
      await client.query(
        `
          insert into public.community_post_resources (
            post_id,
            resource_type,
            resource_url,
            version,
            license,
            tags
          )
          values ($1, $2, $3, $4, $5, $6)
        `,
        [
          postId,
          input.details.resourceType,
          input.details.resourceUrl ?? null,
          input.details.version || null,
          input.details.license || null,
          input.details.tags,
        ],
      );
      return;
    }

    case "announcement": {
      await client.query(
        `
          insert into public.community_post_announcements (
            post_id,
            priority
          )
          values ($1, $2)
        `,
        [postId, input.details.priority],
      );
      return;
    }
  }
}

async function getCommunityPostById(
  client: PoolClient,
  postId: string,
): Promise<CommunityPost> {
  const result = await client.query<CommunityPostRow>(
    `
      ${communityPostSelect}
      where cp.id = $1
      limit 1
    `,
    [postId],
  );

  const post = result.rows[0];

  if (!post) {
    throw new AppError(
      "Publicação da comunidade não encontrada.",
      404,
      "COMMUNITY_POST_NOT_FOUND",
    );
  }

  return toCommunityPost(post);
}

export async function createCommunityPost(
  authUserId: string,
  input: CreateCommunityPostInput,
): Promise<CommunityPost> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const user = await getActiveUser(client, authUserId);

    if (input.authorCollaborationProfileId) {
      await validateCollaborationProfile(
        client,
        user.id,
        input.authorCollaborationProfileId,
      );
    }

    if (input.authorOrganizationId) {
      await validateOrganization(client, user.id, input.authorOrganizationId);
    }

    const result = await client.query<{ id: string }>(
      `
        insert into public.community_posts (
          author_user_id,
          author_collaboration_profile_id,
          author_organization_id,
          area,
          post_type,
          title,
          description,
          content,
          target_roles
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning id
      `,
      [
        user.id,
        input.authorCollaborationProfileId ?? null,
        input.authorOrganizationId ?? null,
        input.area,
        input.kind,
        input.title,
        input.summary,
        input.content,
        input.targetRoles,
      ],
    );

    const created = result.rows[0];

    if (!created) {
      throw new AppError(
        "Não foi possível criar a publicação.",
        500,
        "COMMUNITY_POST_CREATION_FAILED",
      );
    }

    await insertPostDetails(client, created.id, input);

    const post = await getCommunityPostById(client, created.id);

    await client.query("commit");

    return post;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const result = await pool.query<CommunityPostRow>(
    `
      ${communityPostSelect}
      where cp.status = 'published'
      order by cp.published_at desc, cp.created_at desc
      limit 80
    `,
  );

  return result.rows.map(toCommunityPost);
}
