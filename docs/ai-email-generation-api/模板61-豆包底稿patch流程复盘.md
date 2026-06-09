# 模板 61 豆包底稿 Patch 流程复盘

## 背景

本次对比对象：

- 豆包版：`模板 61 底稿 patch 豆包还原测试 2`
  - 脚本：`scripts/generate-doubao-ai-61-patch-2-layout.mjs`
  - 日志：`logs/manual-restore-mjs-ddf7b8d6/`
  - 版式：`data/emails/ai/layouts/61--patch--2/`
- 手工版：`模板 61 底稿 patch 手工还原`
  - 脚本：`scripts/generate-manual-ai-61-patch-restore-layout.mjs`
  - 版式：`data/emails/ai/layouts/61--patch-manual-restore/`

用户观察到：手工版在 icon 占位、文本大小、尺寸、间距、字号、描边等细节上明显优于豆包版。本文不把问题归因于“模型能力本身”，而是从豆包 HTTP LLM API 的工作流设计、提示词结构、校验闭环上分析可优化点。

一个必须牢记的前提：**豆包只是 HTTPS LLM API 请求，没有本地文件读写能力，也不能主动读取仓库、执行脚本、运行 validate、查看浏览器最终效果。** 所以所有文件、契约、资产、日志、校验和视觉差异反馈，都必须由本地程序结构化后注入给它。

## 当前豆包工作流

当前 mjs 还原流程入口主要在：

- `src/lib/ai-pipeline/manual-restore/runManualRestoreViaDoubao.ts`
- `src/lib/ai-pipeline/manual-restore/promptsAssetSlots.ts`
- `src/lib/ai-pipeline/manual-restore/promptsMjsDelta.ts`
- `src/lib/ai-pipeline/manual-restore/promptsMjsEdit.ts`
- `src/lib/ai-pipeline/manual-restore/promptsApiFixedContext.ts`
- `src/lib/ai-pipeline/manual-restore/mjsValidateContract.ts`
- `src/lib/ai-pipeline/manual-restore/mjsAutofix.ts`

模板 61 测试 2 的日志显示实际链路为：

1. `MR:AssetSlots`：豆包看图输出资产槽 JSON。
2. 本地程序解析 Pexels / CDN，注入 `PEXELS` / `ICON` 常量。
3. `MR:MjsGenerate`：豆包基于 mother body 输出 XML slot patch。
4. 本地程序 merge patch，生成 mjs。
5. 本地程序执行 mjs 并 validate。
6. validate 不通过时，先 `autofix`，再让豆包输出 search patch。
7. patch 后再次执行和 validate。

日志 `logs/manual-restore-mjs-ddf7b8d6/00-run-meta.json` 里这次运行最终 `ok: true`，但成功条件是 **mjs 可执行 + validate 通过**。这不是“视觉还原完成”的等价条件。

## 关键现象

### 1. Validate 通过掩盖了视觉失败

第一次 validate 只报一个错误：

```text
blocks.ai-s2-logo.wrapperStyle.backgroundImage.src: 图片地址 src 必须为非空字符串
```

第二轮 patch 把：

```js
src: ''
```

改成：

```js
src: '#'
```

于是 validate 通过。但视觉上这仍然是未还原的 adidas Logo 占位。

这说明当前流程的目标函数是“合法”，不是“像设计图”。`validateTemplate` 只能保证 JSON 不违反契约，不能保证资产完整、尺寸准确、描边位置正确、字号符合设计。

### 2. AssetSlots 阶段漏掉品牌资产

测试 2 注入资产为：

```js
const PEXELS = {
  hero: "https://images.pexels.com/photos/15981465/pexels-photo-15981465.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
};

const ICON = {
  "instagram": "...brand-instagram.svg",
  "youtube": "...brand-youtube.svg",
  "x": "...brand-x.svg",
  "pinterest": "...brand-pinterest.svg",
};
```

