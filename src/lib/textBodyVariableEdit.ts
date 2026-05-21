import type { BindingSpec, EmailBlock, EmailPayload, EmailTemplate, TextBlock } from "../types/email";
import { isSlotValueType } from "../payload-contract/value-types";
import { getAtPath, setAtPath } from "./paths";
import { readTemplateFieldOnly, setTemplateFieldOnly } from "./themeBindingEdit";
import {
  getTextBodyContentMode,
  getWholeTextBodyVariableBindPath,
  type TextBodyContentMode,
} from "./textBodyContentMode";
import { normalizeTextBody, textBodyToPlainString } from "./textBodyFormat";
import { applyVariableBinding } from "./variableBindingEdit";
import type { TextBodyV1 } from "../types/email";
import { inferScalarPayloadValueType, registerPayloadSlot } from "./payloadSlotRegister";
import { detachInlineVariableBinding, detachVariableSlot } from "./variableBindingEdit";

const TEXT_RUN_TEXT_BIND_RE = /^props\.textBody\.paragraphs\.(\d+)\.runs\.(\d+)\.text$/;
const TEXT_RUN_LINK_BIND_RE = /^props\.textBody\.paragraphs\.(\d+)\.runs\.(\d+)\.link$/;

function readMergedField(merged: EmailTemplate, blockId: string, bindPath: string): unknown {
  const b = merged.blocks[blockId];
  if (!b) return undefined;
  return readTemplateFieldOnly(b, bindPath);
}

function deleteBinding(block: EmailBlock, bindPath: string): void {
  if (!block.bindings) return;
  delete block.bindings[bindPath];
  if (Object.keys(block.bindings).length === 0) delete block.bindings;
}

function setRunText(body: TextBodyV1, bindPath: string, text: string): TextBodyV1 {
  const m = bindPath.match(TEXT_RUN_TEXT_BIND_RE);
  if (!m) return body;
  const pi = Number(m[1]);
  const ri = Number(m[2]);
  const next = structuredClone(body);
  const run = next.paragraphs[pi]?.runs?.[ri];
  if (!run) return body;
  run.text = text;
  delete run.link;
  return next;
}

function clearRunLinkBinding(block: EmailBlock, pi: number, ri: number): void {
  deleteBinding(block, `props.textBody.paragraphs.${pi}.runs.${ri}.link`);
}

/** 解除单个 run 的 variable 绑定，并将展示值烘焙进 textBody */
export function detachRunVariableToLiteral(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  textBindPath: string,
  displayText: string,
  merged: EmailTemplate
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  if (!block || block.type !== "text") return { template, payload };

  const m = textBindPath.match(TEXT_RUN_TEXT_BIND_RE);
  if (!m) return { template, payload };
  const pi = Number(m[1]);
  const ri = Number(m[2]);

  let t = structuredClone(template);
  let b = t.blocks[blockId] as TextBlock;
  const spec = b.bindings?.[textBindPath];
  if (spec?.mode === "variable" && spec.allowExternal) {
    const baked =
      typeof displayText === "string" && displayText
        ? displayText
        : String(readMergedField(merged, blockId, textBindPath) ?? readTemplateFieldOnly(b, textBindPath) ?? "");
    const body = normalizeTextBody(b.props.textBody);
    if (body) {
      const nextBody = setRunText(body, textBindPath, baked);
      t = setTemplateFieldOnly(t, blockId, "props.textBody", nextBody);
      b = t.blocks[blockId] as TextBlock;
    }
    deleteBinding(b, textBindPath);
    clearRunLinkBinding(b, pi, ri);
  }

  return { template: t, payload };
}

/** 将正文内所有文中变量（run variable + interpolate）烘焙为字面量 */
export function bakeTextBodyInlineVariablesToLiteral(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  merged: EmailTemplate,
  resolveDisplay: (bindPath: string) => string
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  if (!block || block.type !== "text") return { template, payload };

  let t = template;
  let p = payload;

  const interpolatePaths = Object.entries(block.bindings ?? {})
    .filter(([path, spec]) => spec.mode === "interpolate" && path.startsWith("props.textBody."))
    .map(([path]) => path);

  for (const bindPath of interpolatePaths) {
    t = detachInlineVariableBinding(t, blockId, bindPath, merged);
  }

  const textPaths = Object.entries(block.bindings ?? {})
    .filter(([path, spec]) => spec.mode === "variable" && TEXT_RUN_TEXT_BIND_RE.test(path))
    .map(([path]) => path);

  for (const bindPath of textPaths) {
    const result = detachRunVariableToLiteral(t, p, blockId, bindPath, resolveDisplay(bindPath), merged);
    t = result.template;
    p = result.payload;
  }

  return { template: t, payload: p };
}

