import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate, TextBody } from "../types/email";
import { mergeTemplatePayload } from "./merge";
import {
  applyRepeatRegionBinding,
  expandRepeatRegions,
  isDescendantOfBlock,
  isRepeatListBindingChildBlock,
  removeRepeatRegionBinding,
  resolveRepeatContextForBlock,
} from "./repeatRegion";

const TEXT_RUN_BIND = "props.textBody.paragraphs.0.runs.0.text";

function firstRunText(props: { textBody?: TextBody }): string {
  return props.textBody?.paragraphs?.[0]?.runs?.[0]?.text ?? "";
}

function blockFirstRunText(template: EmailTemplate, blockId: string): string {
  const block = template.blocks[blockId];
  if (!block || block.type !== "text") return "";
  return firstRunText(block.props);
}

function templateWithRepeatPrototype(): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "repeat-test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "email.root", name: "画布" },
      list: { blockType: "layout.container", name: "商品列表" },
      row: { blockType: "content.text", name: "商品名称" },
      fallback: { blockType: "content.text", name: "备用商品名称" },
    },
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["list"],
        props: {
          backgroundColor: "#ffffff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
      },
      list: {
        id: "list",
        type: "layout",
        parentId: "root",
        children: ["row", "fallback"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
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
          color: "#111111",
          fontSize: "14px",
        },
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "products",
            mode: "variable",
            allowExternal: true,
            valueType: "collection",
            slotPath: "0.title",
            itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
          },
        },
      },
      fallback: {
        id: "fallback",
        type: "text",
        parentId: "list",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "备用商品" }] }] },
          bold: false,
          italic: false,
          decoration: "none",
          color: "#111111",
          fontSize: "14px",
        },
      },
    },
  };
}

