# 豆包 · 火山方舟 Ark Chat Completions

多模态 LLM 接入，协议为 **OpenAI 兼容** `POST /chat/completions`。

官方文档：[火山引擎 · 方舟大模型](https://www.volcengine.com/docs/82379) · [结构化输出（beta）](https://www.volcengine.com/docs/82379/1568221)

## 本仓库实现

| 层级 | 路径 | 职责 |
|------|------|------|
| 业务端口 | `src/lib/ai-pipeline/ports/LlmClient.ts` | `complete(messages, responseFormat?)` |
| 工厂 | `src/lib/ai-pipeline/createLlmClient.ts` | 读 `LLM_PIPELINE_VENDOR`，默认创建豆包客户端 |
| 通用 HTTP | `src/lib/ai-pipeline/adapters/openAiCompatibleChat.ts` | `fetch` + OpenAI 兼容 body（无厂商字段） |
| 豆包适配 | `src/lib/ai-pipeline/adapters/doubaoClient.ts` | `thinking`、`response_format` 回退链 |
| 豆包 format 回退 | `src/lib/ai-pipeline/adapters/doubaoResponseFormat.ts` | `json_schema` → `json_object` → 无 format |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DOUBAO_API_KEY` | 是 | Ark API Key |
| `LLM_PIPELINE_MODEL` | 是 | 推理接入点 id（控制台创建的 endpoint，形如 `ep-xxxxxxxx`） |
| `DOUBAO_BASE_URL` | 否 | 默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `LLM_PIPELINE_VENDOR` | 否 | 默认 `doubao` |
| `LLM_PIPELINE_TEMPERATURE` | 否 | 采样温度，默认 `1`（见 `llmGenerationParams.ts`） |
| `LLM_PIPELINE_TOP_P` | 否 | top-p，默认 `0.95` |
| `LLM_PIPELINE_MAX_OUTPUT_TOKENS` | 否 | 最大输出 token，默认 `32768`；请求体字段为 `max_tokens` |

## 共用采样参数

豆包与 Gemini 共用契约 `LlmGenerationParams`（`temperature` / `topP` / `maxOutputTokens`），经 `llmGenerationParamsApply.ts` 映射：

| 契约字段 | 豆包请求体 | Gemini `generationConfig` |
|----------|------------|---------------------------|
| `temperature` | `temperature` | `temperature` |
| `topP` | `top_p` | `topP` |
| `maxOutputTokens` | `max_tokens` | `maxOutputTokens` |

管线入口 `createLlmClientFromProfile()` 默认读取环境变量；mjs 等长文本步骤可传 `generationParams: { maxOutputTokens: … }` 局部覆盖。

## HTTP 接口

| 项 | 值 |
|----|-----|
| 方法 | `POST` |
| URL | `{DOUBAO_BASE_URL}/chat/completions` |
| 鉴权 | `Authorization: Bearer <DOUBAO_API_KEY>` |
| Content-Type | `application/json` |

### 基础请求体（OpenAI 兼容）

不含豆包扩展时，与通用 OpenAI Chat Completions 一致：

```json
{
  "model": "ep-xxxxxxxx",
  "messages": [
    { "role": "system", "content": "…" },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "分析这张设计图" },
        {
          "type": "image_url",
          "image_url": { "url": "data:image/png;base64,…" }
        }
      ]
    }
  ],
  "max_tokens": 32768
}
```

| 字段 | 说明 |
|------|------|
| `model` | 方舟 endpoint id |
| `messages` | `system` / `user` / `assistant`；`content` 可为字符串或多模态 part 数组 |
| `image_url.url` | `data:` base64 或 `https://` 公网图 |
| `max_tokens` | 长文本输出（如 mjs）时可选 |

### 响应（节选）

```json
{
  "choices": [
    { "message": { "role": "assistant", "content": "…" } }
  ]
}
```

本仓库取 `choices[0].message.content` 作为 LLM 输出字符串。

