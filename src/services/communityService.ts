import { apiDelete, apiGet, apiPatch, apiPost, apiRequest } from "./api";

export const communityAreas = [
  "desenvolvimento",
  "design",
  "pesquisa",
  "documentacao",
  "voluntariado",
  "ongs",
] as const;

export type CommunityArea = (typeof communityAreas)[number];

export const communityPostKinds = [
  "general",
  "question",
  "request",
  "research",
  "update",
  "resource",
  "announcement",
] as const;

export type CommunityPostKind = (typeof communityPostKinds)[number];

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

export const communityTargetRoles = [
  "all",
  "organization",
  "developer",
  "designer",
  "translator",
  "volunteer",
  "supporter",
] as const;

export type CommunityTargetRole = (typeof communityTargetRoles)[number];

export type EngagementMode = "remote" | "in_person" | "hybrid" | "flexible";

export type RequestType =
  | "module"
  | "development"
  | "design"
  | "marketing"
  | "translation"
  | "documentation"
  | "research_support"
  | "volunteering"
  | "other";

export type ResearchType =
  | "questionnaire"
  | "interview"
  | "usability_test"
  | "validation"
  | "field_research";

export type ResearchParticipationMode = "external" | "internal";
export type ResearchPhase = "collecting" | "results";
export type CommunitySurveyQuestionType =
  "short_text" | "long_text" | "single_choice" | "multiple_choice" | "scale";

export interface CommunitySurveyQuestionDraft {
  clientId: string;
  type: CommunitySurveyQuestionType;
  prompt: string;
  required: boolean;
  options: string[];
  scaleMin?: number;
  scaleMax?: number;
}

export interface CommunitySurveyDefinition {
  anonymous: boolean;
  questions: CommunitySurveyQuestionDraft[];
}

