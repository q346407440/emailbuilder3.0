import { layoutManifestArtifact } from "./artifacts/layoutManifest";
import { masterArtifact } from "./artifacts/master";
import { metaArtifact } from "./artifacts/meta";
import { payloadArtifact } from "./artifacts/payload";
import { sceneCollectionPresetArtifact } from "./artifacts/sceneCollectionPreset";
import { templateArtifact } from "./artifacts/template";
import { tokenPresetsArtifact } from "./artifacts/tokenPresets";
import type { SchemaArtifactDef, SchemaArtifactId, SchemaValidationIssue } from "./types";

export type { SchemaArtifactDef, SchemaArtifactId, SchemaValidationIssue } from "./types";

/** 落盘 JSON artifact 索引（唯一入口；字段真源在各 *-contract） */
export const SCHEMA_ARTIFACTS: readonly SchemaArtifactDef[] = [
  templateArtifact,
  masterArtifact,
  payloadArtifact,
  tokenPresetsArtifact,
  layoutManifestArtifact,
  metaArtifact,
  sceneCollectionPresetArtifact,
] as const;

const byId = new Map<string, SchemaArtifactDef>(
  SCHEMA_ARTIFACTS.map((a) => [a.id, a])
);

export function getSchemaArtifact(id: SchemaArtifactId): SchemaArtifactDef | undefined {
  return byId.get(id);
}

export function assertKnownSchemaArtifact(id: string): SchemaArtifactDef {
  const artifact = byId.get(id);
  if (!artifact) {
    throw new Error(`未知 schema artifact：${id}`);
  }
  return artifact;
}

/** 校验 raw JSON 是否符合 artifact 的 schemaVersion 与形态 */
export function validateSchemaArtifact(
  id: SchemaArtifactId,
  raw: unknown
): SchemaValidationIssue[] {
  return assertKnownSchemaArtifact(id).validate(raw);
}
