import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock } from "../types/email";
import { ensureLayoutContentAlignPersisted, normalizeLayoutContentAlign } from "./layoutContentAlign";

describe("normalizeLayoutContentAlign", () => {
  it("横向 hug + placement.center 迁移为 fill + contentAlign.center", () => {
    const block: EmailBlock = {
      id: "row",
      type: "layout",
      parentId: "p",
      children: [],
      wrapperStyle: {
        widthMode: "hug",
        heightMode: "hug",
        placement: { horizontal: "center", vertical: "start" },
      },
      props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
      bindings: {},
    };
    assert.equal(normalizeLayoutContentAlign(block), true);
    assert.equal(block.wrapperStyle?.widthMode, "fill");
    assert.equal(block.wrapperStyle?.contentAlign?.horizontal, "center");
    assert.equal(block.wrapperStyle?.placement?.horizontal, "start");
  });

  it("纵向 hug + placement.center 迁移为 fill + contentAlign.vertical center", () => {
    const block: EmailBlock = {
      id: "col",
      type: "layout",
      parentId: "p",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        placement: { horizontal: "start", vertical: "center" },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "12px" },
      bindings: {},
    };
    assert.equal(normalizeLayoutContentAlign(block), true);
    assert.equal(block.wrapperStyle?.heightMode, "fill");
    assert.equal(block.wrapperStyle?.contentAlign?.vertical, "center");
    assert.equal(block.wrapperStyle?.placement?.vertical, "start");
  });
});

describe("ensureLayoutContentAlignPersisted", () => {
  it("纵排缺省补双轴 left/top", () => {
    const block: EmailBlock = {
      id: "col",
      type: "layout",
      parentId: "p",
      children: [],
      wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      props: { direction: "vertical" },
      bindings: {},
    };
    assert.equal(ensureLayoutContentAlignPersisted(block), true);
    assert.deepEqual(block.wrapperStyle?.contentAlign, { horizontal: "left", vertical: "top" });
  });

  it("横排缺省补双轴 left/top", () => {
    const block: EmailBlock = {
      id: "row",
      type: "layout",
      parentId: "p",
      children: [],
      wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      props: { direction: "horizontal" },
      bindings: {},
    };
    assert.equal(ensureLayoutContentAlignPersisted(block), true);
    assert.deepEqual(block.wrapperStyle?.contentAlign, { horizontal: "left", vertical: "top" });
  });
});
