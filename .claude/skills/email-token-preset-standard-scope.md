---
name: email-token-preset-standard-scope
description: >-
  定义本仓库「样式预设」在 tokenPresets.json 中约定的标准 family / scale 集合，以及模板里 $themeRef 与 bindings.tokenPath 的合法写法；
  含「组件/字段应绑到哪一条标准 token」的决策思维（设计意图、胶囊类型、白名单与刻意不绑的边界）；
  以 data/emails/on-cart-abandon-2 为对齐样例。当用户或 Agent 新建/扩展 tokenPresets、批量绑定 $themeRef、核对模板是否引用未声明 token、或要求「与弃购 2 同一套预设范围」时使用。
---

# 样式预设标准范围（索引）

## 代码真源指针

| 问题 | 路径 |
|------|------|
| **14 个标准 family.scale 列表与排序** | **`src/token-preset-contract/standard-keys.ts`**（`TOKEN_PRESET_STANDARD_KEYS`） |
| 预设 JSON 校验 | **`src/token-preset-contract/validate.ts`**（已接入 **`npm run validate:all`**） |
| **`$themeRef` 路径白名单** | **`src/token-preset-contract/theme-ref-paths.ts`** |
| 某模板字段是否允许出现 `$themeRef` | **`src/lib/resolveThemeInTemplate.ts`**（如 `isThemeRefAllowed`） |
| configSchema 中外壳字段 | **`src/lib/validateConfigSchema.ts`** |
| 样例邮件 | **`data/emails/on-cart-abandon-2/tokenPresets.json`**（与该校验通过的 template 对齐） |

**不**在本技能重复打印 14 行键表；与 `standard-keys.ts` 冲突以 **代码** 为准。

## 维护流程

扩展标准键：**先改 `standard-keys.ts` + `validate.ts`（及 theme-ref-paths / 标签若有）** → 再改样例邮件与技能中**非表格**描述 → **`npm run validate:all`**。

## 字段 → token 的决策（摘要）

1. **是否应随换档变化**：应 → `$themeRef` + binding；营销合规钉死 → 字面量。  
2. **胶囊类型**：仅 **`blockFieldClassification`** 为 **style** 且字段允许 theme 的路径可绑 token；**content / structural** 按 **`email-config-motherboard`**。  
3. **选哪条标准键**：按设计意图对齐 **单一意图**（如主色 → `colors.primary`、模块竖直节奏 → `tokens.spacing.section`）；细则见各 **`family`** 语义注释（**`standard-keys.ts`** 与 **`on-cart-abandon-2`**）。  
4. **对称**：`$themeRef` 字符串与 **`bindings[].tokenPath`** 一致。

## 刻意不绑 token

骨架类：**`widthMode`**、**`direction`**、**`placement`** 等——以字面量稳定表达；例外与对比度特例见 **`email-template-restore-check`**。

## 工作台语义（摘要）

本邮件预设、公共预设、默认选中 **`meta.defaultStylePresetSelection`** 等——以 **`App.tsx`** / **`server/index.ts`** 实际行为为准；勿在 skills 维护第二份状态机说明。

## 自检

```bash
npm run validate:all
```

## 相关技能

**`email-config-motherboard`**、**`easy-email-concepts`**、**`email-template-restore-guide`**。
