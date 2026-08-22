import {
  Check,
  Clock3,
  FolderOpen,
  HeartHandshake,
  Lightbulb,
  Sparkles,
  UserRound,
} from "lucide-react";

import styles from "./ResearchResults.module.css";

const researchResults = [
  {
    value: "92,9%",
    description:
      "acreditam que a falta de organização prejudica ações sociais.",
    tone: "yellow",
  },
  {
    value: "83,3%",
    description:
      "consideram que usar vários aplicativos dificulta o trabalho.",
    tone: "blue",
  },
  {
    value: "100%",
    description:
      "acreditam que um sistema centralizado pode melhorar a organização.",
    tone: "green",
  },
] as const;

const conclusions = [
  <>
    A organização influencia diretamente o{" "}
    <strong>sucesso das ações.</strong>
  </>,
  <>
    Usar várias ferramentas aumenta o{" "}
    <strong>retrabalho e a perda de tempo.</strong>
  </>,
  <>
    Centralizar informações e processos é visto como um{" "}
    <strong>caminho claro de melhoria.</strong>
  </>,
];

const mainPains = [
  "Informações espalhadas",
  "Comunicação falha",
  "Perda de tempo",
  "Dificuldade para acompanhar processos",
] as const;

const practicalResults = [
  {
    icon: Clock3,
    title: "Menos retrabalho",
    tone: "green",
  },
  {
    icon: Lightbulb,
    title: "Mais clareza",
    tone: "blue",
  },
  {
    icon: UserRound,
    title: "Mais autonomia",
    tone: "yellow",
  },
] as const;

export default function ResearchResults() {
  return (
    <section
      className={styles.resultsSection}
      aria-labelledby="research-results-title"
    >
      <div className={styles.sectionContainer}>
        <header className={styles.sectionHeader}>
          <span className={styles.headerSparkle} aria-hidden={true}>
            <Sparkles size={24} strokeWidth={1.7} />
          </span>

          <h2 id="research-results-title">
            Por que a CONG é necessária?
          </h2>

          <p>
            Nossa pesquisa mostrou que organização, centralização e
            facilidade de uso não são apenas diferenciais: são{" "}
            <strong>necessidades reais</strong> para quem participa de ações
            sociais.
          </p>
        </header>

        <div className={styles.researchLayout}>
          <article className={styles.notebookPaper}>
            <span className={styles.paperTape} aria-hidden={true} />

            <span className={styles.paperClip} aria-hidden={true}>
              <i />
            </span>

            <div className={styles.binderHoles} aria-hidden={true}>
              {Array.from({ length: 10 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>

            <div className={styles.paperContent}>
              <header className={styles.paperHeader}>
                <h3>O que descobrimos na pesquisa</h3>
                <span aria-hidden={true} />
              </header>

              <div className={styles.resultsList}>
                {researchResults.map((result) => (
                  <div
                    key={result.value}
                    className={`${styles.resultItem} ${
                      result.tone === "yellow"
                        ? styles.resultYellow
                        : result.tone === "blue"
                          ? styles.resultBlue
                          : styles.resultGreen
                    }`}
                  >
                    <strong>{result.value}</strong>
                    <p>{result.description}</p>
                  </div>
                ))}
              </div>

              <footer className={styles.paperFooter}>
                <span className={styles.paperChart} aria-hidden={true}>
                  <FolderOpen size={27} strokeWidth={1.7} />
                </span>

                <p>
                  <strong>42 respostas</strong> ajudaram a revelar uma
                  percepção clara sobre organização, comunicação e
                  centralização nas ações sociais.
                </p>

                <span className={styles.paperArrow} aria-hidden={true}>
                  ↙
                </span>
              </footer>
            </div>
          </article>

          <article className={styles.clipboard}>
            <div className={styles.clipboardClip} aria-hidden={true}>
              <span />
            </div>

            <div className={styles.clipboardPaper}>
              <header className={styles.clipboardHeader}>
                <h3>O que esses dados revelam</h3>
                <span aria-hidden={true} />
              </header>

              <div className={styles.clipboardContent}>
                <div className={styles.conclusions}>
                  {conclusions.map((conclusion, index) => (
                    <div
                      className={styles.conclusionItem}
                      key={index}
                    >
                      <span
                        className={styles.checkIcon}
                        aria-hidden={true}
                      >
                        <Check size={22} strokeWidth={2.2} />
                      </span>

                      <p>{conclusion}</p>
                    </div>
                  ))}
                </div>

                <aside className={styles.painsNote}>
                  <span className={styles.noteTape} aria-hidden={true} />

                  <span className={styles.noteArrow} aria-hidden={true}>
                    ↘
                  </span>

                  <h4>Principais dores</h4>

                  <ul>
                    {mainPains.map((pain) => (
                      <li key={pain}>{pain}</li>
                    ))}
                  </ul>

                  <Sparkles
                    className={styles.noteSparkle}
                    size={22}
                    strokeWidth={1.7}
                    aria-hidden={true}
                  />
                </aside>
              </div>

              <div className={styles.practicalStrip}>
                <span className={styles.stripTapeLeft} aria-hidden={true} />
                <span className={styles.stripTapeRight} aria-hidden={true} />

                {practicalResults.map((result) => {
                  const Icon = result.icon;

                  return (
                    <div
                      key={result.title}
                      className={`${styles.practicalItem} ${
                        result.tone === "green"
                          ? styles.practicalGreen
                          : result.tone === "blue"
                            ? styles.practicalBlue
                            : styles.practicalYellow
                      }`}
                    >
                      <span
                        className={styles.practicalIcon}
                        aria-hidden={true}
                      >
                        <Icon size={29} strokeWidth={1.7} />
                      </span>

                      <strong>{result.title}</strong>
                    </div>
                  );
                })}
              </div>

              <span
                className={styles.clipboardDecoration}
                aria-hidden={true}
              >
                <HeartHandshake size={24} strokeWidth={1.6} />
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}