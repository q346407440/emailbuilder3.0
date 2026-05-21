/** 点路径读写，如 props.content、wrapperStyle.backgroundColor */
export function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function setAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const next = cur[p];
    if (next === undefined || typeof next !== "object" || next === null) {
      const child: Record<string, unknown> = {};
      cur[p] = child;
      cur = child;
    } else {
      cur = next as Record<string, unknown>;
    }
  }
  cur[parts[parts.length - 1]!] = value;
}

/** 删除点路径末段键；父对象为空的嵌套对象可顺带精简（仅精简末两段）。 */
export function deleteAtPath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  if (parts.length === 0) return;
  if (parts.length === 1) {
    delete obj[parts[0]!];
    return;
  }
  let cur: Record<string, unknown> | undefined = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const next = cur?.[p];
    if (next === undefined || typeof next !== "object" || next === null) return;
    cur = next as Record<string, unknown>;
  }
  const leafKey = parts[parts.length - 1]!;
  if (!cur) return;
  delete cur[leafKey];
}
