import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  formatBuiltinSkuSelectionKey,
  normalizeBuiltinProductListConfig,
  type BuiltinProductListConfig,
} from "../payload-contract/collection-builtin-catalog-config";
import {
  collectionProductCount,
  filterCollectionsBySearch,
  filterProductsBySearch,
  builtinProductPickerTabsForConfig,
  productPickerTabFromConfig,
  spuInventoryTotal,
  spuPriceRange,
  type BuiltinProductPickerTab,
} from "../lib/builtinPickerCatalog";
import { resolveBuiltinProductCandidatePool } from "../lib/builtinProductListResolve";
import type { BuiltinProductMock } from "../lib/builtinProductMockTypes";
import { BUILTIN_PRODUCTS_MOCK_RAW } from "../lib/builtinProductsMockData";
import { ShopInput, ShopPrimaryButton, ShopSecondaryButton } from "./ui/ShopFormControls";
import { ShopSectionModal } from "./ui/ShopSectionModal";
import { SelectablePickerCheckboxCell } from "./ui/SelectablePickerCheckboxCell";
import { PickerTable, SelectablePickerTable } from "./ui/SelectablePickerTable";

const MAX_SELECTION = 500;

type SpuPickerRow = {
  rowKey: string;
  title: string;
  imageSrc: string;
  salePrice: string;
  inventory: number;
};

type SkuFlatPickerRow = {
  rowKey: string;
  kind: "spu" | "sku";
  spuId: string;
  skuId?: string;
  skuIds: string[];
  title: string;
  imageSrc: string;
  salePrice: string;
  inventory: number;
};

type CollectionPickerRow = {
  rowKey: string;
  title: string;
  productCount: number;
};

export type BuiltinProductPickerModalProps = {
  visible: boolean;
  config: BuiltinProductListConfig;
  disabled?: boolean;
  onClose: () => void;
  onConfirm: (config: BuiltinProductListConfig) => void;
};

function uniqueSpuIdsFromSkuKeys(keys: string[]): string[] {
  const spuIds = new Set<string>();
  for (const key of keys) {
    const idx = key.indexOf("::");
    if (idx > 0) spuIds.add(key.slice(0, idx));
  }
  return [...spuIds];
}

function toSpuPickerRows(products: BuiltinProductMock[]): SpuPickerRow[] {
  return products.map((p) => ({
    rowKey: p.id,
    title: p.title,
    imageSrc: p.skus[0]?.imageSrc ?? "",
    salePrice: spuPriceRange(p),
    inventory: spuInventoryTotal(p),
  }));
}

function toSkuFlatPickerRows(
  products: BuiltinProductMock[],
  expandedSpuIds: ReadonlySet<string>
): SkuFlatPickerRow[] {
  const rows: SkuFlatPickerRow[] = [];
  for (const p of products) {
    const skuIds = p.skus.map((s) => s.id);
    rows.push({
      rowKey: `spu:${p.id}`,
      kind: "spu",
      spuId: p.id,
      skuIds,
      title: p.title,
      imageSrc: p.skus[0]?.imageSrc ?? "",
      salePrice: spuPriceRange(p),
      inventory: spuInventoryTotal(p),
    });
    if (!expandedSpuIds.has(p.id)) continue;
    for (const s of p.skus) {
      rows.push({
        rowKey: formatBuiltinSkuSelectionKey(p.id, s.id),
        kind: "sku",
        spuId: p.id,
        skuId: s.id,
        skuIds: [],
        title: s.title,
        imageSrc: s.imageSrc,
        salePrice: s.salePrice,
        inventory: s.inventoryQuantity ?? 0,
      });
    }
  }
  return rows;
}

function selectionFooterLabel(
  tab: BuiltinProductPickerTab,
  selectedSpuCount: number,
  selectedSkuCount: number,
  hasCollection: boolean
): string {
  if (tab === "allProducts") {
    return "将使用店铺全部在售商品作为候选池";
  }
  if (tab === "collection") {
    return hasCollection ? "已选择 1 个商品专辑" : "请选择 1 个商品专辑";
  }
  if (tab === "sku") {
    if (selectedSkuCount === 0) return "请至少选择 1 个规格";
    if (selectedSkuCount >= MAX_SELECTION) {
      return `已选择 ${selectedSkuCount} 个规格（已达上限 ${MAX_SELECTION}）`;
    }
    return `已选择 ${selectedSkuCount} 个规格`;
  }
  if (selectedSpuCount === 0) return "请至少选择 1 件商品";
  if (selectedSpuCount >= MAX_SELECTION) {
    return `已选择 ${selectedSpuCount} 件商品（已达上限 ${MAX_SELECTION}）`;
  }
  return `已选择 ${selectedSpuCount} 件商品`;
}

