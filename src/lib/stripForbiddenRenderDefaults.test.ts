import assert from "node:assert/strict";
import test from "node:test";
import type { EmailBlock } from "../types/email";
import { MINIMAL_TEXT_PROPS } from "./testFixtures/emailTemplate";
import { stripForbiddenRenderDefaultsFromBlock } from "../render-defaults-contract/validate";

function layoutBlock(): EmailBlock {
  return {
    id: "l1",
    type: "layout",
    parentId: "root",
    children: [],
    wrapperStyle: {
      selfAlign: { horizontal: "center", cross: "center" },
      backgroundContentAlign: { horizontal: "center", vertical: "center" },
      overflow: "hidden",
      contentAlign: { horizontal: "left", vertical: "top" },
    },
    props: {},
    bindings: {},
  } as EmailBlock;
}

test("stripForbiddenRenderDefaultsFromBlock 剥离 layout 禁止字段", () => {
  const block = layoutBlock();
  assert.equal(stripForbiddenRenderDefaultsFromBlock(block), true);
  const ws = block.wrapperStyle as Record<string, unknown>;
  assert.equal("selfAlign" in ws, false);
  assert.equal("backgroundContentAlign" in ws, false);
  assert.equal("overflow" in ws, false);
  assert.deepEqual(block.wrapperStyle?.contentAlign, { horizontal: "left", vertical: "top" });
});

test("stripForbiddenRenderDefaultsFromBlock 保留 layout 双轴 contentAlign", () => {
  const block: EmailBlock = {
    id: "l2",
    type: "layout",
    parentId: "root",
    children: [],
    wrapperStyle: {
      contentAlign: { horizontal: "center", vertical: "bottom" },
    },
    props: { direction: "vertical" },
    bindings: {},
  } as EmailBlock;
  assert.equal(stripForbiddenRenderDefaultsFromBlock(block), false);
  assert.deepEqual(block.wrapperStyle?.contentAlign, { horizontal: "center", vertical: "bottom" });
});

test("stripForbiddenRenderDefaultsFromBlock 保留 text 双轴 contentAlign", () => {
  const block: EmailBlock = {
    id: "t1",
    type: "text",
    parentId: "root",
    children: [],
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
    },
    props: {
      ...MINIMAL_TEXT_PROPS,
    },
    bindings: {},
  } as EmailBlock;
  assert.equal(stripForbiddenRenderDefaultsFromBlock(block), false);
  assert.deepEqual(block.wrapperStyle?.contentAlign, { horizontal: "left", vertical: "top" });
});
