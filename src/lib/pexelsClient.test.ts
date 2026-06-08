import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickPexelsSrc, parsePexelsQueryKeywords, searchPexels, type PexelsPhoto } from "./pexelsClient";

function fakePhoto(sizes: PexelsPhoto["src"]): PexelsPhoto {
  return {
    id: 1,
    width: 2000,
    height: 1000,
    alt: "test",
    photographer: "Tester",
    src: sizes,
  };
}

describe("pickPexelsSrc", () => {
  it("按目标宽度选择档位", () => {
    const src = {
      original: "o",
      large2x: "l2",
      large: "l",
      medium: "m",
      small: "s",
      landscape: "ls",
      tiny: "t",
    };
    const photo = fakePhoto(src);
    assert.equal(pickPexelsSrc(photo, 1400), "l2");
    assert.equal(pickPexelsSrc(photo, 800), "l");
    assert.equal(pickPexelsSrc(photo, 400), "m");
    assert.equal(pickPexelsSrc(photo, 100), "s");
  });
});

describe("searchPexels", () => {
  it("未配置 PEXELS_API_KEY 时返回 PEXELS_API_KEY_MISSING", async () => {
    const prev = process.env.PEXELS_API_KEY;
    delete process.env.PEXELS_API_KEY;
    try {
      const outcome = await searchPexels("coffee shop");
      assert.equal(outcome.ok, false);
      if (!outcome.ok) assert.equal(outcome.reason, "PEXELS_API_KEY_MISSING");
    } finally {
      if (prev === undefined) delete process.env.PEXELS_API_KEY;
      else process.env.PEXELS_API_KEY = prev;
    }
  });
});

describe("parsePexelsQueryKeywords", () => {
  it("分词并去重", () => {
    assert.deepEqual(parsePexelsQueryKeywords("coffee shop banner"), [
      "coffee",
      "shop",
      "banner",
    ]);
  });
});