## 豆包专有扩展（仅豆包 adapter 注入）

以下字段 **不** 出现在通用 `openAiCompatibleChat` 层；仅 `doubaoClient.ts` 通过 `augmentBaseBody` 或 `bodyVariants` 追加。

### 1. `thinking` + `reasoning_effort`（深度思考）

本仓库接 **Chat Completions**（`POST …/chat/completions`），与 `thinking` 同级传 **`reasoning_effort`**（非 Responses API 的 `reasoning.effort`）。

**Seed 2.0 catalog 模型**（`doubao-seed-2-0-pro-260215` / `doubao-seed-2-0-lite-260428`）：

```json
{
  "thinking": { "type": "enabled" },
  "reasoning_effort": "low"
}
```

弹窗「Thinking」档位即 `reasoning_effort`，可选 `minimal` / `low` / `medium` / `high`，两模型默认均为 `low`。

**catalog 外 endpoint**（如 `ep-xxx`）仍关闭思考：

```json
{
  "thinking": { "type": "disabled" }
}
```

### 2. `response_format`（结构化 JSON 输出）

**仅方案 2（RestoreAst）+ 豆包 + 当前 `LLM_PIPELINE_MODEL`（豆包 2.0）** 时由 `resolveRestoreAstLlmResponseFormat` 注入；Gemini 方案 2 **不传**。不属于弹窗「模型配置」。

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "restore_ast_document",
      "strict": true,
      "schema": { "type": "object" }
    }
  }
}
```

豆包 endpoint 若不支持 `json_schema`，本仓库自动回退：

1. `json_schema`（严格 schema）
2. `json_object`（仅约束为 JSON 对象）
3. 不带 `response_format`（靠 prompt + 本地 `parseLlmJson`）

回退条件：HTTP 400 且错误信息含 `response_format` / `json_schema` / `structured output` 等（见 `isDoubaoResponseFormatUnsupported`）。

Schema 真源示例：`src/lib/ai-pipeline/schemas/restore-ast-llm-json-schema.ts`。

## curl 示例

```bash
curl -s "${DOUBAO_BASE_URL}/chat/completions" \
  -H "Authorization: Bearer ${DOUBAO_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"${LLM_PIPELINE_MODEL}"'",
    "messages": [
      { "role": "user", "content": "用一句话描述这封邮件的风格" }
    ],
    "thinking": { "type": "disabled" }
  }'
```

多模态（文本 + 图片 URL）：

```bash
curl -s "${DOUBAO_BASE_URL}/chat/completions" \
  -H "Authorization: Bearer ${DOUBAO_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "'"${LLM_PIPELINE_MODEL}"'",
    "messages": [{
      "role": "user",
      "content": [
        { "type": "text", "text": "分析设计图" },
        { "type": "image_url", "image_url": { "url": "https://example.com/design.png" } }
      ]
    }],
    "thinking": { "type": "disabled" }
  }'
```

## 本仓库封装

| 函数 | 用途 |
|------|------|
| `createDefaultLlmClient(timeoutMs?)` | 生产默认入口；JSON 输出后会 `parseLlmJson` 预检 |
| `createDefaultLlmRawClient(timeoutMs?, { maxTokens? })` | 长文本 / mjs，不做 JSON 预检 |
| `createDoubaoClient` / `createDoubaoRawClient` | 直接创建豆包客户端（测试或显式指定厂商） |

LLM 交换日志（可选）：`logs/` 下 JSON Lines，`AI_PIPELINE_LLM_EXCHANGE_LOG=0` 可关闭。

## 错误与重试

- HTTP 429 / 5xx：`OpenAiChatCompletionsError` 带 `status`，管线层 `isTransientLlmError` 可判定为可重试瞬态错误。
- 超时：`AbortSignal.timeout`（各管线步骤超时见 `src/layout-variant-ai-contract/constants.ts`）。
