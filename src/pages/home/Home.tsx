import { useEffect, useState } from "react";
import { FileText, Rocket, Handshake, CodeXml, Users } from "lucide-react";

import styles from "./Home.module.css";
import AudienceShowcase from "../../components/audienceShowcase/AudienceShowcase";
import mascote from "../../assets/mascot/cong-happy.webp";
import CollaborationFlow from "../../components/collaborationFlow/CollaborationFlow";
import ResearchResults from "../../components/researchResults/ResearchResults";
import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";

const impactWords = [
  "propósito",
  "código",
  "marketing",
  "design",
  "conteúdo",
  "apoio",
] as const;

type WordPhase = "idle" | "leaving" | "entering";

const WORD_INTERVAL = 2800;
const TRANSITION_DURATION = 360;

export default function Home() {
  const [wordIndex, setWordIndex] = useState(0);
  const [wordPhase, setWordPhase] = useState<WordPhase>("idle");

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (reducedMotionQuery.matches) {
      return;
    }

    let waitingTimeout: number | undefined;
    let transitionTimeout: number | undefined;
    let firstFrame: number | undefined;
    let secondFrame: number | undefined;

    let cancelled = false;

    const scheduleNextWord = () => {
      waitingTimeout = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setWordPhase("leaving");

        transitionTimeout = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          setWordIndex((currentIndex) => {
            return (currentIndex + 1) % impactWords.length;
          });

          setWordPhase("entering");

          firstFrame = window.requestAnimationFrame(() => {
            secondFrame = window.requestAnimationFrame(() => {
              if (cancelled) {
                return;
              }

              setWordPhase("idle");
              scheduleNextWord();
            });
          });
        }, TRANSITION_DURATION);
      }, WORD_INTERVAL);
    };

    scheduleNextWord();

    return () => {
      cancelled = true;

      if (waitingTimeout !== undefined) {
        window.clearTimeout(waitingTimeout);
      }

      if (transitionTimeout !== undefined) {
        window.clearTimeout(transitionTimeout);
      }

      if (firstFrame !== undefined) {
        window.cancelAnimationFrame(firstFrame);
      }

      if (secondFrame !== undefined) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, []);

  const currentWord = impactWords[wordIndex];

  const dynamicWordClassName = [
    styles.dynamicWord,
    wordPhase === "leaving" ? styles.wordLeaving : "",
    wordPhase === "entering" ? styles.wordEntering : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <span className={styles.decorStarLeft} aria-hidden="true">
          ✧
        </span>

        <span className={styles.decorStarRight} aria-hidden="true">
          ✦
        </span>

        <div className={styles.heroInner}>
          <div className={styles.heroVisual}>
            <div className={styles.browserSketch} aria-hidden="true">
              <div className={styles.browserSketchBar}>
                <span />
                <span />
                <span />
              </div>

              <div className={styles.browserSketchContent}>
                <div className={styles.browserSketchLines}>
                  <span />
                  <span />
                </div>

                <div className={styles.browserSketchBoxes}>
                  <span>×</span>
                  <span>×</span>
                </div>
              </div>
            </div>

            <img
              src={mascote}
              alt="Mascote da plataforma CONG usando um capacete amarelo"
              className={styles.mascote}
            />

            <div className={styles.ongNote} aria-hidden="true">
              <span className={styles.noteTape} />

              <svg viewBox="0 0 64 55">
                <circle cx="32" cy="15" r="7" />
                <circle cx="16" cy="21" r="5" />
                <circle cx="48" cy="21" r="5" />

                <path d="M20 49c0-10 5-16 12-16s12 6 12 16" />
                <path d="M5 48c0-8 4-13 11-13 4 0 7 1 9 4" />
                <path d="M59 48c0-8-4-13-11-13-4 0-7 1-9 4" />
              </svg>

              <strong>ONGs</strong>
            </div>

            <div className={styles.mascotGround} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.heroContent}>
            <h1
              aria-label={`Seu ${currentWord} constrói novas possibilidades.`}
            >
              <span className={styles.heroStatement}>
                <span className={styles.titleTopLine}>
                  <span className={styles.staticTitleWord}>Seu</span>

                  <span className={styles.wordViewport} aria-hidden="true">
                    <span className={styles.wordMeasure}>
                      {impactWords.map((word) => (
                        <span key={word}>{word}</span>
                      ))}
                    </span>

                    <span className={dynamicWordClassName}>{currentWord}</span>
                  </span>

                  <span className={styles.staticTitleWord}>constrói</span>
                </span>

                <span className={styles.titleBottomLine}>
                  novas possibilidades.
                </span>
              </span>
            </h1>

            <p className={styles.heroDescription}>
              A CONG conecta organizações e pessoas para criar, adaptar e
              compartilhar soluções digitais para o terceiro setor.
            </p>

            <div className={styles.buttons}>
              <TransitionLink to="/como-funciona" className={styles.primaryBtn}>
                <Rocket className={styles.buttonIcon} aria-hidden="true" />
                Encontrar meu caminho
              </TransitionLink>

              <TransitionLink to="/sobre" className={styles.secondaryBtn}>
                <FileText className={styles.buttonIcon} aria-hidden="true" />
                Conhecer a CONG
              </TransitionLink>
            </div>

            <div className={styles.heroValues}>
              <div className={styles.heroValue}>
                <span className={styles.valueIcon}>
                  <Handshake />
                </span>

                <span>
                  Comunidade
                  <strong>colaborativa</strong>
                </span>
              </div>

              <div className={styles.valueDivider} />

              <div className={styles.heroValue}>
                <span className={styles.valueIcon}>
                  <Users />
                </span>

                <span>
                  Acessível
                  <strong>para todos</strong>
                </span>
              </div>

              <div className={styles.valueDivider} />

              <div className={styles.heroValue}>
                <span className={styles.valueIcon}>
                  <CodeXml />
                </span>

                <span>
                  Tecnologia com
                  <strong>propósito</strong>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.heroSideDoodles} aria-hidden="true">
            <svg
              className={styles.connectionSvg}
              viewBox="0 0 280 580"
              preserveAspectRatio="none"
            >
              <defs>
                <marker
                  id="heroConnectorArrow"
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path
                    d="M0 0 L8 4 L0 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
              </defs>

              <path
                className={styles.connectionPath}
                d="M190 143 C190 172 122 166 84 207"
                markerEnd="url(#heroConnectorArrow)"
              />

              <path
                className={styles.connectionPath}
                d="M76 288 C80 315 168 298 201 329"
                markerEnd="url(#heroConnectorArrow)"
              />

              <path
                className={styles.connectionPath}
                d="M202 410 C203 437 157 438 141 462"
                markerEnd="url(#heroConnectorArrow)"
              />
            </svg>

            <div className={styles.heartWindow}>
              <div className={styles.windowDots}>
                <span />
                <span />
                <span />
              </div>

              <div className={styles.heartWindowBody}>
                <span className={styles.heartCircle}>♡</span>

                <div>
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className={`${styles.sideCard} ${styles.developerCard}`}>
              <strong>&lt;/&gt;</strong>
              <small>Desenvolvedores</small>
            </div>

            <div className={`${styles.sideCard} ${styles.designerCard}`}>
              <svg viewBox="0 0 24 24">
                <path d="m14 4 6 6-9 9-7 1 1-7 9-9Z" />
                <path d="m12 6 6 6" />
                <path d="m5 13 6 6" />
              </svg>

              <small>Designers</small>
            </div>

            <div className={styles.impactNote}>
              <span className={styles.impactTape} />
              <span className={styles.noteHeart}>♡</span>

              <strong>
                Impacto
                <br />
                real
              </strong>
            </div>
          </div>
        </div>
      </section>

      <AudienceShowcase />
      <CollaborationFlow />
      <ResearchResults />
    </main>
  );
}
