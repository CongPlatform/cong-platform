/**
 * Recover legacy editor drafts without changing their localStorage key or shape.
 * Recovery is intentionally local, optional and version 1 compatible.
 */
import type { InstitutionalSite } from "../../../services/institutionalService";

export interface InstitutionalRecoveryDraft {
  version: 1;
  savedAt: string;
  content: Record<string, Record<string, unknown>>;
  settings: Record<string, Record<string, unknown>>;
}

export function recoveryDraftKey(siteId: string): string {
  return `cong:institutional-recovery:${siteId}`;
}

function browserStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRecordMap(
  value: unknown,
): value is Record<string, Record<string, unknown>> {
  return isRecord(value) && Object.values(value).every(isRecord);
}

export function clearRecoveryDraft(
  siteId: string,
  storage = browserStorage(),
): void {
  try {
    storage?.removeItem(recoveryDraftKey(siteId));
  } catch {
    // The editor keeps working when local storage is unavailable.
  }
}

export function readRecoveryDraft(
  siteId: string,
  storage = browserStorage(),
): InstitutionalRecoveryDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(recoveryDraftKey(siteId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== 1 ||
      typeof parsed.savedAt !== "string" ||
      !isRecordMap(parsed.content) ||
      !isRecordMap(parsed.settings)
    ) {
      clearRecoveryDraft(siteId, storage);
      return null;
    }
    return parsed as unknown as InstitutionalRecoveryDraft;
  } catch {
    clearRecoveryDraft(siteId, storage);
    return null;
  }
}

/** Store only outstanding edits. Do not persist a duplicate of an entire site. */
export function writeRecoveryDraft(
  siteId: string,
  pendingContent: ReadonlyMap<string, Record<string, unknown>>,
  pendingSettings: ReadonlyMap<string, Record<string, unknown>>,
  storage = browserStorage(),
): void {
  if (!storage) return;
  const content = Object.fromEntries(pendingContent.entries());
  const settings = Object.fromEntries(pendingSettings.entries());
  if (!Object.keys(content).length && !Object.keys(settings).length) {
    clearRecoveryDraft(siteId, storage);
    return;
  }
  const draft: InstitutionalRecoveryDraft = {
    version: 1,
    savedAt: new Date().toISOString(),
    content,
    settings,
  };
  try {
    storage.setItem(recoveryDraftKey(siteId), JSON.stringify(draft));
  } catch {
    // Network/server persistence remains authoritative; the UI handles save errors.
  }
}

/** Never resurrect deleted sections: their recovery entries are ignored. */
export function applyRecoveryDraft(
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
