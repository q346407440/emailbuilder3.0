import {
  EMAIL_TEMPLATE_SCHEMA_VERSION,
  type EmailBlock,
  type EmailTemplate,
} from "../types/email";
import { isThemeRef } from "../types/themeRef";
import {
  isFlatBorderRadiusValue,
  isFlatBorderValue,
  isFlatSpacingValue,
  SPACING_SIDES,
  BORDER_RADIUS_CORNERS,
} from "./boxModelFlat";
import { classifyField } from "./blockFieldClassification";
import { validateTemplateBlockContracts } from "../block-contract/validate";
import {
  collectionSlotMissingItemFields,
  validateExternalInterpolateBindingSpec,
  validateExternalVariableBindingSpec,
  validatePayloadAgainstTemplate as validatePayloadAgainstTemplateContract,
  validatePayloadAgainstTemplateUnion as validatePayloadAgainstTemplateUnionContract,
} from "../payload-contract/validate";
import { findObjectFieldByPath } from "../payload-contract/object-fields";
import {
  COLLECTION_ITEM_FIELDS_NESTING_ERROR,
  isItemPathWithinCollectionListLevelMax,
} from "../payload-contract/collection-item-fields";
import {
  collectionBindingUsesItemIndex,
  resolveEffectiveBindingSlotValueType,
} from "../payload-contract/repeat-list-item-binding";
import { validateVariableBindingFieldCompatibility } from "../payload-contract/variable-slot-compatibility";
import { validateForbiddenBackgroundImageAlt } from "../render-defaults-contract/forbiddenBackgroundImageAlt";
import { validateForbiddenBackgroundImageChrome } from "../render-defaults-contract/forbiddenBackgroundImageChrome";
import {
  backgroundImageFitUsesPosition,
  validateForbiddenBackgroundImagePositionWhenContain,
} from "../render-defaults-contract/backgroundImageFitSemantics";
import { validateForbiddenLegacyProps } from "../render-defaults-contract/forbiddenLegacyProps";
import { validateRenderDefaultsForbiddenFields } from "../render-defaults-contract/validate";
import { EMAIL_ROOT_FIXED_WIDTH, emailRootWidthMismatchReason } from "../render-defaults-contract/values";
import { layoutBackgroundImageRenderable } from "./wrapperBackgroundImage";
import { getFillValidationReason, getButtonBodyFillValidationReason, isButtonBodyFillBlockedByWrapperHug, isChildFillBlockedByParentHug } from "./wrapperFillConstraint";
import { extractInterpolationSlotIds } from "./interpolateText";
import { getAtPath } from "./paths";
import { isRepeatHostBlock } from "./repeatHostBlock";
import { resolveRepeatContextForRef } from "../repeat-runtime/repeatVirtualResolver";
import { validateVisibilityRule } from "../visibility-contract";
import {
  findEnclosingRepeatHostBinding,
  resolveRepeatFieldMappingSourceMeta,
} from "./repeatNestedFieldMapping";
import { collectContentAlignEffectivenessIssues } from "./contentAlignConfigurability";

export type ValidationIssue = {
  path: string;
  reason: string;
  /** 默认 error；warning 不参与 run-validate-all 失败计数（待全量迁移后改为 error） */
  level?: "error" | "warning";
  /**
   * live（默认）：编辑中即展示于校验面板与字段提示；
   * save：仅保存 / API / validate:all 生效，编辑中不打扰用户补全配置。
   */
  phase?: "live" | "save";
};

/** 编辑器实时展示用：过滤掉保存时才提示的项 */
export function validationIssuesForEditorDisplay(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => issue.phase !== "save");
}

/** 与 run-validate-all / 落盘 API 一致：仅 level=warning 的不阻断读写 */
export function isBlockingValidationIssue(issue: ValidationIssue): boolean {
  return issue.level !== "warning";
}

export function blockingValidationIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter(isBlockingValidationIssue);
}

function validateSpacingValue(path: string, raw: unknown, issues: ValidationIssue[]): void {
  if (isThemeRef(raw)) return;
  if (typeof raw !== "string") {
    issues.push({ path, reason: "边距值必须为字符串（如 0、8px）" });
    return;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    issues.push({ path, reason: "边距值不允许为空字符串，请至少使用 0" });
    return;
  }
  if (/\s/.test(trimmed)) {
    issues.push({
      path,
      reason:
        "边距值须为单边长度（如 8px、0），禁止使用 CSS 多值简写",
    });
  }
}

function validateSpacingObject(
  path: string,
  spacing: unknown,
  issues: ValidationIssue[]
): void {
  if (!spacing || typeof spacing !== "object") return;
  if (isFlatSpacingValue(spacing)) {
    for (const side of SPACING_SIDES) {
      validateSpacingValue(`${path}.${side}`, (spacing as Record<string, unknown>)[side], issues);
    }
    return;
  }
  issues.push({
    path,
    reason:
      "间距对象须为四边平铺（top/right/bottom/left）；禁止 mode: unified/separate",
  });
}

function validateContentAlignHorizontalRequired(
  path: string,
  raw: unknown,
  issues: ValidationIssue[]
): void {
  if (raw !== "left" && raw !== "center" && raw !== "right") {
    issues.push({
      path,
      reason: "内容水平对齐为必填，且仅允许 left / center / right",
    });
  }
}

function validateContentAlignVerticalRequired(
  path: string,
  raw: unknown,
  issues: ValidationIssue[]
): void {
  if (raw !== "top" && raw !== "center" && raw !== "bottom") {
    issues.push({
      path,
      reason: "内容垂直对齐为必填，且仅允许 top / center / bottom",
    });
  }
}

function validateWrapperDimensionSemantics(
  path: string,
  ws: Record<string, unknown> | undefined,
  issues: ValidationIssue[]
): void {
  if (!ws) return;
  if (ws.widthMode === "fitContent" || ws.heightMode === "fitContent") {
    issues.push({
      path,
      reason: "widthMode / heightMode 不再支持 fitContent，请改为 hug",
    });
  }
  const wm = ws.widthMode;
  const hm = ws.heightMode;
  if (wm !== "hug" && wm !== "fill" && wm !== "fixed") {
    issues.push({
      path: `${path}.widthMode`,
      reason: "必填，仅允许 hug / fill / fixed",
    });
  }
  if (hm !== "hug" && hm !== "fill" && hm !== "fixed") {
    issues.push({
      path: `${path}.heightMode`,
      reason: "必填，仅允许 hug / fill / fixed",
    });
  }
  if (wm === "fixed") {
    validateRequiredString(`${path}.width`, ws.width, issues);
  }
  if (hm === "fixed") {
    validateRequiredString(`${path}.height`, ws.height, issues);
  }
}

function validateRequiredString(path: string, raw: unknown, issues: ValidationIssue[]): string | null {
  if (isThemeRef(raw)) return null;
  if (typeof raw !== "string" || raw.trim() === "") {
    issues.push({ path, reason: "必须为非空字符串" });
    return null;
  }
  return raw;
}

