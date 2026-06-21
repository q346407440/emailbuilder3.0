import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { ensureLayoutContentAlignPersisted } from "./layoutContentAlign";
import { deleteAtPath, getAtPath, setAtPath } from "./paths";
import { interpolateTextValue } from "./interpolateText";
import { coerceBoxModelOnContainer } from "./boxModelStorage";

function clone<T>(v: T): T {
  return structuredClone(v);
}

/**
 * 更新区块 props.* / wrapperStyle.*；若该路径为可变绑定且允许外部赋值，则写入赋值文件的 values。
 */
export function applyBlockField(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  bindPath: string,
  value: unknown
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  if (!block) return { template, payload };

  const spec = block.bindings?.[bindPath];
  if (spec?.mode === "variable" && spec.allowExternal === true) {
    if (!payload.detachedVariableSlotIds?.includes(spec.slotId)) {
      const p = clone(payload);
      p.values = { ...p.values, [spec.slotId]: value };
      return { template, payload: p };
    }
  }

  // 结构共享：blocks 为扁平 map（children 以 id 引用），改一个 block 无需深拷贝整树。
  // 仅浅拷贝模板与 blocks map，并深拷贝被改的那个 block，其余 block 复用原引用。
  const b = clone(block);
  const t: EmailTemplate = { ...template, blocks: { ...template.blocks, [blockId]: b } };

  const [root, ...rest] = bindPath.split(".");
  const sub = rest.join(".");
  if (root === "props") {
    if (sub) {
      if (value === null) deleteAtPath(b.props as Record<string, unknown>, sub);
      else setAtPath(b.props as Record<string, unknown>, sub, value);
    } else Object.assign(b.props, value as object);
    coerceBoxModelOnContainer(b.props as Record<string, unknown>, sub);
    if (b.type === "layout" && sub === "direction") {
      ensureLayoutContentAlignPersisted(b);
    }
  } else if (root === "wrapperStyle") {
    if (!b.wrapperStyle) b.wrapperStyle = {};
    if (sub) {
      if (value === null) deleteAtPath(b.wrapperStyle as Record<string, unknown>, sub);
      else setAtPath(b.wrapperStyle as Record<string, unknown>, sub, value);
    } else Object.assign(b.wrapperStyle, value as object);
    coerceBoxModelOnContainer(b.wrapperStyle as Record<string, unknown>, sub);
  }

  return { template: t, payload };
}

export function applyRootCanvasField(
  template: EmailTemplate,
  bindPath: string,
  value: unknown
): EmailTemplate {
  // 结构共享：仅深拷贝根 block，其余复用原引用。
  const originalRoot = template.blocks[template.rootBlockId];
  if (!originalRoot || originalRoot.type !== "emailRoot") return template;
  const root = clone(originalRoot);
  const t: EmailTemplate = {
    ...template,
    blocks: { ...template.blocks, [template.rootBlockId]: root },
  };
  const [rootKey, ...rest] = bindPath.split(".");
  if (rootKey !== "props") return t;
  const sub = rest.join(".");
  if (sub) setAtPath(root.props as Record<string, unknown>, sub, value);
  coerceBoxModelOnContainer(root.props as Record<string, unknown>, sub);
  return t;
}

export function bindingMeta(
  block: EmailBlock,
  bindPath: string
): { fromPayload: boolean; slotId?: string } {
  const spec = block.bindings?.[bindPath];
  if (spec?.mode === "variable" && spec.allowExternal) {
    return { fromPayload: true, slotId: spec.slotId };
  }
  if (spec?.mode === "interpolate") {
    return { fromPayload: true, slotId: spec.slotId };
  }
  return { fromPayload: false };
}

function readVariableBoundValue(raw: unknown, slotPath: string | undefined): unknown {
  if (raw === undefined) return undefined;
  if (!slotPath) return raw;
  return getAtPath(raw as Record<string, unknown>, slotPath);
}

/** 表单展示：可变绑定优先读赋值文件，否则读模板字面量 */
export function readFieldDisplay(
  block: EmailBlock,
  payload: EmailPayload,
  bindPath: string
): unknown {
  const spec = block.bindings?.[bindPath];
  if (spec?.mode === "variable" && spec.allowExternal === true) {
    if (!payload.detachedVariableSlotIds?.includes(spec.slotId)) {
      const v = readVariableBoundValue(payload.values[spec.slotId], spec.slotPath);
      if (v !== undefined) return v;
      const defaultValue = readVariableBoundValue(spec.defaultValue, spec.slotPath);
      if (defaultValue !== undefined) return defaultValue;
    }
  }
  const [root, ...rest] = bindPath.split(".");
  const sub = rest.join(".");
  if (root === "props") {
    const raw = getAtPath(block.props as Record<string, unknown>, sub);
    if (spec?.mode === "interpolate" && typeof raw === "string") {
      return interpolateTextValue(raw, spec.interpolationSlots, payload.values);
    }
    return raw;
  }
  if (root === "wrapperStyle") {
    const raw = getAtPath((block.wrapperStyle ?? {}) as Record<string, unknown>, sub);
    if (spec?.mode === "interpolate" && typeof raw === "string") {
      return interpolateTextValue(raw, spec.interpolationSlots, payload.values);
    }
    return raw;
  }
  return undefined;
}
