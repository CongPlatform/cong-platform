import type { PoolClient } from "pg";

import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import {
  parseInstitutionalSectionContent,
  parseInstitutionalSectionSettings,
  type InstitutionalSectionType,
} from "../validators/institutional.validator.js";
import {
  assertOrganizationAsset,
  getSignedOrganizationAssets,
  type InstitutionalMediaAsset,
} from "./institutional-media.service.js";
import { getInstitutionalTemplateDefinition } from "./institutional-template.service.js";
import {
  contextualizeInstitutionalSection,
  type InstitutionalOrganizationProfile,
} from "./institutional-content-guide.service.js";
import {
  getInstitutionalVariantVersion,
  validateInstitutionalLayout,
  type InstitutionalVariant,
} from "./institutional-variant.service.js";

interface UserRow {
  id: string;
}

interface InstitutionalEditorConstraints {
  mode: "free" | "guided";
  minWidthPercent: number;
  maxWidthPercent: number;
  minFontSize: number;
  maxFontSize: number;
  maxOffset: number;
}

const FREE_EDITOR_CONSTRAINTS: InstitutionalEditorConstraints = {
  mode: "free",
  minWidthPercent: 15,
  maxWidthPercent: 100,
  minFontSize: 10,
  maxFontSize: 96,
  maxOffset: 100,
};

const GUIDED_EDITOR_CONSTRAINTS: InstitutionalEditorConstraints = {
  mode: "guided",
  minWidthPercent: 25,
  maxWidthPercent: 100,
  minFontSize: 12,
  maxFontSize: 84,
  maxOffset: 36,
};

