import type { EmailBlock } from "../../../types/email";
import type {
  ManualRestoreBlueprint,
  ManualRestoreDeliverable,
  ManualRestoreSectionNode,
} from "./types";

function borderNone() {
  return { mode: "unified" as const, width: "0", style: "solid" as const, color: "rgba(0,0,0,0)" };
}

export function assembleDeliverable(
  blueprint: ManualRestoreBlueprint,
  sections: ManualRestoreSectionNode[]
): ManualRestoreDeliverable {
  const now = new Date().toISOString();
  const ordered = [...sections].sort(
    (a, b) =>
      blueprint.sections.findIndex((s) => s.sectionId === a.sectionId) -
      blueprint.sections.findIndex((s) => s.sectionId === b.sectionId)
  );

  const root: EmailBlock = {
    id: `${blueprint.idPrefix}-root`,
    type: "emailRoot",
    blockMeta: { blockType: "layout.container", name: "画布根" },
    props: {
      backgroundColor: blueprint.emailRootBackground,
      width: "600px",
      padding: { mode: "unified", unified: "0" },
      border: borderNone(),
      gapMode: "fixed",
      gap: "0",
    },
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
    children: ordered.map((s) => s.section),
  };

  const tokenPresets = {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: `${blueprint.displayName}（豆包手工还原）`,
        description: blueprint.description ?? "豆包模拟手工 mjs 流程生成",
        tokens: {
          colors: blueprint.colors,
          spacing: blueprint.spacing,
          typography: blueprint.typography,
          radius: { panel: "0", cta: "24px" },
        },
      },
    },
    scopeSelections: {},
  };

  const variantLabel = blueprint.displayName.replace(/（[^）]+）$/, "").trim() || blueprint.displayName;

  return {
    meta: {
      schemaVersion: "1.0.0",
      displayName: blueprint.displayName,
      description: blueprint.description ?? "豆包模拟手工还原流程；图源 Pexels，图标 jsDelivr。",
      source: "ai-manual-restore",
      createdAt: now,
      updatedAt: now,
      defaultStylePresetSelection: "local",
      publishStatus: "published",
    },
    layoutManifest: {
      schemaVersion: "1.0.0",
      activeLayoutVariantId: "default",
      variants: [
        {
          id: "default",
          label: variantLabel,
          description: `${variantLabel} — 豆包手工还原流程`,
          publishStatus: "published",
        },
      ],
    },
    payload: {
      schemaVersion: "1.0.0",
      slots: {},
      values: {},
    },
    tokenPresets,
    template: {
      schemaVersion: "4.0.0",
      emailId: blueprint.emailKey,
      templateId: blueprint.emailKey,
      templateVersion: 1,
      locale: "zh-CN",
      root,
    },
  };
}
