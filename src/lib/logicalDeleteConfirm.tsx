import type { ReactNode } from "react";
import type { ConfirmDialogOptions } from "../components/ui/ConfirmDialogProvider";
import { LOGICAL_DELETE_RESTORE_HINT } from "./logicalDelete";

/** 逻辑删除确认弹窗文案（与 ShopSectionModal 样式一致） */
export function logicalDeleteConfirmOptions(args: {
  resourcePhrase: string;
  fileHint: string;
  title?: string;
}): ConfirmDialogOptions {
  return {
    title: args.title ?? "确认删除",
    message: logicalDeleteConfirmMessage(args.resourcePhrase, args.fileHint),
    confirmLabel: "删除",
    danger: true,
  };
}

export function logicalDeleteConfirmMessage(resourcePhrase: string, fileHint: string): ReactNode {
  return (
    <>
      <p className="confirm-dialog__message">确定逻辑删除{resourcePhrase}？</p>
      <p className="inspector__muted confirm-dialog__hint">{LOGICAL_DELETE_RESTORE_HINT}</p>
      <p className="inspector__muted confirm-dialog__hint">文件：{fileHint}</p>
    </>
  );
}