interface SiteRow {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  sourceTemplateId: string | null;
  editorConstraints: InstitutionalEditorConstraints;
  isPrimary: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstitutionalSiteSummary {
  id: string;
  name: string;
  slug: string;
  publicSlug: string;
  sourceTemplateId: string | null;
  editorConstraints: InstitutionalEditorConstraints;
  isPrimary: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PageRow {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  position: number;
}

interface SectionRow {
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
  layout: InstitutionalVariant["layout"];
}

interface InstitutionalDesignSystem {
  headingFamily: string;
  bodyFamily: string;
  textStyles?: Partial<
    Record<
      "display" | "heading" | "subheading" | "body" | "caption" | "button",
      { family: string; size: number; weight: 400 | 500 | 600 | 700 | 800 }
    >
  >;
  logos?: Partial<Record<"compact" | "light" | "dark", string | null>>;
  headingScale: "compact" | "standard" | "expressive";
  bodyScale: "compact" | "standard" | "relaxed";
  spacing: "compact" | "standard" | "spacious";
  corners: "original" | "square" | "subtle" | "rounded";
}

interface BrandRow {
  organizationId: string;
  publicSlug: string;
  logoAssetId: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: "brand" | "interface" | "system";
  bodyFont: "brand" | "interface" | "system";
  designSystem?: InstitutionalDesignSystem;
}

export interface InstitutionalBrand extends BrandRow {
  logoAsset: InstitutionalMediaAsset | null;
  logoVariantAssets?: Partial<
    Record<"compact" | "light" | "dark", InstitutionalMediaAsset>
  >;
}

const logoVariantSlots = ["compact", "light", "dark"] as const;
function brandMediaIds(
  brand: Pick<BrandRow, "logoAssetId" | "designSystem">,
): string[] {
  const ids = [
    brand.logoAssetId,
    ...logoVariantSlots.map((slot) => brand.designSystem?.logos?.[slot]),
  ];
  return [
    ...new Set(
      ids.filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
}
function signedBrandVariants(
  brand: BrandRow,
  assets: Map<string, InstitutionalMediaAsset>,
): InstitutionalBrand["logoVariantAssets"] {
  const result: NonNullable<InstitutionalBrand["logoVariantAssets"]> = {};
  logoVariantSlots.forEach((slot) => {
    const id = brand.designSystem?.logos?.[slot];
    if (id) {
      const asset = assets.get(id);
      if (asset) result[slot] = asset;
    }
  });
  return result;
}

export interface InstitutionalSection extends SectionRow {
  content: Record<string, unknown>;
}

export interface InstitutionalPage extends PageRow {
  sections: InstitutionalSection[];
}

export interface InstitutionalSite {
  id: string;
  name: string;
  slug: string;
  publicSlug: string;
  sourceTemplateId: string | null;
  editorConstraints: InstitutionalEditorConstraints;
  isPrimary: boolean;
  organization: {
    id: string;
    name: string;
  };
  publishedAt: Date | null;
  brand: InstitutionalBrand;
  pages: InstitutionalPage[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface SiteSnapshot {
  site: {
    id: string;
    name: string;
    slug: string;
    sourceTemplateId: string | null;
    editorConstraints: InstitutionalEditorConstraints;
    isPrimary: boolean;
  };
  organization: {
    id: string;
    name: string;
  };
  brand: BrandRow;
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    isHome: boolean;
    position: number;
    sections: SectionRow[];
  }>;
}

function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "organizacao"
  );
}

async function getActiveUserId(
  client: PoolClient,
  authUserId: string,
): Promise<string> {
  const result = await client.query<UserRow>(
    `
      select id
      from public.users
      where auth_user_id = $1
        and active = true
      limit 1
    `,
    [authUserId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  }

  return user.id;
}

async function requireNgo(
  client: PoolClient,
  organizationId: string,
): Promise<{
  id: string;
  name: string;
  profile: InstitutionalOrganizationProfile;
}> {
  const result = await client.query<{
    id: string;
    name: string;
    organizationType: string;
    description: string | null;
    areas: string[] | null;
    supportTypes: string[] | null;
  }>(
    `
      select
        id,
        name,
        organization_type as "organizationType",
        description,
        coalesce(settings -> 'areas', '[]'::jsonb) as areas,
        coalesce(settings -> 'supportTypes', '[]'::jsonb) as "supportTypes"
      from public.organizations
      where id = $1
        and active = true
      limit 1
    `,
    [organizationId],
  );

  const organization = result.rows[0];

  if (!organization || organization.organizationType !== "ngo") {
    throw new AppError(
      "O construtor institucional está disponível para ONGs e projetos sociais.",
      403,
      "INSTITUTIONAL_NGO_REQUIRED",
    );
  }

  return {
    id: organization.id,
    name: organization.name,
    profile: {
      name: organization.name,
      description: organization.description ?? "",
      areas: Array.isArray(organization.areas) ? organization.areas : [],
      supportTypes: Array.isArray(organization.supportTypes)
        ? organization.supportTypes
        : [],
    },
  };
}

async function createUniqueSlug(
  client: PoolClient,
  organizationName: string,
): Promise<string> {
  const base = slugify(organizationName);

  for (let suffix = 1; suffix <= 999; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const result = await client.query<{ exists: boolean }>(
      `
        select exists (
          select 1
          from public.institutional_sites
          where slug = $1
        ) as exists
      `,
      [candidate],
    );

    if (!result.rows[0]?.exists) {
      return candidate;
    }
  }

  throw new AppError(
    "Não foi possível definir um endereço público para o site.",
    409,
    "INSTITUTIONAL_SLUG_UNAVAILABLE",
  );
}

async function createUniquePublicSlug(
  client: PoolClient,
  organizationName: string,
): Promise<string> {
  const base = slugify(organizationName);

  for (let suffix = 1; suffix <= 999; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const result = await client.query<{ exists: boolean }>(
      `
        select exists (
          select 1
          from public.organization_brand_profiles
          where public_slug = $1
        ) as exists
      `,
      [candidate],
    );

    if (!result.rows[0]?.exists) {
      return candidate;
    }
  }

  throw new AppError(
    "Não foi possível definir um subdomínio público para a organização.",
    409,
    "INSTITUTIONAL_PUBLIC_SLUG_UNAVAILABLE",
  );
}

async function ensureBrandProfile(
  client: PoolClient,
  organizationId: string,
): Promise<void> {
  await client.query(
    `
      insert into public.organization_brand_profiles (organization_id)
      values ($1)
      on conflict (organization_id) do nothing
    `,
    [organizationId],
  );
}

async function getBrandProfile(
  client: PoolClient,
  organizationId: string,
): Promise<BrandRow> {
  await ensureBrandProfile(client, organizationId);

  const currentResult = await client.query<
    BrandRow & { organizationName: string }
  >(
    `
      select
        b.organization_id as "organizationId",
        coalesce(b.public_slug, '') as "publicSlug",
        b.logo_asset_id as "logoAssetId",
        b.primary_color as "primaryColor",
        b.secondary_color as "secondaryColor",
        b.accent_color as "accentColor",
        b.background_color as "backgroundColor",
        b.text_color as "textColor",
        b.heading_font as "headingFont",
        b.body_font as "bodyFont",
        b.design_system as "designSystem",
        o.name as "organizationName"
      from public.organization_brand_profiles b
      join public.organizations o on o.id = b.organization_id
      where b.organization_id = $1
      limit 1
    `,
    [organizationId],
  );

  const current = currentResult.rows[0];

  if (!current) {
    throw new AppError(
      "A identidade visual da organização não pôde ser carregada.",
      500,
      "INSTITUTIONAL_BRAND_NOT_AVAILABLE",
    );
  }

  if (current.publicSlug) {
    return current;
  }

  const publicSlug = await createUniquePublicSlug(
    client,
    current.organizationName,
  );
  const result = await client.query<BrandRow>(
    `
      update public.organization_brand_profiles
      set public_slug = $1
      where organization_id = $2
      returning
        organization_id as "organizationId",
        public_slug as "publicSlug",
        logo_asset_id as "logoAssetId",
        primary_color as "primaryColor",
        secondary_color as "secondaryColor",
        accent_color as "accentColor",
        background_color as "backgroundColor",
        text_color as "textColor",
        heading_font as "headingFont",
        body_font as "bodyFont",
        design_system as "designSystem"
    `,
    [publicSlug, organizationId],
  );

  return result.rows[0] ?? { ...current, publicSlug };
}

async function requireSiteForOrganization(
  client: PoolClient,
  organizationId: string,
  siteId: string,
): Promise<SiteRow> {
  const result = await client.query<SiteRow>(
    `
      select
        id,
        organization_id as "organizationId",
        name,
        slug,
        source_template_id as "sourceTemplateId",
        editor_constraints as "editorConstraints",
        is_primary as "isPrimary",
        published_at as "publishedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from public.institutional_sites
      where organization_id = $1
        and id = $2
      limit 1
    `,
    [organizationId, siteId],
  );

  const site = result.rows[0];

  if (!site) {
    throw new AppError(
      "O site selecionado não pertence a esta organização.",
      404,
      "INSTITUTIONAL_SITE_NOT_FOUND",
    );
  }

  return site;
}

async function requirePage(
  client: PoolClient,
  organizationId: string,
  pageId: string,
): Promise<{ id: string; siteId: string }> {
  const result = await client.query<{ id: string; siteId: string }>(
    `
      select
        p.id,
        p.site_id as "siteId"
      from public.institutional_pages p
      join public.institutional_sites s
        on s.id = p.site_id
      where p.id = $1
        and s.organization_id = $2
      limit 1
    `,
    [pageId, organizationId],
  );

  const page = result.rows[0];

  if (!page) {
    throw new AppError(
      "A página selecionada não pertence a esta organização.",
      404,
      "INSTITUTIONAL_PAGE_NOT_FOUND",
    );
  }

  return page;
}

async function requireSection(
  client: PoolClient,
  organizationId: string,
  sectionId: string,
): Promise<SectionRow & { siteId: string }> {
  const result = await client.query<SectionRow & { siteId: string }>(
    `
      select
        sec.id,
        sec.page_id as "pageId",
        s.id as "siteId",
        sec.section_type as "sectionType",
        sec.variant_version_id as "variantVersionId",
        sec.position,
        sec.visible,
        sec.content,
        sec.settings,
        v.id as "variantId",
        v.name as "variantName",
        vv.version as "variantVersion",
        vv.layout
      from public.institutional_sections sec
      join public.institutional_pages p
        on p.id = sec.page_id
      join public.institutional_sites s
        on s.id = p.site_id
      join public.institutional_section_variant_versions vv
        on vv.id = sec.variant_version_id
      join public.institutional_section_variants v
        on v.id = vv.variant_id
      where sec.id = $1
        and s.organization_id = $2
      limit 1
    `,
    [sectionId, organizationId],
  );

  const section = result.rows[0];

  if (!section) {
    throw new AppError(
      "A seção selecionada não pertence a esta organização.",
      404,
      "INSTITUTIONAL_SECTION_NOT_FOUND",
    );
  }

  return section;
}

function collectAssetIds(
  value: unknown,
  result = new Set<string>(),
): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetIds(item, result));
    return result;
  }

  if (!value || typeof value !== "object") {
    return result;
  }

  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    if (key === "assetId" && typeof nested === "string") {
      result.add(nested);
      return;
    }

    collectAssetIds(nested, result);
  });

  return result;
}

