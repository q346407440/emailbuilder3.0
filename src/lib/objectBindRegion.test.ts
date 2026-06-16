import assert from "node:assert";
import { describe, it } from "node:test";
import type { EmailPayload, EmailTemplate } from "../types/email";
import {
  applyObjectBindMappingsToTemplate,
  applyObjectRegionBinding,
  isObjectBindMappedField,
  removeObjectRegionBinding,
} from "./objectBindRegion";
import { mergeTemplatePayload } from "./merge";

const basePayload = (): EmailPayload => ({
  schemaVersion: "1.0.0",
  slots: {
    loyaltyRecommendedSubscriptionPlans: {
      label: "推荐订阅套餐",
      valueType: "object",
      objectFields: [
        { key: "headline", label: "套餐标题行", valueType: "string", required: true },
        { key: "roiText", label: "ROI 文案", valueType: "string", required: true },
      ],
    },
  },
  values: {
    loyaltyRecommendedSubscriptionPlans: {
      headline: "growth 版本: $10.00 / 月",
      roiText: "每月 ROI 预计可达到 1:3",
    },
  },
});

describe("objectBindRegion", () => {
  it("applyObjectRegionBinding 写入 objectBind 并清除 repeat", () => {
    let template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: { id: "root", type: "emailRoot", parentId: null, children: ["host"], props: {} },
        host: {
          id: "host",
          type: "layout",
          parentId: "root",
          children: ["title"],
          props: {},
          repeat: {
            mode: "collection",
            slotId: "oldList",
            prototypeChildIds: ["host"],
            fallbackChildIds: ["host"],
            itemFields: [{ key: "name", label: "名称", valueType: "string" }],
          },
        },
        title: {
          id: "title",
          type: "text",
          parentId: "host",
          children: [],
          props: {
            textBody: { paragraphs: [{ runs: [{ text: "占位" }] }] },
            bold: false,
            italic: false,
            decoration: "none",
          },
        },
      },
    };

    template = applyObjectRegionBinding(template, {
      hostId: "host",
      slotId: "loyaltyRecommendedSubscriptionPlans",
      objectFields: basePayload().slots.loyaltyRecommendedSubscriptionPlans!.objectFields!,
      fieldMappings: [
        {
          id: "title.props.textBody.paragraphs.0.runs.0.text:headline",
          sourcePath: "headline",
          targetBlockId: "title",
          targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
          label: "套餐标题行",
          valueType: "string",
        },
      ],
      label: "推荐订阅套餐",
    });

    assert.equal(template.blocks.host?.repeat, undefined);
    assert.equal(template.blocks.host?.objectBind?.slotId, "loyaltyRecommendedSubscriptionPlans");
    assert.equal(template.blocks.host?.objectBind?.fieldMappings?.length, 1);
  });

  it("预览物化后 merge 可读取对象字段值", () => {
    const template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: { id: "root", type: "emailRoot", parentId: null, children: ["host"], props: {} },
        host: {
          id: "host",
          type: "layout",
          parentId: "root",
          children: ["title"],
          props: {},
          objectBind: {
            mode: "object",
            slotId: "loyaltyRecommendedSubscriptionPlans",
            objectFields: basePayload().slots.loyaltyRecommendedSubscriptionPlans!.objectFields!,
            fieldMappings: [
              {
                id: "title.props.textBody.paragraphs.0.runs.0.text:headline",
                sourcePath: "headline",
                targetBlockId: "title",
                targetBindPath: "props.textBody.paragraphs.0.runs.0.text",
                valueType: "string",
              },
            ],
          },
        },
        title: {
          id: "title",
          type: "text",
          parentId: "host",
          children: [],
          props: {
            textBody: { paragraphs: [{ runs: [{ text: "" }] }] },
            bold: false,
            italic: false,
            decoration: "none",
          },
        },
      },
    };

    const merged = mergeTemplatePayload(applyObjectBindMappingsToTemplate(template), basePayload());
    const mergedTitle = merged.blocks.title;
    const text =
      mergedTitle?.type === "text"
        ? mergedTitle.props.textBody?.paragraphs?.[0]?.runs?.[0]?.text
        : undefined;
    assert.equal(text, "growth 版本: $10.00 / 月");
    assert.equal(isObjectBindMappedField(template, "title", "props.textBody.paragraphs.0.runs.0.text"), true);
  });

  it("removeObjectRegionBinding 清除宿主 objectBind", () => {
    const template: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: { id: "root", type: "emailRoot", parentId: null, children: ["host"], props: {} },
        host: {
          id: "host",
          type: "layout",
          parentId: "root",
          children: [],
          props: {},
          objectBind: {
            mode: "object",
            slotId: "loyaltyRecommendedSubscriptionPlans",
            objectFields: [],
          },
        },
      },
    };
    const next = removeObjectRegionBinding(template, "host");
    assert.equal(next.blocks.host?.objectBind, undefined);
  });
});
