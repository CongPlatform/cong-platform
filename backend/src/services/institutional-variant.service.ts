import type { PoolClient } from "pg";

import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import {
  institutionalLayoutSchema,
  institutionalSectionTypeSchema,
  type InstitutionalLayoutNode,
  type InstitutionalSectionType,
} from "../validators/institutional.validator.js";

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
  updatedAt: Date;
}

type VariantRow = InstitutionalVariant;

const rootSlots: Record<InstitutionalSectionType, Set<string>> = {
  organization_intro: new Set([
    "eyebrow",
    "title",
    "description",
    "image",
    "primaryAction",
    "secondaryAction",
  ]),
  organization_about: new Set([
    "eyebrow",
    "title",
    "description",
    "image",
    "action",
  ]),
  projects_showcase: new Set(["title", "description"]),
  impact_metrics: new Set(["title", "description"]),
  support_actions: new Set(["title", "description"]),
  transparency: new Set(["title", "description"]),
  organization_contact: new Set([
    "title",
    "description",
    "email",
    "phone",
    "whatsapp",
    "address",
    "hours",
  ]),
  custom_content: new Set(),
  site_footer: new Set([
    "title",
    "description",
    "email",
    "phone",
    "copyright",
  ]),
};

const repeatSources: Record<
  InstitutionalSectionType,
  Record<string, Set<string>>
> = {
  organization_intro: {},
  organization_about: {},
  projects_showcase: {
    items: new Set(["title", "description", "category", "image", "action"]),
  },
  impact_metrics: {
    items: new Set(["value", "label", "period", "source"]),
  },
  support_actions: {
    items: new Set(["title", "description", "action", "kind"]),
  },
  transparency: {
    items: new Set(["category", "title", "description", "period", "url"]),
  },
  organization_contact: {
    socialLinks: new Set(["label", "url"]),
  },
  custom_content: {},
  site_footer: {
    socialLinks: new Set(["label", "url"]),
  },
};

