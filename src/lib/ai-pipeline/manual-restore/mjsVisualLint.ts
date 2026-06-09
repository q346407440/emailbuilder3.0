import fs from "node:fs";
import type { ManualRestoreBlueprint, MjsVisualLintIssue } from "./types";

type JsonObject = Record<string, unknown>;

type WalkItem = {
  node: JsonObject;
  path: string;
  parent?: JsonObject;
};

const DEFAULT_SIZE_PATTERNS = new Set(["48px", "32px", "480px", "100px"]);

function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function blockName(node: JsonObject): string {
  const meta = isObject(node.blockMeta) ? node.blockMeta : {};
  return `${asString(node.id) ?? ""} ${asString(meta.name) ?? ""}`.toLowerCase();
}

function walkTemplate(root: unknown): WalkItem[] {
  const out: WalkItem[] = [];
  const visit = (node: unknown, path: string, parent?: JsonObject) => {
    if (!isObject(node)) return;
    out.push({ node, path, parent });
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach((child, index) => visit(child, `${path}.children[${index}]`, node));
  };
  visit(root, "root");
  return out;
}

function hasPlaceholderSrc(src: unknown): boolean {
  return typeof src === "string" && (src.trim() === "" || src.trim() === "#");
}

function readBackgroundImage(node: JsonObject): JsonObject | null {
  const wrapperStyle = isObject(node.wrapperStyle) ? node.wrapperStyle : {};
  return isObject(wrapperStyle.backgroundImage) ? wrapperStyle.backgroundImage : null;
}

function readProps(node: JsonObject): JsonObject {
  return isObject(node.props) ? node.props : {};
}

function readWrapper(node: JsonObject): JsonObject {
  return isObject(node.wrapperStyle) ? node.wrapperStyle : {};
}

function readFontSize(node: JsonObject): string | undefined {
  return asString(readProps(node).fontSize);
}

function parsePx(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  return match ? Number(match[1]) : null;
}

function hasVisibleBorder(node: JsonObject): boolean {
  const border = readWrapper(node).border;
  if (!isObject(border)) return false;
  const width = asString(border.width);
  const color = asString(border.color);
  return !!width && width !== "0" && color !== "rgba(0,0,0,0)";
}

function parentLooksLikeIconBox(parent: JsonObject | undefined): boolean {
  if (!parent) return false;
  const wrapper = readWrapper(parent);
  return wrapper.widthMode === "fixed" && wrapper.heightMode === "fixed" && hasVisibleBorder(parent);
}

function issue(issue: MjsVisualLintIssue): MjsVisualLintIssue {
  return issue;
}

function blockPath(blockId: string, fieldPath?: string): string {
  return fieldPath ? `blocks.${blockId}.${fieldPath}` : `blocks.${blockId}`;
}

export function lintManualRestoreTemplate(
  template: unknown,
  blueprint?: Pick<ManualRestoreBlueprint, "iconSlots" | "visualChecks">
): MjsVisualLintIssue[] {
  const root = isObject(template) ? template.root : null;
  const items = walkTemplate(root);
  const issues: MjsVisualLintIssue[] = [];

  for (const item of items) {
    const { node, path, parent } = item;
    const id = asString(node.id) ?? path;
    const name = blockName(node);
    const props = readProps(node);
    const wrapper = readWrapper(node);
    const bg = readBackgroundImage(node);

    if (bg && hasPlaceholderSrc(bg.src)) {
      issues.push(
        issue({
          severity: "error",
          code: "asset.placeholderSrc",
          path: blockPath(id, "wrapperStyle.backgroundImage.src"),
          message: `${id} 使用了空图片或 # 占位图源`,
          suggestion: "补齐资产槽并引用真实 PEXELS/ICON 解析结果，禁止用 # 通过校验。",
        })
      );
    }

    if (node.type === "icon" && hasPlaceholderSrc(props.src)) {
      issues.push(
        issue({
          severity: "error",
          code: "asset.placeholderSrc",
          path: blockPath(id, "props.src"),
          message: `${id} 使用了空图标或 # 占位图源`,
          suggestion: "补齐 ICON 槽位或改为真实文本实现。",
        })
      );
    }

    if (props.gap === "auto") {
      issues.push(
        issue({
          severity: "warning",
          code: "layout.unsupportedAutoGap",
          path: blockPath(id, "props.gap"),
          message: `${id} 使用 gap: auto，布局意图不稳定`,
          suggestion: "左右分布行用左侧 fill + 右侧 hug/右对齐表达。",
        })
      );
    }

    for (const [key, value] of Object.entries({ fontSize: props.fontSize, height: wrapper.height })) {
      if (DEFAULT_SIZE_PATTERNS.has(asString(value) ?? "")) {
        issues.push(
          issue({
            severity: "warning",
            code: key === "height" && value === "480px" ? "layout.heroTooTall" : "layout.defaultSizeLikelyCopied",
            path: blockPath(id, key === "fontSize" ? "props.fontSize" : "wrapperStyle.height"),
            message: `${id} 命中疑似底稿默认大值 ${value}`,
            suggestion: "按 visual blueprint 的目标尺寸重写，避免照抄示例值。",
          })
        );
      }
    }

    const fontSize = parsePx(readFontSize(node));
    if (fontSize != null && fontSize > 8 && /(footer|页脚|terms|条款|copyright|版权|privacy|unsubscribe)/i.test(name)) {
      issues.push(
        issue({
          severity: "warning",
          code: "typography.footerTooLarge",
          path: blockPath(id, "props.fontSize"),
          message: `${id} 页脚/合规文本字号 ${fontSize}px 偏大`,
          suggestion: "页脚合规区通常使用 caption 级 6-8px。",
        })
      );
    }

    if (node.type === "icon" && /social|instagram|youtube|pinterest|\bx\b/.test(name) && !parentLooksLikeIconBox(parent)) {
      const requiresBox =
        blueprint?.iconSlots?.some((slot) => slot.hasBox && name.includes(slot.slotId.toLowerCase())) ?? true;
      if (requiresBox) {
        issues.push(
          issue({
            severity: "warning",
            code: "icon.missingBox",
            path: blockPath(id),
            message: `${id} 社媒图标缺少固定尺寸外框容器`,
            suggestion: "用 fixed layout.container + border 包住 iconBlock。",
          })
        );
      }
    }

    const children = Array.isArray(node.children) ? node.children : [];
    if (/app.*(logo|icon|图标)|app.*标志|app-logo/.test(name) && children.length === 0 && node.type !== "icon") {
      issues.push(
        issue({
          severity: "warning",
          code: "icon.emptyAppGlyph",
          path: blockPath(id),
          message: `${id} 像 App 图标容器但内部没有品牌 glyph`,
          suggestion: "在黑底圆角容器内放入品牌 icon。",
        })
      );
    }
  }

  return issues;
}

export function lintManualRestoreTemplateFile(
  templatePath: string,
  blueprint?: Pick<ManualRestoreBlueprint, "iconSlots" | "visualChecks">
): MjsVisualLintIssue[] {
  const template = JSON.parse(fs.readFileSync(templatePath, "utf8")) as unknown;
  return lintManualRestoreTemplate(template, blueprint);
}

export function formatVisualLintIssues(issues: readonly MjsVisualLintIssue[]): string[] {
  return issues.map((item) => {
    const prefix = item.severity === "error" ? "[visual:error]" : "[visual:warning]";
    const path = item.path ? `${item.path}: ` : "";
    return `${prefix} ${item.code}: ${path}${item.message}${item.suggestion ? `；建议：${item.suggestion}` : ""}`;
  });
}
