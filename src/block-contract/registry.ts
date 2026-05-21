import type { EmailBlock, EmailTemplate } from "../types/email";
import { actionButtonContract } from "./by-type/action.button";
import { contentIconContract } from "./by-type/content.icon";
import { contentImageContract } from "./by-type/content.image";
import { contentTextContract } from "./by-type/content.text";
import { emailRootContract } from "./by-type/email.root";
import { layoutContainerContract } from "./by-type/layout.container";
import { layoutGridContract } from "./by-type/layout.grid";
import { separatorDividerContract } from "./by-type/separator.divider";
import { indicatorProgressContract } from "./by-type/indicator.progress";
import type { BlockTypeContract, SemanticBlockType } from "./types";
import { RUNTIME_TYPE_TO_SEMANTIC } from "./types";

export const BLOCK_TYPE_CONTRACTS: readonly BlockTypeContract[] = [
  emailRootContract,
  layoutContainerContract,
  layoutGridContract,
  contentTextContract,
  contentImageContract,
  contentIconContract,
  actionButtonContract,
  separatorDividerContract,
  indicatorProgressContract,
];

const BY_SEMANTIC = new Map<SemanticBlockType, BlockTypeContract>(
  BLOCK_TYPE_CONTRACTS.map((c) => [c.blockType, c])
);

const BY_RUNTIME = new Map<EmailBlock["type"], BlockTypeContract>(
  BLOCK_TYPE_CONTRACTS.map((c) => [c.runtimeType, c])
);

export function getBlockTypeContract(blockType: SemanticBlockType): BlockTypeContract | undefined {
  return BY_SEMANTIC.get(blockType);
}

export function getBlockTypeContractByRuntime(
  runtimeType: EmailBlock["type"]
): BlockTypeContract | undefined {
  return BY_RUNTIME.get(runtimeType);
}

/**
 * 解析区块应使用的白名单契约。
 * - `emailRoot` 始终用 `email.root`（即使 blockMeta 为 layout.container）。
 * - 否则优先 `blockMeta.blockType`，再回退 runtime 默认映射。
 */
export function resolveBlockContract(
  block: EmailBlock,
  template: Pick<EmailTemplate, "blockMeta">
): BlockTypeContract | undefined {
  if (block.type === "emailRoot") {
    return emailRootContract;
  }
  const metaType = template.blockMeta?.[block.id]?.blockType;
  if (metaType) {
    const fromMeta = BY_SEMANTIC.get(metaType as SemanticBlockType);
    if (fromMeta && fromMeta.runtimeType === block.type) {
      return fromMeta;
    }
  }
  const semantic = RUNTIME_TYPE_TO_SEMANTIC[block.type];
  return BY_SEMANTIC.get(semantic);
}

export function listSemanticBlockTypes(): SemanticBlockType[] {
  return BLOCK_TYPE_CONTRACTS.map((c) => c.blockType);
}
