import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LayoutManifest } from "../layout-variant-contract/types";
import type { EmailPayload, EmailTemplate, EmailBlock } from "../types/email";
import {
  fetchTemplatesAndValidatePayload,
  validatePayloadAgainstAllLayoutTemplates,
} from "./validatePayloadAllLayouts";

describe("validatePayloadAgainstAllLayoutTemplates", () => {
  it("为每个版式前缀 layout:id", () => {
    const payload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: { orphan: "x" } };
    const tpl: EmailTemplate = {
      schemaVersion: "1.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "layout",
          parentId: null,
          children: [],
          props: {},
          bindings: {},
        } as EmailBlock,
      },
    };
    const issues = validatePayloadAgainstAllLayoutTemplates(payload, [
      { layoutVariantId: "card", template: tpl },
      { layoutVariantId: "centered", template: tpl },
    ]);
    assert.ok(issues.some((i) => i.path.startsWith("layout:card/")));
    assert.ok(issues.some((i) => i.path.startsWith("layout:centered/")));
  });
});

describe("fetchTemplatesAndValidatePayload", () => {
  it("跳过已逻辑删除版式，不向 API 请求 deleted 版式 template", async () => {
    const manifest: LayoutManifest = {
      schemaVersion: "1.0.0",
      activeLayoutVariantId: "default",
      variants: [
        { id: "default", label: "默认", publishStatus: "published" },
        { id: "123", label: "123", deletedAt: "2026-05-29T06:45:47.850Z", publishStatus: "published" },
        { id: "spu-sku", label: "SPU+SKU", publishStatus: "published" },
      ],
    };
    const tpl: EmailTemplate = {
      schemaVersion: "1.0.0",
      templateId: "t",
      templateVersion: 1,
      rootBlockId: "root",
      blocks: {
        root: {
          id: "root",
          type: "layout",
          parentId: null,
          children: [],
          props: {},
          bindings: {},
        } as EmailBlock,
      },
    };
    const payload: EmailPayload = { schemaVersion: "1.0.0", slots: {}, values: {} };
    const fetched: string[] = [];
    const issues = await fetchTemplatesAndValidatePayload(
      manifest,
      payload,
      "default",
      tpl,
      async (layoutId) => {
        fetched.push(layoutId);
        if (layoutId === "123") {
          throw new Error("版式「123」已逻辑删除");
        }
        return tpl;
      }
    );
    assert.equal(issues.length, 0);
    assert.ok(!fetched.includes("123"), "不应请求已删除版式");
    assert.deepEqual(fetched, ["spu-sku"], "当前版式用内存 template，仅拉取其它可见版式");
  });
});
