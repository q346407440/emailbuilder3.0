import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyMjsPatches,
  isMjsPatchMergeClean,
  parseMjsPatchesFromLlm,
} from "./mjsPatchApply";
import { buildMotherMjsBody } from "./mjsMotherBody";
import { mjsSlotBeginMarker, wrapMjsSlot } from "../../../mjs-patch-contract";

test("parseMjsPatchesFromLlm 解析 search patch", () => {
  const raw = `<mjs-patches>
  <patch kind="search">
    <search><![CDATA[const A = 1;]]></search>
    <replace><![CDATA[const A = 2;]]></replace>
  </patch>
</mjs-patches>`;
  const patches = parseMjsPatchesFromLlm(raw);
  assert.equal(patches.length, 1);
  assert.equal(patches[0]!.kind, "search");
  if (patches[0]!.kind === "search") {
    assert.equal(patches[0].search, "const A = 1;");
    assert.equal(patches[0].replace, "const A = 2;");
  }
});

test("parseMjsPatchesFromLlm 解析 slot patch 与空 replace", () => {
  const raw = `<mjs-patches>
  <patch kind="slot" id="buildS8">
    <replace></replace>
  </patch>
  <patch kind="slot" id="COLORS">
    <replace><![CDATA[const COLORS = { primary: '#000' };]]></replace>
  </patch>
</mjs-patches>`;
  const patches = parseMjsPatchesFromLlm(raw);
  assert.equal(patches.length, 2);
  assert.equal(patches[0]!.kind, "slot");
  if (patches[0]!.kind === "slot") assert.equal(patches[0].replace, "");
});

test("applyMjsPatches slot 按锚点替换 COLORS", () => {
  const mother = buildMotherMjsBody();
  const patches = parseMjsPatchesFromLlm(`<mjs-patches>
  <patch kind="slot" id="COLORS">
    <replace><![CDATA[const COLORS = { primary: '#1A2A3A', secondary: '#F5C242', surface: '#F6F4F0' };]]></replace>
  </patch>
</mjs-patches>`);
  const result = applyMjsPatches(mother, patches);
  assert.equal(isMjsPatchMergeClean(result, patches.length), true);
  assert.ok(result.source.includes("#1A2A3A"));
  assert.ok(result.source.includes(mjsSlotBeginMarker("COLORS")));
  assert.ok(!result.source.includes("#111111"));
});

test("applyMjsPatches slot 空 replace 删除 buildS8", () => {
  const source = wrapMjsSlot("buildS8", "function buildS8() { return null; }");
  const patches = parseMjsPatchesFromLlm(`<mjs-patches>
  <patch kind="slot" id="buildS8"><replace></replace></patch>
</mjs-patches>`);
  const result = applyMjsPatches(source, patches);
  assert.equal(result.applied, 1);
  assert.ok(!result.source.includes("buildS8"));
  assert.equal(result.hasPatchArtifacts, false);
});

test("applyMjsPatches search 精确替换", () => {
  const source = "line1\npadding: { mode: 'unified' },\nline3\n";
  const result = applyMjsPatches(source, [
    { kind: "search", search: "padding: { mode: 'unified' },", replace: "" },
  ]);
  assert.equal(result.applied, 1);
  assert.equal(result.searchReplacements, 1);
  assert.ok(!result.source.includes("padding:"));
});

test("parseMjsPatchesFromLlm 剥离 CDATA 框架空白（缩进 ]]> 不进入 search 正文）", () => {
  // 复刻线上失败场景：模型按 XML 排版习惯把 ]]> 独占一行并缩进 4 空格
  const raw = `<mjs-patches>
  <patch kind="search">
    <search><![CDATA[
function rowLayout(id) {
  return id;
}
    ]]></search>
    <replace><![CDATA[
function rowLayout(id, opts = {}) {
  return id;
}
    ]]></replace>
  </patch>
</mjs-patches>`;
  const patches = parseMjsPatchesFromLlm(raw);
  assert.equal(patches.length, 1);
  if (patches[0]!.kind === "search") {
    assert.ok(!patches[0].search.startsWith("\n"));
    assert.ok(!patches[0].search.endsWith(" "));
    assert.ok(patches[0].search.endsWith("}"));
  }
  const source = "const A = 1;\n\nfunction rowLayout(id) {\n  return id;\n}\n\nconst B = 2;\n";
  const result = applyMjsPatches(source, patches);
  assert.equal(result.applied, 1);
  assert.ok(result.source.includes("opts = {}"));
});

test("applyMjsPatches search 精确未命中时行级宽松匹配兜底（缩进差异）", () => {
  // 源码比 search 多两格缩进，精确 indexOf 不命中，宽松匹配应命中并替换整行区间
  const source = "before\n  const x = 1;\n  const y = 2;\nafter\n";
  const result = applyMjsPatches(source, [
    {
      kind: "search",
      search: "const x = 1;\nconst y = 2;",
      replace: "const x = 10;",
    },
  ]);
  assert.equal(result.applied, 1);
  assert.equal(result.searchReplacements, 1);
  assert.ok(result.source.includes("const x = 10;"));
  assert.ok(!result.source.includes("const y = 2;"));
  assert.ok(result.source.includes("before"));
  assert.ok(result.source.includes("after"));
});

test("applyMjsPatches search 宽松匹配不因 replace 含 search 内容而死循环", () => {
  const source = "  keep();\n  target();\n";
  const result = applyMjsPatches(source, [
    { kind: "search", search: "target();", replace: "target();\nextra();" },
  ]);
  assert.equal(result.applied, 1);
  assert.equal((result.source.match(/target\(\);/g) ?? []).length, 1);
  assert.ok(result.source.includes("extra();"));
});

test("applyMjsPatches search 相同文本 replaceAll 直到无命中", () => {
  const missing =
    "wrapperStyle: { widthMode: 'fill', heightMode: 'hug', border: borderNone() },";
  const fixed =
    "wrapperStyle: { widthMode: 'fill', heightMode: 'hug', border: borderNone(), borderRadius: { mode: 'unified', radius: '0' } },";
  const source = `${missing}\n${missing}\n${missing}\n`;
  const result = applyMjsPatches(source, [
    { kind: "search", search: missing, replace: fixed },
  ]);
  assert.equal(result.applied, 1);
  assert.equal(result.searchReplacements, 3);
  assert.ok(!result.source.includes(missing));
  assert.equal((result.source.match(/borderRadius:/g) ?? []).length, 3);
});
