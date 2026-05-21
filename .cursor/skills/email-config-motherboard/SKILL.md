---
name: email-config-motherboard
description: >-
  配置母版与邮件 JSON Block 架构：template 为结构真源，configSchema/tokenPresets/payload 分工；
  block 白名单见 src/block-contract/。当用户说配置母版、受控配置面、新建或重构 template.json、
  按设计图落地模板、统一 block 类型/命名、废弃「意图分层」口语时使用；按图还原须与 email-template-restore-check 一并首读。
---

# 配置母版与 Block 架构

## 代码真源指针（禁止在本技能维护第二份字段表）

| 主题 | 路径 |
|------|------|
| 四层 JSON 形态与校验 | **`src/lib/validate.ts`**、**`src/types/email.ts`** |
| 某 `blockMeta.blockType` 下允许的路径 | **`src/block-contract/`**（`registry.ts`、`by-type/*.ts`）；入口 **`validateTemplateBlockContracts`** |
| binding 路径 → `fieldKind` / mode | **`src/lib/blockFieldClassification.ts`**、`validateTemplateBindings` |
| token 标准键与 `$themeRef` | **`src/token-preset-contract/`** |
| 禁止持久化、底图 padding 语义 | **`src/render-defaults-contract/rules.ts`**、`validate.ts`、`values.ts` |
| payload | **`src/payload-contract/`** |
| configSchema | **`src/lib/validateConfigSchema.ts`** |
| 落盘与 API | **`server/index.ts`** + **`easy-email-storage-api`** |

**已废弃**：独立「意图层」JSON；口语出现时应译为 **template + configSchema**。

**语义类型枚举**以 **`src/block-contract/registry.ts`** 的 **`BLOCK_TYPE_CONTRACTS`** 为准。**`data/masters/blocks/*.json`** 为 block 母版数据，**不含** `email.root` 文件。

**`blocks[id].type` 短名**与 **`blockMeta.blockType`** 映射以契约与 **`RUNTIME_TYPE_TO_SEMANTIC`**（`src/block-contract/types.ts`）为准。`emailRoot` 的 `blockMeta.blockType` 在存量中可能为 `layout.container`；**`resolveBlockContract`** 仍按 **`email.root`** 解析。

回归：**`npm run validate:all`**。

## 何时使用本技能

- 配置母版、**template / configSchema / tokenPresets / payload** 边界  
- 按设计图/截图落地或重构 **`template.json`**  
- 讨论 block 类型、placement、底图、grid、textBody、icon 等语义索引  

**素材 URL**：**`email-remote-asset-urls`**。  
**按图还原流程与 token 绑定**：**`email-template-restore-guide`** + **`email-template-restore-check`**。

## 新层级（文件 → 职责）

| 层 | 文件 | 一句话 |
|----|------|--------|
| 结构 | `template.json` | 完整 block 树 + bindings；不把全部底层字段暴露给最终用户 |
| 配置面 | `configSchema.json` | 控件、scope、**target**；不含 `id` / `parentId` / `children` |
| 样式预设 | `tokenPresets.json` | 档位与 token；标准键见 **`email-token-preset-standard-scope`** |
| 变量 | `payload.json` | **`slots`** 目录 + **`values`** 取值；template 仅 bindings/repeat（**禁止** binding `defaultValue`） |
| 元数据 | `meta.json` | 展示与 **`defaultStylePresetSelection`** 等 |

远程图/图标 URL：**`email-remote-asset-urls`**。

## 配置母版边界（工作流）

设计图拆解后先做 **section / 母版表达力审查**（完全匹配 / 需扩字段 / 需新增 / 不可用）。**结构不像设计时**，先回到容器层级与方向，而不是只调 **`tokenPresets`** 颜色字号。

## 标准执行顺序（配置母版交付）

1. **读图**：`emailRoot` 是否足够承载外壳；仅在有真实语义模块时加中间 **`layout`**（禁止无意义 `page/main` 壳）。  
2. **自上而下拆模块**：顺序、剪影比例、间距节奏；识别可复用 section/block 母版。  
3. **母版契约**：列出每块要暴露的字段 → 落到 **`configSchema.scopes`** 与 **target**。  
4. **写盘**：同步 **`template.json`**、**`configSchema.json`**、**`tokenPresets.json`**、**`payload.json`**（**`slots` + `values`**）、场景 **`meta.json`**。变量分工见 **`docs/邮件变量与绑定真源.md`**。  
5. **`npm run validate:all`**。  
6. **浏览器**：**`easy-email-frontend-chrome-verify`**（先 Network 资源，再结构，再视觉；画布滚到底）。

