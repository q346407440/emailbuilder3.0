/**
 * validate ↔ autofix 配对：对「错误信息本身已蕴含唯一确定修复方案」的契约问题，
 * 在 validate 产出的 issue 行上按路径寻址直接修复落盘 JSON（template / tokenPresets）。
 *
 * 设计约束：
 * - 触发条件永远来自 validate（单一真源），本模块只回答「如何在该路径上修」，不复刻判定谓词；
 * - 仅收录确定性修复（补文档化默认值、clamp 到契约上限）；需要语义判断的问题一律不碰；
 * - 输入不被原地修改，返回深拷贝后的修复结果；幂等（同一 issue 修复后再跑无新改动）。
 *
 * 与文本层 mjsAutofix 的分工：mjs 源码里动态拼接的 block id（模板字符串）在文本层不可寻址，
 * 而 validate 的 issue 路径在 JSON 树里永远可寻址——机械修复的最终兜底在本层。
 */

import { clampSpacingPxString, EMAIL_CONTAINER_SPACING_MAX_PX } from "./spacingPxCap";
import { isChildFillBlockedByParentHug } from "./wrapperFillConstraint";
import {
  inferSemanticBlockTypeForMeta,
  normalizeRuntimeTypeAlias,
} from "../block-contract/types";
import type { EmailBlock } from "../types/email";
import {
  TOKEN_PRESET_FAMILY_ORDER,
  TOKEN_PRESET_SCALE_FALLBACKS,
  TOKEN_PRESET_SCHEMA_VERSION,
  type TokenPresetFamily,
} from "../token-preset-contract";

export type ContractIssueAutofixInput = {
  /** 落盘形态 template（schemaVersion + root 嵌套树） */
  template: unknown;
  /** 落盘形态 tokenPresets；文件不存在时传 null */
  tokenPresets: unknown;
  /** runMjsAndValidate 产出的 issue 行（`path: reason` / `tokenPresets.json/path: reason`） */
  issues: string[];
  /**
   * 标准 scale 补缺时的优先取值（如 blueprint 派生的 colors/spacing/typography）；
   * 未提供的键回退契约 TOKEN_PRESET_SCALE_FALLBACKS。
   */
  tokenFallbacks?: Partial<Record<TokenPresetFamily, Record<string, string>>>;
};

export type ContractIssueAutofixResult = {
  template: unknown;
  tokenPresets: unknown;
  /** 已应用修复的中文描述；为空表示无可机械修复项 */
  fixes: string[];
};

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 在嵌套 template 树中按 id 查找区块（含根节点）。 */
export function findBlockByIdInTemplateTree(template: unknown, id: string): AnyRecord | null {
  if (!isRecord(template)) return null;
  const root = template.root;
  if (!isRecord(root)) return null;

  const stack: AnyRecord[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.id === id) return node;
    const children = node.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        if (isRecord(child)) stack.push(child);
      }
    }
  }
  return null;
}

type FixContext = {
  template: unknown;
  tokenPresets: unknown;
  fixes: string[];
  /** 合并 blueprint 派生值后的标准 scale 取值表 */
  tokenFallbacks: Record<TokenPresetFamily, Record<string, string>>;
};

/** 合并调用方提供的优先取值与契约兜底默认值。 */
function resolveTokenFallbacks(
  provided?: Partial<Record<TokenPresetFamily, Record<string, string>>>
): Record<TokenPresetFamily, Record<string, string>> {
  const out = {} as Record<TokenPresetFamily, Record<string, string>>;
  for (const family of TOKEN_PRESET_FAMILY_ORDER) {
    out[family] = { ...TOKEN_PRESET_SCALE_FALLBACKS[family], ...(provided?.[family] ?? {}) };
  }
  return out;
}

