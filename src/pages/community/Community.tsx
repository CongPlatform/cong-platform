import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Code2,
  FileText,
  FolderKanban,
  HandHeart,
  Heart,
  Lightbulb,
  MessageCircle,
  PenTool,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";

import styles from "./Community.module.css";

type AreaId =
  | "todos"
  | "desenvolvimento"
  | "design"
  | "pesquisa"
  | "documentacao"
  | "voluntariado"
  | "ongs";

type AreaTone = "blue" | "yellow" | "green" | "purple";

type Area = {
  id: AreaId;
  label: string;
  icon: LucideIcon;
  tone: AreaTone;
  eyebrow: string;
  title: string;
  description: string;
  contributions: string[];
  examplePost: {
    type: string;
    title: string;
    description: string;
    icon: LucideIcon;
  };
  exampleProject: {
    name: string;
    description: string;
    status: string;
  };
  exampleOpportunity: {
    title: string;
    level: string;
  };
};

type CommunityPost = {
  id: string;
  area: Exclude<AreaId, "todos">;
  type: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  tone: AreaTone;
};

type Project = {
  id: string;
  area: Exclude<AreaId, "todos">;
  name: string;
  description: string;
  status: string;
  progress: number;
};

type Opportunity = {
  id: string;
  area: Exclude<AreaId, "todos">;
  title: string;
  level: string;
  icon: LucideIcon;
};

