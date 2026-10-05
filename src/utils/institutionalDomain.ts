const reservedPublicHosts = new Set(["www", "dev", "api", "app"]);

export function institutionalRootDomain(): string {
  return (import.meta.env.VITE_PUBLIC_SITE_ROOT_DOMAIN as string | undefined)?.trim() || "cong.com.br";
}

export function institutionalPublicUrl(publicSlug: string): string {
  const slug = publicSlug.trim();
  const hostname = window.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${window.location.origin}/o/${encodeURIComponent(slug)}`;
  }

  return `https://${slug}.${institutionalRootDomain()}`;
}

export function institutionalSlugFromHostname(hostname: string): string | null {
  const root = institutionalRootDomain().toLowerCase();
  const normalized = hostname.toLowerCase().split(":")[0] ?? hostname.toLowerCase();

  if (normalized === root || !normalized.endsWith(`.${root}`)) {
    return null;
  }

  const prefix = normalized.slice(0, -(root.length + 1));
  if (!prefix || prefix.includes(".") || reservedPublicHosts.has(prefix)) {
    return null;
  }

  return /^[a-z0-9-]+$/.test(prefix) ? prefix : null;
}
