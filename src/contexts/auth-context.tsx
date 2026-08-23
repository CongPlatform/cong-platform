import { createContext, useContext } from "react";

import type {
  CollaborationProfile,
  CollaborationProfileData,
  CollaborationRole,
} from "../services/collaborationProfileService";

import type {
  UpdateAccountInput,
  UserAccount,
} from "../services/accountService";

export type JourneyId = "skills" | "donations" | "volunteering" | "ngo";

export type ProfileType =
  | "personal"
  | "contributor"
  | "donor"
  | "volunteer"
  | "organization";

export type ProfileStatus = "active" | "inactive" | "pending";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface CongUserData {
  uid: string;
  fullName: string;
  username: string;
  email: string;

  journeys: JourneyId[];
  defaultExperience: JourneyId | null;

  profileIds: string[];
  activeProfileId: string | null;

  activeRole: string | null;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface CongProfile {
  id: string;

  ownerUid: string;
  type: ProfileType;

  displayName: string;
  username?: string;

  sourceJourney?: JourneyId;

  details: Record<string, unknown>;

  status: ProfileStatus;

  createdAt: string | null;
  updatedAt: string | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;

  /*
   * Ainda mantemos estes campos porque outras partes
   * antigas do frontend podem depender deles.
   *
   * O backend novo ainda não fornece userData/profiles.
   */
  userData: CongUserData | null;
  profiles: CongProfile[];
}

export type PostAuthRoute = "/app/escolher-funcao" | "/app/comunidade";

export interface AuthenticationResult {
  session: AuthSession;
  destination: PostAuthRoute;
}

export interface AuthContextValue {
  user: AuthUser | null;
  account: UserAccount | null;

  collaborationProfiles: CollaborationProfile[];
  activeCollaborationProfile: CollaborationProfile | null;
  collaborationProfilesLoading: boolean;

  refreshCollaborationProfiles: () => Promise<void>;

  createCollaborationProfile: (
    role: CollaborationRole,
    profileData: CollaborationProfileData,
  ) => Promise<CollaborationProfile>;

  updateCollaborationProfile: (
    profileId: string,
    profileData: CollaborationProfileData,
  ) => Promise<CollaborationProfile>;

  deleteCollaborationProfile: (profileId: string) => Promise<void>;

  activateCollaborationProfile: (
    profileId: string,
  ) => Promise<CollaborationProfile>;

  userData: CongUserData | null;
  profiles: CongProfile[];
  activeProfile: CongProfile | null;

  loading: boolean;
  accountLoading: boolean;
  profilesLoading: boolean;

  error: string;

  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<AuthenticationResult>;

  establishSession: (
    accessToken: string,
    refreshToken: string,
    remember?: boolean,
  ) => Promise<AuthenticationResult>;

  signup: (
    registrationData: unknown,
    remember?: boolean,
  ) => Promise<AuthSession>;

  refreshSession: () => Promise<void>;

  refreshAccount: () => Promise<void>;

  updateAccount: (input: UpdateAccountInput) => Promise<UserAccount>;

  uploadAvatar: (
    file: File,
    options?: {
      onProgress?: (progress: number) => void;

      signal?: AbortSignal;
    },
  ) => Promise<void>;

  removeAvatar: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;

  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser utilizado dentro de AuthProvider.");
  }

  return context;
}
