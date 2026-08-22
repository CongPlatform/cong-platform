import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowUpRight,
  FiClock,
  FiHome,
  FiTool,
} from "react-icons/fi";

import mascote from "../../assets/mascot/cong-default.webp";
import styles from "./Pending.module.css";

export default function Pending() {
  const navigate = useNavigate();

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }

    navigate("/app/comunidade");
  };

  return (
    <main className={styles.pendingPage}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
        >
          <FiArrowLeft aria-hidden="true" />
          Voltar
        </button>

        <Link
          to="/app/comunidade"
          className={styles.dashboardLink}
        >
          <FiHome aria-hidden="true" />
          Visão geral
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <div className={styles.metaRow}>
            <span className={styles.status}>
              <FiTool aria-hidden="true" />
              Página em desenvolvimento
            </span>

            <span className={styles.issue}>
              CONG / 01
            </span>
          </div>

          <div className={styles.titleBlock}>
            <span className={styles.kicker}>
              ESTA ÁREA ESTÁ
            </span>

            <h1>
              EM
              <span>CONSTRUÇÃO</span>
            </h1>
          </div>

          <p className={styles.description}>
            Devido à alta quantidade de páginas que o projeto demanda,
            desenvolvemos as principais, que estavam dentro do alcance
            do grupo. As demais seguem em construção, e buscamos
            finalizá-las o mais breve possível.
          </p>

          <div className={styles.actions}>
            <Link
              to="/app/comunidade"
              className={styles.primaryButton}
            >
              <FiHome aria-hidden="true" />
              Voltar ao Dashboard
            </Link>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleBack}
            >
              Retornar à página anterior
              <FiArrowUpRight aria-hidden="true" />
            </button>
          </div>

          <div className={styles.timeline}>
            <div className={styles.timelineHeader}>
              <span>
                <FiClock aria-hidden="true" />
                Progresso desta área
              </span>

              <strong>Em andamento</strong>
            </div>

            <div className={styles.track}>
              <span />
            </div>

            <div className={styles.steps}>
              <span className={styles.stepComplete}>
                Planejamento
              </span>
              <span className={styles.stepActive}>
                Desenvolvimento
              </span>
              <span>Finalização</span>
            </div>
          </div>
        </div>

        <aside
          className={styles.visual}
          aria-hidden="true"
        >
          <div className={styles.poster}>
            <span className={styles.posterLabel}>
              CONG
            </span>

            <span className={styles.posterNumber}>
              01
            </span>

            <div className={styles.posterCenter}>
              <span className={styles.ring} />
              <span className={styles.ringSecondary} />

              <img
                src={mascote}
                alt=""
                className={styles.mascot}
              />
            </div>

            <span className={styles.posterCaption}>
              CONSTRUIR · IMPACTAR · JUNTOS
            </span>
          </div>

          <div className={styles.tape}>
            <span>EM DESENVOLVIMENTO</span>
            <span>EM DESENVOLVIMENTO</span>
            <span>EM DESENVOLVIMENTO</span>
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 CONG Plataforma</span>
        <span>
          Esta página faz parte da evolução contínua do projeto.
        </span>
      </footer>
    </main>
  );
}
