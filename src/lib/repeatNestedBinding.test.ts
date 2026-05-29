import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate, RepeatFieldMapping } from "../types/email";
import { expandRepeatRegions } from "./repeatRegion";
import {
  applyUnifiedRepeatBinding,
  buildRepeatBindPreviewCounts,
  removeUnifiedRepeatBinding,
  childRepeatPrototypeDisabledKeysForParent,
  childRepeatPrototypeOptionKey,
  isChildRepeatPrototypeReservedByParent,
  formatRepeatBindScopePreview,
  flattenChildRepeatPrototypePickerRows,
  flattenParentRepeatPrototypePickerRows,
  filterParentRepeatMappingTargets,
  isDisallowedChildRepeatPrototypeOption,
  listChildRepeatPrototypeOptions,
  listNestedCollectionFields,
} from "./repeatNestedBinding";
import { listRepeatMappableContentBindPaths } from "./repeatMappableContentBindPaths";
import { validateTemplate } from "./validate";

function miniNestedTemplate(): EmailTemplate {
  return {
    schemaVersion: "3.0.0",
    templateId: "nested-repeat-test",
    templateVersion: 1,
    rootBlockId: "root",
    blockMeta: {
      root: { blockType: "email.root", name: "根" },
      outer: { blockType: "layout.container", name: "外层" },
      row: { blockType: "layout.container", name: "父级行" },
      inner: { blockType: "layout.container", name: "子级条带" },
      leaf: { blockType: "content.text", name: "子级文案" },
    },
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["outer"],
        props: {
          backgroundColor: "#fff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: { mode: "unified", width: "0", style: "solid", color: "rgba(0,0,0,0)" },
          gapMode: "fixed",
          gap: "0",
        },
      },
      outer: {
        id: "outer",
        type: "layout",
        parentId: "root",
        children: ["row"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      row: {
        id: "row",
        type: "layout",
        parentId: "outer",
        children: ["inner"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      inner: {
        id: "inner",
        type: "layout",
        parentId: "row",
        children: ["leaf"],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: { direction: "vertical", gapMode: "fixed", gap: "0" },
      },
      leaf: {
        id: "leaf",
        type: "text",
        parentId: "inner",
        children: [],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
          contentAlign: { horizontal: "left", vertical: "top" },
        },
        props: {
          textBody: { paragraphs: [{ runs: [{ text: "x" }] }] },
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
        },
        bindings: {
          "props.textBody.paragraphs.0.runs.0.text": {
            slotId: "items",
            mode: "variable",
            valueType: "collection",
            allowExternal: true,
            fieldKind: "content",
            slotPath: "0.title",
          },
        },
      },
    },
  };
}

const parentItemFields = [
  { key: "title", label: "标题", valueType: "string" as const, required: true },
  {
    key: "lines",
    label: "子行",
    valueType: "collection" as const,
    itemFields: [{ key: "title", label: "子标题", valueType: "string" as const, required: true }],
    minItems: 0,
    maxItems: 3,
  },
];

const payload: EmailPayload = {
  schemaVersion: "1.0.0",
  slots: {},
  values: {
    items: [
      { title: "A", lines: [{ title: "A1" }, { title: "A2" }] },
      { title: "B", lines: [{ title: "B1" }] },
    ],
  },
};

describe("repeatNestedBinding", () => {
  it("listChildRepeatPrototypeOptions 含叶子与 layout 行模板", () => {
    const options = listChildRepeatPrototypeOptions(miniNestedTemplate(), ["row"]);
    assert.ok(
      options.some(
        (o) =>
          o.hostId === "inner" &&
          o.prototypeChildIds.join("+") === "leaf" &&
          o.label.includes("子级行模板")
      )
    );
    assert.ok(
      options.some(
        (o) =>
          o.key === childRepeatPrototypeOptionKey("row", ["inner"]) &&
          o.label.includes("连同子级一起复制")
      )
    );
  });

  it("isChildRepeatPrototypeReservedByParent 识别与父级相同的行模板绑定", () => {
    const parent = {
      key: childRepeatPrototypeOptionKey("row", ["inner"]),
      hostId: "row",
      prototypeChildIds: ["inner"],
    };
    const sameBinding = {
      key: parent.key,
      hostId: "row",
      prototypeChildIds: ["inner"],
    };
    const differentHost = {
      key: childRepeatPrototypeOptionKey("other", ["inner"]),
      hostId: "other",
      prototypeChildIds: ["inner"],
    };
    const differentProto = {
      key: childRepeatPrototypeOptionKey("row", ["leaf"]),
      hostId: "row",
      prototypeChildIds: ["leaf"],
    };
    assert.ok(isChildRepeatPrototypeReservedByParent(sameBinding, parent));
    assert.ok(isChildRepeatPrototypeReservedByParent(differentHost, parent));
    assert.ok(!isChildRepeatPrototypeReservedByParent(differentProto, parent));
    const disabled = childRepeatPrototypeDisabledKeysForParent(parent, [
      sameBinding,
      differentProto,
    ]);
    assert.equal(disabled.size, 1);
    assert.ok(disabled.has(parent.key));
  });

  it("flattenChildRepeatPrototypePickerRows 输出父级行模板上下文与可选行", () => {
    const options = listChildRepeatPrototypeOptions(miniNestedTemplate(), ["row"]);
    const rows = flattenChildRepeatPrototypePickerRows(miniNestedTemplate(), ["row"], options);
    assert.ok(rows.some((r) => r.kind === "context" && r.label.includes("父级行模板")));
    assert.ok(rows.some((r) => r.kind === "choice" && r.optionKey.includes("inner:leaf")));
    const innerChoice = rows.find((r) => r.kind === "choice" && r.blockId === "inner");
    const leafChoice = rows.find((r) => r.kind === "choice" && r.blockId === "leaf");
    assert.ok(innerChoice && leafChoice);
    assert.ok(leafChoice!.depth > innerChoice!.depth, "子区块选项应更深缩进");
    assert.equal(innerChoice!.expandable, true);
  });

  it("filterParentRepeatMappingTargets 子级列表写在父行模板容器上时仍保留同级 SPU 字段", () => {
    const template: EmailTemplate = {
      schemaVersion: "3.0.0",
      templateId: "mapping-scope-test",
      templateVersion: 1,
      rootBlockId: "root",
      blockMeta: {
        root: { blockType: "email.root", name: "根" },
        list: { blockType: "layout.container", name: "列表" },
        cell: { blockType: "layout.container", name: "商品卡" },
        spuTitle: { blockType: "content.text", name: "商品名" },
        strip: { blockType: "layout.container", name: "SKU 条带" },
        skuRow: { blockType: "layout.container", name: "SKU 行" },
        skuTitle: { blockType: "content.text", name: "规格名" },
      },
      blocks: {
        root: {
          id: "root",
          type: "emailRoot",
          parentId: null,
          children: ["list"],
          props: {
            backgroundColor: "#fff",
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
          children: ["cell"],
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            contentAlign: { horizontal: "left", vertical: "top" },
          },
          props: { direction: "vertical", gapMode: "fixed", gap: "0" },
        },
        cell: {
          id: "cell",
          type: "layout",
          parentId: "list",
          children: ["spuTitle", "strip"],
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            contentAlign: { horizontal: "left", vertical: "top" },
          },
          props: { direction: "vertical", gapMode: "fixed", gap: "0" },
        },
        spuTitle: {
          id: "spuTitle",
          type: "text",
          parentId: "cell",
          children: [],
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            contentAlign: { horizontal: "left", vertical: "top" },
          },
          props: {
            textBody: { paragraphs: [{ runs: [{ text: "SPU" }] }] },
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
          },
          bindings: {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "products",
              mode: "variable",
              valueType: "collection",
              allowExternal: true,
              fieldKind: "content",
              slotPath: "0.name",
            },
          },
        },
        strip: {
          id: "strip",
          type: "layout",
          parentId: "cell",
          children: ["skuRow"],
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            contentAlign: { horizontal: "left", vertical: "top" },
          },
          props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
          repeat: {
            mode: "collection",
            slotId: "products",
            prototypeChildIds: ["skuRow"],
            fallbackChildIds: ["skuRow"],
            itemFields: [{ key: "title", label: "规格名", valueType: "string", required: true }],
            itemPath: "skus",
          },
        },
        skuRow: {
          id: "skuRow",
          type: "layout",
          parentId: "strip",
          children: ["skuTitle"],
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            contentAlign: { horizontal: "left", vertical: "top" },
          },
          props: { direction: "vertical", gapMode: "fixed", gap: "0" },
        },
        skuTitle: {
          id: "skuTitle",
          type: "text",
          parentId: "skuRow",
          children: [],
          wrapperStyle: {
            widthMode: "fill",
            heightMode: "hug",
            contentAlign: { horizontal: "left", vertical: "top" },
          },
          props: {
            textBody: { paragraphs: [{ runs: [{ text: "SKU" }] }] },
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
          },
          bindings: {
            "props.textBody.paragraphs.0.runs.0.text": {
              slotId: "products",
              mode: "variable",
              valueType: "collection",
              allowExternal: true,
              fieldKind: "content",
              slotPath: "0.skus.0.title",
            },
          },
        },
      },
    };
    const parentProto = ["cell"];
    const allTargets = ["cell", "spuTitle", "strip", "skuRow", "skuTitle"].flatMap((blockId) => {
      const block = template.blocks[blockId];
      if (!block) return [];
      return listRepeatMappableContentBindPaths(block).map((bindPath) => ({
        key: `${blockId}:${bindPath}`,
        blockId,
        bindPath,
      }));
    });
    const childOptionProto = ["strip"];
    const parentTargets = filterParentRepeatMappingTargets(
      template,
      parentProto,
      childOptionProto,
      allTargets
    );
    assert.ok(
      parentTargets.some((t) => t.blockId === "spuTitle"),
      "父级映射应保留商品卡内、子级条带外的 SPU 字段"
    );
    assert.ok(
      !parentTargets.some((t) => t.blockId === "skuTitle"),
      "父级映射应排除子级行模板子树内的字段"
    );
  });

  it("flattenParentRepeatPrototypePickerRows 输出父级列表循环容器上下文", () => {
    const options = listChildRepeatPrototypeOptions(miniNestedTemplate(), ["row"]);
    const rows = flattenParentRepeatPrototypePickerRows(miniNestedTemplate(), "outer", options);
    assert.ok(rows.some((r) => r.kind === "context" && r.label.includes("父级列表循环容器")));
  });

  it("listNestedCollectionFields 列出子列表列", () => {
    const nested = listNestedCollectionFields(parentItemFields);
    assert.equal(nested.length, 1);
    assert.equal(nested[0]?.path, "lines");
  });

  it("formatRepeatBindScopePreview 父级+子级", () => {
    const text = formatRepeatBindScopePreview("parentAndChild", {
      parentSlotLabel: "商品",
      childListLabel: "SKU",
      parentCount: 2,
      childCountPerParent: 3,
    });
    assert.match(text, /2 行/);
    assert.match(text, /3 项/);
  });

  it("applyUnifiedRepeatBinding 父级与子级都循环", () => {
    const bound = applyUnifiedRepeatBinding(miniNestedTemplate(), {
      scope: "parentAndChild",
      slotId: "items",
      parentHostId: "outer",
      parentPrototypeChildIds: ["row"],
      parentItemFields,
      parentFieldMappings: [],
      childItemPath: "lines",
      childHostId: "inner",
      childPrototypeChildIds: ["leaf"],
      childItemFields: [{ key: "title", label: "子标题", valueType: "string", required: true }],
      childFieldMappings: [],
    });
    assert.ok(bound.blocks.outer?.repeat);
    assert.equal(bound.blocks.outer?.repeat?.itemPath, undefined);
    assert.equal(bound.blocks.inner?.repeat?.itemPath, "lines");
    const expanded = expandRepeatRegions(bound, payload);
    const outerChildren = expanded.blocks.outer?.children ?? [];
    assert.equal(outerChildren.length, 2);
    const firstRowId = outerChildren[0]!;
    const innerHost = expanded.blocks[firstRowId]?.children?.[0];
    const innerBlock = innerHost ? expanded.blocks[innerHost] : undefined;
    assert.ok(innerBlock?.children && innerBlock.children.length >= 2);
  });

  it("buildRepeatBindPreviewCounts 读取首项子列表长度", () => {
    const counts = buildRepeatBindPreviewCounts(payload, "items", "lines");
    assert.equal(counts.parentCount, 2);
    assert.equal(counts.childCountPerParent, 2);
  });

  it("applyUnifiedRepeatBinding 只循环父级时清除子级行模板内 collection 项绑定", () => {
    const withChild = applyUnifiedRepeatBinding(miniNestedTemplate(), {
      scope: "parentAndChild",
      slotId: "items",
      parentHostId: "outer",
      parentPrototypeChildIds: ["row"],
      parentItemFields,
      parentFieldMappings: [],
      childItemPath: "lines",
      childHostId: "inner",
      childPrototypeChildIds: ["leaf"],
      childItemFields: [{ key: "title", label: "子标题", valueType: "string", required: true }],
      childFieldMappings: [],
    });
    assert.ok(withChild.blocks.inner?.repeat?.itemPath);
    assert.ok(
      withChild.blocks.leaf?.bindings?.["props.textBody.paragraphs.0.runs.0.text"]
    );

    const parentOnly = applyUnifiedRepeatBinding(withChild, {
      scope: "parentOnly",
      slotId: "items",
      parentHostId: "outer",
      parentPrototypeChildIds: ["row"],
      parentItemFields,
      parentFieldMappings: [],
    });
    assert.equal(parentOnly.blocks.inner?.repeat, undefined);
    assert.equal(
      parentOnly.blocks.leaf?.bindings?.["props.textBody.paragraphs.0.runs.0.text"],
      undefined
    );
    assert.ok(parentOnly.blocks.outer?.repeat);
  });

  it("removeUnifiedRepeatBinding 物化后清除子树内子级 repeat", () => {
    const bound = applyUnifiedRepeatBinding(miniNestedTemplate(), {
      scope: "parentAndChild",
      slotId: "items",
      parentHostId: "outer",
      parentPrototypeChildIds: ["row"],
      parentItemFields,
      parentFieldMappings: [],
      childItemPath: "lines",
      childHostId: "inner",
      childPrototypeChildIds: ["leaf"],
      childItemFields: [{ key: "title", label: "子标题", valueType: "string", required: true }],
      childFieldMappings: [],
    });
    const unbound = removeUnifiedRepeatBinding(bound, "outer", payload);
    assert.equal(unbound.blocks.outer?.repeat, undefined);
    assert.equal(unbound.blocks.inner?.repeat, undefined);
    assert.equal(unbound.blocks["inner-1"]?.repeat, undefined);
    assert.equal(unbound.blocks["inner-2"]?.repeat, undefined);
    const rowIds = unbound.blocks.outer?.children ?? [];
    assert.equal(rowIds.length, 2);
    assert.ok(rowIds.every((id) => !unbound.blocks[id]?.repeat));
  });

  it("removeUnifiedRepeatBinding 嵌套主推区物化后 parentId 一致且 SKU 子块无 collection 硬错误", () => {
    const template = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/layouts/default/template.json", "utf8")
    ) as EmailTemplate;
    const payload = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/payload.json", "utf8")
    ) as EmailPayload;
    const unbound = removeUnifiedRepeatBinding(template, "rfj-picked-spotlight", payload);
    const issues = validateTemplate(unbound, payload).filter((i) =>
      i.path.includes("rfj-picked-spotlight")
    );
    const hard = issues.filter((i) => !i.level);
    assert.ok(
      hard.every(
        (i) =>
          !i.path.endsWith(".parentId") &&
          !i.reason.includes("检测到环") &&
          !i.path.includes("sku-1-img") &&
          !i.path.includes("sku-1-title")
      ),
      hard.map((i) => `${i.path}: ${i.reason}`).join("\n")
    );
    const strip1 = unbound.blocks["rfj-picked-spotlight-sku-strip-1"];
    for (const childId of strip1?.children ?? []) {
      assert.equal(unbound.blocks[childId]?.parentId, "rfj-picked-spotlight-sku-strip-1");
    }
    const strip2 = unbound.blocks["rfj-picked-spotlight-sku-strip-2"];
    for (const childId of strip2?.children ?? []) {
      assert.equal(
        unbound.blocks[childId]?.parentId,
        "rfj-picked-spotlight-sku-strip-2",
        childId
      );
    }
  });

  it("removeUnifiedRepeatBinding 嵌套主推区物化后 sku-strip 无 repeat", () => {
    const template = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/layouts/default/template.json", "utf8")
    ) as EmailTemplate;
    const payload = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/payload.json", "utf8")
    ) as EmailPayload;
    const unbound = removeUnifiedRepeatBinding(template, "rfj-picked-spotlight", payload);
    assert.equal(unbound.blocks["rfj-picked-spotlight-sku-strip-1"]?.repeat, undefined);
    assert.equal(unbound.blocks["rfj-picked-spotlight-sku-strip-2"]?.repeat, undefined);
    const subtreeRepeatIds = Object.keys(unbound.blocks).filter((id) => {
      if (!id.startsWith("rfj-picked-spotlight")) return false;
      return Boolean(unbound.blocks[id]?.repeat);
    });
    assert.deepEqual(subtreeRepeatIds, []);
  });

  it("applyUnifiedRepeatBinding 物化态重绑归一化：2 SPU × 各自一行 SKU", () => {
    const template = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/layouts/default/template.json", "utf8")
    ) as EmailTemplate;
    const payload = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/payload.json", "utf8")
    ) as EmailPayload;
    const parentRepeat = template.blocks["rfj-picked-spotlight"]?.repeat;
    assert.ok(parentRepeat);

    const unbound = removeUnifiedRepeatBinding(template, "rfj-picked-spotlight", payload);
    assert.ok(unbound.blocks["rfj-picked-spotlight-cell-1"]);
    assert.ok(unbound.blocks["rfj-picked-spotlight-cell-2"]);
    assert.equal(unbound.blocks["rfj-picked-spotlight-cell"], undefined);

    const rebound = applyUnifiedRepeatBinding(unbound, {
      scope: "parentAndChild",
      slotId: "pickedSpotlightProduct",
      parentHostId: "rfj-picked-spotlight",
      parentPrototypeChildIds: ["rfj-picked-spotlight-cell-1"],
      parentItemFields: parentRepeat.itemFields,
      parentFieldMappings: parentRepeat.fieldMappings ?? [],
      parentMinItems: parentRepeat.minItems,
      parentMaxItems: parentRepeat.maxItems,
      parentLabel: parentRepeat.label,
      parentDescription: parentRepeat.description,
      childItemPath: "skus",
      childHostId: "rfj-picked-spotlight-cell-1",
      childPrototypeChildIds: ["rfj-picked-spotlight-sku-strip-1"],
      childItemFields: parentRepeat.itemFields
        .find((f) => f.key === "skus" && f.valueType === "collection")
        ?.itemFields,
      childFieldMappings: [],
    });

    assert.deepEqual(rebound.blocks["rfj-picked-spotlight"]?.repeat?.prototypeChildIds, [
      "rfj-picked-spotlight-cell",
    ]);
    assert.equal(rebound.blocks["rfj-picked-spotlight-cell-2"], undefined);
    assert.equal(rebound.blocks["rfj-picked-spotlight-sku-strip"]?.repeat?.itemPath, "skus");
    assert.deepEqual(rebound.blocks["rfj-picked-spotlight-sku-strip"]?.repeat?.prototypeChildIds, [
      "rfj-picked-spotlight-sku-1",
    ]);
    assert.deepEqual(rebound.blocks["rfj-picked-spotlight-sku-strip"]?.children, [
      "rfj-picked-spotlight-sku-1",
    ]);

    const expanded = expandRepeatRegions(rebound, payload);
    const spuRows = expanded.blocks["rfj-picked-spotlight"]?.children ?? [];
    assert.equal(spuRows.length, 2, "应展开 2 个 SPU");

    const findSkuStripInSpuRow = (cellId: string) =>
      expanded.blocks[cellId]?.children?.find((id) =>
        id.includes("rfj-picked-spotlight-sku-strip__repeatClone")
      );

    const auraStripId = findSkuStripInSpuRow(spuRows[0]!);
    assert.ok(auraStripId, "Aura 行内应有 SKU 规格列表 repeat 宿主");
    assert.equal(expanded.blocks[auraStripId!]?.children?.length ?? 0, 5, "Aura 应有 5 个 SKU");

    const pulseStripId = findSkuStripInSpuRow(spuRows[1]!);
    assert.ok(pulseStripId, "Pulse 行内应有 SKU 规格列表 repeat 宿主");
    assert.equal(expanded.blocks[pulseStripId!]?.children?.length ?? 0, 2, "Pulse 应有 2 个 SKU");
  });

  it("applyUnifiedRepeatBinding 物化态重绑时 fieldMappings 的 targetBlockId 随归一化", () => {
    const template = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/layouts/default/template.json", "utf8")
    ) as EmailTemplate;
    const payload = JSON.parse(
      readFileSync("data/emails/referral-friend-joined/payload.json", "utf8")
    ) as EmailPayload;
    const parentRepeat = template.blocks["rfj-picked-spotlight"]?.repeat;
    assert.ok(parentRepeat);

    const unbound = removeUnifiedRepeatBinding(template, "rfj-picked-spotlight", payload);
    const materializedMappings: RepeatFieldMapping[] = [
      {
        id: "rfj-picked-spotlight-main-img-1.props.src:imageSrc",
        sourcePath: "imageSrc",
        targetBlockId: "rfj-picked-spotlight-main-img-1",
        targetBindPath: "props.src",
        label: "商品图",
        valueType: "image",
      },
      {
        id: "rfj-picked-spotlight-name-1.props.text:name",
        sourcePath: "name",
        targetBlockId: "rfj-picked-spotlight-name-1",
        targetBindPath: "props.text",
        label: "商品名",
        valueType: "string",
      },
    ];

    const rebound = applyUnifiedRepeatBinding(unbound, {
      scope: "parentAndChild",
      slotId: "pickedSpotlightProduct",
      parentHostId: "rfj-picked-spotlight",
      parentPrototypeChildIds: ["rfj-picked-spotlight-cell-1"],
      parentItemFields: parentRepeat.itemFields,
      parentFieldMappings: materializedMappings,
      parentMinItems: parentRepeat.minItems,
      parentMaxItems: parentRepeat.maxItems,
      childItemPath: "skus",
      childHostId: "rfj-picked-spotlight-cell-1",
      childPrototypeChildIds: ["rfj-picked-spotlight-sku-strip-1"],
      childItemFields: parentRepeat.itemFields.find(
        (f) => f.key === "skus" && f.valueType === "collection"
      )?.itemFields,
      childFieldMappings: [],
    });

    const hostRepeat = rebound.blocks["rfj-picked-spotlight"]?.repeat;
    assert.ok(hostRepeat?.fieldMappings?.length);
    const targets = (hostRepeat.fieldMappings ?? []).map((m) => m.targetBlockId);
    assert.ok(targets.includes("rfj-picked-spotlight-main-img"));
    assert.ok(targets.includes("rfj-picked-spotlight-name"));
    assert.ok(!targets.some((id) => /-1$/.test(id)), "物化 -1 后缀应已归一为原型 id");
    for (const mapping of hostRepeat.fieldMappings ?? []) {
      assert.ok(
        rebound.blocks[mapping.targetBlockId],
        `映射目标应存在：${mapping.targetBlockId}`
      );
    }
  });

  it("applyUnifiedRepeatBinding self-repeat：宿主即行模板时保留宿主 repeat", () => {
    const template = JSON.parse(
      readFileSync("data/emails/mcp-20260527/layouts/default/template.json", "utf8")
    ) as EmailTemplate;
    const payload = JSON.parse(
      readFileSync("data/emails/mcp-20260527/payload.json", "utf8")
    ) as EmailPayload;
    const itemFields = payload.slots!.loyaltyAbnormalConfigItems!.itemFields!;

    const bound = applyUnifiedRepeatBinding(template, {
      scope: "parentOnly",
      slotId: "loyaltyAbnormalConfigItems",
      parentHostId: "mcp-20260527-card-1",
      parentPrototypeChildIds: ["mcp-20260527-card-1"],
      parentItemFields: itemFields,
      parentFieldMappings: [
        {
          id: "map-title",
          sourcePath: "title",
          targetBlockId: "mcp-20260527-card-1-title-text",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
          label: "问题标题",
          valueType: "string",
        },
        {
          id: "map-desc",
          sourcePath: "description",
          targetBlockId: "mcp-20260527-card-1-desc-text",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
          label: "问题说明",
          valueType: "string",
        },
      ],
      parentMinItems: 4,
      parentMaxItems: 4,
      parentLabel: "异常配置项",
      parentDescription: "关键问题卡片",
      childItemPath: "",
    }, payload);

    const hostRepeat = bound.blocks["mcp-20260527-card-1"]?.repeat;
    assert.equal(hostRepeat?.slotId, "loyaltyAbnormalConfigItems");
    assert.deepEqual(hostRepeat?.prototypeChildIds, ["mcp-20260527-card-1"]);
    assert.equal(hostRepeat?.fieldMappings?.length, 2);

    const expanded = expandRepeatRegions(bound, payload);
    const cloneCount = (expanded.blocks["mcp-20260527-main"]?.children ?? []).filter((id) =>
      id.includes("mcp-20260527-card-1")
    ).length;
    assert.equal(cloneCount, 4, "self-repeat 应按 payload 展开 4 张卡片");
  });
});
