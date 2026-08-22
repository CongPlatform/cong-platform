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

    return location.pathname.startsWith(path);
  }

  function goTo(path: string) {
    setMobileOpen(false);
    navigateWithTransition(path);
  }

  useEffect(() => {
    if (!mobileOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen]);

  return (
    <header className={styles.header}>
      <TransitionLink to="/" className={styles.logoContainer}>
        <img src={logo} alt="CONG" className={styles.logo} />
      </TransitionLink>

      <nav className={styles.nav} aria-label="Navegação principal">
        {links.map((link) => (
          <TransitionLink
            key={link.path}
            to={link.path}
            onClick={() => setMobileOpen(false)}
            className={`${styles.mobileLink} ${
              isActivePath(link.path) ? styles.mobileActive : ""
            }`}
          >
            {link.label}
          </TransitionLink>
        ))}
      </nav>

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

      {mobileOpen && (
        <div id="cong-mobile-menu" className={styles.mobileMenu}>
          <nav className={styles.mobileNav} aria-label="Navegação móvel">
            {links.map((link) => (
              <TransitionLink
                key={link.path}
                to={link.path}
                className={`${styles.mobileLink} ${
                  isActivePath(link.path) ? styles.mobileActive : ""
                }`}
              >
                {link.label}
              </TransitionLink>
            ))}
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
