import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { watch, type FSWatcher } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectRootEnvFile } from "./loadEnvFile";
import type { EmailMeta, EmailPayload, EmailTemplate } from "../src/types/email";
import type { TokenPresets } from "../src/types/tokenPreset";
import {
  assertEmailKeySafe,
  blockingValidationIssues,
  validatePayloadAgainstTemplate,
  validateTemplate,
} from "../src/lib/validate";
import {
  parseTemplateFromDisk,
  readTemplateGraphFromDiskRaw,
  serializeTemplateToDisk,
  validateTemplateFromDisk,
} from "../src/lib/templateTreeAdapter";
import type { NestedEmailTemplate } from "../src/template-disk-contract";
import { isBuiltinCollectionCatalogId } from "../src/payload-contract/collection-data-source";
import { getBuiltinCatalogItems } from "../src/lib/builtinCollectionCatalog";
import type { LayoutManifest } from "../src/layout-variant-contract/types";
import { resolveEmailFilePaths } from "../src/lib/emailLayoutVariant";
import {
  allLayoutTemplatePaths,
  emailBaseDir,
  layoutManifestPath,
  readLayoutManifestOptional,
  resolveEmailLayoutContext,
  type ResolvedLayoutContext,
} from "./emailLayoutContext";
import { getSmtpPublicStatus, sendSmtpTestMail } from "./smtpTestMail";
import {
  buildBlankLayoutVariantAssets,
  buildNewEmailScaffold,
  deriveEmailKeyFromDisplayName,
} from "../src/lib/scaffoldNewEmail";
import {
  buildClonedEmailSceneBundle,
  collectCloneEmailSceneValidationIssues,
  type CloneEmailSceneBundle,
} from "../src/lib/cloneEmailScene";
import { listVisibleLayoutVariants } from "../src/lib/layoutVariantLogicalDelete";
import {
  appendLayoutVariant,
  deriveLayoutVariantIdFromLabel,
  updateLayoutVariantLabel,
  updateLayoutVariantPublishStatus,
} from "../src/lib/layoutVariantOps";
import { DEFAULT_PUBLISH_STATUS } from "../src/publish-status-contract";
import { validatePublishStatusField } from "../src/publish-status-contract/validate";
import {
  checkCampaignV2SavedBinding,
  listCampaignV2PublishedLayouts,
  listCampaignV2PublishedTemplates,
} from "./campaignV2Mock";
import {
  assertLayoutVariantIdSafe,
  layoutVariantDir,
} from "../src/lib/emailLayoutVariant";
import {
  parseSceneQuery,
  ensureSceneCollectionPresetsWatcher,
  findSceneCollectionPresetById,
  listSceneCollectionPresetSummaries,
  resolveSceneCollectionPresetRuntimeValues,
} from "./sceneCollectionPresetsStore";
import { listSceneScalarPresetSummaries } from "./sceneScalarPresetsStore";
import { requireLayoutManifest } from "./ensureLayoutManifest";
import { enrichLayoutManifestCreatedAt, statCreatedAtIso } from "./enrichLayoutManifest";
import {
  resolveEmailListCreatedAt,
  sortEmailItemsByCreatedDesc,
} from "../src/lib/emailCatalogSort";
import { createDefaultTokenPresets } from "../src/lib/defaultTokenPresets";
import { normalizePublishStatus } from "../src/lib/emailPublishStatus";
import { isLogicallyDeleted, logicalDeleteTimestamp } from "../src/lib/logicalDelete";
import { normalizePersistedEmailMeta } from "../src/meta-contract/normalize";
import { validateSchemaArtifact, type SchemaArtifactId } from "../src/schema-registry";
import { buildRepeatPreviewModel, previewModelToFlatTemplate } from "../src/repeat-runtime";
import { applyVisibilityRules } from "../src/lib/visibility";
import { softDeleteLayoutVariant } from "../src/lib/layoutVariantLogicalDelete";
import { createPipelineProgressReporter } from "../src/lib/ai-pipeline/ports/PipelineProgressReporter";
import { parseMjsGenerateMode } from "../src/layout-variant-ai-contract/mjsGenerateMode";
import {
  generateLayoutVariantFromDesignImage,
  validateDesignImageBuffer,
} from "./layoutVariantAiFromImage";
import { persistNewLayoutVariantOnDisk } from "./persistLayoutVariant";
import {
  getBlockMaster,
  listBlockMasters,
  putBlockMasterInsertPrototype,
} from "./blockMastersStore";
import {
  createSectionMaster,
  deleteSectionMaster,
  getSectionMaster,
  listSectionMasters,
  updateSectionMasterName,
} from "./sectionMastersStore";
import type { SectionMaster } from "../src/types/master";
import type { BlockInsertPrototype } from "../src/block-insert-default-contract";
import { BLOCK_CATALOG_ENTRIES } from "../src/lib/blockDefaults";
import { isPexelsApiKeyConfigured } from "../src/lib/pexelsClient";
import {
  isProjectIconUploadFile,
  isProjectImageUploadFile,
  PROJECT_ICON_UPLOAD_MAX_BYTES,
  PROJECT_IMAGE_UPLOAD_MAX_BYTES,
} from "../src/lib/projectAssetUpload";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
loadProjectRootEnvFile(projectRoot);
const DATA_ROOT =
  process.env.EMAIL_DATA_ROOT ?? path.join(projectRoot, "data", "emails");
const TOKEN_PRESET_ROOT =
  process.env.EMAIL_TOKEN_PRESET_ROOT ?? path.join(projectRoot, "data", "token-presets");
const PROJECT_ASSETS_ROOT =
  process.env.EMAIL_PROJECT_ASSETS_ROOT ?? path.join(projectRoot, "data", "project-assets");
const ICON_UPLOAD_DIR = path.join(PROJECT_ASSETS_ROOT, "icons", "uploads");
const IMAGE_UPLOAD_DIR = path.join(PROJECT_ASSETS_ROOT, "images", "uploads");
const ICON_MANIFEST_PATH = path.join(PROJECT_ASSETS_ROOT, "icons", "manifest.json");

type EmailsChangedEvent =
  | { kind: "list_changed"; reason: string }
  | { kind: "email_changed"; reason: string; emailKey: string }
  | { kind: "token_preset_changed"; reason: string; presetId: string };
type EmailsChangedSubscriber = (event: EmailsChangedEvent) => void;
const emailsChangedSubscribers = new Set<EmailsChangedSubscriber>();
let emailsWatcher: FSWatcher | null = null;
let tokenPresetsWatcher: FSWatcher | null = null;
let emailsChangedDebounceTimer: NodeJS.Timeout | null = null;
let tokenPresetsChangedDebounceTimer: NodeJS.Timeout | null = null;
let pendingEmailsChangedReason = "filesystem";
const pendingEmailsChangedKeys = new Set<string>();
const pendingTokenPresetChangedIds = new Set<string>();
let pendingEmailsChangedUnknown = false;
let pendingTokenPresetsChangedUnknown = false;

function notifyEmailsChanged(event: EmailsChangedEvent): void {
  emailsChangedSubscribers.forEach((subscriber) => {
    try {
      subscriber(event);
    } catch {
      /* 单个订阅者异常不影响其他订阅者 */
    }
  });
}

function parseEmailKeyFromWatchPath(filePath: string): string | undefined {
  const normalized = filePath.replaceAll("\\", "/").trim();
  if (!normalized) return undefined;
  const firstSegment = normalized.split("/")[0]?.trim();
  if (!firstSegment || firstSegment.startsWith("_")) return undefined;
  return firstSegment;
}

function parseTokenPresetIdFromWatchPath(filePath: string): string | undefined {
  const normalized = filePath.replaceAll("\\", "/").trim();
  if (!normalized || !normalized.endsWith(".json")) return undefined;
  const firstSegment = normalized.split("/")[0]?.trim();
  if (!firstSegment || firstSegment.startsWith("_")) return undefined;
  return path.basename(firstSegment, ".json");
}

