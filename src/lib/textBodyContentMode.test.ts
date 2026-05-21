import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TextBlock, TextBodyV1 } from "../types/email";
import { getTextBodyContentMode, getWholeTextBodyVariableBindPath } from "./textBodyContentMode";

const multiRunBody: TextBodyV1 = {
  version: 1,
  paragraphs: [
    {
      runs: [
        { text: "contact " },
        { text: "zyzshop1", link: "https://example.com/store" },
        { text: " team" },
      ],
    },
  ],
};

const singleVarBody: TextBodyV1 = {
  version: 1,
  paragraphs: [{ runs: [{ text: "zyzshop1" }] }],
};

describe("textBodyContentMode", () => {
  it("混合字面量与 run 变量 → inlineVariable", () => {
    const block = {
      type: "text",
      bindings: {
        "props.textBody.paragraphs.0.runs.1.text": { mode: "variable", slotId: "storeName" },
        "props.textBody.paragraphs.0.runs.1.link": { mode: "variable", slotId: "storeUrl" },
      },
    } as unknown as TextBlock;
    assert.equal(getTextBodyContentMode(block, multiRunBody), "inlineVariable");
    assert.equal(getWholeTextBodyVariableBindPath(block, multiRunBody), null);
  });

  it("仅单一 run 且 text 为 variable → wholeVariable", () => {
    const block = {
      type: "text",
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": { mode: "variable", slotId: "storeName" },
      },
    } as unknown as TextBlock;
    assert.equal(getTextBodyContentMode(block, singleVarBody), "wholeVariable");
    assert.equal(
      getWholeTextBodyVariableBindPath(block, singleVarBody),
      "props.textBody.paragraphs.0.runs.0.text"
    );
  });

  it("无绑定 → literal", () => {
    const block = { type: "text", bindings: {} } as unknown as TextBlock;
    assert.equal(getTextBodyContentMode(block, multiRunBody), "literal");
  });
});