/** 取（或建）presets.<presetId>.tokens 容器；tokenPresets 形态不可用时返回 null。 */
function resolvePresetTokens(ctx: FixContext, presetId: string): AnyRecord | null {
  if (!isRecord(ctx.tokenPresets)) return null;
  const presets = ctx.tokenPresets.presets;
  if (!isRecord(presets)) return null;
  const preset = presets[presetId];
  if (!isRecord(preset)) return null;
  if (!isRecord(preset.tokens)) preset.tokens = {};
  return preset.tokens as AnyRecord;
}

/** 单条 issue 的修复器：命中且实际修改时返回 true。 */
type IssueFixer = (issueLine: string, ctx: FixContext) => boolean;

/** 涉及背景/描边的 wrapperStyle.borderRadius 必填 → 补显式 radius=0（文档化默认）。 */
const fixMissingWrapperBorderRadius: IssueFixer = (issueLine, ctx) => {
  const m = /^blocks\.([^.]+)\.wrapperStyle\.borderRadius: 涉及背景的圆角字段必须显式写入/.exec(
    issueLine
  );
  if (!m) return false;
  const block = findBlockByIdInTemplateTree(ctx.template, m[1]!);
  if (!block) return false;
  const wrapperStyle = block.wrapperStyle;
  if (!isRecord(wrapperStyle)) return false;
  if (wrapperStyle.borderRadius != null) return false;
  wrapperStyle.borderRadius = { mode: "unified", radius: "0" };
  ctx.fixes.push(`blocks.${m[1]} 补 wrapperStyle.borderRadius（unified/0）`);
  return true;
};

/**
 * 父级 hug 同轴下子级 fill 形成循环依赖 → 子级该轴回落 hug，
 * 并对该子块的整棵子树做同规则级联（子块改 hug 后自身成为 hug 父，可能新引爆其子级同轴 fill）。
 * 回退值与编辑器协调层一致（wrapperFillConstraint FALLBACK_MODE='hug'）；
 * fill-under-hug 本为未定义语义，收缩为 hug 是契约安全修复。
 */
const fixChildFillUnderHugParent: IssueFixer = (issueLine, ctx) => {
  const m =
    /^blocks\.([^.]+)\.wrapperStyle\.(widthMode|heightMode): 父级.*不允许使用 (?:width|height) fill/.exec(
      issueLine
    );
  if (!m) return false;
  const block = findBlockByIdInTemplateTree(ctx.template, m[1]!);
  if (!block || !isRecord(block.wrapperStyle)) return false;
  const modeKey = m[2]!;
  if ((block.wrapperStyle as AnyRecord)[modeKey] !== "fill") return false;

  (block.wrapperStyle as AnyRecord)[modeKey] = "hug";
  ctx.fixes.push(`blocks.${m[1]} wrapperStyle.${modeKey} fill→hug（父 hug 循环依赖）`);
  cascadeFillUnderHug(block, ctx);
  return true;
};

/** 自上而下单遍级联：父改 hug 只向下传播，一遍 DFS 即达固定点。 */
function cascadeFillUnderHug(subtreeRoot: AnyRecord, ctx: FixContext): void {
  const stack: AnyRecord[] = [subtreeRoot];
  while (stack.length > 0) {
    const parent = stack.pop()!;
    const children = parent.children;
    if (!Array.isArray(children)) continue;
    for (const child of children) {
      if (!isRecord(child)) continue;
      const ws = child.wrapperStyle;
      if (isRecord(ws)) {
        // 谓词复用 wrapperFillConstraint 单一真源；落盘树节点与 EmailBlock 结构兼容
        const parentBlock = parent as unknown as EmailBlock;
        if (ws.widthMode === "fill" && isChildFillBlockedByParentHug(parentBlock, "width")) {
          ws.widthMode = "hug";
          ctx.fixes.push(`blocks.${child.id} wrapperStyle.widthMode fill→hug（级联）`);
        }
        if (ws.heightMode === "fill" && isChildFillBlockedByParentHug(parentBlock, "height")) {
          ws.heightMode = "hug";
          ctx.fixes.push(`blocks.${child.id} wrapperStyle.heightMode fill→hug（级联）`);
        }
      }
      stack.push(child);
    }
  }
}

