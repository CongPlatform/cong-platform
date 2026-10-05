import type { InstitutionalBrand, InstitutionalSection, InstitutionalVariant } from "../../../services/institutionalService";
import { defaultSettingsForVariant } from "../../../utils/institutionalVariants";
import SectionRenderer from "../renderer/SectionRenderer";

import styles from "./LiveVariantThumbnail.module.css";

export default function LiveVariantThumbnail({
  section,
  variant,
  brand,
}: {
  section: InstitutionalSection;
  variant: InstitutionalVariant;
  brand: InstitutionalBrand;
}) {
  const variantSettings = defaultSettingsForVariant(variant);
  const settings = {
    ...section.settings,
    ...variantSettings,
    sectionStyle: {
      ...(section.settings.sectionStyle && typeof section.settings.sectionStyle === "object"
        ? section.settings.sectionStyle
        : {}),
      ...(variantSettings.sectionStyle && typeof variantSettings.sectionStyle === "object"
        ? variantSettings.sectionStyle
        : {}),
    },
  } as Record<string, unknown>;
  delete settings.layoutOverride;

  const previewSection: InstitutionalSection = {
    ...section,
    variantId: variant.id,
    variantName: variant.name,
    variantVersion: variant.version,
    variantVersionId: variant.versionId,
    layout: variant.layout,
    settings,
  };

  return (
    <div className={styles.viewport} aria-hidden="true">
      <div className={styles.scaled}>
        <SectionRenderer section={previewSection} brand={brand} />
      </div>
      <div className={styles.guard} />
    </div>
  );
}
