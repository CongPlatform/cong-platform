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

  function isActivePath(path: string) {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  }

  return (
    <header className={styles.header}>
      <TransitionLink to="/" className={styles.logoContainer}>
        <img src={logo} alt="CONG" className={styles.logo} />
      </TransitionLink>

      <nav className={styles.nav}>
        {links.map((link) => (
          <TransitionLink
            key={link.path}
            to={link.path}
            className={`${styles.link} ${
              isActivePath(link.path) ? styles.active : ""
            }`}
          >
            <span>{link.label}</span>

            <svg
              className={styles.marker}
              viewBox="0 0 100 14"
              preserveAspectRatio="none"
              aria-hidden={true}
            >
              <path
                d="
                  M5 8
                  C20 7, 35 9, 50 8
                  C65 7, 80 9, 95 8
                "
              />
            </svg>
          </TransitionLink>
        ))}
      </nav>

      <div className={styles.actions}>
        {loading ? null : user ? (
          <button
            type="button"
            className={styles.login}
            onClick={() => navigateWithTransition("/app/comunidade")}
          >
            {user.name}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.login}
              onClick={() => navigateWithTransition("/login")}
            >
              Entrar
            </button>

            <button
              type="button"
              className={styles.signup}
              onClick={() => navigateWithTransition("/signup")}
            >
              Criar Conta
            </button>
          </>
        )}
      </div>
    </header>
  );
}
