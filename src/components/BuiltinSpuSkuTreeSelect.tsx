import {
  formatBuiltinSkuSelectionKey,
  type BuiltinSkuSelectionKey,
} from "../payload-contract/collection-builtin-catalog-config";
import type { BuiltinSpuSkuTreeNode } from "../lib/builtinProductListResolve";

type Props = {
  nodes: BuiltinSpuSkuTreeNode[];
  selectedKeys: BuiltinSkuSelectionKey[];
  disabled?: boolean;
  onChange: (keys: BuiltinSkuSelectionKey[]) => void;
};

function toggleKey(keys: BuiltinSkuSelectionKey[], key: string, on: boolean): BuiltinSkuSelectionKey[] {
  const set = new Set(keys);
  if (on) set.add(key);
  else set.delete(key);
  return [...set];
}

function spuKeysForNode(node: BuiltinSpuSkuTreeNode): string[] {
  return node.skus.map((s) => s.selectionKey);
}

export function BuiltinSpuSkuTreeSelect({ nodes, selectedKeys, disabled, onChange }: Props) {
  const selected = new Set(selectedKeys);

  const toggleSpu = (node: BuiltinSpuSkuTreeNode, checked: boolean) => {
    const keys = spuKeysForNode(node);
    let next = [...selectedKeys];
    for (const key of keys) {
      next = toggleKey(next, key, checked);
    }
    onChange(next);
  };

  const toggleSku = (key: string, checked: boolean) => {
    onChange(toggleKey(selectedKeys, key, checked));
  };

  const spuCheckedState = (node: BuiltinSpuSkuTreeNode): "checked" | "indeterminate" | "none" => {
    const keys = spuKeysForNode(node);
    const hit = keys.filter((k) => selected.has(k)).length;
    if (hit === 0) return "none";
    if (hit === keys.length) return "checked";
    return "indeterminate";
  };

  return (
    <div className="builtin-spu-sku-tree" role="tree" aria-label="SPU–SKU 树形选择">
      {nodes.length === 0 ? (
        <p className="inspector__muted">当前范围内无商品，请调整范围模式或专辑选择。</p>
      ) : null}
      {nodes.map((node) => {
        const state = spuCheckedState(node);
        return (
          <div key={node.spuId} className="builtin-spu-sku-tree__spu" role="treeitem" aria-expanded>
            <label className="builtin-spu-sku-tree__spu-label">
              <input
                type="checkbox"
                disabled={disabled}
                checked={state === "checked"}
                ref={(el) => {
                  if (el) el.indeterminate = state === "indeterminate";
                }}
                onChange={(e) => toggleSpu(node, e.target.checked)}
              />
              <span>{node.title}</span>
            </label>
            <ul className="builtin-spu-sku-tree__skus" role="group">
              {node.skus.map((sku) => (
                <li key={sku.selectionKey}>
                  <label className="builtin-spu-sku-tree__sku-label">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={selected.has(sku.selectionKey)}
                      onChange={(e) => toggleSku(sku.selectionKey, e.target.checked)}
                    />
                    <span>
                      {sku.title}
                      <span className="inspector__muted"> · {sku.skuCode}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="inspector__muted builtin-spu-sku-tree__hint">
        已选 {selectedKeys.length} 个规格；勾选 SKU 即纳入扁平行列表（可跨多个商品）。
      </p>
    </div>
  );
}

export function selectionKeysFromSpuIds(
  nodes: BuiltinSpuSkuTreeNode[],
  spuIds: string[]
): BuiltinSkuSelectionKey[] {
  const idSet = new Set(spuIds);
  const keys: BuiltinSkuSelectionKey[] = [];
  for (const node of nodes) {
    if (!idSet.has(node.spuId)) continue;
    for (const sku of node.skus) {
      keys.push(formatBuiltinSkuSelectionKey(node.spuId, sku.skuId) as BuiltinSkuSelectionKey);
    }
  }
  return keys;
}
