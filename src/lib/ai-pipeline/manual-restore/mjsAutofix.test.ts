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

test("applyMjsAutofix 不因 buttonStyle.padding 错误误删 wrapperStyle.padding", () => {
  const source = `wrapperStyle: {
  padding: { mode: 'unified', unified: '8px' },
  widthMode: 'fill',
},`;
  const result = applyMjsAutofix(source, [
    "blocks.x.props.buttonStyle.padding: 按钮内边距由渲染层统一固定",
  ]);
  assert.equal(result.source, source);
});

test("applyMjsAutofix 补无 backgroundColor 的 layout wrapperStyle.borderRadius", () => {
  const source = `{
  id: 'couponte-s2-left',
  type: 'layout',
  blockMeta: { blockType: 'layout.container', name: '左侧' },
  props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
  wrapperStyle: { widthMode: 'fill', heightMode: 'hug', border: borderNone() },
  children: [],
},`;
  const result = applyMjsAutofix(source, [
    "blocks.couponte-s2-left.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入",
  ]);
  assert.ok(result.changed);
  assert.ok(result.source.includes("borderRadius: { mode: 'unified', radius: '0' }"));
});

test("applyMjsAutofix 识别 mjs 内 \${P}- 前缀 block id", () => {
  const source = `{
  id: \`\${P}-s2-left\`,
  type: 'layout',
  wrapperStyle: { widthMode: 'fill', heightMode: 'hug', border: borderNone() },
  children: [],
},`;
  const result = applyMjsAutofix(source, [
    "blocks.couponte-s2-left.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入",
  ]);
  assert.ok(result.changed);
  assert.ok(result.fixes.some((f) => /borderRadius/.test(f)));
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

test("applyMjsAutofix 不在单行对象赋值后插入裸 border 字段", () => {
  const source =
    "navBar.wrapperStyle = { ...navBar.wrapperStyle, backgroundColor: COLORS.primary, widthMode: 'fill', heightMode: 'hug' };";
  const result = applyMjsAutofix(source, []);
  assert.equal(result.source, source);
  assert.ok(!result.source.includes("\nborder: borderNone()"));
  assert.ok(!result.source.includes("\nborderRadius:"));
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

test("applyMjsAutofix mainAlign/crossAlign 映射为 contentAlign", () => {
  const source = `{
  id: 'row',
  type: 'layout',
  props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px', mainAlign: 'center', crossAlign: 'center' },
  wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
  children: [],
},`;
  const result = applyMjsAutofix(source, []);
  assert.ok(result.changed);
  assert.ok(!result.source.includes("mainAlign"));
  assert.ok(!result.source.includes("crossAlign"));
  assert.ok(result.source.includes("contentAlign: { horizontal: 'center', vertical: 'center' }"));
});

test("applyMjsAutofix  proactive 补 text italic/decoration", () => {
  const source = `{
  id: 't1',
  type: 'text',
  props: { textBody: { paragraphs: [{ runs: [{ text: 'Hi' }] }] }, fontSize: '16px', color: '#000', bold: false },
  wrapperStyle: { widthMode: 'fill', heightMode: 'hug', contentAlign: { horizontal: 'left', vertical: 'top' } },
},`;
  const result = applyMjsAutofix(source, []);
  assert.ok(result.changed);
  assert.ok(result.source.includes("italic: false"));
  assert.ok(result.source.includes("decoration: 'none'"));
});

test("applyMjsAutofix 不主动改 button wrapperStyle 定高", () => {
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
  assert.equal(result.source, source);
});

test("applyMjsAutofix validate 命中 button heightMode 时改为 hug", () => {
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
  const result = applyMjsAutofix(source, [
    "blocks.cta.wrapperStyle.heightMode: button 外层高度应使用 hug",
  ]);
  assert.ok(result.changed);
  assert.ok(result.source.includes("heightMode: 'hug'"));
  assert.ok(!result.source.includes("height: '44px'"));
  assert.ok(!result.source.includes("heightMode: 'fixed'"));
});

test("applyMjsAutofix ICON.icon-* 改为括号访问", () => {
  const source = `iconBlock(\`\${P}-ig\`, 'Instagram', ICON.icon-instagram, { size: '32px' })`;
  const result = applyMjsAutofix(source, []);
  assert.ok(result.changed);
  assert.ok(result.source.includes('ICON["icon-instagram"]'));
  assert.ok(!result.source.includes("ICON.icon-instagram"));
});

test("applyMjsAutofix emailRoot.props 不注入 borderRadius", () => {
  const source = `const template = {
  root: {
    id: \`\${P}-root\`,
    type: 'emailRoot',
    props: {
      padding: { mode: 'unified', unified: '0' },
      backgroundColor: COLORS.surface,
      width: '600px',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
  },
};`;
  const result = applyMjsAutofix(source, []);
  assert.ok(!/type: 'emailRoot'[\s\S]*props:[\s\S]*borderRadius/.test(result.source));
});

test("applyMjsAutofix 删除 emailRoot.props.borderRadius", () => {
  const source = `{
  id: \`\${P}-root\`,
  type: 'emailRoot',
  props: {
    padding: { mode: 'unified', unified: '0' },
    borderRadius: { mode: 'unified', radius: '0' },
    backgroundColor: COLORS.surface,
  },
  wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
},`;
  const result = applyMjsAutofix(source, []);
  assert.ok(result.changed);
  assert.ok(!result.source.includes("props.borderRadius") && !/props:\s*\{[^}]*borderRadius/s.test(result.source));
});

test("applyMjsAutofix 不主动补 rowLayout wrapperStyle.borderRadius", () => {
  const source = `function rowLayout(id, name, children, opts = {}) {
  return {
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
    },
  };
}`;
  const result = applyMjsAutofix(source, []);
  assert.equal(result.source, source);
});
