import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ShopPrimaryButton, ShopSecondaryButton } from "./ShopFormControls";
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
          onCancel={() => finish(false)}
          footer={
            <div className="shop-section-modal__footer-actions">
              <ShopSecondaryButton onClick={() => finish(false)}>
                {pending.cancelLabel ?? "取消"}
              </ShopSecondaryButton>
              <ShopPrimaryButton
                className={pending.danger ? "confirm-dialog__confirm--danger" : undefined}
                onClick={() => finish(true)}
              >
                {pending.confirmLabel ?? "确定"}
              </ShopPrimaryButton>
            </div>
          }
        >
          <div className="confirm-dialog__body">{pending.message}</div>
        </ShopSectionModal>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}
