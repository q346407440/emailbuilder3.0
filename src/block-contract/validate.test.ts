import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { layoutContainerContract } from "./by-type/layout.container";
import { layoutGridContract } from "./by-type/layout.grid";
import { contentTextContract } from "./by-type/content.text";
import { emailRootContract } from "./by-type/email.root";
import { resolveBlockContract } from "./registry";
import { validateTemplateBlockContracts } from "./validate";
import type { EmailBlock, EmailTemplate } from "../types/email";

function minimalTemplate(block: EmailBlock): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: [block.id],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
        },
        props: {
          backgroundColor: "#fff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      [block.id]: block,
    },
    blockMeta: {
      root: { blockType: "layout.container", name: "根" },
      [block.id]: {
        blockType:
          block.type === "layout"
            ? "layout.container"
            : block.type === "image"
              ? "content.image"
              : "content.text",
        name: "样本",
      },
    },
  };
}

describe("block-contract", () => {
  it("email.root 允许内容区背景图 backgroundImage", () => {
    assert.ok(emailRootContract.allowedPrefixes.includes("wrapperStyle.backgroundImage"));
    const root: EmailBlock = {
      id: "root",
      type: "emailRoot",
      parentId: null,
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        backgroundImage: {
          src: "https://example.com/root.jpg",
          link: "",
          fit: "cover",
          position: "center",
        },
      },
      props: {
        backgroundColor: "#fff",
        width: "600px",
        padding: { mode: "unified", unified: "24px" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      },
      bindings: {},
    };
    const template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: { root },
      blockMeta: { root: { blockType: "layout.container", name: "根" } },
    };
    assert.deepEqual(validateTemplateBlockContracts(template), []);
  });

  it("layout.grid 允许 wrapperStyle.backgroundImage", () => {
    assert.ok(layoutGridContract.allowedPrefixes.some((p) => p.includes("backgroundImage")));
    const block: EmailBlock = {
      id: "grid1",
      type: "grid",
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "200px",
        padding: { mode: "unified", unified: "8px" },
        backgroundImage: {
          src: "https://example.com/grid-bg.jpg",
          link: "",
          fit: "cover",
          position: "center",
        },
      },
      props: {
        columns: 2,
        gap: "12px",
        cellWidthMode: "auto",
        cellHeightMode: "content-max",
      },
      bindings: {},
    };
    const template = minimalTemplate(block);
    template.blockMeta![block.id] = { blockType: "layout.grid", name: "栅格" };
    assert.deepEqual(validateTemplateBlockContracts(template), []);
  });

  it("layout.container 允许 backgroundImage 与 padding", () => {
    assert.ok(layoutContainerContract.allowedPrefixes.some((p) => p.includes("backgroundImage")));
    const block: EmailBlock = {
      id: "lay1",
      type: "layout",
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "200px",
        padding: { mode: "unified", unified: "8px" },
        backgroundImage: {
          src: "https://example.com/a.jpg",
          link: "",
          fit: "cover",
          position: "center",
        },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {},
    };
    assert.deepEqual(validateTemplateBlockContracts(minimalTemplate(block)), []);
  });

  it("content.image 允许叠放方向与间距 props", () => {
    const block: EmailBlock = {
      id: "img1",
      type: "image",
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "200px",
        padding: { mode: "unified", unified: "8px" },
        backgroundImage: {
          src: "https://example.com/a.jpg",
          link: "",
          fit: "cover",
          position: "center",
        },
      },
      props: { direction: "horizontal", gapMode: "fixed", gap: "12px" },
      bindings: {},
    };
    assert.deepEqual(validateTemplateBlockContracts(minimalTemplate(block)), []);
  });

  it("拒绝 wrapperStyle 白名单外字段", () => {
    const block: EmailBlock = {
      id: "lay1",
      type: "layout",
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        overlayInset: { mode: "unified", unified: "0" },
      } as EmailBlock["wrapperStyle"],
      props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      bindings: {},
    };
    const issues = validateTemplateBlockContracts(minimalTemplate(block));
    assert.ok(issues.some((i) => i.path.includes("overlayInset")));
  });

  it("emailRoot 始终解析为 email.root 契约", () => {
    const root: EmailBlock = {
      id: "root",
      type: "emailRoot",
      parentId: null,
      children: [],
      wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      props: {
        backgroundColor: "#fff",
        width: "600px",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gap: "0",
      },
      bindings: {},
    };
    const c = resolveBlockContract(root, {
      blockMeta: { root: { blockType: "layout.container", name: "根" } },
    });
    assert.equal(c?.blockType, "email.root");
  });

  it("emailRoot 壳层不允许 repeat（列表重复仅 layout/grid）", () => {
    const root = {
      id: "root",
      type: "emailRoot",
      parentId: null,
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
      },
      props: {
        backgroundColor: "#fff",
        width: "600px",
        padding: { mode: "unified", unified: "0" },
        border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
        gapMode: "fixed",
        gap: "0",
      },
      bindings: {},
      repeat: {
        mode: "collection",
        slotId: "items",
        prototypeChildIds: [],
        itemFields: [],
        fieldMappings: [],
      },
    } as unknown as EmailBlock;
    const template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: { root },
      blockMeta: { root: { blockType: "layout.container", name: "根" } },
    };
    const issues = validateTemplateBlockContracts(template);
    assert.ok(issues.some((i) => i.path === "blocks.root.repeat"));
  });

  it("text 允许 textBody 子路径", () => {
    assert.ok(contentTextContract.allowedPrefixes.includes("props.textBody"));
  });
});
