/**
 * AI 管线 D/E 编译阶段契约：不变量与职责（validateTemplate 仅作 Gate，不在此修复）。
 *
 * 流程：LLM → Compact IR → D 语义规范化 → E lowering → validateTemplate
 */

export type PipelineCompilePhase = "D" | "E" | "GATE";

export type PipelineInvariant = {
  id: string;
  phase: PipelineCompilePhase;
  summary: string;
  /** 违反时的处理策略 */
  onViolation: "normalize_in_d" | "lowering_bug" | "sanitize_drop" | "stage_c_retry" | "fail";
};

/** D/E 阶段不变量目录（实现须逐条落地或显式标注 N/A）。 */
export const PIPELINE_COMPILE_INVARIANTS: readonly PipelineInvariant[] = [
  {
    id: "D-REF-1",
    phase: "D",
    summary: "textId / iconRef / backgroundImageRef 必须在当区白名单内",
    onViolation: "sanitize_drop",
  },
  {
    id: "D-REF-2",
    phase: "D",
    summary: "compact 树不含 block-contract 外字段与 COMPACT_*_FORBIDDEN_KEYS",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-LAYOUT-1",
    phase: "D",
    summary: "Stage A layoutHints.align 落到区域根与子 text/button 的对齐策略（SectionLayoutSemantics）",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-LAYOUT-2",
    phase: "D",
    summary: "父 widthMode=hug 时子级禁止 width fill（与 wrapperFillConstraint 同规则，在 IR 层闭合）",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-LAYOUT-3",
    phase: "D",
    summary: "父纵向 layout heightMode=hug 时子级禁止 height fill",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-BOX-1",
    phase: "D",
    summary: "每个 compact 节点 widthMode/heightMode 合法；fixed 必有 px 或由预设表提供",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-BOX-2",
    phase: "D",
    summary: "content.image 容器尺寸由 role/layoutTier 查表（ImageContainerCompiler），剥离 C 误写 px",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-BOX-3",
    phase: "D",
    summary:
      "缺省 widthMode：action.button/content.icon→hug；content.text 竖排 fill、横排 hug；全宽 CTA 由 C 显式 fill",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-ALIGN-1",
    phase: "D",
    summary: "wrapper.contentAlign 双轴合法（horizontal + vertical，缺 vertical 默认 top）",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-LAYOUT-4",
    phase: "D",
    summary:
      "B1 section/pageInline 写入全区统一区段壳 padding.separate；首区 top=0；fullWidth 左右 0；禁止逐区 gapAbove/gapBelow 破坏整齐度",
    onViolation: "normalize_in_d",
  },
  {
    id: "D-RADIUS-1",
    phase: "D",
    summary: "Stage C 禁止写 wrapper.borderRadius；圆角由 E 按 B1 panel/cta + block 角色编译",
    onViolation: "normalize_in_d",
  },
  {
    id: "E-RADIUS-1",
    phase: "E",
    summary:
      "按钮 ← radius.cta；card/非全宽图 ← panel（backgroundImage + wrapper）；全宽 hero/logo ← 0；有色 layout.container ← panel",
    onViolation: "lowering_bug",
  },
  {
    id: "E-MAP-1",
    phase: "E",
    summary: "lowering 按 block 类型一次写全 validate 必填 wrapperStyle/props 字段",
    onViolation: "lowering_bug",
  },
  {
    id: "E-MAP-2",
    phase: "E",
    summary: "parentId/children 与树结构一致；blockId 由程序生成",
    onViolation: "lowering_bug",
  },
  {
    id: "E-MAP-3",
    phase: "E",
    summary: "content.image → runtime image：backgroundImage 含 src/fit/position；圆角/描边由 wrapperStyle 承接",
    onViolation: "lowering_bug",
  },
  {
    id: "E-MAP-4",
    phase: "E",
    summary:
      "blockMeta.name：区段壳 ← Stage A region；区内 ← Stage C label；缺省按 B3 role / 配图 role / kind",
    onViolation: "lowering_bug",
  },
  {
    id: "D-REF-3",
    phase: "D",
    summary: "action.button 禁止 wrapper.backgroundColor（背景只在 buttonStyle / styleKeys.buttonStyle.*）",
    onViolation: "normalize_in_d",
  },
  {
    id: "E-MAP-5",
    phase: "E",
    summary: "action.button lowering 剥离 wrapperStyle.backgroundColor；误写背景迁入 buttonStyle",
    onViolation: "lowering_bug",
  },
  {
    id: "GATE-1",
    phase: "GATE",
    summary: "validateTemplate + tokenPresets schema 通过；失败整单不落盘",
    onViolation: "fail",
  },
] as const;

/** 阶段职责一句话（供文档与日志）。 */
export const PIPELINE_COMPILE_PHASE_SUMMARY: Record<
  "LLM" | PipelineCompilePhase,
  string
> = {
  LLM: "输出 Compact IR 与 Stage A 布局语义；不输出 nested template",
  D: "语义规范化：引用、布局策略、盒模型在 IR 层闭合",
  E: "纯 lowering：IR → EmailTemplate 字段表驱动，不做事后 reconcile",
  GATE: "validateTemplate 仅验证；错误须可映射回 compact 路径或 Stage C 重试",
};