function validateOverlayStackProps(
  blockTypeLabel: "layout" | "image",
  blockPath: string,
  props: Record<string, unknown>,
  issues: ValidationIssue[]
) {
  const direction = props.direction;
  if (
    direction !== undefined &&
    direction !== "vertical" &&
    direction !== "horizontal"
  ) {
    issues.push({
      path: `${blockPath}.props.direction`,
      reason: `${blockTypeLabel}.direction 仅允许 vertical（纵向）或 horizontal（横向）`,
    });
  }

  const gapMode = props.gapMode;
  if (
    gapMode !== undefined &&
    gapMode !== "fixed" &&
    gapMode !== "auto"
  ) {
    issues.push({
      path: `${blockPath}.props.gapMode`,
      reason: `${blockTypeLabel}.gapMode 仅允许 fixed（固定像素间距）或 auto（主轴剩余空间在子项之间均分）`,
    });
  }

  if (props.gap !== undefined) {
    const gap = props.gap;
    if (!isThemeRef(gap) && (typeof gap !== "string" || gap.trim() === "")) {
      issues.push({
        path: `${blockPath}.props.gap`,
        reason: `${blockTypeLabel}.gap 必须为非空字符串或主题引用`,
      });
    }
  }
}

function validateOptionalWrapperBackgroundImage(
  blockTypeLabel: "emailRoot" | "layout" | "grid",
  path: string,
  wsBg: Record<string, unknown> | undefined,
  issues: ValidationIssue[]
): void {
  if (wsBg === undefined || wsBg === null) return;
  if (typeof wsBg !== "object" || Array.isArray(wsBg)) {
    issues.push({
      path,
      reason: `${blockTypeLabel} 背景图必须为对象`,
    });
    return;
  }

  const hasSrc = typeof wsBg.src === "string" && wsBg.src.trim() !== "";
  if (!hasSrc) {
    issues.push({
      path: `${path}.src`,
      reason: `${blockTypeLabel} 背景图若配置则 src 必须为非空字符串`,
      phase: "save",
    });
  }

  const fit = wsBg.fit;
  if (fit !== undefined && fit !== "cover" && fit !== "contain") {
    issues.push({
      path: `${path}.fit`,
      reason: `${blockTypeLabel} 背景图 fit 仅允许 cover / contain`,
    });
  }
}

function validateBodyDimensionMode(
  path: string,
  mode: unknown,
  size: unknown,
  issues: ValidationIssue[],
  options: { allowHug?: boolean; label: string; axis: "宽度" | "高度" }
) {
  const allowedModes = options.allowHug ? ["hug", "fill", "fixed"] : ["fill", "fixed"];
  if (mode !== undefined && !allowedModes.includes(String(mode))) {
    issues.push({
      path: `${path}Mode`,
      reason: `${options.label}${options.axis}模式仅允许 ${allowedModes.join(" / ")}`,
    });
  }
  if (mode === "fixed") {
    validateRequiredString(path, size, issues);
  } else if (size !== undefined && !isThemeRef(size) && (typeof size !== "string" || size.trim() === "")) {
    issues.push({
      path,
      reason: `${options.label}${options.axis}必须为非空字符串或主题引用`,
    });
  }
}

function validateBodyWidthMode(
  path: string,
  mode: unknown,
  width: unknown,
  issues: ValidationIssue[],
  options: { allowHug?: boolean; label: string }
) {
  validateBodyDimensionMode(path, mode, width, issues, { ...options, axis: "宽度" });
}

function validateBodyHeightMode(
  path: string,
  mode: unknown,
  height: unknown,
  issues: ValidationIssue[],
  options: { allowHug?: boolean; label: string }
) {
  validateBodyDimensionMode(path, mode, height, issues, { ...options, axis: "高度" });
}

function validateBorderStyleField(path: string, raw: unknown, issues: ValidationIssue[]): void {
  if (raw !== "solid" && raw !== "dashed" && raw !== "dotted") {
    issues.push({ path, reason: "描边样式仅允许 solid / dashed / dotted" });
  }
}

function validateBorderConfig(
  path: string,
  raw: unknown,
  issues: ValidationIssue[],
  options: { required?: boolean } = {}
): void {
  const required = options.required === true;
  if (raw === undefined || raw === null) {
    if (required) {
      issues.push({
        path,
        reason: "涉及背景时必须配置描边（四边宽 0 + style + color 也需显式写出）",
      });
    }
    return;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    issues.push({
      path,
      reason:
        "描边须为四边平铺（top/right/bottom/left 宽 + style + color）；禁止 mode: unified/custom",
    });
    return;
  }
  if (isFlatBorderValue(raw)) {
    validateBorderStyleField(`${path}.style`, (raw as Record<string, unknown>).style, issues);
    validateRequiredString(`${path}.color`, (raw as Record<string, unknown>).color, issues);
    for (const side of SPACING_SIDES) {
      validateRequiredString(`${path}.${side}`, (raw as Record<string, unknown>)[side], issues);
    }
    return;
  }
  issues.push({
    path,
    reason:
      "描边须为四边平铺（top/right/bottom/left 宽 + style + color）；禁止 mode: unified/custom",
  });
}

function validateBorderRadiusConfig(
  path: string,
  raw: unknown,
  issues: ValidationIssue[],
  options: { required?: boolean } = {}
): void {
  const required = options.required === true;
  if (raw === undefined || raw === null) {
    if (required) {
      issues.push({
        path,
        reason: "涉及背景的圆角字段必须显式写入（四角 0 也要显式）",
      });
    }
    return;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    issues.push({
      path,
      reason: "圆角须为四角平铺（topLeft/topRight/bottomRight/bottomLeft）",
    });
    return;
  }
  if (isFlatBorderRadiusValue(raw)) {
    for (const corner of BORDER_RADIUS_CORNERS) {
      validateRequiredString(`${path}.${corner}`, (raw as Record<string, unknown>)[corner], issues);
    }
    return;
  }
  issues.push({
    path,
    reason:
      "圆角须为四角平铺（topLeft/topRight/bottomRight/bottomLeft）；禁止 mode: unified/corners",
  });
}

const TEXT_DECO_SET = new Set([
  "none",
  "underline",
  "line-through",
  "overline",
]);

