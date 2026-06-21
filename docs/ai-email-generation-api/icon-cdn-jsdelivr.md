# 图标 CDN（jsDelivr + 本地索引）

AI 管线中的图标 **不是** 调用第三方「图标搜索 API」，而是：

1. LLM 输出图标 **slug / 查询词**（如 `instagram`、`truck`）
2. 本仓库在 **本地 JSON 索引** 中解析 slug
3. 拼出 **jsDelivr 锁版本** 的静态 SVG URL

## 本仓库实现

| 项 | 路径 |
|----|------|
| 解析逻辑 | `src/lib/ai-pipeline/iconCdnResolve.ts` |
| slug 索引 | `data/icon-cdn/simple-icons-index.json`、`tabler-icons-index.json`、`lucide-icons-index.json` |
| 同步索引脚本 | `npm run sync:icon-cdn-index` |
| 管线调用 | `src/lib/ai-pipeline/assetResolve.ts`、`src/restore-ast-contract/`（`resolveAstAssetRequests`） |

远程 URL 约定见技能 **`email-remote-asset-urls`**。

## 「API」形态说明

| 类型 | 是否有 HTTP 搜索 API |
|------|---------------------|
| Pexels 摄影 | 有（见 [pexels-image-search.md](./pexels-image-search.md)） |
| 图标 | **无**；仅 GET 静态 SVG |

图标 URL 由代码拼接，例如：

```text
https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg
https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/truck.svg
https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/map-pin.svg
```

版本号以 `data/icon-cdn/*-index.json` 内 `version` / `cdnBase` 为准。

## 支持的图标包

| pack | 索引文件 | 可着色（tint） |
|------|----------|----------------|
| `simple-icons` | `simple-icons-index.json` | 否（品牌色固定） |
| `tabler` | `tabler-icons-index.json` | 是 |
| `lucide` | `lucide-icons-index.json` | 是 |

## 本仓库封装

| 函数 | 用途 |
|------|------|
| `resolveIconCdnUrl(pack, iconQuery)` | 主解析：精确 → 别名 → 前缀/编辑距离 → fallback |
| `resolveIconCdnCandidates(pack, iconQuery, limit)` | 多个候选 URL，供逐个验活 |
| `normalizeIconSlug(query)` | 查询词规范化（小写、空格转 `-`） |

解析失败时可能使用索引内 `fallbackSlug`（默认 `photo`）。

## 验活

拼接后的 URL 应 HTTP 200。管线侧可对 `resolveIconCdnCandidates` 结果逐个请求；Agent 手写模板时亦须 `curl -I` 或 DevTools Network 核验。

## curl 示例（验活，非搜索）

```bash
curl -sI "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg" | head -1
```
