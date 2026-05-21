import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPlacementAxisValueAllowed,
  isRelativePlacementAxisConfigurable,
  isRelativePlacementSupported,
  listAllowedPlacementGridOptions,
  resolveRelativePlacementUiMode,
  normalizeTemplatePlacement,
  placementAxisValidationReason,
  relativePlacementValidationReason,
} from "./placementConfigurability.ts";
import type { EmailTemplate } from "../types/email";

describe("placementConfigurability", () => {
  it("fill 宽时不可配置 placement.horizontal 为非 start", () => {
    const input = {
      parentKind: "tableStackCell" as const,
      widthMode: "fill" as const,
      heightMode: "hug" as const,
      placement: { horizontal: "center" as const },
    };
    assert.equal(isRelativePlacementAxisConfigurable("horizontal", input), false);
    assert.equal(isPlacementAxisValueAllowed("horizontal", "center", input), false);
    assert.match(placementAxisValidationReason("horizontal", "center", input) ?? "", /不可配置/);
  });

  it("resolveRelativePlacementUiMode 按父级只展示单轴", () => {
    assert.equal(
      resolveRelativePlacementUiMode({
        parentKind: "tableStackCell",
        widthMode: "fill",
        heightMode: "hug",
      }),
      "none"
    );
    assert.equal(
      resolveRelativePlacementUiMode({
        parentKind: "tableStackCell",
        widthMode: "hug",
        heightMode: "hug",
      }),
      "horizontal"
    );
    assert.equal(
      resolveRelativePlacementUiMode({
        parentKind: "tableStackCell",
        widthMode: "hug",
        heightMode: "fill",
      }),
      "horizontal"
    );
    assert.equal(
      resolveRelativePlacementUiMode({
        parentKind: "tableRowCell",
        widthMode: "fill",
        heightMode: "hug",
      }),
      "vertical"
    );
    assert.equal(
      resolveRelativePlacementUiMode({
        parentKind: "tableRowCell",
        widthMode: "hug",
        heightMode: "hug",
      }),
      "vertical"
    );
  });

  it("纵排父 + hug 宽：水平轴可配 center/end", () => {
    const input = {
      parentKind: "tableStackCell" as const,
      widthMode: "hug" as const,
      heightMode: "hug" as const,
    };
    assert.equal(isRelativePlacementAxisConfigurable("horizontal", input), true);
    assert.equal(isRelativePlacementAxisConfigurable("vertical", input), true);
    assert.equal(isPlacementAxisValueAllowed("horizontal", "center", input), true);
    assert.equal(listAllowedPlacementGridOptions(input).length, 9);
  });

  it("纵排父 + fixed 宽：水平轴可配", () => {
    const input = {
      parentKind: "tableStackCell" as const,
      widthMode: "fixed" as const,
      heightMode: "hug" as const,
    };
    assert.equal(isRelativePlacementAxisConfigurable("horizontal", input), true);
    assert.equal(isPlacementAxisValueAllowed("horizontal", "end", input), true);
  });

  it("纵排父 + hug 宽 + fill 高：仅水平轴可配非 start", () => {
    const input = {
      parentKind: "tableStackCell" as const,
      widthMode: "hug" as const,
      heightMode: "fill" as const,
    };
    assert.equal(isRelativePlacementSupported(input), true);
    assert.equal(isRelativePlacementAxisConfigurable("horizontal", input), true);
    assert.equal(isRelativePlacementAxisConfigurable("vertical", input), false);
    assert.equal(isPlacementAxisValueAllowed("horizontal", "center", input), true);
    assert.equal(isPlacementAxisValueAllowed("vertical", "center", input), false);
    const options = listAllowedPlacementGridOptions(input);
    assert.equal(options.length, 3);
    assert.ok(options.every((o) => o.vertical === "start"));
  });

  it("纵排父级 + fill 宽时不支持相对父级摆放", () => {
    const input = {
      parentKind: "tableStackCell" as const,
      widthMode: "fill" as const,
      heightMode: "hug" as const,
    };
    assert.equal(isRelativePlacementSupported(input), false);
    assert.equal(listAllowedPlacementGridOptions(input).length, 0);
    assert.match(
      relativePlacementValidationReason({ horizontal: "start", vertical: "start" }, input) ?? "",
      /不支持相对父级摆放/
    );
    assert.match(
      relativePlacementValidationReason({ horizontal: "center" }, input) ?? "",
      /不支持相对父级摆放/
    );
  });

  it("横排父级 + fill 高时不支持相对父级摆放", () => {
    const input = {
      parentKind: "tableRowCell" as const,
      widthMode: "hug" as const,
      heightMode: "fill" as const,
    };
    assert.equal(isRelativePlacementSupported(input), false);
    assert.equal(listAllowedPlacementGridOptions(input).length, 0);
    assert.match(
      relativePlacementValidationReason({ vertical: "center" }, input) ?? "",
      /横排布局.*高度为铺满/
    );
  });

  it("横排父 + hug 高 + fill 宽：仅竖直轴可配非 start", () => {
    const input = {
      parentKind: "tableRowCell" as const,
      widthMode: "fill" as const,
      heightMode: "hug" as const,
    };
    assert.equal(isRelativePlacementSupported(input), true);
    assert.equal(isRelativePlacementAxisConfigurable("horizontal", input), false);
    assert.equal(isRelativePlacementAxisConfigurable("vertical", input), true);
    assert.equal(listAllowedPlacementGridOptions(input).length, 3);
    assert.ok(listAllowedPlacementGridOptions(input).every((o) => o.horizontal === "start"));
  });

  it("横排父 + hug 高 + hug 宽：双轴可配", () => {
    const input = {
      parentKind: "tableRowCell" as const,
      widthMode: "hug" as const,
      heightMode: "hug" as const,
    };
    assert.equal(isRelativePlacementAxisConfigurable("vertical", input), true);
    assert.equal(isRelativePlacementAxisConfigurable("horizontal", input), true);
    assert.equal(listAllowedPlacementGridOptions(input).length, 9);
  });

  it("横排父 + fixed 高：竖直轴可配 center/end（品牌行 Logo 竖直居中）", () => {
    const input = {
      parentKind: "tableRowCell" as const,
      widthMode: "fixed" as const,
      heightMode: "fixed" as const,
    };
    assert.equal(isRelativePlacementAxisConfigurable("vertical", input), true);
    assert.equal(isPlacementAxisValueAllowed("vertical", "center", input), true);
    assert.equal(isPlacementAxisValueAllowed("vertical", "end", input), true);
    assert.equal(isRelativePlacementAxisConfigurable("horizontal", input), true);
  });

  it("横排父 + hug 高 + fill 宽：仅竖直轴可配（左列三点）", () => {
    const input = {
      parentKind: "tableRowCell" as const,
      widthMode: "fill" as const,
      heightMode: "hug" as const,
    };
    assert.equal(isRelativePlacementAxisConfigurable("vertical", input), true);
    assert.equal(isRelativePlacementAxisConfigurable("horizontal", input), false);
    const options = listAllowedPlacementGridOptions(input);
    assert.equal(options.length, 3);
    assert.ok(options.every((o) => o.horizontal === "start"));
    assert.deepEqual(
      options.map((o) => o.vertical),
      ["start", "center", "end"]
    );
  });

  it("不可配置轴上的 start 也应 normalize 移除", () => {
    const template = {
      schemaVersion: "3.0.0",
      emailId: "t",
      templateId: "t",
      templateVersion: 1,
      locale: "en-US",
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["row"],
          props: { width: "600px" },
          wrapperStyle: { placement: { vertical: "start" }, widthMode: "fill", heightMode: "hug" },
        },
        row: {
          id: "row",
          type: "layout",
          parentId: "root",
          children: [],
          props: { direction: "horizontal" },
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            placement: { horizontal: "start", vertical: "start" },
          },
        },
      },
    } as unknown as EmailTemplate;
    const { template: next, changes } = normalizeTemplatePlacement(template);
    assert.ok(changes.includes("root"));
    assert.ok(changes.includes("row"));
    assert.equal(next.blocks.root?.wrapperStyle?.placement, undefined);
    assert.equal(next.blocks.row?.wrapperStyle?.placement, undefined);
  });

  it("normalizeTemplatePlacement 清除无效 placement", () => {
    const template = {
      schemaVersion: "3.0.0",
      emailId: "t",
      templateId: "t",
      templateVersion: 1,
      locale: "en-US",
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["child"],
          props: { width: "600px" },
        },
        child: {
          id: "child",
          type: "text",
          parentId: "root",
          children: [],
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            placement: { horizontal: "center", vertical: "start" },
          },
          props: { content: "<p>x</p>" },
        },
      },
    } as unknown as EmailTemplate;
    const { template: next, changes } = normalizeTemplatePlacement(template);
    assert.equal(changes.length, 1);
    assert.equal(next.blocks.child?.wrapperStyle?.placement, undefined);
  });
});
