import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tokenPresetFieldUsesShopUnitInput } from "./tokenPresetFieldInput";

describe("tokenPresetFieldUsesShopUnitInput", () => {
  it("spacing 空串与纯 px 数字串为 true", () => {
    assert.equal(tokenPresetFieldUsesShopUnitInput("spacing", ""), true);
    assert.equal(tokenPresetFieldUsesShopUnitInput("spacing", "16px"), true);
    assert.equal(tokenPresetFieldUsesShopUnitInput("spacing", "16"), true);
  });

  it("spacing 含 % 或 calc 为 false", () => {
    assert.equal(tokenPresetFieldUsesShopUnitInput("spacing", "50%"), false);
    assert.equal(tokenPresetFieldUsesShopUnitInput("spacing", "calc(100% - 8px)"), false);
  });

  it("colors 恒为 false", () => {
    assert.equal(tokenPresetFieldUsesShopUnitInput("colors", "#fff"), false);
  });

  it("typography 合法 px 为 true", () => {
    assert.equal(tokenPresetFieldUsesShopUnitInput("typography", "15px"), true);
  });
});
