import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock, EmailPayload, EmailTemplate } from "../types/email";
import { getFieldSource } from "./useFieldSource";
import { pathKeyFor } from "../lib/bindingUiMeta";

function makeTemplate(blocks: EmailTemplate["blocks"], meta?: Record<string, unknown>): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "test",
    templateVersion: 1,
    rootBlockId: "root",
    blocks,
    meta,
  };
}

function blockForTest(block: unknown): EmailBlock {
  return block as EmailBlock;
}

const emptyPayload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: {} };

describe("getFieldSource —— literal 态", () => {
  it("free 字段（content）应返回 literal + 可设为变量、不可主题", () => {
    const t = makeTemplate({
      btn: {
        id: "btn",
        type: "button",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { text: "Click", buttonStyle: {} },
      },
    });
    const s = getFieldSource(t, emptyPayload, "btn", "props.text");
    assert.equal(s.source, "literal");
    assert.equal(s.fieldKind, "content");
    assert.equal(s.locked, false);
    assert.equal(s.canBindTheme, false);
    assert.equal(s.canBindVariable, true);
  });

  it("free 字段（style）应返回 literal + 可主题、不可变量", () => {
    const t = makeTemplate({
      btn: {
        id: "btn",
        type: "button",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { text: "x", buttonStyle: { backgroundColor: "#fff" } },
      },
    });
    const s = getFieldSource(t, emptyPayload, "btn", "props.buttonStyle.backgroundColor");
    assert.equal(s.source, "literal");
    assert.equal(s.fieldKind, "style");
    assert.equal(s.canBindTheme, true);
    assert.equal(s.canBindVariable, false);
  });

  it("structural 字段不出胶囊（canBindTheme/Variable 都为 false）", () => {
    const t = makeTemplate({
      lay: {
        id: "lay",
        type: "layout",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { direction: "vertical" },
      },
    });
    const s = getFieldSource(t, emptyPayload, "lay", "props.direction");
    assert.equal(s.source, "literal");
    assert.equal(s.fieldKind, "structural");
    assert.equal(s.canBindTheme, false);
    assert.equal(s.canBindVariable, false);
  });
});

describe("getFieldSource —— variable 态", () => {
  it("variable follow（未 detached）应 source=variable、locked=true", () => {
    const t = makeTemplate({
      btn: {
        id: "btn",
        type: "button",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { text: "Click", buttonStyle: {} },
        bindings: {
          "props.text": {
            slotId: "ctaText",
            mode: "variable",
            valueType: "string",
            allowExternal: true,
            fieldKind: "content",
          },
        },
      },
    });
    const s = getFieldSource(t, emptyPayload, "btn", "props.text");
    assert.equal(s.source, "variable");
    assert.equal(s.locked, true);
    assert.equal(s.detached, false);
    assert.equal(s.slotId, "ctaText");
  });

  it("variable detached 应 source=variable、locked=false、detached=true", () => {
    const t = makeTemplate({
      btn: {
        id: "btn",
        type: "button",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { text: "Click", buttonStyle: {} },
        bindings: {
          "props.text": {
            slotId: "ctaText",
            mode: "variable",
            valueType: "string",
            allowExternal: true,
            fieldKind: "content",
          },
        },
      },
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: { ctaText: { label: "CTA", valueType: "string" } },
      values: {},
      detachedVariableSlotIds: ["ctaText"],
    };
    const s = getFieldSource(t, payload, "btn", "props.text");
    assert.equal(s.source, "variable");
    assert.equal(s.locked, false);
    assert.equal(s.detached, true);
  });
});

describe("getFieldSource —— theme 态", () => {
  it("theme follow（值态 + bindings 登记）应 source=theme、locked=true", () => {
    const t = makeTemplate({
      txt: blockForTest({
        id: "txt",
        type: "text",
        parentId: null,
        children: [],
        wrapperStyle: {},
        props: { color: { $themeRef: "colors.brand" } },
        bindings: {
          "props.color": {
            slotId: "colors.brand",
            mode: "theme",
            tokenPath: "colors.brand",
            fieldKind: "style",
          },
        },
      }),
    });
    const s = getFieldSource(t, emptyPayload, "txt", "props.color");
    assert.equal(s.source, "theme");
    assert.equal(s.locked, true);
    assert.equal(s.detached, false);
    assert.equal(s.themeTokenPath, "colors.brand");
  });

  it("theme detached（meta.themeRestoreJson 有快照）应 source=theme、detached=true", () => {
    const t = makeTemplate(
      {
        txt: blockForTest({
          id: "txt",
          type: "text",
          parentId: null,
          children: [],
          wrapperStyle: {},
          props: { color: "#aabbcc" },
        }),
      },
      {
        easyEmailBindingUi: {
          themeRestoreJson: {
            [pathKeyFor("txt", "props.color")]: '{"$themeRef":"colors.brand"}',
          },
        },
      }
    );
    const s = getFieldSource(t, emptyPayload, "txt", "props.color");
    assert.equal(s.source, "theme");
    assert.equal(s.detached, true);
    assert.equal(s.locked, false);
  });
});
