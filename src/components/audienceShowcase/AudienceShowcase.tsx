import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import {
  Accessibility,
  ArrowRight,
  BarChart3,
  Blocks,
  BookOpen,
  Box,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Code2,
  Component,
  Eye,
  FileCode2,
  FileText,
  FolderKanban,
  GitBranch,
  GitPullRequest,
  Globe2,
  GripVertical,
  HandHeart,
  Heart,
  Languages,
  LayoutDashboard,
  MousePointer2,
  Network,
  Paintbrush,
  PanelLeft,
  Plus,
  Puzzle,
  Search,
  Settings2,
  Sparkles,
  SquareMousePointer,
  Type,
  Users,
  Workflow,
} from "lucide-react";

import styles from "./AudienceShowcase.module.css";

type AudienceId =
  | "ongs"
  | "developers"
  | "designers"
  | "translators"
  | "volunteers"
  | "companies";

interface AudienceBenefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface Audience {
  id: AudienceId;
  tabLabel: string;
  title: string;
  eyebrow: string;
  description: string;
  closingText: string;
  icon: LucideIcon;
  benefits: AudienceBenefit[];
}

interface AudiencePreviewProps {
  audienceId: AudienceId;
}

const audiences: Audience[] = [
  {
    id: "ongs",
    tabLabel: "ONGs",
    title: "Para ONGs",
    eyebrow: "Sua operação, do seu jeito",
    description:
      "Escolha módulos, organize seus processos e crie um sistema adaptado à realidade da sua organização, sem precisar programar.",
    closingText:
      "Menos tempo configurando ferramentas. Mais tempo gerando impacto.",
    icon: HandHeart,
    benefits: [
      {
        icon: SquareMousePointer,
        title: "Construção visual",
        description:
          "Monte o sistema arrastando módulos e organizando cada área.",
      },
      {
        icon: Puzzle,
        title: "Módulos adaptáveis",
        description:
          "Ative apenas os recursos que fazem sentido para sua organização.",
      },
      {
        icon: Workflow,
        title: "Processos organizados",
        description:
          "Transforme atividades manuais em fluxos claros e conectados.",
      },
      {
        icon: Accessibility,
        title: "Sem conhecimento técnico",
        description:
          "Uma experiência criada para gestores, equipes e voluntários.",
      },
    ],
  },
  {
    id: "developers",
    tabLabel: "Desenvolvedores",
    title: "Para devs",
    eyebrow: "Código aberto com propósito",
    description:
      "Contribua com módulos, integrações e melhorias que resolvam necessidades reais do terceiro setor.",
    closingText:
      "Cada contribuição pode se transformar em uma solução para várias ONGs.",
    icon: Code2,
    benefits: [
      {
        icon: FileCode2,
        title: "Projeto open source",
        description:
          "Explore uma base aberta, documentada e preparada para colaboração.",
      },
      {
        icon: GitPullRequest,
        title: "Issues e contribuições",
        description:
          "Encontre desafios, envie melhorias e participe da evolução.",
      },
      {
        icon: Blocks,
        title: "Arquitetura modular",
        description:
          "Crie recursos reutilizáveis para diferentes organizações.",
      },
      {
        icon: Network,
        title: "APIs e integrações",
        description:
          "Conecte a CONG a serviços que ampliem o impacto da plataforma.",
      },
    ],
  },
  {
    id: "designers",
    tabLabel: "Designers",
    title: "Para designers",
    eyebrow: "Experiências que acolhem",
    description:
      "Ajude a transformar processos complexos em interfaces claras, acessíveis e fáceis de utilizar.",
    closingText:
      "Um bom design aproxima a tecnologia de quem mais precisa dela.",
    icon: Paintbrush,
    benefits: [
      {
        icon: Component,
        title: "Design system colaborativo",
        description:
          "Crie componentes consistentes, reutilizáveis e acessíveis.",
      },
      {
        icon: Workflow,
        title: "Fluxos mais simples",
        description:
          "Reduza etapas e torne tarefas administrativas mais intuitivas.",
      },
      {
        icon: Accessibility,
        title: "Acessibilidade desde o início",
        description:
          "Projete para diferentes capacidades e níveis de familiaridade digital.",
      },
      {
        icon: Users,
        title: "Cocriação com usuários reais",
        description: "Desenvolva soluções com base na rotina das organizações.",
      },
    ],
  },
  {
    id: "translators",
    tabLabel: "Tradutores",
    title: "Para tradutores",
    eyebrow: "Impacto sem fronteiras",
    description:
      "Ajude a adaptar a plataforma para novos idiomas, regiões e contextos culturais.",
    closingText: "Cada tradução permite que novas comunidades utilizem a CONG.",
    icon: Languages,
    benefits: [
      {
        icon: FileText,
        title: "Tradução com contexto",
        description:
          "Veja onde cada texto aparece antes de produzir sua tradução.",
      },
      {
        icon: Globe2,
        title: "Múltiplos idiomas",
        description:
          "Colabore para tornar a plataforma acessível em diferentes regiões.",
      },
      {
        icon: CheckCircle2,
        title: "Revisão colaborativa",
        description:
          "Revise termos e mantenha consistência entre toda a plataforma.",
      },
      {
        icon: BookOpen,
        title: "Glossário compartilhado",
        description:
          "Consulte termos técnicos e sociais importantes para cada idioma.",
      },
    ],
  },
  {
    id: "volunteers",
    tabLabel: "Voluntários",
    title: "Para voluntários",
    eyebrow: "Seu tempo gera transformação",
    description:
      "Encontre oportunidades alinhadas às suas habilidades, disponibilidade e interesses.",
    closingText:
      "Contribua no seu ritmo e acompanhe o impacto da sua participação.",
    icon: Heart,
    benefits: [
      {
        icon: Search,
        title: "Oportunidades relevantes",
        description:
          "Encontre atividades presenciais, remotas e baseadas em habilidades.",
      },
      {
        icon: Clock3,
        title: "Flexibilidade",
        description:
          "Escolha ações que se encaixam na sua rotina e disponibilidade.",
      },
      {
        icon: HandHeart,
        title: "Contribuições com propósito",
        description: "Entenda como cada atividade ajuda uma organização.",
      },
      {
        icon: BarChart3,
        title: "Histórico de impacto",
        description: "Acompanhe suas horas, atividades e resultados gerados.",
      },
    ],
  },
  {
    id: "companies",
    tabLabel: "Empresas",
    title: "Para empresas",
    eyebrow: "Apoio que se transforma em impacto",
    description:
      "Patrocine soluções, apoie organizações e conecte colaboradores a iniciativas sociais.",
    closingText:
      "Transforme recursos, conhecimento e pessoas em impacto mensurável.",
    icon: Building2,
    benefits: [
      {
        icon: CircleDollarSign,
        title: "Patrocínio transparente",
        description:
          "Apoie projetos e acompanhe como os recursos são utilizados.",
      },
      {
        icon: Puzzle,
        title: "Financiamento de módulos",
        description:
          "Ajude a desenvolver soluções reutilizáveis por diversas ONGs.",
      },
      {
        icon: Users,
        title: "Voluntariado corporativo",
        description:
          "Conecte colaboradores a iniciativas alinhadas às suas habilidades.",
      },
      {
        icon: BarChart3,
        title: "Relatórios de impacto",
        description:
          "Visualize indicadores e resultados das iniciativas apoiadas.",
      },
    ],
  },
];

