import type { PoolClient } from "pg";
import {
  mediaSelect,
  signCommunityMedia,
  type StoredCommunityMedia,
  type CommunityMedia,
  type CommunityMention,
  type CommunityLinkPreview,
} from "./community-media.service.js";
import { saveCommunityPostExtras } from "./community-post-extras.service.js";
import { canModerateCommunity } from "./community-safety.service.js";
import {
  rankCommunityRecommendations,
  type CommunityRecommendationContext,
} from "./community-recommendation.service.js";

import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import { getAvatarPublicUrl } from "./avatar.service.js";

import type {
  CommunityArea,
  CommunityPostKind,
  CommunityTargetRole,
  CreateCommunityCommentInput,
  CreateCommunityPostInput,
  UpdateCommunityCommentInput,
  UpdateCommunityPostInput,
  SubmitCommunitySurveyResponseInput,
  CreateCommunityEventInput,
} from "../validators/community.validator.js";

type CommunityPostStatus = "published" | "archived";

export type CommunityFeedFilter =
  | "all"
  | "following"
  | "projects"
  | "opportunities"
  | "discussions"
  | "mine"
  | "saved"
  | "archived";

export type CommunityFeedSort =
  "recommended" | "recent" | "supported" | "discussed";

export interface CommunityFeedOptions {
  tag?: string;
  filter?: CommunityFeedFilter;
  sort?: CommunityFeedSort;
  limit?: number;
  offset?: number;
}

export interface CommunityPostsPage {
  posts: CommunityPost[];
  hasMore: boolean;
}

type ResearchStoredDetails = {
  researchType:
    | "questionnaire"
    | "interview"
    | "usability_test"
    | "validation"
    | "field_research";
  participationMode: "external" | "internal";
  phase: "collecting" | "results";
  estimatedMinutes?: number | null;
  deadline?: string | null;
  responseUrl?: string | null;
  criteria: string;
  responseCount?: number;
  resultsSourcePostId?: string | null;
  resultsSnapshot?: CommunitySurveyResults | null;
};

type CommunityPostDetails =
  | Exclude<CreateCommunityPostInput["details"], { researchType: unknown }>
  | ResearchStoredDetails;

interface UserRow {
  id: string;
  active: boolean;
}

export interface CommunitySurveyQuestion {
  id: string;
  type:
    "short_text" | "long_text" | "single_choice" | "multiple_choice" | "scale";
  prompt: string;
  required: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  options: Array<{ id: string; label: string }>;
}

export interface CommunitySurvey {
  id: string;
  postId: string;
  status: "open" | "closed";
  anonymous: boolean;
  resultsPostId: string | null;
  alreadyResponded: boolean;
  responseCount: number;
  questions: CommunitySurveyQuestion[];
}

export interface CommunitySurveyResultsQuestion {
  id: string;
  prompt: string;
  type: CommunitySurveyQuestion["type"];
  answeredCount: number;
  textAnswers: string[];
  average: number | null;
  options: Array<{
    id: string;
    label: string;
    count: number;
    percentage: number;
  }>;
}

export interface CommunitySurveyResults {
  surveyId: string;
  postId: string;
  status: "open" | "closed";
  anonymous: boolean;
  resultsPostId: string | null;
  responseCount: number;
  questions: CommunitySurveyResultsQuestion[];
}

interface CommunityPostRow {
  tags: string[];
  media: StoredCommunityMedia[];
  mentions: CommunityMention[];
  linkPreview: CommunityLinkPreview | null;
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
  boostedAt: Date | null;
  boostCount: number;
  authorDisplayName: string;
  authorUsername: string | null;
  authorAvatarPath: string | null;
  authorCollaborationRole: string | null;
  authorOrganizationName: string | null;
  authorOrganizationType: "ngo" | "company" | null;
  details: CommunityPostDetails;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  followingAuthor: boolean;
  canEdit: boolean;
  moderationState: "visible" | "hidden" | null;
  moderationReason: string | null;
  moderatedAt: Date | null;
  moderatorDisplayName: string | null;
}

interface CommunityCommentRow {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  authorUserId: string;
  authorDisplayName: string;
  authorUsername: string | null;
  authorAvatarPath: string | null;
  canEdit: boolean;
}

export interface CommunityPost {
  tags: string[];
  media: CommunityMedia[];
  mentions: CommunityMention[];
  linkPreview: CommunityLinkPreview | null;
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
  boostedAt: Date | null;
  boostCount: number;
  details: CommunityPostDetails;
  engagement: {
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
    savedByMe: boolean;
  };
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
  };
  moderation: {
    state: "visible" | "hidden";
    reason: string | null;
    moderatedAt: Date | null;
    moderatorDisplayName: string | null;
  } | null;
  author: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    followedByMe: boolean;
    collaborationProfile: {
      id: string;
      role: string;
    } | null;
    organization: {
      id: string;
      name: string;
      organizationType: "ngo" | "company";
    } | null;
  };
}

export interface CommunityComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
  };
  author: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

export interface CommunityDiscoveryStats {
  members: number;
  posts: number;
  openRequests: number;
  researchPosts: number;
}

export interface CommunitySuggestedPerson {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  collaborationRole: string | null;
  postCount: number;
}

export interface CommunityTrendingTopic {
  label: string;
  postCount: number;
}

export interface CommunityDiscovery {
  stats: CommunityDiscoveryStats;
  peopleToFollow: CommunitySuggestedPerson[];
  trendingTopics: CommunityTrendingTopic[];
  permissions: { canModerate: boolean };
}

export interface CommunityOpportunityRecommendation {
  post: CommunityPost;
  matchLabels: string[];
  score: number;
}

export interface CommunityHighlights {
  featuredProject: CommunityPost | null;
  opportunities: CommunityOpportunityRecommendation[];
}

export interface CommunityProfileRole {
  role: string;
  skills: string[];
}

export interface CommunityUserProfile {
  entityType: "user";
  id: string;
  displayName: string;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isSelf: boolean;
  followedByMe: boolean;
  blockedByMe: boolean;
  blocksMe: boolean;
  roles: CommunityProfileRole[];
  organizations: Array<{
    id: string;
    name: string;
    organizationType: "ngo" | "company";
  }>;
  stats: { posts: number; followers: number; following: number };
  recentPosts: CommunityPost[];
}

export interface CommunityOrganizationProfile {
  entityType: "organization";
  id: string;
  displayName: string;
  organizationType: "ngo" | "company";
  description: string | null;
  memberCount: number;
  stats: { posts: number };
  recentPosts: CommunityPost[];
}

