import type { LayoutManifest } from "../layout-variant-contract/types";
import type { EmailPayload, EmailTemplate } from "../types/email";
import { EMAIL_TEMPLATE_SCHEMA_VERSION } from "../types/email";
import type { TokenPresets } from "../types/tokenPreset";
import { PAYLOAD_SCHEMA_VERSION } from "../payload-contract/types";
import { META_SCHEMA_VERSION, type EmailMeta } from "../meta-contract";
import { assertEmailKeySafe } from "./validate";

export type NewEmailScaffold = {
  layoutManifest: LayoutManifest;
  template: EmailTemplate;
  tokenPresets: TokenPresets;
  payload: EmailPayload;
  meta: EmailMeta;
};

/** 由展示名称推导唯一 emailKey（纯中文等无法 slug 时用 template-<base36>）。 */
export function deriveEmailKeyFromDisplayName(
  displayName: string,
  existingKeys: Iterable<string>
): string {
  const taken = new Set(existingKeys);
  const slug = displayName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  let base = slug;
  if (!base || assertEmailKeySafe(base)) {
    base = `template-${Date.now().toString(36)}`;
  }
  if (!/^[a-zA-Z0-9]/.test(base)) {
    base = `t-${base}`;
  }

  if (!taken.has(base)) return base;
  for (let i = 2; i < 10_000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate) && !assertEmailKeySafe(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function layoutVariantBlockIdPrefix(emailKey: string, layoutVariantId: string): string {
  return layoutVariantId === "default" ? emailKey : `${emailKey}-${layoutVariantId}`;
}

function buildDefaultTokenPresets(): TokenPresets {
  return {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: "默认",
        description: "新建模板默认样式档位",
        tokens: {
          colors: {
            primary: "#111111",
            secondary: "#666666",
            surface: "#FFFFFF",
          },
          spacing: {
            section: "16px",
            gap: "8px",
            pageInline: "16px",
          },
          typography: {
            display: "24px",
            h1: "20px",
            body: "14px",
            caption: "12px",
          },
          radius: {
            panel: "0",
            cta: "0",
          },
        },
      },
    },
    scopeSelections: {},
  };
}

/** 空白版式的 template 与 tokenPresets（与新建邮件 default 版式同源，block id 按版式区分）。 */
export function buildBlankLayoutVariantAssets(
  emailKey: string,
  layoutVariantId: string
): { template: EmailTemplate; tokenPresets: TokenPresets } {
  const idPrefix = layoutVariantBlockIdPrefix(emailKey, layoutVariantId);
  const rootId = `${idPrefix}-root`;
  const rowId = `${idPrefix}-row`;
  const textId = `${idPrefix}-text`;
  const templateId =
    layoutVariantId === "default" ? emailKey : `${emailKey}-${layoutVariantId}`;

  const template: EmailTemplate = {
    schemaVersion: EMAIL_TEMPLATE_SCHEMA_VERSION,
    emailId: emailKey,
    templateId,
    templateVersion: 1,
    locale: "zh-CN",
    rootBlockId: rootId,
    blockMeta: {
      [rootId]: { blockType: "layout.container", name: "画布根" },
      [rowId]: { blockType: "layout.container", name: "内容区" },
      [textId]: { blockType: "content.text", name: "正文" },
    },
    blocks: {
      [rootId]: {
        id: rootId,
        type: "emailRoot",
        parentId: null,
        children: [rowId],
        wrapperStyle: {
          widthMode: "fill",
          heightMode: "hug",
        },
        props: {
          backgroundColor: "#ffffff",
          width: "600px",
          padding: { mode: "unified", unified: "0" },
          border: {
            mode: "unified",
            width: "0",
            style: "solid",
            color: "rgba(0,0,0,0)",
          },
          gapMode: "fixed",
          gap: "0",
        },
        bindings: {},
      },
      [rowId]: {
        id: rowId,
        type: "layout",
        parentId: rootId,
        children: [textId],
        wrapperStyle: {
          contentAlign: { horizontal: "left", vertical: "top" },
          widthMode: "fill",
          heightMode: "hug",
          border: {
            mode: "unified",
            width: "0",
            style: "solid",
            color: "rgba(0,0,0,0)",
          },
          borderRadius: { mode: "unified", radius: "0" },
          backgroundColor: "#ffffff",
          padding: { mode: "unified", unified: "16px" },
        },
        props: {
          direction: "vertical",
          gapMode: "fixed",
          gap: "8px",
        },
        bindings: {},
      },
      [textId]: {
        id: textId,
        type: "text",
        parentId: rowId,
        children: [],
        wrapperStyle: {
          contentAlign: { horizontal: "left", vertical: "top" },
          widthMode: "hug",
          heightMode: "hug",
          border: {
            mode: "unified",
            width: "0",
            style: "solid",
            color: "rgba(0,0,0,0)",
          },
          borderRadius: { mode: "unified", radius: "0" },
        },
        props: {
          textBody: {
            paragraphs: [
              {
                runs: [{ text: "在此开始编辑邮件内容" }],
              },
            ],
          },
          fontSize: "14px",
          color: "#111111",
          bold: false,
          italic: false,
          decoration: "none",
        },
        bindings: {},
      },
    },
  };

  return { template, tokenPresets: buildDefaultTokenPresets() };
}

export function buildNewEmailScaffold(emailKey: string, displayName: string): NewEmailScaffold {
  const now = new Date().toISOString();
  const { template, tokenPresets } = buildBlankLayoutVariantAssets(emailKey, "default");

  const layoutManifest: LayoutManifest = {
    schemaVersion: "1.0.0",
    activeLayoutVariantId: "default",
    variants: [
      {
        id: "default",
        label: "默认",
        description: "新建模板的默认版式",
        createdAt: now,
      },
    ],
  };

  const payload: EmailPayload = {
    schemaVersion: PAYLOAD_SCHEMA_VERSION,
    slots: {},
    values: {},
  };

  const meta: EmailMeta = {
    schemaVersion: META_SCHEMA_VERSION,
    displayName: displayName.trim(),
    description: "",
    source: "human",
    createdAt: now,
    updatedAt: now,
    defaultStylePresetSelection: "local",
  };

  return { layoutManifest, template, tokenPresets, payload, meta };
}
