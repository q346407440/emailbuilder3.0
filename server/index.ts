import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { watch, type FSWatcher } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EmailMeta, EmailPayload, EmailTemplate } from "../src/types/email";
import type { ConfigSchema } from "../src/types/configSchema";
import type { TokenPresets } from "../src/types/tokenPreset";
import {
  assertEmailKeySafe,
  blockingValidationIssues,
  validatePayloadAgainstTemplate,
  validateTemplate,
} from "../src/lib/validate";
import { validateConfigSchema, validateTokenPresets } from "../src/lib/validateConfigSchema";
import { mergeTemplatePayload } from "../src/lib/merge";
import {
  collectMasterValidationIssues,
  masterToEmailTemplate,
  parseBlockMaster,
  parseSectionMaster,
} from "../src/lib/masterCatalog";
import { isBuiltinCollectionCatalogId } from "../src/payload-contract/collection-data-source";
import { getBuiltinCatalogItems } from "../src/lib/builtinCollectionCatalog";
import type { LayoutManifest } from "../src/layout-variant-contract/types";
import { resolveEmailFilePaths, validateLayoutManifest } from "../src/lib/emailLayoutVariant";
import {
  allLayoutTemplatePaths,
  emailBaseDir,
  layoutManifestPath,
  readLayoutManifestOptional,
  resolveEmailLayoutContext,
  type ResolvedLayoutContext,
} from "./emailLayoutContext";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const DATA_ROOT =
  process.env.EMAIL_DATA_ROOT ?? path.join(projectRoot, "data", "emails");
const TOKEN_PRESET_ROOT =
  process.env.EMAIL_TOKEN_PRESET_ROOT ?? path.join(projectRoot, "data", "token-presets");
const MASTER_ROOT =
  process.env.EMAIL_MASTER_ROOT ?? path.join(projectRoot, "data", "masters");
const PROJECT_ASSETS_ROOT =
  process.env.EMAIL_PROJECT_ASSETS_ROOT ?? path.join(projectRoot, "data", "project-assets");
const ICON_UPLOAD_DIR = path.join(PROJECT_ASSETS_ROOT, "icons", "uploads");
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
      manifest: LayoutManifest | null;
      ctx: ResolvedLayoutContext;
    }
  | { ok: false; message: string; status: 400 | 404 };

async function resolveLayoutForEmail(
  emailKey: string,
  layoutQuery: string | undefined
): Promise<LayoutResolveResult> {
  const base = emailBaseDir(DATA_ROOT, emailKey);
  const resolved = await resolveEmailLayoutContext(readJson, base, layoutQuery);
  if (!resolved.ok) {
    return { ok: false, message: resolved.message, status: resolved.status };
  }
  return { ok: true, base, manifest: resolved.manifest, ctx: resolved.ctx };
}

async function emailHasTemplateFiles(base: string, manifest: LayoutManifest | null): Promise<boolean> {
  if (manifest) {
    for (const { templatePath } of allLayoutTemplatePaths(base, manifest)) {
      if (await readJson(templatePath)) return true;
    }
    return false;
  }
  return Boolean(await readJson(path.join(base, "template.json")));
}

function validateConfigSchemaShape(schema: ConfigSchema, template: EmailTemplate): ValidationIssueResponse | null {
  const issues = validateConfigSchema(schema, template);
  return issues.length ? { message: "配置面校验失败", details: issues } : null;
}

function validateTokenPresetsShape(tokenPresets: TokenPresets): ValidationIssueResponse | null {
  const issues = validateTokenPresets(tokenPresets);
  return issues.length ? { message: "样式预设校验失败", details: issues } : null;
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

/** 母版 id 与文件名一致，block 母版使用 `action.button` 等带点号架构名。 */
function assertMasterIdSafe(id: string): string | null {
  if (!id || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id) || id.includes("..") || id.includes("/")) {
    return "masterId 仅允许英文字母、数字、下划线、中划线与点号";
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
      const layoutResolved = manifest
        ? resolveEmailFilePaths(base, manifest, manifest.activeLayoutVariantId)
        : {
            templatePath: path.join(base, "template.json"),
            configSchemaPath: path.join(base, "configSchema.json"),
            tokenPresetsPath: path.join(base, "tokenPresets.json"),
          };
      const templatePath = layoutResolved.templatePath;
      const payloadPath = path.join(base, "payload.json");
      const configSchemaPath = layoutResolved.configSchemaPath;
      const tokenPresetsPath = layoutResolved.tokenPresetsPath;
      const meta = await readJson<{ displayName?: string; updatedAt?: string }>(
        metaPath
      );
      const template = await readJson<EmailTemplate>(templatePath);
      const [
        templateMtimeMs,
        payloadMtimeMs,
        metaMtimeMs,
        configSchemaMtimeMs,
        tokenPresetsMtimeMs,
      ] = await Promise.all([
        statMtimeMs(templatePath),
        statMtimeMs(payloadPath),
        statMtimeMs(metaPath),
        statMtimeMs(configSchemaPath),
        statMtimeMs(tokenPresetsPath),
      ]);
      const metaUpdatedAtMs =
        typeof meta?.updatedAt === "string" ? Number(Date.parse(meta.updatedAt)) : NaN;
      const effectiveUpdatedAtMs = Math.max(
        Number.isFinite(metaUpdatedAtMs) ? metaUpdatedAtMs : 0,
        templateMtimeMs,
        payloadMtimeMs,
        metaMtimeMs,
        configSchemaMtimeMs,
        tokenPresetsMtimeMs
      );
      return {
        emailKey,
        displayName: meta?.displayName ?? emailKey,
        templateId: template?.templateId ?? emailKey,
        templateVersion: template?.templateVersion ?? 1,
        hasPayload: payloadMtimeMs > 0,
        hasConfigSchema: configSchemaMtimeMs > 0,
        hasTokenPresets: tokenPresetsMtimeMs > 0,
        hasLayoutVariants: Boolean(manifest),
        activeLayoutVariantId: manifest?.activeLayoutVariantId,
        updatedAt: effectiveUpdatedAtMs > 0 ? new Date(effectiveUpdatedAtMs).toISOString() : undefined,
      };
    })
  );
  return c.json({ items });
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
  return c.json({ items: items.filter((item) => item.tokenPresets) });
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

