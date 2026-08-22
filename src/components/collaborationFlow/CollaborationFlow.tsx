import {
  ArrowDownRight,
  ArrowRight,
  BarChart3,
  Blocks,
  Building2,
  Check,
  Code2,
  Heart,
  Languages,
  Paintbrush,
  Pin,
  Puzzle,
  Sparkles,
  Users,
} from "lucide-react";

import styles from "./CollaborationFlow.module.css";

export default function CollaborationFlow() {
  return (
    <section
      className={styles.collaborationSection}
      aria-labelledby="collaboration-title"
    >
      <div className={styles.sectionContainer}>
        <header className={styles.sectionHeader}>
          <span className={styles.headerDecoration} aria-hidden={true}>
            <Sparkles size={24} strokeWidth={1.7} />
          </span>

          <h2 id="collaboration-title">Como a colaboração acontece</h2>

          <p>
            A ONG pode começar com autonomia, e a comunidade pode ajudar a
            aprimorar, adaptar e ampliar a solução.
          </p>
        </header>

        <div className={styles.flow}>
          <article className={`${styles.flowStep} ${styles.firstStep}`}>
            <div className={styles.visualColumn}>
              <span className={styles.stepNumber}>1</span>

              <div className={styles.needPost}>
                <span className={styles.postPin} aria-hidden={true}>
                  <Pin size={29} strokeWidth={1.7} />
                </span>

                <span className={styles.postLabel}>Necessidade da ONG</span>

                <strong>
                  Precisamos organizar
                  <br />
                  nossos voluntários
                </strong>

                <p>
                  Queremos cadastrar pessoas, distribuir atividades e acompanhar
                  a participação.
                </p>

                <div className={styles.postTags}>
                  <span>Voluntários</span>
                  <span>Organização</span>
                </div>

                <span className={styles.postTape} aria-hidden={true} />
              </div>
            </div>

            <div className={styles.connector} aria-hidden={true}>
              <ArrowRight size={42} strokeWidth={1.5} />
            </div>

            <div className={styles.annotation}>
              <span className={styles.annotationIcon}>
                <Blocks size={24} strokeWidth={1.7} />
              </span>

              <div>
                <span className={styles.annotationEyebrow}>
                  A ONG começa com autonomia
                </span>

                <h3>Ela não precisa esperar por uma equipe técnica</h3>

                <p>
                  Com módulos prontos e uma construção visual, a própria
                  organização pode montar uma primeira solução sem escrever
                  código.
                </p>

                <ul>
                  <li>
                    <Check size={16} strokeWidth={2.2} />
                    Escolhe os módulos necessários
                  </li>

                  <li>
                    <Check size={16} strokeWidth={2.2} />
                    Organiza tudo de forma visual
                  </li>

                  <li>
                    <Check size={16} strokeWidth={2.2} />
                    Adapta a estrutura à própria realidade
                  </li>
                </ul>
              </div>
            </div>
          </article>

          <div className={styles.verticalConnector} aria-hidden={true}>
            <span />
            <ArrowDownRight size={31} strokeWidth={1.6} />
          </div>

          <article className={`${styles.flowStep} ${styles.secondStep}`}>
            <div className={styles.annotation}>
              <span className={styles.annotationIcon}>
                <Users size={24} strokeWidth={1.7} />
              </span>

              <div>
                <span className={styles.annotationEyebrow}>
                  A comunidade ajuda a aprimorar
                </span>

                <h3>A autonomia da ONG não significa trabalhar sozinha</h3>

                <p>
                  Quando precisar, ela pode compartilhar uma necessidade e
                  receber contribuições para melhorar aquilo que já construiu.
                </p>

                <div className={styles.communityNote}>
                  A ONG continua no controle. A comunidade entra para ajudar,
                  não para substituir suas decisões.
                </div>
              </div>
            </div>

            <div className={styles.connector} aria-hidden={true}>
              <ArrowRight size={42} strokeWidth={1.5} />
            </div>

            <div className={styles.communityCollage}>
              <div className={styles.communityCenter}>
                <span className={styles.communityLogo}>
                  <Puzzle size={31} strokeWidth={1.7} />
                </span>

                <strong>CONG</strong>
                <small>Construção colaborativa</small>
              </div>

              <div
                className={`${styles.contributorCard} ${styles.developerCard}`}
              >
                <Code2 size={22} strokeWidth={1.7} />

                <span>
                  <strong>Desenvolvedor</strong>
                  cria e melhora funcionalidades
                </span>
              </div>

              <div
                className={`${styles.contributorCard} ${styles.designerCard}`}
              >
                <Paintbrush size={22} strokeWidth={1.7} />

                <span>
                  <strong>Designer</strong>
                  simplifica a experiência
                </span>
              </div>

              <div
                className={`${styles.contributorCard} ${styles.translatorCard}`}
              >
                <Languages size={22} strokeWidth={1.7} />

                <span>
                  <strong>Tradutor</strong>
                  amplia o acesso
                </span>
              </div>

              <div
                className={`${styles.contributorCard} ${styles.volunteerCard}`}
              >
                <Heart size={22} strokeWidth={1.7} />

                <span>
                  <strong>Voluntário</strong>
                  testa e compartilha sugestões
                </span>
              </div>

              <div
                className={`${styles.contributorCard} ${styles.companyCard}`}
              >
                <Building2 size={22} strokeWidth={1.7} />

                <span>
                  <strong>Empresa</strong>
                  apoia com recursos
                </span>
              </div>

              <svg
                className={styles.communityLines}
                viewBox="0 0 620 430"
                preserveAspectRatio="none"
                aria-hidden={true}
              >
                <path d="M310 215 C310 130 310 100 310 62" />
                <path d="M286 210 C230 170 196 145 135 124" />
                <path d="M334 210 C390 170 424 145 485 124" />
                <path d="M286 232 C225 278 195 304 137 328" />
                <path d="M334 232 C395 278 425 304 483 328" />
              </svg>
            </div>
          </article>

          <div
            className={`${styles.verticalConnector} ${styles.lastConnector}`}
            aria-hidden={true}
          >
            <span />
            <ArrowDownRight size={31} strokeWidth={1.6} />
          </div>

          <article className={`${styles.flowStep} ${styles.thirdStep}`}>
            <div className={styles.solutionWindow}>
              <div className={styles.windowBar}>
                <div>
                  <span />
                  <span />
                  <span />
                </div>

                <small>cong.org/minha-ong</small>
              </div>

              <div className={styles.windowContent}>
                <aside>
                  <span className={styles.windowLogo}>C</span>

                  <Users size={19} strokeWidth={1.7} />
                  <Blocks size={19} strokeWidth={1.7} />
                  <BarChart3 size={19} strokeWidth={1.7} />
                </aside>

                <div className={styles.windowMain}>
                  <div className={styles.windowHeading}>
                    <div>
                      <small>Minha organização</small>
                      <strong>Gestão de voluntários</strong>
                    </div>

                    <span>
                      <Check size={14} strokeWidth={2.2} />
                      Solução em uso
                    </span>
                  </div>

                  <div className={styles.windowCards}>
                    <div>
                      <Users size={20} strokeWidth={1.7} />

                      <span>
                        <strong>Cadastro de voluntários</strong>
                        128 pessoas registradas
                      </span>

                      <Check size={17} strokeWidth={2.1} />
                    </div>

                    <div>
                      <Blocks size={20} strokeWidth={1.7} />

                      <span>
                        <strong>Distribuição de atividades</strong>
                        Equipes e escalas organizadas
                      </span>

                      <Check size={17} strokeWidth={2.1} />
                    </div>

                    <div>
                      <BarChart3 size={20} strokeWidth={1.7} />

                      <span>
                        <strong>Acompanhamento</strong>
                        Participação e impacto registrados
                      </span>

                      <Check size={17} strokeWidth={2.1} />
                    </div>
                  </div>
                </div>
              </div>

              <span className={styles.windowTape} aria-hidden={true} />
            </div>

            <div className={styles.connector} aria-hidden={true}>
              <ArrowRight size={42} strokeWidth={1.5} />
            </div>

            <div className={styles.annotation}>
              <span className={styles.annotationIcon}>
                <BarChart3 size={24} strokeWidth={1.7} />
              </span>

              <div>
                <span className={styles.annotationEyebrow}>
                  A solução evolui e gera impacto
                </span>

                <h3>O resultado continua pertencendo à organização</h3>

                <p>
                  A ONG utiliza a solução, mantém sua autonomia e pode continuar
                  adaptando o sistema conforme suas necessidades mudam.
                </p>

                <div className={styles.impactPoints}>
                  <span>
                    <strong>Mais autonomia</strong>
                    para gerir os próprios processos
                  </span>

                  <span>
                    <strong>Mais eficiência</strong>
                    com informações centralizadas
                  </span>

                  <span>
                    <strong>Mais alcance</strong>
                    porque a solução pode ajudar outras ONGs
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <footer className={styles.sectionClosing}>
          <span className={styles.closingIcon} aria-hidden={true}>
            <Heart size={25} strokeWidth={1.7} />
          </span>

          <p>
            O que nasce para resolver uma necessidade pode ser
            <strong> aprimorado, compartilhado e reutilizado</strong> por muitas
            outras organizações.
          </p>
        </footer>
      </div>
    </section>
  );
}