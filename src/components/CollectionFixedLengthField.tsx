import { useEffect, useState } from "react";
import {
  COLLECTION_FIXED_LENGTH_MAX,
  COLLECTION_FIXED_LENGTH_MIN,
  clampFixedLength,
} from "../lib/collectionDataSource";
import { Field } from "./ui/Field";
import { ShopInput } from "./ui/ShopFormControls";

export type CollectionFixedLengthFieldProps = {
  slotId: string;
  fixedLength: number;
  disabled?: boolean;
  disabledReason?: string;
  hint?: string;
  onCommit: (length: number) => void;
};

/** 列表固定展示条数（payload.slots minItems/maxItems）；变量面板与列表绑定面板共用 */
export function CollectionFixedLengthField({
  slotId,
  fixedLength,
  disabled = false,
  disabledReason,
  hint,
  onCommit,
}: CollectionFixedLengthFieldProps) {
  const [lengthDraft, setLengthDraft] = useState(String(fixedLength));

  useEffect(() => {
    setLengthDraft(String(fixedLength));
  }, [fixedLength, slotId]);

  const commitLength = () => {
    const n = clampFixedLength(Number(lengthDraft));
    if (!Number.isFinite(Number(lengthDraft)) || Number(lengthDraft) < COLLECTION_FIXED_LENGTH_MIN) {
      setLengthDraft(String(fixedLength));
      return;
    }
    setLengthDraft(String(n));
    if (n !== fixedLength) {
      onCommit(n);
    }
  };

  const defaultHint = `邮件版式固定展示项数，范围 ${COLLECTION_FIXED_LENGTH_MIN}–${COLLECTION_FIXED_LENGTH_MAX}；与变量面板「列表长度」同步。`;

  return (
    <Field
      label="列表长度"
      hint={
        disabled && disabledReason ? (
          <p className="inspector__muted">{disabledReason}</p>
        ) : (
          hint ?? defaultHint
        )
      }
    >
      <ShopInput
        type="number"
        min={COLLECTION_FIXED_LENGTH_MIN}
        max={COLLECTION_FIXED_LENGTH_MAX}
        value={lengthDraft}
        disabled={disabled}
        onChange={(e) => setLengthDraft(e.target.value)}
        onBlur={commitLength}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitLength();
          }
        }}
      />
    </Field>
  );
}