function validateTextBodyStructure(
  path: string,
  raw: unknown,
  issues: ValidationIssue[]
): void {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    issues.push({ path, reason: "textBody 必须为对象" });
    return;
  }
  const o = raw as Record<string, unknown>;
  if ("version" in o) {
    issues.push({
      path: `${path}.version`,
      reason: "禁止 props.textBody.version；正文形态由 template.schemaVersion 与迁移脚本统一管理",
    });
  }
  if (!Array.isArray(o.paragraphs)) {
    issues.push({ path: `${path}.paragraphs`, reason: "textBody.paragraphs 必须为数组" });
    return;
  }
  o.paragraphs.forEach((para, pi) => {
    const pPath = `${path}.paragraphs[${pi}]`;
    if (para === null || typeof para !== "object" || Array.isArray(para)) {
      issues.push({ path: pPath, reason: "段落必须为对象" });
      return;
    }
    const pr = para as Record<string, unknown>;
    if (!Array.isArray(pr.runs)) {
      issues.push({ path: `${pPath}.runs`, reason: "每段必须包含 runs 数组" });
      return;
    }
    pr.runs.forEach((run, ri) => {
      const rPath = `${pPath}.runs[${ri}]`;
      if (run === null || typeof run !== "object" || Array.isArray(run)) {
        issues.push({ path: rPath, reason: "每个 run 必须为对象" });
        return;
      }
      const r = run as Record<string, unknown>;
      if (typeof r.text !== "string") {
        issues.push({ path: `${rPath}.text`, reason: "run.text 必须为字符串" });
      }
      if (r.bold !== undefined && typeof r.bold !== "boolean") {
        issues.push({ path: `${rPath}.bold`, reason: "run.bold 必须为布尔值或省略" });
      }
      if (r.italic !== undefined && typeof r.italic !== "boolean") {
        issues.push({ path: `${rPath}.italic`, reason: "run.italic 必须为布尔值或省略" });
      }
      if (r.decoration !== undefined && !TEXT_DECO_SET.has(r.decoration as string)) {
        issues.push({
          path: `${rPath}.decoration`,
          reason: "run.decoration 仅允许 none / underline / line-through / overline 或省略",
        });
      }
      if (r.link !== undefined && typeof r.link !== "string") {
        issues.push({ path: `${rPath}.link`, reason: "run.link 必须为字符串或省略" });
      }
      if (typeof r.link === "string" && /^\s*javascript:/i.test(r.link)) {
        issues.push({ path: `${rPath}.link`, reason: "不允许 javascript: 链接" });
      }
      if (r.color !== undefined) {
        if (typeof r.color !== "string" || !r.color.trim()) {
          issues.push({ path: `${rPath}.color`, reason: "run.color 必须为非空字符串或省略" });
        } else if (String(r.color).includes("$themeRef")) {
          issues.push({
            path: `${rPath}.color`,
            reason: "run.color 仅允许字面量颜色，不可使用 $themeRef（段内字色不可绑样式变量）",
          });
        }
      }
      if (r.fontSize !== undefined) {
        if (typeof r.fontSize !== "string" || !r.fontSize.trim()) {
          issues.push({ path: `${rPath}.fontSize`, reason: "run.fontSize 必须为非空字符串或省略" });
        } else if (String(r.fontSize).includes("$themeRef")) {
          issues.push({
            path: `${rPath}.fontSize`,
            reason: "run.fontSize 仅允许字面量字号，不可使用 $themeRef（段内字号不可绑样式变量）",
          });
        } else if (!/^\d+(\.\d+)?(px|em|rem|%)$/.test(String(r.fontSize).trim())) {
          issues.push({
            path: `${rPath}.fontSize`,
            reason: "run.fontSize 须为长度值（如 14px、1.2em）",
          });
        }
      }
    });
  });
}

