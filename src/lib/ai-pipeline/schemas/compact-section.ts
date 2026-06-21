import { z } from "zod";
import {
  BOX_MODES,
  COMPACT_BLOCK_KINDS,
  COMPACT_SCHEMA_VERSION,
} from "../compactTypes";
import type { CompactStyleRawValue } from "../../../layout-variant-ai-contract/agentStyleKeys";

const compactWrapperSchema: z.ZodType<Record<string, unknown>> = z
  .object({
    widthMode: z.enum(BOX_MODES).optional(),
    heightMode: z.enum(BOX_MODES).optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    backgroundImageRef: z.string().optional(),
    contentAlign: z
      .object({
        horizontal: z.string(),
        vertical: z.string(),
      })
      .optional(),
    padding: z
      .object({
        top: z.string().optional(),
        right: z.string().optional(),
        bottom: z.string().optional(),
        left: z.string().optional(),
      })
      .optional(),
    backgroundColor: z.string().optional(),
    borderRadius: z
      .object({
        topLeft: z.string().optional(),
        topRight: z.string().optional(),
        bottomRight: z.string().optional(),
        bottomLeft: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export type CompactNodeParsed = {
  kind: (typeof COMPACT_BLOCK_KINDS)[number];
  label?: string;
  props?: Record<string, unknown>;
  wrapper?: Record<string, unknown>;
  children?: CompactNodeParsed[];
  // 与 compactStyleValueSchema（允许标量/{literal,tokenPath}/嵌套）及 CompactNode.styleKeys 对齐。
  styleKeys?: Record<string, CompactStyleRawValue>;
};

/** styleKeys 叶子或嵌套分组（如 buttonStyle 对象）。 */
const compactStyleValueSchema: z.ZodType<CompactStyleRawValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.boolean(),
    z.number(),
    z.object({
      literal: z.string(),
      tokenPath: z.string().optional(),
    }),
    z.record(z.string(), compactStyleValueSchema),
  ])
);

const compactNodeSchema: z.ZodType<CompactNodeParsed> = z.lazy(() =>
  z.object({
    kind: z.enum(COMPACT_BLOCK_KINDS),
    label: z.string().min(1).max(32).optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    wrapper: compactWrapperSchema.optional(),
    children: z.array(compactNodeSchema).optional(),
    styleKeys: z.record(z.string(), compactStyleValueSchema).optional(),
  })
);

/** LLM 应返回的业务 payload（仅 root 树；sectionId / 版本由管线注入）。 */
export const compactSectionRootPayloadSchema = z.object({
  root: compactNodeSchema,
});

export const compactSectionTreeSchema = compactSectionRootPayloadSchema.extend({
  compactSchemaVersion: z.literal(COMPACT_SCHEMA_VERSION),
  sectionId: z.string().min(1),
});

export type CompactSectionRootPayloadParsed = z.infer<typeof compactSectionRootPayloadSchema>;
export type CompactSectionTreeParsed = z.infer<typeof compactSectionTreeSchema>;
