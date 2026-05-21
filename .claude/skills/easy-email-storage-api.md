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
| block 白名单 | **`src/block-contract/`** |
| token 标准键 | **`src/token-preset-contract/`** |
| 禁止持久化字段与剥离脚本所调用的剥离逻辑 | **`src/render-defaults-contract/validate.ts`** |
| payload / visibility | **`src/payload-contract/`**、**`src/visibility-contract/`** |

**不再**维护 `docs/email-*.md` 与 server 并行的规格文档。

## 落盘约定（行为摘要）

- **根目录**：`<项目根>/data/emails`，可用环境变量 **`EMAIL_DATA_ROOT`** 覆盖。
- **一封邮件**：`data/emails/<emailKey>/`；**`emailKey`** 字符集 `[a-zA-Z0-9._-]`，禁止 `..` 与路径分隔符。
- **列表**：服务端扫描子目录，可不维护 `_registry.json`。

### 每目录常见文件（职责一句）

**标准结构（推荐）**：`payload.json` 在场景根；每个版式在 `layouts/<layoutVariantId>/` 含 **template + tokenPresets**；清单见 `layout-manifest.json`。仅 **一个版式** 时通常使用 id **`default`**。

**Legacy（待迁移）**：template + tokenPresets 仍在场景根目录（无 `layout-manifest.json`）。

| 文件 | 说明 |
|------|------|
| `template.json` | 结构真源 |
| `tokenPresets.json` | 本邮件样式预设与 `$themeRef` 解析 |
| `payload.json` | **场景级共享**业务变量；无槽时 **`values: {}`** |
| `meta.json` | 展示元数据 |

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
| 读写 template / token | `GET|PUT /api/v1/emails/:key/template?layout=<id>`、`GET|PUT .../token-presets?layout=<id>` |
| 切换当前版式 | `GET|PUT /api/v1/emails/:key/layout-manifest` |
| payload | **无** `layout` 参数；PUT 时须对所有版式 `template` 通过 payload 对照校验 |
| 迁移脚本 | `node scripts/migrate-email-layout-variants.mjs --write [--email=...]` |

`data/token-presets/<id>.json`：可选公共预设。

## Agent 新建目录（可不经 API）

1. 新建 `data/emails/<emailKey>/`。
2. 写入上表各 JSON（至少含模板侧必需项；以 **`npm run validate:all`** 是否通过为准）。
3. `templateId` 建议与 `emailKey` 一致；`payload` 与模板版本字段与实现一致。
4. **`npm run validate:all`**。

## 本地 API 摘要

- 基址默认 **`http://127.0.0.1:3001/api/v1`**（以 `server` 启动日志为准）。
- 写 template / tokenPresets / payload 后服务端校验；失败返回 422 + details。
- **`config-schema` 路由已移除**；勿再生成或请求 `configSchema.json`。

## 相关技能

**`easy-email-concepts`**、**`email-config-motherboard`**、**`easy-email-payload-contract`**。
