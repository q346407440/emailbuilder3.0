import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isThemeRef } from "../../types/themeRef";
import {
  applyStyleKeysToBlockFields,
  coerceBoolean,
  isValidFontSizeLiteral,
  resolveFontSizeOrBodyDefault,
  resolveValidFontSize,
} from "./literalStyleExpand";
import { AI_PIPELINE_B1_FALLBACK_TOKENS } from "./b1StyleTierPresets";

describe("coerceBoolean", () => {
  it("undefined/null 回落 fallback", () => {
    assert.equal(coerceBoolean(undefined, false), false);
    assert.equal(coerceBoolean(null, true), true);
  });

  it("字符串 true/false", () => {
    assert.equal(coerceBoolean("true", false), true);
    assert.equal(coerceBoolean("false", true), false);
  });
});

describe("isValidFontSizeLiteral", () => {
  it("接受 px/em/rem/%", () => {
    assert.equal(isValidFontSizeLiteral("24px"), true);
    assert.equal(isValidFontSizeLiteral("1.2em"), true);
    assert.equal(isValidFontSizeLiteral("h1"), false);
  });
});

describe("resolveValidFontSize", () => {
  it("接受 px 字面量", () => {
    assert.equal(resolveValidFontSize("18px", AI_PIPELINE_B1_FALLBACK_TOKENS), "18px");
  });

  it("裸档名 h1/caption 视为非法", () => {
    assert.equal(resolveValidFontSize("h1", AI_PIPELINE_B1_FALLBACK_TOKENS), undefined);
    assert.equal(resolveValidFontSize("caption", AI_PIPELINE_B1_FALLBACK_TOKENS), undefined);
  });

  it("typography 点路径展开为合法字面量", () => {
    assert.equal(
      resolveValidFontSize("typography.display", AI_PIPELINE_B1_FALLBACK_TOKENS),
      "32px"
    );
  });
});

describe("resolveFontSizeOrBodyDefault", () => {
  it("非法值回退 typography.body", () => {
    assert.equal(
      resolveFontSizeOrBodyDefault("h1", AI_PIPELINE_B1_FALLBACK_TOKENS),
      AI_PIPELINE_B1_FALLBACK_TOKENS.typography.body
    );
    assert.equal(
      resolveFontSizeOrBodyDefault(undefined, AI_PIPELINE_B1_FALLBACK_TOKENS),
      AI_PIPELINE_B1_FALLBACK_TOKENS.typography.body
    );
  });
});

describe("applyStyleKeysToBlockFields", () => {
  it("styleKeys.bold 始终写入布尔", () => {
    const { props } = applyStyleKeysToBlockFields(
      { bold: "true" as unknown as boolean },
      AI_PIPELINE_B1_FALLBACK_TOKENS,
      { props: {} }
    );
    assert.equal(props.bold, true);
    assert.equal(typeof props.bold, "boolean");
  });

  it("styleKeys.fontSize 非法时不写入，由 E 阶段回退 body", () => {
    const { props } = applyStyleKeysToBlockFields(
      { fontSize: "h1", color: "#E2CF2E" },
      AI_PIPELINE_B1_FALLBACK_TOKENS,
      { props: {} }
    );
    assert.equal(props.fontSize, undefined);
    assert.equal(props.color, "#E2CF2E");
  });

  it("嵌套 buttonStyle.backgroundColorBind 写入 colors.primary", () => {
    const { props, agentBoundPaths } = applyStyleKeysToBlockFields(
      {
        buttonStyle: {
          backgroundColor: "#E2D136",
          backgroundColorBind: "colors.primary",
          textColor: "#1A1A1A",
        },
      },
      AI_PIPELINE_B1_FALLBACK_TOKENS,
      { props: {} }
    );
    const bg = (props.buttonStyle as Record<string, unknown>).backgroundColor;
    assert.equal(isThemeRef(bg), true);
    assert.equal((bg as { $themeRef: string }).$themeRef, "colors.primary");
    assert.ok(agentBoundPaths.includes("props.buttonStyle.backgroundColor"));
  });

  it("colorBind 合法时写入 $themeRef", () => {
    const { props, agentBoundPaths } = applyStyleKeysToBlockFields(
      { color: "#4B5563", colorBind: "colors.secondary" },
      AI_PIPELINE_B1_FALLBACK_TOKENS,
      { props: {} }
    );
    assert.equal(isThemeRef(props.color), true);
    assert.equal((props.color as { $themeRef: string }).$themeRef, "colors.secondary");
    assert.deepEqual(agentBoundPaths, ["props.color"]);
  });
});
