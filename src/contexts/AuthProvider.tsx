import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  apiGet,
  apiPatch,
  apiPost,
  clearStoredAuthToken,
  getStoredAuthToken,
  storeAuthTokens,
} from "../services/api";

import {
  getMyAccount,
  removeMyAvatar,
  updateMyAccount,
  uploadMyAvatar,
  type UpdateAccountInput,
  type UserAccount,
} from "../services/accountService";

import {
  AuthContext,
  type AuthContextValue,
  type AuthSession,
  type AuthUser,
  type CongProfile,
  type CongUserData,
  type AuthenticationResult,
  type PostAuthRoute,
} from "./auth-context";

import {
  activateMyCollaborationProfile,
  createMyCollaborationProfile,
  deleteMyCollaborationProfile,
  getMyCollaborationProfiles,
  updateMyCollaborationProfile,
  type CollaborationProfile,
  type CollaborationProfileData,
  type CollaborationRole,
} from "../services/collaborationProfileService";

interface AuthProviderProps {
  children: ReactNode;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;

  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface MeResponse {
  user: AuthUser;
}

interface LegacySessionResponse {
  token?: string;
  user: AuthUser;
  userData: CongUserData | null;
  profiles: CongProfile[];
}

function getPostAuthDestination(
  profiles: CollaborationProfile[],
): PostAuthRoute {
  return profiles.length === 0 ? "/app/escolher-funcao" : "/app/comunidade";
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [account, setAccount] = useState<UserAccount | null>(null);

  const [collaborationProfiles, setCollaborationProfiles] = useState<
    CollaborationProfile[]
  >([]);

  const [collaborationProfilesLoading, setCollaborationProfilesLoading] =
    useState(false);

  const [userData, setUserData] = useState<CongUserData | null>(null);

  const [profiles, setProfiles] = useState<CongProfile[]>([]);

  const [loading, setLoading] = useState(() => Boolean(getStoredAuthToken()));

  const [accountLoading, setAccountLoading] = useState(false);

  const [profilesLoading, setProfilesLoading] = useState(false);

  const [error, setError] = useState("");

  const clearSessionState = useCallback(() => {
    setUser(null);
    setAccount(null);

    setUserData(null);
    setProfiles([]);
    setCollaborationProfiles([]);
    setCollaborationProfilesLoading(false);

    setAccountLoading(false);
    setProfilesLoading(false);
  }, []);

  const establishSession = useCallback(
    async (
      accessToken: string,
      refreshToken: string,
      remember = false,
    ): Promise<AuthenticationResult> => {
      setError("");
      setLoading(true);
      setAccountLoading(true);
      setCollaborationProfilesLoading(true);

      storeAuthTokens(accessToken, refreshToken, remember);

      try {
        const response = await apiGet<MeResponse>("/auth/me");

        const [currentAccount, currentCollaborationProfiles] =
          await Promise.all([getMyAccount(), getMyCollaborationProfiles()]);

        const authenticatedUser: AuthUser = {
          id: response.user.id,
          name: currentAccount.name,
          email: currentAccount.email,
        };

        setUser(authenticatedUser);
        setAccount(currentAccount);

        setCollaborationProfiles(currentCollaborationProfiles);

        /*
         * Estrutura antiga mantida temporariamente
         * enquanto a comunidade ainda depende dela.
         */
        setUserData(null);
        setProfiles([]);
        setProfilesLoading(false);

        const session: AuthSession = {
          token: accessToken,
          user: authenticatedUser,
          userData: null,
          profiles: [],
        };

        return {
          session,
          destination: getPostAuthDestination(currentCollaborationProfiles),
        };
      } catch (authenticationError) {
        clearStoredAuthToken();
        clearSessionState();

        throw authenticationError;
      } finally {
        setLoading(false);
        setAccountLoading(false);
        setCollaborationProfilesLoading(false);
      }
    },
    [clearSessionState],
  );

  const applySession = useCallback((session: Omit<AuthSession, "token">) => {
    setUser(session.user);
    setUserData(session.userData);
    setProfiles(session.profiles);
    setProfilesLoading(false);
    setError("");
  }, []);

  const refreshAccount = useCallback(async (): Promise<void> => {
    const token = getStoredAuthToken();

    if (!token) {
      setAccount(null);
      return;
    }

    setAccountLoading(true);

    try {
      const currentAccount = await getMyAccount();

      setAccount(currentAccount);

      setUser((currentUser) => {
        if (!currentUser) {
          return currentUser;
        }

        return {
          ...currentUser,
          name: currentAccount.name,
          email: currentAccount.email,
        };
      });
    } finally {
      setAccountLoading(false);
    }
  }, []);

  const refreshCollaborationProfiles = useCallback(async (): Promise<void> => {
    const token = getStoredAuthToken();

    if (!token) {
      setCollaborationProfiles([]);
      return;
    }

    setCollaborationProfilesLoading(true);

    try {
      const currentProfiles = await getMyCollaborationProfiles();

      setCollaborationProfiles(currentProfiles);
    } finally {
      setCollaborationProfilesLoading(false);
    }
  }, []);

  const activeCollaborationProfile = useMemo(() => {
    return collaborationProfiles.find((profile) => profile.isActive) ?? null;
  }, [collaborationProfiles]);

  const createCollaborationProfile = useCallback(
    async (
      role: CollaborationRole,
      profileData: CollaborationProfileData,
    ): Promise<CollaborationProfile> => {
      setCollaborationProfilesLoading(true);

      try {
        const profile = await createMyCollaborationProfile(role, profileData);

        setCollaborationProfiles((currentProfiles) => [
          ...currentProfiles.map((currentProfile) => ({
            ...currentProfile,
            isActive: false,
          })),
          profile,
        ]);

        return profile;
      } finally {
        setCollaborationProfilesLoading(false);
      }
    },
    [],
  );

  const updateCollaborationProfile = useCallback(
    async (
      profileId: string,
      profileData: CollaborationProfileData,
    ): Promise<CollaborationProfile> => {
      setCollaborationProfilesLoading(true);

      try {
        const profile = await updateMyCollaborationProfile(
          profileId,
          profileData,
        );

        setCollaborationProfiles((currentProfiles) =>
          currentProfiles.map((currentProfile) =>
            currentProfile.id === profile.id ? profile : currentProfile,
          ),
        );

        return profile;
      } finally {
        setCollaborationProfilesLoading(false);
      }
    },
    [],
  );

  const deleteCollaborationProfile = useCallback(
    async (profileId: string): Promise<void> => {
      setCollaborationProfilesLoading(true);

      try {
        await deleteMyCollaborationProfile(profileId);

        const profiles = await getMyCollaborationProfiles();

        setCollaborationProfiles(profiles);
      } finally {
        setCollaborationProfilesLoading(false);
      }
    },
    [],
  );

  const activateCollaborationProfile = useCallback(
    async (profileId: string): Promise<CollaborationProfile> => {
      setCollaborationProfilesLoading(true);

      try {
        const profile = await activateMyCollaborationProfile(profileId);

        setCollaborationProfiles((currentProfiles) =>
          currentProfiles.map((currentProfile) => ({
            ...currentProfile,
            isActive: currentProfile.id === profile.id,
          })),
        );

        return profile;
      } finally {
        setCollaborationProfilesLoading(false);
      }
    },
    [],
  );

  const updateAccount = useCallback(
    async (input: UpdateAccountInput): Promise<UserAccount> => {
      setError("");
      setAccountLoading(true);

      try {
        const updatedAccount = await updateMyAccount(input);

        setAccount(updatedAccount);

        setUser((currentUser) => {
          if (!currentUser) {
            return currentUser;
          }

          return {
            ...currentUser,
            name: updatedAccount.name,
            email: updatedAccount.email,
          };
        });

        return updatedAccount;
      } catch (accountError) {
        console.error("Erro ao atualizar conta:", accountError);

        setError("Não foi possível atualizar a conta.");

        throw accountError;
      } finally {
        setAccountLoading(false);
      }
    },
    [],
  );

  const uploadAvatar = useCallback(
    async (
      file: File,
      options?: {
        onProgress?: (progress: number) => void;

        signal?: AbortSignal;
      },
    ): Promise<void> => {
      setError("");

      try {
        await uploadMyAvatar(file, options);

        await refreshAccount();
      } catch (avatarError) {
        if (
          avatarError instanceof DOMException &&
          avatarError.name === "AbortError"
        ) {
          throw avatarError;
        }

        console.error("Erro ao atualizar avatar:", avatarError);

        throw avatarError;
      }
    },
    [refreshAccount],
  );

  const removeAvatar = useCallback(async (): Promise<void> => {
    setError("");

    try {
      await removeMyAvatar();

      await refreshAccount();
    } catch (avatarError) {
      console.error("Erro ao remover avatar:", avatarError);

      throw avatarError;
    }
  }, [refreshAccount]);

  const refreshSession = useCallback(async (): Promise<void> => {
    const token = getStoredAuthToken();

    if (!token) {
      clearSessionState();
      setLoading(false);
      return;
    }

    try {
      const response = await apiGet<MeResponse>("/auth/me");

      applySession({
        user: response.user,
        userData: null,
        profiles: [],
      });

      try {
        await refreshAccount();
      } catch (accountError) {
        console.error(
          "Sessão restaurada, mas não foi possível carregar a conta:",
          accountError,
        );

        setAccount(null);
      }

      try {
        await refreshCollaborationProfiles();
      } catch (profileError) {
        console.error(
          "Sessão restaurada, mas não foi possível carregar os perfis de colaboração:",
          profileError,
        );

        setCollaborationProfiles([]);
      }
    } catch (sessionError) {
      console.error("Erro ao restaurar sessão:", sessionError);

      clearStoredAuthToken();
      clearSessionState();
    } finally {
      setLoading(false);
    }
  }, [
    applySession,
    clearSessionState,
    refreshAccount,
    refreshCollaborationProfiles,
  ]);

  useEffect(() => {
    const token = getStoredAuthToken();

    if (!token) {
      return;
    }

    let cancelled = false;

    apiGet<MeResponse>("/auth/me")
      .then(async (response) => {
        if (cancelled) {
          return;
        }

        applySession({
          user: response.user,
          userData: null,
          profiles: [],
        });

        try {
          await refreshAccount();
        } catch (accountError) {
          if (cancelled) {
            return;
          }

          console.error(
            "Sessão restaurada, mas não foi possível carregar a conta:",
            accountError,
          );

          setAccount(null);
        }

        try {
          await refreshCollaborationProfiles();
        } catch (profileError) {
          if (cancelled) {
            return;
          }

          console.error(
            "Sessão restaurada, mas não foi possível carregar os perfis de colaboração:",
            profileError,
          );

          setCollaborationProfiles([]);
        }
      })
      .catch((sessionError) => {
        if (cancelled) {
          return;
        }

        console.error("Erro ao restaurar sessão:", sessionError);

        clearStoredAuthToken();
        clearSessionState();
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    applySession,
    clearSessionState,
    refreshAccount,
    refreshCollaborationProfiles,
  ]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      remember: boolean,
    ): Promise<AuthenticationResult> => {
      setError("");

      const response = await apiPost<LoginResponse>(
        "/auth/login",
        {
          email,
          password,
        },
        false,
      );

      return establishSession(
        response.accessToken,
        response.refreshToken,
        remember,
      );
    },
    [establishSession],
  );

  const signup = useCallback(async (): Promise<AuthSession> => {
    throw new Error("Signup is handled by the registration page.");
  }, []);

  const orderedProfiles = useMemo(() => {
    if (!userData || userData.profileIds.length === 0) {
      return profiles;
    }

    const profileOrder = new Map(
      userData.profileIds.map((profileId, index) => [profileId, index]),
    );

    return [...profiles].sort((firstProfile, secondProfile) => {
      const firstPosition =
        profileOrder.get(firstProfile.id) ?? Number.MAX_SAFE_INTEGER;

      const secondPosition =
        profileOrder.get(secondProfile.id) ?? Number.MAX_SAFE_INTEGER;

      return firstPosition - secondPosition;
    });
  }, [profiles, userData]);

  const activeProfile = useMemo(() => {
    if (orderedProfiles.length === 0) {
      return null;
    }

    if (!userData?.activeProfileId) {
      return orderedProfiles[0];
    }

    return (
      orderedProfiles.find(
        (profile) => profile.id === userData.activeProfileId,
      ) ?? orderedProfiles[0]
    );
  }, [orderedProfiles, userData]);

  const switchProfile = useCallback(
    async (profileId: string): Promise<void> => {
      if (!user) {
        throw new Error(
          "É necessário estar autenticado para trocar de perfil.",
        );
      }

      const selectedProfile = orderedProfiles.find(
        (profile) => profile.id === profileId,
      );

      if (!selectedProfile) {
        throw new Error("O perfil selecionado não pertence a esta conta.");
      }

      setError("");

      try {
        const response = await apiPatch<LegacySessionResponse>(
          "/profiles/active",
          {
            profileId,
          },
        );

        setUser(response.user);
        setUserData(response.userData);
        setProfiles(response.profiles);
      } catch (profileError) {
        console.error("Erro ao trocar perfil:", profileError);

        setError("Não foi possível trocar o perfil.");

        throw profileError;
      }
    },
    [orderedProfiles, user],
  );

  const logout = useCallback(async (): Promise<void> => {
    setError("");

    try {
      await apiPost<void>("/auth/logout");
    } catch (logoutError) {
      console.error("Erro ao encerrar sessão no servidor:", logoutError);
    } finally {
      clearStoredAuthToken();
      clearSessionState();
    }
  }, [clearSessionState]);

  const contextValue: AuthContextValue = {
    user,
    account,

    collaborationProfiles,
    activeCollaborationProfile,

    userData,
    profiles: orderedProfiles,
    activeProfile,

    loading,
    accountLoading,
    collaborationProfilesLoading,
    profilesLoading,

    error,

    login,
    establishSession,
    signup,

    refreshSession,
    refreshAccount,
    refreshCollaborationProfiles,

    updateAccount,
    uploadAvatar,
    removeAvatar,

    createCollaborationProfile,
    updateCollaborationProfile,
    deleteCollaborationProfile,
    activateCollaborationProfile,

    switchProfile,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
