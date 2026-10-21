import type {
  InstitutionalColorValue,
  InstitutionalElementStyle,
  InstitutionalLayoutNode,
} from "../../../services/institutionalService";
import { createElementNode } from "../../../utils/institutionalLayout";

export type EditorialCategory = "manifestos" | "historias" | "impacto" | "convites" | "organizacao";

export interface EditorialPiece {
  id: string;
  name: string;
  category: EditorialCategory;
  summary: string;
  eyebrow: string;
  heading: string;
  body: string;
  label: string;
  theme: "ocean" | "sunset" | "forest" | "violet" | "ink";
  layout: "split" | "poster" | "feature" | "columns" | "statement";
}

export const editorialCategories: ReadonlyArray<{ id: EditorialCategory | "all"; name: string }> = [
  { id: "all", name: "Todos" },
  { id: "manifestos", name: "Manifestos" },
  { id: "historias", name: "Histórias" },
  { id: "impacto", name: "Resultados" },
  { id: "convites", name: "Convites" },
  { id: "organizacao", name: "Estruturas" },
];

export const editorialPieces: readonly EditorialPiece[] = [
  {
    id: "manifesto-causa",
    name: "Manifesto da causa",
    category: "manifestos",
    eyebrow: "NOSSA RAZÃO DE EXISTIR",
    heading: "O futuro se constrói com gente.",
    body: "Cada encontro é uma oportunidade de transformar o território. Nossa missão começa na escuta e cresce com a força de quem acredita na comunidade.",
    summary: "Abertura expressiva com selo, narrativa e convite.",
    label: "Conheça a nossa história",
    theme: "ocean",
    layout: "split",
  },
  {
    id: "manifesto-editorial",
    name: "Página de manifesto",
    category: "manifestos",
    eyebrow: "UM CONVITE À MUDANÇA",
    heading: "Não fazemos por alguém. Fazemos juntos.",
    body: "Acreditamos em caminhos construídos com respeito, presença e continuidade. Uma transformação verdadeira não cabe em uma única fotografia.",
    summary: "Composição editorial de impacto e ritmo tipográfico.",
    label: "Faça parte desse movimento",
    theme: "ink",
    layout: "poster",
  },
  {
    id: "historia-retrato",
    name: "História com retrato",
    category: "historias",
    eyebrow: "HISTÓRIAS QUE NOS MOVEM",
    heading: "Por trás de cada número existe uma vida.",
    body: "Conheça os caminhos de quem transforma o lugar onde vive. A fotografia ilustrativa pode ser trocada pela imagem real da sua organização.",
    summary: "Narrativa com campanha fotográfica editável.",
    label: "Descubra mais histórias",
    theme: "sunset",
    layout: "feature",
  },
  {
    id: "historia-memoria",
    name: "Memória da comunidade",
    category: "historias",
    eyebrow: "O TEMPO FEITO DE ENCONTROS",
    heading: "Nossa história é feita de muitos começos.",
    body: "Projetos, parceiros, voluntários e famílias escrevem juntos os próximos capítulos. Uma trajetória que se reconhece no que produz para todos.",
    summary: "Introdução acompanhada de marcos históricos.",
    label: "Acompanhe a trajetória",
    theme: "forest",
    layout: "columns",
  },
  {
    id: "dados-humanos",
    name: "Números com significado",
    category: "impacto",
    eyebrow: "IMPACTO COM CONTEXTO",
    heading: "Não são apenas números. São possibilidades.",
    body: "Os indicadores ajudam a acompanhar o trabalho e tornam os resultados compreensíveis. Substitua os exemplos por números confirmados antes de publicar.",
    summary: "Título forte, contexto e gráfico de dados configurável.",
    label: "Veja nossos resultados",
    theme: "violet",
    layout: "feature",
  },
  {
    id: "dados-prestacao",
    name: "Transparência acessível",
    category: "impacto",
    eyebrow: "COMPROMISSO COM A CONFIANÇA",
    heading: "Cada recurso tem uma história para contar.",
    body: "Informar com clareza fortalece os vínculos. Acompanhe como as contribuições são organizadas e destinadas às atividades da organização.",
    summary: "Mensagem editorial com dados em destaque.",
    label: "Acompanhar resultados",
    theme: "ocean",
    layout: "columns",
  },
  {
    id: "convite-abraco",
    name: "Convite para participar",
    category: "convites",
    eyebrow: "SEU LUGAR É AQUI",
    heading: "Existem muitas formas de fazer parte.",
    body: "Compartilhe seu tempo, suas ideias ou recursos. Toda contribuição fortalece os projetos e ajuda a abrir novas oportunidades para a comunidade.",
    summary: "Convite acolhedor com caminhos de participação.",
    label: "Quero participar",
    theme: "sunset",
    layout: "columns",
  },
  {
    id: "organizacao-comparativo",
    name: "Duas frentes, um propósito",
    category: "organizacao",
    eyebrow: "COMO TRABALHAMOS",
    heading: "Duas formas de estar presente.",
    body: "Acolhimento e transformação caminham lado a lado. Organize os conteúdos em colunas com orientações claras e destaques editáveis.",
    summary: "Cabeçalho, narrativa e duas frentes de atuação.",
    label: "Conheça nossas ações",
    theme: "forest",
    layout: "columns",
  },
  {
    id: "organizacao-numeros",
    name: "Relatório com narrativa",
    category: "organizacao",
    eyebrow: "DADOS E TRANSFORMAÇÃO",
    heading: "Os resultados contam uma história.",
    body: "Acompanhe o alcance dos projetos com dados claros e contexto suficiente para compreender cada conquista.",
    summary: "Introdução editorial e painel de indicadores.",
    label: "Ver prestação de contas",
    theme: "violet",
    layout: "feature",
  },
  {
    id: "organizacao-vozes",
    name: "Galeria de histórias",
    category: "organizacao",
    eyebrow: "NOSSA REDE",
    heading: "Vozes que criam caminhos.",
    body: "Pessoas e experiências dão sentido ao nosso trabalho. Apresente os relatos da comunidade com presença e respeito.",
    summary: "Composição de texto e depoimentos navegáveis.",
    label: "Conhecer histórias",
    theme: "sunset",
    layout: "feature",
  },
  {
    id: "convite-movimento",
    name: "Movimento coletivo",
    category: "convites",
    eyebrow: "O PRÓXIMO CAPÍTULO COMEÇA AGORA",
    heading: "Sua presença muda a história.",
    body: "Uma rede de apoio se faz com pessoas diversas, talentos diferentes e o mesmo compromisso com a dignidade de todos.",
    summary: "Cartaz editorial e chamada de ação em destaque.",
    label: "Junte-se à nossa rede",
    theme: "forest",
    layout: "poster",
  },
];

