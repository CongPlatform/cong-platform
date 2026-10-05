import type {
  InstitutionalLayoutNode,
  InstitutionalSectionType,
  LayoutAlign,
  LayoutGap,
} from "../../services/institutionalService";

export type VariantComposition =
  | "balanced"
  | "media-left"
  | "media-right"
  | "centered";

export interface VariantLayoutSettings {
  composition: VariantComposition;
  gap: LayoutGap;
  align: LayoutAlign;
  collectionColumns: 1 | 2 | 3 | 4;
}

export const defaultVariantLayoutSettings: VariantLayoutSettings = {
  composition: "balanced",
  gap: "large",
  align: "start",
  collectionColumns: 3,
};

function slot(slotName: string, presentation?: string): InstitutionalLayoutNode {
  return {
    type: "slot",
    slot: slotName,
    ...(presentation ? { presentation } : {}),
  };
}

function stack(
  children: InstitutionalLayoutNode[],
  settings: Pick<VariantLayoutSettings, "gap" | "align">,
  surface?: "card" | "list" | "highlight",
): InstitutionalLayoutNode {
  return {
    type: "stack",
    gap: settings.gap,
    align: settings.align,
    ...(surface ? { surface } : {}),
    children,
  };
}

function textIntro(
  titlePresentation: "display" | "heading",
  actionSlots: string[] = [],
): InstitutionalLayoutNode[] {
  return [
    slot("eyebrow", "eyebrow"),
    slot("title", titlePresentation),
    slot("description", titlePresentation === "display" ? "lead" : "body"),
    ...actionSlots.map((name, index) =>
      slot(name, index === 0 ? "primaryAction" : "secondaryAction"),
    ),
  ];
}

function buildImageTextLayout(
  sectionType: "organization_intro" | "organization_about",
  settings: VariantLayoutSettings,
): InstitutionalLayoutNode {
  const isIntro = sectionType === "organization_intro";
  const text = stack(
    textIntro(
      isIntro ? "display" : "heading",
      isIntro ? ["primaryAction", "secondaryAction"] : ["action"],
    ),
    settings,
  );
  const image = slot("image", isIntro ? "heroImage" : "image");

  if (settings.composition === "centered") {
    return stack([...textIntro(isIntro ? "display" : "heading"), image], {
      gap: settings.gap,
      align: "center",
    });
  }

  if (settings.composition === "balanced") {
    return stack([text, image], settings);
  }

  return {
    type: "columns",
    ratio: "1:1",
    gap: settings.gap,
    children:
      settings.composition === "media-left" ? [image, text] : [text, image],
  };
}

function buildCollectionLayout(
  sectionType: Extract<
    InstitutionalSectionType,
    "projects_showcase" | "impact_metrics" | "support_actions" | "transparency"
  >,
  settings: VariantLayoutSettings,
): InstitutionalLayoutNode {
  const heading = stack(
    [slot("title", "heading"), slot("description", "body")],
    settings,
  );

  const itemLayouts: Record<typeof sectionType, InstitutionalLayoutNode> = {
    projects_showcase: stack(
      [
        slot("image", "cardImage"),
        slot("category", "eyebrow"),
        slot("title", "itemTitle"),
        slot("description", "itemBody"),
        slot("action", "secondaryAction"),
      ],
      { gap: "small", align: "start" },
      "card",
    ),
    impact_metrics: stack(
      [
        slot("value", "metricValue"),
        slot("label", "metricLabel"),
        slot("period", "caption"),
        slot("source", "caption"),
      ],
      { gap: "small", align: settings.align },
      "highlight",
    ),
    support_actions: stack(
      [
        slot("title", "itemTitle"),
        slot("description", "itemBody"),
        slot("action", "primaryAction"),
      ],
      { gap: "small", align: "start" },
      "card",
    ),
    transparency: stack(
      [
        slot("title", "itemTitle"),
        slot("description", "itemBody"),
        slot("period", "caption"),
        slot("url", "documentLink"),
      ],
      { gap: "small", align: "start" },
      "list",
    ),
  };

  return stack(
    [
      heading,
      {
        type: "repeat",
        source: "items",
        columns:
          sectionType === "transparency" ? 1 : settings.collectionColumns,
        gap: settings.gap,
        item: itemLayouts[sectionType],
      },
    ],
    settings,
  );
}

function buildContactLayout(
  settings: VariantLayoutSettings,
): InstitutionalLayoutNode {
  const intro = stack(
    [slot("title", "heading"), slot("description", "body")],
    settings,
  );
  const details = stack(
    [
      slot("email", "contactLink"),
      slot("phone", "contactLine"),
      slot("whatsapp", "contactLine"),
      slot("address", "contactLine"),
      slot("hours", "contactLine"),
      {
        type: "repeat",
        source: "socialLinks",
        columns: 1,
        gap: "small",
        item: slot("url", "socialLink"),
      },
    ],
    { gap: "small", align: "start" },
  );

  if (settings.composition === "centered") {
    return stack([intro, details], { gap: settings.gap, align: "center" });
  }

  return {
    type: "columns",
    ratio: "1:1",
    gap: settings.gap,
    children: [intro, details],
  };
}


function buildCustomLayout(settings: VariantLayoutSettings): InstitutionalLayoutNode {
  return {
    type: "stack",
    gap: settings.gap,
    align: settings.align,
    children: [
      {
        type: "element",
        id: crypto.randomUUID(),
        elementType: "heading",
        value: "Novo título",
        presentation: "heading",
        style: { size: "2xl", width: "100", color: "text", align: "left" },
      },
      {
        type: "element",
        id: crypto.randomUUID(),
        elementType: "text",
        value: "Adicione elementos e organize esta seção do seu jeito.",
        presentation: "body",
        style: { size: "md", width: "100", color: "text", align: "left" },
      },
    ],
  };
}

function buildFooterLayout(settings: VariantLayoutSettings): InstitutionalLayoutNode {
  return stack(
    [
      slot("title", "heading"),
      slot("description", "body"),
      slot("email", "contactLink"),
      slot("phone", "contactLine"),
      {
        type: "repeat",
        source: "socialLinks",
        columns: 3,
        gap: "small",
        item: slot("url", "socialLink"),
      },
      slot("copyright", "caption"),
    ],
    settings,
  );
}

export function buildVariantLayout(
  sectionType: InstitutionalSectionType,
  settings: VariantLayoutSettings,
): InstitutionalLayoutNode {
  if (sectionType === "organization_intro" || sectionType === "organization_about") {
    return buildImageTextLayout(sectionType, settings);
  }

  if (sectionType === "organization_contact") {
    return buildContactLayout(settings);
  }

  if (sectionType === "custom_content") {
    return buildCustomLayout(settings);
  }

  if (sectionType === "site_footer") {
    return buildFooterLayout(settings);
  }

  return buildCollectionLayout(sectionType, settings);
}
