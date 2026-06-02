import { NESTED_TEMPLATE_SCHEMA_VERSION, validateNestedDisk } from "../../template-disk-contract";
import type { SchemaArtifactDef } from "../types";

export const templateArtifact: SchemaArtifactDef = {
  id: "template",
  label: "邮件 template.json（nested）",
  currentVersion: NESTED_TEMPLATE_SCHEMA_VERSION,
  diskPatterns: ["data/emails/*/layouts/*/template.json"],
  validate: (raw) => validateNestedDisk(raw).map((i) => ({ path: i.path, reason: i.reason })),
};
