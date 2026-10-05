import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import pool from "../config/database.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

const bucket = () => supabaseAdmin.storage.from("institutional-media");

export interface InstitutionalMediaAsset {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

interface StoredMediaAsset extends Omit<InstitutionalMediaAsset, "url"> {
  storagePath: string;
}

function detectImageType(buffer: Buffer): string | null {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }

  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return "image/jpeg";
  }

  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

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

function safeFileName(name: string, extension: string): string {
  return (
    Array.from(name)
      .map((char) =>
        char.charCodeAt(0) < 32 || char === "/" || char === "\\" ? "_" : char,
      )
      .join("")
      .slice(0, 180) || `imagem.${extension}`
  );
}

export async function uploadInstitutionalMedia(
  authUserId: string,
  organizationId: string,
  file: Express.Multer.File,
): Promise<InstitutionalMediaAsset> {
  const mimeType = detectImageType(file.buffer);

  if (
    !mimeType ||
    mimeType !== file.mimetype ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new AppError(
      "Envie uma imagem JPG, PNG ou WebP de até 5 MB.",
      400,
      "INVALID_INSTITUTIONAL_MEDIA",
    );
  }

  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }[mimeType];

  if (!extension) {
    throw new AppError(
      "Formato de imagem não suportado.",
      400,
      "INVALID_INSTITUTIONAL_MEDIA",
    );
  }

  const client = await pool.connect();
  const assetId = randomUUID();
  const storagePath = `${organizationId}/${assetId}.${extension}`;

  try {
    await client.query("begin");

    const userId = await getActiveUserId(client, authUserId);

    const { error } = await bucket().upload(storagePath, file.buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      throw new AppError(
        "Não foi possível armazenar a imagem.",
        503,
        "INSTITUTIONAL_MEDIA_UPLOAD_FAILED",
      );
    }

    const name = safeFileName(file.originalname, extension);

    await client.query(
      `
        insert into public.organization_media_assets (
          id,
          organization_id,
          owner_user_id,
          storage_path,
          name,
          mime_type,
          size_bytes
        )
        values ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        assetId,
        organizationId,
        userId,
        storagePath,
        name,
        mimeType,
        file.size,
      ],
    );

    const { data, error: signedUrlError } = await bucket().createSignedUrl(
      storagePath,
      60 * 60,
    );

    if (signedUrlError || !data?.signedUrl) {
      throw new AppError(
        "A imagem foi enviada, mas não pôde ser aberta.",
        503,
        "INSTITUTIONAL_MEDIA_SIGN_FAILED",
      );
    }

    await client.query("commit");

    return {
      id: assetId,
      name,
      mimeType,
      sizeBytes: file.size,
      url: data.signedUrl,
    };
  } catch (error) {
    await client.query("rollback");
    await bucket().remove([storagePath]);
    throw error;
  } finally {
    client.release();
  }
}

export async function assertOrganizationAsset(
  client: PoolClient,
  organizationId: string,
  assetId: string,
): Promise<void> {
  const result = await client.query<{ id: string }>(
    `
      select id
      from public.organization_media_assets
      where id = $1
        and organization_id = $2
      limit 1
    `,
    [assetId, organizationId],
  );

  if (!result.rows[0]) {
    throw new AppError(
      "A imagem selecionada não pertence a esta organização.",
      400,
      "INSTITUTIONAL_MEDIA_NOT_AVAILABLE",
    );
  }
}

export async function getSignedOrganizationAssets(
  organizationId: string,
  assetIds: string[],
): Promise<Map<string, InstitutionalMediaAsset>> {
  const uniqueIds = [...new Set(assetIds)];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<StoredMediaAsset>(
    `
      select
        id,
        name,
        mime_type as "mimeType",
        size_bytes as "sizeBytes",
        storage_path as "storagePath"
      from public.organization_media_assets
      where organization_id = $1
        and id = any($2::uuid[])
    `,
    [organizationId, uniqueIds],
  );

  if (result.rows.length === 0) {
    return new Map();
  }

  const { data, error } = await bucket().createSignedUrls(
    result.rows.map((asset) => asset.storagePath),
    60 * 60,
  );

  const assets = new Map<string, InstitutionalMediaAsset>();

  result.rows.forEach((asset, index) => {
    assets.set(asset.id, {
      id: asset.id,
      name: asset.name,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      url: error ? "" : (data?.[index]?.signedUrl ?? ""),
    });
  });

  return assets;
}
