---
name: email-template-restore-guide
description: >-
  按设计图还原邮件的一站式指南：白话执行顺序、交付物清单、模块壳与 token 绑定（三条原则与圆角放哪）。
  当用户说按图还原、像素还原、新建邮件目录、交付模板、白话步骤、模块壳、token 绑定、对图排版时使用；
  易漏案例与反模式见 email-template-restore-check；配置母版与 block 白名单见 email-config-motherboard。
---

# 按图还原邮件（流程 + 模块壳 / token）

## 这份技能解决什么问题

设计图是「长什么样」，仓库里真正干活的是**几份 JSON**。本技能合并**白话顺序**与**模块壳 / token 细则**；字段白名单与配置母版边界见 **`email-config-motherboard`**；现象级反模式见 **`email-template-restore-check`**。

---

## 大白话：四件事别搞混

1. **`template.json`**：邮件**长什么样**的真源——**nested 4.0.0**（顶层 `root` 嵌套树 + 节点 `blockMeta`）；`bindings` / `repeat` / `$themeRef` 在节点上。读写契约见 **`src/template-disk-contract/`**、**`src/lib/templateTreeAdapter.ts`**。  
2. **`tokenPresets.json`**：这封邮件自己的**「字号/颜色/间距档位」出生档**——还原时一般要**新建一份**，别指望全靠默认值凑。  
3. **`payload.json`**：文案、链接、图地址等**变量真实值**；有列表（商品、导航等）就按契约填。  
4. **`meta.json`**：标题等元信息，**可选**，有就一并补齐。

**一句话**：先定「这封邮件的样式档位」（tokenPresets），再在 template 里把该绑的都绑上，最后把变量、校验、浏览器粗看一眼跑通。可编辑项由 **底层 Block Inspector**、**变量赋值**、**样式预设** 承担（**不再**维护 `configSchema.json`）。

---

## 执行顺序（推荐照着做）

### 第一步：开目录、认设计图

- 在 **`data/emails/<emailKey>/`** 下准备目录（见 **`easy-email-storage-api`**：`layouts/<id>/` 含 template + tokenPresets，场景根 payload）。  
- 把设计图里**从上到下几大块**在心里命名成「模块」：头图区、标题区、商品卡、页脚……后面搭 **`template.json`** 就按块拆，别一上来抠像素。

### 第二步：先读「会翻车的点」

- 打开 **`email-template-restore-check`**，扫一遍叠放、contentAlign、根 gap 与圆角、底图 padding 等**反模式**。  
- 打开 **`email-config-motherboard`**，确认 block 类型、白名单字段别写飞。

### 第三步：写这封邮件的 tokenPresets（出生档）

- 按 **`email-token-preset-standard-scope`** 对齐标准键范围。  
- 按下文 **§ 模块壳与 token · 三条原则** 与 **§ 圆角放哪**；别和 **`email-template-restore-check`** 里禁止的写法打架。  
- **画布外圈灰**：项目固定 **`#f1f1f1`**（**`EMAIL_CANVAS_WORKSPACE_BACKGROUND`**），不进 template；层次靠外灰 + **`props.backgroundColor` / `colors.surface`** 区分。

### 第四步：搭 template.json

- 维护 **nested `root` 树**（勿写顶层 `blocks` map）；根下面先挂**语义模块壳**（一层层 layout），根 **`gap`** 倾向 **`0`**，块与块间距用壳的 **padding** 或内层 **gap**（见 § 模块壳与 token）。  
- 需要跟档位走的样式，用 **`$themeRef` + bindings.tokenPath`** 绑到上一步 preset 里**已经声明**的键；别绑契约不允许 theme 的字段。  
- 有 grid 列表、按钮、图标等，对照 **`src/block-contract/`** 与样例邮件（如 **`coupon-available`**）写法。

### 第五步：payload + meta

- 按 **`easy-email-payload-contract`**：payload 与 template bindings / repeat 对齐；业务文案与链接写入 **`payload.slots` + `values`**。

### 第六步：终端校验

- 跑 **`npm run validate:all`**，报错就回到对应 JSON 改到通过为止。

### 第七步：浏览器粗验收

- 本地起服务后按 **`easy-email-frontend-chrome-verify`**：打开预览、切到这封邮件、看图是否加载、控制台/网络有无明显红错。

---

## 交付最低标准（自检打勾）

- [ ] **`data/emails/<emailKey>/`** 下 **`template.json`**、**`tokenPresets.json`**、**`payload.json`** 齐全且能过校验；**`meta.json`** 按项目约定。  
- [ ] **`tokenPresets`** 里为这封邮件准备的内容**覆盖** template 里会用到的 **`$themeRef`**，没有「绑了却未声明」的键。  
- [ ] **`npm run validate:all`** 通过。  
- [ ] 涉及预览效果的改动已按 **`easy-email-frontend-chrome-verify`** 粗看过页面。

---

## 模块壳与 token

### 代码真源指针

| 主题 | 路径 |
|------|------|
| 标准 12 键与校验 | **`src/token-preset-contract/standard-keys.ts`**、**`validate.ts`** |
| `$themeRef` 路径 | **`src/token-preset-contract/theme-ref-paths.ts`** |
| 字段能否绑 theme | **`src/lib/resolveThemeInTemplate.ts`** |
| block 样式路径白名单 | **`src/block-contract/`** |
| 对齐/反模式案例 | **`email-template-restore-check`** |

**「能配什么」** 以 **`standard-keys.ts`** 为准；**本节约束三条「还原时怎么绑」的产品原则**（若与代码校验冲突以 **`validate.ts`** 为准）。

### 交付物（须含本邮件「出生档」预设）

1. **`tokenPresets.json`**：`activePresetId` + 至少一份预设，**`tokens` 显式覆盖将用到的标准键**（勿依赖缺键隐式兜底）。样例：**`data/emails/coupon-available`**。  
2. **`template.json`**：模块壳的 padding / gap / 字号色圆角等 **style 路径** 用 **`$themeRef`** + **`bindings.tokenPath`** 对齐上一步键。  
3. 其余层：**`payload.json`**、**`meta.json`**（见 **`email-config-motherboard`**）。

### 画布根外侧灰（勿动）

画布「邮件外侧」工作区灰底为项目固定 **`#f1f1f1`**（**`EMAIL_CANVAS_WORKSPACE_BACKGROUND`**，见 **`src/render-defaults-contract/values.ts`**），**不写入 template**。按图还原时勿把内容区 **`backgroundColor` / `colors.surface`** 设成与工作区灰同色；层次见 **`email-template-restore-check`**。

