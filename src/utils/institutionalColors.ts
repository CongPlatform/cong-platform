import type {
  InstitutionalBrand,
  InstitutionalColorRole,
  InstitutionalColorTone,
  InstitutionalColorValue,
} from "../services/institutionalService";

const ROLES: InstitutionalColorRole[] = [
  "primary",
  "secondary",
  "accent",
  "background",
  "text",
];
const TONES: InstitutionalColorTone[] = [
  "soft",
  "light",
  "base",
  "strong",
  "deep",
];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "000000";
  return [0, 2, 4].map(
    (offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255,
  ) as [number, number, number];
}

function linear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function gamma(value: number): number {
  const v = clamp(value);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
}

function rgbToOklch(hex: string): [number, number, number] {
  const [r0, g0, b0] = hexToRgb(hex);
  const r = linear(r0),
    g = linear(g0),
    b = linear(b0);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l),
    m_ = Math.cbrt(m),
    s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(a * a + bb * bb);
  const H = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
}

function oklchToHex(L: number, C: number, H: number): string {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3,
    m = m_ ** 3,
    ss = s_ ** 3;
  const r = gamma(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * ss);
  const g = gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * ss);
  const bl = gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * ss);
  return `#${[r, g, bl]
    .map((value) =>
      Math.round(clamp(value) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function deriveColorTone(
  hex: string,
  tone: InstitutionalColorTone,
): string {
  if (tone === "base") return hex.toLowerCase();
  const [L, C, H] = rgbToOklch(hex);
  const chroma = C < 0.015 ? C : C;
  if (tone === "soft") return oklchToHex(Math.max(L, 0.94), chroma * 0.28, H);
  if (tone === "light") return oklchToHex(Math.max(L, 0.8), chroma * 0.62, H);
  if (tone === "strong") return oklchToHex(Math.min(L, 0.55), chroma * 1.04, H);
  return oklchToHex(Math.min(L, 0.38), chroma * 0.88, H);
}

export function brandRoleHex(
  brand: InstitutionalBrand,
  role: InstitutionalColorRole,
): string {
  if (role === "primary") return brand.primaryColor;
  if (role === "secondary") return brand.secondaryColor;
  if (role === "accent") return brand.accentColor;
  if (role === "background") return brand.backgroundColor;
  return brand.textColor;
}

export function parseSemanticColor(
  value: string,
): { role: InstitutionalColorRole; tone: InstitutionalColorTone } | null {
  const [rawRole, rawTone] = value.split(".");
  if (!ROLES.includes(rawRole as InstitutionalColorRole)) return null;
  const tone =
    rawTone && TONES.includes(rawTone as InstitutionalColorTone)
      ? (rawTone as InstitutionalColorTone)
      : "base";
  return { role: rawRole as InstitutionalColorRole, tone };
}

export function resolveInstitutionalColor(
  value: InstitutionalColorValue | undefined,
  brand?: InstitutionalBrand,
): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("#")) return value;
  if (!brand) return undefined;
  const parsed = parseSemanticColor(value);
  if (!parsed) return undefined;
  return deriveColorTone(brandRoleHex(brand, parsed.role), parsed.tone);
}

export function institutionalColorCssVar(
  value: InstitutionalColorValue | undefined,
): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("#")) return value;
  const parsed = parseSemanticColor(value);
  if (!parsed) return undefined;
  return `var(--org-${parsed.role}-${parsed.tone}, var(--org-${parsed.role}))`;
}

export function buildBrandCssVariables(
  brand: InstitutionalBrand,
): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const role of ROLES) {
    const base = brandRoleHex(brand, role);
    variables[`--org-${role}`] = base;
    for (const tone of TONES)
      variables[`--org-${role}-${tone}`] = deriveColorTone(base, tone);
  }
  return variables;
}

export const institutionalColorTones = TONES;
export const institutionalColorRoles = ROLES;
