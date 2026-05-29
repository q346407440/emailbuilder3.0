import assert from "node:assert";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import { validatePayloadAgainstTemplate } from "../payload-contract/validate";
import { loadSceneCollectionPresetsFromDisk } from "../payload-contract/scene-collection-presets/loadFromDisk";
import { collectionDataSourceKind } from "./payloadSlotDraft";
import { createCollectionPayloadSlotFromPreset } from "./createPayloadSlot";

const emptyTemplate = { blocks: {} } as EmailTemplate;

const basePayload = () => ({
  schemaVersion: "1.0.0",
  slots: {},
  values: {},
});

describe("loyalty 商家端场景列表预设", () => {
  const { presets, errors } = loadSceneCollectionPresetsFromDisk();
  const merchant = presets.filter((p) => p.scene === "loyalty-merchant-admin");

  it("磁盘 JSON 无解析错误", () => {
    assert.equal(errors.length, 0, errors.join("\n"));
  });

  it("包含商品列表与专辑列表", () => {
    assert.equal(merchant.length, 2);
    const labels = new Set(merchant.map((p) => p.label));
    assert.ok(labels.has("商品列表"));
    assert.ok(labels.has("专辑列表"));
  });

  it("创建后 dataSource 为 builtin 且固定长度默认 4", () => {
    let payload = basePayload();
    for (const preset of merchant) {
      const result = createCollectionPayloadSlotFromPreset(payload, preset);
      assert.ok("payload" in result, preset.presetId);
      payload = result.payload;
      const entry = payload.slots[preset.slotId];
      assert.equal(collectionDataSourceKind(entry?.dataSource), "builtin");
      assert.equal(entry?.minItems, 4);
      assert.equal(entry?.maxItems, 4);
      const rows = payload.values[preset.slotId] as unknown[];
      assert.equal(rows.length, 4, preset.slotId);
      const issues = validatePayloadAgainstTemplate(emptyTemplate, payload);
      assert.equal(issues.length, 0, `${preset.slotId}: ${issues.map((i) => i.reason).join("; ")}`);
    }
  });
});
