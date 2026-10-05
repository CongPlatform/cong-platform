import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  FiArchive,
  FiBell,
  FiBookmark,
  FiBox,
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCompass,
  FiDroplet,
  FiFileText,
  FiFolder,
  FiGlobe,
  FiHelpCircle,
  FiHome,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiPlus,
  FiPenTool,
  FiSearch,
  FiSettings,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import CommunityNotificationsPanel from "../components/community/CommunityNotificationsPanel";
import CommunitySearchPanel from "../components/community/CommunitySearchPanel";
import WorkspaceSelector from "../components/workspace/WorkspaceSelector";
import {
  getCommunityDiscovery,
  getCommunityNotifications,
  searchCommunity,
  type CommunityNotificationsPayload,
  type CommunitySearchPayload,
  type CommunitySearchResult,
} from "../services/communityService";

import logoCompact from "../assets/brand/logo-mark.webp";
import logoExtended from "../assets/brand/logo-wordmark-dark.webp";

import { useAuth } from "../contexts/auth-context";
import { useWorkspace } from "../contexts/workspace-context";

import { buildDefaultAvatarUrl } from "../utils/avatar";

import styles from "./LoggedInLayout.module.css";

type NavItem = {
  label: string;
  icon: typeof FiHome;
  to: string;
  badge?: number;
  action?: "notifications";
};

const COMMUNITY_ITEM: NavItem = {
  label: "Comunidade",
  icon: FiHome,
  to: "/app/comunidade",
};


function NavEntry({
  item,
  collapsed,
  onNavigate,
  onNotifications,
  notificationCount,
  activeOverride,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate: () => void;
  onNotifications: () => void;
  notificationCount: number;
  activeOverride?: boolean;
}) {
  const Icon = item.icon;
  const badge =
    item.action === "notifications" ? notificationCount : item.badge;

  if (item.action === "notifications") {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate();
          onNotifications();
        }}
        title={collapsed ? item.label : undefined}
        className={styles.navigationItem}
      >
        <span className={styles.navigationIcon}>
          <Icon aria-hidden="true" />
        </span>
        <span className={styles.navigationLabel}>{item.label}</span>
        {badge ? (
          <b className={styles.navigationBadge}>{Math.min(99, badge)}</b>
        ) : null}
      </button>
    );
  }

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => {
        const active =
          activeOverride ?? (isActive && item.to !== "/em-construcao");
        return `${styles.navigationItem} ${active ? styles.navigationItemActive : ""}`;
      }}
    >
      <span className={styles.navigationIcon}>
        <Icon aria-hidden="true" />
      </span>
      <span className={styles.navigationLabel}>{item.label}</span>
      {badge ? <b className={styles.navigationBadge}>{badge}</b> : null}
    </NavLink>
  );
}