/**
 * image 块 backgroundImage 写成非空字符串（应为对象）→ 机械升格为契约形态
 * （src/alt/fit/position/border/borderRadius，与底稿 coverImage/productCard 形态一致）。
 * 完全缺失时无确定 src 来源，不机械修。
 */
const fixImageBackgroundImageString: IssueFixer = (issueLine, ctx) => {
  const m = /^blocks\.([^.]+)\.wrapperStyle\.backgroundImage: 图片块必须设置 wrapperStyle\.backgroundImage/.exec(
    issueLine
  );
  if (!m) return false;
  const block = findBlockByIdInTemplateTree(ctx.template, m[1]!);
  if (!block || !isRecord(block.wrapperStyle)) return false;
  const current = (block.wrapperStyle as AnyRecord).backgroundImage;
  if (typeof current !== "string" || current.trim() === "") return false;

  (block.wrapperStyle as AnyRecord).backgroundImage = {
    src: current.trim(),
    fit: "cover",
    position: "center",
  };
  ctx.fixes.push(`blocks.${m[1]} backgroundImage 字符串升格为对象形态`);
  return true;
};

/**
 * blockMeta 缺失/不完整 → 由 type/id 确定性补全：
 * blockType 走契约推断（emailRoot 落盘约定 layout.container），name 回退 id。
 * type 不可归一为合法运行时类型时不修（避免编造语义类型），留给类型归一或 LLM。
 */
const fixMissingBlockMeta: IssueFixer = (issueLine, ctx) => {
  const m =
    /^blocks\.([^.]+)\.blockMeta(?:\.(blockType|name))?: (?:blockMeta 为必填对象|blockType 为必填字符串|name 为必填字符串)/.exec(
      issueLine
    );
  if (!m) return false;
  const block = findBlockByIdInTemplateTree(ctx.template, m[1]!);
  if (!block || typeof block.type !== "string") return false;
  const inferredBlockType = inferSemanticBlockTypeForMeta(block.type);
  if (inferredBlockType === null) return false;

  const meta: AnyRecord = isRecord(block.blockMeta) ? block.blockMeta : {};
  let changed = false;
  if (typeof meta.blockType !== "string" || !meta.blockType.trim()) {
    meta.blockType = inferredBlockType;
    changed = true;
  }
  if (typeof meta.name !== "string" || !meta.name.trim()) {
    meta.name = String(block.id ?? m[1]!);
    changed = true;
  }
  if (!isRecord(block.blockMeta)) {
    block.blockMeta = meta;
    changed = true;
  }
  if (!changed) return false;
  ctx.fixes.push(`blocks.${m[1]} 补全 blockMeta（blockType=${meta.blockType as string}）`);
  return true;
};

/** 非法运行时 type 且别名可确定归一（textBlock→text 等）→ 归一；不可归一留给语义层。 */
const fixRuntimeTypeAlias: IssueFixer = (issueLine, ctx) => {
  const m = /^blocks\.([^.]+)\.type: type 非法运行时类型「(.+?)」/.exec(issueLine);
  if (!m) return false;
  const normalized = normalizeRuntimeTypeAlias(m[2]!);
  if (normalized === null) return false;
  const block = findBlockByIdInTemplateTree(ctx.template, m[1]!);
  if (!block || block.type !== m[2]) return false;
  block.type = normalized;
  ctx.fixes.push(`blocks.${m[1]} type「${m[2]}」归一为「${normalized}」`);
  return true;
};

