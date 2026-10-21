/**
 * Curated, reusable section compositions. These are layout data, not screenshots:
 * the editor, its gallery, and the published page render the same document.
 * No example copy is embedded in the saved layout.
 */
import type {
  InstitutionalLayoutNode as Node,
  InstitutionalSectionStyle,
  InstitutionalSectionType,
  InstitutionalVariant,
} from "../../../services/institutionalService";
import { defaultSettingsForVariant } from "../../../utils/institutionalVariants";
import { createRichPresetNode } from "./richBlockPresets";

export type CompositionCategory =
  | "navegacao"
  | "apresentacao"
  | "historia"
  | "iniciativas"
  | "impacto"
  | "participacao"
  | "confianca";

export interface SiteComposition {
  id: string;
  title: string;
  description: string;
  category: CompositionCategory;
  sectionType: InstitutionalSectionType;
  traits: readonly string[];
  layout: Node;
  sectionStyle: InstitutionalSectionStyle;
  /** Used only to pick an appropriate existing published variant as the base. */
  preferredFamily?: string;
}

// Media slots keep the same frame before and after replacing the image.
const slot = (name: string, presentation: string): Node => ({
  type: "slot",
  slot: name,
  presentation,
  ...(["heroImage", "wideImage", "cardImage", "image"].includes(presentation)
    ? {
        style: {
          imageFit: "cover" as const,
          imageAspect: (presentation === "wideImage"
            ? "16:9"
            : presentation === "cardImage"
              ? "4:3"
              : "4:3") as "16:9" | "4:3",
          imageFrame: (presentation === "heroImage"
            ? "blob"
            : presentation === "cardImage"
              ? "rounded"
              : "rectangle") as "blob" | "rounded" | "rectangle",
        },
      }
    : {}),
});
const stack = (
  children: Node[],
  gap: "small" | "medium" | "large" = "medium",
  extras: Partial<Extract<Node, { type: "stack" }>> = {},
): Node => ({
  type: "stack",
  gap,
  children,
  ...extras,
});
const columns = (
  left: Node,
  right: Node,
  ratio: "1:1" | "1:2" | "2:1" = "1:1",
  gap: "small" | "medium" | "large" = "large",
): Node => ({
  type: "columns",
  ratio,
  gap,
  children: [left, right],
});
const repeat = (
  source: string,
  columnsCount: 1 | 2 | 3 | 4,
  item: Node,
  gap: "small" | "medium" | "large" = "medium",
): Node => ({
  type: "repeat",
  source,
  columns: columnsCount,
  gap,
  item,
});
const heading = (kind: "display" | "heading" = "heading") =>
  slot("title", kind);
const description = (kind: "lead" | "body" = "lead") =>
  slot("description", kind);
const actions = () =>
  stack(
    [
      slot("primaryAction", "primaryAction"),
      slot("secondaryAction", "secondaryAction"),
    ],
    "small",
    { direction: "row" },
  );
const introCopy = (kind: "display" | "heading" = "display") =>
  stack(
    [slot("eyebrow", "eyebrow"), heading(kind), description(), actions()],
    "medium",
  );
const aboutCopy = () =>
  stack(
    [
      slot("eyebrow", "eyebrow"),
      heading(),
      description("body"),
      slot("action", "secondaryAction"),
    ],
    "medium",
  );
const projectItem = (photoFirst = true): Node =>
  stack(
    photoFirst
      ? [
          slot("image", "cardImage"),
          slot("category", "eyebrow"),
          slot("title", "itemTitle"),
          slot("description", "itemBody"),
          slot("action", "secondaryAction"),
        ]
      : [
          slot("category", "eyebrow"),
          slot("title", "itemTitle"),
          slot("description", "itemBody"),
          slot("image", "cardImage"),
          slot("action", "secondaryAction"),
        ],
    "small",
    { surface: "card" },
  );
const metricItem = () =>
  stack(
    [
      slot("label", "metricIcon"),
      slot("value", "metricValue"),
      slot("label", "metricLabel"),
      slot("period", "caption"),
      slot("source", "caption"),
    ],
    "small",
  );
const supportItem = () =>
  stack(
    [
      slot("title", "itemTitle"),
      slot("description", "itemBody"),
      slot("action", "primaryAction"),
    ],
    "medium",
    { surface: "card" },
  );
const documentItem = () =>
  stack(
    [
      slot("category", "eyebrow"),
      slot("title", "itemTitle"),
      slot("description", "itemBody"),
      slot("period", "caption"),
      slot("url", "documentLink"),
    ],
    "small",
    { surface: "card" },
  );
const contactFields = () =>
  stack(
    [
      slot("email", "contactLink"),
      slot("phone", "contactLine"),
      slot("whatsapp", "contactLine"),
      slot("address", "contactLine"),
      slot("hours", "caption"),
    ],
    "medium",
  );

export const compositionCategories: readonly {
  id: CompositionCategory | "todas";
  label: string;
}[] = [
  { id: "todas", label: "Todas" },
  { id: "navegacao", label: "Cabeçalhos" },
  { id: "apresentacao", label: "Apresentação" },
  { id: "historia", label: "Nossa história" },
  { id: "iniciativas", label: "Projetos" },
  { id: "impacto", label: "Impacto" },
  { id: "participacao", label: "Participação" },
  { id: "confianca", label: "Confiança" },
];

/** Rich graphic elements are plain document nodes; a preview renders the same tree the editor saves. */
const graphic = (
  id: string,
  elementType: Extract<Node, { type: "element" }>["elementType"],
  value: Extract<Node, { type: "element" }>["value"],
): Node => ({
  type: "element",
  id,
  elementType,
  value,
  style: { width: "100", color: "text" },
});
const graphicTitle = (id: string, value: string): Node => ({
  type: "element",
  id,
  elementType: "heading",
  value,
  style: { width: "100", color: "primary.strong", fontSize: 44 },
});
const graphicCopy = (id: string, value: string): Node => ({
  type: "element",
  id,
  elementType: "text",
  value,
  style: { width: "100", color: "text", fontSize: 18 },
});
const graphicLabel = (id: string, value: string): Node => ({
  type: "element",
  id,
  elementType: "text",
  value,
  style: { width: "100", color: "secondary.strong", fontSize: 14 },
});
const graphicCampaign = graphic("graphic-campaign-01", "campaign_card", {
  kind: "campaign_card",
  tag: "MODELO DE CAMPANHA",
  title: "Juntos, uma rede de cuidado",
  description:
    "Um exemplo de mobilização comunitária. Substitua a foto, atualize a meta e conecte o botão a uma página real.",
  image: null,
  illustration: "comunidade",
  raised: 3800,
  goal: 10000,
  unit: "R$",
  action: { label: "Conhecer a campanha", href: "#" },
});
const graphicGallery = graphic("graphic-gallery-01", "media_gallery", {
  kind: "media_gallery",
  title: "Retratos da nossa atuação",
  items: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      image: null,
      illustration: "comunidade",
      caption: "Ação e presença",
      focalX: 50,
      focalY: 50,
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      image: null,
      illustration: "essencial",
      caption: "Equipe e parceiros",
      focalX: 50,
      focalY: 50,
    },
    {
      id: "10000000-0000-4000-8000-000000000003",
      image: null,
      illustration: "sereno",
      caption: "Pessoas e histórias",
      focalX: 50,
      focalY: 50,
    },
  ],
});
const graphicChart = graphic("graphic-chart-01", "data_chart", {
  kind: "data_chart",
  title: "Resultados em perspectiva",
  subtitle: "Dados ilustrativos. Informe apenas valores reais e verificáveis.",
  format: "donut",
  unit: "ações",
  items: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      label: "Educação",
      value: 42,
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      label: "Alimentação",
      value: 65,
    },
    {
      id: "20000000-0000-4000-8000-000000000003",
      label: "Acolhimento",
      value: 28,
    },
  ],
});
const graphicVideo = graphic("graphic-video-01", "video_embed", {
  kind: "video_embed",
  title: "Uma história contada em vídeo",
  caption: "Inclua um vídeo autorizado da sua organização.",
  url: "",
});
const graphicTabs = graphic("graphic-tabs-01", "story_tabs", {
  kind: "story_tabs",
  title: "Encontre o caminho certo",
  items: [
    {
      id: "30000000-0000-4000-8000-000000000001",
      title: "Conheça",
      description:
        "Apresente aqui as atividades e seus critérios de participação.",
    },
    {
      id: "30000000-0000-4000-8000-000000000002",
      title: "Participe",
      description:
        "Oriente voluntários, doadores e parceiros com informação clara.",
    },
    {
      id: "30000000-0000-4000-8000-000000000003",
      title: "Acompanhe",
      description: "Indique onde encontrar resultados e prestação de contas.",
    },
  ],
});