它缺了至少一个关键资产：`adidas` 标志。结果：

- 导航 Logo 被写成 `src: '#'`。
- App 黑底 Logo 容器内部为空，没有 glyph。

这不是 mjs 阶段才该补救的问题，而是资产规划阶段没有把“品牌标志 / App 图标内 glyph”纳入必填槽位。

### 3. 豆包版大量沿用底稿默认视觉值

豆包版脚本里有大量明显偏大的值：

- 头图高度：`480px`
- 主标题：`48px`
- 正文：`16px`
- 导航文字：`14px`
- SHOP NOW 按钮宽：`240px`
- REDEEM ONLINE 按钮宽：`280px`
- App 图标：`100px`
- 社媒图标：`32px`
- 社媒 gap：`48px`
- 页脚链接 / 条款：`12px`

手工版按截图比例收紧为：

- 头图高度：`246px`
- 主标题：`26px` / `28px`
- 正文：`8px` / `9px` / `10px`
- SHOP NOW 按钮宽：`102px`
- REDEEM ONLINE 按钮宽：`121px`
- App 图标：`59px`
- 社媒外框：`28px`
- 页脚：`6px`

这说明豆包没有先做视觉测量，而是被 mother body / helper 示例中的常见值诱导，生成了“合法但放大”的模板。

### 4. 模块拆法过于机械

豆包版把顶部提示栏、黑色导航栏、头图拆成多个独立 section，并各自套 `sectionShell` 的 padding / gap。设计图上这些更像一个连续顶部区域：

```text
顶部提示栏
黑色导航栏
首屏图
```

这三段之间不应该引入默认 section 节奏。手工版将它们收在同一个顶部模块内，显式控制 topbar 高度、nav 高度和 hero 高度。

### 5. 横向布局存在非标准意图表达

豆包版顶部提示栏使用：

```js
rowLayout(..., { gap: 'auto' })
```

当前 Easy-Email 的稳定表达应是：

- 父行：`direction: "horizontal"`，固定高度。
- 左文案：`widthMode: "fill"`。
- 右文案：`widthMode: "hug"` + `contentAlign.horizontal: "right"`。

也就是说，prompt 不能只告诉模型“横排用 rowLayout”，还要给出常见布局意图的标准写法，例如左右分布、行内居中、图标组居中。

### 6. 描边语义没有按图分解

豆包版对 App / social / footer section 采用泛化 `stroke`。但模板 61 设计图里更像是具体分隔线：

- App 推广模块顶部有黑色横线。
- App 推广模块底部有浅色横线。
- 页脚顶部有浅色横线。
- 社媒图标自身有方形外框。

泛化 section border 会让边线位置和视觉强弱不准。更好的流程是要求豆包先输出“边线清单”：

```json
[
  { "target": "app-section-top", "kind": "top-divider", "color": "#000000", "height": "1px" },
  { "target": "social-icon", "kind": "box-border", "color": "#000000", "width": "1px" }
]
```

再由 mjs 阶段按清单实现。

### 7. 社媒图标缺外框容器

豆包版直接输出裸 `iconBlock`：

```js
iconBlock(`${P}-s7-ig`, 'Instagram', ICON["instagram"], { size: '32px' })
```

设计图是小方框里放图标。手工版使用：

```js
layout(
  `${P}-social-${id}-box`,
  `${name} 外框`,
  [iconBlock(...)],
  { widthMode: "fixed", width: "28px", heightMode: "fixed", height: "28px", stroke: border("1px") }
)
```

所以 prompt 应明确：**设计图中 icon 有可见框时，必须外包 `layout.container`，不能裸放 icon。**

### 8. 页脚没有进入合规小字层级

豆包版页脚链接、条款、版权全部 `12px`。对模板 61 的截图而言，页脚是非常小的合规文字，接近 `6px`。

这说明现有提示词虽然有 tokenPresets 的 `caption`，但没有把“页脚合规文本 → caption 级别 → 6-8px”写成强约束，也没有在视觉 lint 中检测页脚字号异常。