function flushPendingEmailsChanged(): void {
  const reason = pendingEmailsChangedReason;
  const keys = [...pendingEmailsChangedKeys];
  const hasUnknown = pendingEmailsChangedUnknown || keys.length === 0;
  pendingEmailsChangedReason = "filesystem";
  pendingEmailsChangedKeys.clear();
  pendingEmailsChangedUnknown = false;
  if (hasUnknown) notifyEmailsChanged({ kind: "list_changed", reason });
  keys.forEach((emailKey) => {
    notifyEmailsChanged({ kind: "email_changed", reason, emailKey });
    notifyEmailsChanged({ kind: "list_changed", reason });
  });
}

function flushPendingTokenPresetsChanged(): void {
  const ids = [...pendingTokenPresetChangedIds];
  const hasUnknown = pendingTokenPresetsChangedUnknown || ids.length === 0;
  pendingTokenPresetChangedIds.clear();
  pendingTokenPresetsChangedUnknown = false;
  if (hasUnknown) {
    notifyEmailsChanged({ kind: "list_changed", reason: "token_preset_filesystem" });
  }
  ids.forEach((presetId) => {
    notifyEmailsChanged({ kind: "token_preset_changed", reason: "token_preset_filesystem", presetId });
  });
}

function scheduleEmailsChanged(reason: string, emailKey?: string): void {
  pendingEmailsChangedReason = reason;
  if (emailKey) pendingEmailsChangedKeys.add(emailKey);
  else pendingEmailsChangedUnknown = true;
  if (emailsChangedDebounceTimer) clearTimeout(emailsChangedDebounceTimer);
  emailsChangedDebounceTimer = setTimeout(() => {
    emailsChangedDebounceTimer = null;
    flushPendingEmailsChanged();
  }, 120);
}

function scheduleTokenPresetsChanged(presetId?: string): void {
  if (presetId) pendingTokenPresetChangedIds.add(presetId);
  else pendingTokenPresetsChangedUnknown = true;
  if (tokenPresetsChangedDebounceTimer) clearTimeout(tokenPresetsChangedDebounceTimer);
  tokenPresetsChangedDebounceTimer = setTimeout(() => {
    tokenPresetsChangedDebounceTimer = null;
    flushPendingTokenPresetsChanged();
  }, 120);
}

function ensureEmailsWatcher(): void {
  if (emailsWatcher) return;
  try {
    emailsWatcher = watch(DATA_ROOT, { recursive: true }, (_eventType, fileName) => {
      const normalizedFileName =
        typeof fileName === "string" ? fileName.replaceAll("\\", "/") : "";
      const emailKey = parseEmailKeyFromWatchPath(normalizedFileName);
      scheduleEmailsChanged("filesystem", emailKey);
    });
    emailsWatcher.on("error", () => {
      emailsWatcher?.close();
      emailsWatcher = null;
    });
  } catch {
    emailsWatcher = null;
  }
}

function ensureTokenPresetsWatcher(): void {
  if (tokenPresetsWatcher) return;
  try {
    tokenPresetsWatcher = watch(TOKEN_PRESET_ROOT, { recursive: false }, (_eventType, fileName) => {
      const normalizedFileName =
        typeof fileName === "string" ? fileName.replaceAll("\\", "/") : "";
      const presetId = parseTokenPresetIdFromWatchPath(normalizedFileName);
      scheduleTokenPresetsChanged(presetId);
    });
    tokenPresetsWatcher.on("error", () => {
      tokenPresetsWatcher?.close();
      tokenPresetsWatcher = null;
    });
  } catch {
    tokenPresetsWatcher = null;
  }
}

async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw e;
  }
}

async function statMtimeMs(filePath: string): Promise<number> {
  try {
    const st = await fs.stat(filePath);
    return st.mtimeMs;
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return 0;
    throw e;
  }
}

type LayoutResolveResult =
  | {
      ok: true;
      base: string;
      manifest: LayoutManifest;
      ctx: ResolvedLayoutContext;
    }
  | { ok: false; message: string; status: 400 | 404 };

async function resolveLayoutForEmail(
  emailKey: string,
  layoutQuery: string | undefined
): Promise<LayoutResolveResult> {
  const base = emailBaseDir(DATA_ROOT, emailKey);
  const meta = await readJson<EmailMeta>(path.join(base, "meta.json"));
  if (meta && isLogicallyDeleted(meta)) {
    return {
      ok: false,
      message: "该邮件模板已逻辑删除，可在 meta.json 中删除 deletedAt 字段恢复",
      status: 404,
    };
  }
  const resolved = await resolveEmailLayoutContext(readJson, base, layoutQuery);
  if (!resolved.ok) {
    return { ok: false, message: resolved.message, status: resolved.status };
  }
  return { ok: true, base, manifest: resolved.manifest, ctx: resolved.ctx };
}

async function emailHasTemplateFiles(base: string, manifest: LayoutManifest): Promise<boolean> {
  for (const { templatePath } of allLayoutTemplatePaths(base, manifest)) {
    if (await readJson(templatePath)) return true;
  }
  return false;
}

function validateSchemaArtifactShape(
  artifactId: SchemaArtifactId,
  raw: unknown,
  messageLabel: string
): ValidationIssueResponse | null {
  const issues = validateSchemaArtifact(artifactId, raw);
  return issues.length ? { message: messageLabel, details: issues } : null;
}

function validateTokenPresetsShape(tokenPresets: TokenPresets): ValidationIssueResponse | null {
  return validateSchemaArtifactShape("tokenPresets", tokenPresets, "样式预设校验失败");
}

function validatePayloadShapeOnDisk(payload: unknown): ValidationIssueResponse | null {
  return validateSchemaArtifactShape("payload", payload, "payload.json 形态校验失败");
}

function validateLayoutManifestOnDisk(manifest: unknown): ValidationIssueResponse | null {
  return validateSchemaArtifactShape("layoutManifest", manifest, "版式清单校验失败");
}

type ValidationIssueResponse = {
  message: string;
  details: Array<{ path: string; reason: string }>;
};

function assertResourceIdSafe(id: string, label: string): string | null {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return `${label} 仅允许英文字母、数字、下划线与中划线`;
  }
  return null;
}

/** block 母版 masterId（如 content.text）允许点号，与 data/masters/blocks 文件名一致。 */
function assertBlockMasterIdSafe(masterId: string): string | null {
  if (!masterId || !/^[a-zA-Z0-9._-]+$/.test(masterId) || masterId.includes("..")) {
    return "masterId 仅允许英文字母、数字、点号、下划线与中划线";
  }
  return null;
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: [
      "http://127.0.0.1:5180",
      "http://localhost:5180",
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ],
  })
);

app.get("/api/v1/emails", async (c) => {
  let names: string[] = [];
  try {
    names = await fs.readdir(DATA_ROOT, { withFileTypes: true }).then((ents) =>
      ents.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name)
    );
  } catch {
    return c.json({ items: [] });
  }

  const items = await Promise.all(
    names.map(async (emailKey) => {
      const base = path.join(DATA_ROOT, emailKey);
      const metaPath = path.join(base, "meta.json");
      const manifest = await readLayoutManifestOptional(readJson, base);
      if (!manifest) return null;
      const layoutResolved = resolveEmailFilePaths(base, manifest, manifest.activeLayoutVariantId);
      const templatePath = layoutResolved.templatePath;
      const payloadPath = path.join(base, "payload.json");
      const tokenPresetsPath = layoutResolved.tokenPresetsPath;
      const meta = await readJson<EmailMeta>(metaPath);
      if (meta && isLogicallyDeleted(meta)) return null;
      const templateRaw = await readJson<NestedEmailTemplate>(templatePath);
      const [templateMtimeMs, payloadMtimeMs, metaMtimeMs, tokenPresetsMtimeMs] = await Promise.all([
        statMtimeMs(templatePath),
        statMtimeMs(payloadPath),
        statMtimeMs(metaPath),
        statMtimeMs(tokenPresetsPath),
      ]);
      const metaUpdatedAtMs =
        typeof meta?.updatedAt === "string" ? Number(Date.parse(meta.updatedAt)) : NaN;
      const effectiveUpdatedAtMs = Math.max(
        Number.isFinite(metaUpdatedAtMs) ? metaUpdatedAtMs : 0,
        templateMtimeMs,
        payloadMtimeMs,
        metaMtimeMs,
        tokenPresetsMtimeMs
      );
      const dirCreatedAt =
        (await statCreatedAtIso(base)) ?? (await statCreatedAtIso(metaPath));
      const createdAt = resolveEmailListCreatedAt(meta?.createdAt, dirCreatedAt);
      return {
        emailKey,
        displayName: meta?.displayName ?? emailKey,
        publishStatus: normalizePublishStatus(meta?.publishStatus),
        templateId: templateRaw?.templateId ?? emailKey,
        templateVersion: templateRaw?.templateVersion ?? 1,
        hasPayload: payloadMtimeMs > 0,
        hasTokenPresets: tokenPresetsMtimeMs > 0,
        hasLayoutVariants: Boolean(manifest),
        activeLayoutVariantId: manifest?.activeLayoutVariantId,
        createdAt,
        updatedAt: effectiveUpdatedAtMs > 0 ? new Date(effectiveUpdatedAtMs).toISOString() : undefined,
      };
    })
  );
  const filtered = items.filter((item): item is NonNullable<typeof item> => item != null);
  return c.json({ items: sortEmailItemsByCreatedDesc(filtered) });
});

