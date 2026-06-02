---
name: easy-email-concepts
description: >-
  Easy-Email 当前维护概念（template 结构真源、tokenPresets 样式预设、payload 变量值、render-defaults 渲染默认）与口语↔技术路径对照；含「每个 block 自己的容器 / 宽高模式 / contentAlign 容器内摆放」等必读公共定义。
  当用户讨论「还原邮件该改哪一层」「配置面 vs template」「样式预设 vs 结构」或需要一句话说清维护入口时读取；常与「按图还原邮件」类需求下的 business-components / block-architecture 技能一起出现。
---

# Easy-Email 概念（索引 + 口语对照）

## 写作约定（硬约束）

- **字段白名单、禁止持久化项、枚举、必填、payload 形态**：一律以仓库 **TypeScript 契约与校验** 为准；本文件**不**维护第二份键表。
- **本目录技能（`.cursor/skills/`）**：Agent **何时读哪段代码**、**工作流顺序**、**易错口语对照**；与 `npm run sync:claude` 镜像到 `.claude/skills/`、`CLAUDE.md`。
- **`docs/project-plan.md`**：对话备忘，**不是** JSON/API 契约。

## 代码真源指针

| 主题 | 路径 |
|------|------|
| block 允许哪些路径 | `src/block-contract/`（`registry.ts`、`by-type/*.ts`） |
| 值 / 必填 / 废弃 / 编排校验 | `src/lib/validate.ts` |
| bindings 路径 → style / content / structural | `src/lib/blockFieldClassification.ts` |
| 禁止写进 template 的渲染默认、底图 padding 语义 | `src/render-defaults-contract/`（`rules.ts` 为规则目录） |
| token 标准 12 键、`$themeRef` 路径 | `src/token-preset-contract/`（`standard-keys.ts`、`theme-ref-paths.ts`） |
| payload 槽枚举与对照校验 | `src/payload-contract/` |
| 列表 repeat 绑定规则（Step 1） | **`src/repeat-binding-contract/`**；虚拟预览 **`src/repeat-runtime/`**；物化/绑定 **`repeatRegion.ts`**（技能 **`easy-email-repeat-binding`**） |
| **template 落盘 nested 4.0.0** | **`src/template-disk-contract/`**；读写转换 **`src/lib/templateTreeAdapter.ts`** |
| **落盘 JSON schema 索引** | **`src/schema-registry/`**（版本常量引用各 `*-contract`） |
| visibility 运算符合法性 | `src/visibility-contract/` |
| tokenPresets 外壳校验 | `src/lib/validateTokenPresets.ts` · `src/token-preset-contract/validate.ts` |
| 容器内边距 `SpacingValue`（`unified` 单边 / `separate` 四边） | `src/lib/validate.ts` · `validateSpacingValue`；批量审计 `npm run normalize:spacing-unified` |
| 落盘目录与 HTTP API | `easy-email-storage-api` 技能 + `server/index.ts` |
| 场景版式变体（layoutVariant）路径与 manifest | `src/layout-variant-contract/`、`src/lib/emailLayoutVariant.ts` |

交付前统一跑：**`npm run validate:all`**。

## 三层落盘（口语 → 文件）

**标准结构（必需）**：`payload.json` 在场景根；**须**有 `layout-manifest.json`；每个版式在 `layouts/<layoutVariantId>/` 含 **template + tokenPresets**。仅一个版式时通常 id 为 **`default`**。

| 层 | 文件 | 一句话 |
|----|--------|--------|
| 结构 | `layouts/<id>/template.json` | **nested 4.0.0**：顶层 `root` 嵌套树 + 节点内联 `blockMeta`；`bindings` / `repeat` / `$themeRef` 仍在节点上 |
| 样式预设 | 同版式 `tokenPresets.json` | 档位与 token 值、`$themeRef` 解析 |
| 变量 | 场景根 `payload.json` | **场景级共享**：**`slots`** 目录 + **`values`** 取值；template 仅 bindings/repeat 关系 |

版式清单 → `layout-manifest.json`。路径解析真源 **`src/lib/emailLayoutVariant.ts`**。

**已移除**：`configSchema.json` 与顶栏「配置项」视图；可编辑项由 **底层 Block Inspector**、**变量赋值**、**样式预设** 承担。

元数据：`meta.json`（如 **`defaultStylePresetSelection`** 与展示名）。

## 端到端数据流

人类 / Agent → `data/emails/<emailKey>/*.json`（或 `PUT /api/v1/...`）→ 可选 `server/index.ts` → 前端 `mergeTemplatePayload`、`resolveThemeInTemplate` → `EmailPreview` / Inspector。细节见 **`easy-email-storage-api`**。

## 「自己的容器」（与 Inspector 对齐的最低限度）

