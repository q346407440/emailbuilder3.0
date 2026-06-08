import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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

  it("simple-icons 臆造 slug 走 fallback", () => {
    const r = resolveIconCdnUrl("simple-icons", "not-a-real-brand-ever");
    assert.ok(r);
    assert.match(r.src, /\/google\.svg$/);
    assert.equal(r.usedFallback, true);
  });
});