/** Mock：商家邮件活动 V2 — 已发布模板列表 */
app.get("/api/v1/crm/campaign-v2/templates", async (c) => {
  const items = await listCampaignV2PublishedTemplates(DATA_ROOT, readJson);
  return c.json({ items });
});

/** Mock：商家邮件活动 V2 — 指定模板下已发布版式列表 */
app.get("/api/v1/crm/campaign-v2/templates/:emailKey/layouts", async (c) => {
  const emailKey = c.req.param("emailKey");
  const { items, error } = await listCampaignV2PublishedLayouts(DATA_ROOT, emailKey, readJson);
  if (error) {
    const code = error.includes("未发布") ? "NOT_FOUND" : "VALIDATION_FAILED";
    return c.json({ error: { code, message: error } }, code === "NOT_FOUND" ? 404 : 400);
  }
  return c.json({ items });
});

/** Mock：活动已保存的 template + layout 绑定是否仍可用 */
app.get("/api/v1/crm/campaign-v2/templates/:emailKey/binding-check", async (c) => {
  const emailKey = c.req.param("emailKey");
  const layoutVariantId = (c.req.query("layout") ?? "").trim();
  if (!layoutVariantId) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "query layout 必填" } },
      400
    );
  }
  const result = await checkCampaignV2SavedBinding(DATA_ROOT, emailKey, layoutVariantId, readJson);
  return c.json(result);
});

async function persistEmailSceneBundle(
  emailDir: string,
  bundle: CloneEmailSceneBundle | ReturnType<typeof buildNewEmailScaffold>
): Promise<void> {
  await fs.mkdir(emailDir, { recursive: true });
  await atomicWriteJson(layoutManifestPath(emailDir), bundle.layoutManifest);
  await atomicWriteJson(path.join(emailDir, "payload.json"), bundle.payload);
  await atomicWriteJson(path.join(emailDir, "meta.json"), bundle.meta);

  if ("layoutAssets" in bundle && Array.isArray(bundle.layoutAssets)) {
    for (const asset of bundle.layoutAssets) {
      const layoutDir = layoutVariantDir(emailDir, asset.layoutVariantId);
      await fs.mkdir(layoutDir, { recursive: true });
      await atomicWriteJson(
        path.join(layoutDir, "template.json"),
        serializeTemplateToDisk(asset.template)
      );
      await atomicWriteJson(path.join(layoutDir, "tokenPresets.json"), asset.tokenPresets);
    }
    return;
  }

  const scaffold = bundle as ReturnType<typeof buildNewEmailScaffold>;
  const layoutDir = path.join(emailDir, "layouts", "default");
  await fs.mkdir(layoutDir, { recursive: true });
  await atomicWriteJson(path.join(layoutDir, "template.json"), serializeTemplateToDisk(scaffold.template));
  await atomicWriteJson(path.join(layoutDir, "tokenPresets.json"), scaffold.tokenPresets);
}

app.post("/api/v1/emails", async (c) => {
  let body: { displayName?: unknown; emailKey?: unknown; copyFromEmailKey?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }

  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "displayName 必须为非空字符串" } },
      400
    );
  }

  const copyFromEmailKey =
    typeof body.copyFromEmailKey === "string" ? body.copyFromEmailKey.trim() : "";
  if (copyFromEmailKey) {
    const sourceKeyBad = assertEmailKeySafe(copyFromEmailKey);
    if (sourceKeyBad) {
      return c.json({ error: { code: "VALIDATION_FAILED", message: sourceKeyBad } }, 400);
    }
  }

  let existingKeys: string[] = [];
  try {
    existingKeys = await fs.readdir(DATA_ROOT, { withFileTypes: true }).then((ents) =>
      ents.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name)
    );
  } catch {
    existingKeys = [];
  }

  const requestedKey =
    typeof body.emailKey === "string" && body.emailKey.trim() ? body.emailKey.trim() : null;
  const emailKey =
    requestedKey ?? deriveEmailKeyFromDisplayName(displayName, existingKeys);
  const keyBad = assertEmailKeySafe(emailKey);
  if (keyBad) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: keyBad } }, 400);
  }
  if (existingKeys.includes(emailKey)) {
    return c.json(
      { error: { code: "CONFLICT", message: `模板标识「${emailKey}」已存在` } },
      409
    );
  }

  const emailDir = emailBaseDir(DATA_ROOT, emailKey);
  try {
    await fs.access(emailDir);
    return c.json(
      { error: { code: "CONFLICT", message: `模板目录「${emailKey}」已存在` } },
      409
    );
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw e;
  }

  if (copyFromEmailKey) {
    const sourceBase = emailBaseDir(DATA_ROOT, copyFromEmailKey);
    try {
      await fs.access(sourceBase);
    } catch (e: unknown) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return c.json(
          { error: { code: "NOT_FOUND", message: `源模板「${copyFromEmailKey}」不存在` } },
          404
        );
      }
      throw e;
    }

    let sourceManifest: LayoutManifest;
    try {
      sourceManifest = await requireLayoutManifest(sourceBase, readJson);
    } catch (e) {
      return c.json(
        { error: { code: "NOT_FOUND", message: e instanceof Error ? e.message : String(e) } },
        404
      );
    }

    const sourceMetaRaw = await readJson<EmailMeta>(path.join(sourceBase, "meta.json"));
    if (!sourceMetaRaw || isLogicallyDeleted(sourceMetaRaw)) {
      return c.json(
        { error: { code: "NOT_FOUND", message: `源模板「${copyFromEmailKey}」不可用` } },
        404
      );
    }
    const sourceMeta = normalizePersistedEmailMeta(
      sourceMetaRaw as Record<string, unknown>
    ) as EmailMeta;

    const sourcePayload =
      (await readJson<EmailPayload>(path.join(sourceBase, "payload.json"))) ?? {
        schemaVersion: "1.0.0",
        slots: {},
        values: {},
      };
    const payloadShapeIssue = validatePayloadShapeOnDisk(sourcePayload);
    if (payloadShapeIssue) {
      return c.json({ error: { code: "VALIDATION_FAILED", ...payloadShapeIssue } }, 422);
    }

    const visibleVariants = listVisibleLayoutVariants(sourceManifest.variants);
    const layouts: CloneEmailSceneBundle["layoutAssets"] = [];
    for (const variant of visibleVariants) {
      const ctx = resolveEmailFilePaths(sourceBase, sourceManifest, variant.id);
      const copiedRaw = await readJson<NestedEmailTemplate>(ctx.templatePath);
      if (!copiedRaw) {
        return c.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `源版式「${variant.id}」的 template.json 不存在`,
            },
          },
          404
        );
      }
      const templateIssues = blockingValidationIssues(validateTemplateFromDisk(copiedRaw));
      if (templateIssues.length) {
        return c.json(
          {
            error: {
              code: "VALIDATION_FAILED",
              message: `源版式「${variant.id}」模板校验失败，无法复制场景`,
              details: templateIssues,
            },
          },
          422
        );
      }
      let tokenPresets =
        (await readJson<TokenPresets>(ctx.tokenPresetsPath)) ?? createDefaultTokenPresets();
      const tokenIssue = validateTokenPresetsShape(tokenPresets);
      if (tokenIssue) {
        return c.json({ error: { code: "VALIDATION_FAILED", ...tokenIssue } }, 422);
      }
      layouts.push({
        layoutVariantId: variant.id,
        template: readTemplateGraphFromDiskRaw(copiedRaw),
        tokenPresets,
      });
    }

    const built = buildClonedEmailSceneBundle({
      sourceEmailKey: copyFromEmailKey,
      targetEmailKey: emailKey,
      displayName,
      meta: sourceMeta,
      payload: sourcePayload,
      manifest: sourceManifest,
      layouts,
    });
    if ("error" in built) {
      return c.json({ error: { code: "VALIDATION_FAILED", message: built.error } }, 422);
    }

    const cloneIssues = blockingValidationIssues(collectCloneEmailSceneValidationIssues(built));
    if (cloneIssues.length) {
      return c.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "复制模板校验失败",
            details: cloneIssues,
          },
        },
        422
      );
    }

    await persistEmailSceneBundle(emailDir, built);
    scheduleEmailsChanged("api_create", emailKey);
    return c.json({ emailKey, displayName: built.meta.displayName }, 201);
  }

  const bundle = buildNewEmailScaffold(emailKey, displayName);
  const templateIssues = blockingValidationIssues(validateTemplate(bundle.template));
  if (templateIssues.length) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "新建模板结构校验失败",
          details: templateIssues,
        },
      },
      422
    );
  }
  const tokenIssue = validateTokenPresetsShape(bundle.tokenPresets);
  if (tokenIssue) {
    return c.json({ error: { code: "VALIDATION_FAILED", ...tokenIssue } }, 422);
  }
  const payloadIssues = blockingValidationIssues(
    validatePayloadAgainstTemplate(bundle.template, bundle.payload)
  );
  if (payloadIssues.length) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "新建模板 payload 校验失败",
          details: payloadIssues,
        },
      },
      422
    );
  }

  await persistEmailSceneBundle(emailDir, bundle);
  scheduleEmailsChanged("api_create", emailKey);
  return c.json({ emailKey, displayName: bundle.meta.displayName }, 201);
});

