import type { BlockInsertPrototype } from "../block-insert-default-contract";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import {
  extractBlockPersistLiteralSnapshot,
  type BlockPersistLiteralSnapshotArgs,
} from "./blockPersistLiteralSnapshot";

export type ExtractBlockInsertPrototypeArgs = BlockPersistLiteralSnapshotArgs;

/**
 * 从当前画布区块提取插入默认原型：内容 / 样式 / 布局字段的字面量快照。
 * 主题 / 业务变量 / 列表映射均解析为当前展示值；不含 repeat / visibility / bindings。
 */
export function extractBlockInsertPrototype(
  args: ExtractBlockInsertPrototypeArgs
): BlockInsertPrototype {
  const block = args.template.blocks[args.blockId];
  if (!block) {
    throw new Error("区块不存在，无法保存插入默认配置");
  }
  if (block.type === "emailRoot") {
    throw new Error("邮件根节点不支持保存组件默认配置");
  }
  return extractBlockPersistLiteralSnapshot(args);
}

export type { BlockPersistLiteralSnapshotArgs, BlockPersistLiteralSnapshot } from "./blockPersistLiteralSnapshot";
export {
  applyPersistLiteralSnapshotToBlock,
  extractBlockPersistLiteralSnapshot,
  materializeBlockForPersist,
  mergedBlockFromPreviewModel,
  previewFlatTemplateFromModel,
} from "./blockPersistLiteralSnapshot";
