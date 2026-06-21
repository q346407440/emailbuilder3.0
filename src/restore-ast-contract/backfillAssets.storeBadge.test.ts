import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAstAssetRequests } from "./backfillAssets";

test("resolveAstAssetRequests：store badge query 不走 Pexels", async () => {
  const manifest = await resolveAstAssetRequests([
    {
      blockId: "img-1",
      kind: "image",
      query: "app-store-badge",
      targetWidth: 135,
      required: true,
    },
    {
      blockId: "img-2",
      kind: "image",
      query: "googleplaybadge",
      targetWidth: 135,
      required: true,
    },
  ]);

  assert.equal(manifest.items.length, 2);
  for (const item of manifest.items) {
    assert.equal(item.ok, true, item.reason);
    assert.match(item.url ?? "", /\/static-assets\/store-badges\/.*\.png$/);
    assert.doesNotMatch(item.url ?? "", /pexels/i);
  }
});
