import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  tokenPresetFamilyTitleZh,
  tokenPresetFieldLabelZh,
  tokenPresetScaleTitleKnown,
} from "./tokenPresetFieldLabels";

describe("tokenPresetFieldLabelZh", () => {
  it("已知 scale 返回中文标题且无 technicalHint", () => {
    const r = tokenPresetFieldLabelZh("typography", "h1", 99);
    assert.equal(r.label, "小标题字号");
    assert.equal(r.technicalHint, undefined);
  });

  it("未知 scale 使用其他项序号并给出 technicalHint", () => {
    const r = tokenPresetFieldLabelZh("spacing", "customGap", 2);
    assert.equal(r.label, "其他项 2");
    assert.match(r.technicalHint ?? "", /spacing\.customGap/);
  });
});

describe("tokenPresetFamilyTitleZh", () => {
  it("未知 family 不直晒键名", () => {
    assert.equal(tokenPresetFamilyTitleZh("fooBar"), "其他分组");
  });
});

describe("tokenPresetScaleTitleKnown", () => {
  it("已知为 true", () => {
    assert.equal(tokenPresetScaleTitleKnown("colors", "accent"), true);
  });
  it("未知为 false", () => {
    assert.equal(tokenPresetScaleTitleKnown("colors", "unknownColor"), false);
  });
  it("精简表未收录的基线主题色键（如 onBrand）为 false", () => {
    assert.equal(tokenPresetScaleTitleKnown("colors", "onBrand"), false);
  });
});
