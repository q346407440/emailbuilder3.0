import assert from "node:assert/strict";
import test from "node:test";
import type { EmailBlock, EmailTemplate } from "../types/email";
import { validateForbiddenLegacyProps } from "./forbiddenLegacyProps";
import { validateTemplate } from "../lib/validate";

function minimalTemplate(block: EmailBlock): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: [block.id],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          backgroundColor: "#fff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
      },
      [block.id]: block,
    },
    blockMeta: {
      root: { blockType: "email.root", name: "根" },
      [block.id]: { blockType: "layout.container", name: "样本" },
    },
  };
}

function assertForbidden(
  template: EmailTemplate,
  expectedPathSuffix: string
): void {
  const issues = validateForbiddenLegacyProps(template);
  assert.ok(
    issues.some((i) => i.path.endsWith(expectedPathSuffix)),
    `expected path *${expectedPathSuffix}, got ${issues.map((i) => i.path).join(", ")}`
  );
}

test("layout.crossAlign 报错", () => {
  assertForbidden(
    minimalTemplate({
      id: "lay",
      type: "layout",
      parentId: "root",
      children: [],
      wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      props: { direction: "vertical", gapMode: "fixed", gap: "0", crossAlign: "center" },
    }),
    "props.crossAlign"
  );
});

test("text.props.textBody.version 报错", () => {
  assertForbidden(
    minimalTemplate({
      id: "txt",
      type: "text",
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        contentAlign: { horizontal: "left", vertical: "top" },
      },
      props: {
        textBody: { version: 1, paragraphs: [{ runs: [{ text: "x" }] }] },
        fontSize: "14px",
        color: "#000",
        bold: false,
        italic: false,
        decoration: "none",
      },
    }),
    "props.textBody.version"
  );
});

test("text.props.content 与 bindings.props.content 报错", () => {
  const block: EmailBlock = {
    id: "txt",
    type: "text",
    parentId: "root",
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: { horizontal: "left", vertical: "top" },
    },
    props: {
      content: "<p>x</p>",
      fontSize: "14px",
      color: "#000",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: { "props.content": { fieldKind: "content", mode: "variable", slotId: "x" } },
  };
  const issues = validateForbiddenLegacyProps(minimalTemplate(block));
  assert.ok(issues.some((i) => i.path.endsWith("props.content")));
  assert.ok(issues.some((i) => i.path.endsWith("bindings.props.content")));
});

test("emailRoot.props.direction 报错", () => {
  const t = minimalTemplate({
    id: "lay",
    type: "layout",
    parentId: "root",
    children: [],
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
  });
  const root = t.blocks.root;
  if (root.type === "emailRoot") {
    (root.props as Record<string, unknown>).direction = "horizontal";
  }
  assertForbidden(t, "props.direction");
});

test("validateTemplate 经 block-contract 拒绝未白名单字段", () => {
  const t = minimalTemplate({
    id: "lay",
    type: "layout",
    parentId: "root",
    children: [],
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
    props: { direction: "vertical", gapMode: "fixed", gap: "0", crossAlign: "center" },
  });
  const issues = validateTemplate(t);
  assert.ok(
    issues.some(
      (i) =>
        i.path.includes("crossAlign") ||
        i.reason.includes("crossAlign") ||
        i.reason.includes("白名单")
    )
  );
});