app.get("/api/v1/token-presets", async (c) => {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(TOKEN_PRESET_ROOT).then((names) =>
      names.filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    );
  } catch {
    return c.json({ items: [] });
  }

  const items = await Promise.all(
    entries.map(async (fileName) => {
      const presetId = path.basename(fileName, ".json");
      const tokenPresets = await readJson<TokenPresets>(path.join(TOKEN_PRESET_ROOT, fileName));
      return {
        presetId,
        name: tokenPresets?.presets[tokenPresets.activePresetId]?.label ?? presetId,
        tokenPresets,
      };
    })
  );
  return c.json({
    items: items.filter((item) => item.tokenPresets && !isLogicallyDeleted(item.tokenPresets)),
  });
});

app.get("/api/v1/token-presets/:presetId", async (c) => {
  const presetId = c.req.param("presetId");
  const bad = assertResourceIdSafe(presetId, "presetId");
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const tokenPresets = await readJson<TokenPresets>(path.join(TOKEN_PRESET_ROOT, `${presetId}.json`));
  if (!tokenPresets) return c.json({ error: { code: "NOT_FOUND", message: "全局样式预设不存在" } }, 404);
  const issue = validateTokenPresetsShape(tokenPresets);
  if (issue) return c.json({ error: { code: "VALIDATION_FAILED", ...issue } }, 422);
  return c.json(tokenPresets);
});

app.put("/api/v1/token-presets/:presetId", async (c) => {
  const presetId = c.req.param("presetId");
  const bad = assertResourceIdSafe(presetId, "presetId");
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  let body: TokenPresets;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  const issue = validateTokenPresetsShape(body);
  if (issue) return c.json({ error: { code: "VALIDATION_FAILED", ...issue } }, 422);
  await atomicWriteJson(path.join(TOKEN_PRESET_ROOT, `${presetId}.json`), body);
  notifyEmailsChanged({ kind: "token_preset_changed", reason: "api_write", presetId });
  return c.body(null, 204);
});

app.delete("/api/v1/token-presets/:presetId", async (c) => {
  const presetId = c.req.param("presetId");
  const bad = assertResourceIdSafe(presetId, "presetId");
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const filePath = path.join(TOKEN_PRESET_ROOT, `${presetId}.json`);
  const tokenPresets = await readJson<TokenPresets>(filePath);
  if (!tokenPresets) {
    return c.json({ error: { code: "NOT_FOUND", message: "全局样式预设不存在" } }, 404);
  }
  if (isLogicallyDeleted(tokenPresets)) {
    return c.json({ error: { code: "CONFLICT", message: "该公共样式预设已逻辑删除" } }, 409);
  }
  const body: TokenPresets = { ...tokenPresets, deletedAt: logicalDeleteTimestamp() };
  const issue = validateTokenPresetsShape(body);
  if (issue) return c.json({ error: { code: "VALIDATION_FAILED", ...issue } }, 422);
  await atomicWriteJson(filePath, body);
  notifyEmailsChanged({ kind: "token_preset_changed", reason: "api_delete", presetId });
  return c.body(null, 204);
});

app.get("/api/v1/masters/blocks", async (c) => {
  const items = await listBlockMasters(projectRoot);
  return c.json({ items });
});

app.get("/api/v1/masters/blocks/:masterId", async (c) => {
  const masterId = c.req.param("masterId");
  const bad = assertBlockMasterIdSafe(masterId);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const master = await getBlockMaster(projectRoot, masterId);
  if (!master) {
    return c.json({ error: { code: "NOT_FOUND", message: "组件母版不存在" } }, 404);
  }
  return c.json(master);
});

app.put("/api/v1/masters/blocks/:masterId/insert-default", async (c) => {
  const masterId = c.req.param("masterId");
  const bad = assertBlockMasterIdSafe(masterId);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  let body: BlockInsertPrototype;
  try {
    body = (await c.req.json()) as BlockInsertPrototype;
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "body 须为对象" } }, 400);
  }
  if (!body.props || typeof body.props !== "object" || Array.isArray(body.props)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "props 须为对象" } }, 400);
  }
  if (
    !body.wrapperStyle ||
    typeof body.wrapperStyle !== "object" ||
    Array.isArray(body.wrapperStyle)
  ) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "wrapperStyle 须为对象" } }, 400);
  }
  try {
    const master = await putBlockMasterInsertPrototype(projectRoot, masterId, body);
    const entry = BLOCK_CATALOG_ENTRIES.find((e) => e.masterId === masterId);
    return c.json({
      master,
      componentLabel: entry?.name ?? master.name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: { code: "VALIDATION_FAILED", message: msg } }, 422);
  }
});

app.get("/api/v1/masters/sections", async (c) => {
  const items = await listSectionMasters(projectRoot);
  return c.json({ items });
});

app.get("/api/v1/masters/sections/:masterId", async (c) => {
  const masterId = c.req.param("masterId");
  const bad = assertBlockMasterIdSafe(masterId);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const master = await getSectionMaster(projectRoot, masterId);
  if (!master) {
    return c.json({ error: { code: "NOT_FOUND", message: "模块不存在" } }, 404);
  }
  return c.json(master);
});

app.post("/api/v1/masters/sections", async (c) => {
  let body: SectionMaster;
  try {
    body = (await c.req.json()) as SectionMaster;
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "body 须为对象" } }, 400);
  }
  const bad = assertBlockMasterIdSafe(body.masterId ?? "");
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  if (!body.name?.trim()) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "name 为必填" } }, 400);
  }
  if (!body.rootBlockId || !body.blocks || !body.catalogRootBlockId) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "模块结构不完整" } }, 400);
  }
  try {
    const master = await createSectionMaster(projectRoot, body);
    return c.json(master, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("已存在") ? 409 : 422;
    return c.json({ error: { code: "VALIDATION_FAILED", message: msg } }, status);
  }
});

app.patch("/api/v1/masters/sections/:masterId", async (c) => {
  const masterId = c.req.param("masterId");
  const bad = assertBlockMasterIdSafe(masterId);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  let body: { name?: string };
  try {
    body = (await c.req.json()) as { name?: string };
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  if (!body?.name?.trim()) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "name 为必填" } }, 400);
  }
  try {
    const master = await updateSectionMasterName(projectRoot, masterId, body.name);
    return c.json(master);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("不存在") ? 404 : 422;
    return c.json({ error: { code: "VALIDATION_FAILED", message: msg } }, status);
  }
});

