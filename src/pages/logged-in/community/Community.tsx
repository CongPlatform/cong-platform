import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiArrowRight,
  FiBell,
  FiBox,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiCode,
  FiCompass,
  FiFileText,
  FiFolder,
  FiGitBranch,
  FiGlobe,
  FiGrid,
  FiHeart,
  FiHelpCircle,
  FiHome,
  FiImage,
  FiLayers,
  FiLink,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiMessageCircle,
  FiPaperclip,
  FiPenTool,
  FiPlus,
  FiSearch,
  FiSettings,
  FiStar,
  FiTag,
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
import {
  getCommunityPosts,
  type CommunityPost,
} from "../../../services/communityService";

import mascot from "../../../assets/mascot/cong-happy.webp";
import logoCompact from "../../../assets/brand/logo-mark.webp";
import logoExtended from "../../../assets/brand/logo-wordmark-dark.webp";
import styles from "./Community.module.css";

type CommunityRole =
  | "organization"
  | "developer"
  | "designer"
  | "translator"
  | "volunteer"
  | "supporter";

type Tone = "blue" | "green" | "purple" | "yellow" | "pink" | "teal";
type FeedFilter =
  "all" | "following" | "projects" | "opportunities" | "discussions";

type NavigationItem = {
  label: string;
  icon: IconType;
  badge?: number;
  active?: boolean;
};

type RoleOption = {
  id: CommunityRole;
  label: string;
  icon: IconType;
  tone: Tone;
  helper: string;
};

type Opportunity = {
  organization: string;
  title: string;
  skill: string;
  meta: string;
  tone: Tone;
  icon: IconType;
};

type PersonalizedPanel = {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  items: Array<{ label: string; meta: string; icon: IconType }>;
};

const COMMUNITY_ROLE_STORAGE_KEY = "cong:selected-community-role";

const mainNavigation: NavigationItem[] = [
  { label: "Comunidade", icon: FiHome, active: true },
  { label: "Explorar", icon: FiCompass },
  { label: "Projetos", icon: FiFolder },
  { label: "Módulos", icon: FiBox },
  { label: "Eventos", icon: FiCalendar },
];

const accountNavigation: NavigationItem[] = [
  { label: "Mensagens", icon: FiMessageCircle, badge: 2 },
  { label: "Notificações", icon: FiBell, badge: 3 },
  { label: "Meu perfil", icon: FiUser },
];

const roles: RoleOption[] = [
  {
    id: "organization",
    label: "ONG",
    icon: FiGrid,
    tone: "blue",
    helper: "Necessidades e projetos sociais",
  },
  {
    id: "developer",
    label: "Desenvolvedor",
    icon: FiCode,
    tone: "green",
    helper: "Issues, módulos e código",
  },
  {
    id: "designer",
    label: "Designer",
    icon: FiPenTool,
    tone: "purple",
    helper: "Interfaces, fluxos e revisões",
  },
  {
    id: "translator",
    label: "Tradutor",
    icon: FiGlobe,
    tone: "teal",
    helper: "Conteúdo e internacionalização",
  },
  {
    id: "volunteer",
    label: "Voluntário",
    icon: FiHeart,
    tone: "pink",
    helper: "Ações e oportunidades abertas",
  },
  {
    id: "supporter",
    label: "Apoiador",
    icon: FiStar,
    tone: "yellow",
    helper: "Campanhas e projetos para apoiar",
  },
];

const feedFilters: readonly [FeedFilter, string][] = [
  ["all", "Para você"],
  ["following", "Seguindo"],
  ["projects", "Projetos"],
  ["opportunities", "Oportunidades"],
  ["discussions", "Discussões"],
];

const opportunities: Opportunity[] = [
  {
    organization: "ONG Horizonte",
    title: "Redesenhar o fluxo de cadastro de famílias",
    skill: "UX e pesquisa",
    meta: "Remoto · 3 semanas",
    tone: "purple",
    icon: FiPenTool,
  },
  {
    organization: "Rede Acolher",
    title: "Criar painel de acompanhamento de doações",
    skill: "React e Firebase",
    meta: "4 vagas · Remoto",
    tone: "green",
    icon: FiCode,
  },
  {
    organization: "Instituto Sementes",
    title: "Traduzir materiais de orientação para espanhol",
    skill: "Tradução",
    meta: "12 páginas · Flexível",
    tone: "teal",
    icon: FiGlobe,
  },
  {
    organization: "Projeto Viver",
    title: "Apoiar campanha de arrecadação de inverno",
    skill: "Comunicação",
    meta: "Presencial · Campinas",
    tone: "yellow",
    icon: FiHeart,
  },
];

