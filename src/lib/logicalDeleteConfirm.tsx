import type { ReactNode } from "react";
import type { ConfirmDialogOptions } from "../components/ui/ConfirmDialogProvider";

/** 逻辑删除确认弹窗所覆盖的资源类型（面向运营文案，不含落盘细节）。 */
export type LogicalDeleteResourceKind = "layoutVariant" | "emailTemplate" | "globalTokenPreset";

const RESOURCE_COPY: Record<LogicalDeleteResourceKind, { title: string; message: (name: string) => string }> =
  {
    layoutVariant: {
      title: "删除版式",
      message: (name) => `确定删除「${name}」吗？删除后无法继续选用，相关活动将提示「模板异常」。`,
    },
    emailTemplate: {
      title: "删除邮件模板",
      message: (name) => `确定删除「${name}」吗？删除后无法继续编辑，相关活动将提示「模板异常」。`,
    },
    globalTokenPreset: {
      title: "删除公共样式预设",
      message: (name) => `确定删除「${name}」吗？删除后无法继续选用。`,
    },
  };

/** 逻辑删除确认弹窗（单行简洁文案）。 */
export function logicalDeleteConfirmOptions(args: {
  kind: LogicalDeleteResourceKind;
  name: string;
}): ConfirmDialogOptions {
  const copy = RESOURCE_COPY[args.kind];
  const trimmedName = args.name.trim() || "此项";

  return {
    title: copy.title,
    message: logicalDeleteConfirmMessage(copy.message(trimmedName)),
    confirmLabel: "确认删除",
    cancelLabel: "取消",
    danger: true,
    maskClosable: false,
  };
}

export function logicalDeleteConfirmMessage(message: string): ReactNode {
  return <p className="confirm-dialog__message">{message}</p>;
}
