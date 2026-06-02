import assert from "node:assert";
import { describe, it } from "node:test";
import type { EmailTemplate, EmailPayload } from "../types/email";
import { validatePayloadAgainstTemplate } from "../payload-contract/validate";
import { loadSceneCollectionPresetsFromDisk } from "../payload-contract/scene-collection-presets/loadFromDisk";
import { collectionDataSourceKind } from "./payloadSlotDraft";
import { createCollectionPayloadSlotFromPreset } from "./createPayloadSlot";
import { resolveScenePresetFixedLength } from "../payload-contract/scene-collection-presets/buildPresetCollection";
import {
  MERCHANT_SPU_TREE_CHILD_COUNTS,
  MERCHANT_SPU_TREE_PARENT_COUNT,
} from "./loyaltyMerchantSpuTreePresetSeed";

const emptyTemplate = { blocks: {} } as EmailTemplate;

const basePayload = (): EmailPayload => ({
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

  it("包含商品/专辑列表与相似品、搭配品 SPU 树", () => {
    assert.equal(merchant.length, 4);
    const labels = new Set(merchant.map((p) => p.label));
    assert.ok(labels.has("商品列表"));
    assert.ok(labels.has("专辑列表"));
    assert.ok(labels.has("相似品列表"));
    assert.ok(labels.has("搭配品列表"));
  });

  it("相似品/搭配品为 builtin 商品列表且 seedValues 为空（预览由解析生成）", () => {
    for (const presetId of [
      "loyalty-merchant-similar-spu-list",
      "loyalty-merchant-complement-spu-list",
    ] as const) {
      const preset = merchant.find((p) => p.presetId === presetId);
      assert.ok(preset, presetId);
      assert.equal(preset.dataSourceKind, "builtin");
      assert.equal(preset.builtinCatalog, "products");
      assert.equal(preset.seedValues.length, 0);
      assert.equal(resolveScenePresetFixedLength(preset), MERCHANT_SPU_TREE_PARENT_COUNT);
    }
  });

  it("创建相似品/搭配品后含 10 条主 SPU 且子列表条数 5→4→3→2→1 循环", () => {
    for (const presetId of [
      "loyalty-merchant-similar-spu-list",
      "loyalty-merchant-complement-spu-list",
    ] as const) {
      const preset = merchant.find((p) => p.presetId === presetId)!;
      const childKey =
        presetId === "loyalty-merchant-similar-spu-list" ? "similarSpus" : "complementSpus";
      const result = createCollectionPayloadSlotFromPreset(basePayload(), preset);
      assert.ok("payload" in result);
      const rows = result.payload.values[result.slotId] as Record<string, unknown>[];
      assert.equal(rows.length, MERCHANT_SPU_TREE_PARENT_COUNT);
      for (let i = 0; i < rows.length; i++) {
        const children = rows[i]![childKey];
        assert.ok(Array.isArray(children), `${presetId}[${i}]`);
        assert.equal(children.length, MERCHANT_SPU_TREE_CHILD_COUNTS[i]);
      }
    }
  });

  it("创建后长度与预设一致且校验通过", () => {
    let payload = basePayload();
    for (const preset of merchant) {
      const result = createCollectionPayloadSlotFromPreset(payload, preset);
      assert.ok("payload" in result, preset.presetId);
      payload = result.payload;
      const slotId = result.slotId;
      const entry = payload.slots[slotId];
      const fixedLength = resolveScenePresetFixedLength(preset);
      const kind = collectionDataSourceKind(entry?.dataSource);
      if (preset.dataSourceKind === "builtin") {
        assert.equal(kind, "builtin");
      } else {
        assert.equal(kind, "custom");
      }
      assert.equal(entry?.minItems, fixedLength);
      assert.equal(entry?.maxItems, fixedLength);
      const rows = payload.values[slotId] as unknown[];
      assert.equal(rows.length, fixedLength, slotId);
      const issues = validatePayloadAgainstTemplate(emptyTemplate, payload);
      assert.equal(issues.length, 0, `${slotId}: ${issues.map((i) => i.reason).join("; ")}`);
    }
  });

  it("商品列表预设可添加第二份实例（不同 slotId，同 sceneCollectionPresetId）", () => {
    const productPreset = merchant.find((p) => p.presetId === "loyalty-merchant-product-list");
    assert.ok(productPreset);
    let payload = basePayload();
    const first = createCollectionPayloadSlotFromPreset(payload, productPreset!);
    assert.ok("payload" in first);
    payload = first.payload;
    const second = createCollectionPayloadSlotFromPreset(payload, productPreset!);
    assert.ok("payload" in second);
    assert.equal(first.slotId, "loyaltyMerchantProductList");
    assert.equal(second.slotId, "loyaltyMerchantProductList2");
    assert.equal(second.payload.slots.loyaltyMerchantProductList2?.sceneCollectionPresetId, productPreset!.presetId);
    assert.equal(second.payload.slots.loyaltyMerchantProductList2?.label, "商品列表 2");
  });
});
