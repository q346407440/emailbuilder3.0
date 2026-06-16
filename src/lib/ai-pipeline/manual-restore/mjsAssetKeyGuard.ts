/**
 * 资产键守卫：LLM 产出（slot patch / search patch）中对 ICON / PEXELS 的键引用
 * 必须存在于程序注入的常量表，否则拒绝该补丁——`ICON["不存在的键"]` 在运行时
 * 经 `?? ''` 兜底为空 src，是「校验通过但资产静默丢失」的回归源（2026-06-10 测试 5/6 实证）。
 */

import type { InjectedMjsAssets } from "./injectedMjsAssets";
import type { MjsPatch } from "../../../mjs-patch-contract";

export type AssetKeyRef = { ns: "ICON" | "PEXELS"; key: string };

/** 从 `const NAME = { ... }` 源码解析**第一层**键名（引号键与裸键；嵌套层级忽略）。 */
export function parseAssetKeysFromConstBlock(block: string | undefined): string[] {
  if (typeof block !== "string") return [];
  const braceStart = block.indexOf("{");
  if (braceStart < 0) return [];

  // 收集仅第一层的文本片段（嵌套对象/数组内容替换为分隔符，避免误识别内层键）
  let depth = 0;
  let topLevel = "";
  for (let i = braceStart; i < block.length; i += 1) {
    const ch = block[i]!;
    if (ch === "{" || ch === "[") {
      depth += 1;
      if (depth === 1) topLevel += "{";
      continue;
    }
    if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) break;
      if (depth === 1) topLevel += ",";
      continue;
    }
    if (depth === 1) topLevel += ch;
  }

  const keys: string[] = [];
  const keyRe = /(?:^|[,{])\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/g;
  for (const m of topLevel.matchAll(keyRe)) {
    keys.push(m[1] ?? m[2] ?? m[3]!);
  }
  return keys;
}

/** 提取源码中对 ICON / PEXELS 的全部键引用（方括号与点号两种形式）。 */
export function findAssetKeyRefs(source: string): AssetKeyRef[] {
  const refs: AssetKeyRef[] = [];
  const re =
    /\b(ICON|PEXELS)(?:\[\s*(?:'([^']+)'|"([^"]+)")\s*\]|\.([A-Za-z_$][\w$]*))/g;
  for (const m of source.matchAll(re)) {
    const key = m[2] ?? m[3] ?? m[4];
    if (key) refs.push({ ns: m[1] as AssetKeyRef["ns"], key });
  }
  return refs;
}

/** 注入资产表中各命名空间的合法键集合。 */
export function injectedAssetKeySets(injected: InjectedMjsAssets): {
  ICON: Set<string>;
  PEXELS: Set<string>;
} {
  return {
    ICON: new Set(parseAssetKeysFromConstBlock(injected.iconBlock)),
    PEXELS: new Set(parseAssetKeysFromConstBlock(injected.pexelsBlock)),
  };
}

/** 源码中引用了注入表不存在的键 → 返回 `ICON["xxx"]` 形式的去重清单。 */
export function findUnknownAssetKeyRefs(
  source: string,
  injected: InjectedMjsAssets
): string[] {
  const sets = injectedAssetKeySets(injected);
  const unknown = new Set<string>();
  for (const ref of findAssetKeyRefs(source)) {
    if (!sets[ref.ns].has(ref.key)) unknown.add(`${ref.ns}["${ref.key}"]`);
  }
  return [...unknown];
}

export type PatchAssetScreenResult = {
  accepted: MjsPatch[];
  /** 每条被拒补丁的原因（含合法键清单提示，可直接回灌修复 prompt） */
  rejections: string[];
};

/** 逐补丁筛查：replace 内容引用未知资产键的补丁整体拒绝。 */
export function screenPatchesForUnknownAssetKeys(
  patches: MjsPatch[],
  injected: InjectedMjsAssets
): PatchAssetScreenResult {
  const accepted: MjsPatch[] = [];
  const rejections: string[] = [];
  const sets = injectedAssetKeySets(injected);

  patches.forEach((patch, index) => {
    const unknown = findUnknownAssetKeyRefs(patch.replace, injected);
    if (unknown.length === 0) {
      accepted.push(patch);
      return;
    }
    const label = patch.kind === "slot" ? `slot ${patch.id}` : "search";
    rejections.push(
      `补丁 ${index + 1}（${label}）引用不存在的资产键：${unknown.join("、")}；` +
        `合法键：ICON{${[...sets.ICON].join(",")}} PEXELS{${[...sets.PEXELS].join(",")}}`
    );
  });

  return { accepted, rejections };
}
