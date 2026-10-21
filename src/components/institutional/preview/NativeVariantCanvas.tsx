import { createDefaultSectionContent } from "../../../data/institutional/sectionCatalog";
import { findNativeDesignFamilyById, findNativeDesignFamilyByName } from "../../../data/institutional/nativeDesignFamilies";
import type { InstitutionalSectionType, InstitutionalVariant } from "../../../services/institutionalService";
import { previewBrandForVariant, previewContentForSection } from "../../../utils/institutionalPreview";
import { defaultSettingsForVariant } from "../../../utils/institutionalVariants";
import SectionRenderer from "../renderer/SectionRenderer";

export default function NativeVariantCanvas({
  sectionType,
  variant,
}: {
  sectionType: InstitutionalSectionType;
  variant: InstitutionalVariant;
}) {
  const family = findNativeDesignFamilyById(variant.familyKey) ?? findNativeDesignFamilyByName(variant.name);
  const section = {
    id: `preview-${variant.versionId}`,
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
  return <SectionRenderer section={section} brand={previewBrandForVariant(variant)} />;
}
