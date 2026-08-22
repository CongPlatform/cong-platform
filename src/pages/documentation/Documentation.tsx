import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Code2,
  Database,
  ExternalLink,
  FileCode2,
  FileText,
  GitBranch,
  HeartHandshake,
  Layers3,
  LayoutDashboard,
  Library,
  LockKeyhole,
  Network,
  PackageCheck,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
  XCircle,
} from "lucide-react";

import { FaGithub } from "react-icons/fa";

import {
  SiGit,
  SiGithub,
  SiNodedotjs,
  SiPostgresql,
  SiReact,
  SiTypescript,
} from "react-icons/si";

import styles from "./Documentation.module.css";
import mascote from "../../assets/mascot/cong-default.webp";

const repositoryUrl = "https://github.com/CongPlatform/cong-platform";

const projectAuthors = [
  {
    name: "André Mendes",
    initials: "AM",
    role: "Desenvolvimento Web",
    username: "@mendezandre",
    Github: "https://Github.com/mendezandre",
  },
  {
    name: "João Palumbo",
    initials: "JP",
    role: "Documentação e Pesquisa",
    username: "@joaofelipe7",
    Github: "https://Github.com/joaofelipe7",
  },
  {
    name: "Kelvin Palka",
    initials: "KP",
    role: "Liderança e Desenvolvimento",
    username: "@KelvinPalka",
    Github: "https://Github.com/KelvinPalka",
  },
] as const;

const technologies = [
  {
    title: "React + TypeScript",
    description:
      "Interface componentizada, tipada e preparada para evolução contínua.",
    icon: Code2,
    tone: "blue",
  },
  {
    title: "Node.js e APIs",
    description:
      "Serviços e integrações para conectar os módulos da plataforma.",
    icon: Network,
    tone: "green",
  },
  {
    title: "PostgreSQL",
    description:
      "Persistência relacional para dados operacionais e históricos.",
    icon: Database,
    tone: "purple",
  },
  {
    title: "Arquitetura SaaS",
    description: "Estrutura multi-tenant com isolamento entre as organizações.",
    icon: Layers3,
    tone: "yellow",
  },
  {
    title: "Git e GitHub",
    description: "Versionamento, revisão de código e colaboração open-source.",
    icon: FaGithub,
    tone: "navy",
  },
  {
    title: "Aplicação responsiva",
    description: "Experiência acessível em computadores, tablets e celulares.",
    icon: LayoutDashboard,
    tone: "teal",
  },
] as const;

const technologyDocs = [
  {
    name: "React",
    href: "https://react.dev/",
    icon: SiReact,
    tone: "reactTech",
  },
  {
    name: "TypeScript",
    href: "https://www.typescriptlang.org/docs/",
    icon: SiTypescript,
    tone: "typescriptTech",
  },
  {
    name: "Node.js",
    href: "https://nodejs.org/docs/latest/api/",
    icon: SiNodedotjs,
    tone: "nodeTech",
  },
  {
    name: "PostgreSQL",
    href: "https://www.postgresql.org/docs/",
    icon: SiPostgresql,
    tone: "postgresTech",
  },
  {
    name: "Git",
    href: "https://git-scm.com/doc",
    icon: SiGit,
    tone: "gitTech",
  },
  {
    name: "GitHub",
    href: "https://docs.Github.com/",
    icon: SiGithub,
    tone: "GithubTech",
  },
] as const;

const modules = [
  {
    title: "Beneficiários",
    description: "Cadastros, histórico de atendimento e acompanhamento social.",
    icon: UsersRound,
    tone: "blue",
  },
  {
    title: "Voluntários",
    description:
      "Perfis, disponibilidade, atividades e participação em projetos.",
    icon: HeartHandshake,
    tone: "green",
  },
  {
    title: "Doações",
    description:
      "Entradas, campanhas, comprovantes e transparência dos recursos.",
    icon: PackageCheck,
    tone: "yellow",
  },
  {
    title: "Estoque",
    description: "Movimentações, itens disponíveis e alertas de reposição.",
    icon: Boxes,
    tone: "purple",
  },
  {
    title: "Projetos",
    description: "Objetivos, responsáveis, etapas e evolução das iniciativas.",
    icon: Workflow,
    tone: "orange",
  },
  {
    title: "Relatórios",
    description: "Indicadores operacionais e dados para prestação de contas.",
    icon: FileText,
    tone: "teal",
  },
  {
    title: "Agenda",
    description: "Eventos, compromissos, ações e atividades recorrentes.",
    icon: LayoutDashboard,
    tone: "pink",
  },
  {
    title: "Documentos",
    description:
      "Organização de arquivos, registros e conhecimento institucional.",
    icon: Library,
    tone: "navy",
  },
] as const;

