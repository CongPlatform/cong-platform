import {
  type CSSProperties,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";
import {
  ArrowDown,
  ArrowRight,
  Blocks,
  BookOpen,
  BriefcaseBusiness,
  ChefHat,
  CircleCheckBig,
  Code2,
  Coffee,
  Database,
  FileText,
  Gamepad2,
  Goal,
  HandHeart,
  HeartHandshake,
  Lightbulb,
  Mail,
  MessageCircleHeart,
  Music2,
  PencilLine,
  Rocket,
  Sparkles,
  Stethoscope,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";

import styles from "./About.module.css";

import andrePhoto from "../../assets/team/andre-mendes.webp";
import joaoPhoto from "../../assets/team/joao-palumbo.webp";
import bigCong from "../../assets/mascot/cong-muscular-medalist.webp";
import kelvinPhoto from "../../assets/team/kelvin-palka.webp";

type ChapterTone = "yellow" | "blue" | "purple" | "green";
type MemberTone = "memberBlue" | "memberPurple" | "memberGreen";

interface StoryChapter {
  date: string;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  highlight: string;
  icon: LucideIcon;
  tone: ChapterTone;
}

interface TeamMember {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  age: number;
  role: string;
  education: string[];
  photo: string;
  quote: string;
  dream: string;
  dreamIcon: LucideIcon;
  contribution: string;
  connection: string;
  interests: {
    label: string;
    icon: LucideIcon;
  }[];
  highlight?: string;
  tone: MemberTone;
  links: {
    github: string;
    linkedin: string;
    email: string;
  };
}

const storyChapters: StoryChapter[] = [
  {
    date: "09/02",
    eyebrow: "Antes de existir um produto",
    title: "Existia uma vontade em comum.",
    description:
      "Éramos um grupo de amigos procurando um tema para o TCC. Ainda não sabíamos exatamente o que desenvolver, mas já tínhamos uma certeza: queríamos criar algo social, útil e capaz de continuar existindo depois da apresentação.",
    note: "O projeto começou com uma escolha: usar aquilo que sabíamos para ajudar alguém.",
    highlight: "propósito",
    icon: HeartHandshake,
    tone: "yellow",
  },
  {
    date: "19/02",
    eyebrow: "Um problema real apareceu",
    title: "Conhecemos a rotina de uma ONG.",
    description:
      "A primeira oportunidade surgiu com a Alimento Para Todos. Conhecemos seu sistema, seus processos e dificuldades reais, como informações fragmentadas, tarefas manuais e limitações na organização dos atendimentos.",
    note: "O que antes era apenas uma ideia passou a ter pessoas, desafios e necessidades reais.",
    highlight: "realidade",
    icon: UsersRound,
    tone: "blue",
  },
  {
    date: "27/05",
    eyebrow: "A descoberta que mudou tudo",
    title: "O problema não pertencia a uma única organização.",
    description:
      "Durante a pesquisa, percebemos que outras ONGs também conviviam com planilhas espalhadas, aplicativos desconectados, falta de suporte técnico e sistemas difíceis de adaptar.",
    note: "Em vez de construir uma resposta fechada, decidimos criar uma base que pudesse atender muitas realidades.",
    highlight: "escala",
    icon: Lightbulb,
    tone: "purple",
  },
  {
    date: "CONG",
    eyebrow: "Uma ideia grande demais para esperar",
    title: "Nasceu o Construtor Operacional para ONGs.",
    description:
      "A CONG transformou o projeto em uma plataforma modular, colaborativa e acessível. Agora, diferentes organizações podem escolher módulos, adaptar fluxos e montar sistemas de acordo com suas próprias necessidades.",
    note: "A Alimento Para Todos não saiu da história. Tornou-se o estudo de caso e a primeira validação prática da plataforma.",
    highlight: "impacto",
    icon: Blocks,
    tone: "green",
  },
];

const teamMembers: TeamMember[] = [
  {
    id: "andre",
    name: "André Mendes Moura",
    firstName: "André",
    initials: "AM",
    age: 17,
    role: "Desenvolvedor Web",
    education: ["Técnico em Desenvolvimento de Sistemas"],
    photo: andrePhoto,
    quote:
      "Persistir até que o objetivo deixe de ser apenas uma ideia e se transforme em resultado.",
    dream:
      "Pretende seguir carreira como Engenheiro de Dados, trabalhando com informação, tecnologia e decisões orientadas por dados.",
    dreamIcon: Database,
    contribution:
      "Na CONG, André transforma conceitos e protótipos em páginas, componentes e experiências funcionais para as organizações.",
    connection:
      "Mesmo desejando seguir uma área diferente no futuro, encontrou no desenvolvimento web uma forma de contribuir agora com causas sociais.",
    interests: [
      { label: "Futebol", icon: Goal },
      { label: "Brawl Stars", icon: Gamepad2 },
      { label: "Animes", icon: Sparkles },
    ],
    tone: "memberBlue",
    links: {
      github: "https://github.com/mendezandre",
      linkedin: "https://www.linkedin.com/in/andre-mendes-9a3418397/",
      email: "andremendesmoura1309@gmail.com",
    },
  },
  {
    id: "joao",
    name: "João Felipe Rocha Palumbo",
    firstName: "João",
    initials: "JP",
    age: 17,
    role: "Documentação e Pesquisa",
    education: ["Técnico em Desenvolvimento de Sistemas", "Barista"],
    photo: joaoPhoto,
    quote: "Entre a espada e o sentimento, sigo em frente.",
    dream:
      "Sonha em abrir sua própria cafeteria, unindo hospitalidade, criatividade, música e experiências marcantes.",
    dreamIcon: Coffee,
    contribution:
      "João registra a evolução da CONG por meio de pesquisas, relatórios, documentos e organização das decisões do projeto.",
    connection:
      "Sua participação mostra que impacto social não é construído apenas com programação. Pesquisar, escrever, registrar e comunicar também transformam ideias em soluções.",
    interests: [
      { label: "Djavan", icon: Music2 },
      { label: "Culinária", icon: ChefHat },
      { label: "Café", icon: Coffee },
    ],
    tone: "memberPurple",
    links: {
      github: "https://github.com/joaofelipe7",
      linkedin:
        "https://www.linkedin.com/in/joão-felipe-rocha-palumbo-3a4b5c6d7/",
      email: "joaofeliperocha77@gmail.com",
    },
  },
  {
    id: "kelvin",
    name: "Kelvin Willian Palka de Souza",
    firstName: "Kelvin",
    initials: "KS",
    age: 17,
    role: "Líder do Projeto e Desenvolvedor Web",
    education: [
      "Técnico em Desenvolvimento de Sistemas",
      "Técnico em Marketing",
    ],
    photo: kelvinPhoto,
    quote: "Tudo posso Naquele que me fortalece.",
    dream:
      "Pretende seguir Medicina, com interesse especial pelas áreas de Pediatria e Cardiologia.",
    dreamIcon: Stethoscope,
    contribution:
      "Kelvin atua na liderança, no planejamento, no desenvolvimento web, na identidade e na visão de crescimento da CONG.",
    connection:
      "Mesmo planejando seguir a Medicina, utiliza desde agora conhecimentos de tecnologia e marketing para fortalecer organizações e projetos sociais.",
    interests: [
      { label: "Leitura", icon: BookOpen },
      { label: "Culinária", icon: ChefHat },
      { label: "Projetos sociais", icon: HandHeart },
    ],
    highlight:
      "Também é um dos autores do Solidarize, projeto sobre estratégias de marketing para ONGs.",
    tone: "memberGreen",
    links: {
      github: "https://github.com/KelvinPalka",
      linkedin: "https://www.linkedin.com/in/kelvin-souza-1ab484368/",
      email: "kelvinpalka07@gmail.com",
    },
  },
];

export default function About() {
  const pageRef = useRef<HTMLElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  useEffect(() => {
    const page = pageRef.current;

    if (!page) {
      return;
    }

    const elements = Array.from(
      page.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotion.matches) {
      elements.forEach((element) => element.classList.add(styles.visible));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add(styles.visible);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px",
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reducedMotion.matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveChapter(
        (currentChapter) => (currentChapter + 1) % storyChapters.length,
      );
    }, 6500);

    return () => window.clearInterval(interval);
  }, []);

  const currentChapter = storyChapters[activeChapter];
  const CurrentChapterIcon = currentChapter.icon;

  const handleEmptyLink = (
    event: MouseEvent<HTMLAnchorElement>,
    link: string,
  ) => {
    if (!link) {
      event.preventDefault();
    }
  };

  return (
    <main ref={pageRef} className={styles.aboutPage}>
      <section className={styles.hero}>
        <span className={styles.heroGlow} aria-hidden="true" />
        <span className={styles.heroDoodleTopLeft} aria-hidden="true">
          ✧
        </span>
        <span className={styles.heroDoodleLeft} aria-hidden="true">
          ✦
        </span>
        <span className={styles.heroDoodleTopRight} aria-hidden="true">
          ✦
        </span>
        <span className={styles.heroDoodleRight} aria-hidden="true">
          ✧
        </span>

        <div className={styles.heroInner}>
          <div className={styles.heroVisualLeft} aria-hidden="true">
            <svg
              className={`${styles.noteConnector} ${styles.noteConnectorLeft}`}
              viewBox="0 0 370 700"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M40 256 C-4 286 -4 390 48 420 C72 434 98 434 118 424" />
              <path d="M250 468 C320 484 342 534 322 570 C310 590 290 604 266 612" />
            </svg>

            <article
              className={`${styles.storyNote} ${styles.storyNoteMain} ${styles.leftMainNote}`}
            >
              <span
                className={`${styles.noteTape} ${styles.noteTapeStriped}`}
              />
              <span className={styles.paperHoles} />

              <div className={styles.noteDate}>09/02</div>

              <div className={styles.noteTitleLine}>
                <PencilLine />
                <strong>
                  Ideia inicial <span>do TCC</span>
                </strong>
              </div>

              <p>
                Queríamos desenvolver
                <br />
                um TCC com um
                <br />
                tema social.
              </p>

              <HeartHandshake className={styles.noteCornerIcon} />
            </article>

            <article
              className={`${styles.storyNote} ${styles.storyNoteCompact} ${styles.leftMiddleNote}`}
            >
              <UsersRound className={styles.greenIcon} />
              <p>
                Com o propósito de
                <br />
                ajudar alguém de
                <br />
                verdade.
              </p>
              <span className={styles.noteSparkle}>✦</span>
            </article>

            <article
              className={`${styles.storyNote} ${styles.storyNoteWide} ${styles.leftBottomNote}`}
            >
              <span className={`${styles.noteTape} ${styles.noteTapeGrid}`} />
              <span className={styles.paperHoles} />
              <Lightbulb className={styles.yellowIcon} />
              <p>
                Acreditávamos que nossas
                <br />
                habilidades poderiam gerar
                <br />
                um impacto positivo na
                <br />
                <span className={styles.blueUnderline}>comunidade.</span>
              </p>
              <span className={styles.orangeSparkle}>✦</span>
            </article>
          </div>

          <div className={styles.heroContent}>
            <span className={styles.heroEyebrow}>Sobre a CONG</span>

            <h1>
              A CONG
              <br />
              começou com
              <br />
              <span className={styles.heroHighlight}>propósito.</span>
            </h1>

            <p>
              Uma ideia de TCC cresceu quando três estudantes
              <br className={styles.desktopBreak} /> perceberam que aquilo que
              sabiam fazer também
              <br className={styles.desktopBreak} /> poderia fortalecer
              organizações sociais.
            </p>

            <div className={styles.heroActions}>
              <a href="#historia" className={styles.primaryButton}>
                Conhecer nossa história
                <ArrowDown aria-hidden="true" />
              </a>

              <a href="#equipe" className={styles.secondaryButton}>
                Conhecer a equipe
                <UsersRound aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className={styles.heroVisualRight} aria-hidden="true">
            <svg
              className={`${styles.noteConnector} ${styles.noteConnectorRight}`}
              viewBox="0 0 370 700"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M326 226 C372 256 374 352 322 384 C300 398 276 400 256 394" />
              <path d="M44 472 C-4 506 -4 600 48 630 C70 644 96 648 116 642" />
            </svg>

            <article
              className={`${styles.storyNote} ${styles.storyNoteTopRight} ${styles.rightTopNote}`}
            >
              <span className={styles.paperClip} />
              <span className={`${styles.noteTape} ${styles.noteTapePurple}`} />

              <div className={styles.noteDate}>27/05</div>

              <div className={styles.rightNoteRow}>
                <span className={styles.alertDoodle}>!</span>
                <p>
                  O problema era
                  <br />
                  maior do que uma
                  <br />
                  única <span className={styles.blueUnderline}>ONG.</span>
                </p>
              </div>
            </article>

            <article
              className={`${styles.storyNote} ${styles.storyNoteRightMiddle} ${styles.rightMiddleNote}`}
            >
              <span
                className={`${styles.noteTape} ${styles.noteTapeSoftYellow}`}
              />
              <UsersRound className={styles.blueIcon} />
              <p>
                Conversamos com
                <br />
                outras ONG’s e vimos
                <br />
                que o desafio era
                <br />
                <span className={styles.blueUnderline}>compartilhado.</span>
              </p>
            </article>

            <article
              className={`${styles.storyNote} ${styles.storyNoteRightBottom} ${styles.rightBottomNote}`}
            >
              <span className={`${styles.noteTape} ${styles.noteTapeGrid}`} />
              <span className={styles.paperHoles} />
              <Lightbulb className={styles.blueIcon} />
              <p>
                Testamos, ajustamos
                <br />
                e construímos um
                <br />
                <span className={styles.blueUnderline}>protótipo</span> com o
                que
                <br />
                realmente fazia sentido.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="historia" className={styles.storySection}>
        <header
          className={`${styles.sectionHeader} ${styles.reveal}`}
          data-reveal
        >
          <span className={styles.sectionEyebrow}>
            Do diário de bordo à plataforma
          </span>

          <h2>
            Uma história construída
            <span> etapa por etapa.</span>
          </h2>

          <p>
            A CONG não apareceu pronta. Ela mudou conforme pesquisávamos,
            conhecíamos pessoas e entendíamos que o problema poderia ser muito
            maior que a primeira solução.
          </p>
        </header>

        <div className={`${styles.storyLayout} ${styles.reveal}`} data-reveal>
          <div
            className={styles.storyTimeline}
            role="tablist"
            aria-label="Etapas da história da CONG"
          >
            {storyChapters.map((chapter, index) => {
              const ChapterIcon = chapter.icon;
              const isActive = activeChapter === index;

              return (
                <button
                  key={`${chapter.date}-${chapter.title}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={[
                    styles.timelineButton,
                    isActive ? styles.timelineButtonActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setActiveChapter(index)}
                >
                  <span className={styles.timelineMarker}>
                    <ChapterIcon aria-hidden="true" />
                  </span>

                  <span className={styles.timelineText}>
                    <small>{chapter.date}</small>
                    <strong>{chapter.title}</strong>
                  </span>
                </button>
              );
            })}
          </div>

          <article
            key={activeChapter}
            className={[
              styles.storyPanel,
              styles[`chapter${currentChapter.tone}`],
            ].join(" ")}
            role="tabpanel"
          >
            <span className={styles.storyPanelTape} />

            <div className={styles.storyPanelTop}>
              <span className={styles.storyPanelIcon}>
                <CurrentChapterIcon aria-hidden="true" />
              </span>

              <div>
                <span className={styles.storyPanelEyebrow}>
                  {currentChapter.eyebrow}
                </span>
                <small>{currentChapter.date}</small>
              </div>
            </div>

            <h3>{currentChapter.title}</h3>
            <p>{currentChapter.description}</p>

            <blockquote>
              <Sparkles aria-hidden="true" />
              <span>{currentChapter.note}</span>
            </blockquote>

            <div className={styles.storyKeyword}>
              <span>O que aprendemos:</span>
              <strong>{currentChapter.highlight}</strong>
            </div>

            <span className={styles.storyPanelDoodle} aria-hidden="true">
              ✦
            </span>
          </article>
        </div>
      </section>

      <section className={styles.transitionSection}>
        <div
          className={`${styles.transitionContent} ${styles.reveal}`}
          data-reveal
        >
          <span className={styles.transitionLabel}>
            A mudança que definiu o projeto
          </span>

          <div className={styles.transformation}>
            <article className={styles.oldProject}>
              <span className={styles.transformationIcon}>
                <FileText aria-hidden="true" />
              </span>
              <small>Antes</small>
              <strong>Um sistema para uma única organização</strong>
            </article>

            <div className={styles.transformationArrow}>
              <span />
              <Rocket aria-hidden="true" />
              <span />
            </div>

            <article className={styles.newProject}>
              <span className={styles.transformationIcon}>
                <Blocks aria-hidden="true" />
              </span>
              <small>Agora</small>
              <strong>Uma plataforma para muitas realidades</strong>
            </article>
          </div>

          <h2>A ONG original não saiu da história.</h2>
          <p>
            Ela se tornou nosso estudo de caso, nossa fonte de requisitos reais
            e a primeira oportunidade de validar como a CONG pode funcionar na
            prática.
          </p>
        </div>
      </section>

      <section id="equipe" className={styles.teamSection}>
        <header
          className={`${styles.sectionHeader} ${styles.teamHeader} ${styles.reveal}`}
          data-reveal
        >
          <span className={styles.sectionEyebrow}>Quem está construindo</span>

          <h2>
            Pessoas diferentes.
            <span> Um propósito em comum.</span>
          </h2>

          <p>
            Não queremos seguir as mesmas profissões, não gostamos das mesmas
            coisas e não contribuímos da mesma forma. Ainda assim, encontramos
            na CONG um lugar onde nossas diferenças ajudam a construir impacto.
          </p>
        </header>

        <div className={styles.teamGrid}>
          {teamMembers.map((member, index) => {
            const DreamIcon = member.dreamIcon;
            const isExpanded = expandedMember === member.id;

            return (
              <article
                key={member.id}
                className={[
                  styles.memberCard,
                  styles[member.tone],
                  styles.reveal,
                  isExpanded ? styles.memberCardExpanded : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-reveal
                style={{ "--member-index": index } as CSSProperties}
              >
                <div className={styles.memberPhotoArea}>
                  <span className={styles.memberPhotoTape} />

                  <div className={styles.memberPhoto}>
                    <span className={styles.memberInitials}>
                      {member.initials}
                    </span>

                    <img
                      src={member.photo}
                      alt={`Foto de ${member.name}`}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  <span className={styles.memberAge}>{member.age} anos</span>
                </div>

                <div className={styles.memberContent}>
                  <span className={styles.memberRole}>{member.role}</span>
                  <h3>{member.name}</h3>

                  <div className={styles.educationList}>
                    {member.education.map((education) => (
                      <span key={education}>{education}</span>
                    ))}
                  </div>

                  <blockquote className={styles.memberQuote}>
                    “{member.quote}”
                  </blockquote>

                  <div className={styles.memberInterests}>
                    {member.interests.map((interest) => {
                      const InterestIcon = interest.icon;

                      return (
                        <span key={interest.label}>
                          <InterestIcon aria-hidden="true" />
                          {interest.label}
                        </span>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className={styles.memberToggle}
                    aria-expanded={isExpanded}
                    onClick={() => {
                      setExpandedMember((currentMember) =>
                        currentMember === member.id ? null : member.id,
                      );
                    }}
                  >
                    {isExpanded
                      ? "Fechar trajetória"
                      : `Conhecer a trajetória de ${member.firstName}`}
                    <ArrowRight aria-hidden="true" />
                  </button>

                  <div
                    className={styles.memberDetails}
                    aria-hidden={!isExpanded}
                  >
                    <div className={styles.memberDetailBlock}>
                      <span className={styles.detailIcon}>
                        <DreamIcon aria-hidden="true" />
                      </span>

                      <div>
                        <small>Meu caminho</small>
                        <p>{member.dream}</p>
                      </div>
                    </div>

                    <div className={styles.memberDetailBlock}>
                      <span className={styles.detailIcon}>
                        <HandHeart aria-hidden="true" />
                      </span>

                      <div>
                        <small>Como contribuo</small>
                        <p>{member.contribution}</p>
                      </div>
                    </div>

                    <div className={styles.memberConnection}>
                      <Sparkles aria-hidden="true" />
                      <p>{member.connection}</p>
                    </div>

                    {member.highlight && (
                      <div className={styles.memberHighlight}>
                        <CircleCheckBig aria-hidden="true" />
                        <span>{member.highlight}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.memberSocials}>
                    <a
                      href={member.links.github || undefined}
                      target={member.links.github ? "_blank" : undefined}
                      rel={member.links.github ? "noreferrer" : undefined}
                      aria-label={`GitHub de ${member.name}`}
                      aria-disabled={!member.links.github}
                      className={
                        !member.links.github ? styles.socialDisabled : undefined
                      }
                      onClick={(event) =>
                        handleEmptyLink(event, member.links.github)
                      }
                    >
                      <FaGithub aria-hidden="true" />
                    </a>

                    <a
                      href={member.links.linkedin || undefined}
                      target={member.links.linkedin ? "_blank" : undefined}
                      rel={member.links.linkedin ? "noreferrer" : undefined}
                      aria-label={`LinkedIn de ${member.name}`}
                      aria-disabled={!member.links.linkedin}
                      className={
                        !member.links.linkedin
                          ? styles.socialDisabled
                          : undefined
                      }
                      onClick={(event) =>
                        handleEmptyLink(event, member.links.linkedin)
                      }
                    >
                      <FaLinkedin aria-hidden="true" />
                    </a>

                    <a
                      href={
                        member.links.email
                          ? `mailto:${member.links.email}`
                          : undefined
                      }
                      aria-label={`E-mail de ${member.name}`}
                      aria-disabled={!member.links.email}
                      className={
                        !member.links.email ? styles.socialDisabled : undefined
                      }
                      onClick={(event) =>
                        handleEmptyLink(event, member.links.email)
                      }
                    >
                      <Mail aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.sharedPurpose}>
        <div
          className={`${styles.sharedPurposeInner} ${styles.reveal}`}
          data-reveal
        >
          <header className={styles.sharedPurposeText}>
            <span className={styles.sectionEyebrow}>
              O que nossas histórias mostram
            </span>

            <h2>
              Você não precisa saber fazer tudo para
              <span> começar a fazer sua parte.</span>
            </h2>

            <p>
              A CONG é construída por pessoas com interesses, habilidades e
              futuros diferentes. O que nos conecta é a decisão de transformar
              aquilo que já sabemos em apoio para quem gera impacto social.
            </p>
          </header>

          <div className={styles.contributionVisual}>
            <article
              className={`${styles.contributionTag} ${styles.developmentTag}`}
            >
              <span className={styles.contributionIcon}>
                <Code2 aria-hidden="true" />
              </span>

              <span>
                <small>Construir soluções</small>
                <strong>Desenvolvimento</strong>
              </span>
            </article>

            <article
              className={`${styles.contributionTag} ${styles.designTag}`}
            >
              <span className={styles.contributionIcon}>
                <Sparkles aria-hidden="true" />
              </span>

              <span>
                <small>Criar experiências</small>
                <strong>Design</strong>
              </span>
            </article>

            <article
              className={`${styles.contributionTag} ${styles.researchTag}`}
            >
              <span className={styles.contributionIcon}>
                <BookOpen aria-hidden="true" />
              </span>

              <span>
                <small>Entender necessidades</small>
                <strong>Pesquisa</strong>
              </span>
            </article>

            <article
              className={`${styles.contributionTag} ${styles.documentationTag}`}
            >
              <span className={styles.contributionIcon}>
                <FileText aria-hidden="true" />
              </span>

              <span>
                <small>Registrar conhecimento</small>
                <strong>Documentação</strong>
              </span>
            </article>

            <article
              className={`${styles.contributionTag} ${styles.communicationTag}`}
            >
              <span className={styles.contributionIcon}>
                <MessageCircleHeart aria-hidden="true" />
              </span>

              <span>
                <small>Aproximar pessoas</small>
                <strong>Comunicação</strong>
              </span>
            </article>

            <article
              className={`${styles.contributionTag} ${styles.managementTag}`}
            >
              <span className={styles.contributionIcon}>
                <BriefcaseBusiness aria-hidden="true" />
              </span>

              <span>
                <small>Organizar caminhos</small>
                <strong>Gestão</strong>
              </span>
            </article>

            <div className={styles.contributionCenter}>
              <span className={styles.centerSparkleOne} aria-hidden="true">
                ✦
              </span>

              <span className={styles.centerSparkleTwo} aria-hidden="true">
                ✧
              </span>

              <img
                src={bigCong}
                alt="Mascote da CONG representando diferentes formas de contribuir"
                className={styles.bigCong}
              />
            </div>

            <div className={styles.contributionMessage}>
              <strong>
                Toda habilidade
                <br />
                pode gerar impacto.
              </strong>

              <span>O importante é decidir onde você pode ajudar.</span>
            </div>
          </div>

          <p className={styles.contributionConclusion}>
            Não importa se sua habilidade está no código, no cuidado, na escrita
            ou na organização. Ela pode se tornar parte de algo maior.
          </p>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={`${styles.finalCard} ${styles.reveal}`} data-reveal>
          <span className={styles.finalTape} />

          <div className={styles.finalIcon}>
            <HeartHandshake aria-hidden="true" />
          </div>

          <span className={styles.finalEyebrow}>
            Agora a história também pode incluir você
          </span>

          <h2>
            Não seguimos o mesmo caminho.
            <span> Mas escolhemos construir impacto juntos.</span>
          </h2>

          <p>
            Desenvolvimento, design, pesquisa, comunicação, organização ou
            apenas disposição para aprender: existe espaço para transformar o
            que você sabe em apoio para uma causa social.
          </p>

          <div className={styles.finalActions}>
            <TransitionLink to="/comunidade" className={styles.primaryButton}>
              Fazer parte da comunidade
              <ArrowRight aria-hidden="true" />
            </TransitionLink>

            <TransitionLink to="/como-funciona" className={styles.secondaryButton}>
              Entender como funciona
              <Blocks aria-hidden="true" />
            </TransitionLink>
          </div>

          <span className={styles.finalDoodle} aria-hidden="true">
            a próxima peça
            <br />
            pode ser sua
          </span>
        </div>
      </section>
    </main>
  );
}
