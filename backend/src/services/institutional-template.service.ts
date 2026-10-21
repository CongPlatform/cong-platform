import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

import pool from "../config/database.js";
import {
  hasPlatformCapability,
  NATIVE_DESIGNS_CAPABILITY,
} from "./platform-capability.service.js";
import { AppError } from "../utils/app-error.js";
import {
  institutionalTemplateDefinitionSchema,
  parseInstitutionalSectionContent,
  parseInstitutionalSectionSettings,
  type InstitutionalSectionType,
} from "../validators/institutional.validator.js";

export interface InstitutionalTemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  familyKey: string | null;
  isSystem: boolean;
  isExample: boolean;
  definition?: InstitutionalTemplateDefinition;
  visibility?: "private" | "public";
  status?: "draft" | "published";
  updatedAt?: Date;
}

export interface InstitutionalTemplateDefinition {
  example?: boolean;
  editorConstraints?: {
    mode: "free" | "guided";
    minWidthPercent: number;
    maxWidthPercent: number;
    minFontSize: number;
    maxFontSize: number;
    maxOffset: number;
  };
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

export interface DesignerInstitutionalTemplate extends InstitutionalTemplateSummary {
  visibility: "private" | "public";
  status: "draft" | "published";
  updatedAt: Date;
  definition: InstitutionalTemplateDefinition;
}

async function getActiveUserId(
  client: PoolClient,
  authUserId: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `select id from public.users where auth_user_id = $1 and active = true limit 1`,
    [authUserId],
  );

  const userId = result.rows[0]?.id;
  if (!userId) {
    throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  }

  return userId;
}

// Some published native templates were imported before navigation items received
// stable identifiers. Repair only this known legacy omission on reads; all other
// values remain subject to the original Zod schema.
function withLegacyNavigationIds(
  content: unknown,
  templateId: string,
  pageIndex: number,
  sectionIndex: number,
): unknown {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return content;
  }
  const raw = content as Record<string, unknown>;
  if (!Array.isArray(raw.links) || !raw.links.some(
    (link) => link && typeof link === "object" && !Array.isArray(link) && !("id" in link),
  )) return content;

  const links = raw.links.map((link, linkIndex) => {
    if (!link || typeof link !== "object" || Array.isArray(link) || "id" in link) {
      return link;
    }

    const bytes = createHash("sha256")
      .update(`${templateId}:${pageIndex}:${sectionIndex}:${linkIndex}`)
      .digest();
    bytes[6] = (bytes[6]! & 0x0f) | 0x50;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = bytes.subarray(0, 16).toString("hex");
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return { ...link, id };
  });

  return { ...raw, links };
}

function normalizeDefinition(
  input: unknown,
  legacyNativeTemplateId?: string,
): InstitutionalTemplateDefinition {
  const parsed = institutionalTemplateDefinitionSchema.parse(input);

  return {
    ...(parsed.example === undefined ? {} : { example: parsed.example }),
    ...(parsed.editorConstraints === undefined
      ? {}
      : { editorConstraints: parsed.editorConstraints }),
    pages: parsed.pages.map((page, pageIndex) => ({
      title: page.title,
      slug: page.slug,
      isHome: page.isHome,
      sections: page.sections.map((section, sectionIndex) => ({
        sectionType: section.sectionType,
        variantVersionId: section.variantVersionId,
        content: parseInstitutionalSectionContent(
          section.sectionType,
          section.sectionType === "site_header" && legacyNativeTemplateId
            ? withLegacyNavigationIds(
                section.content,
                legacyNativeTemplateId,
                pageIndex,
                sectionIndex,
              )
            : section.content,
        ),
        ...(section.settings
          ? { settings: parseInstitutionalSectionSettings(section.settings) }
          : {}),
      })),
    })),
  };
}

async function assertTemplateVariantsPublished(
  client: PoolClient,
  definition: InstitutionalTemplateDefinition,
): Promise<void> {
  const references = definition.pages.flatMap((page) =>
    page.sections.map((section) => ({
      versionId: section.variantVersionId,
      sectionType: section.sectionType,
    })),
  );

  if (references.length === 0) return;

  const uniqueIds = [
    ...new Set(references.map((reference) => reference.versionId)),
  ];
  const result = await client.query<{
    versionId: string;
    sectionType: InstitutionalSectionType;
  }>(
    `
      select
        vv.id as "versionId",
        v.section_type as "sectionType"
      from public.institutional_section_variant_versions vv
      join public.institutional_section_variants v
        on v.id = vv.variant_id
      where vv.id = any($1::uuid[])
        and vv.status = 'published'
        and v.status = 'published'
        and v.visibility = 'public'
    `,
    [uniqueIds],
  );

  const available = new Map(
    result.rows.map((row) => [row.versionId, row.sectionType] as const),
  );

  const unavailable = references.find(
    (reference) => available.get(reference.versionId) !== reference.sectionType,
  );

  if (unavailable) {
    throw new AppError(
      "Este template usa uma variação que ainda não está publicada. Publique a variação ou escolha outra antes de disponibilizar o template.",
      409,
      "DESIGNER_TEMPLATE_VARIANT_NOT_PUBLISHED",
    );
  }
}