const expectedBehaviors = [
  "Tratar outras pessoas com respeito.",
  "Ser paciente com iniciantes e explicar decisões com clareza.",
  "Fazer críticas construtivas e aceitar opiniões diferentes.",
  "Manter discussões focadas no projeto.",
  "Reconhecer contribuições realizadas por outras pessoas.",
  "Colaborar para melhorar a comunidade e a plataforma.",
];

const unacceptableBehaviors = [
  "Ataques pessoais, ofensas, humilhações ou provocações.",
  "Comentários preconceituosos, discriminatórios ou assédio de qualquer tipo.",
  "Exposição indevida de dados pessoais.",
  "Desrespeito a ONGs, beneficiários, voluntários ou colaboradores.",
  "Uso do projeto para fins maliciosos.",
  "Discussões agressivas ou sem relação com o propósito do projeto.",
];

const contributionOptions = [
  "Código e correções de bugs",
  "Documentação",
  "Sugestões de módulos",
  "Protótipos e ideias de interface",
  "Testes",
  "Melhorias de acessibilidade",
  "Traduções",
];

const branchExamples = `feature/beneficiaries-module
feature/dashboard
fix/login-validation
docs/readme-update
docs/architecture
design/module-builder-prototype`;

const commitExamples = `feat: add beneficiaries module
fix: correct login validation
docs: update project vision
style: adjust dashboard layout
refactor: reorganize module structure
test: add module tests
chore: update repository configuration`;

