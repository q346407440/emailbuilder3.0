import { createContext, useContext, type ReactNode } from "react";

export type CanvasDimensionPreviewContextValue = {
  previewViewportPx: number;
  rootConfiguredWidthPx: number;
};

const CanvasDimensionPreviewContext = createContext<CanvasDimensionPreviewContextValue | null>(
  null
);

export function CanvasDimensionPreviewProvider({
  value,
  children,
}: {
  value: CanvasDimensionPreviewContextValue;
  children: ReactNode;
}) {
  return (
    <CanvasDimensionPreviewContext.Provider value={value}>
      {children}
    </CanvasDimensionPreviewContext.Provider>
  );
}

export function useCanvasDimensionPreview(): CanvasDimensionPreviewContextValue | null {
  return useContext(CanvasDimensionPreviewContext);
}
