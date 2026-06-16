import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyContractIssueAutofix,
  findBlockByIdInTemplateTree,
} from "./templateContractAutofix";
import { EMAIL_CONTAINER_SPACING_MAX_PX } from "./spacingPxCap";

function makeTemplate(blocks: Array<Record<string, unknown>>) {
  return {
    schemaVersion: "4.0.0",
    root: {
      id: "ai-root",
      type: "emailRoot",
      children: blocks,
    },
  };
}

test("findBlockByIdInTemplateTree 在嵌套树中按 id 寻址", () => {
  const template = makeTemplate([
    { id: "ai-s7-row", children: [{ id: "ai-s7-ig-wrapper", wrapperStyle: {} }] },
  ]);
  const found = findBlockByIdInTemplateTree(template, "ai-s7-ig-wrapper");
  assert.ok(found);
  assert.equal(found!.id, "ai-s7-ig-wrapper");
  assert.equal(findBlockByIdInTemplateTree(template, "不存在"), null);
});

test("applyContractIssueAutofix 修复 2026-06-10 线上失败的全部 5 条机械错误", () => {
  // 复刻 logs/manual-restore-mjs-7c538e28/03-validate-errors-attempt-1.json
  const wrapper = (id: string) => ({
    id,
    type: "layout",
    wrapperStyle: {
      widthMode: "fixed",
      border: { mode: "unified", width: "1px", style: "solid", color: "#000" },
    },
    children: [],
  });
  const template = makeTemplate([
    {
      id: "ai-s7-row",
      children: [
        wrapper("ai-s7-ig-wrapper"),
        wrapper("ai-s7-yt-wrapper"),
        wrapper("ai-s7-x-wrapper"),
        wrapper("ai-s7-pin-wrapper"),
      ],
    },
  ]);
  const tokenPresets = {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: "测试",
        tokens: { spacing: { section: "0", gap: "20px", pageInline: "32px" } },
      },
    },
  };
  const issues = [
    "blocks.ai-s7-ig-wrapper.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入（mode=unified、radius=0 也要显式）",
    "blocks.ai-s7-yt-wrapper.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入（mode=unified、radius=0 也要显式）",
    "blocks.ai-s7-x-wrapper.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入（mode=unified、radius=0 也要显式）",
    "blocks.ai-s7-pin-wrapper.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入（mode=unified、radius=0 也要显式）",
    `tokenPresets.json/tokenPresets.presets.default.tokens.spacing.pageInline: 容器间距不得超过 ${EMAIL_CONTAINER_SPACING_MAX_PX}px（当前 32px）`,
  ];

  const result = applyContractIssueAutofix({ template, tokenPresets, issues });
  assert.equal(result.fixes.length, 5);

  for (const id of ["ai-s7-ig-wrapper", "ai-s7-yt-wrapper", "ai-s7-x-wrapper", "ai-s7-pin-wrapper"]) {
    const block = findBlockByIdInTemplateTree(result.template, id);
    assert.deepEqual((block!.wrapperStyle as Record<string, unknown>).borderRadius, {
      mode: "unified",
      radius: "0",
    });
  }
  const fixedTokens = result.tokenPresets as typeof tokenPresets;
  assert.equal(
    fixedTokens.presets.default.tokens.spacing.pageInline,
    `${EMAIL_CONTAINER_SPACING_MAX_PX}px`
  );

  // 输入不被原地修改
  assert.equal(tokenPresets.presets.default.tokens.spacing.pageInline, "32px");
  const original = findBlockByIdInTemplateTree(template, "ai-s7-ig-wrapper");
  assert.equal((original!.wrapperStyle as Record<string, unknown>).borderRadius, undefined);
});

test("applyContractIssueAutofix 幂等：已修复产物上重跑无新改动", () => {
  const template = makeTemplate([
    {
      id: "ai-s1-box",
      wrapperStyle: { borderRadius: { mode: "unified", radius: "0" } },
      children: [],
    },
  ]);
  const result = applyContractIssueAutofix({
    template,
    tokenPresets: null,
    issues: [
      "blocks.ai-s1-box.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入（mode=unified、radius=0 也要显式）",
    ],
  });
  assert.equal(result.fixes.length, 0);
});