function ProductInfoCell({
  imageSrc,
  title,
  indent,
  leading,
}: {
  imageSrc: string;
  title: string;
  indent?: boolean;
  leading?: ReactNode;
}) {
  return (
    <div
      className={[
        "selectable-picker-table__tree-cell",
        indent ? "selectable-picker-table__tree-cell--child" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {leading ?? <span className="selectable-picker-table__expand-placeholder" aria-hidden />}
      <div
        className={[
          "selectable-picker-table__product",
          indent ? "selectable-picker-table__product--indent" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {imageSrc ? (
          <img src={imageSrc} alt="" width={indent ? 36 : 40} height={indent ? 36 : 40} />
        ) : null}
        <span>{title}</span>
      </div>
    </div>
  );
}

export function BuiltinProductPickerModal({
  visible,
  config,
  disabled = false,
  onClose,
  onConfirm,
}: BuiltinProductPickerModalProps) {
  const normalized = normalizeBuiltinProductListConfig(config);
  const tabOptions = useMemo(() => builtinProductPickerTabsForConfig(normalized), [normalized]);
  const [tab, setTab] = useState<BuiltinProductPickerTab>(() => productPickerTabFromConfig(normalized));
  const [search, setSearch] = useState("");
  const [selectedSpuIds, setSelectedSpuIds] = useState<string[]>(normalized.selectedSpuIds ?? []);
  const [skuSelection, setSkuSelection] = useState<string[]>(normalized.skuSelection ?? []);
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    normalized.selectedCollectionIds?.[0] ?? ""
  );
  const [expandedSpuIds, setExpandedSpuIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!visible) return;
    const c = normalizeBuiltinProductListConfig(config);
    const nextTab = productPickerTabFromConfig(c);
    const allowed = new Set(builtinProductPickerTabsForConfig(c).map((t) => t.id));
    setTab(allowed.has(nextTab) ? nextTab : "spu");
    setSearch("");
    setSelectedSpuIds(c.selectedSpuIds ?? []);
    setSkuSelection(c.skuSelection ?? []);
    setSelectedCollectionId(c.selectedCollectionIds?.[0] ?? "");
    setExpandedSpuIds(new Set());
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

  useEffect(() => {
    if (tab !== "sku") return;
    setExpandedSpuIds(new Set(products.map((p) => p.id)));
  }, [tab]);

  useEffect(() => {
    if (tab !== "sku") return;
    setExpandedSpuIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const p of products) {
        if (!next.has(p.id)) {
          next.add(p.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [products, tab]);

  const collections = useMemo(() => filterCollectionsBySearch(search), [search]);

  const spuRows = useMemo(() => toSpuPickerRows(products), [products]);
  const skuFlatRows = useMemo(
    () => toSkuFlatPickerRows(products, expandedSpuIds),
    [products, expandedSpuIds]
  );
  const collectionRows = useMemo(
    (): CollectionPickerRow[] =>
      collections.map((c) => ({
        rowKey: c.id,
        title: c.title,
        productCount: collectionProductCount(c.id),
      })),
    [collections]
  );

  const selectedSpuSet = useMemo(() => new Set(selectedSpuIds), [selectedSpuIds]);
  const skuSelectionSet = useMemo(() => new Set(skuSelection), [skuSelection]);

  const toggleSpu = (spuId: string, checked: boolean) => {
    const set = new Set(selectedSpuIds);
    if (checked) {
      if (set.size >= MAX_SELECTION) return;
      set.add(spuId);
    } else set.delete(spuId);
    setSelectedSpuIds([...set]);
  };

  const toggleSku = (spuId: string, skuId: string, checked: boolean) => {
    const key = formatBuiltinSkuSelectionKey(spuId, skuId);
    const set = new Set(skuSelection);
    if (checked) {
      if (set.size >= MAX_SELECTION) return;
      set.add(key);
    } else set.delete(key);
    setSkuSelection([...set]);
  };

  const spuFullySelected = (spuId: string, skuIds: string[]) =>
    skuIds.length > 0 &&
    skuIds.every((id) => skuSelection.includes(formatBuiltinSkuSelectionKey(spuId, id)));

  const spuPartiallySelected = (spuId: string, skuIds: string[]) =>
    !spuFullySelected(spuId, skuIds) &&
    skuIds.some((id) => skuSelection.includes(formatBuiltinSkuSelectionKey(spuId, id)));

  const toggleSpuAllSkus = (spuId: string, skuIds: string[], checked: boolean) => {
    if (checked) {
      const set = new Set(skuSelection);
      for (const skuId of skuIds) {
        if (set.size >= MAX_SELECTION) break;
        set.add(formatBuiltinSkuSelectionKey(spuId, skuId));
      }
      setSkuSelection([...set]);
    } else {
      setSkuSelection(skuSelection.filter((k) => !k.startsWith(`${spuId}::`)));
    }
  };

  const toggleExpandedSpu = (spuId: string) => {
    setExpandedSpuIds((prev) => {
      const next = new Set(prev);
      if (next.has(spuId)) next.delete(spuId);
      else next.add(spuId);
      return next;
    });
  };

  const visibleSpuIds = products.map((p) => p.id);
  const allVisibleSelected =
    visibleSpuIds.length > 0 && visibleSpuIds.every((id) => selectedSpuSet.has(id));
  const someVisibleSelected =
    !allVisibleSelected && visibleSpuIds.some((id) => selectedSpuSet.has(id));

  const toggleAllVisibleSpu = (checked: boolean) => {
    const set = new Set(selectedSpuIds);
    if (checked) {
      for (const id of visibleSpuIds) {
        if (set.size >= MAX_SELECTION) break;
        set.add(id);
      }
    } else {
      for (const id of visibleSpuIds) {
        set.delete(id);
      }
    }
    setSelectedSpuIds([...set]);
  };

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
      onConfirm(
        normalizeBuiltinProductListConfig({
          ...normalized,
          rangeMode: "freeSelect",
          skuSelection,
          selectedSpuIds: uniqueSpuIdsFromSkuKeys(skuSelection),
          selectedCollectionIds: [],
        })
      );
      return;
    }
    onConfirm(
      normalizeBuiltinProductListConfig({
        ...normalized,
        rangeMode: "freeSelect",
        selectedSpuIds,
        skuSelection: [],
        selectedCollectionIds: [],
      })
    );
  };

  const confirmDisabled =
    disabled ||
    (tab === "collection" && !selectedCollectionId) ||
    (tab === "spu" && selectedSpuIds.length === 0) ||
    (tab === "sku" && skuSelection.length === 0);

  const footerSelection = selectionFooterLabel(
    tab,
    selectedSpuIds.length,
    skuSelection.length,
    Boolean(selectedCollectionId)
  );

  const emptySearchHint =
    search.trim() ? "未找到匹配结果，请调整搜索条件" : tab === "collection" ? "暂无可选专辑" : "暂无可选商品";

  return (
    <ShopSectionModal
      visible={visible}
      title="选择商品"
      centered
      destroyOnClose
      maskClosable={false}
      keyboard
      wrapClassName="shop-section-modal-wrap builtin-product-picker-modal-wrap"
      onCancel={onClose}
      footer={
        <>
          <span
            className={
              confirmDisabled && tab !== "allProducts"
                ? "shop-section-modal__footer-selection shop-section-modal__footer-selection--placeholder"
                : "shop-section-modal__footer-selection"
            }
          >
            {footerSelection}
          </span>
          <div className="shop-section-modal__footer-actions">
            <ShopSecondaryButton htmlType="button" onClick={onClose}>
              取消
            </ShopSecondaryButton>
            <ShopPrimaryButton
              htmlType="button"
              disabled={tab === "allProducts" ? disabled : confirmDisabled}
              onClick={handleConfirm}
            >
              确定
            </ShopPrimaryButton>
          </div>
        </>
      }
    >
      <div className="builtin-picker-modal">
        <div className="builtin-picker-modal__segment-tabs" role="tablist" aria-label="商品范围类型">
          {tabOptions.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              disabled={disabled}
              className={`builtin-picker-modal__segment${tab === id ? " builtin-picker-modal__segment--active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "allProducts" ? (
          <div className="builtin-picker-modal__all-panel">
            <p className="builtin-picker-modal__all-title">使用店铺全部在售商品</p>
            <p className="builtin-picker-modal__all-desc">
              确认后，变量将从店铺完整商品池中按排序规则取数。各商品的规格展示由邮件模板中的嵌套列表控制。
            </p>
          </div>
        ) : (
          <>
            {tab === "sku" ? (
              <p className="builtin-picker-modal__tab-hint">
                默认展开规格列表，可点击行首箭头收起；模板嵌套列表中仅出现已选规格。
              </p>
            ) : null}

            <div className="builtin-picker-modal__toolbar">
              <ShopInput
                className="builtin-picker-modal__search"
                placeholder={tab === "collection" ? "搜索专辑名称" : "搜索商品名称、编号或规格"}
                value={search}
                disabled={disabled}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search.trim() ? (
                <ShopSecondaryButton htmlType="button" disabled={disabled} onClick={() => setSearch("")}>
                  清空
                </ShopSecondaryButton>
              ) : null}
            </div>

            {tab === "spu" ? (
              <PickerTable
                ariaLabel="指定商品"
                rowKey={(row) => row.rowKey}
                dataSource={spuRows}
                emptyText={emptySearchHint}
                selection={{
                  mode: "multiple",
                  selectedKeys: selectedSpuSet,
                  onToggle: toggleSpu,
                  getRowDisabled: () => disabled,
                  selectAll: {
                    checked: allVisibleSelected,
                    indeterminate: someVisibleSelected,
                    disabled: disabled || spuRows.length === 0,
                    onChange: toggleAllVisibleSpu,
                  },
                }}
                columns={[
                  {
                    key: "info",
                    title: "商品信息",
                    render: (row) => (
                      <ProductInfoCell imageSrc={row.imageSrc} title={row.title} />
                    ),
                  },
                  {
                    key: "price",
                    title: "售价",
                    width: 100,
                    align: "right",
                    render: (row) => row.salePrice,
                  },
                  {
                    key: "inventory",
                    title: "库存",
                    width: 88,
                    align: "right",
                    render: (row) => row.inventory,
                  },
                ]}
              />
            ) : null}

            {tab === "sku" ? (
              <PickerTable
                ariaLabel="按 SKU 选择规格"
                rowKey={(row) => row.rowKey}
                dataSource={skuFlatRows}
                emptyText={emptySearchHint}
                getRowClassName={(row) =>
                  row.kind === "sku" ? "selectable-picker-table__row--child" : undefined
                }
                selection={{
                  mode: "custom",
                  renderCell: (row) => {
                    if (row.kind === "spu") {
                      return (
                        <SelectablePickerCheckboxCell
                          checked={spuFullySelected(row.spuId, row.skuIds)}
                          indeterminate={spuPartiallySelected(row.spuId, row.skuIds)}
                          disabled={disabled}
                          label={`选择商品 ${row.title} 的全部规格`}
                          onChange={(checked) => toggleSpuAllSkus(row.spuId, row.skuIds, checked)}
                        />
                      );
                    }
                    return (
                      <SelectablePickerCheckboxCell
                        checked={skuSelectionSet.has(row.rowKey)}
                        disabled={
                          disabled ||
                          (!skuSelectionSet.has(row.rowKey) && skuSelection.length >= MAX_SELECTION)
                        }
                        label={`选择规格 ${row.title}`}
                        onChange={(checked) => toggleSku(row.spuId, row.skuId!, checked)}
                      />
                    );
                  },
                }}
                columns={[
                  {
                    key: "info",
                    title: "商品 / 规格",
                    render: (row) => {
                      if (row.kind === "spu") {
                        const open = expandedSpuIds.has(row.spuId);
                        return (
                          <ProductInfoCell
                            imageSrc={row.imageSrc}
                            title={row.title}
                            leading={
                              <button
                                type="button"
                                className="selectable-picker-table__expand"
                                aria-expanded={open}
                                aria-label={open ? "收起规格" : "展开规格"}
                                disabled={disabled || row.skuIds.length === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandedSpu(row.spuId);
                                }}
                              >
                                {open ? "▾" : "▸"}
                              </button>
                            }
                          />
                        );
                      }
                      return (
                        <ProductInfoCell
                          imageSrc={row.imageSrc}
                          title={row.title}
                          indent
                        />
                      );
                    },
                  },
                  {
                    key: "price",
                    title: "售价",
                    width: 100,
                    align: "right",
                    render: (row) => row.salePrice,
                  },
                  {
                    key: "inventory",
                    title: "库存",
                    width: 88,
                    align: "right",
                    render: (row) => row.inventory,
                  },
                ]}
              />
            ) : null}

            {tab === "collection" ? (
              <SelectablePickerTable
                ariaLabel="选择商品专辑"
                rowKey={(row) => row.rowKey}
                selectedKey={selectedCollectionId || null}
                onSelect={setSelectedCollectionId}
                radioName="builtin-product-collection-pick"
                dataSource={collectionRows}
                emptyText={emptySearchHint}
                getRowDisabled={() => disabled}
                columns={[
                  {
                    key: "title",
                    title: "专辑名称",
                    render: (row) => row.title,
                  },
                  {
                    key: "count",
                    title: "商品数量",
                    width: 100,
                    align: "right",
                    render: (row) => row.productCount,
                  },
                ]}
              />
            ) : null}
          </>
        )}
      </div>
    </ShopSectionModal>
  );
}
