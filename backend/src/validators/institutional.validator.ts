import * as z from "zod";

export const institutionalSectionTypes = [
  "site_header",
  "organization_intro",
  "organization_about",
  "projects_showcase",
  "impact_metrics",
  "support_actions",
  "transparency",
  "organization_contact",
  "custom_content",
  "site_footer",
] as const;

export type InstitutionalSectionType = (typeof institutionalSectionTypes)[number];

export const institutionalSectionTypeSchema = z.enum(institutionalSectionTypes);

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optionalText = (max: number) => z.string().trim().max(max).default("");
const optionalUrl = z
  .union([z.string().trim().url().max(1000), z.literal("")])
  .default("");

const actionSchema = z
  .object({
    label: z.string().trim().min(1).max(80),
    href: z.string().trim().min(1).max(500),
  })
  .strict();

const imageSchema = z
  .object({
    assetId: z.string().uuid(),
    alt: z.string().trim().max(240).default(""),
    url: z.string().trim().url().optional(),
  })
  .strict()
  .transform(({ assetId, alt }) => ({ assetId, alt }));

const nullableActionSchema = z.union([actionSchema, z.null()]).default(null);
const nullableImageSchema = z.union([imageSchema, z.null()]).default(null);

const projectItemSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).default(""),
    category: z.string().trim().max(80).default(""),
    image: nullableImageSchema,
    action: nullableActionSchema,
  })
  .strict();

const impactItemSchema = z
  .object({
    id: z.string().uuid(),
    value: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(120),
    period: z.string().trim().max(100).default(""),
    source: z.string().trim().max(240).default(""),
  })
  .strict();

const supportItemSchema = z
  .object({
    id: z.string().uuid(),
    kind: z.enum(["donate", "volunteer", "partner", "materials", "share", "other"]),
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().max(400).default(""),
    action: nullableActionSchema,
  })
  .strict();

const transparencyItemSchema = z
  .object({
    id: z.string().uuid(),
    category: z.enum([
      "report",
      "accountability",
      "financial",
      "statute",
      "partnership",
      "governance",
      "other",
    ]),
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(500).default(""),
    period: z.string().trim().max(100).default(""),
    url: optionalUrl,
  })
  .strict();

const socialLinkSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().trim().min(1).max(60),
    url: z.union([z.string().trim().url().max(1000), z.literal("")]),
  })
  .strict();

const navigationLinkSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string().trim().min(1).max(60),
    href: z.string().trim().min(1).max(500),
  })
  .strict();

const sectionContentSchemas: Record<InstitutionalSectionType, z.ZodType> = {
  site_header: z
    .object({
      brandLabel: optionalText(120),
      links: z.array(navigationLinkSchema).max(8).default([]),
      primaryAction: nullableActionSchema,
    })
    .strict(),
  organization_intro: z
    .object({
      eyebrow: optionalText(100),
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(900).default(""),
      image: nullableImageSchema,
      primaryAction: nullableActionSchema,
      secondaryAction: nullableActionSchema,
    })
    .strict(),
  organization_about: z
    .object({
      eyebrow: optionalText(100),
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(2500).default(""),
      image: nullableImageSchema,
      action: nullableActionSchema,
    })
    .strict(),
  projects_showcase: z
    .object({
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(900).default(""),
      items: z.array(projectItemSchema).max(12).default([]),
    })
    .strict(),
  impact_metrics: z
    .object({
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(900).default(""),
      items: z.array(impactItemSchema).max(12).default([]),
    })
    .strict(),
  support_actions: z
    .object({
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(900).default(""),
      items: z.array(supportItemSchema).max(8).default([]),
    })
    .strict(),
  transparency: z
    .object({
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(900).default(""),
      items: z.array(transparencyItemSchema).max(30).default([]),
    })
    .strict(),
  organization_contact: z
    .object({
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().max(900).default(""),
      email: z.union([z.string().trim().email().max(320), z.literal("")]).default(""),
      phone: optionalText(40),
      whatsapp: optionalText(40),
      address: optionalText(400),
      hours: optionalText(300),
      socialLinks: z.array(socialLinkSchema).max(8).default([]),
    })
    .strict(),
  custom_content: z.object({}).passthrough(),
  site_footer: z
    .object({
      title: optionalText(160),
      description: optionalText(500),
      email: z.union([z.string().trim().email().max(320), z.literal("")]).default(""),
      phone: optionalText(40),
      copyright: optionalText(220),
      socialLinks: z.array(socialLinkSchema).max(8).default([]),
    })
    .strict(),
};