test("applyContractIssueAutofix 修复 text 布尔与 decoration 缺省", () => {
  const template = makeTemplate([
    { id: "ai-s4-title", type: "text", props: { bold: "true" }, children: [] },
  ]);
  const result = applyContractIssueAutofix({
    template,
    tokenPresets: null,
    issues: [
      "blocks.ai-s4-title.props.bold: text.bold 必须为布尔值（true/false）",
      "blocks.ai-s4-title.props.italic: text.italic 必须为布尔值（true/false）",
      "blocks.ai-s4-title.props.decoration: text.decoration 仅允许 none / underline / line-through / overline",
    ],
  });
  assert.equal(result.fixes.length, 3);
  const block = findBlockByIdInTemplateTree(result.template, "ai-s4-title");
  const props = block!.props as Record<string, unknown>;
  assert.equal(props.bold, true);
  assert.equal(props.italic, false);
  assert.equal(props.decoration, "none");
});

test("applyContractIssueAutofix 非机械错误原样不动", () => {
  const template = makeTemplate([{ id: "ai-s3-img", type: "image", props: {}, children: [] }]);
  const result = applyContractIssueAutofix({
    template,
    tokenPresets: null,
    issues: ["blocks.ai-s3-img.wrapperStyle.backgroundImage: 图片块必须设置 wrapperStyle.backgroundImage"],
  });
  assert.equal(result.fixes.length, 0);
});

// ===== tokenPresets 标准形态归一化（2026-06-10 测试 4 真实事故回归） =====

import { validateTokenPresets } from "./validateTokenPresets";
import type { TokenPresets } from "../types/tokenPreset";

/** 模拟 mjsRunValidate 的收敛循环：修复 → 复验 → 再修复，直至无新修复（≤3 轮）。 */
function fixUntilStable(tokenPresets: unknown): { tokenPresets: unknown; rounds: number; fixes: string[] } {
  let current: unknown = tokenPresets;
  const fixes: string[] = [];
  for (let round = 1; round <= 3; round += 1) {
    const issues = validateTokenPresets(current as TokenPresets).map(
      (i) => `tokenPresets.json/${i.path}: ${i.reason}`
    );
    if (issues.length === 0) return { tokenPresets: current, rounds: round - 1, fixes };
    const result = applyContractIssueAutofix({
      template: { schemaVersion: "4.0.0", root: { id: "r", type: "emailRoot", children: [] } },
      tokenPresets: current,
      issues,
    });
    if (result.fixes.length === 0) return { tokenPresets: current, rounds: round, fixes };
    fixes.push(...result.fixes);
    current = result.tokenPresets;
  }
  return { tokenPresets: current, rounds: 3, fixes };
}

test("tokenPresets 非标准 scale 与缺失 radius（编辑器 14 条报错场景）→ 归一化后 validate 归零", () => {
  // 用户在编辑器看到的 14 条错误对应的 tokenPresets 形态
  const tokenPresets = {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: "测试",
        tokens: {
          colors: {
            primary: "#000000", secondary: "#F5F3EB", surface: "#FFFFFF",
            brand: "#000000", accent: "#FF0000", surfaceMuted: "#F5F5F5",
            text: "#000000", textMuted: "#666666", border: "#D8D8D8",
          },
          spacing: {
            section: "0", gap: "16px", pageInline: "20px",
            xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "20px",
          },
          typography: {
            display: "42px", h1: "36px", body: "16px", caption: "12px",
            h2: "24px", micro: "8px",
          },
          // radius family 整体缺失
        },
      },
    },
    scopeSelections: {},
  };
  const { tokenPresets: fixed, fixes } = fixUntilStable(tokenPresets);
  assert.equal(validateTokenPresets(fixed as TokenPresets).length, 0);
  assert.ok(fixes.some((f) => f.includes("删除非标准 scale「brand」")));
  assert.ok(fixes.some((f) => f.includes("补标准 family「radius」")));
  // 标准键值不被破坏
  const tokens = (fixed as { presets: { default: { tokens: Record<string, Record<string, string>> } } })
    .presets.default.tokens;
  assert.equal(tokens.colors!.primary, "#000000");
  assert.equal(tokens.typography!.display, "42px");
  assert.equal(tokens.spacing!.gap, "16px");
});

