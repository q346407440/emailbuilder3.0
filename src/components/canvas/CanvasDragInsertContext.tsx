import { createContext, useContext } from "react";
import type { ReactElement } from "react";
import type { RepeatPreviewModel } from "../../repeat-binding-contract";
import type { CanvasDragInsertPayload } from "../../lib/canvasDragInsert";
import type { EmailTemplate } from "../../types/email";

export type CanvasDragInsertContextValue = {
  enabled: boolean;
  isDragging: boolean;
  activePayload: CanvasDragInsertPayload | null;
  /** 当前指针下命中的画布插入槽（仅 canvas-drop:*） */
  activeOverSlotId: string | null;
  sourceTemplate: EmailTemplate;
  previewModel: RepeatPreviewModel;
  renderInsertSlot: (parentPreviewBlockId: string, insertIndex: number, variant: "bar" | "column") => ReactElement | null;
};

const CanvasDragInsertContext = createContext<CanvasDragInsertContextValue | null>(null);

export function CanvasDragInsertProvider({
  value,
  children,
}: {
  value: CanvasDragInsertContextValue;
  children: React.ReactNode;
}) {
  return <CanvasDragInsertContext.Provider value={value}>{children}</CanvasDragInsertContext.Provider>;
}

export function useCanvasDragInsert(): CanvasDragInsertContextValue | null {
  return useContext(CanvasDragInsertContext);
}
