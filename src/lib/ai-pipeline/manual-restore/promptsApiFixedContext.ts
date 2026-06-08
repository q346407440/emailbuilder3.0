/**
 * 豆包 HTTP API 专用 prompt 固定文案（真源）。
 *
 * 与 Cursor Agent 不同：豆包无本地文件系统，不能「打开 skill / 建目录 / 跑 validate」。
 * 此处只写单次 API 调用产出 JSON / mjs 所需的领域规则与**结构示例**（不含可照抄的业务真实值）。
 *
 * 维护：改契约时同步 mjsValidateContract.ts；改助手形态时同步本文件。
 */

/** 各 stage system prompt 开头应附的「示例怎么用」说明。 */
export function buildPromptExampleUsageNotice(): string {
  return `## 示例怎么用（必读）

- 下文 JSON / 代码块只展示**字段名、嵌套关系、必填形态**；**不是**默认值表。
- **助手函数**请用 **COLORS + 字面量 px** 写 template 树；**禁止** \`$themeRef\`、\`bindings\`、\`themeRef()\`、\`themeBinding()\`（tokenPresets 仍须输出，但 buildS* 不绑主题）。
- 尖括号 \`<…>\`、省略号 \`…\` 处必须依据**附带设计图**与 **user text 正文**填写。
- **禁止**照抄示例里的占位符字面量；**禁止**因示例出现过某 slotId、颜色、字号、模块名就在每个模板里复用同一套。
- 仅 **user text** 里的 **slot 对照表**（\`PEXELS.*\` / \`ICON.*\` 变量名）与块 id 前缀 \`P\` 为本次运行真值；须原样引用变量名，**勿**写 URL 字面量或 \`const PEXELS\` / \`const ICON\`。`;
}

/** MR:AssetSlots — 阶段①专用：示例说明（无 PEXELS 注入）。 */
export function buildAssetSlotsPromptExampleNotice(): string {
  return `## 示例怎么用（必读）

- 下文 JSON **只含 imageSlots + iconSlots**，用于程序搜图；**禁止**输出 colors、spacing、typography、sections、emailKey 等（由阶段②写 mjs 时根据设计图处理）。
- 尖括号 \`<…>\` 处必须依据**附带设计图**填写；**禁止**照抄示例里的 slotId / query 字面量。`;
}

/** MR:AssetSlots — 结构示例 + 取值说明（仅两槽数组）。 */
export function buildAssetSlotsSchemaExampleSection(): string {
  return `## 输出 JSON 结构示例（仅结构，勿照抄占位符）

\`\`\`json
{
  "imageSlots": [
    {
      "slotId": "<语义化 id，如 hero / block1 / keynote>",
      "query": "<英文 Pexels 搜索词>",
      "targetWidth": "<整数像素，可选>"
    }
  ],
  "iconSlots": [
    {
      "slotId": "<语义化 id>",
      "pack": "<tabler | simple-icons | lucide>",
      "iconQuery": "<包内图标名>"
    }
  ]
}
\`\`\`

### 取值说明

| 字段 | 怎么填 |
|------|--------|
| imageSlots | 设计图里**每一张需要 Pexels 的摄影图**各一条；**每图一槽** |
| imageSlots.slotId | 语义化命名（hero、block1、ugc1、keynote…），与手工 mjs 的 \`PEXELS.*\` 键一致即可 |
| imageSlots.query | **英文**、可搜；描述画面，**不是 URL** |
| imageSlots.targetWidth | 横图约 600、方图/商品约 400（可按视觉微调） |
| iconSlots | 信任标、社媒、品牌标等；**禁止 URL** |
| iconSlots.pack + iconQuery | tabler / simple-icons / lucide + 包内图标名 |
| 纯文字 logo / wordmark | **不要**占 imageSlot（阶段②用 text 写） |
| 无摄影图/无图标 | 对应数组可为 \`[]\`，但 JSON 顶层仍须保留两键 |`;
}

/** MR:AssetSlots — 规则摘要。 */
export function buildAssetSlotsApiDomainSection(): string {
  return `## 规则摘要

- **只输出** \`imageSlots\`、\`iconSlots\` 两个顶层键
- 有几张图 / 几个标就几个 slot；slotId 在同一 JSON 内唯一
- query / iconQuery 只写搜索条件，**禁止** images.pexels.com / cdn.jsdelivr.net
- 颜色、文案、模块结构、tokenPresets：**不要在本阶段输出**（阶段② \`MR:MjsGenerate\` 再看设计图写 mjs）`;
}

