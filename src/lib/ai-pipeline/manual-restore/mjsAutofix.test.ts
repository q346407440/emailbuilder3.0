import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMjsAutofix } from "./mjsAutofix";

test("applyMjsAutofix 删除 buttonStyle.padding", () => {
  const source = `buttonStyle: {
  padding: { mode: 'unified', unified: '8px' },
  bold: true,
},`;
  const result = applyMjsAutofix(source, [
    "blocks.x.props.buttonStyle.padding: 按钮内边距由渲染层统一固定",
  ]);
  assert.ok(result.changed);
  assert.ok(!result.source.includes("padding:"));
});

test("applyMjsAutofix 补 backgroundColor 的 border", () => {
  const source = `wrapperStyle: {
  backgroundColor: '#fff',
  widthMode: 'fill',
},`;
  const result = applyMjsAutofix(source, [
    "blocks.x.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入",
  ]);
  assert.ok(result.changed);
  assert.ok(result.source.includes("border: borderNone()"));
  assert.ok(result.source.includes("borderRadius:"));
});

test("applyMjsAutofix 保留豆包写的合法可见描边", () => {
  const source = `wrapperStyle: {
  backgroundColor: '#F8F800',
  border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.primary },
  borderRadius: { mode: 'unified', radius: '16px' },
},`;
  const result = applyMjsAutofix(source, [
    "blocks.x.wrapperStyle.border: 涉及背景的描边字段必须显式写入",
  ]);
  assert.ok(result.source.includes("width: '1px'"));
  assert.ok(!result.source.includes("border: borderNone(),\n      border: borderNone()"));
});

test("applyMjsAutofix 缺 mode 但有 width 时规范为 unified", () => {
  const source = `buttonStyle: {
  border: { width: '2px', style: 'solid', color: COLORS.primary },
},`;
  const result = applyMjsAutofix(source, ["blocks.x.props.buttonStyle.border: 非法"]);
  assert.ok(result.source.includes("mode: 'unified'"));
  assert.ok(result.source.includes("width: '2px'"));
  assert.ok(!result.source.includes("border: borderNone()"));
});

test("applyMjsAutofix button wrapperStyle 定高改为 hug", () => {
  const source = `{
  id: 'cta',
  type: 'button',
  blockMeta: { blockType: 'action.button', name: '购买' },
  props: { text: 'Buy Now', link: { href: '#', type: 'external' }, buttonStyle: {} },
  wrapperStyle: {
    widthMode: 'fixed',
    width: '160px',
    heightMode: 'fixed',
    height: '44px',
  },
},`;
  const result = applyMjsAutofix(source, []);
  assert.ok(result.changed);
  assert.ok(result.source.includes("heightMode: 'hug'"));
  assert.ok(!result.source.includes("height: '44px'"));
  assert.ok(!result.source.includes("heightMode: 'fixed'"));
});
