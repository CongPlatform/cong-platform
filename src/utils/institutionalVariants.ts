import type {
  InstitutionalSectionType,
  InstitutionalVariant,
} from "../services/institutionalService";

const recommendedVariantNames: Partial<Record<InstitutionalSectionType, string[]>> = {
  organization_intro: ["Campanha editorial", "Narrativa humana", "Manifesto editorial", "Imagem lateral", "Destaque central"],
  organization_about: ["Editorial com destaque", "História editorial", "Imagem à esquerda", "Editorial"],
  projects_showcase: ["Mosaico de iniciativas", "Cards", "Lista"],
  impact_metrics: ["Resultados em linha", "Faixa de impacto", "Números", "Cards"],
  support_actions: ["Ações com destaque", "Convites para participar", "Cards", "Ação principal"],
  transparency: ["Painel de confiança", "Lista", "Cards"],
  organization_contact: ["Contato acolhedor", "Dividido", "Centralizado"],
  site_footer: ["Rodapé editorial", "Rodapé completo", "Rodapé compacto"],
  custom_content: ["Missão, visão e valores", "Chamada final", "Como funciona", "Públicos e participação", "História em destaque", "Linha do tempo", "Seção em branco"],
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
  const visualStyle = visualStyleByVariantName[variant.name];
  if (!visualStyle) return {};

  const generous = variant.sectionType === "organization_intro";
  const normalWidth = variant.sectionType === "organization_contact" || variant.name === "História editorial";

  return {
    visualStyle,
    sectionStyle: {
      spacing: generous ? "generous" : "comfortable",
      contentWidth: normalWidth ? "normal" : "wide",
      backgroundColor: variant.sectionType === "site_footer" ? "primary" : "background",
    },
  };
}
