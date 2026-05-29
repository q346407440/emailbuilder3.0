import type { CollectionDataSource } from "../payload-contract/collection-data-source";
import type { CollectionDisplayRule, CollectionDisplayRulePreset } from "../payload-contract/types";
import type { BindingCollectionField, EmailPayload, EmailTemplate } from "../types/email";

/** 模板中允许外部 payload 赋值的变量槽（variable + allowExternal） */
export type ExternalVariableSlotInfo = {
  slotId: string;
  valueType: string;
  bindings: Array<{ blockId: string; bindPath: string }>;
  label?: string;
  description?: string;
  /** 绑定上携带的默认字面量（多处声明时应一致） */
  defaultValue?: unknown;
  itemFields?: BindingCollectionField[];
  minItems?: number;
  maxItems?: number;
  dataSource?: CollectionDataSource;
  displayRule?: CollectionDisplayRule;
  displayRulePreset?: CollectionDisplayRulePreset;
  /** 该槽位全部绑定区块的最近公共父级（画布联动选中；单处绑定时即为该区块自身） */
  primaryBlockId?: string;
};

function upsertSlot(
  byId: Map<string, ExternalVariableSlotInfo>,
  slot: Omit<ExternalVariableSlotInfo, "bindings">,
  binding: { blockId: string; bindPath: string }
): void {
  const existing = byId.get(slot.slotId);
  if (existing) {
    existing.bindings.push(binding);
    if (!existing.label && slot.label) existing.label = slot.label;
    if (!existing.description && slot.description) existing.description = slot.description;
    if (existing.defaultValue === undefined && slot.defaultValue !== undefined) {
      existing.defaultValue = slot.defaultValue;
    }
    if (!existing.itemFields && slot.itemFields) existing.itemFields = slot.itemFields;
    if (existing.minItems === undefined && slot.minItems !== undefined) existing.minItems = slot.minItems;
    if (existing.maxItems === undefined && slot.maxItems !== undefined) existing.maxItems = slot.maxItems;
    if (!existing.dataSource && slot.dataSource) existing.dataSource = slot.dataSource;
    return;
  }
  byId.set(slot.slotId, {
    ...slot,
    bindings: [binding],
  });
}

/** 自根到该区块的路径（含自身），索引 0 为邮件根 */
function buildBlockAncestorPath(template: EmailTemplate, blockId: string): string[] {
  const path: string[] = [];
  let cur: string | null = blockId;
  while (cur) {
    path.unshift(cur);
    const parentId: string | null | undefined = template.blocks[cur]?.parentId;
    cur = parentId ?? null;
  }
  return path;
}

/** 多个区块在树上的最近公共祖先；仅一处时返回该区块 id */
export function lowestCommonAncestorBlockId(template: EmailTemplate, blockIds: string[]): string | null {
  const unique = [...new Set(blockIds.filter(Boolean))];
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0] ?? null;

  const paths = unique.map((id) => buildBlockAncestorPath(template, id));
  const minLen = Math.min(...paths.map((p) => p.length));
  let lca = paths[0]?.[0] ?? template.rootBlockId;

  for (let i = 0; i < minLen; i++) {
    const id = paths[0]?.[i];
    if (id && paths.every((p) => p[i] === id)) {
      lca = id;
    } else {
      break;
    }
  }
  return lca;
}

/** 自根节点深度优先遍历，得到区块在页面上的出现顺序 */
export function buildBlockDocumentOrder(template: EmailTemplate): string[] {
  const order: string[] = [];
  const visit = (blockId: string) => {
    order.push(blockId);
    const block = template.blocks[blockId];
    if (!block) return;
    for (const childId of block.children ?? []) {
      visit(childId);
    }
  };
  visit(template.rootBlockId);
  return order;
}

function sortSlotsByDocumentOrder(
  template: EmailTemplate,
  slots: ExternalVariableSlotInfo[]
): ExternalVariableSlotInfo[] {
  const blockOrder = buildBlockDocumentOrder(template);
  const blockRank = new Map(blockOrder.map((id, index) => [id, index]));

  const slotFirstRank = new Map<string, number>();

  for (const slot of slots) {
    let minRank = Number.POSITIVE_INFINITY;
    for (const binding of slot.bindings) {
      const rank = blockRank.get(binding.blockId);
      if (rank === undefined) continue;
      if (rank < minRank) minRank = rank;
    }
    slotFirstRank.set(slot.slotId, minRank);
  }

  return [...slots]
    .sort((a, b) => {
      const rankA = slotFirstRank.get(a.slotId) ?? Number.POSITIVE_INFINITY;
      const rankB = slotFirstRank.get(b.slotId) ?? Number.POSITIVE_INFINITY;
      if (rankA !== rankB) return rankA - rankB;
      return a.slotId.localeCompare(b.slotId);
    })
    .map((slot) => ({
      ...slot,
      primaryBlockId:
        lowestCommonAncestorBlockId(
          template,
          slot.bindings.map((b) => b.blockId)
        ) ?? undefined,
    }));
}