### 三条原则（摘要）

1. **类 section 模块壳**：`emailRoot.children` 下一层为语义 **`layout` 模块壳**（`oca-mod-*` 式命名）；根 **`gap`** 一般 **`0`**，模块间距用壳 **`padding`** / 内层 **`gap`**。  
2. **分轴 padding + 内层 gap（三层分工，勿混用）**：  
   - **页边距（仅根）**：**`emailRoot.props.padding` 左右** → **`tokens.spacing.pageInline`**；控制邮件相对画布工作区的左右安全区，**不代替**模块壳内留白。  
   - **模块壳外框节奏**：可见 **模块壳**（白底/描边/圆角/与正文对比的 `colors.surface` 等）的 **上下** → **`tokens.spacing.section`**；**左右** → **`tokens.spacing.gap`**（或等价字面量），保证 **壳内内容与壳边** 有呼吸感。  
   - **壳内子块节奏**：同级子块竖直/栅格间距 → **`layout.props.gap`** / **`grid.props.gap`**，优先绑 **`tokens.spacing.gap`**。  
   具体键名以 **`standard-keys.ts`** 为准。  
3. **字号进 typography 档**：`display` / `h1` / `body` / `caption`。禁止每段手写互不相干 px 却不进预设。

### 容器内留白（与 pageInline 分工）

凡设计稿上能辨认出 **「组件容器」**（白卡片、浅灰信息区、带圆角/描边的 section 壳等），还原时须满足：

- **内容与容器四边（至少左右）有内边距**；标题、双列 grid、文案栈等 **不要** 顶在壳的 `border` / 圆角内侧。  
- **禁止** 为省事把模块壳 **`wrapperStyle.padding` 左右设为 `0`**，指望 **`pageInline`** 在根上「顺带」缩进——根 **`pageInline`** 只解决 **邮件整体相对画布** 的边距，**不会** 在壳内再缩一层。  
- **推荐**：模块壳 **`padding` 分轴**——JSON 用 **`mode: "separate"`**，上下绑 **`tokens.spacing.section`**、左右绑 **`tokens.spacing.gap`**（与 **`member-welcome` 模块壳同类写法）；**勿**在 **`unified`** 里写 `"8px 0 0 0"` / `"28px 24px"`（见 **`email-template-restore-check` §21**）。子块上零散 `8px` 补丁应收敛到壳。  
- **间距上限**：**`tokens.spacing.section|gap|pageInline`** 与容器 **`padding` 四边均 ≤24px**（见 **`email-template-restore-check` §19**）；勿用 28/32/40px 撑版心。  
- **全宽模块**（如贴边头图）：可左右 `0`，但壳内仍须用 **padding / contentAlign** 保证叠字、角标不贴死边；见 **`email-template-restore-check`** 底图叠放条目。

反模式与自检：**`email-template-restore-check` §17**。

### 横向 layout：容器内相对居中（与「整段左对齐」可并存）

口语「横排要居中」在 Easy-Email 里常指 **容器内的相对水平居中**，**不是** 一定要把横排块 **`hug` 后摆到邮件正中**。两层勿混：

