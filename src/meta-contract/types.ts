/**
 * meta.json 契约真源：仅声明编辑器与 API 维护的字段。
 * 历史字段见 removed-fields.ts，经 normalizePersistedEmailMeta 剥离。
 */

export type EmailMetaDelivery = {
  subject?: string;
  preheader?: string;
};

export type EmailMeta = {
  displayName: string;
  /**
   * 打开本模板「样式预设」工作台时默认选中的侧栏项。
   * `local`：本邮件目录下 tokenPresets.json；否则为公共预设 id（与 data/token-presets/<id>.json 一致）。
   */
  defaultStylePresetSelection?: "local" | string;
  description?: string;
  source?: "agent" | "human" | string;
  createdAt?: string;
  updatedAt?: string;
  /** 逻辑删除时间（ISO）；删除该字段即可恢复在编辑器中的展示 */
  deletedAt?: string;
  delivery?: EmailMetaDelivery;
};