const baseSiteCompositions: readonly SiteComposition[] = [
  {
    id: "graphic-journey-chapters",
    title: "Trajetória em capítulos",
    category: "historia",
    sectionType: "custom_content",
    description: "Linha do tempo com marcos conectados e destaque editorial.",
    traits: ["História", "Cronologia", "Editorial"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("a-nossa-caminhada-k", "A NOSSA CAMINHADA"),
              graphicTitle(
                "a-nossa-caminhada-h",
                "Raízes profundas. Passos que se multiplicam.",
              ),
            ],
            "small",
          ),
          graphicCopy(
            "a-nossa-caminhada-c",
            "Cada transformação tem um começo. Apresente datas, conquistas e pessoas que fazem parte desta história.",
          ),
          "1:1",
        ),
        graphic("chapters", "community_timeline", {
          kind: "community_timeline",
          title: "Uma história construída na comunidade",
          eyebrow: "NOSSO CAMINHO",
          items: [
            {
              id: "45695ac4-469b-5aac-acb0-473442a92982",
              year: "2015",
              title: "O primeiro encontro",
              description:
                "Um grupo de vizinhos começa a organizar ações comunitárias.",
            },
            {
              id: "1d0f0a0f-1ce0-5b10-aab8-f1d9141336f2",
              year: "2019",
              title: "Novas parcerias",
              description:
                "A iniciativa conecta profissionais e pessoas voluntárias.",
            },
            {
              id: "d7d86564-36c5-58a3-b18c-63df616ad27b",
              year: "2024",
              title: "Uma rede mais forte",
              description:
                "As ações alcançam novos territórios com apoio local.",
            },
            {
              id: "54f7157d-f8cf-5907-b63d-fb4630a7a0d3",
              year: "Hoje",
              title: "O próximo capítulo",
              description: "Seguimos ampliando redes de cuidado.",
            },
          ],
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
      backgroundDecorTone: "primary",
      backgroundDecorIntensity: 11,
      ...{},
    },
  },
  {
    id: "graphic-voices-exhibition",
    title: "Vozes de uma comunidade",
    category: "historia",
    sectionType: "custom_content",
    description: "Depoimentos em destaque com galeria fotográfica.",
    traits: ["Depoimentos", "Fotografia", "Interativo"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("vx-a", "RELATOS E MEMÓRIAS"),
              graphicTitle("vx-h", "Histórias não cabem em números"),
            ],
            "small",
          ),
          graphicCopy(
            "vx-c",
            "Conecte depoimentos autorizados e registros fotográficos para apresentar as pessoas por trás das ações.",
          ),
          "2:1",
        ),
        graphic("vx-q", "testimonial_slider", {
          kind: "testimonial_slider",
          title: "Encontros que deixam marcas",
          subtitle:
            "Relatos fictícios para visualizar o formato. Use histórias reais somente com autorização.",
          items: [
            {
              id: "b73a4d6d-7307-5d2d-ab31-7a84afd80d31",
              quote:
                "A comunidade floresce quando cada pessoa encontra um lugar para contribuir.",
              author: "Júlia M.",
              role: "Relato demonstrativo",
            },
            {
              id: "4fc32bbe-aee6-5e32-ad23-7a40f64ba461",
              quote: "A escuta abriu caminhos que não imaginávamos possíveis.",
              author: "Carlos R.",
              role: "Relato demonstrativo",
            },
            {
              id: "727bd1ae-3804-5b2e-b9a8-6d2ecdb29b8e",
              quote:
                "Juntos aprendemos que o cuidado também é construído no cotidiano.",
              author: "Ana P.",
              role: "Relato demonstrativo",
            },
          ],
        }),
        graphicGallery,
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
      backgroundDecorTone: "secondary",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-paths-involvement",
    title: "Caminhos para participar",
    category: "participacao",
    sectionType: "custom_content",
    description: "Cartões de ação com ícones, narrativa e links editáveis.",
    traits: ["Participação", "Cartões", "Ações"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("participe-k", "PARTICIPE"),
              graphicTitle("participe-h", "Há muitas formas de fazer parte."),
            ],
            "small",
          ),
          graphicCopy(
            "participe-c",
            "Ofereça caminhos distintos para quem quer doar, colaborar, conhecer projetos ou aprender mais.",
          ),
          "2:1",
        ),
        graphic("inv-a", "action_grid", {
          kind: "action_grid",
          title: "Escolha sua forma de agir",
          subtitle:
            "Cada cartão direciona para uma página ou canal que você configurar.",
          items: [
            {
              id: "aed250f3-3d63-53b6-b31d-ea96a63e82a2",
              eyebrow: "VOLUNTARIADO",
              title: "Doe seu tempo",
              description:
                "Compartilhe habilidades para fortalecer a comunidade.",
              icon: "hand",
              action: { label: "Quero participar", href: "#" },
            },
            {
              id: "3a842752-af6a-5e2f-86ab-5e91aa41f883",
              eyebrow: "DOAÇÃO",
              title: "Apoie uma causa",
              description:
                "Contribuições ajudam iniciativas a ganhar continuidade.",
              icon: "heart",
              action: { label: "Quero contribuir", href: "#" },
            },
            {
              id: "ef6937bf-e38b-562a-a8af-0b99a859f34b",
              eyebrow: "CONHECIMENTO",
              title: "Conheça o trabalho",
              description: "Descubra projetos, encontros e resultados.",
              icon: "book",
              action: { label: "Ver iniciativas", href: "#" },
            },
          ],
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-donation-choices",
    title: "Doação com propósito",
    category: "participacao",
    sectionType: "custom_content",
    description:
      "Opções de valores com seleção visual, aviso de confiança e destino seguro.",
    traits: ["Doações", "Valores", "Conversão"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("faca-parte-k", "FAÇA PARTE"),
              graphicTitle("faca-parte-h", "O impacto começa com um gesto."),
            ],
            "small",
          ),
          graphicCopy(
            "faca-parte-c",
            "Escolha um caminho claro para contribuir e ajude visitantes a entender como podem participar.",
          ),
          "2:1",
        ),
        graphic("don-a", "donation_choices", {
          kind: "donation_choices",
          title: "Escolha uma contribuição",
          subtitle:
            "Valores demonstrativos para personalizar conforme cada causa.",
          currency: "R$",
          items: [
            {
              id: "94e68a87-9058-59cd-8c30-6ef89cdd624c",
              amount: 25,
              description: "Apoio pontual",
            },
            {
              id: "8c8862a0-b3ec-50c5-8f76-107fea55c62b",
              amount: 50,
              description: "Fortalece uma atividade",
            },
            {
              id: "ba8c0ec1-522e-563f-b077-49d313f292f6",
              amount: 100,
              description: "Amplia possibilidades",
            },
            {
              id: "9525440a-bf84-5067-b437-d689401c0239",
              amount: 200,
              description: "Uma rede mais forte",
            },
          ],
          action: { label: "Continuar para doação", href: "#" },
          trustNote:
            "Exemplo visual: configure uma página de doação ou checkout seguro. Nenhum pagamento é realizado aqui.",
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-territories-evidence",
    title: "Trajetória do impacto",
    category: "impacto",
    sectionType: "custom_content",
    description:
      "Indicadores, relatório visual e uma linha do tempo de resultados.",
    traits: ["Gráficos", "Impacto", "Transparência"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("te-k", "MONITORAMENTO"),
              graphicTitle("te-h", "O que os dados revelam"),
            ],
            "small",
          ),
          graphicCopy(
            "te-t",
            "Combine resultados verificados e um histórico de realizações para explicar a mudança que cada projeto acompanha.",
          ),
          "1:1",
        ),
        graphicChart,
        graphic("te-l", "community_timeline", {
          kind: "community_timeline",
          title: "Marcos do nosso trabalho",
          eyebrow: "PROCESSO E EVOLUÇÃO",
          items: [
            {
              id: "d8ac9b06-b70c-5c2b-800d-3147db4afc6f",
              year: "Etapa 1",
              title: "Escuta ativa",
              description: "Conhecemos o território e suas prioridades.",
            },
            {
              id: "51c2b986-6357-5e8a-94db-dcb4b0bd4c71",
              year: "Etapa 2",
              title: "Mobilização",
              description: "Conectamos pessoas e iniciativas locais.",
            },
            {
              id: "6a68c3bb-c253-5f6e-a81f-db5ffd12bf85",
              year: "Etapa 3",
              title: "Acompanhamento",
              description: "Registramos resultados, aprendizados e melhorias.",
            },
          ],
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
      backgroundDecorTone: "secondary",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-project-journey",
    title: "Ações que viram histórias",
    category: "iniciativas",
    sectionType: "custom_content",
    description:
      "Projetos em cartões narrativos com cronologia e experiências visuais.",
    traits: ["Projetos", "Cartões", "Linha do tempo"],
    layout: stack(
      [
        graphicLabel("pj-k", "AÇÃO NO TERRITÓRIO"),
        graphicTitle("pj-h", "Projetos com começo, presença e continuidade"),
        graphic("pj-grid", "action_grid", {
          kind: "action_grid",
          title: "Do planejamento ao encontro",
          subtitle:
            "Apresente iniciativas, serviços e áreas de atuação com destinos configuráveis.",
          items: [
            {
              id: "cf6571af-fc99-5d8e-a323-a5854c4874a7",
              eyebrow: "EDUCAÇÃO",
              title: "Aprender juntos",
              description: "Oficinas e atividades ampliam oportunidades.",
              icon: "book",
              action: { label: "Conhecer", href: "#" },
            },
            {
              id: "0a6abaf7-7c6d-52c2-baac-9e3215595b0f",
              eyebrow: "CUIDADO",
              title: "Redes de acolhimento",
              description: "Ações comunitárias conectam pessoas e serviços.",
              icon: "heart",
              action: { label: "Conhecer", href: "#" },
            },
            {
              id: "dac7cd6f-dfc9-586f-8ce0-a825de30e4f7",
              eyebrow: "TERRITÓRIO",
              title: "Cuidar do lugar",
              description:
                "Projetos locais nascem da escuta e da participação.",
              icon: "globe",
              action: { label: "Conhecer", href: "#" },
            },
          ],
        }),
        graphic("pj-l", "community_timeline", {
          kind: "community_timeline",
          title: "A jornada de cada ação",
          eyebrow: "COMO ACONTECE",
          items: [
            {
              id: "f875caa3-1a75-50bb-8856-859f9533c2d4",
              year: "01",
              title: "Escutamos",
              description: "A iniciativa começa ouvindo as necessidades.",
            },
            {
              id: "1f693b5c-c4f6-50ec-9ad8-f087b406c67e",
              year: "02",
              title: "Planejamos",
              description: "A equipe define prioridades com a comunidade.",
            },
            {
              id: "e7708171-1b96-594d-9c7a-82e2bdec0dd1",
              year: "03",
              title: "Realizamos",
              description: "As atividades acontecem no território.",
            },
            {
              id: "7c4aefa4-9cee-5b48-9cb9-5ba66484a297",
              year: "04",
              title: "Compartilhamos",
              description: "Resultados e aprendizados voltam para as pessoas.",
            },
          ],
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
      backgroundDecorTone: "primary",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-impact-human",
    title: "Indicadores com rosto e voz",
    category: "impacto",
    sectionType: "custom_content",
    description: "Gráfico combinado com relatos para contextualizar números.",
    traits: ["Impacto", "Depoimentos", "Dados"],
    layout: stack(
      [
        columns(
          graphicTitle("ih-h", "Por trás de cada indicador, uma história"),
          graphicCopy(
            "ih-t",
            "Os números apresentam escala. A escuta e os relatos ajudam a compreender o significado desses resultados.",
          ),
          "1:1",
        ),
        columns(
          graphicChart,
          graphic("ih-v", "testimonial_slider", {
            kind: "testimonial_slider",
            title: "Vozes do território",
            subtitle:
              "Depoimentos fictícios — publique apenas relatos autorizados.",
            items: [
              {
                id: "7cde528c-1a05-55ea-87f3-14030eec104f",
                quote:
                  "Poder compartilhar ideias fez muita diferença no nosso bairro.",
                author: "Sofia A.",
                role: "Relato demonstrativo",
              },
              {
                id: "99feef65-1358-5226-b3d7-fa8cb6aba3ae",
                quote: "Ver o projeto crescer foi uma experiência coletiva.",
                author: "Rafael C.",
                role: "Relato demonstrativo",
              },
            ],
          }),
          "1:1",
          "medium",
        ),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
      backgroundDecorTone: "secondary",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-care-guide",
    title: "Acolhimento sem burocracia",
    category: "participacao",
    sectionType: "custom_content",
    description: "Orientações e opções de contato em cartões e abas.",
    traits: ["Acolhimento", "Etapas", "FAQ"],
    layout: stack(
      [
        columns(
          graphicTitle("cg-h", "O primeiro passo é se sentir acolhido"),
          graphicCopy(
            "cg-t",
            "Ajude visitantes a encontrar informações claras antes de preencher qualquer formulário. Ajuste estes conteúdos à realidade do atendimento.",
          ),
          "2:1",
        ),
        graphic("cg-a", "action_grid", {
          kind: "action_grid",
          title: "Como podemos conversar?",
          subtitle:
            "Escolha um caminho, conheça as orientações e procure a equipe.",
          items: [
            {
              id: "6e5f7ed2-f2ea-5e52-95f0-1a7d9ecf37cf",
              eyebrow: "ORIENTAÇÃO",
              title: "Entenda o atendimento",
              description: "Saiba como funciona a triagem e a orientação.",
              icon: "book",
              action: { label: "Ler orientações", href: "#" },
            },
            {
              id: "05366489-e258-57bb-a972-4634d7b900f6",
              eyebrow: "ACOMPANHAMENTO",
              title: "Encontre a equipe",
              description: "Conheça os canais de contato disponíveis.",
              icon: "users",
              action: { label: "Falar com a ONG", href: "#" },
            },
            {
              id: "653297d0-b192-5da8-ac94-f9a4967e3cbf",
              eyebrow: "COMUNIDADE",
              title: "Participe da rede",
              description: "Encontre serviços e redes de apoio da sua região.",
              icon: "home",
              action: { label: "Ver possibilidades", href: "#" },
            },
          ],
        }),
        graphicTabs,
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-forest-stories",
    title: "Natureza, gente e futuro",
    category: "historia",
    sectionType: "custom_content",
    description:
      "Composição editorial para causas ambientais, com marcos e registros visuais.",
    traits: ["Meio ambiente", "Narrativa", "Fotografia"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("fs-k", "TERRITÓRIOS E MEMÓRIAS"),
              graphicTitle("fs-h", "Proteger também é contar histórias"),
            ],
            "small",
          ),
          graphicCopy(
            "fs-c",
            "Use este modelo para conectar pesquisa, comunidades e preservação em uma narrativa acessível.",
          ),
          "1:1",
        ),
        graphicGallery,
        graphic("fs-t", "community_timeline", {
          kind: "community_timeline",
          title: "Nossa relação com o território",
          eyebrow: "UMA JORNADA COLETIVA",
          items: [
            {
              id: "ca6c324e-060b-558f-a0b3-50291fc4793f",
              year: "Primeiro",
              title: "Observar",
              description:
                "Caminhadas e conversas ajudam a compreender os desafios do lugar.",
            },
            {
              id: "621296a8-47d9-50cd-804e-965485dcb06c",
              year: "Depois",
              title: "Aprender",
              description: "Ações educativas aproximam diferentes gerações.",
            },
            {
              id: "26770323-69f3-577f-b405-4c0ffe1d466f",
              year: "Agora",
              title: "Cuidar",
              description:
                "A comunidade constrói novas formas de proteger o ambiente.",
            },
          ],
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
      backgroundDecorTone: "secondary",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-trust-complete",
    title: "Prestação de contas com contexto",
    category: "confianca",
    sectionType: "custom_content",
    description:
      "Narrativa de transparência com gráfico e caminhos para explorar informações.",
    traits: ["Transparência", "Gráfico", "Navegação"],
    layout: stack(
      [
        columns(
          graphicTitle("tc-h", "Confiança se constrói com informações claras"),
          graphicCopy(
            "tc-t",
            "Mostre dados confirmados e ofereça caminhos para acessar documentos, relatórios e detalhes de cada iniciativa.",
          ),
          "2:1",
        ),
        graphicChart,
        graphic("tc-grid", "action_grid", {
          kind: "action_grid",
          title: "O que você quer conhecer?",
          subtitle: "Configure os links para documentos e páginas públicas.",
          items: [
            {
              id: "d02d1529-4f23-54c0-bc5e-a07e92d1b25f",
              eyebrow: "DADOS",
              title: "Nossos resultados",
              description:
                "Indicadores e relatórios ajudam a acompanhar o trabalho.",
              icon: "book",
              action: { label: "Ver dados", href: "#" },
            },
            {
              id: "9b2887ea-22cf-5c5f-9f5d-50cc7c911e61",
              eyebrow: "PROJETOS",
              title: "Ações e campanhas",
              description: "Conheça objetivos, investimentos e resultados.",
              icon: "heart",
              action: { label: "Ver projetos", href: "#" },
            },
            {
              id: "9e84774a-a4e3-5a1a-ad8b-16447a77508f",
              eyebrow: "EQUIPE",
              title: "Quem faz acontecer",
              description: "Pessoas e parceiros tornam as ações possíveis.",
              icon: "users",
              action: { label: "Conhecer equipe", href: "#" },
            },
          ],
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
      backgroundDecorTone: "primary",
      backgroundDecorIntensity: 11,
    },
  },
  {
    id: "graphic-campaign-journey",
    title: "Campanha, cuidado e comunidade",
    category: "participacao",
    sectionType: "custom_content",
    description: "Campanha ilustrada com progresso e caminhos para doação.",
    traits: ["Campanhas", "Doações", "Resultados"],
    layout: stack(
      [
        columns(
          graphicTitle("cj-h", "Causas que se transformam em ação"),
          graphicCopy(
            "cj-t",
            "Um espaço completo para mobilização: apresente a iniciativa, demonstre resultados e indique meios concretos para apoiar.",
          ),
          "1:1",
        ),
        graphicCampaign,
        graphic("cj-d", "donation_choices", {
          kind: "donation_choices",
          title: "Faça parte desta campanha",
          subtitle:
            "Configure o link de doação para o mecanismo que sua organização utiliza.",
          currency: "R$",
          items: [
            {
              id: "698ba03b-025b-543c-9320-640d224e2afc",
              amount: 20,
              description: "Participe",
            },
            {
              id: "79cf669a-6306-52c3-a42f-95322c62ceff",
              amount: 60,
              description: "Contribua",
            },
            {
              id: "5a8664be-4c52-50a0-bd7e-a977136464fd",
              amount: 120,
              description: "Fortaleça",
            },
            {
              id: "7b37d60d-9e31-5f0a-828f-1e483c32a837",
              amount: 250,
              description: "Amplie",
            },
          ],
          action: { label: "Continuar para doação", href: "#" },
          trustNote:
            "Exemplo visual: configure uma página de doação ou checkout seguro. Nenhum pagamento é realizado aqui.",
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 11,
    },
  },

  {
    id: "graphic-campaign-spotlight",
    title: "Campanha em evidência",
    category: "participacao",
    sectionType: "custom_content",
    description:
      "Campanha com fotografia, meta mensurável, progresso visual e ação conectável.",
    traits: ["Campanhas", "Fotografia", "Interativo"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("label-campaign-01", "FAÇA PARTE · MOBILIZAÇÃO"),
              graphicTitle(
                "title-campaign-01",
                "Um pequeno gesto pode ampliar grandes histórias",
              ),
            ],
            "small",
          ),
          graphicCopy(
            "copy-campaign-01",
            "Uma composição para apresentar uma campanha verdadeira com contexto, meta, foto e uma ação clara. Substitua os textos ilustrativos.",
          ),
          "2:1",
        ),
        graphicCampaign,
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
    },
  },
  {
    id: "graphic-gallery-story",
    title: "Ensaio de histórias",
    category: "historia",
    sectionType: "custom_content",
    description:
      "Grande galeria fotográfica com molduras substituíveis, legenda e navegação.",
    traits: ["Fotografia", "Galeria", "Narrativa"],
    layout: stack(
      [
        columns(
          graphicTitle("title-gallery-01", "Uma causa feita de encontros"),
          stack(
            [
              graphicLabel("label-gallery-01", "DIÁRIO VISUAL"),
              graphicCopy(
                "copy-gallery-01",
                "Documente as pessoas, os territórios e as ações com imagens autorizadas e legendas que contam uma história.",
              ),
            ],
            "small",
          ),
          "1:1",
        ),
        graphicGallery,
        graphicCopy(
          "caption-gallery-01",
          "Este espaço também pode acolher um depoimento breve, uma data ou o contexto das fotografias.",
        ),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
  },
  {
    id: "graphic-impact-report",
    title: "Panorama de impacto",
    category: "impacto",
    sectionType: "custom_content",
    description:
      "Visualização de dados em gráfico de rosca ou barras, com legenda acessível.",
    traits: ["Transparência", "Gráficos", "Dados"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("label-chart-01", "TRANSPARÊNCIA EM FOCO"),
              graphicTitle(
                "title-chart-01",
                "Mais do que números: histórias reais",
              ),
            ],
            "medium",
          ),
          graphicCopy(
            "copy-chart-01",
            "Apresente resultados confirmados e explique por que cada indicador importa. O gráfico permite trocar entre barras e rosca.",
          ),
          "1:1",
        ),
        graphicChart,
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
  },
  {
    id: "graphic-video-reportage",
    title: "Reportagem em vídeo",
    category: "historia",
    sectionType: "custom_content",
    description: "Player de documentário com moldura 16:9 e título editorial.",
    traits: ["Vídeo", "Documental", "Imersivo"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("label-video-01", "NOSSA VOZ"),
              graphicTitle(
                "title-video-01",
                "De perto, nossa transformação tem nome e rosto",
              ),
            ],
            "small",
          ),
          graphicCopy(
            "copy-video-01",
            "Vídeos aproximam a comunidade da missão. Mostre um depoimento autorizado, uma reportagem ou os bastidores de uma ação.",
          ),
          "2:1",
        ),
        graphicVideo,
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
  },
  {
    id: "graphic-guide-tabs",
    title: "Guia de participação",
    category: "participacao",
    sectionType: "custom_content",
    description:
      "Conteúdo em abas acessíveis, fácil de consultar sem percorrer páginas longas.",
    traits: ["Orientação", "Abas", "Interativo"],
    layout: stack(
      [
        columns(
          graphicTitle(
            "title-tabs-01",
            "Cada pessoa tem um jeito de fazer parte",
          ),
          graphicCopy(
            "copy-tabs-01",
            "Organize informações importantes em caminhos curtos, sem transformar a leitura em um formulário longo.",
          ),
          "1:1",
        ),
        graphicTabs,
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
    },
  },

  {
    id: "graphic-double-campaign",
    title: "Duas causas, um propósito",
    category: "participacao",
    sectionType: "custom_content",
    description:
      "Vitrine de campanhas em cartões contrastantes, com fotografia, indicador de arrecadação e chamadas independentes.",
    traits: ["Duas campanhas", "Fotografias", "Metas"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("double-label", "CAMPANHAS EM MOVIMENTO"),
              graphicTitle(
                "double-title",
                "Toda transformação começa com uma escolha",
              ),
            ],
            "medium",
          ),
          graphicCopy(
            "double-lead",
            "Duas mobilizações em destaque. Cada cartão tem seu próprio objetivo, imagem e caminho para participação.",
          ),
          "2:1",
        ),
        stack(
          [
            graphic("double-campaign-one", "campaign_card", {
              kind: "campaign_card",
              tag: "EDUCAÇÃO",
              title: "Um futuro que cabe em cada mochila",
              description:
                "Uma campanha ilustrativa para ampliar o acesso a materiais de estudo. Substitua pela campanha real da sua organização.",
              image: null,
              illustration: "vozes",
              raised: 2100,
              goal: 6000,
              unit: "R$",
              action: { label: "Conhecer a ação", href: "#" },
            }),
            graphic("double-campaign-two", "campaign_card", {
              kind: "campaign_card",
              tag: "COMUNIDADE",
              title: "Cuidado que chega mais longe",
              description:
                "Mobilização fictícia de apoio comunitário. Configure aqui os objetivos, a imagem e a ação correspondente.",
              image: null,
              illustration: "comunidade",
              raised: 4300,
              goal: 10000,
              unit: "R$",
              action: { label: "Quero participar", href: "#" },
            }),
          ],
          "large",
        ),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 25,
    },
  },
  {
    id: "graphic-analysis-panels",
    title: "Painel de transparência visual",
    category: "confianca",
    sectionType: "custom_content",
    description:
      "Duas leituras de dados lado a lado, com categorias editáveis e resumos explicativos.",
    traits: ["Painel de dados", "Barras", "Rosca", "Transparência"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("analytics-label", "DADOS ABERTOS · VISÃO GERAL"),
              graphicTitle(
                "analytics-head",
                "Uma gestão que mostra seus números",
              ),
            ],
            "small",
          ),
          graphicCopy(
            "analytics-desc",
            "O conteúdo abaixo demonstra os gráficos. Substitua todos os números por dados reais e identificáveis antes de publicar.",
          ),
          "2:1",
        ),
        columns(
          graphic("analytics-chart-one", "data_chart", {
            kind: "data_chart",
            title: "Distribuição de atividades",
            subtitle: "Valores fictícios para demonstração",
            format: "donut",
            unit: "ações",
            items: [
              {
                id: "c1000000-0000-4000-8000-000000000001",
                label: "Educação",
                value: 48,
              },
              {
                id: "c1000000-0000-4000-8000-000000000002",
                label: "Saúde",
                value: 32,
              },
              {
                id: "c1000000-0000-4000-8000-000000000003",
                label: "Apoio",
                value: 20,
              },
            ],
          }),
          graphic("analytics-chart-two", "data_chart", {
            kind: "data_chart",
            title: "Atividades por território",
            subtitle: "Valores ilustrativos, não são indicadores reais",
            format: "bar",
            unit: "ações",
            items: [
              {
                id: "c1000000-0000-4000-8000-000000000004",
                label: "Região Norte",
                value: 38,
              },
              {
                id: "c1000000-0000-4000-8000-000000000005",
                label: "Região Sul",
                value: 26,
              },
              {
                id: "c1000000-0000-4000-8000-000000000006",
                label: "Região Central",
                value: 36,
              },
            ],
          }),
          "1:1",
        ),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
      backgroundDecorTone: "primary",
      backgroundDecorIntensity: 20,
    },
  },
  {
    id: "graphic-participation-path",
    title: "Jornada de participação",
    category: "participacao",
    sectionType: "custom_content",
    description:
      "Introdução acolhedora, escolhas por abas e perguntas interativas sem formulário longo.",
    traits: ["Caminhos guiados", "Abas", "Perguntas"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("journey-label", "UM PRIMEIRO PASSO"),
              graphicTitle(
                "journey-title",
                "A participação começa com uma boa conversa",
              ),
            ],
            "medium",
          ),
          stack(
            [
              graphicCopy(
                "journey-intro",
                "Ajude cada pessoa a encontrar um caminho claro: participar, apoiar ou conhecer uma iniciativa.",
              ),
              graphic("journey-star", "icon", "heart-handshake"),
            ],
            "medium",
            { surface: "highlight" },
          ),
          "2:1",
        ),
        graphic("journey-tabs", "story_tabs", {
          kind: "story_tabs",
          title: "Como você quer começar?",
          items: [
            {
              id: "c2000000-0000-4000-8000-000000000001",
              title: "Quero doar",
              description:
                "Veja o que a organização precisa, como a contribuição será utilizada e quais canais são oficiais.",
            },
            {
              id: "c2000000-0000-4000-8000-000000000002",
              title: "Ser voluntário",
              description:
                "Conheça os projetos, os horários e os cuidados envolvidos antes de participar.",
            },
            {
              id: "c2000000-0000-4000-8000-000000000003",
              title: "Pedir orientação",
              description:
                "Saiba como entrar em contato de forma segura e respeitosa.",
            },
          ],
        }),
        graphic("journey-faq", "faq", {
          items: [
            {
              id: "c2000000-0000-4000-8000-000000000004",
              question: "Como posso falar com a organização?",
              answer:
                "Use os canais oficiais indicados na página de contato. Personalize esta informação antes de publicar.",
            },
            {
              id: "c2000000-0000-4000-8000-000000000005",
              question: "Preciso me cadastrar para participar?",
              answer:
                "Explique aqui os critérios e requisitos reais de participação da ONG.",
            },
          ],
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
      backgroundDecorTone: "secondary",
      backgroundDecorIntensity: 25,
    },
  },
  {
    id: "graphic-portrait-journal",
    title: "Retratos da comunidade",
    category: "historia",
    sectionType: "custom_content",
    description:
      "Narrativa com mosaico fotográfico, legenda e cartões editoriais para contar uma história.",
    traits: ["Fotografias", "Narrativa", "Mosaico"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("portrait-label", "DIÁRIO DE UMA CAUSA"),
              graphicTitle(
                "portrait-title",
                "Pessoas, lugares e encontros que deixam marcas",
              ),
            ],
            "medium",
          ),
          graphicCopy(
            "portrait-intro",
            "Valorize registros autorizados do trabalho da ONG: imagens reais aproximam pessoas da causa.",
          ),
          "2:1",
        ),
        graphic("portrait-gallery", "media_gallery", {
          kind: "media_gallery",
          title: "Registros em imagem",
          items: [
            {
              id: "c3000000-0000-4000-8000-000000000001",
              image: null,
              illustration: "comunidade",
              caption: "Momentos de colaboração",
              focalX: 50,
              focalY: 50,
            },
            {
              id: "c3000000-0000-4000-8000-000000000002",
              image: null,
              illustration: "sereno",
              caption: "Acolhimento e escuta",
              focalX: 50,
              focalY: 50,
            },
            {
              id: "c3000000-0000-4000-8000-000000000003",
              image: null,
              illustration: "horizonte",
              caption: "Novos horizontes",
              focalX: 50,
              focalY: 50,
            },
          ],
        }),
        {
          type: "grid",
          columns: 3,
          gap: "medium",
          children: [
            graphicLabel("portrait-tile-1", "01 · PESSOAS"),
            graphicLabel("portrait-tile-2", "02 · TERRITÓRIO"),
            graphicLabel("portrait-tile-3", "03 · TRANSFORMAÇÃO"),
          ],
        },
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 20,
    },
  },
  {
    id: "graphic-short-documentary",
    title: "Documentário e depoimentos",
    category: "historia",
    sectionType: "custom_content",
    description:
      "Abertura com vídeo, informações contextuais e abas para apresentar diferentes pontos de vista.",
    traits: ["Vídeo", "Depoimentos", "Reportagem"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("doc-label", "NOSSA VOZ EM MOVIMENTO"),
              graphicTitle(
                "doc-title",
                "É na vida real que o impacto acontece",
              ),
            ],
            "small",
          ),
          graphicCopy(
            "doc-copy",
            "Apresente um vídeo autorizado, complemente com informações verificáveis e abra espaço para vozes diversas.",
          ),
          "2:1",
        ),
        graphic("doc-player", "video_embed", {
          kind: "video_embed",
          title: "Assista à nossa história",
          caption:
            "Adicione o link de um vídeo autorizado no editor de conteúdo.",
          url: "",
        }),
        graphic("doc-tabs", "story_tabs", {
          kind: "story_tabs",
          title: "Depois de assistir",
          items: [
            {
              id: "c4000000-0000-4000-8000-000000000001",
              title: "Nossa atuação",
              description:
                "Apresente a ação mostrada no vídeo, o contexto e seus objetivos.",
            },
            {
              id: "c4000000-0000-4000-8000-000000000002",
              title: "O que mudou",
              description:
                "Descreva resultados que possam ser comprovados pela organização.",
            },
            {
              id: "c4000000-0000-4000-8000-000000000003",
              title: "Como participar",
              description:
                "Indique caminhos legítimos e seguros para apoiar a iniciativa.",
            },
          ],
        }),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
      backgroundDecorTone: "primary",
      backgroundDecorIntensity: 20,
    },
  },
  {
    id: "graphic-cause-showcase",
    title: "Causa com identidade",
    category: "apresentacao",
    sectionType: "custom_content",
    description:
      "Hero gráfico com blocos de contraste, imagem de destaque e microcompromissos visuais.",
    traits: ["Hero", "Fotografia", "Cartões"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("cause-label", "O QUE NOS MOVE"),
              graphicTitle(
                "cause-title",
                "Uma causa pode transformar uma comunidade inteira",
              ),
              graphicCopy(
                "cause-body",
                "Uma composição de impacto para apresentar a causa com clareza, fotografias e pequenos destaques visuais.",
              ),
            ],
            "medium",
          ),
          stack(
            [
              graphic("cause-photo", "media_gallery", {
                kind: "media_gallery",
                title: "Uma imagem da nossa causa",
                items: [
                  {
                    id: "c5000000-0000-4000-8000-000000000001",
                    image: null,
                    illustration: "comunidade",
                    caption: "Gente que transforma",
                    focalX: 50,
                    focalY: 50,
                  },
                ],
              }),
            ],
            "small",
          ),
          "1:1",
        ),
        {
          type: "grid",
          columns: 3,
          gap: "medium",
          children: [
            stack(
              [
                graphic("cause-icon-people", "icon", "users"),
                graphicCopy("cause-copy-people", "Gente em primeiro lugar"),
              ],
              "small",
              { surface: "highlight" },
            ),
            stack(
              [
                graphic("cause-icon-team", "icon", "handshake"),
                graphicCopy("cause-copy-team", "Ações com participação"),
              ],
              "small",
              { surface: "highlight" },
            ),
            stack(
              [
                graphic("cause-icon-proof", "icon", "shield-check"),
                graphicCopy(
                  "cause-copy-proof",
                  "Responsabilidade e prestação de contas",
                ),
              ],
              "small",
              { surface: "highlight" },
            ),
          ],
        },
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 25,
    },
  },
  {
    id: "header-institutional",
    title: "Institucional completo",
    category: "navegacao",
    sectionType: "site_header",
    description:
      "Identidade à esquerda, menu navegável e ação principal em destaque.",
    traits: ["ONG", "Navegação", "Ação"],
    layout: columns(
      stack(
        [slot("brandLogo", "brandLogo"), slot("brandLabel", "itemTitle")],
        "small",
      ),
      stack(
        [
          repeat("links", 4, slot("href", "navLink"), "small"),
          slot("primaryAction", "primaryAction"),
        ],
        "small",
        { align: "end" },
      ),
      "1:2",
      "small",
    ),
    sectionStyle: {
      spacing: "compact",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
  },
  {
    id: "header-editorial",
    title: "Marca central",
    category: "navegacao",
    sectionType: "site_header",
    description:
      "Marca centralizada e navegação em uma segunda faixa, com visual editorial.",
    traits: ["Editorial", "Centralizado"],
    layout: stack(
      [
        stack(
          [slot("brandLogo", "brandLogo"), slot("brandLabel", "itemTitle")],
          "small",
          { align: "center" },
        ),
        stack(
          [
            repeat("links", 4, slot("href", "navLink"), "small"),
            slot("primaryAction", "primaryAction"),
          ],
          "small",
          { align: "center" },
        ),
      ],
      "medium",
      { align: "center" },
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "normal",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
  },
  {
    id: "header-campaign",
    title: "Causa em primeiro lugar",
    category: "navegacao",
    sectionType: "site_header",
    description:
      "Ação de participação em destaque, menu claro e assinatura institucional.",
    traits: ["Campanhas", "Participação"],
    layout: columns(
      stack(
        [
          slot("brandLogo", "brandLogo"),
          slot("brandLabel", "itemTitle"),
          slot("primaryAction", "primaryAction"),
        ],
        "small",
      ),
      repeat("links", 4, slot("href", "navLink"), "medium"),
      "1:2",
      "medium",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
    },
  },
  {
    id: "hero-editorial",
    title: "Editorial aberto",
    category: "apresentacao",
    sectionType: "organization_intro",
    description:
      "Título expressivo e imagem ao lado, com bastante espaço para a mensagem.",
    traits: ["Assimétrico", "Editorial"],
    layout: columns(introCopy(), slot("image", "heroImage"), "2:1"),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "horizonte",
  },
  {
    id: "hero-photo-first",
    title: "Imagem protagonista",
    category: "apresentacao",
    sectionType: "organization_intro",
    description:
      "Fotografia primeiro; conteúdo e chamadas em uma coluna de leitura clara.",
    traits: ["Fotográfico", "Humano"],
    layout: columns(slot("image", "heroImage"), introCopy(), "1:1"),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
    },
    preferredFamily: "acolher",
  },
  {
    id: "hero-manifesto",
    title: "Manifesto central",
    category: "apresentacao",
    sectionType: "organization_intro",
    description:
      "Mensagem central grande, ações agrupadas e imagem em largura total.",
    traits: ["Tipográfico", "Central"],
    layout: stack(
      [
        slot("eyebrow", "eyebrow"),
        heading("display"),
        description(),
        actions(),
        slot("image", "wideImage"),
      ],
      "large",
      { align: "center" },
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "pulso",
  },
  {
    id: "about-portrait",
    title: "Retrato e trajetória",
    category: "historia",
    sectionType: "organization_about",
    description:
      "Retrato marcante à esquerda e narrativa institucional à direita.",
    traits: ["Retrato", "Institucional"],
    layout: columns(slot("image", "cardImage"), aboutCopy(), "1:2"),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "sereno",
  },
  {
    id: "about-editorial",
    title: "Página editorial",
    category: "historia",
    sectionType: "organization_about",
    description: "Título e contexto em duas colunas, fotografia larga abaixo.",
    traits: ["Revista", "Narrativa"],
    layout: stack(
      [
        columns(
          stack([slot("eyebrow", "eyebrow"), heading()], "medium"),
          stack(
            [description("body"), slot("action", "secondaryAction")],
            "medium",
          ),
          "1:1",
        ),
        slot("image", "wideImage"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "vozes",
  },
  {
    id: "about-conversation",
    title: "História próxima",
    category: "historia",
    sectionType: "organization_about",
    description: "Texto à esquerda e imagem à direita, com ritmo calmo.",
    traits: ["Acolhedor", "Leve"],
    layout: columns(aboutCopy(), slot("image", "cardImage"), "2:1"),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "normal",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
    },
    preferredFamily: "conexao",
  },
  {
    id: "projects-gallery",
    title: "Galeria de projetos",
    category: "iniciativas",
    sectionType: "projects_showcase",
    description:
      "Três projetos lado a lado, com imagens e informações completas.",
    traits: ["Grade", "Visual"],
    layout: stack(
      [
        columns(heading(), description(), "1:1"),
        repeat("items", 3, projectItem()),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "conexao",
  },
  {
    id: "projects-report",
    title: "Projetos em destaque",
    category: "iniciativas",
    sectionType: "projects_showcase",
    description:
      "Projetos em linhas editoriais largas, cada um com fotografia e descrição.",
    traits: ["Editorial", "Detalhado"],
    layout: stack(
      [
        heading(),
        description(),
        repeat(
          "items",
          1,
          columns(
            slot("image", "cardImage"),
            stack(
              [
                slot("category", "eyebrow"),
                slot("title", "itemTitle"),
                slot("description", "itemBody"),
                slot("action", "secondaryAction"),
              ],
              "medium",
            ),
            "1:2",
          ),
        ),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "horizonte",
  },
  {
    id: "projects-two-up",
    title: "Coleção ilustrada",
    category: "iniciativas",
    sectionType: "projects_showcase",
    description: "Dois cartões amplos por linha, para fotos mais expressivas.",
    traits: ["Fotografia", "Cartões"],
    layout: stack(
      [
        stack([heading(), description()], "small"),
        repeat("items", 2, projectItem(false), "large"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
    },
    preferredFamily: "acolher",
  },
  {
    id: "impact-figures",
    title: "Impacto em números",
    category: "impacto",
    sectionType: "impact_metrics",
    description: "Números grandes em uma faixa ampla, fáceis de comparar.",
    traits: ["Dados", "Impactante"],
    layout: stack(
      [
        stack([heading(), description()], "medium"),
        repeat("items", 4, metricItem(), "large"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "essencial",
  },
  {
    id: "impact-explained",
    title: "Números com contexto",
    category: "impacto",
    sectionType: "impact_metrics",
    description: "Mensagem à esquerda e resultados em uma coluna ao lado.",
    traits: ["Narrativa", "Dados"],
    layout: columns(
      stack([heading(), description()], "medium"),
      repeat("items", 1, metricItem(), "medium"),
      "1:1",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "horizonte",
  },
  {
    id: "impact-columns",
    title: "Painel de resultados",
    category: "impacto",
    sectionType: "impact_metrics",
    description: "Resultados em cartões duplos com cabeçalho central.",
    traits: ["Painel", "Comparativo"],
    layout: stack(
      [
        stack([heading(), description()], "medium", { align: "center" }),
        repeat(
          "items",
          2,
          stack(
            [
              slot("value", "metricValue"),
              slot("label", "metricLabel"),
              slot("source", "caption"),
            ],
            "small",
            { surface: "card" },
          ),
        ),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "normal",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
    },
    preferredFamily: "conexao",
  },
  {
    id: "support-cards",
    title: "Formas de participar",
    category: "participacao",
    sectionType: "support_actions",
    description:
      "Convites em cartões equivalentes, sem priorizar uma única opção.",
    traits: ["Ações", "Cartões"],
    layout: stack(
      [
        columns(heading(), description(), "1:1"),
        repeat("items", 3, supportItem()),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "acolher",
  },
  {
    id: "support-pathways",
    title: "Escolha seu caminho",
    category: "participacao",
    sectionType: "support_actions",
    description: "Convites em linhas espaçosas, com a ação sempre ao alcance.",
    traits: ["Direto", "Acessível"],
    layout: columns(
      stack([heading(), description()], "large"),
      repeat("items", 1, supportItem()),
      "1:2",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
    preferredFamily: "essencial",
  },
  {
    id: "trust-document-grid",
    title: "Biblioteca de documentos",
    category: "confianca",
    sectionType: "transparency",
    description: "Documentos organizados em uma grade fácil de explorar.",
    traits: ["Transparência", "Grade"],
    layout: stack(
      [heading(), description(), repeat("items", 2, documentItem())],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
  },
  {
    id: "trust-report-list",
    title: "Prestação de contas",
    category: "confianca",
    sectionType: "transparency",
    description:
      "Documentos em linhas de leitura contínua, ideais para listas extensas.",
    traits: ["Relatório", "Objetivo"],
    layout: columns(
      stack([heading(), description()], "large"),
      repeat("items", 1, documentItem(), "small"),
      "1:2",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
  },
  {
    id: "contact-split",
    title: "Vamos conversar",
    category: "participacao",
    sectionType: "organization_contact",
    description: "Mensagem acolhedora ao lado dos contatos essenciais.",
    traits: ["Contato", "Duas colunas"],
    layout: columns(
      stack([heading(), description()], "large"),
      contactFields(),
      "1:1",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "none",
    },
  },
  {
    id: "contact-centered",
    title: "Contato essencial",
    category: "participacao",
    sectionType: "organization_contact",
    description:
      "Título central, contatos em bloco destacado e redes sociais abaixo.",
    traits: ["Central", "Enxuto"],
    layout: stack(
      [
        stack([heading(), description()], "medium", { align: "center" }),
        contactFields(),
        repeat("socialLinks", 3, slot("url", "socialLink"), "small"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "normal",
      backgroundColor: "background",
      backgroundDecor: "wash",
    },
  },
];

const accentNode = (
  id: string,
  label: string,
  icon: string,
  tone: "primary" | "secondary" | "accent" = "primary",
): Node =>
  stack(
    [
      {
        type: "element",
        id: `${id}-icon`,
        elementType: "icon",
        value: icon,
        style: { color: `${tone}.strong`, iconSizePx: 25, width: "auto" },
      },
      {
        type: "element",
        id: `${id}-text`,
        elementType: "text",
        value: label,
        style: { color: "text", fontSize: 14, width: "100" },
      },
    ],
    "small",
    { surface: "highlight", align: "start" },
  );

const evidenceRail = (id: string) => ({
  type: "grid" as const,
  columns: 3 as const,
  gap: "medium" as const,
  children: [
    accentNode(
      `${id}-care`,
      "Pessoas em primeiro lugar",
      "heart-handshake",
      "primary",
    ),
    accentNode(
      `${id}-trust`,
      "Confiança e transparência",
      "shield-check",
      "secondary",
    ),
    accentNode(
      `${id}-impact`,
      "Juntos pela transformação",
      "sparkles",
      "accent",
    ),
  ],
});

const sectionLabels: Record<CompositionCategory, [string, string]> = {
  navegacao: ["", ""],
  apresentacao: ["NOSSO PROPÓSITO", "sparkles"],
  historia: ["NOSSA TRAJETÓRIA", "users-round"],
  iniciativas: ["O QUE FAZEMOS", "hand-heart"],
  impacto: ["RESULTADOS EVIDENCIADOS", "bar-chart"],
  participacao: ["PARTICIPE DA TRANSFORMAÇÃO", "heart-handshake"],
  confianca: ["NOSSO COMPROMISSO", "shield-check"],
};
function enrichLegacyComposition(
  composition: SiteComposition,
): SiteComposition {
  if (composition.id.startsWith("graphic-")) return composition;
  if (composition.sectionType === "site_header")
    return {
      ...composition,
      sectionStyle: {
        ...composition.sectionStyle,
        spacing: "compact",
        backgroundDecor: "none",
      },
      traits: [...composition.traits, "Marca responsiva", "Navegação editável"],
    };
  const [eyebrow, icon] = sectionLabels[composition.category];
  const visualHeader = stack(
    [
      {
        type: "element",
        id: `${composition.id}-accent-icon`,
        elementType: "icon",
        value: icon,
        style: { color: "accent.strong", iconSizePx: 25, width: "auto" },
      },
      {
        type: "element",
        id: `${composition.id}-accent-label`,
        elementType: "text",
        value: eyebrow,
        style: { color: "secondary.strong", fontSize: 13, width: "100" },
      },
    ],
    "small",
    { direction: "row", align: "center" },
  );
  let rest: Node = composition.layout;
  let close: Node | null = null;
  // Content-aware visual enrichment: graphics serve a purpose, not visual noise.
  if (
    ["hero-editorial", "hero-manifesto", "hero-photo-first"].includes(
      composition.id,
    )
  ) {
    close = evidenceRail(composition.id);
  } else if (
    composition.id === "about-editorial" ||
    composition.id === "about-conversation"
  ) {
    close = graphic(`${composition.id}-gallery`, "media_gallery", {
      kind: "media_gallery",
      title: "Nossa história em imagens",
      items: [
        {
          id: "e3540000-0000-4000-8000-000000000001",
          image: null,
          illustration: "comunidade",
          caption: "Pessoas que constroem a história",
          focalX: 50,
          focalY: 50,
        },
        {
          id: "e3540000-0000-4000-8000-000000000002",
          image: null,
          illustration: "essencial",
          caption: "Ações e encontros",
          focalX: 50,
          focalY: 50,
        },
        {
          id: "e3540000-0000-4000-8000-000000000003",
          image: null,
          illustration: "vozes",
          caption: "O futuro que queremos construir",
          focalX: 50,
          focalY: 50,
        },
      ],
    });
  } else if (
    composition.sectionType === "projects_showcase" &&
    composition.id === "projects-report"
  ) {
    close = accentNode(
      `${composition.id}-closing`,
      "Veja cada ação em detalhes e conheça seus resultados",
      "arrow-right",
      "accent",
    );
  } else if (composition.sectionType === "impact_metrics") {
    close = graphic(`${composition.id}-chart`, "data_chart", {
      kind: "data_chart",
      title: "Distribuição por área de atuação",
      subtitle:
        "Visualização ilustrativa: substitua as categorias e os valores por dados verificáveis da sua organização.",
      format: composition.id === "impact-columns" ? "donut" : "bar",
      unit: "ações",
      items: [
        {
          id: "e3540000-0000-4000-8000-000000000011",
          label: "Atendimento",
          value: 52,
        },
        {
          id: "e3540000-0000-4000-8000-000000000012",
          label: "Formação",
          value: 31,
        },
        {
          id: "e3540000-0000-4000-8000-000000000013",
          label: "Mobilização",
          value: 17,
        },
      ],
    });
  } else if (composition.sectionType === "support_actions") {
    close = graphic(`${composition.id}-tabs`, "story_tabs", {
      kind: "story_tabs",
      title: "Como você pode contribuir",
      items: [
        {
          id: "e3540000-0000-4000-8000-000000000021",
          title: "Quero ajudar",
          description:
            "Conheça os caminhos para apoiar iniciativas, respeitando as necessidades da organização.",
        },
        {
          id: "e3540000-0000-4000-8000-000000000022",
          title: "Quero participar",
          description:
            "Descubra como participar de ações e atividades com responsabilidade.",
        },
        {
          id: "e3540000-0000-4000-8000-000000000023",
          title: "Quero acompanhar",
          description:
            "Veja as ações realizadas e os resultados publicados pela organização.",
        },
      ],
    });
  } else if (composition.sectionType === "transparency") {
    close = stack(
      [
        accentNode(
          `${composition.id}-open`,
          "Acesso público às informações",
          "shield-check",
          "primary",
        ),
        accentNode(
          `${composition.id}-data`,
          "Relatórios organizados por período",
          "file-text",
          "secondary",
        ),
      ],
      "medium",
      { surface: "highlight" },
    );
  } else if (composition.sectionType === "organization_contact") {
    close = accentNode(
      `${composition.id}-security`,
      "Um espaço aberto para diálogo e acolhimento",
      "message-circle",
      "accent",
    );
  } else if (composition.sectionType === "projects_showcase") {
    close = accentNode(
      `${composition.id}-gallery-note`,
      "Conheça as iniciativas por meio de suas histórias e imagens",
      "folder",
      "secondary",
    );
  }
  if (composition.id === "about-portrait") {
    rest = columns(
      stack(
        [heading(), description("body"), slot("action", "secondaryAction")],
        "medium",
      ),
      slot("image", "heroImage"),
      "1:1",
    );
  }
  return {
    ...composition,
    traits: [
      ...composition.traits,
      "Direção de arte",
      ...(close?.type === "element" ? ["Componente interativo"] : []),
    ],
    layout: stack([visualHeader, rest, ...(close ? [close] : [])], "large"),
    sectionStyle: {
      ...composition.sectionStyle,
      // Meaningful tonal hierarchy derived from the brand palette, not hard-coded colors.
      backgroundDecor:
        composition.sectionStyle.backgroundDecor === "none"
          ? composition.category === "historia"
            ? "soft-glow"
            : composition.category === "iniciativas"
              ? "corner-glow"
              : "wash"
          : composition.sectionStyle.backgroundDecor,
      backgroundDecorTone:
        composition.category === "impacto"
          ? "secondary"
          : composition.category === "participacao"
            ? "accent"
            : "primary",
      backgroundDecorIntensity: 15,
    },
  };
}

/** Additional compositions use the same curated editable elements offered in the
 * visual interactive library. IDs are created per composition at module load;
 * editor cloning assigns independent node IDs when new sections are inserted. */
const model = (presetId: string): Node => {
  const element = createRichPresetNode(presetId);
  if (!element) throw new Error(`Missing curated block: ${presetId}`);
  return element;
};
const moreGraphicCompositions: readonly SiteComposition[] = [
  {
    id: "graphic-g-community-impact",
    title: "Retrato do impacto",
    category: "impacto",
    sectionType: "custom_content",
    description:
      "Indicadores e depoimentos como evidência de transformação, com hierarquia de cor.",
    traits: ["Indicadores", "Depoimentos", "Visual"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("g01-k", "RESULTADOS QUE TÊM ROSTO"),
              graphicTitle("g01-h", "O impacto começa com pessoas"),
              graphicCopy(
                "g01-p",
                "Números ajudam a dimensionar uma causa. Histórias ajudam a compreender por que ela importa.",
              ),
            ],
            "medium",
          ),
          model("chart-spotlight"),
          "1:1",
        ),
        model("testimonials-compact"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
      backgroundDecorTone: "secondary",
      backgroundDecorIntensity: 13,
    },
  },
  {
    id: "graphic-g-campaign-relay",
    title: "Mobilização em movimento",
    category: "iniciativas",
    sectionType: "custom_content",
    description:
      "Campanha, meta e caminhos para participar numa narrativa de ação.",
    traits: ["Campanhas", "Meta", "Participação"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("g02-k", "NOSSO PRÓXIMO PASSO"),
              graphicTitle(
                "g02-h",
                "Uma comunidade inteira pode fazer acontecer",
              ),
            ],
            "medium",
          ),
          graphicCopy(
            "g02-p",
            "Convide pessoas a participar, explique a meta e mostre como cada contribuição fortalece as iniciativas.",
          ),
          "2:1",
        ),
        model("campaign-spotlight"),
        model("actions-compact"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 14,
    },
  },
  {
    id: "graphic-g-memory-atlas",
    title: "Memórias em movimento",
    category: "historia",
    sectionType: "custom_content",
    description:
      "Retratos e linha do tempo que contam uma história sem se limitar a texto corrido.",
    traits: ["Fotografia", "Cronologia", "Narrativa"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("g03-k", "MEMÓRIA COLETIVA"),
              graphicTitle("g03-h", "Cada encontro deixa uma marca"),
            ],
            "small",
          ),
          graphicCopy(
            "g03-p",
            "Construímos nossa trajetória em conjunto. Veja momentos, pessoas e acontecimentos dessa jornada.",
          ),
          "2:1",
        ),
        model("gallery-spotlight"),
        model("timeline-compact"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "soft-glow",
      backgroundDecorTone: "primary",
      backgroundDecorIntensity: 9,
    },
  },
  {
    id: "graphic-g-accountability-desk",
    title: "Dados à vista",
    category: "confianca",
    sectionType: "custom_content",
    description:
      "Visualização de resultados e contexto sobre as ações e recursos.",
    traits: ["Transparência", "Gráficos", "Editorial"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("g04-k", "TRANSPARÊNCIA É COMPROMISSO"),
              graphicTitle("g04-h", "Informação clara constrói confiança"),
            ],
            "small",
          ),
          graphicCopy(
            "g04-p",
            "Apresente os dados que sua organização consegue comprovar. Os exemplos devem ser substituídos por registros oficiais.",
          ),
          "1:1",
        ),
        columns(model("chart-editorial"), model("chart-spotlight"), "1:1"),
        model("progress-compact"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
      backgroundDecorTone: "secondary",
      backgroundDecorIntensity: 10,
    },
  },
  {
    id: "graphic-g-guide-to-care",
    title: "Acolhimento em etapas",
    category: "participacao",
    sectionType: "custom_content",
    description:
      "Orientações acessíveis, abas e respostas para orientar quem procura ajuda.",
    traits: ["Acolhimento", "Abas", "Dúvidas"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("g05-k", "UM CAMINHO POR VEZ"),
              graphicTitle(
                "g05-h",
                "Informação simples. Atendimento com respeito.",
              ),
            ],
            "medium",
          ),
          graphicCopy(
            "g05-p",
            "Organize as perguntas importantes em pequenos passos e ofereça informações sem sobrecarregar a pessoa.",
          ),
          "1:1",
        ),
        model("tabs-editorial"),
        model("faq-compact"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "comfortable",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "wash",
      backgroundDecorTone: "accent",
      backgroundDecorIntensity: 9,
    },
  },
  {
    id: "graphic-g-community-voices",
    title: "Histórias que ganham voz",
    category: "historia",
    sectionType: "custom_content",
    description:
      "Depoimento principal, reportagem em vídeo e registros da comunidade.",
    traits: ["Depoimentos", "Vídeo", "Retratos"],
    layout: stack(
      [
        columns(
          stack(
            [
              graphicLabel("g06-k", "GENTE QUE TRANSFORMA"),
              graphicTitle("g06-h", "Nenhuma boa história acontece sozinha"),
            ],
            "small",
          ),
          graphicCopy(
            "g06-p",
            "Relatos autorizados e imagens reais aproximam o público da missão da organização.",
          ),
          "2:1",
        ),
        model("testimonials-spotlight"),
        columns(model("video-compact"), model("gallery-compact"), "1:1"),
      ],
      "large",
    ),
    sectionStyle: {
      spacing: "generous",
      contentWidth: "wide",
      backgroundColor: "background",
      backgroundDecor: "corner-glow",
      backgroundDecorTone: "primary",
      backgroundDecorIntensity: 12,
    },
  },
];

export const siteCompositions: readonly SiteComposition[] = [
  ...baseSiteCompositions.map(enrichLegacyComposition),
  ...moreGraphicCompositions,
];

/** Compose settings with the same object on insertion and preview. */
export function settingsForComposition(
  composition: SiteComposition,
  variant: InstitutionalVariant,
): Record<string, unknown> {
  const base = defaultSettingsForVariant(variant);
  const baseStyle =
    base.sectionStyle && typeof base.sectionStyle === "object"
      ? (base.sectionStyle as Record<string, unknown>)
      : {};
  return {
    ...base,
    // Curated compositions own their layout and should not inherit hard-coded
    // family-specific geometry designed for unrelated native templates.
    visualStyle: "curated-composition",
    compositionId: composition.id,
    layoutOverride: composition.layout,
    sectionStyle: { ...baseStyle, ...composition.sectionStyle },
  };
}

export function variantForComposition(
  composition: SiteComposition,
  variants: readonly InstitutionalVariant[],
): InstitutionalVariant | undefined {
  const candidates = variants.filter(
    (variant) =>
      variant.sectionType === composition.sectionType &&
      (variant.isSystem || variant.status === "published"),
  );
  return (
    candidates.find(
      (variant) => variant.familyKey === composition.preferredFamily,
    ) ?? candidates[0]
  );
}

export function findSiteComposition(
  id: string | undefined,
): SiteComposition | undefined {
  return siteCompositions.find((composition) => composition.id === id);
}
