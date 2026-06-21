import { AiPipelineError } from "../../../layout-variant-ai-contract/errors";
import type { RestoreAstDocument } from "../../../restore-ast-contract/types";
import { parseLlmJson } from "../parseLlmJson";
import { normalizeRestoreAstFromLlm } from "./normalizeRestoreAstFromLlm";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function assertThemeSection(
  theme: Record<string, unknown>,
  key: string,
  fields: string[],
  path: string
): void {
  const section = theme[key];
  if (!isRecord(section)) {
    throw new AiPipelineError("VALIDATION_FAILED", `${path} 须为对象`);
  }
  for (const field of fields) {
    const value = section[field];
    if (typeof value !== "string" || !value.trim()) {
      throw new AiPipelineError("VALIDATION_FAILED", `${path}.${field} 须为非空字符串`);
    }
  }
}

/** 解析 LLM 输出并做 RestoreAst 形态校验（失败即抛，不重试）。 */
export function parseRestoreAstDocument(raw: string): RestoreAstDocument {
  let parsed: unknown;
  try {
    parsed = parseLlmJson(raw);
  } catch (e) {
    if (e instanceof AiPipelineError) throw e;
    throw new AiPipelineError("LLM_PARSE_FAILED", "LLM 返回内容不是合法 JSON");
  }

  if (!isRecord(parsed)) {
    throw new AiPipelineError("VALIDATION_FAILED", "RestoreAst 根须为 JSON 对象");
  }

  if (!isRecord(parsed.theme)) {
    throw new AiPipelineError("VALIDATION_FAILED", "缺少 theme");
  }

  assertThemeSection(parsed.theme, "colors", ["primary", "accent", "secondary", "surface"], "theme.colors");
  assertThemeSection(parsed.theme, "spacing", ["section", "gap", "pageInline"], "theme.spacing");
  assertThemeSection(parsed.theme, "typography", ["display", "h1", "body", "caption"], "theme.typography");
  assertThemeSection(parsed.theme, "radius", ["panel", "cta"], "theme.radius");

  if (!isRecord(parsed.tree)) {
    throw new AiPipelineError("VALIDATION_FAILED", "缺少 tree");
  }
  if (parsed.tree.t !== "email") {
    throw new AiPipelineError("VALIDATION_FAILED", 'tree.t 须为 "email"');
  }
  if (!Array.isArray(parsed.tree.children)) {
    throw new AiPipelineError("VALIDATION_FAILED", "tree.children 须为数组");
  }

  return normalizeRestoreAstFromLlm(parsed as RestoreAstDocument);
}