test("tokenPresets presets 为数组 + 自由发挥 base/fonts（测试 4 落盘形态）→ 打捞后 validate 归零", () => {
  // 复刻 logs/manual-restore-mjs-43162180 保底交付的真实落盘形态
  const tokenPresets = {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: [
      {
        id: "default",
        label: "模板 61 测试 4",
        description: "Adidas birthday voucher promotional email template",
        base: {
          pageWidth: "600px", pageBackground: "#FFFFFF",
          pageInlinePadding: "24px", sectionGap: "24px", contentGap: "16px",
        },
        fonts: {
          display: { fontSize: "42px", fontWeight: "700" },
          h1: { fontSize: "36px", fontWeight: "700" },
          body: { fontSize: "16px", fontWeight: "400" },
          caption: { fontSize: "12px", fontWeight: "400" },
        },
      },
    ],
  };
  const { tokenPresets: fixed, fixes } = fixUntilStable(tokenPresets);
  assert.equal(validateTokenPresets(fixed as TokenPresets).length, 0);
  assert.ok(fixes.some((f) => f.includes("结构打捞")));
  const tp = fixed as {
    activePresetId: string;
    presets: Record<string, { label: string; tokens: Record<string, Record<string, string>> }>;
  };
  assert.equal(tp.activePresetId, "default");
  // fonts.X.fontSize 打捞进 typography
  assert.equal(tp.presets.default!.tokens.typography!.display, "42px");
  assert.equal(tp.presets.default!.tokens.typography!.caption, "12px");
  assert.equal(tp.presets.default!.label, "模板 61 测试 4");
});

test("tokenPresets 补缺时 blueprint 派生值优先于契约兜底", () => {
  const tokenPresets = {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: { default: { label: "测试", tokens: {} } },
    scopeSelections: {},
  };
  const issues = validateTokenPresets(tokenPresets as TokenPresets).map(
    (i) => `tokenPresets.json/${i.path}: ${i.reason}`
  );
  const result = applyContractIssueAutofix({
    template: { schemaVersion: "4.0.0", root: { id: "r", type: "emailRoot", children: [] } },
    tokenPresets,
    issues,
    tokenFallbacks: {
      colors: { primary: "#123456", secondary: "#ABCDEF", surface: "#FFFFFF" },
      typography: { display: "40px", h1: "32px", body: "16px", caption: "12px" },
    },
  });
  const tokens = (result.tokenPresets as { presets: { default: { tokens: Record<string, Record<string, string>> } } })
    .presets.default.tokens;
  assert.equal(tokens.colors!.primary, "#123456");
  assert.equal(tokens.typography!.display, "40px");
  // 未提供的 family 用契约兜底
  assert.equal(tokens.radius!.panel, "0");
});

// ===== hug 父 + fill 子循环依赖（2026-06-10 测试 6 真实事故回归） =====

test("applyContractIssueAutofix 修复 hug 父下的 fill 子（test6 ai-s6-discover）", () => {
  // 复刻 logs/manual-restore-mjs-086a5c08：textBlock 默认 widthMode='fill'，父容器 hug
  const template = makeTemplate([
    {
      id: "ai-s6-discover-wrapper",
      type: "layout",
      props: { direction: "vertical" },
      wrapperStyle: { widthMode: "hug", heightMode: "hug" },
      children: [
        {
          id: "ai-s6-discover",
          type: "text",
          props: {},
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          children: [],
        },
      ],
    },
  ]);
  const result = applyContractIssueAutofix({
    template,
    tokenPresets: null,
    issues: [
      "blocks.ai-s6-discover.wrapperStyle.widthMode: 父级 layout/image 宽度模式为 hug 时，子级不允许使用 width fill（父宽随子、子宽铺满父，循环依赖）；请改为 hug 或 fixed",
    ],
  });
  assert.equal(result.fixes.length, 1);
  const fixed = findBlockByIdInTemplateTree(result.template, "ai-s6-discover");
  assert.equal((fixed!.wrapperStyle as Record<string, unknown>).widthMode, "hug");
});

