export interface CauseOption {
  id: string;
  label: string;
  category: string;
  featured?: boolean;
  subtopics: readonly string[];
}

/*
 * Enquanto a CONG ainda não possui volume suficiente para gerar ranking real,
 * featured funciona como fallback editorial. Quando existir um endpoint de
 * popularidade, basta trocar a ordenação/flag sem alterar o componente.
 *
 * Os subtópicos são controlados pela própria taxonomia. O usuário pode marcá-los,
 * mas não cria novos termos livremente no primeiro acesso. Isso evita duplicatas
 * semânticas como "reforço", "reforço escolar" e "aulas de reforço".
 */
export const CAUSE_OPTIONS: readonly CauseOption[] = [
  {
    id: "animals",
    label: "Proteção animal",
    category: "Animais e meio ambiente",
    featured: true,
    subtopics: [
      "Resgate e acolhimento",
      "Adoção responsável",
      "Bem-estar animal",
      "Castração e controle populacional",
      "Animais silvestres",
    ],
  },
  {
    id: "hunger",
    label: "Combate à fome",
    category: "Assistência e comunidade",
    featured: true,
    subtopics: [
      "Segurança alimentar",
      "Doação de alimentos",
      "Cozinhas solidárias",
      "Hortas comunitárias",
      "Nutrição",
    ],
  },
  {
    id: "education",
    label: "Educação",
    category: "Educação e oportunidades",
    featured: true,
    subtopics: [
      "Alfabetização",
      "Reforço escolar",
      "Educação infantil",
      "Formação profissional",
      "Acesso ao ensino",
    ],
  },
  {
    id: "environment",
    label: "Meio ambiente",
    category: "Animais e meio ambiente",
    featured: true,
    subtopics: [
      "Reciclagem e resíduos",
      "Educação ambiental",
      "Conservação da natureza",
      "Água e saneamento",
      "Arborização",
      "Mudanças climáticas",
    ],
  },
  {
    id: "disability",
    label: "Inclusão de pessoas com deficiência",
    category: "Direitos e inclusão",
    featured: true,
    subtopics: [
      "Acessibilidade",
      "Educação inclusiva",
      "Empregabilidade PCD",
      "Tecnologia assistiva",
      "Mobilidade",
    ],
  },
  {
    id: "children",
    label: "Crianças e adolescentes",
    category: "Assistência e comunidade",
    featured: true,
    subtopics: [
      "Proteção infantil",
      "Acolhimento",
      "Convivência comunitária",
      "Aprendizagem e primeiro emprego",
      "Esporte e cultura",
    ],
  },
  {
    id: "older-people",
    label: "Pessoas idosas",
    category: "Assistência e comunidade",
    subtopics: [
      "Convivência",
      "Inclusão digital",
      "Cuidados e autonomia",
      "Combate ao isolamento",
      "Direitos da pessoa idosa",
    ],
  },
  {
    id: "lgbtqia",
    label: "Direitos LGBTQIA+",
    category: "Direitos e inclusão",
    subtopics: [
      "Acolhimento",
      "Empregabilidade",
      "Combate à discriminação",
      "Saúde e bem-estar",
      "Direitos e cidadania",
    ],
  },
  {
    id: "health",
    label: "Saúde e bem-estar",
    category: "Saúde e bem-estar",
    subtopics: [
      "Prevenção e promoção da saúde",
      "Saúde mental",
      "Saúde da mulher",
      "Saúde comunitária",
      "Doação de sangue",
    ],
  },
  {
    id: "housing",
    label: "Moradia digna",
    category: "Assistência e comunidade",
    subtopics: [
      "Reformas solidárias",
      "Habitação social",
      "Regularização e orientação",
      "Acesso a serviços básicos",
    ],
  },
  {
    id: "culture",
    label: "Cultura e arte",
    category: "Educação e oportunidades",
    subtopics: [
      "Música",
      "Artes visuais",
      "Teatro e dança",
      "Literatura",
      "Patrimônio e memória",
    ],
  },
  {
    id: "sports",
    label: "Esporte e lazer",
    category: "Educação e oportunidades",
    subtopics: [
      "Esporte comunitário",
      "Atividade física",
      "Lazer inclusivo",
      "Formação esportiva",
    ],
  },
  {
    id: "women",
    label: "Direitos das mulheres",
    category: "Direitos e inclusão",
    subtopics: [
      "Enfrentamento à violência",
      "Autonomia financeira",
      "Maternidade e cuidado",
      "Saúde da mulher",
      "Liderança feminina",
    ],
  },
  {
    id: "racial-equality",
    label: "Igualdade racial",
    category: "Direitos e inclusão",
    subtopics: [
      "Combate ao racismo",
      "Educação antirracista",
      "Cultura e identidade",
      "Empregabilidade",
      "Direitos e cidadania",
    ],
  },
  {
    id: "migrants",
    label: "Migrantes e refugiados",
    category: "Direitos e inclusão",
    subtopics: [
      "Acolhimento e integração",
      "Idioma e comunicação",
      "Documentação e cidadania",
      "Empregabilidade",
      "Moradia e assistência",
    ],
  },
  {
    id: "homelessness",
    label: "Pessoas em situação de rua",
    category: "Assistência e comunidade",
    subtopics: [
      "Acolhimento",
      "Alimentação",
      "Documentação",
      "Reinserção profissional",
      "Moradia e autonomia",
    ],
  },
  {
    id: "community",
    label: "Desenvolvimento comunitário",
    category: "Assistência e comunidade",
    subtopics: [
      "Fortalecimento de territórios",
      "Associações de bairro",
      "Economia solidária",
      "Participação cidadã",
      "Mutirões comunitários",
    ],
  },
  {
    id: "digital-inclusion",
    label: "Inclusão digital",
    category: "Educação e oportunidades",
    subtopics: [
      "Alfabetização digital",
      "Acesso a equipamentos",
      "Conectividade",
      "Capacitação em tecnologia",
      "Segurança digital",
    ],
  },
];

