import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import pool from "../config/database.js";
import { supabaseAdmin } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";
import { getAvatarPublicUrl } from "./avatar.service.js";

const bucket = () => supabaseAdmin.storage.from("community-media");
export interface CommunityMedia {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}
export interface StoredCommunityMedia extends Omit<CommunityMedia, "url"> {
  storagePath: string;
}
export interface CommunityMention {
  entityType: "user" | "organization";
  entityId: string;
  token: string;
  displayName: string;
  avatarUrl?: string | null;
}
export interface CommunityLinkPreview {
  id: string;
  url: string;
  title: string;
  description: string;
  hostname: string;
}
export const mediaSelect = `coalesce((select jsonb_agg(jsonb_build_object(
  'id',m.id,'name',m.name,'mimeType',m.mime_type,'sizeBytes',m.size_bytes,'storagePath',m.storage_path) order by m.created_at,m.id)
  from public.community_media m where m.post_id=cp.id), '[]'::jsonb) as media,
  cp.mentions, (select jsonb_build_object('id',l.id,'url',l.url,'title',l.title,'description',l.description,'hostname',l.hostname)
  from public.community_link_previews l where l.id=cp.link_preview_id) as "linkPreview",`;

export async function signCommunityMedia(
  media: StoredCommunityMedia[],
): Promise<CommunityMedia[]> {
  if (!media.length) return [];
  const { data, error } = await bucket().createSignedUrls(
    media.map((m) => m.storagePath),
    3600,
  );
  if (error || !data)
    return media.map((m) => ({
      id: m.id,
      name: m.name,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      url: "",
    }));
  return media.map((m, i) => ({
    id: m.id,
    name: m.name,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    url: data[i]?.signedUrl ?? "",
  }));
}

