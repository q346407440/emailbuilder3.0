/** 预览失效契约：变更类型 → 全量 rebuild 或子树 patch（P2）。 */

export type PreviewInvalidationKind =
  | "blockField"
  | "payloadScalar"
  | "payloadDraft"
  | "payloadCollection"
  | "tokenPresets"
  | "globalTheme"
  | "visibilitySim"
  | "structure"
  | "repeatBinding"
  | "externalSync"
  | "laneA";

export type PreviewInvalidationScope = "subtree" | "full";

export type PreviewInvalidation = {
  kind: PreviewInvalidationKind;
  scope: PreviewInvalidationScope;
  changedBlockId?: string;
};

export function computePreviewInvalidation(kind: PreviewInvalidationKind): PreviewInvalidation {
  switch (kind) {
    case "blockField":
    case "payloadScalar":
      return { kind, scope: "subtree" };
    case "payloadDraft":
    case "payloadCollection":
    case "tokenPresets":
    case "globalTheme":
    case "visibilitySim":
    case "structure":
    case "repeatBinding":
    case "externalSync":
    case "laneA":
      return { kind, scope: "full" };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
