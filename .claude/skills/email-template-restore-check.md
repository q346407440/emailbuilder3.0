---
name: email-template-restore-check
description: >-
  根据设计图/截图还原 Easy-Email 邮件时的易遗漏点与交付前自检清单（叠放层对齐、`wrapperStyle.placement`、禁止 crossAlign 与已废弃 overlay 撑高/空 layout 推右、堆叠模块与根 gap 上的圆角反模式、模块壳内内容贴边与 pageInline 分工等）。
  当用户用口语说「还原邮件模板」「按设计稿/Png/截图做邮件」「用我的还原邮件 skills」「实现这封邮件模板」「邮件学习模板」「project-plan 里对话要做模板」「模板还原检查」「还原遗漏」「像素还原自检」或迭代任意邮件模板 JSON 时，应在动手改结构/样式前**优先读取**本技能，避免返工。
---

# 邮件模板还原检查（案例 + 自检）

## 代码真源指针（字段表以代码为准）

| 关注点 | 真源 |
|--------|------|
| 允许哪些 JSON 路径 | **`src/block-contract/`** |
| 必填 / 枚举 / 废弃 | **`src/lib/validate.ts`** |
| 禁止持久化 / 底图 padding 语义 | **`src/render-defaults-contract/`** |
| 合并校验 | **`npm run validate:all`** |

本文件只记 **现象 / 根因 / 改法**；与实现冲突以 **`validate.ts`** 为准。

## 何时读

按图还原、迭代 `template.json`、复盘可见缺陷；若还要求「模块壳 + 标准 token 整整齐齐」，叠加 **`email-template-restore-guide`** + **`email-token-preset-standard-scope`**。

### 画布工作区外侧灰底（项目级，不进 template）

邮件卡片外的编辑器灰底由项目固定 **`EMAIL_CANVAS_WORKSPACE_BACKGROUND`**（`src/render-defaults-contract/values.ts`，**`#f1f1f1`**），**禁止**写入 **`emailRoot.props.outerBackgroundColor`**。还原时只调 **`props.backgroundColor`（内容区）**、**`colors.surface`** 或模块壳字面量，勿把内容区底色改成与工作区灰相同以免层次糊掉。

---

### 1. 栅格商品图「框同大但主体大小不一」

**现象**：同 `viewport` 下商品视觉大小不一致。  
**根因**：**`fit: contain`** 保留留白，图源宽高比不同 → 主体占比不同。  
**做法**：要「铺满格」用 **`cover`**（接受裁剪）；要「完整露出」则明确接受留白并在说明中写明。

### 2. 卡片按钮「画出」灰底外框

**现象**：按钮视觉溢出卡片。  
**根因**：卡片 **`heightMode: fixed`** 过小 + 子块总高超限；画布 overflow 可见。  
**做法**：改 **`hug`** 或收紧子块高度/padding/gap，预览中量边界。

### 3. 形状比例不对（正方主推 / 扁宫格）

**现象**：区块剪影与设计宽高比不符。  
**根因**：只保证「有图」未列比例表；`viewport` / 底图区高度随手填。  
**做法**：按区块列目标高宽比 → 填 **`viewport` / 底图容器尺寸**；交付前对照截图剪影。

### 4. 间距节奏不对

**现象**：图-文-按钮留白与稿差一截。  
**根因**：多处 **`padding` / `gap`** 叠加却未协同设计。  
**做法**：先模块壳 **`padding`**，再用 **`layout.props.gap`** 做主竖直节奏；栅格注意 **`wrapperStyle.padding`（外壳）** 与 **`props.gap`（宫格间）** 分工。页边距与壳内留白分层见 **§17** 与 **`email-template-restore-guide`** § 容器内留白。

### 5. 横向图标条被拉成均分整宽

**现象**：社媒等小标间距过大、铺满。  
**根因**：父子 **`widthMode: fill`** 在表格行里等价均分。  
**做法**：子块改 **`hug` / fixed**，收紧 **`gap`**；若要在 **行宽内居中** 一组子块：**父行 `fill` + `contentAlign.horizontal: center`**（外层模块仍可左对齐，见 **§18**）。勿让多个子块同为 **`fill`** 被表格均分。邮件级整组居中才用 **`hug` + `placement.center`**，见 **`email-template-restore-guide`** § 横向 layout：容器内相对居中。

