import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { VirtualBlockRef } from "../repeat-binding-contract";
import {
  countRepeatExpansionGroupMembers,
  isRepeatExpansionGroupSelected,
  refToRepeatExpansionGroupKey,
  refsShareRepeatExpansionGroup,
} from "./repeatExpansionGroup";
import { buildRepeatPreviewModel } from "./buildPreviewModel";
import { applySingleLevelRepeatBinding } from "../lib/repeatNestedBinding";
import type { EmailPayload, EmailTemplate } from "../types/email";

function miniSelfRepeatTemplate(): EmailTemplate {
  return {
    schemaVersion: "4.0.0",
    templateId: "t",
    templateVersion: 1,
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "emailRoot",
        parentId: null,
        children: ["card"],
        props: {},
      },
      card: {
        id: "card",
        type: "layout",
        parentId: "root",
        children: [],
        props: { direction: "vertical" },
        wrapperStyle: { widthMode: "fill", heightMode: "hug" },
      },
    },
  };
}

const payload: EmailPayload = {
  schemaVersion: "1.0.0",
  slotOrder: ["items"],
  slots: {
    items: {
      label: "项",
      valueType: "collection",
      itemFields: [{ key: "title", label: "标题", valueType: "string" }],
    },
  },
  values: {
    items: [{ title: "a" }, { title: "b" }, { title: "c" }],
  },
};

function repeatItemRef(itemIndex: number): VirtualBlockRef {
  return {
    kind: "repeat-item",
    hostId: "card",
    prototypeRootId: "card",
    itemIndex,
    contextStack: [
      { slotId: "items", itemIndex, item: { title: "x" }, itemPath: String(itemIndex) },
    ],
  };
}

describe("repeatExpansionGroup", () => {
  it("同宿主展开项共享 groupKey", () => {
    const g0 = refToRepeatExpansionGroupKey(repeatItemRef(0));
    const g1 = refToRepeatExpansionGroupKey(repeatItemRef(1));
    assert.equal(g0, g1);
    assert.ok(g0?.startsWith("repeat-expansion:card:card:"));
  });

  it("isRepeatExpansionGroupSelected：不同 itemIndex 同组为 true", () => {
    assert.equal(isRepeatExpansionGroupSelected(repeatItemRef(0), repeatItemRef(2)), true);
  });

  it("physical 与 repeat-item 不组选", () => {
    assert.equal(
      isRepeatExpansionGroupSelected({ kind: "physical", blockId: "card" }, repeatItemRef(0)),
      false
    );
  });

  it("countRepeatExpansionGroupMembers 与预览项数一致", () => {
    let t = applySingleLevelRepeatBinding(miniSelfRepeatTemplate(), {
      hostId: "card",
      slotId: "items",
      itemFields: [{ key: "title", label: "标题", valueType: "string" }],
      fieldMappings: [],
    }, payload);
    const model = buildRepeatPreviewModel(t, payload);
    assert.equal(countRepeatExpansionGroupMembers(model, repeatItemRef(1)), 3);
    assert.equal(refsShareRepeatExpansionGroup(repeatItemRef(0), repeatItemRef(2)), true);
  });
});
