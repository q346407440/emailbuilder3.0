import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIELD_SOURCE_MODE_LABEL,
  resolveFieldSourcePillDisplay,
} from "./fieldSourceUiCopy";
import type { FieldSourceState } from "../hooks/useFieldSource";

function baseState(overrides: Partial<FieldSourceState>): FieldSourceState {
  return {
    source: "literal",
    locked: false,
    detached: false,
    fieldKind: "style",
    canBindTheme: true,
    canBindVariable: false,
    canDetachVariable: false,
    ...overrides,
  };
}

describe("resolveFieldSourcePillDisplay", () => {
  it("手动态胶囊与菜单主文案一致（不再使用「自由」）", () => {
    const display = resolveFieldSourcePillDisplay({
      state: baseState({ source: "literal", fieldKind: "style" }),
      contentCapsuleMode: null,
    });
    assert.equal(display.label, FIELD_SOURCE_MODE_LABEL.manual);
    assert.equal(display.variant, "literal");
  });

  it("跟随样式预设时胶囊显示「样式预设」", () => {
    const display = resolveFieldSourcePillDisplay({
      state: baseState({ source: "theme", locked: true, canBindTheme: false }),
      contentCapsuleMode: null,
    });
    assert.equal(display.label, FIELD_SOURCE_MODE_LABEL.theme);
    assert.equal(display.variant, "theme");
  });

  it("解除跟随后胶囊仍为「手动填写」且带 detached 样式", () => {
    const display = resolveFieldSourcePillDisplay({
      state: baseState({ source: "theme", detached: true }),
      contentCapsuleMode: null,
    });
    assert.equal(display.label, FIELD_SOURCE_MODE_LABEL.manual);
    assert.equal(display.detached, true);
  });

  it("列表行内映射显示「列表字段 · 列名」", () => {
    const display = resolveFieldSourcePillDisplay({
      state: baseState({ source: "variable", fieldKind: "content", locked: true }),
      contentCapsuleMode: "listItem",
      listItemFieldLabel: "商品标题",
    });
    assert.match(display.label, /列表字段/);
    assert.match(display.label, /商品标题/);
    assert.equal(display.variant, "list-item");
  });
});
