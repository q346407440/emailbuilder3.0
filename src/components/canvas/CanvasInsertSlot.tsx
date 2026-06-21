type Props = {
  parentPreviewBlockId: string;
  insertIndex: number;
  variant: "bar" | "column";
};

/** 画布内联插入占位（撑开布局；命中区由 CanvasInsertDropLayer 浮层承担）。 */
export function CanvasInsertSlot({ variant }: Props) {
  return (
    <div
      className={`canvas-insert-slot canvas-insert-slot--active canvas-insert-slot--${variant}`}
      data-canvas-insert-placeholder
    >
      <span className="canvas-insert-slot__label">插入此处</span>
    </div>
  );
}
