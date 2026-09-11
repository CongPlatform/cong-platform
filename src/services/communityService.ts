import { apiGet, apiPost } from "./api";

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

export type EngagementMode =
  | "remote"
  | "in_person"
  | "hybrid"
  | "flexible";

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

export type ResourceType =
  | "template"
  | "guide"
  | "document"
  | "toolkit"
  | "code"
  | "link"
  | "other";

export type UpdateEntityType =
  | "project"
  | "module"
  | "organization"
  | "other";

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
      estimatedMinutes?: number | null;
      deadline?: string | null;
      responseUrl?: string | null;
      criteria: string;
    }
  | {
      entityType: UpdateEntityType;
      entityLabel: string;
      version: string;
      progress?: number | null;
      referenceUrl?: string | null;
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

export interface CommunityPost {
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

type CreateBase = {
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

interface CommunityPostsResponse {
  posts: CommunityPost[];
}

interface CreateCommunityPostResponse {
  message: string;
  post: CommunityPost;
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const response = await apiGet<CommunityPostsResponse>("/community/posts");
  return response.posts;
}

export async function createCommunityPost(
  input: CreateCommunityPostInput,
): Promise<CommunityPost> {
  const response = await apiPost<CreateCommunityPostResponse>(
    "/community/posts",
    input,
  );

  return response.post;
}
