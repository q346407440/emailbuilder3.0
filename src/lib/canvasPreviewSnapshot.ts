import type { CanvasPreviewIssue, CanvasPreviewSnapshot } from "../canvas-preview-snapshot-contract";
import type { CanvasSnapshotPhase } from "../canvas-preview-snapshot-contract";
import type { RepeatPreviewModel } from "../repeat-binding-contract";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import { isThemeRef } from "../types/themeRef";
import { applyObjectBindMappingsToTemplate } from "./objectBindRegion";
import { resolveBlockTheme } from "./resolveThemeInTemplate";
import { applyVisibilityRules } from "./visibility";
import {
  applyThemeToPreviewModel,
  buildRepeatPreviewModel,
  previewModelToFlatTemplate,
} from "../repeat-runtime";

export type BuildCanvasPreviewSnapshotInput = {
  template: EmailTemplate;
  previewPayload: EmailPayload;
  effectiveDesignTokens: ExpandedTheme | null;
  hasVisibilityBlocks: boolean;
  canvasSimulateAllHidden: boolean;
  generation: number;
};

export type BuildCanvasPreviewSnapshotResult = {
  previewModel: RepeatPreviewModel | null;
  flatTemplate: EmailTemplate | null;
  sourceTemplate: EmailTemplate;
  issues: CanvasPreviewIssue[];
};

function containsThemeRef(value: unknown): boolean {
  if (isThemeRef(value)) return true;
  if (Array.isArray(value)) return value.some((item) => containsThemeRef(item));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => containsThemeRef(item));
  }
  return false;
}

/** 封装 App 既有 resolvedPreview 管道（语义不变，仅下沉）。 */
export function buildCanvasPreviewSnapshot(
  input: BuildCanvasPreviewSnapshotInput
): BuildCanvasPreviewSnapshotResult {
  const afterVisibility: EmailTemplate = (() => {
    if (!input.hasVisibilityBlocks) {
      return applyVisibilityRules(input.template, input.previewPayload);
    }
    if (input.canvasSimulateAllHidden) {
      return applyVisibilityRules(input.template, input.previewPayload, {
        simulateAllHidden: true,
      });
    }
    return input.template;
  })();

  let previewModel = buildRepeatPreviewModel(
    applyObjectBindMappingsToTemplate(afterVisibility),
    input.previewPayload
  );
  const flat = previewModelToFlatTemplate(previewModel, afterVisibility);

  if (!containsThemeRef(flat)) {
    return { previewModel, flatTemplate: flat, sourceTemplate: afterVisibility, issues: [] };
  }

  if (!input.effectiveDesignTokens) {
    return {
      previewModel: null,
      flatTemplate: null,
      sourceTemplate: afterVisibility,
      issues: [
        { path: "tokenPresets", reason: "模板包含 $themeRef，但当前缺少可用的样式预设" },
      ],
    };
  }

  const issues: CanvasPreviewIssue[] = [];
  previewModel = applyThemeToPreviewModel(previewModel, (block) =>
    resolveBlockTheme(block, { theme: input.effectiveDesignTokens!, issues })
  );
  if (issues.length > 0) {
    return { previewModel: null, flatTemplate: null, sourceTemplate: afterVisibility, issues };
  }

  const flatTemplate = previewModelToFlatTemplate(previewModel, afterVisibility);
  return { previewModel, flatTemplate, sourceTemplate: afterVisibility, issues: [] };
}

export function toCommittedCanvasSnapshot(
  built: BuildCanvasPreviewSnapshotResult,
  generation: number
): CanvasPreviewSnapshot | null {
  if (!built.previewModel || !built.flatTemplate) return null;
  return {
    generation,
    previewModel: built.previewModel,
    flatTemplate: built.flatTemplate,
    sourceTemplate: built.sourceTemplate,
    issues: built.issues,
  };
}

/** generation 与当前 load 不一致时丢弃（防快切版式旧请求覆盖）。 */
export function commitCanvasSnapshot(
  prev: CanvasPreviewSnapshot | null,
  next: CanvasPreviewSnapshot,
  expectedGeneration: number
): CanvasPreviewSnapshot | null {
  if (next.generation !== expectedGeneration) return prev;
  return next;
}

export function shouldFreezeSnapshot(phase: CanvasSnapshotPhase, loadFrozen: boolean): boolean {
  return loadFrozen || phase === "loading";
}
