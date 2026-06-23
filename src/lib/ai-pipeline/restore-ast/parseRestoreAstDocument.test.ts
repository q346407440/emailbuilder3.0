import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRestoreAstDocument } from "./parseRestoreAstDocument";

const minimalDoc = {
  theme: {
    colors: { primary: "#111", accent: "#222", secondary: "#333", surface: "#fff" },
    spacing: { section: "24px", gap: "12px", pageInline: "20px" },
    typography: { display: "30px", h1: "20px", body: "14px", caption: "11px" },
    radius: { panel: "8px", cta: "999px" },
  },
  tree: { t: "email", children: [] },
};

test("parseRestoreAstDocument 接受最小合法 JSON", () => {
  const doc = parseRestoreAstDocument(JSON.stringify(minimalDoc));
  assert.equal(doc.tree.t, "email");
});

test("parseRestoreAstDocument 归一 icon 简写为 t:icon + query", () => {
  const doc = parseRestoreAstDocument(
    JSON.stringify({
      ...minimalDoc,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "头部",
            align: "start",
            children: [{ icon: "brand logo", pack: "simple-icons", required: true }],
          },
        ],
      },
    })
  );
  const icon = doc.tree.children[0]!.children![0] as { t: string; query: string };
  assert.equal(icon.t, "icon");
  assert.equal(icon.query, "brand logo");
  assert.equal("required" in icon, false);
});

test("parseRestoreAstDocument 拒绝缺少 theme.colors", () => {
  assert.throws(
    () =>
      parseRestoreAstDocument(
        JSON.stringify({
          theme: { spacing: minimalDoc.theme.spacing },
          tree: minimalDoc.tree,
        })
      ),
    /theme\.colors/
  );
});

test("parseRestoreAstDocument 将 text.box 提升为 stack 包裹", () => {
  const doc = parseRestoreAstDocument(
    JSON.stringify({
      ...minimalDoc,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "评分",
            align: "start",
            children: [
              {
                t: "text",
                content: "3",
                role: "body",
                box: {
                  radius: { px: 999 },
                  border: "thin",
                  borderTone: "secondary",
                  pad: { px: 12 },
                },
              },
            ],
          },
        ],
      },
    })
  );
  const child = doc.tree.children[0]!.children![0] as {
    t: string;
    box?: { border?: string };
    children?: Array<{ t: string; content: string; box?: unknown }>;
  };
  assert.equal(child.t, "stack");
  assert.equal(child.box?.border, "thin");
  assert.equal(child.children?.[0]?.t, "text");
  assert.equal(child.children?.[0]?.content, "3");
  assert.equal("box" in (child.children?.[0] ?? {}), false);
});

test("parseRestoreAstDocument email 直子有色面板拆为外缩进壳 + 内层视觉块", () => {
  const doc = parseRestoreAstDocument(
    JSON.stringify({
      ...minimalDoc,
      tree: {
        t: "email",
        children: [
          {
            t: "stack",
            title: "邮件评分模块",
            align: "center",
            gap: "gap",
            box: {
              pad: "section",
              radius: "panel",
              border: "hairline",
              borderTone: "secondary",
              tone: { hex: "#f8f9ff" },
            },
            children: [{ t: "text", content: "How useful?", role: "h1" }],
          },
        ],
      },
    })
  );
  const outer = doc.tree.children[0] as {
    t: string;
    title: string;
    box?: { pad?: string; tone?: unknown };
    children?: Array<{ t: string; title: string; box?: { tone?: unknown; border?: string } }>;
  };
  assert.equal(outer.title, "邮件评分模块外缘");
  assert.equal(outer.box?.pad, "section");
  assert.equal(outer.box?.tone, undefined);
  const inner = outer.children?.[0];
  assert.equal(inner?.title, "邮件评分模块");
  assert.deepEqual(inner?.box?.tone, { hex: "#f8f9ff" });
  assert.equal(inner?.box?.border, "hairline");
});