const communityPostSelect = `
  select
    ${mediaSelect}
    cp.searchable_tags as tags,
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
    cp.boosted_at as "boostedAt",
    cp.boost_count as "boostCount",

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
        'participationMode', coalesce(research_post.participation_mode, 'external'),
        'phase', coalesce(research_post.phase, 'collecting'),
        'estimatedMinutes', research_post.estimated_minutes,
        'deadline', research_post.deadline,
        'responseUrl', research_post.response_url,
        'criteria', research_post.criteria,
        'survey', case
          when research_post.participation_mode = 'internal' and research_post.phase = 'collecting' then (
            select jsonb_build_object(
              'anonymous', survey.anonymous,
              'questions', coalesce((
                select jsonb_agg(
                  jsonb_build_object(
                    'clientId', question.id::text,
                    'type', question.question_type,
                    'prompt', question.prompt,
                    'required', question.required,
                    'options', coalesce((
                      select jsonb_agg(option.label order by option.position)
                      from public.community_survey_options option
                      where option.question_id = question.id
                    ), '[]'::jsonb),
                    'scaleMin', question.scale_min,
                    'scaleMax', question.scale_max
                  ) order by question.position
                )
                from public.community_survey_questions question
                where question.survey_id = survey.id
              ), '[]'::jsonb)
            )
            from public.community_surveys survey
            where survey.post_id = cp.id
            limit 1
          )
          else null
        end,
        'responseCount', coalesce((
          select count(*)::int
          from public.community_surveys survey
          join public.community_survey_responses response
            on response.survey_id = survey.id
          where survey.post_id = cp.id
        ), 0),
        'resultsSourcePostId', research_post.results_source_post_id,
        'resultsSnapshot', research_post.results_snapshot
      )

      when 'update' then jsonb_build_object(
        'entityType', update_post.entity_type,
        'entityLabel', update_post.entity_label,
        'version', update_post.version,
        'progress', update_post.progress,
        'referenceUrl', update_post.reference_url,
        'milestones', coalesce(update_post.milestones, '{}'::text[]),
        'completedMilestones', coalesce(update_post.completed_milestones, 0)
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
    end as "details",

    (
      select count(*)::int
      from public.community_post_likes likes
      where likes.post_id = cp.id
    ) as "likeCount",

    (
      select count(*)::int
      from public.community_post_comments comments
      where comments.post_id = cp.id
        and not exists (
          select 1 from public.community_content_moderation moderation
          where moderation.target_type = 'comment'
            and moderation.target_id = comments.id
            and moderation.state = 'hidden'
        )
        and not exists (
          select 1 from public.community_user_blocks block
          where (block.blocker_user_id = $1 and block.blocked_user_id = comments.author_user_id)
             or (block.blocker_user_id = comments.author_user_id and block.blocked_user_id = $1)
        )
    ) as "commentCount",

    exists (
      select 1
      from public.community_post_likes likes
      where likes.post_id = cp.id
        and likes.user_id = $1
    ) as "likedByMe",

    exists (
      select 1
      from public.community_post_bookmarks bookmarks
      where bookmarks.post_id = cp.id
        and bookmarks.user_id = $1
    ) as "savedByMe",

    exists (
      select 1
      from public.community_user_follows follows
      where follows.follower_user_id = $1
        and follows.followed_user_id = cp.author_user_id
    ) as "followingAuthor",

    (cp.author_user_id = $1) as "canEdit",

    content_moderation.state as "moderationState",
    content_moderation.reason as "moderationReason",
    content_moderation.updated_at as "moderatedAt",
    coalesce(moderator.display_name, moderator.name) as "moderatorDisplayName"

  from public.community_posts cp

  join public.users u
    on u.id = cp.author_user_id

  left join public.collaboration_profiles collaboration_profile
    on collaboration_profile.id = cp.author_collaboration_profile_id

  left join public.organizations organization
    on organization.id = cp.author_organization_id

  left join public.community_content_moderation content_moderation
    on content_moderation.target_type = 'post'
   and content_moderation.target_id = cp.id

  left join public.users moderator
    on moderator.id = content_moderation.updated_by_user_id

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

async function toCommunityPost(row: CommunityPostRow): Promise<CommunityPost> {
  return {
    tags: row.tags ?? [],
    media: await signCommunityMedia(row.media ?? []),
    mentions: row.mentions ?? [],
    linkPreview: row.linkPreview ?? null,
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
    boostedAt: row.boostedAt,
    boostCount: row.boostCount,
    details: row.details,
    engagement: {
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      likedByMe: row.likedByMe,
      savedByMe: row.savedByMe,
    },
    permissions: {
      canEdit: row.canEdit,
      canDelete: row.canEdit,
    },
    moderation: row.moderationState
      ? {
          state: row.moderationState,
          reason: row.moderationReason,
          moderatedAt: row.moderatedAt,
          moderatorDisplayName: row.moderatorDisplayName,
        }
      : null,
    author: {
      userId: row.authorUserId,
      displayName: row.authorDisplayName,
      username: row.authorUsername,
      avatarUrl: getAvatarPublicUrl(row.authorAvatarPath),
      followedByMe: row.followingAuthor,
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

function toCommunityComment(row: CommunityCommentRow): CommunityComment {
  return {
    id: row.id,
    postId: row.postId,
    parentCommentId: row.parentCommentId,
    content: row.content,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    permissions: {
      canEdit: row.canEdit,
      canDelete: row.canEdit,
    },
    author: {
      userId: row.authorUserId,
      displayName: row.authorDisplayName,
      username: row.authorUsername,
      avatarUrl: getAvatarPublicUrl(row.authorAvatarPath),
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

async function assertPostOwner(
  client: PoolClient,
  postId: string,
  userId: string,
): Promise<void> {
  const result = await client.query<{ authorUserId: string }>(
    `
      select author_user_id as "authorUserId"
      from public.community_posts
      where id = $1
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

  if (post.authorUserId !== userId) {
    throw new AppError(
      "Você não pode alterar esta publicação.",
      403,
      "COMMUNITY_POST_ACCESS_DENIED",
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
            participation_mode,
            phase,
            estimated_minutes,
            deadline,
            response_url,
            criteria
          )
          values ($1, $2, $3, 'collecting', $4, $5, $6, $7)
        `,
        [
          postId,
          input.details.researchType,
          input.details.participationMode,
          input.details.estimatedMinutes ?? null,
          input.details.deadline ?? null,
          input.details.participationMode === "external"
            ? (input.details.responseUrl ?? null)
            : null,
          input.details.criteria || null,
        ],
      );

      if (
        input.details.participationMode === "internal" &&
        input.details.survey
      ) {
        const surveyResult = await client.query<{ id: string }>(
          `
            insert into public.community_surveys (post_id, anonymous)
            values ($1, $2)
            returning id
          `,
          [postId, input.details.survey.anonymous],
        );

        const survey = surveyResult.rows[0];
        if (!survey) {
          throw new AppError(
            "Não foi possível criar a pesquisa interna.",
            500,
            "COMMUNITY_SURVEY_CREATION_FAILED",
          );
        }

        for (const [
          position,
          question,
        ] of input.details.survey.questions.entries()) {
          const min =
            question.type === "scale" ? (question.scaleMin ?? 1) : null;
          const max =
            question.type === "scale" ? (question.scaleMax ?? 5) : null;
          const questionResult = await client.query<{ id: string }>(
            `
              insert into public.community_survey_questions (
                survey_id,
                position,
                question_type,
                prompt,
                required,
                scale_min,
                scale_max
              )
              values ($1, $2, $3, $4, $5, $6, $7)
              returning id
            `,
            [
              survey.id,
              position,
              question.type,
              question.prompt,
              question.required,
              min,
              max,
            ],
          );

          const createdQuestion = questionResult.rows[0];
          if (!createdQuestion) continue;

          if (
            question.type === "single_choice" ||
            question.type === "multiple_choice"
          ) {
            for (const [optionPosition, label] of question.options.entries()) {
              await client.query(
                `
                  insert into public.community_survey_options (
                    question_id,
                    position,
                    label
                  )
                  values ($1, $2, $3)
                `,
                [createdQuestion.id, optionPosition, label],
              );
            }
          }
        }
      }
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
            reference_url,
            milestones,
            completed_milestones
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          postId,
          input.details.entityType,
          input.details.entityLabel,
          input.details.version || null,
          input.details.progress ?? null,
          input.details.referenceUrl ?? null,
          input.details.milestones,
          input.details.completedMilestones,
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

async function deletePostDetails(
  client: PoolClient,
  postId: string,
): Promise<void> {
  await client.query(
    `delete from public.community_surveys where post_id = $1`,
    [postId],
  );

  const detailTables = [
    "community_post_general",
    "community_post_questions",
    "community_post_requests",
    "community_post_research",
    "community_post_updates",
    "community_post_resources",
    "community_post_announcements",
  ] as const;

  for (const table of detailTables) {
    await client.query(`delete from public.${table} where post_id = $1`, [
      postId,
    ]);
  }
}

async function getCommunityPostById(
  client: PoolClient,
  postId: string,
  viewerUserId: string,
): Promise<CommunityPost> {
  const result = await client.query<CommunityPostRow>(
    `
      ${communityPostSelect}
      where cp.id = $2
        and (
          cp.author_user_id = $1
          or not exists (
            select 1 from public.community_content_moderation moderation
            where moderation.target_type = 'post'
              and moderation.target_id = cp.id
              and moderation.state = 'hidden'
          )
        )
        and not exists (
          select 1 from public.community_user_blocks block
          where (block.blocker_user_id = $1 and block.blocked_user_id = cp.author_user_id)
             or (block.blocker_user_id = cp.author_user_id and block.blocked_user_id = $1)
        )
      limit 1
    `,
    [viewerUserId, postId],
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
    await saveCommunityPostExtras(client, created.id, user.id, input);

    const post = await getCommunityPostById(client, created.id, user.id);

    await client.query("commit");

    return post;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function getCommunityRecommendationContext(
  client: PoolClient,
  userId: string,
): Promise<CommunityRecommendationContext> {
  const [profilesResult, affinityResult] = await Promise.all([
    client.query<{ role: string; profileData: unknown }>(
      `
        select role, profile_data as "profileData"
        from public.collaboration_profiles
        where user_id = $1
        order by is_active desc, updated_at desc
      `,
      [userId],
    ),
    client.query<{ area: CommunityArea; tags: string[] }>(
      `
        select cp.area, cp.searchable_tags as tags
        from public.community_posts cp
        where cp.status = 'published'
          and (
            exists (
              select 1 from public.community_post_likes likes
              where likes.post_id = cp.id and likes.user_id = $1
            )
            or exists (
              select 1 from public.community_post_bookmarks bookmarks
              where bookmarks.post_id = cp.id and bookmarks.user_id = $1
            )
            or exists (
              select 1 from public.community_post_comments comments
              where comments.post_id = cp.id and comments.author_user_id = $1
            )
          )
        order by coalesce(cp.boosted_at, cp.published_at) desc
        limit 80
      `,
      [userId],
    ),
  ]);

  const roles = new Set<string>();
  const skills = new Set<string>();
  for (const profile of profilesResult.rows) {
    roles.add(profile.role);
    for (const skill of profileSkills(profile.profileData)) skills.add(skill);
  }

  const affinityAreas = new Set<string>();
  const affinityTags = new Set<string>();
  for (const row of affinityResult.rows) {
    affinityAreas.add(row.area);
    for (const tag of row.tags ?? []) affinityTags.add(tag);
  }

  return {
    roles: [...roles],
    skills: [...skills],
    affinityAreas: [...affinityAreas],
    affinityTags: [...affinityTags],
  };
}

export async function getCommunityPosts(
  authUserId: string,
  options: CommunityFeedOptions = {},
): Promise<CommunityPostsPage> {
  const client = await pool.connect();

  try {
    const user = await getActiveUser(client, authUserId);
    const filter = options.filter ?? "all";
    const sort = options.sort ?? "recent";
    const limit = Math.min(24, Math.max(1, options.limit ?? 8));
    const offset = Math.max(0, options.offset ?? 0);

    const conditions: string[] = [
      "($4::text is null or cp.searchable_tags @> array[$4::text])",
      `not exists (
        select 1 from public.community_user_blocks block
        where (block.blocker_user_id = $1 and block.blocked_user_id = cp.author_user_id)
           or (block.blocker_user_id = cp.author_user_id and block.blocked_user_id = $1)
      )`,
    ];

    if (filter !== "mine") {
      conditions.push(`not exists (
        select 1 from public.community_content_moderation moderation
        where moderation.target_type = 'post'
          and moderation.target_id = cp.id
          and moderation.state = 'hidden'
      )`);
    }

    if (filter === "archived") {
      conditions.push("cp.status = 'archived'");
      conditions.push("cp.author_user_id = $1");
    } else {
      conditions.push("cp.status = 'published'");

      if (filter === "following") {
        conditions.push(`exists (
          select 1
          from public.community_user_follows feed_follow
          where feed_follow.follower_user_id = $1
            and feed_follow.followed_user_id = cp.author_user_id
        )`);
      }

      if (filter === "projects") {
        conditions.push("cp.post_type in ('update', 'resource')");
      }

      if (filter === "opportunities") {
        conditions.push("cp.post_type = 'request'");
        conditions.push("request_post.post_id is not null");
        conditions.push(
          "(request_post.deadline is null or request_post.deadline >= current_date)",
        );
      }

      if (filter === "discussions") {
        conditions.push("cp.post_type in ('question', 'general')");
      }

      if (filter === "mine") {
        conditions.push("cp.author_user_id = $1");
      }

      if (filter === "saved") {
        conditions.push(`exists (
          select 1
          from public.community_post_bookmarks feed_bookmark
          where feed_bookmark.post_id = cp.id
            and feed_bookmark.user_id = $1
        )`);
      }
    }

    if (sort === "recommended" && filter === "all") {
      // A recomendação usa um conjunto limitado e recente de candidatos para
      // manter o custo previsível. Se um dado legado inesperado ou uma falha
      // específica do ranking ocorrer, o feed continua disponível em ordem
      // recente em vez de derrubar toda a Comunidade com HTTP 500.
      try {
        const candidateLimit = 320;
        const candidateResult = await client.query<CommunityPostRow>(
          `
            ${communityPostSelect}
            where ${conditions.join(" and ")}
            order by coalesce(cp.boosted_at, cp.published_at) desc, cp.created_at desc
            limit $2
          `,
          [
            user.id,
            candidateLimit,
            0,
            options.tag?.trim().replace(/^#/, "").toLowerCase() || null,
          ],
        );
        const recommendationContext = await getCommunityRecommendationContext(
          client,
          user.id,
        );

        const ranked = rankCommunityRecommendations(
          candidateResult.rows,
          recommendationContext,
        );
        const pageRows = ranked
          .slice(offset, offset + limit)
          .map((entry) => entry.candidate);

        return {
          posts: await Promise.all(pageRows.map(toCommunityPost)),
          hasMore: offset + limit < ranked.length,
        };
      } catch (error) {
        console.error(
          "[Community recommendation] Falha no ranking; usando feed recente como fallback:",
          error,
        );
      }
    }

    const orderBy =
      sort === "supported"
        ? '"likeCount" desc, coalesce(cp.boosted_at, cp.published_at) desc, cp.created_at desc'
        : sort === "discussed"
          ? '"commentCount" desc, coalesce(cp.boosted_at, cp.published_at) desc, cp.created_at desc'
          : "coalesce(cp.boosted_at, cp.published_at) desc, cp.created_at desc";

    const result = await client.query<CommunityPostRow>(
      `
        ${communityPostSelect}
        where ${conditions.join(" and ")}
        order by ${orderBy}
        limit $2
        offset $3
      `,
      [
        user.id,
        limit + 1,
        offset,
        options.tag?.trim().replace(/^#/, "").toLowerCase() || null,
      ],
    );

    return {
      posts: await Promise.all(
        result.rows.slice(0, limit).map(toCommunityPost),
      ),
      hasMore: result.rows.length > limit,
    };
  } finally {
    client.release();
  }
}

export async function getCommunityPost(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  const client = await pool.connect();

  try {
    const user = await getActiveUser(client, authUserId);
    const post = await getCommunityPostById(client, postId, user.id);
    if (post.status === "archived" && !post.permissions.canEdit) {
      throw new AppError(
        "Publicação da comunidade não encontrada.",
        404,
        "COMMUNITY_POST_NOT_FOUND",
      );
    }
    return post;
  } finally {
    client.release();
  }
}

export async function getCommunityDiscovery(
  authUserId: string,
): Promise<CommunityDiscovery> {
  const client = await pool.connect();

  try {
    const user = await getActiveUser(client, authUserId);

    const statsResult = await client.query<{
      members: number;
      posts: number;
      openRequests: number;
      researchPosts: number;
    }>(
      `
          select
            (select count(*)::int from public.users where active = true and onboarding_step = 'completed') as members,
            (select count(*)::int from public.community_posts where status = 'published') as posts,
            (
              select count(*)::int
              from public.community_posts request_post_base
              join public.community_post_requests request_details
                on request_details.post_id = request_post_base.id
              where request_post_base.status = 'published'
                and request_post_base.post_type = 'request'
                and (
                  request_details.deadline is null
                  or request_details.deadline >= current_date
                )
            ) as "openRequests",
            (select count(*)::int from public.community_posts where status = 'published' and post_type = 'research') as "researchPosts"
        `,
    );
    const peopleResult = await client.query<{
      userId: string;
      displayName: string;
      username: string | null;
      avatarPath: string | null;
      collaborationRole: string | null;
      postCount: number;
      tags: string[];
    }>(
      `
          select
            candidate.id as "userId",
            coalesce(candidate.display_name, candidate.name) as "displayName",
            candidate.username,
            candidate.avatar_path as "avatarPath",
            (
              select profile.role
              from public.collaboration_profiles profile
              where profile.user_id = candidate.id
              order by profile.is_active desc, profile.updated_at desc
              limit 1
            ) as "collaborationRole",
            count(post.id)::int as "postCount",
            coalesce((
              select array_agg(distinct candidate_tag)
              from (
                select unnest(candidate_post.searchable_tags) as candidate_tag
                from public.community_posts candidate_post
                where candidate_post.author_user_id = candidate.id
                  and candidate_post.status = 'published'
                order by candidate_post.published_at desc
                limit 40
              ) recent_candidate_tags
            ), '{}'::text[]) as tags
          from public.users candidate
          left join public.community_posts post
            on post.author_user_id = candidate.id
           and post.status = 'published'
          where candidate.active = true
            and candidate.onboarding_step = 'completed'
            and candidate.id <> $1
            and not exists (
              select 1
              from public.community_user_follows follow
              where follow.follower_user_id = $1
                and follow.followed_user_id = candidate.id
            )
            and not exists (
              select 1 from public.community_user_blocks block
              where (block.blocker_user_id = $1 and block.blocked_user_id = candidate.id)
                 or (block.blocker_user_id = candidate.id and block.blocked_user_id = $1)
            )
          group by candidate.id
          order by count(post.id) desc, candidate.updated_at desc
          limit 24
        `,
      [user.id],
    );
    const topicsResult = await client.query<{
      label: string;
      postCount: number;
    }>(
      `
          with topic_values as (
            select unnest(post.searchable_tags) as label
            from public.community_posts post
            where post.status='published' and post.published_at>=now()-interval '30 days'
          )
          select min(label) as label, count(*)::int as "postCount"
          from topic_values
          where char_length(label) >= 2
          group by lower(label)
          order by count(*) desc, min(label) asc
          limit 6
        `,
    );

    const stats = statsResult.rows[0] ?? {
      members: 0,
      posts: 0,
      openRequests: 0,
      researchPosts: 0,
    };

    const recommendationContext = await getCommunityRecommendationContext(
      client,
      user.id,
    );
    const roleSet = new Set(
      recommendationContext.roles.map(normalizeCommunityMatchValue),
    );
    const interestSet = new Set(
      [...recommendationContext.skills, ...recommendationContext.affinityTags]
        .map(normalizeCommunityMatchValue)
        .filter(Boolean),
    );
    const normalizedInterests = [...interestSet];
    const recommendedPeople = peopleResult.rows
      .map((person) => {
        let score = Math.log2(1 + Math.max(0, person.postCount));
        const candidateRole = person.collaborationRole
          ? normalizeCommunityMatchValue(person.collaborationRole)
          : "";
        if (candidateRole && roleSet.has(candidateRole)) score += 6;
        let tagMatches = 0;
        for (const tag of person.tags ?? []) {
          const normalizedTag = normalizeCommunityMatchValue(tag);
          if (!normalizedTag) continue;
          if (
            normalizedInterests.some(
              (interest) =>
                interest === normalizedTag ||
                interest.includes(normalizedTag) ||
                normalizedTag.includes(interest),
            )
          ) {
            tagMatches += 1;
          }
          if (tagMatches >= 3) break;
        }
        score += tagMatches * 3;
        return { person, score };
      })
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        return right.person.postCount - left.person.postCount;
      })
      .slice(0, 5);

    return {
      stats,
      peopleToFollow: recommendedPeople.map(({ person }) => ({
        userId: person.userId,
        displayName: person.displayName,
        username: person.username,
        avatarUrl: getAvatarPublicUrl(person.avatarPath),
        collaborationRole: person.collaborationRole,
        postCount: person.postCount,
      })),
      trendingTopics: topicsResult.rows,
      permissions: { canModerate: await canModerateCommunity(authUserId) },
    };
  } finally {
    client.release();
  }
}

function normalizeCommunityMatchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function profileSkills(profileData: unknown): string[] {
  if (
    !profileData ||
    typeof profileData !== "object" ||
    Array.isArray(profileData)
  )
    return [];

  const source = profileData as Record<string, unknown>;
  const values = new Set<string>();
  const skillKeys = [
    "technologies",
    "specialties",
    "tools",
    "languages",
    "accessibilitySkills",
    "interestAreas",
    "causes",
  ];

  for (const key of skillKeys) {
    const value = source[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === "string" && item.trim()) values.add(item.trim());
    }
  }

  return [...values].slice(0, 24);
}

export async function getCommunityHighlights(
  authUserId: string,
): Promise<CommunityHighlights> {
  const client = await pool.connect();

  try {
    const user = await getActiveUser(client, authUserId);

    const featuredResult = await client.query<CommunityPostRow>(
      `
          ${communityPostSelect}
          where cp.status = 'published'
            and cp.post_type = 'update'
            and not exists (select 1 from public.community_content_moderation moderation where moderation.target_type = 'post' and moderation.target_id = cp.id and moderation.state = 'hidden')
            and not exists (select 1 from public.community_user_blocks block where (block.blocker_user_id = $1 and block.blocked_user_id = cp.author_user_id) or (block.blocker_user_id = cp.author_user_id and block.blocked_user_id = $1))
            and update_post.post_id is not null
            and update_post.entity_type = 'project'
            and nullif(trim(update_post.entity_label), '') is not null
          order by
            coalesce(cp.boosted_at, cp.published_at) desc,
            cp.updated_at desc
          limit 1
        `,
      [user.id],
    );
    const opportunityResult = await client.query<CommunityPostRow>(
      `
          ${communityPostSelect}
          where cp.status = 'published'
            and cp.post_type = 'request'
            and not exists (select 1 from public.community_content_moderation moderation where moderation.target_type = 'post' and moderation.target_id = cp.id and moderation.state = 'hidden')
            and not exists (select 1 from public.community_user_blocks block where (block.blocker_user_id = $1 and block.blocked_user_id = cp.author_user_id) or (block.blocker_user_id = cp.author_user_id and block.blocked_user_id = $1))
            and request_post.post_id is not null
            and (request_post.deadline is null or request_post.deadline >= current_date)
          order by cp.published_at desc
          limit 24
        `,
      [user.id],
    );
    const profileResult = await client.query<{
      role: string;
      profileData: unknown;
    }>(
      `
          select role, profile_data as "profileData"
          from public.collaboration_profiles
          where user_id = $1
        `,
      [user.id],
    );

    const keywords = new Set<string>();
    const roleSet = new Set<string>();
    for (const profile of profileResult.rows) {
      roleSet.add(profile.role);
      for (const skill of profileSkills(profile.profileData))
        keywords.add(skill);
    }
    const normalizedKeywords = [...keywords]
      .map(normalizeCommunityMatchValue)
      .filter(Boolean);

    const requestRoleMap: Record<string, string> = {
      development: "developer",
      design: "designer",
      translation: "translator",
      volunteering: "volunteer",
      module: "developer",
      documentation: "volunteer",
      marketing: "volunteer",
      research_support: "volunteer",
      other: "volunteer",
    };

    const opportunities = (
      await Promise.all(opportunityResult.rows.map(toCommunityPost))
    )
      .map((post) => {
        const details = post.details as {
          requestType?: string;
          skills?: string[];
        };
        const matches: string[] = [];
        let score = 0;

        for (const skill of details.skills ?? []) {
          const normalizedSkill = normalizeCommunityMatchValue(skill);
          if (!normalizedSkill) continue;
          const matched = normalizedKeywords.some(
            (keyword) =>
              keyword === normalizedSkill ||
              keyword.includes(normalizedSkill) ||
              normalizedSkill.includes(keyword),
          );
          if (matched) {
            score += 4;
            matches.push(skill);
          }
        }

        const mappedRole = details.requestType
          ? requestRoleMap[details.requestType]
          : undefined;
        if (mappedRole && roleSet.has(mappedRole)) {
          score += 3;
          const roleLabel: Record<string, string> = {
            developer: "Desenvolvimento",
            designer: "Design",
            translator: "Tradução",
            volunteer: "Voluntariado",
          };
          matches.push(roleLabel[mappedRole] ?? mappedRole);
        }

        if (post.targetRoles.includes("all")) score += 1;
        else if (
          [...roleSet].some((role) =>
            post.targetRoles.includes(role as CommunityTargetRole),
          )
        )
          score += 2;

        return {
          post,
          score,
          matchLabels: [...new Set(matches)].slice(0, 3),
        };
      })
      .sort((left, right) => {
        if (left.score !== right.score) return right.score - left.score;
        return (
          right.post.publishedAt.getTime() - left.post.publishedAt.getTime()
        );
      })
      .slice(0, 6);

    return {
      featuredProject: featuredResult.rows[0]
        ? await toCommunityPost(featuredResult.rows[0])
        : null,
      opportunities,
    };
  } finally {
    client.release();
  }
}

export async function getCommunityUserProfile(
  authUserId: string,
  targetUserId: string,
): Promise<CommunityUserProfile> {
  const client = await pool.connect();

  try {
    const viewer = await getActiveUser(client, authUserId);
    const userResult = await client.query<{
      id: string;
      displayName: string;
      username: string | null;
      bio: string | null;
      avatarPath: string | null;
    }>(
      `
        select
          id,
          coalesce(display_name, name) as "displayName",
          username,
          bio,
          avatar_path as "avatarPath"
        from public.users
        where id = $1
          and active = true
        limit 1
      `,
      [targetUserId],
    );

    const target = userResult.rows[0];
    if (!target) {
      throw new AppError(
        "Perfil da comunidade não encontrado.",
        404,
        "COMMUNITY_PROFILE_NOT_FOUND",
      );
    }

    const rolesResult = await client.query<{
      role: string;
      profileData: unknown;
    }>(
      `select role, profile_data as "profileData" from public.collaboration_profiles where user_id = $1 order by is_active desc, updated_at desc`,
      [targetUserId],
    );
    const organizationsResult = await client.query<{
      id: string;
      name: string;
      organizationType: "ngo" | "company";
    }>(
      `
          select o.id, o.name, o.organization_type as "organizationType"
          from public.organization_users ou
          join public.organizations o on o.id = ou.organization_id
          where ou.user_id = $1 and ou.status = 'active' and o.active = true
          order by o.name asc
        `,
      [targetUserId],
    );
    const statsResult = await client.query<{
      posts: number;
      followers: number;
      following: number;
      followedByMe: boolean;
      blockedByMe: boolean;
      blocksMe: boolean;
    }>(
      `
          select
            (select count(*)::int from public.community_posts where author_user_id = $1 and author_organization_id is null and status = 'published') as posts,
            (select count(*)::int from public.community_user_follows where followed_user_id = $1) as followers,
            (select count(*)::int from public.community_user_follows where follower_user_id = $1) as following,
            exists (
              select 1 from public.community_user_follows
              where follower_user_id = $2 and followed_user_id = $1
            ) as "followedByMe",
            exists (
              select 1 from public.community_user_blocks
              where blocker_user_id = $2 and blocked_user_id = $1
            ) as "blockedByMe",
            exists (
              select 1 from public.community_user_blocks
              where blocker_user_id = $1 and blocked_user_id = $2
            ) as "blocksMe"
        `,
      [targetUserId, viewer.id],
    );
    const postsResult = await client.query<CommunityPostRow>(
      `
          ${communityPostSelect}
          where cp.status = 'published'
            and cp.author_user_id = $2
            and cp.author_organization_id is null
            and not exists (select 1 from public.community_content_moderation moderation where moderation.target_type = 'post' and moderation.target_id = cp.id and moderation.state = 'hidden')
            and not exists (select 1 from public.community_user_blocks block where (block.blocker_user_id = $1 and block.blocked_user_id = cp.author_user_id) or (block.blocker_user_id = cp.author_user_id and block.blocked_user_id = $1))
          order by coalesce(cp.boosted_at, cp.published_at) desc, cp.created_at desc
          limit 12
        `,
      [viewer.id, targetUserId],
    );

    const stats = statsResult.rows[0] ?? {
      posts: 0,
      followers: 0,
      following: 0,
      followedByMe: false,
      blockedByMe: false,
      blocksMe: false,
    };

    return {
      entityType: "user",
      id: target.id,
      displayName: target.displayName,
      username: target.username,
      bio: target.bio,
      avatarUrl: getAvatarPublicUrl(target.avatarPath),
      isSelf: target.id === viewer.id,
      followedByMe: stats.followedByMe,
      blockedByMe: stats.blockedByMe,
      blocksMe: stats.blocksMe,
      roles: rolesResult.rows.map((role) => ({
        role: role.role,
        skills: profileSkills(role.profileData),
      })),
      organizations: organizationsResult.rows,
      stats: {
        posts: stats.posts,
        followers: stats.followers,
        following: stats.following,
      },
      recentPosts: await Promise.all(postsResult.rows.map(toCommunityPost)),
    };
  } finally {
    client.release();
  }
}

export async function getCommunityOrganizationProfile(
  authUserId: string,
  organizationId: string,
): Promise<CommunityOrganizationProfile> {
  const client = await pool.connect();

  try {
    const viewer = await getActiveUser(client, authUserId);
    const organizationResult = await client.query<{
      id: string;
      displayName: string;
      organizationType: "ngo" | "company";
      description: string | null;
      memberCount: number;
      posts: number;
    }>(
      `
        select
          o.id,
          o.name as "displayName",
          o.organization_type as "organizationType",
          o.description,
          (select count(*)::int from public.organization_users ou where ou.organization_id = o.id and ou.status = 'active') as "memberCount",
          (select count(*)::int from public.community_posts cp where cp.author_organization_id = o.id and cp.status = 'published') as posts
        from public.organizations o
        where o.id = $1 and o.active = true
        limit 1
      `,
      [organizationId],
    );

    const organization = organizationResult.rows[0];
    if (!organization) {
      throw new AppError(
        "Organização da comunidade não encontrada.",
        404,
        "COMMUNITY_ORGANIZATION_NOT_FOUND",
      );
    }

    const postsResult = await client.query<CommunityPostRow>(
      `
        ${communityPostSelect}
        where cp.status = 'published'
          and cp.author_organization_id = $2
          and not exists (select 1 from public.community_content_moderation moderation where moderation.target_type = 'post' and moderation.target_id = cp.id and moderation.state = 'hidden')
          and not exists (select 1 from public.community_user_blocks block where (block.blocker_user_id = $1 and block.blocked_user_id = cp.author_user_id) or (block.blocker_user_id = cp.author_user_id and block.blocked_user_id = $1))
        order by coalesce(cp.boosted_at, cp.published_at) desc, cp.created_at desc
        limit 12
      `,
      [viewer.id, organizationId],
    );

    return {
      entityType: "organization",
      id: organization.id,
      displayName: organization.displayName,
      organizationType: organization.organizationType,
      description: organization.description,
      memberCount: organization.memberCount,
      stats: { posts: organization.posts },
      recentPosts: await Promise.all(postsResult.rows.map(toCommunityPost)),
    };
  } finally {
    client.release();
  }
}

export async function followCommunityUser(
  authUserId: string,
  followedUserId: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    const user = await getActiveUser(client, authUserId);

    if (user.id === followedUserId) {
      throw new AppError(
        "Você não pode seguir a própria conta.",
        400,
        "COMMUNITY_SELF_FOLLOW_NOT_ALLOWED",
      );
    }

    const target = await client.query<{ id: string }>(
      `
        select id
        from public.users
        where id = $1
          and active = true
          and onboarding_step = 'completed'
        limit 1
      `,
      [followedUserId],
    );

    if (!target.rows[0]) {
      throw new AppError(
        "Pessoa da comunidade não encontrada.",
        404,
        "COMMUNITY_USER_NOT_FOUND",
      );
    }

    const blockRelation = await client.query<{ blocked: boolean }>(
      `
        select exists (
          select 1 from public.community_user_blocks
          where (blocker_user_id = $1 and blocked_user_id = $2)
             or (blocker_user_id = $2 and blocked_user_id = $1)
        ) as blocked
      `,
      [user.id, followedUserId],
    );

    if (blockRelation.rows[0]?.blocked) {
      throw new AppError(
        "Não é possível seguir este perfil enquanto houver um bloqueio entre vocês.",
        403,
        "COMMUNITY_USER_BLOCKED",
      );
    }

    await client.query(
      `
        insert into public.community_user_follows (follower_user_id, followed_user_id)
        values ($1, $2)
        on conflict (follower_user_id, followed_user_id) do nothing
      `,
      [user.id, followedUserId],
    );

    await upsertCommunityNotification(client, {
      userId: followedUserId,
      actorUserId: user.id,
      type: "user_follow",
      dedupeKey: `follow:${user.id}:${followedUserId}`,
    });
  } finally {
    client.release();
  }
}

export async function unfollowCommunityUser(
  authUserId: string,
  followedUserId: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    const user = await getActiveUser(client, authUserId);
    await client.query(
      `
        delete from public.community_user_follows
        where follower_user_id = $1
          and followed_user_id = $2
      `,
      [user.id, followedUserId],
    );

    await deleteCommunityNotificationByKey(
      client,
      `follow:${user.id}:${followedUserId}`,
    );
  } finally {
    client.release();
  }
}

export async function updateCommunityPost(
  authUserId: string,
  postId: string,
  input: UpdateCommunityPostInput,
): Promise<CommunityPost> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    await assertPostOwner(client, postId, user.id);

    const currentResult = await client.query<{ kind: CommunityPostKind }>(
      `
        select post_type as "kind"
        from public.community_posts
        where id = $1
        limit 1
      `,
      [postId],
    );

    const current = currentResult.rows[0];

    if (!current) {
      throw new AppError(
        "Publicação da comunidade não encontrada.",
        404,
        "COMMUNITY_POST_NOT_FOUND",
      );
    }

    if (current.kind !== input.kind) {
      throw new AppError(
        "O tipo da publicação não pode ser alterado depois de publicado.",
        400,
        "COMMUNITY_POST_KIND_IMMUTABLE",
      );
    }

    if (
      input.kind === "research" &&
      input.details.participationMode === "internal"
    ) {
      const responseCount = await client.query<{ count: number }>(
        `
          select count(*)::int as count
          from public.community_surveys survey
          join public.community_survey_responses response
            on response.survey_id = survey.id
          where survey.post_id = $1
        `,
        [postId],
      );

      if ((responseCount.rows[0]?.count ?? 0) > 0) {
        throw new AppError(
          "A estrutura de uma pesquisa interna não pode ser editada depois que ela recebe respostas.",
          409,
          "COMMUNITY_SURVEY_LOCKED_FOR_EDIT",
        );
      }
    }

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

    await client.query(
      `
        update public.community_posts
        set
          author_collaboration_profile_id = $3,
          author_organization_id = $4,
          area = $5,
          title = $6,
          description = $7,
          content = $8,
          target_roles = $9
        where id = $2
          and author_user_id = $1
      `,
      [
        user.id,
        postId,
        input.authorCollaborationProfileId ?? null,
        input.authorOrganizationId ?? null,
        input.area,
        input.title,
        input.summary,
        input.content,
        input.targetRoles,
      ],
    );

    await deletePostDetails(client, postId);
    await insertPostDetails(client, postId, input);
    await saveCommunityPostExtras(client, postId, user.id, input);
    const post = await getCommunityPostById(client, postId, user.id);
    await client.query("commit");
    return post;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function archiveCommunityPost(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    await assertPostOwner(client, postId, user.id);

    await client.query(
      `
        update public.community_posts
        set status = 'archived', updated_at = now()
        where id = $1 and author_user_id = $2
      `,
      [postId, user.id],
    );

    const post = await getCommunityPostById(client, postId, user.id);
    await client.query("commit");
    return post;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function restoreCommunityPost(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    await assertPostOwner(client, postId, user.id);

    await client.query(
      `
        update public.community_posts
        set status = 'published', updated_at = now()
        where id = $1 and author_user_id = $2
      `,
      [postId, user.id],
    );

    const post = await getCommunityPostById(client, postId, user.id);
    await client.query("commit");
    return post;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function boostCommunityPost(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);

    const result = await client.query<{
      authorUserId: string;
      status: CommunityPostStatus;
      publishedAt: Date;
      boostedAt: Date | null;
      boostCount: number;
    }>(
      `
        select
          author_user_id as "authorUserId",
          status,
          published_at as "publishedAt",
          boosted_at as "boostedAt",
          boost_count as "boostCount"
        from public.community_posts
        where id = $1
        for update
      `,
      [postId],
    );

    const current = result.rows[0];
    if (!current) {
      throw new AppError(
        "Publicação da comunidade não encontrada.",
        404,
        "COMMUNITY_POST_NOT_FOUND",
      );
    }

    if (current.authorUserId !== user.id) {
      throw new AppError(
        "Somente o autor pode recolocar a publicação no topo.",
        403,
        "COMMUNITY_POST_BOOST_ACCESS_DENIED",
      );
    }

    if (current.status !== "published") {
      throw new AppError(
        "Restaure a publicação antes de recolocá-la no topo.",
        409,
        "COMMUNITY_POST_BOOST_ARCHIVED",
      );
    }

    const now = Date.now();
    const publishedAt = new Date(current.publishedAt).getTime();
    const boostedAt = current.boostedAt
      ? new Date(current.boostedAt).getTime()
      : null;

    if (now - publishedAt < 24 * 60 * 60 * 1000) {
      throw new AppError(
        "Publicações com menos de 24 horas já estão recentes e ainda não podem ser impulsionadas.",
        409,
        "COMMUNITY_POST_BOOST_TOO_RECENT",
      );
    }

    if (current.boostCount >= 3) {
      throw new AppError(
        "Esta publicação já atingiu o limite de 3 impulsos.",
        409,
        "COMMUNITY_POST_BOOST_LIMIT_REACHED",
      );
    }

    if (boostedAt && now - boostedAt < 7 * 24 * 60 * 60 * 1000) {
      throw new AppError(
        "Esta publicação só pode ser impulsionada novamente depois de 7 dias.",
        409,
        "COMMUNITY_POST_BOOST_POST_COOLDOWN",
      );
    }

    const recentBoost = await client.query<{ boostedAt: Date }>(
      `
        select boosted_at as "boostedAt"
        from public.community_posts
        where author_user_id = $1
          and boosted_at is not null
          and id <> $2
        order by boosted_at desc
        limit 1
      `,
      [user.id, postId],
    );

    const latestOtherBoost = recentBoost.rows[0]?.boostedAt
      ? new Date(recentBoost.rows[0].boostedAt).getTime()
      : null;

    if (latestOtherBoost && now - latestOtherBoost < 24 * 60 * 60 * 1000) {
      throw new AppError(
        "Você pode impulsionar no máximo uma publicação por dia.",
        409,
        "COMMUNITY_POST_BOOST_ACCOUNT_COOLDOWN",
      );
    }

    await client.query(
      `
        update public.community_posts
        set boosted_at = now(), boost_count = boost_count + 1, updated_at = now()
        where id = $1 and author_user_id = $2
      `,
      [postId, user.id],
    );

    const post = await getCommunityPostById(client, postId, user.id);
    await client.query("commit");
    return post;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCommunityPost(
  authUserId: string,
  postId: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    await assertPostOwner(client, postId, user.id);

    await client.query(
      `
        delete from public.community_posts
        where id = $1
          and author_user_id = $2
      `,
      [postId, user.id],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function mutatePostInteraction(
  authUserId: string,
  postId: string,
  table: "community_post_likes" | "community_post_bookmarks",
  enabled: boolean,
): Promise<CommunityPost> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);

    const postExists = await client.query<{ id: string; authorUserId: string }>(
      `select cp.id, cp.author_user_id as "authorUserId"
       from public.community_posts cp
       where cp.id = $1 and cp.status = 'published'
         and not exists (select 1 from public.community_content_moderation moderation where moderation.target_type = 'post' and moderation.target_id = cp.id and moderation.state = 'hidden')
         and not exists (select 1 from public.community_user_blocks block where (block.blocker_user_id = $2 and block.blocked_user_id = cp.author_user_id) or (block.blocker_user_id = cp.author_user_id and block.blocked_user_id = $2))
       limit 1`,
      [postId, user.id],
    );

    if (!postExists.rows[0]) {
      throw new AppError(
        "Publicação da comunidade não encontrada.",
        404,
        "COMMUNITY_POST_NOT_FOUND",
      );
    }

    if (enabled) {
      await client.query(
        `
          insert into public.${table} (post_id, user_id)
          values ($1, $2)
          on conflict (post_id, user_id) do nothing
        `,
        [postId, user.id],
      );
    } else {
      await client.query(
        `
          delete from public.${table}
          where post_id = $1
            and user_id = $2
        `,
        [postId, user.id],
      );
    }

    if (table === "community_post_likes") {
      const ownerId = postExists.rows[0]!.authorUserId;
      const key = `post-like:${postId}:${user.id}`;
      if (enabled) {
        await upsertCommunityNotification(client, {
          userId: ownerId,
          actorUserId: user.id,
          type: "post_like",
          dedupeKey: key,
          postId,
        });
      } else {
        await deleteCommunityNotificationByKey(client, key);
      }
    }

    const post = await getCommunityPostById(client, postId, user.id);
    await client.query("commit");
    return post;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function likeCommunityPost(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  return mutatePostInteraction(
    authUserId,
    postId,
    "community_post_likes",
    true,
  );
}

export function unlikeCommunityPost(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  return mutatePostInteraction(
    authUserId,
    postId,
    "community_post_likes",
    false,
  );
}

export function bookmarkCommunityPost(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  return mutatePostInteraction(
    authUserId,
    postId,
    "community_post_bookmarks",
    true,
  );
}

export function unbookmarkCommunityPost(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  return mutatePostInteraction(
    authUserId,
    postId,
    "community_post_bookmarks",
    false,
  );
}

const communityCommentSelect = `
  select
    comment.id,
    comment.post_id as "postId",
    comment.parent_comment_id as "parentCommentId",
    comment.content,
    comment.created_at as "createdAt",
    comment.updated_at as "updatedAt",
    comment.author_user_id as "authorUserId",
    coalesce(author.display_name, author.name) as "authorDisplayName",
    author.username as "authorUsername",
    author.avatar_path as "authorAvatarPath",
    (comment.author_user_id = $1) as "canEdit"
  from public.community_post_comments comment
  join public.users author
    on author.id = comment.author_user_id
`;

async function getCommunityCommentById(
  client: PoolClient,
  commentId: string,
  viewerUserId: string,
): Promise<CommunityComment> {
  const result = await client.query<CommunityCommentRow>(
    `
      ${communityCommentSelect}
      where comment.id = $2
        and not exists (
          select 1 from public.community_content_moderation moderation
          where moderation.target_type = 'comment'
            and moderation.target_id = comment.id
            and moderation.state = 'hidden'
        )
        and not exists (
          select 1 from public.community_user_blocks block
          where (block.blocker_user_id = $1 and block.blocked_user_id = comment.author_user_id)
             or (block.blocker_user_id = comment.author_user_id and block.blocked_user_id = $1)
        )
      limit 1
    `,
    [viewerUserId, commentId],
  );

  const comment = result.rows[0];

  if (!comment) {
    throw new AppError(
      "Comentário não encontrado.",
      404,
      "COMMUNITY_COMMENT_NOT_FOUND",
    );
  }

  return toCommunityComment(comment);
}

async function assertCommentOwner(
  client: PoolClient,
  commentId: string,
  userId: string,
): Promise<void> {
  const result = await client.query<{ authorUserId: string }>(
    `
      select author_user_id as "authorUserId"
      from public.community_post_comments
      where id = $1
      limit 1
    `,
    [commentId],
  );

  const comment = result.rows[0];

  if (!comment) {
    throw new AppError(
      "Comentário não encontrado.",
      404,
      "COMMUNITY_COMMENT_NOT_FOUND",
    );
  }

  if (comment.authorUserId !== userId) {
    throw new AppError(
      "Você não pode alterar este comentário.",
      403,
      "COMMUNITY_COMMENT_ACCESS_DENIED",
    );
  }
}

export async function getCommunityPostComments(
  authUserId: string,
  postId: string,
): Promise<CommunityComment[]> {
  const client = await pool.connect();

  try {
    const user = await getActiveUser(client, authUserId);

    const postExists = await client.query<{ id: string }>(
      `select cp.id
       from public.community_posts cp
       where cp.id = $1 and cp.status = 'published'
         and not exists (select 1 from public.community_content_moderation moderation where moderation.target_type = 'post' and moderation.target_id = cp.id and moderation.state = 'hidden')
         and not exists (select 1 from public.community_user_blocks block where (block.blocker_user_id = $2 and block.blocked_user_id = cp.author_user_id) or (block.blocker_user_id = cp.author_user_id and block.blocked_user_id = $2))
       limit 1`,
      [postId, user.id],
    );

    if (!postExists.rows[0]) {
      throw new AppError(
        "Publicação da comunidade não encontrada.",
        404,
        "COMMUNITY_POST_NOT_FOUND",
      );
    }

    const result = await client.query<CommunityCommentRow>(
      `
        ${communityCommentSelect}
        where comment.post_id = $2
          and not exists (
            select 1 from public.community_content_moderation moderation
            where moderation.target_type = 'comment'
              and moderation.target_id = comment.id
              and moderation.state = 'hidden'
          )
          and not exists (
            select 1 from public.community_user_blocks block
            where (block.blocker_user_id = $1 and block.blocked_user_id = comment.author_user_id)
               or (block.blocker_user_id = comment.author_user_id and block.blocked_user_id = $1)
          )
        order by comment.created_at asc
        limit 200
      `,
      [user.id, postId],
    );

    return result.rows.map(toCommunityComment);
  } finally {
    client.release();
  }
}

export async function createCommunityComment(
  authUserId: string,
  postId: string,
  input: CreateCommunityCommentInput,
): Promise<CommunityComment> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);

    const postExists = await client.query<{ id: string; authorUserId: string }>(
      `select id, author_user_id as "authorUserId" from public.community_posts where id = $1 and status = 'published' limit 1`,
      [postId],
    );

    if (!postExists.rows[0]) {
      throw new AppError(
        "Publicação da comunidade não encontrada.",
        404,
        "COMMUNITY_POST_NOT_FOUND",
      );
    }

    let notificationRecipientId = postExists.rows[0]!.authorUserId;

    if (input.parentCommentId) {
      const parent = await client.query<{ id: string; authorUserId: string }>(
        `
          select id, author_user_id as "authorUserId"
          from public.community_post_comments
          where id = $1
            and post_id = $2
            and not exists (select 1 from public.community_content_moderation moderation where moderation.target_type = 'comment' and moderation.target_id = public.community_post_comments.id and moderation.state = 'hidden')
            and not exists (select 1 from public.community_user_blocks block where (block.blocker_user_id = $3 and block.blocked_user_id = public.community_post_comments.author_user_id) or (block.blocker_user_id = public.community_post_comments.author_user_id and block.blocked_user_id = $3))
          limit 1
        `,
        [input.parentCommentId, postId, user.id],
      );

      if (!parent.rows[0]) {
        throw new AppError(
          "O comentário respondido não pertence a esta publicação.",
          400,
          "COMMUNITY_COMMENT_PARENT_INVALID",
        );
      }
      notificationRecipientId = parent.rows[0].authorUserId;
    }

    const inserted = await client.query<{ id: string }>(
      `
        insert into public.community_post_comments (
          post_id,
          author_user_id,
          parent_comment_id,
          content
        )
        values ($1, $2, $3, $4)
        returning id
      `,
      [postId, user.id, input.parentCommentId ?? null, input.content],
    );

    const created = inserted.rows[0];

    if (!created) {
      throw new AppError(
        "Não foi possível publicar o comentário.",
        500,
        "COMMUNITY_COMMENT_CREATION_FAILED",
      );
    }

    await upsertCommunityNotification(client, {
      userId: notificationRecipientId,
      actorUserId: user.id,
      type: input.parentCommentId ? "comment_reply" : "post_comment",
      dedupeKey: `comment:${created.id}`,
      postId,
      commentId: created.id,
    });

    const comment = await getCommunityCommentById(client, created.id, user.id);
    await client.query("commit");
    return comment;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCommunityComment(
  authUserId: string,
  commentId: string,
  input: UpdateCommunityCommentInput,
): Promise<CommunityComment> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    await assertCommentOwner(client, commentId, user.id);

    await client.query(
      `
        update public.community_post_comments
        set content = $1
        where id = $2
          and author_user_id = $3
      `,
      [input.content, commentId, user.id],
    );

    const comment = await getCommunityCommentById(client, commentId, user.id);
    await client.query("commit");
    return comment;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCommunityComment(
  authUserId: string,
  commentId: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    await assertCommentOwner(client, commentId, user.id);

    await client.query(
      `
        delete from public.community_post_comments
        where id = $1
          and author_user_id = $2
      `,
      [commentId, user.id],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

interface SurveyRow {
  id: string;
  postId: string;
  status: "open" | "closed";
  anonymous: boolean;
  resultsPostId: string | null;
}

interface SurveyQuestionRow {
  id: string;
  type: CommunitySurveyQuestion["type"];
  prompt: string;
  required: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
}

async function getInternalSurveyRow(
  client: PoolClient,
  postId: string,
): Promise<SurveyRow> {
  const result = await client.query<SurveyRow>(
    `
      select
        survey.id,
        survey.post_id as "postId",
        survey.status,
        survey.anonymous,
        survey.published_results_post_id as "resultsPostId"
      from public.community_surveys survey
      join public.community_posts post on post.id = survey.post_id
      join public.community_post_research research on research.post_id = post.id
      where survey.post_id = $1
        and post.status = 'published'
        and post.post_type = 'research'
        and research.participation_mode = 'internal'
        and research.phase = 'collecting'
      limit 1
    `,
    [postId],
  );

  const survey = result.rows[0];
  if (!survey) {
    throw new AppError(
      "Pesquisa interna não encontrada.",
      404,
      "COMMUNITY_SURVEY_NOT_FOUND",
    );
  }
  return survey;
}

async function getSurveyQuestions(
  client: PoolClient,
  surveyId: string,
): Promise<CommunitySurveyQuestion[]> {
  const result = await client.query<SurveyQuestionRow>(
    `
      select
        question.id,
        question.question_type as "type",
        question.prompt,
        question.required,
        question.scale_min as "scaleMin",
        question.scale_max as "scaleMax"
      from public.community_survey_questions question
      where question.survey_id = $1
      order by question.position asc
    `,
    [surveyId],
  );

  const questions: CommunitySurveyQuestion[] = [];
  for (const question of result.rows) {
    const options = await client.query<{ id: string; label: string }>(
      `
        select id, label
        from public.community_survey_options
        where question_id = $1
        order by position asc
      `,
      [question.id],
    );
    questions.push({ ...question, options: options.rows });
  }
  return questions;
}

async function buildCommunitySurvey(
  client: PoolClient,
  survey: SurveyRow,
  viewerUserId: string,
): Promise<CommunitySurvey> {
  const countResult = await client.query<{ count: number }>(
    `select count(*)::int as count from public.community_survey_responses where survey_id = $1`,
    [survey.id],
  );
  const respondedResult = await client.query<{ exists: boolean }>(
    `select exists(select 1 from public.community_survey_responses where survey_id = $1 and user_id = $2) as exists`,
    [survey.id, viewerUserId],
  );
  const questions = await getSurveyQuestions(client, survey.id);

  return {
    ...survey,
    responseCount: countResult.rows[0]?.count ?? 0,
    alreadyResponded: respondedResult.rows[0]?.exists ?? false,
    questions,
  };
}

export async function getCommunitySurvey(
  authUserId: string,
  postId: string,
): Promise<CommunitySurvey> {
  const client = await pool.connect();
  try {
    const user = await getActiveUser(client, authUserId);
    const survey = await getInternalSurveyRow(client, postId);
    return buildCommunitySurvey(client, survey, user.id);
  } finally {
    client.release();
  }
}

export async function submitCommunitySurveyResponse(
  authUserId: string,
  postId: string,
  input: SubmitCommunitySurveyResponseInput,
): Promise<CommunitySurvey> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    const survey = await getInternalSurveyRow(client, postId);
    const sourcePost = await client.query<{ authorUserId: string }>(
      `select author_user_id as "authorUserId" from public.community_posts where id = $1 limit 1`,
      [postId],
    );

    if (survey.status !== "open") {
      throw new AppError(
        "Esta pesquisa já foi encerrada.",
        409,
        "COMMUNITY_SURVEY_CLOSED",
      );
    }

    const existing = await client.query<{ id: string }>(
      `select id from public.community_survey_responses where survey_id = $1 and user_id = $2 limit 1`,
      [survey.id, user.id],
    );
    if (existing.rows[0]) {
      throw new AppError(
        "Você já respondeu esta pesquisa.",
        409,
        "COMMUNITY_SURVEY_ALREADY_RESPONDED",
      );
    }

    const questions = await getSurveyQuestions(client, survey.id);
    const answerByQuestion = new Map(
      input.answers.map((answer) => [answer.questionId, answer]),
    );

    for (const question of questions) {
      const answer = answerByQuestion.get(question.id);
      if (question.required && !answer) {
        throw new AppError(
          `Responda a pergunta obrigatória: ${question.prompt}`,
          400,
          "COMMUNITY_SURVEY_REQUIRED_ANSWER",
        );
      }
      if (!answer) continue;

      if (question.type === "short_text" || question.type === "long_text") {
        if (typeof answer.textValue !== "string" || !answer.textValue.trim()) {
          throw new AppError(
            "Resposta de texto inválida.",
            400,
            "COMMUNITY_SURVEY_ANSWER_INVALID",
          );
        }
      }

      if (question.type === "scale") {
        if (typeof answer.numericValue !== "number") {
          throw new AppError(
            "Resposta de escala inválida.",
            400,
            "COMMUNITY_SURVEY_ANSWER_INVALID",
          );
        }
        const min = question.scaleMin ?? 1;
        const max = question.scaleMax ?? 5;
        if (answer.numericValue < min || answer.numericValue > max) {
          throw new AppError(
            "Valor fora da escala permitida.",
            400,
            "COMMUNITY_SURVEY_ANSWER_INVALID",
          );
        }
      }

      if (
        question.type === "single_choice" ||
        question.type === "multiple_choice"
      ) {
        if (!Array.isArray(answer.optionIds)) {
          throw new AppError(
            "Seleção inválida.",
            400,
            "COMMUNITY_SURVEY_ANSWER_INVALID",
          );
        }
        if (
          question.type === "single_choice" &&
          answer.optionIds.length !== 1
        ) {
          throw new AppError(
            "Escolha apenas uma opção.",
            400,
            "COMMUNITY_SURVEY_ANSWER_INVALID",
          );
        }
        if (
          question.type === "multiple_choice" &&
          question.required &&
          answer.optionIds.length === 0
        ) {
          throw new AppError(
            "Escolha pelo menos uma opção.",
            400,
            "COMMUNITY_SURVEY_ANSWER_INVALID",
          );
        }
        const allowed = new Set(question.options.map((option) => option.id));
        if (answer.optionIds.some((id) => !allowed.has(id))) {
          throw new AppError(
            "Uma opção selecionada não pertence à pergunta.",
            400,
            "COMMUNITY_SURVEY_ANSWER_INVALID",
          );
        }
      }
    }

    const responseResult = await client.query<{ id: string }>(
      `
        insert into public.community_survey_responses (survey_id, user_id)
        values ($1, $2)
        returning id
      `,
      [survey.id, user.id],
    );
    const response = responseResult.rows[0];
    if (!response) {
      throw new AppError(
        "Não foi possível registrar a resposta.",
        500,
        "COMMUNITY_SURVEY_RESPONSE_FAILED",
      );
    }

    for (const answer of input.answers) {
      const question = questions.find((item) => item.id === answer.questionId);
      if (!question) {
        throw new AppError(
          "Pergunta inválida.",
          400,
          "COMMUNITY_SURVEY_QUESTION_INVALID",
        );
      }

      const answerResult = await client.query<{ id: string }>(
        `
          insert into public.community_survey_answers (
            response_id,
            question_id,
            text_value,
            numeric_value
          )
          values ($1, $2, $3, $4)
          returning id
        `,
        [
          response.id,
          answer.questionId,
          typeof answer.textValue === "string" ? answer.textValue.trim() : null,
          typeof answer.numericValue === "number" ? answer.numericValue : null,
        ],
      );
      const createdAnswer = answerResult.rows[0];
      if (!createdAnswer) continue;

      if (Array.isArray(answer.optionIds)) {
        for (const optionId of answer.optionIds) {
          await client.query(
            `insert into public.community_survey_answer_options (answer_id, option_id) values ($1, $2)`,
            [createdAnswer.id, optionId],
          );
        }
      }
    }

    const sourceOwnerId = sourcePost.rows[0]?.authorUserId;
    if (sourceOwnerId) {
      await upsertCommunityNotification(client, {
        userId: sourceOwnerId,
        actorUserId: user.id,
        type: "survey_response",
        dedupeKey: `survey-response:${survey.id}:${user.id}`,
        postId,
        surveyId: survey.id,
      });
    }

    const next = await buildCommunitySurvey(client, survey, user.id);
    await client.query("commit");
    return next;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function buildCommunitySurveyResults(
  client: PoolClient,
  survey: SurveyRow,
  includeTextAnswers: boolean,
): Promise<CommunitySurveyResults> {
  const responseCountResult = await client.query<{ count: number }>(
    `select count(*)::int as count from public.community_survey_responses where survey_id = $1`,
    [survey.id],
  );
  const responseCount = responseCountResult.rows[0]?.count ?? 0;
  const questions = await getSurveyQuestions(client, survey.id);
  const results: CommunitySurveyResultsQuestion[] = [];

  for (const question of questions) {
    const answeredResult = await client.query<{ count: number }>(
      `select count(*)::int as count from public.community_survey_answers where question_id = $1`,
      [question.id],
    );
    const answeredCount = answeredResult.rows[0]?.count ?? 0;

    let textAnswers: string[] = [];
    let average: number | null = null;
    let options: CommunitySurveyResultsQuestion["options"] = [];

    if (
      includeTextAnswers &&
      (question.type === "short_text" || question.type === "long_text")
    ) {
      const textResult = await client.query<{ value: string }>(
        `
          select text_value as value
          from public.community_survey_answers
          where question_id = $1 and text_value is not null
          order by id
          limit 500
        `,
        [question.id],
      );
      textAnswers = textResult.rows.map((row) => row.value);
    }

    if (question.type === "scale") {
      const averageResult = await client.query<{ average: number | null }>(
        `select avg(numeric_value)::float as average from public.community_survey_answers where question_id = $1 and numeric_value is not null`,
        [question.id],
      );
      average = averageResult.rows[0]?.average ?? null;
    }

    if (
      question.type === "single_choice" ||
      question.type === "multiple_choice"
    ) {
      const optionResult = await client.query<{
        id: string;
        label: string;
        count: number;
      }>(
        `
          select option.id, option.label, count(answer_option.answer_id)::int as count
          from public.community_survey_options option
          left join public.community_survey_answer_options answer_option
            on answer_option.option_id = option.id
          where option.question_id = $1
          group by option.id, option.label, option.position
          order by option.position asc
        `,
        [question.id],
      );
      options = optionResult.rows.map((option) => ({
        ...option,
        percentage:
          answeredCount > 0
            ? Math.round((option.count / answeredCount) * 1000) / 10
            : 0,
      }));
    }

    results.push({
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      answeredCount,
      textAnswers,
      average,
      options,
    });
  }

  return {
    surveyId: survey.id,
    postId: survey.postId,
    status: survey.status,
    anonymous: survey.anonymous,
    resultsPostId: survey.resultsPostId,
    responseCount,
    questions: results,
  };
}

export async function getCommunitySurveyResults(
  authUserId: string,
  postId: string,
): Promise<CommunitySurveyResults> {
  const client = await pool.connect();
  try {
    const user = await getActiveUser(client, authUserId);
    const survey = await getInternalSurveyRow(client, postId);
    const ownerResult = await client.query<{ authorUserId: string }>(
      `select author_user_id as "authorUserId" from public.community_posts where id = $1 limit 1`,
      [postId],
    );
    const isOwner = ownerResult.rows[0]?.authorUserId === user.id;

    if (!isOwner && !survey.resultsPostId) {
      throw new AppError(
        "Os resultados desta pesquisa ainda não foram publicados.",
        403,
        "COMMUNITY_SURVEY_RESULTS_PRIVATE",
      );
    }

    return buildCommunitySurveyResults(client, survey, isOwner);
  } finally {
    client.release();
  }
}

export async function closeCommunitySurvey(
  authUserId: string,
  postId: string,
): Promise<CommunitySurvey> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    await assertPostOwner(client, postId, user.id);
    const survey = await getInternalSurveyRow(client, postId);
    await client.query(
      `update public.community_surveys set status = 'closed', closed_at = coalesce(closed_at, now()) where id = $1`,
      [survey.id],
    );
    const updated: SurveyRow = { ...survey, status: "closed" };
    const result = await buildCommunitySurvey(client, updated, user.id);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function publishCommunitySurveyResults(
  authUserId: string,
  postId: string,
): Promise<CommunityPost> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    await assertPostOwner(client, postId, user.id);
    const survey = await getInternalSurveyRow(client, postId);
    const lockedSurveyResult = await client.query<{
      resultsPostId: string | null;
    }>(
      `
        select published_results_post_id as "resultsPostId"
        from public.community_surveys
        where id = $1
        for update
      `,
      [survey.id],
    );
    const lockedResultsPostId =
      lockedSurveyResult.rows[0]?.resultsPostId ?? null;
    const results = await buildCommunitySurveyResults(
      client,
      { ...survey, resultsPostId: lockedResultsPostId },
      false,
    );

    if (results.responseCount === 0) {
      throw new AppError(
        "A pesquisa ainda não possui respostas para publicar.",
        409,
        "COMMUNITY_SURVEY_RESULTS_EMPTY",
      );
    }

    if (lockedResultsPostId) {
      const existingPost = await getCommunityPostById(
        client,
        lockedResultsPostId,
        user.id,
      );
      await client.query("commit");
      return existingPost;
    }

    const sourceResult = await client.query<{
      authorUserId: string;
      authorCollaborationProfileId: string | null;
      authorOrganizationId: string | null;
      area: CommunityArea;
      title: string;
      summary: string;
      targetRoles: CommunityTargetRole[];
      researchType: ResearchStoredDetails["researchType"];
      criteria: string;
    }>(
      `
        select
          post.author_user_id as "authorUserId",
          post.author_collaboration_profile_id as "authorCollaborationProfileId",
          post.author_organization_id as "authorOrganizationId",
          post.area,
          post.title,
          post.description as summary,
          post.target_roles as "targetRoles",
          research.research_type as "researchType",
          research.criteria
        from public.community_posts post
        join public.community_post_research research on research.post_id = post.id
        where post.id = $1
        limit 1
      `,
      [postId],
    );
    const source = sourceResult.rows[0];
    if (!source) {
      throw new AppError(
        "Pesquisa não encontrada.",
        404,
        "COMMUNITY_SURVEY_NOT_FOUND",
      );
    }

    const createdResult = await client.query<{ id: string }>(
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
        values ($1, $2, $3, $4, 'research', $5, $6, $7, $8)
        returning id
      `,
      [
        source.authorUserId,
        source.authorCollaborationProfileId,
        source.authorOrganizationId,
        source.area,
        `Resultados: ${source.title}`,
        `${results.responseCount} resposta${results.responseCount === 1 ? "" : "s"} reunida${results.responseCount === 1 ? "" : "s"} na pesquisa da comunidade.`,
        `A coleta foi concluída e os principais resultados estão disponíveis neste post.`,
        source.targetRoles,
      ],
    );
    const created = createdResult.rows[0];
    if (!created) {
      throw new AppError(
        "Não foi possível publicar os resultados.",
        500,
        "COMMUNITY_SURVEY_RESULTS_PUBLISH_FAILED",
      );
    }

    await client.query(
      `
        insert into public.community_post_research (
          post_id,
          research_type,
          participation_mode,
          phase,
          criteria,
          results_source_post_id,
          results_snapshot
        )
        values ($1, $2, 'internal', 'results', $3, $4, $5::jsonb)
      `,
      [
        created.id,
        source.researchType,
        source.criteria || null,
        postId,
        JSON.stringify(results),
      ],
    );

    await client.query(
      `update public.community_surveys set published_results_post_id = $2 where id = $1`,
      [survey.id, created.id],
    );

    const respondents = await client.query<{ userId: string }>(
      `select distinct user_id as "userId" from public.community_survey_responses where survey_id = $1`,
      [survey.id],
    );
    for (const respondent of respondents.rows) {
      await upsertCommunityNotification(client, {
        userId: respondent.userId,
        actorUserId: user.id,
        type: "survey_results_published",
        dedupeKey: `survey_results:${survey.id}:${respondent.userId}`,
        postId: created.id,
        surveyId: survey.id,
      });
    }

    const post = await getCommunityPostById(client, created.id, user.id);
    await client.query("commit");
    return post;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export type CommunityNotificationType =
  | "post_like"
  | "post_comment"
  | "comment_reply"
  | "user_follow"
  | "survey_response"
  | "survey_results_published"
  | "event_update"
  | "post_mention"
  | "moderation_report"
  | "moderation_action";