export function parseInstitutionalSectionContent(
  sectionType: InstitutionalSectionType,
  content: unknown,
): Record<string, unknown> {
  return sectionContentSchemas[sectionType].parse(content) as Record<string, unknown>;
}

const gapSchema = z.enum(["none", "small", "medium", "large"]);
const alignSchema = z.enum(["start", "center", "end", "stretch"]);
const ratioSchema = z.enum(["1:1", "1:2", "2:1", "2:3", "3:2"]);
const surfaceSchema = z.enum(["none", "card", "list", "highlight"]);
const presentationSchema = z.enum([
  "eyebrow",
  "display",
  "heading",
  "lead",
  "body",
  "caption",
  "image",
  "heroImage",
  "wideImage",
  "cardImage",
  "primaryAction",
  "secondaryAction",
  "itemTitle",
  "itemBody",
  "metricValue",
  "metricLabel",
  "contactLine",
  "contactLink",
  "documentLink",
  "socialLink",
  "navLink",
  "brandLogo",
  "metricIcon",
  "supportIcon",
]);
const elementTypeSchema = z.enum([
  "heading",
  "text",
  "image",
  "button",
  "icon",
  "shape",
  "metric",
  "quote",
  "divider",
  "spacer",
]);

const elementSizeSchema = z.enum(["xs", "sm", "md", "lg", "xl", "2xl", "3xl"]);
const elementWidthSchema = z.enum(["auto", "25", "33", "50", "66", "75", "100"]);
const semanticColorSchema = z.enum([
  "text",
  "primary",
  "secondary",
  "accent",
  "background",
  "text.soft",
  "text.light",
  "text.base",
  "text.strong",
  "text.deep",
  "primary.soft",
  "primary.light",
  "primary.base",
  "primary.strong",
  "primary.deep",
  "secondary.soft",
  "secondary.light",
  "secondary.base",
  "secondary.strong",
  "secondary.deep",
  "accent.soft",
  "accent.light",
  "accent.base",
  "accent.strong",
  "accent.deep",
  "background.soft",
  "background.light",
  "background.base",
  "background.strong",
  "background.deep",
]);
const elementColorSchema = z.union([semanticColorSchema, colorSchema]);
const elementStyleSchema = z
  .object({
    size: elementSizeSchema.optional(),
    width: elementWidthSchema.optional(),
    fontSize: z.number().min(10).max(160).optional(),
    widthPercent: z.number().min(8).max(240).optional(),
    heightPx: z.number().min(24).max(1400).optional(),
    offsetX: z.number().min(-1200).max(1200).optional(),
    offsetY: z.number().min(-1200).max(1200).optional(),
    rotation: z.number().min(-30).max(30).optional(),
    color: elementColorSchema.optional(),
    backgroundColor: elementColorSchema.optional(),
    align: z.enum(["left", "center", "right", "justify"]).optional(),
    radius: z.enum(["none", "small", "medium", "large", "pill"]).optional(),
    imageFit: z.enum(["cover", "contain"]).optional(),
    imageZoom: z.number().min(1).max(4).optional(),
    focalX: z.number().min(0).max(100).optional(),
    focalY: z.number().min(0).max(100).optional(),
    imageFrame: z.enum([
      "rectangle",
      "rounded",
      "circle",
      "arch",
      "blob",
      "diagonal-left",
      "diagonal-right",
      "custom",
    ]).optional(),
    imageFrameLabel: z.string().trim().max(100).optional(),
    imageAspect: z.enum(["auto", "square", "4:3", "16:9", "portrait"]).optional(),
    overlayColor: elementColorSchema.optional(),
    overlayOpacity: z.number().min(0).max(0.8).optional(),
    imageClipPath: z.string().trim().max(500).regex(/^(polygon|circle|ellipse|inset)\(/i, "Invalid image mask").optional(),
    placement: z.enum(["left", "center", "right"]).optional(),
    allowOverflow: z.boolean().optional(),
    hidden: z.boolean().optional(),
    locked: z.boolean().optional(),
    zIndex: z.number().int().min(-20).max(50).optional(),
    strokeWidth: z.number().min(0).max(20).optional(),
    groupId: z.string().uuid().optional(),
    groupKind: z.enum(["manual", "native"]).optional(),
  })
  .strict();

const elementConstraintsSchema = z
  .object({
    minWidthPercent: z.number().min(8).max(100).optional(),
    maxWidthPercent: z.number().min(8).max(100).optional(),
    minHeightPx: z.number().min(24).max(1400).optional(),
    maxHeightPx: z.number().min(24).max(1400).optional(),
    minFontSize: z.number().min(10).max(160).optional(),
    maxFontSize: z.number().min(10).max(160).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.minWidthPercent === undefined ||
      value.maxWidthPercent === undefined ||
      value.minWidthPercent <= value.maxWidthPercent,
    { message: "Minimum element width cannot be greater than maximum", path: ["minWidthPercent"] },
  )
  .refine(
    (value) =>
      value.minHeightPx === undefined ||
      value.maxHeightPx === undefined ||
      value.minHeightPx <= value.maxHeightPx,
    { message: "Minimum element height cannot be greater than maximum", path: ["minHeightPx"] },
  )
  .refine(
    (value) =>
      value.minFontSize === undefined ||
      value.maxFontSize === undefined ||
      value.minFontSize <= value.maxFontSize,
    { message: "Minimum element font size cannot be greater than maximum", path: ["minFontSize"] },
  );

export const institutionalEditorConstraintsSchema = z
  .object({
    mode: z.enum(["free", "guided"]),
    minWidthPercent: z.number().int().min(10).max(100),
    maxWidthPercent: z.number().int().min(10).max(100),
    minFontSize: z.number().int().min(10).max(160),
    maxFontSize: z.number().int().min(10).max(160),
    maxOffset: z.number().int().min(0).max(100),
  })
  .strict()
  .refine((value) => value.minWidthPercent <= value.maxWidthPercent, {
    message: "Minimum width cannot be greater than maximum width",
    path: ["minWidthPercent"],
  })
  .refine((value) => value.minFontSize <= value.maxFontSize, {
    message: "Minimum font size cannot be greater than maximum font size",
    path: ["minFontSize"],
  });

const sectionStyleSchema = z
  .object({
    backgroundColor: elementColorSchema.optional(),
    backgroundImage: z.union([imageSchema, z.null()]).optional(),
    backgroundTreatment: z.enum(["original", "soft", "dark", "light", "brand", "gradient"]).optional(),
    backgroundPositionX: z.number().min(0).max(100).optional(),
    backgroundPositionY: z.number().min(0).max(100).optional(),
    backgroundDecor: z.enum(["template", "none", "soft-glow", "corner-glow", "rings", "wash"]).optional(),
    backgroundDecorTone: z.enum(["primary", "secondary", "accent", "mixed"]).optional(),
    backgroundDecorIntensity: z.number().min(0).max(100).optional(),
    backgroundDecorScale: z.number().min(60).max(160).optional(),
    spacing: z.enum(["compact", "normal", "comfortable", "generous"]).optional(),
    contentWidth: z.enum(["normal", "wide", "full"]).optional(),
  })
  .strict();

const elementMetricValueSchema = z
  .object({
    value: z.string().trim().max(60),
    label: z.string().trim().max(160),
  })
  .strict();

const elementValueSchema = z.union([
  z.string().max(5000),
  actionSchema,
  imageSchema,
  elementMetricValueSchema,
  z.null(),
]);

export type InstitutionalLayoutNode =
  | {
      type: "stack";
      id?: string | undefined;
      gap: z.infer<typeof gapSchema>;
      align?: z.infer<typeof alignSchema> | undefined;
      direction?: "column" | "row" | undefined;
      surface?: z.infer<typeof surfaceSchema> | undefined;
      children: InstitutionalLayoutNode[];
    }
  | {
      type: "columns";
      id?: string | undefined;
      ratio: z.infer<typeof ratioSchema>;
      gap: z.infer<typeof gapSchema>;
      surface?: z.infer<typeof surfaceSchema> | undefined;
      children: [InstitutionalLayoutNode, InstitutionalLayoutNode];
    }
  | {
      type: "grid";
      id?: string | undefined;
      columns: 2 | 3 | 4;
      gap: z.infer<typeof gapSchema>;
      surface?: z.infer<typeof surfaceSchema> | undefined;
      children: InstitutionalLayoutNode[];
    }
  | {
      type: "slot";
      id?: string | undefined;
      slot: string;
      presentation?: z.infer<typeof presentationSchema> | undefined;
      style?: z.infer<typeof elementStyleSchema> | undefined;
      constraints?: z.infer<typeof elementConstraintsSchema> | undefined;
    }
  | {
      type: "element";
      id: string;
      elementType: z.infer<typeof elementTypeSchema>;
      value: z.infer<typeof elementValueSchema>;
      presentation?: z.infer<typeof presentationSchema> | undefined;
      style?: z.infer<typeof elementStyleSchema> | undefined;
      constraints?: z.infer<typeof elementConstraintsSchema> | undefined;
      semanticRole?: string | undefined;
    }
  | {
      type: "repeat";
      id?: string | undefined;
      source: string;
      columns: 1 | 2 | 3 | 4;
      gap: z.infer<typeof gapSchema>;
      item: InstitutionalLayoutNode;
    };

export const institutionalLayoutSchema: z.ZodType<InstitutionalLayoutNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z
      .object({
        type: z.literal("stack"),
        id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,120}$/).optional(),
        gap: gapSchema.default("medium"),
        align: alignSchema.optional(),
        direction: z.enum(["column", "row"]).optional(),
        surface: surfaceSchema.optional(),
        children: z.array(institutionalLayoutSchema).min(1).max(40),
      })
      .strict(),
    z
      .object({
        type: z.literal("columns"),
        id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,120}$/).optional(),
        ratio: ratioSchema.default("1:1"),
        gap: gapSchema.default("large"),
        surface: surfaceSchema.optional(),
        children: z.tuple([institutionalLayoutSchema, institutionalLayoutSchema]),
      })
      .strict(),
    z
      .object({
        type: z.literal("grid"),
        id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,120}$/).optional(),
        columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
        gap: gapSchema.default("medium"),
        surface: surfaceSchema.optional(),
        children: z.array(institutionalLayoutSchema).min(1).max(40),
      })
      .strict(),
    z
      .object({
        type: z.literal("slot"),
        id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,120}$/).optional(),
        slot: z.string().trim().min(1).max(60),
        presentation: presentationSchema.optional(),
        style: elementStyleSchema.optional(),
        constraints: elementConstraintsSchema.optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("element"),
        id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,120}$/),
        elementType: elementTypeSchema,
        value: elementValueSchema,
        presentation: presentationSchema.optional(),
        style: elementStyleSchema.optional(),
        constraints: elementConstraintsSchema.optional(),
        semanticRole: z.string().trim().max(80).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("repeat"),
        id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,120}$/).optional(),
        source: z.string().trim().min(1).max(60),
        columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        gap: gapSchema.default("medium"),
        item: institutionalLayoutSchema,
      })
      .strict(),
  ]),
);


