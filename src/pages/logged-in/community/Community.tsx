import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiArchive,
  FiArrowRight,
  FiBell,
  FiBookmark,
  FiBox,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCode,
  FiCompass,
  FiFileText,
  FiFlag,
  FiFolder,
  FiGlobe,
  FiHeart,
  FiHelpCircle,
  FiHome,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiMessageCircle,
  FiPenTool,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";

import {
  useAuth,
  type CongProfile,
  type ProfileType,
} from "../../../contexts/auth-context";

import CommunityPostCard from "../../../components/community/CommunityPostCard";
import CommunityPostComposer from "../../../components/community/CommunityPostComposer";
import CommunityNotificationsPanel from "../../../components/community/CommunityNotificationsPanel";
import CommunityEventModal from "../../../components/community/CommunityEventModal";
import CommunitySearchPanel from "../../../components/community/CommunitySearchPanel";
import {
  followCommunityUser,
  getCommunityDiscovery,
  getCommunityHighlights,
  getCommunityPost,
  getCommunityPosts,
  getNextCommunityEvent,
  searchCommunity,
  type CommunityDiscovery,
  type CommunityHighlights,
  type CommunityEvent,
  type CommunityFeedFilter,
  type CommunityFeedSort,
  type CommunityNotificationsPayload,
  type CommunityPost,
  type CommunitySearchPayload,
  type CommunitySearchResult,
  type CommunityPostKind,
} from "../../../services/communityService";

import { buildDefaultAvatarUrl } from "../../../utils/avatar";

import mascot from "../../../assets/mascot/cong-happy.webp";
import logoCompact from "../../../assets/brand/logo-mark.webp";
import logoExtended from "../../../assets/brand/logo-wordmark-dark.webp";
import styles from "./Community.module.css";

type Tone = "blue" | "green" | "purple" | "yellow" | "pink" | "teal";
type NavigationItem = {
  label: string;
  icon: IconType;
  badge?: number;
  active?: boolean;
};

const mainNavigation: NavigationItem[] = [
  { label: "Comunidade", icon: FiHome, active: true },
  { label: "Explorar", icon: FiCompass },
  { label: "Projetos", icon: FiFolder },
  { label: "Módulos", icon: FiBox },
  { label: "Eventos", icon: FiCalendar },
];

const accountNavigation: NavigationItem[] = [
  { label: "Mensagens", icon: FiMessageCircle },
  { label: "Notificações", icon: FiBell },
  { label: "Meu perfil", icon: FiUser },
];

const feedFilters: readonly [CommunityFeedFilter, string][] = [
  ["all", "Para você"],
  ["following", "Seguindo"],
  ["projects", "Projetos"],
  ["opportunities", "Oportunidades"],
  ["discussions", "Discussões"],
];

const FEED_PAGE_SIZE = 8;

const feedSortLabels: Record<CommunityFeedSort, string> = {
  recommended: "Recomendado",
  recent: "Recentes",
  supported: "Mais apoiadas",
  discussed: "Mais comentadas",
};

const areaLabels: Record<CommunityPost["area"], string> = {
  desenvolvimento: "Desenvolvimento",
  design: "Design",
  pesquisa: "Pesquisa",
  documentacao: "Documentação",
  voluntariado: "Voluntariado",
  ongs: "ONGs",
};

const personalFeedFilters: readonly [CommunityFeedFilter, string][] = [
  ["mine", "Minhas publicações"],
  ["saved", "Itens salvos"],
  ["archived", "Arquivadas"],
];

function isCommunityFeedFilter(
  value: string | null,
): value is CommunityFeedFilter {
  return [
    "all",
    "following",
    "projects",
    "opportunities",
    "discussions",
    "mine",
    "saved",
    "archived",
  ].includes(value ?? "");
}

function isPersonalFeedFilter(
  value: string | null,
): value is "mine" | "saved" | "archived" {
  return value === "mine" || value === "saved" || value === "archived";
}

function getInitialFeedFilter(
  search: string,
  personalActivityPage: boolean,
): CommunityFeedFilter {
  const params = new URLSearchParams(search);

  if (personalActivityPage) {
    const view = params.get("view");
    return isPersonalFeedFilter(view) ? view : "mine";
  }

  const value = params.get("feed");
  return isCommunityFeedFilter(value) && !isPersonalFeedFilter(value)
    ? value
    : "all";
}

function sortFeedPosts(
  posts: CommunityPost[],
  sort: CommunityFeedSort,
): CommunityPost[] {
  if (sort === "recommended") return [...posts];

  return [...posts].sort((a, b) => {
    if (
      sort === "supported" &&
      a.engagement.likeCount !== b.engagement.likeCount
    ) {
      return b.engagement.likeCount - a.engagement.likeCount;
    }
    if (
      sort === "discussed" &&
      a.engagement.commentCount !== b.engagement.commentCount
    ) {
      return b.engagement.commentCount - a.engagement.commentCount;
    }
    const aRank = new Date(a.boostedAt ?? a.publishedAt).getTime();
    const bRank = new Date(b.boostedAt ?? b.publishedAt).getTime();
    return bRank - aRank;
  });
}

function postMatchesFeed(
  post: CommunityPost,
  filter: CommunityFeedFilter,
  tag: string,
): boolean {
  if (tag && !post.tags?.includes(tag)) return false;

  if (filter === "archived") return post.status === "archived";
  if (post.status !== "published") return false;

  if (filter === "following") return post.author.followedByMe;
  if (filter === "projects")
    return post.kind === "update" || post.kind === "resource";
  if (filter === "opportunities") return post.kind === "request";
  if (filter === "discussions")
    return post.kind === "question" || post.kind === "general";
  if (filter === "saved") return post.engagement.savedByMe;

  return true;
}

const composerKinds: ReadonlyArray<{
  kind: CommunityPostKind;
  label: string;
  icon: IconType;
}> = [
  { kind: "general", label: "Publicação", icon: FiMessageCircle },
  { kind: "question", label: "Pergunta", icon: FiHelpCircle },
  { kind: "request", label: "Solicitação", icon: FiHeart },
  { kind: "research", label: "Pesquisa", icon: FiSearch },
  { kind: "update", label: "Atualização", icon: FiActivity },
  { kind: "resource", label: "Recurso", icon: FiBox },
  { kind: "announcement", label: "Comunicado", icon: FiFlag },
];

const communityRoleLabels: Record<string, string> = {
  organization: "ONG",
  developer: "Desenvolvedor",
  designer: "Designer",
  translator: "Tradutor",
  volunteer: "Voluntário",
  supporter: "Apoiador",
};

const profileTypeLabels: Record<ProfileType, string> = {
  personal: "Pessoal",
  contributor: "Colaborador",
  donor: "Doador",
  volunteer: "Voluntário",
  organization: "ONG",
};

function formatName(value: string) {
  return value
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "CO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function getCommunityRoleLabel(value: string | null) {
  if (!value) return null;
  return communityRoleLabels[value] ?? formatName(value);
}

function getOpportunityPresentation(post: CommunityPost): {
  icon: IconType;
  tone: Tone;
  label: string;
  meta: string;
} {
  const details = post.details as {
    requestType?: string;
    engagementMode?: string;
    peopleNeeded?: number | null;
    deadline?: string | null;
  };

  const modeLabels: Record<string, string> = {
    remote: "Remoto",
    in_person: "Presencial",
    hybrid: "Híbrido",
    flexible: "Flexível",
  };

  const byType: Record<string, { icon: IconType; tone: Tone; label: string }> =
    {
      development: { icon: FiCode, tone: "green", label: "Desenvolvimento" },
      module: { icon: FiBox, tone: "green", label: "Novo módulo" },
      design: { icon: FiPenTool, tone: "purple", label: "Design" },
      translation: { icon: FiGlobe, tone: "teal", label: "Tradução" },
      marketing: { icon: FiActivity, tone: "yellow", label: "Comunicação" },
      research_support: { icon: FiSearch, tone: "purple", label: "Pesquisa" },
      documentation: { icon: FiFileText, tone: "blue", label: "Documentação" },
      volunteering: { icon: FiHeart, tone: "pink", label: "Voluntariado" },
      other: { icon: FiUsers, tone: "blue", label: "Colaboração" },
    };

  const presentation = byType[details.requestType ?? "other"] ?? byType.other;
  const meta = [
    details.engagementMode
      ? (modeLabels[details.engagementMode] ??
        formatName(details.engagementMode))
      : null,
    details.peopleNeeded
      ? `${details.peopleNeeded} ${details.peopleNeeded === 1 ? "pessoa" : "pessoas"}`
      : null,
    details.deadline
      ? `até ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${details.deadline}T12:00:00`))}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return { ...presentation, meta: meta || "Oportunidade aberta" };
}

