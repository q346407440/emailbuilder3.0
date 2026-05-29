import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRepeatHostBlock, isRepeatHostBlockType } from "./repeatHostBlock";

describe("repeatHostBlock", () => {
  it("layout / grid / image 可作为列表重复宿主", () => {
    assert.equal(isRepeatHostBlockType("layout"), true);
    assert.equal(isRepeatHostBlockType("grid"), true);
    assert.equal(isRepeatHostBlockType("image"), true);
    assert.equal(isRepeatHostBlockType("text"), false);
    assert.equal(isRepeatHostBlockType("emailRoot"), false);
  });

  it("isRepeatHostBlock 与 type 判断一致", () => {
    assert.equal(isRepeatHostBlock({ type: "image" } as never), true);
    assert.equal(isRepeatHostBlock({ type: "button" } as never), false);
  });
});
