import { useMemo } from "react";
import type { VirtualBlockRef } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";
import type { WorkbenchView } from "../lib/validationIssueContext";
import {
  bindPathForInlineField,
  classifyValidationIssue,
  parseValidationIssuePath,
} from "../lib/validationIssueRouting";
import type { ValidationIssue } from "../lib/validate";
import { isBlockingValidationIssue } from "../lib/validate";
import { resolvePhysicalBlockId } from "../repeat-runtime";
import { formatValidationIssueForDisplay } from "../lib/validationIssueDisplay";

type Params = {
  issues: ValidationIssue[];
  template: EmailTemplate | null;
  selectedBlockRef: VirtualBlockRef | null;
  workbenchView: WorkbenchView;
};

function slotIdFromParsed(parsed: ReturnType<typeof parseValidationIssuePath>): string | undefined {
  if (parsed.slotId) return parsed.slotId;
  const m = parsed.payloadPath?.match(/payload\.slots\.([^.]+)/);
  return m?.[1];
}

export function useValidationIssuesForContext({
  issues,
  template,
  selectedBlockRef,
  workbenchView,
}: Params) {
  const selectedPhysicalBlockId = selectedBlockRef
    ? resolvePhysicalBlockId(selectedBlockRef)
    : null;

  return useMemo(() => {
    const blockErrorIds = new Set<string>();
    const blockWarnIds = new Set<string>();
    const slotErrorIds = new Set<string>();
    const slotWarnIds = new Set<string>();
    const issuesByBindPath = new Map<string, { message: string; blocking: boolean }>();
    const issuesBySlotId = new Map<string, { message: string; blocking: boolean }>();
    let tokenPresetsError: string | undefined;
    let tokenPresetsWarning: string | undefined;

    const getFieldError = (bindPath: string): string | undefined => {
      const hit = issuesByBindPath.get(bindPath);
      return hit?.blocking ? hit.message : undefined;
    };

    const getFieldWarning = (bindPath: string): string | undefined => {
      const hit = issuesByBindPath.get(bindPath);
      return hit && !hit.blocking ? hit.message : undefined;
    };

    const getSlotError = (slotId: string): string | undefined => {
      const hit = issuesBySlotId.get(slotId);
      return hit?.blocking ? hit.message : undefined;
    };

    const getSlotWarning = (slotId: string): string | undefined => {
      const hit = issuesBySlotId.get(slotId);
      return hit && !hit.blocking ? hit.message : undefined;
    };

    for (const issue of issues) {
      const classified = classifyValidationIssue(issue);
      const parsed = classified.parsed;
      const blocking = isBlockingValidationIssue(issue);
      const line = formatValidationIssueForDisplay(issue, template).summary;

      if (parsed.blockId) {
        if (blocking) blockErrorIds.add(parsed.blockId);
        else blockWarnIds.add(parsed.blockId);
      }

      const slotId = slotIdFromParsed(parsed);
      if (slotId) {
        const prev = issuesBySlotId.get(slotId);
        if (!prev || (blocking && !prev.blocking)) {
          issuesBySlotId.set(slotId, { message: line, blocking });
        }
        if (blocking) slotErrorIds.add(slotId);
        else slotWarnIds.add(slotId);
      }

      if (parsed.tokenPresetsPath || issue.path === "tokenPresets") {
        if (blocking && !tokenPresetsError) tokenPresetsError = line;
        else if (!blocking && !tokenPresetsWarning && !tokenPresetsError) {
          tokenPresetsWarning = line;
        }
      }

      const inlineBind = bindPathForInlineField(parsed);
      if (
        inlineBind &&
        parsed.blockId &&
        selectedPhysicalBlockId === parsed.blockId &&
        workbenchView === "block"
      ) {
        const prev = issuesByBindPath.get(inlineBind);
        if (!prev || (blocking && !prev.blocking)) {
          issuesByBindPath.set(inlineBind, { message: line, blocking });
        }
      }
    }

    return {
      blockErrorIds,
      blockWarnIds,
      slotErrorIds,
      slotWarnIds,
      issuesByBindPath,
      issuesBySlotId,
      getFieldError,
      getFieldWarning,
      getSlotError,
      getSlotWarning,
      tokenPresetsError,
      tokenPresetsWarning,
    };
  }, [issues, template, selectedPhysicalBlockId, workbenchView]);
}
