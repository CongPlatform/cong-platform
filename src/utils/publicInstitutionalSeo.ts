/**
 * Metadados da página pública da organização.
 * Não altera o HTML produzido pelo editor nem faz requisições externas.
 * Observação: os metadados são definidos no navegador; bots sem execução de
 * JavaScript ainda precisam de HTML pré-renderizado no servidor.
 */
import type {
  InstitutionalPage,
  InstitutionalSection,
  InstitutionalSite,
} from "../services/institutionalService";

const MAX_DESCRIPTION = 158;
const VALUE_KEYS = [
  "description", "subtitle", "summary", "lead", "body", "text", "paragraph",
  "intro", "tagline", "mission", "title", "headline",
];

function cleanText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function shortenText(value: string, length: number): string {
  const text = cleanText(value);
  if (text.length <= length) return text;
  const words = text.slice(0, length + 1);
  const lastSpace = words.lastIndexOf(" ");
  return `${words.slice(0, lastSpace > length / 2 ? lastSpace : length).trimEnd()}…`;
}

function isUsefulText(text: string): boolean {
  return text.length >= 30 &&
    !/^(ex\.?\s*:|lorem ipsum|clique aqui|adicionar |sua imagem aqui)/i.test(text);
}

function readPageDescription(page: InstitutionalPage): string | null {
  for (const section of page.sections) {
    if (!section.visible || section.sectionType === "site_header" || section.sectionType === "site_footer") continue;
    // Primeiro procura as propriedades de conteúdo conhecidas. Não há texto inventado.
    for (const key of VALUE_KEYS) {
      const value = section.content[key];
      if (typeof value === "string" && isUsefulText(cleanText(value))) {
        return shortenText(value, MAX_DESCRIPTION);
      }
    }
    const nested = firstUsefulText(section.content, 0);
    if (nested) return shortenText(nested, MAX_DESCRIPTION);
  }
  return null;
}

function firstUsefulText(value: unknown, depth: number): string | null {
  if (depth > 3 || !value) return null;
  if (typeof value === "string") {
    const text = cleanText(value);
    return isUsefulText(text) ? text : null;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 12)) {
      const result = firstUsefulText(item, depth + 1);
      if (result) return result;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of VALUE_KEYS) {
      const result = firstUsefulText(record[key], depth + 1);
      if (result) return result;
    }
    for (const [key, item] of Object.entries(record).slice(0, 20)) {
      if (["url", "href", "assetId", "alt", "email", "phone"].includes(key)) continue;
      const result = firstUsefulText(item, depth + 1);
      if (result) return result;
    }
  }
  return null;
}

function safeImageUrl(raw: unknown, origin: string): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = new URL(raw, origin);
    if (!(["https:", "http:"].includes(parsed.protocol)) || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function firstImageFromSection(section: InstitutionalSection, origin: string): string | null {
  const settings = section.settings.sectionStyle;
  if (settings && typeof settings === "object") {
    const background = (settings as Record<string, unknown>).backgroundImage;
    if (background && typeof background === "object") {
      const image = safeImageUrl((background as Record<string, unknown>).url, origin);
      if (image) return image;
    }
  }
  const visited = new WeakSet<object>();
  function visit(value: unknown, depth: number): string | null {
    if (!value || typeof value !== "object" || depth > 4 || visited.has(value)) return null;
    visited.add(value);
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 15)) {
        const found = visit(item, depth + 1);
        if (found) return found;
      }
    } else {
      const record = value as Record<string, unknown>;
      // Apenas campos de imagem; links de CTA não podem virar og:image.
      if ("assetId" in record || "alt" in record || "imageFit" in record) {
        const found = safeImageUrl(record.url, origin);
        if (found) return found;
      }
      for (const [key, item] of Object.entries(record).slice(0, 30)) {
        if (["image", "photo", "cover", "heroImage", "media", "photos", "items", "cards", "gallery"].includes(key)) {
          const found = visit(item, depth + 1);
          if (found) return found;
        }
      }
    }
    return null;
  }
  return visit(section.content, 0)
    ?? visit(section.settings.instanceElementValues, 0)
    ?? visit(section.layout, 0);
}

