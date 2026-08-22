import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export const collaborationRoles = [
  "organization",
  "developer",
  "designer",
  "translator",
  "volunteer",
  "supporter",
] as const;

export type CollaborationRole = (typeof collaborationRoles)[number];

/* ==================================================
   DADOS ESPECÍFICOS DOS PERFIS
   ================================================== */

export interface OrganizationProfileData {
  organizationName: string;
  causeAreas: string[];
  city?: string;
  state?: string;
}

export interface DeveloperProfileData {
  technologies: string[];
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  portfolioUrl?: string;
}

export interface DesignerProfileData {
  specialties: string[];
  tools: string[];
  portfolioUrl?: string;
}

export interface TranslatorProfileData {
  languages: string[];
  notes?: string;
}

export interface VolunteerProfileData {
  interestAreas: string[];
  availability?: string;
}

export interface SupporterProfileData {
  organizationName: string;
  supportAreas: string[];
  websiteUrl?: string;
}

export type CollaborationProfileData =
  | OrganizationProfileData
  | DeveloperProfileData
  | DesignerProfileData
  | TranslatorProfileData
  | VolunteerProfileData
  | SupporterProfileData;

/* ==================================================
   PERFIL
   ================================================== */

export interface CollaborationProfile {
  id: string;
  role: CollaborationRole;
  profileData: CollaborationProfileData;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CollaborationProfilesResponse {
  profiles: CollaborationProfile[];
}

interface CollaborationProfileResponse {
  profile: CollaborationProfile;
}

/* ==================================================
   READ
   ================================================== */

export async function getMyCollaborationProfiles(): Promise<
  CollaborationProfile[]
> {
  const response = await apiGet<CollaborationProfilesResponse>(
    "/account/me/collaboration-profiles",
  );

  return response.profiles;
}

/* ==================================================
   CREATE
   ================================================== */

export async function createMyCollaborationProfile(
  role: CollaborationRole,
  profileData: CollaborationProfileData,
): Promise<CollaborationProfile> {
  const response = await apiPost<CollaborationProfileResponse>(
    "/account/me/collaboration-profiles",
    {
      role,
      profileData,
    },
  );

  return response.profile;
}

/* ==================================================
   UPDATE
   ================================================== */

export async function updateMyCollaborationProfile(
  profileId: string,
  profileData: CollaborationProfileData,
): Promise<CollaborationProfile> {
  const response = await apiPatch<CollaborationProfileResponse>(
    `/account/me/collaboration-profiles/${profileId}`,
    {
      profileData,
    },
  );

  return response.profile;
}

/* ==================================================
   DELETE
   ================================================== */

export async function deleteMyCollaborationProfile(
  profileId: string,
): Promise<void> {
  await apiDelete<void>(`/account/me/collaboration-profiles/${profileId}`);
}

/* ==================================================
   ACTIVATE
   ================================================== */

export async function activateMyCollaborationProfile(
  profileId: string,
): Promise<CollaborationProfile> {
  const response = await apiPatch<CollaborationProfileResponse>(
    "/account/me/collaboration-profiles/active",
    {
      profileId,
    },
  );

  return response.profile;
}
