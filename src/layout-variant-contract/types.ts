/** 场景级版式清单（落盘：`data/emails/<emailKey>/layout-manifest.json`） */
export const LAYOUT_MANIFEST_SCHEMA_VERSION = "1.0.0" as const;

export type LayoutVariantEntry = {
  /** 版式 id：`[a-zA-Z0-9_-]+`，对应 `layouts/<id>/` */
  id: string;
  label: string;
  description?: string;
};

export type LayoutManifest = {
  schemaVersion: typeof LAYOUT_MANIFEST_SCHEMA_VERSION;
  activeLayoutVariantId: string;
  variants: LayoutVariantEntry[];
};
