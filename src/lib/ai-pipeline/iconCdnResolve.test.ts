import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveIconCdnCandidates,
  resolveIconCdnUrl,
  resolveSlugInIconIndex,
  type IconCdnIndex,
} from "./iconCdnResolve";

const miniTablerIndex: IconCdnIndex = {
  pack: "tabler",
  version: "3.31.0",
  cdnBase: "https://cdn.example/tabler",
  fallbackSlug: "photo",
  slugs: ["package", "truck", "arrow-back-up", "map-pin", "photo", "device-mobile"],
  aliases: {
    "package-2": "package",
    shipping: "truck",
  },
};

describe("resolveSlugInIconIndex", () => {
  it("别名 package-2 → package", () => {
    assert.equal(resolveSlugInIconIndex("package-2", miniTablerIndex).slug, "package");
  });

  it("臆造 brand-alo 走 fallback", () => {
    const r = resolveSlugInIconIndex("brand-alo", miniTablerIndex);
    assert.equal(r.slug, "photo");
    assert.equal(r.usedFallback, true);
  });

  it("精确匹配 shipping 别名 → truck", () => {
    assert.equal(resolveSlugInIconIndex("shipping", miniTablerIndex).slug, "truck");
  });
});

describe("resolveIconCdnUrl", () => {
  it("tabler package-2 解析为 package.svg", () => {
    const r = resolveIconCdnUrl("tabler", "package-2");
    assert.ok(r);
    assert.match(r.src, /\/package\.svg$/);
    assert.equal(r.usedFallback, false);
  });

  it("simple-icons googleplay 精确解析", () => {
    const r = resolveIconCdnUrl("simple-icons", "googleplay");
    assert.ok(r);
    assert.match(r.src, /\/googleplay\.svg$/);
    assert.equal(r.usedFallback, false);
  });

  it("simple-icons google-play 别名 → googleplay", () => {
    const r = resolveIconCdnUrl("simple-icons", "google-play");
    assert.ok(r);
    assert.match(r.src, /\/googleplay\.svg$/);
  });

  it("simple-icons twitter / tw 别名 → x.svg（CDN 已无 twitter.svg）", () => {
    for (const query of ["twitter", "tw"]) {
      const r = resolveIconCdnUrl("simple-icons", query);
      assert.ok(r, query);
      assert.match(r!.src, /\/x\.svg$/);
      assert.equal(r!.usedFallback, false);
    }
  });

  it("simple-icons 臆造 slug 走索引首项 fallback（管线侧会丢弃）", () => {
    const r = resolveIconCdnUrl("simple-icons", "not-a-real-brand-ever");
    assert.ok(r);
    assert.match(r.src, /\/instagram\.svg$/);
    assert.equal(r.usedFallback, true);
  });
});

describe("resolveIconCdnCandidates", () => {
  it("首个候选与 resolveIconCdnUrl 一致（主解析结果优先）", () => {
    const candidates = resolveIconCdnCandidates("tabler", "package-2", 5);
    const primary = resolveIconCdnUrl("tabler", "package-2");
    assert.ok(primary);
    assert.ok(candidates.length >= 1);
    assert.equal(candidates[0].src, primary.src);
  });

  it("不超过 limit，且 src 去重", () => {
    const candidates = resolveIconCdnCandidates("tabler", "package", 3);
    assert.ok(candidates.length <= 3);
    const srcs = candidates.map((c) => c.src);
    assert.equal(new Set(srcs).size, srcs.length);
  });

  it("未知 pack 返回空数组", () => {
    assert.deepEqual(resolveIconCdnCandidates("unknown-pack", "package", 5), []);
  });
});