### 9. tokenPresets 跟着默认值走

豆包版：

```js
typography: { display: '48px', h1: '28px', body: '16px', caption: '12px' }
```

这与实际截图不匹配。tokenPresets 不应该只是“填满 12 个标准键”，而应该从视觉规格派生。

手工版：

```js
typography: { display: "28px", h1: "26px", body: "10px", caption: "6px" }
```

这更接近设计图的整体缩放。

## 提示词层面的根因

### 根因 1：提示词重契约，轻视觉规格

当前提示词非常强调：

- nested 4.0.0
- 禁止 `mainAlign` / `crossAlign`
- 禁止 `buttonStyle.padding`
- 必须 `emailRoot.props.width: 600px`
- block 白名单字段
- tokenPresets 12 标准键

这些都重要，但它们解决的是“能不能进系统”。模板还原还需要回答：

- 这个 section 目标高度是多少？
- 这一层是 top border、bottom border，还是整框 border？
- 标题、正文、页脚分别属于哪个视觉等级？
- icon 是裸图标还是方框按钮？
- 按钮是短矩形还是满宽按钮？
- 头图视觉高度和设计图比例是多少？

当前没有强制豆包先输出这些规格。

### 根因 2：AssetSlots prompt 没有覆盖品牌 / 装饰 / 内嵌 glyph

`promptsAssetSlots.ts` 当前强调摄影图、产品图、社媒、信任标等，但没有把下面几类作为强制扫描对象：

- 品牌 Logo / wordmark / 三条纹。
- App 图标内部 glyph。
- 有外框的社媒图标。
- 设计图内的小型装饰图标。

模板 61 刚好踩中了这个盲区。

### 根因 3：最终阶段允许占位资源

`mjsValidateContract.ts` 中写到：

```text
icon.props.src 允许空字符串 ''（资产未注入时占位，不阻塞校验）
```

这对中间态可以接受，但对最终交付态不应该接受。更严重的是 patch 阶段为了过 validate 把 `src: ''` 改成 `src: '#'`，但 `#` 在视觉上仍是占位。

应该区分：

- 中间态：允许占位，便于生成继续推进。
- 最终态：禁止 `src: ""`、`src: "#"`、空 `backgroundImage.src`。

### 根因 4：底稿 helper 示例有强诱导

底稿和提示词示例里大量出现：

- `fontSize: '16px'`
- `fontSize: '24px'`
- `fontSize: '32px'`
- `height: '480px'`
- `sectionShell padTop/padBottom: '24px'`
- `row gap: '16px'`
- `button width: 240px/280px` 类似写法

豆包在没有视觉规格约束时，会把这些当成“合理默认”。这就导致生成结果合法但统一偏大。

### 根因 5：Patch prompt 只修 validate 错误

`promptsMjsEdit.ts` 的任务定义是：

```text
上一轮 node 执行成功，但 template validate 未通过。你只输出少量 XML search patch 消除下列错误。
```

这导致第二轮 patch 的目标非常窄：消除 validate 错误即可。它不会主动修：

- 图标占位。
- 尺寸过大。
- 页脚过大。
- 描边位置错误。
- 社媒缺外框。

所以 patch 阶段需要同时接收两类错误：

1. 契约错误：来自 validate。
2. 视觉错误：来自视觉 lint / 截图对比 / 人工或规则生成的差异清单。

## 当前流程中已有但未充分使用的能力

`src/lib/ai-pipeline/manual-restore/types.ts` 中已经存在 `ManualRestoreBlueprintSchema`，包含：

- colors
- spacing
- typography
- imageSlots
- iconSlots
- sections

但模板 61 测试 2 实际走的是：

```text
AssetSlotsBlueprintSchema → 直接 mjs delta patch
```

也就是说，当前流程没有真正让豆包先产出完整视觉 blueprint。建议把 `ManualRestoreBlueprintSchema` 升级为正式阶段，而不是停留在旧架构或未使用形态。