const personalizedPanels: Record<CommunityRole, PersonalizedPanel> = {
  organization: {
    eyebrow: "Painel da ONG",
    title: "Acompanhe o que sua organização publicou",
    description: "Veja pessoas interessadas, respostas e próximos passos.",
    primaryLabel: "Ver solicitações",
    items: [
      {
        label: "3 pessoas interessadas",
        meta: "Comunicação digital",
        icon: FiUsers,
      },
      {
        label: "2 respostas novas",
        meta: "Painel de voluntários",
        icon: FiMessageCircle,
      },
      {
        label: "1 projeto em revisão",
        meta: "Gestão de doações",
        icon: FiGitBranch,
      },
    ],
  },
  developer: {
    eyebrow: "Para desenvolver",
    title: "Trabalho técnico que combina com você",
    description:
      "Issues abertas, módulos recentes e projetos procurando apoio.",
    primaryLabel: "Explorar issues",
    items: [
      {
        label: "Issue #42",
        meta: "Filtros do painel de doações",
        icon: FiCode,
      },
      { label: "Módulo em revisão", meta: "Agenda comunitária", icon: FiBox },
      {
        label: "Pull request recente",
        meta: "Correções de acessibilidade",
        icon: FiGitBranch,
      },
    ],
  },
  designer: {
    eyebrow: "Para criar",
    title: "Interfaces que precisam de direção visual",
    description:
      "Projetos com fluxos incompletos, pesquisas e pedidos de revisão.",
    primaryLabel: "Ver desafios de design",
    items: [
      {
        label: "Revisão de fluxo",
        meta: "Cadastro de beneficiários",
        icon: FiLayers,
      },
      {
        label: "Pesquisa aberta",
        meta: "Experiência de voluntários",
        icon: FiUsers,
      },
      {
        label: "UI kit colaborativo",
        meta: "12 componentes pendentes",
        icon: FiPenTool,
      },
    ],
  },
  translator: {
    eyebrow: "Para traduzir",
    title: "Conteúdo pronto para alcançar mais pessoas",
    description: "Materiais, telas e documentos esperando tradução e revisão.",
    primaryLabel: "Ver traduções",
    items: [
      { label: "18 strings novas", meta: "Módulo de eventos", icon: FiGlobe },
      {
        label: "Guia em revisão",
        meta: "Português → Espanhol",
        icon: FiFileText,
      },
      {
        label: "Glossário comunitário",
        meta: "6 termos pendentes",
        icon: FiTag,
      },
    ],
  },
  volunteer: {
    eyebrow: "Para participar",
    title: "Ações rápidas com impacto visível",
    description: "Oportunidades presenciais e remotas para contribuir agora.",
    primaryLabel: "Ver oportunidades",
    items: [
      {
        label: "Mutirão neste sábado",
        meta: "Campinas · 9h",
        icon: FiCalendar,
      },
      { label: "Apoio remoto", meta: "Comunicação e conteúdo", icon: FiGlobe },
      {
        label: "3 campanhas próximas",
        meta: "Até 10 km de você",
        icon: FiMapPin,
      },
    ],
  },
  supporter: {
    eyebrow: "Para apoiar",
    title: "Projetos que precisam ganhar fôlego",
    description:
      "Campanhas, ferramentas e iniciativas abertas a novos apoiadores.",
    primaryLabel: "Explorar campanhas",
    items: [
      {
        label: "78% financiado",
        meta: "Biblioteca comunitária",
        icon: FiActivity,
      },
      { label: "Meta até sexta", meta: "Campanha de inverno", icon: FiClock },
      {
        label: "Projeto transparente",
        meta: "Relatório mensal disponível",
        icon: FiFileText,
      },
    ],
  },
};

const profileTypeLabels: Record<ProfileType, string> = {
  personal: "Pessoal",
  contributor: "Colaborador",
  donor: "Doador",
  volunteer: "Voluntário",
  organization: "ONG",
};

function isCommunityRole(value: unknown): value is CommunityRole {
  return roles.some((role) => role.id === value);
}

function getInitialCommunityRole(locationState: unknown): CommunityRole {
  if (
    locationState &&
    typeof locationState === "object" &&
    "selectedCommunityRole" in locationState
  ) {
    const role = (locationState as { selectedCommunityRole?: unknown })
      .selectedCommunityRole;

    if (isCommunityRole(role)) return role;
  }

  const storedRole = sessionStorage.getItem(COMMUNITY_ROLE_STORAGE_KEY);
  return isCommunityRole(storedRole) ? storedRole : "organization";
}

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

