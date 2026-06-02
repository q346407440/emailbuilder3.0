import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../types/email";
import {
  repeatBindingLeadSentence,
  repeatBindingRowStructureLabel,
} from "./repeatInspectorSummaryCopy";

import { minimalEmailTemplate } from "./testFixtures/emailTemplate";

function miniTemplate(): EmailTemplate {
  return minimalEmailTemplate({
    rootBlockId: "root",
    blocks: {
      root: {
        id: "root",
        type: "layout",
        parentId: null,
        children: ["card"],
        wrapperStyle: {},
        props: {},
      },
      card: {
        id: "card",
        type: "layout",
        parentId: "root",
        children: [],
        wrapperStyle: {},
        props: {},
        repeat: {
          mode: "collection",
          slotId: "items",
          prototypeChildIds: ["card"],
          fallbackChildIds: ["card"],
          itemFields: [{ key: "title", label: "标题", valueType: "string" }],
          label: "异常配置项",
        },
      },
    },
    blockMeta: {
      card: { name: "问题卡片1" },
    },
  });
}

describe("repeatInspectorSummaryCopy", () => {
  it("self-repeat 行结构文案不含技术术语", () => {
    const template = miniTemplate();
    const repeat = template.blocks.card!.repeat!;
    assert.equal(repeatBindingRowStructureLabel(template, "card", repeat), "每条数据复制当前区块");
    assert.match(
      repeatBindingLeadSentence(template, "card", repeat, 4),
      /异常配置项.*共 4 条/
    );
  });
});
