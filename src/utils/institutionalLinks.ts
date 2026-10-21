/** Only safe navigation destinations may become clickable in public sites. */
export function safeInstitutionalHref(raw: string): string | null {
  const href = raw.trim();
  if (!href || (href.includes("\\") || Array.from(href).some((char) => char.charCodeAt(0) < 32))) return null;
  if (/^#[A-Za-z0-9_:-]*$/.test(href)) return href;
  if (/^\/(?!\/)[A-Za-z0-9/_?#%&=+.-]*$/.test(href)) return href;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(href)) return href;
  if (/^tel:[+()0-9. -]+$/i.test(href)) return href;
  try {
    const parsed = new URL(href);
    return ["https:", "http:"].includes(parsed.protocol) &&
      parsed.hostname &&
      !parsed.username &&
      !parsed.password
      ? href
      : null;
  } catch {
    return null;
  }
}
