import { NESTED_TEMPLATE_SCHEMA_VERSION, validateNestedMasterDisk } from "../../template-disk-contract";
import type { SchemaArtifactDef } from "../types";

export const masterArtifact: SchemaArtifactDef = {
  id: "master",
  label: "block 母版 JSON",
  currentVersion: NESTED_TEMPLATE_SCHEMA_VERSION,
  diskPatterns: ["data/masters/blocks/*.json"],
  validate: (raw) => validateNestedMasterDisk(raw).map((i) => ({ path: i.path, reason: i.reason })),
};
