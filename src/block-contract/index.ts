export type { BlockTypeContract, SemanticBlockType } from "./types";
export { RUNTIME_TYPE_TO_SEMANTIC } from "./types";
export { BLOCK_SHELL_KEYS, WRAPPER_CONTAINER_PREFIXES, WRAPPER_BACKGROUND_IMAGE_PREFIXES } from "./shared";
export {
  BLOCK_TYPE_CONTRACTS,
  getBlockTypeContract,
  getBlockTypeContractByRuntime,
  resolveBlockContract,
  listSemanticBlockTypes,
} from "./registry";
export { validateTemplateBlockContracts } from "./validate";

// 按 blockType 导出单份契约（便于组件库 / 文档生成器直接引用）
export { emailRootContract } from "./by-type/email.root";
export { layoutContainerContract } from "./by-type/layout.container";
export { layoutGridContract } from "./by-type/layout.grid";
export { contentTextContract } from "./by-type/content.text";
export { contentImageContract } from "./by-type/content.image";
export { contentIconContract } from "./by-type/content.icon";
export { actionButtonContract } from "./by-type/action.button";
export { separatorDividerContract } from "./by-type/separator.divider";
export { indicatorProgressContract } from "./by-type/indicator.progress";