export interface PublicInstitutionalMetadata {
  title: string;
  description: string;
  canonical: string;
  image: string | null;
  imageAlt: string;
  organizationName: string;
  robots: string;
}

export function buildPublicInstitutionalMetadata(
  site: InstitutionalSite,
  page: InstitutionalPage,
  pageUrl: string,
): PublicInstitutionalMetadata {
  const org = cleanText(site.organization.name) || cleanText(site.name) || "Organização social";
  const pageTitle = cleanText(page.title);
  const title = page.isHome || !pageTitle || pageTitle.toLocaleLowerCase("pt-BR") === org.toLocaleLowerCase("pt-BR")
    ? org
    : `${pageTitle} | ${org}`;
  const description = readPageDescription(page) ?? `Conheça ${org} e suas iniciativas.`;
  const url = new URL(pageUrl);
  url.search = "";
  url.hash = "";
  const canonical = url.href;
  const origin = url.origin;
  const image = page.sections.filter((section) => section.visible)
    .map((section) => firstImageFromSection(section, origin))
    .find((value): value is string => Boolean(value))
    ?? safeImageUrl(site.brand.logoAsset?.url, origin);
  const { hostname } = new URL(canonical);
  const privateHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("dev.");
  return {
    title: shortenText(title, 70),
    description,
    canonical,
    image,
    imageAlt: `Imagem de ${org}`,
    organizationName: org,
    robots: privateHost ? "noindex, nofollow" : "index, follow, max-image-preview:large",
  };
}

/** Retorna funções de restauração para não contaminar metadados de outras rotas. */
export function applyPublicInstitutionalMetadata(metadata: PublicInstitutionalMetadata): () => void {
  const oldTitle = document.title;
  const restore: Array<() => void> = [];
  document.title = metadata.title;

  function meta(attribute: "name" | "property", key: string, value: string | null) {
    const selector = `meta[${attribute}="${key}"]`;
    const old = document.head.querySelector<HTMLMetaElement>(selector);
    const previous = old?.getAttribute("content") ?? null;
    if (value === null) {
      old?.remove();
      restore.push(() => {
        if (old && !document.head.contains(old)) document.head.appendChild(old);
      });
      return;
    }
    const item = old ?? document.createElement("meta");
    if (!old) {
      item.setAttribute(attribute, key);
      document.head.appendChild(item);
    }
    item.content = value;
    restore.push(() => {
      if (!old) item.remove();
      else if (previous === null) item.removeAttribute("content");
      else item.content = previous;
    });
  }

  function canonical(href: string) {
    const old = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previous = old?.getAttribute("href") ?? null;
    const item = old ?? document.createElement("link");
    if (!old) {
      item.rel = "canonical";
      document.head.appendChild(item);
    }
    item.href = href;
    restore.push(() => {
      if (!old) item.remove();
      else if (previous === null) item.removeAttribute("href");
      else item.setAttribute("href", previous);
    });
  }

  meta("name", "description", metadata.description);
  meta("name", "robots", metadata.robots);
  meta("name", "googlebot", metadata.robots);
  canonical(metadata.canonical);
  meta("property", "og:type", "website");
  meta("property", "og:site_name", metadata.organizationName);
  meta("property", "og:locale", "pt_BR");
  meta("property", "og:title", metadata.title);
  meta("property", "og:description", metadata.description);
  meta("property", "og:url", metadata.canonical);
  meta("property", "og:image", metadata.image);
  meta("property", "og:image:alt", metadata.image ? metadata.imageAlt : null);
  meta("name", "twitter:card", metadata.image ? "summary_large_image" : "summary");
  meta("name", "twitter:title", metadata.title);
  meta("name", "twitter:description", metadata.description);
  meta("name", "twitter:image", metadata.image);

  return () => {
    document.title = oldTitle;
    restore.reverse().forEach((fn) => fn());
  };
}
