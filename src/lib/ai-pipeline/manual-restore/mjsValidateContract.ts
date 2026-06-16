/**
 * 描边写法（供豆包 prompt / patch 共用）。
 * 原则：按设计图有则写可见 border；无则 borderNone()；不强制每块都有描边。
 */
export function buildMjsStrokeGuidanceSection(): string {
  return `### 描边 border（按设计图，非每块都强制）

- **设计图可见框线/描边**时，在对应 **模块壳 layout.container** 或 **buttonStyle** 写可见 border
- **无框线**的区域用 \`border: borderNone()\`（或省略 — 程序 autofix 对缺失字段补 none）
- **不要**给每个 text/icon/无框模块壳都强加描边

**四边相同（最常见）：**
\`\`\`javascript
border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.primary }
\`\`\`
宽度/颜色按设计图取（常见 \`1px\` + 黑/品牌色）。

**单边描边：**
\`\`\`javascript
border: {
  mode: 'custom', style: 'solid', color: COLORS.primary,
  top: { width: '0' }, right: { width: '0' }, bottom: { width: '1px' }, left: { width: '0' },
}
\`\`\`

**写在哪：**
- 模块壳（白卡片/黄底卡片包图+文）→ 外层 \`layout.container\` 的 \`wrapperStyle.border\` + \`borderRadius\`
- 按钮可见描边 → \`props.buttonStyle.border\`（**禁止**只写在 button 的 \`wrapperStyle\`）
- 底图 \`backgroundImage\` 不写 \`border\` / \`borderRadius\`；框线/圆角在**包住图片的模块壳** \`wrapperStyle\` 上

**模块壳包图+文示例（设计图有圆角黑框时）：**
\`\`\`javascript
function cardShell(id, name, children, opts = {}) {
  const { bg = COLORS.surface, radius = '16px', stroke = { width: '1px', color: COLORS.primary } } = opts;
  const border = stroke
    ? { mode: 'unified', width: stroke.width, style: 'solid', color: stroke.color }
    : borderNone();
  return {
    id, type: 'layout', blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill', heightMode: 'hug', backgroundColor: bg,
      padding: { mode: 'separate', top: '0', right: '0', bottom: '0', left: '0' },
      border,
      borderRadius: { mode: 'unified', radius },
    },
    children,
  };
}
\`\`\`

- **描边 mode 仅允许 \`unified\` 或 \`custom\`** — 禁止把 padding 的 \`mode: 'separate'\` 写到 border`;
}

/**
 * Easy-Email 里「图片 = 容器」的叠放语义（写给豆包，避免写成图下纵排兄弟节点）。
 * 真源：src/block-contract/by-type/content.image.ts、easy-email-concepts、email-template-restore-check §6/§20
 */
