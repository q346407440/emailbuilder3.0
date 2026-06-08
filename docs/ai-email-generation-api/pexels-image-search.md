---
title: Pexels 真实配图搜索 API
source_handoff: project/server/src/lib/pipeline/pexelsClient.ts
easy_email_code: src/lib/pexelsClient.ts
archived_at: 2026-06-03
---

# Pexels 真实配图搜索 API

用于以图还原管线 **阶段 B4**（按分区关键词搜索可访问的真实摄影图 URL）。与模板里手写 Pexels 直链约定一致，见技能 **`email-remote-asset-urls`**。

## 本仓库实现

| 项 | 路径 |
|----|------|
| 代码 | `src/lib/pexelsClient.ts` |
| 测试 | `src/lib/pexelsClient.test.ts` |

从 handoff **拷贝**的是 **Pexels HTTP 调用与选图逻辑**；handoff 另有 PostgreSQL `image_library` 三级缓存（`searchWithCache`），Easy-Email **未移植**（无 DB 依赖）。

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `PEXELS_API_KEY` | 是（要用搜索时） | [Pexels API](https://www.pexels.com/api/) 申请；请求头 `Authorization: <key>` |

未配置时：`searchPexels` / `searchPexelsBest` 返回空，管线应降级（图片 `src` 留空或后续再补）。

## 对外 HTTP API（Pexels 官方）

| 项 | 值 |
|----|-----|
| 方法 | `GET` |
| URL | `https://api.pexels.com/v1/search` |
| 鉴权 | Header：`Authorization: <PEXELS_API_KEY>`（**不是** Bearer） |
| 常用 Query | `query`（英文 2–4 词）、`per_page`、`orientation`（`landscape` \| `portrait` \| `square`） |
| 超时 | 本仓库客户端 8s（`AbortSignal.timeout`） |

官方文档：[Photos Search](https://www.pexels.com/api/documentation/#photos-search)

### 响应要点（节选）

每条 `photo` 含 `id`、`width`、`height`、`alt`、`photographer`、`src`（`large` / `large2x` / `medium` / `small` 等）。

本仓库用 `pickPexelsSrc(photo, targetWidth)` 按邮件块目标宽度选档，减少过大图片：

| 目标宽度 | 使用字段 |
|----------|----------|
| ≥ 1200px | `src.large2x` |
| ≥ 600px | `src.large` |
| ≥ 350px | `src.medium` |
| 更小 | `src.small` |

## 本仓库封装函数

| 函数 | 用途 |
|------|------|
| `searchPexels(query, { perPage, orientation })` | 原始列表，最多 `perPage` 张 |
| `pickPexelsSrc(photo, targetWidth)` | 单张选 URL |
| `searchPexelsBest(query, targetWidth, orientation?)` | **管线推荐**：一张最佳匹配 `{ url, alt, photographer }` |
| `parsePexelsQueryKeywords(query)` | 分词（预留给日后本地缓存） |

### 管线中的用法（逻辑，与 handoff 一致）

对 Grounding 阶段标记了 `hasImage` + `imageQuery` 的分区：

1. `orientation` 由分区建议宽高推断：宽 > 高 → `landscape`，反之为 `portrait`，相等为 `square`。
2. 调用 `searchPexelsBest(imageQuery, targetWidth, orientation)`。
3. 成功则写入该区的 image `src`；失败则 `src` 留空（handoff 还会走本地库/随机图，本仓库当前**无**这两级）。

并行：多个分区可对 `imageQuery` 使用 `Promise.all`（与 handoff `runImageSearch` 相同）。

## curl 示例

```bash
curl -s "https://api.pexels.com/v1/search?query=coffee%20shop&per_page=1&orientation=landscape" \
  -H "Authorization: $PEXELS_API_KEY"
```

## 与 handoff 的差异

| handoff `searchWithCache` | Easy-Email `searchPexelsBest` |
|---------------------------|-------------------------------|
| 1. Pexels API | 同 |
| 2. PostgreSQL 本地库关键词匹配 | **无** |
| 3. 随机可用图兜底 | **无** |

若以后要加本地缓存，可参考 handoff `db/index.ts` 的 `image_library` 表，在 `searchPexelsBest` 外包装三级策略。

## 自检

- [ ] 生产/本地 `.env` 配置 `PEXELS_API_KEY`  
- [ ] 搜索词为**英文**简短主题词（与 handoff Grounding 的 `imageQuery` 一致）  
- [ ] 写入 template 的 URL 为 `https://images.pexels.com/...` 且交付前可访问（`curl -I` 或浏览器 Network）  
