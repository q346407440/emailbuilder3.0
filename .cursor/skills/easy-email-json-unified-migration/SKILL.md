---
name: easy-email-json-unified-migration
description: >-
  邮件 JSON basejson 迭代须统一覆盖、全量迁移、禁止多 schema 并存。
  在改动 template.json 形态、迁移脚本、Inspector/编辑器对齐、校验逻辑，或用户提到结构迭代、迁移、废弃字段、旧版兼容、交付检查时使用。
---

# 邮件 JSON 结构统一覆盖（索引）

## 代码真源指针

| 改动类型 | 先改 |
|----------|------|
| block 允许路径 | **`src/block-contract/`** |
| token 标准键 | **`src/token-preset-contract/`** |
| 禁止持久化 / 渲染默认 / 底图语义 | **`src/render-defaults-contract/`**（**`rules.ts`** 为规则目录） |
| 值级与编排校验 | **`src/lib/validate.ts`** |
| **template 落盘 nested 4.0.0** | **`src/template-disk-contract/`**、**`src/lib/templateTreeAdapter.ts`**；禁止 flat wire（`isForbiddenFlatDiskWire`） |
| **落盘 JSON schema 索引** | **`src/schema-registry/`**（artifact 版本引用各 `*-contract`；`npm run validate:schema-registry`） |
| 迁移脚本名 | **`package.json`** → `scripts`（registry 可索引 `migrateScripts`） |

skills **只**保留流程与交付检查语义；**禁止**在 skills 内维护第二份完整字段表。

## 强制原则（摘要）

1. **不做旧版兼容分支**、不多 schema 并存。  
2. **统一覆盖**：新结构直接成为唯一规范。  
3. **同步迁移**仓库内全部 **`data/emails/*/template.json`**（及关联文件）。  
4. **代码同改**：渲染、编辑、校验同一迭代完成。  
5. **契约同更**：先改上表目录，再改 Inspector / 母版 / 脚本。

## 交付检查（清单）

- [ ] 全部模板已迁到新结构；**`npm run validate:all`** 通过。
- [ ] **`type: "icon"`** 仅 `src` / `color` / `size`（或契约允许项）；无废弃来源字段（迁移脚本见 **`package.json`** `migrate:icon-url-only`）。
- [ ] **禁止字段**：`wrapperStyle.selfAlign`、`backgroundContentAlign`、`overlayInset` 等 → **`validate.ts`** + **`render-defaults-contract`**；可用 **`npx tsx scripts/strip-forbidden-wrapper-fields.ts --write`** 清理 **strip 已实现的 wrapper 项**。  
- [ ] **`layout.props.crossAlign`**：**由 `validate.ts` 拒绝**；须手工删除并改为子块 **`contentAlign`** 或嵌套 **`layout`**；**不**在 `strip-forbidden-wrapper-fields` 中处理。
- [ ] 无「页面主容器」无意义中间 layout（见 **`validate.ts`** / **`email-config-motherboard`**）。
- [ ] **`emailRoot.props`**：`gapMode` / `gap`（`gap` 非空）；根 **`direction` / `contentAlign`** 不写（见 **`render-defaults-contract`**）。
- [ ] 除 **`emailRoot`** 外：双轴 **`wrapperStyle.contentAlign`**（**禁止非法 `wrapperStyle` 字段）。
- [ ] **box-model 平铺**：padding/border/borderRadius 四边/四角平铺；禁止 legacy `mode` 与 CSS 多值简写（**`validate.ts`** 直接拒绝；工厂 **`src/lib/boxModelFlat.ts`**）
- [ ] Inspector 与 JSON 能力对齐（新增字段时同步三处）。
- [ ] 无「读旧字段兜底」的分支代码。
- [ ] skills 无与 **`block-contract`** / **`render-defaults-contract`** 冲突的第二份键表。
- [ ] **变量真源**（技能 **`easy-email-payload-contract`** · **`src/payload-contract/`**）：`payload.slots` + `payload.values`；template binding **无** `defaultValue`；collection **无** 叶子 binding 上的 itemFields/整表 defaultValue；列表用 **repeat**（**`src/repeat-binding-contract/`**）。
- [ ] 存量清理（若回退旧形态）：`migrate:static-collection-to-repeat:write`、`migrate:prune-collection-binding-meta:write`、`migrate:prune-scalar-binding-default-value:write`、`migrate:payload-slots:write`。
