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
