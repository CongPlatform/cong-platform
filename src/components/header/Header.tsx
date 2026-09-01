import { useEffect, useState } from "react";

import { Menu, X } from "lucide-react";
import { useLocation } from "react-router-dom";

import styles from "./Header.module.css";

import logo from "../../assets/brand/logo-wordmark-dark.webp";

import { TransitionLink } from "../pageTransitionProvider/TransitionLink";
import { usePageTransition } from "../pageTransitionProvider/PageTransitionContext";
import { useAuth } from "../../contexts/auth-context";

const links = [
  { label: "Início", path: "/" },
  { label: "Como Funciona", path: "/como-funciona" },
  { label: "Documentação", path: "/documentacao" },
  { label: "Comunidade", path: "/comunidade" },
  { label: "Sobre", path: "/sobre" },
];

export default function Header() {
  const location = useLocation();

  const { navigateWithTransition } = usePageTransition();
  const { user, loading } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  function isActivePath(path: string) {
    if (path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  }

  function goTo(path: string) {
    setMobileOpen(false);
    navigateWithTransition(path);
  }

  useEffect(() => {
    if (!mobileOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  return (
    <header className={styles.header}>
      {/* Logo */}
      <TransitionLink
        to="/"
        className={styles.logoContainer}
        onClick={() => setMobileOpen(false)}
        aria-label="CONG — Página inicial"
      >
        <img src={logo} alt="CONG" className={styles.logo} />
      </TransitionLink>

      {/* Navegação desktop */}
      <nav className={styles.nav} aria-label="Navegação principal">
        {links.map((link) => {
          const active = isActivePath(link.path);

          return (
            <TransitionLink
              key={link.path}
              to={link.path}
              className={`${styles.link} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span>{link.label}</span>

              <svg
                className={styles.marker}
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
                aria-hidden={true}
              >
                <path d="M4 7 C18 5.4 31 8.1 45 6.7 C59 5.6 73 8.3 96 6.4" />
              </svg>
            </TransitionLink>
          );
        })}
      </nav>

      {/* Ações desktop */}
      <div className={styles.actions}>
        {loading ? null : user ? (
          <button
            type="button"
            className={styles.login}
            onClick={() => goTo("/app/comunidade")}
          >
            {user.name}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.login}
              onClick={() => goTo("/login")}
            >
              Entrar
            </button>

            <button
              type="button"
              className={styles.signup}
              onClick={() => goTo("/signup")}
            >
              Criar Conta
            </button>
          </>
        )}
      </div>

      {/* Botão do menu mobile */}
      <button
        type="button"
        className={styles.menuButton}
        aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={mobileOpen}
        aria-controls="cong-mobile-menu"
        onClick={() => setMobileOpen((current) => !current)}
      >
        {mobileOpen ? <X size={25} /> : <Menu size={25} />}
      </button>

      {/* Menu mobile */}
      {mobileOpen && (
        <div id="cong-mobile-menu" className={styles.mobileMenu}>
          <nav className={styles.mobileNav} aria-label="Navegação móvel">
            {links.map((link) => {
              const active = isActivePath(link.path);

              return (
                <TransitionLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`${styles.mobileLink} ${
                    active ? styles.mobileActive : ""
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </TransitionLink>
              );
            })}
          </nav>

          <div className={styles.mobileActions}>
            {loading ? null : user ? (
              <button
                type="button"
                className={styles.mobileSignup}
                onClick={() => goTo("/app/comunidade")}
              >
                Ir para a CONG
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.mobileLogin}
                  onClick={() => goTo("/login")}
                >
                  Entrar
                </button>

                <button
                  type="button"
                  className={styles.mobileSignup}
                  onClick={() => goTo("/signup")}
                >
                  Criar Conta
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
