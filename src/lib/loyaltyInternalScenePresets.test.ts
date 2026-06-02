import assert from "node:assert";
import { describe, it } from "node:test";
import type { EmailTemplate, EmailPayload } from "../types/email";
import { validatePayloadAgainstTemplate } from "../payload-contract/validate";
import { loadSceneCollectionPresetsFromDisk } from "../payload-contract/scene-collection-presets/loadFromDisk";
import { createCollectionPayloadSlotFromPreset } from "./createPayloadSlot";

const emptyTemplate = { blocks: {} } as EmailTemplate;

const basePayload = (): EmailPayload => ({
  schemaVersion: "1.0.0",
  slots: {},
  values: {},
});

describe("loyalty 内部后台场景列表预设（data/scene-collection-presets）", () => {
  const { presets, errors } = loadSceneCollectionPresetsFromDisk();
  const internal = presets.filter((p) => p.scene === "loyalty-internal-admin");

  it("磁盘 JSON 无解析错误", () => {
    assert.equal(errors.length, 0, errors.join("\n"));
  });

  it("包含 7 个内置列表变量", () => {
    assert.equal(internal.length, 7);
    const labels = new Set(internal.map((p) => p.label));
    assert.equal(labels.size, 7);
    for (const name of [
      "数据展示",
      "未完成配置",
      "收益预测",
      "推荐订阅套餐",
      "正向数据",
      "正向GMV汇总",
      "异常配置项",
    ]) {
      assert.ok(labels.has(name), `缺少预设：${name}`);
    }
  });

  it("各预设 seed 行数与产品截图一致", () => {
    const expectedRows: Record<string, number> = {
      "loyalty-internal-data-display": 3,
      "loyalty-internal-unfinished-config": 3,
      "loyalty-internal-revenue-forecast": 2,
      "loyalty-internal-recommended-plan": 1,
      "loyalty-internal-positive-data": 4,
      "loyalty-internal-positive-gmv-summary": 1,
      "loyalty-internal-abnormal-config": 4,
    };
    for (const [presetId, count] of Object.entries(expectedRows)) {
      const preset = internal.find((p) => p.presetId === presetId);
      assert.ok(preset, presetId);
      assert.equal(preset.seedValues.length, count, `${preset.label} 应为 ${count} 行`);
    }
  });

  it("异常配置项含截图全部 4 条", () => {
    const preset = internal.find((p) => p.presetId === "loyalty-internal-abnormal-config");
    assert.ok(preset);
    const titles = preset.seedValues.map((r) => r.title);
    assert.deepEqual(titles, [
      "积分使用门槛高",
      "单笔订单积分最大抵扣金额过高",
      "未注册用户订单优惠门槛过高",
      "会员可用积分余额过低",
    ]);
  });

  it("正向数据仅包含上方 4 个指标行", () => {
    const preset = internal.find((p) => p.presetId === "loyalty-internal-positive-data");
    assert.ok(preset);
    assert.equal(preset.seedValues.length, 4);
    assert.deepEqual(
      preset.seedValues.map((r) => r.title),
      ["新增订阅邮箱", "转化率", "客单价", "会员客单价"]
    );
  });

  it("正向GMV汇总为单独一行", () => {
    const preset = internal.find((p) => p.presetId === "loyalty-internal-positive-gmv-summary");
    assert.ok(preset);
    assert.equal(preset.seedValues.length, 1);
    assert.equal(preset.seedValues[0]?.title, "使用会员折扣的GMV");
  });

  it("每个预设可登记且 payload 校验通过", () => {
    let payload = basePayload();
    for (const preset of internal) {
      const result = createCollectionPayloadSlotFromPreset(payload, preset);
      assert.ok("payload" in result, preset.presetId);
      payload = result.payload;
      const issues = validatePayloadAgainstTemplate(emptyTemplate, payload);
      assert.equal(issues.length, 0, `${preset.slotId}: ${issues.map((i) => i.reason).join("; ")}`);
      const rows = payload.values[preset.slotId] as unknown[];
      assert.equal(rows.length, preset.seedValues.length, preset.slotId);
    }
  });
});