export const institutionalSectionSettingsSchema = z
  .object({
    layoutOverride: institutionalLayoutSchema.optional(),
    sectionStyle: sectionStyleSchema.optional(),
  })
  .passthrough();

export function parseInstitutionalSectionSettings(
  settings: unknown,
): Record<string, unknown> {
  return institutionalSectionSettingsSchema.parse(settings ?? {}) as Record<string, unknown>;
}

export const createInstitutionalSiteSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    templateId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const renameInstitutionalSiteSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
  })
  .strict();

export const updateBrandProfileSchema = z
  .object({
    logoAssetId: z.string().uuid().nullable().optional(),
    primaryColor: colorSchema,
    secondaryColor: colorSchema,
    accentColor: colorSchema,
    backgroundColor: colorSchema,
    textColor: colorSchema,
    headingFont: z.enum(["brand", "interface", "system"]),
    bodyFont: z.enum(["brand", "interface", "system"]),
  })
  .strict();

export const addInstitutionalSectionSchema = z
  .object({
    sectionType: institutionalSectionTypeSchema,
    variantVersionId: z.string().uuid(),
    content: z.unknown(),
    settings: institutionalSectionSettingsSchema.optional(),
  })
  .strict();

export const updateInstitutionalSectionSchema = z
  .object({
    variantVersionId: z.string().uuid().optional(),
    visible: z.boolean().optional(),
    content: z.unknown().optional(),
    settings: institutionalSectionSettingsSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.variantVersionId !== undefined ||
      value.visible !== undefined ||
      value.content !== undefined ||
      value.settings !== undefined,
    { message: "At least one section field must be provided" },
  );

export const reorderInstitutionalSectionsSchema = z
  .object({
    sectionIds: z.array(z.string().uuid()).min(1).max(80),
  })
  .strict()
  .refine((value) => new Set(value.sectionIds).size === value.sectionIds.length, {
    message: "Section identifiers cannot be duplicated",
    path: ["sectionIds"],
  });

export const createVariantSchema = z
  .object({
    sectionType: institutionalSectionTypeSchema,
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).default(""),
    layout: institutionalLayoutSchema,
    isSystem: z.boolean().optional(),
  })
  .strict();

