import {
  apiGet,
  apiPatch,
  apiPost,
  apiRequest,
  apiTenantDelete,
  apiTenantGet,
  apiTenantPatch,
  apiTenantPost,
  apiTenantUpload,
} from "./api";
import { prepareInstitutionalImage } from "../utils/institutionalImage";

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

export type InstitutionalSectionType =
  (typeof institutionalSectionTypes)[number];
export type InstitutionalFontKey = "brand" | "interface" | "system";
export type LayoutGap = "none" | "small" | "medium" | "large";
export type LayoutAlign = "start" | "center" | "end" | "stretch";
export type LayoutSurface = "none" | "card" | "list" | "highlight";
export type LayoutRatio = "1:1" | "1:2" | "2:1" | "2:3" | "3:2";

export const institutionalElementTypes = [
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
] as const;

export type InstitutionalElementType =
  (typeof institutionalElementTypes)[number];
export type InstitutionalElementSize =
  "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type InstitutionalElementWidth =
  "auto" | "25" | "33" | "50" | "66" | "75" | "100";
export type InstitutionalColorRole =
  "text" | "primary" | "secondary" | "accent" | "background";
export type InstitutionalColorTone =
  "soft" | "light" | "base" | "strong" | "deep";
export type InstitutionalSemanticColorValue =
  | InstitutionalColorRole
  | `${InstitutionalColorRole}.${InstitutionalColorTone}`;
export type InstitutionalColorValue =
  InstitutionalSemanticColorValue | `#${string}`;

export type InstitutionalImageFit = "cover" | "contain";
export type InstitutionalImageFrame =
  | "rectangle"
  | "rounded"
  | "circle"
  | "arch"
  | "blob"
  | "diagonal-left"
  | "diagonal-right"
  | "custom";
export type InstitutionalImageAspect =
  "auto" | "square" | "4:3" | "16:9" | "portrait";

export interface InstitutionalElementStyle {
  size?: InstitutionalElementSize;
  width?: InstitutionalElementWidth;
  fontSize?: number;
  widthPercent?: number;
  heightPx?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  color?: InstitutionalColorValue;
  backgroundColor?: InstitutionalColorValue;
  align?: "left" | "center" | "right" | "justify";
  radius?: "none" | "small" | "medium" | "large" | "pill";
  imageFit?: InstitutionalImageFit;
  imageZoom?: number;
  focalX?: number;
  focalY?: number;
  imageFrame?: InstitutionalImageFrame;
  imageFrameLabel?: string;
  imageClipPath?: string;
  imageAspect?: InstitutionalImageAspect;
  overlayColor?: InstitutionalColorValue;
  overlayOpacity?: number;
  placement?: "left" | "center" | "right";
  allowOverflow?: boolean;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
  strokeWidth?: number;
  groupId?: string;
  groupKind?: "manual" | "native";
}

export interface InstitutionalEditorConstraints {
  mode: "free" | "guided";
  minWidthPercent: number;
  maxWidthPercent: number;
  minFontSize: number;
  maxFontSize: number;
  maxOffset: number;
}

export interface InstitutionalElementConstraints {
  minWidthPercent?: number;
  maxWidthPercent?: number;
  minHeightPx?: number;
  maxHeightPx?: number;
  minFontSize?: number;
  maxFontSize?: number;
}

export interface InstitutionalSectionStyle {
  backgroundColor?: InstitutionalColorValue;
  backgroundImage?: InstitutionalImageValue | null;
  backgroundTreatment?:
    "original" | "soft" | "dark" | "light" | "brand" | "gradient";
  backgroundPositionX?: number;
  backgroundPositionY?: number;
  backgroundDecor?:
    "template" | "none" | "soft-glow" | "corner-glow" | "rings" | "wash";
  backgroundDecorTone?: "primary" | "secondary" | "accent" | "mixed";
  backgroundDecorIntensity?: number;
  backgroundDecorScale?: number;
  spacing?: "compact" | "normal" | "comfortable" | "generous";
  contentWidth?: "normal" | "wide" | "full";
}

