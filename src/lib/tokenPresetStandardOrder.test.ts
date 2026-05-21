import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { normalizeTokenPresetTokens, sortTokenPresetFamilies, sortTokenPresetScales } from "./tokenPresetStandardOrder";

describe("tokenPresetStandardOrder", () => {
  it("family 顺序与 public-neutral-saas 一致", () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/token-presets/public-neutral-saas.json"), "utf8")
    );
    const families = Object.keys(raw.presets.default.tokens);
    assert.deepEqual(sortTokenPresetFamilies(families), [
      "colors",
      "fonts",
      "spacing",
      "typography",
      "radius",
    ]);
  });

  it("scale 顺序与 public-neutral-saas colors 一致", () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/token-presets/public-neutral-saas.json"), "utf8")
    );
    const scales = Object.keys(raw.presets.default.tokens.colors);
    assert.deepEqual(sortTokenPresetScales("colors", scales), ["primary", "secondary", "surface"]);
  });

  it("未知键排在标准键之后", () => {
    assert.deepEqual(sortTokenPresetFamilies(["radius", "colors", "custom"]), [
      "colors",
      "radius",
      "custom",
    ]);
    assert.deepEqual(sortTokenPresetScales("colors", ["surface", "primary", "brand"]), [
      "primary",
      "surface",
      "brand",
    ]);
  });

  it("normalizeTokenPresetTokens 将乱序键规范为标准顺序", () => {
    const shuffled = {
      radius: { cta: "9999px", panel: "10px" },
      colors: { surface: "#fff", primary: "#111", secondary: "#666" },
      fonts: { body: "A", heading: "B" },
    };
    const normalized = normalizeTokenPresetTokens(shuffled);
    assert.deepEqual(Object.keys(normalized), ["colors", "fonts", "radius"]);
    assert.deepEqual(Object.keys(normalized.colors), ["primary", "secondary", "surface"]);
  });
});
