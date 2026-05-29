import assert from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import type { EmailTemplate } from "../types/email";
import { validateTemplate } from "../lib/validate";
import {
  collectionBindingUsesItemIndex,
  resolveEffectiveBindingSlotValueType,
  stripLeadingCollectionIndex,
} from "./repeat-list-item-binding";
import { validateVariableBindingFieldCompatibility } from "./variable-slot-compatibility";

const TEXT_RUN_BIND = "props.textBody.paragraphs.0.runs.0.text";

function tpl(blocks: EmailTemplate["blocks"]): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    emailId: "t",
    templateId: "t",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: "root",
    blocks,
  };
}

describe("repeat-list-item-binding", () => {
  it("stripLeadingCollectionIndex / collectionBindingUsesItemIndex", () => {
    assert.equal(stripLeadingCollectionIndex("0.iconSrc"), "iconSrc");
    assert.equal(collectionBindingUsesItemIndex("0.title"), true);
    assert.equal(collectionBindingUsesItemIndex("memberBenefits"), false);
  });

  it("resolveEffectiveBindingSlotValueType：行模板内 collection 解析为 itemField 类型", () => {
    const template = tpl({
      host: {
        id: "host",
        type: "layout",
        parentId: "root",
        children: ["icon", "text"],
        repeat: {
          mode: "collection",
          slotId: "items",
          prototypeChildIds: ["icon", "text"],
          fallbackChildIds: ["icon", "text"],
          itemFields: [
            { key: "title", label: "标题", valueType: "string", required: true },
            { key: "iconSrc", label: "图标", valueType: "image", required: true },
          ],
        },
        wrapperStyle: {},
        props: { direction: "vertical" },
      },
      icon: {
        id: "icon",
        type: "icon",
        parentId: "host",
        children: [],
        wrapperStyle: {},
        props: { src: "", color: "#000", size: "16px", link: "" },
        bindings: {
          "props.src": {
            slotId: "items",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            slotPath: "0.iconSrc",
          },
        },
      },
      text: {
        id: "text",
        type: "text",
        parentId: "host",
        children: [],
        wrapperStyle: {},
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {
          [TEXT_RUN_BIND]: {
            slotId: "items",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            slotPath: "0.title",
          },
        },
      },
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["host"],
        props: { width: "600px" },
      },
    });

    const iconSpec = template.blocks.icon!.bindings!["props.src"]!;
    assert.equal(
      resolveEffectiveBindingSlotValueType(iconSpec, { template, blockId: "icon" }),
      "image"
    );
    const textSpec = template.blocks.text!.bindings![TEXT_RUN_BIND]!;
    assert.equal(
      resolveEffectiveBindingSlotValueType(textSpec, { template, blockId: "text" }),
      "string"
    );

    assert.equal(
      validateVariableBindingFieldCompatibility(
        template.blocks.icon!,
        "props.src",
        resolveEffectiveBindingSlotValueType(iconSpec, { template, blockId: "icon" })
      ),
      null
    );
    assert.equal(
      validateVariableBindingFieldCompatibility(
        template.blocks.text!,
        TEXT_RUN_BIND,
        resolveEffectiveBindingSlotValueType(textSpec, { template, blockId: "text" })
      ),
      null
    );
  });

  it("同块其它绑定声明 itemFields 时解析静态格子的 collection 项字段", () => {
    const template = tpl({
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["cell"],
        props: { width: "600px" },
      },
      cell: {
        id: "cell",
        type: "layout",
        parentId: "root",
        children: [],
        wrapperStyle: {
          backgroundImage: {
            src: "https://example.com/a.jpg",
            alt: "A",
            link: "https://example.com",
          },
        },
        props: { direction: "vertical" },
        bindings: {
          "wrapperStyle.backgroundImage.src": {
            slotId: "products",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            slotPath: "0.imageSrc",
            itemFields: [
              { key: "imageSrc", label: "图", valueType: "image", required: true },
              { key: "imageAlt", label: "替代文字", valueType: "string", required: true },
              { key: "href", label: "链接", valueType: "url", required: true },
            ],
          },
          "wrapperStyle.backgroundImage.alt": {
            slotId: "products",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            slotPath: "0.imageAlt",
          },
          "wrapperStyle.backgroundImage.link": {
            slotId: "products",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            slotPath: "0.href",
          },
        },
      },
    });

    const altSpec = template.blocks.cell!.bindings!["wrapperStyle.backgroundImage.alt"]!;
    assert.equal(
      resolveEffectiveBindingSlotValueType(altSpec, { template, blockId: "cell" }),
      "string"
    );
    const linkSpec = template.blocks.cell!.bindings!["wrapperStyle.backgroundImage.link"]!;
    assert.equal(
      resolveEffectiveBindingSlotValueType(linkSpec, { template, blockId: "cell" }),
      "url"
    );
  });

  it("member-welcome centered：列表行内绑定不再误报不兼容", () => {
    const template = JSON.parse(
      readFileSync("data/emails/member-welcome/layouts/centered/template.json", "utf8")
    ) as EmailTemplate;
    const incompat = validateTemplate(template).filter((i) => i.reason?.includes("不兼容"));
    assert.equal(incompat.length, 0);
  });
});
