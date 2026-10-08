import type { CSSProperties } from "react";
import { getSectionDefinition } from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalBrand,
  InstitutionalEditorConstraints,
  InstitutionalElementStyle,
  InstitutionalImageFrameResource,
  InstitutionalSection,
} from "../../../services/institutionalService";
import { contrastRatio } from "../../../utils/institutionalPalette";
import {
  institutionalColorCssVar,
  resolveInstitutionalColor,
} from "../../../utils/institutionalColors";
import {
  effectiveSectionLayout,
  ensureLayoutNodeIds,
  getSectionStyle,
} from "../../../utils/institutionalLayout";
import LayoutRenderer from "./LayoutRenderer";

import styles from "./InstitutionalRenderer.module.css";

function resolveSectionColor(
  value: string | undefined,
  brand: InstitutionalBrand | undefined,
): string | null {
  return resolveInstitutionalColor(value as never, brand) ?? null;
}

export default function SectionRenderer({
  section,
  brand,
  editable = false,
  showGuidance = false,
  selectedElementId,
  selectedElementIds = [],
  onSelectElement,
  onValueChange,
  onImageRequest,
  onElementValueChange,
  onElementImageRequest,
  onElementStyleChange,
  onMoveSelection,
  onMoveElement,
  onRemoveElement,
  frames = [],
  editorConstraints,
}: {
  section: InstitutionalSection;
  brand?: InstitutionalBrand;
  editable?: boolean;
  showGuidance?: boolean;
  selectedElementId?: string | null;
  selectedElementIds?: string[];
  onSelectElement?: (elementId: string, additive?: boolean) => void;
  onValueChange?: (path: Array<string | number>, value: unknown) => void;
  onImageRequest?: (path: Array<string | number>) => void;
  onElementValueChange?: (elementId: string, value: unknown) => void;
  onElementImageRequest?: (elementId: string) => void;
  onElementStyleChange?: (
    elementId: string,
    style: Partial<InstitutionalElementStyle>,
  ) => void;
  onMoveSelection?: (
    deltaX: number,
    deltaY: number,
    elementIds?: string[],
  ) => void;
  onMoveElement?: (elementId: string, direction: -1 | 1) => void;
  onRemoveElement?: (elementId: string) => void;
  frames?: InstitutionalImageFrameResource[];
  editorConstraints?: InstitutionalEditorConstraints;
}) {
  const layout = ensureLayoutNodeIds(
    effectiveSectionLayout(section.layout, section.settings),
  );
  const sectionStyle = getSectionStyle(section.settings);
  const header = section.sectionType === "site_header";
  const footer = section.sectionType === "site_footer";
  const Tag = header ? "header" : footer ? "footer" : "section";
  const background = sectionStyle.backgroundColor;
  const resolvedBackground = resolveSectionColor(background, brand);
  const footerBackground = footer
    ? (resolvedBackground ?? brand?.primaryColor ?? "#091c30")
    : resolvedBackground;
  const footerForeground =
    footer && footerBackground
      ? contrastRatio("#ffffff", footerBackground) >= 4.5
        ? "#ffffff"
        : (brand?.textColor ?? "#091c30")
      : null;

  const backgroundImageUrl = sectionStyle.backgroundImage?.url;
  const treatment = sectionStyle.backgroundTreatment ?? "original";
  const safeImageUrl = backgroundImageUrl?.replace(/["\n\r]/g, "");
  const treatmentLayer =
    treatment === "dark"
      ? "linear-gradient(rgb(9 28 48 / .56), rgb(9 28 48 / .56))"
      : treatment === "light"
        ? "linear-gradient(rgb(255 255 255 / .72), rgb(255 255 255 / .72))"
        : treatment === "brand"
          ? "linear-gradient(color-mix(in srgb, var(--org-primary) 52%, transparent), color-mix(in srgb, var(--org-primary) 52%, transparent))"
          : treatment === "gradient"
            ? "linear-gradient(90deg, rgb(9 28 48 / .72) 0%, rgb(9 28 48 / .38) 46%, transparent 82%)"
            : treatment === "soft"
              ? "linear-gradient(rgb(255 255 255 / .18), rgb(255 255 255 / .18))"
              : null;
  const imageBackground = safeImageUrl
    ? `${treatmentLayer ? `${treatmentLayer}, ` : ""}url("${safeImageUrl}")`
    : undefined;
  const imageTreatmentForeground =
    safeImageUrl && ["dark", "brand", "gradient"].includes(treatment)
      ? "#ffffff"
      : null;
  const effectiveSectionBackground = imageTreatmentForeground
    ? "#091c30"
    : (footerBackground ?? resolvedBackground ?? brand?.backgroundColor);

  const decorTone = sectionStyle.backgroundDecorTone ?? "mixed";
  const decorColor =
    decorTone === "primary"
      ? "var(--org-primary)"
      : decorTone === "secondary"
        ? "var(--org-secondary)"
        : decorTone === "accent"
          ? "var(--org-accent)"
          : "var(--org-accent)";
  const decorSecondaryColor =
    decorTone === "mixed" ? "var(--org-secondary)" : decorColor;
  const decorIntensity = Math.max(
    0,
    Math.min(100, sectionStyle.backgroundDecorIntensity ?? 55),
  );
  const decorScale = Math.max(
    60,
    Math.min(160, sectionStyle.backgroundDecorScale ?? 100),
  );
  const decorStrong = `${Math.round(8 + decorIntensity * 0.22)}%`;
  const decorSoft = `${Math.round(3 + decorIntensity * 0.11)}%`;
  const rendererData =
    header && brand?.logoAsset
      ? {
          ...section.content,
          brandLogo: {
            assetId: brand.logoAsset.id,
            url: brand.logoAsset.url,
            alt: "Logo da organização",
          },
        }
      : section.content;

  const sectionCss = {
    ...(background
      ? {
          "--section-background":
            institutionalColorCssVar(background) ?? background,
        }
      : footerBackground
        ? { "--section-background": footerBackground }
        : {}),
    "--section-decor-color": decorColor,
    "--section-decor-secondary": decorSecondaryColor,
    "--section-decor-strong": decorStrong,
    "--section-decor-soft": decorSoft,
    "--section-decor-scale": String(decorScale / 100),
    ...(imageBackground ? { backgroundImage: imageBackground } : {}),
    ...(imageBackground ? { backgroundSize: "cover" } : {}),
    ...(imageBackground
      ? {
          backgroundPosition: `${sectionStyle.backgroundPositionX ?? 50}% ${sectionStyle.backgroundPositionY ?? 50}%`,
        }
      : {}),
    ...(imageTreatmentForeground
      ? {
          "--org-text": imageTreatmentForeground,
          "--org-primary": imageTreatmentForeground,
        }
      : {}),
    ...(footerForeground ? { "--section-foreground": footerForeground } : {}),
  } as CSSProperties;

  return (
    <Tag
      id={`section-${section.id}`}
      className={`${styles.section} ${header ? styles.headerSection : ""} ${footer ? styles.footerSection : ""}`}
      data-section-type={section.sectionType}
      data-spacing={sectionStyle.spacing ?? "normal"}
      data-content-width={sectionStyle.contentWidth ?? "normal"}
      data-visual-style={
        typeof section.settings.visualStyle === "string"
          ? section.settings.visualStyle
          : undefined
      }
      data-background-treatment={imageBackground ? treatment : undefined}
      data-has-background-image={imageBackground ? "true" : "false"}
      data-background-decor={sectionStyle.backgroundDecor ?? "template"}
      data-background-decor-tone={decorTone}
      style={sectionCss}
    >
      <div className={styles.sectionInner} data-section-content="true">
        <LayoutRenderer
          node={layout}
          data={rendererData}
          editable={editable}
          sectionDefinition={getSectionDefinition(section.sectionType)}
          showGuidance={showGuidance}
          selectedElementId={selectedElementId}
          selectedElementIds={selectedElementIds}
          onSelectElement={onSelectElement}
          onValueChange={onValueChange}
          onImageRequest={onImageRequest}
          onElementValueChange={onElementValueChange}
          onElementImageRequest={onElementImageRequest}
          onElementStyleChange={onElementStyleChange}
          onMoveSelection={onMoveSelection}
          onMoveElement={onMoveElement}
          onRemoveElement={onRemoveElement}
          brand={brand}
          sectionBackground={effectiveSectionBackground}
          frames={frames}
          editorConstraints={editorConstraints}
        />
      </div>
    </Tag>
  );
}
