import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeBlueprintFromLlm } from "./normalizeBlueprintFromLlm";
import { EMAIL_CONTAINER_SPACING_MAX_PX } from "../../spacingPxCap";

test("normalizeBlueprintFromLlm 将越界 spacing clamp 到契约上限（含 pageInline 与 gap）", () => {
  const out = normalizeBlueprintFromLlm({
    spacing: { section: "0", gap: "32px", pageInline: "32px" },
  }) as { spacing: Record<string, string> };
  const max = `${EMAIL_CONTAINER_SPACING_MAX_PX}px`;
  assert.equal(out.spacing.section, "0px");
  assert.equal(out.spacing.gap, max);
  assert.equal(out.spacing.pageInline, max);
});

test("normalizeBlueprintFromLlm 边界内 spacing 原样保留并补 px 单位", () => {
  const out = normalizeBlueprintFromLlm({
    spacing: { section: 0, gap: "16", pageInline: "20px" },
  }) as { spacing: Record<string, string> };
  assert.equal(out.spacing.section, "0px");
  assert.equal(out.spacing.gap, "16px");
  assert.equal(out.spacing.pageInline, "20px");
});

test("normalizeBlueprintFromLlm 非数值 spacing 不 clamp 原样透传", () => {
  const out = normalizeBlueprintFromLlm({
    spacing: { gap: "auto" },
  }) as { spacing: Record<string, string> };
  assert.equal(out.spacing.gap, "auto");
});