app.delete("/api/v1/masters/sections/:masterId", async (c) => {
  const masterId = c.req.param("masterId");
  const bad = assertBlockMasterIdSafe(masterId);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  try {
    await deleteSectionMaster(projectRoot, masterId);
    return c.body(null, 204);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: { code: "NOT_FOUND", message: msg } }, 404);
  }
});

app.get("/api/v1/collection-catalogs/:catalogId", async (c) => {
  const catalogId = c.req.param("catalogId");
  if (!isBuiltinCollectionCatalogId(catalogId)) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "catalogId 仅支持 products 或 albums" } },
      400
    );
  }
  return c.json({ catalogId, items: getBuiltinCatalogItems(catalogId) });
});

app.get("/api/v1/project-assets/icons", async (c) => {
  const manifest = await readJson<{ version?: string; items?: unknown[] }>(ICON_MANIFEST_PATH);
  if (!manifest?.items) {
    return c.json({ version: "1.0.0", items: [] });
  }
  return c.json(manifest);
});

app.get("/api/v1/project-assets/icons/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  if (!filename || !/^[a-zA-Z0-9._-]+\.svg$/i.test(filename)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "文件名无效" } }, 400);
  }
  const filePath = path.join(ICON_UPLOAD_DIR, filename);
  try {
    const buf = await fs.readFile(filePath);
    return c.body(buf, 200, {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    });
  } catch {
    return c.json({ error: { code: "NOT_FOUND", message: "图标文件不存在" } }, 404);
  }
});

app.post("/api/v1/project-assets/icons/upload", async (c) => {
  let body: Record<string, string | File>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "表单无效" } }, 400);
  }
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "请上传 file 字段" } }, 400);
  }
  if (file.size > PROJECT_ICON_UPLOAD_MAX_BYTES) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "SVG 文件不能超过 512KB" } }, 400);
  }
  if (!isProjectIconUploadFile(file)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "仅支持 SVG 文件" } }, 400);
  }
  const assetId = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const filename = `${assetId}.svg`;
  await fs.mkdir(ICON_UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(ICON_UPLOAD_DIR, filename), buf);
  const url = `/api/v1/project-assets/icons/uploads/${filename}`;
  return c.json({ assetId, url, filename });
});

const IMAGE_UPLOAD_FILENAME_RE = /^[a-zA-Z0-9._-]+\.(jpe?g|png|webp|gif)$/i;

function imageUploadContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

app.get("/api/v1/project-assets/images/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  if (!filename || !IMAGE_UPLOAD_FILENAME_RE.test(filename)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "文件名无效" } }, 400);
  }
  const filePath = path.join(IMAGE_UPLOAD_DIR, filename);
  try {
    const buf = await fs.readFile(filePath);
    return c.body(buf, 200, {
      "Content-Type": imageUploadContentType(filename),
      "Cache-Control": "public, max-age=3600",
    });
  } catch {
    return c.json({ error: { code: "NOT_FOUND", message: "图片文件不存在" } }, 404);
  }
});

app.post("/api/v1/project-assets/images/upload", async (c) => {
  let body: Record<string, string | File>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "表单无效" } }, 400);
  }
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "请上传 file 字段" } }, 400);
  }
  if (file.size > PROJECT_IMAGE_UPLOAD_MAX_BYTES) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "图片不能超过 10MB" } }, 400);
  }
  if (!isProjectImageUploadFile(file)) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "仅支持 JPG、PNG、WebP、GIF" } },
      400
    );
  }
  const name = file.name?.toLowerCase() ?? "";
  const extMatch = name.match(/\.(jpe?g|png|webp|gif)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase().replace(/jpeg/, "jpg") : ".jpg";
  const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
  const assetId = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const filename = `${assetId}${normalizedExt}`;
  await fs.mkdir(IMAGE_UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(IMAGE_UPLOAD_DIR, filename), buf);
  const url = `/api/v1/project-assets/images/uploads/${filename}`;
  return c.json({ assetId, url, filename });
});

app.get("/api/v1/scene-collection-presets", (c) => {
  ensureSceneCollectionPresetsWatcher();
  const sceneCheck = parseSceneQuery(c.req.query("scene"));
  if (!sceneCheck.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: sceneCheck.message } }, 400);
  }
  const items = listSceneCollectionPresetSummaries(sceneCheck.scene);
  return c.json({ scene: sceneCheck.scene, items });
});

app.get("/api/v1/scene-collection-presets/:presetId", async (c) => {
  ensureSceneCollectionPresetsWatcher();
  const sceneCheck = parseSceneQuery(c.req.query("scene"));
  if (!sceneCheck.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: sceneCheck.message } }, 400);
  }
  const presetId = c.req.param("presetId");
  const preset = findSceneCollectionPresetById(sceneCheck.scene, presetId);
  if (!preset) {
    return c.json({ error: { code: "NOT_FOUND", message: "内置列表变量不存在" } }, 404);
  }
  return c.json(preset);
});

app.get("/api/v1/scene-scalar-presets", (c) => {
  const sceneCheck = parseSceneQuery(c.req.query("scene"));
  if (!sceneCheck.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: sceneCheck.message } }, 400);
  }
  const items = listSceneScalarPresetSummaries(sceneCheck.scene);
  return c.json({ scene: sceneCheck.scene, items });
});

app.get("/api/v1/scene-collection-presets/:presetId/runtime-values", async (c) => {
  ensureSceneCollectionPresetsWatcher();
  const sceneCheck = parseSceneQuery(c.req.query("scene"));
  if (!sceneCheck.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: sceneCheck.message } }, 400);
  }
  const presetId = c.req.param("presetId");
  const preset = findSceneCollectionPresetById(sceneCheck.scene, presetId);
  if (!preset) {
    return c.json({ error: { code: "NOT_FOUND", message: "内置列表变量不存在" } }, 404);
  }
  return c.json(resolveSceneCollectionPresetRuntimeValues(preset));
});

app.get("/api/v1/emails/events", (c) => {
  ensureEmailsWatcher();
  ensureTokenPresetsWatcher();
  ensureSceneCollectionPresetsWatcher();
  return streamSSE(c, async (stream) => {
    const writeEvent = (event: string, data: Record<string, string | undefined>) =>
      stream.writeSSE({ event, data: JSON.stringify(data) });
    const subscriber: EmailsChangedSubscriber = (changeEvent) => {
      if (stream.aborted) return;
      const eventName = changeEvent.kind;
      void writeEvent(eventName, {
        reason: changeEvent.reason,
        emailKey: changeEvent.kind === "email_changed" ? changeEvent.emailKey : undefined,
        presetId: changeEvent.kind === "token_preset_changed" ? changeEvent.presetId : undefined,
        at: new Date().toISOString(),
      }).catch(() => {
        /* 连接断开后忽略推送失败 */
      });
    };
    emailsChangedSubscribers.add(subscriber);
    await writeEvent("ready", { at: new Date().toISOString() });
    const heartbeat = setInterval(() => {
      if (stream.aborted) return;
      void writeEvent("ping", { at: new Date().toISOString() }).catch(() => {
        /* 连接断开后忽略心跳失败 */
      });
    }, 15000);
    const cleanup = () => {
      clearInterval(heartbeat);
      emailsChangedSubscribers.delete(subscriber);
    };
    stream.onAbort(cleanup);
    while (!stream.aborted) {
      await stream.sleep(60000);
    }
    cleanup();
  });
});

app.get("/api/v1/emails/:emailKey/data-revision", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  const { base, ctx, manifest } = resolved;
  const tMs = await statMtimeMs(ctx.templatePath);
  const pMs = await statMtimeMs(path.join(base, "payload.json"));
  const tpMs = await statMtimeMs(ctx.tokenPresetsPath);
  const mMs = await statMtimeMs(layoutManifestPath(base));
  const layoutKey = ctx.layoutVariantId;
  return c.json({ revision: `${layoutKey}:${tMs}:${pMs}:${tpMs}:${mMs}` });
});

