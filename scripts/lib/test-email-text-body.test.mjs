import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { textBodyFromString } from "./test-email-text-body.mjs";

describe("test-email-text-body", () => {
  test("单行保持单段落", () => {
    assert.deepEqual(textBodyFromString("单行"), {
      paragraphs: [{ runs: [{ text: "单行" }] }],
    });
  });

  test("按 \\n 拆成多段落", () => {
    assert.deepEqual(textBodyFromString("左上\nleft top"), {
      paragraphs: [{ runs: [{ text: "左上" }] }, { runs: [{ text: "left top" }] }],
    });
  });

  test("空行保留为空段落 run", () => {
    const out = textBodyFromString("A\n\nB");
    assert.equal(out.paragraphs.length, 3);
    assert.equal(out.paragraphs[1].runs[0].text, "");
  });
});
