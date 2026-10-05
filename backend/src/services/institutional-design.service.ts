import type { PoolClient } from "pg";

import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";

export interface InstitutionalDesignPalette {
  id: string;
  name: string;
  description: string;
  colors: string[];
  visibility: "private" | "public";
  status: "draft" | "published";
  ownerUserId: string | null;
  updatedAt: Date;
}

export interface InstitutionalImageFrameResource {
  id: string;
  name: string;
  description: string;
  clipPath: string;
  visibility: "private" | "public";
  status: "draft" | "published";
  ownerUserId: string | null;
  updatedAt: Date;
}

async function activeUserId(client: PoolClient, authUserId: string): Promise<string> {
  const result = await client.query<{ id: string }>(
    `select id from public.users where auth_user_id = $1 and active = true limit 1`,
    [authUserId],
  );
  const userId = result.rows[0]?.id;
  if (!userId) throw new AppError("User account is inactive", 403, "USER_INACTIVE");
  return userId;
}

export async function listDesignPalettes(authUserId: string, includeOwnedDrafts = false): Promise<InstitutionalDesignPalette[]> {
  const client = await pool.connect();
  try {
    const userId = await activeUserId(client, authUserId);
    const result = await client.query<InstitutionalDesignPalette>(
      `select id, name, description, colors, visibility, status,
              owner_user_id as "ownerUserId", updated_at as "updatedAt"
       from public.institutional_design_palettes
       where (status = 'published' and visibility = 'public')
          or ($2::boolean = true and owner_user_id = $1)
       order by case when owner_user_id = $1 then 0 else 1 end, updated_at desc`,
      [userId, includeOwnedDrafts],
    );
    return result.rows;
  } finally { client.release(); }
}

export async function createDesignPalette(authUserId: string, input: { name: string; description: string; colors: string[] }): Promise<InstitutionalDesignPalette> {
  const client = await pool.connect();
  try {
    const userId = await activeUserId(client, authUserId);
    const result = await client.query<InstitutionalDesignPalette>(
      `insert into public.institutional_design_palettes (owner_user_id, name, description, colors)
       values ($1, $2, $3, $4::jsonb)
       returning id, name, description, colors, visibility, status,
                 owner_user_id as "ownerUserId", updated_at as "updatedAt"`,
      [userId, input.name, input.description, JSON.stringify(input.colors)],
    );
    return result.rows[0]!;
  } finally { client.release(); }
}

export async function updateDesignPalette(authUserId: string, paletteId: string, input: { name: string; description: string; colors: string[] }): Promise<InstitutionalDesignPalette> {
  const client = await pool.connect();
  try {
    const userId = await activeUserId(client, authUserId);
    const result = await client.query<InstitutionalDesignPalette>(
      `update public.institutional_design_palettes
       set name = $3, description = $4, colors = $5::jsonb
       where id = $2 and owner_user_id = $1
       returning id, name, description, colors, visibility, status,
                 owner_user_id as "ownerUserId", updated_at as "updatedAt"`,
      [userId, paletteId, input.name, input.description, JSON.stringify(input.colors)],
    );
    const palette = result.rows[0];
    if (!palette) throw new AppError("Paleta não encontrada.", 404, "DESIGN_PALETTE_NOT_FOUND");
    return palette;
  } finally { client.release(); }
}

export async function publishDesignPalette(authUserId: string, paletteId: string): Promise<InstitutionalDesignPalette> {
  const client = await pool.connect();
  try {
    const userId = await activeUserId(client, authUserId);
    const result = await client.query<InstitutionalDesignPalette>(
      `update public.institutional_design_palettes
       set status = 'published', visibility = 'public'
       where id = $2 and owner_user_id = $1
       returning id, name, description, colors, visibility, status,
                 owner_user_id as "ownerUserId", updated_at as "updatedAt"`,
      [userId, paletteId],
    );
    const palette = result.rows[0];
    if (!palette) throw new AppError("Paleta não encontrada.", 404, "DESIGN_PALETTE_NOT_FOUND");
    return palette;
  } finally { client.release(); }
}

export async function listImageFrames(authUserId: string, includeOwnedDrafts = false): Promise<InstitutionalImageFrameResource[]> {
  const client = await pool.connect();
  try {
    const userId = await activeUserId(client, authUserId);
    const result = await client.query<InstitutionalImageFrameResource>(
      `select id, name, description, clip_path as "clipPath", visibility, status,
              owner_user_id as "ownerUserId", updated_at as "updatedAt"
       from public.institutional_image_frames
       where (status = 'published' and visibility = 'public')
          or ($2::boolean = true and owner_user_id = $1)
       order by case when owner_user_id = $1 then 0 else 1 end, updated_at desc`,
      [userId, includeOwnedDrafts],
    );
    return result.rows;
  } finally { client.release(); }
}

export async function createImageFrame(authUserId: string, input: { name: string; description: string; clipPath: string }): Promise<InstitutionalImageFrameResource> {
  const client = await pool.connect();
  try {
    const userId = await activeUserId(client, authUserId);
    const result = await client.query<InstitutionalImageFrameResource>(
      `insert into public.institutional_image_frames (owner_user_id, name, description, clip_path)
       values ($1, $2, $3, $4)
       returning id, name, description, clip_path as "clipPath", visibility, status,
                 owner_user_id as "ownerUserId", updated_at as "updatedAt"`,
      [userId, input.name, input.description, input.clipPath],
    );
    return result.rows[0]!;
  } finally { client.release(); }
}

export async function updateImageFrame(authUserId: string, frameId: string, input: { name: string; description: string; clipPath: string }): Promise<InstitutionalImageFrameResource> {
  const client = await pool.connect();
  try {
    const userId = await activeUserId(client, authUserId);
    const result = await client.query<InstitutionalImageFrameResource>(
      `update public.institutional_image_frames
       set name = $3, description = $4, clip_path = $5
       where id = $2 and owner_user_id = $1
       returning id, name, description, clip_path as "clipPath", visibility, status,
                 owner_user_id as "ownerUserId", updated_at as "updatedAt"`,
      [userId, frameId, input.name, input.description, input.clipPath],
    );
    const frame = result.rows[0];
    if (!frame) throw new AppError("Moldura não encontrada.", 404, "IMAGE_FRAME_NOT_FOUND");
    return frame;
  } finally { client.release(); }
}

export async function publishImageFrame(authUserId: string, frameId: string): Promise<InstitutionalImageFrameResource> {
  const client = await pool.connect();
  try {
    const userId = await activeUserId(client, authUserId);
    const result = await client.query<InstitutionalImageFrameResource>(
      `update public.institutional_image_frames
       set status = 'published', visibility = 'public'
       where id = $2 and owner_user_id = $1
       returning id, name, description, clip_path as "clipPath", visibility, status,
                 owner_user_id as "ownerUserId", updated_at as "updatedAt"`,
      [userId, frameId],
    );
    const frame = result.rows[0];
    if (!frame) throw new AppError("Moldura não encontrada.", 404, "IMAGE_FRAME_NOT_FOUND");
    return frame;
  } finally { client.release(); }
}
