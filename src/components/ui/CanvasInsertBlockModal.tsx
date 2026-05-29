import { useMemo } from "react";
import type { BlockCatalogEntry } from "../../lib/blockDefaults";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

type Props = {
  visible: boolean;
  title: string;
  entries: BlockCatalogEntry[];
  busy?: boolean;
  onCancel: () => void;
  onPick: (entry: BlockCatalogEntry) => void;
};

export function CanvasInsertBlockModal({ visible, title, entries, busy, onCancel, onPick }: Props) {
  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    [entries]
  );

  if (!visible) return null;

  return (
    <ShopSectionModal
      visible
      title={title}
      onCancel={onCancel}
      maskClosable={!busy}
      closable={!busy}
      destroyOnClose
      footer={
        <div className="shop-section-modal__footer-actions">
          <ShopSecondaryButton onClick={onCancel} disabled={busy}>
            取消
          </ShopSecondaryButton>
        </div>
      }
    >
      <div className="canvas-insert-modal__grid">
        {sorted.map((entry) => (
          <ShopPrimaryButton
            key={entry.masterId}
            className="canvas-insert-modal__item"
            disabled={busy}
            onClick={() => onPick(entry)}
          >
            {entry.name}
          </ShopPrimaryButton>
        ))}
      </div>
    </ShopSectionModal>
  );
}