/** 整段变量 → 字面量：将合并预览写入 textBody 并移除绑定 */
export function bakeTextBodyWholeVariableToLiteral(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  merged: EmailTemplate,
  resolveDisplay: (bindPath: string) => string
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  if (!block || block.type !== "text") return { template, payload };

  const body = normalizeTextBody(block.props.textBody);
  const wholePath = getWholeTextBodyVariableBindPath(block, body);
  if (!wholePath) return { template, payload };

  if (wholePath === "props.textBody") {
    const baked = readMergedField(merged, blockId, wholePath);
    let t = setTemplateFieldOnly(template, blockId, wholePath, baked === undefined ? readTemplateFieldOnly(block, wholePath) : baked);
    const b = t.blocks[blockId];
    if (b?.bindings?.[wholePath]) deleteBinding(b, wholePath);
    return { template: t, payload };
  }

  const displayText = resolveDisplay(wholePath);
  return detachRunVariableToLiteral(template, payload, blockId, wholePath, displayText, merged);
}

export function bakeTextBodyToLiteralByMode(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  merged: EmailTemplate | null,
  resolveDisplay: (bindPath: string) => string
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  if (!block || block.type !== "text") return { template, payload };
  const body = normalizeTextBody(block.props.textBody);
  const mode = getTextBodyContentMode(block, body);
  const m = merged ?? template;

  if (mode === "wholeVariable") {
    return bakeTextBodyWholeVariableToLiteral(template, payload, blockId, m, resolveDisplay);
  }
  if (mode === "inlineVariable") {
    return bakeTextBodyInlineVariablesToLiteral(template, payload, blockId, m, resolveDisplay);
  }
  return { template, payload };
}

export function applyRunVariableSlotBinding(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  textBindPath: string,
  spec: BindingSpec,
  seedText: string
): { template: EmailTemplate; payload: EmailPayload } {
  const t = structuredClone(template);
  const b = t.blocks[blockId];
  if (!b || b.type !== "text") return { template, payload };
  if (!b.bindings) b.bindings = {};
  b.bindings[textBindPath] = spec;

  const m = textBindPath.match(TEXT_RUN_TEXT_BIND_RE);
  if (m) {
    const body = normalizeTextBody(b.props.textBody);
    if (body) {
      const nextBody = setRunText(body, textBindPath, seedText);
      setAtPath(b.props as Record<string, unknown>, "textBody", nextBody);
    }
  }

  let p = structuredClone(payload);
  if (spec.allowExternal && spec.valueType && isSlotValueType(spec.valueType)) {
    p = registerPayloadSlot(
      p,
      spec.slotId,
      {
        label: spec.label?.trim() || spec.slotId,
        valueType: spec.valueType,
        description: spec.description,
      },
      spec.valueType !== "collection" && !spec.slotPath && p.values[spec.slotId] === undefined
        ? seedText
        : undefined
    );
  }
  p.detachedVariableSlotIds = (p.detachedVariableSlotIds ?? []).filter((id) => id !== spec.slotId);

  return { template: t, payload: p };
}

const INTERPOLATION_PLACEHOLDER_RE = (slotId: string) =>
  new RegExp(
    `\\{\\{\\s*${slotId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\}\\}|\\{\\{${slotId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\}\\}`,
    "g"
  );

function findRunWithSlotPlaceholder(body: TextBodyV1, slotId: string): {
  paragraphIndex: number;
  runIndex: number;
} | null {
  for (let paragraphIndex = 0; paragraphIndex < body.paragraphs.length; paragraphIndex++) {
    const paragraph = body.paragraphs[paragraphIndex];
    if (!paragraph?.runs) continue;
    for (let runIndex = 0; runIndex < paragraph.runs.length; runIndex++) {
      const text = paragraph.runs[runIndex]?.text ?? "";
      if (INTERPOLATION_PLACEHOLDER_RE(slotId).test(text)) {
        return { paragraphIndex, runIndex };
      }
    }
  }
  return null;
}