/** tokenPresets spacing 档位超契约上限 → clamp 到上限。 */
const fixSpacingExceedsMax: IssueFixer = (issueLine, ctx) => {
  const m =
    /^tokenPresets\.json\/tokenPresets\.presets\.([^.]+)\.tokens\.spacing\.([^.:]+): 容器间距不得超过/.exec(
      issueLine
    );
  if (!m) return false;
  if (!isRecord(ctx.tokenPresets)) return false;
  const presets = ctx.tokenPresets.presets;
  if (!isRecord(presets)) return false;
  const preset = presets[m[1]!];
  if (!isRecord(preset) || !isRecord(preset.tokens)) return false;
  const spacing = (preset.tokens as AnyRecord).spacing;
  if (!isRecord(spacing)) return false;
  const scale = m[2]!;
  const clamped = clampSpacingPxString(spacing[scale]);
  if (clamped === undefined || clamped === spacing[scale]) return false;
  spacing[scale] = clamped;
  ctx.fixes.push(
    `tokenPresets.presets.${m[1]}.tokens.spacing.${scale} clamp 到 ${EMAIL_CONTAINER_SPACING_MAX_PX}px`
  );
  return true;
};

/** text.bold / text.italic 必须为布尔值 → 缺失补 false，其余按真值规整。 */
const fixTextBooleanProp: IssueFixer = (issueLine, ctx) => {
  const m = /^blocks\.([^.]+)\.props\.(bold|italic): text\.(?:bold|italic) 必须为布尔值/.exec(
    issueLine
  );
  if (!m) return false;
  const block = findBlockByIdInTemplateTree(ctx.template, m[1]!);
  if (!block || !isRecord(block.props)) return false;
  const key = m[2]!;
  const current = (block.props as AnyRecord)[key];
  if (typeof current === "boolean") return false;
  // 缺失或非 "true" 字面量一律取 false（与文档化默认 italic:false / bold:false 一致）
  (block.props as AnyRecord)[key] = current === "true";
  ctx.fixes.push(`blocks.${m[1]} 规整 props.${key} 为布尔值`);
  return true;
};

/** text.decoration 缺失 → 补文档化默认 none（已有非法字符串保留给语义修复）。 */
const fixTextDecorationMissing: IssueFixer = (issueLine, ctx) => {
  const m = /^blocks\.([^.]+)\.props\.decoration: text\.decoration 仅允许/.exec(issueLine);
  if (!m) return false;
  const block = findBlockByIdInTemplateTree(ctx.template, m[1]!);
  if (!block || !isRecord(block.props)) return false;
  if ((block.props as AnyRecord).decoration != null) return false;
  (block.props as AnyRecord).decoration = "none";
  ctx.fixes.push(`blocks.${m[1]} 补 props.decoration=none`);
  return true;
};

/** schemaVersion 非法 → 写契约版本号。 */
const fixTokenPresetsSchemaVersion: IssueFixer = (issueLine, ctx) => {
  if (!/^tokenPresets\.json\/tokenPresets\.schemaVersion: 样式预设版本必须为/.test(issueLine)) {
    return false;
  }
  if (!isRecord(ctx.tokenPresets)) return false;
  ctx.tokenPresets.schemaVersion = TOKEN_PRESET_SCHEMA_VERSION;
  ctx.fixes.push(`tokenPresets.schemaVersion 归一为 ${TOKEN_PRESET_SCHEMA_VERSION}`);
  return true;
};

/** activePresetId 缺失或指向不存在 → 取第一套预设 id（无预设时 default，与结构打捞配合）。 */
const fixTokenPresetsActivePresetId: IssueFixer = (issueLine, ctx) => {
  if (
    !/^tokenPresets\.json\/tokenPresets\.activePresetId: (activePresetId 必须为非空字符串|activePresetId 指向的预设不存在)/.test(
      issueLine
    )
  ) {
    return false;
  }
  if (!isRecord(ctx.tokenPresets)) return false;
  const presets = ctx.tokenPresets.presets;
  const firstId = isRecord(presets) ? Object.keys(presets)[0] : undefined;
  ctx.tokenPresets.activePresetId = firstId ?? "default";
  ctx.fixes.push(`tokenPresets.activePresetId 归一为 ${ctx.tokenPresets.activePresetId}`);
  return true;
};

