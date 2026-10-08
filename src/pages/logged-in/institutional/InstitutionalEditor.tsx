import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiHelpCircle, FiLayers, FiX } from "react-icons/fi";
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
import { exceedsEditorConstraints, FREE_EDITOR_CONSTRAINTS } from "../../../utils/institutionalConstraints";
import {
  buildBrandPaletteSuggestion,
  extractLogoPalette,
} from "../../../utils/institutionalPalette";
import {
  appendElement,
  applyOffsetDeltaToLayoutNodes,
  autoOrganizeInstitutionalLayout,
  collectGroupMemberIds,
  createElementNode,
  effectiveSectionLayout,
  ensureLayoutNodeIds,
  findLayoutNode,
  groupLayoutNodes,
  mergeElementStyle,
  moveLayoutNode,
  removeLayoutNode,
  removeLayoutNodes,
  ungroupLayoutNodes,
  updateLayoutNode,
} from "../../../utils/institutionalLayout";
import {
  defaultSettingsForVariant,
  findRecommendedVariant,
} from "../../../utils/institutionalVariants";

import styles from "./InstitutionalEditor.module.css";

type SavingState = "idle" | "saving" | "saved" | "error";
type BrandDraft = Omit<InstitutionalBrand, "organizationId" | "publicSlug" | "logoAsset">;

interface InstitutionalRecoveryDraft {
  version: 1;
  savedAt: string;
  content: Record<string, Record<string, unknown>>;
  settings: Record<string, Record<string, unknown>>;
}

function recoveryDraftKey(siteId: string): string {
  return `cong:institutional-recovery:${siteId}`;
}

