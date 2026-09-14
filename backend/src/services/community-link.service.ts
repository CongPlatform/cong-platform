import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import pool from "../config/database.js";
import { AppError } from "../utils/app-error.js";
import {
  activeCommunityUser,
  type CommunityLinkPreview,
} from "./community-media.service.js";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(address, prefix, "ipv4");
export function isPublicPreviewIPv4(address: string): boolean {
  return isIP(address) === 4 && !blocked.check(address, "ipv4");
}
export function parsePreviewUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AppError(
      "Cole um link HTTPS válido.",
      400,
      "INVALID_PREVIEW_URL",
    );
  }
  if (
    raw.length > 1000 ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.hostname.endsWith(".") ||
    isIP(url.hostname) ||
    url.hostname.includes(":")
  )
    throw new AppError(
      "Use um endereço HTTPS público, sem credenciais ou porta personalizada.",
      400,
      "INVALID_PREVIEW_URL",
    );
  url.hash = "";
  return url;
}
async function fetchHtml(
  url: URL,
  redirects = 0,
): Promise<{ url: URL; html: string }> {
  if (redirects > 3) throw new Error("Too many redirects");
  // Only IPv4 is used; the request is pinned to the checked address so DNS cannot change it.
  const answers = await lookup(url.hostname, { family: 4, all: true });
  if (!answers.length || answers.some((a) => !isPublicPreviewIPv4(a.address)))
    throw new Error("Non-public address");
  const result = await new Promise<{ location?: string; html?: string }>(
    (resolve, reject) => {
      const req = request(
        url,
        {
          method: "GET",
          family: 4,
          agent: false,
          lookup: (_host, options, callback) => {
            if (options.all)
              callback(null, [{ address: answers[0]!.address, family: 4 }]);
            else callback(null, answers[0]!.address, 4);
          },
          headers: {
            "User-Agent": "CONG-LinkPreview/2.6",
            Accept: "text/html",
            "Accept-Encoding": "identity",
          },
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode ?? 0)) {
            res.resume();
            resolve({ location: res.headers.location ?? "" });
            return;
          }
          if (
            res.statusCode !== 200 ||
            !res.headers["content-type"]?.toLowerCase().includes("text/html")
          ) {
            res.destroy();
            reject(new Error("Not HTML"));
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 524288) {
              res.destroy(new Error("Preview too large"));
              return;
            }
            chunks.push(chunk);
          });
          res.on("end", () =>
            resolve({ html: Buffer.concat(chunks).toString("utf8") }),
          );
          res.on("error", reject);
        },
      );
      const timer = setTimeout(
        () => req.destroy(new Error("Preview timeout")),
        4000,
      );
      req.on("close", () => clearTimeout(timer));
      req.on("error", reject);
      req.end();
    },
  );
  if (result.location !== undefined)
    return fetchHtml(
      parsePreviewUrl(new URL(result.location, url).href),
      redirects + 1,
    );
  return { url, html: result.html ?? "" };
}
function decode(value: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
  };
  return value
    .replace(
      /&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,
      (_match, key: string) => {
        if (key.startsWith("#")) {
          const n =
            key[1]?.toLowerCase() === "x"
              ? parseInt(key.slice(2), 16)
              : parseInt(key.slice(1), 10);
          return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
        }
        return entities[key.toLowerCase()] ?? "";
      },
    )
    .replace(/\s+/g, " ")
    .trim();
}
export function parsePreviewHtml(
  html: string,
  hostname: string,
): { title: string; description: string } {
  const tags: Record<string, string> = {};
  for (const tag of html.match(/<meta\s[^>]{0,8000}>/gi) ?? []) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
    ))
      attrs[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
    const key = attrs.property ?? attrs.name;
    if (key && attrs.content) tags[key.toLowerCase()] = attrs.content;
  }
  return {
    title: decode(
      tags["og:title"] ??
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ??
        hostname,
    ).slice(0, 200),
    description: decode(tags["og:description"] ?? tags.description ?? "").slice(
      0,
      500,
    ),
  };
}
const recent = new Map<string, number>();
export async function createCommunityLinkPreview(
  authUserId: string,
  raw: string,
): Promise<CommunityLinkPreview> {
  const url = parsePreviewUrl(raw);
  const client = await pool.connect();
  try {
    await activeCommunityUser(client, authUserId);
  } finally {
    client.release();
  }
  const cached = await pool.query<CommunityLinkPreview>(
    "select id,url,title,description,hostname from public.community_link_previews where url=$1 and fetched_at>now()-interval '1 day'",
    [url.href],
  );
  if (cached.rows[0]) return cached.rows[0];
  const now = Date.now();
  for (const [id, time] of recent) if (now - time > 10000) recent.delete(id);
  if (recent.has(authUserId))
    throw new AppError(
      "Aguarde alguns segundos antes de gerar outra prévia.",
      429,
      "PREVIEW_RATE_LIMIT",
    );
  recent.set(authUserId, now);
  try {
    const result = await fetchHtml(url);
    const metadata = parsePreviewHtml(result.html, result.url.hostname);
    const saved = await pool.query<CommunityLinkPreview>(
      `insert into public.community_link_previews(url,title,description,hostname) values($1,$2,$3,$4)
      on conflict(url) do update set title=excluded.title,description=excluded.description,hostname=excluded.hostname,fetched_at=now()
      returning id,url,title,description,hostname`,
      [url.href, metadata.title, metadata.description, result.url.hostname],
    );
    return saved.rows[0]!;
  } catch {
    throw new AppError(
      "Não foi possível gerar a prévia deste site. O link pode continuar no texto.",
      422,
      "COMMUNITY_PREVIEW_UNAVAILABLE",
    );
  }
}