const originalPalettes: Record<EditorialPiece["theme"], [string, string, string]> = {
  ocean: ["#0b4260", "#e7f4f8", "#ecae58"],
  sunset: ["#963b3f", "#fff3e9", "#e5a14c"],
  forest: ["#175849", "#edf5e8", "#c4a968"],
  violet: ["#522886", "#f2edf9", "#d990b4"],
  ink: ["#202939", "#f5f1e8", "#bd7658"],
};

function element(
  type: "heading" | "text" | "button" | "icon",
  value: string,
  style: InstitutionalElementStyle,
): InstitutionalLayoutNode {
  const base = createElementNode(type);
  if (base.type !== "element") return base;
  const resolvedValue = type === "button" ? { label: value, href: "#" } : value;
  return { ...base, value: resolvedValue, style: { ...base.style, ...style } };
}

function stack(children: InstitutionalLayoutNode[], gap: "small" | "medium" | "large" = "small"): InstitutionalLayoutNode {
  return { type: "stack", id: crypto.randomUUID(), gap, align: "stretch", children };
}

export function createEditorialPieceNode(
  pieceId: string,
  inheritBrand = true,
): InstitutionalLayoutNode | null {
  const piece = editorialPieces.find((entry) => entry.id === pieceId);
  if (!piece) return null;
  const [originalPrimary, originalSurface, originalAccent] = originalPalettes[piece.theme];
  const primary: InstitutionalColorValue = inheritBrand ? "primary.strong" : originalPrimary as `#${string}`;
  const accent: InstitutionalColorValue = inheritBrand ? "accent" : originalAccent as `#${string}`;
  const surface: InstitutionalColorValue = inheritBrand ? "background" : originalSurface as `#${string}`;
  const eyebrow = element("text", piece.eyebrow, {
    color: accent,
    fontPreset: "caption",
    fontSize: 13,
    width: "100",
  });
  const heading = element("heading", piece.heading, {
    color: primary,
    fontPreset: "display",
    fontSize: piece.layout === "poster" ? 64 : 48,
    width: "100",
  });
  const body = element("text", piece.body, {
    color: inheritBrand ? "text" : "#263646",
    fontPreset: "body",
    fontSize: 19,
    width: "100",
  });
  const action = element("button", piece.label, {
    backgroundColor: primary,
    color: "#ffffff",
    radius: "pill",
    width: "auto",
  });
  const textGroup = stack([eyebrow, heading, body, action], "medium");

  if (piece.id === "organizacao-numeros") {
    return stack([textGroup, createElementNode("data_chart")], "large");
  }

  if (piece.id === "organizacao-vozes") {
    return stack([textGroup, createElementNode("testimonial_slider")], "large");
  }

  if (piece.id === "organizacao-comparativo") {
    return stack([textGroup, createElementNode("action_grid")], "large");
  }

  if (piece.id === "historia-retrato") {
    const media = createElementNode("campaign_card");
    if (media.type === "element" && media.value && typeof media.value === "object" && "kind" in media.value && media.value.kind === "campaign_card") {
      return {
        type: "columns", id: crypto.randomUUID(), ratio: "1:1", gap: "large", surface: "none",
        children: [textGroup, { ...media, value: { ...media.value, title: "Vidas que se encontram", description: "Uma imagem ilustrativa para começar a narrativa; troque-a pela sua história.", illustration: "comunidade" } }],
      };
    }
  }

  if (piece.id === "dados-humanos") {
    const chart = createElementNode("data_chart");
    return {
      type: "columns", id: crypto.randomUUID(), ratio: "1:1", gap: "large", surface: "none",
      children: [textGroup, chart],
    };
  }

  if (piece.id === "historia-memoria") {
    return stack([textGroup, createElementNode("community_timeline")], "large");
  }

  if (piece.id === "dados-prestacao") {
    return stack([textGroup, createElementNode("data_chart")], "large");
  }

  if (piece.id === "convite-abraco") {
    return stack([textGroup, createElementNode("action_grid")], "large");
  }

  const icon = element("icon", piece.layout === "poster" ? "heart-handshake" : "heart", {
    color: accent, iconSizePx: 76, width: "auto",
  });
  const supporting = stack([
    icon,
    element("text", "Pessoas, ideias e iniciativas conectadas para produzir mudanças duradouras.", {
      fontSize: 23, color: primary, backgroundColor: surface, width: "100",
    }),
    element("text", "Uma composição completa, com conteúdo que pode ser personalizado.", {
      fontSize: 15, color: inheritBrand ? "text.soft" : "#45576a", width: "100",
    }),
  ], "medium");
  return {
    type: "columns",
    id: crypto.randomUUID(),
    ratio: piece.layout === "poster" ? "2:1" : "3:2",
    gap: "large",
    surface: piece.layout === "poster" ? "highlight" : "none",
    children: [textGroup, supporting],
  };
}
