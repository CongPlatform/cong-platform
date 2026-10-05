import { useCallback, useState } from "react";

export interface InstitutionalEditorSelection {
  sectionId: string | null;
  elementId: string | null;
}

const EMPTY_SELECTION: InstitutionalEditorSelection = {
  sectionId: null,
  elementId: null,
};

/**
 * Central selection state for the institutional builder.
 *
 * Selection is deliberately separate from text editing: a section/element can
 * stay selected while a contextual control, media crop gesture or keyboard
 * command is used. This becomes the stable target for direct-manipulation
 * commands and future AI operations.
 */
export function useEditorSelection() {
  const [selection, setSelection] = useState<InstitutionalEditorSelection>(EMPTY_SELECTION);

  const setSectionId = useCallback((sectionId: string | null): void => {
    setSelection((current) => ({
      sectionId,
      elementId: sectionId === current.sectionId ? current.elementId : null,
    }));
  }, []);

  const setElementId = useCallback((elementId: string | null): void => {
    setSelection((current) => ({ ...current, elementId }));
  }, []);

  const selectSection = useCallback((sectionId: string): void => {
    setSelection({ sectionId, elementId: null });
  }, []);

  const selectElement = useCallback((sectionId: string, elementId: string): void => {
    setSelection({ sectionId, elementId });
  }, []);

  const clearElement = useCallback((): void => {
    setSelection((current) => ({ ...current, elementId: null }));
  }, []);

  const clear = useCallback((): void => {
    setSelection(EMPTY_SELECTION);
  }, []);

  return {
    selection,
    setSectionId,
    setElementId,
    selectSection,
    selectElement,
    clearElement,
    clear,
  };
}