const areas: Area[] = [
  {
    id: "todos",
    label: "Visão geral",
    icon: Sparkles,
    tone: "blue",
    eyebrow: "A comunidade inteira",
    title: "Pessoas diferentes constroem uma solução em conjunto.",
    description:
      "A CONG aproxima necessidades de organizações, habilidades da comunidade e projetos que continuam evoluindo de forma aberta.",
    contributions: [
      "ONGs compartilham desafios e contexto.",
      "Pessoas colaboram em diferentes áreas.",
      "Projetos registram decisões e resultados.",
    ],
    examplePost: {
      type: "Atualização da comunidade",
      title: "Uma necessidade virou um projeto colaborativo",
      description:
        "Pesquisa, design, desenvolvimento e documentação se conectaram para organizar o fluxo de voluntários.",
      icon: MessageCircle,
    },
    exampleProject: {
      name: "Módulo de voluntários",
      description: "Uma solução construída por várias áreas.",
      status: "Em desenvolvimento",
    },
    exampleOpportunity: {
      title: "Escolha onde você pode ajudar",
      level: "Todas as experiências",
    },
  },
  {
    id: "desenvolvimento",
    label: "Desenvolvimento",
    icon: Code2,
    tone: "yellow",
    eyebrow: "Código com propósito",
    title: "Necessidades reais se transformam em ferramentas utilizáveis.",
    description:
      "A comunidade de desenvolvimento cria componentes, integrações, APIs, testes e módulos que ajudam organizações a trabalhar melhor.",
    contributions: [
      "Implementar funcionalidades e módulos.",
      "Corrigir erros e melhorar acessibilidade.",
      "Revisar código e apoiar novas pessoas.",
    ],
    examplePost: {
      type: "Projeto atualizado",
      title: "O cadastro de voluntários ganhou validações mais claras",
      description:
        "A mudança reduziu erros no preenchimento e melhorou a navegação por teclado.",
      icon: Code2,
    },
    exampleProject: {
      name: "Módulo de voluntários",
      description: "Cadastro, disponibilidade e acompanhamento.",
      status: "72% concluído",
    },
    exampleOpportunity: {
      title: "Melhorar a acessibilidade do cadastro",
      level: "Iniciante",
    },
  },
  {
    id: "design",
    label: "Design",
    icon: PenTool,
    tone: "green",
    eyebrow: "Experiências acessíveis",
    title: "Interfaces claras aproximam pessoas das soluções.",
    description:
      "Design ajuda a transformar processos complexos em experiências simples, coerentes e acessíveis para equipes de ONGs e colaboradores.",
    contributions: [
      "Criar fluxos, protótipos e componentes.",
      "Revisar usabilidade e hierarquia visual.",
      "Defender acessibilidade desde o início.",
    ],
    examplePost: {
      type: "Revisão de experiência",
      title: "O painel de impacto ficou mais fácil de interpretar",
      description:
        "Novos agrupamentos e contrastes destacam os indicadores mais importantes.",
      icon: PenTool,
    },
    exampleProject: {
      name: "Painel de impacto",
      description: "Indicadores claros para decisões e prestação de contas.",
      status: "Em prototipação",
    },
    exampleOpportunity: {
      title: "Revisar a experiência do painel",
      level: "Intermediário",
    },
  },
  {
    id: "pesquisa",
    label: "Pesquisa",
    icon: Search,
    tone: "purple",
    eyebrow: "Escuta antes da solução",
    title: "Contexto real evita que a comunidade construa por suposição.",
    description:
      "Pesquisa conversa com organizações, observa rotinas, organiza evidências e valida se uma ideia realmente resolve o problema certo.",
    contributions: [
      "Entrevistar equipes e pessoas atendidas.",
      "Mapear processos, obstáculos e prioridades.",
      "Validar hipóteses e resultados.",
    ],
    examplePost: {
      type: "Pesquisa publicada",
      title: "Como ONGs organizam seus voluntários hoje",
      description:
        "Relatos mostram onde planilhas, mensagens e controles manuais deixam de funcionar.",
      icon: Search,
    },
    exampleProject: {
      name: "Mapa de necessidades",
      description: "Uma base contínua de desafios reais das organizações.",
      status: "Coleta aberta",
    },
    exampleOpportunity: {
      title: "Entrevistar organizações parceiras",
      level: "Iniciante",
    },
  },
  {
    id: "documentacao",
    label: "Documentação",
    icon: FileText,
    tone: "blue",
    eyebrow: "Conhecimento compartilhado",
    title: "Decisões bem registradas tornam o projeto acessível e sustentável.",
    description:
      "Documentação explica produto, código, processos e acordos para que mais pessoas consigam aprender, contribuir e manter a CONG.",
    contributions: [
      "Escrever guias e tutoriais claros.",
      "Registrar decisões técnicas e de produto.",
      "Revisar exemplos, termos e instruções.",
    ],
    examplePost: {
      type: "Guia atualizado",
      title: "O processo de contribuição ganhou um passo a passo",
      description:
        "A nova estrutura ajuda quem está fazendo sua primeira contribuição open-source.",
      icon: BookOpen,
    },
    exampleProject: {
      name: "Base de conhecimento",
      description: "Produto, arquitetura e colaboração em um só lugar.",
      status: "Em construção",
    },
    exampleOpportunity: {
      title: "Documentar o fluxo de integração",
      level: "Iniciante",
    },
  },
  {
    id: "voluntariado",
    label: "Voluntariado",
    icon: Heart,
    tone: "yellow",
    eyebrow: "Tempo, cuidado e colaboração",
    title: "Nem toda contribuição precisa começar pelo código.",
    description:
      "Pessoas voluntárias apoiam organização, revisão, comunicação, testes, acolhimento e conexão entre necessidades e quem pode ajudar.",
    contributions: [
      "Acolher e orientar novas pessoas.",
      "Testar fluxos e revisar conteúdos.",
      "Organizar ideias, tarefas e conversas.",
    ],
    examplePost: {
      type: "Pedido de ajuda",
      title: "Precisamos de apoio para revisar novas sugestões",
      description:
        "A atividade ajuda a encaminhar cada ideia para a área mais adequada.",
      icon: HandHeart,
    },
    exampleProject: {
      name: "Rede de apoio",
      description: "Pessoas disponíveis conectadas a demandas reais.",
      status: "Em descoberta",
    },
    exampleOpportunity: {
      title: "Apoiar a triagem de novas ideias",
      level: "Sem experiência técnica",
    },
  },
  {
    id: "ongs",
    label: "ONGs",
    icon: UsersRound,
    tone: "green",
    eyebrow: "O ponto de partida",
    title: "As organizações orientam o que precisa ser construído.",
    description:
      "ONGs compartilham desafios, participam das decisões, testam soluções e mantêm autonomia sobre os processos e resultados.",
    contributions: [
      "Publicar necessidades com contexto.",
      "Validar propostas e protótipos.",
      "Acompanhar a evolução da solução.",
    ],
    examplePost: {
      type: "Necessidade publicada",
      title: "Precisamos organizar nossa agenda de atividades",
      description:
        "A organização busca reduzir controles manuais e facilitar o trabalho da equipe.",
      icon: UsersRound,
    },
    exampleProject: {
      name: "Fluxo de doações",
      description: "Entradas, destinos e comprovantes organizados.",
      status: "Em validação",
    },
    exampleOpportunity: {
      title: "Compartilhar uma necessidade da organização",
      level: "Aberto a ONGs",
    },
  },
];