async function assertContentAssets(
  client: PoolClient,
  organizationId: string,
  content: Record<string, unknown>,
): Promise<void> {
  const assetIds = [...collectAssetIds(content)];

  for (const assetId of assetIds) {
    await assertOrganizationAsset(client, organizationId, assetId);
  }
}

function hydrateAssets(
  value: unknown,
  assets: Map<string, InstitutionalMediaAsset>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => hydrateAssets(item, assets));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const hydrated: Record<string, unknown> = {};

  Object.entries(record).forEach(([key, nested]) => {
    hydrated[key] = hydrateAssets(nested, assets);
  });

  if (typeof record.assetId === "string") {
    hydrated.url = assets.get(record.assetId)?.url ?? "";
  }

  return hydrated;
}

async function buildSiteSnapshot(
  client: PoolClient,
  organizationId: string,
  siteId: string,
): Promise<SiteSnapshot> {
  const organization = await requireNgo(client, organizationId);
  const site = await requireSiteForOrganization(client, organizationId, siteId);
  const brand = await getBrandProfile(client, organizationId);

  const pagesResult = await client.query<PageRow>(
    `
      select
        id,
        title,
        slug,
        is_home as "isHome",
        position
      from public.institutional_pages
      where site_id = $1
      order by position asc
    `,
    [site.id],
  );

  const sectionsResult = await client.query<SectionRow>(
    `
      select
        sec.id,
        sec.page_id as "pageId",
        sec.section_type as "sectionType",
        sec.variant_version_id as "variantVersionId",
        sec.position,
        sec.visible,
        sec.content,
        sec.settings,
        v.id as "variantId",
        v.name as "variantName",
        vv.version as "variantVersion",
        vv.layout
      from public.institutional_sections sec
      join public.institutional_pages p
        on p.id = sec.page_id
      join public.institutional_section_variant_versions vv
        on vv.id = sec.variant_version_id
      join public.institutional_section_variants v
        on v.id = vv.variant_id
      where p.site_id = $1
      order by p.position asc, sec.position asc
    `,
    [site.id],
  );

  sectionsResult.rows.forEach((section) => {
    validateInstitutionalLayout(section.sectionType, section.layout);
    parseInstitutionalSectionContent(section.sectionType, section.content);
    parseInstitutionalSectionSettings(section.settings);
  });

  return {
    site: {
      id: site.id,
      name: site.name,
      slug: site.slug,
      sourceTemplateId: site.sourceTemplateId,
      editorConstraints: site.editorConstraints,
      isPrimary: site.isPrimary,
    },
    organization,
    brand,
    pages: pagesResult.rows.map((page) => ({
      ...page,
      sections: sectionsResult.rows.filter(
        (section) => section.pageId === page.id,
      ),
    })),
  };
}

async function hydrateSnapshot(
  snapshot: SiteSnapshot,
): Promise<InstitutionalSite> {
  const assetIds = collectAssetIds(snapshot.pages);

  for (const id of brandMediaIds(snapshot.brand)) {
    assetIds.add(id);
  }

  const assets = await getSignedOrganizationAssets(snapshot.organization.id, [
    ...assetIds,
  ]);

  return {
    id: snapshot.site.id,
    name: snapshot.site.name,
    slug: snapshot.site.slug,
    publicSlug: snapshot.brand.publicSlug,
    sourceTemplateId: snapshot.site.sourceTemplateId,
    editorConstraints: snapshot.site.editorConstraints,
    isPrimary: snapshot.site.isPrimary,
    organization: snapshot.organization,
    publishedAt: null,
    brand: {
      ...snapshot.brand,
      logoAsset: snapshot.brand.logoAssetId
        ? (assets.get(snapshot.brand.logoAssetId) ?? null)
        : null,
      logoVariantAssets: signedBrandVariants(snapshot.brand, assets),
    },
    pages: snapshot.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        content: hydrateAssets(section.content, assets) as Record<
          string,
          unknown
        >,
        settings: hydrateAssets(section.settings, assets) as Record<
          string,
          unknown
        >,
      })),
    })),
  };
}

/** Insere o autor real da requisição no contexto transacional das triggers. */
async function setAuditActor(
  client: PoolClient,
  authUserId: string,
): Promise<void> {
  const userId = await getActiveUserId(client, authUserId);
  await client.query("select set_config('cong.actor_user_id', $1, true)", [
    userId,
  ]);
}

