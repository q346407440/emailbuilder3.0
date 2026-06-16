import type { PublishStatus } from "../publish-status-contract/types";

/** 场景级版式清单（落盘：`data/emails/<emailKey>/layout-manifest.json`） */
export const LAYOUT_MANIFEST_SCHEMA_VERSION = "1.0.0" as const;

export type LayoutVariantEntry = {
  /** 版式 id：`[a-zA-Z0-9_-]+`，对应 `layouts/<id>/` */
  id: string;
  label: string;
  /** 版式层发布状态：活动 V2 仅可选用 published */
  publishStatus: PublishStatus;
  description?: string;
  /** 创建时间（ISO）；用于同更新时间下的稳定排序 */
  createdAt?: string;
  /** 最近编辑时间（ISO）；用于模板页 / 顶栏版式列表按编辑倒序展示 */
  updatedAt?: string;
  /** 逻辑删除时间（ISO）；删除该字段即可恢复在编辑器中的展示 */
  deletedAt?: string;
};

export type LayoutManifest = {
  schemaVersion: typeof LAYOUT_MANIFEST_SCHEMA_VERSION;
  activeLayoutVariantId: string;
  variants: LayoutVariantEntry[];
};
