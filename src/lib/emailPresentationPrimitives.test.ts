import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { flatMapHorizontalLayoutRowCells } from "./emailPresentationPrimitives";
import type { EmailTemplate } from "../types/email";

test("flatMapHorizontalLayoutRowCells：hug 子列会把 td width attr 透传到渲染结果", () => {
  const template: EmailTemplate = {
    schemaVersion: "3.0.0",
    templateId: "test",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      a: {
        id: "a",
        type: "text",
        parentId: "root",
        children: [],
        wrapperStyle: { widthMode: "hug", heightMode: "hug" },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "a" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {},
      },
      b: {
        id: "b",
        type: "text",
        parentId: "root",
        children: [],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "b" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {},
      },
    },
  };

  const cells = flatMapHorizontalLayoutRowCells({
    template,
    childIds: ["a", "b"],
    gapAuto: false,
    gapPx: 6,
    omitSpacerGapCells: false,
    childTdWidthStyle: (childId) => (childId === "b" ? { width: "100%" } : { whiteSpace: "nowrap" }),
    childTdWidthAttr: (childId) => (childId === "a" ? "1" : undefined),
    fillRowInnerHeight: false,
    slotAlign: { align: "left", valign: "top" },
    renderChild: (childId) => createElement("div", { "data-child": childId }),
  });

  assert.equal(cells[0]?.props.width, "1");
  assert.equal(cells[1]?.props["aria-hidden"], true);
  assert.equal(cells[2]?.props.width, undefined);
});
