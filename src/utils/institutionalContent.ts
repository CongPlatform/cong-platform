export function setInstitutionalContentValue(
  content: Record<string, unknown>,
  path: Array<string | number>,
  value: unknown,
): Record<string, unknown> {
  if (path.length === 0) {
    return content;
  }

  const clone = structuredClone(content);
  let cursor: Record<string, unknown> | unknown[] = clone;

  path.forEach((segment, index) => {
    const last = index === path.length - 1;

    if (last) {
      if (Array.isArray(cursor) && typeof segment === "number") {
        cursor[segment] = value;
      } else if (!Array.isArray(cursor) && typeof segment === "string") {
        cursor[segment] = value;
      }
      return;
    }

    const nextSegment = path[index + 1];

    if (Array.isArray(cursor) && typeof segment === "number") {
      const next = cursor[segment];
      if (!next || typeof next !== "object") {
        cursor[segment] = typeof nextSegment === "number" ? [] : {};
      }
      cursor = cursor[segment] as Record<string, unknown> | unknown[];
      return;
    }

    if (!Array.isArray(cursor) && typeof segment === "string") {
      const next = cursor[segment];
      if (!next || typeof next !== "object") {
        cursor[segment] = typeof nextSegment === "number" ? [] : {};
      }
      cursor = cursor[segment] as Record<string, unknown> | unknown[];
    }
  });

  return clone;
}
