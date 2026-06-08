import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPexelsImageSlot, listPexelsImageSlots, listImageSlots } from "./groundingImage";
import type { GroundingSection } from "./types";

describe("groundingImage logo slot policy", () => {
  it("isPexelsImageSlot 排除 role=logo", () => {
    assert.equal(isPexelsImageSlot({ slotId: "s1-img-0", imageQuery: "alo", role: "logo" }), false);
    assert.equal(isPexelsImageSlot({ slotId: "s3-img-0", imageQuery: "yoga", role: "card" }), true);
  });

  it("listPexelsImageSlots 不含 logo slot", () => {
    const section: GroundingSection = {
      sectionId: "s1",
      name: "品牌头栏",
      order: 0,
      hasImage: true,
      imageSlots: [
        { slotId: "s1-img-0", imageQuery: "brand logo", role: "logo" },
        { slotId: "s3-img-0", imageQuery: "yoga top", role: "card" },
      ],
    };
    assert.equal(listImageSlots(section).length, 2);
    assert.equal(listPexelsImageSlots(section).length, 1);
    assert.equal(listPexelsImageSlots(section)[0]?.slotId, "s3-img-0");
  });
});
