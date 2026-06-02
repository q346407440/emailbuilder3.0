export {
  NESTED_TEMPLATE_SCHEMA_VERSION,
  type NestedBlockMeta,
  type NestedEmailBlock,
  type NestedEmailTemplate,
  type NestedDiskValidationIssue,
} from "./types";

export {
  NESTED_BLOCK_SHELL_KEYS,
  NESTED_TEMPLATE_ENVELOPE_KEYS,
  NESTED_BLOCK_MASTER_ENVELOPE_KEYS,
  NESTED_SECTION_MASTER_ENVELOPE_KEYS,
} from "./shell-keys";

export {
  type NestedBlockMaster,
  type NestedSectionMaster,
  type NestedMaster,
  isNestedSectionMaster,
} from "./masters";

export {
  isForbiddenFlatDiskWire,
  isNestedDiskTemplate,
  validateNestedDisk,
  assertNestedDiskTemplate,
} from "./validate";

export { assertNestedMasterDisk, validateNestedMasterDisk } from "./validate-masters";
