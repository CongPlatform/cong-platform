import type {
  InstitutionalEditorConstraints,
  InstitutionalElementStyle,
} from "../services/institutionalService";

export const FREE_EDITOR_CONSTRAINTS: InstitutionalEditorConstraints = {
  mode: "free",
  minWidthPercent: 15,
  maxWidthPercent: 100,
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
): boolean {
  if (constraints.mode === "free") return false;

  const next = { ...current, ...patch };
  const width = next.widthPercent;
  const fontSize = next.fontSize;
  const offsetX = next.offsetX ?? 0;
  const offsetY = next.offsetY ?? 0;

  if (width !== undefined && (width < constraints.minWidthPercent || width > constraints.maxWidthPercent)) {
    return true;
  }
  if (fontSize !== undefined && (fontSize < constraints.minFontSize || fontSize > constraints.maxFontSize)) {
    return true;
  }
  // Movimentos que permanecem dentro da seção são controlados visualmente pelo canvas.
  // O limite do modelo só volta a participar quando a pessoa escolhe, de forma explícita,
  // permitir que o elemento ultrapasse a área segura da seção.
  return Boolean(next.allowOverflow) &&
    (Math.abs(offsetX) > constraints.maxOffset || Math.abs(offsetY) > constraints.maxOffset);
}
