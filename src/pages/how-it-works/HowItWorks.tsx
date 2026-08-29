import { useEffect, useState } from "react";
import {
  CalendarDays,
  Heart,
  MessageCircle,
  Package,
  Users,
} from "lucide-react";

import styles from "./HowItWorks.module.css";
import mascotePensativo from "../../assets/mascot/cong-thinking.webp";
import SystemLayers from "../../components/systemLayers/SystemLayers";
import SocialDeliveryFlow from "../../components/socialDeliveryFlow/SocialDeliveryFlow";

const rotatingWords = [
  "se adapta.",
  "organiza.",
  "centraliza.",
  "evolui.",
] as const;

type WordPhase = "idle" | "leaving" | "entering";
type ModuleTone = "blue" | "green" | "purple" | "yellow";

interface SystemModule {
  label: string;
  icon: typeof Users;
  tone: ModuleTone;
  positionClass: string;
}

const modules: SystemModule[] = [
  {
    label: "Beneficiários",
    icon: Users,
    tone: "blue",
    positionClass: "brickBeneficiaries",
  },
  {
    label: "Doações",
    icon: Heart,
    tone: "green",
    positionClass: "brickDonations",
  },
  {
    label: "Estoque",
    icon: Package,
    tone: "purple",
    positionClass: "brickStock",
  },
  {
    label: "Agenda",
    icon: CalendarDays,
    tone: "yellow",
    positionClass: "brickAgenda",
  },
];

const WORD_INTERVAL = 2800;
const TRANSITION_DURATION = 360;

export default function HowItWorks() {
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
            return (currentIndex + 1) % rotatingWords.length;
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

  const currentWord = rotatingWords[wordIndex];

  const dynamicWordClassName = [
    styles.dynamicWord,
    wordPhase === "leaving" ? styles.wordLeaving : "",
    wordPhase === "entering" ? styles.wordEntering : "",
  ]
    .filter(Boolean)
    .join(" ");

  const moduleToneClasses: Record<ModuleTone, string> = {
    blue: styles.moduleBlue,
    green: styles.moduleGreen,
    purple: styles.modulePurple,
    yellow: styles.moduleYellow,
  };

  return (
    <div className={styles.howItWorks}>
      <section className={styles.hero} aria-labelledby="how-it-works-title">
        <div className={styles.heroInner}>
          <div className={styles.leftVisual} aria-hidden="true">
            <div className={styles.paperCollage}>
              <svg
                className={styles.paperConnectors}
                viewBox="0 0 360 620"
                preserveAspectRatio="none"
              >
                <path d="M208 164 C285 177 305 213 288 251" />
                <path d="M278 315 C273 347 239 365 193 381" />
                <path d="M158 548 C154 573 169 591 196 594" />
              </svg>

              <article className={styles.sheetPaper}>
                <span className={styles.paperTape} />

                <div className={styles.sheetSurface}>
                  <span className={styles.sheetFold} />

                  <div className={styles.sheetHeader}>
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className={styles.sheetGrid}>
                    {Array.from({ length: 20 }).map((_, index) => (
                      <span key={`sheet-cell-${index}`} />
                    ))}
                  </div>
                </div>
              </article>

              <article className={styles.whatsappPaper}>
                <MessageCircle />

                <span className={styles.messageLines}>
                  <i />
                  <i />
                </span>

                <small>11:20</small>
              </article>

              <article className={styles.formPaper}>
                <span className={styles.paperTape} />

                <div className={styles.formSurface}>
                  <div className={styles.binderHoles}>
                    {Array.from({ length: 7 }).map((_, index) => (
                      <span key={`binder-hole-${index}`} />
                    ))}
                  </div>

                  <strong>CADASTRO</strong>

                  <div className={styles.formRow}>
                    <span>NOME</span>
                    <i />
                  </div>

                  <div className={styles.formRow}>
                    <span>TELEFONE</span>
                    <i />
                  </div>

                  <div className={styles.formRow}>
                    <span>ENDEREÇO</span>
                    <i />
                  </div>
                </div>
              </article>

              <article className={styles.confusionPaper}>
                <span className={styles.noteTape} />

                <div className={styles.noteSurface}>
                  <p>
                    <span>Precisamos</span>
                    <span>organizar</span>
                    <span className={styles.noteHighlight}>isso...</span>
                  </p>
                </div>
              </article>

              <span className={styles.paperSparkleLarge}>✧</span>
              <span className={styles.paperSparkleSmall}>☆</span>
            </div>
          </div>

          <div className={styles.heroContent}>
            <h1
              id="how-it-works-title"
              aria-label={`Da rotina da ONG ao sistema que ${currentWord}`}
            >
              <span className={styles.heroIntro}>Como funciona na prática</span>

              <span className={styles.heroStatement}>
                <span className={styles.titleLine}>Da rotina da ONG</span>
                <span className={styles.titleLine}>ao sistema que</span>

                <span className={styles.wordLine}>
                  <span className={styles.wordViewport} aria-hidden="true">
                    <span className={styles.wordMeasure}>
                      {rotatingWords.map((word) => (
                        <span key={word}>{word}</span>
                      ))}
                    </span>

                    <span className={dynamicWordClassName}>{currentWord}</span>
                  </span>
                </span>
              </span>
            </h1>

            <p className={styles.heroDescription}>
              A CONG transforma necessidades reais em módulos, fluxos e
              ferramentas que a organização controla, sem precisar começar do
              zero.
            </p>
          </div>

          <div className={styles.rightVisual} aria-hidden="true">
            <div className={styles.thoughtBlocks}>
              {modules.map((module) => {
                const Icon = module.icon;

                return (
                  <article
                    key={module.label}
                    className={`${styles.legoBrick} ${
                      moduleToneClasses[module.tone]
                    } ${styles[module.positionClass]}`}
                  >
                    <span className={styles.legoStuds}>
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>

                    <div className={styles.legoFace}>
                      <Icon />
                      <strong>{module.label}</strong>
                    </div>
                  </article>
                );
              })}

              <span className={`${styles.miniBrick} ${styles.miniBrickOne}`}>
                <i />
                <i />
                <i />
              </span>

              <span className={`${styles.miniBrick} ${styles.miniBrickTwo}`}>
                <i />
                <i />
              </span>

              <span className={styles.blocksSparkle}>✦</span>
              <span className={styles.blocksSparkleSmall}>✧</span>
            </div>

            <span className={styles.thoughtDotLarge} />
            <span className={styles.thoughtDotMedium} />
            <span className={styles.thoughtDotSmall} />

            <img
              src={mascotePensativo}
              alt=""
              className={styles.thinkingMascot}
            />
          </div>
        </div>
      </section>

      <SystemLayers />
      <SocialDeliveryFlow />
    </div>
  );
}
