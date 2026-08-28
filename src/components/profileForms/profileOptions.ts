export type CauseGroup = {
  id: string;
  label: string;
  options: readonly string[];
};

export const CAUSE_GROUPS: readonly CauseGroup[] = [
  {
    id: "animals-environment",
    label: "Animais e meio ambiente",
    options: [
      "Proteção animal",
      "Meio ambiente",
      "Sustentabilidade",
      "Preservação e recuperação ambiental",
    ],
  },
  {
    id: "rights-inclusion",
    label: "Direitos e inclusão",
    options: [
      "LGBTQIA+",
      "Pessoas com deficiência",
      "Igualdade racial",
      "Direitos humanos",
      "Direitos das mulheres",
      "Migrantes e refugiados",
    ],
  },
  {
    id: "education-opportunities",
    label: "Educação e oportunidades",
    options: [
      "Educação",
      "Infância e adolescência",
      "Cultura",
      "Esporte",
      "Formação profissional",
      "Inclusão digital",
    ],
  },
  {
    id: "health-wellbeing",
    label: "Saúde e bem-estar",
    options: [
      "Saúde",
      "Saúde mental",
      "Pessoas idosas",
      "Prevenção e qualidade de vida",
    ],
  },
  {
    id: "social-community",
    label: "Assistência e comunidade",
    options: [
      "Combate à fome e segurança alimentar",
      "Pessoas em situação de vulnerabilidade",
      "Moradia",
      "Pessoas em situação de rua",
      "Desenvolvimento comunitário",
      "Emergências e ajuda humanitária",
    ],
  },
];

export const VOLUNTEER_HELP_TYPES = [
  "Atendimento em bazar",
  "Organização de estoque",
  "Separação de alimentos, roupas ou doações",
  "Entregas",
  "Eventos",
  "Atendimento ao público",
  "Comunicação e redes sociais",
  "Fotografia e vídeo",
  "Tecnologia",
  "Apoio administrativo",
  "Captação de recursos",
  "Aulas e oficinas",
  "Transporte e logística",
] as const;

export const SUPPORT_TYPES = [
  {
    id: "find_cause",
    label: "Encontrar uma causa, ONG ou projeto para apoiar",
  },
  {
    id: "financial_donation",
    label: "Fazer doações financeiras",
  },
  {
    id: "recurring_support",
    label: "Apoiar de forma recorrente",
  },
  {
    id: "material_donation",
    label: "Doar materiais, alimentos ou outros recursos",
  },
  {
    id: "campaign_support",
    label: "Apoiar campanhas e divulgação",
  },
  {
    id: "services_resources",
    label: "Oferecer serviços, estrutura ou outros recursos",
  },
] as const;

export type SupportType = (typeof SUPPORT_TYPES)[number]["id"];
