import type { InspectorMainTab } from "../components/AdminInspectorTabs";
import type { WorkbenchView } from "./validationIssueContext";
import type { ValidationIssue } from "./validate";
import { isBlockingValidationIssue } from "./validate";

export type ValidationIssueTier = "inlineField" | "blockTree" | "dockOnly";

export type ParsedValidationPath = {
  layoutVariantId?: string;
  blockId?: string;
  bindPath?: string;
  slotId?: string;
  payloadPath?: string;
  tokenPresetsPath?: string;
  isRootLevel?: boolean;
};

export type ClassifiedValidationIssue = {
  issue: ValidationIssue;
  tier: ValidationIssueTier;
  parsed: ParsedValidationPath;
  workbenchView?: WorkbenchView;
  inspectorTab?: InspectorMainTab;
};

export const MATERIALIZED_INTERMEDIATE_REASON =
  /列表项字段.*slotPath|带数字下标的\s*slotPath|collection\s*列表项字段/i;

export function isMaterializedIntermediateWarning(issue: ValidationIssue): boolean {
  return issue.level === "warning" && MATERIALIZED_INTERMEDIATE_REASON.test(issue.reason);
}

/** 从校验 path 解析 blockId、bindPath、版式、变量槽等 */
export function parseValidationIssuePath(path: string): ParsedValidationPath {
  const trimmed = path.trim();
  if (!trimmed) return { isRootLevel: true };

  const layoutMatch = trimmed.match(/^layout:([^/]+)\/(.+)$/);
  if (layoutMatch) {
    const inner = parseValidationIssuePath(layoutMatch[2]!);
    return { ...inner, layoutVariantId: layoutMatch[1] };
  }

  if (trimmed === "rootBlockId" || trimmed === "tokenPresets") {
    return trimmed === "tokenPresets" ? { tokenPresetsPath: trimmed } : { isRootLevel: true };
  }
  if (trimmed.startsWith("tokenPresets.")) {
    return { tokenPresetsPath: trimmed };
  }

  const childrenMatch = trimmed.match(/^children\.([^.]+)/);
  if (childrenMatch) {
    return { blockId: childrenMatch[1] };
  }

  const blocksMatch = trimmed.match(/^blocks\.([^.]+)\.(.+)$/);
  if (blocksMatch) {
    const rest = blocksMatch[2]!;
    if (rest.startsWith("bindings.")) {
      const bindPath = rest.slice("bindings.".length).replace(/\.interpolationSlots\.\d+$/, "");
      return { blockId: blocksMatch[1], bindPath };
    }
    if (rest.startsWith("props.")) {
      return { blockId: blocksMatch[1], bindPath: rest };
    }
    if (rest.startsWith("wrapperStyle.")) {
      return { blockId: blocksMatch[1], bindPath: rest };
    }
    if (rest === "repeat" || rest.startsWith("repeat.")) {
      return { blockId: blocksMatch[1], bindPath: "repeat" };
    }
    if (rest === "visibility" || rest.startsWith("visibility.")) {
      return { blockId: blocksMatch[1], bindPath: "visibility" };
    }
    return { blockId: blocksMatch[1] };
  }

  const blockOnly = trimmed.match(/^blocks\.([^.]+)$/);
  if (blockOnly) {
    return { blockId: blockOnly[1] };
  }

  if (trimmed.startsWith("payload.")) {
    const slotFromValues = trimmed.match(/^payload\.values\.([^.]+)/);
    if (slotFromValues) return { slotId: slotFromValues[1], payloadPath: trimmed };
    const slotFromSlots = trimmed.match(/^payload\.slots\.([^.]+)/);
    if (slotFromSlots) return { slotId: slotFromSlots[1], payloadPath: trimmed };
    return { payloadPath: trimmed };
  }

  if (trimmed.startsWith("values.")) {
    const slotId = trimmed.slice("values.".length).split(".")[0];
    return { slotId, payloadPath: trimmed };
  }

  return { isRootLevel: true };
}

function inferInspectorTab(parsed: ParsedValidationPath, reason: string): InspectorMainTab | undefined {
  if (parsed.bindPath?.startsWith("repeat") || reason.includes("列表")) return "list";
  if (parsed.bindPath?.startsWith("visibility") || reason.includes("显隐")) return "visibility";
  if (
    parsed.bindPath?.includes("textBody") ||
    parsed.bindPath?.includes("imageUrl") ||
    parsed.bindPath?.includes("link") ||
    parsed.bindPath?.includes("src") ||
    reason.includes("slotId") ||
    reason.includes("变量")
  ) {
    return "content";
  }
  if (
    parsed.bindPath?.includes("backgroundColor") ||
    parsed.bindPath?.includes("buttonStyle") ||
    parsed.bindPath?.includes("wrapperStyle") ||
    parsed.bindPath?.includes("props.") ||
    reason.includes("$themeRef") ||
    reason.includes("mode:\"theme\"")
  ) {
    return "style";
  }
  return "layout";
}

