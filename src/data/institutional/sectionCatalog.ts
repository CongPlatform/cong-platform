import type { InstitutionalSectionType } from "../../services/institutionalService";

export type InstitutionalFieldKind =
  | "text"
  | "textarea"
  | "image"
  | "action"
  | "collection";

export interface InstitutionalFieldDefinition {
  key: string;
  label: string;
  kind: InstitutionalFieldKind;
  help?: string;
  placeholder?: string;
  recommendedMin?: number;
  recommendedMax?: number;
  imageRatio?: string;
  itemType?: "project" | "impact" | "support" | "transparency" | "social";
}

export interface InstitutionalSectionDefinition {
  type: InstitutionalSectionType;
  name: string;
  shortDescription: string;
  purpose: string;
  fields: InstitutionalFieldDefinition[];
  quickTips: string[];
  defaultContent: Record<string, unknown>;
}

export const sectionCatalog: readonly InstitutionalSectionDefinition[] = [
  {
    type: "organization_intro",
    name: "Início",
    shortDescription: "Capa, propósito e chamada principal",
    purpose:
      "Ajude o visitante a entender rapidamente quem é a organização e por que seu trabalho importa.",
    fields: [
      {
        key: "eyebrow",
        label: "Texto auxiliar",
        kind: "text",
        recommendedMax: 100,
        placeholder: "Ex.: Educação e desenvolvimento comunitário",
      },
      {
        key: "title",
        label: "Título principal",
        kind: "text",
        recommendedMax: 90,
        placeholder: "Uma frase clara sobre a transformação que vocês promovem",
      },
      {
        key: "description",
        label: "Descrição",
        kind: "textarea",
        recommendedMin: 120,
        recommendedMax: 320,
        help: "Resuma a causa, a atuação e, quando fizer sentido, quem é atendido.",
      },
      {
        key: "image",
        label: "Imagem principal",
        kind: "image",
        imageRatio: "16:9",
        help: "Prefira uma foto real que represente o trabalho da organização.",
      },
      {
        key: "primaryAction",
        label: "Ação principal",
        kind: "action",
      },
      {
        key: "secondaryAction",
        label: "Ação secundária",
        kind: "action",
      },
    ],
    quickTips: [
      "Use uma mensagem que alguém consiga entender em poucos segundos.",
      "Evite começar pela história completa da organização.",
      "A imagem deve reforçar a atuação, não competir com o texto.",
    ],
    defaultContent: {
      eyebrow: "",
      title: "Apresente sua organização",
      description:
        "Explique de forma simples o que vocês fazem e por que esse trabalho importa.",
      image: null,
      primaryAction: null,
      secondaryAction: null,
    },
  },
  {
    type: "organization_about",
    name: "Sobre",
    shortDescription: "História, identidade e atuação",
    purpose:
      "Explique quem vocês são, quem atendem, onde atuam e como a organização surgiu.",
    fields: [
      {
        key: "eyebrow",
        label: "Texto auxiliar",
        kind: "text",
        recommendedMax: 100,
      },
      {
        key: "title",
        label: "Título",
        kind: "text",
        recommendedMax: 90,
      },
      {
        key: "description",
        label: "Descrição",
        kind: "textarea",
        recommendedMin: 300,
        recommendedMax: 600,
        help: "Conte quem vocês são, quem atendem, onde atuam e o que motivou a criação da organização.",
      },
      {
        key: "image",
        label: "Imagem",
        kind: "image",
        imageRatio: "4:3",
        help: "Uma foto real da atuação costuma funcionar melhor do que uma imagem genérica.",
      },
      {
        key: "action",
        label: "Ação opcional",
        kind: "action",
      },
    ],
    quickTips: [
      "Explique quem vocês são em linguagem simples.",
      "Diga quem é atendido e onde a organização atua.",
      "Se houver história longa, deixe os detalhes para uma página própria no futuro.",
    ],
    defaultContent: {
      eyebrow: "Quem somos",
      title: "Conte quem vocês são",
      description:
        "Use este espaço para apresentar a história, o público atendido e a região de atuação da organização.",
      image: null,
      action: null,
    },
  },
  {
    type: "projects_showcase",
    name: "Projetos",
    shortDescription: "Projetos, programas e iniciativas",
    purpose:
      "Apresente as principais iniciativas da organização sem transformar a página em uma lista extensa de detalhes.",
    fields: [
      {
        key: "title",
        label: "Título",
        kind: "text",
        recommendedMax: 100,
      },
      {
        key: "description",
        label: "Introdução",
        kind: "textarea",
        recommendedMax: 350,
      },
      {
        key: "items",
        label: "Projetos",
        kind: "collection",
        itemType: "project",
      },
    ],
    quickTips: [
      "Dê prioridade aos projetos atuais ou mais representativos.",
      "Use descrições curtas e deixe informações detalhadas para páginas específicas.",
      "Evite repetir o mesmo texto da seção Quem somos.",
    ],
    defaultContent: {
      title: "Nossos projetos",
      description: "Mostre as principais iniciativas da organização.",
      items: [],
    },
  },
  {
    type: "impact_metrics",
    name: "Impacto",
    shortDescription: "Indicadores, resultados e alcance",
    purpose:
      "Mostre resultados que a organização consegue confirmar, com período ou contexto quando necessário.",
    fields: [
      {
        key: "title",
        label: "Título",
        kind: "text",
        recommendedMax: 100,
      },
      {
        key: "description",
        label: "Introdução",
        kind: "textarea",
        recommendedMax: 350,
      },
      {
        key: "items",
        label: "Indicadores",
        kind: "collection",
        itemType: "impact",
      },
    ],
    quickTips: [
      "Use somente números que a organização possa confirmar.",
      "Informe o período quando o indicador puder mudar com o tempo.",
      "Poucos indicadores relevantes costumam comunicar melhor do que muitos números.",
    ],
    defaultContent: {
      title: "Nosso impacto",
      description: "Apresente resultados reais e verificáveis da organização.",
      items: [],
    },
  },
  {
    type: "support_actions",
    name: "Como ajudar",
    shortDescription: "Doações, voluntariado e outras formas de apoio",
    purpose:
      "Mostre caminhos concretos para quem quer apoiar a organização.",
    fields: [
      {
        key: "title",
        label: "Título",
        kind: "text",
        recommendedMax: 100,
      },
      {
        key: "description",
        label: "Introdução",
        kind: "textarea",
        recommendedMax: 350,
      },
      {
        key: "items",
        label: "Formas de apoio",
        kind: "collection",
        itemType: "support",
      },
    ],
    quickTips: [
      "Cada opção deve explicar claramente o que a pessoa precisa fazer.",
      "Mostre apenas formas de apoio que a organização realmente consegue receber.",
      "Use uma ação principal quando houver um caminho prioritário.",
    ],
    defaultContent: {
      title: "Como ajudar",
      description: "Apresente as formas reais de participação e apoio.",
      items: [],
    },
  },
  {
    type: "transparency",
    name: "Transparência",
    shortDescription: "Relatórios, documentos e prestação de contas",
    purpose:
      "Organize informações que ajudem o público a compreender a governança e a prestação de contas da organização.",
    fields: [
      {
        key: "title",
        label: "Título",
        kind: "text",
        recommendedMax: 100,
      },
      {
        key: "description",
        label: "Introdução",
        kind: "textarea",
        recommendedMax: 400,
      },
      {
        key: "items",
        label: "Documentos e informações",
        kind: "collection",
        itemType: "transparency",
      },
    ],
    quickTips: [
      "Organize os documentos por finalidade ou período.",
      "Use nomes claros em vez de nomes internos de arquivo.",
      "Revise se o documento pode ser publicado antes de adicionar o link.",
    ],
    defaultContent: {
      title: "Transparência",
      description:
        "Reúna documentos e informações que ajudem o público a acompanhar a atuação da organização.",
      items: [],
    },
  },
  {
    type: "organization_contact",
    name: "Contato",
    shortDescription: "Canais oficiais, endereço e redes",
    purpose:
      "Facilite o contato com a organização usando somente canais oficiais e atualizados.",
    fields: [
      {
        key: "title",
        label: "Título",
        kind: "text",
        recommendedMax: 100,
      },
      {
        key: "description",
        label: "Introdução",
        kind: "textarea",
        recommendedMax: 300,
      },
      { key: "email", label: "E-mail", kind: "text" },
      { key: "phone", label: "Telefone", kind: "text" },
      { key: "whatsapp", label: "WhatsApp", kind: "text" },
      { key: "address", label: "Endereço", kind: "textarea" },
      { key: "hours", label: "Horários", kind: "textarea" },
      {
        key: "socialLinks",
        label: "Redes sociais",
        kind: "collection",
        itemType: "social",
      },
    ],
    quickTips: [
      "Use canais que alguém da organização realmente acompanha.",
      "Evite publicar telefones pessoais sem necessidade.",
      "Informe horários quando houver atendimento presencial ou por telefone.",
    ],
    defaultContent: {
      title: "Entre em contato",
      description: "Informe os canais oficiais da organização.",
      email: "",
      phone: "",
      whatsapp: "",
      address: "",
      hours: "",
      socialLinks: [],
    },
  },
  {
    type: "custom_content",
    name: "Seção livre",
    shortDescription: "Comece com uma estrutura e combine elementos",
    purpose:
      "Crie uma composição própria usando textos, imagens, botões, indicadores e outros elementos da CONG.",
    fields: [],
    quickTips: [
      "Comece com poucos elementos e acrescente apenas o que ajuda a comunicar.",
      "A CONG mantém a responsividade enquanto você reorganiza a composição.",
      "Use cores específicas com moderação para preservar a identidade da organização.",
    ],
    defaultContent: {},
  },
  {
    type: "site_footer",
    name: "Rodapé",
    shortDescription: "Identidade, contato e links finais",
    purpose:
      "Finalize o site com informações essenciais, canais oficiais e links úteis.",
    fields: [
      {
        key: "title",
        label: "Nome ou chamada",
        kind: "text",
        recommendedMax: 160,
      },
      {
        key: "description",
        label: "Descrição curta",
        kind: "textarea",
        recommendedMax: 300,
      },
      { key: "email", label: "E-mail", kind: "text" },
      { key: "phone", label: "Telefone", kind: "text" },
      {
        key: "socialLinks",
        label: "Redes sociais",
        kind: "collection",
        itemType: "social",
      },
      {
        key: "copyright",
        label: "Texto final",
        kind: "text",
        recommendedMax: 220,
      },
    ],
    quickTips: [
      "Mantenha o rodapé curto e fácil de escanear.",
      "Use apenas canais oficiais e atualizados.",
      "Inclua políticas e informações legais quando forem necessárias.",
    ],
    defaultContent: {
      title: "",
      description: "",
      email: "",
      phone: "",
      socialLinks: [],
      copyright: "",
    },
  },
];

export function getSectionDefinition(
  sectionType: InstitutionalSectionType,
): InstitutionalSectionDefinition {
  const definition = sectionCatalog.find((item) => item.type === sectionType);

  if (!definition) {
    throw new Error(`Tipo de seção não reconhecido: ${sectionType}`);
  }

  return definition;
}

export function createDefaultSectionContent(
  sectionType: InstitutionalSectionType,
): Record<string, unknown> {
  return structuredClone(getSectionDefinition(sectionType).defaultContent);
}
