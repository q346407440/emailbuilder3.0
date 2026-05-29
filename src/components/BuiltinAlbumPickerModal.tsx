import { useEffect, useMemo, useState } from "react";
import { BUILTIN_ALBUMS_MOCK } from "../lib/builtinCollectionCatalog";
import { collectionProductCount, filterAlbumRowsBySearch } from "../lib/builtinPickerCatalog";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

export type BuiltinAlbumPickerModalProps = {
  visible: boolean;
  title?: string;
  /** 商品范围选专辑：单选；内置专辑列表变量：多选 */
  selectionMode: "single" | "multiple";
  selectedIds: string[];
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
};

export function BuiltinAlbumPickerModal({
  visible,
  title = "选择专辑",
  selectionMode,
  selectedIds,
  disabled = false,
  onClose,
  onConfirm,
}: BuiltinAlbumPickerModalProps) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (!visible) return;
    setSearch("");
    setDraft(selectedIds);
  }, [visible, selectedIds]);

  const rows = useMemo(
    () => filterAlbumRowsBySearch(BUILTIN_ALBUMS_MOCK, search),
    [search]
  );

  const allVisibleIds = rows.map((r) => String(r.id ?? ""));
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => draft.includes(id));

  const toggle = (id: string, checked: boolean) => {
    if (selectionMode === "single") {
      setDraft(checked ? [id] : []);
      return;
    }
    const set = new Set(draft);
    if (checked) set.add(id);
    else set.delete(id);
    setDraft([...set]);
  };

  const toggleAll = (checked: boolean) => {
    if (selectionMode === "single") return;
    if (!checked) {
      setDraft(draft.filter((id) => !allVisibleIds.includes(id)));
      return;
    }
    setDraft([...new Set([...draft, ...allVisibleIds])]);
  };

  const countLabel =
    selectionMode === "single"
      ? draft.length > 0
        ? "已选中 1 个专辑"
        : "已选中 0 个专辑"
      : `已选中 ${draft.length} 个专辑`;

  return (
    <ShopSectionModal
      visible={visible}
      title={title}
      width={720}
      onCancel={onClose}
      footer={
        <>
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton
            htmlType="button"
            disabled={disabled || (selectionMode === "single" && draft.length === 0)}
            onClick={() => onConfirm(draft)}
          >
            确认
          </ShopPrimaryButton>
        </>
      }
    >
      <div className="builtin-picker-modal">
        <div className="builtin-picker-modal__toolbar">
          <ShopInput
            className="builtin-picker-modal__search"
            placeholder="输入搜索文本"
            value={search}
            disabled={disabled}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ShopSecondaryButton htmlType="button" disabled={disabled} onClick={() => setSearch("")}>
            重置
          </ShopSecondaryButton>
        </div>
        <div className="builtin-picker-modal__table-wrap">
          <table className="builtin-picker-table">
            <thead>
              <tr>
                <th className="builtin-picker-table__check">
                  {selectionMode === "multiple" ? (
                    <input
                      type="checkbox"
                      disabled={disabled || rows.length === 0}
                      checked={allSelected}
                      aria-label="全选当前列表"
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  ) : null}
                </th>
                <th>专辑信息</th>
                <th className="builtin-picker-table__num">商品数量</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = String(row.id ?? "");
                const checked = draft.includes(id);
                const inputType = selectionMode === "single" ? "radio" : "checkbox";
                return (
                  <tr key={id} className={checked ? "builtin-picker-table__row--selected" : ""}>
                    <td className="builtin-picker-table__check">
                      <input
                        type={inputType}
                        name={selectionMode === "single" ? "builtin-album-pick" : undefined}
                        disabled={disabled}
                        checked={checked}
                        onChange={(e) => toggle(id, e.target.checked)}
                      />
                    </td>
                    <td>{String(row.title ?? id)}</td>
                    <td className="builtin-picker-table__num">{collectionProductCount(id)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="inspector__muted builtin-picker-modal__footer-hint">{countLabel}</p>
      </div>
    </ShopSectionModal>
  );
}