export function detectMediaType(buffer: Buffer): string | null {
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return "image/jpeg";
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  if (buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export async function activeCommunityUser(
  client: PoolClient,
  authUserId: string,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    "select id from public.users where auth_user_id=$1 and active=true",
    [authUserId],
  );
  if (!result.rows[0])
    throw new AppError("Conta indisponível.", 403, "USER_INACTIVE");
  return result.rows[0].id;
}

export async function uploadCommunityMedia(
  authUserId: string,
  file: Express.Multer.File,
): Promise<CommunityMedia> {
  const mimeType = detectMediaType(file.buffer);
  if (
    !mimeType ||
    mimeType !== file.mimetype ||
    !file.size ||
    file.size > 4194304
  )
    throw new AppError(
      "Envie JPG, PNG, WebP ou PDF de até 4 MB, com conteúdo compatível com o formato.",
      400,
      "INVALID_COMMUNITY_MEDIA",
    );
  const client = await pool.connect();
  let path: string | undefined;
  try {
    await client.query("begin");
    const owner = await activeCommunityUser(client, authUserId);
    // Serializes quota checks across instances, including serverless workers.
    await client.query("select id from public.users where id=$1 for update", [
      owner,
    ]);
    const expired = await client.query<{ id: string; storage_path: string }>(
      "select id,storage_path from public.community_media where owner_user_id=$1 and post_id is null and created_at<now()-interval '24 hours' order by id for update",
      [owner],
    );
    if (expired.rows.length) {
      const removed = await bucket().remove(
        expired.rows.map((m) => m.storage_path),
      );
      if (!removed.error)
        await client.query(
          "delete from public.community_media where id=any($1::uuid[])",
          [expired.rows.map((m) => m.id)],
        );
    }
    const count = await client.query<{ count: number }>(
      "select count(*)::int as count from public.community_media where owner_user_id=$1 and post_id is null",
      [owner],
    );
    if ((count.rows[0]?.count ?? 0) >= 20)
      throw new AppError(
        "Você tem muitos anexos pendentes. Remova os que não vai usar.",
        429,
        "COMMUNITY_MEDIA_QUOTA",
      );
    const id = randomUUID();
    const ext = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "application/pdf": "pdf",
    }[mimeType];
    path = `${owner}/${id}.${ext}`;
    const name =
      Array.from(file.originalname)
        .map((char) =>
          char.charCodeAt(0) < 32 || char === "/" || char === "\\" ? "_" : char,
        )
        .join("")
        .slice(0, 180) || `anexo.${ext}`;
    const { error } = await bucket().upload(path, file.buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (error)
      throw new AppError(
        "Não foi possível enviar o anexo. Confira a configuração de armazenamento.",
        503,
        "COMMUNITY_UPLOAD_FAILED",
      );
    await client.query(
      "insert into public.community_media(id,owner_user_id,storage_path,name,mime_type,size_bytes) values($1,$2,$3,$4,$5,$6)",
      [id, owner, path, name, mimeType, file.size],
    );
    const result = await signCommunityMedia([
      { id, name, mimeType, sizeBytes: file.size, storagePath: path },
    ]);
    await client.query("commit");
    return result[0]!;
  } catch (error) {
    await client.query("rollback");
    if (path) await bucket().remove([path]);
    throw error;
  } finally {
    client.release();
  }
}

export async function removeCommunityMedia(
  authUserId: string,
  id: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const owner = await activeCommunityUser(client, authUserId);
    const result = await client.query<{ storage_path: string }>(
      "select storage_path from public.community_media where id=$1 and owner_user_id=$2 and post_id is null for update",
      [id, owner],
    );
    if (!result.rows[0])
      throw new AppError(
        "Anexo indisponível ou já publicado.",
        409,
        "COMMUNITY_MEDIA_ATTACHED",
      );
    const { error } = await bucket().remove([result.rows[0].storage_path]);
    if (error)
      throw new AppError(
        "Não foi possível remover o anexo.",
        503,
        "COMMUNITY_MEDIA_DELETE_FAILED",
      );
    await client.query("delete from public.community_media where id=$1", [id]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function organizationMentionToken(name: string): string {
  return `@${name.trim().replace(/[^\p{L}\p{N}._]+/gu, "_")}`;
}

export async function findCommunityMentions(
  authUserId: string,
  query: string,
): Promise<CommunityMention[]> {
  const client = await pool.connect();
  try {
    await activeCommunityUser(client, authUserId);
    if (query.trim().length < 1) return [];
    const q = query.trim().slice(0, 80);
    const users = await client.query<{
      id: string;
      name: string;
      username: string;
      avatarPath: string | null;
    }>(
      `select id,coalesce(display_name,name) name,username,avatar_path as "avatarPath" from public.users
      where active=true and username is not null and (starts_with(lower(username),lower($1)) or starts_with(lower(coalesce(display_name,name)),lower($1))) order by username limit 6`,
      [q],
    );
    const orgs = await client.query<{ id: string; name: string }>(
      "select id,name from public.organizations where active=true and starts_with(lower(name),lower($1)) order by name,id limit 4",
      [q.replaceAll("_", " ")],
    );
    return [
      ...users.rows.map((u) => ({
        entityType: "user" as const,
        entityId: u.id,
        token: `@${u.username}`,
        displayName: u.name,
        avatarUrl: getAvatarPublicUrl(u.avatarPath),
      })),
      ...orgs.rows.map((o) => ({
        entityType: "organization" as const,
        entityId: o.id,
        token: organizationMentionToken(o.name),
        displayName: o.name,
        avatarUrl: null,
      })),
    ];
  } finally {
    client.release();
  }
}

export async function getCommunityPublishingOrganizations(authUserId: string) {
  const client = await pool.connect();
  try {
    const user = await activeCommunityUser(client, authUserId);
    const result = await client.query<{ id: string; name: string }>(
      `select distinct o.id,o.name from public.organizations o join public.organization_users ou on ou.organization_id=o.id
     where ou.user_id=$1 and ou.status='active' and o.active=true order by o.name`,
      [user],
    );
    return result.rows;
  } finally {
    client.release();
  }
}