function getProfileInitials(profile: CongProfile) {
  return getInitials(profile.displayName);
}

export default function LoggedCommunity() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileAreaRef = useRef<HTMLDivElement>(null);
  const opportunityRailRef = useRef<HTMLDivElement>(null);

  const {
    user,
    userData,
    profiles,
    activeProfile,
    profilesLoading,
    switchProfile,
    logout,
  } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [switchingProfileId, setSwitchingProfileId] = useState<string | null>(
    null,
  );
  const [selectedRole, setSelectedRole] = useState<CommunityRole>(() =>
    getInitialCommunityRole(location.state),
  );
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);

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

  const selectedRoleData = useMemo(
    () => roles.find((role) => role.id === selectedRole) ?? roles[0],
    [selectedRole],
  );

  const personalizedPanel = personalizedPanels[selectedRole];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setProfileMenuOpen(false);
        setCreateModalOpen(false);
      }
    };

    const handleOutsideClick = (event: PointerEvent) => {
      if (
        profileAreaRef.current &&
        !profileAreaRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = createModalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [createModalOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadCommunityFeed() {
      try {
        setPostsLoading(true);
        setPostsError(null);

        const communityPosts = await getCommunityPosts();

        if (!cancelled) {
          setPosts(communityPosts);
        }
      } catch (error) {
        if (!cancelled) {
          setPostsError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as publicações.",
          );
        }
      } finally {
        if (!cancelled) {
          setPostsLoading(false);
        }
      }
    }

    void loadCommunityFeed();

    return () => {
      cancelled = true;
    };
  }, []);

  const navigateToPending = () => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    navigate("/em-construcao");
  };

  const openCreateModal = () => {
    setCreateModalOpen(true);
  };

  const handlePostCreated = (post: CommunityPost) => {
    setPosts((current) => [post, ...current]);
    setCreateModalOpen(false);
  };

  const handleCommunityRoleChange = (role: CommunityRole) => {
    sessionStorage.setItem(COMMUNITY_ROLE_STORAGE_KEY, role);
    setSelectedRole(role);
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

  const handleLogout = async () => {
    try {
      await logout();
      sessionStorage.removeItem(COMMUNITY_ROLE_STORAGE_KEY);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Não foi possível encerrar a sessão:", error);
    }
  };

  const visibleFeedPosts = useMemo(() => {
    if (feedFilter === "opportunities") {
      return posts.filter((post) => post.kind === "request");
    }

    if (feedFilter === "discussions") {
      return posts.filter(
        (post) => post.kind === "question" || post.kind === "general",
      );
    }

    if (feedFilter === "projects") {
      return posts.filter(
        (post) => post.kind === "update" || post.kind === "resource",
      );
    }

    // "Seguindo" ainda depende do futuro sistema de follows. Enquanto isso,
    // preservamos o feed completo em vez de simular um filtro inexistente.
    return posts;
  }, [feedFilter, posts]);

  const scrollOpportunities = (direction: "left" | "right") => {
    opportunityRailRef.current?.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });
  };

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
      onClick={active ? () => setMobileMenuOpen(false) : navigateToPending}
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
          </div>
          <div className={styles.navigationDivider} />
          <div className={styles.navigationGroup}>
            {accountNavigation.map(renderNavigationItem)}
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
              className={styles.search}
              onSubmit={(event) => {
                event.preventDefault();
                navigateToPending();
              }}
            >
              <FiSearch aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Pesquisar projetos, pessoas e módulos"
                aria-label="Pesquisar na comunidade"
              />
              <kbd>Ctrl K</kbd>
            </form>
          </div>

          <div className={styles.topbarActions}>
            <button
              type="button"
              className={styles.topbarCreateButton}
              onClick={() => openCreateModal()}
            >
              <FiPlus />
              <span>Criar</span>
            </button>

            <button
              type="button"
              className={styles.topbarIconButton}
              onClick={navigateToPending}
              aria-label="Notificações"
            >
              <FiBell />
              <span>3</span>
            </button>

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
                <span className={styles.avatar}>{activeProfileInitials}</span>
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

                  <button
                    type="button"
                    className={styles.dropdownAction}
                    onClick={navigateToPending}
                  >
                    <FiPlus />
                    Adicionar perfil
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className={styles.page}>
          <div className={styles.pageGrid}>
            <div className={styles.mainColumn}>
              <header className={styles.communityHeader}>
                <div>
                  <h1>Comunidade</h1>
                  <span className={styles.onlineStatus}>
                    <i aria-hidden="true" />
                    42 pessoas colaborando agora
                  </span>
                </div>
                <button type="button" onClick={() => openCreateModal()}>
                  <FiPlus />
                  Nova publicação
                </button>
              </header>

              <section className={styles.featuredProject}>
                <span className={styles.featureTape} aria-hidden="true" />
                <div className={styles.featureProjectCopy}>
                  <span className={styles.featureEyebrow}>
                    <FiZap /> Projeto em destaque
                  </span>
                  <div className={styles.featureOrganization}>
                    <span>RA</span>
                    <div>
                      <strong>Rede Acolher</strong>
                      <small>Projeto aberto · atualizado hoje</small>
                    </div>
                  </div>
                  <h2>Painel único para acompanhar famílias atendidas</h2>
                  <p>
                    Uma ferramenta colaborativa para organizar cadastros,
                    atendimentos e encaminhamentos sem depender de várias
                    planilhas.
                  </p>
                  <div className={styles.featureTags}>
                    <span>React</span>
                    <span>Firebase</span>
                    <span>UX Research</span>
                  </div>
                  <div className={styles.featureProgress}>
                    <div>
                      <span>Progresso do projeto</span>
                      <strong>68%</strong>
                    </div>
                    <i>
                      <b />
                    </i>
                  </div>
                  <div className={styles.featureFooter}>
                    <div className={styles.avatarStack}>
                      <span>KM</span>
                      <span>AO</span>
                      <span>JS</span>
                      <span>+8</span>
                    </div>
                    <button type="button" onClick={navigateToPending}>
                      Ver projeto
                      <FiArrowRight />
                    </button>
                  </div>
                </div>

                <div
                  className={styles.featureProjectVisual}
                  aria-label="Prévia automática do projeto"
                >
                  <div className={styles.autoCoverLabel}>Capa automática</div>
                  <div className={styles.mockWindow}>
                    <div className={styles.mockWindowBar}>
                      <i />
                      <i />
                      <i />
                      <span>painel.redeacolher.org</span>
                    </div>
                    <div className={styles.mockWindowBody}>
                      <aside>
                        <b />
                        <span />
                        <span />
                        <span />
                        <span />
                      </aside>
                      <div className={styles.mockDashboard}>
                        <div className={styles.mockGreeting}>
                          <span />
                          <b />
                        </div>
                        <div className={styles.mockMetrics}>
                          <span />
                          <span />
                          <span />
                        </div>
                        <div className={styles.mockChart}>
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>
                        <div className={styles.mockRows}>
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.featureNote}>
                    <FiPaperclip />6 issues abertas
                  </div>
                </div>
              </section>

              <section className={styles.opportunitySection}>
                <header className={styles.sectionHeader}>
                  <div>
                    <span>Oportunidades para você</span>
                    <small>
                      Escolhidas a partir do seu perfil e das suas habilidades
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
                  {opportunities.map((opportunity, index) => {
                    const Icon = opportunity.icon;
                    return (
                      <article
                        key={opportunity.title}
                        className={styles.opportunityCard}
                        data-tone={opportunity.tone}
                      >
                        {index === 0 ? (
                          <FiPaperclip
                            className={styles.opportunityClip}
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className={styles.opportunityCardTop}>
                          <span className={styles.opportunityIcon}>
                            <Icon />
                          </span>
                          <small>{opportunity.organization}</small>
                        </div>
                        <h3>{opportunity.title}</h3>
                        <div className={styles.opportunitySkill}>
                          {opportunity.skill}
                        </div>
                        <footer>
                          <span>{opportunity.meta}</span>
                          <button
                            type="button"
                            onClick={navigateToPending}
                            aria-label="Abrir oportunidade"
                          >
                            <FiArrowRight />
                          </button>
                        </footer>
                      </article>
                    );
                  })}
                </div>
              </section>

              <button
                type="button"
                className={styles.compactComposer}
                onClick={() => openCreateModal()}
              >
                <span className={styles.composerAvatar}>
                  {activeProfileInitials}
                </span>
                <span className={styles.composerPrompt}>
                  <strong>Compartilhe algo com a comunidade</strong>
                  <small>
                    Atualização, necessidade, projeto, módulo ou discussão
                  </small>
                </span>
                <span className={styles.composerQuickActions}>
                  <i>
                    <FiImage />
                  </i>
                  <i>
                    <FiLink />
                  </i>
                  <b>
                    <FiPlus /> Criar
                  </b>
                </span>
              </button>

              <section className={styles.feedSection}>
                <div className={styles.feedToolbar}>
                  <div
                    className={styles.feedTabs}
                    aria-label="Filtrar publicações"
                  >
                    {feedFilters.map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={
                          feedFilter === id ? styles.feedTabActive : ""
                        }
                        onClick={() => setFeedFilter(id)}
                        aria-pressed={feedFilter === id}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={navigateToPending}
                  >
                    Recentes
                    <FiChevronDown />
                  </button>
                </div>

                <div className={styles.feedList}>
                  {postsLoading ? (
                    <article className={styles.post}>
                      <p aria-live="polite">Carregando publicações...</p>
                    </article>
                  ) : null}

                  {postsError ? (
                    <article className={styles.post}>
                      <p role="alert">{postsError}</p>
                    </article>
                  ) : null}

                  {!postsLoading && !postsError && visibleFeedPosts.length === 0 ? (
                    <article className={styles.post}>
                      <p>
                        {posts.length === 0
                          ? "Ainda não existem publicações na comunidade."
                          : "Nenhuma publicação corresponde a este filtro."}
                      </p>
                    </article>
                  ) : null}

                  {!postsLoading &&
                    !postsError &&
                    visibleFeedPosts.map((post) => (
                      <CommunityPostCard
                        key={post.id}
                        post={post}
                        onPendingAction={navigateToPending}
                      />
                    ))}
                </div>
              </section>
            </div>

            <aside className={styles.rightRail}>
              <section className={styles.rolePanel}>
                <header>
                  <div>
                    <small>Seu modo de participação</small>
                    <strong>{selectedRoleData.label}</strong>
                  </div>
                  <span data-tone={selectedRoleData.tone}>
                    <selectedRoleData.icon />
                  </span>
                </header>
                <div className={styles.roleSelector}>
                  {roles.map((role) => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        className={
                          selectedRole === role.id ? styles.roleSelected : ""
                        }
                        onClick={() => handleCommunityRoleChange(role.id)}
                        title={`${role.label}: ${role.helper}`}
                      >
                        <Icon />
                        <span>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className={styles.personalizedPanel}>
                <div className={styles.panelHeading}>
                  <span>{personalizedPanel.eyebrow}</span>
                  <h2>{personalizedPanel.title}</h2>
                  <p>{personalizedPanel.description}</p>
                </div>
                <div className={styles.panelItems}>
                  {personalizedPanel.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={navigateToPending}
                      >
                        <span>
                          <Icon />
                        </span>
                        <div>
                          <strong>{item.label}</strong>
                          <small>{item.meta}</small>
                        </div>
                        <FiChevronRight />
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={styles.panelPrimaryAction}
                  onClick={navigateToPending}
                >
                  {personalizedPanel.primaryLabel}
                  <FiArrowRight />
                </button>
              </section>

              <section className={styles.eventPanel}>
                <header>
                  <div>
                    <small>Próximo evento</small>
                    <h2>Oficina: projetos que começam pequenos</h2>
                  </div>
                  <span className={styles.eventDate}>
                    <b>24</b> MAI
                  </span>
                </header>
                <div className={styles.eventMeta}>
                  <span>
                    <FiClock /> 19:00
                  </span>
                  <span>
                    <FiGlobe /> Online
                  </span>
                </div>
                <div className={styles.eventPeople}>
                  <div className={styles.avatarStack}>
                    <span>KS</span>
                    <span>AP</span>
                    <span>MO</span>
                    <span>+37</span>
                  </div>
                  <button type="button" onClick={navigateToPending}>
                    Ver evento
                  </button>
                </div>
              </section>

              <section className={styles.mascotTip}>
                <img src={mascot} alt="Mascote da CONG" />
                <div>
                  <strong>Uma dica do CONG</strong>
                  <p>
                    Seguir projetos deixa o seu feed mais útil e menos genérico.
                  </p>
                  <button type="button" onClick={navigateToPending}>
                    Encontrar projetos
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </section>

      {createModalOpen ? (
        <CommunityPostComposer
          onClose={() => setCreateModalOpen(false)}
          onCreated={handlePostCreated}
        />
      ) : null}
    </div>
  );
}