/** 选区设为文中变量：创建新槽或绑定已有槽（variable 模式 + payload.slots） */
/** 文中变量态 → 整段跟随标量变量：先烘焙内联绑定，再收敛为单 run 并绑定 */
export function applyTextBodyWholeVariableFromSlot(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  merged: EmailTemplate,
  args: {
    slotId: string;
    label: string;
    valueType: BindingSpec["valueType"];
    mode: "create" | "bind";
    defaultValue: string;
  },
  resolveDisplay: (bindPath: string) => string
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  if (!block || block.type !== "text") return { template, payload };

  const baked = bakeTextBodyInlineVariablesToLiteral(template, payload, blockId, merged, resolveDisplay);
  const bakedBlock = baked.template.blocks[blockId] as TextBlock;
  const body = normalizeTextBody(bakedBlock.props.textBody);
  const plain = body ? textBodyToPlainString(body) : args.defaultValue;
  const seed = plain.trim() || args.defaultValue;

  const nextBody: TextBodyV1 = {
    version: 1,
    paragraphs: [{ runs: [{ text: seed }] }],
  };
  let t = setTemplateFieldOnly(baked.template, blockId, "props.textBody", nextBody);
  const b = t.blocks[blockId] as TextBlock;
  if (b.bindings) {
    for (const key of Object.keys(b.bindings)) {
      if (key.startsWith("props.textBody.")) deleteBinding(b, key);
    }
  }

  const bindPath = "props.textBody.paragraphs.0.runs.0.text";
  const spec: BindingSpec = {
    slotId: args.slotId,
    mode: "variable",
    valueType: args.valueType ?? "string",
    allowExternal: true,
    fieldKind: "content",
    label: args.label,
    defaultValue: seed,
  };

  return applyVariableBinding(t, baked.payload, blockId, bindPath, spec, seed);
}

export function applyInlineVariableFromTextBodySelection(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  args: {
    slotId: string;
    label: string;
    defaultValue: string;
    nextTextBody: TextBodyV1;
    mode: "create" | "bind";
    valueType?: string;
  }
): { template: EmailTemplate; payload: EmailPayload } {
  const block = template.blocks[blockId];
  if (!block || block.type !== "text") return { template, payload };

  const runLocation = findRunWithSlotPlaceholder(args.nextTextBody, args.slotId);
  if (!runLocation) return { template, payload };

  const bindPath = `props.textBody.paragraphs.${runLocation.paragraphIndex}.runs.${runLocation.runIndex}.text`;
  const valueType =
    (args.valueType as BindingSpec["valueType"]) ??
    inferScalarPayloadValueType(args.defaultValue);

  let p = payload;
  if (args.mode === "create") {
    p = registerPayloadSlot(
      p,
      args.slotId,
      { label: args.label, valueType },
      args.defaultValue
    );
  } else if (!p.slots[args.slotId]) {
    p = registerPayloadSlot(
      p,
      args.slotId,
      { label: args.label, valueType },
      args.defaultValue
    );
  }

  const spec: BindingSpec = {
    slotId: args.slotId,
    mode: "variable",
    valueType,
    allowExternal: true,
    fieldKind: "content",
    label: args.label,
    defaultValue: args.defaultValue,
  };

  return applyRunVariableSlotBinding(template, p, blockId, bindPath, spec, args.defaultValue);
}

export function setRunLinkBinding(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  paragraphIndex: number,
  runIndex: number,
  href: string,
  urlSlotSpec?: BindingSpec
): { template: EmailTemplate; payload: EmailPayload } {
  const t = structuredClone(template);
  const b = t.blocks[blockId];
  if (!b || b.type !== "text") return { template, payload };

  const body = normalizeTextBody(b.props.textBody);
  if (!body) return { template, payload };
  const nextBody = structuredClone(body);
  const run = nextBody.paragraphs[paragraphIndex]?.runs?.[runIndex];
  if (!run) return { template, payload };
  run.link = href;
  run.decoration = "underline";
  setAtPath(b.props as Record<string, unknown>, "textBody", nextBody);

  const linkPath = `props.textBody.paragraphs.${paragraphIndex}.runs.${runIndex}.link`;
  if (!b.bindings) b.bindings = {};
  if (urlSlotSpec) {
    b.bindings[linkPath] = urlSlotSpec;
  } else {
    deleteBinding(b, linkPath);
  }

  return { template: t, payload };
}

export function clearRunLink(
  template: EmailTemplate,
  payload: EmailPayload,
  blockId: string,
  paragraphIndex: number,
  runIndex: number
): { template: EmailTemplate; payload: EmailPayload } {
  const t = structuredClone(template);
  const b = t.blocks[blockId];
  if (!b || b.type !== "text") return { template, payload };

  const body = normalizeTextBody(b.props.textBody);
  if (!body) return { template, payload };
  const nextBody = structuredClone(body);
  const run = nextBody.paragraphs[paragraphIndex]?.runs?.[runIndex];
  if (!run) return { template, payload };
  delete run.link;
  if (run.decoration === "underline") delete run.decoration;
  setAtPath(b.props as Record<string, unknown>, "textBody", nextBody);
  clearRunLinkBinding(b, paragraphIndex, runIndex);

  return { template: t, payload };
}