app.get("/api/v1/emails/:emailKey/layout-manifest", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const base = emailBaseDir(DATA_ROOT, emailKey);
  const manifest = await readLayoutManifestOptional(readJson, base);
  if (!manifest) {
    return c.json({ error: { code: "NOT_FOUND", message: "本场景未启用版式变体" } }, 404);
  }
  return c.json(await enrichLayoutManifestCreatedAt(base, manifest));
});

app.put("/api/v1/emails/:emailKey/layout-manifest", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const base = emailBaseDir(DATA_ROOT, emailKey);
  const manifest = await readLayoutManifestOptional(readJson, base);
  if (!manifest) {
    return c.json({ error: { code: "NOT_FOUND", message: "本场景未启用版式变体" } }, 404);
  }
  let body: { activeLayoutVariantId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  const nextId = body.activeLayoutVariantId?.trim();
  if (!nextId) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "activeLayoutVariantId 必填" } }, 400);
  }
  const trial = { ...manifest, activeLayoutVariantId: nextId };
  const manifestShapeIssue = validateLayoutManifestOnDisk(trial);
  if (manifestShapeIssue) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: manifestShapeIssue.message,
          details: manifestShapeIssue.details,
        },
      },
      422
    );
  }
  const ctx = resolveEmailFilePaths(base, trial, nextId);
  if (!(await readJson(ctx.templatePath))) {
    return c.json({ error: { code: "NOT_FOUND", message: `版式「${nextId}」的 template.json 不存在` } }, 404);
  }
  await atomicWriteJson(layoutManifestPath(base), trial);
  scheduleEmailsChanged("api_write", emailKey);
  return c.body(null, 204);
});

app.post("/api/v1/emails/:emailKey/layout-variants", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);

  let body: { label?: unknown; layoutVariantId?: unknown; copyFromLayoutVariantId?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "label 必须为非空字符串" } },
      400
    );
  }

  const base = emailBaseDir(DATA_ROOT, emailKey);
  let manifest: LayoutManifest;
  try {
    manifest = await requireLayoutManifest(base, readJson);
  } catch (e) {
    return c.json(
      { error: { code: "NOT_FOUND", message: e instanceof Error ? e.message : String(e) } },
      404
    );
  }

  const existingIds = manifest.variants.map((v) => v.id);
  const requestedId =
    typeof body.layoutVariantId === "string" && body.layoutVariantId.trim()
      ? body.layoutVariantId.trim()
      : null;
  const newId =
    requestedId ?? deriveLayoutVariantIdFromLabel(label, existingIds);
  const idBad = assertLayoutVariantIdSafe(newId);
  if (idBad) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: idBad } }, 400);
  }
  if (existingIds.includes(newId)) {
    return c.json(
      { error: { code: "CONFLICT", message: `版式标识「${newId}」已存在` } },
      409
    );
  }

  const copyFromRaw =
    typeof body.copyFromLayoutVariantId === "string"
      ? body.copyFromLayoutVariantId.trim()
      : "";
  const copyFromId =
    copyFromRaw && manifest.variants.some((v) => v.id === copyFromRaw) ? copyFromRaw : null;

  let sourceTemplate: EmailTemplate;
  let sourceTokenPresets: TokenPresets;
  let variantDescription: string;

  if (copyFromId) {
    const sourceCtx = resolveEmailFilePaths(base, manifest, copyFromId);
    const copiedRaw = await readJson<NestedEmailTemplate>(sourceCtx.templatePath);
    if (!copiedRaw) {
      return c.json(
        { error: { code: "NOT_FOUND", message: `源版式「${copyFromId}」的 template.json 不存在` } },
        404
      );
    }
    let copiedTokenPresets =
      (await readJson<TokenPresets>(sourceCtx.tokenPresetsPath)) ?? null;
    if (!copiedTokenPresets) {
      copiedTokenPresets = createDefaultTokenPresets();
    }

    const templateIssues = blockingValidationIssues(validateTemplateFromDisk(copiedRaw));
    if (templateIssues.length) {
      return c.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "源版式模板校验失败，无法复制",
            details: templateIssues,
          },
        },
        422
      );
    }
    const tokenIssue = validateTokenPresetsShape(copiedTokenPresets);
    if (tokenIssue) {
      return c.json({ error: { code: "VALIDATION_FAILED", ...tokenIssue } }, 422);
    }

    sourceTemplate = readTemplateGraphFromDiskRaw(copiedRaw);
    sourceTokenPresets = copiedTokenPresets;
    variantDescription = `复制自版式「${copyFromId}」`;
  } else {
    const blank = buildBlankLayoutVariantAssets(emailKey, newId);
    sourceTemplate = blank.template;
    sourceTokenPresets = blank.tokenPresets;
    variantDescription = "空白版式";
  }

  try {
    const created = await persistNewLayoutVariantOnDisk(
      {
        base,
        manifest,
        label,
        newId,
        sourceTemplate,
        sourceTokenPresets,
        variantDescription,
      },
      atomicWriteJson
    );
    scheduleEmailsChanged("api_write", emailKey);
    return c.json(created, 201);
  } catch (e) {
    const statusCode = (e as { statusCode?: number }).statusCode;
    const details = (e as { details?: unknown }).details;
    if (statusCode === 409) {
      return c.json(
        { error: { code: "CONFLICT", message: e instanceof Error ? e.message : "版式冲突" } },
        409
      );
    }
    if (statusCode === 422) {
      return c.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: e instanceof Error ? e.message : "校验失败",
            details,
          },
        },
        422
      );
    }
    if (e instanceof Error) {
      return c.json(
        { error: { code: "VALIDATION_FAILED", message: e.message } },
        400
      );
    }
    throw e;
  }
});

app.post("/api/v1/emails/:emailKey/layout-variants/ai-from-image", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);

  let body: Record<string, string | File>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "表单无效" } }, 400);
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "label 必须为非空字符串" } },
      400
    );
  }

  const imageField = body.image;
  if (!(imageField instanceof File)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "请上传 image 字段的设计图" } }, 400);
  }

  const imageBuffer = Buffer.from(await imageField.arrayBuffer());
  const mimeType = imageField.type?.trim() || "application/octet-stream";
  const imageIssue = validateDesignImageBuffer(imageBuffer, mimeType);
  if (imageIssue) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: imageIssue } }, 400);
  }

  const mjsGenerateMode = parseMjsGenerateMode(body.mjsGenerateMode);

  const base = emailBaseDir(DATA_ROOT, emailKey);
  let manifest: LayoutManifest;
  try {
    manifest = await requireLayoutManifest(base, readJson);
  } catch (e) {
    return c.json(
      { error: { code: "NOT_FOUND", message: e instanceof Error ? e.message : String(e) } },
      404
    );
  }

  const existingIds = manifest.variants.map((v) => v.id);
  const newId = deriveLayoutVariantIdFromLabel(label, existingIds);
  const idBad = assertLayoutVariantIdSafe(newId);
  if (idBad) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: idBad } }, 400);
  }
  if (existingIds.includes(newId)) {
    return c.json(
      { error: { code: "CONFLICT", message: `版式标识「${newId}」已存在` } },
      409
    );
  }

  const variantDescription = "AI 从设计图生成";

  return streamSSE(c, async (stream) => {
    const writeProgress = (payload: unknown) =>
      stream.writeSSE({ event: "progress", data: JSON.stringify(payload) });

    const progress = createPipelineProgressReporter((payload) => {
      if (stream.aborted) return;
      void writeProgress(payload).catch(() => {
        /* 连接断开后忽略 */
      });
    });

    let persistStarted = false;
    try {
      const generated = await generateLayoutVariantFromDesignImage(
        {
          emailKey,
          layoutVariantId: newId,
          layoutLabel: label,
          imageBuffer,
          mimeType,
          emailBaseDir: base,
          mjsGenerateMode,
        },
        { progress }
      );

      progress.forStep("MR:Persist").start();
      persistStarted = true;
      const created = await persistNewLayoutVariantOnDisk(
        {
          base,
          manifest,
          label,
          newId,
          sourceTemplate: generated.template,
          sourceTokenPresets: generated.tokenPresets,
          variantDescription,
        },
        atomicWriteJson
      );
      progress.forStep("MR:Persist").succeed();
      scheduleEmailsChanged("api_write", emailKey);
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ ...created, mjsPath: generated.mjsPath }),
      });
    } catch (e) {
      if (persistStarted) {
        progress.forStep("MR:Persist").fail();
      }
      const code = (e as Error & { code?: string }).code;
      const message = e instanceof Error ? e.message : "生成失败，请稍后重试";
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          code:
            code === "AI_GENERATION_TIMEOUT"
              ? "AI_GENERATION_TIMEOUT"
              : "AI_GENERATION_FAILED",
          message,
        }),
      });
    }
  });
});

