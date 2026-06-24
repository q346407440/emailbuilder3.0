/**
 * RestoreAst 豆包 json_schema 真源（手写 JSON Schema，避免 zod lazy 递归无法导出）。
 * 业务校验仍以 parseRestoreAstDocument + restore-ast-contract 为准。
 */
export const RESTORE_AST_LLM_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    theme: { $ref: "#/$defs/Theme" },
    tree: { $ref: "#/$defs/EmailNode" },
  },
  required: ["theme", "tree"],
  additionalProperties: false,
  $defs: {
    Theme: {
      type: "object",
      properties: {
        colors: {
          type: "object",
          properties: {
            primary: { type: "string" },
            accent: { type: "string" },
            secondary: { type: "string" },
            surface: { type: "string" },
          },
          required: ["primary", "accent", "secondary", "surface"],
          additionalProperties: false,
        },
        spacing: {
          type: "object",
          properties: {
            section: { type: "string" },
            gap: { type: "string" },
            pageInline: { type: "string" },
          },
          required: ["section", "gap", "pageInline"],
          additionalProperties: false,
        },
        typography: {
          type: "object",
          properties: {
            display: { type: "string" },
            h1: { type: "string" },
            body: { type: "string" },
            caption: { type: "string" },
          },
          required: ["display", "h1", "body", "caption"],
          additionalProperties: false,
        },
        radius: {
          type: "object",
          properties: {
            panel: { type: "string" },
            cta: { type: "string" },
          },
          required: ["panel", "cta"],
          additionalProperties: false,
        },
      },
      required: ["colors", "spacing", "typography", "radius"],
      additionalProperties: false,
    },
    PxValue: {
      type: "object",
      properties: { px: { type: "number" } },
      required: ["px"],
      additionalProperties: false,
    },
    HexValue: {
      type: "object",
      properties: { hex: { type: "string" } },
      required: ["hex"],
      additionalProperties: false,
    },
    ToneValue: {
      anyOf: [
        { type: "string", enum: ["primary", "accent", "secondary", "surface"] },
        { $ref: "#/$defs/HexValue" },
      ],
    },
    SpaceValue: {
      anyOf: [
        { type: "string", enum: ["section", "gap", "pageInline"] },
        { $ref: "#/$defs/PxValue" },
        { type: "string" },
      ],
    },
    RoleValue: {
      anyOf: [
        { type: "string", enum: ["display", "h1", "body", "caption"] },
        { $ref: "#/$defs/PxValue" },
        { type: "string" },
      ],
    },
    RadiusValue: {
      anyOf: [
        { type: "string", enum: ["panel", "cta"] },
        { $ref: "#/$defs/PxValue" },
      ],
    },
    Box: {
      type: "object",
      properties: {
        tone: { $ref: "#/$defs/ToneValue" },
        radius: { $ref: "#/$defs/SpaceValue" },
        pad: { $ref: "#/$defs/SpaceValue" },
        border: { type: "string", enum: ["hairline", "dashed-hairline", "thin"] },
        borderTone: { $ref: "#/$defs/ToneValue" },
      },
      additionalProperties: false,
    },
    AspectRatio: {
      type: "object",
      properties: { w: { type: "number" }, h: { type: "number" } },
      required: ["w", "h"],
      additionalProperties: false,
    },
    EmailNode: {
      type: "object",
      properties: {
        t: { const: "email" },
        canvas: { $ref: "#/$defs/ToneValue" },
        children: { type: "array", items: { $ref: "#/$defs/RestoreNode" } },
      },
      required: ["t", "children"],
      additionalProperties: false,
    },
    RestoreNode: {
      anyOf: [
        { $ref: "#/$defs/StackNode" },
        { $ref: "#/$defs/RowNode" },
        { $ref: "#/$defs/GridNode" },
        { $ref: "#/$defs/TextNode" },
        { $ref: "#/$defs/ImageNode" },
        { $ref: "#/$defs/IconNode" },
        { $ref: "#/$defs/ButtonNode" },
        { $ref: "#/$defs/DividerNode" },
        { $ref: "#/$defs/ProgressNode" },
      ],
    },
    StackNode: {
      type: "object",
      properties: {
        t: { const: "stack" },
        title: { type: "string" },
        gap: { $ref: "#/$defs/SpaceValue" },
        align: { type: "string", enum: ["start", "center", "end"] },
        box: { $ref: "#/$defs/Box" },
        children: { type: "array", items: { $ref: "#/$defs/RestoreNode" } },
      },
      required: ["t", "children"],
      additionalProperties: false,
    },
    RowNode: {
      type: "object",
      properties: {
        t: { const: "row" },
        title: { type: "string" },
        gap: { $ref: "#/$defs/SpaceValue" },
        align: { type: "string", enum: ["start", "center", "end", "between"] },
        crossAlign: { type: "string", enum: ["start", "center", "end"] },
        box: { $ref: "#/$defs/Box" },
        children: { type: "array", items: { $ref: "#/$defs/RestoreNode" } },
      },
      required: ["t", "children"],
      additionalProperties: false,
    },
    GridNode: {
      type: "object",
      properties: {
        t: { const: "grid" },
        columns: { type: "integer", minimum: 1, maximum: 6 },
        title: { type: "string" },
        gap: { $ref: "#/$defs/SpaceValue" },
        box: { $ref: "#/$defs/Box" },
        cellImageHeight: { $ref: "#/$defs/PxValue" },
        children: { type: "array", items: { $ref: "#/$defs/RestoreNode" } },
      },
      required: ["t", "columns", "children"],
      additionalProperties: false,
    },
    TextNode: {
      type: "object",
      properties: {
        t: { const: "text" },
        content: { type: "string" },
        role: { $ref: "#/$defs/RoleValue" },
        tone: { $ref: "#/$defs/ToneValue" },
        bold: { type: "boolean" },
        italic: { type: "boolean" },
        align: { type: "string", enum: ["start", "center", "end"] },
      },
      required: ["t", "content", "role"],
      additionalProperties: false,
    },
    ImageNode: {
      type: "object",
      properties: {
        t: { const: "image" },
        query: { type: "string" },
        height: { $ref: "#/$defs/PxValue" },
        aspect: { $ref: "#/$defs/AspectRatio" },
        box: { $ref: "#/$defs/Box" },
        align: { type: "string", enum: ["start", "center", "end"] },
        crossAlign: { type: "string", enum: ["start", "center", "end"] },
        children: { type: "array", items: { $ref: "#/$defs/RestoreNode" } },
      },
      required: ["t", "query"],
      additionalProperties: false,
    },
    IconNode: {
      type: "object",
      properties: {
        t: { const: "icon" },
        query: { type: "string" },
        pack: { type: "string", enum: ["tabler", "simple-icons", "lucide"] },
        tone: { $ref: "#/$defs/ToneValue" },
        size: {
          anyOf: [
            { type: "string", enum: ["sm", "md", "lg"] },
            { $ref: "#/$defs/PxValue" },
          ],
        },
      },
      required: ["t", "query", "pack"],
      additionalProperties: false,
    },
    ButtonNode: {
      type: "object",
      properties: {
        t: { const: "button" },
        label: { type: "string" },
        href: { type: "string" },
        tone: { $ref: "#/$defs/ToneValue" },
        radius: { $ref: "#/$defs/RadiusValue" },
        width: { type: "string", enum: ["fill", "hug"] },
        height: { type: "string", enum: ["hug", "relaxed"] },
        border: { type: "string", enum: ["hairline", "dashed-hairline", "thin"] },
        borderTone: { $ref: "#/$defs/ToneValue" },
      },
      required: ["t", "label"],
      additionalProperties: false,
    },
    DividerNode: {
      type: "object",
      properties: {
        t: { const: "divider" },
        tone: { $ref: "#/$defs/ToneValue" },
        thickness: { type: "string", enum: ["hairline", "thin"] },
      },
      required: ["t"],
      additionalProperties: false,
    },
    ProgressNode: {
      type: "object",
      properties: {
        t: { const: "progress" },
        value: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["t", "value"],
      additionalProperties: false,
    },
  },
};

export const RESTORE_AST_JSON_SCHEMA_NAME = "restore_ast_document_v1";
