import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMjsPatchUserText } from "./promptsMjsEdit";

const BASE = {
  errorLines: ["blocks.ai-s7-nav-left.blockMeta: blockMeta 为必填对象"],
  slotGroups: [
    {
      slotId: "buildS7" as const,
      errors: ["blocks.ai-s7-nav-left.blockMeta: blockMeta 为必填对象"],
      currentSource: "function buildS7() { return null; }",
    },
  ],
  unmapped: [],
};

test("buildMjsPatchUserText 注入上一轮守卫拒绝原因", () => {
  const rejection =
    '补丁 5（slot buildS7）引用不存在的资产键：ICON["tabler:brand-instagram"]；合法键：ICON{brandLogo,instagram}';
  const text = buildMjsPatchUserText({ ...BASE, guardRejections: [rejection] });
  assert.ok(text.includes("上一轮补丁被资产键守卫拒绝"));
  assert.ok(text.includes(rejection));
});

test("buildMjsPatchUserText 无守卫拒绝时不渲染该节", () => {
  const text = buildMjsPatchUserText(BASE);
  assert.ok(!text.includes("资产键守卫拒绝"));
  // 既有结构不受影响
  assert.ok(text.includes("## validate 错误（须全部消除）"));
  assert.ok(text.includes("### slot `buildS7`"));
});