/**
 * 变量槽在画布上应聚焦的区块：全部绑定点的最近公共父级。
 * 邮件根节点在画布上对应「未选中具体区块」（null）。
 */
export function getSlotPrimaryBlockId(
  template: EmailTemplate,
  slot: ExternalVariableSlotInfo
): string | null {
  const lca =
    lowestCommonAncestorBlockId(
      template,
      slot.bindings.map((b) => b.blockId)
    ) ?? slot.primaryBlockId;
  if (!lca || lca === template.rootBlockId) return null;
  return lca;
}

/**
 * 扫描模板 bindings，汇总可配置的变量槽（按 slotId 去重）。
 * 返回顺序按邮件区块树文档顺序（自上而下），而非 slotId 字母序。
 */
export function collectExternalVariableSlots(template: EmailTemplate | null): ExternalVariableSlotInfo[] {
  if (!template) return [];
  const byId = new Map<string, ExternalVariableSlotInfo>();
  for (const [blockId, block] of Object.entries(template.blocks)) {
    if (block.repeat?.mode === "collection") {
      upsertSlot(
        byId,
        {
          slotId: block.repeat.slotId,
          valueType: "collection",
          label: block.repeat.label,
          description: block.repeat.description,
          itemFields: block.repeat.itemFields,
          minItems: block.repeat.minItems,
          maxItems: block.repeat.maxItems,
        },
        { blockId, bindPath: "repeat" }
      );
    }
    if (block.visibility) {
      upsertSlot(
        byId,
        {
          slotId: block.visibility.slotId,
          valueType: block.visibility.valueType,
          label: block.visibility.label,
          description: block.visibility.description,
          itemFields: block.visibility.itemFields,
          minItems: block.visibility.minItems,
          maxItems: block.visibility.maxItems,
        },
        { blockId, bindPath: "visibility" }
      );
    }
    if (!block.bindings) continue;
    for (const [bindPath, spec] of Object.entries(block.bindings)) {
      if (spec.mode === "variable" && spec.allowExternal === true) {
        upsertSlot(
          byId,
          {
            slotId: spec.slotId,
            valueType: spec.valueType ?? "string",
            label: spec.label,
            description: spec.description,
            defaultValue: spec.defaultValue,
            itemFields: spec.itemFields,
            minItems: spec.minItems,
            maxItems: spec.maxItems,
          },
          { blockId, bindPath }
        );
        continue;
      }
      if (spec.mode === "interpolate") {
        for (const slot of spec.interpolationSlots ?? []) {
          if (slot.allowExternal !== true) continue;
          upsertSlot(
            byId,
            {
              slotId: slot.slotId,
              valueType: slot.valueType,
              label: slot.label,
              description: slot.description,
              defaultValue: slot.defaultValue,
            },
            { blockId, bindPath }
          );
        }
      }
    }
  }
  return sortSlotsByDocumentOrder(template, Array.from(byId.values()));
}

const SCALAR_VALUE_TYPES = new Set(["string", "url", "image", "color", "number", "boolean"]);

function isScalarValueType(valueType: string): boolean {
  return SCALAR_VALUE_TYPES.has(valueType);
}

/**
 * 变量目录以 payload.slots 为唯一真源；template 仅贡献绑定位置与画布排序。
 */
export function collectPayloadVariableSlots(
  template: EmailTemplate | null,
  payload: EmailPayload | null
): ExternalVariableSlotInfo[] {
  if (!payload?.slots || !template) return [];
  const bindingBySlotId = new Map<string, Array<{ blockId: string; bindPath: string }>>();
  for (const slot of collectExternalVariableSlots(template)) {
    bindingBySlotId.set(slot.slotId, slot.bindings);
  }

  const slots: ExternalVariableSlotInfo[] = Object.entries(payload.slots).map(
    ([slotId, def]) => ({
      slotId,
      valueType: def.valueType,
      label: def.label,
      description: def.description,
      itemFields: def.itemFields,
      minItems: def.minItems,
      maxItems: def.maxItems,
      dataSource: def.dataSource,
      displayRule: def.displayRule,
      displayRulePreset: def.displayRulePreset,
      bindings: bindingBySlotId.get(slotId) ?? [],
      defaultValue: payload.values[slotId],
    })
  );

  return sortSlotsByDocumentOrder(template, slots);
}

/** 标量变量槽（文中变量弹窗、Payload 侧栏标量列表） */
export function collectScalarExternalVariableSlots(
  template: EmailTemplate | null,
  payload: EmailPayload | null
): ExternalVariableSlotInfo[] {
  return collectPayloadVariableSlots(template, payload).filter((slot) =>
    isScalarValueType(slot.valueType)
  );
}
