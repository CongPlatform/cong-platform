import type { InstitutionalElementType, InstitutionalLayoutNode, InstitutionalElementValue } from "../../../services/institutionalService";
import { createElementNode } from "../../../utils/institutionalLayout";

export type RichCategory = "all" | "campaigns" | "stories" | "impact" | "media" | "participation";
export type RichVisualVariant = "editorial" | "compact" | "spotlight";

export interface RichBlockPreset {
  id: string;
  name: string;
  summary: string;
  category: Exclude<RichCategory, "all">;
  type: InstitutionalElementType;
  variant: RichVisualVariant;
  tag: string;
}

export const richCategoryOptions: readonly { id: RichCategory; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "campaigns", label: "Campanhas" },
  { id: "stories", label: "Histórias" },
  { id: "impact", label: "Impacto e dados" },
  { id: "media", label: "Fotos e vídeos" },
  { id: "participation", label: "Participação" },
];

export const richBlockPresets: readonly RichBlockPreset[] = [
  {
    id: "campaign-spotlight",
    type: "campaign_card",
    name: "Campanha em destaque",
    summary: "Foto dominante, meta e chamada para participar.",
    category: "campaigns",
    variant: "spotlight",
    tag: "Campanha",
  },
  {
    id: "campaign-editorial",
    type: "campaign_card",
    name: "Campanha editorial",
    summary: "Bloco com narrativa e contraste tipográfico.",
    category: "campaigns",
    variant: "editorial",
    tag: "Campanha",
  },
  {
    id: "donation-compact",
    type: "donation_choices",
    name: "Doação objetiva",
    summary: "Valores rápidos e acesso claro ao destino configurado.",
    category: "campaigns",
    variant: "compact",
    tag: "Doação",
  },
  {
    id: "donation-editorial",
    type: "donation_choices",
    name: "Convite para doar",
    summary: "Painel de contribuição com maior presença visual.",
    category: "campaigns",
    variant: "editorial",
    tag: "Doação",
  },
  {
    id: "testimonials-spotlight",
    type: "testimonial_slider",
    name: "Uma voz em destaque",
    summary: "Depoimentos em palco com navegação.",
    category: "stories",
    variant: "spotlight",
    tag: "Depoimentos",
  },
  {
    id: "testimonials-compact",
    type: "testimonial_slider",
    name: "Mural de relatos",
    summary: "Depoimentos em um formato mais contido.",
    category: "stories",
    variant: "compact",
    tag: "Depoimentos",
  },
  {
    id: "timeline-editorial",
    type: "community_timeline",
    name: "História em capítulos",
    summary: "Linha do tempo com datas e títulos editoriais.",
    category: "stories",
    variant: "editorial",
    tag: "Trajetória",
  },
  {
    id: "timeline-compact",
    type: "community_timeline",
    name: "Marcos da jornada",
    summary: "Cronologia compacta com foco nas conquistas.",
    category: "stories",
    variant: "compact",
    tag: "Trajetória",
  },
  {
    id: "chart-editorial",
    type: "data_chart",
    name: "Painel de indicadores",
    summary: "Barras com valores e legendas editáveis.",
    category: "impact",
    variant: "editorial",
    tag: "Gráfico",
  },
  {
    id: "chart-spotlight",
    type: "data_chart",
    name: "Distribuição do impacto",
    summary: "Gráfico de rosca com destaque para o total.",
    category: "impact",
    variant: "spotlight",
    tag: "Gráfico",
  },
  {
    id: "chart-columns",
    type: "data_chart",
    name: "Comparação entre períodos",
    summary: "Colunas verticais para apresentar resultados.",
    category: "impact",
    variant: "compact",
    tag: "Gráfico",
  },
  {
    id: "chart-line",
    type: "data_chart",
    name: "Evolução dos resultados",
    summary: "Linha de tendência com valores e categorias.",
    category: "impact",
    variant: "editorial",
    tag: "Gráfico",
  },
  {
    id: "progress-compact",
    type: "progress",
    name: "Meta resumida",
    summary: "Progresso e porcentagem em uma faixa compacta.",
    category: "impact",
    variant: "compact",
    tag: "Meta",
  },
  {
    id: "progress-editorial",
    type: "progress",
    name: "Meta em evidência",
    summary: "Acompanhamento de resultado com respiro visual.",
    category: "impact",
    variant: "editorial",
    tag: "Meta",
  },
  {
    id: "photo-landscape",
    type: "image",
    name: "Fotografia panorâmica",
    summary: "Moldura 16:9, pronta para receber uma foto.",
    category: "media",
    variant: "spotlight",
    tag: "Moldura",
  },
  {
    id: "photo-editorial",
    type: "image",
    name: "Retrato editorial",
    summary: "Moldura vertical 3:4, ideal para histórias.",
    category: "media",
    variant: "editorial",
    tag: "Moldura",
  },
  {
    id: "photo-round",
    type: "image",
    name: "Retrato circular",
    summary: "Enquadramento circular substituível.",
    category: "media",
    variant: "compact",
    tag: "Moldura",
  },
  {
    id: "gallery-spotlight",
    type: "media_gallery",
    name: "Álbum de projetos",
    summary: "Foto principal e miniaturas navegáveis.",
    category: "media",
    variant: "spotlight",
    tag: "Galeria",
  },
  {
    id: "gallery-compact",
    type: "media_gallery",
    name: "Retratos da ação",
    summary: "Galeria com legendas em formato compacto.",
    category: "media",
    variant: "compact",
    tag: "Galeria",
  },
  {
    id: "video-editorial",
    type: "video_embed",
    name: "Vídeo-documentário",
    summary: "Vídeo e legenda em uma moldura editorial.",
    category: "media",
    variant: "editorial",
    tag: "Vídeo",
  },
  {
    id: "video-compact",
    type: "video_embed",
    name: "Vídeo com contexto",
    summary: "Player responsivo com título e descrição.",
    category: "media",
    variant: "compact",
    tag: "Vídeo",
  },
  {
    id: "actions-editorial",
    type: "action_grid",
    name: "Três formas de agir",
    summary: "Cards com ícones e destinos independentes.",
    category: "participation",
    variant: "editorial",
    tag: "Participação",
  },
  {
    id: "actions-compact",
    type: "action_grid",
    name: "Caminhos de participação",
    summary: "Opções de engajamento mais compactas.",
    category: "participation",
    variant: "compact",
    tag: "Participação",
  },
  {
    id: "tabs-compact",
    type: "story_tabs",
    name: "Guia em abas",
    summary: "Conteúdo progressivo sem uma página extensa.",
    category: "participation",
    variant: "compact",
    tag: "Orientação",
  },
  {
    id: "tabs-editorial",
    type: "story_tabs",
    name: "Jornada orientada",
    summary: "Abas amplas para quem busca ajuda ou informação.",
    category: "participation",
    variant: "editorial",
    tag: "Orientação",
  },
  {
    id: "faq-compact",
    type: "faq",
    name: "Perguntas essenciais",
    summary: "Respostas abertas sob demanda.",
    category: "participation",
    variant: "compact",
    tag: "FAQ",
  },
  {
    id: "faq-editorial",
    type: "faq",
    name: "Central de dúvidas",
    summary: "Perguntas frequentes em um cartão destacado.",
    category: "participation",
    variant: "editorial",
    tag: "FAQ",
  },
  {
    id: "campaign-community",
    type: "campaign_card",
    name: "Mobilização comunitária",
    summary: "Foto ampla, chamada objetiva e meta transparente.",
    category: "campaigns",
    variant: "compact",
    tag: "Mobilização",
  },
  {
    id: "campaign-legacy",
    type: "campaign_card",
    name: "Juntos por uma causa",
    summary: "Narrativa acolhedora e destaque para o projeto.",
    category: "campaigns",
    variant: "editorial",
    tag: "Causa",
  },
  {
    id: "donation-spotlight",
    type: "donation_choices",
    name: "Impacto de cada valor",
    summary: "Contribuições com contexto e ação visível.",
    category: "campaigns",
    variant: "spotlight",
    tag: "Doação",
  },
  {
    id: "actions-spotlight",
    type: "action_grid",
    name: "Três caminhos de impacto",
    summary: "Cartões com ícones grandes e destinos próprios.",
    category: "participation",
    variant: "spotlight",
    tag: "Ações",
  },
  {
    id: "actions-volunteer",
    type: "action_grid",
    name: "Seja parte da mudança",
    summary: "Voluntariado, apoio e divulgação com convites claros.",
    category: "participation",
    variant: "editorial",
    tag: "Voluntariado",
  },
  {
    id: "actions-services",
    type: "action_grid",
    name: "Encontre o apoio certo",
    summary: "Jornada orientada para encontrar serviços e acolhimento.",
    category: "participation",
    variant: "compact",
    tag: "Atendimento",
  },
  {
    id: "faq-spotlight",
    type: "faq",
    name: "Dúvidas sobre participação",
    summary: "Orientações objetivas em cartões expansíveis.",
    category: "participation",
    variant: "spotlight",
    tag: "FAQ",
  },
  {
    id: "tabs-spotlight",
    type: "story_tabs",
    name: "Conheça cada etapa",
    summary: "Informações por etapas em navegação por abas.",
    category: "participation",
    variant: "spotlight",
    tag: "Jornada",
  },
  {
    id: "chart-donations",
    type: "data_chart",
    name: "Distribuição de recursos",
    summary: "Rosca para orçamento, com valores editáveis.",
    category: "impact",
    variant: "spotlight",
    tag: "Transparência",
  },
  {
    id: "chart-regions",
    type: "data_chart",
    name: "Atuação por região",
    summary: "Compare territórios em barras horizontais.",
    category: "impact",
    variant: "compact",
    tag: "Indicadores",
  },
  {
    id: "chart-monthly",
    type: "data_chart",
    name: "Resultados mês a mês",
    summary: "Evolução de atendimentos em linha contínua.",
    category: "impact",
    variant: "editorial",
    tag: "Evolução",
  },
  {
    id: "chart-volunteers",
    type: "data_chart",
    name: "Rede de voluntariado",
    summary: "Comparação do engajamento em colunas.",
    category: "impact",
    variant: "compact",
    tag: "Pessoas",
  },
  {
    id: "progress-spotlight",
    type: "progress",
    name: "Rumo à próxima conquista",
    summary: "Meta visual destacada dentro da página.",
    category: "impact",
    variant: "spotlight",
    tag: "Progresso",
  },
  {
    id: "testimonials-editorial",
    type: "testimonial_slider",
    name: "Quem vive a transformação",
    summary: "Relatos humanizados com tipografia editorial.",
    category: "stories",
    variant: "editorial",
    tag: "Histórias",
  },
  {
    id: "timeline-spotlight",
    type: "community_timeline",
    name: "Linha do tempo de conquistas",
    summary: "Marcos e avanços com forte presença gráfica.",
    category: "stories",
    variant: "spotlight",
    tag: "História",
  },
  {
    id: "photo-arch",
    type: "image",
    name: "Retrato em arco",
    summary: "Fotografia vertical em moldura arquitetônica.",
    category: "media",
    variant: "editorial",
    tag: "Moldura",
  },
  {
    id: "photo-organic",
    type: "image",
    name: "Fotografia orgânica",
    summary: "Recorte fluido, sem perder a troca de imagem.",
    category: "media",
    variant: "spotlight",
    tag: "Moldura",
  },
  {
    id: "photo-diagonal",
    type: "image",
    name: "Foto com recorte diagonal",
    summary: "Moldura de destaque com corte geométrico.",
    category: "media",
    variant: "compact",
    tag: "Moldura",
  },
  {
    id: "gallery-editorial",
    type: "media_gallery",
    name: "Diário fotográfico",
    summary: "Narrativa por imagens e legendas editáveis.",
    category: "media",
    variant: "editorial",
    tag: "Galeria",
  },
  {
    id: "video-spotlight",
    type: "video_embed",
    name: "História em movimento",
    summary: "Vídeo de destaque com título e contexto.",
    category: "media",
    variant: "spotlight",
    tag: "Vídeo",
  },
];

