/** nested 节点上允许出现的壳字段（block-contract 字段仍由 validateTemplate 校验） */
export const NESTED_BLOCK_SHELL_KEYS = new Set([
  "id",
  "blockMeta",
  "type",
  "wrapperStyle",
  "props",
  "bindings",
  "repeat",
  "objectBind",
  "visibility",
  "children",
]);

/** nested template envelope 允许键（禁止顶层 blocks / rootBlockId / blockMeta map） */
export const NESTED_TEMPLATE_ENVELOPE_KEYS = new Set([
  "schemaVersion",
  "emailId",
  "templateId",
  "templateVersion",
  "locale",
  "meta",
  "root",
]);

/** block 母版 envelope 键 */
export const NESTED_BLOCK_MASTER_ENVELOPE_KEYS = new Set([
  "schemaVersion",
  "masterId",
  "name",
  "version",
  "description",
  "runtimeType",
  "blockType",
  "sampleBlockId",
  "catalogRootBlockId",
  "root",
]);

/** section 母版 envelope 键 */
export const NESTED_SECTION_MASTER_ENVELOPE_KEYS = new Set([
  "schemaVersion",
  "masterId",
  "name",
  "version",
  "description",
  "rootBlockId",
  "catalogRootBlockId",
  "root",
  "deletedAt",
]);