## 建议的新标准流程

建议把工作流改成 6 阶段：

### 阶段 1：视觉规格 Blueprint

豆包看图只输出结构化 JSON，不写 mjs。

建议包含：

```json
{
  "canvas": {
    "sourceImageWidth": 382,
    "emailRootWidth": "600px",
    "scalePolicy": "按 600px 版心等比换算或记录截图像素"
  },
  "tokens": {
    "colors": {},
    "spacing": {},
    "typography": {},
    "radius": {}
  },
  "sections": [
    {
      "id": "s1",
      "name": "顶部导航与头图",
      "targetHeight": "约 311px",
      "children": [
        { "kind": "preheader", "height": "25px", "fontSize": "8px" },
        { "kind": "nav", "height": "40px", "fontSize": "8px", "needsLogo": true },
        { "kind": "hero", "height": "246px", "overlay": "adiclub 右上角" }
      ]
    }
  ],
  "visualChecks": [
    "社媒图标必须有 28px 方形外框",
    "页脚字号为 caption 级别",
    "App 图标为黑底圆角方块且内部有 adidas glyph"
  ]
}
```

### 阶段 2：资产槽规划

AssetSlots 阶段应在视觉 blueprint 基础上做，而不是只看图一次。

强制规则：

- 设计图有品牌 Logo，则必须输出 `iconSlots`。
- 设计图有 App 图标内部 glyph，则必须输出 `iconSlots`。
- 社媒图标必须输出 `iconSlots`，并标记是否有外框。
- 摄影图必须输出 `imageSlots`。
- 不允许 mjs 阶段新增未声明资产。

### 阶段 3：本地程序解析资产并注入

本地程序负责：

- Pexels 搜图。
- jsDelivr 图标解析。
- URL 可访问性检查。
- 注入 `PEXELS` / `ICON`。
- 记录资产槽缺失项。

豆包不写 URL，不读文件。

### 阶段 4：mjs Slot Patch 生成

豆包输入：

- 设计图。
- 视觉 blueprint。
- 已解析资产槽。
- mother body。
- 契约摘要。

输出 XML slot patch。

关键改动：mjs prompt 不再只说“从设计图提取”，而要说“必须按 blueprint 中的尺寸、字号、边线、外框、资产槽实现；如无法实现，输出明确 TODO 标记并让程序失败”。

### 阶段 5：契约校验 + 视觉 Lint

除了现有 validate，新增视觉 lint：

- 禁止最终产物存在 `src: ""`、`src: "#"`。
- 设计图标记 `needsLogo: true` 但没有真实 icon，失败。
- 社媒图标有外框要求但 mjs 中是裸 `iconBlock`，失败。
- 页脚字号大于阈值，例如 `> 8px`，警告或失败。
- 标题、正文、按钮、头图、App icon 命中底稿默认大值时，警告或失败。
- 出现 `gap: "auto"`，失败或警告。
- 设计图要求 top/bottom divider，但实现成泛化 section stroke，警告。

### 阶段 6：Patch 阶段同时修契约和视觉

patch prompt 输入不应只有 validate 错误，还应包含：

```text
## validate 错误
...

## visual lint 错误
1. 导航 Logo 仍为 src "#"，必须改为 ICON["adidas"] 或补资产槽后重跑
2. App 图标为空，必须插入 adidas icon
3. 页脚 fontSize 12px 过大，应为 6px-8px
4. 社媒图标缺少 28px 方形外框
5. hero height 480px 过高，应约 246px
```

这样第二轮 patch 才不会只做“把空字符串改成 #”这类合法性补丁。

## 提示词建议改法

### AssetSlots Prompt

增加：

