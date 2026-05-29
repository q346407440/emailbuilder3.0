import { useEffect, useState } from "react";
import { ShopInput } from "./ui/ShopFormControls";

type Props = {
  blockId: string;
  displayName: string;
  onCommit: (name: string) => void;
};

/** Inspector 顶栏：仅展示并可编辑 blockMeta.name */
export function InspectorBlockNameField({ blockId, displayName, onCommit }: Props) {
  const [draft, setDraft] = useState(displayName);

  useEffect(() => {
    setDraft(displayName);
  }, [blockId, displayName]);

  const commit = () => {
    const next = draft.trim();
    if (next === displayName.trim()) return;
    onCommit(next.length > 0 ? next : blockId);
  };

  return (
    <ShopInput
      className="inspector__title-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(displayName);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      aria-label="区块名称"
      placeholder={blockId}
    />
  );
}