export function validateTemplateStructure(t: EmailTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (t.schemaVersion !== EMAIL_TEMPLATE_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      reason: `template.schemaVersion 必须为 ${EMAIL_TEMPLATE_SCHEMA_VERSION}`,
    });
  }
  if (!t.rootBlockId) issues.push({ path: "rootBlockId", reason: "缺失" });
  const root = t.blocks[t.rootBlockId];
  if (!root) {
    issues.push({ path: "rootBlockId", reason: "指向不存在的区块" });
    return issues;
  }
  if (root.type !== "emailRoot") {
    issues.push({
      path: `blocks.${root.id}.type`,
      reason: "根节点类型必须为 emailRoot（邮件根节点）",
    });
  }
  if (root.type === "emailRoot") {
    const rawWidth = root.props.width;
    const width = typeof rawWidth === "string" ? rawWidth.trim() : rawWidth;
    if (width !== EMAIL_ROOT_FIXED_WIDTH) {
      issues.push({
        path: `blocks.${root.id}.props.width`,
        reason: emailRootWidthMismatchReason(rawWidth),
      });
    }
    validateRequiredString(`blocks.${root.id}.props.backgroundColor`, root.props.backgroundColor, issues);
    if (
      root.props.padding === undefined ||
      root.props.padding === null ||
      typeof root.props.padding !== "object" ||
      Array.isArray(root.props.padding)
    ) {
      issues.push({
        path: `blocks.${root.id}.props.padding`,
        reason: "画布根节点必须显式配置 padding（禁止依赖系统默认）",
      });
    } else {
      validateSpacingObject(`blocks.${root.id}.props.padding`, root.props.padding, issues);
    }
    validateBorderConfig(`blocks.${root.id}.props.border`, root.props.border, issues, {
      required: true,
    });
    const rootGapMode = root.props.gapMode;
    if (
      rootGapMode !== undefined &&
      rootGapMode !== "fixed" &&
      rootGapMode !== "auto"
    ) {
      issues.push({
        path: `blocks.${root.id}.props.gapMode`,
        reason: "画布根节点 gapMode 仅允许 fixed 或 auto",
      });
    }
    if (root.props.gap !== undefined) {
      if (
        !isThemeRef(root.props.gap) &&
        (typeof root.props.gap !== "string" || root.props.gap.trim() === "")
      ) {
        issues.push({
          path: `blocks.${root.id}.props.gap`,
          reason: "画布根节点 gap 必须为非空字符串（至少为 0）",
        });
      }
    }
    validateOptionalWrapperBackgroundImage(
      "emailRoot",
      `blocks.${root.id}.wrapperStyle.backgroundImage`,
      root.wrapperStyle?.backgroundImage as Record<string, unknown> | undefined,
      issues
    );
  }

  const seen = new Set<string>();
  function walk(id: string, parentId: string | null): void {
    if (seen.has(id)) {
      issues.push({ path: `blocks.${id}`, reason: "检测到环或重复访问" });
      return;
    }
    seen.add(id);
    const b = t.blocks[id];
    if (!b) {
      issues.push({ path: `children.${id}`, reason: "子节点 id 在区块表中不存在" });
      return;
    }
    if (b.parentId !== parentId) {
      issues.push({
        path: `blocks.${id}.parentId`,
        reason: `父节点 id（parentId）与树结构不一致，期望为 ${parentId ?? "null（无）"}`,
      });
    }
    for (const c of b.children) walk(c, b.id);
  }
  walk(t.rootBlockId, null);

  for (const id of Object.keys(t.blocks)) {
    if (!seen.has(id)) {
      issues.push({ path: `blocks.${id}`, reason: "悬空区块（无法从根节点到达）" });
    }
  }

  for (const [id, block] of Object.entries(t.blocks)) {
    const parent = block.parentId ? t.blocks[block.parentId] : undefined;
    const widthFillBlocked = isChildFillBlockedByParentHug(parent, "width");
    const heightFillBlocked = isChildFillBlockedByParentHug(parent, "height");
    if (widthFillBlocked && block.wrapperStyle?.widthMode === "fill") {
      issues.push({
        path: `blocks.${id}.wrapperStyle.widthMode`,
        reason: getFillValidationReason("width"),
      });
    }
    if (heightFillBlocked && block.wrapperStyle?.heightMode === "fill") {
      issues.push({
        path: `blocks.${id}.wrapperStyle.heightMode`,
        reason: getFillValidationReason("height"),
      });
    }

    const wsRaw = block.wrapperStyle;
    if (
      wsRaw === undefined ||
      wsRaw === null ||
      typeof wsRaw !== "object" ||
      Array.isArray(wsRaw)
    ) {
      issues.push({
        path: `blocks.${id}.wrapperStyle`,
        reason: "每个区块必须包含 wrapperStyle 对象（不可省略）",
      });
    }

    validateSpacingObject(`blocks.${id}.wrapperStyle.padding`, block.wrapperStyle?.padding, issues);
    validateWrapperDimensionSemantics(
      `blocks.${id}.wrapperStyle`,
      block.wrapperStyle as Record<string, unknown> | undefined,
      issues
    );
    const hasWrapperBackground =
      isThemeRef(block.wrapperStyle?.backgroundColor) ||
      (typeof block.wrapperStyle?.backgroundColor === "string" &&
        block.wrapperStyle.backgroundColor.trim() !== "");

    validateBorderConfig(`blocks.${id}.wrapperStyle.border`, block.wrapperStyle?.border, issues, {
      required: hasWrapperBackground,
    });
    /** 背景相关圆角覆盖范围（root 排除）：layout/grid 的 wrapperStyle.borderRadius；
     *  text 块仅在带背景色时要求圆角。其余（image/button/overlay）由各自块内分支检查。 */
    if (block.type === "layout" || block.type === "grid" || block.type === "image") {
      validateBorderRadiusConfig(
        `blocks.${id}.wrapperStyle.borderRadius`,
        block.wrapperStyle?.borderRadius,
        issues,
        { required: true }
      );
    } else if (block.type === "text" && hasWrapperBackground) {
      validateBorderRadiusConfig(
        `blocks.${id}.wrapperStyle.borderRadius`,
        block.wrapperStyle?.borderRadius,
        issues,
        { required: true }
      );
    } else if (block.wrapperStyle?.borderRadius !== undefined) {
      validateBorderRadiusConfig(
        `blocks.${id}.wrapperStyle.borderRadius`,
        block.wrapperStyle.borderRadius,
        issues
      );
    }

    if (block.type === "image") {
      const props = block.props as Record<string, unknown>;
      validateOverlayStackProps("image", `blocks.${id}`, props, issues);
      const wsBg = block.wrapperStyle?.backgroundImage as Record<string, unknown> | undefined;
      const hasSrc = typeof wsBg?.src === "string" && wsBg.src.trim() !== "";
      if (!wsBg || typeof wsBg !== "object") {
        issues.push({
          path: `blocks.${id}.wrapperStyle.backgroundImage`,
          reason: "图片块必须设置 wrapperStyle.backgroundImage",
        });
      } else if (!hasSrc) {
        issues.push({
          path: `blocks.${id}.wrapperStyle.backgroundImage.src`,
          reason: "图片地址 src 必须为非空字符串",
        });
      } else {
        const fit = wsBg.fit;
        if (fit !== undefined && fit !== "cover" && fit !== "contain") {
          issues.push({
            path: `blocks.${id}.wrapperStyle.backgroundImage.fit`,
            reason: "仅允许 cover / contain",
          });
        }
        if (backgroundImageFitUsesPosition(fit)) {
          validateRequiredString(
            `blocks.${id}.wrapperStyle.backgroundImage.position`,
            wsBg.position,
            issues
          );
        }
      }
    }

    if (block.type === "icon") {
      const props = block.props as Record<string, unknown>;
      if (props.src !== undefined && props.src !== null && typeof props.src !== "string") {
        issues.push({
          path: `blocks.${id}.props.src`,
          reason: "图标地址 src 必须为字符串",
        });
      }
      validateRequiredString(`blocks.${id}.props.color`, props.color, issues);
      validateRequiredString(`blocks.${id}.props.size`, props.size, issues);
    }

    if (block.type === "layout") {
      const wsBg = block.wrapperStyle?.backgroundImage as Record<string, unknown> | undefined;
      validateOptionalWrapperBackgroundImage(
        "layout",
        `blocks.${id}.wrapperStyle.backgroundImage`,
        wsBg,
        issues
      );

      const lp = block.props as Record<string, unknown>;
      validateOverlayStackProps("layout", `blocks.${id}`, lp, issues);
    }

    if (block.type === "grid") {
      const wsBg = block.wrapperStyle?.backgroundImage as Record<string, unknown> | undefined;
      validateOptionalWrapperBackgroundImage(
        "grid",
        `blocks.${id}.wrapperStyle.backgroundImage`,
        wsBg,
        issues
      );

      const gp = block.props as Record<string, unknown>;
      const cellWidthMode = gp.cellWidthMode;
      if (
        cellWidthMode !== undefined &&
        cellWidthMode !== "auto" &&
        cellWidthMode !== "fixed"
      ) {
        issues.push({
          path: `blocks.${id}.props.cellWidthMode`,
          reason: "grid.cellWidthMode 仅允许 auto 或 fixed",
        });
      }
      if (cellWidthMode === "fixed") {
        const cellWidth =
          typeof gp.cellWidth === "string" && gp.cellWidth.trim() ? gp.cellWidth.trim() : "";
        if (!cellWidth) {
          issues.push({
            path: `blocks.${id}.props.cellWidth`,
            reason: "grid.cellWidthMode=fixed 时，必须填写 cellWidth",
          });
        }
      }
      const cellHeightMode = gp.cellHeightMode;
      if (
        cellHeightMode !== undefined &&
        cellHeightMode !== "content-max" &&
        cellHeightMode !== "fixed"
      ) {
        issues.push({
          path: `blocks.${id}.props.cellHeightMode`,
          reason: "grid.cellHeightMode 仅允许 content-max 或 fixed",
        });
      }
      if (cellHeightMode === "fixed") {
        const cellHeight =
          typeof gp.cellHeight === "string" && gp.cellHeight.trim() ? gp.cellHeight.trim() : "";
        if (!cellHeight) {
          issues.push({
            path: `blocks.${id}.props.cellHeight`,
            reason: "grid.cellHeightMode=fixed 时，必须填写 cellHeight",
          });
        }
      }
      for (const childId of block.children) {
        const child = t.blocks[childId];
        if (!child || child.type !== "layout") continue;
        if (child.wrapperStyle?.heightMode === "fixed") {
          /** 容器背景图常用固定裁切高度（原 overlay 画布），与栅格等高策略例外并存 */
          if (layoutBackgroundImageRenderable(child)) continue;
          issues.push({
            path: `blocks.${childId}.wrapperStyle.heightMode`,
            reason:
              "该 layout 位于 grid 内，建议改为 hug 以启用栅格统一自适应等高；固定高度仅在明确需要裁切时使用",
            // 劝告式规则与阻断级别曾经矛盾：是否需要裁切属语义判断，降为 warning 不卡流程
            level: "warning",
          });
        }
      }
    }

    if (block.type === "progress") {
      if (block.children.length > 0) {
        issues.push({
          path: `blocks.${id}.children`,
          reason: "indicator.progress 为叶子区块，children 必须为空数组",
        });
      }
      const pp = block.props as Record<string, unknown>;
      validateBodyWidthMode(
        `blocks.${id}.props.barWidth`,
        pp.barWidthMode,
        pp.barWidth,
        issues,
        { label: "progress 条带" }
      );
      if (pp.value !== undefined && (typeof pp.value !== "number" || !Number.isFinite(pp.value))) {
        issues.push({
          path: `blocks.${id}.props.value`,
          reason: "progress.props.value 须为有限数值或未设置",
        });
      }
      if (pp.max !== undefined) {
        if (typeof pp.max !== "number" || !Number.isFinite(pp.max) || pp.max <= 0) {
          issues.push({
            path: `blocks.${id}.props.max`,
            reason: "progress.props.max 须为有限正数或未设置",
          });
        }
      }
      if (pp.barHeight !== undefined) {
        if (typeof pp.barHeight !== "string" || !pp.barHeight.trim()) {
          issues.push({
            path: `blocks.${id}.props.barHeight`,
            reason: "progress.props.barHeight 须为非空字符串或未设置（与分割线线条粗细语义一致）",
          });
        }
      }
      validateBorderRadiusConfig(`blocks.${id}.props.barBorderRadius`, pp.barBorderRadius, issues, {
        required: false,
      });
    }

    if (block.type === "divider") {
      const dp = block.props as Record<string, unknown>;
      validateBodyWidthMode(
        `blocks.${id}.props.lineWidth`,
        dp.lineWidthMode,
        dp.lineWidth,
        issues,
        { label: "divider 线条" }
      );
      validateRequiredString(`blocks.${id}.props.height`, dp.height, issues);
    }

    if (block.type === "button") {
      const bp = block.props as Record<string, unknown>;
      const buttonStyle =
        bp.buttonStyle && typeof bp.buttonStyle === "object"
          ? (bp.buttonStyle as Record<string, unknown>)
          : undefined;
      const hasButtonBackground =
        isThemeRef(buttonStyle?.backgroundColor) ||
        (typeof buttonStyle?.backgroundColor === "string" &&
          buttonStyle.backgroundColor.trim() !== "");
      validateBodyWidthMode(
        `blocks.${id}.props.buttonStyle.width`,
        buttonStyle?.widthMode,
        buttonStyle?.width,
        issues,
        { allowHug: true, label: "button 按钮本体" }
      );
      validateBodyHeightMode(
        `blocks.${id}.props.buttonStyle.height`,
        buttonStyle?.heightMode,
        buttonStyle?.height,
        issues,
        { allowHug: true, label: "button 按钮本体" }
      );
      if (isButtonBodyFillBlockedByWrapperHug(block, "width") && buttonStyle?.widthMode === "fill") {
        issues.push({
          path: `blocks.${id}.props.buttonStyle.widthMode`,
          reason: getButtonBodyFillValidationReason("width"),
        });
      }
      if (isButtonBodyFillBlockedByWrapperHug(block, "height") && buttonStyle?.heightMode === "fill") {
        issues.push({
          path: `blocks.${id}.props.buttonStyle.heightMode`,
          reason: getButtonBodyFillValidationReason("height"),
        });
      }
      if (buttonStyle?.bold !== undefined && typeof buttonStyle.bold !== "boolean") {
        issues.push({
          path: `blocks.${id}.props.buttonStyle.bold`,
          reason: "按钮文字加粗必须为布尔值（true/false）",
        });
      }
      if (buttonStyle?.italic !== undefined && typeof buttonStyle.italic !== "boolean") {
        issues.push({
          path: `blocks.${id}.props.buttonStyle.italic`,
          reason: "按钮文字斜体必须为布尔值（true/false）",
        });
      }
      validateBorderConfig(`blocks.${id}.props.buttonStyle.border`, buttonStyle?.border, issues, {
        required: hasButtonBackground,
      });
      validateBorderRadiusConfig(
        `blocks.${id}.props.buttonStyle.borderRadius`,
        buttonStyle?.borderRadius,
        issues,
        { required: true }
      );
    }

    if (block.type === "emailRoot") continue;
    const contentAlign = block.wrapperStyle?.contentAlign;
    if (
      contentAlign === undefined ||
      contentAlign === null ||
      typeof contentAlign !== "object" ||
      Array.isArray(contentAlign)
    ) {
      issues.push({
        path: `blocks.${id}.wrapperStyle.contentAlign`,
        reason: `${block.type} 区块必须显式配置 contentAlign（包含 horizontal / vertical）`,
      });
    } else {
      const ca = contentAlign as Record<string, unknown>;
      validateContentAlignHorizontalRequired(
        `blocks.${id}.wrapperStyle.contentAlign.horizontal`,
        ca.horizontal,
        issues
      );
      validateContentAlignVerticalRequired(
        `blocks.${id}.wrapperStyle.contentAlign.vertical`,
        ca.vertical,
        issues
      );
      for (const issue of collectContentAlignEffectivenessIssues(id, t, block)) {
        issues.push(issue);
      }
    }

    if (block.type !== "text") continue;
    const tb = (block.props as { textBody?: unknown }).textBody;
    if (tb === undefined || tb === null || typeof tb !== "object" || Array.isArray(tb)) {
      issues.push({
        path: `blocks.${id}.props.textBody`,
        reason: "text 区块必须使用结构化正文（props.textBody.paragraphs）",
      });
    } else {
      validateTextBodyStructure(`blocks.${id}.props.textBody`, tb, issues);
    }
    if (typeof block.props?.bold !== "boolean") {
      issues.push({
        path: `blocks.${id}.props.bold`,
        reason: "text.bold 必须为布尔值（true/false）",
      });
    }
    if (typeof block.props?.italic !== "boolean") {
      issues.push({
        path: `blocks.${id}.props.italic`,
        reason: "text.italic 必须为布尔值（true/false）",
      });
    }
    const decoration = block.props?.decoration;
    if (
      decoration !== "none" &&
      decoration !== "underline" &&
      decoration !== "line-through" &&
      decoration !== "overline"
    ) {
      issues.push({
        path: `blocks.${id}.props.decoration`,
        reason:
          "text.decoration 仅允许 none / underline / line-through / overline",
      });
    }
  }

  return issues;
}

