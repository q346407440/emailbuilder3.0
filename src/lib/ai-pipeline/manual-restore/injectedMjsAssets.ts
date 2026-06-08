import fs from "node:fs";

/** 程序侧注入到 mjs 的资产常量（豆包禁止自行编造 URL）。 */
export type InjectedMjsAssets = {
  /** 完整 `const PEXELS = { ... };` 源码 */
  pexelsBlock: string;
  /** 完整 `const ICON = { ... };` 源码 */
  iconBlock: string;
  /** 各 slot 用途说明，供 prompt 对照设计图 */
  slotGuide: string;
};

export const INJECTED_ASSETS_MARKER = "// __INJECTED_ASSETS__";

/** 按花括号配对提取 `const NAME = { ... };`（兼容无 PRODUCTS 等后续常量的参考 mjs）。 */
function extractConstObjectBlock(source: string, constName: string): string {
  const startToken = `const ${constName} =`;
  const start = source.indexOf(startToken);
  if (start < 0) {
    throw new Error(`参考 mjs 中未找到 ${constName}`);
  }
  const braceStart = source.indexOf("{", start);
  if (braceStart < 0) {
    throw new Error(`参考 mjs 中 ${constName} 无对象字面量`);
  }
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        if (source[end] === ";") end += 1;
        return source.slice(start, end).trim();
      }
    }
  }
  throw new Error(`参考 mjs 中 ${constName} 块未闭合`);
}

/**
 * 从手工参考 mjs 提取 PEXELS / ICON 常量。
 * 注：豆包 `runManualRestoreViaDoubao` 已不走此路径，仅保留供脚本/测试复用。
 */
export function loadInjectedAssetsFromReferenceMjs(mjsPath: string): InjectedMjsAssets {
  const source = fs.readFileSync(mjsPath, "utf8");
  const pexelsBlock = extractConstObjectBlock(source, "PEXELS");
  const iconBlock = extractConstObjectBlock(source, "ICON");

  const slotGuide = [
    "资产槽位（程序已解析 URL，脚本内用 PEXELS.* / ICON.* 引用，禁止改写 URL）：",
    "- PEXELS.hero → 首屏横图（buildS2 coverImage）",
    "- PEXELS.products[i] → 商品栅格第 i 格配图（buildS3 productCell）",
    "- ICON.leaf / shopPay / truck → 服务保障三列图标（buildS4 trustCol）",
    "- ICON.instagram / pinterest / facebook → 页脚社媒图标（buildS5）",
  ].join("\n");

  return { pexelsBlock, iconBlock, slotGuide };
}

export function formatInjectedAssetsForMjs(assets: InjectedMjsAssets): string {
  return [assets.pexelsBlock, assets.iconBlock].join("\n\n");
}

/** 将程序注入的资产常量写入豆包生成的 mjs（替换占位符或插在 DESIGN_DST 之后）。 */
export function stitchInjectedAssetsIntoMjs(mjsSource: string, assets: InjectedMjsAssets): string {
  const block = formatInjectedAssetsForMjs(assets);
  if (mjsSource.includes(INJECTED_ASSETS_MARKER)) {
    return mjsSource.replace(INJECTED_ASSETS_MARKER, block);
  }

  const designDstRe = /(const DESIGN_DST =[^\n]+\n)/;
  if (designDstRe.test(mjsSource)) {
    return mjsSource.replace(designDstRe, `$1\n${block}\n`);
  }

  throw new Error(
    `mjs 缺少 ${INJECTED_ASSETS_MARKER} 占位符，且无法定位 DESIGN_DST 行以注入资产`
  );
}
