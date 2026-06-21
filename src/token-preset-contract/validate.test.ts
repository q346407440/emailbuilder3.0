import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TOKEN_PRESET_STANDARD_KEYS } from "./standard-keys";
import { STANDARD_THEME_REF_PATHS, isStandardThemeRefPath } from "./theme-ref-paths";
import { validateTokenPresetTokens, validateTokenPresets } from "./validate";
import { createDefaultTokenPresets } from "../lib/defaultTokenPresets";

const FULL_TOKENS = {
  colors: { primary: "#111", accent: "#1A1A1A", secondary: "#666", surface: "#fff" },
  spacing: { section: "24px", gap: "8px", pageInline: "16px" },
  typography: { display: "36px", h1: "24px", body: "15px", caption: "12px" },
  radius: { panel: "8px", cta: "9999px" },
};

describe("token-preset-contract", () => {
  it("标准 13 键", () => {
    assert.equal(TOKEN_PRESET_STANDARD_KEYS.length, 13);
  });

  it("STANDARD_THEME_REF_PATHS 与 13 键一一对应", () => {
    assert.equal(STANDARD_THEME_REF_PATHS.length, 13);
    assert.ok(isStandardThemeRefPath("colors.primary"));
    assert.ok(isStandardThemeRefPath("colors.accent"));
    assert.ok(isStandardThemeRefPath("tokens.spacing.gap"));
    assert.equal(isStandardThemeRefPath("brand.main"), false);
  });

  it("拒绝非标准 family", () => {
    const issues = validateTokenPresetTokens("tokens", { brand: { main: "#000" } });
    assert.ok(issues.some((i) => i.reason.includes("非标准 token family")));
  });

  it("拒绝非标准 token family", () => {
    const tokens = {
      ...FULL_TOKENS,
      legacyFamily: { scaleA: "x" },
    };
    const issues = validateTokenPresetTokens("tokens", tokens);
    assert.ok(issues.some((i) => i.path === "tokens.legacyFamily" && i.reason.includes("非标准 token family")));
  });

  it("接受完整 13 键 tokens", () => {
    assert.deepEqual(validateTokenPresetTokens("tokens", FULL_TOKENS), []);
  });

  it("缺少 colors.accent 时报错", () => {
    const tokens = {
      ...FULL_TOKENS,
      colors: { primary: "#111", secondary: "#666", surface: "#fff" },
    };
    const issues = validateTokenPresetTokens("tokens", tokens);
    assert.ok(issues.some((i) => i.path === "tokens.colors.accent"));
  });

  it("接受 spacing 超过 24px（无全局上限校验）", () => {
    const tokens = {
      ...FULL_TOKENS,
      spacing: { section: "32px", gap: "8px", pageInline: "16px" },
    };
    const issues = validateTokenPresetTokens("tokens", tokens);
    assert.deepEqual(issues, []);
  });

  it("validateTokenPresets 外壳字段", () => {
    const issues = validateTokenPresets({ schemaVersion: "1.0.0", activePresetId: "x", presets: {} });
    assert.ok(issues.some((i) => i.path === "tokenPresets.presets"));
  });

  it("createDefaultTokenPresets 符合标准 13 键", () => {
    const issues = validateTokenPresets(createDefaultTokenPresets());
    assert.deepEqual(issues, []);
  });
});
