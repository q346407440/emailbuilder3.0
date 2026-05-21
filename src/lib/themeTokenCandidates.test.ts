import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { suggestThemeTokenPaths } from "./themeTokenCandidates";

describe("suggestThemeTokenPaths", () => {
  it("字号字段推荐 typography 档位", () => {
    const paths = suggestThemeTokenPaths("text", "props.fontSize");
    assert.ok(paths.every((p) => p.startsWith("tokens.typography.")));
    assert.ok(paths.includes("tokens.typography.body"));
  });

  it("props.color 含主背景 surface（图标描边等）", () => {
    const paths = suggestThemeTokenPaths("icon", "props.color");
    assert.ok(paths.includes("colors.surface"));
    assert.ok(paths.includes("colors.primary"));
  });

  it("背景色字段推荐 surface 相关颜色", () => {
    const paths = suggestThemeTokenPaths("layout", "wrapperStyle.backgroundColor");
    assert.ok(paths.includes("colors.surface"));
  });
});
