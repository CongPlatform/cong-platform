/**
 * Optional assistance is a preference, not a restriction on editor tools.
 * No project content is modified when assistance is dismissed or restored.
 * This is foundation state for the Guided Creation patch, not yet a UI mode.
 */
export type BuilderAssistanceMode = "guided" | "independent";

export function assistancePreferenceKey(siteId: string): string {
  return `cong:builder:assistance:${siteId}`;
}

function browserStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getAssistanceMode(
  siteId: string,
  storage = browserStorage(),
): BuilderAssistanceMode {
  try {
    return storage?.getItem(assistancePreferenceKey(siteId)) === "independent"
      ? "independent"
      : "guided";
  } catch {
    return "guided";
  }
}

export function setAssistanceMode(
  siteId: string,
  mode: BuilderAssistanceMode,
  storage = browserStorage(),
): void {
  try {
    storage?.setItem(assistancePreferenceKey(siteId), mode);
  } catch {
    // Preference is optional. Editing should not depend on browser storage.
  }
}
