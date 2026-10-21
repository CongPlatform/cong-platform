import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createDefaultSectionContent } from "../../../data/institutional/sectionCatalog";
import { findNativeDesignFamilyById, findNativeDesignFamilyByName } from "../../../data/institutional/nativeDesignFamilies";
import type {
  InstitutionalSectionType,
  InstitutionalVariant,
} from "../../../services/institutionalService";
import { previewBrandForVariant, previewContentForSection } from "../../../utils/institutionalPreview";
import { defaultSettingsForVariant, findRecommendedVariant } from "../../../utils/institutionalVariants";
import SectionRenderer from "../renderer/SectionRenderer";

import styles from "./LiveSectionThumbnail.module.css";

export default function LiveSectionThumbnail({
  sectionType,
  variants,
  preferredVariant,
  size = "compact",
}: {
  sectionType: InstitutionalSectionType;
  variants: InstitutionalVariant[];
  preferredVariant?: InstitutionalVariant;
  size?: "compact" | "large";
}) {
  const variant = preferredVariant ?? findRecommendedVariant(variants, sectionType);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const sourceWidth = size === "large" ? 1120 : 960;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const width = viewport.getBoundingClientRect().width;
      if (width > 0) setScale(width / sourceWidth);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [sourceWidth]);

  if (!variant) {
    return <div className={styles.fallback} data-size={size}>Prévia disponível ao abrir</div>;
  }

  const brand = previewBrandForVariant(variant);
  const family = findNativeDesignFamilyById(variant.familyKey) ?? findNativeDesignFamilyByName(variant.name);
  const section = {
    id: `preview-${sectionType}`,
    pageId: "preview-page",
    sectionType,
    variantVersionId: variant.versionId,
    position: 0,
    visible: true,
    content: previewContentForSection(sectionType, createDefaultSectionContent(sectionType), family?.id),
    settings: defaultSettingsForVariant(variant),
    variantId: variant.id,
    variantName: variant.name,
    variantVersion: variant.version,
    layout: variant.layout,
  };

  return (
    <div ref={viewportRef} className={styles.viewport} data-size={size} aria-hidden="true">
      <div
        className={styles.scaled}
        style={{ width: sourceWidth, transform: `scale(${scale})` } as CSSProperties}
      >
        <SectionRenderer section={section} brand={brand} />
      </div>
      <div className={styles.guard} />
    </div>
  );
}
