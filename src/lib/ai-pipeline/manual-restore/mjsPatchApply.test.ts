import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMjsPatches, extractMjsPatchesFromLlm } from "./mjsPatchApply";

test("extractMjsPatchesFromLlm 解析 SEARCH/REPLACE 块", () => {
  const raw = `<<<<<<< SEARCH
const A = 1;
=======
const A = 2;
>>>>>>> REPLACE`;
  const patches = extractMjsPatchesFromLlm(raw);
  assert.equal(patches.length, 1);
  assert.equal(patches[0]!.search, "const A = 1;");
  assert.equal(patches[0]!.replace, "const A = 2;");
});

test("applyMjsPatches 精确替换", () => {
  const source = "line1\npadding: { mode: 'unified' },\nline3\n";
  const result = applyMjsPatches(source, [
    { search: "padding: { mode: 'unified' },", replace: "" },
  ]);
  assert.equal(result.applied, 1);
  assert.ok(!result.source.includes("padding:"));
});