app.get("/api/v1/masters/:kind", async (c) => {
  const kind = c.req.param("kind");
  if (kind !== "sections" && kind !== "blocks") {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "母版类型仅允许 sections / blocks" } }, 400);
  }
  const dir = path.join(MASTER_ROOT, kind);
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir).then((names) =>
      names.filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    );
  } catch {
    return c.json({ items: [] });
  }
  const items = await Promise.all(
    entries.map(async (fileName) => {
      const masterId = path.basename(fileName, ".json");
      const master = await readJson<Record<string, unknown>>(path.join(dir, fileName));
      return {
        masterId,
        name: typeof master?.name === "string" ? master.name : masterId,
        version: typeof master?.version === "string" ? master.version : undefined,
        master,
      };
    })
  );
  return c.json({ items: items.filter((item) => item.master) });
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
  if (file.size > 512 * 1024) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "SVG 文件不能超过 512KB" } }, 400);
  }
  const name = file.name?.toLowerCase() ?? "";
  if (!name.endsWith(".svg") && file.type !== "image/svg+xml") {
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

app.get("/api/v1/masters/:kind/:masterId", async (c) => {
  const kind = c.req.param("kind");
  const masterId = c.req.param("masterId");
  if (kind !== "sections" && kind !== "blocks") {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "母版类型仅允许 sections / blocks" } }, 400);
  }
  const bad = assertMasterIdSafe(masterId);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const master = await readJson<Record<string, unknown>>(path.join(MASTER_ROOT, kind, `${masterId}.json`));
  if (!master) return c.json({ error: { code: "NOT_FOUND", message: "母版不存在" } }, 404);
  return c.json(master);
});

app.put("/api/v1/masters/:kind/:masterId", async (c) => {
  const kind = c.req.param("kind");
  const masterId = c.req.param("masterId");
  if (kind !== "sections" && kind !== "blocks") {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "母版类型仅允许 sections / blocks" } }, 400);
  }
  const bad = assertMasterIdSafe(masterId);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const filePath = path.join(MASTER_ROOT, kind, `${masterId}.json`);
  const existing = await readJson<Record<string, unknown>>(filePath);
  if (!existing) return c.json({ error: { code: "NOT_FOUND", message: "母版不存在" } }, 404);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  if (body.masterId !== masterId) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "masterId 与路径不一致" } }, 400);
  }

  const master =
    kind === "blocks" ? parseBlockMaster(body) : parseSectionMaster(body);
  if (!master) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "母版 JSON 结构不完整" } }, 422);
  }

  const issues = collectMasterValidationIssues(master);
  if (issues.length) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "母版校验失败", details: issues } },
      422
    );
  }

  const template = masterToEmailTemplate(master, { templateId: master.masterId });
  const templateIssues = blockingValidationIssues(validateTemplate(template));
  if (templateIssues.length) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "模板校验失败", details: templateIssues } },
      422
    );
  }

  await atomicWriteJson(filePath, body);
  return c.body(null, 204);
});