/** MR:MjsGenerate — 结构约定。 */
export function buildMjsApiDomainSection(): string {
  return `## 领域约定（写 mjs 时必须遵守）

### template 形态
- **nested 4.0.0**：顶层 \`schemaVersion: '4.0.0'\` + \`root\` 树（**无**顶层 blocks map）
- root：\`type: 'emailRoot'\`；\`props.width: '600px'\`（**项目固定版心**，非设计图变量）
- 根 \`props.gap: '0'\` — 模块间距用 sectionShell padding，勿堆在根 gap
- 每个节点 \`blockMeta.name\` 必填（**简体中文，按设计图模块命名**）

### 模块壳 sectionShell
- 设计图自上而下每一块 → \`buildS1()\` … \`buildSn()\`（**n = 设计图模块数**）
- 模块之间间距：sectionShell 的 padding bottom/top（**字面量 px** 或 \`COLORS\`）
- 模块内部：\`props.gap: '<Npx>'\` 或内层 padding
- **设计图有圆角框线/描边**：用 \`cardShell\` 或 \`sectionShell({ stroke: { width, color } })\` 包图+文；无描边则不传 stroke

### tokenPresets（与 template 分工）
- body 末尾仍须 \`const tokenPresets = …\`（12 标准键，数值从设计图取）
- **template 树内样式一律字面量**：\`'16px'\`、\`COLORS.primary\` — **禁止** \`$themeRef\` / \`bindings\`
- \`spacing.section\` 与 \`spacing.pageInline\` **均 ≤ 24px**

### 横排 layout（禁止 Flex 废弃字段）
- 横向排列：\`props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' }\`
- 对齐：\`wrapperStyle.contentAlign: { horizontal: 'center'|'left'|'right', vertical: 'top'|'center'|'bottom' }\`
- **禁止** \`props.mainAlign\`、\`props.crossAlign\`（已废弃，写了必 validate 失败）

### 图源与图标
- 只用 user 消息注入的 \`PEXELS.*\`、\`ICON.*\` 变量名
- 禁止在 mjs 里写 https:// 字面量

### 常见反模式
- **button 当 text 写** → 必须用 \`buttonBlock\` 助手
- **mainAlign / crossAlign** → 改用 \`contentAlign\` + \`direction: 'horizontal'\`
- **emailRoot.props.borderRadius** → 禁止；圆角放在 sectionShell \`wrapperStyle.borderRadius\`
- 图内白底字 → image 容器 + children；条形码/占位图也用 \`type:'image'\` + \`wrapperStyle.backgroundImage\`
- **imageContainer 禁止默认 align** → alignH/alignV 每次按设计图显式传入；色名角标勿无脑 \`right\`
- 父 hug 时子 text 必须 hug 或 fixed，禁止 fill
- 父 fixed（layout/image 且写了 width）时子 text 推荐 fill（textBlock 默认）；定宽徽章内勿 hug
- 应用商店徽章：image fixed 宽 + rowLayout fill 时，内文 text 必须 fill，禁止 widthMode: 'hug'
- button 外层 wrapperStyle.heightMode 必须 hug，禁止 fixed/fill/height 像素
- **grid 格里只塞裸 text** → 色卡/商品/权益等复合单元须 **每格一个 layout**（如 \`colorSwatch\` / \`trustCol\`），禁止把 grid 当纯文字列表`;
}

/** 横排 layout 示例（替代 mainAlign/crossAlign）。 */
export function buildMjsHorizontalLayoutSection(): string {
  return `## 横排 layout 示例（禁止 mainAlign / crossAlign）

\`\`\`javascript
function rowLayout(id, name, children, opts = {}) {
  const { gap = '16px', alignH = 'center', alignV = 'top' } = opts;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'horizontal', gapMode: 'fixed', gap },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children,
  };
}
\`\`\``;
}