app.patch("/api/v1/emails/:emailKey/layout-variants/:layoutVariantId", async (c) => {
  const emailKey = c.req.param("emailKey");
  const layoutVariantId = c.req.param("layoutVariantId");
  const badKey = assertEmailKeySafe(emailKey);
  if (badKey) return c.json({ error: { code: "VALIDATION_FAILED", message: badKey } }, 400);
  const badLayout = assertLayoutVariantIdSafe(layoutVariantId);
  if (badLayout) return c.json({ error: { code: "VALIDATION_FAILED", message: badLayout } }, 400);

  const base = emailBaseDir(DATA_ROOT, emailKey);
  const manifest = await readLayoutManifestOptional(readJson, base);
  if (!manifest) {
    return c.json({ error: { code: "NOT_FOUND", message: "本场景未启用版式变体" } }, 404);
  }

  let body: { label?: unknown; description?: unknown; publishStatus?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }

  const labelProvided = typeof body.label === "string";
  const publishProvided = body.publishStatus !== undefined;
  if (!labelProvided && !publishProvided) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "须提供 label 或 publishStatus" } },
      400
    );
  }

  let nextManifest: LayoutManifest = manifest;

  if (labelProvided) {
    const label = body.label.trim();
    if (!label) {
      return c.json(
        { error: { code: "VALIDATION_FAILED", message: "label 必须为非空字符串" } },
        400
      );
    }
    try {
      nextManifest = updateLayoutVariantLabel(nextManifest, layoutVariantId, label);
    } catch (e) {
      return c.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: e instanceof Error ? e.message : "无法更新版式名称",
          },
        },
        400
      );
    }
  }

  if (publishProvided) {
    const publishIssue = validatePublishStatusField(body.publishStatus, "publishStatus");
    if (publishIssue) {
      return c.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: publishIssue.reason,
            details: [publishIssue],
          },
        },
        422
      );
    }
    try {
      nextManifest = updateLayoutVariantPublishStatus(
        nextManifest,
        layoutVariantId,
        body.publishStatus as import("../src/publish-status-contract").PublishStatus
      );
    } catch (e) {
      return c.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: e instanceof Error ? e.message : "无法更新版式发布状态",
          },
        },
        400
      );
    }
  }

  if (typeof body.description === "string") {
    const description = body.description.trim();
    nextManifest = {
      ...nextManifest,
      variants: nextManifest.variants.map((v) =>
        v.id === layoutVariantId ? { ...v, description: description || undefined } : v
      ),
    };
  }

  const manifestShapeIssue = validateLayoutManifestOnDisk(nextManifest);
  if (manifestShapeIssue) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: manifestShapeIssue.message,
          details: manifestShapeIssue.details,
        },
      },
      422
    );
  }

  await atomicWriteJson(layoutManifestPath(base), nextManifest);
  scheduleEmailsChanged("api_write", emailKey);
  const updated = nextManifest.variants.find((v) => v.id === layoutVariantId);
  return c.json({
    layoutVariantId,
    label: updated?.label ?? "",
    manifest: nextManifest,
  });
});

app.delete("/api/v1/emails/:emailKey/layout-variants/:layoutVariantId", async (c) => {
  const emailKey = c.req.param("emailKey");
  const layoutVariantId = c.req.param("layoutVariantId");
  const badKey = assertEmailKeySafe(emailKey);
  if (badKey) return c.json({ error: { code: "VALIDATION_FAILED", message: badKey } }, 400);
  const badLayout = assertLayoutVariantIdSafe(layoutVariantId);
  if (badLayout) return c.json({ error: { code: "VALIDATION_FAILED", message: badLayout } }, 400);

  const base = emailBaseDir(DATA_ROOT, emailKey);
  const manifest = await readLayoutManifestOptional(readJson, base);
  if (!manifest) {
    return c.json({ error: { code: "NOT_FOUND", message: "本场景未启用版式变体" } }, 404);
  }

  let nextManifest: LayoutManifest;
  try {
    nextManifest = softDeleteLayoutVariant(manifest, layoutVariantId);
  } catch (e) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: e instanceof Error ? e.message : "无法逻辑删除版式",
        },
      },
      400
    );
  }

  const manifestShapeIssue = validateLayoutManifestOnDisk(nextManifest);
  if (manifestShapeIssue) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: manifestShapeIssue.message,
          details: manifestShapeIssue.details,
        },
      },
      422
    );
  }

  await atomicWriteJson(layoutManifestPath(base), nextManifest);
  scheduleEmailsChanged("api_write", emailKey);
  return c.json({
    layoutVariantId,
    activeLayoutVariantId: nextManifest.activeLayoutVariantId,
    manifest: nextManifest,
  });
});

app.get("/api/v1/emails/:emailKey/template", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  const t = await readJson<NestedEmailTemplate>(resolved.ctx.templatePath);
  if (!t) return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  const blocking = blockingValidationIssues(validateTemplateFromDisk(t));
  if (blocking.length) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "模板校验未通过",
          details: blocking,
        },
      },
      422
    );
  }
  return c.json(t);
});

function assertPresetNameSafe(name: string): string | null {
  if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
    return "preset 名仅允许字母、数字、下划线与中划线";
  }
  return null;
}

function payloadFilePath(emailKey: string, preset: string | undefined): string {
  if (!preset || preset === "default") {
    return path.join(DATA_ROOT, emailKey, "payload.json");
  }
  return path.join(DATA_ROOT, emailKey, "payload", `${preset}.json`);
}

app.get("/api/v1/emails/:emailKey/payload", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const preset = c.req.query("preset");
  if (preset) {
    const presetBad = assertPresetNameSafe(preset);
    if (presetBad) return c.json({ error: { code: "VALIDATION_FAILED", message: presetBad } }, 400);
  }
  const p = await readJson<EmailPayload>(payloadFilePath(emailKey, preset));
  if (!p) return c.json({ error: { code: "NOT_FOUND", message: "赋值文件不存在" } }, 404);
  return c.json(p);
});

app.get("/api/v1/emails/:emailKey/payload-presets", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const presets: string[] = [];
  // default 永远列出（即使 payload.json 不存在；前端会兜底 defaultPayload）
  presets.push("default");
  const presetDir = path.join(DATA_ROOT, emailKey, "payload");
  try {
    const entries = await fs.readdir(presetDir);
    for (const name of entries) {
      if (!name.endsWith(".json")) continue;
      const stem = name.slice(0, -".json".length);
      if (!/^[a-zA-Z0-9_-]+$/.test(stem)) continue;
      if (stem === "default") continue;
      presets.push(stem);
    }
  } catch {
    // 目录不存在视为无额外 preset
  }
  return c.json({ presets });
});

app.get("/api/v1/emails/:emailKey/token-presets", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  const tokenPresets = await readJson<TokenPresets>(resolved.ctx.tokenPresetsPath);
  if (!tokenPresets) return c.json({ error: { code: "NOT_FOUND", message: "样式预设文件不存在" } }, 404);
  const issue = validateTokenPresetsShape(tokenPresets);
  if (issue) return c.json({ error: { code: "VALIDATION_FAILED", ...issue } }, 422);
  return c.json(tokenPresets);
});

app.put("/api/v1/emails/:emailKey/template", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  let body: NestedEmailTemplate;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  const blocking = blockingValidationIssues(validateTemplateFromDisk(body));
  if (blocking.length) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "校验失败", details: blocking } },
      422
    );
  }
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  const graph = readTemplateGraphFromDiskRaw(body);
  const disk = serializeTemplateToDisk(graph);
  await atomicWriteJson(resolved.ctx.templatePath, disk);
  scheduleEmailsChanged("api_write", emailKey);
  return c.body(null, 204);
});

