import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { collectContentAlignEffectivenessIssues } from "./contentAlignConfigurability";
import {
  isChildFillBlockedByParentHug,
  normalizeBlockWrapperDimensionModes,
} from "./wrapperFillConstraint";
import {
  reconcileBlockWrapperStyle,
  reconcileLayoutStructuralSubtreeInPlace,
} from "./wrapperLayoutReconcile";
import { validateTemplate } from "./validate";

/** G3 横排 fill 演示：纵排 wrap + 子 width fill → 切横排后子块应被协调为合法 */
function buildG3FillWrapScenario(direction: "vertical" | "horizontal"): EmailTemplate {
  const wrap = {
    id: "wrap",
    type: "layout" as const,
    parentId: "stage",
    children: ["chip"],
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "hug" as const,
      heightMode: "fill" as const,
      backgroundColor: "#C4B5FD",
    },
    props: { direction, gapMode: "fixed", gap: "6px" },
    bindings: {},
  };
  const chip = {
    id: "chip",
    type: "text" as const,
    parentId: "wrap",
    children: [] as string[],
    wrapperStyle: {
      contentAlign: { horizontal: "center", vertical: "top" },
      widthMode: "fill" as const,
      heightMode: "hug" as const,
    },
    props: {
      textBody: { paragraphs: [{ runs: [{ text: "height fill" }] }] },
      fontSize: "12px",
      color: "#4C1D95",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {},
  };
  const stage = {
    id: "stage",
    type: "layout" as const,
    parentId: "root",
    children: ["wrap"],
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill" as const,
      heightMode: "fixed" as const,
      height: "88px",
    },
    props: { direction: "horizontal" as const, gapMode: "fixed", gap: "6px" },
    bindings: {},
  };
  return {
    schemaVersion: "4.0.0",
    emailId: "test",
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["stage"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {},
        bindings: {},
      },
      stage,
      wrap,
      chip,
    },
  } as unknown as EmailTemplate;
}

describe("wrapperLayoutReconcile", () => {
  it("纵排 wrap + 子 width fill：切横排后协调子块 fill", () => {
    const template = buildG3FillWrapScenario("vertical");
    assert.equal(isChildFillBlockedByParentHug(template.blocks.wrap, "width"), true);
    const { wrapperStyle: fixedChipWs } = normalizeBlockWrapperDimensionModes(template, "chip");
    template.blocks.chip.wrapperStyle = fixedChipWs;
    assert.equal(template.blocks.chip.wrapperStyle?.widthMode, "hug");

    template.blocks.chip.wrapperStyle = {
      ...template.blocks.chip.wrapperStyle,
      widthMode: "fill",
    };
    template.blocks.wrap.props = { ...template.blocks.wrap.props, direction: "horizontal" };
    const changes = reconcileLayoutStructuralSubtreeInPlace(template, "wrap");

    assert.ok(changes.some((c) => c.blockId === "chip" && c.field === "wrapperStyle.widthMode"));
    assert.equal(template.blocks.chip.wrapperStyle?.widthMode, "hug");
    assert.equal(collectContentAlignEffectivenessIssues("chip", template, template.blocks.chip).length, 0);

    const chipWrapperIssues = validateTemplate(template).filter(
      (i) =>
        i.path.includes("chip") &&
        (i.path.includes("widthMode") || i.path.includes("contentAlign"))
    );
    assert.equal(
      chipWrapperIssues.length,
      0,
      chipWrapperIssues.map((i) => `${i.path}: ${i.reason}`).join("; ")
    );
  });

  it("reconcileBlockWrapperStyle：横排 hug 父下回落 fill 宽", () => {
    const template = buildG3FillWrapScenario("horizontal");
    const result = reconcileBlockWrapperStyle(template, "chip", template.blocks.chip);
    assert.equal(result.changed, true);
    assert.equal(result.wrapperStyle?.widthMode, "hug");
  });
});
