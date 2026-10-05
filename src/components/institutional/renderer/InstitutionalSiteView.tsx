import { useState, type CSSProperties, type DragEvent } from "react";

import { getSectionDefinition } from "../../../data/institutional/sectionCatalog";
import type {
  InstitutionalElementStyle,
  InstitutionalElementType,
  InstitutionalImageFrameResource,
  InstitutionalPage,
  InstitutionalSection,
  InstitutionalSite,
  InstitutionalVariant,
} from "../../../services/institutionalService";
import SectionDesignPicker from "../editor/SectionDesignPicker";
import SectionInsertControl from "../editor/SectionInsertControl";
import SectionFrame from "../editor/SectionFrame";
import SectionRenderer from "./SectionRenderer";

import styles from "./InstitutionalSiteView.module.css";

function fontValue(font: "brand" | "interface" | "system"): string {
  if (font === "brand") {
    return "var(--font-brand)";
  }

  if (font === "system") {
    return "var(--font-system)";
  }

  return "var(--font-interface)";
}

export default function InstitutionalSiteView({
  site,
  page,
  editor,
  selectedSectionId,
  onSelectSection,
  onSectionValueChange,
  onImageRequest,
  selectedElementId,
  onSelectElement,
  onElementValueChange,
  onElementImageRequest,
  onElementStyleChange,
  onMoveElement,
  onRemoveElement,
  onAddElementToSection,
  variants = [],
  busy = false,
  onAddSectionType,
  onVariantChange,
  onDuplicateSection,
  onDeleteSection,
  onToggleSectionVisibility,
  onReorderSections,
  allowVisibilityToggle = true,
  frames = [],
}: {
  site: InstitutionalSite;
  page: InstitutionalPage;
  editor?: boolean;
  selectedSectionId?: string | null;
  onSelectSection?: (sectionId: string) => void;
  onSectionValueChange?: (
    sectionId: string,
    path: Array<string | number>,
    value: unknown,
  ) => void;
  onImageRequest?: (sectionId: string, path: Array<string | number>) => void;
  selectedElementId?: string | null;
  onSelectElement?: (sectionId: string, elementId: string) => void;
  onElementValueChange?: (sectionId: string, elementId: string, value: unknown) => void;
  onElementImageRequest?: (sectionId: string, elementId: string) => void;
  onElementStyleChange?: (sectionId: string, elementId: string, style: Partial<InstitutionalElementStyle>) => void;
  onMoveElement?: (sectionId: string, elementId: string, direction: -1 | 1) => void;
  onRemoveElement?: (sectionId: string, elementId: string) => void;
  onAddElementToSection?: (sectionId: string, elementType: InstitutionalElementType) => void;
  variants?: InstitutionalVariant[];
  busy?: boolean;
  onAddSectionType?: (
    sectionType: InstitutionalSection["sectionType"],
    beforeSectionId?: string | null,
    variantVersionId?: string,
  ) => void;
  onVariantChange?: (sectionId: string, variantVersionId: string) => void;
  onDuplicateSection?: (sectionId: string) => void;
  onDeleteSection?: (sectionId: string) => void;
  onToggleSectionVisibility?: (sectionId: string) => void;
  onReorderSections?: (sectionIds: string[]) => void;
  allowVisibilityToggle?: boolean;
  frames?: InstitutionalImageFrameResource[];
}) {
  const [designSectionId, setDesignSectionId] = useState<string | null>(null);
  const brand = site.brand;
  const style = {
    "--org-primary": brand.primaryColor,
    "--org-secondary": brand.secondaryColor,
    "--org-accent": brand.accentColor,
    "--org-background": brand.backgroundColor,
    "--org-text": brand.textColor,
    "--org-heading-font": fontValue(brand.headingFont),
    "--org-body-font": fontValue(brand.bodyFont),
  } as CSSProperties;

  const visibleSections = editor
    ? page.sections
    : page.sections.filter((section) => section.visible);

  const bodySections = visibleSections.filter((section) => section.sectionType !== "site_footer");
  const footerSections = visibleSections.filter((section) => section.sectionType === "site_footer");

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
    targetSection: InstitutionalSection,
  ): void {
    event.preventDefault();

    const sectionType = event.dataTransfer.getData("application/x-cong-section-type");
    if (sectionType && onAddSectionType) {
      const variantVersionId = event.dataTransfer.getData("application/x-cong-variant-version") || undefined;
      event.stopPropagation();
      onAddSectionType(
        sectionType as InstitutionalSection["sectionType"],
        targetSection.id,
        variantVersionId,
      );
      return;
    }

    const sourceId = event.dataTransfer.getData("application/x-cong-section");

    if (!sourceId || sourceId === targetSection.id || !onReorderSections) {
      return;
    }

    const ids = page.sections.map((section) => section.id);
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetSection.id);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    ids.splice(sourceIndex, 1);
    ids.splice(targetIndex, 0, sourceId);
    onReorderSections(ids);
  }

  return (
    <div className={styles.site} style={style}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" onClick={editor ? (event) => event.preventDefault() : undefined}>
          {brand.logoAsset?.url ? (
            <img src={brand.logoAsset.url} alt="" />
          ) : (
            <span className={styles.brandMark} aria-hidden="true">
              {site.organization.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <strong>{site.organization.name}</strong>
        </a>

        <nav className={styles.navigation} aria-label="Navegação institucional">
          {bodySections.filter((section) => section.sectionType !== "custom_content").slice(0, 5).map((section) => (
            <a
              key={section.id}
              href={`#section-${section.id}`}
              onClick={editor ? (event) => event.preventDefault() : undefined}
            >
              {getSectionDefinition(section.sectionType).name}
            </a>
          ))}
        </nav>
      </header>

      <main
        id="top"
        onClick={editor ? () => setDesignSectionId(null) : undefined}
        onDragOver={editor && onAddSectionType ? (event) => {
          if (!event.dataTransfer.types.includes("application/x-cong-section-type")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        } : undefined}
        onDrop={editor && onAddSectionType ? (event) => {
          const sectionType = event.dataTransfer.getData("application/x-cong-section-type");
          const variantVersionId = event.dataTransfer.getData("application/x-cong-variant-version") || undefined;
          if (!sectionType) return;
          event.preventDefault();
          event.stopPropagation();
          onAddSectionType(sectionType as InstitutionalSection["sectionType"], null, variantVersionId);
        } : undefined}
      >
        {editor && onAddSectionType ? (
          <SectionInsertControl
            variants={variants}
            onAdd={(sectionType) => onAddSectionType(sectionType, bodySections[0]?.id ?? null)}
          />
        ) : null}

        {bodySections.map((section, index) => {
          const rendered = (
            <SectionRenderer
              section={section}
              brand={brand}
              editable={Boolean(editor)}
              showGuidance={Boolean(editor) && selectedSectionId === section.id}
              onValueChange={(path, value) => onSectionValueChange?.(section.id, path, value)}
              onImageRequest={(path) => onImageRequest?.(section.id, path)}
              selectedElementId={selectedSectionId === section.id ? selectedElementId : null}
              onSelectElement={(elementId) => onSelectElement?.(section.id, elementId)}
              onElementValueChange={(elementId, value) => onElementValueChange?.(section.id, elementId, value)}
              onElementImageRequest={(elementId) => onElementImageRequest?.(section.id, elementId)}
              onElementStyleChange={(elementId, elementStyle) => onElementStyleChange?.(section.id, elementId, elementStyle)}
              onMoveElement={(elementId, direction) => onMoveElement?.(section.id, elementId, direction)}
              onRemoveElement={(elementId) => onRemoveElement?.(section.id, elementId)}
              frames={frames}
            />
          );

          if (!editor) return <div key={section.id}>{rendered}</div>;

          const designOpen = designSectionId === section.id;
          const nextSectionId = bodySections[index + 1]?.id ?? null;

          return (
            <div key={section.id}>
              <SectionFrame
                sectionId={section.id}
                selected={selectedSectionId === section.id}
                visible={section.visible}
                label={getSectionDefinition(section.sectionType).name}
                draggable
                designOpen={designOpen}
                onToggleDesign={() => {
                  onSelectSection?.(section.id);
                  setDesignSectionId((current) => current === section.id ? null : section.id);
                }}
                designPicker={onVariantChange ? (
                  <SectionDesignPicker
                    section={section}
                    brand={brand}
                    variants={variants}
                    busy={busy}
                    onSelect={(variantVersionId) => {
                      onVariantChange(section.id, variantVersionId);
                      setDesignSectionId(null);
                    }}
                  />
                ) : undefined}
                onSelect={() => {
                  setDesignSectionId(null);
                  onSelectSection?.(section.id);
                }}
                onDuplicate={() => onDuplicateSection?.(section.id)}
                onDelete={() => onDeleteSection?.(section.id)}
                onToggleVisible={() => onToggleSectionVisibility?.(section.id)}
                allowVisibilityToggle={allowVisibilityToggle}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("application/x-cong-section", section.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = event.dataTransfer.types.includes("application/x-cong-section-type")
                    ? "copy"
                    : "move";
                }}
                onDrop={(event) => handleDrop(event, section)}
                onElementDrop={(elementType) => onAddElementToSection?.(section.id, elementType as InstitutionalElementType)}
              >
                {rendered}
              </SectionFrame>
              {onAddSectionType ? (
                <SectionInsertControl
                  variants={variants}
                  onAdd={(sectionType) => onAddSectionType(sectionType, nextSectionId)}
                />
              ) : null}
            </div>
          );
        })}
      </main>

      {footerSections.map((section) => {
        const rendered = (
          <SectionRenderer
            section={section}
            brand={brand}
            editable={Boolean(editor)}
            showGuidance={Boolean(editor) && selectedSectionId === section.id}
            onValueChange={(path, value) => onSectionValueChange?.(section.id, path, value)}
            onImageRequest={(path) => onImageRequest?.(section.id, path)}
            selectedElementId={selectedSectionId === section.id ? selectedElementId : null}
            onSelectElement={(elementId) => onSelectElement?.(section.id, elementId)}
            onElementValueChange={(elementId, value) => onElementValueChange?.(section.id, elementId, value)}
            onElementImageRequest={(elementId) => onElementImageRequest?.(section.id, elementId)}
            onElementStyleChange={(elementId, elementStyle) => onElementStyleChange?.(section.id, elementId, elementStyle)}
            onMoveElement={(elementId, direction) => onMoveElement?.(section.id, elementId, direction)}
            onRemoveElement={(elementId) => onRemoveElement?.(section.id, elementId)}
            frames={frames}
          />
        );

        if (!editor) return <div key={section.id}>{rendered}</div>;

        return (
          <SectionFrame
            key={section.id}
            sectionId={section.id}
            selected={selectedSectionId === section.id}
            visible={section.visible}
            label="Rodapé"
            draggable={false}
            designOpen={designSectionId === section.id}
            onToggleDesign={() => {
              onSelectSection?.(section.id);
              setDesignSectionId((current) => current === section.id ? null : section.id);
            }}
            designPicker={onVariantChange ? (
              <SectionDesignPicker
                section={section}
                brand={brand}
                variants={variants}
                busy={busy}
                onSelect={(variantVersionId) => {
                  onVariantChange(section.id, variantVersionId);
                  setDesignSectionId(null);
                }}
              />
            ) : undefined}
            onSelect={() => {
              setDesignSectionId(null);
              onSelectSection?.(section.id);
            }}
            onDuplicate={() => onDuplicateSection?.(section.id)}
            onDelete={() => onDeleteSection?.(section.id)}
            onToggleVisible={() => onToggleSectionVisibility?.(section.id)}
            allowVisibilityToggle={allowVisibilityToggle}
            allowDuplicate={false}
            onElementDrop={(elementType) => onAddElementToSection?.(section.id, elementType as InstitutionalElementType)}
          >
            {rendered}
          </SectionFrame>
        );
      })}

    </div>
  );
}
