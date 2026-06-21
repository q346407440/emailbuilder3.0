# AI 管线 · 外部 API 接入参考

本目录只记录 **第三方 HTTP API** 的接入方式与环境变量，供 AI 管线（以图创建版式、RestoreAst、素材解析等）查阅。

**不包含**产品方案、管线步骤设计、Prompt 契约——那些见 `.cursor/skills/`（如 `email-template-restore-guide`）与 `docs/AI以图还原-*`。

## 索引

| 文档 | 服务 | 本仓库实现 |
|------|------|------------|
| [doubao-ark-chat-completions.md](./doubao-ark-chat-completions.md) | 火山方舟 Ark · Chat Completions（豆包，OpenAI 兼容） | `src/lib/ai-pipeline/adapters/doubaoClient.ts`、`openAiCompatibleChat.ts` |
| [gemini.md](./gemini.md) | Google Gemini · `generateContent`（含 thinking、多模态） | `src/lib/ai-pipeline/adapters/geminiClient.ts` |
| [pexels-image-search.md](./pexels-image-search.md) | Pexels 摄影图搜索 | `src/lib/pexelsClient.ts` |
| [icon-cdn-jsdelivr.md](./icon-cdn-jsdelivr.md) | 图标 CDN（jsDelivr + 本地 slug 索引，非搜索 API） | `src/lib/ai-pipeline/iconCdnResolve.ts` |

## 环境变量速查

| 变量 | 用于 |
|------|------|
| `LLM_PIPELINE_VENDOR` | `doubao`（默认）或 `gemini` |
| `DOUBAO_API_KEY` | 豆包 Ark |
| `DOUBAO_BASE_URL` | 默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `LLM_PIPELINE_MODEL` | LLM 模型 / endpoint id |
| `GEMINI_API_KEY` | Gemini |
| `GEMINI_PIPELINE_MODEL` | Gemini 模型 id（如 `gemini-3.5-flash`） |
| `LLM_PIPELINE_TEMPERATURE` | 厂商无关采样温度（默认 `1`） |
| `LLM_PIPELINE_TOP_P` | 厂商无关 top-p（默认 `0.95`） |
| `LLM_PIPELINE_MAX_OUTPUT_TOKENS` | 厂商无关最大输出 token（默认 `8192`） |
| `PEXELS_API_KEY` | Pexels 搜图 |

详见 `.env.example`。

## 维护约定

- 只写 **官方 API 形态、鉴权、请求/响应要点、curl 示例、与本仓库封装函数的对应**。
- **厂商无关**采样参数（`temperature` / `top_p` / `max_tokens`）见契约 `src/layout-variant-ai-contract/llmGenerationParams.ts`，由 adapters 映射到各自字段名；与 `LlmProfileSelection`（厂商/模型/thinking）及 RestoreAst `json_schema` 门控分离。
- 代码变更时同步更新对应文档；厂商扩展字段（如豆包 `thinking`）写在各厂商文档内，不写进通用 HTTP 层说明。
