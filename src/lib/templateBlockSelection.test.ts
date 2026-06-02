import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileSelectedBlockIdAfterTemplateChange } from "./templateBlockSelection";
import type { EmailTemplate } from "../types/email";
import { minimalEmailTemplate, minimalTextBlock } from "./testFixtures/emailTemplate";

function tpl(
  blocks: EmailTemplate["blocks"],
  rootBlockId = "root"
): EmailTemplate {
  return minimalEmailTemplate({ rootBlockId, blocks, blockMeta: {} });
}

describe("reconcileSelectedBlockIdAfterTemplateChange", () => {
  it("选中区块仍存在时保持不变", () => {
    const prev = tpl({
      root: { id: "root", type: "layout", parentId: null, children: ["a"], wrapperStyle: {}, props: {}, bindings: {} },
      a: minimalTextBlock({ id: "a", parentId: "root" }),
    });
    const next = structuredClone(prev);
    assert.equal(reconcileSelectedBlockIdAfterTemplateChange(prev, next, "a"), "a");
  });

  it("self-repeat 物化后回退到同位置的物化行", () => {
    const prev = tpl({
      root: {
        id: "root",
        type: "layout",
        parentId: null,
        children: ["heading", "card"],
        wrapperStyle: {},
        props: {},
        bindings: {},
      },
      heading: minimalTextBlock({ id: "heading", parentId: "root" }),
      card: { id: "card", type: "layout", parentId: "root", children: [], wrapperStyle: {}, props: {}, bindings: {} },
    });
    const next = tpl({
      root: {
        id: "root",
        type: "layout",
        parentId: null,
        children: ["heading", "card", "card-2"],
        wrapperStyle: {},
        props: {},
        bindings: {},
      },
      heading: minimalTextBlock({ id: "heading", parentId: "root" }),
      card: { id: "card", type: "layout", parentId: "root", children: [], wrapperStyle: {}, props: {}, bindings: {} },
      "card-2": { id: "card-2", type: "layout", parentId: "root", children: [], wrapperStyle: {}, props: {}, bindings: {} },
    });
    assert.equal(reconcileSelectedBlockIdAfterTemplateChange(prev, next, "card"), "card");
  });
});