export function buildMjsImageAsContainerSection(): string {
  return `## 图片是容器（content.image 可叠放子内容）

- **底图**：\`wrapperStyle.backgroundImage.src\` ← \`PEXELS.*\`
- **容器壳**：\`widthMode/heightMode/height\` + \`contentAlign\` 双轴
- **子内容**：\`children: [...]\`；须设 \`props.direction\`、\`props.gapMode\`、\`props.gap\`

### 何时用叠放（看设计图）
- 字/白底条/角标在**照片内部** → image + children + contentAlign
- **禁止**把这种字写成 image **下方**并列 text（图外 caption 才纵排）

### contentAlign 须按设计图传参（禁止助手默认值）
- \`imageContainer\` 的 **alignH / alignV 每次调用必须显式传入**，**禁止**在助手签名里写 \`= 'top'\`、\`= 'right'\` 等默认值
- **禁止**在助手体内写死 \`horizontal: 'right'\` / \`'left'\` — 否则所有图内叠放都会套同一角
- **色名胶囊角标**（如 Wing It）： Clare 类模板常见在图内**左上** → 多数为 \`'left', 'top'\`；**以设计图为准**，勿因助手默认而用 right
- \`backgroundImage.position\` 只管 cover 裁切焦点（常用 \`'center'\`），**不等于**叠放层 corner 对齐

### 结构示例（圆角/padding/高度/对齐按设计图填，勿照抄占位）

\`\`\`javascript
function imageContainer(id, name, src, alt, height, overlayChildren, alignH, alignV) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '<Npx>' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '<Npx>' },
      backgroundImage: {
        src, alt, fit: 'cover', position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '<Npx>' },
      },
    },
    children: overlayChildren,
  };
}

// 调用示例：角标在图内左上角（按设计图确认后再写）
imageContainer(\`\${P}-s6-img\`, '浅粉色房间', PEXELS['light-pink-room'], 'soft pink room', '<Npx>', [
  colorBadge(\`\${P}-s6-badge\`, 'Wing It', '<#RRGGBB>'),
], 'left', 'top');

function quoteOverlay(id, quoteText) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '<图内块名>' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: '<#RRGGBB>',
      padding: { mode: 'separate', top: '<Npx>', right: '<Npx>', bottom: '<Npx>', left: '<Npx>' },
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '<Npx>' },
    },
    children: [textBlock(\`\${id}-t\`, '<块名>', quoteText, { alignH: '<…>', widthMode: 'fill' })],
  };
}
\`\`\`

### 树形结构（slot 名用 user 消息注入的 PEXELS.*）

\`\`\`
layout 列（vertical）
  ├─ imageContainer(PEXELS.<slotId>, overlayChildren, alignH, alignV) — 对齐按设计图
  └─ textBlock(<图外说明文案>)
\`\`\`

- **禁止** \`overlayInset\`、\`wrapperStyle.margin\``;
}

/**
 * 豆包写 mjs 时必须遵守的 validate 契约摘要。
 * 真源：src/block-contract/、src/token-preset-contract/standard-keys.ts、src/lib/validate.ts
 */
