import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiChevronLeft, FiHelpCircle, FiX } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";

import BrandPanel from "../../../components/institutional/editor/BrandPanel";
import ConfirmActionModal from "../../../components/institutional/editor/ConfirmActionModal";
import EditorToolbar, {
  type PreviewDevice,
} from "../../../components/institutional/editor/EditorToolbar";
import PropertiesPanel from "../../../components/institutional/editor/PropertiesPanel";
import SectionLibrary from "../../../components/institutional/editor/SectionLibrary";
import { useEditorSelection } from "../../../components/institutional/editor/useEditorSelection";
import InstitutionalSiteView from "../../../components/institutional/renderer/InstitutionalSiteView";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import { createDefaultSectionContent, getSectionDefinition } from "../../../data/institutional/sectionCatalog";
import { ApiError } from "../../../services/api";
import {
  addInstitutionalSection,
  deleteInstitutionalSection,
  duplicateInstitutionalSection,
  getInstitutionalSite,
  getInstitutionalVariants,
  getInstitutionalDesignResources,
  publishInstitutionalSite,
  reorderInstitutionalSections,
  updateInstitutionalBrand,
  updateInstitutionalSection,
  uploadInstitutionalMedia,
  type InstitutionalBrand,
  type InstitutionalDesignResources,
  type InstitutionalElementStyle,
  type InstitutionalElementValue,
  type InstitutionalElementType,
  type InstitutionalLayoutNode,
  type InstitutionalSection,
  type InstitutionalSectionStyle,
  type InstitutionalSectionType,
  type InstitutionalSite,
  type InstitutionalVariant,
} from "../../../services/institutionalService";
import { setInstitutionalContentValue } from "../../../utils/institutionalContent";
import { exceedsEditorConstraints } from "../../../utils/institutionalConstraints";
import {
  buildBrandPaletteSuggestion,
  extractLogoPalette,
} from "../../../utils/institutionalPalette";
import {
  appendElement,
  createElementNode,
  effectiveSectionLayout,
  ensureLayoutNodeIds,
  findLayoutNode,
  mergeElementStyle,
  moveLayoutNode,
  removeLayoutNode,
  updateLayoutNode,
} from "../../../utils/institutionalLayout";
import {
  defaultSettingsForVariant,
  findRecommendedVariant,
} from "../../../utils/institutionalVariants";

import styles from "./InstitutionalEditor.module.css";

type SavingState = "idle" | "saving" | "saved" | "error";
type BrandDraft = Omit<InstitutionalBrand, "organizationId" | "publicSlug" | "logoAsset">;

function messageFromError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Não foi possível concluir esta alteração.";
}

function updateSectionInSite(
  site: InstitutionalSite,
  sectionId: string,
  updater: (section: InstitutionalSection) => InstitutionalSection,
): InstitutionalSite {
  return {
    ...site,
    pages: site.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) =>
        section.id === sectionId ? updater(section) : section,
      ),
    })),
  };
}

function cloneSiteSnapshot(site: InstitutionalSite): InstitutionalSite {
  return structuredClone(site);
}

