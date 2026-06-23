import assert from "node:assert/strict";
import { test } from "node:test";
import { IMAGE_PLACEHOLDER_PUBLIC_PATH } from "../lib/imagePlaceholder";
import { resolveAstAssetRequests } from "./backfillAssets";

test("resolveAstAssetRequests：store badge query 不走 Pexels", async () => {
  const manifest = await resolveAstAssetRequests([
    {
      blockId: "img-1",
      kind: "image",
      query: "app-store-badge",
      targetWidth: 135,
    },
    {
      blockId: "img-2",
      kind: "image",
      query: "googleplaybadge",
      targetWidth: 135,
    },
  ]);

  assert.equal(manifest.items.length, 2);
  for (const item of manifest.items) {
    assert.equal(item.ok, true, item.reason);
    assert.match(item.url ?? "", /\/static-assets\/store-badges\/.*\.png$/);
    assert.doesNotMatch(item.url ?? "", /pexels/i);
  }
});

test("resolveAstAssetRequests：image 搜图失败回落本地占位图", async () => {
  const manifest = await resolveAstAssetRequests(
    [
      {
        blockId: "img-1",
        kind: "image",
        query: "__restore_ast_test_no_such_image_query__",
        targetWidth: 600,
      },
    ],
    {
      async resolve() {
        return { ok: false, reason: "PEXELS_NOT_FOUND", detail: "test stub" };
      },
    }
  );

  assert.equal(manifest.items.length, 1);
  const item = manifest.items[0]!;
  assert.equal(item.ok, true);
  assert.equal(item.url, IMAGE_PLACEHOLDER_PUBLIC_PATH);
  assert.equal(item.placeholderFallback, true);
  assert.equal(item.reason, "PEXELS_NOT_FOUND");
});

test("resolveAstAssetRequests：icon 未命中 ok:false 且无 url", async () => {
  const manifest = await resolveAstAssetRequests([
    {
      blockId: "icon-1",
      kind: "icon",
      query: "made-in",
      pack: "simple-icons",
    },
  ]);

  assert.equal(manifest.items.length, 1);
  const item = manifest.items[0]!;
  assert.equal(item.ok, false);
  assert.equal(item.url, undefined);
});
