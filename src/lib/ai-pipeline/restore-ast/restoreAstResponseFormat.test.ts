import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { DOUBAO_JSON_SCHEMA_MODEL_IDS } from "../../../layout-variant-ai-contract/llmProfileCatalog";
import { getRestoreAstResponseFormat, resolveRestoreAstLlmResponseFormat } from "./restoreAstResponseFormat";
import { restoreAstDocumentSchema } from "../schemas/restore-ast-document";

const REPO_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const FIXTURE = join(
  REPO_ROOT,
  "scripts/fixtures/restore-ast/forever21-template46/restore-ast.json"
);

test("resolveRestoreAstLlmResponseFormat 仅 catalog 内豆包模型返回 json_schema", () => {
  const allowedModel = DOUBAO_JSON_SCHEMA_MODEL_IDS[0] ?? "doubao-seed-2-0-pro-260215";
  const format = resolveRestoreAstLlmResponseFormat({
    profile: { vendor: "doubao", model: allowedModel, thinking: "low" },
  });
  assert.equal(format?.type, "json_schema");

  assert.equal(
    resolveRestoreAstLlmResponseFormat({
      profile: { vendor: "gemini", model: "gemini-3.5-flash", thinking: "low" },
    }),
    undefined
  );

  assert.equal(
    resolveRestoreAstLlmResponseFormat({
      profile: { vendor: "doubao", model: "ep-other", thinking: "low" },
    }),
    undefined
  );
});

test("resolveRestoreAstLlmResponseFormat lite 模型启用 json_schema", () => {
  const format = resolveRestoreAstLlmResponseFormat({
    profile: {
      vendor: "doubao",
      model: "doubao-seed-2-0-lite-260428",
      thinking: "low",
    },
  });
  assert.equal(format?.type, "json_schema");
});

test("getRestoreAstResponseFormat 产出 json_schema 且含 theme/tree", () => {
  const format = getRestoreAstResponseFormat();
  assert.equal(format.type, "json_schema");
  assert.equal(format.json_schema.strict, false);
  const schema = format.json_schema.schema;
  assert.equal(typeof schema, "object");
  assert.ok(schema && "properties" in schema);
});

test("forever21 夹具可通过 restoreAstDocumentSchema 解析", () => {
  const raw = readFileSync(FIXTURE, "utf8");
  const parsed = restoreAstDocumentSchema.parse(JSON.parse(raw));
  assert.equal(parsed.tree.t, "email");
  assert.ok(parsed.tree.children.length > 0);
});