function TopbarAction({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.topbarIconButton}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export default function LoggedInLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const { account, logout } = useAuth();
  const { workspace } = useWorkspace();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<CommunityNotificationsPayload>({
      unreadCount: 0,
      notifications: [],
    });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPayload, setSearchPayload] =
    useState<CommunitySearchPayload | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [canModerateCommunity, setCanModerateCommunity] = useState(false);
  const profileAreaRef = useRef<HTMLDivElement>(null);
  const notificationAreaRef = useRef<HTMLDivElement>(null);
  const searchAreaRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const displayName = account?.displayName || account?.name || "Minha conta";

  const avatarUrl = account
    ? account.avatarPath || buildDefaultAvatarUrl(account)
    : undefined;
  const username = account?.username
    ? `@${account.username}`
    : (account?.authentication.email ?? "Minha conta");

  const mainNavigation: NavItem[] = (() => {
    if (workspace.kind === "organization") {
      if (workspace.organization.organizationType === "ngo") {
        return [
          COMMUNITY_ITEM,
          { label: "Sites", icon: FiGlobe, to: "/app/site-institucional" },
          { label: "Projetos", icon: FiFolder, to: "/em-construcao?feature=projetos" },
          { label: "Módulos", icon: FiBox, to: "/em-construcao?feature=modulos" },
          { label: "Eventos", icon: FiCalendar, to: "/em-construcao?feature=eventos" },
        ];
      }

      return [
        COMMUNITY_ITEM,
        { label: "Projetos", icon: FiFolder, to: "/em-construcao?feature=projetos" },
      ];
    }

    if (workspace.kind === "collaboration") {
      if (workspace.profile.role === "designer") {
        return [
          COMMUNITY_ITEM,
          { label: "Explorar", icon: FiCompass, to: "/em-construcao?feature=explorar" },
          { label: "Templates", icon: FiLayers, to: "/app/design/templates" },
          { label: "Variações", icon: FiPenTool, to: "/app/design/variantes" },
          { label: "Recursos visuais", icon: FiDroplet, to: "/app/design/recursos" },
        ];
      }

      return [
        COMMUNITY_ITEM,
        { label: "Explorar", icon: FiCompass, to: "/em-construcao?feature=explorar" },
        { label: "Projetos", icon: FiFolder, to: "/em-construcao?feature=projetos" },
        { label: "Eventos", icon: FiCalendar, to: "/em-construcao?feature=eventos" },
      ];
    }

    return [
      COMMUNITY_ITEM,
      { label: "Explorar", icon: FiCompass, to: "/em-construcao?feature=explorar" },
    ];
  })();

  useEffect(() => {
    let cancelled = false;
    void getCommunityDiscovery()
      .then((payload) => {
        if (!cancelled)
          setCanModerateCommunity(payload.permissions.canModerate);
      })
      .catch(() => {
        if (!cancelled) setCanModerateCommunity(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshNotifications = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const payload = await getCommunityNotifications();
        if (!cancelled) setNotifications(payload);
      } catch (error) {
        console.error("Não foi possível atualizar as notificações:", error);
      }
    };

    void refreshNotifications();
    const timer = window.setInterval(() => void refreshNotifications(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
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
    document.addEventListener("pointerdown", closeMenus);
    return () => document.removeEventListener("pointerdown", closeMenus);
  }, []);

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
    const handlePointerDown = (event: PointerEvent) => {
      if (
        searchAreaRef.current &&
        !searchAreaRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => searchInputRef.current?.focus());
        return;
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function navigationActive(item: NavItem): boolean {
    if (item.label === "Comunidade") {
      return location.pathname.startsWith("/app/comunidade");
    }

    if (item.label === "Moderação") {
      return location.pathname === "/app/moderacao";
    }

    if (item.to === "/app/site-institucional") {
      return location.pathname.startsWith("/app/site-institucional");
    }

    if (item.to === "/app/design/templates") {
      return location.pathname.startsWith("/app/design/templates");
    }

    if (item.to === "/app/design/variantes") {
      return location.pathname.startsWith("/app/design/variantes");
    }

    if (item.to.startsWith("/em-construcao")) {
      const expected = new URLSearchParams(item.to.split("?")[1] ?? "").get(
        "feature",
      );
      const current = new URLSearchParams(location.search).get("feature");
      return (
        location.pathname === "/em-construcao" &&
        Boolean(expected) &&
        current === expected
      );
    }

    return location.pathname === item.to;
  }

  function closeMobileMenu(): void {
    setMobileMenuOpen(false);
  }

  function handleBrandNavigation(): void {
    closeMobileMenu();
    navigate("/app/comunidade");
  }

  function handleSearchSelect(result: CommunitySearchResult): void {
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
      navigate("/em-construcao?feature=eventos");
      return;
    }

    navigate(`/app/comunidade?post=${result.id}`);
  }

  async function handleLogout(): Promise<void> {
    try {
      await logout();

      closeMobileMenu();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Não foi possível encerrar a sessão:", error);
    }
  }

  return (
    <div
      className={`${styles.shell} ${
        sidebarCollapsed ? styles.shellCollapsed : ""
      }`}
    >
      <a className={styles.skipLink} href="#logged-main-content">
        Pular para o conteúdo
      </a>
      <aside
        className={`${styles.sidebar} ${
          mobileMenuOpen ? styles.sidebarMobileOpen : ""
        }`}
        aria-label="Menu principal da CONG"
      >
        <div className={styles.sidebarHeader}>
          <button
            type="button"
            className={styles.brand}
            onClick={handleBrandNavigation}
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
          >
            {sidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>

          <button
            type="button"
            className={styles.mobileCloseButton}
            onClick={closeMobileMenu}
            aria-label="Fechar menu"
          >
            <FiX />
          </button>
        </div>

        <WorkspaceSelector
          collapsed={sidebarCollapsed}
          onChanged={() => {
            closeMobileMenu();
            navigate("/app/comunidade");
          }}
        />

        <nav className={styles.sidebarNavigation}>
          <div className={styles.navigationGroup}>
            {mainNavigation.map((item) => (
              <NavEntry
                key={item.label}
                item={item}
                collapsed={sidebarCollapsed}
                onNavigate={closeMobileMenu}
                onNotifications={() => setNotificationsOpen(true)}
                notificationCount={notifications.unreadCount}
                activeOverride={navigationActive(item)}
              />
            ))}
            {canModerateCommunity ? (
              <NavEntry
                item={{
                  label: "Moderação",
                  icon: FiShield,
                  to: "/app/moderacao",
                }}
                collapsed={sidebarCollapsed}
                onNavigate={closeMobileMenu}
                onNotifications={() => setNotificationsOpen(true)}
                notificationCount={notifications.unreadCount}
                activeOverride={location.pathname === "/app/moderacao"}
              />
            ) : null}
          </div>

        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink
            to="/app/minha-conta?tab=access"
            className={styles.navigationItem}
            title={sidebarCollapsed ? "Configurações" : undefined}
            onClick={closeMobileMenu}
          >
            <span className={styles.navigationIcon}>
              <FiSettings aria-hidden="true" />
            </span>

            <span className={styles.navigationLabel}>Configurações</span>
          </NavLink>

          <NavLink
            to="/em-construcao"
            className={styles.navigationItem}
            title={sidebarCollapsed ? "Ajuda" : undefined}
            onClick={closeMobileMenu}
          >
            <span className={styles.navigationIcon}>
              <FiHelpCircle aria-hidden="true" />
            </span>

            <span className={styles.navigationLabel}>Ajuda</span>
          </NavLink>

          <button
            type="button"
            className={`${styles.navigationItem} ${styles.logoutButton}`}
            onClick={() => void handleLogout()}
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
          onClick={closeMobileMenu}
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
              aria-expanded={mobileMenuOpen}
            >
              <FiMenu />
            </button>

            <form
              ref={searchAreaRef}
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
                placeholder="Pesquisar na CONG"
                aria-label="Pesquisar na CONG"
                aria-expanded={searchOpen}
                aria-controls="community-global-search-results"
                aria-haspopup="dialog"
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" || !searchOpen) return;
                  const firstResult =
                    searchAreaRef.current?.querySelector<HTMLButtonElement>(
                      "[data-community-search-result]",
                    );
                  if (firstResult) {
                    event.preventDefault();
                    firstResult.focus();
                  }
                }}
              />

              <kbd>Ctrl K</kbd>

              {searchOpen ? (
                <CommunitySearchPanel
                  id="community-global-search-results"
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
              onClick={() => {
                if (workspace.kind === "organization" && workspace.organization.organizationType === "ngo") {
                  navigate("/app/site-institucional?create=1");
                  return;
                }
                if (workspace.kind === "collaboration" && workspace.profile.role === "designer") {
                  navigate("/app/design/templates?create=1");
                  return;
                }
                navigate("/app/comunidade?compose=general");
              }}
            >
              <FiPlus aria-hidden="true" />
              <span>
                {workspace.kind === "organization" && workspace.organization.organizationType === "ngo"
                  ? "Criar site"
                  : workspace.kind === "collaboration" && workspace.profile.role === "designer"
                    ? "Criar template"
                    : "Criar"}
              </span>
            </button>

            <div className={styles.notificationArea} ref={notificationAreaRef}>
              <TopbarAction
                label="Notificações"
                onClick={() => setNotificationsOpen((current) => !current)}
              >
                <FiBell aria-hidden="true" />
                {notifications.unreadCount > 0 ? (
                  <span className={styles.topbarBadge}>
                    {Math.min(99, notifications.unreadCount)}
                  </span>
                ) : null}
              </TopbarAction>
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
                    navigate(`/app/comunidade?event=${eventId}`);
                  }}
                  onOpenModeration={() => {
                    setNotificationsOpen(false);
                    navigate("/app/moderacao");
                  }}
                />
              ) : null}
            </div>

            <TopbarAction
              label="Mensagens"
              onClick={() => navigate("/em-construcao")}
            >
              <FiMessageCircle aria-hidden="true" />
            </TopbarAction>

            <div className={styles.profileArea} ref={profileAreaRef}>
              <button
                type="button"
                className={styles.profileTrigger}
                onClick={() => setProfileMenuOpen((current) => !current)}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <span className={styles.topbarAvatar}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <FiUser aria-hidden="true" />
                  )}
                </span>
                <span className={styles.profileTriggerText}>
                  <strong>{displayName}</strong>
                  <small>{username}</small>
                </span>
                <FiChevronDown
                  className={styles.profileChevron}
                  aria-hidden="true"
                />
              </button>

              {profileMenuOpen ? (
                <div className={styles.profileMenu} role="menu">
                  <div className={styles.profileMenuIdentity}>
                    <span className={styles.profileMenuAvatar}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <FiUser aria-hidden="true" />
                      )}
                    </span>
                    <div>
                      <strong>{displayName}</strong>
                      <small>{username}</small>
                    </div>
                  </div>
                  <div className={styles.profileMenuActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate("/app/minha-conta");
                      }}
                    >
                      <FiUser /> Minha conta
                    </button>
                    {account?.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          navigate(`/app/comunidade/perfil/user/${account.id}`);
                        }}
                      >
                        <FiUsers /> Perfil na comunidade
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate("/app/comunidade/minha-atividade?view=mine");
                      }}
                    >
                      <FiFileText /> Minhas publicações
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate("/app/comunidade/minha-atividade?view=saved");
                      }}
                    >
                      <FiBookmark /> Itens salvos
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
                      <FiArchive /> Publicações arquivadas
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.profileMenuLogout}
                    onClick={() => void handleLogout()}
                  >
                    <FiLogOut /> Sair
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div
          id="logged-main-content"
          className={styles.workspaceContent}
          tabIndex={-1}
        >
          <Outlet />
        </div>
      </section>
    </div>
  );
}
