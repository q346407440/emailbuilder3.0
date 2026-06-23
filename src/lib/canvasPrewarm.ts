import { measureGridRowContentMaxHeights } from "./gridContentMaxHeight";

export type CanvasPrewarmOptions = {
  timeoutMs?: number;
  stableFrames?: number;
  signal?: AbortSignal;
};

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const id = window.setTimeout(() => resolve(), ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        resolve();
      },
      { once: true }
    );
  });
}

async function decodeScopeImages(scopeEl: HTMLElement): Promise<void> {
  const imgs = Array.from(scopeEl.querySelectorAll<HTMLImageElement>("img[src]"));
  await Promise.allSettled(
    imgs.map((img) => {
      if (typeof img.decode === "function") {
        return img.decode();
      }
      return Promise.resolve();
    })
  );
}

function collectGridHostTables(scopeEl: HTMLElement): HTMLTableElement[] {
  return Array.from(scopeEl.querySelectorAll<HTMLTableElement>("table[data-email-preview-grid-host]"));
}

async function waitGridLayoutsStable(
  scopeEl: HTMLElement,
  stableFrames: number,
  signal?: AbortSignal
): Promise<void> {
  const hosts = collectGridHostTables(scopeEl);
  if (!hosts.length) return;

  let stablePasses = 0;
  let prevSignature = "";

  while (stablePasses < stableFrames) {
    if (signal?.aborted) return;
    await nextFrame();
    const signature = hosts
      .map((host) => measureGridRowContentMaxHeights(host).join(","))
      .join("|");
    if (signature === prevSignature && signature.length > 0) {
      stablePasses += 1;
    } else {
      stablePasses = 0;
      prevSignature = signature;
    }
  }
}

/**
 * 版式加载后预热画布 DOM：强制 paint、decode 图片、等待 grid 测高稳定。
 * 超时或 abort 后仍 resolve（不阻断编辑）。
 */
export async function prewarmCanvasScope(
  scopeEl: HTMLElement | null,
  options: CanvasPrewarmOptions = {}
): Promise<void> {
  const { timeoutMs = 2000, stableFrames = 2, signal } = options;
  if (!scopeEl || signal?.aborted) return;

  const run = async () => {
    await nextFrame();
    await nextFrame();
    if (signal?.aborted) return;
    await decodeScopeImages(scopeEl);
    if (signal?.aborted) return;
    await waitGridLayoutsStable(scopeEl, stableFrames, signal);
  };

  await Promise.race([run(), sleep(timeoutMs, signal)]);
}