export interface CommunityNotification {
  id: string;
  type: CommunityNotificationType;
  isRead: boolean;
  createdAt: Date;
  actor: {
    userId: string | null;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  post: { id: string; title: string } | null;
  event: { id: string; title: string; status: CommunityEvent["status"] } | null;
}

export interface CommunityNotificationsPayload {
  unreadCount: number;
  notifications: CommunityNotification[];
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  status: "published" | "cancelled";
  startsAt: Date;
  endsAt: Date | null;
  mode: "online" | "in_person" | "hybrid";
  location: string | null;
  meetingUrl: string | null;
  capacity: number | null;
  participantCount: number;
  joinedByMe: boolean;
  canManage: boolean;
  organizer: {
    userId: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
}

async function upsertCommunityNotification(
  client: PoolClient,
  input: {
    userId: string;
    actorUserId?: string | null;
    type: CommunityNotificationType;
    dedupeKey: string;
    postId?: string | null;
    commentId?: string | null;
    surveyId?: string | null;
    eventId?: string | null;
  },
): Promise<void> {
  if (input.actorUserId && input.actorUserId === input.userId) return;
  if (input.actorUserId) {
    const blocked = await client.query<{ blocked: boolean }>(
      `select exists(
        select 1 from public.community_user_blocks
        where (blocker_user_id = $1 and blocked_user_id = $2)
           or (blocker_user_id = $2 and blocked_user_id = $1)
      ) as blocked`,
      [input.userId, input.actorUserId],
    );
    if (blocked.rows[0]?.blocked) return;
  }
  await client.query(
    `
      insert into public.community_notifications (
        user_id, actor_user_id, notification_type, dedupe_key,
        post_id, comment_id, survey_id, event_id, is_read, created_at, read_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,false,now(),null)
      on conflict (dedupe_key) do update
      set is_read = false, created_at = now(), read_at = null
    `,
    [
      input.userId,
      input.actorUserId ?? null,
      input.type,
      input.dedupeKey,
      input.postId ?? null,
      input.commentId ?? null,
      input.surveyId ?? null,
      input.eventId ?? null,
    ],
  );
}

async function deleteCommunityNotificationByKey(
  client: PoolClient,
  dedupeKey: string,
): Promise<void> {
  await client.query(
    `delete from public.community_notifications where dedupe_key = $1`,
    [dedupeKey],
  );
}

export async function getCommunityNotifications(
  authUserId: string,
): Promise<CommunityNotificationsPayload> {
  const client = await pool.connect();
  try {
    const user = await getActiveUser(client, authUserId);
    const countResult = await client.query<{ count: number }>(
      `select count(*)::int as count
       from public.community_notifications n
       where n.user_id = $1 and n.is_read = false
         and not exists (
           select 1 from public.community_user_blocks block
           where n.actor_user_id is not null
             and ((block.blocker_user_id = $1 and block.blocked_user_id = n.actor_user_id)
               or (block.blocker_user_id = n.actor_user_id and block.blocked_user_id = $1))
         )`,
      [user.id],
    );
    const listResult = await client.query<{
      id: string;
      type: CommunityNotificationType;
      isRead: boolean;
      createdAt: Date;
      actorUserId: string | null;
      actorDisplayName: string | null;
      actorUsername: string | null;
      actorAvatarPath: string | null;
      postId: string | null;
      postTitle: string | null;
      eventId: string | null;
      eventTitle: string | null;
      eventStatus: CommunityEvent["status"] | null;
    }>(
      `
          select
            n.id,
            n.notification_type as type,
            n.is_read as "isRead",
            n.created_at as "createdAt",
            actor.id as "actorUserId",
            coalesce(actor.display_name, actor.name) as "actorDisplayName",
            actor.username as "actorUsername",
            actor.avatar_path as "actorAvatarPath",
            post.id as "postId",
            post.title as "postTitle",
            event.id as "eventId",
            event.title as "eventTitle",
            event.status as "eventStatus"
          from public.community_notifications n
          left join public.users actor on actor.id = n.actor_user_id
          left join public.community_posts post on post.id = n.post_id
          left join public.community_events event on event.id = n.event_id
          where n.user_id = $1
            and not exists (
              select 1 from public.community_user_blocks block
              where n.actor_user_id is not null
                and ((block.blocker_user_id = $1 and block.blocked_user_id = n.actor_user_id)
                  or (block.blocker_user_id = n.actor_user_id and block.blocked_user_id = $1))
            )
          order by n.created_at desc
          limit 30
        `,
      [user.id],
    );

    return {
      unreadCount: countResult.rows[0]?.count ?? 0,
      notifications: listResult.rows.map((row) => ({
        id: row.id,
        type: row.type,
        isRead: row.isRead,
        createdAt: row.createdAt,
        actor: row.actorUserId
          ? {
              userId: row.actorUserId,
              displayName: row.actorDisplayName ?? "Pessoa da comunidade",
              username: row.actorUsername,
              avatarUrl: getAvatarPublicUrl(row.actorAvatarPath),
            }
          : null,
        post: row.postId
          ? { id: row.postId, title: row.postTitle ?? "Publicação" }
          : null,
        event: row.eventId
          ? {
              id: row.eventId,
              title: row.eventTitle ?? "Evento",
              status: row.eventStatus ?? "published",
            }
          : null,
      })),
    };
  } finally {
    client.release();
  }
}

export async function markCommunityNotificationRead(
  authUserId: string,
  notificationId: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    const user = await getActiveUser(client, authUserId);
    await client.query(
      `update public.community_notifications set is_read = true, read_at = coalesce(read_at, now()) where id = $1 and user_id = $2`,
      [notificationId, user.id],
    );
  } finally {
    client.release();
  }
}

export async function markAllCommunityNotificationsRead(
  authUserId: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    const user = await getActiveUser(client, authUserId);
    await client.query(
      `update public.community_notifications set is_read = true, read_at = coalesce(read_at, now()) where user_id = $1 and is_read = false`,
      [user.id],
    );
  } finally {
    client.release();
  }
}

