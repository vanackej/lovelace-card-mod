// Dialog params are exposed as template variables; DOM nodes, functions and cycles cannot be serialised.
export function stripHtmlAndFunctions(
  value: any,
  ancestors = new WeakSet(),
): any {
  if (value == null) return value;
  const t = typeof value;

  if (t === "function") return undefined;

  if (
    (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) ||
    (typeof Element !== "undefined" && value instanceof Element)
  ) {
    return undefined;
  }

  if (t !== "object") return value;

  // Only a reference back to an ancestor is a cycle; a shared sibling reference is kept.
  if (ancestors.has(value)) return undefined;
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      return value
        .map((v) => stripHtmlAndFunctions(v, ancestors))
        .filter((v) => v !== undefined);
    }

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = stripHtmlAndFunctions(v, ancestors);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  } finally {
    ancestors.delete(value);
  }
}
