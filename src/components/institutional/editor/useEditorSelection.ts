import { useCallback, useState } from "react";

export interface InstitutionalEditorSelection {
  sectionId: string | null;
  elementId: string | null;
  elementIds: string[];
}

const EMPTY_SELECTION: InstitutionalEditorSelection = {
  sectionId: null,
  elementId: null,
  elementIds: [],
};

export function useEditorSelection() {
  const [selection, setSelection] =
    useState<InstitutionalEditorSelection>(EMPTY_SELECTION);

  const setSectionId = useCallback((sectionId: string | null): void => {
    setSelection((current) => ({
      sectionId,
      elementId: sectionId === current.sectionId ? current.elementId : null,
      elementIds: sectionId === current.sectionId ? current.elementIds : [],
    }));
  }, []);

  const setElementId = useCallback((elementId: string | null): void => {
    setSelection((current) => ({
      ...current,
      elementId,
      elementIds: elementId ? [elementId] : [],
    }));
  }, []);

  const setElementIds = useCallback((elementIds: string[]): void => {
    const unique = [...new Set(elementIds)];
    setSelection((current) => ({
      ...current,
      elementIds: unique,
      elementId: unique[unique.length - 1] ?? null,
    }));
  }, []);

  const selectSection = useCallback((sectionId: string): void => {
    setSelection({ sectionId, elementId: null, elementIds: [] });
  }, []);

  const selectElement = useCallback(
    (sectionId: string, elementId: string, additive = false): void => {
      setSelection((current) => {
        if (!additive || current.sectionId !== sectionId) {
          return { sectionId, elementId, elementIds: [elementId] };
        }

        const exists = current.elementIds.includes(elementId);
        const nextIds = exists
          ? current.elementIds.filter((id) => id !== elementId)
          : [...current.elementIds, elementId];
        return {
          sectionId,
          elementIds: nextIds,
          elementId: exists ? (nextIds[nextIds.length - 1] ?? null) : elementId,
        };
      });
    },
    [],
  );

  const selectElements = useCallback(
    (sectionId: string, elementIds: string[]): void => {
      const unique = [...new Set(elementIds)];
      setSelection({
        sectionId,
        elementIds: unique,
        elementId: unique[unique.length - 1] ?? null,
      });
    },
    [],
  );

  const clearElement = useCallback((): void => {
    setSelection((current) => ({
      ...current,
      elementId: null,
      elementIds: [],
    }));
  }, []);

  const clear = useCallback((): void => {
    setSelection(EMPTY_SELECTION);
  }, []);

  return {
    selection,
    setSectionId,
    setElementId,
    setElementIds,
    selectSection,
    selectElement,
    selectElements,
    clearElement,
    clear,
  };
}
