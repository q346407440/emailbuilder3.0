import assert from "node:assert/strict";
import test from "node:test";
import { effectivePlacementAxes } from "./resolvePlacement";
import { resolvePlacementToCss } from "./resolvePlacementCss";

test("tableRowCell：placement.horizontal 为 end 时主轴靠右（与 tableMatrixCell 同源 margin）", () => {
  const css = resolvePlacementToCss(
    { widthMode: "hug", heightMode: "hug", placement: { horizontal: "end" } },
    "tableRowCell"
  );
  assert.equal(css.marginLeft, "auto");
  assert.equal(css.marginRight, "0");
});

test("tableRowCell：placement.horizontal 为 start 时主轴靠左", () => {
  const css = resolvePlacementToCss(
    { widthMode: "hug", heightMode: "hug", placement: { horizontal: "start" } },
    "tableRowCell"
  );
  assert.equal(css.marginLeft, "0");
  assert.equal(css.marginRight, "auto");
});

test("tableRowCell：placement.horizontal 为 center 时主轴居中", () => {
  const css = resolvePlacementToCss(
    { widthMode: "hug", heightMode: "hug", placement: { horizontal: "center" } },
    "tableRowCell"
  );
  assert.equal(css.marginLeft, "auto");
  assert.equal(css.marginRight, "auto");
});

test("tableRowCell：width fill 时不在主轴上输出水平 margin", () => {
  const css = resolvePlacementToCss(
    { widthMode: "fill", heightMode: "hug", placement: { horizontal: "start" } },
    "tableRowCell"
  );
  assert.equal(css.marginLeft, undefined);
  assert.equal(css.marginRight, undefined);
});

test("tableRowCell：placement.vertical 为 center 时用竖直 margin（td 内 align-self 无效）", () => {
  const css = resolvePlacementToCss(
    { widthMode: "hug", heightMode: "hug", placement: { vertical: "center" } },
    "tableRowCell"
  );
  assert.equal(css.marginTop, "auto");
  assert.equal(css.marginBottom, "auto");
});

test("tableStackCell：placement.horizontal 为 end 时用水平 margin（td 内 align-self 无效）", () => {
  const css = resolvePlacementToCss(
    { widthMode: "hug", heightMode: "hug", placement: { horizontal: "end" } },
    "tableStackCell"
  );
  assert.equal(css.marginLeft, "auto");
  assert.equal(css.marginRight, "0");
});

test("tableStackCell：placement.vertical 为 end 时用主轴 margin", () => {
  const css = resolvePlacementToCss(
    { widthMode: "hug", heightMode: "hug", placement: { vertical: "end" } },
    "tableStackCell"
  );
  assert.equal(css.marginTop, "auto");
  assert.equal(css.marginBottom, "0");
});

test("effectivePlacementAxes 仅读取 placement", () => {
  const axes = effectivePlacementAxes({
    parentKind: "tableRowCell",
    widthMode: "hug",
    heightMode: "hug",
    placement: { horizontal: "start", vertical: "center" },
  });
  assert.equal(axes.horizontal, "start");
  assert.equal(axes.vertical, "center");
});

test("tableMatrixCell：水平居中为双 auto", () => {
  const css = resolvePlacementToCss(
    { widthMode: "hug", heightMode: "hug", placement: { horizontal: "center" } },
    "tableMatrixCell"
  );
  assert.equal(css.marginLeft, "auto");
  assert.equal(css.marginRight, "auto");
});