### 6. 底图叠放角标应贴顶却像垂直居中

**现象**：角标应贴顶/贴边却居中；或堆 4～5 层等高壳 / 空 layout 推右。  
**根因**：误以为只能靠撑高壳定位。  
**做法**：当前运行时用 **`layout`/`image` + `wrapperStyle.backgroundImage`** 叠放；**整组**位置用容器双轴 **`contentAlign`**；**单个子块**贴边用 **`wrapperStyle.placement`**；内边距用 **`wrapperStyle.padding`**（root 用 **`emailRoot.props.padding`**）。禁止 **`overlayInset`**。语义见 **`render-defaults-contract`** **`semantic.backgroundPadding`**。

### 7. 底图 `background.link` 整块可点

**现象**：角标/字被包进同一 `<a>`。  
**做法**：不需要整块可点时 **`link` 置空**；点击域用 **button / 独立链接块**。

### 8. 页脚链接用手写 `style=` 或缺 `textBody`

**现象**：`validateTemplate` 报错。  
**做法**：链接与局部样式用 **`textBody.runs`**；**`props.content`** 不写手写 **`style=`**；可跑 **`npm run migrate:text-body -- --write`**（脚本名以 **`package.json`** 为准）。

### 9. 细分隔线只靠容器边框

**现象**：预览看不清线。  
**做法**：在流里插 **`separator.divider`**，用 **`props.color` / `props.height`**。

### 10. 社媒图标线框/实心混用

**现象**：稿为 outline，画布实心。  
**做法**：统一图标体系 URL（**`email-remote-asset-urls`**）；检查 **`src` / `color` / `size`**。

### 11. 仍写 `overlayInset` 或误以为底图 padding 会缩底图

**现象**：校验报废弃或视觉与稿相反。  
**做法**：合并进 **`padding`** 并删 **`overlayInset`**；底图语义见 **`render-defaults-contract`**。

### 12. 仍写 `layout.props.crossAlign`

**现象**：`validateTemplate` 报错。  
**根因**：交叉轴应在各子块 **`wrapperStyle.placement`**。  
**做法**：**删除 `crossAlign`**，为子块补 **`placement`**。**不要**运行 **`strip-forbidden-wrapper-fields`** 指望删 crossAlign（该脚本**不**处理 props 上的键）；真源在 **`validate.ts`**。

### 13. 图片不渲染（404/403/防盗链）

**现象**：结构完整但画布里裂图。  
**做法**：先用 DevTools **Network** 查图片请求；修 URL 后再做像素对齐（**`easy-email-frontend-chrome-verify`**）。

### 14. 硬套近似 section 导致结构错

**现象**：顺序对但左右/双按钮/装饰位不对。  
**做法**：先 **section 表达力审查**；不够则扩母版或新建；**禁止**只靠 token 调色硬凑结构。

### 15. 左对齐文案栈误用横向 `layout`

**现象**：标题+说明应上下却左右并排。  
**做法**：图标+短文案一行用 **`horizontal`**；**标题+多行说明**包进子 **`layout` + `direction: vertical`**；列表型勿误用双列 **`grid`**。存量可试 **`node scripts/fix-layout-stack-direction.mjs --write`**（见脚本 `--help`）。

### 16. 堆叠模块壳各自绑 `tokens.radius.panel` + 根级 `gap`（缝上「耳朵」/ 深色更明显）

