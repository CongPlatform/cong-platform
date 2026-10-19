import {
  findNativeDesignFamilyById,
  findNativeDesignFamilyByName,
  nativeDesignFamilies,
  nativeFamilyVisualStyle,
} from "../data/institutional/nativeDesignFamilies";
import type {
  InstitutionalSectionType,
  InstitutionalVariant,
} from "../services/institutionalService";

const recommendedVariantNames: Partial<
  Record<InstitutionalSectionType, string[]>
> = {
  site_header: nativeDesignFamilies.map((family) => family.name),
  organization_intro: nativeDesignFamilies.map((family) => family.name),
  organization_about: nativeDesignFamilies.map((family) => family.name),
  projects_showcase: nativeDesignFamilies.map((family) => family.name),
  impact_metrics: nativeDesignFamilies.map((family) => family.name),
  support_actions: nativeDesignFamilies.map((family) => family.name),
  transparency: nativeDesignFamilies.map((family) => family.name),
  organization_contact: nativeDesignFamilies.map((family) => family.name),
  site_footer: nativeDesignFamilies.map((family) => family.name),
  custom_content: nativeDesignFamilies.map((family) => family.name),
};

export function findRecommendedVariant(
  variants: InstitutionalVariant[],
  sectionType: InstitutionalSectionType,
  preferredName?: string,
): InstitutionalVariant | undefined {
  const available = variants.filter(
    (variant) =>
      variant.sectionType === sectionType &&
      (variant.isSystem || variant.status === "published"),
  );

  if (preferredName) {
    const exact = available.find((variant) => variant.name === preferredName);
    if (exact) return exact;
  }

  const recommendedNames = recommendedVariantNames[sectionType] ?? [];
  for (const name of recommendedNames) {
    const candidate = available.find((variant) => variant.name === name);
    if (candidate) return candidate;
  }

  return available[0];
}

const visualStyleByVariantName: Record<string, string> = {
  "Navegação humana": "header-human",
  "Navegação essencial": "header-essential",
  "Presença humana": "hero-human-v2",
  "Manifesto claro": "hero-clear",
  "Impacto em movimento": "impact-story",
  "Números editoriais": "impact-editorial",
  "História com presença": "about-human-v2",
  "Projetos em mosaico": "projects-mosaic-v2",
  "Projetos editoriais": "projects-editorial-v2",
  "Caminhos para participar": "support-human-v2",
  "Contato próximo": "contact-human-v2",
  "Rodapé com propósito": "footer-purpose",
  "Rodapé essencial": "footer-essential",
  "Como o trabalho acontece": "process-v2",
  "Campanha editorial": "hero-campaign",
  "Resultados em linha": "impact-ribbon",
  "Editorial com destaque": "about-premium",
  "Ações com destaque": "support-featured",
  "Missão, visão e valores": "values-editorial",
  "Chamada final": "cta-editorial",
  "Linha do tempo": "timeline-editorial",
  "Narrativa humana": "hero-human",
  "Manifesto editorial": "hero-editorial",
  "História editorial": "story-split",
  "Mosaico de iniciativas": "cards-airy",
  "Faixa de impacto": "impact-band",
  "Convites para participar": "support-cards",
  "Painel de confiança": "trust-panel",
  "Contato acolhedor": "contact-panel",
  "Rodapé editorial": "footer-rich",
  "Como funciona": "process",
  "Públicos e participação": "audiences",
  "História em destaque": "story-split",
};

export function defaultSettingsForVariant(
  variant: InstitutionalVariant,
): Record<string, unknown> {
  const family =
    findNativeDesignFamilyById(variant.familyKey) ??
    findNativeDesignFamilyByName(variant.name);
  const visualStyle = family
    ? nativeFamilyVisualStyle(family.id, variant.sectionType)
    : visualStyleByVariantName[variant.name];
  if (!visualStyle) return {};

  const header = variant.sectionType === "site_header";
  const generous = variant.sectionType === "organization_intro";
  const normalWidth =
    variant.sectionType === "organization_contact" ||
    variant.name === "História editorial";
  const familyBackground =
    family &&
    ["territorio-vivo", "essencial", "pulso", "profundezas"].includes(
      family.id,
    ) &&
    ["organization_intro", "custom_content", "site_footer"].includes(
      variant.sectionType,
    )
      ? "primary"
      : variant.sectionType === "site_footer"
        ? "primary"
        : "background";

  return {
    visualStyle,
    sectionStyle: {
      spacing: header ? "compact" : generous ? "generous" : "comfortable",
      contentWidth: normalWidth ? "normal" : "wide",
      backgroundColor: familyBackground,
      backgroundDecor: family ? "template" : undefined,
    },
  };
}
