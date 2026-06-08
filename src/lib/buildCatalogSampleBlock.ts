import type { EmailBlock } from "../types/email";
import type { BlockMaster } from "../types/master";
import type { BlockCatalogEntry } from "./blockDefaults";
import { buildInsertBlockFromMasterSample } from "./blockMasterInsertPrototype";

/**
 * 插入组件时构建 sample block：优先运营保存的母版，回退代码出厂默认。
 */
export function buildCatalogSampleBlock(
  entry: BlockCatalogEntry,
  blockId: string,
  parentId: string,
  mastersById?: Readonly<Record<string, BlockMaster>> | null
): EmailBlock {
  const master = mastersById?.[entry.masterId];
  if (master) {
    try {
      return buildInsertBlockFromMasterSample(master, blockId, parentId);
    } catch {
      /* 母版损坏时回退出厂默认 */
    }
  }
  return entry.buildSampleBlock(blockId, parentId);
}