**现象**：模块与模块之间露出一条与 **`colors.surface`** 不一致的底色缝；圆角切口处像浅色或强反差的「三角」「耳朵」；深色样式预设下更刺眼。若整信只有一层「最外卡片壳」绑圆角且 Logo 贴顶，编辑器选区会像 **Logo 仍带一层外层圆角**（实为整张内容卡上沿）。  
**根因**：**`emailRoot.props.gap` > 0**（或与子列之间仍有可见缝）时，缝内常露出画布工作区灰底（**`#f1f1f1`**）或与表面色不同；多个同级 **模块壳**（如 `mw-mod-*` / `oca-mod-*`）各自 **`wrapperStyle.borderRadius` → `tokens.radius.panel`**，圆角把这条缝「切」进可见角区。  
**做法**：  
- **根与子列**：优先 **`emailRoot.props.gap` 为 `0`**，避免靠缝做分段。  
- **圆角集中度**：**不要**在多个堆叠的同级 **模块壳最外层** 重复绑 **`tokens.radius.panel`**；整信若要「一张卡」观感，**仅内层单一 `body-shell`（或等价单列容器）**绑圆角，且与根 **`gap`** 语义一致、不露缝。若设计要 **顶边直角、仅头图/局部圆角**，则 **壳子直角**，把 **`tokens.radius.panel`** 留在 **`image` 底图圆角 / 按钮胶囊（`tokens.radius.cta`）** 等**内容子块**，不要绑在「包住 Logo 的最外可见容器」上造成误解。  
- **深色**：模块内局部底避免写死浅色块再叠 **`colors.primary`** 字，易对比反转失败；局部底跟随 **`colors.surface`** 等 token。  

更细的模块壳 + token 分工见 **`email-template-restore-guide`** § 圆角放哪。

### 17. 模块壳内内容贴边（白卡片/浅底 section 左右为 0）

**现象**：权益双列、标题、问候语等 **紧贴** 白卡片或浅色模块壳的左右内缘；栅格两列像「顶满」容器宽度，缺少设计稿里的内缩。  
**根因**：模块壳 **`wrapperStyle.padding` 左右为 `0`**（或仅子块上写 `8px` 补丁），误以为根 **`emailRoot` + `tokens.spacing.pageInline`** 会同时承担 **壳内** 留白——**pageInline 只作用邮件整体相对画布**，不缩进壳内子树。  
**做法**：  
- 在 **可见模块壳** 上补 **分轴 padding**：上下 **`tokens.spacing.section`**，左右 **`tokens.spacing.gap`**（或稿面等价 px），并写齐 **`bindings.tokenPath`**。  
- 去掉子块上重复的左右 `8px` 补丁，统一由壳控制；标题与 grid 之间用壳内 **`layout.props.gap`**，或 grid **`wrapperStyle.padding` 仅上边距**（**`mode: "separate"`** + `top`，**勿** `unified: "8px 0 0 0"`）。  
- 规范与三层分工见 **`email-template-restore-guide`** § 容器内留白。

### 18. 横排应在容器内相对居中，却贴容器左缘

**现象**：`layout` + **`direction: horizontal`** 的品牌行（Logo + 字标）、图标条等，设计稿上是 **在这一行宽度里居中**，预览却 **整组挤在容器左侧**；或误把横排 **`hug` + `placement.center`** 摆到邮件正中，与「模块整体仍左对齐」冲突。  
**根因**：把「居中」理解成 **邮件级整组居中**，只改了 **`placement`**，未改横排 **`contentAlign.horizontal: center`**；或横排 **`fill` + `contentAlign: left`**，子块再 **`fill`** 被均分（§5）。  
**做法**：  
- **默认（模块左对齐 + 行内居中）**：横排 **`widthMode: fill`**（随父级内容宽），**`contentAlign.horizontal: center`**；子块 **`hug` / fixed**；纵向父级（如 `mw-brand`）保持 **`contentAlign.horizontal: left`**。  
- **同宽条带内文案居中**（如 `MEMBER EXCLUSIVE`）：文本 **`fill` + `contentAlign.horizontal: center`**。  
- **横排内子块竖直互相对齐**（如 Logo 与字标）：父级 `contentAlign.vertical: center` **不够**——子块若写 **`placement.vertical: start`** 会覆盖父级交叉轴；并排子块应 **`placement.vertical: center`**（实现见 **`EmailPreview`** `crossVerticalAlignForTableRowChild`）。  
- **仅稿面要求邮件级居中** 时：再用横排 **`hug` + `placement.horizontal: center`** 等，见 **`email-template-restore-guide`** § 横向 layout：容器内相对居中。  
与 §5（fill 均分）对照排查。

