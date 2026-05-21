import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getFontFamilyCatalogEntry } from "./catalog";
import {
  checkTokenPresetFontStorageValue,
  coercePersistedFontFamily,
  DEFAULT_EMAIL_FONT_FAMILY,
  DEFAULT_THEME_FONT_SINGLE,
  EMAIL_FONT_FAMILY_OPTIONS,
  normalizeTokenPresetFontStorageValue,
  resolveRenderFontFamily,
  storedSingleFontToCssFamily,
} from "./resolve";

describe("FONT_FAMILY_CATALOG 派生", () => {
  it("备选项 value 均为 persisted 落盘值", () => {
    assert.equal(EMAIL_FONT_FAMILY_OPTIONS.length, 4);
    for (const opt of EMAIL_FONT_FAMILY_OPTIONS) {
      const entry = [...EMAIL_FONT_FAMILY_OPTIONS].find((o) => o.value === opt.value);
      assert.ok(entry);
    }
    assert.equal(getFontFamilyCatalogEntry("segoeUi").persisted, "'Segoe UI'");
  });

  it("默认档位为 Source Sans 3", () => {
    assert.equal(DEFAULT_THEME_FONT_SINGLE, "'Source Sans 3'");
    assert.equal(DEFAULT_EMAIL_FONT_FAMILY, "'Source Sans 3', sans-serif");
  });
});

describe("coercePersistedFontFamily", () => {
  it("白名单 persisted 原样保留", () => {
    assert.equal(coercePersistedFontFamily("Georgia"), "Georgia");
    assert.equal(coercePersistedFontFamily("'Segoe UI'"), "'Segoe UI'");
  });

  it("旧版 CSS 栈收敛为白名单 persisted", () => {
    assert.equal(coercePersistedFontFamily("Georgia, serif"), "Georgia");
    assert.equal(coercePersistedFontFamily("'Segoe UI', sans-serif"), "'Segoe UI'");
    assert.equal(
      coercePersistedFontFamily("'Helvetica Neue', Helvetica, Arial, sans-serif"),
      "Arial"
    );
  });

  it("无法识别时回落默认 Source Sans 3", () => {
    assert.equal(coercePersistedFontFamily("Comic Sans MS, fantasy"), "'Source Sans 3'");
  });
});

describe("checkTokenPresetFontStorageValue", () => {
  it("拒绝 CSS 字体栈", () => {
    const r = checkTokenPresetFontStorageValue("Georgia, serif");
    assert.equal(r.ok, false);
  });

  it("拒绝白名单外字体", () => {
    const r = checkTokenPresetFontStorageValue("Comic Sans MS");
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.reason, /白名单/);
  });

  it("接受白名单内 persisted", () => {
    const r = checkTokenPresetFontStorageValue("'Segoe UI'");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.normalized, "'Segoe UI'");
  });
});

describe("normalizeTokenPresetFontStorageValue", () => {
  it("系统 UI 栈收敛为 Segoe UI", () => {
    assert.equal(
      normalizeTokenPresetFontStorageValue(
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
      ),
      "'Segoe UI'"
    );
  });
});

describe("resolveRenderFontFamily", () => {
  it("persisted 展开为完整 CSS", () => {
    assert.equal(resolveRenderFontFamily("Georgia"), "Georgia, serif");
    assert.equal(resolveRenderFontFamily("'Segoe UI'"), "'Segoe UI', sans-serif");
  });
});

describe("storedSingleFontToCssFamily", () => {
  it("衬线族追加 serif", () => {
    assert.equal(storedSingleFontToCssFamily("Georgia", DEFAULT_THEME_FONT_SINGLE), "Georgia, serif");
  });
});