export type InstitutionalLayoutNode =
  | {
      type: "stack";
      id?: string;
      gap: LayoutGap;
      align?: LayoutAlign;
      direction?: "column" | "row";
      surface?: LayoutSurface;
      children: InstitutionalLayoutNode[];
    }
  | {
      type: "columns";
      id?: string;
      ratio: LayoutRatio;
      gap: LayoutGap;
      surface?: LayoutSurface;
      children: [InstitutionalLayoutNode, InstitutionalLayoutNode];
    }
  | {
      type: "grid";
      id?: string;
      columns: 2 | 3 | 4;
      gap: LayoutGap;
      surface?: LayoutSurface;
      children: InstitutionalLayoutNode[];
    }
  | {
      type: "slot";
      id?: string;
      slot: string;
      presentation?: string;
      style?: InstitutionalElementStyle;
      constraints?: InstitutionalElementConstraints;
    }
  | {
      type: "element";
      id: string;
      elementType: InstitutionalElementType;
      value: InstitutionalElementValue;
      presentation?: string;
      style?: InstitutionalElementStyle;
      constraints?: InstitutionalElementConstraints;
      semanticRole?: string;
    }
  | {
      type: "repeat";
      id?: string;
      source: string;
      columns: 1 | 2 | 3 | 4;
      gap: LayoutGap;
      item: InstitutionalLayoutNode;
    };

export interface InstitutionalAction {
  label: string;
  href: string;
}

export interface InstitutionalImageValue {
  assetId: string;
  alt: string;
  url?: string;
}

export type InstitutionalElementValue =
  | string
  | InstitutionalAction
  | InstitutionalImageValue
  | { value: string; label: string }
  | null;

export interface InstitutionalDesignPalette {
  id: string;
  name: string;
  description: string;
  colors: string[];
  visibility: "private" | "public";
  status: "draft" | "published";
  ownerUserId: string | null;
  ownerDisplayName?: string | null;
  updatedAt: string;
}

export interface InstitutionalImageFrameResource {
  id: string;
  name: string;
  description: string;
  clipPath: string;
  visibility: "private" | "public";
  status: "draft" | "published";
  ownerUserId: string | null;
  ownerDisplayName?: string | null;
  updatedAt: string;
}

export type InstitutionalDesignFrame = InstitutionalImageFrameResource;

export interface InstitutionalDesignResources {
  palettes: InstitutionalDesignPalette[];
  frames: InstitutionalDesignFrame[];
}

