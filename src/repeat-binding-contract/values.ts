/** 可作为列表 repeat 宿主的 block 类型（与 layout 容器叠放语义对齐，含 image） */
export const REPEAT_HOST_BLOCK_TYPES = ["layout", "grid", "image"] as const;

export type RepeatHostBlockType = (typeof REPEAT_HOST_BLOCK_TYPES)[number];

/** 模板内 repeat 宿主嵌套最大深度（含当前层） */
export const REPEAT_NESTING_DEPTH_MAX = 3;

/** 绑定向导步骤 id（单层绑定：列表变量 → 字段映射） */
export const REPEAT_BIND_WIZARD_STEP_IDS = ["parentSlot", "parentMap"] as const;
