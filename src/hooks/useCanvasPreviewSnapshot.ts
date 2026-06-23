import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CanvasPreviewSnapshot,
  CanvasSnapshotPhase,
} from "../canvas-preview-snapshot-contract";
import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ExpandedTheme } from "../types/theme";
import {
  buildCanvasPreviewSnapshot,
  shouldFreezeSnapshot,
  toCommittedCanvasSnapshot,
} from "../lib/canvasPreviewSnapshot";
import { prewarmCanvasScope } from "../lib/canvasPrewarm";
import { reuseFlatTemplateBlockReferences } from "../lib/previewPatch";

export type UseCanvasPreviewSnapshotInput = {
  template: EmailTemplate | null;
  previewPayload: EmailPayload | null;
  effectiveDesignTokens: ExpandedTheme | null;
  hasVisibilityBlocks: boolean;
  canvasSimulateAllHidden: boolean;
  loadGeneration: number;
  loadFrozen: boolean;
  /** Lane A 完成后递增，触发一次 prewarm */
  prewarmNonce: number;
  canvasScopeRef: React.RefObject<HTMLElement | null>;
};

export type UseCanvasPreviewSnapshotResult = {
  committedSnapshot: CanvasPreviewSnapshot | null;
  livePreviewModel: CanvasPreviewSnapshot["previewModel"] | null;
  flatTemplate: EmailTemplate | null;
  previewIssues: CanvasPreviewSnapshot["issues"];
  snapshotPhase: CanvasSnapshotPhase;
};

export function useCanvasPreviewSnapshot(
  input: UseCanvasPreviewSnapshotInput
): UseCanvasPreviewSnapshotResult {
  const {
    template,
    previewPayload,
    effectiveDesignTokens,
    hasVisibilityBlocks,
    canvasSimulateAllHidden,
    loadGeneration,
    loadFrozen,
    prewarmNonce,
    canvasScopeRef,
  } = input;

  const [snapshotPhase, setSnapshotPhase] = useState<CanvasSnapshotPhase>("idle");
  const frozenSnapshotRef = useRef<CanvasPreviewSnapshot | null>(null);

  const syncBuilt = useMemo(() => {
    if (!template || !previewPayload) return null;
    return buildCanvasPreviewSnapshot({
      template,
      previewPayload,
      effectiveDesignTokens,
      hasVisibilityBlocks,
      canvasSimulateAllHidden,
      generation: loadGeneration,
    });
  }, [
    template,
    previewPayload,
    effectiveDesignTokens,
    hasVisibilityBlocks,
    canvasSimulateAllHidden,
    loadGeneration,
  ]);

  const committedSnapshot = useMemo(() => {
    if (shouldFreezeSnapshot(snapshotPhase, loadFrozen)) {
      return frozenSnapshotRef.current;
    }
    if (!syncBuilt) {
      frozenSnapshotRef.current = null;
      return null;
    }
    const raw = toCommittedCanvasSnapshot(syncBuilt, loadGeneration);
    if (!raw) {
      frozenSnapshotRef.current = null;
      return null;
    }
    const prev = frozenSnapshotRef.current;
    const next: CanvasPreviewSnapshot =
      prev?.flatTemplate && raw.generation === prev.generation
        ? {
            ...raw,
            flatTemplate: reuseFlatTemplateBlockReferences(prev.flatTemplate, raw.flatTemplate),
          }
        : raw;
    frozenSnapshotRef.current = next;
    return next;
  }, [syncBuilt, loadGeneration, loadFrozen, snapshotPhase]);

  const previewIssues = useMemo(
    () => syncBuilt?.issues ?? committedSnapshot?.issues ?? [],
    [syncBuilt, committedSnapshot]
  );

  /** 已對哪次 prewarmNonce 跑過背景 prewarm；編輯改 template 不應重觸發 */
  const prewarmedNonceRef = useRef(0);

  useEffect(() => {
    if (loadFrozen) {
      setSnapshotPhase("loading");
      return;
    }
    if (!template || !previewPayload) {
      setSnapshotPhase("idle");
      return;
    }
    setSnapshotPhase("ready");
  }, [loadFrozen, template, previewPayload]);

  useEffect(() => {
    if (loadFrozen || prewarmNonce === 0) return;
    if (!template || !previewPayload) return;
    if (prewarmNonce <= prewarmedNonceRef.current) return;

    const nonce = prewarmNonce;
    prewarmedNonceRef.current = nonce;
    const ac = new AbortController();

    void prewarmCanvasScope(canvasScopeRef.current, { signal: ac.signal });

    return () => {
      ac.abort();
      if (prewarmedNonceRef.current === nonce) {
        prewarmedNonceRef.current = nonce - 1;
      }
    };
  }, [loadFrozen, prewarmNonce, template, previewPayload, canvasScopeRef]);

  const livePreviewModel = committedSnapshot?.previewModel ?? null;
  const flatTemplate = committedSnapshot?.flatTemplate ?? null;

  return {
    committedSnapshot,
    livePreviewModel,
    flatTemplate,
    previewIssues,
    snapshotPhase,
  };
}
