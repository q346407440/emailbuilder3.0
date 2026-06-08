import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultCtaTextOnPrimary,
  isLightPrimaryColor,
  relativeLuminance,
  textColorMayBindPrimaryToken,
} from "./semanticStyleDefaults";

describe("semanticStyleDefaults", () => {
  it("黄底 primary 判定为浅色", () => {
    assert.equal(isLightPrimaryColor("#E3D026"), true);
    assert.equal(defaultCtaTextOnPrimary("#E3D026"), "#1A1A1A");
  });

  it("黑底 primary 判定为深色", () => {
    assert.equal(isLightPrimaryColor("#111827"), false);
    assert.equal(defaultCtaTextOnPrimary("#111827"), "#FFFFFF");
  });

  it("relativeLuminance 对合法 hex 有值", () => {
    assert.ok(relativeLuminance("#FFFFFF")! > 0.9);
    assert.ok(relativeLuminance("#000000")! < 0.1);
  });

  it("textColorMayBindPrimaryToken 仅字面量等于 primary 时允许", () => {
    assert.equal(textColorMayBindPrimaryToken("#E3D026", "#E3D026"), true);
    assert.equal(textColorMayBindPrimaryToken("#1A1A1A", "#E3D026"), false);
  });
});
