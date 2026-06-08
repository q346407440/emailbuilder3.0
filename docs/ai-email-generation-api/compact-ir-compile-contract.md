# Compact IR 与 D/E 编译契约

> 机器真源：`src/layout-variant-ai-contract/compactIr.ts`、`pipelineCompile.ts`  
> 消费方：Stage A/C prompt、`schemas/compact-section.ts`、D 语义规范化、E lowering

## 1. 三层分工

| 层 | 谁 | 输出什么 |
|----|-----|---------|
| **LLM** | Stage A/B/C | 布局语义 + Compact IR（不是 nested template） |
| **D** | `mergeSections` 演进中 | 合法、可 lowering 的 Compact IR |
| **E** | `mapPipelineResultToEasyEmail` | nested `template.json`（字段表驱动） |
| **Gate** | `validateTemplate` | 仅验证，不修复 |

Prompt 只教 **Compact IR 契约**；不把 `validate.ts` 全文塞进 system。

## 2. Compact IR 形态

```json
{ "root": { "kind": "layout.container", "props": {}, "wrapper": {}, "children": [] } }
```

- kind 白名单：见 `COMPACT_IR_BLOCK_KINDS`
- 禁止：`schemaVersion`、`blocks`、`$themeRef`、URL、EmailBlock 字段等（见 `COMPACT_IR_FORBIDDEN_OUTPUT_KEYS`）

## 3. Stage A 新增：imageSlots.role / layoutTier

| 字段 | 用途 |
|------|------|
| `role` | hero / logo / card / background → D 查容器预设表 |
| `layoutTier` | hero 必填：compact / standard / tall → 程序映射 px |
| `imageQuery` | B4 Pexels，不决定 template 盒模型 |

## 4. D/E 不变量

完整列表见 `PIPELINE_COMPILE_INVARIANTS`（含 D-LAYOUT-2 hug/fill、D-BOX-2 图片预设、E-MAP-1 lowering 必填等）。

## 5. Prompt 与契约同步

- Stage C 的格式/禁止项/盒模型意图段由 `buildCompactIr*PromptSection()` 派生
- 单测：`layout-variant-ai-contract/compactIr.test.ts` 断言 kind 白名单一致

## 6. 后续实现

- [x] D：`compileCompactSectionRoot`（sanitize → align → boxModes/imagePreset → layoutConstraints）
- [x] E：`completeLoweringWrapperDimensions`；移除 editor reconcile 主路径
- [ ] Gate 失败 → compactPath 映射 + Stage C 结构化重试
- [ ] lowering 字段表 codegen（与 block-contract 派生）

详见 `方案-以图AI生成邮件版式.md` §7.2.1 / §7.2.2。
