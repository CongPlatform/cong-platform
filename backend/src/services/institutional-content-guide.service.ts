import { randomUUID } from "node:crypto";

import type { InstitutionalSectionType } from "../validators/institutional.validator.js";

export interface InstitutionalOrganizationProfile {
  name: string;
  description: string;
  areas: string[];
  supportTypes: string[];
}

interface CauseContentPreset {
  key: string;
  matches: string[];
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  impactTitle: string;
  impactDescription: string;
  impacts: Array<{ value: string; label: string }>;
  projects: Array<{ title: string; description: string; category: string }>;
  support: Array<{
    kind: "donate" | "volunteer" | "partner" | "materials" | "share" | "other";
    title: string;
    description: string;
  }>;
}

const genericPreset: CauseContentPreset = {
  key: "community",
  matches: [],
  eyebrow: "Transformação que acontece perto de pessoas",
  heroTitle: "Um trabalho coletivo pode mudar histórias inteiras",
  heroDescription:
    "Apresente em poucas linhas quem a organização atende, onde atua e qual mudança busca construir todos os dias.",
  impactTitle: "Resultados que ajudam a contar essa história",
  impactDescription:
    "Troque estes exemplos por números que a organização consiga confirmar e, quando fizer sentido, informe o período.",
  impacts: [
    { value: "1.200+", label: "pessoas alcançadas" },
    { value: "18", label: "ações realizadas" },
    { value: "9", label: "territórios atendidos" },
    { value: "80+", label: "pessoas voluntárias" },
  ],
  projects: [
    {
      category: "Ação contínua",
      title: "Projeto que aproxima a causa da comunidade",
      description:
        "Conte o que acontece, para quem a iniciativa existe e qual resultado ela busca gerar.",
    },
    {
      category: "Mobilização",
      title: "Uma frente que transforma participação em impacto",
      description:
        "Explique de forma simples como pessoas, parceiros ou voluntários participam desta ação.",
    },
    {
      category: "Território",
      title: "Presença onde a necessidade acontece",
      description:
        "Mostre uma iniciativa representativa da atuação local da organização.",
    },
  ],
  support: [
    {
      kind: "donate",
      title: "Apoie o trabalho",
      description: "Explique como uma doação se transforma em ação concreta.",
    },
    {
      kind: "volunteer",
      title: "Doe seu tempo",
      description:
        "Mostre quais tipos de ajuda voluntária fazem diferença hoje.",
    },
    {
      kind: "partner",
      title: "Construa uma parceria",
      description:
        "Convide empresas, coletivos e instituições para somar recursos e conhecimento.",
    },
  ],
};

