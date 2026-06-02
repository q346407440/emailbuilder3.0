import type { EmailBlock } from "../types/email";

/** 列表 repeat 绑定规则分类 */
export type RepeatBindingRuleKind =
  | "host"
  | "self-repeat"
  | "bind-wizard"
  | "nested"
  | "field-mapping"
  | "runtime"
  | "unbind";

/** 列表 repeat 绑定契约规则条目（人类可读目录；机器校验见 validate.ts） */
export type RepeatBindingRule = {
  id: string;
  kind: RepeatBindingRuleKind;
  title: string;
  summary: string;
  /** 主要实现入口 */
  implementation: string;
};

/** repeat 展开时当前列表项的运行时上下文（嵌套 repeat 栈） */
export type RepeatRuntimeContext = {
  slotId: string;
  itemIndex: number;
  item: Record<string, unknown>;
  itemPath: string;
};

/** 编辑器/预览中的虚拟区块引用（物理 template 块或 repeat 展开项） */
export type VirtualBlockRef =
  | { kind: "physical"; blockId: string }
  | {
      kind: "repeat-item";
      hostId: string;
      prototypeRootId: string;
      itemIndex: number;
      contextStack: RepeatRuntimeContext[];
    };

/** 预览树节点：含虚拟 ref 与 merge 后的 block 快照（不落盘） */
export type PreviewBlockNode = {
  ref: VirtualBlockRef;
  block: EmailBlock;
  children: PreviewBlockNode[];
};

/** repeat 虚拟预览模型根 */
export type RepeatPreviewModel = {
  root: PreviewBlockNode;
};
