import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { validatePayloadAgainstTemplate, validateTemplate } from "./validate";
import { expandRepeatRegions } from "./repeatRegion";
import { evaluateVisibilityRule } from "../visibility-contract";
import { applyVisibilityRules } from "./visibility";

function baseTemplate(): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "visibility-test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "email.root", name: "画布" },
      pointsBox: { blockType: "layout.container", name: "积分容器" },
      note: { blockType: "content.text", name: "积分说明" },
      list: { blockType: "layout.container", name: "商品列表" },
      row: { blockType: "content.text", name: "商品行" },
    },
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["pointsBox", "list"],
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
        props: {
          backgroundColor: "#ffffff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
      },
      pointsBox: {
        id: "pointsBox",
        type: "layout",
        parentId: "root",
        children: ["note"],
        visibility: {
          slotId: "points",
          valueType: "number",
          operator: "greaterThan",
          compareValue: 0,
          label: "积分",
        },
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
          borderRadius: { mode: "unified", radius: "0" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      note: {
        id: "note",
        type: "text",
        parentId: "pointsBox",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "你有积分" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
        },
      },
      list: {
        id: "list",
        type: "layout",
        parentId: "root",
        children: ["row"],
        visibility: {
          slotId: "products",
          valueType: "collection",
          operator: "isNotEmpty",
          itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
          label: "商品列表",
        },
        repeat: {
          mode: "collection",
          slotId: "products",
          prototypeChildIds: ["row"],
          fallbackChildIds: ["row"],
          itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
          fieldMappings: [
            {
              id: "title-to-content",
              sourcePath: "title",
              targetBlockId: "row",
              targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
              label: "商品名称",
            },
          ],
        },
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
          borderRadius: { mode: "unified", radius: "0" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      row: {
        id: "row",
        type: "text",
        parentId: "list",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "默认商品" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
        },
      },
    },
  };
}

const BASE_PAYLOAD_SLOTS: EmailPayload["slots"] = {
  points: { label: "积分", valueType: "number" },
  products: {
    label: "商品列表",
    valueType: "collection",
    itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
  },
};

function payload(
  values: EmailPayload["values"],
  extraSlots?: EmailPayload["slots"]
): EmailPayload {
  return {
    schemaVersion: "1.0.0",
    slots: { ...BASE_PAYLOAD_SLOTS, ...extraSlots },
    values,
  };
}

describe("visibility", () => {
  it("simulateAllHidden：无视 payload，凡带 visibility 的子树一律裁剪", () => {
    const template = baseTemplate();
    const payloadFull = payload({ points: 99, products: [{ title: "A" }] });
    const pruned = applyVisibilityRules(template, payloadFull, { simulateAllHidden: true });
    assert.equal(pruned.blocks.pointsBox, undefined);
    assert.equal(pruned.blocks.list, undefined);
    assert.deepEqual(pruned.blocks.root.children, []);
  });

  it("满足单条数值规则时显示，不满足时裁剪整棵子树", () => {
    const template = baseTemplate();
    const hidden = applyVisibilityRules(template, payload({ points: 0, products: [] }));
    assert.equal(hidden.blocks.pointsBox, undefined);
    assert.equal(hidden.blocks.note, undefined);
    assert.deepEqual(hidden.blocks.root.children, []);

    const visible = applyVisibilityRules(template, payload({ points: 8, products: [] }));
    assert.ok(visible.blocks.pointsBox);
    assert.ok(visible.blocks.note);
    assert.deepEqual(visible.blocks.root.children, ["pointsBox"]);
  });

  it("可见性优先于 repeat，数组为空时不展开重复子树", () => {
    const template = baseTemplate();
    const empty = expandRepeatRegions(
      applyVisibilityRules(template, payload({ points: 0, products: [] })),
      payload({ points: 0, products: [] })
    );
    assert.equal(empty.blocks.list, undefined);
    assert.equal(Object.keys(empty.blocks).some((id) => id.includes("__repeatClone__")), false);

    const withItems = expandRepeatRegions(
      applyVisibilityRules(template, payload({ points: 0, products: [{ title: "A" }] })),
      payload({ points: 0, products: [{ title: "A" }] })
    );
    assert.deepEqual(withItems.blocks.list.children, ["row__repeatClone__list_0"]);
  });

  it("校验按 valueType 限制可见性运算符", () => {
    const template = baseTemplate();
    template.blocks.pointsBox.visibility = {
      slotId: "points",
      valueType: "number",
      operator: "isTrue",
    };

    const issues = validateTemplate(template);
    assert.ok(issues.some((item) => item.path === "blocks.pointsBox.visibility.operator"));
  });

  it("数值为空：未赋值或非法类型时 isEmpty 成立", () => {
    const rule = { slotId: "points", valueType: "number" as const, operator: "isEmpty" as const };
    assert.equal(evaluateVisibilityRule(rule, payload({ products: [] })), true);
    assert.equal(
      evaluateVisibilityRule(rule, payload({ points: 0, products: [] })),
      false
    );
    assert.equal(
      evaluateVisibilityRule(
        rule,
        payload({ points: "oops" as unknown as number, products: [] })
      ),
      true
    );
  });

  it("列表非数组或未赋值时数组为空成立", () => {
    const rule = {
      slotId: "products",
      valueType: "collection" as const,
      operator: "isEmpty" as const,
    };
    assert.equal(evaluateVisibilityRule(rule, payload({ points: 0 })), true);
    assert.equal(
      evaluateVisibilityRule(rule, payload({ points: 0, products: [] })),
      true
    );
    assert.equal(
      evaluateVisibilityRule(rule, payload({ points: 0, products: [{ title: "A" }] })),
      false
    );
  });

  it("布尔为空：未赋值视为空，true/false 为不为空", () => {
    const emptyRule = {
      slotId: "showPoints",
      valueType: "boolean" as const,
      operator: "isEmpty" as const,
    };
    const notEmptyRule = { ...emptyRule, operator: "isNotEmpty" as const };
    const p = (showPoints?: boolean) =>
      payload({ products: [], ...(showPoints === undefined ? {} : { showPoints }) }, {
        showPoints: { label: "显示积分", valueType: "boolean" },
      });
    assert.equal(evaluateVisibilityRule(emptyRule, p()), true);
    assert.equal(evaluateVisibilityRule(emptyRule, p(true)), false);
    assert.equal(evaluateVisibilityRule(notEmptyRule, p(false)), true);
  });

  it("payload 允许只被 visibility 消费的布尔派生槽", () => {
    const template = baseTemplate();
    template.blocks.pointsBox.visibility = {
      slotId: "showPoints",
      valueType: "boolean",
      operator: "isTrue",
      label: "显示积分",
    };

    assert.equal(
      validatePayloadAgainstTemplate(
        template,
        payload({ showPoints: true, products: [] }, {
          showPoints: { label: "显示积分", valueType: "boolean" },
        })
      ).length,
      0
    );
  });
});
