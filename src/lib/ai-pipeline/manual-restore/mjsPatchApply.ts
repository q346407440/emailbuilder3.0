/** 豆包 patch 模式：SEARCH/REPLACE 块（与 Cursor 局部改文件类似）。 */

export type MjsPatch = {
  search: string;
  replace: string;
};

const PATCH_BLOCK_RE =
  /<<<<<<< SEARCH\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> REPLACE/g;

/** 从豆包响应解析补丁块。 */
export function extractMjsPatchesFromLlm(raw: string): MjsPatch[] {
  let text = raw.trim();
  const fenced = /^```(?:javascript|js|mjs|patch)?\s*([\s\S]*?)```\s*$/im.exec(text);
  if (fenced) text = fenced[1]!.trim();

  const patches: MjsPatch[] = [];
  for (const m of text.matchAll(PATCH_BLOCK_RE)) {
    patches.push({ search: m[1]!, replace: m[2]! });
  }
  return patches;
}

export type ApplyMjsPatchesResult = {
  source: string;
  applied: number;
  failures: string[];
};

/** 按顺序应用补丁；SEARCH 须与当前源码逐字符一致。 */
export function applyMjsPatches(source: string, patches: MjsPatch[]): ApplyMjsPatchesResult {
  let current = source;
  let applied = 0;
  const failures: string[] = [];

  for (let i = 0; i < patches.length; i += 1) {
    const { search, replace } = patches[i]!;
    if (!search) {
      failures.push(`补丁 ${i + 1}：SEARCH 为空`);
      continue;
    }
    const idx = current.indexOf(search);
    if (idx < 0) {
      failures.push(`补丁 ${i + 1}：SEARCH 未命中（前 60 字：${search.slice(0, 60).replace(/\n/g, "↵")}）`);
      continue;
    }
    current = `${current.slice(0, idx)}${replace}${current.slice(idx + search.length)}`;
    applied += 1;
  }

  return { source: current, applied, failures };
}