const getAreaLabel = (areaId: Exclude<AreaId, "todos">) =>
  areas.find((area) => area.id === areaId)?.label ?? areaId;

const posts: CommunityPost[] = [
  {
    id: "post-development",
    area: "desenvolvimento",
    type: "Projeto atualizado",
    title: "Módulo de voluntários ganhou um novo fluxo",
    description:
      "A comunidade simplificou o cadastro de disponibilidade e o acompanhamento de atividades.",
    detail:
      "A atualização reúne melhorias de acessibilidade, organização das informações e mensagens de retorno mais claras.",
    icon: Code2,
    tone: "yellow",
  },
  {
    id: "post-design",
    area: "design",
    type: "Revisão de experiência",
    title: "O painel de impacto está mais fácil de entender",
    description:
      "Novas hierarquias, contrastes e componentes foram propostos para tornar os indicadores mais claros.",
    detail:
      "A revisão visual está aberta para comentários antes de seguir para implementação.",
    icon: PenTool,
    tone: "green",
  },
  {
    id: "post-research",
    area: "pesquisa",
    type: "Pesquisa publicada",
    title: "Como ONGs organizam seus voluntários hoje",
    description:
      "Relatos de organizações ajudam a comunidade a entender rotinas, obstáculos e prioridades reais.",
    detail:
      "Os resultados serão usados para validar o módulo de voluntários e orientar os próximos testes.",
    icon: Search,
    tone: "purple",
  },
  {
    id: "post-docs",
    area: "documentacao",
    type: "Conhecimento compartilhado",
    title: "O guia de contribuição recebeu uma nova estrutura",
    description:
      "O processo para escolher tarefas, criar branches e abrir Pull Requests ficou mais direto.",
    detail:
      "A documentação foi reorganizada para acolher pessoas com diferentes níveis de experiência.",
    icon: BookOpen,
    tone: "blue",
  },
  {
    id: "post-volunteer",
    area: "voluntariado",
    type: "Pedido de ajuda",
    title: "Precisamos de apoio para revisar novas ideias",
    description:
      "Pessoas voluntárias podem ajudar a classificar sugestões e encaminhá-las para as áreas certas.",
    detail:
      "A atividade não exige conhecimento técnico e pode ser realizada de forma assíncrona.",
    icon: HandHeart,
    tone: "yellow",
  },
  {
    id: "post-ong",
    area: "ongs",
    type: "Necessidade publicada",
    title: "Uma ONG quer organizar sua agenda de atividades",
    description:
      "A organização busca reduzir controles manuais e facilitar o acompanhamento da equipe.",
    detail:
      "A necessidade pode envolver pesquisa, design, desenvolvimento e validação com usuários reais.",
    icon: UsersRound,
    tone: "green",
  },
];