test("applyContractIssueAutofix hug/fill 修复沿子树级联到固定点", () => {
  // 子块改 hug 后自身成为 hug 父，孙级同轴 fill 须在同一次修复中级联处理
  const template = makeTemplate([
    {
      id: "p1",
      type: "layout",
      props: { direction: "vertical" },
      wrapperStyle: { widthMode: "hug", heightMode: "hug" },
      children: [
        {
          id: "c1",
          type: "layout",
          props: { direction: "vertical" },
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          children: [
            {
              id: "g1",
              type: "text",
              props: {},
              wrapperStyle: { widthMode: "fill", heightMode: "fill" },
              children: [],
            },
          ],
        },
      ],
    },
  ]);
  const result = applyContractIssueAutofix({
    template,
    tokenPresets: null,
    issues: [
      "blocks.c1.wrapperStyle.widthMode: 父级 layout/image 宽度模式为 hug 时，子级不允许使用 width fill（父宽随子、子宽铺满父，循环依赖）；请改为 hug 或 fixed",
    ],
  });
  // c1 fill→hug 后，g1 的 width fill 被新引爆 → 级联修复；g1 的 height fill 因 c1 heightMode=hug 且纵排 → 同样级联
  const c1 = findBlockByIdInTemplateTree(result.template, "c1");
  const g1 = findBlockByIdInTemplateTree(result.template, "g1");
  assert.equal((c1!.wrapperStyle as Record<string, unknown>).widthMode, "hug");
  assert.equal((g1!.wrapperStyle as Record<string, unknown>).widthMode, "hug");
  assert.equal((g1!.wrapperStyle as Record<string, unknown>).heightMode, "hug");
  assert.equal(result.fixes.length, 3);
});

test("applyContractIssueAutofix heightMode 版本：仅纵排父触发的 fill 修复", () => {
  const template = makeTemplate([
    {
      id: "p2",
      type: "layout",
      props: { direction: "vertical" },
      wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      children: [
        {
          id: "c2",
          type: "text",
          props: {},
          wrapperStyle: { widthMode: "hug", heightMode: "fill" },
          children: [],
        },
      ],
    },
  ]);
  const result = applyContractIssueAutofix({
    template,
    tokenPresets: null,
    issues: [
      "blocks.c2.wrapperStyle.heightMode: 父级为纵向 layout/image 且高度模式为 hug 时，子级不允许使用 height fill（循环依赖）；请改为 hug 或 fixed",
    ],
  });
  const c2 = findBlockByIdInTemplateTree(result.template, "c2");
  assert.equal((c2!.wrapperStyle as Record<string, unknown>).heightMode, "hug");
  assert.equal(result.fixes.length, 1);
});

// ===== backgroundImage 字符串升格（2026-06-10 测试 5 真实事故回归） =====

test("applyContractIssueAutofix backgroundImage 字符串升格为契约对象形态", () => {
  // 复刻 logs/manual-restore-mjs-1bc470d2 attempt2：LLM 写 backgroundImage: ICON["..."]（字符串）
  const template = makeTemplate([
    {
      id: "ai-s6-app-icon",
      type: "image",
      blockMeta: { blockType: "content.image", name: "App图标" },
      props: {},
      wrapperStyle: {
        widthMode: "fixed",
        backgroundImage: "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/adidas.svg",
      },
      children: [],
    },
  ]);
  const result = applyContractIssueAutofix({
    template,
    tokenPresets: null,
    issues: [
      "blocks.ai-s6-app-icon.wrapperStyle.backgroundImage: 图片块必须设置 wrapperStyle.backgroundImage",
    ],
  });
  assert.equal(result.fixes.length, 1);
  const block = findBlockByIdInTemplateTree(result.template, "ai-s6-app-icon");
  const bg = (block!.wrapperStyle as Record<string, unknown>).backgroundImage as Record<string, unknown>;
  assert.equal(bg.src, "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/adidas.svg");
  assert.equal(bg.alt, undefined);
  assert.equal(bg.fit, "cover");
  assert.equal(bg.position, "center");
  assert.equal("border" in bg, false);
  assert.equal("borderRadius" in bg, false);
});