const presets: CauseContentPreset[] = [
  {
    key: "hunger",
    matches: [
      "combate à fome",
      "segurança alimentar",
      "doação de alimentos",
      "alimentação",
      "cozinhas solidárias",
      "nutrição",
    ],
    eyebrow: "Alimento, cuidado e dignidade",
    heroTitle: "Juntos contra a fome. Juntos por famílias com mais segurança.",
    heroDescription:
      "Mostre como a organização conecta doações, pessoas e territórios para ampliar o acesso a alimento e fortalecer famílias.",
    impactTitle: "Alimento que chega, cuidado que permanece",
    impactDescription:
      "Use dados reais da sua operação para tornar o alcance visível e fácil de entender.",
    impacts: [
      { value: "12.000+", label: "cestas ou refeições distribuídas" },
      { value: "198 t", label: "alimentos arrecadados" },
      { value: "420+", label: "famílias alcançadas" },
      { value: "28", label: "bairros ou cidades atendidos" },
    ],
    projects: [
      {
        category: "Segurança alimentar",
        title: "Distribuição que chega a quem precisa",
        description:
          "Explique como os alimentos são arrecadados, organizados e entregues às famílias.",
      },
      {
        category: "Rede solidária",
        title: "Parcerias contra o desperdício",
        description:
          "Mostre como mercados, empresas e doadores ajudam a transformar excedentes em cuidado.",
      },
      {
        category: "Autonomia",
        title: "Alimentação também pode gerar futuro",
        description:
          "Apresente hortas, oficinas, cozinhas ou outras ações que ampliem autonomia e renda.",
      },
    ],
    support: [
      {
        kind: "donate",
        title: "Doe alimentos ou recursos",
        description:
          "Explique o que é mais necessário e como entregar ou contribuir.",
      },
      {
        kind: "volunteer",
        title: "Ajude a separar e entregar",
        description:
          "Mostre como pessoas voluntárias participam da logística e do atendimento.",
      },
      {
        kind: "partner",
        title: "Seja um ponto parceiro",
        description:
          "Convide empresas e estabelecimentos para doar, coletar ou apoiar a operação.",
      },
    ],
  },
  {
    key: "education",
    matches: [
      "educação",
      "alfabetização",
      "reforço escolar",
      "formação profissional",
      "acesso ao ensino",
    ],
    eyebrow: "Educação abre caminhos",
    heroTitle: "Aprender hoje pode ampliar todas as possibilidades de amanhã.",
    heroDescription:
      "Conte como a organização cria oportunidades de aprendizagem, desenvolvimento e acesso para crianças, jovens ou adultos.",
    impactTitle: "Aprendizado que pode ser acompanhado",
    impactDescription:
      "Substitua pelos números que melhor mostram participação, permanência e oportunidades geradas.",
    impacts: [
      { value: "1.200+", label: "estudantes atendidos" },
      { value: "42", label: "oficinas ou turmas realizadas" },
      { value: "18", label: "escolas ou territórios parceiros" },
      { value: "85%", label: "permanência nas atividades" },
    ],
    projects: [
      {
        category: "Aprendizagem",
        title: "Reforço que devolve confiança",
        description:
          "Apresente aulas, acompanhamento ou atividades que apoiem a trajetória escolar.",
      },
      {
        category: "Oportunidades",
        title: "Formação para novos caminhos",
        description:
          "Mostre cursos, oficinas ou experiências que aproximam participantes de novas possibilidades.",
      },
      {
        category: "Comunidade",
        title: "Educação para além da sala",
        description:
          "Conte como famílias, escolas e território participam do processo educativo.",
      },
    ],
    support: [
      {
        kind: "volunteer",
        title: "Compartilhe conhecimento",
        description:
          "Explique como educadores, mentores e profissionais podem contribuir.",
      },
      {
        kind: "donate",
        title: "Ajude a manter as atividades",
        description:
          "Mostre como doações apoiam materiais, transporte, alimentação ou estrutura.",
      },
      {
        kind: "partner",
        title: "Abra novas oportunidades",
        description:
          "Convide escolas, empresas e instituições para construir ações em conjunto.",
      },
    ],
  },
  {
    key: "animals",
    matches: [
      "proteção animal",
      "resgate e acolhimento",
      "adoção responsável",
      "bem-estar animal",
      "castração",
    ],
    eyebrow: "Cuidado que salva vidas",
    heroTitle: "Cada resgate pode terminar em uma nova história.",
    heroDescription:
      "Mostre como a organização resgata, cuida, protege e cria caminhos para adoções responsáveis e bem-estar animal.",
    impactTitle: "Cuidado transformado em números",
    impactDescription:
      "Use dados confirmados para mostrar resgates, adoções, tratamentos e alcance das campanhas.",
    impacts: [
      { value: "320+", label: "animais resgatados" },
      { value: "210", label: "adoções responsáveis" },
      { value: "95", label: "lares temporários mobilizados" },
      { value: "12", label: "campanhas de cuidado realizadas" },
    ],
    projects: [
      {
        category: "Resgate",
        title: "Acolhimento em situações urgentes",
        description:
          "Explique como funciona o resgate e quais cuidados acontecem depois.",
      },
      {
        category: "Adoção",
        title: "Encontros para a vida toda",
        description:
          "Mostre como a organização prepara e acompanha adoções responsáveis.",
      },
      {
        category: "Prevenção",
        title: "Cuidado antes da emergência",
        description:
          "Apresente campanhas de castração, vacinação, orientação ou conscientização.",
      },
    ],
    support: [
      {
        kind: "volunteer",
        title: "Seja lar temporário",
        description:
          "Explique como acolher um animal com segurança enquanto ele espera uma família.",
      },
      {
        kind: "donate",
        title: "Ajude com cuidados e tratamentos",
        description:
          "Mostre como recursos apoiam alimentação, consultas, medicamentos e resgates.",
      },
      {
        kind: "share",
        title: "Ajude um animal a ser encontrado",
        description:
          "Convide as pessoas a divulgar adoções, campanhas e animais perdidos.",
      },
    ],
  },
  {
    key: "health",
    matches: [
      "saúde e bem-estar",
      "saúde mental",
      "saúde comunitária",
      "prevenção e promoção da saúde",
      "doação de sangue",
    ],
    eyebrow: "Cuidado mais perto de quem precisa",
    heroTitle: "Saúde também se constrói com acesso, informação e presença.",
    heroDescription:
      "Apresente como a organização aproxima cuidado, prevenção, orientação e acolhimento das pessoas e comunidades atendidas.",
    impactTitle: "Cuidado que deixa resultados visíveis",
    impactDescription:
      "Use números confirmados de atendimentos, ações, profissionais e territórios alcançados.",
    impacts: [
      { value: "4.500+", label: "atendimentos realizados" },
      { value: "18", label: "ações comunitárias" },
      { value: "32", label: "profissionais voluntários" },
      { value: "9", label: "bairros atendidos" },
    ],
    projects: [
      {
        category: "Prevenção",
        title: "Informação que ajuda antes da urgência",
        description:
          "Apresente campanhas, rodas de conversa ou atividades de prevenção.",
      },
      {
        category: "Acolhimento",
        title: "Escuta e orientação próximas",
        description:
          "Mostre como as pessoas encontram apoio, encaminhamento ou atendimento.",
      },
      {
        category: "Território",
        title: "Saúde onde a comunidade está",
        description:
          "Conte sobre mutirões, visitas, ações itinerantes ou parcerias locais.",
      },
    ],
    support: [
      {
        kind: "volunteer",
        title: "Doe conhecimento e tempo",
        description:
          "Explique como profissionais e pessoas voluntárias podem participar das ações.",
      },
      {
        kind: "donate",
        title: "Ajude a levar cuidado mais longe",
        description:
          "Mostre quais custos ou materiais uma contribuição ajuda a cobrir.",
      },
      {
        kind: "partner",
        title: "Fortaleça a rede de cuidado",
        description:
          "Convide clínicas, universidades, empresas e serviços para cooperar.",
      },
    ],
  },
  {
    key: "environment",
    matches: [
      "meio ambiente",
      "reciclagem e resíduos",
      "conservação da natureza",
      "educação ambiental",
      "água e saneamento",
      "arborização",
    ],
    eyebrow: "Cuidar do território é cuidar das pessoas",
    heroTitle: "A transformação ambiental começa perto e cresce em rede.",
    heroDescription:
      "Mostre como a organização mobiliza pessoas, protege recursos naturais e cria hábitos que fortalecem o território.",
    impactTitle: "Mudanças ambientais que podem ser vistas",
    impactDescription:
      "Use resultados reais de coleta, plantio, recuperação, educação ou pessoas mobilizadas.",
    impacts: [
      { value: "18 t", label: "materiais destinados corretamente" },
      { value: "2.400+", label: "pessoas mobilizadas" },
      { value: "850", label: "mudas plantadas" },
      { value: "14", label: "territórios alcançados" },
    ],
    projects: [
      {
        category: "Educação ambiental",
        title: "Conhecimento que muda hábitos",
        description:
          "Apresente oficinas, campanhas ou ações educativas com a comunidade.",
      },
      {
        category: "Território",
        title: "Mutirões que deixam marca",
        description:
          "Mostre atividades de limpeza, plantio, recuperação ou cuidado de espaços.",
      },
      {
        category: "Circularidade",
        title: "Resíduos com um novo destino",
        description:
          "Conte como materiais são coletados, reutilizados ou encaminhados corretamente.",
      },
    ],
    support: [
      {
        kind: "volunteer",
        title: "Participe de uma ação",
        description:
          "Convide pessoas para mutirões, plantios, educação ou mobilização.",
      },
      {
        kind: "materials",
        title: "Doe materiais ou estrutura",
        description:
          "Liste insumos, ferramentas ou recursos que ajudam nas atividades.",
      },
      {
        kind: "partner",
        title: "Leve a ação para outro território",
        description:
          "Convide escolas, empresas e comunidades a construir uma iniciativa conjunta.",
      },
    ],
  },
  {
    key: "children",
    matches: [
      "crianças e adolescentes",
      "proteção infantil",
      "acolhimento",
      "convivência comunitária",
      "esporte e cultura",
    ],
    eyebrow: "Infâncias protegidas, futuros possíveis",
    heroTitle: "Toda criança merece espaço para aprender, conviver e sonhar.",
    heroDescription:
      "Conte como a organização cria vínculos, oportunidades e proteção para crianças, adolescentes e suas famílias.",
    impactTitle: "Presença que acompanha trajetórias",
    impactDescription:
      "Use dados reais para mostrar participantes, atividades, famílias e territórios alcançados.",
    impacts: [
      { value: "680+", label: "crianças e adolescentes participantes" },
      { value: "96", label: "atividades realizadas" },
      { value: "240", label: "famílias acompanhadas" },
      { value: "12", label: "comunidades alcançadas" },
    ],
    projects: [
      {
        category: "Convivência",
        title: "Um espaço seguro para crescer",
        description:
          "Apresente atividades de convivência, proteção e fortalecimento de vínculos.",
      },
      {
        category: "Aprendizagem",
        title: "Descobertas dentro e fora da escola",
        description:
          "Mostre oficinas, reforço, cultura, esporte ou desenvolvimento de habilidades.",
      },
      {
        category: "Famílias",
        title: "Cuidado que envolve toda a rede",
        description:
          "Conte como responsáveis e comunidade participam do acompanhamento.",
      },
    ],
    support: [
      {
        kind: "volunteer",
        title: "Compartilhe tempo e habilidades",
        description:
          "Mostre como voluntários podem apoiar oficinas, atividades e eventos.",
      },
      {
        kind: "donate",
        title: "Ajude a manter um espaço de oportunidades",
        description:
          "Explique como contribuições apoiam materiais, alimentação e atividades.",
      },
      {
        kind: "partner",
        title: "Crie oportunidades em conjunto",
        description:
          "Convide empresas, escolas e instituições a fortalecer as trajetórias atendidas.",
      },
    ],
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function selectPreset(areas: string[]): CauseContentPreset {
  const normalizedAreas = areas.map(normalize);
  return (
    presets.find((preset) =>
      preset.matches.some((match) =>
        normalizedAreas.some(
          (area) =>
            area.includes(normalize(match)) || normalize(match).includes(area),
        ),
      ),
    ) ?? genericPreset
  );
}

function action(label: string, href = "#"): { label: string; href: string } {
  return { label, href };
}

export function contextualizeInstitutionalSection(
  sectionType: InstitutionalSectionType,
  content: Record<string, unknown>,
  profile: InstitutionalOrganizationProfile,
): Record<string, unknown> {
  const preset = selectPreset(profile.areas);

  if (sectionType === "site_header") {
    return {
      brandLabel: profile.name,
      primaryAction: action(
        preset.key === "hunger" ? "Quero ajudar" : "Como participar",
        "#como-ajudar",
      ),
      links: [
        { id: randomUUID(), label: "Início", href: "#top" },
        { id: randomUUID(), label: "Impacto", href: "#impacto" },
        { id: randomUUID(), label: "Projetos", href: "#projetos" },
        { id: randomUUID(), label: "Sobre", href: "#sobre" },
      ],
    };
  }

  if (sectionType === "organization_intro") {
    return {
      ...content,
      eyebrow: preset.eyebrow,
      title: preset.heroTitle,
      description: profile.description?.trim() || preset.heroDescription,
      primaryAction: action(
        preset.key === "hunger" ? "Quero ajudar" : "Conheça nosso trabalho",
        preset.key === "hunger" ? "#como-ajudar" : "#projetos",
      ),
      secondaryAction: action("Ver nosso impacto", "#impacto"),
    };
  }

  if (sectionType === "impact_metrics") {
    return {
      ...content,
      title: preset.impactTitle,
      description: preset.impactDescription,
      items: preset.impacts.map((item) => ({
        id: randomUUID(),
        value: item.value,
        label: item.label,
        period: "Exemplo para substituir",
        source: "",
      })),
    };
  }

  if (sectionType === "projects_showcase") {
    return {
      ...content,
      title: "Ações que transformam intenção em presença",
      description:
        "Substitua os exemplos pelas iniciativas que melhor representam o trabalho da organização hoje.",
      items: preset.projects.map((item) => ({
        id: randomUUID(),
        ...item,
        image: null,
        action: action("Conhecer iniciativa"),
      })),
    };
  }

  if (sectionType === "support_actions") {
    return {
      ...content,
      title: "Há mais de uma forma de fazer parte",
      description:
        "Deixe os próximos passos simples: escolha apenas as formas de apoio que a organização realmente consegue receber.",
      items: preset.support.map((item) => ({
        id: randomUUID(),
        ...item,
        action: action(
          item.kind === "donate" ? "Quero apoiar" : "Saiba como participar",
          "#contato",
        ),
      })),
    };
  }

  if (sectionType === "organization_about") {
    return {
      ...content,
      eyebrow: "Nossa história",
      title: `${profile.name}: presença construída junto com a comunidade`,
      description:
        profile.description?.trim() ||
        "Conte como a organização nasceu, quem participa dessa história e o que mantém o trabalho em movimento.",
    };
  }

  if (sectionType === "organization_contact") {
    return {
      ...content,
      title: "Vamos construir o próximo passo juntos?",
      description:
        "Mantenha aqui os canais que a organização realmente acompanha e facilite o contato de quem quer apoiar, participar ou saber mais.",
    };
  }

  if (sectionType === "site_footer") {
    return {
      ...content,
      title: profile.name,
      description: profile.description?.trim() || preset.heroDescription,
      copyright: `© ${new Date().getFullYear()} ${profile.name}.`,
    };
  }

  return content;
}