const projects: Project[] = [
  {
    id: "project-volunteers",
    area: "desenvolvimento",
    name: "Módulo de voluntários",
    description: "Cadastro, disponibilidade e acompanhamento de atividades.",
    status: "Em desenvolvimento",
    progress: 72,
  },
  {
    id: "project-impact",
    area: "design",
    name: "Painel de impacto",
    description: "Indicadores claros para decisões e prestação de contas.",
    status: "Planejamento",
    progress: 38,
  },
  {
    id: "project-research",
    area: "pesquisa",
    name: "Mapa de necessidades",
    description: "Pesquisa contínua sobre desafios enfrentados por organizações.",
    status: "Pesquisa",
    progress: 31,
  },
  {
    id: "project-docs",
    area: "documentacao",
    name: "Base de conhecimento",
    description: "Guias públicos sobre produto, código e colaboração.",
    status: "Em construção",
    progress: 49,
  },
  {
    id: "project-support",
    area: "voluntariado",
    name: "Rede de apoio",
    description: "Conexão entre pessoas disponíveis e demandas reais.",
    status: "Descoberta",
    progress: 24,
  },
  {
    id: "project-donations",
    area: "ongs",
    name: "Fluxo de doações",
    description: "Registro de entradas, destinos e comprovantes.",
    status: "Validação",
    progress: 61,
  },
];

const opportunities: Opportunity[] = [
  {
    id: "opportunity-development",
    area: "desenvolvimento",
    title: "Melhorar a acessibilidade do cadastro",
    level: "Iniciante",
    icon: Code2,
  },
  {
    id: "opportunity-design",
    area: "design",
    title: "Revisar a experiência do painel",
    level: "Intermediário",
    icon: PenTool,
  },
  {
    id: "opportunity-research",
    area: "pesquisa",
    title: "Entrevistar organizações parceiras",
    level: "Iniciante",
    icon: Search,
  },
  {
    id: "opportunity-docs",
    area: "documentacao",
    title: "Documentar o fluxo de integração",
    level: "Iniciante",
    icon: BookOpen,
  },
  {
    id: "opportunity-volunteer",
    area: "voluntariado",
    title: "Apoiar a triagem de novas sugestões",
    level: "Iniciante",
    icon: Heart,
  },
  {
    id: "opportunity-ong",
    area: "ongs",
    title: "Compartilhar uma necessidade da organização",
    level: "Aberto",
    icon: UsersRound,
  },
];


const heroWords: Array<{
  word: string;
  label: string;
  area: Exclude<AreaId, "todos">;
  icon: LucideIcon;
}> = [
  {
    word: "código",
    label: "Desenvolvimento",
    area: "desenvolvimento",
    icon: Code2,
  },
  {
    word: "design",
    label: "Design",
    area: "design",
    icon: PenTool,
  },
  {
    word: "pesquisa",
    label: "Pesquisa",
    area: "pesquisa",
    icon: Search,
  },
  {
    word: "documentação",
    label: "Documentação",
    area: "documentacao",
    icon: FileText,
  },
  {
    word: "voluntariado",
    label: "Voluntariado",
    area: "voluntariado",
    icon: Heart,
  },
  {
    word: "causas reais",
    label: "ONGs",
    area: "ongs",
    icon: UsersRound,
  },
];

const steps = [
  {
    number: "01",
    title: "Escolha uma área",
    text: "Encontre o tipo de contribuição que combina com suas habilidades.",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "Explore a comunidade",
    text: "Acompanhe projetos, publicações e necessidades reais de ONGs.",
    icon: Search,
  },
  {
    number: "03",
    title: "Contribua",
    text: "Compartilhe código, design, pesquisa, documentação ou apoio.",
    icon: HandHeart,
  },
  {
    number: "04",
    title: "Acompanhe o impacto",
    text: "Veja como a solução evolui e continua pertencendo à organização.",
    icon: BadgeCheck,
  },
];