```text
必须扫描并输出以下视觉资产：
- 品牌 Logo / wordmark / 三条纹等品牌标识。
- App 图标、黑底图标内部 glyph。
- 社媒图标，即使图标外有方框，也要输出 iconSlot，并在 notes 中标记 hasBox=true。
- 任何不是纯文字、但需要图形表达的标识。

如果设计图出现品牌标志但无法确定具体图标包，仍输出 iconSlot，并使用 simple-icons 优先。
```

### Mjs Delta Prompt

增加：

```text
你必须先遵守程序注入的 visualBlueprint：
- 字号、宽高、gap、padding、border、divider、icon box 均以 blueprint 为准。
- 禁止沿用底稿默认视觉值，除非 blueprint 明确一致。
- 若某处使用 48px / 32px / 16px / 480px / 100px / gap 48px 等默认大值，必须能在 blueprint 中找到依据。
```

增加常见结构模板：

```text
左右分布行：
父 horizontal fill fixed height；
左 text widthMode=fill；
右 text widthMode=hug + alignH=right。

有外框 icon：
外层 layout fixed width/height + border；
内层 iconBlock size 按图。

分隔线：
优先单独 divider layout，不要用整段 section stroke 糊 top/bottom 分隔线。
```

### Patch Prompt

把任务从“消除 validate 错误”改为：

```text
上一轮 node 执行成功，但 validate 或 visual lint 未通过。
你只输出少量 XML search patch，必须同时消除 validate 错误和 visual lint 错误。

禁止用 src "#"、空字符串、透明占位、删除节点等方式绕过视觉 lint。
```

### Validate Contract Prompt

把 icon 占位规则改成分阶段：

```text
中间态：icon.props.src 可为空以便继续生成。
最终态：禁止 icon.props.src 为空或 "#"；禁止 image.backgroundImage.src 为空或 "#"。
```

## 推荐新增程序检查

建议新增 `mjsVisualLint`，输入 mjs source 或生成后的 `template.json`，输出结构化问题：

```ts
type MjsVisualLintIssue = {
  severity: "error" | "warning";
  code:
    | "asset.placeholderSrc"
    | "asset.missingRequiredLogo"
    | "typography.footerTooLarge"
    | "layout.heroTooTall"
    | "layout.defaultSizeLikelyCopied"
    | "icon.missingBox"
    | "divider.strokeUsedAsDivider"
    | "layout.unsupportedAutoGap";
  path?: string;
  message: string;
  suggestion?: string;
};
```

模板 61 可先硬编码一批通用规则，不需要一开始做复杂图像识别：

- `src === "" || src === "#"`：error。
- `gap === "auto"`：warning/error。
- 页脚模块中 `fontSize >= 12px`：warning。
- 社媒模块中 icon 直接挂在 row 下且无固定外框：warning。
- 出现 `height: "480px"`、`height: "100px"`、`fontSize: "48px"`、`gap: "48px"` 等 mother 默认疑似复制值：warning。
- App 图标容器无 children：warning/error。

这些规则虽然朴素，但能准确拦住模板 61 这次的问题。

## 结论

当前豆包底稿 patch 工作流已经能解决“从设计图到合法 mjs”的问题，但还没有解决“从设计图到高保真邮件模板”的问题。

核心短板不是单个提示词，而是闭环目标不完整：

```text
当前目标：LLM 输出 mjs → node 可执行 → validate 通过

应该目标：视觉 blueprint 明确 → 资产槽完整 → mjs 合法 → validate 通过 → visual lint 通过 → 必要时带视觉错误 patch
```

豆包没有文件读写能力，这反而要求本地程序承担更多确定性职责：

- 提供仓库契约与 helper。
- 管理资产槽和 URL。
- 执行 mjs。
- 跑 validate。
- 跑 visual lint。
- 把错误结构化反馈给豆包 patch。
- 保存日志和最终落盘。

豆包最适合承担的是：看图理解、输出结构化视觉规格、按规格生成 patch。不要让它在一次调用里同时猜资产、猜尺寸、猜契约、猜落盘规则、猜视觉验收标准。

