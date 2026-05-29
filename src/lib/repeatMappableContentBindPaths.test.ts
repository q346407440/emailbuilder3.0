import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailBlock } from "../types/email";
import type { EmailTemplate } from "../types/email";
import {
  hasAuthoritativeTextBody,
  listRepeatMappableContentBindPaths,
  repeatMappingFieldShortLabel,
  repeatMappingTabLabel,
  repeatMappingTargetLabel,
} from "./repeatMappableContentBindPaths";

function textBlock(overrides: Partial<EmailBlock> = {}): EmailBlock {
  return {
    id: "t",
    type: "text",
    parentId: "p",
    children: [],
    wrapperStyle: {},
    props: {
      textBody: { paragraphs: [{ runs: [{ text: "Hi" }] }] },
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {},
    ...overrides,
  } as EmailBlock;
}

describe("repeatMappableContentBindPaths", () => {
  it("text 块仅列出 textBody run 路径", () => {
    const block = textBlock({
      bindings: {
        "props.textBody.paragraphs.0.runs.0.text": {
          mode: "variable",
          slotId: "items",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: "0.title",
        },
      },
    });
    assert.equal(hasAuthoritativeTextBody(block), true);
    const paths = listRepeatMappableContentBindPaths(block);
    assert.deepEqual(paths, ["props.textBody.paragraphs.0.runs.0.text"]);
  });

  it("忽略 props.content 绑定", () => {
    const block = textBlock({
      bindings: {
        "props.content": {
          mode: "variable",
          slotId: "title",
          valueType: "string",
          allowExternal: true,
          fieldKind: "content",
        },
        "props.textBody.paragraphs.0.runs.0.text": {
          mode: "variable",
          slotId: "items",
          valueType: "collection",
          allowExternal: true,
          fieldKind: "content",
          slotPath: "0.title",
        },
      },
    });
    assert.deepEqual(listRepeatMappableContentBindPaths(block), [
      "props.textBody.paragraphs.0.runs.0.text",
    ]);
  });
});

describe("repeatMapping labels", () => {
  const template = {
    blockMeta: { "b-title": { name: "权益标题" }, "b-icon": { name: "权益图标" } },
    blocks: {},
  } as unknown as EmailTemplate;

  it("textBody 路径显示为正文而非完整 bindPath", () => {
    const bindPath = "props.textBody.paragraphs.0.runs.0.text";
    assert.equal(repeatMappingFieldShortLabel(bindPath), "正文");
    assert.equal(repeatMappingTargetLabel(template, "b-title", bindPath), "权益标题 正文");
  });

  it("同区块仅一个映射目标时 Tab 只显示区块名", () => {
    const targets = [{ blockId: "b-title", bindPath: "props.textBody.paragraphs.0.runs.0.text" }];
    assert.equal(
      repeatMappingTabLabel(template, "b-title", targets[0].bindPath, targets),
      "权益标题"
    );
  });

  it("同区块多个映射目标时 Tab 带字段短名", () => {
    const targets = [
      { blockId: "b-icon", bindPath: "props.src" },
      { blockId: "b-icon", bindPath: "props.link" },
    ];
    assert.equal(repeatMappingTabLabel(template, "b-icon", "props.src", targets), "权益图标 图片地址");
    assert.equal(repeatMappingTabLabel(template, "b-icon", "props.link", targets), "权益图标 链接");
  });
});