export default function Community() {
  const [activeArea, setActiveArea] = useState<AreaId>("todos");
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [heroWordIndex, setHeroWordIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroWordIndex((current) => (current + 1) % heroWords.length);
    }, 2400);

    return () => window.clearInterval(intervalId);
  }, []);

  const activeAreaData =
    areas.find((area) => area.id === activeArea) ?? areas[0];
  const ActiveAreaIcon = activeAreaData.icon;
  const ExamplePostIcon = activeAreaData.examplePost.icon;
  const SelectedPostIcon = selectedPost?.icon ?? MessageCircle;
  const currentHeroWord = heroWords[heroWordIndex];

  const visiblePosts = posts.slice(0, 3);
  const visibleProjects = projects.slice(0, 3);
  const visibleOpportunities = opportunities.slice(0, 3);

  const chooseArea = (area: AreaId, shouldScroll = false) => {
    setActiveArea(area);

    if (shouldScroll) {
      requestAnimationFrame(() => {
        document
          .getElementById("explorar-comunidade")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span
          className={`${styles.heroDoodle} ${styles.heroDoodleOne}`}
          aria-hidden="true"
        >
          <Sparkles />
        </span>

        <span
          className={`${styles.heroDoodle} ${styles.heroDoodleTwo}`}
          aria-hidden="true"
        >
          <Sparkles />
        </span>

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Comunidade CONG</span>

          <h1>
            <span className={styles.heroFixedTitle}>
              Uma comunidade feita de
            </span>

            <span className={styles.heroDynamicLine}>
              <span className={styles.heroWordSlot} aria-live="polite">
                <span
                  key={currentHeroWord.word}
                  className={styles.heroChangingWord}
                >
                  {currentHeroWord.word}
                </span>
              </span>

              <span className={styles.heroTitleDot} aria-hidden="true">
                .
              </span>
            </span>
          </h1>

          <p>
            Cada área contribui de um jeito. Juntas, elas conectam pessoas,
            organizações e projetos para transformar necessidades reais em
            soluções compartilhadas.
          </p>

          <div className={styles.heroActions}>
            <a href="#comunidade-em-movimento" className={styles.primaryButton}>
              Ver a comunidade em ação
              <ArrowRight aria-hidden="true" />
            </a>

            <a href="#explorar-comunidade" className={styles.secondaryButton}>
              Conhecer cada área
              <UsersRound aria-hidden="true" />
            </a>
          </div>

          <div className={styles.heroTopicsBlock}>
            <div className={styles.heroTopicsHeading}>
              <span>Conheça quem constrói a comunidade</span>
              <small>
                Clique em uma área para abrir sua apresentação e seus exemplos.
              </small>
            </div>

            <div className={styles.heroTopics}>
              {heroWords.map(({ word, label, area, icon: Icon }, index) => (
                <button
                  key={area}
                  type="button"
                  className={
                    heroWordIndex === index ? styles.heroTopicActive : undefined
                  }
                  onClick={() => {
                    setHeroWordIndex(index);
                    chooseArea(area, true);
                  }}
                >
                  <span>
                    <Icon aria-hidden="true" />
                  </span>

                  <strong>{label}</strong>
                  <small>{word}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="explorar-comunidade"
        className={`${styles.section} ${styles.areaSection}`}
      >
        <header className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Conheça por dentro</span>
          <h2>Escolha uma área e veja como ela participa</h2>
          <p>
            Cada opção abre uma apresentação própria, com o papel daquela área
            e exemplos de publicação, projeto e oportunidade dentro da comunidade.
          </p>
        </header>

        <div className={styles.areaExperience}>
          <div
            className={styles.areaTabs}
            role="tablist"
            aria-label="Escolher uma área da comunidade"
          >
            {areas.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeArea === id}
                aria-controls="area-community-view"
                className={activeArea === id ? styles.activeTab : undefined}
                onClick={() => chooseArea(id)}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <article
            id="area-community-view"
            key={activeArea}
            role="tabpanel"
            className={`${styles.areaShowcase} ${styles[activeAreaData.tone]}`}
          >
            <div className={styles.areaOverview}>
              <div className={styles.areaIdentity}>
                <span>
                  <ActiveAreaIcon aria-hidden="true" />
                </span>

                <div>
                  <small>Você está conhecendo</small>
                  <strong>{activeAreaData.label}</strong>
                </div>
              </div>

              <span className={styles.areaEyebrow}>
                {activeAreaData.eyebrow}
              </span>

              <h3>{activeAreaData.title}</h3>
              <p>{activeAreaData.description}</p>

              <ul className={styles.areaContributionList}>
                {activeAreaData.contributions.map((contribution) => (
                  <li key={contribution}>
                    <CheckCircle2 aria-hidden="true" />
                    {contribution}
                  </li>
                ))}
              </ul>

              <a href="#oportunidades" className={styles.areaAction}>
                Conhecer oportunidades
                <ArrowRight aria-hidden="true" />
              </a>
            </div>

            <div className={styles.areaExamples}>
              <header className={styles.examplesHeader}>
                <div>
                  <span>Como aparece na plataforma</span>
                  <strong>Exemplos de {activeAreaData.label.toLowerCase()}</strong>
                </div>
                <small>Prévia institucional</small>
              </header>

              <article className={styles.examplePublication}>
                <span className={styles.exampleIcon}>
                  <ExamplePostIcon aria-hidden="true" />
                </span>

                <div>
                  <small>{activeAreaData.examplePost.type}</small>
                  <h4>{activeAreaData.examplePost.title}</h4>
                  <p>{activeAreaData.examplePost.description}</p>
                </div>

                <MessageCircle aria-hidden="true" className={styles.exampleComment} />
              </article>

              <div className={styles.exampleCards}>
                <article className={styles.exampleProject}>
                  <span>
                    <FolderKanban aria-hidden="true" />
                    Projeto
                  </span>
                  <strong>{activeAreaData.exampleProject.name}</strong>
                  <p>{activeAreaData.exampleProject.description}</p>
                  <small>{activeAreaData.exampleProject.status}</small>
                </article>

                <article className={styles.exampleOpportunity}>
                  <span>
                    <HandHeart aria-hidden="true" />
                    Oportunidade
                  </span>
                  <strong>{activeAreaData.exampleOpportunity.title}</strong>
                  <p>{activeAreaData.exampleOpportunity.level}</p>
                  <ArrowRight aria-hidden="true" />
                </article>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        id="comunidade-em-movimento"
        className={`${styles.section} ${styles.movementSection}`}
      >
        <header className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Conteúdo da plataforma</span>
          <h2>A comunidade em movimento</h2>
          <p>
            Uma prévia do que poderá aparecer no feed público: atualizações,
            pesquisas, pedidos de ajuda e necessidades de organizações.
          </p>
        </header>

        <div key="community-posts" className={styles.postGrid}>
          {visiblePosts.map((post) => {
            const Icon = post.icon;

            return (
              <article
                key={post.id}
                className={`${styles.postCard} ${styles[post.tone]}`}
              >
                <div className={styles.postTopline}>
                  <span className={styles.postIcon}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className={styles.postType}>{post.type}</span>
                </div>

                <h3>{post.title}</h3>
                <p>{post.description}</p>

                <button type="button" onClick={() => setSelectedPost(post)}>
                  Abrir publicação
                  <ArrowRight aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`${styles.section} ${styles.discoverySection}`}>
        <div key="community-discovery" className={styles.discoveryGrid}>
          <article className={styles.listPanel}>
            <header className={styles.panelHeader}>
              <div>
                <span>Projetos colaborativos</span>
                <h2>Projetos em destaque</h2>
              </div>
              <small>{visibleProjects.length} resultado(s)</small>
            </header>

            <div className={styles.projectList}>
              {visibleProjects.map((project) => (
                <article key={project.id} className={styles.projectItem}>
                  <span className={styles.listIcon}>
                    <FolderKanban aria-hidden="true" />
                  </span>

                  <div className={styles.projectInfo}>
                    <div className={styles.projectTitle}>
                      <strong>{project.name}</strong>
                      <span>{project.status}</span>
                    </div>

                    <p>{project.description}</p>

                    <div className={styles.progress}>
                      <span>
                        <i style={{ width: `${project.progress}%` }} />
                      </span>
                      <small>{project.progress}%</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article id="oportunidades" className={styles.listPanel}>
            <header className={styles.panelHeader}>
              <div>
                <span>Espaços para participar</span>
                <h2>Oportunidades abertas</h2>
              </div>
              <small>{visibleOpportunities.length} resultado(s)</small>
            </header>

            <div className={styles.opportunityList}>
              {visibleOpportunities.map((opportunity) => {
                const Icon = opportunity.icon;

                return (
                  <button
                    key={opportunity.id}
                    type="button"
                    className={styles.opportunityItem}
                  >
                    <span className={styles.listIcon}>
                      <Icon aria-hidden="true" />
                    </span>

                    <span>
                      <strong>{opportunity.title}</strong>
                      <small>
                        {getAreaLabel(opportunity.area)}
                        <i aria-hidden="true">•</i>
                        {opportunity.level}
                      </small>
                    </span>

                    <ArrowRight aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.stepsSection}`}>
        <header className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>Participação simples</span>
          <h2>Como fazer parte</h2>
        </header>

        <div className={styles.stepsGrid}>
          {steps.map(({ number, title, text, icon: Icon }) => (
            <article key={number} className={styles.stepCard}>
              <span className={styles.stepNumber}>{number}</span>
              <span className={styles.stepIcon}>
                <Icon aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.bottomGrid}`}>
        <article className={`${styles.infoCard} ${styles.challengeCard}`}>
          <span className={styles.infoIcon}>
            <Lightbulb aria-hidden="true" />
          </span>

          <div>
            <span className={styles.sectionEyebrow}>Desafio em aberto</span>
            <h2>Necessidades das ONGs</h2>
            <p>
              Organizações podem publicar problemas reais para que a comunidade
              pesquise, proponha e construa soluções com contexto.
            </p>

            <div className={styles.challengeHighlight}>
              <strong>Organizar agenda e acompanhamento de atividades</strong>
              <span>
                Reduzir controles manuais e facilitar o trabalho da equipe.
              </span>
            </div>

            <a href="#oportunidades" className={styles.inlineLink}>
              Explorar desafios
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </article>

        <article className={`${styles.infoCard} ${styles.conductCard}`}>
          <span className={styles.infoIcon}>
            <ShieldCheck aria-hidden="true" />
          </span>

          <div>
            <span className={styles.sectionEyebrow}>Convivência e segurança</span>
            <h2>Código de conduta</h2>

            <ul>
              <li>
                <CheckCircle2 aria-hidden="true" />
                Respeito e acolhimento.
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                Diversidade de experiências.
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                Críticas construtivas.
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                Responsabilidade com dados.
              </li>
            </ul>

            <a href="/documentacao#codigo-de-conduta" className={styles.inlineLink}>
              Ler código completo
              <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </article>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.finalCard}>
          <div>
            <span className={styles.sectionEyebrow}>Faça parte dessa construção</span>
            <h2>
              Toda habilidade pode gerar <span>impacto.</span>
            </h2>
            <p>
              Entre para acompanhar projetos, conversar com a comunidade e
              encontrar uma forma concreta de participar.
            </p>
          </div>

          <div className={styles.finalActions}>
            <a href="/cadastro" className={styles.primaryButton}>
              Quero participar
              <UsersRound aria-hidden="true" />
            </a>

            <a
              href="https://github.com/CongPlataform/cong-platform"
              className={styles.secondaryButton}
              target="_blank"
              rel="noreferrer"
            >
              Ver no GitHub
              <FaGithub aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {selectedPost && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={() => setSelectedPost(null)}
        >
          <article
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-post-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setSelectedPost(null)}
              aria-label="Fechar publicação"
            >
              <X aria-hidden="true" />
            </button>

            <span className={`${styles.modalIcon} ${styles[selectedPost.tone]}`}>
              <SelectedPostIcon aria-hidden="true" />
            </span>

            <span className={styles.sectionEyebrow}>{selectedPost.type}</span>
            <h2 id="community-post-title">{selectedPost.title}</h2>
            <p>{selectedPost.detail}</p>

            <a href="/cadastro" className={styles.primaryButton}>
              Participar da comunidade
              <ArrowRight aria-hidden="true" />
            </a>
          </article>
        </div>
      )}
    </main>
  );
}
