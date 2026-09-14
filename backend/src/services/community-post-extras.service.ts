import type { PoolClient } from "pg";
import { AppError } from "../utils/app-error.js";
import type { CreateCommunityPostInput } from "../validators/community.validator.js";
import {
  organizationMentionToken,
  type CommunityMention,
} from "./community-media.service.js";

export async function saveCommunityPostExtras(
  client: PoolClient,
  postId: string,
  userId: string,
  input: CreateCommunityPostInput,
): Promise<void> {
  // Lock the post before changing attachment ownership or comparing previous mentions.
  const current = await client.query<{ mentions: CommunityMention[] }>(
    "select mentions from public.community_posts where id=$1 for update",
    [postId],
  );
  if (input.mediaIds !== undefined) {
    const ids = [...new Set(input.mediaIds)];
    const media = await client.query<{ id: string }>(
      `select id from public.community_media where id=any($1::uuid[]) and owner_user_id=$2
      and (post_id is null or post_id=$3) order by id for update`,
      [ids, userId, postId],
    );
    if (media.rows.length !== ids.length)
      throw new AppError(
        "Um anexo não pertence à sua conta ou já está em outra publicação.",
        403,
        "COMMUNITY_MEDIA_ACCESS_DENIED",
      );
    await client.query(
      "update public.community_media set post_id=null where post_id=$1 and not(id=any($2::uuid[]))",
      [postId, ids],
    );
    await client.query(
      "update public.community_media set post_id=$1 where id=any($2::uuid[])",
      [postId, ids],
    );
  }
  if (input.linkPreviewId !== undefined) {
    if (input.linkPreviewId) {
      const valid = await client.query(
        "select id from public.community_link_previews where id=$1",
        [input.linkPreviewId],
      );
      if (!valid.rows.length)
        throw new AppError(
          "Gere novamente a prévia do link.",
          400,
          "COMMUNITY_PREVIEW_INVALID",
        );
    }
    await client.query(
      "update public.community_posts set link_preview_id=$2 where id=$1",
      [postId, input.linkPreviewId],
    );
  }
  const text = `${input.title}\n${input.summary}\n${input.content}`;
  const supplied = input.mentions ?? current.rows[0]?.mentions ?? [];
  const verified: CommunityMention[] = [];
  for (const m of supplied) {
    if (m.entityType === "user") {
      const result = await client.query<{ username: string; name: string }>(
        "select username,coalesce(display_name,name) name from public.users where id=$1 and active=true and username is not null",
        [m.entityId],
      );
      const row = result.rows[0];
      if (row)
        verified.push({
          entityType: "user",
          entityId: m.entityId,
          token: `@${row.username}`,
          displayName: row.name,
        });
    } else {
      const result = await client.query<{ name: string }>(
        "select name from public.organizations where id=$1 and active=true",
        [m.entityId],
      );
      const row = result.rows[0];
      if (row)
        verified.push({
          entityType: "organization",
          entityId: m.entityId,
          token: organizationMentionToken(row.name),
          displayName: row.name,
        });
    }
  }
  // Typed usernames work even without choosing an autocomplete suggestion.
  const usernames = [
    ...text.matchAll(
      /(?:^|[^\p{L}\p{N}._@])@([A-Za-z0-9._]{3,30})(?![\p{L}\p{N}_])/gu,
    ),
  ].map((m) => m[1]!.toLowerCase().replace(/\.+$/, ""));
  if (usernames.length) {
    const users = await client.query<{
      id: string;
      username: string;
      name: string;
    }>(
      "select id,username,coalesce(display_name,name) name from public.users where active=true and lower(username)=any($1::text[]) limit 20",
      [usernames],
    );
    for (const u of users.rows)
      if (
        !verified.some(
          (m) => m.token.toLowerCase() === `@${u.username}`.toLowerCase(),
        )
      )
        verified.push({
          entityType: "user",
          entityId: u.id,
          token: `@${u.username}`,
          displayName: u.name,
        });
  }
  const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mentions = verified
    .filter(
      (m, i, all) =>
        new RegExp(
          `(?:^|[^\\p{L}\\p{N}._@])${escape(m.token)}(?![\\p{L}\\p{N}_]|\\.[\\p{L}\\p{N}_])`,
          "iu",
        ).test(text) &&
        all.findIndex(
          (other) => other.token.toLowerCase() === m.token.toLowerCase(),
        ) === i,
    )
    .slice(0, 20);
  const old = current.rows[0]?.mentions ?? [];
  for (const m of mentions) {
    if (
      old.some(
        (o) => o.entityType === m.entityType && o.entityId === m.entityId,
      )
    )
      continue;
    const recipients =
      m.entityType === "user"
        ? [m.entityId]
        : (
            await client.query<{ user_id: string }>(
              "select distinct user_id from public.organization_users where organization_id=$1 and status='active'",
              [m.entityId],
            )
          ).rows.map((r) => r.user_id);
    for (const recipient of recipients)
      if (recipient !== userId)
        await client.query(
          `insert into public.community_notifications(user_id,actor_user_id,notification_type,dedupe_key,post_id)
      values($1,$2,'post_mention',$3,$4) on conflict(dedupe_key) do nothing`,
          [recipient, userId, `mention:${postId}:${recipient}`, postId],
        );
  }
  const detailTags =
    "tags" in input.details
      ? input.details.tags
      : "skills" in input.details
        ? input.details.skills
        : "topic" in input.details
          ? [input.details.topic]
          : [];
  const hashtags = [
    ...text.matchAll(/(?:^|[^\p{L}\p{N}_])#([\p{L}\p{N}_-]{1,80})/gu),
  ].map((m) => m[1]!);
  const tags = [
    ...new Set(
      [...detailTags, ...hashtags]
        .map((t) => t.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 40);
  await client.query(
    "update public.community_posts set mentions=$2::jsonb,searchable_tags=$3 where id=$1",
    [postId, JSON.stringify(mentions), tags],
  );
}
