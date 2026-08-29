import styles from "./Footer.module.css";
import { TransitionLink } from "../pageTransitionProvider/TransitionLink";

import { FaGithub, FaLinkedin, FaYoutube, FaCommentDots } from "react-icons/fa";

import logo from "../../assets/brand/logo-wordmark-dark.webp";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <img src={logo} alt="CONG" className={styles.logo} />

          <p>
            Plataforma aberta para construção colaborativa de soluções que geram
            impacto social real.
          </p>

          <div className={styles.socials}>
            <a
              href="https://github.com/CongPlataform"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub size={22} />
            </a>
            <a
              href="https://discord.gg/cong"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaCommentDots size={22} />
            </a>
            <a
              href="https://linkedin.com/company/cong"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaLinkedin size={22} />
            </a>
            <a
              href="https://youtube.com/c/CongPlataform"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaYoutube size={22} />
            </a>
          </div>
        </div>

        <div className={styles.links}>
          <h4>NAVEGAÇÃO</h4>

          <TransitionLink to="/">Início</TransitionLink>
          <TransitionLink to="/como-funciona">Como Funciona</TransitionLink>
          <TransitionLink to="/documentacao">Documentação</TransitionLink>
          <TransitionLink to="/comunidade">Comunidade</TransitionLink>
          <TransitionLink to="/sobre">Sobre</TransitionLink>
        </div>

        <div className={styles.links}>
          <h4>RECURSOS</h4>

          <a>Projetos</a>
          <a>Módulos</a>
          <a>Guia de Contribuição</a>
          <a>FAQ</a>
        </div>

        <div className={styles.links}>
          <h4>COMUNIDADE</h4>

          <a
            href="https://github.com/CongPlataform"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://discord.gg/cong"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord
          </a>
          <a
            href="https://linkedin.com/company/cong"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href="https://youtube.com/c/CongPlataform"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube
          </a>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© 2026 CONG</span>

        <div className={styles.bottomText}>
          <span>Código aberto</span>
          <span>•</span>
          <span>Comunidade aberta</span>
          <span>•</span>
          <span className={styles.highlight}>Impacto aberto</span>
        </div>
      </div>
    </footer>
  );
}
