/**
 * Site Builder 2.0 — organization design tokens.
 * Values are fixed allow-listed CSS choices. No user-provided CSS is injected.
 * Legacy records and already-published snapshots keep their original look.
 */
import type {
  InstitutionalBrand,
  InstitutionalDesignSystem,
  InstitutionalTypeRole,
  InstitutionalTypeStyle,
} from "../../../services/institutionalService";
import { fontCssStack, isGoogleFont } from "./fontCatalog";

export const DEFAULT_DESIGN_SYSTEM: InstitutionalDesignSystem = {
  headingFamily: "legacy",
  bodyFamily: "legacy",
  headingScale: "standard",
  bodyScale: "standard",
  spacing: "standard",
  corners: "original",
  textStyles: {},
};

const families = {
  sans: "Arial, Helvetica, sans-serif",
  editorial: 'Georgia, "Times New Roman", serif',
  humanist: '"Trebuchet MS", "Segoe UI", sans-serif',
  rounded: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
} as const;

function choose<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export const TYPE_ROLES: Array<{ key: InstitutionalTypeRole; label: string }> =
  [
    { key: "display", label: "Título principal" },
    { key: "heading", label: "Título de seção" },
    { key: "subheading", label: "Subtítulo" },
    { key: "body", label: "Corpo do texto" },
    { key: "caption", label: "Legenda" },
    { key: "button", label: "Botão" },
  ];
const DEFAULT_TYPE_SIZES: Record<InstitutionalTypeRole, number> = {
  display: 56,
  heading: 36,
  subheading: 24,
  body: 16,
  caption: 13,
  button: 16,
};
export function normalizeVisualFont(
  value: unknown,
): InstitutionalDesignSystem["headingFamily"] {
  if (isGoogleFont(value)) return value;
  return choose(
    value,
    ["legacy", "sans", "editorial", "humanist", "rounded"] as const,
    "legacy",
  );
}
function normalizeTextStyles(
  value: unknown,
): InstitutionalDesignSystem["textStyles"] {
  if (!value || typeof value !== "object") return {};
  const styles = value as Record<string, unknown>;
  const result: NonNullable<InstitutionalDesignSystem["textStyles"]> = {};
  for (const { key } of TYPE_ROLES) {
    const item = styles[key];
    if (!item || typeof item !== "object") continue;
    const typed = item as Record<string, unknown>;
    if (
      typeof typed.size !== "number" ||
      !Number.isInteger(typed.size) ||
      typed.size < 10 ||
      typed.size > 160 ||
      ![400, 500, 600, 700, 800].includes(typed.weight as number) ||
      typeof typed.family !== "string" ||
      normalizeVisualFont(typed.family) !== typed.family
    )
      continue;
    result[key] = {
      family: typed.family,
      size: typed.size,
      weight: typed.weight as InstitutionalTypeStyle["weight"],
    };
  }
  return result;
}
export function typeRoleStyle(
  brand: Pick<InstitutionalBrand, "designSystem">,
  role: InstitutionalTypeRole,
): InstitutionalTypeStyle {
  const config = resolveDesignSystem(brand);
  return (
    config.textStyles?.[role] ?? {
      family: ["body", "caption", "button"].includes(role)
        ? config.bodyFamily
        : config.headingFamily,
      size: DEFAULT_TYPE_SIZES[role],
      weight: ["body", "caption"].includes(role) ? 400 : 700,
    }
  );
}
export function designFontCss(family: string, legacy: string): string {
  return isGoogleFont(family)
    ? fontCssStack(family)
    : family === "legacy"
      ? legacy
      : (families[family as keyof typeof families] ?? legacy);
}

export function resolveDesignSystem(
  brand: Pick<InstitutionalBrand, "designSystem">,
): InstitutionalDesignSystem {
  const value = brand.designSystem;
  if (!value || typeof value !== "object") return { ...DEFAULT_DESIGN_SYSTEM };
  return {
    headingFamily: normalizeVisualFont(value.headingFamily),
    bodyFamily: normalizeVisualFont(value.bodyFamily),
    headingScale: choose(
      value.headingScale,
      ["compact", "standard", "expressive"],
      "standard",
    ),
    bodyScale: choose(
      value.bodyScale,
      ["compact", "standard", "relaxed"],
      "standard",
    ),
    spacing: choose(
      value.spacing,
      ["compact", "standard", "spacious"],
      "standard",
    ),
    corners: choose(
      value.corners,
      ["original", "square", "subtle", "rounded"],
      "original",
    ),
    textStyles: normalizeTextStyles(value.textStyles),
    logos: value.logos
      ? {
          compact: value.logos.compact ?? null,
          light: value.logos.light ?? null,
          dark: value.logos.dark ?? null,
        }
      : {},
  };
}

export function designSystemCssVariables(
  brand: Pick<InstitutionalBrand, "designSystem" | "headingFont" | "bodyFont">,
  legacyFont: (font: InstitutionalBrand["headingFont"]) => string,
): Record<string, string> {
  const theme = resolveDesignSystem(brand);
  const corners = {
    original: ["22px", "24px", "999px"],
    square: ["0px", "0px", "0px"],
    subtle: ["8px", "8px", "7px"],
    rounded: ["32px", "32px", "18px"],
  } as const;
  const [card, image, button] = corners[theme.corners];
  return {
    "--org-heading-font": designFontCss(
      theme.headingFamily,
      legacyFont(brand.headingFont),
    ),
    "--org-body-font": designFontCss(
      theme.bodyFamily,
      legacyFont(brand.bodyFont),
    ),
    "--org-heading-scale": {
      compact: "0.87",
      standard: "1",
      expressive: "1.14",
    }[theme.headingScale],
    "--org-body-scale": { compact: "0.94", standard: "1", relaxed: "1.08" }[
      theme.bodyScale
    ],
    "--org-space-scale": { compact: "0.78", standard: "1", spacious: "1.22" }[
      theme.spacing
    ],
    "--org-radius-card": card,
    "--org-radius-image": image,
    "--org-radius-button": button,
  };
}
