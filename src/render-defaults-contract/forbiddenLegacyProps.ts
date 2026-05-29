import type { EmailBlock, EmailTemplate } from "../types/email";
import type { RenderDefaultsContractIssue } from "./types";

const ICON_LEGACY_KEYS = ["customSrc", "iconSrcMode", "libraryAssetId", "uploadedAssetId"] as const;

const GRID_LEGACY_KEYS = ["rowHeightMode", "rowHeight"] as const;

type LegacyPropsRule = {
  runtimeTypes: readonly EmailBlock["type"][];
  key: string;
  reason: string;
  /** 若设置，仅在 props 的该嵌套对象内检查 key（如 buttonStyle） */
  nestedObjectKey?: string;
};

/** 禁止写入 template.json 的遗留 props 键（与 block-contract 白名单互补，报错更明确） */
export const FORBIDDEN_LEGACY_PROPS_RULES: readonly LegacyPropsRule[] = [
  {
    runtimeTypes: ["layout"],
    key: "minHeight",
    reason: "layout 容器高度已迁移至 wrapperStyle.heightMode / wrapperStyle.height",
  },
  {
    runtimeTypes: ["layout"],
    key: "height",
    reason: "layout 容器高度已迁移至 wrapperStyle.heightMode / wrapperStyle.height",
  },
  {
    runtimeTypes: ["layout"],
    key: "crossAlign",
    reason: "layout.crossAlign 已移除，请改为 wrapperStyle.contentAlign 或嵌套 layout",
  },
  {
    runtimeTypes: ["grid"],
    key: "items",
    reason: "栅格固定按 children 顺序排布，不再支持跨列/跨行单元格配置",
  },
  {
    runtimeTypes: ["grid"],
    key: "columnsPerRow",
    reason: "栅格列数请使用 columns，不再支持 columnsPerRow",
  },
  {
    runtimeTypes: ["text"],
    key: "lineHeight",
    reason: "text.lineHeight 已废弃，文本行高由渲染层统一固定，不允许在 JSON 中配置",
  },
  {
    runtimeTypes: ["text"],
    key: "textKind",
    reason: "textKind 已移除；请删除该字段，标题样式请用 fontSize 等 token 绑定表达。",
  },
  {
    runtimeTypes: ["text"],
    key: "fontMode",
    reason: "fontMode 已废弃（含 inherit），请删除该字段",
  },
  {
    runtimeTypes: ["text"],
    key: "content",
    reason: "text.props.content 已废弃，请仅使用 props.textBody；可运行 npm run migrate:remove-text-props-content:write",
  },
  {
    runtimeTypes: ["text"],
    key: "fontWeight",
    reason: "text.fontWeight 已废弃，请使用布尔字段 bold",
  },
  {
    runtimeTypes: ["text"],
    key: "fontStyle",
    reason: "text.fontStyle 已废弃，请使用布尔字段 italic",
  },
  {
    runtimeTypes: ["text"],
    key: "textDecoration",
    reason: "text.textDecoration 已废弃，请使用枚举字段 decoration",
  },
  {
    runtimeTypes: ["button"],
    key: "padding",
    nestedObjectKey: "buttonStyle",
    reason: "按钮内边距由渲染层统一固定，不再作为 JSON 配置项",
  },
  {
    runtimeTypes: ["button"],
    key: "fontWeight",
    nestedObjectKey: "buttonStyle",
    reason: "按钮文字粗细请使用 buttonStyle.bold",
  },
  {
    runtimeTypes: ["button"],
    key: "fontStyle",
    nestedObjectKey: "buttonStyle",
    reason: "按钮文字斜体请使用 buttonStyle.italic",
  },
] as const;

function issue(path: string, reason: string): RenderDefaultsContractIssue {
  return { path, reason };
}

function propsRecord(block: EmailBlock): Record<string, unknown> | null {
  if (!block.props || typeof block.props !== "object" || Array.isArray(block.props)) return null;
  return block.props as Record<string, unknown>;
}

/** 校验 template 是否仍含已废弃的 props / bindings 键 */
export function validateForbiddenLegacyProps(template: EmailTemplate): RenderDefaultsContractIssue[] {
  const issues: RenderDefaultsContractIssue[] = [];

  for (const block of Object.values(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    const id = block.id;
    const props = propsRecord(block);

    if (block.type === "emailRoot" && props) {
      if ("outerBackgroundColor" in props) {
        issues.push(
          issue(
            `blocks.${id}.props.outerBackgroundColor`,
            "emailRoot 禁止配置画布外侧底色；工作区灰底由项目固定 EMAIL_CANVAS_WORKSPACE_BACKGROUND（#f1f1f1）"
          )
        );
      }
      if ("direction" in props) {
        issues.push(
          issue(
            `blocks.${id}.props.direction`,
            "画布根节点固定纵向排列，不再支持配置排列方向"
          )
        );
      }
      if ("contentAlign" in props) {
        issues.push(
          issue(
            `blocks.${id}.props.contentAlign`,
            "画布根节点不再支持内容对齐配置，请使用子区块相对父级对齐"
          )
        );
      }
    }

    if (block.type === "icon" && props) {
      for (const legacyKey of ICON_LEGACY_KEYS) {
        if (legacyKey in props) {
          issues.push(
            issue(
              `blocks.${id}.props.${legacyKey}`,
              "已废弃：图标地址仅使用 props.src（URL），请移除该字段"
            )
          );
        }
      }
    }

    if (block.type === "grid" && props) {
      for (const legacyKey of GRID_LEGACY_KEYS) {
        if (legacyKey in props) {
          issues.push(
            issue(
              `blocks.${id}.props.${legacyKey}`,
              "已废弃：栅格单元格高度请使用 props.cellHeightMode / props.cellHeight"
            )
          );
        }
      }
    }

    for (const rule of FORBIDDEN_LEGACY_PROPS_RULES) {
      if (!rule.runtimeTypes.includes(block.type)) continue;
      if (!props) continue;

      const container = rule.nestedObjectKey
        ? props[rule.nestedObjectKey]
        : props;
      if (!container || typeof container !== "object" || Array.isArray(container)) continue;
      if (!(rule.key in (container as Record<string, unknown>))) continue;

      const path = rule.nestedObjectKey
        ? `blocks.${id}.props.${rule.nestedObjectKey}.${rule.key}`
        : `blocks.${id}.props.${rule.key}`;
      issues.push(issue(path, rule.reason));
    }

    if (block.type === "text") {
      const tb = block.props as Record<string, unknown> | undefined;
      const textBody = tb?.textBody;
      if (textBody && typeof textBody === "object" && !Array.isArray(textBody) && "version" in textBody) {
        issues.push(
          issue(
            `blocks.${id}.props.textBody.version`,
            "禁止 props.textBody.version；正文形态由 template.schemaVersion 与迁移脚本统一管理"
          )
        );
      }
    }

    if (block.type === "text" && block.bindings?.["props.content"]) {
      issues.push(
        issue(
          `blocks.${id}.bindings.props.content`,
          "禁止在 props.content 上绑定变量，请改绑到 props.textBody 或其 run 路径"
        )
      );
    }
  }

  return issues;
}