还原拆解表与反模式合并项见 **`email-template-restore-check`**。

## 设计图还原顺序（建议）

1. 拓扑与 **`blockMeta`** / **`blocks`**。  
2. **`template.json`** 先过校验、可预览。  
3. 再 **`configSchema.json`**、**`tokenPresets.json`**。  
4. 反模式与详细自检：**`email-template-restore-check`**。  
5. 白话顺序与模块壳 / token：**`email-template-restore-guide`**。  
6. **`npm run validate:all`** + **`easy-email-frontend-chrome-verify`**。

## 来源胶囊（Phase 0+）

1. **路径**须在 **`block-contract`** 白名单内。  
2. **style** → 字面量或 **`$themeRef`** + binding **`mode: "theme"`**（JSON 枚举名）。  
3. **content** → 字面量或变量 / 插槽。  
4. **structural** → 仅字面量。  

细节以 **`blockFieldClassification.ts`** 与 **`validateTemplateBindings`** 为准。

## 易错语义（索引，不抄键表）

1. **placement（相对父槽位）** vs **contentAlign（盒内内容）**：口语与 Inspector 对照 **`easy-email-concepts`**；CSS 实现 **`src/lib/resolvePlacementCss.ts`**、`EmailPreview`。  
2. **`layout.props.crossAlign`**：**禁止**；由 **`validate.ts`** 报错。清理须**删键并改子块 `placement`**；**不要**指望 **`scripts/strip-forbidden-wrapper-fields.ts`**（该脚本只处理 wrapper 禁止字段）。  
3. **横排图标条 / 整组居中**：见 **`email-template-restore-check`** §5、**`easy-email-concepts`**。  
4. **底图叠放**：`backgroundImage` 有效时 **`padding` 语义**见 **`render-defaults-contract`** **`semantic.backgroundPadding`**；禁止 **`overlayInset`**、**`backgroundContentAlign`**。  
5. **grid**：外壳尺寸 vs **`props.cell*`** vs **`props.gap`** → **`src/block-contract/by-type/layout.grid.ts`** + **`validate.ts`**。  
6. **text**：**`textBody`** 与禁止手写 **`style=`** → **`validate.ts`**。  
7. **icon**：仅契约允许字段 → **`src/block-contract/by-type/content.icon.ts`**；废弃来源字段迁移 **`npm run migrate:icon-url-only`**（脚本名以 `package.json` 为准）。  
8. **`SpacingValue`（padding）**：**`unified.unified`** 仅允许**单边**长度（如 `"8px"`）；**禁止** `"8px 0 0 0"`、`"28px 24px"` 等 CSS 简写。四边不同 → **`mode: "separate"`** + 四边字段。真源 **`validate.ts`** · **`validateSpacingValue`**；审计 **`npm run normalize:spacing-unified`**。口语「分轴 padding」= **`separate`**，不是 unified 里塞四段。

**历史 `type: "overlay"`**：运行时已用 **`layout` / `image` + `wrapperStyle.backgroundImage`** 表达；**勿在新模板中**引入旧 overlay 块类型。检查夹具 YAML 里 **`kind: overlay`** 由 **`email-template-yaml-check`** 所述展开器处理。

## 禁止事项（摘要）

- 不恢复意图层目录或脚本。  
- **不在 `bindings` 写 `defaultValue`、collection 的 `itemFields` 双份**（真源见 **`docs/邮件变量与绑定真源.md`**）。  
- 不把底层字段无差别塞进配置面。  
- 不跳过 **`validate:all`** 与浏览器资源检查。  
- 样式魔法数优先收 **`tokenPresets`**。  
- 绕开 **`block-contract`** 在多处散落补字段或校验。

## 扩展字段流程（统一覆盖）

① **`src/block-contract/`** → ② **`validate.ts`** 等 → ③ Inspector / 默认值 / 母版 → ④ **`npm run validate:all`** → ⑤ 仅在技能中增加**一句语义或反模式**，**禁止**再贴完整键表。

## YAML 夹具检查（Golden）

仅当用户明确说「YAML 夹具 / template-yaml golden / YAML 展开检查」时读 **`email-template-yaml-check`**。

## 结构迁移原则

见 **`easy-email-json-unified-migration`**（不做多 schema 并存、须全量迁移）。

## 相关技能

**`easy-email-concepts`**、**`email-template-restore-guide`**、**`email-template-restore-check`**、**`email-token-preset-standard-scope`**、**`easy-email-payload-contract`**。
