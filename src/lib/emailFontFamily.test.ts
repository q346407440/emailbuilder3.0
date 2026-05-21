import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeEmailThemeIntoBaseline } from "./baselineExpandedTheme";
import { DEFAULT_THEME_FONT_SINGLE, storedSingleFontToCssFamily } from "../font-family-contract";

describe("mergeEmailThemeIntoBaseline · 字体展开", () => {
  it("未配置主题时使用默认展开字体", () => {
    const ex = mergeEmailThemeIntoBaseline(undefined);
    assert.equal(ex.fonts.heading, "'Source Sans 3', sans-serif");
    assert.equal(ex.fonts.body, "'Source Sans 3', sans-serif");
  });

  it("单一 Georgia 展开为 Georgia, serif", () => {
    const ex = mergeEmailThemeIntoBaseline({
      schemaVersion: "2.0.0",
      fontFamily: { heading: "Georgia", body: "Georgia" },
    });
    assert.equal(ex.fonts.heading, "Georgia, serif");
    assert.equal(ex.fonts.body, "Georgia, serif");
  });
});

describe("storedSingleFontToCssFamily · 基线 re-export", () => {
  it("undefined 用默认单一字体展开", () => {
    assert.equal(
      storedSingleFontToCssFamily(undefined, DEFAULT_THEME_FONT_SINGLE),
      "'Source Sans 3', sans-serif"
    );
  });
});
