import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSpacingValueForStorage } from "./spacingValue";

describe("normalizeSpacingValueForStorage", () => {
  it("缺 mode 仅有 unified 时归一为 unified", () => {
    assert.deepEqual(normalizeSpacingValueForStorage({ unified: "8px" }), {
      mode: "unified",
      unified: "8px",
    });
  });

  it("缺 mode 仅有分边值时归一为 separate", () => {
    assert.deepEqual(
      normalizeSpacingValueForStorage({ top: "8px", right: "0", bottom: "0", left: "0" }),
      {
        mode: "separate",
        top: "8px",
        right: "0",
        bottom: "0",
        left: "0",
      }
    );
  });

  it("保留 separate 各边 $themeRef", () => {
    const ref = { $themeRef: "tokens.spacing.pageInline" };
    const out = normalizeSpacingValueForStorage({
      mode: "separate",
      top: "0",
      right: ref,
      bottom: "0",
      left: ref,
    });
    assert.deepEqual(out.right, ref);
    assert.deepEqual(out.left, ref);
  });
});