const curatedLibraryIds: readonly string[] = [
  "campaign-spotlight",
  "campaign-editorial",
  "donation-compact",
  "testimonials-spotlight",
  "timeline-editorial",
  "chart-editorial",
  "chart-spotlight",
  "chart-columns",
  "chart-line",
  "chart-donations",
  "chart-regions",
  "chart-monthly",
  "progress-spotlight",
  "photo-landscape",
  "photo-editorial",
  "photo-round",
  "photo-arch",
  "photo-organic",
  "gallery-spotlight",
  "video-editorial",
  "actions-editorial",
  "actions-services",
  "actions-volunteer",
  "tabs-editorial",
  "faq-compact",
  "faq-editorial",
  "donation-spotlight",
];

const curatedLibrarySet = new Set(curatedLibraryIds);

export const libraryRichBlockPresets: readonly RichBlockPreset[] = richBlockPresets.filter(
  (preset) => curatedLibrarySet.has(preset.id),
);

export function createRichPresetNode(presetId: string, inheritBrand = true): Extract<InstitutionalLayoutNode, { type: "element" }> | null {
  const preset = richBlockPresets.find((entry) => entry.id === presetId);
  if (!preset) return null;
  const node = createElementNode(preset.type);
  if (node.type !== "element") return null;
  const base = node.value;
  let value: InstitutionalElementValue = base;
  switch (preset.type) {
    case "campaign_card":
      if (base && typeof base === "object" && "kind" in base && base.kind === "campaign_card") value = {
        ...base,
        tag: preset.variant === "editorial" ? "HISTÓRIAS QUE TRANSFORMAM" : "AÇÃO EM DESTAQUE",
        title: preset.variant === "editorial" ? "Um futuro melhor começa na comunidade" : "Cada doação movimenta uma história",
        description: preset.variant === "editorial" ? "Um projeto de exemplo para apresentar pessoas, propósito e resultados. Substitua pelos dados reais da organização." : "Apresente aqui o objetivo da campanha e como a contribuição chega a quem precisa.",
        illustration: preset.id === "campaign-community" ? "essencial" : preset.id === "campaign-legacy" ? "vozes" : preset.variant === "editorial" ? "horizonte" : "comunidade",
      };
      break;
    case "data_chart":
      if (base && typeof base === "object" && "kind" in base && base.kind === "data_chart") value = {
        ...base, title: preset.variant === "spotlight" ? "Onde nossas ações acontecem" : "Nosso impacto em perspectiva",
        subtitle: "Indicadores fictícios para demonstrar o gráfico. Atualize antes de publicar.",
        format: preset.id === "chart-line" ? "line" : preset.id === "chart-columns" ? "columns" : preset.variant === "spotlight" ? "donut" : "bar",
      };
      if (value && typeof value === "object" && "kind" in value && value.kind === "data_chart") {
        const chartExamples: Record<string, Partial<typeof value>> = {
          "chart-donations": {
            title: "Como os recursos são distribuídos",
            subtitle: "Exemplo ilustrativo para substituir por números confirmados.",
            format: "donut",
            unit: "R$",
            items: [
              { id: "orcamento-alimentos", label: "Alimentação", value: 48 },
              { id: "orcamento-educacao", label: "Educação", value: 32 },
              { id: "orcamento-estrutura", label: "Operações", value: 20 },
            ],
          },
          "chart-regions": {
            title: "Presença nos territórios",
            subtitle: "Exemplo de atendimentos por região.",
            format: "bar",
            unit: "ações",
            items: [
              { id: "regiao-norte", label: "Zona Norte", value: 45 },
              { id: "regiao-sul", label: "Zona Sul", value: 32 },
              { id: "regiao-leste", label: "Zona Leste", value: 58 },
            ],
          },
          "chart-monthly": {
            title: "O impacto cresce a cada mês",
            subtitle: "Evolução ilustrativa de pessoas atendidas.",
            format: "line",
            unit: "pessoas",
            items: [
              { id: "mes-maio", label: "Mai", value: 185 },
              { id: "mes-jun", label: "Jun", value: 220 },
              { id: "mes-jul", label: "Jul", value: 310 },
              { id: "mes-ago", label: "Ago", value: 360 },
            ],
          },
          "chart-volunteers": {
            title: "Nossa rede em movimento",
            subtitle: "Participação ilustrativa da comunidade.",
            format: "columns",
            unit: "pessoas",
            items: [
              { id: "volunt-fixas", label: "Fixos", value: 48 },
              { id: "volunt-acao", label: "Em ações", value: 90 },
              { id: "volunt-parc", label: "Parceiros", value: 34 },
            ],
          },
        };
        if (chartExamples[preset.id]) {
          const example = chartExamples[preset.id];
          value = {
            ...value,
            ...example,
            items: example.items?.map((item) => ({ ...item, id: crypto.randomUUID() })) ?? value.items,
          };
        }
      }
      break;
    case "media_gallery":
      if (base && typeof base === "object" && "kind" in base && base.kind === "media_gallery") value = {
        ...base, title: preset.variant === "compact" ? "Momentos que importam" : "Retratos da nossa comunidade",
      };
      break;
    case "community_timeline":
      if (base && typeof base === "object" && "kind" in base && base.kind === "community_timeline") value = {
        ...base, title: preset.variant === "compact" ? "Nossos marcos" : "Cada capítulo transforma o amanhã",
      };
      break;
    case "testimonial_slider":
      if (base && typeof base === "object" && "kind" in base && base.kind === "testimonial_slider") value = {
        ...base, title: preset.variant === "compact" ? "Quem faz parte conta" : "Há histórias por trás de cada resultado",
      };
      break;
    case "action_grid":
      if (base && typeof base === "object" && "kind" in base && base.kind === "action_grid") value = {
        ...base, title: preset.variant === "compact" ? "Escolha seu caminho" : "Você também faz parte desta mudança",
      };
      break;
    case "donation_choices":
      if (base && typeof base === "object" && "kind" in base && base.kind === "donation_choices") value = {
        ...base, title: preset.variant === "compact" ? "Escolha uma contribuição" : "Pequenos gestos. Grandes mudanças.",
      };
      break;
    case "story_tabs":
      if (base && typeof base === "object" && "kind" in base && base.kind === "story_tabs") value = {
        ...base, title: preset.variant === "compact" ? "O que você precisa saber" : "Um caminho simples para participar",
      };
      break;
    case "video_embed":
      if (base && typeof base === "object" && "kind" in base && base.kind === "video_embed") value = {
        ...base, title: preset.variant === "compact" ? "Conheça nosso trabalho em vídeo" : "Por dentro de uma transformação",
      };
      break;
    case "progress":
      if (base && typeof base === "object" && "percent" in base) value = {
        ...base, label: preset.variant === "compact" ? "Progresso da campanha" : "Nossa meta coletiva", percent: 72,
      };
      break;
    case "faq":
      if (base && typeof base === "object" && "items" in base) value = base;
      break;
  }
  if (preset.type === "image") {
    return { ...node, value: null, style: {
      ...node.style, width: "100", imageFit: "cover",
      imageAspect: preset.id === "photo-landscape" ? "16:9" : ["photo-editorial", "photo-arch", "photo-organic"].includes(preset.id) ? "portrait" : "square",
      imageFrame: preset.id === "photo-round" ? "circle" : preset.id === "photo-arch" ? "arch" : preset.id === "photo-organic" ? "blob" : preset.id === "photo-diagonal" ? "diagonal-right" : "rounded",
    } };
  }
  const originalPalettes: Record<RichBlockPreset["category"], [string, string]> = {
    campaigns: ["#9a422e", "#fff3e7"],
    stories: ["#542d89", "#f5edf9"],
    impact: ["#205777", "#eaf5f9"],
    media: ["#175c56", "#eaf6f1"],
    participation: ["#a23e54", "#fff1f3"],
  };
  const [primary, surface] = originalPalettes[preset.category];
  return {
    ...node,
    value,
    style: {
      ...node.style,
      graphicVariant: preset.variant,
      width: "100",
      ...(!inheritBrand ? { color: primary as `#${string}`, backgroundColor: surface as `#${string}` } : {}),
    },
  };
}