export interface InstitutionalMediaAsset {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface InstitutionalBrand {
  organizationId: string;
  publicSlug: string;
  logoAssetId: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: InstitutionalFontKey;
  bodyFont: InstitutionalFontKey;
  logoAsset: InstitutionalMediaAsset | null;
}

export interface InstitutionalSection {
  id: string;
  pageId: string;
  sectionType: InstitutionalSectionType;
  variantVersionId: string;
  position: number;
  visible: boolean;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  variantId: string;
  variantName: string;
  variantVersion: number;
  layout: InstitutionalLayoutNode;
}

export interface InstitutionalPage {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  position: number;
  sections: InstitutionalSection[];
}

export interface InstitutionalSiteSummary {
  id: string;
  name: string;
  slug: string;
  publicSlug: string;
  sourceTemplateId: string | null;
  editorConstraints: InstitutionalEditorConstraints;
  isPrimary: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionalSite extends InstitutionalSiteSummary {
  organization: {
    id: string;
    name: string;
  };
  brand: InstitutionalBrand;
  pages: InstitutionalPage[];
}

export interface InstitutionalTemplateDefinition {
  example?: boolean;
  editorConstraints?: InstitutionalEditorConstraints;
  pages: Array<{
    title: string;
    slug: string;
    isHome: boolean;
    sections: Array<{
      sectionType: InstitutionalSectionType;
      variantVersionId: string;
      content: Record<string, unknown>;
      settings?: Record<string, unknown>;
    }>;
  }>;
}

export interface InstitutionalTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystem: boolean;
  isExample: boolean;
  definition?: InstitutionalTemplateDefinition;
}

export interface DesignerInstitutionalTemplate extends InstitutionalTemplate {
  visibility: "private" | "public";
  status: "draft" | "published";
  updatedAt: string;
  definition: InstitutionalTemplateDefinition;
}

export interface InstitutionalVariant {
  id: string;
  sectionType: InstitutionalSectionType;
  name: string;
  description: string;
  isSystem: boolean;
  visibility: "private" | "public";
  status: "draft" | "published";
  ownerUserId: string | null;
  version: number;
  versionId: string;
  layout: InstitutionalLayoutNode;
  updatedAt: string;
}

interface RequiredSiteResponse {
  site: InstitutionalSite;
}

interface SitesResponse {
  sites: InstitutionalSiteSummary[];
}

interface TemplatesResponse {
  templates: InstitutionalTemplate[];
}

interface DesignerTemplatesResponse {
  templates: DesignerInstitutionalTemplate[];
}

interface DesignerTemplateResponse {
  template: DesignerInstitutionalTemplate;
}

interface VariantsResponse {
  variants: InstitutionalVariant[];
}

interface VariantResponse {
  variant: InstitutionalVariant;
}

interface NativeDesignAccessResponse {
  canManageNativeDesigns: boolean;
}

interface DesignPalettesResponse {
  palettes: InstitutionalDesignPalette[];
}

interface DesignPaletteResponse {
  palette: InstitutionalDesignPalette;
}

interface ImageFramesResponse {
  frames: InstitutionalImageFrameResource[];
}

interface ImageFrameResponse {
  frame: InstitutionalImageFrameResource;
}

interface BrandResponse {
  brand: InstitutionalBrand;
}

interface MediaResponse {
  asset: InstitutionalMediaAsset;
}

export function listInstitutionalSites(): Promise<InstitutionalSiteSummary[]> {
  return apiTenantGet<SitesResponse>("/institutional/sites").then(
    (response) => response.sites,
  );
}

export function getInstitutionalSite(
  siteId: string,
): Promise<InstitutionalSite> {
  return apiTenantGet<RequiredSiteResponse>(
    `/institutional/sites/${siteId}`,
  ).then((response) => response.site);
}

export function createInstitutionalSite(input: {
  name: string;
  templateId?: string | null;
}): Promise<InstitutionalSite> {
  return apiTenantPost<RequiredSiteResponse>("/institutional/sites", {
    name: input.name,
    templateId: input.templateId ?? null,
  }).then((response) => response.site);
}

export function renameInstitutionalSite(
  siteId: string,
  name: string,
): Promise<InstitutionalSite> {
  return apiTenantPatch<RequiredSiteResponse>(
    `/institutional/sites/${siteId}`,
    {
      name,
    },
  ).then((response) => response.site);
}

export function getInstitutionalTemplates(): Promise<InstitutionalTemplate[]> {
  return apiGet<TemplatesResponse>("/institutional/templates").then(
    (response) => response.templates,
  );
}

export function getNativeDesignAccess(): Promise<boolean> {
  return apiGet<NativeDesignAccessResponse>(
    "/institutional/native-design-access",
  ).then((response) => response.canManageNativeDesigns);
}

export function listDesignerTemplates(): Promise<
  DesignerInstitutionalTemplate[]
> {
  return apiGet<DesignerTemplatesResponse>(
    "/institutional/designer/templates",
  ).then((response) => response.templates);
}

export function getDesignerTemplate(
  templateId: string,
): Promise<DesignerInstitutionalTemplate> {
  return apiGet<DesignerTemplateResponse>(
    `/institutional/designer/templates/${templateId}`,
  ).then((response) => response.template);
}

export function createDesignerTemplate(input: {
  name: string;
  description: string;
  category: string;
  definition: InstitutionalTemplateDefinition;
  isSystem?: boolean;
}): Promise<DesignerInstitutionalTemplate> {
  return apiPost<DesignerTemplateResponse>(
    "/institutional/designer/templates",
    input,
  ).then((response) => response.template);
}

export function updateDesignerTemplate(
  templateId: string,
  input: {
    name: string;
    description: string;
    category: string;
    definition: InstitutionalTemplateDefinition;
  },
): Promise<DesignerInstitutionalTemplate> {
  return apiPatch<DesignerTemplateResponse>(
    `/institutional/designer/templates/${templateId}`,
    input,
  ).then((response) => response.template);
}

export function publishDesignerTemplate(
  templateId: string,
): Promise<DesignerInstitutionalTemplate> {
  return apiPost<DesignerTemplateResponse>(
    `/institutional/designer/templates/${templateId}/publish`,
  ).then((response) => response.template);
}

export function getInstitutionalVariants(
  sectionType?: InstitutionalSectionType,
  includeOwnedDrafts = false,
): Promise<InstitutionalVariant[]> {
  const query = new URLSearchParams();

  if (sectionType) query.set("sectionType", sectionType);
  if (includeOwnedDrafts) query.set("includeOwnedDrafts", "true");

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return apiGet<VariantsResponse>(`/institutional/variants${suffix}`).then(
    (response) => response.variants,
  );
}

export function addInstitutionalSection(
  pageId: string,
  input: {
    sectionType: InstitutionalSectionType;
    variantVersionId: string;
    content: Record<string, unknown>;
    settings?: Record<string, unknown>;
  },
): Promise<InstitutionalSite> {
  return apiTenantPost<RequiredSiteResponse>(
    `/institutional/pages/${pageId}/sections`,
    input,
  ).then((response) => response.site);
}

export function updateInstitutionalSection(
  sectionId: string,
  input: {
    variantVersionId?: string;
    visible?: boolean;
    content?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  },
): Promise<InstitutionalSite> {
  return apiTenantPatch<RequiredSiteResponse>(
    `/institutional/sections/${sectionId}`,
    input,
  ).then((response) => response.site);
}

export function duplicateInstitutionalSection(
  sectionId: string,
): Promise<InstitutionalSite> {
  return apiTenantPost<RequiredSiteResponse>(
    `/institutional/sections/${sectionId}/duplicate`,
  ).then((response) => response.site);
}

export function deleteInstitutionalSection(
  sectionId: string,
): Promise<InstitutionalSite> {
  return apiTenantDelete<RequiredSiteResponse>(
    `/institutional/sections/${sectionId}`,
  ).then((response) => response.site);
}

export function reorderInstitutionalSections(
  pageId: string,
  sectionIds: string[],
): Promise<InstitutionalSite> {
  return apiTenantPost<RequiredSiteResponse>(
    `/institutional/pages/${pageId}/reorder-sections`,
    { sectionIds },
  ).then((response) => response.site);
}

export function updateInstitutionalBrand(
  brand: Omit<
    InstitutionalBrand,
    "organizationId" | "publicSlug" | "logoAsset"
  >,
): Promise<InstitutionalBrand> {
  return apiTenantPatch<BrandResponse>("/institutional/brand", brand).then(
    (response) => response.brand,
  );
}

export async function uploadInstitutionalMedia(
  file: File,
  options?: {
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
  },
): Promise<InstitutionalMediaAsset> {
  const prepared = await prepareInstitutionalImage(file);
  return apiTenantUpload<MediaResponse>("/institutional/media", prepared, {
    ...(options?.onProgress ? { onProgress: options.onProgress } : {}),
    ...(options?.signal ? { signal: options.signal } : {}),
  }).then((response) => response.asset);
}

export function publishInstitutionalSite(siteId: string): Promise<{
  version: number;
  publishedAt: string;
}> {
  return apiTenantPost<{
    publication: {
      version: number;
      publishedAt: string;
    };
  }>(`/institutional/sites/${siteId}/publish`).then(
    (response) => response.publication,
  );
}

export async function unpublishInstitutionalSite(
  siteId: string,
): Promise<void> {
  await apiTenantPost<void>(`/institutional/sites/${siteId}/unpublish`);
}

export async function deleteInstitutionalSite(siteId: string): Promise<void> {
  await apiTenantDelete<void>(`/institutional/sites/${siteId}`);
}

export function createInstitutionalVariant(input: {
  sectionType: InstitutionalSectionType;
  name: string;
  description: string;
  layout: InstitutionalLayoutNode;
  isSystem?: boolean;
}): Promise<InstitutionalVariant> {
  return apiPost<VariantResponse>("/institutional/variants", input).then(
    (response) => response.variant,
  );
}

export function updateInstitutionalVariant(
  variantId: string,
  input: {
    name: string;
    description: string;
    layout: InstitutionalLayoutNode;
  },
): Promise<InstitutionalVariant> {
  return apiPatch<VariantResponse>(
    `/institutional/variants/${variantId}`,
    input,
  ).then((response) => response.variant);
}

export async function publishInstitutionalVariant(
  variantId: string,
): Promise<void> {
  await apiPost<void>(`/institutional/variants/${variantId}/publish`);
}

export async function getInstitutionalDesignResources(): Promise<InstitutionalDesignResources> {
  const [palettes, frames] = await Promise.all([
    getInstitutionalDesignPalettes(false),
    getInstitutionalImageFrames(false),
  ]);
  return { palettes, frames };
}

export async function listDesignerDesignResources(): Promise<InstitutionalDesignResources> {
  const [palettes, frames] = await Promise.all([
    getInstitutionalDesignPalettes(true),
    getInstitutionalImageFrames(true),
  ]);
  return { palettes, frames };
}

export const createDesignerPalette = createInstitutionalDesignPalette;
export const updateDesignerPalette = updateInstitutionalDesignPalette;
export const publishDesignerPalette = publishInstitutionalDesignPalette;
export const createDesignerFrame = createInstitutionalImageFrame;
export const updateDesignerFrame = updateInstitutionalImageFrame;
export const publishDesignerFrame = publishInstitutionalImageFrame;

export function getPublicInstitutionalSite(
  slug: string,
): Promise<InstitutionalSite> {
  return apiRequest<RequiredSiteResponse>(
    `/public/sites/${encodeURIComponent(slug)}`,
    { method: "GET", authenticated: false },
  ).then((response) => response.site);
}

export function getInstitutionalDesignPalettes(
  includeOwnedDrafts = false,
): Promise<InstitutionalDesignPalette[]> {
  const suffix = includeOwnedDrafts ? "?includeOwnedDrafts=true" : "";
  return apiGet<DesignPalettesResponse>(
    `/institutional/design/palettes${suffix}`,
  ).then((response) => response.palettes);
}

export function createInstitutionalDesignPalette(input: {
  name: string;
  description: string;
  colors: string[];
}): Promise<InstitutionalDesignPalette> {
  return apiPost<DesignPaletteResponse>(
    "/institutional/design/palettes",
    input,
  ).then((response) => response.palette);
}

export function updateInstitutionalDesignPalette(
  paletteId: string,
  input: { name: string; description: string; colors: string[] },
): Promise<InstitutionalDesignPalette> {
  return apiPatch<DesignPaletteResponse>(
    `/institutional/design/palettes/${paletteId}`,
    input,
  ).then((response) => response.palette);
}

export function publishInstitutionalDesignPalette(
  paletteId: string,
): Promise<InstitutionalDesignPalette> {
  return apiPost<DesignPaletteResponse>(
    `/institutional/design/palettes/${paletteId}/publish`,
  ).then((response) => response.palette);
}

export function getInstitutionalImageFrames(
  includeOwnedDrafts = false,
): Promise<InstitutionalImageFrameResource[]> {
  const suffix = includeOwnedDrafts ? "?includeOwnedDrafts=true" : "";
  return apiGet<ImageFramesResponse>(
    `/institutional/design/frames${suffix}`,
  ).then((response) => response.frames);
}

export function createInstitutionalImageFrame(input: {
  name: string;
  description: string;
  clipPath: string;
}): Promise<InstitutionalImageFrameResource> {
  return apiPost<ImageFrameResponse>(
    "/institutional/design/frames",
    input,
  ).then((response) => response.frame);
}

export function updateInstitutionalImageFrame(
  frameId: string,
  input: { name: string; description: string; clipPath: string },
): Promise<InstitutionalImageFrameResource> {
  return apiPatch<ImageFrameResponse>(
    `/institutional/design/frames/${frameId}`,
    input,
  ).then((response) => response.frame);
}

export function publishInstitutionalImageFrame(
  frameId: string,
): Promise<InstitutionalImageFrameResource> {
  return apiPost<ImageFrameResponse>(
    `/institutional/design/frames/${frameId}/publish`,
  ).then((response) => response.frame);
}