export default function InstitutionalEditor() {
  const navigate = useNavigate();
  const { siteId } = useParams<{ siteId: string }>();
  const [site, setSite] = useState<InstitutionalSite | null>(null);
  const [variants, setVariants] = useState<InstitutionalVariant[]>([]);
  const [designResources, setDesignResources] = useState<InstitutionalDesignResources>({ palettes: [], frames: [] });
  const {
    selection: { sectionId: selectedSectionId, elementId: selectedElementId },
    setSectionId: setSelectedSectionId,
    setElementId: setSelectedElementId,
  } = useEditorSelection();
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(() => localStorage.getItem("cong:institutional-library-collapsed") === "1");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savingState, setSavingState] = useState<SavingState>("idle");
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [suggestedPalette, setSuggestedPalette] = useState<string[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [unlockedSiteIds, setUnlockedSiteIds] = useState<Set<string>>(() => new Set());
  const [constraintPrompt, setConstraintPrompt] = useState<{ sectionId: string; elementId: string; style: Partial<InstitutionalElementStyle> } | null>(null);
  const [pendingImageTarget, setPendingImageTarget] = useState<
    | { kind: "content"; sectionId: string; path: Array<string | number> }
    | { kind: "element"; sectionId: string; elementId: string }
    | null
  >(null);
  const directImageInputRef = useRef<HTMLInputElement>(null);
  const saveTimersRef = useRef(new Map<string, number>());
  const settingsTimersRef = useRef(new Map<string, number>());
  const pendingSaveContentRef = useRef(new Map<string, Record<string, unknown>>());
  const pendingSaveSettingsRef = useRef(new Map<string, Record<string, unknown>>());
  const latestContentRef = useRef(new Map<string, Record<string, unknown>>());
  const latestSettingsRef = useRef(new Map<string, Record<string, unknown>>());
  const siteRef = useRef<InstitutionalSite | null>(null);
  const historyPastRef = useRef<InstitutionalSite[]>([]);
  const historyFutureRef = useRef<InstitutionalSite[]>([]);
  const lastHistoryRef = useRef<{ key: string; at: number } | null>(null);
  const restoringHistoryRef = useRef(false);
  const [historyState, setHistoryState] = useState({ undo: 0, redo: 0 });

  const adoptSite = useCallback((nextSite: InstitutionalSite): void => {
    const nextContent = new Map<string, Record<string, unknown>>();
    const nextSettings = new Map<string, Record<string, unknown>>();
    nextSite.pages.forEach((currentPage) => {
      currentPage.sections.forEach((section) => {
        nextContent.set(section.id, section.content);
        nextSettings.set(section.id, section.settings);
      });
    });
    latestContentRef.current = nextContent;
    latestSettingsRef.current = nextSettings;
    if (!restoringHistoryRef.current && siteRef.current) {
      historyPastRef.current = [];
      historyFutureRef.current = [];
      lastHistoryRef.current = null;
      setHistoryState({ undo: 0, redo: 0 });
    }
    siteRef.current = nextSite;
    setSite(nextSite);
  }, []);

  useEffect(() => {
    siteRef.current = site;
  }, [site]);

  useEffect(() => {
    if (!siteId) {
      navigate("/app/site-institucional", { replace: true });
      return;
    }

    let active = true;
    const timers = saveTimersRef.current;
    const settingsTimers = settingsTimersRef.current;

    void Promise.all([getInstitutionalSite(siteId), getInstitutionalVariants(), getInstitutionalDesignResources()])
      .then(([currentSite, availableVariants, availableDesignResources]) => {
        if (!active) return;
        adoptSite(currentSite);
        setVariants(availableVariants);
        setDesignResources(availableDesignResources);
        setSavingState("saved");
      })
      .catch((caught) => {
        if (active) setError(messageFromError(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      timers.forEach((timer) => window.clearTimeout(timer));
      settingsTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [adoptSite, navigate, siteId]);

  const constraintsUnlocked = Boolean(
    siteId &&
      (unlockedSiteIds.has(siteId) ||
        sessionStorage.getItem(`cong:site:${siteId}:free-edit`) === "1"),
  );

  const page = useMemo(
    () => site?.pages.find((item) => item.isHome) ?? site?.pages[0] ?? null,
    [site],
  );

  const selectedSection = useMemo(
    () => page?.sections.find((section) => section.id === selectedSectionId) ?? null,
    [page, selectedSectionId],
  );
  const selectedElement = useMemo(() => {
    if (!selectedSection || !selectedElementId) return null;
    const layout = ensureLayoutNodeIds(
      effectiveSectionLayout(selectedSection.layout, selectedSection.settings),
    );
    return findLayoutNode(layout, selectedElementId);
  }, [selectedElementId, selectedSection]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) {
        return;
      }
      if (selectedElementId) {
        setSelectedElementId(null);
        return;
      }
      if (selectedSectionId) {
        setSelectedSectionId(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [selectedElementId, selectedSectionId]);

  const persistSectionContent = useCallback(
    async (sectionId: string, content: Record<string, unknown>): Promise<void> => {
      await updateInstitutionalSection(sectionId, { content });
      if (pendingSaveContentRef.current.get(sectionId) === content) {
        pendingSaveContentRef.current.delete(sectionId);
      }
      setSavingState(
        pendingSaveContentRef.current.size === 0 && pendingSaveSettingsRef.current.size === 0
          ? "saved"
          : "saving",
      );
    },
    [],
  );

  const queueSectionSave = useCallback(
    (sectionId: string, content: Record<string, unknown>): void => {
      const existing = saveTimersRef.current.get(sectionId);
      if (existing) window.clearTimeout(existing);

      pendingSaveContentRef.current.set(sectionId, content);
      setSavingState("saving");

      const timer = window.setTimeout(() => {
        saveTimersRef.current.delete(sectionId);
        void persistSectionContent(sectionId, content).catch((caught) => {
          setSavingState("error");
          setError(messageFromError(caught));
        });
      }, 800);

      saveTimersRef.current.set(sectionId, timer);
    },
    [persistSectionContent],
  );
  const persistSectionSettings = useCallback(
    async (sectionId: string, settings: Record<string, unknown>): Promise<void> => {
      await updateInstitutionalSection(sectionId, { settings });
      if (pendingSaveSettingsRef.current.get(sectionId) === settings) {
        pendingSaveSettingsRef.current.delete(sectionId);
      }
      setSavingState(
        pendingSaveContentRef.current.size === 0 && pendingSaveSettingsRef.current.size === 0
          ? "saved"
          : "saving",
      );
    },
    [],
  );

  const queueSectionSettingsSave = useCallback(
    (sectionId: string, settings: Record<string, unknown>): void => {
      const existing = settingsTimersRef.current.get(sectionId);
      if (existing) window.clearTimeout(existing);

      pendingSaveSettingsRef.current.set(sectionId, settings);
      setSavingState("saving");

      const timer = window.setTimeout(() => {
        settingsTimersRef.current.delete(sectionId);
        void persistSectionSettings(sectionId, settings).catch((caught) => {
          setSavingState("error");
          setError(messageFromError(caught));
        });
      }, 700);

      settingsTimersRef.current.set(sectionId, timer);
    },
    [persistSectionSettings],
  );

  const flushPendingSectionSaves = useCallback(async (): Promise<void> => {
    saveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    settingsTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    saveTimersRef.current.clear();
    settingsTimersRef.current.clear();

    const pendingContent = Array.from(pendingSaveContentRef.current.entries());
    const pendingSettings = Array.from(pendingSaveSettingsRef.current.entries());

    if (pendingContent.length === 0 && pendingSettings.length === 0) {
      setSavingState("saved");
      return;
    }

    setSavingState("saving");

    const sectionIds = new Set([
      ...pendingContent.map(([sectionId]) => sectionId),
      ...pendingSettings.map(([sectionId]) => sectionId),
    ]);

    await Promise.all(
      [...sectionIds].map((sectionId) =>
        updateInstitutionalSection(sectionId, {
          ...(pendingSaveContentRef.current.has(sectionId)
            ? { content: pendingSaveContentRef.current.get(sectionId) }
            : {}),
          ...(pendingSaveSettingsRef.current.has(sectionId)
            ? { settings: pendingSaveSettingsRef.current.get(sectionId) }
            : {}),
        }),
      ),
    );

    pendingSaveContentRef.current.clear();
    pendingSaveSettingsRef.current.clear();
    setSavingState("saved");
  }, []);


  const syncHistoryState = useCallback((): void => {
    setHistoryState({
      undo: historyPastRef.current.length,
      redo: historyFutureRef.current.length,
    });
  }, []);

  const recordHistory = useCallback((key: string): void => {
    if (restoringHistoryRef.current) return;
    const current = siteRef.current;
    if (!current) return;

    const now = Date.now();
    const last = lastHistoryRef.current;
    if (last && last.key === key && now - last.at < 850) {
      lastHistoryRef.current = { key, at: now };
      return;
    }

    historyPastRef.current.push(cloneSiteSnapshot(current));
    if (historyPastRef.current.length > 60) historyPastRef.current.shift();
    historyFutureRef.current = [];
    lastHistoryRef.current = { key, at: now };
    syncHistoryState();
  }, [syncHistoryState]);

  const persistHistorySnapshot = useCallback(async (snapshot: InstitutionalSite): Promise<void> => {
    saveTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    settingsTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    saveTimersRef.current.clear();
    settingsTimersRef.current.clear();
    pendingSaveContentRef.current.clear();
    pendingSaveSettingsRef.current.clear();

    restoringHistoryRef.current = true;
    adoptSite(snapshot);
    setSavingState("saving");
    try {
      await Promise.all(
        snapshot.pages.flatMap((snapshotPage) =>
          snapshotPage.sections.map((section) =>
            updateInstitutionalSection(section.id, {
              content: section.content,
              settings: section.settings,
            }),
          ),
        ),
      );
      setSavingState("saved");
    } catch (caught) {
      setSavingState("error");
      setError(messageFromError(caught));
    } finally {
      restoringHistoryRef.current = false;
      lastHistoryRef.current = null;
    }
  }, [adoptSite]);

  const undoHistory = useCallback(async (): Promise<void> => {
    const previous = historyPastRef.current.pop();
    const current = siteRef.current;
    if (!previous || !current) return;
    historyFutureRef.current.push(cloneSiteSnapshot(current));
    syncHistoryState();
    await persistHistorySnapshot(previous);
  }, [persistHistorySnapshot, syncHistoryState]);

  const redoHistory = useCallback(async (): Promise<void> => {
    const next = historyFutureRef.current.pop();
    const current = siteRef.current;
    if (!next || !current) return;
    historyPastRef.current.push(cloneSiteSnapshot(current));
    syncHistoryState();
    await persistHistorySnapshot(next);
  }, [persistHistorySnapshot, syncHistoryState]);


  const changeSectionContent = useCallback(
    (sectionId: string, path: Array<string | number>, value: unknown): void => {
      const currentContent = latestContentRef.current.get(sectionId);
      if (!currentContent) return;

      recordHistory(`content:${sectionId}:${path.join(".")}`);
      const nextContent = setInstitutionalContentValue(currentContent, path, value);
      latestContentRef.current.set(sectionId, nextContent);
      setSite((current) =>
        current
          ? updateSectionInSite(current, sectionId, (section) => ({
              ...section,
              content: nextContent,
            }))
          : current,
      );
      queueSectionSave(sectionId, nextContent);
    },
    [queueSectionSave, recordHistory],
  );
  const changeSectionSettings = useCallback(
    (sectionId: string, settings: Record<string, unknown>): void => {
      recordHistory(`settings:${sectionId}:${selectedElementId ?? "section"}`);
      latestSettingsRef.current.set(sectionId, settings);
      setSite((current) =>
        current
          ? updateSectionInSite(current, sectionId, (section) => ({
              ...section,
              settings,
            }))
          : current,
      );
      queueSectionSettingsSave(sectionId, settings);
    },
    [queueSectionSettingsSave, recordHistory, selectedElementId],
  );

  const updateSectionLayout = useCallback(
    (
      sectionId: string,
      updater: (layout: InstitutionalLayoutNode) => InstitutionalLayoutNode,
    ): void => {
      const currentSection = page?.sections.find((section) => section.id === sectionId);
      if (!currentSection) return;

      const currentSettings = latestSettingsRef.current.get(sectionId) ?? currentSection.settings;
      const base = ensureLayoutNodeIds(
        effectiveSectionLayout(currentSection.layout, currentSettings),
      );
      const nextLayout = updater(base);
      const nextSettings = {
        ...currentSettings,
        layoutOverride: nextLayout,
      };
      changeSectionSettings(sectionId, nextSettings);
    },
    [changeSectionSettings, page],
  );

  const changeElementValue = useCallback(
    (sectionId: string, elementId: string, value: unknown): void => {
      updateSectionLayout(sectionId, (layout) =>
        updateLayoutNode(layout, elementId, (node) =>
          node.type === "element" ? { ...node, value: value as InstitutionalElementValue } : node,
        ),
      );
    },
    [updateSectionLayout],
  );

  const applyElementStyle = useCallback(
    (sectionId: string, elementId: string, style: Partial<InstitutionalElementStyle>): void => {
      updateSectionLayout(sectionId, (layout) =>
        updateLayoutNode(layout, elementId, (node) => mergeElementStyle(node, style)),
      );
    },
    [updateSectionLayout],
  );

  const changeElementStyle = useCallback(
    (
      sectionId: string,
      elementId: string,
      style: Partial<InstitutionalElementStyle>,
    ): void => {
      if (site?.editorConstraints.mode === "guided" && !constraintsUnlocked) {
        const currentSection = page?.sections.find((item) => item.id === sectionId);
        if (currentSection) {
          const layout = ensureLayoutNodeIds(
            effectiveSectionLayout(currentSection.layout, currentSection.settings),
          );
          const currentNode = findLayoutNode(layout, elementId);
          if (
            currentNode &&
            (currentNode.type === "slot" || currentNode.type === "element") &&
            exceedsEditorConstraints(currentNode.style ?? {}, style, site.editorConstraints)
          ) {
            setConstraintPrompt({ sectionId, elementId, style });
            return;
          }
        }
      }
      applyElementStyle(sectionId, elementId, style);
    },
    [applyElementStyle, constraintsUnlocked, page, site?.editorConstraints],
  );

  useEffect(() => {
    function handleEditorShortcut(event: KeyboardEvent): void {
      const target = event.target;
      const isEditingText = target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (isEditingText) return;

      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) void redoHistory();
        else void undoHistory();
        return;
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        void redoHistory();
        return;
      }

      if (!selectedSectionId || !selectedElementId || !selectedElement) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;

      event.preventDefault();
      const step = event.shiftKey ? 12 : 4;
      const currentStyle =
        selectedElement.type === "slot" || selectedElement.type === "element"
          ? selectedElement.style ?? {}
          : {};
      const offsetX = currentStyle.offsetX ?? 0;
      const offsetY = currentStyle.offsetY ?? 0;
      if (event.key === "ArrowLeft") changeElementStyle(selectedSectionId, selectedElementId, { offsetX: offsetX - step });
      if (event.key === "ArrowRight") changeElementStyle(selectedSectionId, selectedElementId, { offsetX: offsetX + step });
      if (event.key === "ArrowUp") changeElementStyle(selectedSectionId, selectedElementId, { offsetY: offsetY - step });
      if (event.key === "ArrowDown") changeElementStyle(selectedSectionId, selectedElementId, { offsetY: offsetY + step });
    }

    window.addEventListener("keydown", handleEditorShortcut);
    return () => window.removeEventListener("keydown", handleEditorShortcut);
  }, [
    changeElementStyle,
    redoHistory,
    selectedElement,
    selectedElementId,
    selectedSectionId,
    undoHistory,
  ]);

  const moveElement = useCallback(
    (sectionId: string, elementId: string, direction: -1 | 1): void => {
      updateSectionLayout(sectionId, (layout) =>
        moveLayoutNode(layout, elementId, direction),
      );
    },
    [updateSectionLayout],
  );

  const removeElement = useCallback(
    (sectionId: string, elementId: string): void => {
      updateSectionLayout(sectionId, (layout) => removeLayoutNode(layout, elementId));
      setSelectedElementId(null);
    },
    [updateSectionLayout],
  );

  const addElementToSection = useCallback(
    (sectionId: string, elementType: InstitutionalElementType): void => {
      const element = createElementNode(elementType);
      updateSectionLayout(sectionId, (layout) => appendElement(layout, element));
      setSelectedSectionId(sectionId);
      if (element.type === "element") setSelectedElementId(element.id);
    },
    [updateSectionLayout],
  );

  const addElement = useCallback(
    (elementType: InstitutionalElementType): void => {
      if (!selectedSection) {
        setError("Selecione uma seção antes de adicionar um elemento.");
        return;
      }
      addElementToSection(selectedSection.id, elementType);
    },
    [addElementToSection, selectedSection],
  );

  function changeSectionStyle(
    sectionId: string,
    style: Partial<InstitutionalSectionStyle>,
  ): void {
    const current = page?.sections.find((item) => item.id === sectionId);
    if (!current) return;
    const currentSettings = latestSettingsRef.current.get(sectionId) ?? current.settings;
    const currentStyle =
      currentSettings.sectionStyle && typeof currentSettings.sectionStyle === "object"
        ? (currentSettings.sectionStyle as InstitutionalSectionStyle)
        : {};
    changeSectionSettings(sectionId, {
      ...currentSettings,
      sectionStyle: { ...currentStyle, ...style },
    });
  }

  function changeAllSectionStyles(style: Partial<InstitutionalSectionStyle>): void {
    if (!page) return;
    page.sections.forEach((section) => changeSectionStyle(section.id, style));
  }

  async function addSection(
    sectionType: InstitutionalSectionType,
    preferredVariantVersionId?: string,
    beforeSectionId: string | null = null,
  ): Promise<void> {
    if (!page) return;
    if (
      sectionType === "site_footer" &&
      page.sections.some((section) => section.sectionType === "site_footer")
    ) {
      setError("Este site já possui um rodapé. Edite o rodapé existente ou troque sua variante.");
      return;
    }
    const variant = preferredVariantVersionId
      ? variants.find((item) => item.versionId === preferredVariantVersionId)
      : findRecommendedVariant(variants, sectionType);

    if (!variant) {
      setError("Nenhuma variante disponível para este tipo de seção.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await flushPendingSectionSaves();
      let updated = await addInstitutionalSection(page.id, {
        sectionType,
        variantVersionId: variant.versionId,
        content: createDefaultSectionContent(sectionType),
        settings: defaultSettingsForVariant(variant),
      });
      let updatedPage = updated.pages.find((item) => item.id === page.id);
      const createdSection = updatedPage?.sections.reduce<InstitutionalSection | null>(
        (latest, section) => !latest || section.position > latest.position ? section : latest,
        null,
      ) ?? null;

      if (createdSection && sectionType !== "site_footer") {
        const currentIds = updatedPage?.sections.map((section) => section.id) ?? [];
        const withoutCreated = currentIds.filter((id) => id !== createdSection.id);
        const footerId = updatedPage?.sections.find((section) => section.sectionType === "site_footer")?.id;
        const insertionIndex = beforeSectionId
          ? Math.max(0, withoutCreated.indexOf(beforeSectionId))
          : footerId
            ? Math.max(0, withoutCreated.indexOf(footerId))
            : withoutCreated.length;
        const nextIds = [...withoutCreated];
        nextIds.splice(insertionIndex < 0 ? nextIds.length : insertionIndex, 0, createdSection.id);
        updated = await reorderInstitutionalSections(page.id, nextIds);
        updatedPage = updated.pages.find((item) => item.id === page.id);
      }

      adoptSite(updated);
      setSelectedSectionId(createdSection?.id ?? updatedPage?.sections.at(-1)?.id ?? null);
      setSelectedElementId(null);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function changeVariant(sectionId: string, variantVersionId: string): Promise<void> {
    const section = page?.sections.find((item) => item.id === sectionId);
    if (!section) return;
    setSavingState("saving");
    try {
      await flushPendingSectionSaves();
      const selectedVariant = variants.find((item) => item.versionId === variantVersionId);
      const nextSettings = {
        ...section.settings,
        ...(selectedVariant ? defaultSettingsForVariant(selectedVariant) : {}),
      };
      delete nextSettings.layoutOverride;
      const updated = await updateInstitutionalSection(section.id, {
        variantVersionId,
        settings: nextSettings,
      });
      adoptSite(updated);
      setSelectedSectionId(section.id);
      setSelectedElementId(null);
      setSavingState("saved");
    } catch (caught) {
      setSavingState("error");
      setError(messageFromError(caught));
    }
  }

  async function uploadImage(sectionId: string, path: Array<string | number>, file: File): Promise<void> {
    setSavingState("saving");
    try {
      const asset = await uploadInstitutionalMedia(file);
      changeSectionContent(sectionId, path, { assetId: asset.id, alt: "", url: asset.url });
    } catch (caught) {
      setSavingState("error");
      setError(messageFromError(caught));
    }
  }
  async function uploadSectionBackground(sectionId: string, file: File, applyToAll = false): Promise<void> {
    setSavingState("saving");
    try {
      const asset = await uploadInstitutionalMedia(file);
      const patch: Partial<InstitutionalSectionStyle> = {
        backgroundImage: { assetId: asset.id, alt: "", url: asset.url },
        backgroundTreatment: "dark",
        backgroundPositionX: 50,
        backgroundPositionY: 50,
      };
      if (applyToAll) changeAllSectionStyles(patch);
      else changeSectionStyle(sectionId, patch);
    } catch (caught) {
      setSavingState("error");
      setError(messageFromError(caught));
    }
  }

  async function uploadElementImage(
    sectionId: string,
    elementId: string,
    file: File,
  ): Promise<void> {
    setSavingState("saving");
    try {
      const asset = await uploadInstitutionalMedia(file);
      changeElementValue(sectionId, elementId, {
        assetId: asset.id,
        alt: "",
        url: asset.url,
      });
    } catch (caught) {
      setSavingState("error");
      setError(messageFromError(caught));
    }
  }

  async function duplicateSection(sectionId: string): Promise<void> {
    const source = page?.sections.find((section) => section.id === sectionId);
    if (source?.sectionType === "site_footer") {
      setError("O rodapé é único no site e não pode ser duplicado.");
      return;
    }
    setBusy(true);
    try {
      await flushPendingSectionSaves();
      adoptSite(await duplicateInstitutionalSection(sectionId));
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function removeSection(): Promise<void> {
    if (!deleteTargetId) return;
    const sectionId = deleteTargetId;
    setBusy(true);
    try {
      await flushPendingSectionSaves();
      const updated = await deleteInstitutionalSection(sectionId);
      pendingSaveContentRef.current.delete(sectionId);
      pendingSaveSettingsRef.current.delete(sectionId);
      latestContentRef.current.delete(sectionId);
      latestSettingsRef.current.delete(sectionId);
      adoptSite(updated);
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
        setSelectedElementId(null);
      }
      setDeleteTargetId(null);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function toggleSection(sectionId: string): Promise<void> {
    const section = page?.sections.find((item) => item.id === sectionId);
    if (!section) return;
    try {
      await flushPendingSectionSaves();
      adoptSite(await updateInstitutionalSection(sectionId, { visible: !section.visible }));
    } catch (caught) {
      setError(messageFromError(caught));
    }
  }

  async function reorder(sectionIds: string[]): Promise<void> {
    if (!page) return;
    const footerId = page.sections.find((section) => section.sectionType === "site_footer")?.id;
    const normalizedIds = footerId
      ? [...sectionIds.filter((id) => id !== footerId), footerId]
      : sectionIds;
    setBusy(true);
    try {
      await flushPendingSectionSaves();
      adoptSite(await reorderInstitutionalSections(page.id, normalizedIds));
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setBusy(false);
    }
  }

  function moveSectionByDirection(sectionId: string, direction: -1 | 1): void {
    if (!page) return;
    const body = page.sections.filter((section) => section.sectionType !== "site_footer");
    const index = body.findIndex((section) => section.id === sectionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= body.length) return;
    const ids = body.map((section) => section.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const footerId = page.sections.find((section) => section.sectionType === "site_footer")?.id;
    void reorder(footerId ? [...ids, footerId] : ids);
  }

  async function publish(): Promise<void> {
    if (!site) return;
    setPublishing(true);
    setError("");
    try {
      await flushPendingSectionSaves();
      const publication = await publishInstitutionalSite(site.id);
      setSite((current) => current ? { ...current, publishedAt: publication.publishedAt, isPrimary: true } : current);
      setPublishConfirmOpen(false);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setPublishing(false);
    }
  }

  async function saveBrand(draft: BrandDraft): Promise<void> {
    setBrandSaving(true);
    setError("");
    try {
      const brand = await updateInstitutionalBrand(draft);
      setSite((current) => current ? { ...current, brand } : current);
      setBrandOpen(false);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setBrandSaving(false);
    }
  }

  async function uploadLogo(file: File): Promise<void> {
    if (!site) return;
    setBrandSaving(true);
    setError("");
    try {
      const [asset, palette] = await Promise.all([
        uploadInstitutionalMedia(file),
        extractLogoPalette(file).catch(() => []),
      ]);
      if (palette.length > 0) setSuggestedPalette(palette);
      const brand = await updateInstitutionalBrand({
        logoAssetId: asset.id,
        primaryColor: site.brand.primaryColor,
        secondaryColor: site.brand.secondaryColor,
        accentColor: site.brand.accentColor,
        backgroundColor: site.brand.backgroundColor,
        textColor: site.brand.textColor,
        headingFont: site.brand.headingFont,
        bodyFont: site.brand.bodyFont,
      });
      setSite((current) => current ? { ...current, brand } : current);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setBrandSaving(false);
    }
  }

  async function applyPalette(palette: string[]): Promise<void> {
    if (!site || palette.length === 0) return;
    const suggestion = buildBrandPaletteSuggestion(palette);
    setBrandSaving(true);
    setError("");
    try {
      const brand = await updateInstitutionalBrand({
        logoAssetId: site.brand.logoAssetId,
        primaryColor: suggestion.primaryColor,
        secondaryColor: suggestion.secondaryColor,
        accentColor: suggestion.accentColor,
        backgroundColor: suggestion.backgroundColor,
        textColor: suggestion.textColor,
        headingFont: site.brand.headingFont,
        bodyFont: site.brand.bodyFont,
      });
      setSite((current) => current ? { ...current, brand } : current);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setBrandSaving(false);
    }
  }

  async function leaveEditor(): Promise<void> {
    setError("");
    try {
      await flushPendingSectionSaves();
      navigate("/app/site-institucional");
    } catch (caught) {
      setSavingState("error");
      setError(messageFromError(caught));
    }
  }

  if (loading || !site || !page) {
    return <div className={styles.loading}>Carregando editor...</div>;
  }

  const canvasWidth = device === "mobile" ? "430px" : device === "tablet" ? "820px" : "100%";

  return (
    <div className={styles.editor}>
      <EditorToolbar
        title={site.name}
        subtitle={site.organization.name}
        device={device}
        savingState={savingState}
        publishing={publishing}
        published={Boolean(site.publishedAt)}
        canUndo={historyState.undo > 0}
        canRedo={historyState.redo > 0}
        onUndo={() => void undoHistory()}
        onRedo={() => void redoHistory()}
        onBack={() => void leaveEditor()}
        onDeviceChange={setDevice}
        onHelp={() => setHelpOpen(true)}
        onPreview={() => setPreviewOpen(true)}
        onBrand={() => setBrandOpen(true)}
        onPublish={() => setPublishConfirmOpen(true)}
      />

      {error ? (
        <div className={styles.errorBar}>
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Fechar aviso"><FiX /></button>
        </div>
      ) : null}

      <div className={styles.workspace}>
        <SectionLibrary
          disabled={busy}
          brand={site.brand}
          selectedSection={selectedSection}
          variants={variants}
          sections={page.sections}
          selectedSectionId={selectedSectionId}
          selectedElementId={selectedElementId}
          collapsed={libraryCollapsed}
          onToggleCollapsed={() => {
            setLibraryCollapsed((current) => {
              const next = !current;
              localStorage.setItem("cong:institutional-library-collapsed", next ? "1" : "0");
              return next;
            });
          }}
          onAddSection={(type, variantVersionId) => {
            const selectedIndex = page.sections.findIndex((section) => section.id === selectedSectionId);
            const nextSection = selectedIndex >= 0 ? page.sections[selectedIndex + 1] : undefined;
            void addSection(type, variantVersionId, nextSection?.id ?? null);
          }}
          onAddElement={addElement}
          onSelectSection={(sectionId) => {
            setSelectedSectionId(sectionId);
            setSelectedElementId(null);
            document.querySelector(`[data-section-id="${sectionId}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          onMoveSection={moveSectionByDirection}
          onToggleSectionVisibility={(sectionId) => void toggleSection(sectionId)}
          onSelectElement={(sectionId, elementId) => { setSelectedSectionId(sectionId); setSelectedElementId(elementId); }}
          onElementStyleChange={changeElementStyle}
          onSectionStyleChange={changeSectionStyle}
          onApplySectionStyleToAll={changeAllSectionStyles}
          onUploadSectionBackground={(sectionId, file, applyToAll) => void uploadSectionBackground(sectionId, file, applyToAll)}
        />

        <div className={styles.canvasArea}>
          <div className={styles.stageBar}>
            <div className={styles.stageContext}>
              <strong>Página</strong>
              <span>
                {selectedSection
                  ? `Página inicial › ${getSectionDefinition(selectedSection.sectionType).name}${selectedElement ? ` › ${selectedElement.type === "element" ? ({ heading: "Título", text: "Texto", image: "Imagem", button: "Botão", icon: "Ícone", metric: "Número em destaque", quote: "Destaque", divider: "Linha divisória", spacer: "Espaço" } as const)[selectedElement.elementType] : selectedElement.type === "slot" ? "Conteúdo" : "Elemento"}` : ""}`
                  : "Clique no próprio site para editar. Use + entre as seções para adicionar conteúdo."}
              </span>
            </div>
            <div className={styles.stageActions}>
              {site.sourceTemplateId ? <small>{constraintsUnlocked ? "Edição livre" : "Modelo guiado"}</small> : <small>Criação livre</small>}
              <small>{device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Celular"}</small>
            </div>
          </div>
          <div className={styles.canvasViewport}>
            <div className={styles.canvas} style={{ width: canvasWidth }}>
              <InstitutionalSiteView
                site={site}
                page={page}
                editor
                selectedSectionId={selectedSectionId}
                selectedElementId={selectedElementId}
                onSelectSection={(sectionId) => {
                  setSelectedSectionId(sectionId);
                  setSelectedElementId(null);
                }}
                onSelectElement={(sectionId, elementId) => {
                  setSelectedSectionId(sectionId);
                  setSelectedElementId(elementId);
                }}
                onSectionValueChange={changeSectionContent}
                onImageRequest={(sectionId, path) => {
                  setPendingImageTarget({ kind: "content", sectionId, path });
                  directImageInputRef.current?.click();
                }}
                onElementValueChange={changeElementValue}
                onElementImageRequest={(sectionId, elementId) => {
                  setPendingImageTarget({ kind: "element", sectionId, elementId });
                  directImageInputRef.current?.click();
                }}
                onElementStyleChange={changeElementStyle}
                onMoveElement={moveElement}
                onRemoveElement={removeElement}
                onAddElementToSection={addElementToSection}
                variants={variants}
                busy={busy}
                onAddSectionType={(sectionType, beforeSectionId, variantVersionId) => void addSection(sectionType, variantVersionId, beforeSectionId ?? null)}
                onVariantChange={(sectionId, variantVersionId) => void changeVariant(sectionId, variantVersionId)}
                onDuplicateSection={(sectionId) => void duplicateSection(sectionId)}
                onDeleteSection={setDeleteTargetId}
                onToggleSectionVisibility={(sectionId) => void toggleSection(sectionId)}
                onReorderSections={(sectionIds) => void reorder(sectionIds)}
              />
            </div>
          </div>
        </div>

        {propertiesOpen ? (
          <PropertiesPanel
            section={selectedSection}
            variants={variants}
            onCollapse={() => setPropertiesOpen(false)}
            onContentChange={(path, value) => {
              if (selectedSection) changeSectionContent(selectedSection.id, path, value);
            }}
            onVariantChange={(versionId) => selectedSection ? void changeVariant(selectedSection.id, versionId) : undefined}
            onUploadImage={(path, file) => {
              if (selectedSection) void uploadImage(selectedSection.id, path, file);
            }}
            selectedElement={selectedElement}
            brand={site.brand}
            designFrames={designResources.frames}
            onElementStyleChange={(style) => {
              if (selectedSection && selectedElementId) {
                changeElementStyle(selectedSection.id, selectedElementId, style);
              }
            }}
            onElementValueChange={(value) => {
              if (selectedSection && selectedElementId) {
                changeElementValue(selectedSection.id, selectedElementId, value);
              }
            }}
            onRemoveElement={() => {
              if (selectedSection && selectedElementId) {
                removeElement(selectedSection.id, selectedElementId);
              }
            }}
            onSectionStyleChange={(style) => {
              if (selectedSection) changeSectionStyle(selectedSection.id, style);
            }}
            onUploadSectionBackground={(file) => {
              if (selectedSection) void uploadSectionBackground(selectedSection.id, file);
            }}
          />
        ) : (
          <button type="button" className={styles.openProperties} onClick={() => setPropertiesOpen(true)}>
            <FiChevronLeft /> Propriedades
          </button>
        )}
      </div>

      <input
        ref={directImageInputRef}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && pendingImageTarget) {
            if (pendingImageTarget.kind === "content") {
              void uploadImage(
                pendingImageTarget.sectionId,
                pendingImageTarget.path,
                file,
              );
            } else {
              void uploadElementImage(
                pendingImageTarget.sectionId,
                pendingImageTarget.elementId,
                file,
              );
            }
          }
          event.currentTarget.value = "";
          setPendingImageTarget(null);
        }}
      />

      {previewOpen ? (
        <div className={styles.previewBackdrop}>
          <div className={styles.previewHeader}>
            <div>
              <strong>Visualização do rascunho</strong>
              <span>Dicas, seleções e controles de edição ficam ocultos aqui.</span>
            </div>
            <button type="button" onClick={() => setPreviewOpen(false)}><FiX /> Fechar</button>
          </div>
          <div className={styles.previewBody}><InstitutionalSiteView site={site} page={page} /></div>
        </div>
      ) : null}

      <ModalMensagem
        aberto={helpOpen}
        titulo="Como usar o editor"
        tamanho="pequeno"
        mostrarBotaoOk={false}
        onFechar={() => setHelpOpen(false)}
        mensagem={
          <ol className={styles.helpSteps}>
            <li><FiHelpCircle /><div><strong>Adicione o que precisa.</strong><span>Escolha seções pelo significado, não por termos técnicos de layout.</span></div></li>
            <li><FiHelpCircle /><div><strong>Edite no próprio site.</strong><span>Clique em textos e imagens. Contadores e recomendações aparecem perto do conteúdo.</span></div></li>
            <li><FiHelpCircle /><div><strong>Reorganize sem medo.</strong><span>O site publicado só muda quando você confirmar uma nova publicação.</span></div></li>
          </ol>
        }
      />

      {brandOpen ? (
        <BrandPanel
          key={`${site.brand.logoAssetId ?? "no-logo"}-${site.brand.primaryColor}`}
          brand={site.brand}
          saving={brandSaving}
          suggestedPalette={suggestedPalette}
          communityPalettes={designResources.palettes}
          onClose={() => setBrandOpen(false)}
          onSave={(draft) => void saveBrand(draft)}
          onUploadLogo={(file) => void uploadLogo(file)}
          onApplyPalette={(palette) => void applyPalette(palette)}
        />
      ) : null}

      <ConfirmActionModal
        open={Boolean(deleteTargetId)}
        title="Excluir esta seção?"
        description="A seção será removida do rascunho deste site. O site publicado permanece como está até uma nova publicação."
        confirmLabel="Excluir seção"
        tone="danger"
        busy={busy}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => void removeSection()}
      />

      <ConfirmActionModal
        open={Boolean(constraintPrompt)}
        title="Sair dos limites recomendados do modelo?"
        description="Este template foi configurado com limites para preservar a composição e a responsividade. Você pode liberar a edição e continuar; a CONG seguirá mostrando avisos de legibilidade e responsividade quando necessário."
        confirmLabel="Liberar edição"
        onCancel={() => setConstraintPrompt(null)}
        onConfirm={() => {
          if (!constraintPrompt) return;
          if (siteId) {
            sessionStorage.setItem(`cong:site:${siteId}:free-edit`, "1");
            setUnlockedSiteIds((current) => {
              const next = new Set(current);
              next.add(siteId);
              return next;
            });
          }
          applyElementStyle(constraintPrompt.sectionId, constraintPrompt.elementId, constraintPrompt.style);
          setConstraintPrompt(null);
        }}
      />

      <ConfirmActionModal
        open={publishConfirmOpen}
        title={site.publishedAt ? "Publicar uma nova versão?" : "Publicar este site?"}
        description={
          <>
            Este site passará a ser o site público principal de <strong>{site.organization.name}</strong>.
            Se outro site estiver publicado, ele será substituído como principal.
          </>
        }
        confirmLabel={site.publishedAt ? "Publicar nova versão" : "Publicar site"}
        busy={publishing}
        onCancel={() => setPublishConfirmOpen(false)}
        onConfirm={() => void publish()}
      />
    </div>
  );
}