export default function AudienceShowcase() {
  const [selectedAudienceId, setSelectedAudienceId] =
    useState<AudienceId>("ongs");

  const selectedAudience =
    audiences.find((audience) => audience.id === selectedAudienceId) ??
    audiences[0];

  return (
    <section
      className={styles.audienceSection}
      aria-labelledby="audience-title"
    >
      <div className={styles.sectionContainer}>
        <header className={styles.sectionHeader}>
          <span className={styles.headerSparkle} aria-hidden={true}>
            <Sparkles size={22} strokeWidth={1.8} />
          </span>

          <h2 id="audience-title">Encontre seu lugar na CONG</h2>

          <p>
            Explore a plataforma pela perspectiva que mais combina com você.
          </p>
        </header>

        <div className={styles.audienceTabsBlock}>
          <div
            className={styles.audienceTabs}
            role="tablist"
            aria-label="Escolha seu perfil"
          >
            {audiences.map((audience) => {
              const Icon = audience.icon;
              const isSelected = selectedAudienceId === audience.id;

              return (
                <button
                  key={audience.id}
                  type="button"
                  role="tab"
                  id={`audience-tab-${audience.id}`}
                  aria-selected={isSelected}
                  aria-controls={`audience-panel-${audience.id}`}
                  className={[
                    styles.audienceTab,
                    isSelected ? styles.audienceTabActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={(event) => {
                    setSelectedAudienceId(audience.id);
                    event.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                      inline: "center",
                    });
                  }}
                >
                  <Icon size={21} strokeWidth={1.8} aria-hidden={true} />

                  <span>{audience.tabLabel}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.carouselMeta} aria-hidden={true}>
            <span className={styles.carouselHint}>
              <MousePointer2 size={16} strokeWidth={1.8} />
              Arraste para ver mais
            </span>

            <span className={styles.carouselDots}>
              {audiences.map((audience) => (
                <i
                  key={audience.id}
                  className={
                    selectedAudienceId === audience.id
                      ? styles.carouselDotActive
                      : ""
                  }
                />
              ))}
            </span>
          </div>
        </div>

        <article
          key={selectedAudience.id}
          id={`audience-panel-${selectedAudience.id}`}
          role="tabpanel"
          aria-labelledby={`audience-tab-${selectedAudience.id}`}
          className={styles.audiencePanel}
        >
          <div className={styles.panelContent}>
            <span className={styles.panelEyebrow}>
              {selectedAudience.eyebrow}
            </span>

            <h3>{selectedAudience.title}</h3>

            <p className={styles.panelDescription}>
              {selectedAudience.description}
            </p>

            <div className={styles.benefitList}>
              {selectedAudience.benefits.map((benefit) => {
                const BenefitIcon = benefit.icon;

                return (
                  <div className={styles.benefitItem} key={benefit.title}>
                    <span className={styles.benefitIcon} aria-hidden={true}>
                      <BenefitIcon size={22} strokeWidth={1.7} />
                    </span>

                    <span className={styles.benefitText}>
                      <strong>{benefit.title}</strong>
                      <small>{benefit.description}</small>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={styles.panelClosing}>
              <Sparkles size={20} strokeWidth={1.8} aria-hidden={true} />

              <span>{selectedAudience.closingText}</span>
            </div>
          </div>

          <AudiencePreview audienceId={selectedAudience.id} />
        </article>
      </div>
    </section>
  );
}

function AudiencePreview({ audienceId }: AudiencePreviewProps) {
  return (
    <div className={styles.previewArea}>
      <div className={styles.previewWindow}>
        <PreviewBrowserBar audienceId={audienceId} />

        <div className={styles.previewBody}>
          {audienceId === "ongs" && <OngPreview />}
          {audienceId === "developers" && <DeveloperPreview />}
          {audienceId === "designers" && <DesignerPreview />}
          {audienceId === "translators" && <TranslatorPreview />}
          {audienceId === "volunteers" && <VolunteerPreview />}
          {audienceId === "companies" && <CompanyPreview />}
        </div>
      </div>

      <span className={styles.previewDecoration} aria-hidden={true}>
        <Sparkles size={24} strokeWidth={1.6} />
      </span>
    </div>
  );
}

function PreviewBrowserBar({ audienceId }: AudiencePreviewProps) {
  const titles: Record<AudienceId, string> = {
    ongs: "Construtor da organização",
    developers: "Comunidade de desenvolvimento",
    designers: "Editor de interfaces",
    translators: "Central de traduções",
    volunteers: "Oportunidades de voluntariado",
    companies: "Painel de impacto",
  };

  return (
    <div className={styles.previewTopbar}>
      <div className={styles.windowDots}>
        <span />
        <span />
        <span />
      </div>

      <span className={styles.previewAddress}>cong.org/{audienceId}</span>

      <span className={styles.previewTopbarTitle}>{titles[audienceId]}</span>
    </div>
  );
}

function OngPreview() {
  return (
    <>
      <div
        className={styles.mobileOngPreview}
        aria-label="Prévia mobile do painel da organização"
      >
        <div className={styles.mobileOngHeader}>
          <div>
            <span>Minha organização</span>
            <strong>Painel principal</strong>
          </div>

          <span className={styles.mobileOngStatus}>
            <Check size={14} strokeWidth={2.2} />
            Ativo
          </span>
        </div>

        <div className={styles.mobileOngStats}>
          <div>
            <Users size={20} strokeWidth={1.7} />
            <strong>342</strong>
            <span>Pessoas atendidas</span>
          </div>

          <div>
            <HandHeart size={20} strokeWidth={1.7} />
            <strong>128</strong>
            <span>Voluntários</span>
          </div>
        </div>

        <div className={styles.mobileOngActivity}>
          <div>
            <FileText size={19} strokeWidth={1.7} />
            <span>
              <strong>Relatórios</strong>
              Acompanhe os registros da organização
            </span>
          </div>

          <div>
            <Users size={19} strokeWidth={1.7} />
            <span>
              <strong>Voluntários</strong>
              Consulte pessoas e atividades
            </span>
          </div>

          <div>
            <Box size={19} strokeWidth={1.7} />
            <span>
              <strong>Estoque</strong>
              Veja recursos e movimentações
            </span>
          </div>
        </div>
      </div>

      <div className={styles.builderPreview}>
        <aside className={styles.builderSidebar}>
          <div className={styles.builderLogo}>
            <Blocks size={18} />
            <strong>Módulos</strong>
          </div>

          <div className={styles.builderSearch}>
            <Search size={14} />
            <span>Buscar módulo</span>
          </div>

          <div className={styles.builderModules}>
            <div className={styles.builderModule}>
              <GripVertical size={15} />
              <Users size={17} />
              <span>Beneficiários</span>
            </div>

            <div className={styles.builderModule}>
              <GripVertical size={15} />
              <HandHeart size={17} />
              <span>Doações</span>
            </div>

            <div className={styles.builderModule}>
              <GripVertical size={15} />
              <Box size={17} />
              <span>Estoque</span>
            </div>

            <div className={styles.builderModule}>
              <GripVertical size={15} />
              <BarChart3 size={17} />
              <span>Relatórios</span>
            </div>
          </div>
        </aside>

        <div className={styles.builderCanvas}>
          <div className={styles.builderCanvasHeader}>
            <div>
              <span>Sistema da minha ONG</span>
              <strong>Painel principal</strong>
            </div>

            <button type="button">
              <Eye size={15} />
              Visualizar
            </button>
          </div>

          <div className={styles.noCodeBadge}>
            <MousePointer2 size={14} />
            Sem código
          </div>

          <div className={styles.dropArea}>
            <div className={styles.dropAreaHeader}>
              <span>Resumo da organização</span>

              <Settings2 size={16} />
            </div>

            <div className={styles.dropStats}>
              <span>
                <Users size={18} />
                <strong>342</strong>
                Pessoas atendidas
              </span>

              <span>
                <HandHeart size={18} />
                <strong>128</strong>
                Voluntários
              </span>
            </div>
          </div>

          <div className={styles.emptyDropZone}>
            <Plus size={22} />
            <strong>Arraste um módulo para cá</strong>
            <span>Personalize sua página visualmente</span>
          </div>
        </div>
      </div>
    </>
  );
}

function DeveloperPreview() {
  return (
    <div className={styles.developerPreview}>
      <aside className={styles.devSidebar}>
        <div className={styles.devRepository}>
          <GitBranch size={16} />
          <strong>cong-platform</strong>
          <ChevronDown size={14} />
        </div>

        <nav>
          <span className={styles.devNavActive}>
            <Code2 size={16} />
            Código
          </span>

          <span>
            <GitPullRequest size={16} />
            Pull requests
            <small>4</small>
          </span>

          <span>
            <Workflow size={16} />
            Issues
            <small>18</small>
          </span>

          <span>
            <BookOpen size={16} />
            Documentação
          </span>
        </nav>
      </aside>

      <div className={styles.devWorkspace}>
        <div className={styles.devHeader}>
          <div>
            <Code2 size={17} />
            <strong>DonationModule.tsx</strong>
          </div>

          <span>main</span>
        </div>

        <div className={styles.codeEditor}>
          <div className={styles.codeNumbers}>
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>
            <span>8</span>
          </div>

          <pre>
            <code>
              <span className={styles.codePurple}>export</span>{" "}
              <span className={styles.codePurple}>function</span>{" "}
              <span className={styles.codeBlue}>DonationModule</span>
              {"() {"}
              {"\n  "}
              <span className={styles.codePurple}>return</span> ({"\n    "}
              <span className={styles.codeBlue}>&lt;Module</span>
              {"\n      "}
              <span className={styles.codeGreen}>title</span>
              {'="Doações"'}
              {"\n      "}
              <span className={styles.codeGreen}>openSource</span>
              {"\n    "}
              <span className={styles.codeBlue}>/&gt;</span>
              {"\n  );\n}"}
            </code>
          </pre>
        </div>

        <div className={styles.devBottom}>
          <div className={styles.issueCard}>
            <span>
              <GitPullRequest size={16} />
              Issue #42
            </span>

            <strong>Adicionar exportação de relatórios</strong>

            <div>
              <small>boa primeira contribuição</small>
              <small>impacto social</small>
            </div>
          </div>

          <button type="button">
            Ver issue
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DesignerPreview() {
  return (
    <div className={styles.designerPreview}>
      <aside className={styles.designToolbar}>
        <MousePointer2 size={17} />
        <PanelLeft size={17} />
        <SquareMousePointer size={17} />
        <Type size={17} />
        <Component size={17} />
        <Paintbrush size={17} />
      </aside>

      <div className={styles.designLayers}>
        <strong>Camadas</strong>

        <span>
          <ChevronDown size={13} />
          Página inicial
        </span>

        <span className={styles.designLayerChild}>
          <Box size={13} />
          Cabeçalho
        </span>

        <span className={styles.designLayerChild}>
          <Box size={13} />
          Indicadores
        </span>

        <span className={styles.designLayerChild}>
          <Box size={13} />
          Ações rápidas
        </span>
      </div>

      <div className={styles.designCanvas}>
        <div className={styles.designFrameLabel}>Painel da ONG · 1280</div>

        <div className={styles.designFrame}>
          <div className={styles.designMiniHeader}>
            <span className={styles.designMiniLogo}>C</span>

            <div>
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className={styles.designHero}>
            <div>
              <span />
              <span />
              <button type="button">Começar</button>
            </div>

            <div className={styles.designIllustration}>
              <Heart size={28} />
            </div>
          </div>

          <div className={styles.designCards}>
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className={styles.selectedElement}>
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      <aside className={styles.designProperties}>
        <strong>Propriedades</strong>

        <label>
          Largura
          <span>320 px</span>
        </label>

        <label>
          Altura
          <span>Auto</span>
        </label>

        <label>
          Cor
          <span className={styles.propertyColor} />
        </label>

        <label>
          Raio
          <span>12 px</span>
        </label>

        <div className={styles.accessibilityScore}>
          <Accessibility size={17} />
          <span>
            Contraste
            <strong>AA aprovado</strong>
          </span>
        </div>
      </aside>
    </div>
  );
}

function TranslatorPreview() {
  return (
    <div className={styles.translatorPreview}>
      <aside className={styles.translationSidebar}>
        <div className={styles.translationProject}>
          <Globe2 size={18} />
          <span>
            <strong>CONG Web</strong>
            74% traduzido
          </span>
        </div>

        <div className={styles.languageItemActive}>
          <span>🇧🇷</span>
          Português
          <small>100%</small>
        </div>

        <div className={styles.languageItem}>
          <span>🇺🇸</span>
          English
          <small>82%</small>
        </div>

        <div className={styles.languageItem}>
          <span>🇪🇸</span>
          Español
          <small>64%</small>
        </div>

        <div className={styles.languageItem}>
          <span>🇫🇷</span>
          Français
          <small>38%</small>
        </div>
      </aside>

      <div className={styles.translationWorkspace}>
        <div className={styles.translationHeader}>
          <div>
            <Languages size={18} />
            <strong>Tradução da interface</strong>
          </div>

          <span>12 pendentes</span>
        </div>

        <div className={styles.translationContext}>
          <small>CONTEXTO</small>

          <div>
            <LayoutDashboard size={18} />

            <span>
              <strong>Página inicial da ONG</strong>
              Título principal do painel administrativo
            </span>
          </div>
        </div>

        <div className={styles.translationFields}>
          <label>
            <span>
              🇧🇷 Português
              <small>Original</small>
            </span>

            <textarea value="Organize sua ONG em um só lugar" readOnly />
          </label>

          <label>
            <span>
              🇺🇸 English
              <small>Em revisão</small>
            </span>

            <textarea value="Organize your nonprofit in one place" readOnly />
          </label>

          <label>
            <span>
              🇪🇸 Español
              <small>Pendente</small>
            </span>

            <textarea value="Organiza tu ONG en un solo lugar" readOnly />
          </label>
        </div>

        <div className={styles.translationFooter}>
          <span>
            <CheckCircle2 size={16} />
            Glossário verificado
          </span>

          <button type="button">Salvar tradução</button>
        </div>
      </div>
    </div>
  );
}

function VolunteerPreview() {
  return (
    <div className={styles.volunteerPreview}>
      <div className={styles.volunteerHeader}>
        <div>
          <span>Olá, Marina!</span>
          <strong>Encontre uma oportunidade para ajudar</strong>
        </div>

        <span className={styles.volunteerAvatar}>M</span>
      </div>

      <div className={styles.volunteerFilters}>
        <span className={styles.volunteerFilterActive}>Para você</span>
        <span>Remoto</span>
        <span>Presencial</span>
        <span>Esta semana</span>
      </div>

      <div className={styles.opportunityGrid}>
        <article className={styles.opportunityFeatured}>
          <div className={styles.opportunityTop}>
            <span className={styles.opportunityIcon}>
              <Paintbrush size={21} />
            </span>

            <small>Remoto</small>
          </div>

          <strong>Criar materiais para campanha social</strong>

          <p>
            Ajude uma ONG a preparar conteúdos visuais para sua próxima
            campanha.
          </p>

          <div className={styles.opportunityTags}>
            <span>Design</span>
            <span>2 horas</span>
          </div>

          <button type="button">
            Ver oportunidade
            <ArrowRight size={15} />
          </button>
        </article>

        <div className={styles.opportunitySide}>
          <article>
            <Code2 size={19} />
            <span>
              <strong>Revisar página web</strong>
              Tecnologia · Remoto
            </span>
          </article>

          <article>
            <Languages size={19} />
            <span>
              <strong>Traduzir uma campanha</strong>
              Idiomas · Flexível
            </span>
          </article>

          <article>
            <HandHeart size={19} />
            <span>
              <strong>Apoiar uma entrega</strong>
              Presencial · Sábado
            </span>
          </article>
        </div>
      </div>

      <div className={styles.volunteerProgress}>
        <span>
          <Clock3 size={17} />
          <strong>24h</strong>
          contribuídas
        </span>

        <div>
          <span style={{ width: "68%" }} />
        </div>

        <small>Você ajudou 4 organizações este mês</small>
      </div>
    </div>
  );
}

function CompanyPreview() {
  return (
    <div className={styles.companyPreview}>
      <div className={styles.companyHeader}>
        <div>
          <BriefcaseBusiness size={20} />
          <span>
            <small>Empresa apoiadora</small>
            <strong>Impacto Tech</strong>
          </span>
        </div>

        <button type="button">Exportar relatório</button>
      </div>

      <div className={styles.companyStats}>
        <article>
          <span>
            <CircleDollarSign size={18} />
          </span>

          <small>Valor destinado</small>
          <strong>R$ 125 mil</strong>
          <em>+18% neste ano</em>
        </article>

        <article>
          <span>
            <FolderKanban size={18} />
          </span>

          <small>Projetos apoiados</small>
          <strong>24</strong>
          <em>8 em andamento</em>
        </article>

        <article>
          <span>
            <Users size={18} />
          </span>

          <small>Pessoas alcançadas</small>
          <strong>18.450</strong>
          <em>6 regiões</em>
        </article>
      </div>

      <div className={styles.companyContent}>
        <div className={styles.companyChart}>
          <div className={styles.companyChartHeader}>
            <span>
              <strong>Impacto ao longo do ano</strong>
              Pessoas beneficiadas
            </span>

            <BarChart3 size={18} />
          </div>

          <div className={styles.chartBars}>
            {[36, 48, 41, 60, 54, 76, 70, 86].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>

          <div className={styles.chartLabels}>
            <span>Jan</span>
            <span>Fev</span>
            <span>Mar</span>
            <span>Abr</span>
            <span>Mai</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Ago</span>
          </div>
        </div>

        <div className={styles.companyProjects}>
          <strong>Projetos recentes</strong>

          <article>
            <span className={styles.projectStatus}>
              <Check size={14} />
            </span>

            <div>
              <strong>Gestão de voluntários</strong>
              <small>12 ONGs beneficiadas</small>
            </div>

            <span>Concluído</span>
          </article>

          <article>
            <span className={styles.projectStatusActive}>
              <Workflow size={14} />
            </span>

            <div>
              <strong>Módulo de estoque</strong>
              <small>Desenvolvimento colaborativo</small>
            </div>

            <span>Em andamento</span>
          </article>

          <article>
            <span className={styles.projectStatus}>
              <Check size={14} />
            </span>

            <div>
              <strong>Programa de voluntariado</strong>
              <small>48 colaboradores envolvidos</small>
            </div>

            <span>Concluído</span>
          </article>
        </div>
      </div>
    </div>
  );
}
