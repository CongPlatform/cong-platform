import type { IconType } from "react-icons";
import {
  FiActivity,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiCompass,
  FiDroplet,
  FiFeather,
  FiFlag,
  FiGlobe,
  FiHeart,
  FiHome,
  FiInfo,
  FiLink2,
  FiMapPin,
  FiMessageCircle,
  FiPackage,
  FiPhone,
  FiShield,
  FiStar,
  FiSun,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from "react-icons/fi";

export type InstitutionalIconOption = {
  id: string;
  label: string;
  Icon: IconType;
};

export const institutionalIconOptions: InstitutionalIconOption[] = [
  { id: "heart", label: "Coração", Icon: FiHeart },
  { id: "users", label: "Pessoas", Icon: FiUsers },
  { id: "home", label: "Casa", Icon: FiHome },
  { id: "map", label: "Local", Icon: FiMapPin },
  { id: "globe", label: "Mundo", Icon: FiGlobe },
  { id: "leaf", label: "Natureza", Icon: FiFeather },
  { id: "droplet", label: "Água", Icon: FiDroplet },
  { id: "sun", label: "Sol", Icon: FiSun },
  { id: "book", label: "Educação", Icon: FiBookOpen },
  { id: "briefcase", label: "Trabalho", Icon: FiBriefcase },
  { id: "shield", label: "Proteção", Icon: FiShield },
  { id: "package", label: "Doação", Icon: FiPackage },
  { id: "calendar", label: "Agenda", Icon: FiCalendar },
  { id: "message", label: "Comunicação", Icon: FiMessageCircle },
  { id: "phone", label: "Telefone", Icon: FiPhone },
  { id: "link", label: "Link", Icon: FiLink2 },
  { id: "target", label: "Meta", Icon: FiTarget },
  { id: "trend", label: "Impacto", Icon: FiTrendingUp },
  { id: "activity", label: "Atividade", Icon: FiActivity },
  { id: "award", label: "Conquista", Icon: FiAward },
  { id: "star", label: "Destaque", Icon: FiStar },
  { id: "check", label: "Concluído", Icon: FiCheckCircle },
  { id: "compass", label: "Direção", Icon: FiCompass },
  { id: "flag", label: "Marco", Icon: FiFlag },
  { id: "feather", label: "Cultura", Icon: FiFeather },
  { id: "zap", label: "Energia", Icon: FiZap },
  { id: "info", label: "Informação", Icon: FiInfo },
];

const institutionalIconMap: Record<string, IconType> = Object.fromEntries(
  institutionalIconOptions.map(({ id, Icon }) => [id, Icon]),
);

export function resolveInstitutionalIcon(id: string): IconType {
  return institutionalIconMap[id] ?? FiHeart;
}