export function buildMjsValidateContractSection(): string {
  return `## validate:all 契约（违反任一条即失败 — 优先于 CSS 习惯）

### template 树：字面量优先（豆包 demo 默认）
- **buildS* / 助手函数**内样式用 \`COLORS.*\` 与 \`'16px'\` 等**字面量**写进 template JSON
- body 末尾仍输出 \`tokenPresets\`（12 键），但 **template 内禁止** \`$themeRef\`、\`bindings\`、\`themeRef()\`、\`themeBinding()\`
- 程序会在落盘前自动剥离残留的 theme 绑定；仍应尽量首轮就不写

### 禁止 Flex 废弃字段（layout props）
- **禁止** \`props.mainAlign\`、\`props.crossAlign\`、\`props.justify\`
- 横排：\`direction: 'horizontal'\` + \`wrapperStyle.contentAlign\` 双轴

### emailRoot 专用
- **必须** \`props.padding\`（无则失败；统一 \`{ mode: 'unified', unified: '0' }\`）
- **禁止** \`props.borderRadius\` — 圆角写在 sectionShell / wrapperStyle
- \`props.width: '600px'\`、\`gap: '0'\`、\`border: borderNone()\`

### button 不是 text（高频结构错误）
- \`type: 'button'\`，\`blockMeta.blockType: 'action.button'\`（**禁止**当 text 写）。
- **只允许**在 \`props\` 根写：\`text\`、\`link\`、\`buttonStyle\`。
- **禁止**在 button 的 \`props\` 根写：\`bold\`、\`italic\`、\`decoration\`、\`fontSize\`、\`color\`、\`fontWeight\` — 这些是 **text** 字段。
- 按钮外观 → \`props.buttonStyle\`：\`fontSize\`、\`textColor\`、\`backgroundColor\`、\`border\`、\`borderRadius\`、\`bold\`、\`italic\`。
- **禁止** \`buttonStyle.padding\`、\`buttonStyle.fontWeight\` — 粗细用 \`buttonStyle.bold\`；内边距由渲染层固定。
- **禁止**把按钮背景/描边/圆角只写在 \`wrapperStyle\` — \`wrapperStyle\` 只管外层对齐与 \`widthMode/heightMode\`。
- **button 外层 \`wrapperStyle.heightMode\` 必须 \`hug\`**（禁止 \`fixed\` / \`fill\` / 写 \`height\`），保证胶囊按文案完整撑高；宽度用 \`wrapperStyle.widthMode\`（hug/fixed）或 \`buttonStyle.widthMode\` 控制
- \`buttonStyle.borderRadius\` 必须是 \`{ mode: 'unified', radius: '<Npx或$themeRef>' }\`（直角也要显式）。

### 禁止字段（不要写进任何节点的 JSON）
- **wrapperStyle.margin** 及 margin.mode/top/right/bottom/left — 本仓库**无此字段**；块间距用：
  - 模块之间 → 上层 \`sectionShell\` 的 \`wrapperStyle.padding\`（bottom/top）或 \`tokens.spacing.section\`
  - 模块内部 → \`props.gap\`、子容器 \`wrapperStyle.padding\`
  - **错误示例**：标签胶囊外包一层 layout 再写 margin 推开下方内容 → **应**在下一 \`sectionShell\` 调 \`padTop\`
- **props.wrapperStyle** — 禁止；样式写在节点自身的 \`wrapperStyle\`
- text 禁止 **props.fontWeight**、**props.lineHeight** — 用 \`props.bold\`、\`props.fontSize\`
- button 禁止 **props.fontWeight**、**buttonStyle.fontWeight** — 用 \`buttonStyle.bold\`
- button 禁止 **buttonStyle.padding** — 宽度用 \`buttonStyle.widthMode/width\` 或 \`wrapperStyle.widthMode\`；**高度永远 hug**
- 禁止 **crossAlign**、**mainAlign**、**overlayInset** 等已废弃字段

### image / 条形码
- \`type: 'image'\` **必须**有 \`wrapperStyle.backgroundImage\`（含 \`src\`、\`fit\`、\`position\`）；圆角/描边写在 \`wrapperStyle.borderRadius\` / \`wrapperStyle.border\`
- 条形码、纯色条也用 \`coverImage\` / \`barcodeImage\`，勿写成无底图的 layout

### icon
- \`props.src\` 允许 **空字符串 \`''\`**（资产未注入时占位，不阻塞校验）
- \`props.color\`、\`props.size\` 仍须非空字符串

### grid（layout.grid）
- \`type: 'grid'\`，\`blockMeta.blockType: 'layout.grid'\`
- **何时用 grid**：等列矩阵（2×2 商品/色卡、三列权益 icon+文案、多列等宽宫格）
- **何时用 rowLayout**：单行横排几个块（徽章 icon+text、导航 logo+链接），**不是**矩阵时不要滥用 grid
- **grid 只负责分格**：每个直接 child = 占一格；**复合单元**（色块+名称、icon+多行字）→ **每格一个 \`layout.container\`**（如 \`colorSwatch()\`），**禁止** grid 下直接挂裸 \`text\` 代替整格内容
- 必填 \`props.columns\`、\`props.gap\`；推荐 \`cellWidthMode: 'auto'\`、\`cellHeightMode: 'content-max'\`
- 外壳 \`wrapperStyle.widthMode: 'fill'\`、\`heightMode: 'hug'\`

### widthMode 父子规则（高频报错）
- 父级 \`layout\` / \`image\` 的 \`wrapperStyle.widthMode: 'hug'\` 时，子级 **text** 必须是 **\`hug\` 或 \`fixed\`**，**禁止 \`fill\`**
- 父级 \`layout\` / \`image\` 的 \`wrapperStyle.widthMode: 'fixed'\`（须写 \`wrapperStyle.width: '<Npx>'\`）时，子级 **text** **推荐 \`fill\`**（沿用 \`textBlock()\` 默认即可）；**禁止**为 text 显式写 \`widthMode: 'hug'\`，否则定宽壳内单行撑宽会被 \`overflow: hidden\` 裁切
- **应用商店/下载徽章**（外层 \`image\` fixed 宽如 \`160px\` + 内层 \`rowLayout\` fill + icon hug）：badge 内 **text 必须 \`fill\`**，**勿**传 \`widthMode: 'hug'\`
- 同上 hug 父级内，子级 **image（content.image）** 也**禁止 \`fill\`** → 用 \`fixed\` + \`wrapperStyle.width: '<Npx>'\`（按设计图），或 \`hug\`
- **产品图包在 hug 容器内**（如 \`product-img-wrap\`）时，内层 image 勿默认 fill
- **productCard 助手**：七参数 \`(id, cardName, productName, imageSrc, imageAlt, imgWidth, imgHeight)\`；\`-img\` 子块必须是 \`type: 'image'\` + \`wrapperStyle.backgroundImage.src\` ← \`PEXELS.*\`；**禁止** gray \`layout.container\` 占位
- **摄影图/产品图尺寸**：\`coverImage\` / \`imageContainer\` / \`productCard\` 的 height/width **只在 buildS* 调用时按设计图写 px**；助手定义里**禁止**默认 \`'100px'\` / \`'240px'\` 等可照抄常数
- **胶囊标签 / 社媒按钮组**等「**父 layout 自身** \`widthMode: hug\` + padding + 背景」的短文案结构：
  - 父：\`layout.container\` + \`widthMode: hug\` + \`padding\` + \`backgroundColor\` + \`borderRadius\`
  - 子 text：**\`widthMode: hug\`**
  - 若复用 \`textBlock()\` 且**直接父级**为 hug layout，须显式 \`widthMode: 'hug'\`（不要沿用默认 fill）
- 父 \`fill\` + 子 text \`fill\` 在模块壳内通常 OK；父 \`hug\` + 子 \`fill\` **永远非法**

### tokenPresets 标准 12 键（禁止自创 scale）
\`presets.default.tokens\` 下**只允许**：
- colors: **primary**, **secondary**, **surface**
- spacing: **section**, **gap**, **pageInline**（section/pageInline ≤ 24px）
- typography: **display**, **h1**, **body**, **caption** — **禁止 h2 / h3 / subtitle / small**
  - 设计图上的「次级标题」→ 绑 \`tokens.typography.h1\` 或 \`body\`，或 text 上用字面量 \`fontSize: '<偶数Npx>'\`（不写入 tokenPresets）
- radius: **panel**, **cta**
- \`$themeRef\` 与 \`bindings.tokenPath\` 只能引用上述路径

${buildMjsStrokeGuidanceSection()}

### 背景节点 borderRadius（仍须显式）
- 含 \`backgroundColor\` 或 \`backgroundImage\` 的 \`wrapperStyle\` / 底图对象：**必须**写 \`borderRadius\`（直角也写 \`radius: '0'\`）
- \`border\`：有可见描边按上文写；无描边用 \`borderNone()\`；省略时程序 autofix 补 \`borderNone()\`
- \`sectionShell\` / \`imageContainer\` / \`cardShell\` 助手应带上 \`borderRadius\`；描边按设计图可选

### padding
- 四边不同 → \`{ mode: 'separate', top, right, bottom, left }\`
- **禁止** \`unified: "8px 12px"\` 等多值 CSS 简写

### text 必填 props（省略即 validate 失败）
- **每个** text 节点（含 image 容器 children 内手写 inline 对象）**必须**写：
  - \`props.italic: false\` 或 \`true\` — **布尔字面量**，禁止省略
  - \`props.decoration: 'none'\` — 仅允许 \`none\` / \`underline\` / \`line-through\` / \`overline\`
- 复用 \`textBlock()\` 助手时通常已包含；**recipeCard / quoteOverlay 等手写 text 对象勿漏这两项**

### 节点形态
- 每个节点 **blockMeta.name** 必填（简体中文）
- text：\`props.textBody.paragraphs[].runs[].text\`
- image（**容器**）：\`wrapperStyle.backgroundImage.src\` ← PEXELS.*；图内叠字用 \`children\`（见上文「图片是容器」）
- 纯底图无叠放才可 \`children: []\` 或省略 children
- icon：\`props.src\` ← \`ICON["slot-id"]\`（连字符槽禁止 \`ICON.icon-xxx\` 点号访问）
- root：\`type: 'emailRoot'\`；template 必填 templateId、templateVersion、locale
- **禁止**在 mjs 里写 images.pexels.com / cdn.jsdelivr.net 字面量（资产已注入）`;
}
