import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPACT_BLOCK_KINDS } from "../lib/ai-pipeline/compactTypes";
import {
  COMPACT_IR_BLOCK_KINDS,
  buildCompactIrFormatPromptSection,
  buildCompactIrLayoutIntentPromptSection,
} from "./compactIr";

describe("layout-variant-ai-contract/compactIr", () => {
  it("COMPACT_IR_BLOCK_KINDS 与 ai-pipeline compactTypes 一致", () => {
    assert.deepEqual([...COMPACT_IR_BLOCK_KINDS], [...COMPACT_BLOCK_KINDS]);
  });

  it("prompt 段包含全部 kind 白名单", () => {
    const format = buildCompactIrFormatPromptSection();
    for (const kind of COMPACT_BLOCK_KINDS) {
      assert.match(format, new RegExp(kind.replace(".", "\\.")));
    }
  });

  it("布局意图段声明禁止在 image 上写容器 px", () => {
    const layout = buildCompactIrLayoutIntentPromptSection();
    assert.match(layout, /禁止.*height/);
    assert.match(layout, /backgroundImageRef/);
  });
});
