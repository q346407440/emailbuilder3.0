import { Modal } from "antd";
import type { ModalProps } from "antd";
import type { ReactNode } from "react";

function joinClassNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * 基于 Ant Design Modal 的三段式对话框封装：
 * - **header**：仅通过 `title` 传入标题（单行主标题，不放表单正文摘要）。
 * - **body**：`children` 统一落在内容区。
 * - **footer**：通过 `footer` 传入底部操作栏（自定义按钮排布）。
 */
export type ShopSectionModalProps = Omit<
  ModalProps,
  "footer" | "title" | "children" | "open" | "visible" | "maskClosable" | "destroyOnClose"
> & {
  title: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  width?: number | string;
  /** 兼容历史 `visible` 写法，映射为 antd `open` */
  visible?: boolean;
  open?: boolean;
  maskClosable?: boolean;
  destroyOnClose?: boolean;
};

export function ShopSectionModal({
  title,
  children,
  footer,
  className,
  wrapClassName,
  bodyStyle,
  width,
  visible,
  open: openProp,
  maskClosable,
  destroyOnClose,
  mask: maskProp,
  ...rest
}: ShopSectionModalProps) {
  const open = openProp ?? visible ?? false;
  const mask =
    maskClosable !== undefined
      ? typeof maskProp === "object" && maskProp !== null && !Array.isArray(maskProp)
        ? { ...maskProp, closable: maskClosable }
        : { closable: maskClosable }
      : maskProp;

  return (
    <Modal
      {...rest}
      open={open}
      mask={mask}
      destroyOnHidden={destroyOnClose}
      width={width ?? "var(--shop-section-modal-width)"}
      title={title}
      footer={<div className="shop-section-modal__footer-slot">{footer}</div>}
      wrapClassName={joinClassNames("shop-section-modal-wrap", wrapClassName)}
      className={joinClassNames("shop-section-modal", className)}
      styles={{
        body: {
          /* 水平内边距由 antd .ant-modal-container（20px 24px）统一承担，避免与 header/footer 错位 */
          padding: "16px 0 0",
          ...bodyStyle,
        },
      }}
    >
      <div className="shop-section-modal__body">{children}</div>
    </Modal>
  );
}