| 层级 | 设计意图 | 典型写法 |
|------|----------|----------|
| **外层 / 模块** | 顶栏、卡片、section **整体仍左对齐**（与正文同宽、贴内容区左缘） | 纵向父级、模块壳：**`contentAlign.horizontal: left`**（或默认 **`start`**）；子块 **`widthMode: fill`** 随父宽 |
| **横排容器内部** | Logo+字标、图标条、并排按钮在 **该行/该壳宽度内** 作为一组 **水平居中** | **`layout` + `direction: horizontal`**：**`widthMode: fill`** + **`contentAlign.horizontal: center`**；子块 **`hug` / fixed**，**不要** 子块全 `fill` 被拉成均分（见 check §5） |
| **横排内子块竖直互相对齐** | 字标与图标 **竖直中线对齐**，勿顶对齐 | 横排父级 **`contentAlign.vertical: center`**；必要时各子块 **`contentAlign.vertical: center`** 或嵌套纵排 layout |
| **满宽文本也要「行内居中」** | 如 `MEMBER EXCLUSIVE` 相对 **与品牌行同宽的条带** 居中 | 文本块 **`widthMode: fill`** + **`contentAlign.horizontal: center`**（外层模块仍可左对齐） |

**仅当稿面明确要求「整组在邮件宽度内居中」** 时，才用纵向父级 **`contentAlign.horizontal: center`** 或外层 **`layout` + `hug` 宽**（与上表「容器内居中」二选一或叠加，先看稿）。

**`member-welcome` 顶栏**：`mw-brand` 整体左对齐；`mw-brand-row` 满宽行内 Logo+字标 **`contentAlign` 居中**；`mw-member-tag` 满宽条带内文案居中。实现：**`easy-email-concepts`**、**`EmailPreview.tsx`**（table `align`/`valign`）。

反模式与自检：**`email-template-restore-check` §5、§18**。

### 底图叠放与容器内居中（纵排 + 单块 `fill`）

口语「横幅上的白卡 / 叠在图上的内容要居中」，指改 **底图父容器** Inspector **「容器内内容摆放」**（**`wrapperStyle.contentAlign`**），**不是** 把子 layout 改成 **「按内容宽度（hug）」**。

| 层级 | Inspector 标签 | JSON | 典型意图 |
|------|----------------|------|----------|
| **底图父**（如 `mwc-mod-hero`） | 容器内内容摆放 | `contentAlign` | 叠放子块在横幅区域内水平/竖直相对位置（`center` + `bottom` 等） |
| **叠放子 layout**（如 `mwc-hero-card`） | 宽度模式 | `widthMode` | 稿面满宽白卡 → **`fill`**；仅明确「整块收窄」才 **`hug`** |
| **叠放子 layout 内文案** | 容器内内容摆放 | 子块 `contentAlign` | **`fill` + `horizontal: center`**（WELCOME / 副标题） |
| **叠放子 layout** | 宽度模式 / 壳内摆放 | `widthMode` + `contentAlign` | **禁止非法 wrapperStyle 字段**；纵排 + 子 **fill** 宽时靠父级 **`contentAlign`**；per-child 差异用嵌套 layout |

**默认修复顺序**：① 父 `contentAlign` → ② 子文案 `contentAlign` + `fill` → ③ 仅稿面要求再动 `hug` → ④ 勿用 **`hug` 冒充** 父级容器内居中。  
样例：**`member-welcome` / `layouts/centered`** 的 `mwc-mod-hero` + `mwc-hero-card`。  
反模式：**`email-template-restore-check` §20**。

### 圆角放哪

- **不要**：多个同级 **模块壳** 各自 **`wrapperStyle.borderRadius` → `tokens.radius.panel`**，再叠 **`emailRoot.props.gap` > 0** → 缝上出现圆角切口（俗称「耳朵」），深色样式预设下更明显。也不要在「Logo 紧贴顶边」的结构里，把**读者会误认为 Logo 模块自带**的圆角绑在**包住整段正文的唯一卡片壳**上沿而不加说明——实为整卡圆角（见 **`email-template-restore-check` §16**）。  
- **优先**：**`emailRoot.props.gap` 为 `0`**；**`tokens.radius.panel` 要么只绑一处内层整卡壳（且与根 gap 不露缝）**，**要么不绑壳、只绑头图 / `image` 底图圆角 / 按钮（`tokens.radius.cta`）等子块**；模块壳分段以 **`padding` / `layout.props.gap`** 为主，壳子外轮廓多用 **`borderRadius` 直角 `0`**。

---

## 细项与真源（别在本文件里复制第二份键表）

| 想查什么 | 读哪个技能 / 目录 |
|----------|-------------------|
| 易漏对齐、contentAlign、自检清单 | **`email-template-restore-check`** |
| 标准 token 键集合与样例 | **`email-token-preset-standard-scope`**、`data/emails/coupon-available` |
| 配置面 / 母版、block 白名单 | **`email-config-motherboard`**、`src/block-contract/` |
| 远程图、图标 URL 约定 | **`email-remote-asset-urls`** |
| 变量与 payload 形状 | **`easy-email-payload-contract`** |
