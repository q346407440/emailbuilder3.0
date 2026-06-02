import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEventHandler, type ReactElement, type ReactNode } from "react";
import { emailPresentationTableProps, emailPresentationTdBase } from "./emailPresentationPrimitives";
import { EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE } from "./emailPresentationLayout";
import { wrapperBackgroundImageTdPresentationStyle } from "./wrapperBackgroundImagePresentation";
import type { WrapperBackgroundImageCanvasLayout } from "./wrapperBackgroundImageCanvasLayout";

/** 底图 alt 兜底：部分客户端不读 td background */
export function renderWrapperBackgroundImageAltHiddenNode(altText: string): ReactElement | null {
  if (!altText) return null;
  return (
    <div
      style={{
        display: "none",
        maxHeight: 0,
        overflow: "hidden",
        fontSize: 1,
        lineHeight: "1px",
        color: "transparent",
      }}
    >
      {altText}
    </div>
  );
}

export type RenderWrapperBackgroundImageCanvasShellProps = {
  layout: WrapperBackgroundImageCanvasLayout;
  className?: string;
  dataProps?: Record<string, string>;
  onClick?: MouseEventHandler<HTMLElement>;
  /** 画布内底图 link：阻止跳转，仅保留 href 视觉 */
  onLinkNavigate?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
};

/**
 * 底图叠放画布壳：外层 div +（可选 link）+ 底图 table/td + 叠放子内容。
 * layout / grid / image / emailRoot 共用；布局派生见 resolveWrapperBackgroundImageCanvasLayout。
 */
export function renderWrapperBackgroundImageCanvasShell(
  props: RenderWrapperBackgroundImageCanvasShellProps
): ReactElement {
  const { layout, className, dataProps, onClick, onLinkNavigate, children } = props;
  const {
    src,
    link,
    altText,
    fixedCanvasHeight,
    wrapperBackgroundColor,
    overlayBorderCss,
    overlayRadiusCss,
    overlayPaddingCss,
    overlayHorizontalAlign,
    overlayVerticalValign,
    outerBoxCss,
    bgPresentationFields,
    bgTableBorderCollapse,
    bgTableHeightFromTd,
    enableHugIntrinsicHeight,
  } = layout;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hostWidth, setHostWidth] = useState<number>(0);
  const [intrinsicRatio, setIntrinsicRatio] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!enableHugIntrinsicHeight) return;
    const host = hostRef.current;
    if (!host) return;

    const syncWidth = () => {
      const next = host.getBoundingClientRect().width;
      if (Number.isFinite(next) && next > 0) setHostWidth(next);
    };
    syncWidth();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncWidth());
    ro.observe(host);
    return () => ro.disconnect();
  }, [enableHugIntrinsicHeight]);

  useEffect(() => {
    if (!enableHugIntrinsicHeight) return;
    const img = new Image();
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setIntrinsicRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [enableHugIntrinsicHeight, src]);

  const autoHugHeight = useMemo(() => {
    if (!enableHugIntrinsicHeight) return undefined;
    if (!intrinsicRatio || !hostWidth) return undefined;
    const px = hostWidth / intrinsicRatio;
    if (!Number.isFinite(px) || px <= 0) return undefined;
    return `${Math.round(px * 100) / 100}px`;
  }, [enableHugIntrinsicHeight, hostWidth, intrinsicRatio]);
  const canvasHeight = fixedCanvasHeight ?? autoHugHeight;

  const contentNode = (
    <table
      {...emailPresentationTableProps}
      style={{
        width: "100%",
        borderCollapse: bgTableBorderCollapse,
        borderSpacing: 0,
        tableLayout: "fixed",
        ...(canvasHeight && !bgTableHeightFromTd ? { height: canvasHeight } : {}),
      }}
    >
      <tbody>
        <tr>
          <td
            align={overlayHorizontalAlign}
            valign={overlayVerticalValign}
            {...(src ? ({ background: src } as Record<string, string>) : {})}
            style={{
              ...emailPresentationTdBase(),
              ...EMAIL_PRESENTATION_TD_ANTI_STRUT_STYLE,
              width: "100%",
              ...wrapperBackgroundImageTdPresentationStyle(bgPresentationFields, {
                height: canvasHeight,
                fallbackColor: wrapperBackgroundColor,
              }),
              ...overlayRadiusCss,
              ...overlayBorderCss,
              ...(overlayPaddingCss ? { padding: overlayPaddingCss } : {}),
            }}
          >
            {renderWrapperBackgroundImageAltHiddenNode(altText)}
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className={className} {...dataProps} onClick={onClick} style={outerBoxCss} ref={hostRef}>
      {link ? (
        <a
          href={link}
          style={{ display: "block", textDecoration: "none" }}
          onClick={onLinkNavigate}
          onAuxClick={onLinkNavigate}
        >
          {contentNode}
        </a>
      ) : (
        contentNode
      )}
    </div>
  );
}
