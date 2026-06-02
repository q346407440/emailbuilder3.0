import { PAYLOAD_SCHEMA_VERSION } from "../../payload-contract/types";
import { validatePayloadShape } from "../../payload-contract/validate";
import type { SchemaArtifactDef } from "../types";

export const payloadArtifact: SchemaArtifactDef = {
  id: "payload",
  label: "场景 payload.json",
  currentVersion: PAYLOAD_SCHEMA_VERSION,
  diskPatterns: ["data/emails/*/payload.json"],
  validate: (raw) => validatePayloadShape(raw).map((i) => ({ path: i.path, reason: i.reason })),
};
