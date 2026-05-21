import type { CSSProperties, ReactNode } from "react";
import type { EmailTemplate, RepeatFieldMapping, RepeatRegionBinding } from "../types/email";
import type { RepeatContextRelation } from "../lib/repeatRegion";
import {
  repeatColorIndexForHost,
  repeatTreeTagPalette,
  repeatTreeTagRoleLabel,
} from "../lib/repeatRegionTreeTags";
import { sanitizeListRepeatUserLabel } from "../lib/repeatNestedBindingUi";

function blockDisplayName(template: EmailTemplate, blockId: string): string {
  const raw = template.blockMeta?.[blockId]?.name?.trim() || blockId;
  return sanitizeListRepeatUserLabel(raw);
}

function RepeatAccentPill({
  palette,
  children,
  title,
}: {
  palette: ReturnType<typeof repeatTreeTagPalette>;
  children: ReactNode;
  title?: string;
}) {
  const style: CSSProperties = {
    borderColor: palette.border,
    backgroundColor: palette.background,
    color: palette.text,
  };
  return (
    <span className="inspector-repeat-card__pill" style={style} title={title}>
      {children}
    </span>
  );
}

export type RepeatRegionInspectorSummaryProps = {
  template: EmailTemplate;
  hostId: string;
  repeat: RepeatRegionBinding;
  itemCount: number;
  relation: RepeatContextRelation;
  prototypeRootId?: string;
  fieldMappingsOnBlock?: RepeatFieldMapping[];
  formatMappingLine?: (mapping: RepeatFieldMapping) => string;
};

export function RepeatRegionInspectorSummary({
  template,
  hostId,
  repeat,
  itemCount,
  relation,
  prototypeRootId,
  fieldMappingsOnBlock = [],
  formatMappingLine,
}: RepeatRegionInspectorSummaryProps) {
  const palette = repeatTreeTagPalette(repeatColorIndexForHost(template, hostId));
  const cardStyle = {
    "--inspector-repeat-accent-bg": palette.background,
    "--inspector-repeat-accent-text": palette.text,
  } as CSSProperties;

  const slotLabel = repeat.label?.trim() || repeat.slotId;
  const hostName = blockDisplayName(template, hostId);
  const fixedCount =
    repeat.minItems != null && repeat.minItems === repeat.maxItems ? repeat.minItems : null;

  const relationPill =
    relation === "host"
      ? "列表宿主"
      : relation === "row-template"
        ? "行模板内"
        : "字段映射";

  return (
    <div className="inspector-repeat-card" style={cardStyle}>
      <div className="inspector-repeat-card__header">
        <span className="inspector-repeat-card__status">已绑定</span>
        <RepeatAccentPill palette={palette}>{relationPill}</RepeatAccentPill>
        <RepeatAccentPill palette={palette} title="与左侧区块树同色标识">
          {repeatTreeTagRoleLabel("host")} · {slotLabel}
        </RepeatAccentPill>
      </div>

      <div className="inspector-repeat-card__grid" role="list">
        <div className="inspector-repeat-card__row">
          <dt>列表变量</dt>
          <dd>
            <span className="inspector-repeat-card__value">{slotLabel}</span>
            <code className="inspector-repeat-card__code">{repeat.slotId}</code>
            {repeat.itemPath?.trim() ? (
              <span className="inspector-repeat-card__hint-pill">
                子级路径 · {repeat.itemPath}
              </span>
            ) : null}
            {repeat.anchorItemIndex !== undefined ? (
              <span className="inspector-repeat-card__hint-pill">
                锚定父级第 {repeat.anchorItemIndex + 1} 项
              </span>
            ) : null}
          </dd>
        </div>

        <div className="inspector-repeat-card__row">
          <dt>当前数据</dt>
          <dd>
            <span className="inspector-repeat-card__metric">{itemCount} 项</span>
            {fixedCount != null ? (
              <span className="inspector-repeat-card__hint-pill">固定 {fixedCount} 项</span>
            ) : null}
            {repeat.minItems != null && repeat.maxItems != null && fixedCount == null ? (
              <span className="inspector-repeat-card__hint-pill">
                {repeat.minItems}–{repeat.maxItems} 项
              </span>
            ) : null}
          </dd>
        </div>

        <div className="inspector-repeat-card__row">
          <dt>重复宿主</dt>
          <dd>
            <span className="inspector-repeat-card__block-chip">{hostName}</span>
          </dd>
        </div>

        {repeat.prototypeChildIds.length > 0 ? (
          <div className="inspector-repeat-card__row">
            <dt>行模板</dt>
            <dd className="inspector-repeat-card__chip-list">
              {repeat.prototypeChildIds.map((childId) => (
                <span key={childId} className="inspector-repeat-card__block-chip">
                  {blockDisplayName(template, childId)}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </div>

      {relation === "host" ? (
        <p className="inspector-repeat-card__note">列表为空时不渲染子项，不占位高度。</p>
      ) : null}

      {relation === "row-template" && prototypeRootId ? (
        <div className="inspector-repeat-card__callout">
          <p>
            当前区块位于行模板「<strong>{blockDisplayName(template, prototypeRootId)}</strong>
            」内，继承宿主「{hostName}」的列表绑定。
          </p>
          <p className="inspector-repeat-card__callout-muted">
            可在「内容」页为字段绑定变量，或点击下方更换列表映射。
          </p>
        </div>
      ) : null}

      {relation === "mapped-field" && fieldMappingsOnBlock.length > 0 && formatMappingLine ? (
        <div className="inspector-repeat-card__callout">
          <p className="inspector-repeat-card__callout-title">本区块字段映射</p>
          <ul className="inspector-repeat-card__mapping-list">
            {fieldMappingsOnBlock.map((mapping) => (
              <li key={mapping.id}>
                <code className="inspector-repeat-card__mapping-line">
                  {formatMappingLine(mapping)}
                </code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
