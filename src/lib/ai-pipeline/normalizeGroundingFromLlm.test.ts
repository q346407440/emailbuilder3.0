import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGroundingFromLlm,
  singleSectionGroundingPayload,
} from "./normalizeGroundingFromLlm";
import { injectGroundingResult } from "./injectPipelineMetadata";
import { imageSlotId, listImageSlots } from "./groundingImage";

describe("normalizeGroundingFromLlm", () => {
  it("JSON 数组 → 派生 order/sections + 分区配图字段", () => {
    const payload = normalizeGroundingFromLlm([
      {
        id: "s2",
        region: "商品推荐",
        components: "2列商品 grid",
        hasImage: true,
        imageQuery: "yoga outfit product",
        imageWidth: 300,
        imageHeight: 280,
      },
    ]);
    assert.ok(payload);
    assert.deepEqual(payload.order, ["s2"]);
    assert.equal(payload.sections[0]?.sectionId, "s2");
    assert.equal(payload.sections[0]?.hasImage, true);
    assert.equal(payload.sections[0]?.imageQuery, "yoga outfit product");
    assert.equal(payload.sections[0]?.imageWidth, 300);
    assert.equal(imageSlotId("s2"), "s2-img-0");
    assert.equal(listImageSlots(payload.sections[0]!)[0]?.slotId, "s2-img-0");
  });

  it("imageSlots 数组按图片数派生 slotId", () => {
    const payload = normalizeGroundingFromLlm([
      {
        id: "s3",
        region: "商品 grid",
        hasImage: true,
        imageSlots: [
          { imageQuery: "yoga purple top", imageWidth: 280, imageHeight: 360 },
          { imageQuery: "yoga black leggings", imageWidth: 280, imageHeight: 360 },
        ],
      },
    ]);
    assert.ok(payload);
    const slots = listImageSlots(payload.sections[0]!);
    assert.equal(slots.length, 2);
    assert.equal(slots[0]?.slotId, "s3-img-0");
    assert.equal(slots[1]?.slotId, "s3-img-1");
    assert.equal(slots[0]?.imageQuery, "yoga purple top");
  });

  it("解析 imageSlots.containerHeight", () => {
    const payload = normalizeGroundingFromLlm([
      {
        id: "s3",
        region: "商品",
        hasImage: true,
        imageSlots: [
          {
            imageQuery: "ebike product",
            role: "card",
            containerHeight: "280px",
          },
        ],
      },
    ]);
    assert.ok(payload);
    assert.equal(payload.sections[0]?.imageSlots?.[0]?.containerHeight, "280px");
    assert.equal(payload.sections[0]?.layoutHints?.cardImageTier, undefined);
  });

  it("含 card slot 且无 containerHeight 时缺省 cardImageTier=standard", () => {
    const payload = normalizeGroundingFromLlm([
      {
        id: "s3",
        region: "商品 grid",
        hasImage: true,
        imageSlots: [
          { imageQuery: "yoga top", role: "card" },
          { imageQuery: "yoga pants", role: "card" },
        ],
      },
    ]);
    assert.ok(payload);
    assert.equal(payload.sections[0]?.layoutHints?.cardImageTier, "standard");
  });

  it("保留 layoutHints.cardImageTier", () => {
    const payload = normalizeGroundingFromLlm([
      {
        id: "s3",
        region: "商品 grid",
        layoutHints: { cardImageTier: "tall", gridColumns: 2 },
        hasImage: true,
        imageSlots: [{ imageQuery: "yoga top", role: "card" }],
      },
    ]);
    assert.ok(payload);
    assert.equal(payload.sections[0]?.layoutHints?.cardImageTier, "tall");
    assert.equal(payload.sections[0]?.layoutHints?.gridColumns, 2);
  });

  it("role=logo 的 imageSlots 被剔除且 hasImage 置 false", () => {
    const payload = normalizeGroundingFromLlm([
      {
        id: "s1",
        region: "品牌头栏",
        hasImage: true,
        imageSlots: [{ imageQuery: "alo yoga brand logo", role: "logo" }],
      },
    ]);
    assert.ok(payload);
    const section = payload.sections[0]!;
    assert.equal(section.hasImage, false);
    assert.equal(section.imageSlots, undefined);
  });

  it("混有 logo 与 card 时仅保留 card slot", () => {
    const payload = normalizeGroundingFromLlm([
      {
        id: "s9",
        region: "混合",
        hasImage: true,
        imageSlots: [
          { imageQuery: "brand logo", role: "logo" },
          { imageQuery: "product photo", role: "card" },
        ],
      },
    ]);
    assert.ok(payload);
    const section = payload.sections[0]!;
    assert.equal(section.hasImage, true);
    assert.equal(section.imageSlots?.length, 1);
    assert.equal(section.imageSlots?.[0]?.role, "card");
  });

  it("保留 layoutHints.align", () => {
    const payload = normalizeGroundingFromLlm([
      { id: "s1", region: "头部", layoutHints: { align: "center" } },
    ]);
    assert.ok(payload);
    assert.equal(payload.sections[0]?.layoutHints?.align, "center");
  });

  it("非数组返回 null", () => {
    assert.equal(normalizeGroundingFromLlm({ order: ["s1"], sections: [] }), null);
    assert.equal(normalizeGroundingFromLlm(null), null);
  });
});

describe("singleSectionGroundingPayload", () => {
  it("降级 payload 可直接 inject", () => {
    const result = injectGroundingResult(singleSectionGroundingPayload());
    assert.equal(result.schemaVersion, "1");
    assert.deepEqual(result.order, ["s1"]);
    assert.equal(result.sections[0]?.hasImage, true);
  });
});
