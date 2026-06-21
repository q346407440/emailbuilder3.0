import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contrastRatio,
  pickContrastingTextColor,
  relativeLuminanceFromHex,
} from "../lib/pickContrastingTextColor";
import { resolveButtonTextColor } from "./resolveButtonTextColor";
import { resolveTone } from "./resolveValue";
import type { RestoreTheme } from "./types";

const theme: RestoreTheme = {
  colors: {
    primary: "#1F4D3A",
    accent: "#B8956B",
    secondary: "#6B6B6B",
    surface: "#FFFFFF",
  },
  spacing: { section: "24px", gap: "12px", pageInline: "18px" },
  typography: { display: "40px", h1: "22px", body: "14px", caption: "12px" },
  radius: { panel: "0px", cta: "0px" },
};

test("pickContrastingTextColor 浅底深字 / 深底白字", () => {
  assert.equal(pickContrastingTextColor("#FFFFFF"), "#1A1A1A");
  assert.equal(pickContrastingTextColor("#1F4D3A"), "#FFFFFF");
});

test("relativeLuminanceFromHex 白比绿亮", () => {
  const white = relativeLuminanceFromHex("#FFFFFF");
  const green = relativeLuminanceFromHex("#1F4D3A");
  assert.ok(white != null && green != null && white > green);
});

test("contrastRatio 白底黑字高于同色", () => {
  const good = contrastRatio("#FFFFFF", "#1A1A1A");
  const bad = contrastRatio("#FFFFFF", "#FFFFFF");
  assert.ok(good != null && bad != null && good > bad);
});

test("resolveButtonTextColor surface 底 + surface 字 → primary 字", () => {
  const bg = resolveTone("props.buttonStyle.backgroundColor", "surface");
  const preferred = resolveTone("props.buttonStyle.textColor", "surface");
  const fixed = resolveButtonTextColor(
    "props.buttonStyle.textColor",
    bg,
    preferred,
    theme
  );
  assert.deepEqual(fixed.value, { $themeRef: "colors.primary" });
});

test("resolveButtonTextColor primary 底 + surface 字保持不变", () => {
  const bg = resolveTone("props.buttonStyle.backgroundColor", "primary");
  const preferred = resolveTone("props.buttonStyle.textColor", "surface");
  const fixed = resolveButtonTextColor(
    "props.buttonStyle.textColor",
    bg,
    preferred,
    theme
  );
  assert.deepEqual(fixed.value, { $themeRef: "colors.surface" });
});