const licenseText = `MIT License

Copyright (c) 2026 CONG contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function Documentation() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.heroDoodleOne} aria-hidden="true">
          ✦
        </span>
        <span className={styles.heroDoodleTwo} aria-hidden="true">
          ✧
        </span>

        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>Central de documentação</span>

            <h1>
              Entenda, construa
              <br />e evolua a <span>CONG.</span>
            </h1>

            <p>
              Uma visão integrada do produto, da arquitetura e das regras que
              orientam a colaboração. Aqui também estão o guia de contribuição,
              o código de conduta e a licença do projeto.
            </p>

            <div className={styles.heroActions}>
              <a href="#visao-geral" className={styles.primaryButton}>
                Explorar documentação
                <ArrowDown aria-hidden="true" />
              </a>

              <a
                href={repositoryUrl}
                className={styles.secondaryButton}
                target="_blank"
                rel="noreferrer"
              >
                Ver repositório
                <FaGithub aria-hidden="true" />
              </a>
            </div>

            <div className={styles.heroMetadata}>
              <span>
                <FileCode2 aria-hidden="true" />
                Projeto open-source
              </span>
              <span>
                <GitBranch aria-hidden="true" />
                Desenvolvimento colaborativo
              </span>
              <span>
                <HeartHandshake aria-hidden="true" />
                Tecnologia para impacto social
              </span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.heroPaper}>
              <span className={styles.heroTape} />
              <span className={styles.paperHoles} />

              <div className={styles.paperTopline}>
                <BookOpen />
                <span>Documentação CONG</span>
              </div>

              <div className={styles.paperTitle}>
                Uma base comum para produto, código e comunidade.
              </div>

              <div className={styles.paperRows}>
                <span>
                  <CheckCircle2 /> Visão do produto
                </span>
                <span>
                  <CheckCircle2 /> Padrões de contribuição
                </span>
                <span>
                  <CheckCircle2 /> Convivência e licença
                </span>
              </div>
            </div>

            <img src={mascote} alt="" className={styles.heroMascot} />
          </div>
        </div>
      </section>

      <section className={styles.docsLayout}>
        <aside
          className={styles.sidebar}
          aria-label="Navegação da documentação"
        >
          <div className={styles.sidebarCard}>
            <span className={styles.sidebarLabel}>Documentação</span>

            <nav className={styles.sidebarNav}>
              <a href="#visao-geral">
                <LayoutDashboard />
                Visão geral
              </a>
              <a href="#modulos">
                <Boxes />
                Módulos
              </a>
              <a href="#arquitetura">
                <Layers3 />
                Arquitetura
              </a>
              <a href="#roadmap">
                <Rocket />
                Roadmap
              </a>
              <a href="#tecnologias">
                <Code2 />
                Tecnologias
              </a>
              <a href="#contribuindo">
                <GitBranch />
                Como contribuir
              </a>
              <a href="#conduta">
                <ShieldCheck />
                Código de conduta
              </a>
              <a href="#licenca">
                <Scale />
                Licença
              </a>
            </nav>
          </div>

          <div className={styles.sidebarCompactCard}>
            <span className={styles.sidebarLabel}>Tecnologias</span>

            <div className={styles.sidebarTechLinks}>
              {technologyDocs.map((technology) => {
                const TechnologyIcon = technology.icon;

                return (
                  <a
                    className={`${styles.sidebarTechLink} ${styles[technology.tone]}`}
                    href={technology.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir documentação oficial do ${technology.name}`}
                    title={technology.name}
                    key={technology.name}
                  >
                    <TechnologyIcon aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className={styles.sidebarStatus}>
            <span className={styles.statusDot} />
            <div>
              <strong>Em desenvolvimento</strong>
              <p>
                A documentação acompanha a evolução da plataforma e pode mudar
                conforme novas decisões forem validadas.
              </p>
            </div>
          </div>

          <div className={styles.sidebarCompactCard}>
            <span className={styles.sidebarLabel}>Autores</span>

            <div className={styles.sidebarAuthorsCompact}>
              {projectAuthors.map((author) => (
                <a
                  className={styles.sidebarAuthorAvatar}
                  href={author.Github}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Abrir GitHub de ${author.name}`}
                  title={`${author.name} — ${author.username}`}
                  key={author.name}
                >
                  {author.initials}
                </a>
              ))}
            </div>
          </div>
        </aside>

        <article className={styles.content}>
          <section id="visao-geral" className={styles.docSection}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${styles.blue}`}>
                <Sparkles />
              </span>
              <div>
                <span className={styles.sectionEyebrow}>Produto</span>
                <h2>Visão geral da CONG</h2>
              </div>
            </header>

            <p className={styles.sectionLead}>
              A CONG é uma plataforma modular para organizações sociais. Cada
              ONG poderá montar seu ambiente operacional escolhendo módulos
              prontos e adaptando fluxos às próprias necessidades.
            </p>

            <div className={styles.highlightGrid}>
              <article className={styles.highlightCard}>
                <span className={`${styles.cardIcon} ${styles.blue}`}>
                  <Boxes />
                </span>
                <h3>Modular</h3>
                <p>
                  A organização ativa apenas os recursos que fazem sentido para
                  sua realidade.
                </p>
              </article>

              <article className={styles.highlightCard}>
                <span className={`${styles.cardIcon} ${styles.green}`}>
                  <UsersRound />
                </span>
                <h3>Acessível</h3>
                <p>
                  A experiência é pensada para equipes sociais, inclusive
                  pessoas sem formação técnica.
                </p>
              </article>

              <article className={styles.highlightCard}>
                <span className={`${styles.cardIcon} ${styles.yellow}`}>
                  <Network />
                </span>
                <h3>Colaborativa</h3>
                <p>
                  Comunidade, desenvolvedores e ONGs podem melhorar o projeto em
                  conjunto.
                </p>
              </article>
            </div>

            <div className={styles.problemSolutionGrid}>
              <article className={styles.problemCard}>
                <span className={styles.miniLabel}>Problema atual</span>
                <h3>Informações fragmentadas e processos manuais</h3>
                <ul>
                  <li>Planilhas e ferramentas desconectadas.</li>
                  <li>Dificuldade para acompanhar dados e atendimentos.</li>
                  <li>Sistemas caros ou pouco adaptáveis.</li>
                </ul>
              </article>

              <article className={styles.solutionCard}>
                <span className={styles.miniLabel}>Proposta CONG</span>
                <h3>Uma base operacional que se adapta à organização</h3>
                <ul>
                  <li>Módulos combináveis em um único ambiente.</li>
                  <li>Dados centralizados e fluxos organizados.</li>
                  <li>Evolução gradual conforme a ONG cresce.</li>
                </ul>
              </article>
            </div>
          </section>

          <section id="modulos" className={styles.docSection}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${styles.purple}`}>
                <Boxes />
              </span>
              <div>
                <span className={styles.sectionEyebrow}>Produto modular</span>
                <h2>Módulos previstos</h2>
              </div>
            </header>

            <p className={styles.sectionLead}>
              Os módulos abaixo representam a visão inicial do produto. Eles
              serão priorizados e refinados a partir da pesquisa com
              organizações e da validação do protótipo.
            </p>

            <div className={styles.moduleGrid}>
              {modules.map((module) => {
                const ModuleIcon = module.icon;

                return (
                  <article className={styles.moduleCard} key={module.title}>
                    <span
                      className={`${styles.moduleIcon} ${styles[module.tone]}`}
                    >
                      <ModuleIcon />
                    </span>
                    <div>
                      <h3>{module.title}</h3>
                      <p>{module.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="arquitetura" className={styles.docSection}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${styles.teal}`}>
                <Layers3 />
              </span>
              <div>
                <span className={styles.sectionEyebrow}>Base técnica</span>
                <h2>Arquitetura e princípios</h2>
              </div>
            </header>

            <p className={styles.sectionLead}>
              A arquitetura ainda está em definição. A direção atual prioriza
              uma plataforma modular, escalável e preparada para separar com
              segurança os dados de diferentes organizações.
            </p>

            <div className={styles.architectureFlow}>
              <article>
                <span>01</span>
                <Code2 />
                <div>
                  <h3>Interface web</h3>
                  <p>React e TypeScript para componentes reutilizáveis.</p>
                </div>
              </article>

              <ArrowRight className={styles.flowArrow} aria-hidden="true" />

              <article>
                <span>02</span>
                <Network />
                <div>
                  <h3>Serviços</h3>
                  <p>API e regras de negócio organizadas por domínio.</p>
                </div>
              </article>

              <ArrowRight className={styles.flowArrow} aria-hidden="true" />

              <article>
                <span>03</span>
                <Database />
                <div>
                  <h3>Dados</h3>
                  <p>Persistência confiável e isolamento entre organizações.</p>
                </div>
              </article>
            </div>

            <div className={styles.principlesGrid}>
              <div>
                <ShieldCheck />
                <strong>Segurança desde a base</strong>
                <p>
                  Controle de acesso, privacidade e responsabilidade com dados.
                </p>
              </div>
              <div>
                <Layers3 />
                <strong>Baixo acoplamento</strong>
                <p>Módulos evoluem sem tornar toda a plataforma dependente.</p>
              </div>
              <div>
                <LayoutDashboard />
                <strong>Experiência simples</strong>
                <p>
                  Fluxos claros para pessoas com diferentes níveis de domínio.
                </p>
              </div>
            </div>
          </section>

          <section id="roadmap" className={styles.docSection}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${styles.orange}`}>
                <Rocket />
              </span>
              <div>
                <span className={styles.sectionEyebrow}>Evolução</span>
                <h2>Roadmap inicial</h2>
              </div>
            </header>

            <div className={styles.roadmap}>
              <article>
                <span className={styles.roadNumber}>01</span>
                <div>
                  <small>Pesquisa e definição</small>
                  <h3>Compreender necessidades reais</h3>
                  <p>
                    Consolidar entrevistas, requisitos e aprendizados do estudo
                    de caso.
                  </p>
                </div>
              </article>

              <article>
                <span className={styles.roadNumber}>02</span>
                <div>
                  <small>Protótipo</small>
                  <h3>Validar os fluxos principais</h3>
                  <p>
                    Testar a experiência, a seleção de módulos e a organização
                    dos dados.
                  </p>
                </div>
              </article>

              <article>
                <span className={styles.roadNumber}>03</span>
                <div>
                  <small>MVP</small>
                  <h3>Entregar uma primeira versão funcional</h3>
                  <p>
                    Implementar a fundação da plataforma e os módulos
                    priorizados.
                  </p>
                </div>
              </article>

              <article>
                <span className={styles.roadNumber}>04</span>
                <div>
                  <small>Comunidade</small>
                  <h3>Expandir com colaboração aberta</h3>
                  <p>
                    Evoluir padrões, módulos e documentação com novas
                    contribuições.
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section id="tecnologias" className={styles.docSection}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${styles.purple}`}>
                <Code2 />
              </span>
              <div>
                <span className={styles.sectionEyebrow}>Base técnica</span>
                <h2>Tecnologias do projeto</h2>
              </div>
            </header>

            <p className={styles.sectionLead}>
              A stack acompanha a natureza modular e colaborativa da CONG. As
              decisões técnicas seguem em evolução e devem priorizar clareza,
              acessibilidade, segurança e facilidade de manutenção.
            </p>

            <div className={styles.technologyGrid}>
              {technologies.map((technology) => {
                const TechnologyIcon = technology.icon;

                return (
                  <article
                    className={styles.technologyCard}
                    key={technology.title}
                  >
                    <span
                      className={`${styles.technologyIcon} ${styles[technology.tone]}`}
                    >
                      <TechnologyIcon aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{technology.title}</h3>
                      <p>{technology.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className={styles.technologyNote}>
              <CircleAlert aria-hidden="true" />
              <p>
                A arquitetura ainda está sendo validada. Tecnologias podem ser
                substituídas quando testes e requisitos reais indicarem uma
                opção mais adequada para as ONGs.
              </p>
            </div>
          </section>

          <section id="contribuindo" className={styles.docSection}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${styles.green}`}>
                <GitBranch />
              </span>
              <div>
                <span className={styles.sectionEyebrow}>Open-source</span>
                <h2>Guia de contribuição</h2>
              </div>
            </header>

            <p className={styles.sectionLead}>
              Você pode ajudar com código, documentação, pesquisa, design,
              testes, acessibilidade ou sugestões de novos módulos. Toda
              contribuição deve ser organizada e respeitar os padrões do
              projeto.
            </p>

            <div className={styles.contributionOptions}>
              {contributionOptions.map((option) => (
                <span key={option}>
                  <CheckCircle2 />
                  {option}
                </span>
              ))}
            </div>

            <div className={styles.guideGrid}>
              <article className={styles.guideCard}>
                <span className={styles.guideStep}>01</span>
                <h3>Crie uma branch</h3>
                <p>
                  Comece a partir da branch de desenvolvimento e evite
                  alterações diretas na <code>main</code>.
                </p>
                <pre>
                  <code>{branchExamples}</code>
                </pre>
              </article>

              <article className={styles.guideCard}>
                <span className={styles.guideStep}>02</span>
                <h3>Use commits claros</h3>
                <p>
                  Prefira mensagens pequenas e objetivas, identificando o tipo
                  de alteração realizada.
                </p>
                <pre>
                  <code>{commitExamples}</code>
                </pre>
              </article>
            </div>

            <article className={styles.pullRequestCard}>
              <span className={`${styles.cardIcon} ${styles.blue}`}>
                <FileCode2 />
              </span>
              <div>
                <h3>Ao abrir um Pull Request</h3>
                <ul>
                  <li>
                    Explique o que foi alterado e por que a mudança foi feita.
                  </li>
                  <li>Informe quais partes do projeto foram afetadas.</li>
                  <li>
                    Destaque pontos que precisam de atenção durante a revisão.
                  </li>
                  <li>
                    Relacione o Pull Request a uma issue quando for possível.
                  </li>
                  <li>Revise o código e a documentação antes de enviar.</li>
                </ul>
              </div>
            </article>

            <article className={styles.moduleSuggestion}>
              <CircleAlert />
              <div>
                <h3>Ao sugerir um módulo</h3>
                <p>
                  Descreva o problema resolvido, o tipo de ONG beneficiada, as
                  funcionalidades principais e possíveis dependências com outros
                  módulos.
                </p>
              </div>
            </article>

            <a
              className={styles.sourceLink}
              href={`${repositoryUrl}/blob/main/CONTRIBUTING.md`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir CONTRIBUTING.md completo
              <ExternalLink />
            </a>
          </section>

          <section id="conduta" className={styles.docSection}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${styles.blue}`}>
                <ShieldCheck />
              </span>
              <div>
                <span className={styles.sectionEyebrow}>Comunidade</span>
                <h2>Código de conduta</h2>
              </div>
            </header>

            <div className={styles.commitmentCard}>
              <HeartHandshake />
              <div>
                <h3>Nosso compromisso</h3>
                <p>
                  A CONG deve ser um ambiente aberto, acolhedor e respeitoso
                  para estudantes, desenvolvedores, designers, voluntários, ONGs
                  e demais colaboradores, independentemente de experiência,
                  formação, idade, aparência, origem, idioma ou área de atuação.
                </p>
              </div>
            </div>

            <div className={styles.behaviorGrid}>
              <article className={styles.expectedCard}>
                <header>
                  <CheckCircle2 />
                  <h3>Comportamentos esperados</h3>
                </header>
                <ul>
                  {expectedBehaviors.map((behavior) => (
                    <li key={behavior}>{behavior}</li>
                  ))}
                </ul>
              </article>

              <article className={styles.unacceptableCard}>
                <header>
                  <XCircle />
                  <h3>Comportamentos não aceitos</h3>
                </header>
                <ul>
                  {unacceptableBehaviors.map((behavior) => (
                    <li key={behavior}>{behavior}</li>
                  ))}
                </ul>
              </article>
            </div>

            <div className={styles.enforcementGrid}>
              <article>
                <UsersRound />
                <h3>Responsabilidade coletiva</h3>
                <p>
                  Todos os colaboradores devem ajudar a manter um ambiente
                  saudável e comunicar problemas aos responsáveis pelo projeto.
                </p>
              </article>

              <article>
                <LockKeyhole />
                <h3>Aplicação</h3>
                <p>
                  Comentários, issues, Pull Requests ou contribuições que violem
                  o código poderão ser removidos. Casos graves podem resultar no
                  impedimento de participação.
                </p>
              </article>
            </div>

            <a
              className={styles.sourceLink}
              href={`${repositoryUrl}/blob/main/CODE_OF_CONDUCT.md`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir CODE_OF_CONDUCT.md completo
              <ExternalLink />
            </a>
          </section>

          <section id="licenca" className={styles.docSection}>
            <header className={styles.sectionHeader}>
              <span className={`${styles.sectionIcon} ${styles.yellow}`}>
                <Scale />
              </span>

              <div>
                <span className={styles.sectionEyebrow}>Uso do projeto</span>
                <h2>Licenciamento e direitos de uso</h2>
              </div>
            </header>

            <div className={styles.licenseSummary}>
              <Scale />

              <div>
                <h3>Código aberto, identidade protegida</h3>

                <p>
                  O código-fonte da CONG é distribuído sob a MIT License, que
                  permite usar, copiar, modificar e redistribuir o software nos
                  termos definidos no arquivo LICENSE.
                </p>

                <p>
                  A licença de software não se aplica automaticamente ao nome
                  CONG, aos logotipos, ao mascote, à identidade visual nem às
                  fotografias e retratos dos integrantes da equipe. Esses
                  materiais possuem regras próprias de uso.
                </p>
              </div>
            </div>

            <pre className={styles.licenseText}>
              <code>{licenseText}</code>
            </pre>

            <a
              className={styles.sourceLink}
              href={`${repositoryUrl}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir LICENSE — código-fonte
              <ExternalLink />
            </a>

            <a
              className={styles.sourceLink}
              href={`${repositoryUrl}/blob/main/BRAND.md`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir BRAND.md — marca e identidade visual
              <ExternalLink />
            </a>

            <a
              className={styles.sourceLink}
              href={`${repositoryUrl}/blob/main/MEDIA_RIGHTS.md`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir MEDIA_RIGHTS.md — fotografias e retratos
              <ExternalLink />
            </a>

            <a
              className={styles.sourceLink}
              href={`${repositoryUrl}/blob/main/SECURITY.md`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir SECURITY.md — política de segurança
              <ExternalLink />
            </a>
          </section>

          <section className={styles.finalCard}>
            <span className={styles.finalTape} aria-hidden="true" />
            <span className={styles.finalIcon}>
              <FaGithub />
            </span>
            <span className={styles.finalEyebrow}>
              A documentação também é código
            </span>
            <h2>
              Encontrou algo desatualizado?
              <span> Ajude a melhorar.</span>
            </h2>
            <p>
              Sugestões, correções e novas explicações são contribuições
              valiosas para tornar a CONG mais acessível a ONGs e colaboradores.
            </p>
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.primaryButton}
            >
              Contribuir no GitHub
              <ArrowRight />
            </a>
          </section>
        </article>
      </section>
    </main>
  );
}
