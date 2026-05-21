import assert from "node:assert/strict";
import test from "node:test";
import { EMAIL_TEMPLATE_SCHEMA_VERSION, type EmailBlock, type EmailTemplate } from "../types/email";
import { placementParentKindForBlock } from "./placementParentContext";

function minimalTemplate(rootChildren: string[], blocks: Record<string, EmailBlock>): EmailTemplate {
  const rootId = "root";
  const root = {
    id: rootId,
    type: "emailRoot" as const,
    parentId: null,
    children: rootChildren,
    wrapperStyle: { placement: { horizontal: "center" }, widthMode: "fill" as const, heightMode: "hug" as const },
    props: {
      width: "600px",
      backgroundColor: "#fff",
      padding: { mode: "unified" as const, unified: "0" },
      gapMode: "fixed" as const,
      gap: "0",
    },
  } as unknown as EmailBlock;
  return {
    schemaVersion: EMAIL_TEMPLATE_SCHEMA_VERSION,
    emailId: "t",
    templateId: "t",
    templateVersion: 1,
    locale: "zh-CN",
    rootBlockId: rootId,
    blockMeta: {},
    blocks: { [rootId]: root, ...blocks },
  };
}

test("emailRoot 子项为 tableStackCell", () => {
  const tid = "t1";
  const t = minimalTemplate([tid], {
    t1: {
      id: tid,
      type: "text",
      parentId: "root",
      children: [],
      wrapperStyle: { widthMode: "fill", heightMode: "hug", contentAlign: { horizontal: "left" } },
      props: {
        content: "<p></p>",
        bold: false,
        italic: false,
        decoration: "none",
      },
    } as EmailBlock,
  });
  assert.equal(placementParentKindForBlock(t, tid), "tableStackCell");
});

test("横向 layout 子项为 tableRowCell", () => {
  const lid = "lay";
  const cid = "child";
  const t = minimalTemplate([lid], {
    lay: {
      id: lid,
      type: "layout",
      parentId: "root",
      children: [cid],
      wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      props: { direction: "horizontal", gap: "8px" },
    } as EmailBlock,
    child: {
      id: cid,
      type: "text",
      parentId: lid,
      children: [],
      wrapperStyle: { widthMode: "hug", heightMode: "hug", contentAlign: { horizontal: "left" } },
      props: {
        content: "<p></p>",
        bold: false,
        italic: false,
        decoration: "none",
      },
    } as EmailBlock,
  });
  assert.equal(placementParentKindForBlock(t, cid), "tableRowCell");
});

test("grid 子项为 tableMatrixCell", () => {
  const gid = "g";
  const cid = "c";
  const t = minimalTemplate([gid], {
    g: {
      id: gid,
      type: "grid",
      parentId: "root",
      children: [cid],
      wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      props: { columns: 2, gap: "8px" },
    } as EmailBlock,
    c: {
      id: cid,
      type: "text",
      parentId: gid,
      children: [],
      wrapperStyle: { widthMode: "fill", heightMode: "hug", contentAlign: { horizontal: "left" } },
      props: {
        content: "<p></p>",
        bold: false,
        italic: false,
        decoration: "none",
      },
    } as EmailBlock,
  });
  assert.equal(placementParentKindForBlock(t, cid), "tableMatrixCell");
});

test("image 子项为 tableStackCell（与纵向叠放槽一致）", () => {
  const iid = "hero-img";
  const cid = "overlay-text";
  const t = minimalTemplate([iid], {
    [iid]: {
      id: iid,
      type: "image",
      parentId: "root",
      children: [cid],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        backgroundImage: {
          src: "https://example.com/a.jpg",
          fit: "cover",
          position: "center",
          border: { mode: "unified", width: "0", style: "solid", color: "transparent" },
          borderRadius: { mode: "unified", radius: "0" },
        },
      },
      props: {},
      bindings: {},
    } as EmailBlock,
    [cid]: {
      id: cid,
      type: "text",
      parentId: iid,
      children: [],
      wrapperStyle: { widthMode: "fill", heightMode: "hug", contentAlign: { horizontal: "left" } },
      props: {
        content: "<p></p>",
        bold: false,
        italic: false,
        decoration: "none",
      },
    } as EmailBlock,
  });
  assert.equal(placementParentKindForBlock(t, cid), "tableStackCell");
});