/** grid 矩阵 vs 横排 layout：决策 + gridBlock 助手。 */
export function buildMjsGridSection(): string {
  return `## grid 栅格（layout.grid）— 何时用、怎么写

| 场景 | 用 |
|------|-----|
| 2×2 / 3 列 **等宽矩阵**（商品宫格、色卡、权益三列 icon+文案） | **gridBlock** |
| 单行横排（icon+短文案、双徽章、logo+链接） | **rowLayout** |
| 纵向列表（餐厅卡片一行一个） | **sectionShell 内纵排 layout** |

### 核心：grid 只分格，每格内容用 layout 包一层

- **grid 的直接 children = 矩阵格**，一格一个 block
- **一格里有多个视觉元素**（色块+名称、icon+两行字、图+标题）→ **该格必须是 \`layout.container\`（或助手返回的 layout）**，再在格内竖排/横排
- **禁止**把「色卡网格 / 商品矩阵」简化成 grid 下直接挂 4 个 \`textBlock\` — 会丢失色块、对齐与尺寸

\`\`\`javascript
function gridBlock(id, name, columns, children, opts = {}) {
  const { gap = '16px', alignH = 'center', alignV = 'top' } = opts;
  return {
    id,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name },
    props: { columns, gap, cellWidthMode: 'auto', cellHeightMode: 'content-max' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: { mode: 'unified', unified: '0' },
    },
    children,
  };
}

/** 色卡单元：blob layout + 名称 text（供 grid 每格复用） */
function colorSwatch(id, name, color) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '色卡项' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      width: '<按设计图像素>',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: \`\${id}-blob\`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '色卡blob' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: '<Npx>',
          heightMode: 'fixed',
          height: '<Npx>',
          backgroundColor: color,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: [],
      },
      textBlock(\`\${id}-name\`, '色卡名称', name, { fontSize: '14px', widthMode: 'hug' }),
    ],
  };
}
\`\`\`

**❌ 错误（丢色块）：**
\`\`\`javascript
gridBlock(\`\${P}-s4-colors\`, '色卡网格', 2, [
  textBlock(\`\${P}-c1\`, '颜色1', 'Daily Greens'),
  textBlock(\`\${P}-c2\`, '颜色2', 'Deep Dive'),
  // …
])
\`\`\`

**✅ 正确（每格一个 layout 单元）：**
\`\`\`javascript
gridBlock(\`\${P}-s4-colors\`, '色卡网格', 2, [
  colorSwatch(\`\${P}-s4-s1\`, 'Daily Greens', '#809678'),
  colorSwatch(\`\${P}-s4-s2\`, 'Deep Dive', '#365D73'),
  colorSwatch(\`\${P}-s4-s3\`, 'Goodnight Moon', '#243447'),
  colorSwatch(\`\${P}-s4-s4\`, 'OMGreen', '#B3CBB9'),
], { alignH: 'left', gap: '16px' })
\`\`\`

- children 数量通常为 columns 的整数倍（2 列 × 2 行 = 4 格）
- 权益三列等同理：每格 \`layout\` 包 icon + text，勿在 grid 下直接平铺裸 icon/text`;
}

/** text / button / layout 三种形态对照（防混写）。 */
export function buildMjsBlockTypeCheatSheetSection(): string {
  return `## block 类型对照（禁止混用 HTML/CSS / Flex 习惯）

| 用途 | type | blockMeta.blockType | 样式写在哪 |
|------|------|---------------------|------------|
| 段落标题 | \`text\` | \`content.text\` | \`props.fontSize/color/bold\` 字面量 + \`wrapperStyle\` |
| 按钮 | \`button\` | \`action.button\` | \`props.buttonStyle.*\` 字面量 |
| 图标 | \`icon\` | \`content.icon\` | \`props.src\`（可为 \`''\` 占位）/ size / color |
| 摄影/条形码 | \`image\` | \`content.image\` | **必须** \`wrapperStyle.backgroundImage.src\` |
| 等列矩阵 | \`grid\` | \`layout.grid\` | \`props.columns/gap/cell*\` + \`wrapperStyle\` |
| 模块壳 | \`layout\` | \`layout.container\` | \`wrapperStyle.padding\` 字面量 + \`props.gap\` |

**❌ 禁止：** \`props.mainAlign\`、\`props.crossAlign\`、\`props.justify\`、emailRoot 上的 \`props.borderRadius\`

**错误 vs 正确（button）：**

\`\`\`javascript
// ❌ 禁止：把 button 写成 text + 外壳 CSS
{ type: 'button', props: { text: 'BUY', bold: true, fontSize: '16px', color: '#000' },
  wrapperStyle: { backgroundColor: '#fff', border: { width: '1px', ... } } }

// ✅ 必须：buttonStyle 承载按钮外观
{ type: 'button', blockMeta: { blockType: 'action.button', name: '购买按钮' },
  props: {
    text: 'BUY',
    link: { href: '#', type: 'external' },
    buttonStyle: {
      fontSize: '16px', textColor: COLORS.black, backgroundColor: COLORS.white,
      bold: false, italic: false,
      border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.black },
      borderRadius: { mode: 'unified', radius: '9999px' },
    },
  },
  wrapperStyle: { contentAlign: { horizontal: 'center', vertical: 'center' },
    widthMode: 'hug', heightMode: 'hug',
    border: borderNone(), borderRadius: { mode: 'unified', radius: '0' } },
}
\`\`\``;
}

