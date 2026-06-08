import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { EmailBlock, EmailTemplate } from "../types/email";
import { extractBlockInsertPrototype } from "./extractBlockInsertPrototype";
import { buildCatalogSampleBlock } from "./buildCatalogSampleBlock";
import { BLOCK_CATALOG_ENTRIES } from "./blockDefaults";
import { buildBlockMasters } from "./masterCatalog";
import { applyInsertPrototypeToBlockMaster } from "./blockMasterInsertPrototype";

function minimalTemplate(block: EmailBlock): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "layout",
        parentId: null,
        children: [block.id],
        wrapperStyle: {},
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
        bindings: {},
      } as EmailBlock,
      [block.id]: block,
    },
    blockMeta: {
      root: { blockType: "layout.container", name: "根" },
      [block.id]: { blockType: "action.button", name: "按钮" },
    },
  };
}

describe("extractBlockInsertPrototype", () => {
  it("将主题引用与变量绑定物化为字面量", () => {
    const block: EmailBlock = {
      id: "btn1",
      type: "button",
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "hug",
        heightMode: "hug",
        contentAlign: { horizontal: "left", vertical: "top" },
      },
      props: {
        text: "立即购买",
        link: "https://shop.example.com",
        buttonStyle: {
          widthMode: "hug",
          backgroundColor: "#ff0000",
          textColor: "#ffffff",
          fontSize: "16px",
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          borderRadius: { mode: "unified", radius: "8px" },
          bold: true,
          italic: false,
        },
      },
      bindings: {
        "props.text": {
          mode: "variable",
          slotId: "ctaLabel",
          allowExternal: true,
          fieldKind: "content",
        },
      },
    };
    const template = minimalTemplate(block);
    const payload = {
      schemaVersion: "1.0.0" as const,
      slots: {
        ctaLabel: { slotId: "ctaLabel", label: "CTA", valueType: "string" as const },
      },
      values: { ctaLabel: "运营文案" },
    };

    const proto = extractBlockInsertPrototype({
      template,
      payload,
      blockId: "btn1",
      mergedBlock: {
        ...block,
        props: { ...block.props, text: "运营文案" },
      },
    });

    assert.equal(proto.props.text, "运营文案");
    assert.equal(proto.props.link, "https://shop.example.com");
    assert.equal((proto.props.buttonStyle as Record<string, unknown>).backgroundColor, "#ff0000");
    assert.equal(proto.wrapperStyle.widthMode, "hug");
  });
});

describe("buildCatalogSampleBlock", () => {
  it("优先使用已保存母版 sample", () => {
    const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.runtimeType === "button");
    assert.ok(entry);
    const masters = buildBlockMasters();
    const master = masters.find((m) => m.masterId === entry!.masterId);
    assert.ok(master);
    const sample = master!.blocks[master!.sampleBlockId]!;
    const sampleProps = sample.props as { buttonStyle?: unknown };
    const custom = applyInsertPrototypeToBlockMaster(master!, {
      props: { text: "自定义默认", link: "", buttonStyle: sampleProps.buttonStyle },
      wrapperStyle: sample.wrapperStyle as Record<string, unknown>,
    });
    const byId = { [custom.masterId]: custom };
    const block = buildCatalogSampleBlock(entry!, "new_btn", "root", byId);
    assert.equal((block.props as { text?: string }).text, "自定义默认");
    assert.deepEqual(block.bindings, {});
    assert.deepEqual(block.children, []);
  });
});