/**
 * 来源胶囊体系核心约束（Phase 0.4）：
 * - mode=theme    → fieldKind 必须为 style
 * - mode=variable → fieldKind 必须为 content
 * - mode=interpolate → fieldKind 必须为 content
 * - structural 字段不允许出现任何 binding（仅字面量）
 */
function validateBindingFieldKind(
  blockType: string,
  blockId: string,
  bindPath: string,
  spec: { mode?: string; fieldKind?: string },
  issues: ValidationIssue[]
): void {
  const path = `blocks.${blockId}.bindings.${bindPath}`;
  const declared = spec.fieldKind;
  const inferred = classifyField(blockType, bindPath);
  if (declared && declared !== inferred) {
    issues.push({
      path: `${path}.fieldKind`,
      reason: `字段分类不一致：声明「${declared}」但实际推断为「${inferred}」`,
    });
  }
  const effective = inferred;
  if (spec.mode === "theme" && effective !== "style") {
    issues.push({
      path,
      reason: `主题绑定仅允许出现在样式（style）字段；当前字段被分类为「${effective}」`,
    });
  }
  if ((spec.mode === "variable" || spec.mode === "interpolate") && effective !== "content") {
    issues.push({
      path,
      reason: `变量/内插绑定仅允许出现在内容（content）字段；当前字段被分类为「${effective}」`,
    });
  }
  if (effective === "structural" && spec.mode && spec.mode !== "literal") {
    issues.push({
      path,
      reason: `结构性（structural）字段不允许任何来源绑定，仅能使用字面量`,
    });
  }
}

