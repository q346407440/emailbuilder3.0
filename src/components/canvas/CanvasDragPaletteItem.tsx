import { useDraggable } from "@dnd-kit/core";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import type { CanvasDragInsertPayload } from "../../lib/canvasDragInsert";
import { CANVAS_DRAG_INSERT_DATA_TYPE, encodeCanvasDragId } from "../../lib/canvasDragInsert";

type Props = {
  payload: CanvasDragInsertPayload;
  className?: string;
  /** 仅把手可拖（用于模块行、画布操作钮，避免与点击冲突） */
  activatorOnly?: boolean;
  children?: React.ReactNode;
};

function mergeActivatorRefs<T extends HTMLElement>(
  setActivatorNodeRef: (node: T | null) => void,
  childRef: React.Ref<T> | undefined
): (node: T | null) => void {
  return (node) => {
    setActivatorNodeRef(node);
    if (typeof childRef === "function") {
      childRef(node);
    } else if (childRef && typeof childRef === "object") {
      (childRef as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export function CanvasDragPaletteItem({
  payload,
  className,
  activatorOnly = false,
  children,
}: Props) {
  const id = encodeCanvasDragId(payload);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id,
    data: {
      type: CANVAS_DRAG_INSERT_DATA_TYPE,
      payload,
    },
  });

  if (activatorOnly) {
    const child = Children.only(children);
    if (isValidElement(child)) {
      const element = child as ReactElement<{
        className?: string;
        title?: string;
        "aria-label"?: string;
        ref?: React.Ref<HTMLElement>;
      }>;
      return (
        <div ref={setNodeRef} className="canvas-drag-palette-activator-host">
          {cloneElement(element, {
            ref: mergeActivatorRefs(setActivatorNodeRef, element.props.ref),
            className: [element.props.className, className].filter(Boolean).join(" ") || undefined,
            title: element.props.title ?? `拖拽插入「${payload.label}」`,
            "aria-label": element.props["aria-label"] ?? `拖拽插入「${payload.label}」`,
            ...listeners,
            ...attributes,
          })}
        </div>
      );
    }

    return (
      <div ref={setNodeRef} className="canvas-drag-palette-activator-host">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={className}
          aria-label={`拖拽插入「${payload.label}」`}
          title={`拖拽插入「${payload.label}」`}
          {...listeners}
          {...attributes}
        >
          {children ?? <span className="canvas-drag-palette-grip" aria-hidden>⋮⋮</span>}
        </button>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} className={className} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

export function CanvasDragGhost({ label }: { label: string }) {
  return (
    <div className="canvas-drag-ghost" aria-hidden>
      <span className="canvas-drag-ghost__label">{label}</span>
    </div>
  );
}
