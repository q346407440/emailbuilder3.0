import { META_SCHEMA_VERSION, validateEmailMeta } from "../../meta-contract";
import type { SchemaArtifactDef } from "../types";

export const metaArtifact: SchemaArtifactDef = {
  id: "meta",
  label: "meta.json",
  currentVersion: META_SCHEMA_VERSION,
  diskPatterns: ["data/emails/*/meta.json"],
  validate: (raw) => validateEmailMeta(raw),
  migrateScripts: {
    preview: "migrate:publish-status",
    write: "migrate:publish-status:write",
  },
};