### 20. 底图叠放区「相对居中」误改子块 `hug`（应改父级「容器内内容摆放」）

**现象**：`layout` / `image` 带 **`wrapperStyle.backgroundImage`**，叠放子块（如欢迎白卡 `mwc-hero-card`）应在横幅 **宽度内** 水平或竖直居中，预览却贴左；Agent 把子块改成 **`widthMode: hug`** 或只靠子块 **`placement.horizontal: center`**，与用户要求的 Inspector **「容器内内容摆放」** 不符。  
**根因**：  
- 把 **`contentAlign`（容器内）** 与 **`placement`（相对父级）**、**`widthMode`** 混为一谈；  
- 子块为 **`fill`** 时，父级 **`contentAlign.horizontal: center`** 对「整块占满行宽」几乎无视觉差，误以为必须 **`hug` 收窄** 才能看见居中；  
- 在子块上写 **`placement.center` / `end`**，覆盖父级叠放栈的 **`contentAlign`** 主轴/交叉轴语义。  
**做法（默认修复顺序，自上而下）**：  

| 步骤 | 改谁 | 改什么 | 勿做什么 |
|------|------|--------|----------|
| 1 | **底图父容器**（如 `mwc-mod-hero`） | Inspector **「容器内内容摆放」** → **`wrapperStyle.contentAlign`**（水平 `center`；竖直按稿 `top` / `center` / `bottom`） | 勿先改子块宽度 |
| 2 | **叠放子 layout / 文本** | 需 **壳内文案居中**：子块 **`widthMode: fill` + `contentAlign.horizontal: center`**（同 §18 满宽条带文案） | 勿为「居中」默认改 **`hug`** |
| 3 | **叠放子块相对父级** | 默认 **`placement` 保持 `start`**，让父级 **`contentAlign`** 生效 | 勿用子块 **`placement.center`** 代替父级 **容器内内容摆放** |
| 4 | **仅稿面明确「整块按内容宽度」** | 才将子 layout 设为 **`hug`**，并仍配合父级 **`contentAlign`** | **禁止**用 **`hug` 冒充** 父级 **容器内相对居中** |
| 5 | **纵排父级 + 子 `widthMode: fill`** | **禁止** 写 `wrapperStyle.placement`（校验与 Inspector 均不开放）；整项相对父级摆放无产品语义，只用父/子 **`contentAlign`** | — |
| 5b | **纵排父级 + 子宽 `hug` / `fixed`** | **可配** `placement.horizontal`（`center`/`end`）；竖直看子高是否 fill（fill 高则仅水平轴） | 与 §5 勿混 |
| 6 | **横排父级 + 子 `heightMode: fill`** | 同上（横排 + fill 高）；竖直对齐改父/子 **`contentAlign`** 或子块 **`hug` 高 + `placement.vertical`** | — |
| 6b | **横排父级 + 子高 `hug` / `fixed`** | **可配** `placement.vertical`（`center`/`end`）；子宽 fill 时 Inspector 仅左列三点；水平看子宽是否 fill | 与 §6 对称；样例 `mw-logo-img` / `mw-logo-wordmark` |

**样例**：`member-welcome` **居中流式** `mwc-mod-hero`（底图）+ `mwc-hero-card`（白卡 **`fill`**）：父 **`contentAlign.horizontal: center`**；白卡 **`fill`** + 内文 **`contentAlign.horizontal: center`**；贴底时改父 **`contentAlign.vertical: bottom`**，**不要**改白卡为 **`hug`**；白卡 **勿写 `placement`**（纵排 + fill 宽）。  
**对照**：§6 底图叠放分工；**`easy-email-concepts`**「自己的容器」；**`email-template-restore-guide`** § 底图叠放与容器内居中。  
**代码真源（校验/Inspector/迁移）**：**`src/lib/placementConfigurability.ts`**（`isRelativePlacementAxisConfigurable`）；勿在技能里维护第二份键表。

### 归纳：比例 + 间距应与结构同步

结构契约、剪影比例、留白节奏应**同一轮**对齐，不要全后置到「微调」。