async function getActiveUserId(
  client: PoolClient,
  authUserId: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      select id
      from public.users
      where auth_user_id = $1
        and active = true
      limit 1
    `,
    [authUserId],
  );

  const userId = result.rows[0]?.id;

  if (!userId) {
    throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  }

  return userId;
}

function validateLayoutNode(
  sectionType: InstitutionalSectionType,
  node: InstitutionalLayoutNode,
  options: {
    depth: number;
    count: { value: number };
    itemSlots?: Set<string>;
  },
): void {
  options.count.value += 1;

  if (options.depth > 8 || options.count.value > 80) {
    throw new AppError(
      "A variante ultrapassa o limite de complexidade visual.",
      400,
      "INSTITUTIONAL_VARIANT_TOO_COMPLEX",
    );
  }

  if (node.type === "element") {
    return;
  }

  if (node.type === "slot") {
    const allowedSlots = options.itemSlots ?? rootSlots[sectionType];

    if (!allowedSlots.has(node.slot)) {
      throw new AppError(
        `O campo visual '${node.slot}' não existe neste tipo de seção.`,
        400,
        "INSTITUTIONAL_VARIANT_INVALID_SLOT",
      );
    }

    return;
  }

  if (node.type === "repeat") {
    if (options.itemSlots) {
      throw new AppError(
        "Listas não podem ser aninhadas dentro de outras listas.",
        400,
        "INSTITUTIONAL_VARIANT_NESTED_REPEAT",
      );
    }

    const sourceSlots = repeatSources[sectionType][node.source];

    if (!sourceSlots) {
      throw new AppError(
        `A coleção '${node.source}' não existe neste tipo de seção.`,
        400,
        "INSTITUTIONAL_VARIANT_INVALID_COLLECTION",
      );
    }

    validateLayoutNode(sectionType, node.item, {
      depth: options.depth + 1,
      count: options.count,
      itemSlots: sourceSlots,
    });

    return;
  }

  node.children.forEach((child) => {
    validateLayoutNode(sectionType, child, {
      depth: options.depth + 1,
      count: options.count,
      ...(options.itemSlots ? { itemSlots: options.itemSlots } : {}),
    });
  });
}

export function validateInstitutionalLayout(
  sectionType: InstitutionalSectionType,
  layout: unknown,
): InstitutionalLayoutNode {
  const parsedType = institutionalSectionTypeSchema.parse(sectionType);
  const parsedLayout = institutionalLayoutSchema.parse(layout);

  validateLayoutNode(parsedType, parsedLayout, {
    depth: 0,
    count: { value: 0 },
  });

  return parsedLayout;
}

export async function listInstitutionalVariants(
  authUserId: string,
  sectionType?: InstitutionalSectionType,
  includeOwnedDrafts = false,
): Promise<InstitutionalVariant[]> {
  const client = await pool.connect();

  try {
    const userId = await getActiveUserId(client, authUserId);

    const result = await client.query<VariantRow>(
      `
        select
          v.id,
          v.section_type as "sectionType",
          v.name,
          v.description,
          v.is_system as "isSystem",
          v.visibility,
          vv.status,
          v.owner_user_id as "ownerUserId",
          vv.version,
          vv.id as "versionId",
          vv.layout,
          v.updated_at as "updatedAt"
        from public.institutional_section_variants v
        join lateral (
          select id, version, status, layout
          from public.institutional_section_variant_versions
          where variant_id = v.id
            and (
              status = 'published'
              or ($3::boolean = true and v.owner_user_id = $2)
            )
          order by version desc
          limit 1
        ) vv on true
        where ($1::text is null or v.section_type = $1)
          and (
            v.is_system = true
            or (v.status = 'published' and v.visibility = 'public')
            or ($3::boolean = true and v.owner_user_id = $2)
          )
        order by v.is_system desc, v.name asc
      `,
      [sectionType ?? null, userId, includeOwnedDrafts],
    );

    return result.rows;
  } finally {
    client.release();
  }
}

export async function getInstitutionalVariantVersion(
  variantVersionId: string,
  sectionType: InstitutionalSectionType,
): Promise<InstitutionalVariant> {
  const result = await pool.query<VariantRow>(
    `
      select
        v.id,
        v.section_type as "sectionType",
        v.name,
        v.description,
        v.is_system as "isSystem",
        v.visibility,
        vv.status,
        v.owner_user_id as "ownerUserId",
        vv.version,
        vv.id as "versionId",
        vv.layout,
        v.updated_at as "updatedAt"
      from public.institutional_section_variant_versions vv
      join public.institutional_section_variants v
        on v.id = vv.variant_id
      where vv.id = $1
        and v.section_type = $2
        and vv.status = 'published'
        and (
          v.is_system = true
          or (v.status = 'published' and v.visibility = 'public')
        )
      limit 1
    `,
    [variantVersionId, sectionType],
  );

  const variant = result.rows[0];

  if (!variant) {
    throw new AppError(
      "A variante selecionada não está disponível para esta seção.",
      400,
      "INSTITUTIONAL_VARIANT_NOT_AVAILABLE",
    );
  }

  validateInstitutionalLayout(variant.sectionType, variant.layout);

  return variant;
}

export async function createInstitutionalVariant(
  authUserId: string,
  input: {
    sectionType: InstitutionalSectionType;
    name: string;
    description: string;
    layout: InstitutionalLayoutNode;
  },
): Promise<InstitutionalVariant> {
  const layout = validateInstitutionalLayout(input.sectionType, input.layout);
  const client = await pool.connect();

  try {
    await client.query("begin");

    const userId = await getActiveUserId(client, authUserId);

    const variantResult = await client.query<{
      id: string;
      updatedAt: Date;
    }>(
      `
        insert into public.institutional_section_variants (
          section_type,
          name,
          description,
          owner_user_id,
          is_system,
          visibility,
          status
        )
        values ($1, $2, $3, $4, false, 'private', 'draft')
        returning id, updated_at as "updatedAt"
      `,
      [input.sectionType, input.name, input.description, userId],
    );

    const variant = variantResult.rows[0];

    if (!variant) {
      throw new AppError(
        "A variante não pôde ser criada.",
        500,
        "INSTITUTIONAL_VARIANT_CREATE_FAILED",
      );
    }

    const versionResult = await client.query<{
      id: string;
      version: number;
      layout: InstitutionalLayoutNode;
    }>(
      `
        insert into public.institutional_section_variant_versions (
          variant_id,
          version,
          status,
          layout
        )
        values ($1, 1, 'draft', $2)
        returning id, version, layout
      `,
      [variant.id, layout],
    );

    const version = versionResult.rows[0];

    if (!version) {
      throw new AppError(
        "A versão inicial da variante não pôde ser criada.",
        500,
        "INSTITUTIONAL_VARIANT_VERSION_CREATE_FAILED",
      );
    }

    await client.query("commit");

    return {
      id: variant.id,
      sectionType: input.sectionType,
      name: input.name,
      description: input.description,
      isSystem: false,
      visibility: "private",
      status: "draft",
      ownerUserId: userId,
      version: version.version,
      versionId: version.id,
      layout: version.layout,
      updatedAt: variant.updatedAt,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateInstitutionalVariant(
  authUserId: string,
  variantId: string,
  input: {
    name: string;
    description: string;
    layout: InstitutionalLayoutNode;
  },
): Promise<InstitutionalVariant> {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const userId = await getActiveUserId(client, authUserId);

    const variantResult = await client.query<{
      id: string;
      sectionType: InstitutionalSectionType;
      isSystem: boolean;
      visibility: "private" | "public";
    }>(
      `
        select
          id,
          section_type as "sectionType",
          is_system as "isSystem",
          visibility
        from public.institutional_section_variants
        where id = $1
          and owner_user_id = $2
          and is_system = false
        limit 1
        for update
      `,
      [variantId, userId],
    );

    const variant = variantResult.rows[0];

    if (!variant) {
      throw new AppError(
        "A variante não existe ou não pertence a este designer.",
        404,
        "INSTITUTIONAL_VARIANT_NOT_FOUND",
      );
    }

    const layout = validateInstitutionalLayout(variant.sectionType, input.layout);

    const versionResult = await client.query<{
      id: string;
      version: number;
      layout: InstitutionalLayoutNode;
    }>(
      `
        insert into public.institutional_section_variant_versions (
          variant_id,
          version,
          status,
          layout
        )
        select
          $1,
          coalesce(max(version), 0) + 1,
          'draft',
          $2
        from public.institutional_section_variant_versions
        where variant_id = $1
        returning id, version, layout
      `,
      [variantId, layout],
    );

    await client.query(
      `
        update public.institutional_section_variants
        set
          name = $1,
          description = $2
        where id = $3
      `,
      [input.name, input.description, variantId],
    );

    const version = versionResult.rows[0];

    if (!version) {
      throw new AppError(
        "A nova versão da variante não pôde ser criada.",
        500,
        "INSTITUTIONAL_VARIANT_VERSION_CREATE_FAILED",
      );
    }

    await client.query("commit");

    return {
      id: variantId,
      sectionType: variant.sectionType,
      name: input.name,
      description: input.description,
      isSystem: false,
      visibility: variant.visibility,
      status: "draft",
      ownerUserId: userId,
      version: version.version,
      versionId: version.id,
      layout: version.layout,
      updatedAt: new Date(),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function publishInstitutionalVariant(
  authUserId: string,
  variantId: string,
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const userId = await getActiveUserId(client, authUserId);

    const variantResult = await client.query<{ id: string }>(
      `
        select id
        from public.institutional_section_variants
        where id = $1
          and owner_user_id = $2
          and is_system = false
        limit 1
        for update
      `,
      [variantId, userId],
    );

    if (!variantResult.rows[0]) {
      throw new AppError(
        "A variante não existe ou não pertence a este designer.",
        404,
        "INSTITUTIONAL_VARIANT_NOT_FOUND",
      );
    }

    const versionResult = await client.query<{ id: string }>(
      `
        select id
        from public.institutional_section_variant_versions
        where variant_id = $1
        order by version desc
        limit 1
        for update
      `,
      [variantId],
    );

    const versionId = versionResult.rows[0]?.id;

    if (!versionId) {
      throw new AppError(
        "A variante não possui uma versão disponível para publicação.",
        409,
        "INSTITUTIONAL_VARIANT_VERSION_NOT_FOUND",
      );
    }

    await client.query(
      `
        update public.institutional_section_variant_versions
        set status = 'published'
        where id = $1
      `,
      [versionId],
    );

    await client.query(
      `
        update public.institutional_section_variants
        set
          status = 'published',
          visibility = 'public'
        where id = $1
      `,
      [variantId],
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