export async function listInstitutionalSites(
  organizationId: string,
): Promise<InstitutionalSiteSummary[]> {
  const client = await pool.connect();

  try {
    await requireNgo(client, organizationId);
    const brand = await getBrandProfile(client, organizationId);
    const result = await client.query<
      Omit<InstitutionalSiteSummary, "publicSlug">
    >(
      `
        select
          id,
          name,
          slug,
          source_template_id as "sourceTemplateId",
          editor_constraints as "editorConstraints",
          is_primary as "isPrimary",
          published_at as "publishedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        from public.institutional_sites
        where organization_id = $1
        order by is_primary desc, updated_at desc
      `,
      [organizationId],
    );
    return result.rows.map((site) => ({
      ...site,
      publicSlug: brand.publicSlug,
    }));
  } finally {
    client.release();
  }
}

export async function getInstitutionalSite(
  organizationId: string,
  siteId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();

  try {
    await requireNgo(client, organizationId);
    const site = await requireSiteForOrganization(
      client,
      organizationId,
      siteId,
    );
    const snapshot = await buildSiteSnapshot(client, organizationId, siteId);
    const hydrated = await hydrateSnapshot(snapshot);

    return {
      ...hydrated,
      publicSlug: hydrated.brand.publicSlug,
      sourceTemplateId: site.sourceTemplateId,
      editorConstraints: site.editorConstraints,
      publishedAt: site.publishedAt,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
    };
  } finally {
    client.release();
  }
}

/** Converts only explicit internal navigation targets into site pages.
 * External links and unknown in-page anchors are left untouched.
 * Execute inside an existing transaction with the site row locked.
 */
const defaultNavigationAnchors: Record<string, string> = {
  "#top": "",
  "#inicio": "",
  "#sobre": "sobre",
  "#projetos": "projetos",
  "#impacto": "impacto",
  "#como-ajudar": "como-ajudar",
  "#contato": "contato",
  "#acoes": "acoes",
  "#doar": "doar",
  "#transparencia": "transparencia",
};

function navigationPageSlug(href: string): string | null {
  const destination = href.trim();
  if (destination in defaultNavigationAnchors)
    return defaultNavigationAnchors[destination];
  if (destination === "/") return "";
  if (
    /^\/[a-z0-9][a-z0-9-]{0,69}$/.test(destination) &&
    !destination.startsWith("/o/")
  ) {
    return destination.slice(1);
  }
  return null;
}

async function syncNavigationPagesInTransaction(
  client: PoolClient,
  siteId: string,
): Promise<void> {
  const headerResult = await client.query<{
    id: string;
    content: Record<string, unknown>;
  }>(
    `select s.id, s.content from public.institutional_sections s
     join public.institutional_pages p on p.id = s.page_id
     where p.site_id = $1 and s.section_type = 'site_header'
     order by p.position, s.position limit 1`,
    [siteId],
  );
  const header = headerResult.rows[0];
  if (!header) return;
  const content = header.content;
  const knownPages = await client.query<{ slug: string; isHome: boolean }>(
    `select slug, is_home as "isHome" from public.institutional_pages where site_id = $1 order by position`,
    [siteId],
  );
  const slugs = new Set(knownPages.rows.map((page) => page.slug));
  let nextPosition = knownPages.rows.length;
  const links = Array.isArray(content.links) ? content.links : [];
  const action = content.primaryAction;
  const candidates = [
    ...links.map((item) => ({
      item,
      label: typeof item?.label === "string" ? item.label : "",
    })),
    {
      item: action,
      label:
        typeof (action as { label?: unknown } | null)?.label === "string"
          ? (action as { label: string }).label
          : "",
    },
  ];
  const replacements = new Map<unknown, string>();
  for (const { item, label } of candidates) {
    if (!item || typeof item !== "object" || typeof item.href !== "string")
      continue;
    const slug = navigationPageSlug(item.href);
    if (slug === null) continue;
    if (slug && !slugs.has(slug)) {
      await client.query(
        `insert into public.institutional_pages (site_id, title, slug, is_home, position)
         values ($1, $2, $3, false, $4)`,
        [
          siteId,
          label.trim().slice(0, 100) || slug.replace(/-/g, " "),
          slug,
          nextPosition++,
        ],
      );
      slugs.add(slug);
    }
    replacements.set(item, slug ? `/${slug}` : "/");
  }
  if (!replacements.size) return;
  const updatedLinks = links.map((item) =>
    replacements.has(item) ? { ...item, href: replacements.get(item) } : item,
  );
  const updatedAction = replacements.has(action)
    ? { ...(action as Record<string, unknown>), href: replacements.get(action) }
    : action;
  await client.query(
    `update public.institutional_sections set content = $2 where id = $1`,
    [
      header.id,
      { ...content, links: updatedLinks, primaryAction: updatedAction },
    ],
  );
}

export async function synchronizeInstitutionalNavigation(
  organizationId: string,
  siteId: string,
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    await requireSiteForOrganization(client, organizationId, siteId);
    await client.query(
      "select id from public.institutional_sites where id = $1 for update",
      [siteId],
    );
    await syncNavigationPagesInTransaction(client, siteId);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return getInstitutionalSite(organizationId, siteId);
}

