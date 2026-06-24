import { z } from "zod";
import {
  ICON_PACKS,
  RADIUS_TOKENS,
  ROLE_TOKENS,
  SPACE_TOKENS,
  TONE_TOKENS,
} from "../../../restore-ast-contract/tokens";

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function asNonEmptyEnum(values: readonly string[]): [string, ...string[]] {
  if (values.length === 0) throw new Error("enum 不能为空");
  return values as [string, ...string[]];
}

const pxValueSchema = z.object({ px: z.number() });
const hexValueSchema = z.object({ hex: z.string().regex(HEX_COLOR_RE) });
const aspectSchema = z.object({ w: z.number(), h: z.number() });

const toneValueSchema = z.union([z.enum(asNonEmptyEnum(TONE_TOKENS)), hexValueSchema]);
const spaceValueSchema = z.union([z.enum(asNonEmptyEnum(SPACE_TOKENS)), pxValueSchema, z.string()]);
const roleValueSchema = z.union([z.enum(asNonEmptyEnum(ROLE_TOKENS)), pxValueSchema, z.string()]);
const radiusValueSchema = z.union([z.enum(asNonEmptyEnum(RADIUS_TOKENS)), pxValueSchema, z.string()]);

const boxSchema = z.object({
  tone: toneValueSchema.optional(),
  radius: radiusValueSchema.optional(),
  pad: spaceValueSchema.optional(),
  border: z.enum(["hairline", "dashed-hairline", "thin"]).optional(),
  borderTone: toneValueSchema.optional(),
});

const alignCrossSchema = z.enum(["start", "center", "end"]);
const alignMainSchema = z.enum(["start", "center", "end", "between"]);

const restoreThemeSchema = z.object({
  colors: z.object({
    primary: z.string().regex(HEX_COLOR_RE),
    accent: z.string().regex(HEX_COLOR_RE),
    secondary: z.string().regex(HEX_COLOR_RE),
    surface: z.string().regex(HEX_COLOR_RE),
  }),
  spacing: z.object({
    section: z.string().min(1),
    gap: z.string().min(1),
    pageInline: z.string().min(1),
  }),
  typography: z.object({
    display: z.string().min(1),
    h1: z.string().min(1),
    body: z.string().min(1),
    caption: z.string().min(1),
  }),
  radius: z.object({
    panel: z.string().min(1),
    cta: z.string().min(1),
  }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RestoreAstNodeSchema = z.ZodTypeAny;

const restoreNodeSchema: RestoreAstNodeSchema = z.lazy(() =>
  z.discriminatedUnion("t", [
    z.object({
      t: z.literal("email"),
      children: z.array(restoreNodeSchema),
    }),
    z.object({
      t: z.literal("stack"),
      title: z.string().optional(),
      gap: spaceValueSchema.optional(),
      align: alignCrossSchema.optional(),
      box: boxSchema.optional(),
      children: z.array(restoreNodeSchema),
    }),
    z.object({
      t: z.literal("row"),
      title: z.string().optional(),
      gap: spaceValueSchema.optional(),
      align: alignMainSchema.optional(),
      crossAlign: alignCrossSchema.optional(),
      box: boxSchema.optional(),
      children: z.array(restoreNodeSchema),
    }),
    z.object({
      t: z.literal("grid"),
      columns: z.number().int().min(1).max(6),
      title: z.string().optional(),
      gap: spaceValueSchema.optional(),
      box: boxSchema.optional(),
      children: z.array(restoreNodeSchema),
    }),
    z.object({
      t: z.literal("text"),
      content: z.string(),
      role: roleValueSchema,
      tone: toneValueSchema.optional(),
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      align: alignCrossSchema.optional(),
    }),
    z.object({
      t: z.literal("image"),
      query: z.string().min(1),
      height: pxValueSchema.optional(),
      aspect: aspectSchema.optional(),
      box: boxSchema.optional(),
      align: alignCrossSchema.optional(),
      crossAlign: alignCrossSchema.optional(),
      children: z.array(restoreNodeSchema).optional(),
    }),
    z.object({
      t: z.literal("icon"),
      query: z.string().min(1),
      pack: z.enum(ICON_PACKS),
      tone: toneValueSchema.optional(),
      size: z.union([z.enum(["sm", "md", "lg"]), pxValueSchema]).optional(),
    }),
    z.object({
      t: z.literal("button"),
      label: z.string().min(1),
      href: z.string().optional(),
      tone: toneValueSchema.optional(),
      radius: radiusValueSchema.optional(),
      width: z.enum(["fill", "hug"]).optional(),
      height: z.enum(["hug", "relaxed"]).optional(),
    }),
    z.object({
      t: z.literal("divider"),
      tone: toneValueSchema.optional(),
      thickness: z.enum(["hairline", "thin"]).optional(),
    }),
    z.object({
      t: z.literal("progress"),
      value: z.number().min(0).max(100),
    }),
  ])
);

/** RestoreAst LLM 输出形态（供 json_schema + 文档；业务校验仍以 parseRestoreAstDocument 为准）。 */
export const restoreAstDocumentSchema = z.object({
  theme: restoreThemeSchema,
  tree: z.object({
    t: z.literal("email"),
    children: z.array(restoreNodeSchema),
  }),
});