/**
 * 守卫：字段值若包含 $themeRef，必须在 block.bindings 同一 path 上登记 mode: "theme"。
 * 用于 Phase 0.2 双写过渡期的兜底，保证 UI 胶囊与字段值不漂移。
 */
function validateThemeRefBindingConsistency(t: EmailTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [blockId, block] of Object.entries(t.blocks)) {
    walkValue(
      `blocks.${blockId}.props`,
      "props",
      "",
      block.props as Record<string, unknown> | undefined,
      block,
      issues
    );
    walkValue(
      `blocks.${blockId}.wrapperStyle`,
      "wrapperStyle",
      "",
      block.wrapperStyle as Record<string, unknown> | undefined,
      block,
      issues
    );
  }
  return issues;
}

function walkValue(
  jsonPath: string,
  rootKey: "props" | "wrapperStyle",
  parentBindPath: string,
  value: unknown,
  block: EmailBlock,
  issues: ValidationIssue[]
): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((child, idx) => {
      walkValue(`${jsonPath}[${idx}]`, rootKey, parentBindPath, child, block, issues);
    });
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const subPath = parentBindPath ? `${parentBindPath}.${key}` : key;
    const childPath = `${jsonPath}.${key}`;
    const fullBindPath = `${rootKey}.${subPath}`;
    if (isThemeRef(child)) {
      const spec = block.bindings?.[fullBindPath];
      if (!spec || spec.mode !== "theme") {
        issues.push({
          path: childPath,
          reason: `字段值含 $themeRef 但 block.bindings.${fullBindPath} 未登记 mode:"theme"（来源胶囊体系约束）`,
        });
      }
      continue;
    }
    if (child && typeof child === "object") {
      walkValue(childPath, rootKey, subPath, child, block, issues);
    }
  }
}

function collectDescendantBlockIds(t: EmailTemplate, rootIds: string[]): Set<string> {
  const ids = new Set<string>();
  const visit = (blockId: string) => {
    if (ids.has(blockId)) return;
    const block = t.blocks[blockId];
    if (!block) return;
    ids.add(blockId);
    for (const childId of block.children) visit(childId);
  };
  rootIds.forEach(visit);
  return ids;
}

/** 列表 repeat 在 block 树上的最大嵌套层级（含当前宿主 repeat 层）。 */
export { REPEAT_NESTING_DEPTH_MAX } from "../repeat-binding-contract/values";
import { REPEAT_NESTING_DEPTH_MAX } from "../repeat-binding-contract/values";

/** 统计某区块向上祖先链中带 collection repeat 的数量（不含自身）。 */
function countAncestorRepeatDepth(t: EmailTemplate, blockId: string): number {
  let depth = 0;
  let currentId = t.blocks[blockId]?.parentId ?? null;
  while (currentId) {
    const block = t.blocks[currentId];
    if (block?.repeat?.mode === "collection") depth += 1;
    currentId = block?.parentId ?? null;
  }
  return depth;
}