export async function createInstitutionalSite(
  authUserId: string,
  organizationId: string,
  input: { name: string; templateId?: string | null },
): Promise<InstitutionalSite> {
  const template = input.templateId
    ? await getInstitutionalTemplateDefinition(input.templateId)
    : null;

  const client = await pool.connect();
  let siteId: string;

  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);

    const organization = await requireNgo(client, organizationId);
    const userId = await getActiveUserId(client, authUserId);
    const cleanName = input.name.trim();
    const slugBase = cleanName || organization.name;
    const slug = await createUniqueSlug(client, slugBase);
    const siteResult = await client.query<{ id: string }>(
      `
        insert into public.institutional_sites (
          organization_id,
          name,
          slug,
          source_template_id,
          editor_constraints,
          created_by,
          is_primary
        )
        values ($1, $2, $3, $4, $5, $6, false)
        returning id
      `,
      [
        organizationId,
        cleanName,
        slug,
        input.templateId ?? null,
        template?.editorConstraints ??
          (template ? GUIDED_EDITOR_CONSTRAINTS : FREE_EDITOR_CONSTRAINTS),
        userId,
      ],
    );

    siteId = siteResult.rows[0]?.id ?? "";

    if (!siteId) {
      throw new AppError(
        "O site institucional não pôde ser criado.",
        500,
        "INSTITUTIONAL_SITE_CREATE_FAILED",
      );
    }

    await ensureBrandProfile(client, organizationId);

    const pages = template?.pages ?? [
      {
        title: "Home",
        slug: "home",
        isHome: true,
        sections: [],
      },
    ];

    for (const [pageIndex, pageDefinition] of pages.entries()) {
      const pageResult = await client.query<{ id: string }>(
        `
          insert into public.institutional_pages (
            site_id,
            title,
            slug,
            is_home,
            position
          )
          values ($1, $2, $3, $4, $5)
          returning id
        `,
        [
          siteId,
          pageDefinition.title,
          slugify(pageDefinition.slug),
          pageDefinition.isHome,
          pageIndex,
        ],
      );

      const pageId = pageResult.rows[0]?.id;

      if (!pageId) {
        throw new AppError(
          "Uma página do site não pôde ser criada.",
          500,
          "INSTITUTIONAL_PAGE_CREATE_FAILED",
        );
      }

      for (const [
        sectionIndex,
        sectionDefinition,
      ] of pageDefinition.sections.entries()) {
        const sectionType =
          sectionDefinition.sectionType as InstitutionalSectionType;
        const variant = await getInstitutionalVariantVersion(
          sectionDefinition.variantVersionId,
          sectionType,
        );
        const sourceContent = template?.example
          ? contextualizeInstitutionalSection(
              sectionType,
              sectionDefinition.content,
              organization.profile,
            )
          : sectionDefinition.content;
        const content = parseInstitutionalSectionContent(
          sectionType,
          sourceContent,
        );
        const settings = parseInstitutionalSectionSettings({
          ...(sectionDefinition.settings ?? {}),
          ...(template?.example
            ? {
                contentGuidance: {
                  source: "contextual-example",
                  area: organization.profile.areas[0] ?? null,
                  needsReview: true,
                },
              }
            : {}),
        });
        await assertContentAssets(client, organizationId, content);
        await assertContentAssets(client, organizationId, settings);

        await client.query(
          `
            insert into public.institutional_sections (
              page_id,
              section_type,
              variant_version_id,
              position,
              content,
              settings
            )
            values ($1, $2, $3, $4, $5, $6)
          `,
          [
            pageId,
            sectionType,
            variant.versionId,
            sectionIndex,
            content,
            settings,
          ],
        );
      }
    }

    await syncNavigationPagesInTransaction(client, siteId);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getInstitutionalSite(organizationId, siteId);
}