export interface CommunitySurveyQuestion {
  id: string;
  type: CommunitySurveyQuestionType;
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

export type CommunitySurveyAnswerInput =
  | { questionId: string; textValue: string }
  | { questionId: string; numericValue: number }
  | { questionId: string; optionIds: string[] };

export interface CommunitySurveyResultsQuestion {
  id: string;
  prompt: string;
  type: CommunitySurveyQuestionType;
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

export type ResourceType =
  "template" | "guide" | "document" | "toolkit" | "code" | "link" | "other";

export type UpdateEntityType = "project" | "module" | "organization" | "other";

interface RequestCommonDetails {
  deadline?: string | null;
  engagementMode: EngagementMode;
  peopleNeeded?: number | null;
  skills: string[];
}

export type RequestDetails =
  | (RequestCommonDetails & {
      requestType: "module";
      problem: string;
      users: string;
      essentialFeatures: string[];
      currentProcess: string;
    })
  | (RequestCommonDetails & {
      requestType: "development";
      scope: string;
      stack: string[];
      repositoryUrl?: string | null;
    })
  | (RequestCommonDetails & {
      requestType: "design";
      designNeed: string;
      deliverables: string[];
      existingMaterialUrl?: string | null;
    })
  | (RequestCommonDetails & {
      requestType: "marketing";
      objective: string;
      channels: string[];
      audience: string;
    })
  | (RequestCommonDetails & {
      requestType: "translation";
      sourceLanguage: string;
      targetLanguages: string[];
      contentType: string;
      approximateVolume: string;
    })
  | (RequestCommonDetails & {
      requestType: "documentation";
      documentationType: string;
      audience: string;
      existingMaterialUrl?: string | null;
    })
  | (RequestCommonDetails & {
      requestType: "research_support";
      researchGoal: string;
      method: string;
      targetAudience: string;
    })
  | (RequestCommonDetails & {
      requestType: "volunteering";
      activity: string;
      location: string;
      schedule: string;
    })
  | (RequestCommonDetails & {
      requestType: "other";
      context: string;
    });

export type CommunityPostDetails =
  | {
      generalType: "comment" | "idea" | "experience";
      tags: string[];
    }
  | {
      topic: string;
      resolved?: boolean;
    }
  | RequestDetails
  | {
      researchType: ResearchType;
      participationMode: ResearchParticipationMode;
      phase: ResearchPhase;
      estimatedMinutes?: number | null;
      deadline?: string | null;
      responseUrl?: string | null;
      criteria: string;
      survey?: CommunitySurveyDefinition | null;
      responseCount?: number;
      resultsSourcePostId?: string | null;
      resultsSnapshot?: CommunitySurveyResults | null;
    }
  | {
      entityType: UpdateEntityType;
      entityLabel: string;
      version: string;
      progress?: number | null;
      referenceUrl?: string | null;
      milestones: string[];
      completedMilestones: number;
    }
  | {
      resourceType: ResourceType;
      resourceUrl?: string | null;
      version: string;
      license: string;
      tags: string[];
    }
  | {
      priority: "normal" | "important";
    };

export interface CommunityMedia {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}
export interface CommunityMention {
  entityType: "user" | "organization";
  entityId: string;
  token: string;
  displayName: string;
  avatarUrl?: string | null;
}
export interface CommunityLinkPreview {
  id: string;
  url: string;
  title: string;
  description: string;
  hostname: string;
}
export interface CommunityPost {
  tags?: string[];
  media?: CommunityMedia[];
  mentions?: CommunityMention[];
  linkPreview?: CommunityLinkPreview | null;
  id: string;
  area: CommunityArea;
  kind: CommunityPostKind;
  title: string;
  summary: string;
  content: string;
  targetRoles: CommunityTargetRole[];
  status: "published" | "archived";
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  boostedAt: string | null;
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
  moderation?: {
    state: "visible" | "hidden";
    reason: string | null;
    moderatedAt: string | null;
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

export type CommunityProfile =
  CommunityUserProfile | CommunityOrganizationProfile;

export interface CommunityComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
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

type CreateBase = {
  mediaIds?: string[];
  linkPreviewId?: string | null;
  mentions?: Pick<CommunityMention, "entityType" | "entityId">[];
  area: CommunityArea;
  title: string;
  summary: string;
  content: string;
  targetRoles: CommunityTargetRole[];
  authorCollaborationProfileId?: string | null;
  authorOrganizationId?: string | null;
};

export type CreateCommunityPostInput =
  | (CreateBase & {
      kind: "general";
      details: Extract<CommunityPostDetails, { generalType: string }>;
    })
  | (CreateBase & {
      kind: "question";
      details: Extract<CommunityPostDetails, { topic: string }>;
    })
  | (CreateBase & {
      kind: "request";
      details: RequestDetails;
    })
  | (CreateBase & {
      kind: "research";
      details: Extract<CommunityPostDetails, { researchType: ResearchType }>;
    })
  | (CreateBase & {
      kind: "update";
      details: Extract<CommunityPostDetails, { entityType: UpdateEntityType }>;
    })
  | (CreateBase & {
      kind: "resource";
      details: Extract<CommunityPostDetails, { resourceType: ResourceType }>;
    })
  | (CreateBase & {
      kind: "announcement";
      details: Extract<CommunityPostDetails, { priority: string }>;
    });

export type UpdateCommunityPostInput = CreateCommunityPostInput;

export interface CommunityPostsPage {
  posts: CommunityPost[];
  hasMore: boolean;
}

export interface CommunityPostsQuery {
  tag?: string;
  filter?: CommunityFeedFilter;
  sort?: CommunityFeedSort;
  limit?: number;
  offset?: number;
}

interface CommunityPostResponse {
  message?: string;
  post: CommunityPost;
}

interface CommunityCommentsResponse {
  comments: CommunityComment[];
}

interface CommunityCommentResponse {
  message?: string;
  comment: CommunityComment;
}

export async function getCommunityPosts(
  query: CommunityPostsQuery = {},
): Promise<CommunityPostsPage> {
  const params = new URLSearchParams();
  if (query.tag) params.set("tag", query.tag);
  if (query.filter) params.set("filter", query.filter);
  if (query.sort) params.set("sort", query.sort);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiGet<CommunityPostsPage>(`/community/posts${suffix}`);
}

export async function getCommunityPost(postId: string): Promise<CommunityPost> {
  const response = await apiGet<CommunityPostResponse>(
    `/community/posts/${postId}`,
  );
  return response.post;
}

let discoveryCache: { value: CommunityDiscovery; expiresAt: number } | null =
  null;
let discoveryInFlight: Promise<CommunityDiscovery> | null = null;

export async function getCommunityDiscovery(
  force = false,
): Promise<CommunityDiscovery> {
  const now = Date.now();
  if (!force && discoveryCache && discoveryCache.expiresAt > now) {
    return discoveryCache.value;
  }
  if (!force && discoveryInFlight) return discoveryInFlight;

  const request = apiGet<CommunityDiscovery>("/community/discovery")
    .then((value) => {
      discoveryCache = { value, expiresAt: Date.now() + 30_000 };
      return value;
    })
    .finally(() => {
      discoveryInFlight = null;
    });

  discoveryInFlight = request;
  return request;
}

export async function getCommunityHighlights(): Promise<CommunityHighlights> {
  return apiGet<CommunityHighlights>("/community/highlights");
}

export async function getCommunityUserProfile(
  userId: string,
): Promise<CommunityUserProfile> {
  const response = await apiGet<{ profile: CommunityUserProfile }>(
    `/community/users/${userId}/profile`,
  );
  return response.profile;
}

export async function getCommunityOrganizationProfile(
  organizationId: string,
): Promise<CommunityOrganizationProfile> {
  const response = await apiGet<{ profile: CommunityOrganizationProfile }>(
    `/community/organizations/${organizationId}/profile`,
  );
  return response.profile;
}

export async function followCommunityUser(userId: string): Promise<void> {
  await apiRequest<void>(`/community/users/${userId}/follow`, {
    method: "PUT",
  });
}

export async function unfollowCommunityUser(userId: string): Promise<void> {
  await apiDelete<void>(`/community/users/${userId}/follow`);
}

export async function createCommunityPost(
  input: CreateCommunityPostInput,
): Promise<CommunityPost> {
  const response = await apiPost<CommunityPostResponse>(
    "/community/posts",
    input,
  );

  return response.post;
}

export async function updateCommunityPost(
  postId: string,
  input: UpdateCommunityPostInput,
): Promise<CommunityPost> {
  const response = await apiPatch<CommunityPostResponse>(
    `/community/posts/${postId}`,
    input,
  );

  return response.post;
}

export async function deleteCommunityPost(postId: string): Promise<void> {
  await apiDelete<void>(`/community/posts/${postId}`);
}

export async function archiveCommunityPost(
  postId: string,
): Promise<CommunityPost> {
  const response = await apiRequest<CommunityPostResponse>(
    `/community/posts/${postId}/archive`,
    { method: "POST" },
  );
  return response.post;
}

export async function restoreCommunityPost(
  postId: string,
): Promise<CommunityPost> {
  const response = await apiRequest<CommunityPostResponse>(
    `/community/posts/${postId}/restore`,
    { method: "POST" },
  );
  return response.post;
}

export async function boostCommunityPost(
  postId: string,
): Promise<CommunityPost> {
  const response = await apiRequest<CommunityPostResponse>(
    `/community/posts/${postId}/boost`,
    { method: "POST" },
  );
  return response.post;
}

async function putPostAction(endpoint: string): Promise<CommunityPost> {
  const response = await apiRequest<CommunityPostResponse>(endpoint, {
    method: "PUT",
  });

  return response.post;
}

export function likeCommunityPost(postId: string): Promise<CommunityPost> {
  return putPostAction(`/community/posts/${postId}/like`);
}

export async function unlikeCommunityPost(
  postId: string,
): Promise<CommunityPost> {
  const response = await apiDelete<CommunityPostResponse>(
    `/community/posts/${postId}/like`,
  );
  return response.post;
}

export function bookmarkCommunityPost(postId: string): Promise<CommunityPost> {
  return putPostAction(`/community/posts/${postId}/bookmark`);
}

export async function unbookmarkCommunityPost(
  postId: string,
): Promise<CommunityPost> {
  const response = await apiDelete<CommunityPostResponse>(
    `/community/posts/${postId}/bookmark`,
  );
  return response.post;
}

export async function getCommunityPostComments(
  postId: string,
): Promise<CommunityComment[]> {
  const response = await apiGet<CommunityCommentsResponse>(
    `/community/posts/${postId}/comments`,
  );
  return response.comments;
}

export async function createCommunityComment(
  postId: string,
  content: string,
  parentCommentId?: string | null,
): Promise<CommunityComment> {
  const response = await apiPost<CommunityCommentResponse>(
    `/community/posts/${postId}/comments`,
    {
      content,
      parentCommentId: parentCommentId ?? null,
    },
  );
  return response.comment;
}

export async function updateCommunityComment(
  commentId: string,
  content: string,
): Promise<CommunityComment> {
  const response = await apiPatch<CommunityCommentResponse>(
    `/community/comments/${commentId}`,
    { content },
  );
  return response.comment;
}

export async function deleteCommunityComment(commentId: string): Promise<void> {
  await apiDelete<void>(`/community/comments/${commentId}`);
}

interface CommunitySurveyResponse {
  survey: CommunitySurvey;
}

interface CommunitySurveyResultsResponse {
  results: CommunitySurveyResults;
}

export async function getCommunitySurvey(
  postId: string,
): Promise<CommunitySurvey> {
  const response = await apiGet<CommunitySurveyResponse>(
    `/community/posts/${postId}/survey`,
  );
  return response.survey;
}

export async function submitCommunitySurveyResponse(
  postId: string,
  answers: CommunitySurveyAnswerInput[],
): Promise<CommunitySurvey> {
  const response = await apiPost<CommunitySurveyResponse>(
    `/community/posts/${postId}/survey/responses`,
    { answers },
  );
  return response.survey;
}

export async function getCommunitySurveyResults(
  postId: string,
): Promise<CommunitySurveyResults> {
  const response = await apiGet<CommunitySurveyResultsResponse>(
    `/community/posts/${postId}/survey/results`,
  );
  return response.results;
}

export async function closeCommunitySurvey(
  postId: string,
): Promise<CommunitySurvey> {
  const response = await apiRequest<CommunitySurveyResponse>(
    `/community/posts/${postId}/survey/close`,
    { method: "POST" },
  );
  return response.survey;
}

export async function publishCommunitySurveyResults(
  postId: string,
): Promise<CommunityPost> {
  const response = await apiPost<CommunityPostResponse>(
    `/community/posts/${postId}/survey/publish-results`,
    {},
  );
  return response.post;
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

export type CommunityEventScope = "upcoming" | "past" | "mine";

export interface CommunityNotification {
  id: string;
  type: CommunityNotificationType;
  isRead: boolean;
  createdAt: string;
  actor: {
    userId: string | null;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  post: { id: string; title: string } | null;
  event: {
    id: string;
    title: string;
    status: CommunityEvent["status"];
  } | null;
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
  startsAt: string;
  endsAt: string | null;
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

export interface CreateCommunityEventInput {
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string | null;
  mode: CommunityEvent["mode"];
  location?: string | null;
  meetingUrl?: string | null;
  capacity?: number | null;
}

export async function getCommunityNotifications(): Promise<CommunityNotificationsPayload> {
  return apiGet<CommunityNotificationsPayload>("/community/notifications");
}

export async function markCommunityNotificationRead(
  notificationId: string,
): Promise<void> {
  await apiPatch<void>(`/community/notifications/${notificationId}/read`, {});
}

export async function markAllCommunityNotificationsRead(): Promise<void> {
  await apiPost<void>("/community/notifications/read-all", {});
}

export async function getNextCommunityEvent(): Promise<CommunityEvent | null> {
  const response = await apiGet<{ event: CommunityEvent | null }>(
    "/community/events/next",
  );
  return response.event;
}

export async function listCommunityEvents(
  scope: CommunityEventScope = "upcoming",
): Promise<CommunityEvent[]> {
  const response = await apiGet<{ events: CommunityEvent[] }>(
    `/community/events?scope=${encodeURIComponent(scope)}`,
  );
  return response.events;
}

export async function getCommunityEvent(
  eventId: string,
): Promise<CommunityEvent> {
  const response = await apiGet<{ event: CommunityEvent }>(
    `/community/events/${eventId}`,
  );
  return response.event;
}

export async function createCommunityEvent(
  input: CreateCommunityEventInput,
): Promise<CommunityEvent> {
  const response = await apiPost<{ event: CommunityEvent }>(
    "/community/events",
    input,
  );
  return response.event;
}

export async function updateCommunityEvent(
  eventId: string,
  input: CreateCommunityEventInput,
): Promise<CommunityEvent> {
  const response = await apiPatch<{ event: CommunityEvent }>(
    `/community/events/${eventId}`,
    input,
  );
  return response.event;
}

export async function cancelCommunityEvent(
  eventId: string,
): Promise<CommunityEvent> {
  const response = await apiDelete<{ event: CommunityEvent }>(
    `/community/events/${eventId}`,
  );
  return response.event;
}

export async function joinCommunityEvent(
  eventId: string,
): Promise<CommunityEvent> {
  const response = await apiRequest<{ event: CommunityEvent }>(
    `/community/events/${eventId}/participation`,
    { method: "PUT" },
  );
  return response.event;
}

export async function leaveCommunityEvent(
  eventId: string,
): Promise<CommunityEvent> {
  const response = await apiDelete<{ event: CommunityEvent }>(
    `/community/events/${eventId}/participation`,
  );
  return response.event;
}

export function searchCommunityMentions(
  q: string,
): Promise<CommunityMention[]> {
  return apiGet(`/community/mentions?q=${encodeURIComponent(q)}`);
}
export function getCommunityLinkPreview(
  url: string,
): Promise<CommunityLinkPreview> {
  return apiPost("/community/link-preview", { url });
}
export function deleteCommunityMedia(id: string): Promise<void> {
  return apiDelete(`/community/media/${id}`);
}
export function getCommunityPublishingOrganizations(): Promise<
  Array<{ id: string; name: string }>
> {
  return apiGet("/community/publishing-organizations");
}

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

export async function searchCommunity(
  query: string,
  limit = 20,
): Promise<CommunitySearchPayload> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return apiGet<CommunitySearchPayload>(
    `/community/search?${params.toString()}`,
  );
}

export type CommunityReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "misinformation"
  | "privacy"
  | "scam"
  | "other";

export type CommunityReportTargetType = "post" | "comment" | "user";

export async function reportCommunityContent(input: {
  targetType: CommunityReportTargetType;
  targetId: string;
  reason: CommunityReportReason;
  details?: string;
}): Promise<void> {
  await apiPost("/community/reports", input);
}

export async function getCommunityBlockStatus(
  userId: string,
): Promise<{ blockedByMe: boolean; blocksMe: boolean }> {
  return apiGet(`/community/users/${userId}/block-status`);
}

export async function blockCommunityUser(userId: string): Promise<void> {
  await apiRequest(`/community/users/${userId}/block`, { method: "PUT" });
}

export async function unblockCommunityUser(userId: string): Promise<void> {
  await apiDelete(`/community/users/${userId}/block`);
}

export interface CommunityModerationReport {
  id: string;
  targetType: CommunityReportTargetType;
  targetId: string;
  reason: CommunityReportReason;
  details: string;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  createdAt: string;
  reporter: { id: string; displayName: string; username: string | null };
  target: {
    label: string;
    excerpt: string | null;
    authorUserId: string | null;
  };
}

export async function getCommunityModerationReports(
  status: "pending" | "reviewed" | "actioned" | "dismissed" | "all" = "pending",
): Promise<CommunityModerationReport[]> {
  const response = await apiGet<{ reports: CommunityModerationReport[] }>(
    `/community/moderation/reports?status=${status}`,
  );
  return response.reports;
}

export async function reviewCommunityReport(
  reportId: string,
  action: "review" | "dismiss" | "hide_content" | "restore_content",
  note = "",
): Promise<void> {
  await apiPatch(`/community/moderation/reports/${reportId}`, { action, note });
}
