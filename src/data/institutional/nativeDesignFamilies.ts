import type { InstitutionalSectionType } from "../../services/institutionalService";

export type NativeDesignFamilyId =
  | "horizonte"
  | "territorio-vivo"
  | "acolher"
  | "essencial"
  | "comunidade"
  | "vozes"
  | "pulso"
  | "profundezas"
  | "sereno"
  | "conexao";

export interface NativeDesignFamily {
  id: NativeDesignFamilyId;
  name: string;
  category: string;
  description: string;
  character: string;
  bestFor: string;
  composition: string;
  traits: readonly [string, string, string];
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export const nativeDesignFamilies: readonly NativeDesignFamily[] = [
  {
    id: "horizonte",
    name: "Horizonte Editorial",
    category: "Editorial · educação e oportunidades",
    description:
      "Editorial, confiante e arejado, com tipografia forte, fotografia protagonista e leitura muito clara.",
    character: "credibilidade, oportunidade e futuro",
    bestFor: "educação, formação, juventude e desenvolvimento profissional",
    composition:
      "editorial assimétrico · fotografia recortada · dados em faixa",
    traits: ["Editorial", "Arejado", "Tipografia forte"],
    palette: {
      primary: "#123C73",
      secondary: "#E85D3F",
      accent: "#F7B733",
      background: "#FFFDF8",
      text: "#0B1E3A",
    },
  },
  {
    id: "territorio-vivo",
    name: "Território Vivo",
    category: "Imersivo · natureza e território",
    description:
      "Fotográfico e imersivo, com escala territorial, dados, mapas e forte presença de natureza.",
    character: "preservação, escala e urgência ambiental",
    bestFor: "meio ambiente, biodiversidade, clima e conservação",
    composition: "hero imersivo · mapas e território · cartões fotográficos",
    traits: ["Imersivo", "Territorial", "Fotográfico"],
    palette: {
      primary: "#123F2A",
      secondary: "#2F6B46",
      accent: "#B7D84B",
      background: "#F7F8F0",
      text: "#10271B",
    },
  },
  {
    id: "acolher",
    name: "Acolher",
    category: "Afetivo · cuidado e proteção",
    description:
      "Quente, próximo e afetivo, com cantos generosos, imagens acolhedoras e chamadas simples.",
    character: "carinho, proximidade e segunda chance",
    bestFor: "proteção animal, abrigos, acolhimento e redes de cuidado",
    composition: "formas orgânicas · cartões acolhedores · histórias próximas",
    traits: ["Afetivo", "Orgânico", "Acolhedor"],
    palette: {
      primary: "#8C4A2F",
      secondary: "#5B7047",
      accent: "#E9B57B",
      background: "#FFF8EF",
      text: "#2E241E",
    },
  },
  {
    id: "essencial",
    name: "Essencial",
    category: "Institucional · saúde e assistência",
    description:
      "Direto, sóbrio e orientado a confiança, com contraste forte, informação objetiva e impacto verificável.",
    character: "seriedade, urgência e confiança",
    bestFor:
      "saúde, assistência emergencial, ajuda humanitária e serviços essenciais",
    composition: "alto contraste · informação objetiva · prova de impacto",
    traits: ["Institucional", "Direto", "Confiável"],
    palette: {
      primary: "#D71920",
      secondary: "#0E4C5A",
      accent: "#F5B32B",
      background: "#FCFCFB",
      text: "#111921",
    },
  },
  {
    id: "comunidade",
    name: "Comunidade",
    category: "Terracota · moradia e desenvolvimento local",
    description:
      "Material e humano, com tons quentes, blocos sólidos, transformação concreta e narrativa de território.",
    character: "dignidade, pertencimento e reconstrução",
    bestFor:
      "moradia, saneamento, infraestrutura e desenvolvimento comunitário",
    composition: "blocos sólidos · antes e depois · narrativa de território",
    traits: ["Comunitário", "Material", "Terracota"],
    palette: {
      primary: "#9A3F25",
      secondary: "#264D3A",
      accent: "#E7A64A",
      background: "#FFF8EC",
      text: "#332018",
    },
  },
  {
    id: "vozes",
    name: "Vozes",
    category: "Expressivo · direitos e advocacy",
    description:
      "Editorial e expressivo, com contraste emocional, recortes fortes e espaço para histórias e posicionamento.",
    character: "força, autonomia e identidade",
    bestFor: "direitos, mulheres, diversidade, advocacy e redes de apoio",
    composition:
      "editorial expressivo · recortes fortes · histórias protagonistas",
    traits: ["Expressivo", "Editorial", "Humano"],
    palette: {
      primary: "#74164D",
      secondary: "#B72F68",
      accent: "#EF6C9C",
      background: "#FFF4F7",
      text: "#351026",
    },
  },
  {
    id: "pulso",
    name: "Pulso",
    category: "Energético · juventude, esporte e cultura",
    description:
      "Urbano, energético e contrastado, com tipografia grande, recortes secos e ritmo visual rápido.",
    character: "movimento, energia e oportunidade",
    bestFor:
      "esporte, juventude, cultura urbana, música e projetos de periferia",
    composition: "pôster urbano · diagonais · números e títulos gigantes",
    traits: ["Energético", "Urbano", "Alto contraste"],
    palette: {
      primary: "#0A1724",
      secondary: "#087BF4",
      accent: "#F3EE0A",
      background: "#F8F8F4",
      text: "#07111B",
    },
  },
  {
    id: "profundezas",
    name: "Profundezas",
    category: "Científico · oceanos e pesquisa",
    description:
      "Cinematográfico e orientado a dados, com fundos escuros, grandes imagens, mapas e módulos de pesquisa.",
    character: "ciência, descoberta e escala",
    bestFor:
      "oceanos, pesquisa, biodiversidade, ciência cidadã e conservação marinha",
    composition: "cinematográfico · mapas e dados · módulos de pesquisa",
    traits: ["Científico", "Cinematográfico", "Dados"],
    palette: {
      primary: "#043C52",
      secondary: "#087B97",
      accent: "#2ED9E7",
      background: "#F1FBFC",
      text: "#062C3D",
    },
  },
  {
    id: "sereno",
    name: "Sereno",
    category: "Acolhedor · cuidado e longevidade",
    description:
      "Calmo, elegante e humano, com muito respiro, tons naturais e histórias em primeiro plano.",
    character: "cuidado, companhia e dignidade",
    bestFor:
      "idosos, saúde mental, assistência social, cuidadores e convivência",
    composition:
      "muito respiro · curvas suaves · depoimentos em primeiro plano",
    traits: ["Calmo", "Humano", "Elegante"],
    palette: {
      primary: "#2F4B37",
      secondary: "#9A7A4A",
      accent: "#D7B574",
      background: "#FCF8EF",
      text: "#253229",
    },
  },
  {
    id: "conexao",
    name: "Conexão",
    category: "Versátil · múltiplas causas",
    description:
      "Neutro, modular e contemporâneo, criado para adaptar bem a diferentes causas sem perder personalidade.",
    character: "clareza, colaboração e impacto coletivo",
    bestFor:
      "organizações multicause, institutos, redes e projetos comunitários",
    composition: "modular equilibrado · cards claros · mistura de causas",
    traits: ["Versátil", "Modular", "Contemporâneo"],
    palette: {
      primary: "#1A5F43",
      secondary: "#365BA8",
      accent: "#F2B64A",
      background: "#FBFCF9",
      text: "#162A22",
    },
  },
] as const;

const sectionStyleKey: Record<InstitutionalSectionType, string> = {
  site_header: "header",
  organization_intro: "hero",
  organization_about: "about",
  projects_showcase: "projects",
  impact_metrics: "impact",
  support_actions: "support",
  transparency: "transparency",
  organization_contact: "contact",
  custom_content: "story",
  site_footer: "footer",
};

export function nativeFamilyVisualStyle(
  familyId: NativeDesignFamilyId,
  sectionType: InstitutionalSectionType,
): string {
  return `${familyId}-${sectionStyleKey[sectionType]}`;
}

export function findNativeDesignFamilyById(
  id: string | null | undefined,
): NativeDesignFamily | undefined {
  if (!id) return undefined;
  return nativeDesignFamilies.find((family) => family.id === id);
}

export function findNativeDesignFamilyByName(
  name: string,
): NativeDesignFamily | undefined {
  return nativeDesignFamilies.find((family) => family.name === name);
}

export function findNativeDesignFamilyByCategory(
  category: string,
): NativeDesignFamily | undefined {
  const normalized = category.trim().toLocaleLowerCase("pt-BR");
  return nativeDesignFamilies.find(
    (family) => family.category.toLocaleLowerCase("pt-BR") === normalized,
  );
}

export function findNativeDesignFamilyByVisualStyle(
  visualStyle: unknown,
): NativeDesignFamily | undefined {
  if (typeof visualStyle !== "string") return undefined;
  return nativeDesignFamilies.find((family) =>
    visualStyle.startsWith(`${family.id}-`),
  );
}

export function nativeFamilyOrder(name: string): number {
  const index = nativeDesignFamilies.findIndex(
    (family) => family.name === name,
  );
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
