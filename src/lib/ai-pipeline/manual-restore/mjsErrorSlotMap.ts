/**
 * validate 错误行 → mother body slot 映射：LLM 修复以 slot 整段重生成为粒度，
 * 不再做自由文本 search 定位（search 对动态拼接的 block id 与空白差异天然脆弱）。
 */

import { isMjsPatchSlotId, type MjsPatchSlotId } from "../../../mjs-patch-contract";
import { blockIdFromValidateIssueLine } from "./mjsValidatePath";

export type MjsErrorSlotGroup = {
  slotId: MjsPatchSlotId;
  /** 归属该 slot 的 validate 错误行 */
  errors: string[];
};

export type MjsErrorSlotMapResult = {
  groups: MjsErrorSlotGroup[];
  /** 无法归属任何 slot 的错误行（须随完整源码兜底交给 LLM） */
  unmapped: string[];
};

/** 视觉门问题行带 `[visual:*] <code>: ` 前缀；剥掉后与 validate 行同构（blocks.<id>.<path>: 说明）。 */
function stripVisualLintPrefix(line: string): string {
  return line.replace(/^\[visual:(?:error|warning)\]\s+[\w.-]+:\s*/, "");
}

/** 单条错误行映射到 slot（validate 行与视觉门行均可）；无法归属返回 null。 */
export function slotIdForValidateIssueLine(
  rawErrorLine: string,
  idPrefix: string
): MjsPatchSlotId | null {
  const errorLine = stripVisualLintPrefix(rawErrorLine);
  const path = errorLine.split(":")[0]?.trim() ?? "";

  // tokenPresets 路径（runMjsAndValidate 统一加 tokenPresets.json/ 前缀）
  if (path.startsWith("tokenPresets.json/") || path.startsWith("tokenPresets.")) {
    return "tokenPresets";
  }

  const blockId = blockIdFromValidateIssueLine(errorLine);
  if (blockId) {
    // 块 id 约定 `${P}-s<N>-…`；按段号归属 buildS<N>
    const m = new RegExp(`^${escapeRegExp(idPrefix)}-s(\\d+)(?:-|$)`).exec(blockId);
    if (m) {
      const candidate = `buildS${m[1]}`;
      if (isMjsPatchSlotId(candidate)) return candidate;
    }
    // 根节点及其余顶层块归属 template slot
    if (blockId === `${idPrefix}-root` || blockId.startsWith(`${idPrefix}-root-`)) {
      return "template";
    }
  }

  // 根级 template 路径（root.props 等）
  if (path.startsWith("root.") || path === "root") return "template";

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 将错误行按 slot 分组（保持 slot 首次出现顺序）；未归属行进 unmapped。 */
export function groupValidateIssuesBySlot(
  errorLines: string[],
  idPrefix: string
): MjsErrorSlotMapResult {
  const bySlot = new Map<MjsPatchSlotId, string[]>();
  const unmapped: string[] = [];

  for (const line of errorLines) {
    const slotId = slotIdForValidateIssueLine(line, idPrefix);
    if (!slotId) {
      unmapped.push(line);
      continue;
    }
    const list = bySlot.get(slotId) ?? [];
    list.push(line);
    bySlot.set(slotId, list);
  }

  return {
    groups: [...bySlot.entries()].map(([slotId, errors]) => ({ slotId, errors })),
    unmapped,
  };
}