export const CAUSE_SUBTOPIC_SEPARATOR = "::";

export function serializeCauseSubtopic(
  parent: string,
  subtopic: string,
): string {
  return `${parent}${CAUSE_SUBTOPIC_SEPARATOR}${subtopic}`;
}

export function parseCauseSelection(value: string): {
  parent: string;
  subtopic?: string;
} {
  const [parent, ...rest] = value.split(CAUSE_SUBTOPIC_SEPARATOR);
  const subtopic = rest.join(CAUSE_SUBTOPIC_SEPARATOR).trim();
  return {
    parent: parent.trim(),
    subtopic: subtopic || undefined,
  };
}

export function causeSelectionLabel(value: string): string {
  const parsed = parseCauseSelection(value);
  return parsed.subtopic ? `#${parsed.subtopic}` : parsed.parent;
}

export const VOLUNTEER_ACTIVITY_OPTIONS = [
  "Atendimento em bazar",
  "Atendimento ao público",
  "Organização de estoque",
  "Separação de alimentos, roupas ou doações",
  "Entregas",
  "Eventos e mutirões",
  "Comunicação e redes sociais",
  "Fotografia e vídeo",
  "Tecnologia",
  "Apoio administrativo",
  "Captação de recursos",
  "Aulas e oficinas",
  "Transporte e logística",
  "Triagem e recepção",
  "Organização de documentos",
  "Apoio em campanhas",
] as const;

export const DESIGN_SPECIALTY_OPTIONS = [
  "UI Design",
  "UX Design",
  "Design gráfico",
  "Identidade visual",
  "Ilustração",
  "Motion design",
  "Design editorial",
  "Social media",
  "Apresentações",
  "Acessibilidade em interfaces",
  "Pesquisa com usuários",
  "Prototipação",
] as const;

export const DESIGN_TOOL_OPTIONS = [
  "Figma",
  "Canva",
  "Adobe Illustrator",
  "Adobe Photoshop",
  "Adobe After Effects",
  "Adobe InDesign",
  "Framer",
  "Miro",
  "Blender",
  "Penpot",
] as const;

export const TECHNOLOGY_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "React Native",
  "Node.js",
  "Express",
  "Next.js",
  "Python",
  "Java",
  "C",
  "C++",
  "C#",
  "PHP",
  "PostgreSQL",
  "MySQL",
  "Supabase",
  "Firebase",
  "Docker",
  "Git",
  "GitHub",
  "HTML",
  "CSS",
  "Tailwind",
  "Prisma",
  "Zod",
  "Vitest",
  "Jest",
  "Playwright",
] as const;

export interface LanguageOption {
  value: string;
  label: string;
  code: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { value: "Português", label: "Português", code: "PT" },
  { value: "Inglês", label: "Inglês", code: "EN" },
  { value: "Espanhol", label: "Espanhol", code: "ES" },
  { value: "Francês", label: "Francês", code: "FR" },
  { value: "Alemão", label: "Alemão", code: "DE" },
  { value: "Italiano", label: "Italiano", code: "IT" },
  { value: "Mandarim", label: "Mandarim", code: "ZH" },
  { value: "Japonês", label: "Japonês", code: "JA" },
  { value: "Coreano", label: "Coreano", code: "KO" },
  { value: "Árabe", label: "Árabe", code: "AR" },
  { value: "Russo", label: "Russo", code: "RU" },
  {
    value: "Língua de sinais internacional",
    label: "Língua de sinais internacional",
    code: "IS",
  },
];

export const ACCESSIBILITY_SKILL_OPTIONS = [
  { id: "libras", label: "Libras" },
  { id: "braille", label: "Braille" },
  { id: "audio-description", label: "Audiodescrição" },
  { id: "accessible-captions", label: "Legendagem acessível" },
  { id: "plain-language", label: "Linguagem simples" },
] as const;

export const COMPANY_SUPPORT_OPTIONS = [
  "Recursos financeiros",
  "Produtos e materiais",
  "Serviços profissionais",
  "Tecnologia",
  "Comunicação e divulgação",
  "Transporte e logística",
  "Espaço físico",
  "Voluntariado corporativo",
  "Capacitação",
] as const;
