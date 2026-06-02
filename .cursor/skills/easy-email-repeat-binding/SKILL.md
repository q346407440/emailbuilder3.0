---
name: easy-email-repeat-binding
description: >-
  Easy-Email 列表 repeat 绑定唯一真源：src/repeat-binding-contract/（REPEAT_BINDING_RULES）。
  运行时 src/repeat-runtime/（虚拟预览）、src/lib/repeatRegion.ts（物化/绑定）、repeatMaterializedNormalize.ts、repeatNestedBinding.ts；
  UI：Inspector、RepeatRegionBindModal（两步向导）。派生列表 A/B 见 docs/step2-相似品搭配品-derivedFrom-执行计划.md。
---

# 列表重复绑定（repeat）

## 写作约定

- **规则正文**：**`src/repeat-binding-contract/`**（`REPEAT_BINDING_RULES`）— 唯一真源。
- **字段白名单 / JSON 形态**：**`block-contract/`**、**`validate.ts`**、**`payload-contract/`**；本技能不维护键表。
- **改行为**：契约或 lib → UI → `npm run validate:all` + 单测。

## 代码指针

| 能力 | 路径 |
|------|------|
| **template 落盘 nested 4.0.0** | **`src/template-disk-contract/`**、**`src/lib/templateTreeAdapter.ts`** |
| 规则目录 / VirtualBlockRef | **`src/repeat-binding-contract/`** |
| 虚拟预览 / snapshot merge | **`src/repeat-runtime/`** · `buildRepeatPreviewModel` |
| 解除 / 物化落盘 | **`src/lib/repeatRegion.ts`** |
| 物化态重绑 | **`src/lib/repeatMaterializedNormalize.ts`** |
| 单层绑定 / 嵌套解除 | **`src/lib/repeatNestedBinding.ts`** · `applySingleLevelRepeatBinding` |
| 绑定向导 + 候选 | **`Inspector.tsx`** · **`RepeatRegionBindModal.tsx`** |
| 画布子树锁定 | **`isRepeatListBindingChildBlock`** · `App.tsx` |

## 与实现对齐的要点（索引）

```text
宿主 layout/grid/image；选中宿主本身才能落盘绑定
self-repeat：prototypeChildIds=[自身]；唯一 applySingleLevelRepeatBinding
步骤1：payload.slots 全部 collection 槽 + 可选父 repeat.itemFields 子列表（::itemPath）
步骤2：仅标量 itemFields；fieldMappings 可空；排除更内层 repeat 子树
fieldMappings 与 bindings slotPath 0.xxx 可并存
父级 removeUnifiedRepeatBinding 清子树 repeat；apply 父级不清子级 repeat
物化：第1项保留原型 id，第2项起 原型-2…；预览用 **VirtualBlockRef + repeat-runtime**，不克隆进 template.blocks
```

## 回归

```bash
npm run test:unit -- src/repeat-binding-contract/repeat-binding-contract.test.ts src/lib/repeatNestedBinding.test.ts src/lib/repeatRegion.test.ts
npm run validate:all
```

## 相关

| 场景 | 文档 / 技能 |
|------|-------------|
| payload 槽 | `easy-email-payload-contract` |
| 派生 A/B Step 2/3 | `docs/step2-相似品搭配品-derivedFrom-执行计划.md` |
| 浏览器验收 | `easy-email-frontend-chrome-verify` |
