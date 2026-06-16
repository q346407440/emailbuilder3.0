import { resolveBlockContract } from "../block-contract/registry";
import type { RepeatPreviewModel, VirtualBlockRef } from "../repeat-binding-contract";
import {
  findPreviewNodeByRef,
  previewModelToFlatTemplate,
  resolvePhysicalBlockId,
} from "../repeat-runtime";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { readInspectorDisplayValue } from "./inspectorBindingDisplay";
import { filterBindPathsByPrefixCoverage, listInsertDefaultBindPaths } from "./blockInsertDefaultPaths";
import { deepMaterializeThemeRefs } from "./materializeThemeRefs";
import { setAtPath } from "./paths";
import { bakeTextBodyToLiteralByMode } from "./textBodyVariableEdit";

/** 与 Inspector / 插入默认 / 存为模块 共用的字面量快照参数。 */
export type BlockPersistLiteralSnapshotArgs = {
  template: EmailTemplate;
  payload: EmailPayload;
  blockId: string;
  /** 与画布 merge 预览一致的块（含变量插值后的展示值）。 */
  mergedBlock?: EmailBlock | null;
  /** 与 Inspector 一致的 merge 预览模板，供正文变量烘焙。 */
  previewFlatTemplate?: EmailTemplate | null;
  tokenPresets?: TokenPresets | null;
};

export type BlockPersistLiteralSnapshot = {
  props: Record<string, unknown>;
  wrapperStyle: Record<string, unknown>;
};

/** 从 repeat 预览模型解析某物理块的 merge 后块（与 Inspector.mergedBlockForId 一致）。 */
export function mergedBlockFromPreviewModel(
  previewModel: RepeatPreviewModel | null | undefined,
  blockId: string,
  preferredRef?: VirtualBlockRef | null
): EmailBlock | null {
  if (!previewModel) return null;
  if (preferredRef && resolvePhysicalBlockId(preferredRef) === blockId) {
    return findPreviewNodeByRef(previewModel, preferredRef)?.block ?? null;
  }
  return findPreviewNodeByRef(previewModel, { kind: "physical", blockId })?.block ?? null;
}

/** 由预览模型生成 flat merge 模板（供正文烘焙等）。 */
export function previewFlatTemplateFromModel(
  previewModel: RepeatPreviewModel | null | undefined,
  template: EmailTemplate
): EmailTemplate | null {
  if (!previewModel) return null;
  return previewModelToFlatTemplate(previewModel, template);
}

/**
 * 提取单块「内容 / 样式 / 布局」字面量快照：主题与业务变量解析为当前展示值。
 * 不含 bindings / repeat / visibility。
 */
export function extractBlockPersistLiteralSnapshot(
  args: BlockPersistLiteralSnapshotArgs
): BlockPersistLiteralSnapshot {
  const { template, payload, blockId, mergedBlock, previewFlatTemplate, tokenPresets } = args;
  const block = template.blocks[blockId];
  if (!block) {
    throw new Error("区块不存在，无法提取字面量快照");
  }

  const contract = resolveBlockContract(block, template);
  if (!contract) {
    throw new Error("未知组件类型，无法提取字面量快照");
  }

  const readDisplay = (bindPath: string): string => {
    const v = readInspectorDisplayValue(block, payload, mergedBlock ?? undefined, bindPath, template);
    if (v === undefined || v === null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return "";
  };

  let workTemplate = template;
  let workPayload = payload;
  if (block.type === "text") {
    const baked = bakeTextBodyToLiteralByMode(
      template,
      payload,
      blockId,
      previewFlatTemplate ?? template,
      readDisplay
    );
    workTemplate = baked.template;
    workPayload = baked.payload;
  }

  const workBlock = workTemplate.blocks[blockId]!;
  const paths = filterBindPathsByPrefixCoverage(listInsertDefaultBindPaths(contract));

  const props: Record<string, unknown> = {};
  const wrapperStyle: Record<string, unknown> = {};

  for (const bindPath of paths) {
    const raw = readInspectorDisplayValue(
      workBlock,
      workPayload,
      mergedBlock ?? undefined,
      bindPath,
      workTemplate
    );
    if (raw === undefined) continue;
    const literal = deepMaterializeThemeRefs(raw, tokenPresets);
    const [root, ...rest] = bindPath.split(".");
    const sub = rest.join(".");
    if (root === "props" && sub) {
      setAtPath(props, sub, literal);
    } else if (root === "wrapperStyle" && sub) {
      setAtPath(wrapperStyle, sub, literal);
    }
  }

  return { props, wrapperStyle };
}

/** 将字面量快照写回块，并清除 bindings / repeat / visibility。 */
export function applyPersistLiteralSnapshotToBlock(
  block: EmailBlock,
  snapshot: BlockPersistLiteralSnapshot
): EmailBlock {
  const next = structuredClone(block);
  next.props = structuredClone(snapshot.props) as EmailBlock["props"];
  next.wrapperStyle = structuredClone(snapshot.wrapperStyle) as EmailBlock["wrapperStyle"];
  next.bindings = {};
  delete (next as { repeat?: unknown }).repeat;
  delete (next as { visibility?: unknown }).visibility;
  return next;
}

/** 单块物化为可持久化字面量（插入默认 / 模块子树共用）。 */
export function materializeBlockForPersist(
  args: BlockPersistLiteralSnapshotArgs
): EmailBlock {
  const block = args.template.blocks[args.blockId];
  if (!block) {
    throw new Error("区块不存在，无法物化为字面量");
  }
  if (block.type === "emailRoot") {
    throw new Error("邮件根节点不支持物化为字面量快照");
  }
  const snapshot = extractBlockPersistLiteralSnapshot(args);
  return applyPersistLiteralSnapshotToBlock(block, snapshot);
}