async function getCommunityEventById(
  client: PoolClient,
  eventId: string,
  viewerUserId: string,
): Promise<CommunityEvent> {
  const result = await client.query<{
    id: string;
    title: string;
    description: string;
    status: CommunityEvent["status"];
    startsAt: Date;
    endsAt: Date | null;
    mode: CommunityEvent["mode"];
    location: string | null;
    meetingUrl: string | null;
    capacity: number | null;
    participantCount: number;
    joinedByMe: boolean;
    organizerUserId: string;
    organizerDisplayName: string;
    organizerUsername: string | null;
    organizerAvatarPath: string | null;
  }>(
    `
      select
        event.id, event.title, event.description, event.status,
        event.starts_at as "startsAt", event.ends_at as "endsAt",
        event.event_mode as mode, event.location, event.meeting_url as "meetingUrl", event.capacity,
        (select count(*)::int from public.community_event_participants p where p.event_id = event.id) as "participantCount",
        exists(select 1 from public.community_event_participants p where p.event_id = event.id and p.user_id = $2) as "joinedByMe",
        organizer.id as "organizerUserId",
        coalesce(organizer.display_name, organizer.name) as "organizerDisplayName",
        organizer.username as "organizerUsername",
        organizer.avatar_path as "organizerAvatarPath"
      from public.community_events event
      join public.users organizer on organizer.id = event.organizer_user_id
      where event.id = $1
        and not exists (
          select 1 from public.community_user_blocks block
          where (block.blocker_user_id = $2 and block.blocked_user_id = event.organizer_user_id)
             or (block.blocker_user_id = event.organizer_user_id and block.blocked_user_id = $2)
        )
      limit 1
    `,
    [eventId, viewerUserId],
  );
  const row = result.rows[0];
  if (!row)
    throw new AppError(
      "Evento não encontrado.",
      404,
      "COMMUNITY_EVENT_NOT_FOUND",
    );
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    mode: row.mode,
    location: row.location,
    meetingUrl:
      row.joinedByMe || row.organizerUserId === viewerUserId
        ? row.meetingUrl
        : null,
    capacity: row.capacity,
    participantCount: row.participantCount,
    joinedByMe: row.joinedByMe,
    canManage: row.organizerUserId === viewerUserId,
    organizer: {
      userId: row.organizerUserId,
      displayName: row.organizerDisplayName,
      username: row.organizerUsername,
      avatarUrl: getAvatarPublicUrl(row.organizerAvatarPath),
    },
  };
}