app.put("/api/v1/emails/:emailKey/payload", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const base = emailBaseDir(DATA_ROOT, emailKey);
  const manifest = await readLayoutManifestOptional(readJson, base);
  if (!manifest) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "layout-manifest.json 不存在" } },
      404
    );
  }

  let body: EmailPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }

  const payloadShapeIssue = validatePayloadShapeOnDisk(body);
  if (payloadShapeIssue) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: payloadShapeIssue.message,
          details: payloadShapeIssue.details,
        },
      },
      422
    );
  }

  const payloadIssues: Array<{ path: string; reason: string }> = [];
  for (const { layoutVariantId, templatePath } of allLayoutTemplatePaths(base, manifest)) {
    const diskRaw = await readJson<NestedEmailTemplate>(templatePath);
    if (!diskRaw) {
      return c.json(
        { error: { code: "NOT_FOUND", message: `版式「${layoutVariantId}」的 template.json 不存在` } },
        404
      );
    }
    const diskT = readTemplateGraphFromDiskRaw(diskRaw);
    for (const issue of validatePayloadAgainstTemplate(diskT, body)) {
      payloadIssues.push({
        path: `layout:${layoutVariantId}/${issue.path}`,
        reason: issue.reason,
      });
    }
  }

  if (payloadIssues.length) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "赋值文件校验失败", details: payloadIssues } },
      422
    );
  }
  await atomicWriteJson(path.join(DATA_ROOT, emailKey, "payload.json"), body);
  scheduleEmailsChanged("api_write", emailKey);
  return c.body(null, 204);
});

app.put("/api/v1/emails/:emailKey/token-presets", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  let body: TokenPresets;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  const issue = validateTokenPresetsShape(body);
  if (issue) return c.json({ error: { code: "VALIDATION_FAILED", ...issue } }, 422);
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  await atomicWriteJson(resolved.ctx.tokenPresetsPath, body);
  scheduleEmailsChanged("api_write", emailKey);
  return c.body(null, 204);
});

app.get("/api/v1/emails/:emailKey/meta", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const metaPath = path.join(DATA_ROOT, emailKey, "meta.json");
  const meta = await readJson<EmailMeta>(metaPath);
  if (!meta) return c.json({ error: { code: "NOT_FOUND", message: "meta.json 不存在" } }, 404);
  const normalized = normalizePersistedEmailMeta(meta as Record<string, unknown>);
  const metaIssue = validateSchemaArtifactShape("meta", normalized, "meta.json 校验失败");
  if (metaIssue) {
    return c.json({ error: { code: "VALIDATION_FAILED", ...metaIssue } }, 422);
  }
  return c.json(normalized as EmailMeta);
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMergeMeta(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const baseVal = out[key];
    if (isPlainObject(baseVal) && isPlainObject(value)) {
      out[key] = deepMergeMeta(baseVal, value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

app.put("/api/v1/emails/:emailKey/meta", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  if (!isPlainObject(body)) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "请求体必须为对象" } }, 400);
  }

  // displayName 若提供必须为非空字符串；其余字段宽松接受（前端表单负责类型）。
  if (body.displayName !== undefined) {
    if (typeof body.displayName !== "string" || !body.displayName.trim()) {
      return c.json(
        { error: { code: "VALIDATION_FAILED", message: "displayName 必须为非空字符串" } },
        400
      );
    }
    body.displayName = body.displayName.trim();
  }

  const emailDir = emailBaseDir(DATA_ROOT, emailKey);
  const manifest = await readLayoutManifestOptional(readJson, emailDir);
  if (!manifest || !(await emailHasTemplateFiles(emailDir, manifest))) {
    return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  }

  const prevMeta =
    (await readJson<Record<string, unknown>>(path.join(emailDir, "meta.json"))) ?? {};
  const merged = normalizePersistedEmailMeta(deepMergeMeta(prevMeta, body));
  const metaIssues = validateSchemaArtifact("meta", merged);
  if (metaIssues.length > 0) {
    return c.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: metaIssues[0]?.reason ?? "meta.json 校验失败",
          details: metaIssues,
        },
      },
      422
    );
  }
  merged.updatedAt = new Date().toISOString();
  await atomicWriteJson(path.join(emailDir, "meta.json"), merged);
  scheduleEmailsChanged("api_write", emailKey);
  return c.body(null, 204);
});

app.delete("/api/v1/emails/:emailKey", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);

  const emailDir = emailBaseDir(DATA_ROOT, emailKey);
  const manifest = await readLayoutManifestOptional(readJson, emailDir);
  if (!manifest || !(await emailHasTemplateFiles(emailDir, manifest))) {
    return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  }

  const metaPath = path.join(emailDir, "meta.json");
  const prevMeta = (await readJson<Record<string, unknown>>(metaPath)) ?? {};
  if (isLogicallyDeleted(prevMeta)) {
    return c.json({ error: { code: "CONFLICT", message: "该邮件模板已逻辑删除" } }, 409);
  }
  const merged = {
    ...prevMeta,
    deletedAt: logicalDeleteTimestamp(),
    updatedAt: new Date().toISOString(),
  };
  await atomicWriteJson(metaPath, merged);
  scheduleEmailsChanged("api_delete", emailKey);
  return c.body(null, 204);
});

app.get("/api/v1/emails/:emailKey/merged", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  const tRaw = await readJson<NestedEmailTemplate>(resolved.ctx.templatePath);
  if (!tRaw) return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  const t = readTemplateGraphFromDiskRaw(tRaw);
  const p: EmailPayload =
    (await readJson<EmailPayload>(path.join(resolved.base, "payload.json"))) ?? {
      schemaVersion: "1.0.0",
      slots: {},
      values: {},
    };
  const afterVisibility = applyVisibilityRules(t, p);
  const previewModel = buildRepeatPreviewModel(afterVisibility, p);
  const merged = previewModelToFlatTemplate(previewModel, afterVisibility);
  return c.json({ merged });
});

/** SMTP 测试发信是否已配置（不返回密码）。 */
app.get("/api/v1/smtp-test/status", (c) => {
  return c.json(getSmtpPublicStatus());
});

/**
 * 发送测试邮件：HTML 由前端从画布预览 DOM 抓取；发件人固定为环境变量 EMAIL_SMTP_*。
 * body: { to, html, subject?, preheader? }
 */
app.post("/api/v1/emails/:emailKey/send-test-email", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);

  let body: { to?: unknown; html?: unknown; subject?: unknown; preheader?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "请求体须为 JSON" } }, 400);
  }

  const to = typeof body.to === "string" ? body.to : "";
  const html = typeof body.html === "string" ? body.html : "";
  const subject =
    typeof body.subject === "string" && body.subject.trim()
      ? body.subject.trim()
      : `【测试】${emailKey}`;
  const preheader = typeof body.preheader === "string" ? body.preheader : "";

  try {
    const result = await sendSmtpTestMail({ to, subject, html: html || "" });
    return c.json({
      ok: true,
      to: to.trim(),
      subject,
      preheader: preheader.trim() || undefined,
      messageId: result.messageId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: { code: "SMTP_SEND_FAILED", message } }, 502);
  }
});

const port = Number(process.env.EMAIL_API_PORT ?? 8787);
console.log(`简易邮件 API：http://127.0.0.1:${port}，数据目录：${DATA_ROOT}`);
if (!isPexelsApiKeyConfigured()) {
  console.warn(
    "[server] PEXELS_API_KEY 未配置：AI 管线 B4 配图将全部回落占位图（请确认 .env 并 ./start.sh 重启）"
  );
} else {
  console.log("[server] PEXELS_API_KEY 已就绪（AI 配图可用）");
}
void fs.mkdir(DATA_ROOT, { recursive: true }).catch(() => {
  /* 数据目录初始化失败时保留现状，接口按需兜底 */
});
void fs.mkdir(TOKEN_PRESET_ROOT, { recursive: true }).catch(() => {
  /* 样式预设目录初始化失败时保留现状，接口按需兜底 */
});
void fs.mkdir(ICON_UPLOAD_DIR, { recursive: true }).catch(() => {
  /* 图标上传目录初始化失败时保留现状 */
});
serve({ fetch: app.fetch, port });