export function validateTemplateBindings(t: EmailTemplate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const slotIdToType = new Map<string, string>();
  for (const [blockId, block] of Object.entries(t.blocks)) {
    if (block.repeat?.mode === "collection") {
      const path = `blocks.${blockId}.repeat`;
      if (!isRepeatHostBlock(block)) {
        issues.push({
          path,
          reason: "列表重复只能绑定在布局容器、栅格或图片区块上，不能绑定在邮件根节点",
        });
      }
      const repeatIssues = validateExternalVariableBindingSpec(path, {
        slotId: block.repeat.slotId,
        mode: "variable",
        valueType: "collection",
        allowExternal: true,
        itemFields: block.repeat.itemFields,
        minItems: block.repeat.minItems,
        maxItems: block.repeat.maxItems,
        label: block.repeat.label,
        description: block.repeat.description,
      });
      for (const ri of repeatIssues) issues.push(ri);
      if (block.repeat.prototypeChildIds.length === 0) {
        issues.push({ path: `${path}.prototypeChildIds`, reason: "列表重复区域必须至少选择一个原型子区块" });
      }
      const selfRepeatOnly =
        block.repeat.prototypeChildIds.length === 1 &&
        block.repeat.prototypeChildIds[0] === blockId;
      if (!selfRepeatOnly) {
        issues.push({
          path: `${path}.prototypeChildIds`,
          reason:
            "旧版列表重复已禁用：必须绑定在哪一层就复制哪一层，prototypeChildIds 只能为当前区块自身 id",
        });
      }
      if (block.repeat.fallbackChildIds.some((childId) => childId !== blockId)) {
        issues.push({
          path: `${path}.fallbackChildIds`,
          reason: "fallbackChildIds 仅允许包含当前区块自身 id（旧版回退子区块写法已禁用）",
        });
      }
      if (
        block.repeat.itemMode !== undefined &&
        block.repeat.itemMode !== "single" &&
        block.repeat.itemMode !== "group"
      ) {
        issues.push({
          path: `${path}.itemMode`,
          reason: "itemMode 只能为 single 或 group",
        });
      }
      const repeatGroupSize =
        block.repeat.itemMode === "group" ? Math.max(1, Math.floor(block.repeat.groupSize ?? 1)) : 1;
      if (block.repeat.itemMode === "group" && repeatGroupSize < 2) {
        issues.push({
          path: `${path}.groupSize`,
          reason: "分组重复时 groupSize 必须至少为 2",
        });
      }
      for (const childId of block.repeat.fallbackChildIds) {
        if (!t.blocks[childId]) {
          issues.push({
            path: `${path}.fallbackChildIds`,
            reason: `静态回退子区块「${childId}」不存在`,
          });
        }
      }
      if (
        block.repeat.itemPath !== undefined &&
        (typeof block.repeat.itemPath !== "string" ||
          !block.repeat.itemPath.trim() ||
          block.repeat.itemPath.includes(".."))
      ) {
        issues.push({
          path: `${path}.itemPath`,
          reason: "itemPath 必须为非空点路径，且不能包含连续点",
        });
      }
      if (
        block.repeat.itemPath?.trim() &&
        !isItemPathWithinCollectionListLevelMax(block.repeat.itemFields, block.repeat.itemPath)
      ) {
        issues.push({
          path: `${path}.itemPath`,
          reason: COLLECTION_ITEM_FIELDS_NESTING_ERROR,
        });
      }
      const repeatNestingDepth = countAncestorRepeatDepth(t, blockId) + 1;
      if (repeatNestingDepth > REPEAT_NESTING_DEPTH_MAX) {
        issues.push({
          path: `${path}`,
          reason: `列表重复嵌套层级不能超过 ${REPEAT_NESTING_DEPTH_MAX} 层`,
        });
      }
      const repeatPrototypeTreeIds = collectDescendantBlockIds(t, block.repeat.prototypeChildIds);
      const enclosingParentRepeat = block.repeat.itemPath?.trim()
        ? findEnclosingRepeatHostBinding(t, blockId)
        : null;
      for (const mapping of block.repeat.fieldMappings ?? []) {
        const mappingPath = `${path}.fieldMappings.${mapping.id || mapping.targetBindPath}`;
        const itemOffset = Math.max(0, Math.floor(mapping.itemOffset ?? 0));
        if (mapping.itemOffset !== undefined && block.repeat.itemMode !== "group") {
          issues.push({
            path: `${mappingPath}.itemOffset`,
            reason: "itemOffset 只能用于分组重复",
          });
        }
        if (block.repeat.itemMode === "group" && itemOffset >= repeatGroupSize) {
          issues.push({
            path: `${mappingPath}.itemOffset`,
            reason: "itemOffset 不能超过 groupSize 范围",
          });
        }
        const sourceField = resolveRepeatFieldMappingSourceMeta(
          block.repeat,
          enclosingParentRepeat,
          mapping.sourcePath
        );
        if (!sourceField) {
          issues.push({
            path: `${mappingPath}.sourcePath`,
            reason: `映射来源字段「${mapping.sourcePath}」必须来自当前 collection 的 itemFields${
              block.repeat.itemPath?.trim() ? "，或父项 repeat 的标量 itemFields（parent. 前缀）" : ""
            }`,
          });
        } else if (sourceField.valueType === "collection") {
          issues.push({
            path: `${mappingPath}.sourcePath`,
            reason: "列表字段映射不能直接绑定子列表字段，请改为在子级循环容器中绑定",
          });
        }
        const targetBlock = t.blocks[mapping.targetBlockId];
        if (!targetBlock) {
          issues.push({
            path: `${mappingPath}.targetBlockId`,
            reason: `映射目标区块「${mapping.targetBlockId}」不存在`,
          });
          continue;
        }
        if (!repeatPrototypeTreeIds.has(mapping.targetBlockId)) {
          issues.push({
            path: `${mappingPath}.targetBlockId`,
            reason: "映射目标字段必须位于当前重复原型子树内部",
          });
        }
        if (classifyField(targetBlock.type, mapping.targetBindPath) !== "content") {
          issues.push({
            path: `${mappingPath}.targetBindPath`,
            reason: "列表字段映射只能绑定业务内容字段，不能绑定样式或结构字段",
          });
        }
      }
      const prevType = slotIdToType.get(block.repeat.slotId);
      if (prevType && prevType !== "collection") {
        issues.push({
          path: `${path}.slotId`,
          reason: `slotId「${block.repeat.slotId}」在多处绑定中 valueType 不一致（${prevType} vs collection）`,
        });
      } else if (!prevType) {
        slotIdToType.set(block.repeat.slotId, "collection");
      }
    }
    if (block.objectBind?.mode === "object") {
      const path = `blocks.${blockId}.objectBind`;
      if (block.repeat?.mode === "collection") {
        issues.push({
          path,
          reason: "同一宿主不可同时配置列表重复（repeat）与对象绑定（objectBind）",
        });
      }
      if (!isRepeatHostBlock(block)) {
        issues.push({
          path,
          reason: "对象绑定只能配置在布局容器、栅格或图片区块上，不能配置在邮件根节点",
        });
      }
      const objectIssues = validateExternalVariableBindingSpec(path, {
        slotId: block.objectBind.slotId,
        mode: "variable",
        valueType: "object",
        allowExternal: true,
        label: block.objectBind.label,
        description: block.objectBind.description,
      });
      for (const oi of objectIssues) issues.push(oi);
      if (!block.objectBind.objectFields?.length) {
        issues.push({
          path: `${path}.objectFields`,
          reason: "对象绑定须声明非空 objectFields",
        });
      }
      const objectSubtreeIds = collectDescendantBlockIds(t, [blockId]);
      for (const mapping of block.objectBind.fieldMappings ?? []) {
        const mappingPath = `${path}.fieldMappings.${mapping.id || mapping.targetBindPath}`;
        if (mapping.itemOffset !== undefined && mapping.itemOffset > 0) {
          issues.push({
            path: `${mappingPath}.itemOffset`,
            reason: "对象字段映射不支持 itemOffset",
          });
        }
        const sourceField = findObjectFieldByPath(block.objectBind.objectFields, mapping.sourcePath);
        if (!sourceField) {
          issues.push({
            path: `${mappingPath}.sourcePath`,
            reason: `映射来源字段「${mapping.sourcePath}」必须来自 objectFields`,
          });
        } else if (sourceField.valueType === "collection") {
          issues.push({
            path: `${mappingPath}.sourcePath`,
            reason: "对象字段映射不支持子列表字段",
          });
        }
        const targetBlock = t.blocks[mapping.targetBlockId];
        if (!targetBlock) {
          issues.push({
            path: `${mappingPath}.targetBlockId`,
            reason: `映射目标区块「${mapping.targetBlockId}」不存在`,
          });
          continue;
        }
        if (!objectSubtreeIds.has(mapping.targetBlockId)) {
          issues.push({
            path: `${mappingPath}.targetBlockId`,
            reason: "映射目标字段必须位于当前对象绑定宿主子树内部",
          });
        }
        if (classifyField(targetBlock.type, mapping.targetBindPath) !== "content") {
          issues.push({
            path: `${mappingPath}.targetBindPath`,
            reason: "对象字段映射只能绑定业务内容字段，不能绑定样式或结构字段",
          });
        }
      }
      const prevObjectType = slotIdToType.get(block.objectBind.slotId);
      if (prevObjectType && prevObjectType !== "object") {
        issues.push({
          path: `${path}.slotId`,
          reason: `slotId「${block.objectBind.slotId}」在多处绑定中 valueType 不一致（${prevObjectType} vs object）`,
        });
      } else if (!prevObjectType) {
        slotIdToType.set(block.objectBind.slotId, "object");
      }
    }
    if (block.visibility) {
      const path = `blocks.${blockId}.visibility`;
      if (block.type === "emailRoot") {
        issues.push({
          path,
          reason: "邮件根节点不支持 visibility，请把显示条件配置在业务区块或容器上",
        });
      }
      const visibilityIssues = validateVisibilityRule(path, block.visibility);
      for (const vi of visibilityIssues) issues.push(vi);
      const slotId = block.visibility.slotId;
      const valueType = block.visibility.valueType;
      if (slotId && valueType !== undefined) {
        const prevType = slotIdToType.get(slotId);
        if (prevType && prevType !== valueType) {
          issues.push({
            path: `${path}.valueType`,
            reason: `slotId「${slotId}」在多处绑定中 valueType 不一致（${prevType} vs ${valueType}）`,
          });
        } else if (!prevType) {
          slotIdToType.set(slotId, valueType);
        }
      }
    }
    if (!block.bindings) continue;
    for (const [bindPath, spec] of Object.entries(block.bindings)) {
      const path = `blocks.${blockId}.bindings.${bindPath}`;
      // 字段分类与 mode 的一致性（来源胶囊体系约束）
      validateBindingFieldKind(block.type, blockId, bindPath, spec, issues);

      if (spec.mode === "theme") {
        if (!spec.tokenPath || typeof spec.tokenPath !== "string" || !spec.tokenPath.trim()) {
          issues.push({ path: `${path}.tokenPath`, reason: "theme 绑定必须声明 tokenPath" });
        }
        continue;
      }

      if (spec.mode === "interpolate") {
        const bindingIssues = validateExternalInterpolateBindingSpec(path, spec);
        for (const bi of bindingIssues) {
          issues.push(bi);
        }
        const [root, ...rest] = bindPath.split(".");
        const target =
          root === "props"
            ? getAtPath(block.props as Record<string, unknown>, rest.join("."))
            : root === "wrapperStyle"
              ? getAtPath((block.wrapperStyle ?? {}) as Record<string, unknown>, rest.join("."))
              : undefined;
        if (typeof target !== "string") {
          issues.push({
            path,
            reason: "interpolate 绑定只能作用在字符串字段上",
          });
        } else {
          const declaredIds = new Set((spec.interpolationSlots ?? []).map((slot) => slot.slotId));
          const templateIds = extractInterpolationSlotIds(target);
          for (const slotId of templateIds) {
            if (!declaredIds.has(slotId)) {
              issues.push({
                path,
                reason: `模板字符串包含 {{ ${slotId} }}，但 interpolationSlots 未声明该 slot`,
              });
            }
          }
          for (const slotId of declaredIds) {
            if (!templateIds.includes(slotId)) {
              issues.push({
                path,
                reason: `interpolationSlots 声明了「${slotId}」，但模板字符串中未出现 {{ ${slotId} }}`,
              });
            }
          }
        }
        for (const slot of spec.interpolationSlots ?? []) {
          const valueType = slot.valueType as string | undefined;
          if (!slot.slotId || !valueType) continue;
          const prevType = slotIdToType.get(slot.slotId);
          if (prevType && prevType !== valueType) {
            issues.push({
              path: `${path}.interpolationSlots`,
              reason: `slotId「${slot.slotId}」在多处绑定中 valueType 不一致（${prevType} vs ${valueType}）`,
            });
          } else if (!prevType) {
            slotIdToType.set(slot.slotId, valueType);
          }
        }
        continue;
      }

      if (spec.mode !== "variable" || spec.allowExternal !== true) continue;
      const bindingIssues = validateExternalVariableBindingSpec(path, spec);
      for (const bi of bindingIssues) {
        issues.push(bi);
      }
      if (spec.valueType) {
        const effectiveSlotValueType = resolveEffectiveBindingSlotValueType(spec, {
          template: t,
          blockId,
        });
        const compat = validateVariableBindingFieldCompatibility(
          block,
          bindPath,
          effectiveSlotValueType
        );
        if (compat) {
          issues.push({ path: `${path}.${compat.pathSuffix}`, reason: compat.reason });
        }
      }
      const slotId = spec.slotId;
      const valueType = spec.valueType;
      if (!slotId || valueType === undefined) continue;
      const prevType = slotIdToType.get(slotId);
      if (prevType && prevType !== valueType) {
        issues.push({
          path: `${path}.valueType`,
          reason: `slotId「${slotId}」在多处绑定中 valueType 不一致（${prevType} vs ${valueType}）`,
        });
      } else if (!prevType) {
        slotIdToType.set(slotId, valueType);
      }

      if (
        valueType === "collection" &&
        collectionBindingUsesItemIndex(spec.slotPath) &&
        !resolveRepeatContextForRef(t, { kind: "physical", blockId })
      ) {
        issues.push({
          path: `${path}.slotPath`,
          level: "warning",
          reason:
            "collection 列表项字段（带数字下标的 slotPath）只能写在列表重复行模板内；请在「列表」Tab 绑定列表重复，勿在静态多行上逐字段绑下标",
        });
      }
    }
  }
  issues.push(...collectionSlotMissingItemFields(t));
  issues.push(...validateThemeRefBindingConsistency(t));
  return issues;
}

export function validateTemplate(t: EmailTemplate): ValidationIssue[] {
  const issues = validateTemplateStructure(t);
  issues.push(...validateTemplateBindings(t));
  issues.push(...validateTemplateBlockContracts(t));
  issues.push(...validateRenderDefaultsForbiddenFields(t));
  issues.push(...validateForbiddenBackgroundImageAlt(t));
  issues.push(...validateForbiddenBackgroundImageChrome(t));
  issues.push(...validateForbiddenBackgroundImagePositionWhenContain(t));
  issues.push(...validateForbiddenLegacyProps(t));
  return issues;
}

export { validatePayloadAgainstTemplateContract as validatePayloadAgainstTemplate };
export { validatePayloadAgainstTemplateUnionContract as validatePayloadAgainstTemplateUnion };

export function assertEmailKeySafe(emailKey: string): string | null {
  if (!/^[a-zA-Z0-9._-]+$/.test(emailKey)) {
    return "emailKey 仅允许字母、数字、._-";
  }
  if (emailKey.includes("..") || emailKey.includes("/") || emailKey.includes("\\")) {
    return "非法路径";
  }
  return null;
}