/** 助手函数 + buildS* + 落盘：字面量写法（无 themeRef/bindings）。 */
export function buildMjsApiHelperSnippetsSection(): string {
  return `## 助手函数（template 树只用 COLORS + 字面量 px；勿写 themeRef / bindings）

\`\`\`javascript
function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
}

function sectionShell(id, name, opts = {}) {
  const {
    bg = COLORS.surface,
    pageInline = true,
    padTop = '24px',
    padBottom = '24px',
    borderRadius = '16px',
    /** 设计图有可见描边时：{ width: '1px', color: COLORS.primary }；无则省略 */
    stroke,
  } = opts;
  const border = stroke
    ? { mode: 'unified', width: stroke.width ?? '1px', style: 'solid', color: stroke.color ?? COLORS.primary }
    : borderNone();
  const padding = pageInline
    ? { mode: 'separate', top: padTop, right: '20px', bottom: padBottom, left: '20px' }
    : { mode: 'separate', top: padTop, right: '0', bottom: padBottom, left: '0' };
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: bg,
      padding,
      border,
      borderRadius: { mode: 'unified', radius: borderRadius },
    },
    children: [],
  };
}

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'center',
    fontSize = '16px',
    color = COLORS.primary,
    bold = false,
    widthMode = 'fill',
  } = opts;
  return {
    id,
    type: 'text',
    blockMeta: { blockType: 'content.text', name },
    props: {
      textBody: { paragraphs: [{ runs: [{ text: content }] }] },
      fontSize,
      color,
      bold,
      italic: false,
      decoration: 'none',
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode,
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const {
    alignH = 'center',
    bg = COLORS.surface,
    textColor = COLORS.primary,
    fontSize = '16px',
    radius = '9999px',
    widthMode = 'hug',
    width,
    /** 设计图按钮有描边时：{ width: '1px', color: COLORS.primary } */
    stroke,
  } = opts;
  const border = stroke
    ? {
        mode: 'unified',
        width: stroke.width ?? '1px',
        style: 'solid',
        color: stroke.color ?? textColor,
      }
    : borderNone();
  return {
    id,
    type: 'button',
    blockMeta: { blockType: 'action.button', name },
    props: {
      text: label,
      link: { href: '#', type: 'external' },
      buttonStyle: {
        fontSize,
        textColor,
        backgroundColor: bg,
        bold: false,
        italic: false,
        border,
        borderRadius: { mode: 'unified', radius },
      },
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'center' },
      widthMode,
      ...(widthMode === 'fixed' && width ? { width } : {}),
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function iconBlock(id, name, src, opts = {}) {
  const { size = '32px', color = COLORS.primary } = opts;
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name },
    props: { src: src ?? '', size, color },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function coverImage(id, name, src, alt, height) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
    },
  };
}

/** 条形码 / 纯色条也用 image + backgroundImage（勿写成无底图的 layout） */
function barcodeImage(id, name, height = '80px') {
  return coverImage(id, name, '#', 'barcode', height);
}

function buildS1() {
  const sec = sectionShell(\`\${P}-s1\`, '<模块名>', { padTop: '0', bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s1-title\`, '<标题>', '<文案>', { fontSize: '24px', bold: true }),
    coverImage(\`\${P}-s1-img\`, '<图片名>', PEXELS.<slotId>, '<alt>', '240px'),
    buttonBlock(\`\${P}-s1-cta\`, '<按钮名>', '<按钮文案>'),
  ];
  return sec;
}
\`\`\`

## tokenPresets + template 结构示例（body 末尾必填）

\`\`\`javascript
const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: '<简短说明>',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '16px', cta: '9999px' },
      },
    },
  },
  scopeSelections: {},
};

const template = {
  schemaVersion: '4.0.0',
  emailId: EMAIL,
  templateId: EMAIL,
  templateVersion: 1,
  locale: '<语种>',
  root: {
    id: \`\${P}-root\`,
    type: 'emailRoot',
    blockMeta: { blockType: 'layout.container', name: '画布根' },
    props: {
      backgroundColor: COLORS.surface,
      width: '600px',
      padding: { mode: 'unified', unified: '0' },
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2()],
  },
};
\`\`\``;
}
