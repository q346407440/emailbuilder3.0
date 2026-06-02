import type { RepeatBindingRule } from "./types";
import { REPEAT_NESTING_DEPTH_MAX } from "./values";

/**
 * 列表 repeat 绑定行为目录（唯一真源）。
 * 机器校验：`src/lib/validate.ts` · `validateTemplateBindings`；运行时：`src/lib/repeatRegion.ts`。
 * 索引：技能 **`easy-email-repeat-binding`**。
 */
export const REPEAT_BINDING_RULES: readonly RepeatBindingRule[] = [
  {
    id: "repeat.host.blockTypes",
    kind: "host",
    title: "宿主 block 类型",
    summary:
      "列表 repeat 只能绑定在 layout、grid、image 上；emailRoot、text、button 等不可作宿主。",
    implementation: "src/repeat-binding-contract/values.ts · src/lib/repeatHostBlock.ts",
  },
  {
    id: "repeat.host.selectionRequired",
    kind: "host",
    title: "须选中宿主容器才能发起绑定",
    summary:
      "Inspector 仅在画布选中 layout/grid/image 宿主时提供「配置列表绑定」并落盘；选中行模板内非宿主子 block 时仅展示摘要（查看绑定），不能应用新绑定。",
    implementation: "src/components/Inspector.tsx · repeatBindHostId / ownRepeat 分支",
  },
  {
    id: "repeat.selfRepeat.prototypeChildIds",
    kind: "self-repeat",
    title: "选中容器即行模板（self-repeat）",
    summary:
      "落盘 prototypeChildIds 与 fallbackChildIds 只能为 [宿主自身 id]。禁止旧版「选子 block 当行模板」。applySingleLevelRepeatBinding 为唯一应用入口。",
    implementation:
      "src/lib/validate.ts · src/lib/repeatNestedBinding.ts · applySingleLevelRepeatBinding",
  },
  {
    id: "repeat.bindWizard.steps",
    kind: "bind-wizard",
    title: "单层绑定向导两步",
    summary:
      "RepeatRegionBindModal：步骤 1 列表变量 → 步骤 2 字段映射。已绑定宿主「编辑绑定」或 viewOnly「查看绑定」打开时直达步骤 2，可上一步改列表变量。无多层合一向导（UnifiedRepeatBindPlan 类型仍存，UI 未暴露 parentAndChild/childOnly）。",
    implementation: "src/components/RepeatRegionBindModal.tsx · buildWizardSteps",
  },
  {
    id: "repeat.bindWizard.slotCandidates",
    kind: "bind-wizard",
    title: "步骤 1 列表数据源候选",
    summary:
      "① 子列表（优先）：若存在最近祖先 repeat 宿主，从其 repeat.itemFields 取 collection 列，生成 slotId::itemPath 候选；行展示「父项子列表」tag、标识列为 itemPath、首项示例取自父项第 1 行内子数组。② 顶层槽：payload.slots 中全部 collection 槽，但排除父级已绑定的 slotId（mergeRepeatBindSlotCandidates）。子列表在前。",
    implementation:
      "src/lib/repeatBindSlotCandidates.ts · src/components/Inspector.tsx · RepeatRegionBindModal CollectionSlotPickerTable",
  },
  {
    id: "repeat.bindWizard.fieldMapping.scalarsOnly",
    kind: "field-mapping",
    title: "步骤 2 仅映射本层列表标量列",
    summary:
      "parentScalarItemFieldsFromItemFields 过滤 collection 列；buildRepeatFieldMappings 亦跳过 collection。校验 fieldMappings.sourcePath 不得为 collection 类型。",
    implementation:
      "src/lib/repeatNestedBindingUi.ts · src/components/Inspector.tsx · src/lib/validate.ts",
  },
  {
    id: "repeat.bindWizard.fieldMapping.noIntermediateRepeat",
    kind: "field-mapping",
    title: "不映射更深层 repeat 子树字段",
    summary:
      "映射目标取自宿主子树（prototypeChildIds=[hostId]），并排除 blockId→hostId 路径上经过其它 repeat 宿主的 block（hasIntermediateRepeatBetween）。",
    implementation: "src/components/Inspector.tsx",
  },
  {
    id: "repeat.bindWizard.fieldMapping.optional",
    kind: "field-mapping",
    title: "字段映射可空",
    summary:
      "行模板内无可映射内容字段时，步骤 2 提示「将沿用模板已有变量绑定」；仍可在步骤 1 完成后应用 repeat（fieldMappings 可为空）。",
    implementation: "src/components/RepeatRegionBindModal.tsx · parentMappingStep 空态",
  },
  {
    id: "repeat.bindings.dualPath",
    kind: "field-mapping",
    title: "fieldMappings 与行内 bindings 并存",
    summary:
      "绑定向导写入 repeat.fieldMappings；存量模板可在行模板 block.bindings 上用 slotPath「0.<key>」。展开时 fieldMappings 与 rewriteRepeatBindingSpec 均生效；校验映射目标须在 prototype 子树且为 content 字段。",
    implementation: "src/repeat-runtime/repeatPrototypeSnapshot.ts · src/lib/validate.ts",
  },
  {
    id: "repeat.nested.orthogonal",
    kind: "nested",
    title: "父子 repeat 正交",
    summary:
      "applySingleLevelRepeatBinding 不清除子树内已有 repeat；父级 removeUnifiedRepeatBinding 会清除物化/原型子树内嵌套 repeat（keepPrototypeOnly 清 prototype 根下子级 repeat）。",
    implementation: "src/lib/repeatNestedBinding.ts",
  },
  {
    id: "repeat.nested.enclosingParent",
    kind: "nested",
    title: "子列表祖先判定",
    summary:
      "enclosingParentRepeat：自 parentId 向上 walk，取最近一层带 collection repeat 的 layout/grid/image 宿主的 repeat 配置（非直接父级限定）。",
    implementation: "src/components/Inspector.tsx",
  },
  {
    id: "repeat.nested.depthMax",
    kind: "nested",
    title: "嵌套深度上限",
    summary: `countAncestorRepeatDepth + 1（含当前宿主）不得超过 ${REPEAT_NESTING_DEPTH_MAX}。`,
    implementation: "src/lib/validate.ts · validateTemplateBindings",
  },
  {
    id: "repeat.nested.itemPath",
    kind: "nested",
    title: "父项子列表（itemPath）",
    summary:
      "repeat.itemPath 为非空点路径；resolveRepeatItemsForExpansion 从 repeat 运行时上下文锚定父项取子数组。slotId 可与父级 repeat 相同。",
    implementation: "src/lib/repeatRegion.ts",
  },
  {
    id: "repeat.canvas.lockChildBlocks",
    kind: "runtime",
    title: "行模板子树锁定画布结构操作",
    summary:
      "isRepeatListBindingChildBlock：repeat 宿主自身可操作；行模板/fallback/映射字段子树内 block 隐藏插入/移动/复制/删除（App.tsx）。",
    implementation: "src/lib/repeatRegion.ts · src/App.tsx",
  },
  {
    id: "repeat.runtime.virtualView",
    kind: "runtime",
    title: "虚拟预览不落盘",
    summary:
      "buildRepeatPreviewModel 按 VirtualBlockRef 生成预览树，不克隆 blocks 进 template.json；画布/区块树/Inspector 读 RepeatPreviewModel。",
    implementation: "src/repeat-runtime/buildPreviewModel.ts · repeatVirtualResolver.ts",
  },
  {
    id: "repeat.selection.expansionGroup",
    kind: "runtime",
    title: "展开组选中（点一项选中全部复制体）",
    summary:
      "repeat-item 在画布与区块树按 refToRepeatExpansionGroupKey（hostId + prototypeRootId + 父级 contextStack）组选；物理块仍精确匹配。实现 isRepeatExpansionGroupSelected。",
    implementation: "src/repeat-runtime/repeatExpansionGroup.ts · EmailPreview · BlockTree",
  },
  {
    id: "repeat.unbind.materialize",
    kind: "unbind",
    title: "解除绑定物化",
    summary:
      "默认 materializeRows：按 payload 项数物化；第 1 项保留原型 id，第 2 项起为 原型-2、原型-3…；清除物化子树内 repeat。keepPrototypeOnly：仅留 prototype 行并清其子树 repeat。",
    implementation:
      "src/lib/repeatRegion.ts · materializedRepeatRowBlockId · removeRepeatRegionBinding",
  },
  {
    id: "repeat.rebind.normalizeMaterialized",
    kind: "unbind",
    title: "物化态重绑归一化",
    summary:
      "applySingleLevelRepeatBinding 写入前调用 normalizeTemplateBeforeUnifiedRepeatBinding + remapRepeatFieldMappingTargets。",
    implementation: "src/lib/repeatMaterializedNormalize.ts · applySingleLevelRepeatBinding",
  },
] as const;

export const REPEAT_BINDING_RULE_IDS = REPEAT_BINDING_RULES.map((r) => r.id);
