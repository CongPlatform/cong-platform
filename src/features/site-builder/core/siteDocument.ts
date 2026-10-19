/**
 * Site Builder 2.0 — document adapter.
 *
 * IMPORTANT: The source of truth remains InstitutionalSite from the API.
 * This module deliberately does NOT migrate or rewrite its persisted schema.
 * Both the existing editor and future compositions operate on the same IDs.
 */
import type {
  InstitutionalSection,
  InstitutionalSite,
} from "../../../services/institutionalService";

export interface BuilderDocumentIndex {
  readonly siteId: string;
  readonly organizationId: string;
  readonly pages: readonly {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly isHome: boolean;
    readonly sectionIds: readonly string[];
  }[];
}

/** A read-only index; no writes, invented pages or automatic NGO data injection. */
export function indexBuilderDocument(
  site: InstitutionalSite,
): BuilderDocumentIndex {
  return {
    siteId: site.id,
    organizationId: site.organization.id,
    pages: site.pages.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      isHome: page.isHome,
      sectionIds: page.sections.map((section) => section.id),
    })),
  };
}

/** Immutable edit; unknown legacy fields and all unaffected pages are preserved. */
export function updateSectionInSite(
  site: InstitutionalSite,
  sectionId: string,
  updater: (section: InstitutionalSection) => InstitutionalSection,
): InstitutionalSite {
  const exists = site.pages.some((page) =>
    page.sections.some((section) => section.id === sectionId),
  );
  if (!exists) return site;
  return {
    ...site,
    pages: site.pages.map((page) => {
      if (!page.sections.some((section) => section.id === sectionId))
        return page;
      return {
        ...page,
        sections: page.sections.map((section) =>
          section.id === sectionId ? updater(section) : section,
        ),
      };
    }),
  };
}

/** Used by undo/redo; retains the entire current API document structure. */
export function cloneSiteSnapshot(site: InstitutionalSite): InstitutionalSite {
  return structuredClone(site);
}
