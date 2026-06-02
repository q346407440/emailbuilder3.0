import { TOKEN_PRESET_SCHEMA_VERSION, validateTokenPresets } from "../../token-preset-contract";
import type { SchemaArtifactDef } from "../types";

export const tokenPresetsArtifact: SchemaArtifactDef = {
  id: "tokenPresets",
  label: "tokenPresets.json",
  currentVersion: TOKEN_PRESET_SCHEMA_VERSION,
  diskPatterns: [
    "data/emails/*/layouts/*/tokenPresets.json",
    "data/token-presets/*.json",
  ],
  validate: (raw) => validateTokenPresets(raw as Parameters<typeof validateTokenPresets>[0]).map((i) => ({
    path: i.path,
    reason: i.reason,
  })),
};
