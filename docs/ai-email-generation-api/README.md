# AI 邮件生成 · 参考文档

记录 **以图创建版式** 的还原逻辑（参考 handoff 项目），**不是**代码移植清单。

对照仓库：`/Users/hengliheng/emailbuilder2.0-handoff-export`（仅作「对方怎么拆步骤」的参照）。

## 索引

| 文件 | 说明 |
|------|------|
| [**方案-以图AI生成邮件版式.md**](./方案-以图AI生成邮件版式.md) | **方案总览** + **§14 提示词/JSON 示例** + **§15 企业级契约**（Zod、`assetManifest`、Parse/Normalize） |
| [doubao-ark-chat-completions.md](./doubao-ark-chat-completions.md) | **以图还原管线逻辑** + **§4.1 豆包 `response_format`（IR json_schema）** |
| [pexels-image-search.md](./pexels-image-search.md) | **Pexels 真实配图 API**（自 handoff 迁入；实现 `src/lib/pexelsClient.ts`） |

## 本仓库入口

| 项 | 路径 |
|----|------|
| HTTP | `POST /api/v1/emails/:emailKey/layout-variants/ai-from-image` |
| 实现挂点 | `server/layoutVariantAiFromImage.ts` |
| 超时 | `src/layout-variant-ai-contract/constants.ts`（120s） |

## 维护约定

- 只同步**逻辑**变更（步骤、依赖、中间产物含义），不维护 handoff 文件路径表。
- 落盘形态以本仓库 `template.json` / `tokenPresets.json` 契约为准，交付前 `npm run validate:all`。
