import { useState } from "react";
import { isCollectionField } from "../../payload-contract/collection-item-fields";
import { ShopInput, ShopSecondaryButton } from "../ui/ShopFormControls";
import { UrlAssetUploadInput } from "../ui/UrlAssetUploadInput";
import { CollectionNestedItemsEditModalGate } from "./CollectionNestedItemsEditModal";
import type { CollectionItemPreviewMode, CollectionPreviewField } from "./types";
import {
  displayPreviewScalar,
  nestedCollectionSummary,
} from "./collectionItemPreviewUtils";

type Props = {
  fields: CollectionPreviewField[];
  row: Record<string, unknown>;
  mode: CollectionItemPreviewMode;
  rowIndex?: number;
  disabled?: boolean;
  onFieldChange?: (fieldKey: string, value: unknown) => void;
};

export function CollectionItemPreviewFieldRows({
  fields,
  row,
  mode,
  rowIndex = 0,
  disabled = false,
  onFieldChange,
}: Props) {
  const [nestedEditField, setNestedEditField] = useState<CollectionPreviewField | null>(null);
  const readonly = mode === "readonly" || disabled;

  return (
    <>
      {fields.map((field) => {
        if (isCollectionField(field)) {
          const summary = nestedCollectionSummary(row[field.key]);
          return (
            <div
              key={field.key}
              className="payload-collection__field collection-linked-preview__field collection-item-preview__nested-row"
            >
              <div className="collection-item-preview__nested-head">
                <span>{field.label || field.key}</span>
                {!readonly ? (
                  <ShopSecondaryButton
                    htmlType="button"
                    className="collection-item-preview__nested-edit-btn"
                    disabled={disabled}
                    onClick={() => setNestedEditField(field)}
                  >
                    编辑
                  </ShopSecondaryButton>
                ) : null}
              </div>
              <ShopInput value={summary} placeholder="（空）" disabled readOnly />
            </div>
          );
        }

        const stringValue = displayPreviewScalar(row[field.key]);
        const inputType = field.valueType === "number" ? "number" : "text";
        const imageUpload = field.valueType === "image" && !readonly;

        return (
          <label
            key={field.key}
            className="payload-collection__field collection-linked-preview__field"
          >
            <span>{field.label || field.key}</span>
            {imageUpload ? (
              <UrlAssetUploadInput
                uploadKind="image"
                value={stringValue}
                placeholder="（空）"
                disabled={disabled}
                onChange={(raw) => onFieldChange?.(field.key, raw)}
              />
            ) : (
              <ShopInput
                value={stringValue}
                placeholder="（空）"
                type={inputType}
                disabled={readonly ? true : undefined}
                readOnly={readonly ? true : undefined}
                onChange={
                  readonly
                    ? undefined
                    : (event) => {
                        const raw = event.target.value;
                        const next =
                          field.valueType === "number"
                            ? raw === ""
                              ? ""
                              : Number(raw)
                            : raw;
                        onFieldChange?.(field.key, next);
                      }
                }
              />
            )}
          </label>
        );
      })}

      {nestedEditField ? (
        <CollectionNestedItemsEditModalGate
          visible
          parentRowIndex={rowIndex}
          field={nestedEditField}
          value={row[nestedEditField.key]}
          disabled={disabled}
          onClose={() => setNestedEditField(null)}
          onConfirm={(nextValue) => onFieldChange?.(nestedEditField.key, nextValue)}
        />
      ) : null}
    </>
  );
}