export async function getNextCommunityEvent(
  authUserId: string,
): Promise<CommunityEvent | null> {
  const client = await pool.connect();
  try {
    const user = await getActiveUser(client, authUserId);
    const result = await client.query<{ id: string }>(
      `select id from public.community_events event
       where status = 'published' and starts_at >= now()
         and not exists (
           select 1 from public.community_user_blocks block
           where (block.blocker_user_id = $1 and block.blocked_user_id = event.organizer_user_id)
              or (block.blocker_user_id = event.organizer_user_id and block.blocked_user_id = $1)
         )
       order by starts_at asc limit 1`,
      [user.id],
    );
    const event = result.rows[0];
    return event ? getCommunityEventById(client, event.id, user.id) : null;
  } finally {
    client.release();
  }
}

export type CommunityEventScope = "upcoming" | "past" | "mine";

export async function listCommunityEvents(
  authUserId: string,
  scope: CommunityEventScope = "upcoming",
): Promise<CommunityEvent[]> {
  const client = await pool.connect();
  try {
    const user = await getActiveUser(client, authUserId);
    const normalizedScope: CommunityEventScope = [
      "upcoming",
      "past",
      "mine",
    ].includes(scope)
      ? scope
      : "upcoming";

    let whereClause = "event.status = 'published' and event.starts_at >= now()";
    let orderClause = "event.starts_at asc";
    const params: unknown[] = [user.id];

    if (normalizedScope === "past") {
      whereClause = "event.status = 'published' and event.starts_at < now()";
      orderClause = "event.starts_at desc";
    } else if (normalizedScope === "mine") {
      whereClause = `
        (
          event.organizer_user_id = $1
          or exists (
            select 1 from public.community_event_participants participant
            where participant.event_id = event.id and participant.user_id = $1
          )
        )
      `;
      orderClause = "event.starts_at desc";
    }

    const result = await client.query<{ id: string }>(
      `
        select event.id
        from public.community_events event
        where (${whereClause})
          and not exists (
            select 1 from public.community_user_blocks block
            where (block.blocker_user_id = $1 and block.blocked_user_id = event.organizer_user_id)
               or (block.blocker_user_id = event.organizer_user_id and block.blocked_user_id = $1)
          )
        order by ${orderClause}
        limit 60
      `,
      params,
    );

    const events: CommunityEvent[] = [];
    for (const row of result.rows) {
      events.push(await getCommunityEventById(client, row.id, user.id));
    }
    return events;
  } finally {
    client.release();
  }
}