function inferWorkbenchView(parsed: ParsedValidationPath): WorkbenchView | undefined {
  if (parsed.tokenPresetsPath) return "tokens";
  if (parsed.payloadPath || parsed.slotId) return "payload";
  return "block";
}

/** 是否能在 Inspector 中映射到具体 bindPath 字段 */
export function bindPathForInlineField(parsed: ParsedValidationPath): string | undefined {
  if (!parsed.bindPath) return undefined;
  if (parsed.bindPath === "repeat" || parsed.bindPath === "visibility") return undefined;
  if (parsed.bindPath.startsWith("bindings.")) {
    return parsed.bindPath.slice("bindings.".length);
  }
  if (parsed.bindPath.startsWith("props.") || parsed.bindPath.startsWith("wrapperStyle.")) {
    return parsed.bindPath;
  }
  return undefined;
}

export function classifyValidationIssue(issue: ValidationIssue): ClassifiedValidationIssue {
  const parsed = parseValidationIssuePath(issue.path);
  const workbenchView = inferWorkbenchView(parsed);
  const inspectorTab = parsed.blockId ? inferInspectorTab(parsed, issue.reason) : undefined;

  if (parsed.isRootLevel && !parsed.layoutVariantId) {
    return { issue, tier: "dockOnly", parsed, workbenchView: workbenchView ?? "block", inspectorTab };
  }
  if (parsed.tokenPresetsPath || parsed.layoutVariantId) {
    return {
      issue,
      tier: "dockOnly",
      parsed,
      workbenchView: parsed.layoutVariantId ? "payload" : "tokens",
      inspectorTab,
    };
  }
  if (parsed.payloadPath && !parsed.blockId) {
    return {
      issue,
      tier: parsed.slotId ? "inlineField" : "dockOnly",
      parsed,
      workbenchView: "payload",
    };
  }
  if (bindPathForInlineField(parsed)) {
    return { issue, tier: "inlineField", parsed, workbenchView: "block", inspectorTab };
  }
  if (parsed.blockId) {
    return { issue, tier: "blockTree", parsed, workbenchView: "block", inspectorTab };
  }
  return { issue, tier: "dockOnly", parsed, workbenchView, inspectorTab };
}

export type DockIssueEntry = {
  key: string;
  summary: string;
  detail: string;
  blocking: boolean;
  classified: ClassifiedValidationIssue;
  /** 物化中间态折叠组 */
  isMaterializedGroup?: boolean;
  materializedCount?: number;
};

export function buildDockIssueEntries(
  issues: ValidationIssue[],
  formatLine: (issue: ValidationIssue) => { summary: string; detail: string }
): DockIssueEntry[] {
  const materialized: ValidationIssue[] = [];
  const rest: ValidationIssue[] = [];
  for (const issue of issues) {
    if (isMaterializedIntermediateWarning(issue)) materialized.push(issue);
    else rest.push(issue);
  }

  const entries: DockIssueEntry[] = [];
  if (materialized.length > 0) {
    entries.push({
      key: "materialized-group",
      summary: `列表绑定中间态（${materialized.length} 条）：完成重绑后应自动消失`,
      detail: materialized.map((i) => formatLine(i).detail).join("\n"),
      blocking: false,
      classified: classifyValidationIssue(materialized[0]!),
      isMaterializedGroup: true,
      materializedCount: materialized.length,
    });
  }

  for (const issue of rest) {
    const line = formatLine(issue);
    entries.push({
      key: `${issue.path}|${issue.reason}`,
      summary: line.summary,
      detail: line.detail,
      blocking: isBlockingValidationIssue(issue),
      classified: classifyValidationIssue(issue),
    });
  }
  return entries;
}

export function countValidationIssueSeverity(issues: ValidationIssue[]): {
  blocking: number;
  warning: number;
} {
  let blocking = 0;
  let warning = 0;
  const materialized: ValidationIssue[] = [];
  for (const issue of issues) {
    if (isMaterializedIntermediateWarning(issue)) materialized.push(issue);
    else if (isBlockingValidationIssue(issue)) blocking += 1;
    else warning += 1;
  }
  if (materialized.length > 0) warning += 1;
  return { blocking, warning };
}
