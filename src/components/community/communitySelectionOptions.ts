import type { SelectionOption } from "../profileForms/shared/SelectionModal";
import {
  DESIGN_SPECIALTY_OPTIONS,
  TECHNOLOGY_OPTIONS,
  VOLUNTEER_ACTIVITY_OPTIONS,
} from "../../data/profileCatalog";

const COMMUNITY_TAGS = [
  "Captação de recursos",
  "Voluntariado",
  "Comunicação",
  "Marketing digital",
  "Gestão de projetos",
  "Gestão de doadores",
  "Doações",
  "Impacto social",
  "Tecnologia",
  "Acessibilidade",
  "Pesquisa",
  "Dados",
  "Educação",
  "Assistência social",
  "Saúde",
  "Meio ambiente",
  "Direitos humanos",
  "Cultura",
  "Eventos",
  "Parcerias",
  "Transparência",
  "Governança",
  "Documentação",
  "UX e pesquisa",
] as const;

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export const communityTagOptions: SelectionOption[] = unique([
  ...COMMUNITY_TAGS,
  ...TECHNOLOGY_OPTIONS,
  ...DESIGN_SPECIALTY_OPTIONS,
]).map((value, index) => ({
  value,
  label: value,
  featured: index < 8,
}));

export const communitySkillOptions: SelectionOption[] = unique([
  ...DESIGN_SPECIALTY_OPTIONS,
  ...TECHNOLOGY_OPTIONS,
  ...VOLUNTEER_ACTIVITY_OPTIONS,
  "Comunicação",
  "Marketing digital",
  "Captação de recursos",
  "Gestão de projetos",
  "Gestão de voluntários",
  "Pesquisa com usuários",
  "Redação",
  "Revisão de texto",
  "Fotografia",
  "Vídeo",
  "Eventos",
  "Logística",
  "Atendimento",
]).map((value) => ({ value, label: value }));
