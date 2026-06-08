import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferGridColumnsForSection, refineGroundingGridColumns } from "./refineGroundingGridColumns";
import type { GroundingSection, IconQueryItem, TextExtractResult } from "./types";

const trustSection: GroundingSection = {
  sectionId: "s7",
  name: "服务保障说明",
  order: 6,
  components: "UL TÜV 认证 + 门店数",
  layoutHints: { gridColumns: 2 },
};

const socialSection: GroundingSection = {
  sectionId: "s5",
  name: "社交平台",
  order: 4,
  components: "4 个社交 icon",
  layoutHints: { align: "center" },
  hasImage: true,
  imageSlots: [
    { slotId: "s5-img-0", imageQuery: "social", role: "card" },
    { slotId: "s5-img-1", imageQuery: "social", role: "card" },
    { slotId: "s5-img-2", imageQuery: "social", role: "card" },
    { slotId: "s5-img-3", imageQuery: "social", role: "card" },
  ],
};

describe("refineGroundingGridColumns", () => {
  it("信任区 B2 图标≥4 时抬高 gridColumns 至 4", () => {
    const icons: IconQueryItem[] = [
      { id: "i1", regionId: "s7", pack: "tabler", iconQuery: "certificate", colorHex: "#000", label: "UL" },
      { id: "i2", regionId: "s7", pack: "tabler", iconQuery: "award", colorHex: "#000", label: "TUV" },
      { id: "i3", regionId: "s7", pack: "tabler", iconQuery: "building-store", colorHex: "#000", label: "shops" },
      { id: "i4", regionId: "s7", pack: "tabler", iconQuery: "shield-check", colorHex: "#000", label: "warranty" },
    ];
    const textExtract: TextExtractResult = { regions: [] };
    assert.equal(inferGridColumnsForSection(trustSection, icons, textExtract), 4);
    const { grounding, adjustedSectionIds } = refineGroundingGridColumns(
      { sections: [trustSection] },
      icons,
      textExtract
    );
    assert.equal(grounding.sections[0].layoutHints?.gridColumns, 4);
    assert.deepEqual(adjustedSectionIds, ["s7"]);
  });

  it("社交区 4 配图槽推断 columns=4", () => {
    const { grounding } = refineGroundingGridColumns(
      { sections: [socialSection] },
      [],
      { regions: [] }
    );
    assert.equal(grounding.sections[0].layoutHints?.gridColumns, 4);
  });
});
