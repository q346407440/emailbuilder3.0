import type { MjsPatchSlotId } from "./slots";

/** 按 slot 锚点整段替换（mother 首次生成）。 */
export type MjsSlotPatch = {
  kind: "slot";
  id: MjsPatchSlotId;
  /** 空字符串表示删除该 slot（含锚点）。 */
  replace: string;
};

/** 按 search 精确匹配替换（validate 失败修补）。 */
export type MjsSearchPatch = {
  kind: "search";
  search: string;
  replace: string;
};

export type MjsPatch = MjsSlotPatch | MjsSearchPatch;

export type ApplyMjsPatchesResult = {
  source: string;
  /** 成功处理的 patch 条数（每个 XML patch 元素计 1） */
  applied: number;
  /** search patch 实际替换次数（含 replaceAll 重复命中） */
  searchReplacements: number;
  failures: string[];
  /** merge 后源码含 XML / 旧式 patch 残留 */
  hasPatchArtifacts: boolean;
};

/** patch merge 是否可安全进入 node。 */
export function isMjsPatchMergeClean(result: ApplyMjsPatchesResult, patchCount: number): boolean {
  return (
    result.applied === patchCount &&
    result.failures.length === 0 &&
    !result.hasPatchArtifacts
  );
}
