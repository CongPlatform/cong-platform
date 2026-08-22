import { apiDelete, apiGet, apiPatch, apiUpload } from "./api";

export interface UserAccount {
  id: string;
  name: string;
  username: string | null;
  bio: string | null;
  avatarPath: string | null;
  email: string;
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
  onProgress?: (
    progress: number,
  ) => void;

  signal?: AbortSignal;
}

export async function uploadMyAvatar(
  file: File,
  options: UploadAvatarOptions = {},
): Promise<string | null> {
  const response =
    await apiUpload<AvatarResponse>(
      "/account/me/avatar",
      file,
      {
        fieldName: "avatar",
        onProgress:
          options.onProgress,
        signal:
          options.signal,
      },
    );

  return response.avatarPath;
}
export async function removeMyAvatar(): Promise<void> {
  await apiDelete<AvatarResponse>("/account/me/avatar");
}