export async function listInstitutionalTemplates(): Promise<
  InstitutionalTemplateSummary[]
> {
  const result = await pool.query<InstitutionalTemplateSummary>(
    `
      select
        id,
        name,
        description,
        category,
        family_key as "familyKey",
        is_system as "isSystem",
        coalesce((definition ->> 'example')::boolean, false) as "isExample",
        definition
      from public.institutional_templates
      where status = 'published'
        and visibility = 'public'
      order by is_system desc, name asc
    `,
  );

  return result.rows.map((template) => ({
    ...template,
    ...(template.definition
      ? {
          definition: normalizeDefinition(
            template.definition,
            template.isSystem ? template.id : undefined,
          ),
        }
      : {}),
  }));
}

export async function getInstitutionalTemplateDefinition(
  templateId: string,
): Promise<InstitutionalTemplateDefinition> {
  const result = await pool.query<{
    definition: unknown;
    id: string;
    isSystem: boolean;
  }>(
    `
      select id, is_system as "isSystem", definition
      from public.institutional_templates
      where id = $1
        and status = 'published'
        and visibility = 'public'
      limit 1
    `,
    [templateId],
  );

  const definition = result.rows[0]?.definition;
  if (!definition) {
    throw new AppError(
      "O modelo selecionado não está disponível.",
      404,
      "INSTITUTIONAL_TEMPLATE_NOT_FOUND",
    );
  }

  return normalizeDefinition(
    definition,
    result.rows[0]?.isSystem ? result.rows[0].id : undefined,
  );
}

export async function listDesignerTemplates(
  authUserId: string,
): Promise<DesignerInstitutionalTemplate[]> {
  const client = await pool.connect();

  try {
    const userId = await getActiveUserId(client, authUserId);
    const canManageNative = await hasPlatformCapability(
      client,
      authUserId,
      NATIVE_DESIGNS_CAPABILITY,
    );
    const result = await client.query<DesignerInstitutionalTemplate>(
      `
        select
          id,
          name,
          description,
          category,
          family_key as "familyKey",
          is_system as "isSystem",
          coalesce((definition ->> 'example')::boolean, false) as "isExample",
          visibility,
          status,
          updated_at as "updatedAt",
          definition
        from public.institutional_templates
        where coalesce(family_key, '') <> 'legacy-retired'
          and (
            (owner_user_id = $1 and is_system = false)
            or (is_system = true and $2::boolean = true)
          )
        order by is_system desc, updated_at desc
      `,
      [userId, canManageNative],
    );

    return result.rows.map((template) => ({
      ...template,
      definition: normalizeDefinition(
        template.definition,
        template.isSystem ? template.id : undefined,
      ),
    }));
  } finally {
    client.release();
  }
}

export async function getDesignerTemplate(
  authUserId: string,
  templateId: string,
): Promise<DesignerInstitutionalTemplate> {
  const client = await pool.connect();

  try {
    const userId = await getActiveUserId(client, authUserId);
    const canManageNative = await hasPlatformCapability(
      client,
      authUserId,
      NATIVE_DESIGNS_CAPABILITY,
    );
    const result = await client.query<DesignerInstitutionalTemplate>(
      `
        select
          id,
          name,
          description,
          category,
          family_key as "familyKey",
          is_system as "isSystem",
          coalesce((definition ->> 'example')::boolean, false) as "isExample",
          visibility,
          status,
          updated_at as "updatedAt",
          definition
        from public.institutional_templates
        where id = $1
          and (
            (owner_user_id = $2 and is_system = false)
            or (is_system = true and $3::boolean = true)
          )
        limit 1
      `,
      [templateId, userId, canManageNative],
    );

    const template = result.rows[0];
    if (!template) {
      throw new AppError(
        "O template selecionado não está disponível para edição.",
        404,
        "DESIGNER_TEMPLATE_NOT_FOUND",
      );
    }

    return {
      ...template,
      definition: normalizeDefinition(
        template.definition,
        template.isSystem ? template.id : undefined,
      ),
    };
  } finally {
    client.release();
  }
}

