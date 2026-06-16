import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  flattenCompactStyleKeys,
  normalizeStyleKeysFromCompact,
  resolveAgentStyleField,
  styleKeyToFieldKind,
} from "./agentStyleValue";
import { AI_PIPELINE_B1_FALLBACK_TOKENS } from "./b1StyleTierPresets";

describe("flattenCompactStyleKeys", () => {
  it("展平嵌套 buttonStyle", () => {
    const flat = flattenCompactStyleKeys({
      buttonStyle: {
        backgroundColor: "#E2D136",
        backgroundColorBind: "colors.primary",
        textColor: "#1A1A1A",
      },
      color: "#6B7280",
      colorBind: "colors.secondary",
    });
    assert.equal(flat["buttonStyle.backgroundColor"], "#E2D136");
    assert.equal(flat["buttonStyle.backgroundColorBind"], "colors.primary");
    assert.equal(flat["buttonStyle.textColor"], "#1A1A1A");
    assert.equal(flat.color, "#6B7280");
    assert.equal(flat.colorBind, "colors.secondary");
  });
});

describe("normalizeStyleKeysFromCompact", () => {
  it("合并 color 与 colorBind", () => {
    const m = normalizeStyleKeysFromCompact({
      color: "#1A1A1A",
      colorBind: "colors.secondary",
    });
    assert.deepEqual(m.get("color"), { literal: "#1A1A1A", tokenPath: "colors.secondary" });
  });

  it("支持对象形态 literal+tokenPath", () => {
    const m = normalizeStyleKeysFromCompact({
      color: { literal: "#6B7280", tokenPath: "colors.secondary" },
    });
    assert.deepEqual(m.get("color"), { literal: "#6B7280", tokenPath: "colors.secondary" });
  });
});

describe("resolveAgentStyleField", () => {
  it("合法 colorBind 升格为 bind", () => {
    const r = resolveAgentStyleField(
      { literal: "#4B5563", tokenPath: "colors.secondary" },
      styleKeyToFieldKind("color"),
      AI_PIPELINE_B1_FALLBACK_TOKENS
    );
    assert.equal(r.source, "bind");
    assert.equal(r.tokenPath, "colors.secondary");
    assert.equal(r.literal, "#4B5563");
  });

  it("字色禁止绑 colors.surface", () => {
    const r = resolveAgentStyleField(
      { literal: "#FFFFFF", tokenPath: "colors.surface" },
      "text-color",
      AI_PIPELINE_B1_FALLBACK_TOKENS
    );
    assert.equal(r.tokenPath, undefined);
    assert.equal(r.source, "literal");
    assert.equal(r.literal, "#FFFFFF");
  });

  it("Bind 非法时回落 literal", () => {
    const r = resolveAgentStyleField(
      { literal: "#1A1A1A", tokenPath: "colors.notreal" },
      "text-color",
      AI_PIPELINE_B1_FALLBACK_TOKENS
    );
    assert.equal(r.source, "literal");
    assert.equal(r.tokenPath, undefined);
  });

  it("嵌套 buttonStyle 合并后 backgroundColorBind 生效", () => {
    const m = normalizeStyleKeysFromCompact({
      buttonStyle: {
        backgroundColor: "#E2D136",
        backgroundColorBind: "colors.primary",
        textColor: "#1A1A1A",
      },
    });
    assert.deepEqual(m.get("buttonStyle.backgroundColor"), {
      literal: "#E2D136",
      tokenPath: "colors.primary",
    });
  });

  it("fontSizeBind 合法时 bind", () => {
    const r = resolveAgentStyleField(
      { literal: "24px", tokenPath: "tokens.typography.h1" },
      "font-size",
      AI_PIPELINE_B1_FALLBACK_TOKENS
    );
    assert.equal(r.source, "bind");
    assert.equal(r.tokenPath, "tokens.typography.h1");
  });
});
