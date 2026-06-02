export {
  refToStableKey,
  refsEqual,
  resolvePhysicalBlockId,
  resolveRepeatContextForRef,
} from "./repeatVirtualResolver";

export {
  refToRepeatExpansionGroupKey,
  refsShareRepeatExpansionGroup,
  isRepeatExpansionGroupSelected,
  countRepeatExpansionGroupMembers,
} from "./repeatExpansionGroup";

export {
  buildRepeatPreviewModel,
  previewModelToFlatTemplate,
  applyMergedBlocksToPreviewModel,
  findPreviewNodeByRef,
  buildPreviewBlockMeta,
  applyThemeToPreviewModel,
} from "./buildPreviewModel";

export {
  buildRepeatItemMaterializationSnapshots,
  type RepeatItemMaterializationSnapshot,
} from "./buildMaterializationSnapshots";

export { resolveRepeatItemsForExpansion } from "./repeatItemResolve";