test("applyContractIssueAutofix 补全缺失 blockMeta（2026-06-12 模板 38 事故主因）", () => {
  const template = makeTemplate([
    {
      id: "ai-s7-nav",
      type: "grid",
      children: [
        { id: "ai-s7-nav-left", type: "layout", children: [] },
        { id: "ai-s7-nav-right", type: "textBlock", children: [] }, // 别名 type 也可经归一推断
        { id: "ai-s7-bad", type: "mysteryWidget", children: [] }, // 不可归一 → 不修
      ],
    },
  ]);
  const issues = [
    "blocks.ai-s7-nav-left.blockMeta: blockMeta 为必填对象",
    "blocks.ai-s7-nav-right.blockMeta: blockMeta 为必填对象",
    "blocks.ai-s7-bad.blockMeta: blockMeta 为必填对象",
  ];
  const result = applyContractIssueAutofix({ template, tokenPresets: null, issues });
  assert.equal(result.fixes.length, 2);

  const left = findBlockByIdInTemplateTree(result.template, "ai-s7-nav-left")!;
  assert.deepEqual(left.blockMeta, { blockType: "layout.container", name: "ai-s7-nav-left" });
  const right = findBlockByIdInTemplateTree(result.template, "ai-s7-nav-right")!;
  assert.deepEqual(right.blockMeta, { blockType: "content.text", name: "ai-s7-nav-right" });
  const bad = findBlockByIdInTemplateTree(result.template, "ai-s7-bad")!;
  assert.equal(bad.blockMeta, undefined);
});

test("applyContractIssueAutofix 补全 blockMeta 部分缺失字段且保留已有值", () => {
  const template = makeTemplate([
    { id: "ai-s2-title", type: "text", blockMeta: { name: "首屏标题" }, children: [] },
  ]);
  const issues = ["blocks.ai-s2-title.blockMeta.blockType: blockType 为必填字符串"];
  const result = applyContractIssueAutofix({ template, tokenPresets: null, issues });
  assert.equal(result.fixes.length, 1);
  const block = findBlockByIdInTemplateTree(result.template, "ai-s2-title")!;
  assert.deepEqual(block.blockMeta, { blockType: "content.text", name: "首屏标题" });
});

test("applyContractIssueAutofix 归一非法运行时 type 别名", () => {
  const template = makeTemplate([
    { id: "ai-s2-desc", type: "textBlock", children: [] },
    { id: "ai-s2-wrap", type: "layoutContainer", children: [] },
    { id: "ai-s2-img", type: "content.image", children: [] },
    { id: "ai-s2-odd", type: "mysteryWidget", children: [] },
  ]);
  const issues = [
    "blocks.ai-s2-desc.type: type 非法运行时类型「textBlock」（合法：emailRoot/layout/grid/text/image/icon/button/divider/progress）",
    "blocks.ai-s2-wrap.type: type 非法运行时类型「layoutContainer」（合法：emailRoot/layout/grid/text/image/icon/button/divider/progress）",
    "blocks.ai-s2-img.type: type 非法运行时类型「content.image」（合法：emailRoot/layout/grid/text/image/icon/button/divider/progress）",
    "blocks.ai-s2-odd.type: type 非法运行时类型「mysteryWidget」（合法：emailRoot/layout/grid/text/image/icon/button/divider/progress）",
  ];
  const result = applyContractIssueAutofix({ template, tokenPresets: null, issues });
  assert.equal(result.fixes.length, 3);
  assert.equal(findBlockByIdInTemplateTree(result.template, "ai-s2-desc")!.type, "text");
  assert.equal(findBlockByIdInTemplateTree(result.template, "ai-s2-wrap")!.type, "layout");
  assert.equal(findBlockByIdInTemplateTree(result.template, "ai-s2-img")!.type, "image");
  assert.equal(findBlockByIdInTemplateTree(result.template, "ai-s2-odd")!.type, "mysteryWidget");
});
