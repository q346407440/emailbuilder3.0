import { test } from "node:test";
import assert from "node:assert/strict";
import { groupValidateIssuesBySlot, slotIdForValidateIssueLine } from "./mjsErrorSlotMap";
import { extractMjsSlotContent, wrapMjsSlot } from "../../../mjs-patch-contract";

test("slotIdForValidateIssueLine 按块 id 段号归属 buildS*（含动态拼接产物 id）", () => {
  // 即使 mjs 源码中 id 是模板字符串拼出来的，validate 路径里的 id 永远可解析
  assert.equal(
    slotIdForValidateIssueLine(
      "blocks.ai-s7-ig-wrapper.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入",
      "ai"
    ),
    "buildS7"
  );
  assert.equal(
    slotIdForValidateIssueLine("blocks.ai-s1-title.props.italic: text.italic 必须为布尔值", "ai"),
    "buildS1"
  );
});

test("slotIdForValidateIssueLine tokenPresets 路径归属 tokenPresets slot", () => {
  assert.equal(
    slotIdForValidateIssueLine(
      "tokenPresets.json/tokenPresets.presets.default.tokens.spacing.pageInline: 容器间距不得超过 24px（当前 32px）",
      "ai"
    ),
    "tokenPresets"
  );
});

test("slotIdForValidateIssueLine 根节点与未知路径", () => {
  assert.equal(
    slotIdForValidateIssueLine("blocks.ai-root.props.padding: 画布根节点必须显式配置 padding", "ai"),
    "template"
  );
  assert.equal(slotIdForValidateIssueLine("meta.json/displayName: 缺少 displayName", "ai"), null);
});

test("slotIdForValidateIssueLine 视觉门 warning 行剥前缀后归属 slot", () => {
  // 复刻 2026-06-10 测试 3（fable）运行日志中的真实视觉门行
  assert.equal(
    slotIdForValidateIssueLine(
      "[visual:warning] layout.heroTooTall: blocks.ai-s3-hero.wrapperStyle.height: ai-s3-hero 命中疑似底稿默认大值 480px；建议：按 visual blueprint 的目标尺寸重写，避免照抄示例值。",
      "ai"
    ),
    "buildS3"
  );
  assert.equal(
    slotIdForValidateIssueLine(
      "[visual:warning] typography.footerTooLarge: blocks.ai-s7-privacy.props.fontSize: ai-s7-privacy 页脚/合规文本字号 12px 偏大；建议：页脚合规区通常使用 caption 级 6-8px。",
      "ai"
    ),
    "buildS7"
  );
  assert.equal(
    slotIdForValidateIssueLine(
      "[visual:error] asset.placeholderSrc: blocks.ai-s2-logo.props.src: 禁止占位图源",
      "ai"
    ),
    "buildS2"
  );
});

test("groupValidateIssuesBySlot 分组并保留未归属行", () => {
  const result = groupValidateIssuesBySlot(
    [
      "blocks.ai-s7-ig-wrapper.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入",
      "blocks.ai-s7-x-wrapper.wrapperStyle.borderRadius: 涉及背景的圆角字段必须显式写入",
      "tokenPresets.json/tokenPresets.presets.default.tokens.spacing.pageInline: 容器间距不得超过 24px",
      "缺少 meta.json（须在 data/emails/<EMAIL>/ 根目录）",
    ],
    "ai"
  );
  assert.equal(result.groups.length, 2);
  assert.equal(result.groups[0]!.slotId, "buildS7");
  assert.equal(result.groups[0]!.errors.length, 2);
  assert.equal(result.groups[1]!.slotId, "tokenPresets");
  assert.equal(result.unmapped.length, 1);
});

test("extractMjsSlotContent 提取锚点间源码；锚点缺失返回 null", () => {
  const body = wrapMjsSlot("buildS7", "function buildS7() {\n  return null;\n}");
  const content = extractMjsSlotContent(`const A = 1;\n${body}\nconst B = 2;`, "buildS7");
  assert.equal(content, "function buildS7() {\n  return null;\n}");
  assert.equal(extractMjsSlotContent("const A = 1;", "buildS7"), null);
});
