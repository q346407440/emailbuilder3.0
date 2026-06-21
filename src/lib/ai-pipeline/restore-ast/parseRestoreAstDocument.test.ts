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
            children: [{ icon: "brand logo", pack: "simple-icons", required: true }],
          },
        ],
      },
    })
  );
  const icon = doc.tree.children[0]!.children![0] as { t: string; query: string };
  assert.equal(icon.t, "icon");
  assert.equal(icon.query, "brand logo");
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
