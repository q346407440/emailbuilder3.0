import { Fragment, useEffect, useMemo, useState } from "react";
import {
  formatBuiltinSkuSelectionKey,
  normalizeBuiltinProductListConfig,
  type BuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import {
  collectionProductCount,
  filterCollectionsBySearch,
  filterProductsBySearch,
  productPickerTabFromConfig,
  spuInventoryTotal,
  spuPriceRange,
  type BuiltinProductPickerTab,
} from "../lib/builtinPickerCatalog";
import { resolveBuiltinProductCandidatePool } from "../lib/builtinProductListResolve";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "../lib/builtinProductsMockData";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";

const MAX_SPU_SKU = 500;

export type BuiltinProductPickerModalProps = {
  visible: boolean;
  config: BuiltinProductListConfig;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (config: BuiltinProductListConfig) => void;
};

export function BuiltinProductPickerModal({
  visible,
  config,
  disabled = false,
  onClose,
  onConfirm,
}: BuiltinProductPickerModalProps) {
  const normalized = normalizeBuiltinProductListConfig(config);
  const [tab, setTab] = useState<BuiltinProductPickerTab>(() => productPickerTabFromConfig(normalized));
  const [search, setSearch] = useState("");
  const [selectedSpuIds, setSelectedSpuIds] = useState<string[]>(normalized.selectedSpuIds ?? []);
  const [skuSelection, setSkuSelection] = useState<string[]>(normalized.skuSelection ?? []);
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    normalized.selectedCollectionIds?.[0] ?? ""
  );
  const [expandedSpu, setExpandedSpu] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!visible) return;
    const c = normalizeBuiltinProductListConfig(config);
    setTab(productPickerTabFromConfig(c));
    setSearch("");
    setSelectedSpuIds(c.selectedSpuIds ?? []);
    setSkuSelection(c.skuSelection ?? []);
    setSelectedCollectionId(c.selectedCollectionIds?.[0] ?? "");
    setExpandedSpu(new Set());
  }, [visible, config]);

  const catalogProducts = useMemo(() => {
    if (
      normalized.rangeMode === "byCollection" &&
      (normalized.selectedCollectionIds?.length ?? 0) > 0 &&
      (tab === "spu" || tab === "sku")
    ) {
      const pool = resolveBuiltinProductCandidatePool(normalized);
      return pool.length > 0 ? pool : BUILTIN_PRODUCTS_MOCK_RAW;
    }
    return BUILTIN_PRODUCTS_MOCK_RAW;
  }, [normalized, tab]);

  const products = useMemo(
    () => filterProductsBySearch(catalogProducts, search),
    [catalogProducts, search]
  );
  const collections = useMemo(() => filterCollectionsBySearch(search), [search]);

  const toggleSpu = (spuId: string, checked: boolean) => {
    const set = new Set(selectedSpuIds);
    if (checked) {
      if (set.size >= MAX_SPU_SKU) return;
      set.add(spuId);
    } else set.delete(spuId);
    setSelectedSpuIds([...set]);
  };

  const toggleSku = (spuId: string, skuId: string, checked: boolean) => {
    const key = formatBuiltinSkuSelectionKey(spuId, skuId);
    const set = new Set(skuSelection);
    if (checked) {
      if (set.size >= MAX_SPU_SKU) return;
      set.add(key);
    } else set.delete(key);
    setSkuSelection([...set]);
  };

  const spuFullySelected = (spuId: string, skuIds: string[]) =>
    skuIds.length > 0 && skuIds.every((id) => skuSelection.includes(formatBuiltinSkuSelectionKey(spuId, id)));

  const toggleSpuAllSkus = (spuId: string, skuIds: string[], checked: boolean) => {
    if (checked) {
      const set = new Set(skuSelection);
      for (const skuId of skuIds) {
        if (set.size >= MAX_SPU_SKU) break;
        set.add(formatBuiltinSkuSelectionKey(spuId, skuId));
      }
      setSkuSelection([...set]);
    } else {
      setSkuSelection(
        skuSelection.filter((k) => !k.startsWith(`${spuId}::`))
      );
    }
  };

  const selectionCount =
    tab === "spu"
      ? selectedSpuIds.length
      : tab === "sku"
        ? skuSelection.length
        : tab === "collection"
          ? selectedCollectionId ? 1
          : 0
          : 0;

  const countLabel =
    tab === "allProducts"
      ? "全部商品（店铺在售 mock 全量）"
      : tab === "collection"
        ? selectedCollectionId
          ? "已选中 1 个专辑"
          : "已选中 0 个专辑"
        : `已选中 ${selectionCount} 个商品 (${selectionCount}/${MAX_SPU_SKU})`;

  const handleConfirm = () => {
    if (tab === "allProducts") {
      onConfirm(
        normalizeBuiltinProductListConfig({
          ...normalized,
          rangeMode: "allProducts",
          selectedSpuIds: [],
          skuSelection: [],
          selectedCollectionIds: [],
        })
      );
      return;
    }
    if (tab === "collection") {
      onConfirm(
        normalizeBuiltinProductListConfig({
          ...normalized,
          rangeMode: "byCollection",
          selectedCollectionIds: selectedCollectionId ? [selectedCollectionId] : [],
          selectedSpuIds: [],
          skuSelection: [],
        })
      );
      return;
    }
    if (tab === "sku") {
      const keepCollection =
        normalized.rangeMode === "byCollection" &&
        (normalized.selectedCollectionIds?.length ?? 0) > 0;
      onConfirm(
        normalizeBuiltinProductListConfig({
          ...normalized,
          rowGranularity: "sku",
          rangeMode: keepCollection ? "byCollection" : "freeSelect",
          skuSelection,
          selectedSpuIds: [],
          selectedCollectionIds: keepCollection ? normalized.selectedCollectionIds : [],
        })
      );
      return;
    }
    const keepCollection =
      normalized.rangeMode === "byCollection" &&
      (normalized.selectedCollectionIds?.length ?? 0) > 0;
    onConfirm(
      normalizeBuiltinProductListConfig({
        ...normalized,
        rowGranularity: "spu",
        rangeMode: keepCollection ? "byCollection" : "freeSelect",
        selectedSpuIds,
        skuSelection: [],
        selectedCollectionIds: keepCollection ? normalized.selectedCollectionIds : [],
      })
    );
  };

  const confirmDisabled =
    disabled ||
    (tab === "collection" && !selectedCollectionId) ||
    (tab === "spu" && selectedSpuIds.length === 0) ||
    (tab === "sku" && skuSelection.length === 0);

  return (
    <ShopSectionModal
      visible={visible}
      title="选择商品"
      width={920}
      onCancel={onClose}
      footer={
        <>
          <ShopSecondaryButton htmlType="button" onClick={onClose}>
            取消
          </ShopSecondaryButton>
          <ShopPrimaryButton htmlType="button" disabled={tab === "allProducts" ? disabled : confirmDisabled} onClick={handleConfirm}>
            确认
          </ShopPrimaryButton>
        </>
      }
    >
      <div className="builtin-picker-modal">
        <div className="builtin-picker-modal__tabs" role="tablist" aria-label="选择方式">
          {(
            [
              ["spu", "SPU"],
              ["sku", "SKU"],
              ["collection", "专辑"],
              ["allProducts", "全部商品"],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="builtin-picker-modal__tab">
              <input
                type="radio"
                name="builtin-product-pick-tab"
                checked={tab === id}
                disabled={disabled}
                onChange={() => setTab(id)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {tab === "allProducts" ? (
          <p className="builtin-picker-modal__all-hint">
            确认后候选池为店铺全部在售商品（mock 共 {BUILTIN_PRODUCTS_MOCK_RAW.length}{" "}
            件 SPU）。列表行粒度仍由场景面板中的「按 SPU / 按 SKU」决定；按 SKU 时请在确认后再于场景中勾选规格。
          </p>
        ) : (
          <>
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
              {tab === "spu" ? (
                <table className="builtin-picker-table">
                  <thead>
                    <tr>
                      <th className="builtin-picker-table__check" />
                      <th>商品信息</th>
                      <th className="builtin-picker-table__num">售价(CAD)</th>
                      <th className="builtin-picker-table__num">库存</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr
                        key={p.id}
                        className={
                          selectedSpuIds.includes(p.id) ? "builtin-picker-table__row--selected" : ""
                        }
                      >
                        <td className="builtin-picker-table__check">
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={selectedSpuIds.includes(p.id)}
                            onChange={(e) => toggleSpu(p.id, e.target.checked)}
                          />
                        </td>
                        <td>
                          <div className="builtin-picker-table__product">
                            <img src={p.skus[0]?.imageSrc} alt="" width={40} height={40} />
                            <span>{p.title}</span>
                          </div>
                        </td>
                        <td className="builtin-picker-table__num">{spuPriceRange(p)}</td>
                        <td className="builtin-picker-table__num">{spuInventoryTotal(p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {tab === "sku" ? (
                <table className="builtin-picker-table">
                  <thead>
                    <tr>
                      <th className="builtin-picker-table__check" />
                      <th>商品信息</th>
                      <th className="builtin-picker-table__num">售价(CAD)</th>
                      <th className="builtin-picker-table__num">库存</th>
                      <th className="builtin-picker-table__expand" />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const skuIds = p.skus.map((s) => s.id);
                      const open = expandedSpu.has(p.id);
                      const parentChecked = spuFullySelected(p.id, skuIds);
                      const partial =
                        !parentChecked &&
                        p.skus.some((s) =>
                          skuSelection.includes(formatBuiltinSkuSelectionKey(p.id, s.id))
                        );
                      return (
                        <Fragment key={p.id}>
                          <tr className="builtin-picker-table__spu-row">
                            <td className="builtin-picker-table__check">
                              <input
                                type="checkbox"
                                disabled={disabled}
                                checked={parentChecked}
                                ref={(el) => {
                                  if (el) el.indeterminate = partial;
                                }}
                                onChange={(e) => toggleSpuAllSkus(p.id, skuIds, e.target.checked)}
                              />
                            </td>
                            <td>
                              <div className="builtin-picker-table__product">
                                <img src={p.skus[0]?.imageSrc} alt="" width={40} height={40} />
                                <span>{p.title}</span>
                              </div>
                            </td>
                            <td className="builtin-picker-table__num">{spuPriceRange(p)}</td>
                            <td className="builtin-picker-table__num">{spuInventoryTotal(p)}</td>
                            <td className="builtin-picker-table__expand">
                              <button
                                type="button"
                                className="builtin-picker-table__expand-btn"
                                aria-expanded={open}
                                onClick={() => {
                                  const next = new Set(expandedSpu);
                                  if (open) next.delete(p.id);
                                  else next.add(p.id);
                                  setExpandedSpu(next);
                                }}
                              >
                                {open ? "▾" : "▸"}
                              </button>
                            </td>
                          </tr>
                          {open
                            ? p.skus.map((s) => {
                                const key = formatBuiltinSkuSelectionKey(p.id, s.id);
                                return (
                                  <tr key={key} className="builtin-picker-table__sku-row">
                                    <td className="builtin-picker-table__check">
                                      <input
                                        type="checkbox"
                                        disabled={disabled}
                                        checked={skuSelection.includes(key)}
                                        onChange={(e) =>
                                          toggleSku(p.id, s.id, e.target.checked)
                                        }
                                      />
                                    </td>
                                    <td>
                                      <div className="builtin-picker-table__product builtin-picker-table__product--indent">
                                        <img src={s.imageSrc} alt="" width={36} height={36} />
                                        <span>{s.title}</span>
                                      </div>
                                    </td>
                                    <td className="builtin-picker-table__num">{s.salePrice}</td>
                                    <td className="builtin-picker-table__num">{s.inventoryQuantity}</td>
                                    <td />
                                  </tr>
                                );
                              })
                            : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}

              {tab === "collection" ? (
                <table className="builtin-picker-table">
                  <thead>
                    <tr>
                      <th className="builtin-picker-table__check" />
                      <th>专辑信息</th>
                      <th className="builtin-picker-table__num">商品数量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((c) => (
                      <tr
                        key={c.id}
                        className={
                          selectedCollectionId === c.id
                            ? "builtin-picker-table__row--selected"
                            : ""
                        }
                      >
                        <td className="builtin-picker-table__check">
                          <input
                            type="radio"
                            name="builtin-product-collection-pick"
                            disabled={disabled}
                            checked={selectedCollectionId === c.id}
                            onChange={() => setSelectedCollectionId(c.id)}
                          />
                        </td>
                        <td>{c.title}</td>
                        <td className="builtin-picker-table__num">{collectionProductCount(c.id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </>
        )}

        <p className="inspector__muted builtin-picker-modal__footer-hint">{countLabel}</p>
      </div>
    </ShopSectionModal>
  );
}
