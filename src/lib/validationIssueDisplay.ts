import type { EmailTemplate } from "../types/email";
import type { ValidationIssue } from "./validate";
import { isBlockingValidationIssue } from "./validate";
import { blockTypeLabel } from "./blockTypeLabel";
import { parseValidationIssuePath } from "./validationIssueRouting";

export type ValidationIssueDisplayLine = {
  summary: string;
  detail: string;
};

const HUMAN_REASON_PATTERNS: Array<{ test: RegExp; summary: string }> = [
  {
    test: /未登记 mode:"theme"/,
    summary: "使用了主题样式，但未正确登记「跟随主题」；请在样式面板重新选择主题或解除后再绑定。",
  },
  {
    test: /字段值含 \$themeRef/,
    summary: "样式字段与主题绑定登记不一致，请在右侧样式面板修正。",
  },
  {
    test: /缺少可用的样式预设/,
    summary: "模板含主题引用，但当前无法加载样式预设，预览已暂停；请检查主题样式或公共预设。",
  },
  {
    test: /collection 列表项字段/,
    summary: "列表项字段应写在列表重复行模板内；请使用「列表」绑定并完成重绑。",
  },
  {
    test: /映射目标区块.*不存在/,
    summary: "列表字段映射指向的区块不存在，请重新打开列表绑定向导检查映射。",
  },
  {
    test: /悬空区块/,
    summary: "存在无法从邮件根到达的区块，请在区块结构中删除或移回根下。",
  },
  {
    test: /检测到环或重复访问/,
    summary: "区块父子关系异常（环或重复），请检查区块树结构。",
  },
  {
    test: /画布宽度|props\.width|偏离/,
    summary: "邮件画布宽度应为 600px，请在邮件根节点布局中确认。",
  },
  {
    test: /禁止持久化|不得写入/,
    summary: "版式中含有不允许保存的配置项，请按提示移除或改用面板可配项。",
  },
];

function humanSummaryForReason(reason: string): string | null {
  for (const { test, summary } of HUMAN_REASON_PATTERNS) {
    if (test.test(reason)) return summary;
  }
  return null;
}

function blockDisplayName(template: EmailTemplate | null, blockId: string | undefined): string {
  if (!blockId || !template) return blockId ?? "区块";
  const meta = template.blockMeta?.[blockId];
  const name = meta?.name?.trim();
  if (name) return name;
  const type = template.blocks[blockId]?.type;
  return type ? blockTypeLabel(type) : blockId;
}

function fieldLabelFromBindPath(bindPath: string | undefined): string {
  if (!bindPath) return "";
  const tail = bindPath.split(".").pop() ?? bindPath;
  const map: Record<string, string> = {
    backgroundColor: "背景色",
    backgroundImage: "背景图",
    imageUrl: "图片地址",
    width: "宽度",
    height: "高度",
    gap: "间距",
    padding: "内边距",
    tokenPath: "主题路径",
  };
  return map[tail] ?? tail;
}

export function formatValidationIssueForDisplay(
  issue: ValidationIssue,
  template: EmailTemplate | null
): ValidationIssueDisplayLine {
  const detail = issue.path ? `${issue.path}：${issue.reason}` : issue.reason;
  const human = humanSummaryForReason(issue.reason);
  if (human) {
    const parsed = parseValidationIssuePath(issue.path);
    if (parsed.blockId) {
      const who = blockDisplayName(template, parsed.blockId);
      const field = fieldLabelFromBindPath(
        parsed.bindPath?.startsWith("props.") || parsed.bindPath?.startsWith("wrapperStyle.")
          ? parsed.bindPath
          : undefined
      );
      const prefix = field ? `「${who}」· ${field}` : `「${who}」`;
      return { summary: `${prefix}：${human}`, detail };
    }
    if (parsed.layoutVariantId) {
      return {
        summary: `版式「${parsed.layoutVariantId}」：${human}`,
        detail,
      };
    }
    return { summary: human, detail };
  }
  if (template && issue.path.startsWith("blocks.")) {
    const parsed = parseValidationIssuePath(issue.path);
    if (parsed.blockId) {
      return {
        summary: `「${blockDisplayName(template, parsed.blockId)}」：${issue.reason}`,
        detail,
      };
    }
  }
  return { summary: issue.reason, detail };
}

export function partitionValidationIssuesForBanner(issues: ValidationIssue[]): {
  blocking: ValidationIssueDisplayLine[];
  warnings: ValidationIssueDisplayLine[];
} {
  const blocking: ValidationIssueDisplayLine[] = [];
  const warnings: ValidationIssueDisplayLine[] = [];
  for (const issue of issues) {
    const line = formatValidationIssueForDisplay(issue, null);
    if (isBlockingValidationIssue(issue)) blocking.push(line);
    else warnings.push(line);
  }
  return { blocking, warnings };
}

export function validationDockCollapsedLabel(blockingCount: number, warnCount: number): string {
  if (blockingCount > 0 && warnCount > 0) {
    return `须修复 ${blockingCount} · ${warnCount} 条建议`;
  }
  if (blockingCount > 0) return `须修复 ${blockingCount}`;
  if (warnCount > 0) return `${warnCount} 条建议`;
  return "模板检查";
}

export function validationSaveBlockedMessage(issues: ValidationIssue[]): string {
  const n = issues.filter(isBlockingValidationIssue).length;
  return n > 0 ? `存在 ${n} 项须修复的问题，请先处理后再保存。` : "存在校验问题，请先修复后再保存。";
}

export function errorMessageDuplicatesValidationIssues(
  error: string,
  issues: ValidationIssue[]
): boolean {
  const msg = error.trim();
  if (!msg) return false;
  return issues.some((issue) => {
    if (msg.includes(issue.reason)) return true;
    return Boolean(issue.path && msg.includes(issue.path));
  });
}

/** 尝试从 API 错误文案中解析 path：reason 片段 */
export function parseValidationDetailsFromErrorMessage(
  error: string
): ValidationIssue[] {
  const msg = error.trim();
  if (!msg) return [];
  const parts = msg.split(/；|;/).map((p) => p.trim()).filter(Boolean);
  const issues: ValidationIssue[] = [];
  for (const part of parts) {
    const idx = part.indexOf("：");
    if (idx <= 0) continue;
    const path = part.slice(0, idx).trim();
    const reason = part.slice(idx + 1).trim();
    if (path && reason && (path.includes(".") || path.startsWith("layout:"))) {
      issues.push({ path, reason });
    }
  }
  return issues;
}