describe("repeatRegion", () => {
  it("按 collection 长度复制原型子树并改写 slotPath", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      fallbackChildIds: ["fallback"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
      label: "商品列表",
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { products: [{ title: "第一件" }, { title: "第二件" }] },
    };

    const expanded = expandRepeatRegions(template, payload);
    const merged = mergeTemplatePayload(expanded, payload);
    const list = merged.blocks.list;

    assert.deepEqual(list.children, [
      "row__repeatClone__list_0",
      "row__repeatClone__list_1",
    ]);
    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_0"), "第一件");
    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_1"), "第二件");
  });

  it("repeat 展开前按 payload.slots.displayRule 过滤列表项", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      fallbackChildIds: ["fallback"],
      itemFields: [
        { key: "type", label: "类型", valueType: "string" },
        { key: "title", label: "商品名称", valueType: "string" },
      ],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {
        products: {
          label: "商品列表",
          valueType: "collection",
          sceneCollectionPresetId: "testSceneProducts",
          itemFields: [
            { key: "type", label: "类型", valueType: "string" },
            { key: "title", label: "商品名称", valueType: "string" },
          ],
          displayRule: { keyField: "type", includeValues: ["A", "C"] },
        },
      },
      values: {
        products: [
          { type: "A", title: "第一件" },
          { type: "B", title: "第二件" },
          { type: "C", title: "第三件" },
        ],
      },
    };

    const expanded = expandRepeatRegions(template, payload);
    assert.deepEqual(expanded.blocks.list.children, ["row__repeatClone__list_0", "row__repeatClone__list_1"]);

    const merged = mergeTemplatePayload(expanded, payload);
    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_0"), "第一件");
    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_1"), "第三件");
  });

  it("payload 数组为空时不渲染占位子项，解除后恢复静态 children", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      fallbackChildIds: ["fallback"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const payload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: { products: [] } };

    const expanded = expandRepeatRegions(template, payload);
    assert.deepEqual(expanded.blocks.list.children, []);

    const restored = removeRepeatRegionBinding(template, "list", payload);
    assert.deepEqual(restored.blocks.list.children, ["fallback"]);
    assert.equal(restored.blocks.list.repeat, undefined);
  });

  it("解除列表绑定时按当前 payload 项数物化静态行并保留合并内容", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      fallbackChildIds: ["fallback"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
      label: "商品列表",
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { products: [{ title: "第一件" }, { title: "第二件" }, { title: "第三件" }] },
    };

    const restored = removeRepeatRegionBinding(template, "list", payload);
    const list = restored.blocks.list;

    assert.equal(list.repeat, undefined);
    assert.deepEqual(list.children, ["row-1", "row-2", "row-3"]);
    assert.equal(
      restored.blocks["row-1"].bindings?.["props.textBody.paragraphs.0.runs.0.text"]?.slotPath,
      "0.title"
    );
    assert.equal(
      restored.blocks["row-2"].bindings?.["props.textBody.paragraphs.0.runs.0.text"]?.slotPath,
      "1.title"
    );
    assert.equal(blockFirstRunText(restored, "row-1"), "第一件");
    assert.equal(blockFirstRunText(restored, "row-2"), "第二件");
    assert.equal(restored.blocks.row, undefined);
    assert.equal(restored.blocks.fallback, undefined);
  });

  it("允许把任意叶子 block 作为父容器的重复原型", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      fallbackChildIds: ["fallback"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { products: [{ title: "文本一" }, { title: "文本二" }, { title: "文本三" }] },
    };

    const expanded = expandRepeatRegions(template, payload);

    assert.deepEqual(expanded.blocks.list.children, [
      "row__repeatClone__list_0",
      "row__repeatClone__list_1",
      "row__repeatClone__list_2",
    ]);
  });

  it("禁止把 emailRoot 作为重复宿主", () => {
    assert.throws(
      () =>
        applyRepeatRegionBinding(templateWithRepeatPrototype(), "root", {
          slotId: "products",
          prototypeChildIds: ["list"],
          itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
        }),
      /不能绑定在邮件根节点/
    );
  });

  it("按 fieldMappings 将数组项字段绑定到原型子树目标字段", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
      fieldMappings: [
        {
          id: "title-to-row-content",
          sourcePath: "title",
          targetBlockId: "row",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
          label: "商品名称",
          valueType: "string",
        },
      ],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { products: [{ title: "映射一" }, { title: "映射二" }] },
    };

    const expanded = expandRepeatRegions(template, payload);
    const merged = mergeTemplatePayload(expanded, payload);

    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_0"), "映射一");
    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_1"), "映射二");
  });

  it("fieldMappings 优先于原型字段上已有的普通变量绑定", () => {
    const base = templateWithRepeatPrototype();
    base.blocks.row.bindings = {
      [TEXT_RUN_BIND]: {
        slotId: "globalTitle",
        mode: "variable",
        allowExternal: true,
        valueType: "string",
        label: "全局标题",
      },
    };
    const template = applyRepeatRegionBinding(base, "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
      fieldMappings: [
        {
          id: "title-to-row-content",
          sourcePath: "title",
          targetBlockId: "row",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
          label: "商品名称",
          valueType: "string",
        },
      ],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: {
        globalTitle: "全局同名",
        products: [{ title: "第一项" }, { title: "第二项" }],
      },
    };

    const merged = mergeTemplatePayload(expandRepeatRegions(template, payload), payload);

    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_0"), "第一项");
    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_1"), "第二项");
    assert.equal(
      template.blocks.row.bindings?.["props.textBody.paragraphs.0.runs.0.text"]?.slotId,
      "globalTitle"
    );
  });

  it("未映射字段保留原普通变量绑定，每个复制项显示同一个变量值", () => {
    const base = templateWithRepeatPrototype();
    base.blocks.row.bindings = {
      [TEXT_RUN_BIND]: {
        slotId: "globalTitle",
        mode: "variable",
        allowExternal: true,
        valueType: "string",
        label: "全局标题",
      },
    };
    const template = applyRepeatRegionBinding(base, "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
      fieldMappings: [],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: {
        globalTitle: "全局同名",
        products: [{ title: "第一项" }, { title: "第二项" }],
      },
    };

    const merged = mergeTemplatePayload(expandRepeatRegions(template, payload), payload);

    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_0"), "全局同名");
    assert.equal(blockFirstRunText(merged, "row__repeatClone__list_1"), "全局同名");
  });

  it("resolveRepeatContextForBlock：宿主自身为 host", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const ctx = resolveRepeatContextForBlock(template, "list");
    assert.ok(ctx);
    assert.equal(ctx!.hostId, "list");
    assert.equal(ctx!.relation, "host");
  });

  it("resolveRepeatContextForBlock：行模板内子孙为 row-template", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    assert.equal(resolveRepeatContextForBlock(template, "row")?.relation, "row-template");
    assert.ok(isDescendantOfBlock(template, "row", "list"));
    assert.ok(isDescendantOfBlock(template, "row", "row"));
  });

  it("resolveRepeatContextForBlock：有 fieldMappings 的区块为 mapped-field", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
      fieldMappings: [
        {
          id: "map-1",
          sourcePath: "title",
          targetBlockId: "row",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
        },
      ],
    });
    const ctx = resolveRepeatContextForBlock(template, "row");
    assert.equal(ctx?.relation, "mapped-field");
    assert.equal(ctx?.fieldMappingsOnBlock.length, 1);
  });

  it("resolveRepeatContextForBlock：不在 repeat 行模板内返回 null", () => {
    const template = templateWithRepeatPrototype();
    assert.equal(resolveRepeatContextForBlock(template, "fallback"), null);
  });

  it("isRepeatListBindingChildBlock：宿主可操作、行模板与 fallback 子树隐藏画布操作", () => {
    const template = applyRepeatRegionBinding(templateWithRepeatPrototype(), "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      fallbackChildIds: ["fallback"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    assert.equal(isRepeatListBindingChildBlock(template, "list"), false);
    assert.equal(isRepeatListBindingChildBlock(template, "row"), true);
    assert.equal(isRepeatListBindingChildBlock(template, "fallback"), true);
  });

  it("展开时保留 repeat 宿主上原型前后的静态兄弟", () => {
    const base = templateWithRepeatPrototype();
    const template = structuredClone(base);
    template.blockMeta = {
      ...template.blockMeta,
      heading: { blockType: "content.text", name: "列表标题" },
    };
    template.blocks.heading = {
      id: "heading",
      type: "text",
      parentId: "list",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        contentAlign: { horizontal: "left", vertical: "top" },
        contentAlign: { horizontal: "left", vertical: "top" },
      },
      props: {
        textBody: { paragraphs: [{ runs: [{ text: "标题" }] }] },
        bold: false,
        italic: false,
        decoration: "none",
        color: "#111111",
        fontSize: "14px",
      },
    };
    template.blocks.list.children = ["heading", "row", "fallback"];

    const bound = applyRepeatRegionBinding(template, "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      fallbackChildIds: ["fallback"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { products: [{ title: "第一件" }, { title: "第二件" }] },
    };

    const expanded = expandRepeatRegions(bound, payload);
    assert.deepEqual(expanded.blocks.list.children, [
      "heading",
      "row__repeatClone__list_0",
      "row__repeatClone__list_1",
    ]);
    assert.ok(expanded.blocks.heading);

    const empty = expandRepeatRegions(bound, {
      schemaVersion: "1.0.0",
      slots: {},
      values: { products: [] },
    });
    assert.deepEqual(empty.blocks.list.children, ["heading"]);
  });

  it("解除绑定时在静态标题与物化行之间保持顺序", () => {
    const base = templateWithRepeatPrototype();
    const template = structuredClone(base);
    template.blocks.heading = {
      id: "heading",
      type: "text",
      parentId: "list",
      children: [],
      wrapperStyle: {
        widthMode: "fill",
        heightMode: "hug",
        contentAlign: { horizontal: "left", vertical: "top" },
        contentAlign: { horizontal: "left", vertical: "top" },
      },
      props: {
        textBody: { paragraphs: [{ runs: [{ text: "标题" }] }] },
        bold: false,
        italic: false,
        decoration: "none",
        color: "#111111",
        fontSize: "14px",
      },
    };
    template.blocks.list.children = ["heading", "row", "fallback"];

    const bound = applyRepeatRegionBinding(template, "list", {
      slotId: "products",
      prototypeChildIds: ["row"],
      fallbackChildIds: ["fallback"],
      itemFields: [{ key: "title", label: "商品名称", valueType: "string" }],
    });
    const payload: EmailPayload = {
      schemaVersion: "1.0.0",
      slots: {},
      values: { products: [{ title: "A" }, { title: "B" }] },
    };

    const restored = removeRepeatRegionBinding(bound, "list", payload);
    assert.deepEqual(restored.blocks.list.children, ["heading", "row-1", "row-2"]);
  });

  it("嵌套 repeat：双列表主推区 SKU 条展开 5 项且无重复克隆 id", () => {
    const template = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/layouts/default/template.json", "utf8")
    ) as EmailTemplate;
    const payload = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/payload.json", "utf8")
    ) as EmailPayload;

    const expanded = expandRepeatRegions(template, payload);
    const stripId = Object.keys(expanded.blocks).find(
      (id) =>
        id.includes("rfj-picked-spotlight-sku-strip__repeatClone") &&
        id.includes("rfj-picked-spotlight_0") &&
        id.endsWith("_0_0")
    );
    assert.ok(stripId);
    const skuChildren = expanded.blocks[stripId!].children ?? [];
    assert.equal(skuChildren.length, 5);
    assert.equal(new Set(skuChildren).size, 5);

    const merged = mergeTemplatePayload(expanded, payload);
    const titles = skuChildren.map((cardId) => {
      const titleId = merged.blocks[cardId].children[1];
      return blockFirstRunText(merged, titleId);
    });
    const imageSrcs = skuChildren.map((cardId) => {
      const imgId = merged.blocks[cardId].children[0];
      return merged.blocks[imgId].wrapperStyle?.backgroundImage?.src;
    });
    assert.deepEqual(titles, [
      "曜石黑",
      "云雾白",
      "薄荷绿",
      "礼盒装 · 黑",
      "礼盒装 · 白",
    ]);
    assert.ok(imageSrcs.every((src) => typeof src === "string" && src.length > 0));
  });

  it("嵌套 repeat：外层 2 个 SPU 时，内层 SKU 条按各自 SPU 分组展开且不混组", () => {
    const template = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/layouts/default/template.json", "utf8")
    ) as EmailTemplate;
    const payload = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/payload.json", "utf8")
    ) as EmailPayload;

    payload.values.pickedSpotlightProduct = [
      {
        imageSrc: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400",
        imageAlt: "Aura 无线耳机 — 曜石黑",
        name: "Aura 无线耳机",
        salePrice: "$79.00",
        originalPrice: "$99.00",
        badge: "热卖",
        href: "https://example.com/products/aura-earbuds",
        skus: [
          {
            imageSrc: "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400",
            imageAlt: "Aura 无线耳机 — 曜石黑",
            title: "曜石黑",
            href: "https://example.com/products/aura-earbuds?variant=1",
          },
          {
            imageSrc: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400",
            imageAlt: "Aura 无线耳机 — 云雾白",
            title: "云雾白",
            href: "https://example.com/products/aura-earbuds?variant=2",
          },
          {
            imageSrc: "https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=400",
            imageAlt: "Aura 无线耳机 — 薄荷绿",
            title: "薄荷绿",
            href: "https://example.com/products/aura-earbuds?variant=3",
          },
        ],
      },
      {
        imageSrc: "https://images.pexels.com/photos/2983468/pexels-photo-2983468.jpeg?auto=compress&cs=tinysrgb&w=400",
        imageAlt: "Pulse 智能手表 42mm 星空灰",
        name: "Pulse 智能手表",
        salePrice: "$149.00",
        originalPrice: "$199.00",
        badge: "新品",
        href: "https://example.com/products/pulse-watch",
        skus: [
          {
            imageSrc: "https://images.pexels.com/photos/2983468/pexels-photo-2983468.jpeg?auto=compress&cs=tinysrgb&w=400",
            imageAlt: "Pulse 智能手表 42mm 星空灰",
            title: "42mm 星空灰",
            href: "https://example.com/products/pulse-watch?variant=1",
          },
          {
            imageSrc: "https://images.pexels.com/photos/1181717/pexels-photo-1181717.jpeg?auto=compress&cs=tinysrgb&w=400",
            imageAlt: "Pulse 智能手表 42mm 玫瑰金",
            title: "42mm 玫瑰金",
            href: "https://example.com/products/pulse-watch?variant=2",
          },
        ],
      },
    ];

    const expanded = expandRepeatRegions(template, payload);
    const outerCellIds = expanded.blocks["rfj-picked-spotlight"].children.filter((id) =>
      id.startsWith("rfj-picked-spotlight-cell__repeatClone__")
    );
    assert.equal(outerCellIds.length, 2);
    const stripIds = outerCellIds.map((cellId) =>
      expanded.blocks[cellId].children.find((childId) =>
        childId.startsWith("rfj-picked-spotlight-sku-strip__repeatClone__")
      )
    );
    const [firstStripId, secondStripId] = stripIds;
    assert.ok(firstStripId);
    assert.ok(secondStripId);
    assert.equal(expanded.blocks[firstStripId]?.children.length, 3);
    assert.equal(expanded.blocks[secondStripId]?.children.length, 2);

    const merged = mergeTemplatePayload(expanded, payload);
    const firstTitles = expanded.blocks[firstStripId].children.map((cardId) => {
      const titleId = merged.blocks[cardId].children[1];
      return blockFirstRunText(merged, titleId);
    });
    const secondTitles = expanded.blocks[secondStripId].children.map((cardId) => {
      const titleId = merged.blocks[cardId].children[1];
      return blockFirstRunText(merged, titleId);
    });

    assert.deepEqual(firstTitles, ["曜石黑", "云雾白", "薄荷绿"]);
    assert.deepEqual(secondTitles, ["42mm 星空灰", "42mm 玫瑰金"]);
  });
});
