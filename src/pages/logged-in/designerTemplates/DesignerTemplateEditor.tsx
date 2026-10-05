import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronLeft, FiHelpCircle, FiX } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import EditorToolbar, { type PreviewDevice } from "../../../components/institutional/editor/EditorToolbar";
import PropertiesPanel from "../../../components/institutional/editor/PropertiesPanel";
import SectionLibrary from "../../../components/institutional/editor/SectionLibrary";
import InstitutionalSiteView from "../../../components/institutional/renderer/InstitutionalSiteView";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import { createDefaultSectionContent, getSectionDefinition } from "../../../data/institutional/sectionCatalog";
import { ApiError } from "../../../services/api";
import {
  getDesignerTemplate,
  getInstitutionalImageFrames,
  getInstitutionalVariants,
  publishDesignerTemplate,
  updateDesignerTemplate,
  type DesignerInstitutionalTemplate,
  type InstitutionalElementStyle,
  type InstitutionalElementValue,
  type InstitutionalElementType,
  type InstitutionalLayoutNode,
  type InstitutionalImageFrameResource,
  type InstitutionalPage,
  type InstitutionalSection,
  type InstitutionalSectionStyle,
  type InstitutionalSectionType,
  type InstitutionalSite,
  type InstitutionalTemplateDefinition,
  type InstitutionalVariant,
} from "../../../services/institutionalService";
import { setInstitutionalContentValue } from "../../../utils/institutionalContent";
import { GUIDED_EDITOR_CONSTRAINTS, FREE_EDITOR_CONSTRAINTS } from "../../../utils/institutionalConstraints";
import { defaultSettingsForVariant } from "../../../utils/institutionalVariants";
import {
  appendElement,
  createElementNode,
  effectiveSectionLayout,
  ensureLayoutNodeIds,
  findLayoutNode,
  mergeElementStyle,
  removeLayoutNode,
  updateLayoutNode,
} from "../../../utils/institutionalLayout";

import styles from "../institutional/InstitutionalEditor.module.css";

type SavingState = "idle" | "saving" | "saved" | "error";

function messageFromError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Não foi possível salvar o template.";
}

function sectionId(templateId: string, index: number): string {
  return `template-${templateId}-section-${index}`;
}

function sectionIndex(id: string): number {
  const match = id.match(/-section-(\d+)$/);
  return match ? Number(match[1]) : -1;
}


function collectLayerNodes(
  node: InstitutionalLayoutNode,
): Array<Extract<InstitutionalLayoutNode, { type: "slot" | "element" }>> {
  if (node.type === "slot" || node.type === "element") return [node];
  if (node.type === "repeat") return collectLayerNodes(node.item);
  if (node.type === "stack" || node.type === "grid" || node.type === "columns") {
    return node.children.flatMap((child) => collectLayerNodes(child));
  }
  return [];
}

function previewBrand() {
  return {
    organizationId: "template-preview",
    publicSlug: "template",
    logoAssetId: null,
    primaryColor: "#1366c4",
    secondaryColor: "#04523c",
    accentColor: "#f7b534",
    backgroundColor: "#ffffff",
    textColor: "#091c30",
    headingFont: "brand" as const,
    bodyFont: "interface" as const,
    logoAsset: null,
  };
}

