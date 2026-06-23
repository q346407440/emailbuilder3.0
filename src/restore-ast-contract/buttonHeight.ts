/**
 * RestoreAst 按钮高度档 → 组装器落盘映射。
 *
 * hug：由字号 + 渲染默认内边距撑开（不写 template 定高）。
 * relaxed：设计图明显偏高的 CTA（约 1.5× 常规胶囊），落盘 fixed + 固定 px。
 */
export const BUTTON_HEIGHT_TOKENS = ["hug", "relaxed"] as const;

/** 常规 hug 胶囊约 32px（8+16+8）；relaxed 取约 1.5 倍。 */
export const RESTORE_AST_BUTTON_RELAXED_HEIGHT_PX = 48;
