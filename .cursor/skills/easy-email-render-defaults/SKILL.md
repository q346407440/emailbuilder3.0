---
name: easy-email-render-defaults
description: >-
  Easy-Email「渲染默认 / 禁止持久化」唯一真源：`src/render-defaults-contract/`。
  定义画布会生效但不写入 template.json 的固定规则、禁止字段、以及底图 padding 等特殊渲染语义。
  与 block-contract（允许写什么 JSON）、token-preset-contract（样式预设键）并列。
  当用户问「哪些配置不进 JSON」「项目默认规则」「底图内边距语义」「render defaults schema」时读取。
---

# 渲染默认契约（索引）

## 代码真源指针

| 文件 | 职责 |
|------|------|
| **`src/render-defaults-contract/rules.ts`** | 规则 **id / kind / 摘要 / jsonPath / implementation** 目录（**完整列表只维护在此处**） |
| **`src/render-defaults-contract/values.ts`** | 注入常量（如 contentAlign 回退、行高等） |
| **`src/render-defaults-contract/validate.ts`** | `validateRenderDefaultsForbiddenFields`；**`stripForbiddenRenderDefaultsFromTemplate`**（仅剥离本文件实现的 **wrapperStyle 子集**） |
| **`src/render-defaults-contract/types.ts`** | `RenderRuleKind`：`forbiddenInJson` / `injectedAtRender` / `specialSemantic` |
| **`src/lib/validate.ts`** | 另含大量**非** render-defaults 包的禁止项与必填（二者同时满足） |

维护顺序：**先改 `rules.ts`（及 `values.ts` 若涉及）→ 再改 `validate.ts` / 渲染实现**（与 `rules.ts` 的 `implementation` 字段指向一致）→ **`npm run validate:all`**。

## 三类规则（心智模型）

含义与条目以 **`rules.ts`** 的 **`kind`** 为准：

1. **`forbiddenInJson`**：不得写入 template；违反则校验失败。  
   - **剥离**：仅 **`stripForbiddenRenderDefaultsFromTemplate`** 覆盖的键会由 **`scripts/strip-forbidden-wrapper-fields.ts`** 删除。  
   - **其它禁止项**（例如 **`layout.props.crossAlign`**）在 **`validate.ts`** 等处处理，**不在** strip 脚本中。
2. **`injectedAtRender`**：画布生效、默认**不写**进 JSON（或缺失时回退）。
3. **`specialSemantic`**：字段**可**进 JSON，但在某上下文下渲染语义不同（如底图 **`padding`** → 规则 **`semantic.backgroundPadding`**，见 `rules.ts`）。

## 与相邻契约的分工

| 契约 | 回答 |
|------|------|
| `block-contract` | **允许**持久化哪些路径 |
| `render-defaults-contract` | **禁止**写哪些、**默认注入**哪些、**哪些字段有特殊渲染语义** |
| `token-preset-contract` | token 标准键与 `$themeRef` |

## 相关技能（仅流程与口语）

**`easy-email-concepts`**、**`email-config-motherboard`**、**`email-template-restore-check`**、**`easy-email-json-unified-migration`**：不得复制 **`rules.ts`** 全文；有出入以 **`rules.ts`** 为准。

## 脚本

```bash
npx tsx scripts/strip-forbidden-wrapper-fields.ts --write
npm run validate:all
```

strip **仅**处理 **`render-defaults-contract/validate.ts`** 中的 wrapper 剥离逻辑；全量禁止项仍以 **`validate:all`** 为准。
