import type {
  InstitutionalEditorConstraints,
  InstitutionalElementConstraints,
  InstitutionalElementStyle,
} from "../services/institutionalService";

export const FREE_EDITOR_CONSTRAINTS: InstitutionalEditorConstraints = {
  mode: "free",
  minWidthPercent: 8,
  maxWidthPercent: 240,
  minFontSize: 10,
  maxFontSize: 96,
  maxOffset: 100,
};

export const GUIDED_EDITOR_CONSTRAINTS: InstitutionalEditorConstraints = {
  mode: "guided",
  minWidthPercent: 25,
  maxWidthPercent: 100,
  minFontSize: 12,
  maxFontSize: 84,
  maxOffset: 36,
};

export function exceedsEditorConstraints(
  current: InstitutionalElementStyle,
  patch: Partial<InstitutionalElementStyle>,
  constraints: InstitutionalEditorConstraints,
  elementConstraints?: InstitutionalElementConstraints,
): boolean {
  if (constraints.mode === "free") return false;

  const next = { ...current, ...patch };
  const width = next.widthPercent;
  const fontSize = next.fontSize;
  const offsetX = next.offsetX ?? 0;
  const offsetY = next.offsetY ?? 0;

  const minWidth = elementConstraints?.minWidthPercent ?? constraints.minWidthPercent;
  const maxWidth = elementConstraints?.maxWidthPercent ?? constraints.maxWidthPercent;
  const minFont = elementConstraints?.minFontSize ?? constraints.minFontSize;
  const maxFont = elementConstraints?.maxFontSize ?? constraints.maxFontSize;

  if (width !== undefined && (width < minWidth || width > maxWidth)) {
    return true;
  }
  if (fontSize !== undefined && (fontSize < minFont || fontSize > maxFont)) {
    return true;
  }

  if (next.heightPx !== undefined) {
    if (elementConstraints?.minHeightPx !== undefined && next.heightPx < elementConstraints.minHeightPx) return true;
    if (elementConstraints?.maxHeightPx !== undefined && next.heightPx > elementConstraints.maxHeightPx) return true;
  }
  // Movimentos que permanecem dentro da seção são controlados visualmente pelo canvas.
  // O limite do modelo só volta a participar quando a pessoa escolhe, de forma explícita,
  // permitir que o elemento ultrapasse a área segura da seção.
  return (
    Boolean(next.allowOverflow) &&
    (Math.abs(offsetX) > constraints.maxOffset ||
      Math.abs(offsetY) > constraints.maxOffset)
  );
}
