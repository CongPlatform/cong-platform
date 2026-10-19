/**
 * Composition contract — foundation only, no decorative mock templates.
 *
 * The live variant layout is the preview/placement source of truth.
 * Patch 03 will populate an authored composition library using this contract.
 */
import type {
  InstitutionalLayoutNode,
  InstitutionalSectionType,
  InstitutionalVariant,
} from "../../../services/institutionalService";

export type BuilderCompositionOrigin = "legacy-variant" | "authored";

export interface BuilderComposition {
  readonly id: string;
  readonly origin: BuilderCompositionOrigin;
  readonly sectionType: InstitutionalSectionType;
  readonly name: string;
  readonly description: string;
  readonly variantVersionId: string;
  readonly familyKey: string | null;
  readonly layout: InstitutionalLayoutNode;
}

/**
 * Adapter for already-published variants. IDs and layouts do not change.
 * Never invent a thumbnail distinct from the layout that will be inserted.
 */
export function compositionsFromVariants(
  variants: readonly InstitutionalVariant[],
): BuilderComposition[] {
  return variants
    .filter((variant) => variant.status === "published")
    .map((variant) => ({
      id: `variant:${variant.versionId}`,
      origin: "legacy-variant" as const,
      sectionType: variant.sectionType,
      name: variant.name,
      description: variant.description,
      variantVersionId: variant.versionId,
      familyKey: variant.familyKey ?? null,
      layout: structuredClone(variant.layout),
    }));
}
