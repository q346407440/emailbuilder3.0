import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function schemaToJsonSchema(schema: z.ZodType, name: string): Record<string, unknown> {
  const raw = zodToJsonSchema(schema, { name, $refStrategy: "none" });
  if (typeof raw === "object" && raw !== null && "definitions" in raw) {
    const defs = (raw as { definitions?: Record<string, unknown> }).definitions;
    if (defs && defs[name]) return defs[name] as Record<string, unknown>;
  }
  return raw as Record<string, unknown>;
}

export const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function pxStringSchema(values: readonly string[]) {
  return z.enum(values as [string, ...string[]]);
}
