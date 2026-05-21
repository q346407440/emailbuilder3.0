import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  collectSpacingViolations,
  cssPaddingShorthandToSeparate,
  deepNormalizeSpacingValues,
  spacingObjectViolatesUnifiedSingleValue,
} from "./spacing-value-normalize.mjs";

describe("spacing-value-normalize", () => {
  test("detect unified 四值简写", () => {
    assert.equal(
      spacingObjectViolatesUnifiedSingleValue({ mode: "unified", unified: "8px 0 0 0" }),
      true
    );
    assert.equal(
      spacingObjectViolatesUnifiedSingleValue({ mode: "unified", unified: "8px" }),
      false
    );
  });

  test("cssPaddingShorthandToSeparate", () => {
    assert.deepEqual(cssPaddingShorthandToSeparate("8px 0 0 0"), {
      mode: "separate",
      top: "8px",
      right: "0",
      bottom: "0",
      left: "0",
    });
    assert.deepEqual(cssPaddingShorthandToSeparate("28px 24px"), {
      mode: "separate",
      top: "28px",
      right: "24px",
      bottom: "28px",
      left: "24px",
    });
  });

  test("deepNormalizeSpacingValues", () => {
    const input = {
      blocks: {
        g: {
          wrapperStyle: {
            padding: { mode: "unified", unified: "8px 0 0 0" },
          },
        },
      },
    };
    const hits = collectSpacingViolations(input);
    assert.equal(hits.length, 1);
    const { value, changed } = deepNormalizeSpacingValues(input);
    assert.equal(changed, true);
    assert.equal(value.blocks.g.wrapperStyle.padding.mode, "separate");
    assert.equal(value.blocks.g.wrapperStyle.padding.top, "8px");
    assert.equal(collectSpacingViolations(value).length, 0);
  });
});
