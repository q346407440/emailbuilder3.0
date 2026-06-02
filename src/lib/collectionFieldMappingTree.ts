import type { BindingCollectionField } from "../types/email";
import { isCollectionField } from "../payload-contract/collection-item-fields";

export type CollectionFieldMappingGroupEntry = {
  kind: "group";
  path: string;
  field: Extract<BindingCollectionField, { valueType: "collection" }>;
  depth: number;
};

export type CollectionFieldMappingLeafEntry = {
  kind: "leaf";
  path: string;
  field: Exclude<BindingCollectionField, { valueType: "collection" }>;
  depth: number;
  parentCollectionPath?: string;
};

export type CollectionFieldMappingNavEntry =
  | CollectionFieldMappingGroupEntry
  | CollectionFieldMappingLeafEntry;

export function collectionFieldMappingPath(
  parentKey: string,
  childKey: string
): string {
  return `${parentKey}.${childKey}`;
}

export function defaultExpandedCollectionGroupPaths(
  itemFields: BindingCollectionField[]
): Set<string> {
  const keys = new Set<string>();
  itemFields.forEach((field) => {
    if (field.valueType === "collection") keys.add(field.key);
  });
  return keys;
}

/** itemFields 是否含子列表（collection 类型列） */
export function hasNestedCollectionInItemFields(
  itemFields: BindingCollectionField[]
): boolean {
  return itemFields.some((field) => isCollectionField(field));
}

/** itemFields 中的子列表（collection 列）条目，用于绑定向导「选子级列表」扁平展示 */
export function listNestedCollectionFieldsInItemFields(
  itemFields: BindingCollectionField[]
): Extract<BindingCollectionField, { valueType: "collection" }>[] {
  return itemFields.filter((field): field is Extract<BindingCollectionField, { valueType: "collection" }> =>
    isCollectionField(field)
  );
}

export function countNestedCollectionsInItemFields(itemFields: BindingCollectionField[]): number {
  return listNestedCollectionFieldsInItemFields(itemFields).length;
}

/**
 * 列表变量表：仅展示子列表分组及其子字段（不含顶层标量行）。
 * @param depthOffset 相对父级列表行的缩进层级（绑定向导内默认为 1：父级行 0，子列表 1，子字段 2）
 */
export function flattenNestedCollectionFieldsPreview(
  itemFields: BindingCollectionField[],
  expandedGroupPaths: ReadonlySet<string>,
  depthOffset = 1
): CollectionFieldMappingNavEntry[] {
  return flattenItemFieldsForFieldMap(itemFields, expandedGroupPaths, depthOffset).filter(
    (entry) => entry.kind === "group" || entry.parentCollectionPath != null
  );
}

/** 左侧字段关联导航：collection 为可折叠分组，子列为 leaf */
export function flattenItemFieldsForFieldMap(
  itemFields: BindingCollectionField[],
  expandedGroupPaths: ReadonlySet<string>,
  depthOffset = 0
): CollectionFieldMappingNavEntry[] {
  const out: CollectionFieldMappingNavEntry[] = [];
  itemFields.forEach((field) => {
    if (isCollectionField(field)) {
      out.push({ kind: "group", path: field.key, field, depth: depthOffset });
      if (expandedGroupPaths.has(field.key)) {
        (field.itemFields ?? []).forEach((child) => {
          if (child.valueType === "collection") return;
          out.push({
            kind: "leaf",
            path: collectionFieldMappingPath(field.key, child.key),
            field: child,
            depth: depthOffset + 1,
            parentCollectionPath: field.key,
          });
        });
      }
      return;
    }
    out.push({ kind: "leaf", path: field.key, field, depth: depthOffset });
  });
  return out;
}

export function findLeafFieldByMappingPath(
  itemFields: BindingCollectionField[],
  path: string
): CollectionFieldMappingLeafEntry | undefined {
  for (const entry of flattenItemFieldsForFieldMap(
    itemFields,
    defaultExpandedCollectionGroupPaths(itemFields)
  )) {
    if (entry.kind === "leaf" && entry.path === path) return entry;
  }
  return undefined;
}

export function firstLeafMappingPath(itemFields: BindingCollectionField[]): string {
  const expanded = defaultExpandedCollectionGroupPaths(itemFields);
  const entries = flattenItemFieldsForFieldMap(itemFields, expanded);
  const leaf = entries.find((e): e is CollectionFieldMappingLeafEntry => e.kind === "leaf");
  return leaf?.path ?? itemFields[0]?.key ?? "";
}

/** 字段关联层级：0 = 列表行顶层列，1 = 一层子列表列（`parent.child`） */
export function collectionFieldMappingDepth(pathOrKey: string): number {
  const trimmed = pathOrKey.trim();
  if (!trimmed) return 0;
  return trimmed.includes(".") ? 1 : 0;
}

/** 子列表列 / 源字段的 collection 父级 key（如 `skus.imageSrc` → `skus`） */
export function collectionFieldMappingParentKey(pathOrKey: string): string | undefined {
  const trimmed = pathOrKey.trim().replace(/\._$/, "");
  const dot = trimmed.indexOf(".");
  if (dot <= 0) return undefined;
  return trimmed.slice(0, dot);
}

export function canBindTargetPathToSourceKey(targetPath: string, sourceKey: string): boolean {
  if (!sourceKey.trim()) return true;
  const targetDepth = collectionFieldMappingDepth(targetPath);
  const sourceDepth = collectionFieldMappingDepth(sourceKey);
  if (targetDepth !== sourceDepth) return false;
  if (targetDepth === 0) return true;
  const targetParent = collectionFieldMappingParentKey(targetPath);
  const sourceParent = collectionFieldMappingParentKey(sourceKey);
  if (!targetParent || !sourceParent) return true;
  return targetParent === sourceParent;
}

export function collectionFieldMappingDepthMismatchMessage(
  targetPath: string,
  sourceKey: string
): string | undefined {
  if (!sourceKey.trim() || canBindTargetPathToSourceKey(targetPath, sourceKey)) {
    return undefined;
  }
  const targetDepth = collectionFieldMappingDepth(targetPath);
  if (targetDepth === 0) {
    return `一级列表列只能映射一级源字段，不能映射「${sourceKey}」`;
  }
  return `子列表列只能映射子级源字段（如 skus.xxx），不能映射一级源字段「${sourceKey}」`;
}

export function validateCollectionFieldMapDepth(
  itemFields: BindingCollectionField[],
  fieldMap: Record<string, string>
): { ok: true } | { ok: false; error: string } {
  const expanded = defaultExpandedCollectionGroupPaths(itemFields);
  for (const entry of flattenItemFieldsForFieldMap(itemFields, expanded)) {
    if (entry.kind !== "leaf") continue;
    const sourceKey = fieldMap[entry.path]?.trim() ?? "";
    const message = collectionFieldMappingDepthMismatchMessage(entry.path, sourceKey);
    if (message) return { ok: false, error: message };
  }
  return { ok: true };
}
