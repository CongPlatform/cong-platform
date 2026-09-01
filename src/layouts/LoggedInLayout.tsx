import { useState, type ReactNode } from "react";

import {
  FiBell,
  FiBox,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCompass,
  FiFolder,
  FiHelpCircle,
  FiHome,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiSettings,
  FiUser,
  FiX,
} from "react-icons/fi";

import { NavLink, Outlet, useNavigate } from "react-router-dom";

import logoCompact from "../assets/brand/logo-mark.webp";
import logoExtended from "../assets/brand/logo-wordmark-dark.webp";

import { useAuth } from "../contexts/auth-context";
import { buildDefaultAvatarUrl } from "../utils/avatar";

import styles from "./LoggedInLayout.module.css";

type NavItem = {
  label: string;
  icon: typeof FiHome;
  to: string;
  badge?: number;
};

const MAIN_NAVIGATION: NavItem[] = [
  {
    label: "Comunidade",
    icon: FiHome,
    to: "/app/comunidade",
  },
  {
    label: "Explorar",
    icon: FiCompass,
    to: "/em-construcao",
  },
  {
    label: "Projetos",
    icon: FiFolder,
    to: "/em-construcao",
  },
  {
    label: "Módulos",
    icon: FiBox,
    to: "/em-construcao",
  },
  {
    label: "Eventos",
    icon: FiCalendar,
    to: "/em-construcao",
  },
];

const ACCOUNT_NAVIGATION: NavItem[] = [
  {
    label: "Mensagens",
    icon: FiMessageCircle,
    to: "/em-construcao",
    badge: 2,
  },
  {
    label: "Notificações",
    icon: FiBell,
    to: "/em-construcao",
    badge: 3,
  },
  {
    label: "Meu perfil",
    icon: FiUser,
    to: "/app/minha-conta",
  },
];

function NavEntry({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `${styles.navigationItem} ${
          isActive && item.to !== "/em-construcao"
            ? styles.navigationItemActive
            : ""
        }`
      }
    >
      <span className={styles.navigationIcon}>
        <Icon aria-hidden="true" />
      </span>

      <span className={styles.navigationLabel}>{item.label}</span>

      {item.badge ? (
        <b className={styles.navigationBadge}>{item.badge}</b>
      ) : null}
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

  const { account, logout } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const displayName = account?.displayName || account?.name || "Minha conta";

  const avatarUrl = account
    ? account.avatarPath || buildDefaultAvatarUrl(account)
    : undefined;

  function closeMobileMenu(): void {
    setMobileMenuOpen(false);
  }

  function handleBrandNavigation(): void {
    closeMobileMenu();
    navigate("/app/comunidade");
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

        <nav className={styles.sidebarNavigation}>
          <div className={styles.navigationGroup}>
            {MAIN_NAVIGATION.map((item) => (
              <NavEntry
                key={item.label}
                item={item}
                collapsed={sidebarCollapsed}
                onNavigate={closeMobileMenu}
              />
            ))}
          </div>

          <div className={styles.navigationDivider} />

          <div className={styles.navigationGroup}>
            {ACCOUNT_NAVIGATION.map((item) => (
              <NavEntry
                key={item.label}
                item={item}
                collapsed={sidebarCollapsed}
                onNavigate={closeMobileMenu}
              />
            ))}
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
              className={styles.search}
              onSubmit={(event) => {
                event.preventDefault();

                navigate("/em-construcao");
              }}
            >
              <FiSearch aria-hidden="true" />

              <input
                type="search"
                placeholder="Pesquisar na CONG"
                aria-label="Pesquisar na CONG"
              />

              <kbd>Ctrl K</kbd>
            </form>
          </div>

          <div className={styles.topbarActions}>
            <button
              type="button"
              className={styles.topbarCreateButton}
              onClick={() => navigate("/em-construcao")}
            >
              <FiPlus aria-hidden="true" />

              <span>Criar</span>
            </button>

            <TopbarAction
              label="Notificações"
              onClick={() => navigate("/em-construcao")}
            >
              <FiBell aria-hidden="true" />

              <span className={styles.topbarBadge}>3</span>
            </TopbarAction>

            <TopbarAction
              label="Mensagens"
              onClick={() => navigate("/em-construcao")}
            >
              <FiMessageCircle aria-hidden="true" />
            </TopbarAction>

            <button
              type="button"
              className={styles.profileTrigger}
              onClick={() => navigate("/app/minha-conta")}
            >
              <span className={styles.topbarAvatar}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" />
                ) : (
                  <FiUser aria-hidden="true" />
                )}
              </span>

              <span className={styles.profileTriggerText}>
                <strong>{displayName}</strong>
                <small>Minha conta</small>
              </span>
            </button>
          </div>
        </header>

        <main className={styles.workspaceContent}>
          <Outlet />
        </main>
      </section>
    </div>
  );
}