export async function renameInstitutionalSite(
  organizationId: string,
  siteId: string,
  name: string,
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    await requireSiteForOrganization(client, organizationId, siteId);
    await client.query(
      `update public.institutional_sites set name = $1 where id = $2`,
      [name.trim(), siteId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return getInstitutionalSite(organizationId, siteId);
}

export async function updateInstitutionalBrand(
  organizationId: string,
  input: Omit<BrandRow, "organizationId" | "publicSlug">,
  authUserId: string,
): Promise<InstitutionalBrand> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    await requireNgo(client, organizationId);

    // Verifica a posse de TODAS as versões, não apenas da logo principal.
    // Evita referenciar mídias privadas de outra organização.
    for (const assetId of brandMediaIds(input)) {
      await assertOrganizationAsset(client, organizationId, assetId);
    }

    const result = await client.query<BrandRow>(
      `
        insert into public.organization_brand_profiles (
          organization_id,
          logo_asset_id,
          primary_color,
          secondary_color,
          accent_color,
          background_color,
          text_color,
          heading_font,
          body_font,
          design_system
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, coalesce($10::jsonb, '{}'::jsonb))
        on conflict (organization_id) do update
        set
          logo_asset_id = excluded.logo_asset_id,
          primary_color = excluded.primary_color,
          secondary_color = excluded.secondary_color,
          accent_color = excluded.accent_color,
          background_color = excluded.background_color,
          text_color = excluded.text_color,
          heading_font = excluded.heading_font,
          body_font = excluded.body_font,
          design_system = coalesce($10::jsonb, organization_brand_profiles.design_system)
        returning
          organization_id as "organizationId",
          public_slug as "publicSlug",
          logo_asset_id as "logoAssetId",
          primary_color as "primaryColor",
          secondary_color as "secondaryColor",
          accent_color as "accentColor",
          background_color as "backgroundColor",
          text_color as "textColor",
          heading_font as "headingFont",
          body_font as "bodyFont",
        design_system as "designSystem"
      `,
      [
        organizationId,
        input.logoAssetId,
        input.primaryColor,
        input.secondaryColor,
        input.accentColor,
        input.backgroundColor,
        input.textColor,
        input.headingFont,
        input.bodyFont,
        input.designSystem ? JSON.stringify(input.designSystem) : null,
      ],
    );

    await client.query("commit");

    const brand = result.rows[0];

    if (!brand) {
      throw new AppError(
        "A identidade visual não pôde ser atualizada.",
        500,
        "INSTITUTIONAL_BRAND_UPDATE_FAILED",
      );
    }

    const mediaIds = brandMediaIds(brand);
    const assets = mediaIds.length
      ? await getSignedOrganizationAssets(organizationId, mediaIds)
      : new Map<string, InstitutionalMediaAsset>();

    return {
      ...brand,
      logoAsset: brand.logoAssetId
        ? (assets.get(brand.logoAssetId) ?? null)
        : null,
      logoVariantAssets: signedBrandVariants(brand, assets),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function addInstitutionalSection(
  organizationId: string,
  pageId: string,
  input: {
    sectionType: InstitutionalSectionType;
    variantVersionId: string;
    content: unknown;
    settings?: unknown;
  },
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();

  let siteId: string;

  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    const page = await requirePage(client, organizationId, pageId);
    siteId = page.siteId;

    if (input.sectionType === "site_header") {
      const existingHeader = await client.query<{ id: string }>(
        `
          select s.id
          from public.institutional_sections s
          join public.institutional_pages p on p.id = s.page_id
          where p.site_id = $1
            and s.section_type = 'site_header'
          limit 1
        `,
        [siteId],
      );
      if (existingHeader.rowCount) {
        throw new AppError(
          "Este site já possui um cabeçalho global.",
          409,
          "INSTITUTIONAL_HEADER_ALREADY_EXISTS",
        );
      }
    }

    if (input.sectionType === "site_footer") {
      const existingFooter = await client.query<{ id: string }>(
        `
          select s.id
          from public.institutional_sections s
          join public.institutional_pages p on p.id = s.page_id
          where p.site_id = $1
            and s.section_type = 'site_footer'
          limit 1
        `,
        [siteId],
      );
      if (existingFooter.rowCount) {
        throw new AppError(
          "Este site já possui um rodapé global.",
          409,
          "INSTITUTIONAL_FOOTER_ALREADY_EXISTS",
        );
      }
    }

    const variant = await getInstitutionalVariantVersion(
      input.variantVersionId,
      input.sectionType,
    );
    const requestedSettings = parseInstitutionalSectionSettings(
      input.settings ?? {},
    );
    const guidance =
      requestedSettings.contentGuidance &&
      typeof requestedSettings.contentGuidance === "object"
        ? (requestedSettings.contentGuidance as { source?: string })
        : null;
    const wantsContextualExample = guidance?.source === "contextual-request";
    const organization = wantsContextualExample
      ? await requireNgo(client, organizationId)
      : null;
    const sourceContent = organization
      ? contextualizeInstitutionalSection(
          input.sectionType,
          parseInstitutionalSectionContent(input.sectionType, input.content),
          organization.profile,
        )
      : input.content;
    const content = parseInstitutionalSectionContent(
      input.sectionType,
      sourceContent,
    );
    const settings = organization
      ? parseInstitutionalSectionSettings({
          ...requestedSettings,
          contentGuidance: {
            source: "contextual-example",
            area: organization.profile.areas[0] ?? null,
            needsReview: true,
          },
        })
      : requestedSettings;
    await assertContentAssets(client, organizationId, content);

    const positionResult = await client.query<{ position: number }>(
      `
        select coalesce(max(position), -1) + 1 as position
        from public.institutional_sections
        where page_id = $1
      `,
      [pageId],
    );

    await client.query(
      `
        insert into public.institutional_sections (
          page_id,
          section_type,
          variant_version_id,
          position,
          content,
          settings
        )
        values ($1, $2, $3, $4, $5, $6)
      `,
      [
        pageId,
        input.sectionType,
        variant.versionId,
        positionResult.rows[0]?.position ?? 0,
        content,
        settings,
      ],
    );

    if (input.sectionType === "site_header") {
      await syncNavigationPagesInTransaction(client, siteId);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getInstitutionalSite(organizationId, siteId);
}

export async function updateInstitutionalSection(
  organizationId: string,
  sectionId: string,
  input: {
    variantVersionId?: string;
    visible?: boolean;
    content?: unknown;
    settings?: Record<string, unknown>;
  },
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  let siteId: string;

  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);

    const section = await requireSection(client, organizationId, sectionId);
    siteId = section.siteId;
    const variantVersionId = input.variantVersionId ?? section.variantVersionId;

    if (input.variantVersionId) {
      await getInstitutionalVariantVersion(
        input.variantVersionId,
        section.sectionType,
      );
    }

    const content =
      input.content === undefined
        ? section.content
        : parseInstitutionalSectionContent(section.sectionType, input.content);
    const settings =
      input.settings === undefined
        ? section.settings
        : parseInstitutionalSectionSettings(input.settings);

    if (input.content !== undefined) {
      await assertContentAssets(client, organizationId, content);
    }
    if (input.settings !== undefined) {
      await assertContentAssets(client, organizationId, settings);
    }

    await client.query(
      `
        update public.institutional_sections
        set
          variant_version_id = $1,
          visible = $2,
          content = $3,
          settings = $4
        where id = $5
      `,
      [
        variantVersionId,
        input.visible ?? section.visible,
        content,
        settings,
        sectionId,
      ],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getInstitutionalSite(organizationId, siteId);
}

export async function duplicateInstitutionalSection(
  organizationId: string,
  sectionId: string,
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  let siteId: string;

  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);

    const section = await requireSection(client, organizationId, sectionId);
    siteId = section.siteId;

    if (["site_header", "site_footer"].includes(section.sectionType)) {
      throw new AppError(
        section.sectionType === "site_header"
          ? "O cabeçalho global é único e não pode ser duplicado."
          : "O rodapé global é único e não pode ser duplicado.",
        409,
        section.sectionType === "site_header"
          ? "INSTITUTIONAL_HEADER_DUPLICATE_FORBIDDEN"
          : "INSTITUTIONAL_FOOTER_DUPLICATE_FORBIDDEN",
      );
    }

    const positionResult = await client.query<{ position: number }>(
      `
        select coalesce(max(position), -1) + 1 as position
        from public.institutional_sections
        where page_id = $1
      `,
      [section.pageId],
    );

    await client.query(
      `
        insert into public.institutional_sections (
          page_id,
          section_type,
          variant_version_id,
          position,
          visible,
          content,
          settings
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        section.pageId,
        section.sectionType,
        section.variantVersionId,
        positionResult.rows[0]?.position ?? 0,
        section.visible,
        section.content,
        section.settings,
      ],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getInstitutionalSite(organizationId, siteId);
}

export async function deleteInstitutionalSection(
  organizationId: string,
  sectionId: string,
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  let siteId: string;

  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);

    const section = await requireSection(client, organizationId, sectionId);
    siteId = section.siteId;

    if (section.sectionType === "site_header") {
      throw new AppError(
        "O cabeçalho global faz parte da estrutura do site. Troque seu design ou edite seu conteúdo.",
        409,
        "INSTITUTIONAL_HEADER_DELETE_FORBIDDEN",
      );
    }

    await client.query(
      `delete from public.institutional_sections where id = $1`,
      [sectionId],
    );

    const remaining = await client.query<{ id: string }>(
      `
        select id
        from public.institutional_sections
        where page_id = $1
        order by position asc, created_at asc
      `,
      [section.pageId],
    );

    await client.query(
      `
        update public.institutional_sections
        set position = position + 1000
        where page_id = $1
      `,
      [section.pageId],
    );

    for (const [position, row] of remaining.rows.entries()) {
      await client.query(
        `update public.institutional_sections set position = $1 where id = $2`,
        [position, row.id],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getInstitutionalSite(organizationId, siteId);
}

export async function reorderInstitutionalSections(
  organizationId: string,
  pageId: string,
  sectionIds: string[],
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  let siteId: string;

  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    const page = await requirePage(client, organizationId, pageId);
    siteId = page.siteId;

    const currentResult = await client.query<{
      id: string;
      sectionType: InstitutionalSectionType;
    }>(
      `
        select id, section_type as "sectionType"
        from public.institutional_sections
        where page_id = $1
        order by position asc
        for update
      `,
      [pageId],
    );

    const currentIds = new Set(currentResult.rows.map((row) => row.id));

    if (
      currentIds.size !== sectionIds.length ||
      sectionIds.some((sectionId) => !currentIds.has(sectionId))
    ) {
      throw new AppError(
        "A ordem enviada não corresponde às seções desta página.",
        400,
        "INSTITUTIONAL_SECTION_ORDER_INVALID",
      );
    }

    const headerIds = currentResult.rows
      .filter((row) => row.sectionType === "site_header")
      .map((row) => row.id);
    const footerIds = currentResult.rows
      .filter((row) => row.sectionType === "site_footer")
      .map((row) => row.id);
    const fixedIds = new Set([...headerIds, ...footerIds]);
    const normalizedSectionIds = [
      ...headerIds,
      ...sectionIds.filter((sectionId) => !fixedIds.has(sectionId)),
      ...footerIds,
    ];

    await client.query(
      `
        update public.institutional_sections
        set position = position + 1000
        where page_id = $1
      `,
      [pageId],
    );

    for (const [position, sectionId] of normalizedSectionIds.entries()) {
      await client.query(
        `update public.institutional_sections set position = $1 where id = $2`,
        [position, sectionId],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getInstitutionalSite(organizationId, siteId);
}

export async function publishInstitutionalSite(
  authUserId: string,
  organizationId: string,
  siteId: string,
): Promise<{ version: number; publishedAt: Date }> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);

    const userId = await getActiveUserId(client, authUserId);
    await requireSiteForOrganization(client, organizationId, siteId);
    const snapshot = await buildSiteSnapshot(client, organizationId, siteId);
    snapshot.site.isPrimary = true;

    const versionResult = await client.query<{ version: number }>(
      `
        select coalesce(max(version), 0) + 1 as version
        from public.institutional_site_publications
        where site_id = $1
      `,
      [snapshot.site.id],
    );

    const version = versionResult.rows[0]?.version ?? 1;

    const publicationResult = await client.query<{ publishedAt: Date }>(
      `
        insert into public.institutional_site_publications (
          site_id,
          version,
          snapshot,
          published_by
        )
        values ($1, $2, $3, $4)
        returning published_at as "publishedAt"
      `,
      [snapshot.site.id, version, snapshot, userId],
    );

    await client.query(
      `
        update public.institutional_sites
        set published_at = null, is_primary = false
        where organization_id = $1
          and id <> $2
      `,
      [organizationId, snapshot.site.id],
    );

    await client.query(
      `
        update public.institutional_sites
        set published_at = now(), is_primary = true
        where id = $1
      `,
      [snapshot.site.id],
    );

    await client.query("commit");

    return {
      version,
      publishedAt: publicationResult.rows[0]?.publishedAt ?? new Date(),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function unpublishInstitutionalSite(
  organizationId: string,
  siteId: string,
  authUserId: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    await requireSiteForOrganization(client, organizationId, siteId);
    await client.query(
      `update public.institutional_sites
      set published_at = null, is_primary = false where id = $1`,
      [siteId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteInstitutionalSite(
  organizationId: string,
  siteId: string,
  authUserId: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    await requireSiteForOrganization(client, organizationId, siteId);
    await client.query(
      `delete from public.institutional_sites where id = $1 and organization_id = $2`,
      [siteId, organizationId],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

// Todos os acessos verificam site + organização; mudanças em uma página
// não modificam snapshots publicados até a próxima publicação explícita.
export async function createInstitutionalPage(
  organizationId: string,
  siteId: string,
  input: { title: string; slug: string },
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    await requireSiteForOrganization(client, organizationId, siteId);
    // Bloqueio serializa operações de páginas na mesma organização/site.
    await client.query(
      "select id from public.institutional_sites where id = $1 for update",
      [siteId],
    );
    const existing = await client.query(
      "select 1 from public.institutional_pages where site_id = $1 and slug = $2",
      [siteId, input.slug],
    );
    if (existing.rowCount)
      throw new AppError(
        "Já existe uma página com esse endereço.",
        409,
        "INSTITUTIONAL_PAGE_SLUG_IN_USE",
      );
    const positions = await client.query<{ nextPosition: number }>(
      'select coalesce(max(position), -1) + 1 as "nextPosition" from public.institutional_pages where site_id = $1',
      [siteId],
    );
    await client.query(
      `insert into public.institutional_pages (site_id, title, slug, is_home, position)
       values ($1, $2, $3, false, $4)`,
      [siteId, input.title, input.slug, positions.rows[0]?.nextPosition ?? 0],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return getInstitutionalSite(organizationId, siteId);
}

export async function updateInstitutionalPage(
  organizationId: string,
  siteId: string,
  pageId: string,
  input: { title?: string; slug?: string; isHome?: boolean },
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    await requireSiteForOrganization(client, organizationId, siteId);
    await client.query(
      "select id from public.institutional_sites where id = $1 for update",
      [siteId],
    );
    const page = await requirePage(client, organizationId, pageId);
    if (page.siteId !== siteId)
      throw new AppError(
        "Página não pertence a este site.",
        404,
        "INSTITUTIONAL_PAGE_NOT_FOUND",
      );
    if (input.slug) {
      const duplicate = await client.query(
        "select 1 from public.institutional_pages where site_id = $1 and slug = $2 and id <> $3",
        [siteId, input.slug, pageId],
      );
      if (duplicate.rowCount)
        throw new AppError(
          "Já existe uma página com esse endereço.",
          409,
          "INSTITUTIONAL_PAGE_SLUG_IN_USE",
        );
    }
    const current = await client.query<{ isHome: boolean }>(
      'select is_home as "isHome" from public.institutional_pages where id = $1',
      [pageId],
    );
    if (input.isHome === false && current.rows[0]?.isHome) {
      throw new AppError(
        "Defina outra página inicial antes de alterar esta.",
        400,
        "INSTITUTIONAL_PAGE_HOME_REQUIRED",
      );
    }
    if (input.isHome === true) {
      await client.query(
        "update public.institutional_pages set is_home = false where site_id = $1 and is_home = true",
        [siteId],
      );
    }
    await client.query(
      `update public.institutional_pages
       set title = coalesce($3, title), slug = coalesce($4, slug),
           is_home = case when $5::boolean = true then true else is_home end
       where id = $1 and site_id = $2`,
      [
        pageId,
        siteId,
        input.title ?? null,
        input.slug ?? null,
        input.isHome ?? null,
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return getInstitutionalSite(organizationId, siteId);
}

export async function deleteInstitutionalPage(
  organizationId: string,
  siteId: string,
  pageId: string,
  authUserId: string,
): Promise<InstitutionalSite> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setAuditActor(client, authUserId);
    await requireSiteForOrganization(client, organizationId, siteId);
    await client.query(
      "select id from public.institutional_sites where id = $1 for update",
      [siteId],
    );
    const page = await requirePage(client, organizationId, pageId);
    if (page.siteId !== siteId)
      throw new AppError(
        "Página não pertence a este site.",
        404,
        "INSTITUTIONAL_PAGE_NOT_FOUND",
      );
    const state = await client.query<{ isHome: boolean }>(
      'select is_home as "isHome" from public.institutional_pages where id = $1',
      [pageId],
    );
    if (state.rows[0]?.isHome)
      throw new AppError(
        "A página inicial não pode ser excluída.",
        409,
        "INSTITUTIONAL_PAGE_HOME_DELETE",
      );
    // A exclusão usa ON DELETE CASCADE nas seções, mas não altera publicações anteriores.
    await client.query(
      "delete from public.institutional_pages where id = $1 and site_id = $2",
      [pageId, siteId],
    );
    // Reindexação em duas etapas evita violar unique(site_id, position).
    const remaining = await client.query<{ id: string }>(
      "select id from public.institutional_pages where site_id = $1 order by position, id",
      [siteId],
    );
    for (const [index, row] of remaining.rows.entries()) {
      await client.query(
        "update public.institutional_pages set position = $2 where id = $1",
        [row.id, index + 100000],
      );
    }
    for (const [index, row] of remaining.rows.entries()) {
      await client.query(
        "update public.institutional_pages set position = $2 where id = $1",
        [row.id, index],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return getInstitutionalSite(organizationId, siteId);
}

export async function getPublishedInstitutionalSite(
  slug: string,
): Promise<InstitutionalSite> {
  const result = await pool.query<{
    publishedAt: Date;
    snapshot: SiteSnapshot;
  }>(
    `
      select
        p.published_at as "publishedAt",
        p.snapshot
      from public.institutional_sites s
      join public.organization_brand_profiles b
        on b.organization_id = s.organization_id
      join public.institutional_site_publications p
        on p.site_id = s.id
      where (b.public_slug = $1 or s.slug = $1)
        and s.published_at is not null
        and s.is_primary = true
      order by p.version desc
      limit 1
    `,
    [slug],
  );

  const publication = result.rows[0];

  if (!publication) {
    throw new AppError(
      "Este site não está publicado.",
      404,
      "PUBLIC_INSTITUTIONAL_SITE_NOT_FOUND",
    );
  }

  const hydrated = await hydrateSnapshot(publication.snapshot);

  return {
    ...hydrated,
    publishedAt: publication.publishedAt,
  };
}
