import type { BindingCollectionField } from "../types/email";
import { canDeclareCollectionItemFieldType } from "../payload-contract/collection-item-fields";

export type CollectionFieldPath = number[];

export function pathKey(path: CollectionFieldPath): string {
  return path.length === 0 ? "root" : path.join(".");
}

export function emptyCollectionItemField(
  valueType: BindingCollectionField["valueType"] = "string"
): BindingCollectionField {
  if (valueType === "collection") {
    return {
      key: "",
      label: "",
      valueType: "collection",
      itemFields: [{ key: "", label: "", valueType: "string" }],
      minItems: 0,
      maxItems: 5,
    };
  }
  return { key: "", label: "", valueType: "string" };
}

function cloneFields(root: BindingCollectionField[]): BindingCollectionField[] {
  return structuredClone(root);
}

function fieldsAtPath(
  root: BindingCollectionField[],
  path: CollectionFieldPath
): BindingCollectionField[] | null {
  if (path.length === 0) return root;
  let fields = root;
  for (let i = 0; i < path.length - 1; i++) {
    const field = fields[path[i]];
    if (!field || field.valueType !== "collection") return null;
    fields = field.itemFields ?? [];
  }
  return fields;
}

export function readCollectionItemField(
  root: BindingCollectionField[],
  path: CollectionFieldPath
): BindingCollectionField | undefined {
  if (path.length === 0) return undefined;
  const fields = fieldsAtPath(root, path);
  if (!fields) return undefined;
  return fields[path[path.length - 1]];
}

export function updateCollectionItemField(
  root: BindingCollectionField[],
  path: CollectionFieldPath,
  patch: Partial<BindingCollectionField>
): BindingCollectionField[] {
  if (path.length === 0) return root;
  const next = cloneFields(root);
  const fields = fieldsAtPath(next, path);
  if (!fields) return root;
  const index = path[path.length - 1];
  const current = fields[index];
  if (!current) return root;
  fields[index] = { ...(current as BindingCollectionField), ...patch } as BindingCollectionField;
  return next;
}

export function setCollectionItemFieldType(
  root: BindingCollectionField[],
  path: CollectionFieldPath,
  valueType: BindingCollectionField["valueType"],
  collectionTypeDepth = 0
): BindingCollectionField[] {
  const current = readCollectionItemField(root, path);
  if (!current || current.valueType === valueType) return root;
  if (valueType === "collection" && !canDeclareCollectionItemFieldType(collectionTypeDepth)) {
    return root;
  }
  if (valueType === "collection") {
    return updateCollectionItemField(root, path, emptyCollectionItemField("collection"));
  }
  return updateCollectionItemField(root, path, {
    valueType: valueType as Exclude<BindingCollectionField["valueType"], "collection">,
  });
}

export function removeCollectionItemField(
  root: BindingCollectionField[],
  path: CollectionFieldPath
): BindingCollectionField[] {
  if (path.length === 0) return root;
  const next = cloneFields(root);
  const fields = fieldsAtPath(next, path);
  if (!fields || fields.length <= 1) return root;
  fields.splice(path[path.length - 1], 1);
  return next;
}

export function appendCollectionItemField(
  root: BindingCollectionField[],
  parentPath: CollectionFieldPath | null
): BindingCollectionField[] {
  const next = cloneFields(root);
  if (!parentPath?.length) {
    next.push(emptyCollectionItemField());
    return next;
  }
  const parent = readCollectionItemField(next, parentPath);
  if (!parent || parent.valueType !== "collection") return root;
  const itemFields = [...(parent.itemFields ?? []), emptyCollectionItemField()];
  return updateCollectionItemField(next, parentPath, { itemFields });
}

export type FlatCollectionItemFieldRow = {
  path: CollectionFieldPath;
  depth: number;
  field: BindingCollectionField;
};

export function flattenCollectionItemFields(
  fields: BindingCollectionField[],
  expanded: ReadonlySet<string>,
  pathPrefix: CollectionFieldPath = [],
  depth = 0
): FlatCollectionItemFieldRow[] {
  const out: FlatCollectionItemFieldRow[] = [];
  fields.forEach((field, index) => {
    const path = [...pathPrefix, index];
    out.push({ path, depth, field });
    if (field.valueType === "collection" && expanded.has(pathKey(path))) {
      out.push(
        ...flattenCollectionItemFields(field.itemFields ?? [], expanded, path, depth + 1)
      );
    }
  });
  return out;
}

export function collectCollectionFieldPaths(
  fields: BindingCollectionField[],
  pathPrefix: CollectionFieldPath = []
): CollectionFieldPath[] {
  const paths: CollectionFieldPath[] = [];
  fields.forEach((field, index) => {
    const path = [...pathPrefix, index];
    paths.push(path);
    if (field.valueType === "collection") {
      paths.push(...collectCollectionFieldPaths(field.itemFields ?? [], path));
    }
  });
  return paths;
}

export function canRemoveCollectionItemField(
  root: BindingCollectionField[],
  path: CollectionFieldPath
): boolean {
  const fields = fieldsAtPath(root, path);
  if (!fields || path.length === 0) return false;
  return fields.length > 1;
}

export function defaultExpandedPathKeys(fields: BindingCollectionField[]): Set<string> {
  const keys = new Set<string>();
  for (const path of collectCollectionFieldPaths(fields)) {
    const field = readCollectionItemField(fields, path);
    if (field?.valueType === "collection") keys.add(pathKey(path));
  }
  return keys;
}
