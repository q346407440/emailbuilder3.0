import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compactStoreBadgeQuery,
  normalizeStoreBadgeQuery,
  resolveStoreBadgeAssetId,
  resolveStoreBadgeUrl,
} from "./storeBadgeResolve";

describe("storeBadgeResolve", () => {
  it("normalizeStoreBadgeQuery 小写连字符", () => {
    assert.equal(normalizeStoreBadgeQuery("  App Store Badge "), "app-store-badge");
  });

  it("compactStoreBadgeQuery 去标点", () => {
    assert.equal(compactStoreBadgeQuery("google-play-badge"), "googleplaybadge");
  });

  it("app-store-badge 精确命中", () => {
    assert.equal(resolveStoreBadgeAssetId("app-store-badge"), "app-store-badge");
  });

  it("googleplaybadge 变体命中", () => {
    assert.equal(resolveStoreBadgeAssetId("googleplaybadge"), "google-play-badge");
  });

  it("appstorebadges 变体命中", () => {
    assert.equal(resolveStoreBadgeAssetId("app-storebadges"), "app-store-badge");
  });

  it("普通搜图词不命中", () => {
    assert.equal(resolveStoreBadgeAssetId("woman fashion product photo"), null);
  });

  it("resolveStoreBadgeUrl 返回公共路径", () => {
    const hit = resolveStoreBadgeUrl("app-store-badge");
    assert.ok(hit);
    assert.equal(hit.publicPath, "/static-assets/store-badges/app-store-badge.png");
    assert.match(hit.alt, /App Store/i);
  });

  it("resolveStoreBadgeUrl 支持 assetBase 前缀", () => {
    const hit = resolveStoreBadgeUrl("google-play-badge", {
      assetBase: "http://127.0.0.1:5180",
    });
    assert.ok(hit);
    assert.equal(
      hit.publicPath,
      "http://127.0.0.1:5180/static-assets/store-badges/google-play-badge.png"
    );
  });
});
