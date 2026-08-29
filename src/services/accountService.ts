import { apiDelete, apiGet, apiPatch, apiUpload } from "./api";

import type { CollaborationRole } from "./collaborationProfileService";

import type { OnboardingRepresentation } from "./onboardingService";

export type OnboardingStep = "identity" | "roles" | "profiles" | "completed";

export interface UserAccount {
  id: string;

  name: string;

  displayName: string | null;

  pronouns: string | null;

  username: string | null;

  bio: string | null;

  avatarPath: string | null;

  email: string;

  onboardingStep: OnboardingStep;

  onboardingRoles: CollaborationRole[];

  onboardingRepresentations: OnboardingRepresentation[];

  createdAt: string;

  updatedAt: string;
}

export interface UpdateAccountInput {
  name?: string;

  username?: string;

  bio?: string | null;
}

interface AccountResponse {
  user: UserAccount;
}

interface UpdateAccountResponse {
  message: string;

  user: UserAccount;
}

interface AvatarResponse {
  message: string;

  avatarPath: string | null;
}

export async function getMyAccount(): Promise<UserAccount> {
  const response = await apiGet<AccountResponse>("/account/me");

  return response.user;
}

export async function updateMyAccount(
  input: UpdateAccountInput,
): Promise<UserAccount> {
  const response = await apiPatch<UpdateAccountResponse>("/account/me", input);

  return response.user;
}

export interface UploadAvatarOptions {
  onProgress?: (progress: number) => void;

  signal?: AbortSignal;
}

export async function uploadMyAvatar(
  file: File,
  options: UploadAvatarOptions = {},
): Promise<string | null> {
  const response = await apiUpload<AvatarResponse>("/account/me/avatar", file, {
    fieldName: "avatar",

    onProgress: options.onProgress,

    signal: options.signal,
  });

  return response.avatarPath;
}

export async function removeMyAvatar(): Promise<void> {
  await apiDelete<AvatarResponse>("/account/me/avatar");
}

export interface UsernameAvailability {
  username: string;

  available: boolean;
}

export async function checkUsernameAvailability(
  username: string,
): Promise<UsernameAvailability> {
  return apiGet<UsernameAvailability>(
    `/account/me/username-availability?username=${encodeURIComponent(username)}`,
  );
}
