import type { RestoreTheme } from "./types";

/** 第 3 步资产回填请求（第 1 步组装器收集）。 */
export type AssetRequest =
  | { blockId: string; kind: "image"; query: string; targetWidth: number }
  | { blockId: string; kind: "icon"; query: string; pack: import("./types").IconPack };

export type BuildCtx = {
  idPrefix: string;
  theme: RestoreTheme;
  assets: AssetRequest[];
  blockIdToAstPath: Map<string, string>;
  counters: Record<string, number>;
  nextId(tag: string): string;
  recordAstPath(blockId: string, astPath: string): void;
};

export function createBuildCtx(idPrefix: string, theme: RestoreTheme): BuildCtx {
  const assets: AssetRequest[] = [];
  const blockIdToAstPath = new Map<string, string>();
  const counters: Record<string, number> = {};

  return {
    idPrefix,
    theme,
    assets,
    blockIdToAstPath,
    counters,
    nextId(tag: string) {
      const n = (counters[tag] ?? 0) + 1;
      counters[tag] = n;
      return `${idPrefix}-${tag}-${n}`;
    },
    recordAstPath(blockId: string, astPath: string) {
      blockIdToAstPath.set(blockId, astPath);
    },
  };
}
