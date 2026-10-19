/** Curated open-license families served by the public Google Fonts CSS API.
 * The catalog is an allowlist, not an arbitrary user-controlled CSS value.
 * No developer key or user account is needed. */
export const FONT_CATALOG = [
  { name: "Inter", group: "Sem serifa" },
  { name: "Roboto", group: "Sem serifa" },
  { name: "Open Sans", group: "Sem serifa" },
  { name: "Lato", group: "Sem serifa" },
  { name: "Montserrat", group: "Sem serifa" },
  { name: "Poppins", group: "Sem serifa" },
  { name: "Nunito Sans", group: "Sem serifa" },
  { name: "Nunito", group: "Sem serifa" },
  { name: "Raleway", group: "Sem serifa" },
  { name: "Work Sans", group: "Sem serifa" },
  { name: "DM Sans", group: "Sem serifa" },
  { name: "Manrope", group: "Sem serifa" },
  { name: "Outfit", group: "Sem serifa" },
  { name: "Rubik", group: "Sem serifa" },
  { name: "Urbanist", group: "Sem serifa" },
  { name: "Quicksand", group: "Sem serifa" },
  { name: "Mulish", group: "Sem serifa" },
  { name: "Cabin", group: "Sem serifa" },
  { name: "Karla", group: "Sem serifa" },
  { name: "Figtree", group: "Sem serifa" },
  { name: "Josefin Sans", group: "Sem serifa" },
  { name: "Ubuntu", group: "Sem serifa" },
  { name: "Source Sans 3", group: "Sem serifa" },
  { name: "Public Sans", group: "Sem serifa" },
  { name: "Plus Jakarta Sans", group: "Sem serifa" },
  { name: "Barlow", group: "Sem serifa" },
  { name: "Barlow Condensed", group: "Sem serifa" },
  { name: "Space Grotesk", group: "Sem serifa" },
  { name: "Sora", group: "Sem serifa" },
  { name: "Playfair Display", group: "Serifada" },
  { name: "Merriweather", group: "Serifada" },
  { name: "Lora", group: "Serifada" },
  { name: "Libre Baskerville", group: "Serifada" },
  { name: "Cormorant Garamond", group: "Serifada" },
  { name: "EB Garamond", group: "Serifada" },
  { name: "DM Serif Display", group: "Serifada" },
  { name: "Crimson Pro", group: "Serifada" },
  { name: "Alegreya", group: "Serifada" },
  { name: "Fraunces", group: "Serifada" },
  { name: "Prata", group: "Serifada" },
  { name: "Bitter", group: "Serifada" },
  { name: "Spectral", group: "Serifada" },
  { name: "Abril Fatface", group: "Destaque" },
  { name: "Bebas Neue", group: "Destaque" },
  { name: "Oswald", group: "Destaque" },
  { name: "Anton", group: "Destaque" },
  { name: "Archivo Black", group: "Destaque" },
  { name: "Pacifico", group: "Manuscrita" },
  { name: "Caveat", group: "Manuscrita" },
  { name: "Dancing Script", group: "Manuscrita" },
  { name: "Patrick Hand", group: "Manuscrita" },
  { name: "Great Vibes", group: "Manuscrita" },
] as const;

export type GoogleFontFamily = (typeof FONT_CATALOG)[number]["name"];
const known = new Set<string>(FONT_CATALOG.map((entry) => entry.name));
export function isGoogleFont(value: unknown): value is GoogleFontFamily {
  return typeof value === "string" && known.has(value);
}
export function fontCssStack(family: string): string {
  if (!isGoogleFont(family)) return "var(--org-body-font, sans-serif)";
  const serif =
    FONT_CATALOG.find((entry) => entry.name === family)?.group === "Serifada";
  return `"${family}", ${serif ? "Georgia, serif" : "Arial, sans-serif"}`;
}

const loaded = new Set<string>();
/** Adds only the CSS for actually used families. Browser caching handles repeat visits. */
export function ensureFontsLoaded(fonts: Iterable<string>): void {
  if (typeof document === "undefined") return;
  for (const family of fonts) {
    if (!isGoogleFont(family) || loaded.has(family)) continue;
    loaded.add(family);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}&display=swap`;
    link.dataset.congFont = family;
    document.head.appendChild(link);
  }
}
