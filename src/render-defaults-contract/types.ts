import type { EmailBlock } from "../types/email";

/** 规则作用到的 block 运行时类型；`all` 表示任意非根块。 */
export type RenderRuleBlockScope = EmailBlock["type"] | "emailRoot" | "all";

/**
 * - `forbiddenInJson`：禁止出现在 template.json（校验报错；迁移脚本剥离）
 * - `injectedAtRender`：画布生效但由渲染层写死，不持久化
 * - `specialSemantic`：字段可进 JSON，但在特定上下文下渲染语义与常规定义不同
 */
export type RenderRuleKind = "forbiddenInJson" | "injectedAtRender" | "specialSemantic";

export type RenderDefaultRule = {
  /** 稳定 id，供技能/测试引用 */
  id: string;
  kind: RenderRuleKind;
  title: string;
  summary: string;
  /** template 内 JSON 路径（相对单块）；禁止类与特殊语义类填写 */
  jsonPath?: string;
  blockTypes?: RenderRuleBlockScope[];
  /** 指向 `RENDER_DEFAULT_VALUES` 的键（injectedAtRender） */
  valueKey?: string;
  /** 实现入口（相对仓库根） */
  implementation?: string;
};

export type RenderDefaultsContractIssue = { path: string; reason: string };
