import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSectionAllowlists,
  sanitizeCompactSectionRoot,
  validateCompactSectionRoot,
} from "./sectionCompactGuard";
import type { CompactNode, GroundingSection, TextExtractResult } from "./types";

const sectionS8: GroundingSection = {
  sectionId: "s8",
  name: "社交平台",
  order: 7,
  components: "4个社交媒体图标，并排排列",
};

const textExtractS8: TextExtractResult = {
  schemaVersion: "1",
  regions: [],
};

const iconQueries = [
  { id: "icon_instagram", regionId: "s8", pack: "simple-icons" as const, iconQuery: "instagram", colorHex: "#000000" },
  { id: "icon_shipping", regionId: "s7", pack: "tabler" as const, iconQuery: "package", colorHex: "#000000" },
];

const assetManifest = {
  images: {},
  icons: {
    icon_instagram: { src: "https://cdn.example/instagram.svg", colorHex: "#000000" },
    icon_shipping: { src: "https://cdn.example/shipping.svg", colorHex: "#000000" },
  },
};

describe("sectionCompactGuard", () => {
  it("buildSectionAllowlists 只包含本区 iconRef", () => {
    const lists = buildSectionAllowlists("s8", sectionS8, textExtractS8, iconQueries, assetManifest);
    assert.deepEqual([...lists.iconRefs], ["icon_instagram"]);
    assert.equal(lists.textIds.size, 0);
  });

  it("validateCompactSectionRoot 拒绝跨区 iconRef", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "horizontal", gap: "12px" },
      children: [
        { kind: "content.icon", props: { iconRef: "icon_shipping" } },
      ],
    };
    const lists = buildSectionAllowlists("s8", sectionS8, textExtractS8, iconQueries, assetManifest);
    const errors = validateCompactSectionRoot(root, lists, sectionS8);
    assert.ok(errors.some((e) => e.includes("icon_shipping")));
  });

  it("sanitizeCompactSectionRoot 丢弃跨区 icon 并保留本区 icon", () => {
    const root: CompactNode = {
      kind: "layout.container",
      props: { direction: "horizontal", gap: "12px" },
      children: [
        { kind: "content.icon", props: { iconRef: "icon_shipping" } },
        { kind: "content.icon", props: { iconRef: "icon_instagram" } },
      ],
    };
    const lists = buildSectionAllowlists("s8", sectionS8, textExtractS8, iconQueries, assetManifest);
    const out = sanitizeCompactSectionRoot(root, lists, sectionS8);
    assert.ok(out);
    assert.equal(out!.children?.length, 1);
    assert.equal(out!.children![0]!.props?.iconRef, "icon_instagram");
  });

  it("sanitizeCompactSectionRoot 丢弃非法 image ref，保留合法 slot", () => {
    const sectionS3: GroundingSection = {
      sectionId: "s3",
      name: "商品展示",
      order: 2,
      hasImage: true,
      imageSlots: [
        { slotId: "s3-img-0", imageQuery: "yoga purple" },
        { slotId: "s3-img-1", imageQuery: "yoga black" },
      ],
    };
    const lists = buildSectionAllowlists("s3", sectionS3, textExtractS8, [], {
      images: {
        "s3-img-0": { url: "https://example/a.jpg" },
        "s3-img-1": { url: "https://example/b.jpg" },
      },
      icons: {},
    });
    const root: CompactNode = {
      kind: "layout.grid",
      props: { columns: 2, gap: "12px" },
      children: [
        { kind: "content.image", wrapper: { backgroundImageRef: "s3-img-0" } },
        { kind: "content.image", wrapper: { backgroundImageRef: "s3-bad" } },
      ],
    };
    const out = sanitizeCompactSectionRoot(root, lists, sectionS3);
    assert.ok(out);
    assert.equal(out!.children?.length, 1);
    assert.equal(out!.children![0]!.wrapper?.backgroundImageRef, "s3-img-0");
  });

  it("buildSectionAllowlists 不含 role=logo 的 image slot", () => {
    const sectionS1: GroundingSection = {
      sectionId: "s1",
      name: "品牌头栏",
      order: 0,
      hasImage: true,
      imageSlots: [
        { slotId: "s1-img-0", imageQuery: "brand logo", role: "logo" },
        { slotId: "s1-img-1", imageQuery: "hero banner", role: "hero" },
      ],
    };
    const lists = buildSectionAllowlists("s1", sectionS1, textExtractS8, [], assetManifest);
    assert.deepEqual([...lists.imageSlotIds], ["s1-img-1"]);
  });
});