export async function getCommunityEvent(
  authUserId: string,
  eventId: string,
): Promise<CommunityEvent> {
  const client = await pool.connect();
  try {
    const user = await getActiveUser(client, authUserId);
    return await getCommunityEventById(client, eventId, user.id);
  } finally {
    client.release();
  }
}

async function notifyCommunityEventParticipants(
  client: PoolClient,
  eventId: string,
  actorUserId: string,
): Promise<void> {
  const participants = await client.query<{ userId: string }>(
    `
      select distinct participant.user_id as "userId"
      from public.community_event_participants participant
      where participant.event_id = $1 and participant.user_id <> $2
    `,
    [eventId, actorUserId],
  );

  for (const participant of participants.rows) {
    await upsertCommunityNotification(client, {
      userId: participant.userId,
      actorUserId,
      type: "event_update",
      dedupeKey: `event_update:${eventId}:${participant.userId}`,
      eventId,
    });
  }
}

export async function updateCommunityEvent(
  authUserId: string,
  eventId: string,
  input: CreateCommunityEventInput,
): Promise<CommunityEvent> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    const existing = await getCommunityEventById(client, eventId, user.id);

    if (!existing.canManage) {
      throw new AppError(
        "Apenas o organizador pode editar este evento.",
        403,
        "COMMUNITY_EVENT_FORBIDDEN",
      );
    }
    if (existing.status === "cancelled") {
      throw new AppError(
        "Um evento cancelado não pode ser editado.",
        409,
        "COMMUNITY_EVENT_CANCELLED",
      );
    }
    if (new Date(input.startsAt).getTime() <= Date.now()) {
      throw new AppError(
        "O evento precisa começar no futuro.",
        400,
        "COMMUNITY_EVENT_START_INVALID",
      );
    }
    if (
      input.capacity !== null &&
      input.capacity !== undefined &&
      input.capacity < existing.participantCount
    ) {
      throw new AppError(
        "O limite não pode ser menor que a quantidade atual de participantes.",
        409,
        "COMMUNITY_EVENT_CAPACITY_TOO_LOW",
      );
    }

    await client.query(
      `
        update public.community_events
        set title = $3, description = $4, starts_at = $5, ends_at = $6,
            event_mode = $7, location = $8, meeting_url = $9, capacity = $10,
            updated_at = now()
        where id = $1 and organizer_user_id = $2
      `,
      [
        eventId,
        user.id,
        input.title,
        input.description ?? "",
        input.startsAt,
        input.endsAt ?? null,
        input.mode,
        input.location ?? null,
        input.meetingUrl ?? null,
        input.capacity ?? null,
      ],
    );

    await notifyCommunityEventParticipants(client, eventId, user.id);
    const event = await getCommunityEventById(client, eventId, user.id);
    await client.query("commit");
    return event;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function cancelCommunityEvent(
  authUserId: string,
  eventId: string,
): Promise<CommunityEvent> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    const existing = await getCommunityEventById(client, eventId, user.id);

    if (!existing.canManage) {
      throw new AppError(
        "Apenas o organizador pode cancelar este evento.",
        403,
        "COMMUNITY_EVENT_FORBIDDEN",
      );
    }
    if (existing.status !== "cancelled") {
      await client.query(
        `update public.community_events set status = 'cancelled', updated_at = now() where id = $1 and organizer_user_id = $2`,
        [eventId, user.id],
      );
      await notifyCommunityEventParticipants(client, eventId, user.id);
    }

    const event = await getCommunityEventById(client, eventId, user.id);
    await client.query("commit");
    return event;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function createCommunityEvent(
  authUserId: string,
  input: CreateCommunityEventInput,
): Promise<CommunityEvent> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    if (new Date(input.startsAt).getTime() <= Date.now()) {
      throw new AppError(
        "O evento precisa começar no futuro.",
        400,
        "COMMUNITY_EVENT_START_INVALID",
      );
    }
    const result = await client.query<{ id: string }>(
      `
        insert into public.community_events (
          organizer_user_id, title, description, starts_at, ends_at,
          event_mode, location, meeting_url, capacity
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        returning id
      `,
      [
        user.id,
        input.title,
        input.description ?? "",
        input.startsAt,
        input.endsAt ?? null,
        input.mode,
        input.location ?? null,
        input.meetingUrl ?? null,
        input.capacity ?? null,
      ],
    );
    const created = result.rows[0];
    if (!created)
      throw new AppError(
        "Não foi possível criar o evento.",
        500,
        "COMMUNITY_EVENT_CREATE_FAILED",
      );
    await client.query(
      `insert into public.community_event_participants (event_id, user_id) values ($1,$2) on conflict do nothing`,
      [created.id, user.id],
    );
    const event = await getCommunityEventById(client, created.id, user.id);
    await client.query("commit");
    return event;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function joinCommunityEvent(
  authUserId: string,
  eventId: string,
): Promise<CommunityEvent> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    const event = await getCommunityEventById(client, eventId, user.id);
    if (event.status !== "published") {
      throw new AppError(
        "Este evento foi cancelado.",
        409,
        "COMMUNITY_EVENT_CANCELLED",
      );
    }
    if (new Date(event.startsAt).getTime() <= Date.now()) {
      throw new AppError(
        "Este evento já começou ou terminou.",
        409,
        "COMMUNITY_EVENT_ALREADY_STARTED",
      );
    }
    if (
      event.capacity !== null &&
      event.participantCount >= event.capacity &&
      !event.joinedByMe
    ) {
      throw new AppError(
        "Este evento atingiu o limite de participantes.",
        409,
        "COMMUNITY_EVENT_FULL",
      );
    }
    await client.query(
      `insert into public.community_event_participants (event_id, user_id) values ($1,$2) on conflict do nothing`,
      [eventId, user.id],
    );
    const updated = await getCommunityEventById(client, eventId, user.id);
    await client.query("commit");
    return updated;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function leaveCommunityEvent(
  authUserId: string,
  eventId: string,
): Promise<CommunityEvent> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await getActiveUser(client, authUserId);
    const existing = await getCommunityEventById(client, eventId, user.id);
    if (existing.canManage) {
      throw new AppError(
        "O organizador não pode sair do próprio evento.",
        409,
        "COMMUNITY_EVENT_ORGANIZER_LEAVE",
      );
    }
    await client.query(
      `delete from public.community_event_participants where event_id = $1 and user_id = $2`,
      [eventId, user.id],
    );
    const updated = await getCommunityEventById(client, eventId, user.id);
    await client.query("commit");
    return updated;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