1. **外层盒模型**：`wrapperStyle` + 各类型影响尺寸的 `props`；宽高模式 **`widthMode` / `heightMode`**。
2. **容器内内容摆放（唯一对齐字段）**：**`wrapperStyle.contentAlign`**（水平 `left|center|right` + 竖直 `top|center|bottom`；除 `emailRoot` 外须显式双轴）↔ Inspector **「容器内内容摆放」**。渲染为 presentation **`<table>` + `td align`/`valign`**（见 **`emailPresentation.ts`**、**`EmailPreview.tsx`**）。其它 wrapperStyle 对齐字段写入会校验失败。
3. **per-child 差异对齐**：同一父下子块要对齐方式不同 → **嵌套 `layout`/`grid`** 或分别写子块 **`contentAlign`**（hug 宽/高时不可配轴须为 `left`/`top`）。
4. **不进 JSON 的默认**：**`src/render-defaults-contract/`**；口语「项目默认」→ 技能 **`easy-email-render-defaults`**。
5. **容器内相对居中（修复顺序）**：用户说「相对居中 / 行内居中 / 叠在图上的块要居中」时，**先改父容器 `contentAlign`**，再改子块壳内文案的 **`contentAlign`**；**不要**仅靠子块 **`widthMode: hug`** 代替父级对齐。子块 **`fill`** 时父级水平居中管叠放栈；壳内文字居中靠子块 **`fill` + `contentAlign.horizontal: center`**。
6. **横向 layout、grid 矩阵格、图片/底图叠放**：父 **`layout`/`grid`/`image`（含 `backgroundImage`）** 的 **`contentAlign` 双轴** 控制子级在容器内的水平+竖直对齐；栅格槽位见 **`gridMatrixSlotContentAlignCss`**。邮件级整组居中：父 **`contentAlign.horizontal: center`** 或 **`hug` 外壳 + 父级居中**，见 **`email-template-restore-check`**。
7. **容器内边距 `wrapperStyle.padding` / `emailRoot.props.padding`（`SpacingValue`）**：**`mode: "unified"`** 时 **`unified` 只能是单边长度**（如 `"8px"`、`"0"` 或 `$themeRef`），**禁止** CSS 多值简写（如 `"8px 0 0 0"`、`"28px 24px"`）；四边不同必须用 **`mode: "separate"`** + **`top/right/bottom/left`**。校验 **`validate.ts`**；存量清理 **`npm run normalize:spacing-unified:write`**。Inspector「四边统一」= 四边**同值**，不是简写四段。
8. **contentAlign 可配性（代码真源）**：**`src/lib/contentAlignConfigurability.ts`**。`widthMode: hug` → 水平轴不可配（须 `left`）；`heightMode: hug` → 竖直轴不可配（须 `top`）。**layout / grid / image 叠放** 在定高/定宽壳上**双轴均可配**。校验 **`validate.ts`** + **`render-defaults-contract/forbiddenWrapperStyleKeys.ts`**；hug 轴回落 **`npm run migrate:content-align-hug-neutral:write`**；协调 **`npm run normalize:wrapper-layout:write`**。

## 术语路由（用户说一句 → 先改哪）

| 用户说法 | 优先落点 |
|----------|----------|
| 改结构 / 区块树 | 当前版式 `layouts/<layoutVariantId>/template.json`（nested 4.0.0） |
| 同场景换大版式 / 第二套结构 | 新建 `layouts/<layoutVariantId>/`（template + tokenPresets）+ 更新 `layout-manifest.json`；**勿**复制第二份 `payload.json` |
| 改某 block 字段 / 宽高 / 对齐 | **底层 Block** Inspector + `template.json` |
| 换主题档 / 字号节奏 / 圆角体系 | `tokenPresets.json` + `$themeRef` |
| 默认打开哪套预设 | `meta.json` → `defaultStylePresetSelection` |
| 业务数据 / 槽目录与取值 | **`payload.slots` + `payload.values`**（**`src/payload-contract/`**）；template 只写 slotId 绑定（技能 **`easy-email-payload-contract`**） |
| 列表绑定 / 解除 / 父级+子级循环 / 物化重绑 | 技能 **`easy-email-repeat-binding`**；勿在 template 长期写物化 `*-1` id |
| 标准 token 键范围与绑法 | **`email-token-preset-standard-scope`** + `standard-keys.ts` |
| 已废弃「意图层」/ configSchema 口语 | 译为 template + Inspector / payload / tokenPresets；无独立意图 JSON |
| 只要上边距 / 四边不同 padding | **`separate`** 分边写；**勿**在 **`unified`** 里写 `"8px 0 0 0"` |

## 编辑器 MVP（产品行为）

三列工作台、根宽 600px、MVP 不改树等：**以当前 `src/components` 实现为准**；改 UI 或邮件数据后的浏览器验收见 **`easy-email-frontend-chrome-verify`**。

## 变量与 binding 卫生（禁止双写）

- **取值**：只 **`payload.values`**；**禁止** `bindings.*.defaultValue`（含 interpolate 原子槽）。
- **collection 列 schema**：**`repeat.itemFields`**（+ **`payload.slots`** 对齐）；**禁止**叶子 binding 上的 itemFields / min/max / 整表 defaultValue。
- **列表行**：**`repeat` + 行模板 `slotPath: "0.<key>"`**；**禁止**静态多行 `1.xxx`、`2.xxx`。
- **编辑器 meta**：**`template.meta.easyEmailBindingUi`** 仅主题解除跟随快照；空对象应删。

详表与迁移脚本：技能 **`easy-email-payload-contract`** · **`src/payload-contract/`**。

## 相关技能

| 场景 | 技能 |
|------|------|
| 落盘 / API / `emailKey` | `easy-email-storage-api` |
| 列表 repeat 绑定、物化态重绑 | `easy-email-repeat-binding` |
| block 语义、配置母版与还原流程 | `email-config-motherboard` |
| 按图易错与自检 | `email-template-restore-check` |
| 按图还原流程与模块壳/token | `email-template-restore-guide` |
| YAML 夹具检查 / Golden | `email-template-yaml-check` |
