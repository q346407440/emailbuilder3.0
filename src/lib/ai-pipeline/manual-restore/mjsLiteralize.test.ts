import { test } from "node:test";
import assert from "node:assert/strict";
import { literalizeMjsThemeRefs } from "./mjsLiteralize";
import { applyMjsAutofix } from "./mjsAutofix";

test("literalizeMjsThemeRefs 替换 themeRef 并删除 bindings", () => {
  const source = `
const tokenPresets = { presets: { default: { tokens: { typography: { body: '18px' } } } } };
function textBlock() {
  return {
    props: { fontSize: themeRef('tokens.typography.body') },
    bindings: { 'props.fontSize': { mode: 'theme' } },
  };
}`;
  const r = literalizeMjsThemeRefs(source);
  assert.ok(!r.source.includes("themeRef"));
  assert.ok(!r.source.includes("bindings"));
  assert.ok(r.source.includes("'18px'"));
});

test("applyMjsAutofix 删除同行 inline mainAlign/crossAlign", () => {
  const source = `props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px', mainAlign: 'space-between', crossAlign: 'center' },`;
  const r = applyMjsAutofix(source, []);
  assert.ok(!r.source.includes("mainAlign"));
  assert.ok(!r.source.includes("crossAlign"));
  assert.ok(r.source.includes("direction: 'horizontal'"));
});

test("applyMjsAutofix 补 emailRoot padding", () => {
  const source = `root: {
  id: 'r-root',
  type: 'emailRoot',
  props: {
    backgroundColor: COLORS.surface,
    width: '600px',
    border: borderNone(),
    gapMode: 'fixed',
    gap: '0',
  },
  wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
},`;
  const r = applyMjsAutofix(source, [
    "blocks.r-root.props.padding: 画布根节点必须显式配置 padding",
  ]);
  assert.ok(r.source.includes("padding:"));
  assert.ok(r.source.includes("unified: '0'"));
});
