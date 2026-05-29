import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOKEN_PRESET_STANDARD_KEYS } from "./standard-keys";
import { STANDARD_THEME_REF_PATHS, isStandardThemeRefPath } from "./theme-ref-paths";
import { validateTokenPresetTokens, validateTokenPresets } from "./validate";

describe("token-preset-contract", () => {
  it("标准 12 键", () => {
    assert.equal(TOKEN_PRESET_STANDARD_KEYS.length, 12);
  });

  it("STANDARD_THEME_REF_PATHS 与 12 键一一对应", () => {
    assert.equal(STANDARD_THEME_REF_PATHS.length, 12);
    assert.ok(isStandardThemeRefPath("colors.primary"));
    assert.ok(isStandardThemeRefPath("tokens.spacing.gap"));
    assert.equal(isStandardThemeRefPath("brand.main"), false);
  });

  it("拒绝非标准 family", () => {
    const issues = validateTokenPresetTokens("tokens", { brand: { main: "#000" } });
    assert.ok(issues.some((i) => i.reason.includes("非标准 token family")));
  });

  it("拒绝非标准 token family", () => {
    const tokens = {
      colors: { primary: "#111", secondary: "#666", surface: "#fff" },
      legacyFamily: { scaleA: "x" },
      spacing: { section: "24px", gap: "8px", pageInline: "16px" },
      typography: { display: "36px", h1: "24px", body: "15px", caption: "12px" },
      radius: { panel: "8px", cta: "9999px" },
    };
    const issues = validateTokenPresetTokens("tokens", tokens);
    assert.ok(issues.some((i) => i.path === "tokens.legacyFamily" && i.reason.includes("非标准 token family")));
  });

  it("接受完整 12 键 tokens", () => {
    const tokens = {
      colors: { primary: "#111", secondary: "#666", surface: "#fff" },
      spacing: { section: "24px", gap: "8px", pageInline: "16px" },
      typography: { display: "36px", h1: "24px", body: "15px", caption: "12px" },
      radius: { panel: "8px", cta: "9999px" },
    };
    assert.deepEqual(validateTokenPresetTokens("tokens", tokens), []);
  });

  it("拒绝 spacing 超过 24px", () => {
    const tokens = {
      colors: { primary: "#111", secondary: "#666", surface: "#fff" },
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
