import assert from "node:assert/strict";
import { test } from "node:test";
import { pickContrastingTextColor } from "./pickContrastingTextColor";

test("pickContrastingTextColor", () => {
  assert.equal(pickContrastingTextColor("#FDD835"), "#1A1A1A");
  assert.equal(pickContrastingTextColor("#000000"), "#FFFFFF");
});
