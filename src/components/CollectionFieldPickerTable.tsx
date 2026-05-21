import { useEffect, useMemo, useState } from "react";
import type { CollectionFieldPickerOption } from "../lib/collectionFieldMapping";
import { canBindTargetPathToSourceKey } from "../lib/collectionFieldMappingTree";

function isPickerRowVisible(
  opt: CollectionFieldPickerOption,
  expandedGroups: ReadonlySet<string>
): boolean {
  if (opt.kind === "group" || opt.kind === "none") return true;
  if (opt.groupKey && !expandedGroups.has(opt.groupKey)) return false;
  return true;
}

function listGroupKeysFromOptions(options: CollectionFieldPickerOption[]): string[] {
  return options
    .filter((o) => o.kind === "group" && o.groupKey)
    .map((o) => o.groupKey as string);
}

/** 列表项字段 / 数据源字段选择表（与「绑定列表重复」字段映射表头一致） */
function isSourceOptionSelectable(
  opt: CollectionFieldPickerOption,
  activeTargetPath: string | undefined
): boolean {
  if (opt.kind === "group") return false;
  if (opt.kind === "none") return true;
  if (!activeTargetPath) return true;
  return canBindTargetPathToSourceKey(activeTargetPath, opt.key);
}

export function CollectionFieldPickerTable({
  options,
  mappedKey,
  onSelect,
  ariaLabel,
  name,
  activeTargetPath,
}: {
  options: CollectionFieldPickerOption[];
  mappedKey: string | undefined;
  onSelect: (key: string) => void;
  ariaLabel: string;
  name?: string;
  /** 左侧当前选中的目标路径；仅允许映射同层级的源字段 */
  activeTargetPath?: string;
}) {
  const groupKeys = useMemo(() => listGroupKeysFromOptions(options), [options]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(groupKeys));

  useEffect(() => {
    setExpandedGroups(new Set(groupKeys));
  }, [groupKeys.join("|")]);

  const visibleOptions = options.filter((opt) => isPickerRowVisible(opt, expandedGroups));

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  return (
    <div
      className="text-body-var-pill-modal__table-wrap repeat-region-bind-modal__table-viewport repeat-region-bind-modal__mapping-options-wrap"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <table className="text-body-var-pill-modal__table">
        <thead>
          <tr>
            <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--radio" scope="col">
              <span className="text-body-var-pill-modal__sr-only">选择</span>
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              名称
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              标识
            </th>
            <th className="text-body-var-pill-modal__th text-body-var-pill-modal__th--type" scope="col">
              类型
            </th>
            <th className="text-body-var-pill-modal__th" scope="col">
              首项示例
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleOptions.map((opt) => {
            if (opt.kind === "group" && opt.groupKey) {
              const isExpanded = expandedGroups.has(opt.groupKey);
              return (
                <tr
                  key={`group:${opt.groupKey}`}
                  className="text-body-var-pill-modal__row text-body-var-pill-modal__row--group"
                  style={{ ["--picker-depth" as string]: String(opt.depth ?? 0) }}
                >
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                    <button
                      type="button"
                      className="repeat-region-bind-modal__mapping-expand"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "折叠子字段" : "展开子字段"}
                      onClick={() => toggleGroup(opt.groupKey!)}
                    >
                      {isExpanded ? "▼" : "▶"}
                    </button>
                  </td>
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                    {opt.label}
                  </td>
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                    <code>{opt.groupKey}</code>
                  </td>
                  <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                    {opt.typeLabel}
                  </td>
                  <td
                    className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value"
                    title={opt.example}
                  >
                    {opt.example}
                  </td>
                </tr>
              );
            }

            const selected = (mappedKey ?? "") === opt.key;
            const isNone = opt.kind === "none" || !opt.key;
            const selectable = isSourceOptionSelectable(opt, activeTargetPath);
            return (
              <tr
                key={opt.key || "__none__"}
                className={`text-body-var-pill-modal__row${selected ? " text-body-var-pill-modal__row--selected" : ""}${
                  (opt.depth ?? 0) > 0 ? " text-body-var-pill-modal__row--nested" : ""
                }${selectable ? "" : " text-body-var-pill-modal__row--disabled"}`}
                style={{ ["--picker-depth" as string]: String(opt.depth ?? 0) }}
                onClick={() => {
                  if (selectable) onSelect(opt.key);
                }}
                onKeyDown={(e) => {
                  if (!selectable) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(opt.key);
                  }
                }}
                tabIndex={selectable ? 0 : -1}
                role="radio"
                aria-checked={selected}
                aria-disabled={selectable ? undefined : true}
              >
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--radio">
                  {isNone ? null : (opt.depth ?? 0) > 0 ? (
                    <span
                      className="repeat-region-bind-modal__mapping-expand-placeholder"
                      aria-hidden
                    />
                  ) : null}
                  <input
                    type="radio"
                    name={name}
                    className="text-body-var-pill-modal__radio"
                    checked={selected}
                    disabled={!selectable}
                    onChange={() => {
                      if (selectable) onSelect(opt.key);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={opt.label}
                  />
                </td>
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--label">
                  {isNone ? <span className="inspector__muted">不映射</span> : opt.label}
                </td>
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--id">
                  {opt.key ? <code>{opt.key}</code> : <span className="inspector__muted">—</span>}
                </td>
                <td className="text-body-var-pill-modal__td text-body-var-pill-modal__td--type">
                  {opt.typeLabel}
                </td>
                <td
                  className="text-body-var-pill-modal__td text-body-var-pill-modal__td--value"
                  title={opt.example}
                >
                  {opt.example}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
