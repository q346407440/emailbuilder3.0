import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  editorGraphToNested,
  nestedToEditorGraph,
  nestedMasterToEditorMaster,
  parseMasterFromDisk,
  parseTemplateFromDisk,
  serializeTemplateToDisk,
  serializeEditorMasterToDisk,
  validateTemplateFromDisk,
} from "./templateTreeAdapter.ts";
import type { EmailTemplate } from "../types/email.ts";
import type { NestedEmailTemplate } from "../template-disk-contract/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..");

function loadMcpGraph(): EmailTemplate {
  const raw = JSON.parse(
    readFileSync(
      join(REPO, "data/emails/mcp-20260527/layouts/default/template.json"),
      "utf8"
    )
  ) as NestedEmailTemplate;
  return nestedToEditorGraph(raw);
}

describe("templateTreeAdapter", () => {
  it("nested → graph → nested round-trip 保留 repeat 与 block id", () => {
    const source = loadMcpGraph();
    const nested = editorGraphToNested(source);
    assert.equal(nested.schemaVersion, "4.0.0");
    assert.ok(nested.root);
    assert.equal(nested.root.type, "emailRoot");
    assert.ok(nested.root.blockMeta.blockType);
    assert.equal("blocks" in nested, false);

    const graph = nestedToEditorGraph(nested);
    assert.equal(graph.schemaVersion, "4.0.0");
    assert.equal(graph.rootBlockId, source.rootBlockId);
    assert.deepEqual(Object.keys(graph.blocks).sort(), Object.keys(source.blocks).sort());

    const host = Object.values(graph.blocks).find(
      (b) => b.repeat?.slotId === "loyaltyMerchantProductList"
    );
    assert.ok(host?.repeat);
    assert.equal(
      host.repeat.fieldMappings?.length,
      source.blocks[host.id]?.repeat?.fieldMappings?.length
    );

    const again = editorGraphToNested(graph);
    const graph2 = nestedToEditorGraph(again);
    assert.deepEqual(Object.keys(graph2.blocks).sort(), Object.keys(source.blocks).sort());
  });

  it("nested → graph → nested round-trip 保留 objectBind", () => {
    const source: EmailTemplate = {
      schemaVersion: "4.0.0",
      templateId: "layout-test",
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
            objectFields: [{ key: "headline", label: "套餐标题行", valueType: "string" }],
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

    const nested = editorGraphToNested(source);
    const host = nested.root.children?.[0];
    assert.equal(host?.objectBind?.slotId, "loyaltyRecommendedSubscriptionPlans");
    assert.equal(host?.objectBind?.fieldMappings?.length, 1);

    const graph = nestedToEditorGraph(nested);
    assert.equal(graph.blocks.host?.objectBind?.slotId, "loyaltyRecommendedSubscriptionPlans");
    assert.equal(graph.blocks.host?.objectBind?.fieldMappings?.length, 1);

    const disk = serializeTemplateToDisk(graph);
    const again = parseTemplateFromDisk(disk);
    assert.equal(again.blocks.host?.objectBind?.slotId, "loyaltyRecommendedSubscriptionPlans");
    assert.equal(again.blocks.host?.objectBind?.fieldMappings?.length, 1);
  });

  it("parseTemplateFromDisk / serializeTemplateToDisk", () => {
    const source = loadMcpGraph();
    const nested = editorGraphToNested(source);
    const graph = parseTemplateFromDisk(nested);
    const disk = serializeTemplateToDisk(graph);
    assert.equal(disk.schemaVersion, "4.0.0");
    assert.ok(disk.root.children?.length);
  });


  it("nested round-trip 保留 template.meta.easyEmailBindingUi", () => {
    const source = loadMcpGraph();
    const nested = editorGraphToNested(source);
    nested.meta = {
      easyEmailBindingUi: {
        "mcp-test-block": {
          "wrapperStyle.backgroundColor": { mode: "themeDetached" },
        },
      },
    };
    const graph = nestedToEditorGraph(nested);
    assert.deepEqual(graph.meta?.easyEmailBindingUi, nested.meta?.easyEmailBindingUi);
    const disk = serializeTemplateToDisk(graph);
    assert.deepEqual(disk.meta?.easyEmailBindingUi, nested.meta?.easyEmailBindingUi);
    const again = parseTemplateFromDisk(disk);
    assert.deepEqual(again.meta?.easyEmailBindingUi, nested.meta?.easyEmailBindingUi);
  });

  it("nested 缺少 blockMeta 时 validate 失败", () => {
    const source = loadMcpGraph();
    const nested = editorGraphToNested(source);
    const bad = structuredClone(nested);
    delete (bad.root as { blockMeta?: unknown }).blockMeta;
    assert.throws(() => parseTemplateFromDisk(bad));
  });

  it("parseMasterFromDisk 拒绝 flat blocks map wire", () => {
    const nested = JSON.parse(
      readFileSync(join(REPO, "data/masters/blocks/content.text.json"), "utf8")
    );
    const flatWire = {
      ...nestedMasterToEditorMaster(nested),
      schemaVersion: "4.0.0",
    };
    assert.throws(() => parseMasterFromDisk(flatWire), /禁止 flat wire/);
  });

  it("母版 nested → 内存 → nested round-trip", () => {
    const nested = JSON.parse(
      readFileSync(join(REPO, "data/masters/blocks/content.text.json"), "utf8")
    );
    const master = nestedMasterToEditorMaster(parseMasterFromDisk(nested));
    const disk = serializeEditorMasterToDisk(master);
    assert.equal(disk.schemaVersion, "4.0.0");
    assert.equal("blocks" in disk, false);
    assert.ok(disk.root);
    const again = nestedMasterToEditorMaster(parseMasterFromDisk(disk));
    assert.deepEqual(Object.keys(again.blocks).sort(), Object.keys(master.blocks).sort());
  });
});

describe("validateTemplateFromDisk 两层不短路", () => {
  it("壳层有错时仍报深层错误（一次性报全，避免错误分批暴露）", () => {
    const nested = JSON.parse(
      readFileSync(
        join(REPO, "data/emails/mcp-20260527/layouts/default/template.json"),
        "utf8"
      )
    ) as NestedEmailTemplate;

    // 制造壳层错误：摘掉首个子节点的 blockMeta
    const firstChild = nested.root.children?.[0] as Record<string, unknown> | undefined;
    assert.ok(firstChild);
    delete firstChild.blockMeta;
    // 制造深层错误：找一个 text 块把 bold 写成字符串（text.bold 必须为布尔值）
    const stack: Array<Record<string, unknown>> = [nested.root as unknown as Record<string, unknown>];
    let textNode: Record<string, unknown> | null = null;
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.type === "text") { textNode = node; break; }
      for (const child of (node.children as Array<Record<string, unknown>> | undefined) ?? []) stack.push(child);
    }
    assert.ok(textNode, "夹具中应存在 text 块");
    (textNode!.props as Record<string, unknown>).bold = "yes";

    const issues = validateTemplateFromDisk(nested).map((i) => `${i.path}: ${i.reason}`);
    assert.ok(
      issues.some((line) => line.includes("blockMeta 为必填对象")),
      `应包含壳层错误，实际：${issues.join(" | ")}`
    );
    assert.ok(
      issues.some((line) => line.includes("必须为布尔值")),
      `应同时包含深层错误（旧实现壳层短路会吞掉），实际：${issues.join(" | ")}`
    );
  });

  it("壳层报非法运行时 type（过松修复：type 不再只查非空）", () => {
    const nested = JSON.parse(
      readFileSync(
        join(REPO, "data/emails/mcp-20260527/layouts/default/template.json"),
        "utf8"
      )
    ) as NestedEmailTemplate;
    const firstChild = nested.root.children?.[0] as Record<string, unknown> | undefined;
    assert.ok(firstChild);
    firstChild.type = "textBlock";

    const issues = validateTemplateFromDisk(nested).map((i) => `${i.path}: ${i.reason}`);
    assert.ok(
      issues.some((line) => line.includes("type 非法运行时类型「textBlock」")),
      `应报非法 type，实际：${issues.join(" | ")}`
    );
  });
});
