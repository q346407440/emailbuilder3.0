---
name: easy-email-payload-contract
description: >-
  Easy-Email payload 变量赋值契约唯一真源：`src/payload-contract/`。
  定义 payload.json 顶层形态、variable 槽 valueType（string/url/image/color/number/boolean/collection）、interpolate 原子槽、
  collection 的 itemFields 与 values 值级校验。
  槽目录真源在 payload.slots、取值在 payload.values；template 仅保留绑定关系（repeat / bindings / visibility）。
  详文 docs/邮件变量与绑定真源.md。
  当用户问「payload 契约」「列表字段类型」「slot valueType」「业务变量校验」时使用。
---

# Payload 契约（索引）

## 代码真源指针

| 层级 | 路径 |
|------|------|
| schema 版本与类型 | **`src/payload-contract/types.ts`**（`PAYLOAD_SCHEMA_VERSION` 等） |
| **槽顶层的 valueType 枚举、槽 id 模式** | **`src/payload-contract/value-types.ts`**（**不**在本技能重复表格） |
| **列表行字段 `itemFields`（类型、2 级嵌套、image→url）** | **`src/payload-contract/collection-item-fields.ts`** + **`value-types.ts`** · `COLLECTION_ITEM_FIELD_TYPES` |
| 从 template 合并外部可赋值槽 | **`src/payload-contract/slot-registry.ts`**（`buildExternalSlotRegistry`） |
| 校验实现 | **`src/payload-contract/validate.ts`** |
| template 侧编排入口 | **`src/lib/validate.ts`**（`validateTemplateBindings`、`validatePayloadAgainstTemplate` 等） |

维护：**先改 `types.ts` / `value-types.ts` / `collection-item-fields.ts`** → 再改 **`validate.ts`** 与单测 → **`npm run validate:all`**。列表行字段类型须与 **`standard-scalar-types.ts`** 一致（+ `collection`），勿新增 `image` 列类型。

## 两层分工（必读，勿再双写）

| 层 | 真源 | 说明 |
|----|------|------|
| 变量目录 | **`payload.json` → `slots`** | label、valueType、collection 的 itemFields/min/max、dataSource；类型定义见 **`types.ts`** · **`PayloadSlotDefinition`** |
| 变量取值 | **`payload.json` → `values`** | 预览合并 **`mergeTemplatePayload`** 只读此层 |
| 绑定关系 | **`template.json`** | `bindings`（slotId、mode、valueType、slotPath、interpolationSlots）；**禁止** `defaultValue` |
| collection 列 schema | **`blocks.*.repeat`**（主）+ **`payload.slots`**（对齐） | **禁止**在 repeat 已声明后，叶子 binding 再写 itemFields / 整表 defaultValue |
| 编辑器主题快照 | **`template.meta.easyEmailBindingUi`** | 仅 theme 解除跟随；非业务默认 |

**`buildExternalSlotRegistry(template)`**：从 template 扫描 **合并** 槽目录（repeat 优先）；日常 UI 用 **`collectPayloadVariableSlots`** → 以 **`payload.slots`** 为准。  
人类可读分工：**`docs/邮件变量与绑定真源.md`**。

**`interpolate`**：单层 **`{{ slotId }}`**；原子槽定义在 `interpolationSlots`，**无** `defaultValue`；值在 **`payload.values`**。  
**visibility**：运算符合法性在 **`src/visibility-contract/`**；消费的槽纳入注册与类型校验。

## 与 `validateTemplate` 的关系

- **template**：`validateTemplateBindings` → `validateExternalVariableBindingSpec` / `validateExternalInterpolateBindingSpec`、**`collectionSlotMissingItemFields`**
- **payload**：**`validatePayloadAgainstTemplate(template, payload)`**

## Agent 检查（流程）

1. template：加 **bindings** / **repeat**（仅绑定关系；collection 列写在 **repeat.itemFields**）。
2. **payload.slots**：补目录（可与 **`npm run migrate:payload-slots:write`** 对齐 template）。
3. **payload.values**：补业务取值（**勿**写回 template `defaultValue`）。
4. 改 collection 列：**repeat.itemFields** + **payload.slots** + **payload.values** 三处同步；行字段类型/嵌套遵守 **`collection-item-fields.ts`**（最多 2 级列表）。
5. 收尾：**`npm run validate:all`**。

存量清理（禁止回退双写）：**`migrate:static-collection-to-repeat`**、**`migrate:prune-collection-binding-meta`**、**`migrate:prune-scalar-binding-default-value`**（均见 **`package.json`**）。