---

## 交付前自检（合并摘要）

详细键级要求以 **`npm run validate:all`** 与 **`src/block-contract`** 为准；此处只列**易漏人查项**：

- [ ] **template + configSchema + tokenPresets + payload + meta** 自洽；已 **`validate:all`**  
- [ ] **资源 Network 先查**（再谈像素）  
- [ ] **画布滚到底**（`.canvas-scroll` 等，见 **`email-config-motherboard`**）  
- [ ] **比例 / 间距**对照截图过一遍  
- [ ] **横排小标 / 品牌行**：子块非误用 **`fill`** 均分（§5）；需 **容器内居中** 时横排 **`fill` + `contentAlign.horizontal: center`**（§18），勿与「邮件级整组居中」混淆  
- [ ] **横排多子块竖直对齐**：子块 **`placement.vertical`**；**无 `crossAlign`**（§12）  
- [ ] **底图叠放**：**`padding` / `contentAlign` / `placement`** 分工正确；**无 `overlayInset`**（§6、§11）；叠放区居中先改 **父级容器内内容摆放**，**勿**误改子块 **`hug`**（§20）  
- [ ] **text**：**`textBody`**、无手写 **`style=`**（§8）  
- [ ] **细线**：优先 **`separator.divider`**（§9）  
- [ ] **边框/圆角两级 mode**、**icon 仅契约字段** 等 → **以校验器输出为准**  
- [ ] **圆角与缝**：根 **`gap`** 与多模块壳 **`borderRadius`** 无 §16 反模式；深色下字标/底对比可辨（§16）  
- [ ] **壳内留白**：可见模块壳（白卡/浅底 section）内容与壳边有间距；壳左右 **非** 仅靠根 **`pageInline`**（§17）  
- [ ] **`SpacingValue`**：`unified` 仅单边；四边不同用 **`separate`**；**无** `"8px 0 0 0"` 类简写（§21）
- [ ] **间距上限**：`tokens.spacing` 的 **section / gap / pageInline** 与模块壳 **`padding` 四边** 均 **≤24px**（§19）

### 21. `unified` padding 里写 CSS 多值简写（如 `8px 0 0 0`）

**现象**：Inspector 显示「四边统一 8px」，画布只有顶部留白；或 **`validate:all`** 报 unified 多值简写。  
**根因**：把 CSS **`padding` 简写**写进 **`mode: "unified"`** 的 **`unified` 字符串**；与 Inspector「四边统一」语义（四边**同值**）不一致。  
**做法**：四边相同 → **`{ "mode": "unified", "unified": "8px" }`**；仅顶/或四边不同 → **`mode: "separate"`** + **`top/right/bottom/left`**（可绑 token）。禁止 **`"28px 24px"`** 等写在 unified。存量：**`npm run normalize:spacing-unified:write`**。真源 **`src/lib/validate.ts`** · **`validateSpacingValue`**。

## §19 容器间距上限（24px）

**原则**：模块壳与邮件根上的 **上下、左右内边距**（`wrapperStyle.padding` / `emailRoot.props.padding`，以及 **`tokens.spacing.section|gap|pageInline`**）**不得超过 24px**，避免版心过空、模块之间「撑得太松」。

| 项 | 要求 |
|----|------|
| **tokenPresets** | `spacing.section`、`spacing.gap`、`spacing.pageInline` 写入值 **≤24px**；推荐舒适档：**section 20–24**、**gap 12–16**、**pageInline 20–24**，勿默认 28/32/40 |
| **template 字面量** | 容器 `padding` 勿写 `28px`、`32px` 等；优先绑 token，字面量也需过上限 |
| **校验** | `validateTokenPresets` 对超标 spacing 报错；批量收紧：`npx tsx scripts/cap-email-spacing-max.mjs --write` |
| **与 §17 关系** | 仍须壳内留白；上限只限制「过大」，不取消 **左右 gap / 上下 section** 的分轴写法 |

## 维护说明

新增案例：在本文件追加一小节（现象 / 根因 / 做法），简体中文；**勿**复制 **`block-contract`** 全表。
