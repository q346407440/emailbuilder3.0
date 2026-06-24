import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MANUAL_RESTORE_MJS_UI_STEPS_INITIAL,
  RESTORE_AST_UI_STEPS_INITIAL,
  buildPendingManualRestoreSteps,
  buildPendingRestoreAstSteps,
  reduceAiLlmStream,
  reduceAiPipelineProgress,
} from "./progress";

describe("reduceAiPipelineProgress", () => {
  it("RestoreAst plan 初始化 pending", () => {
    const steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [...RESTORE_AST_UI_STEPS_INITIAL],
    });
    assert.equal(steps.length, RESTORE_AST_UI_STEPS_INITIAL.length);
    assert.ok(steps.every((s) => s.status === "pending"));
  });

  it("重试在同一行原地变更：失败 → 重试 running → 成功打勾，不新增行", () => {
    let steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [{ id: "MR:VisualBlueprint", label: "识别视觉规格" }],
      display: "hidden",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:VisualBlueprint",
      status: "running",
      attempt: 1,
      label: "识别视觉规格 — 豆包 MR:VisualBlueprint API",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:VisualBlueprint",
      status: "failed",
      attempt: 1,
      label: "识别视觉规格 — 第 1 次未通过，即将重试",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:VisualBlueprint",
      status: "running",
      attempt: 2,
      label: "识别视觉规格 — 第 2 次重试",
    });
    assert.equal(steps.length, 1, "重试不新增行");
    assert.equal(steps[0]?.status, "running");
    assert.equal(steps[0]?.label, "识别视觉规格 — 第 2 次重试");
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:VisualBlueprint",
      status: "success",
    });
    assert.equal(steps.length, 1, "成功在重试行上打勾，不新增行");
    assert.equal(steps[0]?.status, "success");
    assert.equal(steps[0]?.label, "识别视觉规格 — 第 2 次重试");
  });

  it("hidden plan 不预展示 pending 行", () => {
    const steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [...MANUAL_RESTORE_MJS_UI_STEPS_INITIAL],
      display: "hidden",
    });
    assert.equal(steps.length, 0);
  });

  it("hidden plan 下步骤首个事件渐进出现，一步一行", () => {
    let steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [...MANUAL_RESTORE_MJS_UI_STEPS_INITIAL],
      display: "hidden",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:VisualBlueprint",
      status: "running",
      label: "识别视觉规格 — 豆包 MR:VisualBlueprint…",
    });
    assert.equal(steps.length, 1);
    assert.equal(steps[0]?.status, "running");
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:VisualBlueprint",
      status: "success",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:ResolveAssets",
      status: "running",
      label: "搜索远程素材（Pexels/CDN）",
    });
    assert.equal(steps.length, 2);
    assert.equal(steps[0]?.status, "success");
    assert.equal(steps[1]?.id, "MR:ResolveAssets");
  });

  it("豆包 mjs 步骤 plan 初始化（pending 模式）", () => {
    const steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [...MANUAL_RESTORE_MJS_UI_STEPS_INITIAL],
    });
    assert.equal(steps.length, 6);
    assert.equal(steps[0]?.id, "MR:VisualBlueprint");
    assert.equal(steps[4]?.id, "MR:VisualLint");
  });

  it("跨步骤重试也回到原行变更（不在列表末尾新增）", () => {
    let steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [
        { id: "MR:MjsGenerate", label: "豆包生成还原脚本" },
        { id: "MR:RunValidate", label: "执行脚本并校验" },
      ],
      display: "hidden",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:MjsGenerate",
      status: "success",
      label: "豆包生成还原脚本 — 豆包 MR:MjsGenerate API · 首次",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:RunValidate",
      status: "failed",
      attempt: 1,
      label: "执行脚本并校验 — validate 未通过（尝试 1/3）",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:MjsGenerate",
      status: "running",
      attempt: 2,
      label: "豆包生成还原脚本 — 豆包 MR:MjsPatch API（尝试 2/3）",
    });
    assert.equal(steps.length, 2, "重试不新增行");
    assert.equal(steps[0]?.id, "MR:MjsGenerate");
    assert.equal(steps[0]?.status, "running");
    assert.equal(steps[0]?.label, "豆包生成还原脚本 — 豆包 MR:MjsPatch API（尝试 2/3）");
    assert.equal(steps[1]?.status, "failed");
  });

  it("未知 stepId（后端新增步骤）才新增一行", () => {
    let steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [{ id: "MR:MjsGenerate", label: "豆包生成还原脚本" }],
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:AssetSlots",
      status: "running",
      label: "MR:AssetSlots — 豆包资产槽",
    });
    assert.equal(steps.length, 2);
    assert.equal(steps[1]?.id, "MR:AssetSlots");
  });

  it("buildPendingManualRestoreSteps 全 pending", () => {
    const steps = buildPendingManualRestoreSteps();
    assert.equal(steps.length, MANUAL_RESTORE_MJS_UI_STEPS_INITIAL.length);
    assert.ok(steps.every((s) => s.status === "pending"));
  });

  it("buildPendingRestoreAstSteps 全 pending", () => {
    const steps = buildPendingRestoreAstSteps();
    assert.equal(steps.length, RESTORE_AST_UI_STEPS_INITIAL.length);
    assert.ok(steps.every((s) => s.status === "pending"));
  });

  it("失败时 detail 拼入主行 label", () => {
    let steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [{ id: "MR:RunValidate", label: "执行脚本并校验" }],
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:RunValidate",
      status: "failed",
      attempt: 1,
      maxAttempts: 3,
      label: "执行脚本并校验 — validate 未通过（尝试 1/3）",
    });
    assert.equal(steps[0]?.label, "执行脚本并校验 — validate 未通过（尝试 1/3）");
    assert.equal(steps[0]?.maxAttempts, 3);
  });

  it("无 label 的事件只变更状态，保留行内文案", () => {
    let steps = reduceAiPipelineProgress(null, {
      type: "plan",
      steps: [{ id: "MR:MjsGenerate", label: "豆包生成还原脚本" }],
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:MjsGenerate",
      status: "running",
      attempt: 2,
      label: "豆包生成还原脚本 — 程序 autofix → 豆包 patch（尝试 2/3）",
    });
    steps = reduceAiPipelineProgress(steps, {
      type: "step",
      stepId: "MR:MjsGenerate",
      status: "success",
    });
    assert.equal(steps[0]?.status, "success");
    assert.equal(steps[0]?.label, "豆包生成还原脚本 — 程序 autofix → 豆包 patch（尝试 2/3）");
  });
});

describe("reduceAiLlmStream", () => {
  it("llm_stream 累加 think 与 content", () => {
    let state = reduceAiLlmStream(null, {
      type: "llm_stream",
      stepId: "RA:GenerateAst",
      channel: "think",
      delta: "a",
    });
    state = reduceAiLlmStream(state, {
      type: "llm_stream",
      stepId: "RA:GenerateAst",
      channel: "content",
      delta: "{",
    });
    assert.equal(state?.stepId, "RA:GenerateAst");
    assert.equal(state?.think, "a");
    assert.equal(state?.content, "{");
  });

  it("llm_stream_reset 清空窗口", () => {
    const state = reduceAiLlmStream(
      { stepId: "RA:GenerateAst", think: "x", content: "y" },
      { type: "llm_stream_reset", stepId: "RA:GenerateAst" }
    );
    assert.equal(state?.think, "");
    assert.equal(state?.content, "");
  });
});