export async function createDesignerTemplate(
  authUserId: string,
  input: {
    name: string;
    description: string;
    category: string;
    definition: InstitutionalTemplateDefinition;
    isSystem?: boolean;
  },
): Promise<DesignerInstitutionalTemplate> {
  const client = await pool.connect();

  try {
    const userId = await getActiveUserId(client, authUserId);
    const isSystem = Boolean(input.isSystem);
    if (isSystem) {
      const allowed = await hasPlatformCapability(
        client,
        authUserId,
        NATIVE_DESIGNS_CAPABILITY,
      );
      if (!allowed) {
        throw new AppError(
          "Você não tem permissão para criar templates nativos da CONG.",
          403,
          "NATIVE_DESIGNS_PERMISSION_REQUIRED",
        );
      }
    }

    const definition = normalizeDefinition(input.definition);
    const result = await client.query<{ id: string }>(
      `
        insert into public.institutional_templates (
          name,
          description,
          category,
          owner_user_id,
          is_system,
          visibility,
          status,
          definition
        )
        values ($1, $2, $3, $4, $5, 'private', 'draft', $6)
        returning id
      `,
      [
        input.name,
        input.description,
        input.category,
        isSystem ? null : userId,
        isSystem,
        definition,
      ],
    );

    const id = result.rows[0]?.id;
    if (!id) {
      throw new AppError(
        "O template não pôde ser criado.",
        500,
        "DESIGNER_TEMPLATE_CREATE_FAILED",
      );
    }

    return getDesignerTemplate(authUserId, id);
  } finally {
    client.release();
  }
}

export async function updateDesignerTemplate(
  authUserId: string,
  templateId: string,
  input: {
    name: string;
    description: string;
    category: string;
    definition: InstitutionalTemplateDefinition;
  },
): Promise<DesignerInstitutionalTemplate> {
  const client = await pool.connect();

  try {
    const userId = await getActiveUserId(client, authUserId);
    const canManageNative = await hasPlatformCapability(
      client,
      authUserId,
      NATIVE_DESIGNS_CAPABILITY,
    );
    const definition = normalizeDefinition(input.definition);
    const result = await client.query<{ id: string }>(
      `
        update public.institutional_templates
        set
          name = $1,
          description = $2,
          category = $3,
          definition = $4,
          status = case when status = 'published' then 'draft' else status end,
          visibility = case when status = 'published' then 'private' else visibility end
        where id = $5
          and (
            (owner_user_id = $6 and is_system = false)
            or (is_system = true and $7::boolean = true)
          )
        returning id
      `,
      [
        input.name,
        input.description,
        input.category,
        definition,
        templateId,
        userId,
        canManageNative,
      ],
    );

    if (!result.rows[0]) {
      throw new AppError(
        "O template selecionado não está disponível para edição.",
        404,
        "DESIGNER_TEMPLATE_NOT_FOUND",
      );
    }

    return getDesignerTemplate(authUserId, templateId);
  } finally {
    client.release();
  }
}

export async function publishDesignerTemplate(
  authUserId: string,
  templateId: string,
): Promise<DesignerInstitutionalTemplate> {
  const client = await pool.connect();

  try {
    const userId = await getActiveUserId(client, authUserId);
    const canManageNative = await hasPlatformCapability(
      client,
      authUserId,
      NATIVE_DESIGNS_CAPABILITY,
    );
    const currentResult = await client.query<{ definition: unknown }>(
      `
        select definition
        from public.institutional_templates
        where id = $1
          and (
            (owner_user_id = $2 and is_system = false)
            or (is_system = true and $3::boolean = true)
          )
        limit 1
      `,
      [templateId, userId, canManageNative],
    );

    const currentDefinition = currentResult.rows[0]?.definition;
    if (!currentDefinition) {
      throw new AppError(
        "O template selecionado não está disponível para publicação.",
        404,
        "DESIGNER_TEMPLATE_NOT_FOUND",
      );
    }

    await assertTemplateVariantsPublished(
      client,
      normalizeDefinition(currentDefinition),
    );

    const result = await client.query<{ id: string }>(
      `
        update public.institutional_templates
        set status = 'published', visibility = 'public'
        where id = $1
          and (
            (owner_user_id = $2 and is_system = false)
            or (is_system = true and $3::boolean = true)
          )
        returning id
      `,
      [templateId, userId, canManageNative],
    );

    if (!result.rows[0]) {
      throw new AppError(
        "O template selecionado não está disponível para publicação.",
        404,
        "DESIGNER_TEMPLATE_NOT_FOUND",
      );
    }

    return getDesignerTemplate(authUserId, templateId);
  } finally {
    client.release();
  }
}