/** 从 LLM 自由发挥的预设对象里打捞标准 tokens（fonts.X.fontSize → typography.X），其余用兜底表。 */
function salvagePresetTokens(
  raw: AnyRecord,
  fallbacks: Record<TokenPresetFamily, Record<string, string>>
): AnyRecord {
  const tokens: AnyRecord = isRecord(raw.tokens) ? (structuredClone(raw.tokens) as AnyRecord) : {};
  for (const family of TOKEN_PRESET_FAMILY_ORDER) {
    if (!isRecord(tokens[family])) tokens[family] = { ...fallbacks[family] };
  }
  const fonts = raw.fonts;
  if (isRecord(fonts)) {
    const typography = tokens.typography as AnyRecord;
    for (const scale of Object.keys(fallbacks.typography)) {
      const font = fonts[scale];
      if (isRecord(font) && typeof font.fontSize === "string") {
        typography[scale] = font.fontSize;
      }
    }
  }
  return tokens;
}

/** presets 缺失/为数组/为空 → 打捞为 `{ <id>: { label, tokens } }` 标准结构。 */
const fixTokenPresetsShape: IssueFixer = (issueLine, ctx) => {
  if (!/^tokenPresets\.json\/tokenPresets\.presets: presets 必须至少包含一套预设/.test(issueLine)) {
    return false;
  }
  if (!isRecord(ctx.tokenPresets)) return false;
  const tp = ctx.tokenPresets;
  const rawPresets = tp.presets;

  const entries: Array<[string, AnyRecord]> = [];
  if (Array.isArray(rawPresets)) {
    rawPresets.forEach((entry, index) => {
      if (!isRecord(entry)) return;
      const id = typeof entry.id === "string" && entry.id.trim() ? entry.id : `preset-${index + 1}`;
      entries.push([id, entry]);
    });
  } else if (isRecord(rawPresets) && Object.keys(rawPresets).length > 0) {
    return false; // 形态正常却报该错不应发生，留给上层
  }
  // 数组为空 / presets 缺失：把顶层当作单套预设打捞（label/description/fonts 可能在顶层）
  if (entries.length === 0) entries.push(["default", tp]);

  const presets: AnyRecord = {};
  for (const [id, entry] of entries) {
    presets[id] = {
      label: typeof entry.label === "string" && entry.label.trim() ? entry.label : id,
      ...(typeof entry.description === "string" ? { description: entry.description } : {}),
      tokens: salvagePresetTokens(entry, ctx.tokenFallbacks),
    };
  }
  tp.presets = presets;
  if (typeof tp.activePresetId !== "string" || !presets[tp.activePresetId]) {
    tp.activePresetId = Object.keys(presets)[0]!;
  }
  tp.schemaVersion = TOKEN_PRESET_SCHEMA_VERSION;
  if (!isRecord(tp.scopeSelections)) tp.scopeSelections = {};
  // 打捞后清掉顶层游离字段（base/fonts 等自由发挥结构），只保留契约字段
  for (const key of Object.keys(tp)) {
    if (!["schemaVersion", "activePresetId", "appliedGlobalPresetId", "presets", "scopeSelections", "deletedAt"].includes(key)) {
      delete tp[key];
    }
  }
  ctx.fixes.push(`tokenPresets.presets 结构打捞为标准 ${Object.keys(presets).length} 套预设`);
  return true;
};

/** 非标准 token family（base/fonts 等）→ 删除。 */
const fixNonStandardTokenFamily: IssueFixer = (issueLine, ctx) => {
  const m =
    /^tokenPresets\.json\/tokenPresets\.presets\.([^.]+)\.tokens\.([^.:]+): 非标准 token family/.exec(
      issueLine
    );
  if (!m) return false;
  const tokens = resolvePresetTokens(ctx, m[1]!);
  if (!tokens || !(m[2]! in tokens)) return false;
  delete tokens[m[2]!];
  ctx.fixes.push(`tokenPresets.presets.${m[1]} 删除非标准 family「${m[2]}」`);
  return true;
};

