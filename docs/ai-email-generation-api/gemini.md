# Google Gemini · Generate Content API

本仓库 **已支持** Gemini（弹窗可选 + `geminiClient.ts`）；须配置 `GEMINI_API_KEY`。

官方入口：[Gemini API 概览](https://ai.google.dev/gemini-api/docs) · [Text generation](https://ai.google.dev/gemini-api/docs/text-generation) · [Thinking](https://ai.google.dev/gemini-api/docs/thinking) · [Structured output](https://ai.google.dev/gemini-api/docs/structured-output)

## 本仓库计划接入点

| 项 | 路径 |
|----|------|
| 工厂分支 | `src/lib/ai-pipeline/createLlmClient.ts` |
| 适配器 | `src/lib/ai-pipeline/adapters/geminiClient.ts` |
| 业务端口 | `src/lib/ai-pipeline/ports/LlmClient.ts` |

新业务代码应通过 `createDefaultLlmClient()` 获取客户端，或在单测中注入 `mockLlmClient`。

**注意**：Gemini **不是** OpenAI `/chat/completions` 形态，不能复用 `openAiCompatibleChat.ts`（除非走 [OpenAI 兼容层](https://ai.google.dev/gemini-api/docs/openai)）。

## 环境变量（建议）

| 变量 | 说明 |
|------|------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com) 申请 |
| `GEMINI_PIPELINE_MODEL` | 模型 id，如 `gemini-3.5-flash` |
| `LLM_PIPELINE_TEMPERATURE` | 与豆包共用（`generationConfig.temperature`） |
| `LLM_PIPELINE_TOP_P` | 与豆包共用（`generationConfig.topP`） |
| `LLM_PIPELINE_MAX_OUTPUT_TOKENS` | 与豆包共用（`generationConfig.maxOutputTokens`） |

采样参数契约与映射见 [README](./README.md) 与 `llmGenerationParams.ts`；RestoreAst 的 `responseSchema` 仅方案 2 + 豆包 2.0 时启用，Gemini 走 prompt + 解析。

## HTTP 接口

| 项 | 值 |
|----|-----|
| 方法 | `POST` |
| URL | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| 鉴权 | Header：`x-goog-api-key: <GEMINI_API_KEY>`（**不是** `Authorization: Bearer`） |
| Content-Type | `application/json` |
| 流式 | 同路径改为 `streamGenerateContent`（本仓库管线当前用非流式即可） |

`{model}` 示例：`gemini-3.5-flash`、`gemini-2.5-flash`。完整列表见 [Models](https://ai.google.dev/gemini-api/docs/models)。

## 请求体结构

```json
{
  "systemInstruction": {
    "parts": [{ "text": "你是邮件模板分析助手。" }]
  },
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "分析这张设计图" }
      ]
    }
  ],
  "generationConfig": {
    "maxOutputTokens": 8192,
    "thinkingConfig": {
      "thinkingLevel": "low"
    }
  }
}
```

| 字段 | 说明 |
|------|------|
| `contents` | 对话轮次；每轮 `parts` 可含 `text`、`inline_data`（图片 base64）等 |
| `systemInstruction` | 等价于 OpenAI 的 `system` 消息 |
| `generationConfig` | 输出上限、thinking、JSON 模式等 |

### 基础文本（curl）

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "contents": [{
      "parts": [{ "text": "How does AI work?" }]
    }]
  }'
```

### 多模态：设计图（inline_data）

与 Easy-Email 管线「base64 设计图」一致，可用 `inline_data` 内联图片（无需先走 Files API）：

```json
{
  "contents": [{
    "parts": [
      { "text": "分析这封邮件的设计结构" },
      {
        "inline_data": {
          "mime_type": "image/png",
          "data": "<BASE64_WITHOUT_PREFIX>"
        }
      }
    ]
  }]
}
```

大文件或重复使用同一图时，可用 [Files API](https://ai.google.dev/gemini-api/docs/files) 上传后用 `file_data` / URI 引用。

## 响应解析

典型成功响应：

```json
{
  "candidates": [{
    "content": {
      "parts": [
        { "text": "…模型最终回答…" }
      ]
    }
  }]
}
```

取文本时遍历 `candidates[0].content.parts`，**跳过** `thought: true` 的 part（思考摘要），只拼接正常回答 part 的 `text`。

## Thinking（推理 / 深度思考）

Gemini 3 / 2.5 系列默认带内部推理。控制方式与豆包 `thinking: { type: "disabled" }` **不同**，写在 `generationConfig.thinkingConfig`。

### Gemini 3+：`thinkingLevel`

推荐用于 Gemini 3 / 3.5 等。REST 示例：

```json
{
  "generationConfig": {
    "thinkingConfig": {
      "thinkingLevel": "low"
    }
  }
}
```

| 级别 | 说明（摘要） |
|------|-------------|
| `minimal` | 尽量低延迟；不保证完全关闭思考 |
| `low` | 低延迟、低成本，适合指令跟随 |
| `medium` | 均衡（如 gemini-3.5-flash 默认） |
| `high` | 更深推理，首 token 更慢 |

- Gemini 3.1 Pro **无法**完全关闭 thinking。
- 未指定时各模型有默认 level（如 3.1 Pro 默认 `high`，3.5 Flash 默认 `medium`）。

**Easy-Email 建议**：以图还原偏结构化 JSON、控时延，接入时可默认 `thinkingLevel: "low"` 或 `"minimal"`（视模型支持）。

### Gemini 2.5：`thinkingBudget`

2.5 系列用 token 预算，不用 `thinkingLevel`：

```json
{
  "generationConfig": {
    "thinkingConfig": {
      "thinkingBudget": 1024
    }
  }
}
```

| 值 | 含义 |
|----|------|
| `0` | 关闭 thinking（部分 2.5 型号支持） |
| `-1` | 动态 thinking（默认） |
| 正整数 | 限制思考 token 上限（各型号范围不同，见官方表） |

> Gemini 3 上请优先用 `thinkingLevel`；对 3 Pro 混用 `thinkingBudget` 可能导致表现异常。

### 思考摘要（可选）

调试时可设 `includeThoughts: true`，响应 `parts` 里会出现 `thought: true` 的摘要文本，与最终答案分开。管线落盘 **不要** 把 thought part 当 LLM 输出。

## 结构化 JSON 输出

RestoreAst（方案 2）是否传 API 层结构化参数 **不由弹窗「模型配置」控制**，见 `resolveRestoreAstLlmResponseFormat`：

| 条件 | 行为 |
|------|------|
| 方案 2 + 豆包 + 模型号 = 服务端 `LLM_PIPELINE_MODEL`（当前豆包 2.0） | 豆包 `response_format.json_schema` |
| 方案 2 + Gemini | **不传** json_schema / responseSchema，靠 prompt + `parseRestoreAstDocument` |
| 方案 1（patch，暂留） | 不传（未实现） |

若需 JSON 模式说明，对照官方 [Structured output](https://ai.google.dev/gemini-api/docs/structured-output)（Gemini 方案 2 当前未启用 responseSchema）。

## 与豆包（当前默认）对照

| 能力 | 豆包 Ark | Gemini |
|------|----------|--------|
| 协议 | OpenAI `POST …/chat/completions` | `POST …/models/{id}:generateContent` |
| 鉴权 | `Authorization: Bearer` | `x-goog-api-key` |
| 系统提示 | `messages` 中 `role: system` | `systemInstruction` |
| 多模态 | `image_url.url`（data/https） | `inline_data` 或 Files API |
| 关闭/压低推理 | `thinking: { type: "disabled" }` | `thinkingConfig.thinkingLevel` / `thinkingBudget` |
| 严格 JSON Schema | `response_format.json_schema` + 回退链 | `responseMimeType` + `responseSchema` |

## 其他 generationConfig 要点

- `maxOutputTokens`：长 JSON 输出（RestoreAst）时提高上限。
- 官方建议 **Gemini 3.x** 尽量保持 `temperature` / `top_p` / `top_k` 默认，随意调低可能导致循环或性能下降。

## 官方延伸阅读

- [Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai)（含 thinking 兼容说明）
- [API reference · GenerateContent](https://ai.google.dev/api/generate-content)
