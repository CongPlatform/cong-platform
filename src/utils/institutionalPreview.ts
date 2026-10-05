import { createDefaultSectionContent } from "../data/institutional/sectionCatalog";
import type {
  InstitutionalBrand,
  InstitutionalImageValue,
  InstitutionalSection,
  InstitutionalSectionType,
  InstitutionalSite,
  InstitutionalTemplate,
  InstitutionalVariant,
} from "../services/institutionalService";

const FIXED_DATE = "2026-01-01T00:00:00.000Z";

function svgDataUri(label: string, first: string, second: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${first}"/><stop offset="1" stop-color="${second}"/></linearGradient></defs><rect width="960" height="720" rx="48" fill="url(#g)"/><circle cx="730" cy="185" r="155" fill="white" fill-opacity=".28"/><circle cx="210" cy="535" r="205" fill="white" fill-opacity=".18"/><path d="M170 480c95-155 260-230 425-168 75 28 131 80 184 155v153H170z" fill="#ffffff" fill-opacity=".42"/><circle cx="460" cy="275" r="86" fill="#ffffff" fill-opacity=".72"/><text x="54" y="88" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#ffffff">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function previewImage(label: string, first = "#3d66c5", second = "#f4b644"): InstitutionalImageValue {
  return {
    assetId: `preview-${label.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-")}`,
    alt: label,
    url: svgDataUri(label, first, second),
  };
}

function mergeContent(
  base: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const result = { ...base };
  Object.entries(source ?? {}).forEach(([key, value]) => {
    const emptyString = typeof value === "string" && value.trim() === "";
    const emptyArray = Array.isArray(value) && value.length === 0;
    if (value === null || value === undefined || emptyString || emptyArray) return;
    result[key] = value;
  });
  return result;
}

export function previewContentForSection(
  type: InstitutionalSectionType,
  source?: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = createDefaultSectionContent(type);

  if (type === "organization_intro") {
    return mergeContent({
      ...defaults,
      eyebrow: "Cuidado que vira oportunidade",
      title: "Juntos, transformamos presença em impacto real.",
      description: "Uma organização próxima das pessoas, com ações concretas e caminhos simples para participar, apoiar e acompanhar resultados.",
      image: previewImage("Atuação da organização", "#5945a8", "#f3a947"),
      primaryAction: { label: "Conheça nosso trabalho", href: "#section-preview-about" },
      secondaryAction: { label: "Quero ajudar", href: "#section-preview-support" },
    }, source);
  }

  if (type === "organization_about") {
    return mergeContent({
      ...defaults,
      eyebrow: "Quem somos",
      title: "Uma história construída junto da comunidade",
      description: "Nascemos para aproximar pessoas, recursos e oportunidades. Trabalhamos com escuta, presença no território e acompanhamento para que cada ação faça sentido para quem participa.",
      image: previewImage("História e comunidade", "#6e5bc5", "#9bcfba"),
      action: { label: "Conheça nossa história", href: "#" },
    }, source);
  }

  if (type === "projects_showcase") {
    return mergeContent({
      ...defaults,
      title: "Ações que acontecem de verdade",
      description: "Conheça algumas frentes de atuação e veja como cada iniciativa se conecta às necessidades da comunidade.",
      items: [
        { id: "preview-project-1", category: "Formação", title: "Capacitação de voluntários", description: "Encontros práticos para preparar pessoas que querem contribuir com segurança e clareza.", image: previewImage("Capacitação", "#315b9f", "#9bcfba"), action: { label: "Ver iniciativa", href: "#" } },
        { id: "preview-project-2", category: "Comunidade", title: "Ações no território", description: "Atividades presenciais construídas em parceria com moradores e organizações locais.", image: previewImage("Comunidade", "#d06c5f", "#f0bd63"), action: { label: "Ver iniciativa", href: "#" } },
        { id: "preview-project-3", category: "Apoio", title: "Rede de cuidado", description: "Conexões entre pessoas, serviços e oportunidades para facilitar o acesso ao apoio necessário.", image: previewImage("Rede de cuidado", "#4a66b8", "#c2a7e8"), action: { label: "Ver iniciativa", href: "#" } },
      ],
    }, source);
  }

  if (type === "impact_metrics") {
    return mergeContent({
      ...defaults,
      title: "Impacto que pode ser acompanhado",
      description: "Indicadores ajudam a traduzir o alcance do trabalho e tornam os resultados mais fáceis de compreender.",
      items: [
        { id: "preview-impact-1", value: "12 mil+", label: "pessoas alcançadas", period: "exemplo", source: "" },
        { id: "preview-impact-2", value: "48", label: "ações realizadas", period: "exemplo", source: "" },
        { id: "preview-impact-3", value: "320+", label: "voluntários mobilizados", period: "exemplo", source: "" },
        { id: "preview-impact-4", value: "18", label: "parcerias ativas", period: "exemplo", source: "" },
      ],
    }, source);
  }

  if (type === "support_actions") {
    return mergeContent({
      ...defaults,
      title: "Há diferentes formas de fazer parte",
      description: "Escolha o caminho que combina com você. A organização explica o próximo passo sem complicação.",
      items: [
        { id: "preview-support-1", kind: "donate", title: "Doar", description: "Apoie ações e projetos com uma contribuição.", action: { label: "Quero doar", href: "#" } },
        { id: "preview-support-2", kind: "volunteer", title: "Ser voluntário", description: "Participe com tempo, conhecimento e presença.", action: { label: "Quero participar", href: "#" } },
        { id: "preview-support-3", kind: "partner", title: "Ser parceiro", description: "Construa iniciativas em conjunto com a organização.", action: { label: "Falar com a equipe", href: "#" } },
      ],
    }, source);
  }

  if (type === "transparency") {
    return mergeContent({
      ...defaults,
      title: "Transparência que aproxima",
      description: "Documentos e informações organizados para quem quer acompanhar a atuação da organização.",
      items: [
        { id: "preview-doc-1", category: "report", title: "Relatório de atividades", description: "Resultados, projetos e principais acontecimentos do período.", period: "2026", url: "#" },
        { id: "preview-doc-2", category: "finance", title: "Prestação de contas", description: "Resumo financeiro e destinação dos recursos.", period: "2026", url: "#" },
        { id: "preview-doc-3", category: "governance", title: "Documentos institucionais", description: "Informações de governança e funcionamento.", period: "", url: "#" },
      ],
    }, source);
  }

  if (type === "organization_contact") {
    return mergeContent({
      ...defaults,
      title: "Vamos conversar?",
      description: "Escolha o canal mais conveniente para falar com a organização.",
      email: "contato@organizacao.org.br",
      phone: "(00) 0000-0000",
      whatsapp: "(00) 00000-0000",
      address: "Atuação comunitária e atendimento mediante orientação da equipe.",
      hours: "Segunda a sexta, em horário comercial",
      socialLinks: [
        { id: "preview-social-1", label: "Instagram", url: "#" },
        { id: "preview-social-2", label: "LinkedIn", url: "#" },
      ],
    }, source);
  }

  if (type === "site_footer") {
    return mergeContent({
      ...defaults,
      title: "Instituto Horizonte",
      description: "Pessoas, território e oportunidades conectados para gerar impacto duradouro.",
      email: "contato@organizacao.org.br",
      phone: "(00) 0000-0000",
      socialLinks: [
        { id: "preview-footer-1", label: "Instagram", url: "#" },
        { id: "preview-footer-2", label: "LinkedIn", url: "#" },
      ],
      copyright: "Exemplo de conteúdo para visualização do modelo.",
    }, source);
  }

  return mergeContent(defaults, source);
}

export function previewBrandForCategory(category: string): InstitutionalBrand {
  const normalized = category.toLocaleLowerCase("pt-BR");
  const palette = normalized.includes("impact")
    ? { primary: "#273d78", secondary: "#6b56b7", accent: "#f0a53c", background: "#fffdf8", text: "#17233d" }
    : normalized.includes("institucional") || normalized.includes("transpar")
      ? { primary: "#274f78", secondary: "#6f5aa8", accent: "#e8a840", background: "#fcfbf7", text: "#10233a" }
      : { primary: "#5b46a7", secondary: "#3b7c72", accent: "#efab42", background: "#fffdf9", text: "#17233d" };

  return {
    organizationId: "preview-organization",
    publicSlug: "preview",
    logoAssetId: null,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    backgroundColor: palette.background,
    textColor: palette.text,
    headingFont: "brand",
    bodyFont: "interface",
    logoAsset: null,
  };
}

export function buildTemplatePreviewSite(
  template: InstitutionalTemplate,
  variants: InstitutionalVariant[],
): InstitutionalSite | null {
  const definition = template.definition;
  const sourcePage = definition?.pages.find((page) => page.isHome) ?? definition?.pages[0];
  if (!sourcePage) return null;

  const sections = sourcePage.sections.flatMap((section, index): InstitutionalSection[] => {
    const variant = variants.find((item) => item.versionId === section.variantVersionId);
    if (!variant) return [];
    return [{
      id: `preview-${template.id}-${index}`,
      pageId: `preview-page-${template.id}`,
      sectionType: section.sectionType,
      variantVersionId: section.variantVersionId,
      position: index,
      visible: true,
      content: previewContentForSection(section.sectionType, section.content),
      settings: section.settings ?? {},
      variantId: variant.id,
      variantName: variant.name,
      variantVersion: variant.version,
      layout: variant.layout,
    }];
  });

  const brand = previewBrandForCategory(template.category);
  return {
    id: `preview-site-${template.id}`,
    name: template.name,
    slug: "preview",
    publicSlug: "preview",
    sourceTemplateId: template.id,
    editorConstraints: definition?.editorConstraints ?? {
      mode: "guided",
      minWidthPercent: 25,
      maxWidthPercent: 100,
      minFontSize: 12,
      maxFontSize: 72,
      maxOffset: 40,
    },
    isPrimary: false,
    publishedAt: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    organization: { id: "preview-organization", name: "Instituto Horizonte" },
    brand,
    pages: [{
      id: `preview-page-${template.id}`,
      title: sourcePage.title,
      slug: sourcePage.slug,
      isHome: true,
      position: 0,
      sections,
    }],
  };
}
