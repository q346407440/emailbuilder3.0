import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeCompactIrTree } from "./sanitizeCompactIr";
import type { CompactNode } from "../types";

describe("sanitizeCompactIrTree action.button", () => {
  it("剥离 wrapper.backgroundColor", () => {
    const root: CompactNode = {
      kind: "action.button",
      props: { textId: "s6-t0" },
      wrapper: { widthMode: "fill", backgroundColor: "#000000" },
    };
    const out = sanitizeCompactIrTree(root);
    assert.equal(out.wrapper?.backgroundColor, undefined);
    assert.equal(out.wrapper?.widthMode, "fill");
  });
});
