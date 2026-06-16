import type { RepeatBindingRule } from "../repeat-binding-contract/types";

/** 对象绑定规则目录（宿主类型与 repeat 一致，无行展开） */
export const OBJECT_BINDING_RULES: readonly RepeatBindingRule[] = [
  {
    id: "object.host.layout-grid-image",
    kind: "host",
    title: "对象绑定宿主",
    summary:
      "layout / grid / image 可作对象绑定宿主；同一宿主不可同时声明 repeat 与 objectBind。",
    implementation: "src/lib/objectBindRegion.ts · isObjectHostBlock",
  },
  {
    id: "object.mapping.scalar-only",
    kind: "field-mapping",
    title: "对象字段映射",
    summary:
      "fieldMappings.sourcePath 为 objectFields 标量 key；禁止 itemOffset 与嵌套 collection。",
    implementation: "src/lib/objectFieldMapping.ts · buildObjectFieldMappings",
  },
  {
    id: "object.preview.no-expand",
    kind: "runtime",
    title: "对象预览物化",
    summary:
      "预览前将 objectBind.fieldMappings 写入目标 block.bindings（slotPath=字段 key），不克隆子树。",
    implementation: "src/lib/objectBindRegion.ts · applyObjectBindMappingsToTemplate",
  },
] as const;
