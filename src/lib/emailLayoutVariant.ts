import fs from "node:fs";
import path from "node:path";
import type { LayoutManifest, LayoutVariantEntry } from "../layout-variant-contract/types";
import { LAYOUT_MANIFEST_SCHEMA_VERSION } from "../layout-variant-contract/types";
import { isLogicallyDeleted, validateOptionalDeletedAtField } from "./logicalDelete";
import {
  listVisibleLayoutVariants,
  resolveEffectiveLayoutVariantId,
} from "./layoutVariantLogicalDelete";

export const LAYOUT_MANIFEST_FILE = "layout-manifest.json";
export const LAYOUTS_DIR = "layouts";

export type EmailStorageMode = "legacy" | "layout-variants";

export type ResolvedLayoutContext = {
  mode: EmailStorageMode;
  layoutVariantId: string | null;
  templatePath: string;
  tokenPresetsPath: string;
};

export function assertLayoutVariantIdSafe(id: string): string | null {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return "layout 版式 id 仅允许字母、数字、下划线与中划线";
  }
  return null;
}

export function layoutManifestPath(emailBaseDir: string): string {
  return path.join(emailBaseDir, LAYOUT_MANIFEST_FILE);
}

export function layoutVariantDir(emailBaseDir: string, layoutVariantId: string): string {
  return path.join(emailBaseDir, LAYOUTS_DIR, layoutVariantId);
}

export function isLayoutManifestShape(raw: unknown): raw is LayoutManifest {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as LayoutManifest;
  if (m.schemaVersion !== LAYOUT_MANIFEST_SCHEMA_VERSION) return false;
  if (typeof m.activeLayoutVariantId !== "string" || !m.activeLayoutVariantId.trim()) return false;
  if (!Array.isArray(m.variants) || m.variants.length === 0) return false;
  const ids = new Set<string>();
  for (const v of m.variants) {
    if (!v || typeof v !== "object") return false;
    const entry = v as LayoutVariantEntry;
    if (assertLayoutVariantIdSafe(entry.id)) return false;
    if (typeof entry.label !== "string" || !entry.label.trim()) return false;
    if (ids.has(entry.id)) return false;
    ids.add(entry.id);
  }
  if (!ids.has(m.activeLayoutVariantId)) return false;
  const active = m.variants.find((v) => v.id === m.activeLayoutVariantId);
  if (active && isLogicallyDeleted(active)) return false;
  return listVisibleLayoutVariants(m.variants).length > 0;
}

export function validateLayoutManifest(manifest: LayoutManifest): Array<{ path: string; reason: string }> {
  const issues: Array<{ path: string; reason: string }> = [];
  if (!isLayoutManifestShape(manifest)) {
    issues.push({ path: "layout-manifest", reason: "layout-manifest.json 形态不合法" });
    return issues;
  }
  const visible = listVisibleLayoutVariants(manifest.variants);
  if (visible.length < 1) {
    issues.push({ path: "variants", reason: "至少需要一个未逻辑删除的版式变体" });
  }
  const active = manifest.variants.find((v) => v.id === manifest.activeLayoutVariantId);
  if (!active || isLogicallyDeleted(active)) {
    issues.push({
      path: "activeLayoutVariantId",
      reason: "activeLayoutVariantId 须指向未逻辑删除的版式",
    });
  }
  for (const [i, v] of manifest.variants.entries()) {
    if (v.deletedAt !== undefined && v.deletedAt !== null) {
      const issue = validateOptionalDeletedAtField(v.deletedAt, `variants[${i}].deletedAt`);
      if (issue) issues.push(issue);
    }
  }
  return issues;
}

/** 解析本次请求使用的版式 id；legacy 模式返回 null */
export function resolveLayoutVariantId(
  manifest: LayoutManifest | null,
  layoutQuery: string | undefined | null
): { layoutVariantId: string | null; error: string | null } {
  if (!manifest) {
    if (layoutQuery) {
      return { layoutVariantId: null, error: "本场景未启用版式变体，不可指定 layout 参数" };
    }
    return { layoutVariantId: null, error: null };
  }
  const { layoutVariantId, error } = resolveEffectiveLayoutVariantId(manifest, layoutQuery);
  const bad = assertLayoutVariantIdSafe(layoutVariantId);
  if (bad) return { layoutVariantId: null, error: bad };
  return { layoutVariantId, error };
}

export function resolveEmailFilePaths(
  emailBaseDir: string,
  manifest: LayoutManifest | null,
  layoutVariantId: string | null
): ResolvedLayoutContext {
  if (!manifest || !layoutVariantId) {
    return {
      mode: "legacy",
      layoutVariantId: null,
      templatePath: path.join(emailBaseDir, "template.json"),
      tokenPresetsPath: path.join(emailBaseDir, "tokenPresets.json"),
    };
  }
  const variantBase = layoutVariantDir(emailBaseDir, layoutVariantId);
  return {
    mode: "layout-variants",
    layoutVariantId,
    templatePath: path.join(variantBase, "template.json"),
    tokenPresetsPath: path.join(variantBase, "tokenPresets.json"),
  };
}

/**
 * 枚举仓库 data/emails 下全部 template.json（含各场景 layouts/*；无 manifest 时含 legacy 根路径）。
 * 供迁移脚本与批量校验使用；前端 bundle 不引用本函数。
 */
export function enumerateAllEmailTemplatePaths(emailsRoot: string): string[] {
  if (!fs.existsSync(emailsRoot)) return [];
  const paths: string[] = [];
  for (const name of fs.readdirSync(emailsRoot)) {
    if (name.startsWith("_")) continue;
    const base = path.join(emailsRoot, name);
    try {
      if (!fs.statSync(base).isDirectory()) continue;
    } catch {
      continue;
    }
    const manifestFile = layoutManifestPath(base);
    if (fs.existsSync(manifestFile)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")) as LayoutManifest;
        if (isLayoutManifestShape(manifest)) {
          for (const { templatePath } of allLayoutTemplatePaths(base, manifest)) {
            if (fs.existsSync(templatePath)) paths.push(templatePath);
          }
        }
      } catch {
        /* ignore */
      }
      continue;
    }
    const legacy = path.join(base, "template.json");
    if (fs.existsSync(legacy)) paths.push(legacy);
  }
  return paths.sort();
}

/** 场景内全部版式对应的 template 路径（用于 payload 多版式校验） */
export function allLayoutTemplatePaths(
  emailBaseDir: string,
  manifest: LayoutManifest
): Array<{ layoutVariantId: string; templatePath: string }> {
  return manifest.variants.map((v) => ({
    layoutVariantId: v.id,
    templatePath: path.join(layoutVariantDir(emailBaseDir, v.id), "template.json"),
  }));
}