function getProfileInitials(profile: CongProfile) {
  return getInitials(profile.displayName);
}

export default function LoggedCommunity() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPersonalActivityPage =
    location.pathname === "/app/comunidade/minha-atividade";
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const profileAreaRef = useRef<HTMLDivElement>(null);
  const opportunityRailRef = useRef<HTMLDivElement>(null);
  const notificationAreaRef = useRef<HTMLDivElement>(null);
  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const revealedPostIdRef = useRef<string | null>(null);
  const collaborationProfilesRefreshAttemptedRef = useRef(false);

  const {
    user,
    account,
    userData,
    profiles,
    activeProfile,
    profilesLoading,
    switchProfile,
    collaborationProfiles,
    activeCollaborationProfile,
    collaborationProfilesLoading,
    refreshCollaborationProfiles,
    activateCollaborationProfile,
    deactivateCollaborationProfile,
    logout,
  } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [switchingProfileId, setSwitchingProfileId] = useState<string | null>(
    null,
  );
  const [switchingCollaborationProfileId, setSwitchingCollaborationProfileId] =
    useState<string | null>(null);
  const feedFilter = useMemo(
    () => getInitialFeedFilter(location.search, isPersonalActivityPage),
    [isPersonalActivityPage, location.search],
  );
  const [feedSort, setFeedSort] = useState<CommunityFeedSort>("recommended");
  const feedTag = isPersonalActivityPage
    ? ""
    : (new URLSearchParams(location.search)
        .get("tag")
        ?.trim()
        .replace(/^#/, "")
        .toLowerCase()
        .slice(0, 80) ?? "");
  const activeFeedKey = `${feedFilter}:${feedSort}:${feedTag}`;
  const [composerKind, setComposerKind] = useState<CommunityPostKind | null>(
    null,
  );
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadedFeedKey, setLoadedFeedKey] = useState<string | null>(null);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [lastFeedSyncAt, setLastFeedSyncAt] = useState<Date | null>(null);
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPayload, setSearchPayload] =
    useState<CommunitySearchPayload | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [discovery, setDiscovery] = useState<CommunityDiscovery | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<CommunityHighlights | null>(
    null,
  );
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);
  const [followBusyUserId, setFollowBusyUserId] = useState<string | null>(null);
  const [notifications, setNotifications] =
    useState<CommunityNotificationsPayload>({
      unreadCount: 0,
      notifications: [],
    });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [nextEvent, setNextEvent] = useState<CommunityEvent | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<
    "create" | "view" | "list"
  >("view");

  const postsLoading = loadedFeedKey !== activeFeedKey;
  const requestedEventId = useMemo(
    () => new URLSearchParams(location.search).get("event"),
    [location.search],
  );
  const requestedEventList = requestedEventId === "list";
  const requestedEventOpen = Boolean(requestedEventId);
  const eventModalVisible = eventModalOpen || requestedEventOpen;
  const resolvedEventModalMode = requestedEventList
    ? "list"
    : requestedEventOpen
      ? "view"
      : eventModalMode;
  const requestedConcreteEventId = requestedEventList
    ? null
    : requestedEventId === "next"
      ? (nextEvent?.id ?? null)
      : requestedEventId;

  const userName =
    userData?.fullName ||
    user?.name ||
    (user?.email
      ? formatName(user.email.split("@")[0] ?? "Usuário")
      : "Usuário");

  const activeProfileName = activeProfile?.displayName ?? userName;
  const activeProfileType = activeProfile?.type ?? "personal";
  const activeProfileLabel = profileTypeLabels[activeProfileType];
  const activeProfileInitials = activeProfile
    ? getProfileInitials(activeProfile)
    : getInitials(userName);
  const accountAvatarUrl = account
    ? account.avatarPath || buildDefaultAvatarUrl(account)
    : null;
  const participationName =
    account?.displayName?.trim() || account?.name || userName;
  const participationRole = activeCollaborationProfile
    ? (communityRoleLabels[activeCollaborationProfile.role] ??
      formatName(activeCollaborationProfile.role))
    : "Sem função ativa";
  const participationInitials = getInitials(participationName);
  const participationProfileOptions = useMemo(() => {
    const profilesByRole = new Map(
      collaborationProfiles.map((profile) => [profile.role, profile] as const),
    );
    const roles = Array.from(
      new Set([
        ...(account?.onboardingRoles ?? []),
        ...collaborationProfiles.map((profile) => profile.role),
      ]),
    );

    return roles.map((role) => ({
      role,
      profile: profilesByRole.get(role) ?? null,
    }));
  }, [account?.onboardingRoles, collaborationProfiles]);

  useEffect(() => {
    if (
      collaborationProfilesRefreshAttemptedRef.current ||
      collaborationProfilesLoading ||
      collaborationProfiles.length ||
      !account?.onboardingRoles?.length
    ) {
      return;
    }

    collaborationProfilesRefreshAttemptedRef.current = true;
    void refreshCollaborationProfiles().catch((error) => {
      console.error(
        "Não foi possível atualizar os perfis de participação:",
        error,
      );
    });
  }, [
    account?.onboardingRoles,
    collaborationProfiles.length,
    collaborationProfilesLoading,
    refreshCollaborationProfiles,
  ]);

  useEffect(() => {
    if (!searchOpen) return;
    const query = searchQuery.trim();
    let cancelled = false;

    const timer = window.setTimeout(
      () => {
        if (query.length < 2) {
          setSearchPayload(null);
          setSearchLoading(false);
          setSearchError(null);
          return;
        }

        setSearchLoading(true);
        setSearchError(null);
        void searchCommunity(query)
          .then((payload) => {
            if (!cancelled) setSearchPayload(payload);
          })
          .catch((error) => {
            if (!cancelled) {
              setSearchPayload(null);
              setSearchError(
                error instanceof Error
                  ? error.message
                  : "Não foi possível pesquisar na comunidade.",
              );
            }
          })
          .finally(() => {
            if (!cancelled) setSearchLoading(false);
          });
      },
      query.length < 2 ? 0 : 260,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (
        searchFormRef.current &&
        !searchFormRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!feedNotice) return;
    const timer = window.setTimeout(() => setFeedNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [feedNotice]);

  useEffect(() => {
    if (isPersonalActivityPage) return;

    const legacyFilter = new URLSearchParams(location.search).get("feed");
    if (!isPersonalFeedFilter(legacyFilter)) return;

    navigate(`/app/comunidade/minha-atividade?view=${legacyFilter}`, {
      replace: true,
    });
  }, [isPersonalActivityPage, location.search, navigate]);

  const refreshDiscovery = useCallback(async () => {
    try {
      setDiscoveryLoading(true);
      setDiscoveryError(null);
      setDiscovery(await getCommunityDiscovery(true));
    } catch (error) {
      setDiscoveryError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a descoberta da comunidade.",
      );
    } finally {
      setDiscoveryLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getCommunityDiscovery()
      .then((payload) => {
        if (cancelled) return;
        setDiscovery(payload);
        setDiscoveryError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setDiscoveryError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a descoberta da comunidade.",
        );
      })
      .finally(() => {
        if (!cancelled) setDiscoveryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshHighlights = useCallback(async (silent = false) => {
    try {
      if (!silent) setHighlightsLoading(true);
      setHighlightsError(null);
      setHighlights(await getCommunityHighlights());
    } catch (error) {
      setHighlightsError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os destaques da comunidade.",
      );
    } finally {
      if (!silent) setHighlightsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getCommunityHighlights()
      .then((payload) => {
        if (cancelled) return;
        setHighlights(payload);
        setHighlightsError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setHighlightsError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os destaques da comunidade.",
        );
      })
      .finally(() => {
        if (!cancelled) setHighlightsLoading(false);
      });

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshHighlights(true);
    }, 90_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshHighlights]);

  // As notificações da barra superior pertencem ao LoggedInLayout.
  // Evitamos um segundo polling invisível dentro da página da Comunidade.

  const refreshNextEvent = useCallback(async () => {
    try {
      setNextEvent(await getNextCommunityEvent());
    } catch (error) {
      console.error("Não foi possível carregar o próximo evento:", error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getNextCommunityEvent()
      .then((event) => {
        if (!cancelled) setNextEvent(event);
      })
      .catch((error) => {
        console.error("Não foi possível carregar o próximo evento:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setProfileMenuOpen(false);
        setNotificationsOpen(false);
        setComposerKind(null);
      }
    };

    const handleOutsideClick = (event: PointerEvent) => {
      if (
        profileAreaRef.current &&
        !profileAreaRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
      if (
        notificationAreaRef.current &&
        !notificationAreaRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  const refreshFeed = useCallback(
    async (silent = false) => {
      if (silent) {
        setPostsRefreshing(true);
      } else {
        setLoadedFeedKey(null);
      }
      setPostsError(null);

      try {
        const page = await getCommunityPosts({
          tag: feedTag,
          filter: feedFilter,
          sort: feedSort,
          limit: FEED_PAGE_SIZE,
          offset: 0,
        });

        setPosts((current) => {
          if (!silent || current.length <= FEED_PAGE_SIZE) {
            return sortFeedPosts(page.posts, feedSort);
          }

          const firstPageIds = new Set(page.posts.map((post) => post.id));
          const olderLoaded = current
            .slice(FEED_PAGE_SIZE)
            .filter((post) => !firstPageIds.has(post.id));
          return sortFeedPosts([...page.posts, ...olderLoaded], feedSort);
        });
        setPostsHasMore(
          page.hasMore || (silent && posts.length > FEED_PAGE_SIZE),
        );
        setLastFeedSyncAt(new Date());
      } catch (error) {
        setPostsError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as publicações.",
        );
      } finally {
        if (silent) {
          setPostsRefreshing(false);
        } else {
          setLoadedFeedKey(activeFeedKey);
        }
      }
    },
    [activeFeedKey, feedFilter, feedSort, feedTag, posts.length],
  );

  const loadMorePosts = useCallback(async () => {
    if (postsLoadingMore || !postsHasMore) return;
    setPostsLoadingMore(true);
    setPostsError(null);

    try {
      const page = await getCommunityPosts({
        tag: feedTag,
        filter: feedFilter,
        sort: feedSort,
        limit: FEED_PAGE_SIZE,
        offset: posts.length,
      });
      setPosts((current) => {
        const ids = new Set(current.map((post) => post.id));
        const appended = page.posts.filter((post) => !ids.has(post.id));
        return sortFeedPosts([...current, ...appended], feedSort);
      });
      setPostsHasMore(page.hasMore);
      setLastFeedSyncAt(new Date());
    } catch (error) {
      setPostsError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar publicações mais antigas.",
      );
    } finally {
      setPostsLoadingMore(false);
    }
  }, [
    feedFilter,
    feedSort,
    feedTag,
    posts.length,
    postsHasMore,
    postsLoadingMore,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadFeed = async () => {
      try {
        const page = await getCommunityPosts({
          tag: feedTag,
          filter: feedFilter,
          sort: feedSort,
          limit: FEED_PAGE_SIZE,
          offset: 0,
        });

        if (cancelled) return;
        setPosts(sortFeedPosts(page.posts, feedSort));
        setPostsHasMore(page.hasMore);
        setPostsError(null);
        setLastFeedSyncAt(new Date());
      } catch (error) {
        if (cancelled) return;
        setPosts([]);
        setPostsHasMore(false);
        setPostsError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as publicações.",
        );
      } finally {
        if (!cancelled) setLoadedFeedKey(activeFeedKey);
      }
    };

    void loadFeed();
    return () => {
      cancelled = true;
    };
  }, [activeFeedKey, feedFilter, feedSort, feedTag]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshFeed(true);
      }
    }, 90_000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshFeed(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshFeed]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedComposer = params.get("compose");

    if (
      !requestedComposer ||
      !composerKinds.some((option) => option.kind === requestedComposer)
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setComposerKind(requestedComposer as CommunityPostKind);
      composerAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const nextParams = new URLSearchParams(location.search);
      nextParams.delete("compose");
      const search = nextParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : "",
        },
        { replace: true },
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (postsLoading) return;

    const sharedPostId = new URLSearchParams(location.search).get("post");
    if (!sharedPostId) {
      revealedPostIdRef.current = null;
      return;
    }
    if (revealedPostIdRef.current === sharedPostId) return;

    let cancelled = false;

    const revealPost = async () => {
      let targetExists = posts.some((post) => post.id === sharedPostId);
      if (!targetExists) {
        try {
          const sharedPost = await getCommunityPost(sharedPostId);
          if (cancelled) return;
          setPosts((current) =>
            sortFeedPosts(
              [
                sharedPost,
                ...current.filter((post) => post.id !== sharedPost.id),
              ],
              feedSort,
            ),
          );
          targetExists = true;
        } catch (error) {
          if (!cancelled) {
            setPostsError(
              error instanceof Error
                ? error.message
                : "Não foi possível abrir a publicação.",
            );
          }
        }
      }

      if (!targetExists || cancelled) return;
      revealedPostIdRef.current = sharedPostId;
      window.requestAnimationFrame(() => {
        document
          .getElementById(`community-post-${sharedPostId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    };

    void revealPost();
    return () => {
      cancelled = true;
    };
  }, [feedSort, location.search, posts, postsLoading]);

  const changeFeedFilter = useCallback(
    (nextFilter: CommunityFeedFilter) => {
      if (nextFilter === "all" && feedFilter !== "all") {
        setFeedSort("recommended");
      } else if (nextFilter !== "all" && feedSort === "recommended") {
        setFeedSort("recent");
      }

      const personalFilter = isPersonalFeedFilter(nextFilter);
      const targetPathname = personalFilter
        ? "/app/comunidade/minha-atividade"
        : "/app/comunidade";
      const params =
        targetPathname === location.pathname
          ? new URLSearchParams(location.search)
          : new URLSearchParams();

      if (personalFilter) {
        params.delete("feed");
        params.set("view", nextFilter);
      } else {
        params.delete("view");
        params.set("feed", nextFilter);
      }
      params.delete("post");
      params.delete("compose");
      const search = params.toString();

      navigate({
        pathname: targetPathname,
        search: search ? `?${search}` : "",
      });
    },
    [feedFilter, feedSort, location.pathname, location.search, navigate],
  );

  const closeEventModal = useCallback(() => {
    setEventModalOpen(false);

    if (!requestedEventId) return;
    const params = new URLSearchParams(location.search);
    params.delete("event");
    const search = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, requestedEventId]);

  const handleSearchSelect = (result: CommunitySearchResult) => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
    if (result.type === "user") {
      navigate(`/app/comunidade/perfil/user/${result.id}`);
      return;
    }
    if (result.type === "organization") {
      navigate(`/app/comunidade/perfil/organization/${result.id}`);
      return;
    }
    if (result.type === "event") {
      navigate(`/app/comunidade?event=${result.id}`);
      return;
    }
    navigate(`/app/comunidade?post=${result.id}`);
  };

  const navigateToPending = () => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    navigate("/em-construcao");
  };

  const handleSidebarNavigation = (label: string) => {
    setMobileMenuOpen(false);

    if (label === "Notificações") {
      setNotificationsOpen(true);
      return;
    }

    if (label === "Meu perfil" && account?.id) {
      navigate(`/app/comunidade/perfil/user/${account.id}`);
      return;
    }

    if (label === "Explorar") {
      navigate("/em-construcao?feature=explorar");
      return;
    }

    if (label === "Projetos") {
      changeFeedFilter("projects");
      return;
    }

    if (label === "Eventos") {
      setEventModalMode("list");
      setEventModalOpen(true);
      return;
    }

    if (label === "Comunidade") {
      navigate("/app/comunidade");
      return;
    }

    if (label === "Moderação") {
      navigate("/app/moderacao");
      return;
    }

    if (label === "Configurações") {
      navigate("/app/minha-conta?tab=access");
      return;
    }

    navigateToPending();
  };

  const openComposer = (kind: CommunityPostKind = "general") => {
    setComposerKind(kind);
    window.requestAnimationFrame(() => {
      composerAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handlePostCreated = (post: CommunityPost) => {
    if (!postMatchesFeed(post, feedFilter, feedTag)) {
      setComposerKind(null);
      if (post.kind === "update" || post.kind === "request")
        void refreshHighlights();
      return;
    }
    setPosts((current) =>
      sortFeedPosts(
        [post, ...current.filter((item) => item.id !== post.id)],
        feedSort,
      ),
    );
    setComposerKind(null);
    setLastFeedSyncAt(new Date());
    if (post.kind === "update" || post.kind === "request")
      void refreshHighlights();
  };

  const handlePostUpdated = (post: CommunityPost) => {
    setPosts((current) => {
      const shouldRemain = postMatchesFeed(post, feedFilter, feedTag);
      const next = shouldRemain
        ? current.some((item) => item.id === post.id)
          ? current.map((item) => (item.id === post.id ? post : item))
          : [post, ...current]
        : current.filter((item) => item.id !== post.id);
      return sortFeedPosts(next, feedSort);
    });
    setLastFeedSyncAt(new Date());
    if (post.kind === "update" || post.kind === "request")
      void refreshHighlights();
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((current) => current.filter((item) => item.id !== postId));
    void refreshHighlights();
  };

  const handleAuthorFollowChanged = (userId: string, followed: boolean) => {
    setPosts((current) => {
      const updated = current.map((post) =>
        post.author.userId === userId
          ? {
              ...post,
              author: { ...post.author, followedByMe: followed },
            }
          : post,
      );
      return feedFilter === "following" && !followed
        ? updated.filter((post) => post.author.userId !== userId)
        : updated;
    });

    if (followed) {
      setDiscovery((current) =>
        current
          ? {
              ...current,
              peopleToFollow: current.peopleToFollow.filter(
                (person) => person.userId !== userId,
              ),
            }
          : current,
      );
    } else {
      void refreshDiscovery();
    }
  };

  const handleAuthorBlocked = (userId: string) => {
    setPosts((current) =>
      current.filter((post) => post.author.userId !== userId),
    );
    setDiscovery((current) =>
      current
        ? {
            ...current,
            peopleToFollow: current.peopleToFollow.filter(
              (person) => person.userId !== userId,
            ),
          }
        : current,
    );
    void refreshHighlights();
    void refreshNextEvent();
  };

  const handleFollowSuggestion = async (userId: string) => {
    if (followBusyUserId) return;
    setFollowBusyUserId(userId);
    setDiscoveryError(null);

    try {
      await followCommunityUser(userId);
      handleAuthorFollowChanged(userId, true);
    } catch (error) {
      setDiscoveryError(
        error instanceof Error
          ? error.message
          : "Não foi possível seguir esta pessoa.",
      );
    } finally {
      setFollowBusyUserId(null);
    }
  };

  const handleProfileChange = async (profileId: string) => {
    if (profileId === activeProfile?.id || switchingProfileId) {
      setProfileMenuOpen(false);
      return;
    }

    setSwitchingProfileId(profileId);

    try {
      await switchProfile(profileId);
      setProfileMenuOpen(false);
    } catch (error) {
      console.error("Não foi possível trocar o perfil:", error);
    } finally {
      setSwitchingProfileId(null);
    }
  };

  const handleCollaborationProfileChange = async (profileId: string) => {
    if (
      profileId === activeCollaborationProfile?.id ||
      switchingCollaborationProfileId
    )
      return;

    setSwitchingCollaborationProfileId(profileId);
    try {
      await activateCollaborationProfile(profileId);
      setFeedNotice("Perfil de participação atualizado.");
    } catch (error) {
      console.error("Não foi possível trocar o perfil de participação:", error);
      setFeedNotice("Não foi possível trocar o perfil de participação.");
    } finally {
      setSwitchingCollaborationProfileId(null);
    }
  };

  const handlePersonalParticipation = async () => {
    if (!activeCollaborationProfile || switchingCollaborationProfileId) return;

    setSwitchingCollaborationProfileId("personal");
    try {
      await deactivateCollaborationProfile();
      setFeedNotice(
        "Perfil pessoal ativado. Nenhuma função de colaboração está ativa.",
      );
    } catch (error) {
      console.error("Não foi possível voltar ao perfil pessoal:", error);
      setFeedNotice("Não foi possível ativar o perfil pessoal.");
    } finally {
      setSwitchingCollaborationProfileId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Não foi possível encerrar a sessão:", error);
    }
  };

  const visibleFeedPosts = posts;

  const emptyFeedCopy = useMemo(() => {
    const map: Record<
      CommunityFeedFilter,
      {
        title: string;
        description: string;
        action: string;
        kind: CommunityPostKind;
      }
    > = {
      all: {
        title: "A comunidade está pronta para a primeira publicação.",
        description:
          "Compartilhe uma atualização, pergunta, recurso ou necessidade para começar a conversa.",
        action: "Criar publicação",
        kind: "general",
      },
      following: {
        title: "Nada novo de quem você segue.",
        description:
          "Siga pessoas na lateral da comunidade ou volte ao feed geral para descobrir novos autores.",
        action: "Ver feed geral",
        kind: "general",
      },
      projects: {
        title: "Ainda não há atualizações de projetos.",
        description:
          "Atualizações e recursos ligados a projetos aparecem aqui assim que forem publicados.",
        action: "Publicar atualização",
        kind: "update",
      },
      opportunities: {
        title: "Nenhuma oportunidade aberta por enquanto.",
        description:
          "Solicitações por apoio, voluntariado e colaboração aparecem nesta aba.",
        action: "Criar solicitação",
        kind: "request",
      },
      discussions: {
        title: "Nenhuma discussão aberta neste momento.",
        description:
          "Faça uma pergunta ou compartilhe uma ideia para iniciar uma conversa.",
        action: "Fazer pergunta",
        kind: "question",
      },
      mine: {
        title: "Você ainda não publicou nada.",
        description:
          "Suas publicações aparecem aqui para facilitar edição, acompanhamento e organização.",
        action: "Criar publicação",
        kind: "general",
      },
      saved: {
        title: "Nenhuma publicação salva.",
        description:
          "Use Salvar nos posts que você quer encontrar rapidamente depois.",
        action: "Explorar comunidade",
        kind: "general",
      },
      archived: {
        title: "Nenhuma publicação arquivada.",
        description:
          "Quando você arquivar um post, ele sai do feed público sem ser excluído e fica guardado aqui.",
        action: "Ver minhas publicações",
        kind: "general",
      },
    };
    return map[feedFilter];
  }, [feedFilter]);

  const handleEmptyFeedAction = () => {
    if (feedFilter === "following" || feedFilter === "saved") {
      changeFeedFilter("all");
      return;
    }
    if (feedFilter === "archived") {
      changeFeedFilter("mine");
      return;
    }
    openComposer(emptyFeedCopy.kind);
  };

  const scrollOpportunities = (direction: "left" | "right") => {
    opportunityRailRef.current?.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });
  };

  const featuredProject = highlights?.featuredProject ?? null;
  const featuredDetails =
    featuredProject?.kind === "update"
      ? (featuredProject.details as Extract<
          CommunityPost["details"],
          { entityType: string }
        >)
      : null;
  const featuredAuthorName = featuredProject
    ? (featuredProject.author.organization?.name ??
      featuredProject.author.displayName)
    : null;
  const featuredProgress = Math.max(
    0,
    Math.min(100, featuredDetails?.progress ?? 0),
  );
  const featuredImage =
    featuredProject?.media?.find((item) =>
      item.mimeType.startsWith("image/"),
    ) ?? null;
  const featuredMilestoneCount = featuredDetails?.milestones?.length ?? 0;
  const featuredCompletedMilestones = Math.min(
    featuredMilestoneCount,
    featuredDetails?.completedMilestones ?? 0,
  );
  const featuredTags = Array.from(
    new Set(
      [
        ...(featuredProject?.tags ?? []),
        featuredProject ? areaLabels[featuredProject.area] : "",
        featuredDetails?.version ?? "",
      ].filter((tag): tag is string => Boolean(tag)),
    ),
  ).slice(0, 3);

  const renderNavigationItem = ({
    label,
    icon: Icon,
    badge,
    active,
  }: NavigationItem) => (
    <button
      key={label}
      type="button"
      className={`${styles.navigationItem} ${
        active ? styles.navigationItemActive : ""
      }`}
      onClick={() => handleSidebarNavigation(label)}
      title={sidebarCollapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
    >
      <span className={styles.navigationIcon}>
        <Icon aria-hidden="true" />
      </span>
      <span className={styles.navigationLabel}>{label}</span>
      {badge ? <b className={styles.navigationBadge}>{badge}</b> : null}
    </button>
  );

  return (
    <div
      className={`${styles.shell} ${
        sidebarCollapsed ? styles.shellCollapsed : ""
      }`}
    >
      <aside
        className={`${styles.sidebar} ${
          mobileMenuOpen ? styles.sidebarMobileOpen : ""
        }`}
        aria-label="Menu principal"
      >
        <div className={styles.sidebarHeader}>
          <button
            type="button"
            className={styles.brand}
            onClick={() => navigate("/app/comunidade")}
            aria-label="Ir para a Comunidade"
          >
            <img
              src={logoExtended}
              alt="CONG"
              className={styles.brandExtended}
            />
            <img
              src={logoCompact}
              alt=""
              aria-hidden="true"
              className={styles.brandCompact}
            />
          </button>

          <button
            type="button"
            className={styles.desktopCollapseButton}
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>

          <button
            type="button"
            className={styles.mobileCloseButton}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <FiX />
          </button>
        </div>

        <nav className={styles.sidebarNavigation}>
          <div className={styles.navigationGroup}>
            {mainNavigation.map(renderNavigationItem)}
            {discovery?.permissions.canModerate
              ? renderNavigationItem({ label: "Moderação", icon: FiShield })
              : null}
          </div>
          <div className={styles.navigationDivider} />
          <div className={styles.navigationGroup}>
            {accountNavigation.map((item) =>
              renderNavigationItem({
                ...item,
                badge:
                  item.label === "Notificações"
                    ? notifications.unreadCount
                    : item.badge,
              }),
            )}
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          {renderNavigationItem({ label: "Configurações", icon: FiSettings })}
          {renderNavigationItem({ label: "Ajuda", icon: FiHelpCircle })}
          <button
            type="button"
            className={`${styles.navigationItem} ${styles.logoutButton}`}
            onClick={handleLogout}
            title={sidebarCollapsed ? "Sair" : undefined}
          >
            <span className={styles.navigationIcon}>
              <FiLogOut aria-hidden="true" />
            </span>
            <span className={styles.navigationLabel}>Sair</span>
          </button>
        </div>
      </aside>

      {mobileMenuOpen ? (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fechar menu lateral"
        />
      ) : null}

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <FiMenu />
            </button>

            <form
              ref={searchFormRef}
              className={styles.search}
              onSubmit={(event) => {
                event.preventDefault();
                setSearchOpen(true);
              }}
            >
              <FiSearch aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Pesquisar projetos, pessoas e módulos"
                aria-label="Pesquisar na comunidade"
                aria-expanded={searchOpen}
              />
              <kbd>Ctrl K</kbd>
              {searchOpen ? (
                <CommunitySearchPanel
                  query={searchQuery}
                  payload={searchPayload}
                  loading={searchLoading}
                  error={searchError}
                  onSelect={handleSearchSelect}
                />
              ) : null}
            </form>
          </div>

          <div className={styles.topbarActions}>
            <button
              type="button"
              className={styles.topbarCreateButton}
              onClick={() => openComposer()}
            >
              <FiPlus />
              <span>Criar</span>
            </button>

            <div className={styles.notificationArea} ref={notificationAreaRef}>
              <button
                type="button"
                className={styles.topbarIconButton}
                onClick={() => setNotificationsOpen((current) => !current)}
                aria-label="Notificações"
                aria-expanded={notificationsOpen}
              >
                <FiBell />
                {notifications.unreadCount > 0 ? (
                  <span>{Math.min(99, notifications.unreadCount)}</span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <CommunityNotificationsPanel
                  payload={notifications}
                  onClose={() => setNotificationsOpen(false)}
                  onChanged={setNotifications}
                  onOpenPost={(postId) => {
                    setNotificationsOpen(false);
                    navigate(`/app/comunidade?post=${postId}`);
                  }}
                  onOpenEvent={(eventId) => {
                    setNotificationsOpen(false);
                    const params = new URLSearchParams(location.search);
                    params.set("event", eventId);
                    navigate({
                      pathname: location.pathname,
                      search: `?${params.toString()}`,
                    });
                  }}
                  onOpenModeration={() => {
                    setNotificationsOpen(false);
                    navigate("/app/moderacao");
                  }}
                />
              ) : null}
            </div>

            <button
              type="button"
              className={styles.topbarIconButton}
              onClick={navigateToPending}
              aria-label="Mensagens"
            >
              <FiMessageCircle />
            </button>

            <div className={styles.profileArea} ref={profileAreaRef}>
              <button
                type="button"
                className={styles.profileTrigger}
                onClick={() => setProfileMenuOpen((current) => !current)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <span className={styles.avatar}>
                  {accountAvatarUrl ? (
                    <img
                      className={styles.avatarImage}
                      src={accountAvatarUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    activeProfileInitials
                  )}
                </span>
                <span className={styles.profileTriggerText}>
                  <strong>{activeProfileName}</strong>
                  <small>{activeProfileLabel}</small>
                </span>
                <FiChevronDown aria-hidden="true" />
              </button>

              {profileMenuOpen ? (
                <div className={styles.profileDropdown} role="menu">
                  <div className={styles.dropdownHeader}>
                    <div>
                      <strong>Trocar perfil</strong>
                      <span>Escolha a conta ativa</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileMenuOpen(false)}
                      aria-label="Fechar seletor de perfil"
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className={styles.dropdownProfiles}>
                    {profilesLoading ? (
                      <span className={styles.dropdownLoading}>
                        Carregando perfis...
                      </span>
                    ) : (
                      profiles.map((profile: CongProfile) => (
                        <button
                          key={profile.id}
                          type="button"
                          className={`${styles.dropdownProfile} ${
                            profile.id === activeProfile?.id
                              ? styles.dropdownProfileActive
                              : ""
                          }`}
                          onClick={() => handleProfileChange(profile.id)}
                          disabled={switchingProfileId === profile.id}
                        >
                          <span className={styles.dropdownAvatar}>
                            {getProfileInitials(profile)}
                          </span>
                          <span className={styles.dropdownProfileText}>
                            <strong>{profile.displayName}</strong>
                            <small>{profileTypeLabels[profile.type]}</small>
                          </span>
                          {profile.id === activeProfile?.id ? (
                            <span className={styles.activeProfileMark}>
                              Ativo
                            </span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>

                  <div className={styles.dropdownAccountActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate("/app/minha-conta");
                      }}
                    >
                      <FiUser />
                      Minha conta
                    </button>
                    {account?.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate(`/app/comunidade/perfil/user/${account.id}`);
                        }}
                      >
                        <FiUsers />
                        Perfil na comunidade
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate("/app/comunidade/minha-atividade?view=mine");
                      }}
                    >
                      <FiFileText />
                      Minhas publicações
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate("/app/comunidade/minha-atividade?view=saved");
                      }}
                    >
                      <FiBookmark />
                      Itens salvos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate(
                          "/app/comunidade/minha-atividade?view=archived",
                        );
                      }}
                    >
                      <FiArchive />
                      Publicações arquivadas
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.dropdownAction}
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/app/minha-conta?tab=profiles");
                    }}
                  >
                    <FiPlus />
                    Adicionar perfil
                  </button>

                  <button
                    type="button"
                    className={styles.dropdownLogoutAction}
                    onClick={() => void handleLogout()}
                  >
                    <FiLogOut />
                    Sair
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className={styles.page}>
          <div
            className={`${styles.pageGrid} ${
              isPersonalActivityPage ? styles.pageGridSingle : ""
            }`}
          >
            <div className={styles.mainColumn}>
              <header className={styles.communityHeader}>
                <div>
                  <h1>
                    {isPersonalActivityPage ? "Minha atividade" : "Comunidade"}
                  </h1>
                  {isPersonalActivityPage ? (
                    <span className={styles.headerSubtitle}>
                      Organize suas publicações, itens salvos e arquivados.
                    </span>
                  ) : (
                    <span className={styles.onlineStatus}>
                      <i aria-hidden="true" />
                      {discoveryLoading
                        ? "Atualizando comunidade..."
                        : `${discovery?.stats.members ?? 0} membros na comunidade`}
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => openComposer()}>
                  <FiPlus />
                  Nova publicação
                </button>
              </header>

              {!isPersonalActivityPage ? (
                <>
                  <section className={styles.featuredProject}>
                    {highlightsLoading ? (
                      <div className={styles.highlightLoading}>
                        Carregando projeto em destaque...
                      </div>
                    ) : featuredProject && featuredDetails ? (
                      <>
                        <div className={styles.featureProjectCopy}>
                          <span className={styles.featureEyebrow}>
                            <FiZap /> Projeto em destaque
                          </span>
                          <button
                            type="button"
                            className={styles.featureOrganizationButton}
                            onClick={() =>
                              navigate(
                                featuredProject.author.organization
                                  ? `/app/comunidade/perfil/organization/${featuredProject.author.organization.id}`
                                  : `/app/comunidade/perfil/user/${featuredProject.author.userId}`,
                              )
                            }
                          >
                            <span>
                              {getInitials(featuredAuthorName ?? "CONG")}
                            </span>
                            <div>
                              <strong>{featuredAuthorName}</strong>
                              <small>
                                {featuredDetails.entityLabel || "Projeto"} ·
                                atualização real da comunidade
                              </small>
                            </div>
                          </button>
                          <h2>{featuredProject.title}</h2>
                          <p>
                            {featuredProject.summary || featuredProject.content}
                          </p>
                          {featuredTags.length ? (
                            <div className={styles.featureTags}>
                              {featuredTags.map((tag) => (
                                <span key={tag}>{tag}</span>
                              ))}
                            </div>
                          ) : null}
                          <div className={styles.featureProgress}>
                            <div>
                              <span>Progresso do projeto</span>
                              <strong>{featuredProgress}%</strong>
                            </div>
                            <i>
                              <b style={{ width: `${featuredProgress}%` }} />
                            </i>
                          </div>
                          <div className={styles.featureFooter}>
                            <div className={styles.featurePeople}>
                              <div className={styles.avatarStack}>
                                <span>
                                  {getInitials(featuredAuthorName ?? "CONG")}
                                </span>
                              </div>
                              <small>
                                {featuredProject.engagement.likeCount} apoios ·{" "}
                                {featuredProject.engagement.commentCount}{" "}
                                comentários
                              </small>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/app/comunidade?post=${featuredProject.id}`,
                                )
                              }
                            >
                              Ver projeto <FiArrowRight />
                            </button>
                          </div>
                        </div>

                        <div
                          className={styles.featureProjectVisual}
                          aria-label="Resumo visual com dados reais do projeto em destaque"
                        >
                          <div className={styles.featureProjectDesk}>
                            <article className={styles.featureProjectSheet}>
                              <header>
                                <div>
                                  <small>
                                    {featuredDetails.entityLabel || "Projeto"}
                                  </small>
                                  <strong>{featuredProject.title}</strong>
                                </div>
                                {featuredDetails.version ? (
                                  <span>{featuredDetails.version}</span>
                                ) : null}
                              </header>
                              {featuredImage ? (
                                <figure className={styles.featureSheetImage}>
                                  <img
                                    src={featuredImage.url}
                                    alt={
                                      featuredImage.name ||
                                      featuredProject.title
                                    }
                                    decoding="async"
                                  />
                                </figure>
                              ) : null}
                              <div className={styles.featureSheetProgress}>
                                <div>
                                  <span>Andamento</span>
                                  <strong>{featuredProgress}%</strong>
                                </div>
                                <i>
                                  <b
                                    style={{ width: `${featuredProgress}%` }}
                                  />
                                </i>
                              </div>
                              {featuredMilestoneCount ? (
                                <div className={styles.featureSheetMilestones}>
                                  {featuredDetails.milestones
                                    .slice(0, 4)
                                    .map((milestone, index) => (
                                      <span
                                        key={`${milestone}-${index}`}
                                        data-complete={
                                          index < featuredCompletedMilestones
                                        }
                                      >
                                        {index < featuredCompletedMilestones ? (
                                          <FiCheckCircle />
                                        ) : (
                                          <i aria-hidden="true" />
                                        )}
                                        <b>{milestone}</b>
                                      </span>
                                    ))}
                                  {featuredMilestoneCount > 4 ? (
                                    <small>
                                      + {featuredMilestoneCount - 4} etapa
                                      {featuredMilestoneCount - 4 === 1
                                        ? ""
                                        : "s"}
                                    </small>
                                  ) : null}
                                </div>
                              ) : (
                                <p className={styles.featureSheetExcerpt}>
                                  {featuredProject.content.slice(0, 220)}
                                  {featuredProject.content.length > 220
                                    ? "…"
                                    : ""}
                                </p>
                              )}
                              <footer>
                                <span>
                                  {featuredProject.engagement.likeCount} apoios
                                </span>
                                <span>
                                  {featuredProject.engagement.commentCount}{" "}
                                  comentários
                                </span>
                              </footer>
                            </article>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className={styles.featureEmpty}>
                        <div>
                          <span className={styles.featureEyebrow}>
                            <FiZap /> Projeto em destaque
                          </span>
                          <h2>
                            Ainda não há uma atualização de projeto para
                            destacar.
                          </h2>
                          <p>
                            Quando alguém publicar uma atualização do tipo
                            Projeto, esta área passa a usar os dados reais dessa
                            publicação.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openComposer("update")}
                        >
                          <FiPlus /> Publicar atualização de projeto
                        </button>
                      </div>
                    )}
                    {highlightsError ? (
                      <p className={styles.highlightError}>{highlightsError}</p>
                    ) : null}
                  </section>

                  <section className={styles.opportunitySection}>
                    <header className={styles.sectionHeader}>
                      <div>
                        <span>Oportunidades para você</span>
                        <small>
                          Solicitações abertas, priorizadas pelo seu perfil e
                          habilidades reais.
                        </small>
                      </div>
                      <div className={styles.railControls}>
                        <button
                          type="button"
                          onClick={() => scrollOpportunities("left")}
                          aria-label="Ver oportunidades anteriores"
                        >
                          <FiChevronLeft />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollOpportunities("right")}
                          aria-label="Ver próximas oportunidades"
                        >
                          <FiChevronRight />
                        </button>
                      </div>
                    </header>

                    <div
                      className={styles.opportunityRail}
                      ref={opportunityRailRef}
                    >
                      {highlightsLoading ? (
                        <div className={styles.opportunityEmpty}>
                          Buscando oportunidades compatíveis...
                        </div>
                      ) : null}
                      {!highlightsLoading && highlights?.opportunities.length
                        ? highlights.opportunities.map(
                            ({ post, matchLabels }) => {
                              const presentation =
                                getOpportunityPresentation(post);
                              const Icon = presentation.icon;
                              const details = post.details as {
                                skills?: string[];
                              };
                              const author =
                                post.author.organization?.name ??
                                post.author.displayName;
                              return (
                                <article
                                  key={post.id}
                                  className={styles.opportunityCard}
                                  data-tone={presentation.tone}
                                  data-request-type={
                                    (post.details as { requestType?: string })
                                      .requestType
                                  }
                                >
                                  <span
                                    className={styles.opportunityDecoration}
                                    aria-hidden="true"
                                  />
                                  <div className={styles.opportunityCardTop}>
                                    <span className={styles.opportunityIcon}>
                                      <Icon />
                                    </span>
                                    <div>
                                      <strong
                                        className={styles.opportunityType}
                                      >
                                        {presentation.label}
                                      </strong>
                                      <small>{author}</small>
                                    </div>
                                  </div>
                                  <h3>{post.title}</h3>
                                  <div className={styles.opportunitySkill}>
                                    {matchLabels[0] ??
                                      details.skills?.[0] ??
                                      areaLabels[post.area]}
                                  </div>
                                  {matchLabels.length > 1 ? (
                                    <div className={styles.matchTags}>
                                      {matchLabels.slice(1).map((label) => (
                                        <span key={label}>{label}</span>
                                      ))}
                                    </div>
                                  ) : null}
                                  <footer>
                                    <span>{presentation.meta}</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigate(
                                          `/app/comunidade?post=${post.id}`,
                                        )
                                      }
                                      aria-label={`Abrir ${post.title}`}
                                    >
                                      <FiArrowRight />
                                    </button>
                                  </footer>
                                </article>
                              );
                            },
                          )
                        : null}
                      {!highlightsLoading &&
                      !highlights?.opportunities.length ? (
                        <div className={styles.opportunityEmpty}>
                          <strong>
                            Nenhuma solicitação aberta no momento.
                          </strong>
                          <span>
                            Quando a comunidade publicar novas necessidades,
                            elas aparecerão aqui.
                          </span>
                          <button
                            type="button"
                            onClick={() => openComposer("request")}
                          >
                            Criar solicitação
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </>
              ) : null}

              <div ref={composerAnchorRef} className={styles.composerAnchor}>
                {composerKind ? (
                  <CommunityPostComposer
                    initialKind={composerKind}
                    onClose={() => setComposerKind(null)}
                    onCreated={handlePostCreated}
                  />
                ) : !isPersonalActivityPage ? (
                  <section
                    className={styles.communityComposerLauncher}
                    aria-label="Criar publicação"
                  >
                    <div className={styles.launcherTop}>
                      <span className={styles.composerAvatar}>
                        {accountAvatarUrl ? (
                          <img
                            className={styles.composerAvatarImage}
                            src={accountAvatarUrl}
                            alt=""
                          />
                        ) : (
                          activeProfileInitials
                        )}
                      </span>
                      <button
                        type="button"
                        className={styles.launcherInput}
                        onClick={() => openComposer("general")}
                      >
                        Compartilhe algo com a comunidade...
                      </button>
                    </div>

                    <div
                      className={styles.launcherKinds}
                      aria-label="Tipo de publicação"
                    >
                      {composerKinds.map(({ kind, label, icon: Icon }) => (
                        <button
                          key={kind}
                          type="button"
                          className={styles.launcherKind}
                          data-kind={kind}
                          onClick={() => openComposer(kind)}
                        >
                          <Icon aria-hidden="true" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <section className={styles.feedSection}>
                <div className={styles.feedToolbar}>
                  <div
                    className={styles.feedTabs}
                    aria-label="Filtrar publicações"
                  >
                    {feedTag ? (
                      <button
                        type="button"
                        className={styles.feedTabActive}
                        onClick={() => {
                          const params = new URLSearchParams(location.search);
                          params.delete("tag");
                          navigate({
                            pathname: location.pathname,
                            search: params.toString(),
                          });
                        }}
                        aria-label={`Remover filtro #${feedTag}`}
                      >
                        #{feedTag} ×
                      </button>
                    ) : null}
                    {(isPersonalActivityPage
                      ? personalFeedFilters
                      : feedFilters
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={
                          feedFilter === id ? styles.feedTabActive : ""
                        }
                        onClick={() => changeFeedFilter(id)}
                        aria-pressed={feedFilter === id}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className={styles.feedToolbarActions}>
                    <span
                      className={styles.liveStatus}
                      title="O feed verifica novidades automaticamente enquanto a página está ativa."
                    >
                      <i />
                      {postsRefreshing
                        ? "Atualizando..."
                        : lastFeedSyncAt
                          ? "Atualização automática"
                          : "Conectando..."}
                    </span>
                    <button
                      type="button"
                      className={`${styles.feedRefreshButton} ${postsRefreshing ? styles.feedRefreshButtonSpinning : ""}`}
                      onClick={() => void refreshFeed(true)}
                      disabled={postsRefreshing}
                      aria-label="Atualizar publicações agora"
                      title="Atualizar agora"
                    >
                      <FiRefreshCw />
                    </button>
                    <label className={styles.sortSelect}>
                      <span className={styles.srOnly}>Ordenar publicações</span>
                      <select
                        value={feedSort}
                        onChange={(event) =>
                          setFeedSort(event.target.value as CommunityFeedSort)
                        }
                      >
                        {Object.entries(feedSortLabels)
                          .filter(([value]) =>
                            feedFilter === "all"
                              ? true
                              : value !== "recommended",
                          )
                          .map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                      </select>
                      <FiChevronDown aria-hidden="true" />
                    </label>
                  </div>
                </div>

                {feedNotice ? (
                  <div className={styles.feedNotice} role="status">
                    <FiCheckCircle />
                    <span>{feedNotice}</span>
                    <button
                      type="button"
                      onClick={() => setFeedNotice(null)}
                      aria-label="Fechar aviso"
                    >
                      <FiX />
                    </button>
                  </div>
                ) : null}

                <div className={styles.feedList} aria-live="polite">
                  {postsLoading ? (
                    <div
                      className={styles.feedSkeleton}
                      aria-label="Carregando publicações"
                    >
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : null}

                  {!postsLoading && postsError && posts.length === 0 ? (
                    <article
                      className={styles.feedStateCard}
                      data-state="error"
                    >
                      <span className={styles.feedStateIcon}>
                        <FiActivity />
                      </span>
                      <div>
                        <strong>Não conseguimos atualizar o feed.</strong>
                        <p>{postsError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void refreshFeed(false)}
                      >
                        Tentar novamente
                      </button>
                    </article>
                  ) : null}

                  {!postsLoading &&
                  !postsError &&
                  visibleFeedPosts.length === 0 ? (
                    <article className={styles.feedStateCard}>
                      <span className={styles.feedStateIcon}>
                        {feedFilter === "archived" ? (
                          <FiArchive />
                        ) : feedFilter === "saved" ? (
                          <FiBookmark />
                        ) : (
                          <FiMessageCircle />
                        )}
                      </span>
                      <div>
                        <strong>{emptyFeedCopy.title}</strong>
                        <p>{emptyFeedCopy.description}</p>
                      </div>
                      <button type="button" onClick={handleEmptyFeedAction}>
                        {emptyFeedCopy.action}
                      </button>
                    </article>
                  ) : null}

                  {!postsLoading &&
                    visibleFeedPosts.map((post) => (
                      <CommunityPostCard
                        key={post.id}
                        post={post}
                        onUpdated={handlePostUpdated}
                        onDeleted={handlePostDeleted}
                        onRelatedPostCreated={handlePostCreated}
                        onAuthorFollowChanged={handleAuthorFollowChanged}
                        onAuthorBlocked={handleAuthorBlocked}
                        onNotice={setFeedNotice}
                      />
                    ))}

                  {postsError && posts.length > 0 ? (
                    <div className={styles.feedInlineNotice} role="status">
                      <span>{postsError}</span>
                      <button
                        type="button"
                        onClick={() => void refreshFeed(true)}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : null}

                  {!postsLoading && postsHasMore ? (
                    <button
                      type="button"
                      className={styles.loadMoreButton}
                      onClick={() => void loadMorePosts()}
                      disabled={postsLoadingMore}
                    >
                      {postsLoadingMore
                        ? "Carregando..."
                        : "Ver publicações mais antigas"}
                      {!postsLoadingMore ? <FiChevronDown /> : null}
                    </button>
                  ) : null}

                  {!postsLoading && posts.length > 0 && !postsHasMore ? (
                    <p className={styles.feedEndMessage}>
                      Você chegou ao fim das publicações carregadas.
                    </p>
                  ) : null}
                </div>
              </section>
            </div>

            {!isPersonalActivityPage ? (
              <aside className={styles.rightRail}>
                <section className={styles.personalizedPanel}>
                  <div className={styles.panelHeading}>
                    <span>Sua atividade</span>
                    <h2>Continue de onde parou</h2>
                    <p>
                      Publicações, itens salvos e arquivados ficam reunidos em
                      uma área própria.
                    </p>
                  </div>
                  <div className={styles.panelItems}>
                    <button
                      type="button"
                      onClick={() => changeFeedFilter("mine")}
                    >
                      <span>
                        <FiFileText />
                      </span>
                      <div>
                        <strong>Minhas publicações</strong>
                        <small>Editar e acompanhar o que você publicou</small>
                      </div>
                      <FiChevronRight />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeFeedFilter("saved")}
                    >
                      <span>
                        <FiBookmark />
                      </span>
                      <div>
                        <strong>Itens salvos</strong>
                        <small>Rever publicações guardadas para depois</small>
                      </div>
                      <FiChevronRight />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeFeedFilter("archived")}
                    >
                      <span>
                        <FiArchive />
                      </span>
                      <div>
                        <strong>Arquivadas</strong>
                        <small>
                          Restaurar ou revisar publicações retiradas
                        </small>
                      </div>
                      <FiChevronRight />
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.panelPrimaryAction}
                    onClick={() => changeFeedFilter("mine")}
                  >
                    Abrir minha atividade
                    <FiArrowRight />
                  </button>
                </section>

                <section className={styles.profileSwitchPanel}>
                  <header className={styles.discoveryPanelHeader}>
                    <div>
                      <small>Perfil ativo</small>
                      <h2>Como você está participando</h2>
                    </div>
                  </header>
                  <div className={styles.activeProfileSummary}>
                    {accountAvatarUrl ? (
                      <img
                        className={styles.activeProfileImage}
                        src={accountAvatarUrl}
                        alt=""
                      />
                    ) : (
                      <span className={styles.activeProfileAvatar}>
                        {participationInitials}
                      </span>
                    )}
                    <div>
                      <strong>{participationName}</strong>
                      <small>{participationRole}</small>
                    </div>
                    <FiCheckCircle />
                  </div>
                  <div className={styles.quickProfiles}>
                    <button
                      type="button"
                      className={styles.personalProfileOption}
                      data-active={!activeCollaborationProfile}
                      disabled={Boolean(switchingCollaborationProfileId)}
                      onClick={() => void handlePersonalParticipation()}
                    >
                      <span>{participationInitials}</span>
                      <div>
                        <strong>Pessoal</strong>
                        <small>
                          {!activeCollaborationProfile
                            ? "Ativo · sem função de colaboração"
                            : "Usar a CONG sem função ativa"}
                        </small>
                      </div>
                    </button>
                    {participationProfileOptions.map(({ role, profile }) => {
                      const roleLabel =
                        communityRoleLabels[role] ?? formatName(role);
                      const isActive =
                        profile?.id === activeCollaborationProfile?.id;
                      return (
                        <button
                          key={role}
                          type="button"
                          data-active={isActive}
                          disabled={Boolean(switchingCollaborationProfileId)}
                          onClick={() => {
                            if (profile) {
                              void handleCollaborationProfileChange(profile.id);
                              return;
                            }
                            navigate("/app/minha-conta?tab=profiles");
                          }}
                        >
                          <span>{getInitials(roleLabel)}</span>
                          <div>
                            <strong>{roleLabel}</strong>
                            <small>
                              {isActive
                                ? "Ativo"
                                : profile
                                  ? "Alternar para este perfil"
                                  : "Abrir configuração do perfil"}
                            </small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {collaborationProfilesLoading &&
                  !participationProfileOptions.length ? (
                    <p className={styles.profileSwitchHelp}>
                      Carregando seus perfis de participação...
                    </p>
                  ) : !collaborationProfilesLoading &&
                    !participationProfileOptions.length ? (
                    <p className={styles.profileSwitchHelp}>
                      Nenhuma função está configurada ainda. O perfil Pessoal
                      continua disponível normalmente.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className={styles.manageProfilesButton}
                    onClick={() => navigate("/app/minha-conta?tab=profiles")}
                  >
                    Gerenciar perfis <FiChevronRight />
                  </button>
                </section>

                <section className={styles.peoplePanel}>
                  <header className={styles.discoveryPanelHeader}>
                    <div>
                      <small>Descoberta</small>
                      <h2>Pessoas para seguir</h2>
                    </div>
                  </header>
                  {discovery?.peopleToFollow.length ? (
                    <div className={styles.peopleList}>
                      {discovery.peopleToFollow.map((person) => (
                        <div key={person.userId} className={styles.personRow}>
                          {person.avatarUrl ? (
                            <img
                              src={person.avatarUrl}
                              alt=""
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className={styles.personAvatar}>
                              {getInitials(person.displayName)}
                            </span>
                          )}
                          <button
                            type="button"
                            className={styles.personProfileLink}
                            onClick={() =>
                              navigate(
                                `/app/comunidade/perfil/user/${person.userId}`,
                              )
                            }
                          >
                            <span className={styles.personIdentity}>
                              <strong>{person.displayName}</strong>
                              <small>
                                {person.username
                                  ? `@${person.username}`
                                  : "Membro da comunidade"}
                                {person.collaborationRole
                                  ? ` · ${getCommunityRoleLabel(person.collaborationRole)}`
                                  : ""}
                              </small>
                              <span>
                                {person.postCount}{" "}
                                {person.postCount === 1
                                  ? "publicação"
                                  : "publicações"}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleFollowSuggestion(person.userId)
                            }
                            disabled={followBusyUserId === person.userId}
                          >
                            {followBusyUserId === person.userId
                              ? "..."
                              : "Seguir"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : !discoveryLoading ? (
                    <p className={styles.discoveryStatus}>
                      Nenhuma nova sugestão por enquanto.
                    </p>
                  ) : null}
                </section>

                <section className={styles.topicsPanel}>
                  <header className={styles.discoveryPanelHeader}>
                    <div>
                      <small>Últimos 30 dias</small>
                      <h2>Tópicos em alta</h2>
                    </div>
                  </header>
                  {discovery?.trendingTopics.length ? (
                    <div className={styles.topicList}>
                      {discovery.trendingTopics.map((topic) => (
                        <button
                          type="button"
                          key={topic.label}
                          className={styles.topicRow}
                          onClick={() =>
                            navigate(
                              `/app/comunidade?tag=${encodeURIComponent(topic.label.replace(/^#/, "").toLowerCase())}`,
                            )
                          }
                        >
                          <span>#</span>
                          <div>
                            <strong>{topic.label}</strong>
                            <small>
                              {topic.postCount}{" "}
                              {topic.postCount === 1
                                ? "publicação"
                                : "publicações"}
                            </small>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : !discoveryLoading ? (
                    <p className={styles.discoveryStatus}>
                      Os tópicos aparecem conforme a comunidade publica tags e
                      habilidades.
                    </p>
                  ) : null}
                  {discoveryError ? (
                    <p className={styles.discoveryError} role="status">
                      {discoveryError}
                    </p>
                  ) : null}
                </section>

                <section className={styles.eventPanel}>
                  {nextEvent ? (
                    <>
                      <header>
                        <div>
                          <small>Próximo evento</small>
                          <h2>{nextEvent.title}</h2>
                        </div>
                        <span className={styles.eventDate}>
                          <b>
                            {new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                            }).format(new Date(nextEvent.startsAt))}
                          </b>
                          {new Intl.DateTimeFormat("pt-BR", { month: "short" })
                            .format(new Date(nextEvent.startsAt))
                            .replace(".", "")
                            .toUpperCase()}
                        </span>
                      </header>
                      <div className={styles.eventMeta}>
                        <span>
                          <FiClock />{" "}
                          {new Intl.DateTimeFormat("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(nextEvent.startsAt))}
                        </span>
                        <span>
                          {nextEvent.mode === "online" ? (
                            <FiGlobe />
                          ) : (
                            <FiMapPin />
                          )}{" "}
                          {nextEvent.mode === "online"
                            ? "Online"
                            : nextEvent.mode === "hybrid"
                              ? "Híbrido"
                              : (nextEvent.location ?? "Presencial")}
                        </span>
                      </div>
                      <div className={styles.eventPeople}>
                        <div className={styles.eventParticipantCount}>
                          <FiUsers /> {nextEvent.participantCount}{" "}
                          {nextEvent.participantCount === 1
                            ? "participante"
                            : "participantes"}
                        </div>
                        <div className={styles.eventActions}>
                          <button
                            type="button"
                            onClick={() => {
                              setEventModalMode("create");
                              setEventModalOpen(true);
                            }}
                          >
                            Novo evento
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEventModalMode("view");
                              setEventModalOpen(true);
                            }}
                          >
                            Ver evento
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={styles.eventEmpty}>
                      <span>
                        <FiCalendar />
                      </span>
                      <div>
                        <small>Próximo evento</small>
                        <h2>Nenhum evento agendado</h2>
                        <p>
                          Crie um encontro real da comunidade para ele aparecer
                          aqui.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEventModalMode("create");
                          setEventModalOpen(true);
                        }}
                      >
                        <FiPlus /> Criar evento
                      </button>
                    </div>
                  )}
                </section>

                <section className={styles.mascotTip}>
                  <img
                    src={mascot}
                    alt="Mascote da CONG"
                    loading="lazy"
                    decoding="async"
                  />
                  <div>
                    <strong>Uma dica do CONG</strong>
                    <p>
                      Salve publicações importantes para encontrá-las depois sem
                      precisar procurar no feed.
                    </p>
                    <button
                      type="button"
                      onClick={() => changeFeedFilter("saved")}
                    >
                      Ver itens salvos
                    </button>
                  </div>
                </section>
              </aside>
            ) : null}
          </div>
        </main>
      </section>
      {eventModalVisible ? (
        <CommunityEventModal
          event={
            resolvedEventModalMode === "view" &&
            (!requestedConcreteEventId ||
              requestedConcreteEventId === nextEvent?.id)
              ? nextEvent
              : null
          }
          eventId={requestedConcreteEventId}
          mode={resolvedEventModalMode}
          onClose={closeEventModal}
          onChanged={(event) => {
            if (event.id === nextEvent?.id && event.status === "published") {
              setNextEvent(event);
            }
            void refreshNextEvent();
            setEventModalMode("view");
          }}
        />
      ) : null}
    </div>
  );
}