app.get("/api/v1/emails/events", (c) => {
  ensureEmailsWatcher();
  ensureTokenPresetsWatcher();
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
  const cMs = await statMtimeMs(ctx.configSchemaPath);
  const tpMs = await statMtimeMs(ctx.tokenPresetsPath);
  const mMs = manifest ? await statMtimeMs(layoutManifestPath(base)) : 0;
  const layoutKey = ctx.layoutVariantId ?? "legacy";
  return c.json({ revision: `${layoutKey}:${tMs}:${pMs}:${cMs}:${tpMs}:${mMs}` });
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
  return c.json(manifest);
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
  const manifestIssues = validateLayoutManifest(trial);
  if (manifestIssues.length) {
    return c.json(
      { error: { code: "VALIDATION_FAILED", message: "版式清单校验失败", details: manifestIssues } },
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

app.get("/api/v1/emails/:emailKey/template", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  const t = await readJson<EmailTemplate>(resolved.ctx.templatePath);
  if (!t) return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  const blocking = blockingValidationIssues(validateTemplate(t));
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

app.get("/api/v1/emails/:emailKey/config-schema", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  const template = await readJson<EmailTemplate>(resolved.ctx.templatePath);
  if (!template) return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  const schema = await readJson<ConfigSchema>(resolved.ctx.configSchemaPath);
  if (!schema) return c.json({ error: { code: "NOT_FOUND", message: "配置面文件不存在" } }, 404);
  const issue = validateConfigSchemaShape(schema, template);
  if (issue) return c.json({ error: { code: "VALIDATION_FAILED", ...issue } }, 422);
  return c.json(schema);
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
  let body: EmailTemplate;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  const blocking = blockingValidationIssues(validateTemplate(body));
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
  await atomicWriteJson(resolved.ctx.templatePath, body);
  scheduleEmailsChanged("api_write", emailKey);
  return c.body(null, 204);
});

app.put("/api/v1/emails/:emailKey/payload", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const base = emailBaseDir(DATA_ROOT, emailKey);
  const manifest = await readLayoutManifestOptional(readJson, base);

  let body: EmailPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }

  const payloadIssues: Array<{ path: string; reason: string }> = [];
  if (manifest) {
    for (const { layoutVariantId, templatePath } of allLayoutTemplatePaths(base, manifest)) {
      const diskT = await readJson<EmailTemplate>(templatePath);
      if (!diskT) {
        return c.json(
          { error: { code: "NOT_FOUND", message: `版式「${layoutVariantId}」的 template.json 不存在` } },
          404
        );
      }
      for (const issue of validatePayloadAgainstTemplate(diskT, body)) {
        payloadIssues.push({
          path: `layout:${layoutVariantId}/${issue.path}`,
          reason: issue.reason,
        });
      }
    }
  } else {
    const diskT = await readJson<EmailTemplate>(path.join(base, "template.json"));
    if (!diskT) return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
    payloadIssues.push(...validatePayloadAgainstTemplate(diskT, body));
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

app.put("/api/v1/emails/:emailKey/config-schema", async (c) => {
  const emailKey = c.req.param("emailKey");
  const bad = assertEmailKeySafe(emailKey);
  if (bad) return c.json({ error: { code: "VALIDATION_FAILED", message: bad } }, 400);
  const layoutQuery = c.req.query("layout");
  const resolved = await resolveLayoutForEmail(emailKey, layoutQuery);
  if (!resolved.ok) {
    return c.json({ error: { code: "VALIDATION_FAILED", message: resolved.message } }, resolved.status);
  }
  const template = await readJson<EmailTemplate>(resolved.ctx.templatePath);
  if (!template) return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  let body: ConfigSchema;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_FAILED", message: "JSON 无效" } }, 400);
  }
  const issue = validateConfigSchemaShape(body, template);
  if (issue) return c.json({ error: { code: "VALIDATION_FAILED", ...issue } }, 422);
  await atomicWriteJson(resolved.ctx.configSchemaPath, body);
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
  return c.json(meta);
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
  if (!(await emailHasTemplateFiles(emailDir, manifest))) {
    return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  }

  const prevMeta =
    (await readJson<Record<string, unknown>>(path.join(emailDir, "meta.json"))) ?? {};
  const merged = deepMergeMeta(prevMeta, body);
  merged.updatedAt = new Date().toISOString();
  await atomicWriteJson(path.join(emailDir, "meta.json"), merged);
  scheduleEmailsChanged("api_write", emailKey);
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
  const t = await readJson<EmailTemplate>(resolved.ctx.templatePath);
  if (!t) return c.json({ error: { code: "NOT_FOUND", message: "模板文件不存在" } }, 404);
  const p =
    (await readJson<EmailPayload>(path.join(resolved.base, "payload.json"))) ?? {
      schemaVersion: "1.0.0",
      values: {},
    };
  const merged = mergeTemplatePayload(t, p);
  return c.json({ merged });
});

const port = Number(process.env.EMAIL_API_PORT ?? 8787);
console.log(`简易邮件 API：http://127.0.0.1:${port}，数据目录：${DATA_ROOT}`);
void fs.mkdir(DATA_ROOT, { recursive: true }).catch(() => {
  /* 数据目录初始化失败时保留现状，接口按需兜底 */
});
void fs.mkdir(TOKEN_PRESET_ROOT, { recursive: true }).catch(() => {
  /* 样式预设目录初始化失败时保留现状，接口按需兜底 */
});
void fs.mkdir(MASTER_ROOT, { recursive: true }).catch(() => {
  /* 母版目录初始化失败时保留现状，接口按需兜底 */
});
void fs.mkdir(ICON_UPLOAD_DIR, { recursive: true }).catch(() => {
  /* 图标上传目录初始化失败时保留现状 */
});
serve({ fetch: app.fetch, port });
