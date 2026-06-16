/** 对象绑定向导步骤（复用列表绑定的字段映射交互，无「重复方式」步） */
export const OBJECT_BIND_WIZARD_STEP_IDS = ["objectSlot", "objectMap"] as const;

export type ObjectBindWizardStepId = (typeof OBJECT_BIND_WIZARD_STEP_IDS)[number];

/** 与 repeat 相同：layout / grid / image 可作对象绑定宿主 */
export { REPEAT_HOST_BLOCK_TYPES as OBJECT_HOST_BLOCK_TYPES } from "../repeat-binding-contract/values";
export type { RepeatHostBlockType as ObjectHostBlockType } from "../repeat-binding-contract/values";
