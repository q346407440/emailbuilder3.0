import type { EmailBlock, EmailTemplate } from "../types/email";
import type { RenderDefaultsContractIssue } from "./types";

export const WRAPPER_BACKGROUND_IMAGE_CHROME_BIND_PATH_PREFIXES = [
  "wrapperStyle.backgroundImage.border",
  "wrapperStyle.backgroundImage.borderRadius",
] as const;

/** 与 rules.ts `forbid.backgroundImageChrome` 一致 */
export const WRAPPER_BACKGROUND_IMAGE_CHROME_FORBIDDEN_REASON =
  "wrapperStyle.backgroundImage.border / borderRadius 已禁止持久化；描边与圆角由外层 wrapperStyle 承接";

function issue(path: string): RenderDefaultsContractIssue {
  return { path, reason: WRAPPER_BACKGROUND_IMAGE_CHROME_FORBIDDEN_REASON };
}

function isChromeBindPath(path: string): boolean {
  return WRAPPER_BACKGROUND_IMAGE_CHROME_BIND_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}.`)
  );
}

function remapChromeBindingKey(bindPath: string): string | null {
  if (bindPath.startsWith("wrapperStyle.backgroundImage.borderRadius")) {
    return bindPath.replace(
      "wrapperStyle.backgroundImage.borderRadius",
      "wrapperStyle.borderRadius"
    );
  }
  if (bindPath.startsWith("wrapperStyle.backgroundImage.border")) {
    return bindPath.replace("wrapperStyle.backgroundImage.border", "wrapperStyle.border");
  }
  return null;
}

function hasWrapperBindingPrefix(
  bindings: Record<string, unknown>,
  prefix: "wrapperStyle.borderRadius" | "wrapperStyle.border"
): boolean {
  return Object.keys(bindings).some((k) => k === prefix || k.startsWith(`${prefix}.`));
}

export function validateForbiddenBackgroundImageChrome(
  template: EmailTemplate
): RenderDefaultsContractIssue[] {
  const issues: RenderDefaultsContractIssue[] = [];
  for (const [id, block] of Object.entries(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    const bg = block.wrapperStyle?.backgroundImage;
    if (bg && typeof bg === "object" && !Array.isArray(bg)) {
      const rec = bg as Record<string, unknown>;
      if ("border" in rec) {
        issues.push(issue(`blocks.${id}.wrapperStyle.backgroundImage.border`));
      }
      if ("borderRadius" in rec) {
        issues.push(issue(`blocks.${id}.wrapperStyle.backgroundImage.borderRadius`));
      }
    }
    if (block.bindings) {
      for (const bindPath of Object.keys(block.bindings)) {
        if (isChromeBindPath(bindPath)) {
          issues.push(issue(`blocks.${id}.bindings.${bindPath}`));
        }
      }
    }
  }
  return issues;
}

export function stripForbiddenBackgroundImageChromeFromBlock(block: EmailBlock): boolean {
  let changed = false;
  const ws = block.wrapperStyle;
  const bg = ws?.backgroundImage;

  if (bg && typeof bg === "object" && !Array.isArray(bg)) {
    const rec = { ...(bg as Record<string, unknown>) };
    if ("borderRadius" in rec) {
      if (!ws?.borderRadius && rec.borderRadius !== undefined) {
        block.wrapperStyle = { ...ws, borderRadius: rec.borderRadius as typeof ws.borderRadius };
        changed = true;
      }
      delete rec.borderRadius;
      block.wrapperStyle = { ...block.wrapperStyle, backgroundImage: rec as typeof bg };
      changed = true;
    }
    if ("border" in rec) {
      if (!block.wrapperStyle?.border && rec.border !== undefined) {
        block.wrapperStyle = {
          ...block.wrapperStyle,
          border: rec.border as typeof ws.border,
        };
        changed = true;
      }
      const nextBg = { ...(block.wrapperStyle?.backgroundImage as Record<string, unknown>) };
      delete nextBg.border;
      block.wrapperStyle = { ...block.wrapperStyle, backgroundImage: nextBg as typeof bg };
      changed = true;
    }
  }

  if (block.bindings && typeof block.bindings === "object") {
    const nextBindings = { ...block.bindings };
    let bindingsChanged = false;
    for (const bindPath of Object.keys(block.bindings)) {
      if (!isChromeBindPath(bindPath)) continue;
      const remapped = remapChromeBindingKey(bindPath);
      if (remapped) {
        const targetPrefix = remapped.startsWith("wrapperStyle.borderRadius")
          ? "wrapperStyle.borderRadius"
          : "wrapperStyle.border";
        if (
          !hasWrapperBindingPrefix(nextBindings, targetPrefix) &&
          !(remapped in nextBindings)
        ) {
          nextBindings[remapped] = block.bindings[bindPath];
        }
      }
      delete nextBindings[bindPath];
      bindingsChanged = true;
    }
    if (bindingsChanged) {
      block.bindings = nextBindings;
      changed = true;
    }
  }

  return changed;
}

export function stripForbiddenBackgroundImageChromeFromTemplate(template: EmailTemplate): boolean {
  let changed = false;
  for (const block of Object.values(template.blocks)) {
    if (!block || typeof block !== "object") continue;
    if (stripForbiddenBackgroundImageChromeFromBlock(block)) changed = true;
  }
  return changed;
}
