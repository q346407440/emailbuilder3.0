import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOKEN_PRESET_STANDARD_KEYS } from "./standard-keys";
import { STANDARD_THEME_REF_PATHS, isStandardThemeRefPath } from "./theme-ref-paths";
import { validateTokenPresetTokens, validateTokenPresets } from "./validate";

describe("token-preset-contract", () => {
  it("标准 14 键", () => {
    assert.equal(TOKEN_PRESET_STANDARD_KEYS.length, 14);
  });

  it("STANDARD_THEME_REF_PATHS 与 14 键一一对应", () => {
    assert.equal(STANDARD_THEME_REF_PATHS.length, 14);
    assert.ok(isStandardThemeRefPath("colors.primary"));
    assert.ok(isStandardThemeRefPath("tokens.spacing.gap"));
    assert.equal(isStandardThemeRefPath("brand.main"), false);
  });

  it("拒绝非标准 family", () => {
    const issues = validateTokenPresetTokens("tokens", { brand: { main: "#000" } });
    assert.ok(issues.some((i) => i.reason.includes("非标准 token family")));
  });

  it("接受完整 14 键 tokens", () => {
    const tokens = {
      colors: { primary: "#111", secondary: "#666", surface: "#fff" },
      fonts: { heading: "Georgia", body: "Arial" },
      spacing: { section: "24px", gap: "8px", pageInline: "16px" },
      typography: { display: "36px", h1: "24px", body: "15px", caption: "12px" },
      radius: { panel: "8px", cta: "9999px" },
    };
    assert.deepEqual(validateTokenPresetTokens("tokens", tokens), []);
  });

  it("拒绝 fonts 写入 CSS 字体栈", () => {
    const tokens = {
      colors: { primary: "#111", secondary: "#666", surface: "#fff" },
      fonts: {
        heading: "Georgia, 'Times New Roman', Times, serif",
        body: "Arial",
      },
      spacing: { section: "24px", gap: "8px", pageInline: "16px" },
      typography: { display: "36px", h1: "24px", body: "15px", caption: "12px" },
      radius: { panel: "8px", cta: "9999px" },
    };
    const issues = validateTokenPresetTokens("tokens", tokens);
    assert.ok(issues.some((i) => i.path === "tokens.fonts.heading" && i.reason.includes("白名单")));
  });

  it("拒绝 fonts 白名单外主字体", () => {
    const tokens = {
      colors: { primary: "#111", secondary: "#666", surface: "#fff" },
      fonts: { heading: "Comic Sans MS", body: "Arial" },
      spacing: { section: "24px", gap: "8px", pageInline: "16px" },
      typography: { display: "36px", h1: "24px", body: "15px", caption: "12px" },
      radius: { panel: "8px", cta: "9999px" },
    };
    const issues = validateTokenPresetTokens("tokens", tokens);
    assert.ok(issues.some((i) => i.path === "tokens.fonts.heading" && i.reason.includes("白名单")));
  });

  it("拒绝 spacing 超过 24px", () => {
    const tokens = {
      colors: { primary: "#111", secondary: "#666", surface: "#fff" },
      fonts: { heading: "Georgia", body: "Arial" },
      spacing: { section: "28px", gap: "8px", pageInline: "16px" },
      typography: { display: "36px", h1: "24px", body: "15px", caption: "12px" },
      radius: { panel: "8px", cta: "9999px" },
    };
    const issues = validateTokenPresetTokens("tokens", tokens);
    assert.ok(issues.some((i) => i.reason.includes("不得超过 24px")));
  });

  it("validateTokenPresets 外壳字段", () => {
    const issues = validateTokenPresets({ schemaVersion: "1.0.0", activePresetId: "x", presets: {} });
    assert.ok(issues.some((i) => i.path === "tokenPresets.presets"));
  });
});