function readRecoveryDraft(siteId: string): InstitutionalRecoveryDraft | null {
  try {
    const raw = localStorage.getItem(recoveryDraftKey(siteId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InstitutionalRecoveryDraft>;
    if (
      parsed.version !== 1 ||
      !parsed.content ||
      typeof parsed.content !== "object" ||
      !parsed.settings ||
      typeof parsed.settings !== "object"
    ) {
      localStorage.removeItem(recoveryDraftKey(siteId));
      return null;
    }
    return parsed as InstitutionalRecoveryDraft;
  } catch {
    localStorage.removeItem(recoveryDraftKey(siteId));
    return null;
  }
}

function applyRecoveryDraft(
  site: InstitutionalSite,
  draft: InstitutionalRecoveryDraft,
): InstitutionalSite {
  return {
    ...site,
    pages: site.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        content: draft.content[section.id] ?? section.content,
        settings: draft.settings[section.id] ?? section.settings,
      })),
    })),
  };
}

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
    selection: { sectionId: selectedSectionId, elementId: selectedElementId, elementIds: selectedElementIds },
    setSectionId: setSelectedSectionId,
    setElementId: setSelectedElementId,
    setElementIds: setSelectedElementIds,
    selectElement: selectEditorElement,
    selectElements: selectEditorElements,
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

  const syncRecoveryDraft = useCallback((): void => {
    if (!siteId) return;

    const content = Object.fromEntries(pendingSaveContentRef.current.entries());
    const settings = Object.fromEntries(pendingSaveSettingsRef.current.entries());
    if (Object.keys(content).length === 0 && Object.keys(settings).length === 0) {
      localStorage.removeItem(recoveryDraftKey(siteId));
      return;
    }

    const draft: InstitutionalRecoveryDraft = {
      version: 1,
      savedAt: new Date().toISOString(),
      content,
      settings,
    };

    try {
      localStorage.setItem(recoveryDraftKey(siteId), JSON.stringify(draft));
    } catch {
      // A edição continua funcionando mesmo quando o navegador bloqueia armazenamento local.
    }
  }, [siteId]);

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
    document.body.classList.add("cong-institutional-editor-active");
    return () => {
      document.body.classList.remove("cong-institutional-editor-active");
    };
  }, []);

  useEffect(() => {
    if (!siteId) {
      navigate("/app/site-institucional", { replace: true });
      return;
    }

    let active = true;
    const timers = saveTimersRef.current;
    const settingsTimers = settingsTimersRef.current;

    void Promise.all([getInstitutionalSite(siteId), getInstitutionalVariants(), getInstitutionalDesignResources()])
      .then(async ([currentSite, availableVariants, availableDesignResources]) => {
        if (!active) return;

        const recoveryDraft = readRecoveryDraft(siteId);
        const recoveredSite = recoveryDraft
          ? applyRecoveryDraft(currentSite, recoveryDraft)
          : currentSite;

        adoptSite(recoveredSite);
        setVariants(availableVariants);
        setDesignResources(availableDesignResources);

        if (!recoveryDraft) {
          setSavingState("saved");
          return;
        }

        const availableSectionIds = new Set(
          currentSite.pages.flatMap((currentPage) =>
            currentPage.sections.map((section) => section.id),
          ),
        );
        const recoveredContent = Object.entries(recoveryDraft.content).filter(
          ([sectionId]) => availableSectionIds.has(sectionId),
        );
        const recoveredSettings = Object.entries(recoveryDraft.settings).filter(
          ([sectionId]) => availableSectionIds.has(sectionId),
        );

        recoveredContent.forEach(([sectionId, content]) => {
          pendingSaveContentRef.current.set(sectionId, content);
        });
        recoveredSettings.forEach(([sectionId, settings]) => {
          pendingSaveSettingsRef.current.set(sectionId, settings);
        });

        if (recoveredContent.length === 0 && recoveredSettings.length === 0) {
          localStorage.removeItem(recoveryDraftKey(siteId));
          setSavingState("saved");
          return;
        }

        setSavingState("saving");
        const sectionIds = new Set([
          ...recoveredContent.map(([sectionId]) => sectionId),
          ...recoveredSettings.map(([sectionId]) => sectionId),
        ]);

        try {
          await Promise.all(
            [...sectionIds].map((sectionId) =>
              updateInstitutionalSection(sectionId, {
                ...(recoveryDraft.content[sectionId]
                  ? { content: recoveryDraft.content[sectionId] }
                  : {}),
                ...(recoveryDraft.settings[sectionId]
                  ? { settings: recoveryDraft.settings[sectionId] }
                  : {}),
              }),
            ),
          );
          pendingSaveContentRef.current.clear();
          pendingSaveSettingsRef.current.clear();
          localStorage.removeItem(recoveryDraftKey(siteId));
          if (active) setSavingState("saved");
        } catch (caught) {
          if (active) {
            setSavingState("error");
            setError(
              `${messageFromError(caught)} Suas alterações locais continuam guardadas neste navegador.`,
            );
          }
        }
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

  const selectedGroupId = useMemo(() => {
    if (!selectedElement || (selectedElement.type !== "slot" && selectedElement.type !== "element")) return null;
    return selectedElement.style?.groupId ?? null;
  }, [selectedElement]);

  const selectedGroupMemberIds = useMemo(() => {
    if (!selectedSection || !selectedGroupId) return [];
    const layout = ensureLayoutNodeIds(
      effectiveSectionLayout(selectedSection.layout, selectedSection.settings),
    );
    return collectGroupMemberIds(layout, selectedGroupId);
  }, [selectedGroupId, selectedSection]);

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
  }, [selectedElementId, selectedSectionId, setSelectedElementId, setSelectedSectionId]);

  const persistSectionContent = useCallback(
    async (sectionId: string, content: Record<string, unknown>): Promise<void> => {
      await updateInstitutionalSection(sectionId, { content });
      if (pendingSaveContentRef.current.get(sectionId) === content) {
        pendingSaveContentRef.current.delete(sectionId);
      }
      syncRecoveryDraft();
      setSavingState(
        pendingSaveContentRef.current.size === 0 && pendingSaveSettingsRef.current.size === 0
          ? "saved"
          : "saving",
      );
    },
    [syncRecoveryDraft],
  );

  const queueSectionSave = useCallback(
    (sectionId: string, content: Record<string, unknown>): void => {
      const existing = saveTimersRef.current.get(sectionId);
      if (existing) window.clearTimeout(existing);

      pendingSaveContentRef.current.set(sectionId, content);
      syncRecoveryDraft();
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
    [persistSectionContent, syncRecoveryDraft],
  );
  const persistSectionSettings = useCallback(
    async (sectionId: string, settings: Record<string, unknown>): Promise<void> => {
      await updateInstitutionalSection(sectionId, { settings });
      if (pendingSaveSettingsRef.current.get(sectionId) === settings) {
        pendingSaveSettingsRef.current.delete(sectionId);
      }
      syncRecoveryDraft();
      setSavingState(
        pendingSaveContentRef.current.size === 0 && pendingSaveSettingsRef.current.size === 0
          ? "saved"
          : "saving",
      );
    },
    [syncRecoveryDraft],
  );

  const queueSectionSettingsSave = useCallback(
    (sectionId: string, settings: Record<string, unknown>): void => {
      const existing = settingsTimersRef.current.get(sectionId);
      if (existing) window.clearTimeout(existing);

      pendingSaveSettingsRef.current.set(sectionId, settings);
      syncRecoveryDraft();
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
    [persistSectionSettings, syncRecoveryDraft],
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
    syncRecoveryDraft();
    setSavingState("saved");
  }, [syncRecoveryDraft]);


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
          const latestSettings = latestSettingsRef.current.get(sectionId) ?? currentSection.settings;
          const layout = ensureLayoutNodeIds(
            effectiveSectionLayout(currentSection.layout, latestSettings),
          );
          const currentNode = findLayoutNode(layout, elementId);
          if (
            currentNode &&
            (currentNode.type === "slot" || currentNode.type === "element") &&
            exceedsEditorConstraints(
              currentNode.style ?? {},
              style,
              site.editorConstraints,
              currentNode.constraints,
            )
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

  const reorderElementLayers = useCallback((sectionId: string, orderedElementIds: string[]): void => {
    if (orderedElementIds.length === 0) return;
    updateSectionLayout(sectionId, (layout) => {
      let next = layout;
      const count = Math.max(orderedElementIds.length - 1, 1);
      orderedElementIds.forEach((elementId, index) => {
        const zIndex = Math.round(50 - (70 * index) / count);
        next = updateLayoutNode(next, elementId, (node) => mergeElementStyle(node, { zIndex }));
      });
      return next;
    });
  }, [updateSectionLayout]);

  const autoOrganizeSection = useCallback((sectionId: string): void => {
    updateSectionLayout(sectionId, autoOrganizeInstitutionalLayout);
  }, [updateSectionLayout]);

  const toggleEditingMode = useCallback((): void => {
    if (!siteId || !site?.sourceTemplateId) return;
    if (constraintsUnlocked) {
      sessionStorage.removeItem(`cong:site:${siteId}:free-edit`);
      setUnlockedSiteIds((current) => {
        const next = new Set(current);
        next.delete(siteId);
        return next;
      });
      return;
    }
    sessionStorage.setItem(`cong:site:${siteId}:free-edit`, "1");
    setUnlockedSiteIds((current) => new Set(current).add(siteId));
  }, [constraintsUnlocked, site?.sourceTemplateId, siteId]);


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
    [setSelectedElementId, updateSectionLayout],
  );

  const removeSelectedElements = useCallback((): void => {
    if (!selectedSectionId || selectedElementIds.length === 0) return;
    updateSectionLayout(selectedSectionId, (layout) =>
      removeLayoutNodes(layout, selectedElementIds),
    );
    setSelectedElementIds([]);
  }, [selectedElementIds, selectedSectionId, setSelectedElementIds, updateSectionLayout]);

  const moveSelectedElements = useCallback((sectionId: string, deltaX: number, deltaY: number, explicitIds?: string[]): void => {
    const ids = explicitIds && explicitIds.length > 1 ? explicitIds : selectedElementIds;
    if (ids.length <= 1) return;
    updateSectionLayout(sectionId, (layout) =>
      applyOffsetDeltaToLayoutNodes(layout, ids, deltaX, deltaY),
    );
  }, [selectedElementIds, updateSectionLayout]);

  const handleSelectElement = useCallback((sectionId: string, elementId: string, additive = false): void => {
    setSelectedSectionId(sectionId);
    if (additive) {
      selectEditorElement(sectionId, elementId, true);
      setPropertiesOpen(true);
      return;
    }

    const section = page?.sections.find((item) => item.id === sectionId);
    if (!section) {
      selectEditorElement(sectionId, elementId, false);
      setPropertiesOpen(true);
      return;
    }
    const layout = ensureLayoutNodeIds(effectiveSectionLayout(section.layout, section.settings));
    const node = findLayoutNode(layout, elementId);
    const groupId = node && (node.type === "slot" || node.type === "element") ? node.style?.groupId : undefined;
    if (groupId) {
      const members = collectGroupMemberIds(layout, groupId);
      selectEditorElements(sectionId, [...members.filter((id) => id !== elementId), elementId]);
    } else {
      selectEditorElement(sectionId, elementId, false);
    }
    setPropertiesOpen(true);
  }, [page, selectEditorElement, selectEditorElements, setSelectedSectionId]);

  const groupSelectedElements = useCallback((): void => {
    if (!selectedSectionId || selectedElementIds.length < 2) return;
    let nextGroupId = "";
    updateSectionLayout(selectedSectionId, (layout) => {
      const grouped = groupLayoutNodes(layout, selectedElementIds, "manual");
      nextGroupId = grouped.groupId;
      return grouped.layout;
    });
    if (nextGroupId) {
      // Selection remains on the grouped members; future clicks on any member select the group.
      setSelectedElementIds(selectedElementIds);
    }
  }, [selectedElementIds, selectedSectionId, setSelectedElementIds, updateSectionLayout]);

  const ungroupSelectedElements = useCallback((): void => {
    if (!selectedSectionId || !selectedGroupId) return;
    const members = selectedGroupMemberIds;
    updateSectionLayout(selectedSectionId, (layout) => ungroupLayoutNodes(layout, selectedGroupId));
    setSelectedElementIds(members);
  }, [selectedGroupId, selectedGroupMemberIds, selectedSectionId, setSelectedElementIds, updateSectionLayout]);

  const alignSelectedElements = useCallback((
    axis: "horizontal" | "vertical",
    mode: "start" | "center" | "end",
  ): void => {
    if (!selectedSectionId || selectedElementIds.length < 2 || typeof document === "undefined") return;
    const items = selectedElementIds
      .map((id) => {
        const element = document.querySelector<HTMLElement>(`[data-cong-node-id="${CSS.escape(id)}"]`);
        return element ? { id, rect: element.getBoundingClientRect() } : null;
      })
      .filter((item): item is { id: string; rect: DOMRect } => Boolean(item));
    if (items.length < 2) return;

    const minLeft = Math.min(...items.map((item) => item.rect.left));
    const maxRight = Math.max(...items.map((item) => item.rect.right));
    const minTop = Math.min(...items.map((item) => item.rect.top));
    const maxBottom = Math.max(...items.map((item) => item.rect.bottom));
    const target = axis === "horizontal"
      ? mode === "start" ? minLeft : mode === "end" ? maxRight : (minLeft + maxRight) / 2
      : mode === "start" ? minTop : mode === "end" ? maxBottom : (minTop + maxBottom) / 2;

    const deltas = items.map((item) => {
      const current = axis === "horizontal"
        ? mode === "start" ? item.rect.left : mode === "end" ? item.rect.right : item.rect.left + item.rect.width / 2
        : mode === "start" ? item.rect.top : mode === "end" ? item.rect.bottom : item.rect.top + item.rect.height / 2;
      return { id: item.id, dx: axis === "horizontal" ? target - current : 0, dy: axis === "vertical" ? target - current : 0 };
    });

    updateSectionLayout(selectedSectionId, (layout) =>
      deltas.reduce((nextLayout, delta) =>
        updateLayoutNode(nextLayout, delta.id, (node) => {
          if (node.type !== "slot" && node.type !== "element") return node;
          return mergeElementStyle(node, {
            offsetX: Math.round((node.style?.offsetX ?? 0) + delta.dx),
            offsetY: Math.round((node.style?.offsetY ?? 0) + delta.dy),
          });
        }), layout),
    );
  }, [selectedElementIds, selectedSectionId, updateSectionLayout]);

  const distributeSelectedElements = useCallback((axis: "horizontal" | "vertical"): void => {
    if (!selectedSectionId || selectedElementIds.length < 3 || typeof document === "undefined") return;
    const items = selectedElementIds
      .map((id) => {
        const element = document.querySelector<HTMLElement>(`[data-cong-node-id="${CSS.escape(id)}"]`);
        return element ? { id, rect: element.getBoundingClientRect() } : null;
      })
      .filter((item): item is { id: string; rect: DOMRect } => Boolean(item));
    if (items.length < 3) return;

    const sorted = [...items].sort((a, b) => axis === "horizontal" ? a.rect.left - b.rect.left : a.rect.top - b.rect.top);
    const first = sorted[0].rect;
    const last = sorted[sorted.length - 1].rect;
    const span = axis === "horizontal" ? last.right - first.left : last.bottom - first.top;
    const totalSize = sorted.reduce((sum, item) => sum + (axis === "horizontal" ? item.rect.width : item.rect.height), 0);
    const gap = (span - totalSize) / Math.max(sorted.length - 1, 1);
    let cursor = axis === "horizontal" ? first.left : first.top;
    const deltas = sorted.map((item) => {
      const current = axis === "horizontal" ? item.rect.left : item.rect.top;
      const delta = cursor - current;
      cursor += (axis === "horizontal" ? item.rect.width : item.rect.height) + gap;
      return { id: item.id, dx: axis === "horizontal" ? delta : 0, dy: axis === "vertical" ? delta : 0 };
    });

    updateSectionLayout(selectedSectionId, (layout) =>
      deltas.reduce((nextLayout, delta) =>
        updateLayoutNode(nextLayout, delta.id, (node) => {
          if (node.type !== "slot" && node.type !== "element") return node;
          return mergeElementStyle(node, {
            offsetX: Math.round((node.style?.offsetX ?? 0) + delta.dx),
            offsetY: Math.round((node.style?.offsetY ?? 0) + delta.dy),
          });
        }), layout),
    );
  }, [selectedElementIds, selectedSectionId, updateSectionLayout]);

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

      if (modifier && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) ungroupSelectedElements();
        else groupSelectedElements();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedElementIds.length > 0) {
        event.preventDefault();
        removeSelectedElements();
        return;
      }

      if (!selectedSectionId || !selectedElementId || !selectedElement) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;

      event.preventDefault();
      const step = event.shiftKey ? 12 : 4;
      const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      if (selectedElementIds.length > 1) {
        updateSectionLayout(selectedSectionId, (layout) => applyOffsetDeltaToLayoutNodes(layout, selectedElementIds, dx, dy));
        return;
      }
      const currentStyle =
        selectedElement.type === "slot" || selectedElement.type === "element"
          ? selectedElement.style ?? {}
          : {};
      changeElementStyle(selectedSectionId, selectedElementId, {
        offsetX: (currentStyle.offsetX ?? 0) + dx,
        offsetY: (currentStyle.offsetY ?? 0) + dy,
      });
    }

    window.addEventListener("keydown", handleEditorShortcut);
    return () => window.removeEventListener("keydown", handleEditorShortcut);
  }, [
    changeElementStyle,
    groupSelectedElements,
    redoHistory,
    removeSelectedElements,
    selectedElement,
    selectedElementId,
    selectedElementIds,
    selectedSectionId,
    undoHistory,
    ungroupSelectedElements,
    updateSectionLayout,
  ]);


  const addElementToSection = useCallback(
    (sectionId: string, elementType: InstitutionalElementType, initialValue?: string): void => {
      const element = createElementNode(elementType, initialValue);
      updateSectionLayout(sectionId, (layout) => appendElement(layout, element));
      setSelectedSectionId(sectionId);
      if (element.type === "element") setSelectedElementId(element.id);
    },
    [setSelectedElementId, setSelectedSectionId, updateSectionLayout],
  );

  const addElement = useCallback(
    (elementType: InstitutionalElementType, initialValue?: string): void => {
      if (!selectedSection) {
        setError("Selecione uma seção antes de adicionar um elemento.");
        return;
      }
      addElementToSection(selectedSection.id, elementType, initialValue);
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
      sectionType === "site_header" &&
      site?.pages.some((candidatePage) =>
        candidatePage.sections.some((section) => section.sectionType === "site_header"),
      )
    ) {
      setError("Este site já possui um cabeçalho global. Edite o cabeçalho existente ou troque seu design.");
      return;
    }
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
        settings: {
          ...defaultSettingsForVariant(variant),
          contentGuidance: {
            source: "contextual-request",
            needsReview: true,
          },
        },
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
    <div className={styles.editor} data-properties-open={propertiesOpen}>
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
          selectedElementIds={selectedElementIds}
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
          onSelectElement={handleSelectElement}
          onElementStyleChange={changeElementStyle}
          onReorderLayers={reorderElementLayers}
          onSectionStyleChange={changeSectionStyle}
          onApplySectionStyleToAll={changeAllSectionStyles}
          onUploadSectionBackground={(sectionId, file, applyToAll) => void uploadSectionBackground(sectionId, file, applyToAll)}
          onAutoOrganizeSection={autoOrganizeSection}
        />

        <div className={styles.canvasArea}>
          <div className={styles.stageBar}>
            <div className={styles.stageContext}>
              <strong>Página</strong>
              <span>
                {selectedSection
                  ? `Página inicial › ${getSectionDefinition(selectedSection.sectionType).name}${selectedElement ? ` › ${selectedElement.type === "element" ? ({ heading: "Título", text: "Texto", image: "Imagem", button: "Botão", icon: "Ícone", shape: "Forma", metric: "Número em destaque", quote: "Destaque", divider: "Linha divisória", spacer: "Espaço" } as const)[selectedElement.elementType] : selectedElement.type === "slot" ? "Conteúdo" : "Elemento"}` : ""}`
                  : "Clique no próprio site para editar. Use + entre as seções para adicionar conteúdo."}
              </span>
            </div>
            <div className={styles.stageActions}>
              {selectedElementIds.length > 1 ? (
                <div className={styles.selectionActions} aria-label="Ações da seleção">
                  <span>{selectedElementIds.length} selecionados</span>
                  {!selectedGroupId ? (
                    <div className={styles.selectionArrange} aria-label="Alinhar seleção">
                      <button type="button" onClick={() => alignSelectedElements("horizontal", "start")} title="Alinhar à esquerda" aria-label="Alinhar à esquerda">↤</button>
                      <button type="button" onClick={() => alignSelectedElements("horizontal", "center")} title="Centralizar horizontalmente" aria-label="Centralizar horizontalmente">↔</button>
                      <button type="button" onClick={() => alignSelectedElements("horizontal", "end")} title="Alinhar à direita" aria-label="Alinhar à direita">↦</button>
                      <button type="button" onClick={() => alignSelectedElements("vertical", "start")} title="Alinhar ao topo" aria-label="Alinhar ao topo">↥</button>
                      <button type="button" onClick={() => alignSelectedElements("vertical", "center")} title="Centralizar verticalmente" aria-label="Centralizar verticalmente">↕</button>
                      <button type="button" onClick={() => alignSelectedElements("vertical", "end")} title="Alinhar à base" aria-label="Alinhar à base">↧</button>
                      {selectedElementIds.length >= 3 ? (
                        <>
                          <button type="button" onClick={() => distributeSelectedElements("horizontal")} title="Distribuir horizontalmente" aria-label="Distribuir horizontalmente">H⋯</button>
                          <button type="button" onClick={() => distributeSelectedElements("vertical")} title="Distribuir verticalmente" aria-label="Distribuir verticalmente">V⋮</button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  {selectedGroupId ? (
                    <button type="button" onClick={ungroupSelectedElements} title="Desagrupar (Ctrl+Shift+G)"><FiLayers /> Desagrupar</button>
                  ) : (
                    <button type="button" onClick={groupSelectedElements} title="Agrupar (Ctrl+G)"><FiLayers /> Agrupar</button>
                  )}
                  <button type="button" className={styles.selectionDelete} onClick={removeSelectedElements} title="Excluir selecionados (Delete)">Excluir</button>
                </div>
              ) : null}
              {site.sourceTemplateId ? (
                <button type="button" className={styles.editingModeToggle} data-mode={constraintsUnlocked ? "free" : "guided"} onClick={toggleEditingMode} title={constraintsUnlocked ? "Voltar às proteções do modelo" : "Liberar movimentos e ajustes fora das recomendações"}>
                  <span>{constraintsUnlocked ? "Modo livre" : "Modo guiado"}</span>
                  <small>{constraintsUnlocked ? "Mais liberdade" : "Com recomendações"}</small>
                </button>
              ) : <span className={styles.editingModeStatic}>Modo livre</span>}
              <small>{device === "desktop" ? "Desktop" : device === "tablet" ? "Tablet" : "Celular"}</small>
            </div>
          </div>
          <div className={styles.canvasViewport}>
            <div className={styles.canvas} style={{ width: canvasWidth }}>
              <InstitutionalSiteView
                site={site}
                page={page}
                editor
                editorConstraints={constraintsUnlocked ? FREE_EDITOR_CONSTRAINTS : site.editorConstraints}
                selectedSectionId={selectedSectionId}
                selectedElementId={selectedElementId}
                selectedElementIds={selectedElementIds}
                onSelectSection={(sectionId) => {
                  setSelectedSectionId(sectionId);
                  setSelectedElementId(null);
                }}
                onSelectElement={handleSelectElement}
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
                onMoveSelection={moveSelectedElements}
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

        <div className={styles.propertiesDock} data-open={propertiesOpen}>
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
            <button
              type="button"
              className={styles.openProperties}
              onClick={() => setPropertiesOpen(true)}
              aria-label="Abrir painel de propriedades"
              aria-expanded="false"
              title="Abrir propriedades"
            >
              <svg viewBox="0 0 40 112" aria-hidden="true" focusable="false">
                <path className={styles.propertiesHandleShape} d="M38 1V34C38 42 30 44 25 49C22 52 20 55 20 56C20 57 22 60 25 63C30 68 38 70 38 78V111" />
                <path className={styles.propertiesHandleChevron} d="M31 50L25 56L31 62" />
              </svg>
            </button>
          )}
        </div>
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
