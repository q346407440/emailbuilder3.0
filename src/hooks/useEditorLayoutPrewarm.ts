import { startTransition, useEffect, useState } from "react";

/**
 * 邮件加载完成后在空闲时段预布局侧栏隐藏面板，避免用户首次切换顶栏 tab 时触发 display:none → 首绘布局尖峰。
 */
export function useEditorLayoutPrewarm(ready: boolean): boolean {
  const [layoutPrewarmed, setLayoutPrewarmed] = useState(false);

  useEffect(() => {
    if (!ready || layoutPrewarmed) return;

    let cancelled = false;
    const schedule =
      typeof requestIdleCallback === "function"
        ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2500 })
        : (cb: () => void) => window.setTimeout(cb, 300);

    const cancel =
      typeof cancelIdleCallback === "function"
        ? (id: number) => cancelIdleCallback(id)
        : (id: number) => window.clearTimeout(id);

    const id = schedule(() => {
      if (cancelled) return;
      startTransition(() => setLayoutPrewarmed(true));
    });

    return () => {
      cancelled = true;
      cancel(id);
    };
  }, [ready, layoutPrewarmed]);

  return layoutPrewarmed;
}