export default function DesignerTemplateEditor() {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<DesignerInstitutionalTemplate | null>(null);
  const [variants, setVariants] = useState<InstitutionalVariant[]>([]);
  const [imageFrames, setImageFrames] = useState<InstitutionalImageFrameResource[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(
    () => localStorage.getItem("cong:institutional-library-collapsed") === "1",
  );
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [savingState, setSavingState] = useState<SavingState>("idle");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [constraintsOpen, setConstraintsOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const latestDefinitionRef = useRef<InstitutionalTemplateDefinition | null>(null);

  useEffect(() => {
    if (!templateId) {
      navigate("/app/design/templates", { replace: true });
      return;
    }

    let active = true;
    const timerRef = saveTimerRef;
    void Promise.all([
      getDesignerTemplate(templateId),
      getInstitutionalVariants(undefined, true),
      getInstitutionalImageFrames(true),
    ])
      .then(([currentTemplate, availableVariants, availableFrames]) => {
        if (!active) return;
        setTemplate(currentTemplate);
        latestDefinitionRef.current = currentTemplate.definition;
        setVariants(availableVariants);
        setImageFrames(availableFrames);
        setSavingState("saved");
      })
      .catch((caught) => { if (active) setError(messageFromError(caught)); });

    return () => {
      active = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [navigate, templateId]);

  const homePageDefinition = useMemo(() => {
    if (!template) return null;
    return template.definition.pages.find((page) => page.isHome) ?? template.definition.pages[0] ?? null;
  }, [template]);

  const previewPage = useMemo<InstitutionalPage | null>(() => {
    if (!template || !homePageDefinition) return null;
    const sections: InstitutionalSection[] = homePageDefinition.sections.flatMap((section, index) => {
      const variant = variants.find((item) => item.versionId === section.variantVersionId)
        ?? variants.find((item) => item.sectionType === section.sectionType && (item.isSystem || item.status === "published"));
      if (!variant) return [];
      return [{
        id: sectionId(template.id, index),
        pageId: `template-${template.id}-page`,
        sectionType: section.sectionType,
        variantVersionId: variant.versionId,
        position: index,
        visible: true,
        content: section.content,
        settings: section.settings ?? {},
        variantId: variant.id,
        variantName: variant.name,
        variantVersion: variant.version,
        layout: variant.layout,
      }];
    });
    return {
      id: `template-${template.id}-page`,
      title: homePageDefinition.title,
      slug: homePageDefinition.slug,
      isHome: true,
      position: 0,
      sections,
    };
  }, [homePageDefinition, template, variants]);

  const previewSite = useMemo<InstitutionalSite | null>(() => {
    if (!template || !previewPage) return null;
    return {
      id: template.id,
      name: template.name,
      slug: "template",
      publicSlug: "template",
      sourceTemplateId: null,
      editorConstraints: template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS,
      isPrimary: false,
      publishedAt: null,
      createdAt: template.updatedAt,
      updatedAt: template.updatedAt,
      organization: { id: "template-preview", name: "Exemplo da organização" },
      brand: previewBrand(),
      pages: [previewPage],
    };
  }, [previewPage, template]);

  const selectedSection = useMemo(
    () => previewPage?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [previewPage, selectedSectionId],
  );
  const selectedElement = useMemo(() => {
    if (!selectedSection || !selectedElementId) return null;
    const layout = ensureLayoutNodeIds(
      effectiveSectionLayout(selectedSection.layout, selectedSection.settings),
    );
    return findLayoutNode(layout, selectedElementId);
  }, [selectedElementId, selectedSection]);

  const saveDefinition = useCallback(async (definition: InstitutionalTemplateDefinition): Promise<void> => {
    if (!templateId) return;
    const current = template;
    if (!current) return;
    setSavingState("saving");
    try {
      const saved = await updateDesignerTemplate(templateId, {
        name: current.name,
        description: current.description,
        category: current.category,
        definition,
      });
      setTemplate(saved);
      latestDefinitionRef.current = saved.definition;
      setSavingState("saved");
    } catch (caught) {
      setSavingState("error");
      setError(messageFromError(caught));
    }
  }, [template, templateId]);

  const queueSave = useCallback((definition: InstitutionalTemplateDefinition): void => {
    latestDefinitionRef.current = definition;
    setTemplate((current) => current ? { ...current, definition } : current);
    setSavingState("saving");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void saveDefinition(definition);
    }, 700);
  }, [saveDefinition]);

  function updateHomeSections(
    updater: (sections: InstitutionalTemplateDefinition["pages"][number]["sections"]) => InstitutionalTemplateDefinition["pages"][number]["sections"],
  ): void {
    if (!template) return;
    const definition = structuredClone(latestDefinitionRef.current ?? template.definition);
    const pageIndex = definition.pages.findIndex((page) => page.isHome);
    const targetIndex = pageIndex >= 0 ? pageIndex : 0;
    const page = definition.pages[targetIndex];
    if (!page) return;
    page.sections = updater(page.sections);
    queueSave(definition);
  }

  function changeContent(id: string, path: Array<string | number>, value: unknown): void {
    const index = sectionIndex(id);
    if (index < 0) return;
    updateHomeSections((sections) => sections.map((section, currentIndex) => currentIndex === index ? {
      ...section,
      content: setInstitutionalContentValue(section.content, path, value),
    } : section));
  }
  function updateSectionLayout(
    id: string,
    updater: (layout: InstitutionalLayoutNode) => InstitutionalLayoutNode,
  ): void {
    const index = sectionIndex(id);
    if (index < 0) return;
    updateHomeSections((sections) => sections.map((section, currentIndex) => {
      if (currentIndex !== index) return section;
      const preview = previewPage?.sections[index];
      if (!preview) return section;
      const layout = ensureLayoutNodeIds(
        effectiveSectionLayout(preview.layout, section.settings ?? {}),
      );
      return {
        ...section,
        settings: {
          ...(section.settings ?? {}),
          layoutOverride: updater(layout),
        },
      };
    }));
  }

  function changeElementValue(id: string, elementId: string, value: unknown): void {
    updateSectionLayout(id, (layout) =>
      updateLayoutNode(layout, elementId, (node) =>
        node.type === "element" ? { ...node, value: value as InstitutionalElementValue } : node,
      ),
    );
  }

  function changeElementStyle(
    id: string,
    elementId: string,
    style: Partial<InstitutionalElementStyle>,
  ): void {
    updateSectionLayout(id, (layout) =>
      updateLayoutNode(layout, elementId, (node) => mergeElementStyle(node, style)),
    );
  }

  function moveElement(id: string, elementId: string, direction: -1 | 1): void {
    updateSectionLayout(id, (layout) => {
      const layers = collectLayerNodes(layout)
        .filter((node) => Boolean(node.id))
        .map((node, sourceIndex) => ({
          id: node.id!,
          sourceIndex,
          zIndex: node.style?.zIndex ?? 0,
        }))
        .sort((a, b) => a.zIndex - b.zIndex || a.sourceIndex - b.sourceIndex);
      const selectedIndex = layers.findIndex((layer) => layer.id === elementId);
      if (selectedIndex < 0) return layout;
      const targetIndex = selectedIndex + direction;
      if (targetIndex < 0 || targetIndex >= layers.length) return layout;

      [layers[selectedIndex], layers[targetIndex]] = [layers[targetIndex], layers[selectedIndex]];
      return layers.reduce(
        (nextLayout, layer, index) =>
          updateLayoutNode(nextLayout, layer.id, (node) =>
            mergeElementStyle(node, { zIndex: Math.min(50, index + 1) }),
          ),
        layout,
      );
    });
  }

  function changeSectionStyle(
    id: string,
    style: Partial<InstitutionalSectionStyle>,
  ): void {
    const index = sectionIndex(id);
    if (index < 0) return;
    updateHomeSections((sections) => sections.map((section, currentIndex) => {
      if (currentIndex !== index) return section;
      const settings = section.settings ?? {};
      const currentStyle =
        settings.sectionStyle && typeof settings.sectionStyle === "object"
          ? (settings.sectionStyle as InstitutionalSectionStyle)
          : {};
      return {
        ...section,
        settings: {
          ...settings,
          sectionStyle: { ...currentStyle, ...style },
        },
      };
    }));
  }

  function changeAllSectionStyles(style: Partial<InstitutionalSectionStyle>): void {
    updateHomeSections((sections) => sections.map((section) => {
      const settings = section.settings ?? {};
      const currentStyle =
        settings.sectionStyle && typeof settings.sectionStyle === "object"
          ? (settings.sectionStyle as InstitutionalSectionStyle)
          : {};
      return {
        ...section,
        settings: {
          ...settings,
          sectionStyle: { ...currentStyle, ...style },
        },
      };
    }));
  }

  function removeElement(id: string, elementId: string): void {
    updateSectionLayout(id, (layout) => removeLayoutNode(layout, elementId));
    setSelectedElementId(null);
  }

  function addElementToSection(sectionIdValue: string, type: InstitutionalElementType): void {
    const element = createElementNode(type);
    updateSectionLayout(sectionIdValue, (layout) => appendElement(layout, element));
    setSelectedSectionId(sectionIdValue);
    if (element.type === "element") setSelectedElementId(element.id);
  }

  function addElement(type: InstitutionalElementType): void {
    if (!selectedSectionId) {
      setError("Selecione uma seção antes de adicionar um elemento.");
      return;
    }
    addElementToSection(selectedSectionId, type);
  }

  function addSection(type: InstitutionalSectionType, preferredVariantVersionId?: string, beforeSectionId: string | null = null): void {
    if (
      type === "site_footer" &&
      (homePageDefinition?.sections ?? []).some((section) => section.sectionType === "site_footer")
    ) {
      setError("Este template já possui um rodapé. Edite o rodapé existente ou troque sua variante.");
      return;
    }
    const defaultVariantName =
      type === "custom_content"
        ? "Seção em branco"
        : type === "site_footer"
          ? "Rodapé completo"
          : null;
    const variant = preferredVariantVersionId
      ? variants.find((item) => item.versionId === preferredVariantVersionId)
      : variants.find(
          (item) =>
            item.sectionType === type &&
            (item.isSystem || item.status === "published") &&
            (!defaultVariantName || item.name === defaultVariantName),
        ) ?? variants.find((item) => item.sectionType === type && (item.isSystem || item.status === "published"));
    if (!variant) {
      setError("Nenhuma variante publicada está disponível para este tipo de seção.");
      return;
    }
    updateHomeSections((sections) => {
      const nextSection = {
        sectionType: type,
        variantVersionId: variant.versionId,
        content: createDefaultSectionContent(type),
        settings: defaultSettingsForVariant(variant),
      };
      const footerIndex = sections.findIndex((section) => section.sectionType === "site_footer");
      const requestedIndex = beforeSectionId ? sectionIndex(beforeSectionId) : -1;
      const insertionIndex = requestedIndex >= 0
        ? requestedIndex
        : type !== "site_footer" && footerIndex >= 0
          ? footerIndex
          : sections.length;
      const next = [...sections];
      next.splice(insertionIndex, 0, nextSection);
      return next;
    });
    setSelectedSectionId(null);
    setSelectedElementId(null);
  }

  function changeVariantForSection(sectionIdValue: string, versionId: string): void {
    const index = sectionIndex(sectionIdValue);
    updateHomeSections((sections) => sections.map((section, currentIndex) => {
      if (currentIndex !== index) return section;
      const variant = variants.find((item) => item.versionId === versionId);
      const nextSettings = {
        ...(section.settings ?? {}),
        ...(variant ? defaultSettingsForVariant(variant) : {}),
      };
      delete nextSettings.layoutOverride;
      return { ...section, variantVersionId: versionId, settings: nextSettings };
    }));
    setSelectedSectionId(sectionIdValue);
    setSelectedElementId(null);
  }

  function changeVariant(versionId: string): void {
    if (!selectedSectionId) return;
    changeVariantForSection(selectedSectionId, versionId);
  }

  function duplicateSection(id: string): void {
    const index = sectionIndex(id);
    if (homePageDefinition?.sections[index]?.sectionType === "site_footer") {
      setError("O rodapé é único no template e não pode ser duplicado.");
      return;
    }
    updateHomeSections((sections) => {
      const source = sections[index];
      if (!source) return sections;
      const next = [...sections];
      next.splice(index + 1, 0, structuredClone(source));
      return next;
    });
    setSelectedSectionId(null);
    setSelectedElementId(null);
  }

  function removeSection(): void {
    if (!deleteTargetId) return;
    const index = sectionIndex(deleteTargetId);
    updateHomeSections((sections) => sections.filter((_, currentIndex) => currentIndex !== index));
    setDeleteTargetId(null);
    setSelectedSectionId(null);
    setSelectedElementId(null);
  }

  function reorderSections(ids: string[]): void {
    const current = homePageDefinition?.sections ?? [];
    const footerIndex = current.findIndex((section) => section.sectionType === "site_footer");
    const footerId = footerIndex >= 0 ? sectionId(template?.id ?? "preview", footerIndex) : null;
    const normalizedIds = footerId
      ? [...ids.filter((id) => id !== footerId), footerId]
      : ids;
    const reordered = normalizedIds.map((id) => current[sectionIndex(id)]).filter(Boolean) as typeof current;
    if (reordered.length === current.length) updateHomeSections(() => reordered);
    setSelectedSectionId(null);
    setSelectedElementId(null);
  }

  function updateEditorConstraints(
    patch: Partial<NonNullable<InstitutionalTemplateDefinition["editorConstraints"]>>,
  ): void {
    if (!template) return;
    const definition = structuredClone(latestDefinitionRef.current ?? template.definition);
    const current = definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS;
    const next = { ...current, ...patch };
    if (next.minWidthPercent > next.maxWidthPercent) next.maxWidthPercent = next.minWidthPercent;
    if (next.minFontSize > next.maxFontSize) next.maxFontSize = next.minFontSize;
    definition.editorConstraints = next;
    queueSave(definition);
  }

  async function publish(): Promise<void> {
    if (!template) return;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = latestDefinitionRef.current ?? template.definition;
    setPublishing(true);
    setError("");
    try {
      await saveDefinition(pending);
      const published = await publishDesignerTemplate(template.id);
      setTemplate(published);
      latestDefinitionRef.current = published.definition;
      setPublishOpen(false);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setPublishing(false);
    }
  }

  if (!template || !previewPage || !previewSite) {
    return <div className={styles.loading}>Carregando editor de template...</div>;
  }

  const canvasWidth = device === "mobile" ? "430px" : device === "tablet" ? "820px" : "100%";

  return (
    <div className={styles.editor}>
      <EditorToolbar
        title={template.name}
        subtitle="Template de site · Designer"
        device={device}
        savingState={savingState}
        publishing={publishing}
        published={template.status === "published"}
        showBrand={false}
        publishLabel={template.status === "published" ? "Republicar template" : "Publicar template"}
        onBack={() => navigate("/app/design/templates")}
        onDeviceChange={setDevice}
        onHelp={() => setHelpOpen(true)}
        onPreview={() => setPreviewOpen(true)}
        onPublish={() => setPublishOpen(true)}
      />

      {error ? (
        <div className={styles.errorBar}><span>{error}</span><button type="button" onClick={() => setError("")}><FiX /></button></div>
      ) : null}

      <div className={styles.workspace}>
        <SectionLibrary
          disabled={savingState === "saving"}
          brand={previewSite.brand}
          selectedSection={selectedSection}
          variants={variants}
          sections={previewPage.sections}
          selectedSectionId={selectedSectionId}
          collapsed={libraryCollapsed}
          onToggleCollapsed={() => {
            setLibraryCollapsed((current) => {
              const next = !current;
              localStorage.setItem("cong:institutional-library-collapsed", next ? "1" : "0");
              return next;
            });
          }}
          onAddSection={addSection}
          onAddElement={addElement}
          selectedElementId={selectedElementId}
          onSelectElement={(sectionId, elementId) => {
            setSelectedSectionId(sectionId);
            setSelectedElementId(elementId);
          }}
          onElementStyleChange={changeElementStyle}
          onSectionStyleChange={changeSectionStyle}
          onApplySectionStyleToAll={changeAllSectionStyles}
          onSelectSection={(id) => {
            setSelectedSectionId(id);
            setSelectedElementId(null);
            document.querySelector(`[data-section-id="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          onMoveSection={(id, direction) => {
            const index = sectionIndex(id);
            const bodyIds = previewPage.sections.filter((section) => section.sectionType !== "site_footer").map((section) => section.id);
            const bodyIndex = bodyIds.indexOf(id);
            const target = bodyIndex + direction;
            if (index < 0 || bodyIndex < 0 || target < 0 || target >= bodyIds.length) return;
            [bodyIds[bodyIndex], bodyIds[target]] = [bodyIds[target], bodyIds[bodyIndex]];
            const footerId = previewPage.sections.find((section) => section.sectionType === "site_footer")?.id;
            reorderSections(footerId ? [...bodyIds, footerId] : bodyIds);
          }}
        />
        <div className={styles.canvasArea}>
          <div className={styles.stageBar}><div><strong>Palco do template</strong><span>Monte a estrutura diretamente aqui. A ONG troca textos, imagens e identidade quando usar o modelo.</span></div><div className={styles.stageActions}><button type="button" onClick={() => setConstraintsOpen(true)}>Limites do modelo</button><small>{device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Celular"}</small></div></div>
          <div className={styles.canvasViewport}>
            <div className={styles.canvas} style={{ width: canvasWidth }}>
              <InstitutionalSiteView
                site={previewSite}
                page={previewPage}
                editor
                allowVisibilityToggle={false}
                selectedSectionId={selectedSectionId}
                selectedElementId={selectedElementId}
                onSelectSection={(id) => {
                  setSelectedSectionId(id);
                  setSelectedElementId(null);
                }}
                onSelectElement={(sectionIdValue, elementId) => {
                  setSelectedSectionId(sectionIdValue);
                  setSelectedElementId(elementId);
                }}
                onSectionValueChange={changeContent}
                onImageRequest={() => setError("Templates usam espaços de imagem. A ONG escolhe os arquivos reais ao aplicar o modelo.")}
                onElementValueChange={changeElementValue}
                onElementImageRequest={() => setError("A ONG adiciona a imagem real depois de escolher o template.")}
                onElementStyleChange={changeElementStyle}
                onMoveElement={moveElement}
                onRemoveElement={removeElement}
                onAddElementToSection={addElementToSection}
                variants={variants}
                frames={imageFrames}
                busy={savingState === "saving"}
                onAddSectionType={(sectionType, beforeSectionId, variantVersionId) => addSection(sectionType, variantVersionId, beforeSectionId ?? null)}
                onVariantChange={changeVariantForSection}
                onDuplicateSection={duplicateSection}
                onDeleteSection={setDeleteTargetId}
                onToggleSectionVisibility={() => undefined}
                onReorderSections={reorderSections}
              />
            </div>
          </div>
        </div>

        {propertiesOpen ? (
          <PropertiesPanel
            section={selectedSection}
            variants={variants}
            allowImageUpload={false}
            onCollapse={() => setPropertiesOpen(false)}
            onContentChange={(path, value) => {
              if (selectedSectionId) changeContent(selectedSectionId, path, value);
            }}
            onVariantChange={changeVariant}
            onUploadImage={() => setError("A ONG adiciona a imagem real depois de escolher o template.")}
            selectedElement={selectedElement}
            brand={previewSite.brand}
            designFrames={imageFrames}
            onElementStyleChange={(style) => {
              if (selectedSectionId && selectedElementId) {
                changeElementStyle(selectedSectionId, selectedElementId, style);
              }
            }}
            onElementValueChange={(value) => {
              if (selectedSectionId && selectedElementId) {
                changeElementValue(selectedSectionId, selectedElementId, value);
              }
            }}
            onRemoveElement={() => {
              if (selectedSectionId && selectedElementId) {
                removeElement(selectedSectionId, selectedElementId);
              }
            }}
            onSectionStyleChange={(style) => {
              if (selectedSectionId) changeSectionStyle(selectedSectionId, style);
            }}
          />
        ) : (
          <button type="button" className={styles.openProperties} onClick={() => setPropertiesOpen(true)}><FiChevronLeft /> Propriedades</button>
        )}
      </div>


      <ModalMensagem
        aberto={constraintsOpen}
        titulo="Liberdade de edição do template"
        tamanho="pequeno"
        mostrarBotaoOk={false}
        onFechar={() => setConstraintsOpen(false)}
        mensagem={
          <div className={styles.constraintForm}>
            <p>Defina até onde a CONG recomenda que a ONG altere este modelo. Ela ainda poderá ultrapassar esses limites após confirmar um aviso.</p>
            <label>
              <span>Comportamento</span>
              <select
                value={(template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS).mode}
                onChange={(event) => {
                  const mode = event.target.value as "free" | "guided";
                  updateEditorConstraints(mode === "free" ? FREE_EDITOR_CONSTRAINTS : GUIDED_EDITOR_CONSTRAINTS);
                }}
              >
                <option value="guided">Guiado pelo template</option>
                <option value="free">Livre</option>
              </select>
            </label>
            {(template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS).mode === "guided" ? (
              <>
                <label><span>Largura mínima dos elementos</span><input type="range" min="15" max="90" value={(template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS).minWidthPercent} onChange={(event) => updateEditorConstraints({ minWidthPercent: Number(event.target.value) })} /><b>{(template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS).minWidthPercent}%</b></label>
                <label><span>Tamanho máximo de texto</span><input type="range" min="24" max="120" value={(template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS).maxFontSize} onChange={(event) => updateEditorConstraints({ maxFontSize: Number(event.target.value) })} /><b>{(template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS).maxFontSize}px</b></label>
                <label><span>Movimento livre recomendado</span><input type="range" min="0" max="100" value={(template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS).maxOffset} onChange={(event) => updateEditorConstraints({ maxOffset: Number(event.target.value) })} /><b>{(template.definition.editorConstraints ?? GUIDED_EDITOR_CONSTRAINTS).maxOffset}px</b></label>
              </>
            ) : null}
            <button type="button" className={styles.constraintDone} onClick={() => setConstraintsOpen(false)}>Concluir</button>
          </div>
        }
      />

      {previewOpen ? (
        <div className={styles.previewBackdrop}>
          <div className={styles.previewHeader}><div><strong>Visualização do template</strong><span>Sem controles de edição.</span></div><button type="button" onClick={() => setPreviewOpen(false)}><FiX /> Fechar</button></div>
          <div className={styles.previewBody}><InstitutionalSiteView site={previewSite} page={previewPage} /></div>
        </div>
      ) : null}

      <ModalMensagem
        aberto={helpOpen}
        titulo="Como criar um bom template"
        tamanho="pequeno"
        mostrarBotaoOk={false}
        onFechar={() => setHelpOpen(false)}
        mensagem={
          <ol className={styles.helpSteps}>
            <li><FiHelpCircle /><div><strong>Pense no objetivo da ONG.</strong><span>Escolha seções que resolvam uma necessidade real, não apenas preencham espaço.</span></div></li>
            <li><FiHelpCircle /><div><strong>Use variantes responsivas.</strong><span>O motor da CONG reorganiza composições em telas menores automaticamente.</span></div></li>
            <li><FiHelpCircle /><div><strong>Deixe o conteúdo substituível.</strong><span>O template orienta; dados, fotos e identidade final pertencem à organização.</span></div></li>
          </ol>
        }
      />

      <ConfirmActionModal
        open={Boolean(deleteTargetId)}
        title="Remover esta seção do template?"
        description={deleteTargetId ? `A estrutura de ${getSectionDefinition(previewPage.sections[sectionIndex(deleteTargetId)]?.sectionType ?? "organization_about").name} será removida deste template.` : ""}
        confirmLabel="Remover seção"
        tone="danger"
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={removeSection}
      />

      <ConfirmActionModal
        open={publishOpen}
        title="Publicar este template?"
        description="Ele ficará disponível para ONGs criarem novos sites. Sites já criados continuam independentes; mudanças futuras só afetam novos usos depois de uma nova publicação."
        confirmLabel="Publicar template"
        busy={publishing}
        onCancel={() => setPublishOpen(false)}
        onConfirm={() => void publish()}
      />
    </div>
  );
}
