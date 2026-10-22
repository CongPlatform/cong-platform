const INSTANCE_SEPARATOR = "::instance::";

export function institutionalSelectionId(
  sourceNodeId: string,
  path: Array<string | number>,
): string {
  if (path.length === 0) return sourceNodeId;
  const suffix = path
    .map((part) => String(part).replaceAll(INSTANCE_SEPARATOR, "-"))
    .join("/");
  return `${sourceNodeId}${INSTANCE_SEPARATOR}${suffix}`;
}

export function isInstitutionalInstanceSelectionId(
  selectionId: string,
): boolean {
  return selectionId.includes(INSTANCE_SEPARATOR);
}

export function institutionalSourceNodeId(selectionId: string): string {
  const index = selectionId.indexOf(INSTANCE_SEPARATOR);
  return index < 0 ? selectionId : selectionId.slice(0, index);
}

export function uniqueInstitutionalSourceNodeIds(
  selectionIds: string[],
): string[] {
  return [...new Set(selectionIds.map(institutionalSourceNodeId))];
}

export function institutionalSelectionIdForSource(
  sourceNodeId: string,
  referenceSelectionId: string,
): string {
  const index = referenceSelectionId.indexOf(INSTANCE_SEPARATOR);
  if (index < 0) return sourceNodeId;
  return `${sourceNodeId}${referenceSelectionId.slice(index)}`;
}

export function institutionalSelectionInstancePath(
  selectionId: string,
): Array<string | number> {
  const index = selectionId.indexOf(INSTANCE_SEPARATOR);
  if (index < 0) return [];
  return selectionId
    .slice(index + INSTANCE_SEPARATOR.length)
    .split("/")
    .filter(Boolean)
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

export function institutionalRepeatItemLocations(selectionIds: string[]): Array<{path: Array<string | number>; indices: number[]}> {
  const groups = new Map<string, {path: Array<string | number>; indices: Set<number>}>();
  for (const selectionId of selectionIds) {
    const path = institutionalSelectionInstancePath(selectionId);
    if (path.length < 2) continue;
    const index = path[path.length - 1];
    const source = path[path.length - 2];
    if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || typeof source !== "string") continue;
    const collectionPath = path.slice(0, -1);
    const key = JSON.stringify(collectionPath);
    const group = groups.get(key) ?? {path: collectionPath, indices: new Set<number>()};
    group.indices.add(index);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => ({path: group.path, indices: [...group.indices]}));
}
