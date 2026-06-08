---
name: easy-email-storage-api
description: >-
  邮件数据落盘目录、`emailKey` 约定、本地 API（`/api/v1`）与 Agent 写文件流程。
  当用户问「模板存哪」「怎么新建邮件目录」「API 路径」「EMAIL_DATA_ROOT」「payload 409」或对接 server 读写时使用；与 easy-email-concepts、email-config-motherboard 配套。
---

# 存储与本地 API（索引）

## 代码真源指针

| 主题 | 路径 |
|------|------|
| HTTP 路由、请求体、错误形态 | **`server/index.ts`**（在仓库内搜索 **`/api/v1`** 即可浏览全表） |
| 模板 / payload 合并与类型 | **`src/types/email.ts`**、**`src/lib/validate.ts`** |
| **template 落盘 nested 4.0.0** | **`src/template-disk-contract/`**、**`src/lib/templateTreeAdapter.ts`** |
| block 白名单 | **`src/block-contract/`** |
| token 标准键 | **`src/token-preset-contract/`** |
| **落盘 artifact 索引与 schemaVersion** | **`src/schema-registry/`**（引用各 `*-contract` 常量，不双写版本号） |
| 禁止持久化字段与剥离脚本所调用的剥离逻辑 | **`src/render-defaults-contract/validate.ts`** |
| payload / visibility | **`src/payload-contract/`**、**`src/visibility-contract/`** |

**不再**维护 `docs/email-*.md` 与 server 并行的规格文档。

## 落盘约定（行为摘要）

- **根目录**：`<项目根>/data/emails`，可用环境变量 **`EMAIL_DATA_ROOT`** 覆盖。
- **一封邮件**：`data/emails/<emailKey>/`；**`emailKey`** 字符集 `[a-zA-Z0-9._-]`，禁止 `..` 与路径分隔符。
- **列表**：服务端扫描子目录，可不维护 `_registry.json`。

### 每目录常见文件（职责一句）

**标准结构（必需）**：`payload.json` 在场景根；**须**有 `layout-manifest.json`；每个版式在 `layouts/<layoutVariantId>/` 含 **template + tokenPresets**。仅 **一个版式** 时通常使用 id **`default`**。

| 文件 | 说明 |
|------|------|
| `template.json` | 结构真源（**nested 4.0.0**：`schemaVersion` + `root` 嵌套树；**无**顶层 `blocks` map） |
| `tokenPresets.json` | 本邮件样式预设与 `$themeRef` 解析 |
| `payload.json` | **场景级共享**业务变量；无槽时 **`values: {}`** |
| `meta.json` | 展示元数据（**schemaVersion 必填**，见 `meta-contract`） |

**版式变体（多结构）**：`payload.json` 仍在根目录；每个 **layoutVariant** 独立 template + tokenPresets。

```text
data/emails/<emailKey>/
  payload.json
  layout-manifest.json          # activeLayoutVariantId + variants[]
  layouts/<layoutVariantId>/
    template.json
    tokenPresets.json
```

| 主题 | 路径 / 参数 |
|------|-------------|
| 版式清单契约 | **`src/layout-variant-contract/`**、**`src/lib/emailLayoutVariant.ts`** |
| 读写 template / token | `GET|PUT /api/v1/emails/:key/template?layout=<id>`（**wire = nested 4.0.0**；前端经 `src/api/client.ts` 展开为 EditorBlockGraph）、`GET|PUT .../token-presets?layout=<id>` |
| block 母版 JSON | 直接维护 `data/masters/blocks/*.json`；生成见 **`npm run sync:masters`**；校验见 **`npm run validate:all`** |
| 切换当前版式 | `GET|PUT /api/v1/emails/:key/layout-manifest` |
| payload | **无** `layout` 参数；PUT 时须对所有版式 `template` 通过 payload 对照校验 |

`data/token-presets/<id>.json`：可选公共预设。

### Artifact schemaVersion 索引（校验入口：`src/schema-registry/`）

| Artifact | 版本常量真源 | 典型路径 |
|----------|--------------|----------|
| template | `template-disk-contract` · 4.0.0 | `layouts/*/template.json` |
| tokenPresets | `TOKEN_PRESET_SCHEMA_VERSION` | `layouts/*/tokenPresets.json`、`data/token-presets/*.json` |
| payload | `PAYLOAD_SCHEMA_VERSION` | `payload.json` |
| layoutManifest | `LAYOUT_MANIFEST_SCHEMA_VERSION` | `layout-manifest.json` |
| meta | `META_SCHEMA_VERSION` | `meta.json` |
| sceneCollectionPreset | `SCENE_COLLECTION_PRESET_SCHEMA_VERSION` | `data/scene-collection-presets/**/*.json` |

缺 `schemaVersion` 或版本不匹配：**validate fail**（读盘不悄悄补默认）。全量校验：**`npm run validate:all`**。

## Agent 新建目录（可不经 API）

1. 新建 `data/emails/<emailKey>/`。
2. 写入上表各 JSON（至少含模板侧必需项；以 **`npm run validate:all`** 是否通过为准）。
3. `templateId` 建议与 `emailKey` 一致；`payload` 与模板版本字段与实现一致。
4. **`npm run validate:all`**。

## API 分层（编辑器 vs 对外接入）

| 用途 | 典型调用方 | 能力范围 |
|------|------------|----------|
| **对外接入（发信 / 渲染）** | Loyalty 业务、活动发信链路 | **只使用**已发布模板：读 `payload` / `merged` / `template` / `token-presets`、写场景级 **`PUT payload`**（及内置列表变量 runtime 等）。索引真源：**`src/lib/buildIntegrationApiExamples.ts`**（`integrationEndpointsForEmail`）。 |
| **编辑器维护（运营）** | 邮件编辑器顶栏、本仓库前端 | 新建 / **复制**场景（`POST /emails` + `copyFromEmailKey`）、新建 / **复制**版式（`POST .../layout-variants` + `copyFromLayoutVariantId`）、**以图 AI 新建版式**（`POST .../layout-variants/ai-from-image`，`multipart`：`label` + `image`；生成逻辑见 `server/layoutVariantAiFromImage.ts`）、改 template / meta / 发布状态等。**不**作为对外接入契约交付，接入页文档与 curl 示例**勿**收录上述写结构接口。 |

同进程 `server/index.ts` 路由可共存；对接方按上表只实现「使用」子集即可。

## 本地 API 摘要

- 基址默认 **`http://127.0.0.1:3001/api/v1`**（以 `server` 启动日志为准）。
- 写 template / tokenPresets / payload / meta 后服务端校验（**meta 走 `schema-registry` → `validateSchemaArtifact("meta")`**）；失败返回 422 + details。
- **`GET /api/v1/emails/:key/merged`**：走 `applyVisibilityRules` → `buildRepeatPreviewModel` → `previewModelToFlatTemplate`（与编辑器虚拟 repeat 管道一致；非静态 `mergeTemplatePayload`）。
- **`config-schema` 路由已移除**；勿再生成或请求 `configSchema.json`。

## 相关技能

**`easy-email-concepts`**、**`email-config-motherboard`**、**`easy-email-payload-contract`**。
