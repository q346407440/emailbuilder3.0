# Pexels 摄影图搜索 API

按英文关键词搜索可直链的摄影图，用于 AI 管线配图（RestoreAst `backfillAssets`、旧 A→B→C 管线 B4、mjs 资产解析等）。

官方文档：[Photos Search](https://www.pexels.com/api/documentation/#photos-search)

## 本仓库实现

| 项 | 路径 |
|----|------|
| HTTP 客户端 | `src/lib/pexelsClient.ts` |
| 测试 | `src/lib/pexelsClient.test.ts` |
| 管线调用 | `src/lib/ai-pipeline/assetResolve.ts`、`restore-ast-contract/backfillAssets.ts` 等 |

模板中手写 Pexels 直链约定见技能 **`email-remote-asset-urls`**。

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PEXELS_API_KEY` | 要用搜索时必填 | [Pexels API](https://www.pexels.com/api/) 申请 |

未配置时：`searchPexels` / `searchPexelsBest` 返回空，管线降级（图片 `src` 留空或使用占位策略）。

## HTTP 接口

| 项 | 值 |
|----|-----|
| 方法 | `GET` |
| URL | `https://api.pexels.com/v1/search` |
| 鉴权 | Header：`Authorization: <PEXELS_API_KEY>`（**不是** `Bearer`） |
| 常用 Query | `query`（英文 2–4 词）、`per_page`、`orientation`（`landscape` \| `portrait` \| `square`） |
| 客户端超时 | 8s（`AbortSignal.timeout`） |

### 响应要点

每条 `photo` 含 `id`、`width`、`height`、`alt`、`photographer`、`src`（`large` / `large2x` / `medium` / `small` 等）。

### curl 示例

```bash
curl -s "https://api.pexels.com/v1/search?query=coffee%20shop&per_page=1&orientation=landscape" \
  -H "Authorization: $PEXELS_API_KEY"
```

## 本仓库封装

| 函数 | 用途 |
|------|------|
| `searchPexels(query, { perPage, orientation })` | 原始列表 |
| `pickPexelsSrc(photo, targetWidth?)` | 写入模板的直链；**固定 `src.original`**（只贴链不下载，避免小档放大发糊）。`targetWidth` 保留参数兼容旧调用，不参与选档。 |
| `searchPexelsBest(query, targetWidth, orientation?)` | **推荐**：返回一张 `{ url, alt, photographer }` |
| `parsePexelsQueryKeywords(query)` | 分词（预留） |

`pickPexelsSrc` 规则（Easy-Email 约定）：

| 说明 |
|------|
| 始终使用 API 返回的 `photo.src.original` |
| 不再按 `targetWidth` 选 `large` / `medium` / `small` |

## 管线中的典型用法

1. LLM 产出英文 `imageQuery`（禁止直接写 `images.pexels.com` URL）。
2. 由分区宽高推断 `orientation`。
3. `searchPexelsBest(imageQuery, targetWidth, orientation)`。
4. 成功写入 `src`；失败则留空或走后续降级。

写入模板的 URL 形态：`https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?...`，交付前应用 `curl -I` 或浏览器 Network 确认可访问。