/** 缺少标准 token family → 整组补兜底值。 */
const fixMissingTokenFamily: IssueFixer = (issueLine, ctx) => {
  const m =
    /^tokenPresets\.json\/tokenPresets\.presets\.([^.]+)\.tokens\.([^.:]+): 缺少标准 token family/.exec(
      issueLine
    );
  if (!m) return false;
  const family = m[2]! as TokenPresetFamily;
  if (!TOKEN_PRESET_FAMILY_ORDER.includes(family)) return false;
  const tokens = resolvePresetTokens(ctx, m[1]!);
  if (!tokens || isRecord(tokens[family])) return false;
  tokens[family] = { ...ctx.tokenFallbacks[family] };
  ctx.fixes.push(`tokenPresets.presets.${m[1]} 补标准 family「${family}」`);
  return true;
};

/** 非标准 scale（colors.brand、spacing.xs 等）→ 删除（模板树已字面量化，不引用预设键）。 */
const fixNonStandardTokenScale: IssueFixer = (issueLine, ctx) => {
  const m =
    /^tokenPresets\.json\/tokenPresets\.presets\.([^.]+)\.tokens\.([^.]+)\.([^.:]+): 非标准 scale/.exec(
      issueLine
    );
  if (!m) return false;
  const tokens = resolvePresetTokens(ctx, m[1]!);
  if (!tokens) return false;
  const scales = tokens[m[2]!];
  if (!isRecord(scales) || !(m[3]! in scales)) return false;
  delete scales[m[3]!];
  ctx.fixes.push(`tokenPresets.presets.${m[1]}.tokens.${m[2]} 删除非标准 scale「${m[3]}」`);
  return true;
};

/** 缺少标准 scale → 补兜底值（blueprint 派生优先）。 */
const fixMissingTokenScale: IssueFixer = (issueLine, ctx) => {
  const m =
    /^tokenPresets\.json\/tokenPresets\.presets\.([^.]+)\.tokens\.([^.]+)\.([^.:]+): 缺少标准 scale/.exec(
      issueLine
    );
  if (!m) return false;
  const family = m[2]! as TokenPresetFamily;
  const fallback = ctx.tokenFallbacks[family]?.[m[3]!];
  if (fallback === undefined) return false;
  const tokens = resolvePresetTokens(ctx, m[1]!);
  if (!tokens) return false;
  if (!isRecord(tokens[family])) tokens[family] = {};
  const scales = tokens[family] as AnyRecord;
  if (scales[m[3]!] !== undefined) return false;
  scales[m[3]!] = fallback;
  ctx.fixes.push(`tokenPresets.presets.${m[1]}.tokens.${family} 补标准 scale「${m[3]}」=${fallback}`);
  return true;
};

/** 配对表：新增 validate 机械规则时在此登记对应修复器。 */
const ISSUE_FIXERS: readonly IssueFixer[] = [
  fixRuntimeTypeAlias,
  fixMissingBlockMeta,
  fixMissingWrapperBorderRadius,
  fixChildFillUnderHugParent,
  fixImageBackgroundImageString,
  fixSpacingExceedsMax,
  fixTextBooleanProp,
  fixTextDecorationMissing,
  fixTokenPresetsSchemaVersion,
  fixTokenPresetsActivePresetId,
  fixTokenPresetsShape,
  fixNonStandardTokenFamily,
  fixMissingTokenFamily,
  fixNonStandardTokenScale,
  fixMissingTokenScale,
];

/** 对 validate issue 列表应用确定性修复；无法机械修复的 issue 原样保留给上层。 */
export function applyContractIssueAutofix(
  input: ContractIssueAutofixInput
): ContractIssueAutofixResult {
  const ctx: FixContext = {
    template: structuredClone(input.template),
    tokenPresets: input.tokenPresets == null ? input.tokenPresets : structuredClone(input.tokenPresets),
    fixes: [],
    tokenFallbacks: resolveTokenFallbacks(input.tokenFallbacks),
  };

  for (const issueLine of input.issues) {
    for (const fixer of ISSUE_FIXERS) {
      if (fixer(issueLine, ctx)) break;
    }
  }

  return { template: ctx.template, tokenPresets: ctx.tokenPresets, fixes: ctx.fixes };
}
