import {
  isMjsPatchSlotId,
  mjsSlotBeginMarker,
  mjsSlotEndMarker,
  type MjsPatch,
  type MjsPatchSlotId,
} from "../../../mjs-patch-contract";

/** merge 后源码中不应残留 patch 协议标记。 */
export function containsMjsPatchArtifacts(source: string): boolean {
  return (
    /<<<<<<< SEARCH|>>>>>>> REPLACE/.test(source) ||
    /<\/?mjs-patches>/i.test(source) ||
    /<\/?patch[\s>]/i.test(source) ||
    /<!\[CDATA\[/i.test(source)
  );
}

function stripMarkdownFences(raw: string): string {
  const fenced = /^```(?:xml|mjs-patches|patch)?\s*([\s\S]*?)```\s*$/im.exec(raw.trim());
  if (fenced) return fenced[1]!.trim();

  const fences = [...raw.matchAll(/```(?:xml|mjs-patches|patch)?\s*([\s\S]*?)```/gi)];
  if (fences.length > 0) {
    const best = fences.reduce((a, b) => (a[1]!.length >= b[1]!.length ? a : b));
    return best[1]!.trim();
  }
  return raw.trim();
}

function unwrapCdata(content: string): string {
  const trimmed = content.trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)]]>$/i.exec(trimmed);
  return cdata ? cdata[1]! : trimmed;
}

function extractTagContent(outer: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(outer);
  return m ? unwrapCdata(m[1]!) : null;
}

function parsePatchAttributes(openTag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of openTag.matchAll(/(\w+)="([^"]*)"/g)) {
    attrs[m[1]!] = m[2]!;
  }
  return attrs;
}

/** 从豆包响应解析统一 XML patch 列表。 */
export function parseMjsPatchesFromLlm(raw: string): MjsPatch[] {
  let text = stripMarkdownFences(raw);
  const wrapper = /<mjs-patches>([\s\S]*?)<\/mjs-patches>/i.exec(text);
  if (wrapper) text = wrapper[1]!;

  const patches: MjsPatch[] = [];
  const patchRe = /<patch\s+([^>]*?)>([\s\S]*?)<\/patch>/gi;
  for (const m of text.matchAll(patchRe)) {
    const attrs = parsePatchAttributes(m[1]!);
    const body = m[2]!;
    const kind = attrs.kind === "search" ? "search" : "slot";

    if (kind === "search") {
      const search = extractTagContent(body, "search");
      if (search == null || search === "") continue;
      const replace = extractTagContent(body, "replace") ?? "";
      patches.push({ kind: "search", search, replace });
      continue;
    }

    const id = attrs.id;
    if (!id || !isMjsPatchSlotId(id)) continue;
    const replace = extractTagContent(body, "replace") ?? "";
    patches.push({ kind: "slot", id, replace });
  }
  return patches;
}

/** @deprecated 使用 parseMjsPatchesFromLlm */
export const extractMjsPatchesFromLlm = parseMjsPatchesFromLlm;

function applySlotPatch(
  source: string,
  id: MjsPatchSlotId,
  replace: string
): { ok: true; source: string } | { ok: false; source: string; error: string } {
  const begin = mjsSlotBeginMarker(id);
  const end = mjsSlotEndMarker(id);
  const beginIdx = source.indexOf(begin);
  const endIdx = source.indexOf(end);
  if (beginIdx < 0 || endIdx < 0 || endIdx <= beginIdx) {
    return { ok: false, source, error: `slot ${id} 锚点未找到` };
  }

  if (!replace.trim()) {
    const beforeSlot = source.slice(0, beginIdx);
    const afterSlot = source.slice(endIdx + end.length);
    return { ok: true, source: `${beforeSlot}${afterSlot}` };
  }

  const contentStart = beginIdx + begin.length;
  const before = source.slice(0, contentStart);
  const after = source.slice(endIdx);
  return { ok: true, source: `${before}\n${replace.trim()}\n${after}` };
}

/** 按顺序应用 patch（slot 或 search）。 */
export function applyMjsPatches(source: string, patches: MjsPatch[]) {
  let current = source;
  let applied = 0;
  let searchReplacements = 0;
  const failures: string[] = [];

  for (let i = 0; i < patches.length; i += 1) {
    const patch = patches[i]!;
    if (patch.kind === "slot") {
      const result = applySlotPatch(current, patch.id, patch.replace);
      if (!result.ok) {
        failures.push(`补丁 ${i + 1}（slot ${patch.id}）：${result.error}`);
        continue;
      }
      current = result.source;
      applied += 1;
      continue;
    }

    if (!patch.search) {
      failures.push(`补丁 ${i + 1}：search 为空`);
      continue;
    }
    let hitCount = 0;
    while (true) {
      const idx = current.indexOf(patch.search);
      if (idx < 0) break;
      current = `${current.slice(0, idx)}${patch.replace}${current.slice(idx + patch.search.length)}`;
      hitCount += 1;
    }
    if (hitCount === 0) {
      failures.push(
        `补丁 ${i + 1}：search 未命中（前 60 字：${patch.search.slice(0, 60).replace(/\n/g, "↵")}）`
      );
      continue;
    }
    searchReplacements += hitCount;
    applied += 1;
  }

  return {
    source: current,
    applied,
    searchReplacements,
    failures,
    hasPatchArtifacts: containsMjsPatchArtifacts(current),
  };
}

/** @deprecated 使用 hasPatchArtifacts */
export function containsMjsPatchMarkers(source: string): boolean {
  return containsMjsPatchArtifacts(source);
}

export { isMjsPatchMergeClean, type ApplyMjsPatchesResult } from "../../../mjs-patch-contract";