export const updateVariantSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).default(""),
    layout: institutionalLayoutSchema,
  })
  .strict();

const templateSectionSchema = z
  .object({
    sectionType: institutionalSectionTypeSchema,
    variantVersionId: z.string().uuid(),
    content: z.unknown(),
    settings: institutionalSectionSettingsSchema.optional(),
  })
  .strict();

const templatePageSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(100),
    isHome: z.boolean(),
    sections: z.array(templateSectionSchema).max(80),
  })
  .strict();

export const institutionalTemplateDefinitionSchema = z
  .object({
    example: z.boolean().optional(),
    editorConstraints: institutionalEditorConstraintsSchema.optional(),
    pages: z.array(templatePageSchema).min(1).max(20),
  })
  .strict();

export const createDesignerTemplateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).default(""),
    category: z.string().trim().min(1).max(80).default("generic"),
    definition: institutionalTemplateDefinitionSchema,
    isSystem: z.boolean().optional(),
  })
  .strict();

export const updateDesignerTemplateSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).default(""),
    category: z.string().trim().min(1).max(80).default("generic"),
    definition: institutionalTemplateDefinitionSchema,
  })
  .strict();


export const createInstitutionalDesignPaletteSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(400).default(""),
    colors: z.array(colorSchema).min(3).max(8),
  })
  .strict();

export const updateInstitutionalDesignPaletteSchema = createInstitutionalDesignPaletteSchema;

const designerFrameClipPathSchema = z
  .string()
  .trim()
  .max(500)
  .regex(/^polygon\([0-9.% ,]+\)$/);

export const createInstitutionalImageFrameSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(400).default(""),
    clipPath: designerFrameClipPathSchema,
  })
  .strict();

export const updateInstitutionalImageFrameSchema = createInstitutionalImageFrameSchema;
