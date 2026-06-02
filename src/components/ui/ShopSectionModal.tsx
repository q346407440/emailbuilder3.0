import { Modal } from "@shoplazza/sds";
import type { ModalProps } from "@shoplazza/sds";
import type { ReactNode } from "react";

function joinClassNames(...parts: Array<string | undefined | false>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * 基于 Shoplazza SDS {@link Modal} 的三段式对话框封装：
 * - **header**：仅通过 `title` 传入标题（单行主标题，不放表单正文摘要）。
 * - **body**：`children` 统一落在 SDS 内容区。
 * - **footer**：通过 `footer` 传入底部操作栏（自定义按钮排布）。
 *
 * 与直接在业务里塞复杂 `title`/`footer={null}` 相比，可避免头部与内容区分割线处的排版错乱。
 */
export type ShopSectionModalProps = Omit<ModalProps, "footer" | "title" | "children"> & {
  title: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  width?: number | string;
};

export function ShopSectionModal({
  title,
  children,
  footer,
  className,
  wrapClassName,
  bodyStyle,
  width,
  ...rest
}: ShopSectionModalProps) {
  return (
    <Modal
      {...rest}
      {...(width !== undefined ? ({ width } as Partial<ModalProps>) : {})}
      title={title}
      footer={<div className="shop-section-modal__footer-slot">{footer}</div>}
      wrapClassName={joinClassNames("shop-section-modal-wrap", wrapClassName)}
      className={joinClassNames("shop-section-modal", className)}
      bodyStyle={{ paddingTop: 16, ...bodyStyle }}
    >
      <div className="shop-section-modal__body">{children}</div>
    </Modal>
  );
}
