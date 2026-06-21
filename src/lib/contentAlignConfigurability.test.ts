import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate, EmailBlock } from "../types/email";
import {
  buildContentAlignInspectorHint,
  collectContentAlignEffectivenessIssues,
  normalizeBlockWrapperContentAlign,
  resolveContentAlignAxisConfigurability,
  resolveContentAlignInspectorPresentation,
  resolveContentAlignInspectorContext,
  effectiveContentAlignLayoutDirection,
} from "./contentAlignConfigurability";
import { validateTemplate } from "./validate";

function layoutBlock(
  id: string,
  direction: "vertical" | "horizontal",
  children: string[],
  wrapperExtra: Record<string, unknown> = {}
): EmailBlock {
  return {
    id,
    type: "layout" as const,
    parentId: "root",
    children,
    wrapperStyle: {
      contentAlign: { horizontal: "left", vertical: "top" },
      widthMode: "fill",
      heightMode: "hug",
      ...wrapperExtra,
    },
    props: { direction, gapMode: "fixed" as const, gap: "8px" },
    bindings: {},
  } as EmailBlock;
}

describe("contentAlignConfigurability", () => {
  it("layout 栈内 hug 子块：交叉轴 contentAlign 可配", () => {
    const template = {
      blocks: {
        stage: layoutBlock("stage", "vertical", ["chip"], {
          heightMode: "fixed",
          height: "80px",
        }),
        chip: {
          id: "chip",
          type: "text" as const,
          parentId: "stage",
          children: [],
          wrapperStyle: {
            widthMode: "hug",
            heightMode: "hug",
            contentAlign: { horizontal: "center", vertical: "top" },
          },
          props: {},
          bindings: {},
        },
      },
    } as unknown as EmailTemplate;
    const chip = template.blocks.chip;
    const ctx = resolveContentAlignInspectorContext(template, chip);
    assert.equal(ctx.parentLayoutDirection, "vertical");
    assert.equal(resolveContentAlignAxisConfigurability("horizontal", ctx).configurable, true);
    assert.equal(collectContentAlignEffectivenessIssues("chip", template, chip).length, 0);
  });

  it("grid 矩阵格内 hug 子块：水平 contentAlign 可配", () => {
    const template = {
      blocks: {
        g: {
          id: "g",
          type: "grid" as const,
          parentId: "root",
          children: ["chip"],
          wrapperStyle: {
            contentAlign: { horizontal: "left", vertical: "top" },
            widthMode: "fill",
            heightMode: "fixed",
            height: "64px",
          },
          props: { columns: 1, gap: "0" },
          bindings: {},
        },
        chip: {
          id: "chip",
          type: "text" as const,
          parentId: "g",
          children: [],
          wrapperStyle: {
            widthMode: "hug",
            heightMode: "hug",
            contentAlign: { horizontal: "right", vertical: "top" },
          },
          props: {},
          bindings: {},
        },
      },
    } as unknown as EmailTemplate;
    const chip = template.blocks.chip;
    const ctx = resolveContentAlignInspectorContext(template, chip);
    assert.equal(ctx.parentBlockType, "grid");
    assert.equal(resolveContentAlignAxisConfigurability("horizontal", ctx).configurable, true);
    const issues = collectContentAlignEffectivenessIssues("chip", template, chip);
    assert.equal(issues.length, 0);
  });

  it("layout.grid：双轴 contentAlign 均可配（定高壳）", () => {
    const template = {
      blocks: {
        g: {
          id: "g",
          type: "grid" as const,
          parentId: "root",
          children: ["a"],
          wrapperStyle: {
            contentAlign: { horizontal: "left", vertical: "center" },
            widthMode: "fill",
            heightMode: "fixed",
            height: "72px",
          },
          props: { columns: 1, gapMode: "fixed", gap: "0" },
          bindings: {},
        },
        a: {
          id: "a",
          type: "text" as const,
          parentId: "g",
          children: [],
          wrapperStyle: {
            widthMode: "hug",
            heightMode: "hug",
            contentAlign: { horizontal: "left", vertical: "top" },
          },
          props: {},
          bindings: {},
        },
      },
    } as unknown as EmailTemplate;
    const g = template.blocks.g;
    assert.equal(effectiveContentAlignLayoutDirection(g), "vertical");
    const ctx = resolveContentAlignInspectorContext(template, g);
    assert.equal(ctx.layoutDirection, "vertical");
    assert.equal(ctx.blockType, "grid");
    assert.equal(resolveContentAlignAxisConfigurability("vertical", ctx).configurable, true);
    const h = resolveContentAlignAxisConfigurability("horizontal", ctx);
    assert.equal(h.configurable, true);
    const issues = collectContentAlignEffectivenessIssues("g", template, {
      ...g,
      wrapperStyle: {
        ...g.wrapperStyle,
        contentAlign: { horizontal: "center", vertical: "center" },
      },
    });
    assert.equal(issues.length, 0);
  });

  it("纵排 layout：定高壳双轴均可配", () => {
    const template = {
      blocks: {
        col: layoutBlock("col", "vertical", ["a"], { heightMode: "fixed", height: "100px" }),
        a: {
          id: "a",
          type: "text" as const,
          parentId: "col",
          children: [],
          wrapperStyle: { widthMode: "fill", heightMode: "hug", contentAlign: { horizontal: "left", vertical: "top" } },
          props: {},
          bindings: {},
        },
      },
    } as unknown as EmailTemplate;
    const ctx = resolveContentAlignInspectorContext(template, template.blocks.col);
    assert.equal(ctx.layoutDirection, "vertical");
    const v = resolveContentAlignAxisConfigurability("vertical", ctx);
    assert.equal(v.configurable, true);
    const h = resolveContentAlignAxisConfigurability("horizontal", ctx);
    assert.equal(h.configurable, true);
  });

  it("normalizeBlockWrapperContentAlign：纵排改横排时保留有效 vertical", () => {
    const inner = layoutBlock(
      "inner",
      "vertical",
      [],
      {
        contentAlign: { horizontal: "left", vertical: "center" },
        heightMode: "fixed",
        height: "120px",
      }
    );
    const template = { blocks: { inner } } as unknown as EmailTemplate;
    const horizontalBlock = {
      ...inner,
      props: { ...inner.props, direction: "horizontal" as const },
    } as unknown as EmailBlock;
    const { wrapperStyle, changed } = normalizeBlockWrapperContentAlign(
      { ...template, blocks: { inner: horizontalBlock } },
      "inner",
      horizontalBlock
    );
    assert.equal(changed, false);
    assert.equal(wrapperStyle?.contentAlign?.vertical, "center");
    const issues = collectContentAlignEffectivenessIssues(
      "inner",
      { ...template, blocks: { inner: { ...horizontalBlock, wrapperStyle } } },
      { ...horizontalBlock, wrapperStyle: wrapperStyle! }
    );
    assert.equal(issues.length, 0);
  });

  it("normalizeBlockWrapperContentAlign：横排改纵排时保留有效 horizontal", () => {
    const inner = layoutBlock(
      "inner",
      "horizontal",
      [],
      {
        contentAlign: { horizontal: "center", vertical: "top" },
        heightMode: "fixed",
        height: "120px",
      }
    );
    const verticalBlock = {
      ...inner,
      props: { ...inner.props, direction: "vertical" as const },
    } as unknown as EmailBlock;
    const template = { blocks: { inner: verticalBlock } } as unknown as EmailTemplate;
    const { wrapperStyle, changed } = normalizeBlockWrapperContentAlign(
      template,
      "inner",
      verticalBlock
    );
    assert.equal(changed, false);
    assert.equal(wrapperStyle?.contentAlign?.horizontal, "center");
  });

  it("横排 layout：定高壳双轴均可配", () => {
    const template = {
      blocks: {
        row: layoutBlock("row", "horizontal", ["a"], { heightMode: "fixed", height: "100px" }),
        a: {
          id: "a",
          type: "text" as const,
          parentId: "row",
          children: [],
          wrapperStyle: { widthMode: "hug", heightMode: "hug", contentAlign: { horizontal: "left", vertical: "top" } },
          props: {},
          bindings: {},
        },
      },
    } as unknown as EmailTemplate;
    const ctx = resolveContentAlignInspectorContext(template, template.blocks.row);
    const h = resolveContentAlignAxisConfigurability("horizontal", ctx);
    assert.equal(h.configurable, true);
    const v = resolveContentAlignAxisConfigurability("vertical", ctx);
    assert.equal(v.configurable, true);
  });

  it("纵排 + hug 高 → 竖直轴仍可配", () => {
    const template = {
      blocks: {
        col: layoutBlock("col", "vertical", ["a"]),
        a: {
          id: "a",
          type: "text" as const,
          parentId: "col",
          children: [],
          wrapperStyle: { widthMode: "hug", heightMode: "hug", contentAlign: { horizontal: "left", vertical: "top" } },
          props: {},
          bindings: {},
        },
      },
    } as unknown as EmailTemplate;
    const ctx = resolveContentAlignInspectorContext(template, template.blocks.col);
    const v = resolveContentAlignAxisConfigurability("vertical", ctx);
    assert.equal(v.configurable, true);
  });

  it("纵排 layout 定高壳可持久化 horizontal=center", () => {
    const col = layoutBlock("col", "vertical", [], {
      contentAlign: { horizontal: "center", vertical: "center" },
      heightMode: "fixed",
      height: "100px",
    });
    const template = { blocks: { col } } as unknown as EmailTemplate;
    const issues = collectContentAlignEffectivenessIssues("col", template, col);
    assert.equal(issues.length, 0);
  });

  it("纵排 layout 定高时 vertical=center 允许持久化", () => {
    const col = layoutBlock("col", "vertical", [], {
      contentAlign: { horizontal: "left", vertical: "center" },
      heightMode: "fixed",
      height: "100px",
    });
    const template = { blocks: { col } } as unknown as EmailTemplate;
    const issues = collectContentAlignEffectivenessIssues("col", template, col);
    assert.equal(issues.length, 0);
  });

  it("纵排 image 叠放：双轴均可配（非 hug）", () => {
    const img = {
      id: "img",
      type: "image" as const,
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "fixed",
        height: "200px",
        contentAlign: { horizontal: "left", vertical: "top" },
      },
      props: { direction: "vertical", gapMode: "fixed", gap: "8px" },
      bindings: {},
    } as unknown as EmailBlock;
    const template = { blocks: { img } } as unknown as EmailTemplate;
    const p = resolveContentAlignInspectorPresentation(template, img);
    assert.equal(p.visibility.showHorizontal, true);
    assert.equal(p.visibility.showVertical, true);
    assert.equal(p.vertical.configurable, true);
    assert.equal(p.horizontal.configurable, true);
  });

  it("纵排 layout Inspector 常显双轴且均可配", () => {
    const template = {
      blocks: {
        col: layoutBlock("col", "vertical", [], { heightMode: "fixed", height: "120px" }),
      },
    } as unknown as EmailTemplate;
    const p = resolveContentAlignInspectorPresentation(template, template.blocks.col);
    assert.equal(p.visibility.showHorizontal, true);
    assert.equal(p.visibility.showVertical, true);
    assert.equal(p.horizontal.configurable, true);
    assert.equal(p.vertical.configurable, true);
  });

  it("横排 layout Inspector 常显双轴且均可配", () => {
    const template = {
      blocks: {
        row: layoutBlock("row", "horizontal", [], { heightMode: "fixed", height: "80px" }),
      },
    } as unknown as EmailTemplate;
    const p = resolveContentAlignInspectorPresentation(template, template.blocks.row);
    assert.equal(p.visibility.showHorizontal, true);
    assert.equal(p.visibility.showVertical, true);
    assert.equal(p.horizontal.configurable, true);
    assert.equal(p.vertical.configurable, true);
  });

  it("纵排 hint 说明容器内双轴对齐", () => {
    const ctx = resolveContentAlignInspectorContext(
      { blocks: { col: layoutBlock("col", "vertical", []) } } as unknown as EmailTemplate,
      layoutBlock("col", "vertical", [])
    );
    const hint = buildContentAlignInspectorHint(ctx);
    assert.match(hint, /水平与竖直对齐/);
    assert.doesNotMatch(hint, /请改子级/);
  });

  it("横排 hint 说明容器内双轴对齐", () => {
    const ctx = resolveContentAlignInspectorContext(
      { blocks: { row: layoutBlock("row", "horizontal", []) } } as unknown as EmailTemplate,
      layoutBlock("row", "horizontal", [])
    );
    const hint = buildContentAlignInspectorHint(ctx);
    assert.match(hint, /水平与竖直对齐/);
    assert.doesNotMatch(hint, /请改子级/);
  });

  it("hug 宽 → 水平轴可配", () => {
    const text = {
      id: "t",
      type: "text" as const,
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "hug",
        heightMode: "fill",
        contentAlign: { horizontal: "center", vertical: "top" },
      },
      props: {},
      bindings: {},
    } as unknown as EmailBlock;
    const template = { blocks: { t: text } } as unknown as EmailTemplate;
    const ctx = resolveContentAlignInspectorContext(template, text);
    const h = resolveContentAlignAxisConfigurability("horizontal", ctx);
    assert.equal(h.configurable, true);
  });

  it("hug 高 → 竖直轴可配（叶子块）", () => {
    const text = {
      id: "t",
      type: "text" as const,
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        contentAlign: { horizontal: "left", vertical: "center" },
      },
      props: {},
      bindings: {},
    } as unknown as EmailBlock;
    const template = { blocks: { t: text } } as unknown as EmailTemplate;
    const ctx = resolveContentAlignInspectorContext(template, text);
    const v = resolveContentAlignAxisConfigurability("vertical", ctx);
    assert.equal(v.configurable, true);
  });

  it("hug 场景允许非中性值，不命中有效性校验", () => {
    const text = {
      id: "t",
      type: "text" as const,
      parentId: "root",
      children: [],
      wrapperStyle: {
        widthMode: "hug",
        heightMode: "hug",
        contentAlign: { horizontal: "center", vertical: "bottom" },
      },
      props: {
        textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
        bold: false,
        italic: false,
        decoration: "none",
      },
      bindings: {},
    } as unknown as EmailBlock;
    const template = {
      schemaVersion: "4.0.0",
      templateId: "x",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["t"],
          wrapperStyle: { widthMode: "fill", heightMode: "hug" },
          props: {
            width: "600px",
            backgroundColor: "#fff",
            padding: { top: "0", right: "0", bottom: "0", left: "0" },
            border: { style: "solid", color: "rgba(0,0,0,0)", top: "0", right: "0", bottom: "0", left: "0" },
            gapMode: "fixed",
            gap: "0",
          },
          bindings: {},
        },
        t: text,
      },
    } as unknown as EmailTemplate;
    const issues = collectContentAlignEffectivenessIssues("t", template, text);
    assert.equal(issues.length, 0);
    const validated = validateTemplate(template);
    assert.equal(
      validated.some((i) => i.path === "blocks.t.wrapperStyle.contentAlign.horizontal"),
      false
    );
  });
});
