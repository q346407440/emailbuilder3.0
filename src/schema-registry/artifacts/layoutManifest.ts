import { LAYOUT_MANIFEST_SCHEMA_VERSION, type LayoutManifest } from "../../layout-variant-contract/types";
import { validateLayoutManifest } from "../../lib/emailLayoutVariant";
import type { SchemaArtifactDef } from "../types";

export const layoutManifestArtifact: SchemaArtifactDef = {
  id: "layoutManifest",
  label: "layout-manifest.json",
  currentVersion: LAYOUT_MANIFEST_SCHEMA_VERSION,
  diskPatterns: ["data/emails/*/layout-manifest.json"],
  validate: (raw) =>
    validateLayoutManifest(raw as LayoutManifest).map((i) => ({ path: i.path, reason: i.reason })),
};
