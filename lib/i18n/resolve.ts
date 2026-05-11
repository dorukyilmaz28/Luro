type Tree = Record<string, unknown>;

export function resolveMessage(tree: Tree, path: string): string | undefined {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = tree;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || !(p in (cur as Tree))) return undefined;
    cur = (cur as Tree)[p];
  }
  return typeof cur === "string" ? cur : undefined;
}
