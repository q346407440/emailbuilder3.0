---
name: easy-email-repeat-binding
description: >-
  Easy-Email 列表重复（repeat）绑定与物化态重绑：代码真源在 src/lib/repeatRegion.ts、repeatMaterializedNormalize.ts、repeatNestedBinding.ts；
  UI 在 Inspector、RepeatRegionBindModal、ValidationIssuesBanner、BlockTree。
  当用户说「列表绑定」「解除列表绑定」「父级与子级都循环」「物化态重绑」「fieldMappings 映射目标不存在」、
  referral-friend-joined 主推 SPU+SKU、嵌套 skus 循环、绑定向导默认变量/行模板时使用。
  场景走查与任务勾选见 docs/referral-friend-joined-列表重复绑定交互优化.md 与 docs/referral-friend-joined-列表绑定前端走查与交互优化-2026-05-21.md。
---

# 列表重复绑定（repeat）

## 写作约定

- **字段白名单、binding/repeat JSON 形态**：以 **`src/block-contract/`**、**`src/lib/validate.ts`**、**`src/payload-contract/`** 为准；本技能**不**维护第二份键表。
- **行为真源（解除 / 物化 / 重绑 / 映射归一）**：以下 **`src/lib/*`** 模块；改行为须先改 lib，再改 UI，最后 **`npm run validate:all`** 与单测。
- **产品走查与 F1–F13 清单**：**`docs/referral-friend-joined-列表绑定前端走查与交互优化-2026-05-21.md`**（交互/UI）；**`docs/referral-friend-joined-列表重复绑定交互优化.md`**（契约 + §8 任务表）。

## 代码真源指针

| 能力 | 路径 |
|------|------|
| 物化行 id、解除物化、`parentId` 回写、展开 | **`src/lib/repeatRegion.ts`** |
| **物化态重绑归一化**（`cell-1`→`cell`、删多余 SPU 行、折叠 SKU 副本） | **`src/lib/repeatMaterializedNormalize.ts`** · `normalizeTemplateBeforeUnifiedRepeatBinding` |
| **`fieldMappings.targetBlockId` 随归一化**（如 `main-img-1`→`main-img`） | 同上 · **`remapRepeatFieldMappingTargets`**（`applyUnifiedRepeatBinding` 入口自动调用） |
| 嵌套解除、合一绑定、父/子映射过滤、子级行模板选项 | **`src/lib/repeatNestedBinding.ts`** |
| 向导默认变量、物化行模板副文案 | **`src/lib/repeatNestedBindingUi.ts`** · `pickRepeatCollectionCandidateForHost`、`repeatPrototypePickerCanonicalHint` |
| Inspector 列表 Tab、应用绑定 | **`src/components/Inspector.tsx`** |
| 绑定向导 5 步 | **`src/components/RepeatRegionBindModal.tsx`** |
| 顶栏校验折叠 / 物化中间态 | **`src/components/ValidationIssuesBanner.tsx`** · **`src/App.tsx`** |
| 区块树 repeat 标签 / 物化静态「静态」 | **`src/lib/repeatRegionTreeTags.ts`** · **`src/components/BlockTree.tsx`** |
| 回归单测 | **`src/lib/repeatNestedBinding.test.ts`**、**`src/lib/repeatRegion.test.ts`** |

变量槽与 `repeat.itemFields` 分工见 **`easy-email-payload-contract`**、**`docs/邮件变量与绑定真源.md`**。

## 数据流（用户心智 ↔ 磁盘）

```text
列表宿主 layout/grid（如 rfj-picked-spotlight）
  repeat.slotId → payload collection（如 pickedSpotlightProduct）
  prototypeChildIds → 行模板根（如 cell）
    └─ 可选：子级 repeat 写在行模板子树上，itemPath: skus（如 sku-strip）
         prototypeChildIds → SKU 行模板（如 sku-1）
```

**解除父级绑定**：`removeUnifiedRepeatBinding` → 按 payload 项数 **物化** 为多份静态行（`cell-1`、`cell-2`…），清除子树内 **所有** `repeat`；物化 `sku-strip-*` **不得**再露「绑定列表」。

**物化态重绑**：用户在向导里可仍点选 `cell-1`、`sku-strip-1`；**写入前** `applyUnifiedRepeatBinding` 调用归一化 + **`remapRepeatFieldMappingTargets`**，落盘为原型 id。

## Agent 必守（易错）

1. **同模块多列表变量**：打开向导默认槽用 **`pickRepeatCollectionCandidateForHost`**（如 `rfj-picked-spotlight` → `pickedSpotlightProduct`，勿误 `pickedProducts`）。
2. **子级行模板**：默认优先 **SKU 规格列表宿主**（`sku-strip`），勿选价格行；物化 SKU 第 2+ 项由 **`isDisallowedChildRepeatPrototypeOption`** 过滤。
3. **父级字段映射**：仅 SPU 标量；SKU 子树用 **`filterParentRepeatMappingTargets`** 排除（子级步骤再映）。
4. **勿在 template 手写物化 id 为长期真源**：物化 `*-1` 仅为解除后中间态；重绑后应为原型 + `repeat`。
5. **明确不做**：按模块预选变量、恢复上次绑定、软/硬解除（与物化契约冲突）。

## 标准回归（改 lib/UI 后）

```bash
npm run test:unit -- src/lib/repeatNestedBinding.test.ts src/lib/repeatRegion.test.ts
npm run validate:all
```

浏览器（改 Inspector/绑定向导/校验条后）：**`easy-email-frontend-chrome-verify`** · 邮件 `referral-friend-joined` · 区块 `rfj-picked-spotlight` · 解除 → 重绑 `pickedSpotlightProduct`（父+子循环）· 确认 Pulse 区 2 个 Pulse SKU、无「映射目标区块不存在」硬错误。

## 相关技能

| 场景 | 技能 |
|------|------|
| 概念与四层落盘 | `easy-email-concepts` |
| payload 槽 / collection 列 | `easy-email-payload-contract` |
| 配置母版与 template 结构 | `email-config-motherboard` |
| 按图还原易漏 | `email-template-restore-check` |
| 前端验收 | `easy-email-frontend-chrome-verify` |
