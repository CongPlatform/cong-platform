import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export const collaborationRoles = [
  "developer",
  "designer",
  "translator",
  "volunteer",
] as const;

export type CollaborationRole = (typeof collaborationRoles)[number];

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
  accessibilitySkills?: string[];
  notes?: string;
}

export interface VolunteerProfileData {
  /** Tarefas/formas concretas de ajudar. Mantém compatibilidade com o campo anterior. */
  interestAreas: string[];
  /** Resumo legível da disponibilidade. Mantém compatibilidade com dados já gravados. */
  availability?: string;
  /** Causas de interesse são separadas das tarefas. */
  causes?: string[];
  location?: {
    city?: string;
    state?: string;
    radiusKm?: number;
    remote: boolean;
  };
  availabilityDetails?: {
    days: string[];
    periods: string[];
    frequency?: "punctual" | "monthly" | "weekly" | "flexible";
  };
  opportunityPreference?: "recurring" | "punctual" | "both";
}

export type CollaborationProfileData =
  | DeveloperProfileData
  | DesignerProfileData
  | TranslatorProfileData
  | VolunteerProfileData;

export interface CollaborationProfile {
  id: string;
  role: CollaborationRole;
  profileData: CollaborationProfileData;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CollaborationProfilesResponse { profiles: CollaborationProfile[]; }
interface CollaborationProfileResponse { profile: CollaborationProfile; }

export async function getMyCollaborationProfiles(): Promise<CollaborationProfile[]> {
  const response = await apiGet<CollaborationProfilesResponse>("/account/me/collaboration-profiles");
  return response.profiles;
}

export async function createMyCollaborationProfile(
  role: CollaborationRole,
  profileData: CollaborationProfileData,
): Promise<CollaborationProfile> {
  const response = await apiPost<CollaborationProfileResponse>(
    "/account/me/collaboration-profiles",
    { role, profileData },
  );
  return response.profile;
}

export async function updateMyCollaborationProfile(
  profileId: string,
  profileData: CollaborationProfileData,
): Promise<CollaborationProfile> {
  const response = await apiPatch<CollaborationProfileResponse>(
    `/account/me/collaboration-profiles/${profileId}`,
    { profileData },
  );
  return response.profile;
}

export async function deleteMyCollaborationProfile(profileId: string): Promise<void> {
  await apiDelete<void>(`/account/me/collaboration-profiles/${profileId}`);
}

export async function activateMyCollaborationProfile(profileId: string): Promise<CollaborationProfile> {
  const response = await apiPatch<CollaborationProfileResponse>(
    "/account/me/collaboration-profiles/active",
    { profileId },
  );
  return response.profile;
}
