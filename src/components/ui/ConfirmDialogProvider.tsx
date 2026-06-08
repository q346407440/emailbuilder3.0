import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ShopDangerButton, ShopPrimaryButton, ShopSecondaryButton } from "./ShopFormControls";
import { ShopSectionModal } from "./ShopSectionModal";

export type ConfirmDialogOptions = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  maskClosable?: boolean;
};

type PendingConfirm = ConfirmDialogOptions & {
  resolve: (confirmed: boolean) => void;
};

type ConfirmDialogContextValue = {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function useConfirmDialog(): ConfirmDialogContextValue {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog 须在 ConfirmDialogProvider 内使用");
  }
  return ctx;
}

type ProviderProps = {
  children: ReactNode;
};

export function ConfirmDialogProvider({ children }: ProviderProps) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const finish = useCallback((confirmed: boolean) => {
    const current = pendingRef.current;
    if (!current) return;
    pendingRef.current = null;
    setPending(null);
    current.resolve(confirmed);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      const next: PendingConfirm = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  useEffect(() => {
    if (!pending) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;

      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
        return;
      }

      if (event.key !== "Enter" || event.shiftKey || event.altKey) return;
      if (event.metaKey || event.ctrlKey) return;

      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === "TEXTAREA" || (active instanceof HTMLElement && active.isContentEditable)) return;
      if (tag === "INPUT") {
        const inputType = (active as HTMLInputElement).type;
        if (inputType !== "button" && inputType !== "submit") return;
      }
      if (tag === "SELECT") return;

      event.preventDefault();
      finish(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, finish]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {pending ? (
        <ShopSectionModal
          visible
          title={pending.title}
          maskClosable={pending.maskClosable ?? true}
          closable
          destroyOnClose
          wrapClassName="confirm-dialog-wrap"
          onCancel={() => finish(false)}
          footer={
            <div className="shop-action-button-group shop-section-modal__footer-actions">
              <ShopSecondaryButton onClick={() => finish(false)}>
                {pending.cancelLabel ?? "取消"}
              </ShopSecondaryButton>
              {pending.danger ? (
                <ShopDangerButton onClick={() => finish(true)}>
                  {pending.confirmLabel ?? "确定"}
                </ShopDangerButton>
              ) : (
                <ShopPrimaryButton onClick={() => finish(true)}>
                  {pending.confirmLabel ?? "确定"}
                </ShopPrimaryButton>
              )}
            </div>
          }
        >
          {pending.message}
        </ShopSectionModal>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}
