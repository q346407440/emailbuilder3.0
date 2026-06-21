# RestoreAst 模式下的豆包还原问题集合

记录前端 **方案 2 · RestoreAst 组装** 路径下，由豆包看图输出语义 JSON → 搜素材 → 组装器落盘时发现的问题；与**机器还原**（组装器直跑夹具 `restore-ast.json`）对照排查。

**对比邮件场景**：`template-mqhos2xu`（对比机器还原与豆包还原）  
**豆包版式命名**：`豆包还原{夹具名}-1`  
**运行日志目录**：`logs/restore-ast-<runId>/`（含 `01-llm-raw.txt`、`02-restore-ast.json`、`05-template.json` 等）

---

## 问题索引

| # | 夹具 | 现象摘要 | 主因归类 | 状态 |
|---|------|----------|----------|------|
| 1 | buoy-thankyou-template67 | 多处背景色错误（权益卡片发黑、抬头区非米色） | 豆包 `box.tone` 裸 hex 格式违规 + 组装器静默兜底 | 已记录 |
| 2 | forever21-template46 | 模块左右贴边、相邻大模块竖向间距为 0 | 豆包漏写 email 级 `stack` 的 `box.pad` + Prompt 缺省语义为 0 | 已记录 |
| 3 | forever21-template46 | 分类导航建成通栏 primary 按钮、缺分隔线 | 豆包语义类型误判（`button` vs `text`+`divider`）+ Prompt 未区分 | 已记录 |
| 4 | forever21-template46 | App Store / Google Play 徽章无法还原 | 机器夹具误用 `button`；豆包 `image` 走 Pexels；缺 badge 素材标识与固定 URL 解析 | 已记录（含方案讨论） |
| 5 | huckberry-template48 | row 商品缩略图尺寸/宽度与机器版不一致 | 豆包 AST 结构错（图包进 stack）+ `height` 量偏 + Prompt 未强调直接 child | 已记录 |
| 6 | huckberry-template48 | 九宫格推荐商品图高度参差不齐 | 豆包各格 `image.height.px` 不统一 + Prompt 未要求同 grid 统一高度 | 已记录 |

---

## 问题 1：`box.tone` 裸 hex 字符串 → 背景色静默兜底为 `#1A1A1A`

### 基本信息

| 项 | 值 |
|---|---|
| 夹具 | `buoy-thankyou-template67` |
| 豆包版式 | `豆包还原buoy-thankyou-template67-1`（落盘 id：`buoy-thankyou-template67-1-2`） |
| 机器对照版式 | `buoy-thankyou-template67-1` |
| 日志 | `logs/restore-ast-8cc70826/` |
| 发现日期 | 2026-06-17 |

### 共性现象

豆包在 `box.tone` 上反复写出**裸 hex 字符串**（如 `"#FFFFFF"`、`"#F9F0E7"`），违反 RestoreAst 契约。组装器 `resolveTone` 无法识别后**静默**回退为 `DEFAULT_TEXT_COLOR`（`#1A1A1A`），导致：

- 本应为白底 / 米色的区域变成深灰黑底；
- 内部 `text` 无 `tone` 时默认字色也是 `#1A1A1A` → 黑底黑字、内容不可读。

契约要求 `tone` 只能是：

- 颜色档位 token（如 `"surface"`、`"primary"`），或
- 逃生口对象 `{ "hex": "#RRGGBB" }`

**禁止**裸字符串 `"#RRGGBB"`。

### 示例 A：权益档位卡片栅格（`grid-2`）

| 项 | 值 |
|---|---|
| 模板 | `data/emails/template-mqhos2xu/layouts/buoy-thankyou-template67-1-2/template.json` |
| 区块 ID | `template-mqhos2xu-buoy-thankyou-template67-1-2-grid-2` |
| 区块名称 | 权益档位卡片 |
| 表现 | 三列积分档位卡片在预览中几乎全黑，文字不可读 |

**豆包原始 JSON**（`02-restore-ast.json`，各档位子 `stack`）：

```json
"box": {
  "pad": "gap",
  "radius": "panel",
  "border": "thin",
  "borderTone": "secondary",
  "tone": "#FFFFFF"
}
```

**组装落盘**（如 `…-stack-9`「250分档位」）：

- `wrapperStyle.backgroundColor: "#1A1A1A"`
- 内部 `text` 无 `tone` → `props.color: "#1A1A1A"`

**机器对照**（夹具 `restore-ast.json` 同结构合法写法）：

```json
"box": {
  "pad": "gap",
  "tone": "surface",
  "radius": "panel",
  "border": "hairline",
  "borderTone": "secondary"
}
```

机器版式落盘为 `backgroundColor: { "$themeRef": "colors.surface" }`，显示正常。

---

### 示例 B：信件抬头区域（`stack-1`）

| 项 | 值 |
|---|---|
| 模板 | 同上 |
| 区块 ID | `template-mqhos2xu-buoy-thankyou-template67-1-2-stack-1` |
| 区块名称 | 信件抬头区域模块 |
| 表现 | 抬头区背景应为米色 `#F9F0E7`，实际为 `#1A1A1A`；与默认黑字叠在一起几乎不可读 |

**豆包原始 JSON**（`02-restore-ast.json`）：

```json
"box": {
  "pad": "pageInline",
  "tone": "#F9F0E7",
  "radius": {
    "px": "0"
  }
}
```

**组装落盘**：

- `wrapperStyle.backgroundColor: "#1A1A1A"`（应为 `#F9F0E7`）
- 子 `text` 无 `tone` → `props.color: "#1A1A1A"`

**机器对照**（夹具外层主卡片，结构不同但 tone 写法合法）：

```json
"box": {
  "pad": "section",
  "tone": {
    "hex": "#FDE8F0"
  }
}
```

机器版式 `ast-stack-1` 落盘为 `backgroundColor: "#FDE8F0"`，显示正常。

> 注：`radius.px: "0"`（字符串而非数字）会被 `isPxValue` 忽略后回退为 `0`，对圆角影响可忽略；本例主因仍是 `tone` 裸 hex。

---

### 根因分析

| 环节 | 说明 |
|------|------|
| **豆包输出（主因）** | 将设计意图中的具体色值写成了契约外的裸 hex 字符串（白底、米色底等）。 |
| **解析层** | `parseRestoreAstDocument` 校验较松，未拦截非法 `tone` 形态，坏数据进入组装器。 |
| **组装器** | `resolveTone`（`src/restore-ast-contract/resolveValue.ts`）无法识别裸 hex 字符串时，**静默**回退为 `DEFAULT_TEXT_COLOR`（`#1A1A1A`），非「把合法色值映射错」，而是非法输入兜底。 |

相关代码：`applyBoxWrapper` → `resolveTone`；`buildText` 无 `tone` 时同样走默认 `#1A1A1A`。

### 建议修复方向

1. **Prompt**：明确 `box.tone` 应写 token（如 `"surface"`）或 `{ "hex": "#RRGGBB" }`，禁止裸 hex 字符串。
2. **归一化**：在 `normalizeRestoreAstFromLlm` 将裸 `#RRGGBB` 字符串收成 `{ hex }`（与 icon 简写归一类似）。
3. **校验**：用 `restore-ast-document` 严格 schema 在解析阶段失败，避免 silent fallback 落盘。

### 状态

- [x] 已记录
- [ ] 已修 Prompt / 归一化 / 校验
- [ ] 已重跑豆包版式验证

---

## 问题 2：漏写 `box.pad` → 版心留白缺失 / 相邻模块间距为 0

### 基本信息

| 项 | 值 |
|---|---|
| 夹具 | `forever21-template46` |
| 豆包版式 | `豆包还原forever21-template46-1`（落盘 id：`forever21-template46-1-2`） |
| 机器对照版式 | `forever21-template46-1` |
| 对照依据 | 落盘 `template.json` vs 机器版式 + 夹具 `restore-ast.json`（同批豆包还原） |
| 发现日期 | 2026-06-17 |

### 共性现象

设计稿中**非通栏贴边**的内容区应有 `section` / `pageInline` 留白；**相邻 email 级大模块**之间也靠各模块 `box.pad` 的上下 padding 形成竖向节奏（email 根 `gap` 固定为 `0`，程序不会自动补模块间距）。

RestoreAst 契约下，留白由容器 `box.pad` 显式声明；组装器**不会**根据 theme 或设计图自动推断 padding。落盘后相邻同色模块壳还会经 `collapseRootSiblingPaddingSeams` 将接缝处 bottom/top 各折半——**前提是两边都已写入 pad**。

- Prompt 将 `box.pad` 标为**可选**，缺省描述为「程序默认」；
- 程序实际默认 = **无 padding（0）**；
- 豆包若未在 email 下大模块 `stack`（或需留白的 grid / 父 stack）写 `box.pad`：
  - **左右**：内容贴到版心边缘；
  - **上下**：与相邻模块视觉间距为 0（上块无 bottom、下块无 top）。

> **Inspector 易误判**：`grid` 节点本身 `padding: 0` 是正常形态；机器夹具也是**父 stack** 承担留白，而非 grid 自带 padding。  
> **`props.gap` 只管模块内部**子块间距（如标题与列表），**不能**替代模块与模块之间的竖向留白。

### 示例 A：三列新品卡片（`grid-1` + 父 `stack-3`）

| 项 | 值 |
|---|---|
| 模板 | `data/emails/template-mqhos2xu/layouts/forever21-template46-1-2/template.json` |
| 区块 ID | `template-mqhos2xu-forever21-template46-1-2-grid-1` |
| 区块名称 | 三列新品卡片 |
| 父 stack | `…-stack-3`「暖季新品展示区模块」 |
| 表现 | 三列商品卡片左右无留白，贴边显示；机器版式同区域有 section 级左右 padding |

**机器夹具合法写法**（留白在父 stack，grid 不写 pad）：

```json
{
  "t": "stack",
  "title": "再看一眼宫格",
  "align": "center",
  "gap": "section",
  "box": { "pad": "section" },
  "children": [
    { "t": "text", "content": "WANNA LOOK AGAIN?", "role": "h1", "bold": true },
    {
      "t": "grid",
      "title": "三列商品宫格",
      "columns": 3,
      "gap": "gap",
      "children": [ "...每格 stack..." ]
    }
  ]
}
```

**豆包落盘对照**：

| 节点 | 机器 `forever21-template46-1` | 豆包 `forever21-template46-1-2` |
|------|------------------------------|--------------------------------|
| 父 stack（`ast-stack-3` / `stack-3`） | `wrapperStyle.padding` 为 `section`（top/right/left） | **无** `padding` 字段 |
| `grid-1` | `padding` 四边均为 `"0"` | `padding` 四边均为 `"0"`（与机器一致） |

同版式内豆包对 `stack-2`「新品首屏横幅模块」**有**写 `box.pad: "section"` 并正确落盘，说明模型会输出 pad，但 `stack-3` 漏写——属**输出不一致/遗漏**，非组装器丢字段。

---

### 示例 B：为你推荐 ↔ 分类导航（`stack-7` / `stack-11`）竖向间距为 0

| 项 | 值 |
|---|---|
| 模板 | 同上 |
| 区块 ID | `…-stack-7`「为你推荐商品区模块」、 `…-stack-11`「分类导航区模块」 |
| 表现 | 两模块之间视觉竖向间距为 0；机器版式同位置有约 `section` 级接缝留白 |

**机器夹具合法写法**（两个 email 级 stack 均写 pad）：

```json
{
  "t": "stack",
  "title": "专属推荐列表",
  "align": "center",
  "gap": "section",
  "box": { "pad": "section" },
  "children": [ "...标题 + 推荐列表..." ]
},
{
  "t": "stack",
  "title": "分类导航链接",
  "align": "center",
  "gap": "gap",
  "box": { "pad": "section" },
  "children": [ "...divider + 分类文案..." ]
}
```

**豆包落盘对照**：

| 节点 | 机器 `forever21-template46-1` | 豆包 `forever21-template46-1-2` |
|------|------------------------------|--------------------------------|
| 为你推荐（`ast-stack-7` / `stack-7`） | `wrapperStyle.padding` 含 `section`（含 bottom） | **无** `padding` |
| 分类导航（`ast-stack-12` / `stack-11`） | `wrapperStyle.padding` 含 `section`（含 top） | **无** `padding` |
| email 根 | `props.gap: "0"` | `props.gap: "0"`（一致） |

机器版相邻两模块各有 section padding，经 `collapseRootSiblingPaddingSeams` 折半后中间仍有可见竖向留白；豆包版两模块均无 padding → 接缝为 0。

### 根因分析

| 环节 | 说明 |
|------|------|
| **豆包输出（主因）** | email 级大模块 stack 未写 `box.pad`（如 `stack-3` 漏左右留白、`stack-7` / `stack-11` 漏模块间竖向节奏），语义 JSON 未表达版心/模块间距。 |
| **Prompt（诱因）** | `box.pad` 为可选且缺省=程序默认；未强调 email 下大模块须写 `box.pad`，且模块间竖向节奏来自各 stack padding 而非根 `gap` 或 `props.gap`。 |
| **组装器** | `buildEmail` 根 `gap` 为 `0`；`applyBoxWrapper` 仅在 AST 有 `box.pad` 时写入 padding。**行为符合契约**，非 bug。 |

相关代码：`buildEmail`（根 gap）、`buildStack` / `buildGrid` → `applyBoxWrapper`（`src/restore-ast-contract/resolveValue.ts`）、`collapseRootSiblingPaddingSeams`（`src/restore-ast-contract/astToTemplate.ts`）。

### 建议修复方向

1. **Prompt**：补充硬规则——email 下各大模块 stack 须写 `box.pad: "section"` 或 `"pageInline"`（通栏贴边大图/全宽色块除外）；模块间竖向节奏靠各 stack 的 pad，**不是**根 `gap` 或 `props.gap`。
2. **User text**：与 Prompt 对齐，点明「宫格/文案区留白与模块间距都写在**对应 stack 的 `box.pad`** 上，不要指望 grid 或 email 根自动带间距」。
3. **（可选，风险较高）归一化**：对 email 直接子 stack 启发式补 `pageInline`——易误伤通栏模块，需白名单或视觉信号，不建议先做。

### 状态

- [x] 已记录
- [ ] 已修 Prompt / User text
- [ ] 已重跑豆包版式验证

---

## 问题 3：分类导航误判为通栏 `button` → 颜色/形态与分隔线全错

### 基本信息

| 项 | 值 |
|---|---|
| 夹具 | `forever21-template46` |
| 豆包版式 | `豆包还原forever21-template46-1`（落盘 id：`forever21-template46-1-2`） |
| 机器对照版式 | `forever21-template46-1` |
| 对照依据 | 落盘 `template.json` vs 机器版式 + 夹具 `restore-ast.json` |
| 发现日期 | 2026-06-17 |

### 共性现象

设计稿中「SHOP WOMEN / SHOP MEN / …」**分类导航列表**应为：居中粗体文案 + 项间 **hairline 分隔线**（`divider`），**不是**通栏 CTA 色块按钮。

豆包将每项输出为 `t: "button"`（常带 `width: "fill"`）时，组装器按 CTA 规则落盘：

- `backgroundColor: colors.primary`（未写 `tone` 时默认 primary）
- `textColor: colors.surface`
- `borderRadius: tokens.radius.cta`
- `buttonStyle.border.width: "0"`（按钮本身**无描边**）

机器版「描边」来自 **`divider`**（`tone: secondary`，1px 横线），与 `button` 的 border 无关。类型选错后，颜色、圆角、分隔线会**整体偏离**，不是单独的 tone/描边映射 bug。

### 示例 A：分类导航区（豆包 `stack-11` vs 机器 `ast-stack-12`）

| 项 | 值 |
|---|---|
| 模板（豆包） | `data/emails/template-mqhos2xu/layouts/forever21-template46-1-2/template.json` |
| 区块 ID（豆包） | `template-mqhos2xu-forever21-template46-1-2-stack-11`「分类导航区模块」 |
| 模板（机器） | `data/emails/template-mqhos2xu/layouts/forever21-template46-1/template.json` |
| 区块 ID（机器） | `ast-stack-12`「分类导航链接模块」 |
| 表现 | 豆包：6 个通栏 primary 胶囊按钮、项间无分隔线；机器：粗体黑字 + secondary 分隔线交替 |

**机器夹具合法写法**（`text` + `divider` 交替，无 `button`）：

```json
{
  "t": "stack",
  "title": "分类导航链接",
  "align": "center",
  "gap": "gap",
  "box": { "pad": "section" },
  "children": [
    { "t": "divider", "tone": "secondary", "thickness": "hairline" },
    { "t": "text", "content": "SHOP WOMEN", "role": "body", "bold": true },
    { "t": "divider", "tone": "secondary", "thickness": "hairline" },
    { "t": "text", "content": "SHOP MEN", "role": "body", "bold": true }
  ]
}
```

**豆包落盘对照**（节选 `btn-8`「SHOP WOMEN」）：

| 维度 | 机器 `ast-stack-12` | 豆包 `stack-11` |
|------|---------------------|-----------------|
| 子节点类型 | `divider` + `text`（×N） | `button`（`btn-8`～`btn-13`，共 6 个） |
| 文案样式 | `text`：`color: "#1A1A1A"`、`bold: true` | `button`：`textColor: colors.surface` |
| 背景 | 无（透明白底） | `backgroundColor: colors.primary` |
| 项间「描边」 | `divider`：`colors.secondary`，`height: 1px` | **无**项间 divider |
| 宽度 | `text` / `divider` 为 fill 行宽 | `buttonStyle.widthMode: "fill"` |

### 根因分析

| 环节 | 说明 |
|------|------|
| **豆包输出（主因）** | 将分类链接列表误判为通栏 `button` CTA，AST 节点类型与结构（缺 `divider`）与设计意图不符。 |
| **Prompt（诱因）** | 强调通栏 CTA 写 `button` + `width: "fill"`，但未区分：**分类/页脚链接列表 = 粗体 `text` + `divider` 交替**；**仅真实 CTA 胶囊/色块才用 `button`**。 |
| **组装器** | `buildButton` 对 `button` 默认 primary 底 + surface 字 + cta 圆角；`buildDivider` 产出分隔线。**给定 AST 类型后落盘正确**，非颜色/描边映射错误。 |

相关代码：`buildButton`、`buildDivider`（`src/restore-ast-contract/buildNode.ts`）。

### 建议修复方向

1. **Prompt**：增加反例与正例——分类导航、页脚文字链接列表用 `divider` + 粗体 `text`，禁止用 `fill` 通栏 `button` 凑链接感。
2. **User text**：点明「项间横线 = `divider`（`thickness: hairline`），不是 button border」。
3. **（可选）校验/审计**：对 stack 内连续多个 `width: fill` 的 `button` 且无 CTA 语义（如「Shop now」「Redeem」）打 warning，供第 5 步修复或人工复核。

### 状态

- [x] 已记录
- [ ] 已修 Prompt / User text
- [ ] 已重跑豆包版式验证

---

## 问题 4：应用商店下载徽章无法还原（机器 / 豆包均不对）

### 基本信息

| 项 | 值 |
|---|---|
| 夹具 | `forever21-template46` |
| 豆包版式 | `豆包还原forever21-template46-1`（落盘 id：`forever21-template46-1-2`） |
| 机器对照版式 | `forever21-template46-1` |
| 对照依据 | 落盘 `template.json`、夹具 `restore-ast.json`、素材解析链路 |
| 发现日期 | 2026-06-17 |

### 共性现象

设计稿页脚「应用下载横幅」内应为 **Apple App Store / Google Play 官方下载徽章**（固定品牌图形 + 固定宽高比），并排于 `row` 中。

当前**机器还原与豆包还原均无法像素级还原**：

| 版本 | 区块 | AST / 落盘 | 结果 |
|------|------|------------|------|
| 机器 | `ast-row-7`「应用商店按钮」 | 夹具写 `button`（文字 label）→ primary CTA 胶囊 | 只有文案按钮，**无 badge 图形** |
| 豆包 | `row-6`「APP下载按钮」 | `image` + Pexels 搜图 | 结构更接近，但 URL 为**无关摄影图**（如 `5444435`），非 badge |

机器夹具当前写法（**不足以还原 badge**）：

```json
{
  "t": "row",
  "title": "应用商店按钮",
  "align": "center",
  "gap": "gap",
  "children": [
    { "t": "button", "label": "Download on the App Store", "href": "#" },
    { "t": "button", "label": "Get it on Google Play", "href": "#" }
  ]
}
```

豆包落盘（节选）：`row` 内两个 `image`，fixed 约 72×30，素材来自 Pexels——**类型方向对，解析链路错**。

### 根因分析

| 环节 | 说明 |
|------|------|
| **机器夹具 JSON（主因之一）** | 用 `button` 近似 badge；`button` 只能落盘通用 CTA，**不可能**产出官方 badge 图形。 |
| **豆包 JSON（主因之一）** | 选用 `image` 合理，但 `query` 仍按**摄影搜图**语义输出，未表达「标准 badge 素材身份」。 |
| **素材解析链路（关键缺口）** | RestoreAst 第 3 步：`image` 一律走 **Pexels**（`resolveAstAssetRequests`）；`icon` 走 jsDelivr SVG。**无** App Store / Google Play badge 固定 URL 映射。 |
| **Prompt（诱因）** | 区分了摄影 `image` 与 Logo `icon`，**未说明** badge 类素材：禁止 `button`、禁止 Pexels 搜 badge。 |
| **AST block 类型** | **不必**新增 `appStoreBadge` 基元；现有 `content.image`（row 内 `height` + `aspect` → fixed 宽）已够用。缺的是**素材身份 + 解析器**，不是 template block 类型。 |
| **组装器** | 对 `button` / `image` 的落盘符合 AST；**非组装器 bug**。 |

相关代码：`buildButton` / `buildImage`（`src/restore-ast-contract/buildNode.ts`）、`resolveAstAssetRequests`（`src/restore-ast-contract/backfillAssets.ts`）。

---

### 讨论结论：建议解决方案（布局与素材身份分离）

**原则（与人工讨论一致）**：

1. **布局不应绑在 badge 类型或 prompt 硬编码尺寸里**——`row` 并排、`gap`、`align`，以及每张 badge 的 `height` / `aspect`，应由豆包**按设计图量出**，走现有 AST 布局字段与组装器（row 内 `deriveRowInlineImageBox` 算宽）。
2. **仅 URL 走固定映射**——通过**素材标识**告知解析器「这是 App Store badge / Google Play badge」，命中后返回仓库约定的固定 CDN URL，**不走 Pexels**。
3. **不必新增 block 类型**——继续用 `t: "image"`；身份与摄影图共用基元，在解析层分支。

**职责拆分**：

| 维度 | 谁决定 | AST / 程序表达 |
|------|--------|----------------|
| 结构（row 并排、间距） | 设计图 | `row` + `gap` / `align` |
| 尺寸（高、宽高比） | 设计图 | `image.height`、`image.aspect`（**从图量，非规范写死**） |
| 素材身份 | 语义 | 标识 token（见下） |
| URL | 程序 | 标识 → 固定 CDN |

**推荐 AST 形态示例**（尺寸为示意，实际以设计图为准）：

```json
{
  "t": "row",
  "title": "应用商店按钮",
  "align": "center",
  "gap": "gap",
  "children": [
    {
      "t": "image",
      "query": "app-store-badge",
      "height": { "px": 40 },
      "aspect": { "w": 3, "h": 1 },
      "required": true
    },
    {
      "t": "image",
      "query": "google-play-badge",
      "height": { "px": 40 },
      "aspect": { "w": 3, "h": 1 },
      "required": true
    }
  ]
}
```

> `icon`（simple-icons 的 `apple` / `googleplay`）只是品牌标，**不是**「Download on the App Store」整枚 badge，不宜替代。

**标识放哪（实现选型，待落地时择一）**：

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| **A. `query` 别名（改动最小）** | 约定 `app-store-badge` / `google-play-badge`；解析器命中别名 → 固定 URL，否则 Pexels | 复用现有 manifest key（`image::${query}`） | `query` 语义略混（搜图词 vs asset id） |
| **B. 新字段 `assetRef`** | 摄影保留自然语言 `query`；badge 写 `"assetRef": "app-store-badge"` | 语义最清晰 | 需扩 AST schema + 收集 `AssetRequest` |
| **C. 解析器 `kind: store-badge`** | 请求层区分 `pexels-photo` / `store-badge` | 解析层最干净 | 与 B 类似，需改契约与管线 |

**建议落地顺序**（记录为待办，尚未实现）：

1. 修 **`forever21` 夹具**：`button` → row 内 `image` + badge 标识；`height` / `aspect` 按夹具设计图量，不写死全局 magic number。
2. **扩素材解析**：在 `assetResolve` / `resolveAstAssetRequests` 对 badge 标识走固定 URL 表（可访问、锁版本）；与 Pexels 分支并列。
3. **补 Prompt / User text**：CTA 用 `button`；分类链接用 `text`+`divider`；**App Store / Google Play 徽章 = row 内 `image` + badge 标识，尺寸从图量，禁止 button、禁止 Pexels 搜 badge**。
4. **（可选）fixtures 预置**：机器冒烟可在 `assets-resolved.json` 写死 badge URL，不依赖搜图。

### 状态

- [x] 已记录（含方案讨论）
- [ ] 已修夹具 / 解析器 / Prompt
- [ ] 已重跑机器 + 豆包版式验证

---

## 问题 5：row 商品缩略图尺寸错误（嵌套 stack + `height` 偏差）

### 基本信息

| 项 | 值 |
|---|---|
| 夹具 | `huckberry-template48` |
| 豆包版式 | `豆包还原huckberry-template48-1`（落盘 id：`huckberry-template48-1-2`） |
| 机器对照版式 | `huckberry-template48-1` |
| 对照依据 | 落盘 `template.json` vs 机器版式 + 夹具 `restore-ast.json`（本地无 huckberry run 日志归档） |
| 发现日期 | 2026-06-17 |

### 共性现象

**左图右文 / 订单行商品缩略图**在 RestoreAst 中应为：`row` 的**直接子节点** `image`（写 `height` + `aspect`）+ 并列 `stack`（文案）+ 其它 `text` 列。

组装器对 **row 直接子图** 走 `deriveRowInlineImageBox` → `widthMode: fixed`、宽 = 高 × aspect（下限 72px）；对 **嵌套在 stack 内的图** 不走该路径 → `widthMode: fill`、仅按 `height.px` 定高。

豆包若把缩略图与商品名包进同一 `stack`，或 `height` / `aspect` 与设计不符，落盘尺寸会与机器版明显不一致——**不一定是组装器算错，而是 AST 结构/数值触发不同分支**。

### 示例 A：鬼冢虎运动鞋商品行（豆包 `row-3` vs 机器 `ast-row-5`）

| 项 | 值 |
|---|---|
| 模板（豆包） | `data/emails/template-mqhos2xu/layouts/huckberry-template48-1-2/template.json` |
| 区块 ID（豆包） | `template-mqhos2xu-huckberry-template48-1-2-row-3`「鬼冢虎运动鞋商品行」 |
| 模板（机器） | `data/emails/template-mqhos2xu/layouts/huckberry-template48-1/template.json` |
| 区块 ID（机器） | `ast-row-5`「退货商品行」 |
| 表现 | 豆包商品图偏矮、横向撑满；机器为 72×72 方形缩略图 |

**机器夹具合法写法**（`image` 为 row 直接 child）：

```json
{
  "t": "row",
  "title": "退货商品行",
  "align": "start",
  "gap": "gap",
  "children": [
    {
      "t": "image",
      "query": "onitsuka tiger california 78 yellow white sneaker product",
      "height": { "px": 72 },
      "aspect": { "w": 1, "h": 1 }
    },
    {
      "t": "stack",
      "title": "商品信息",
      "gap": "gap",
      "align": "start",
      "children": [
        { "t": "text", "content": "Onitsuka Tiger: California 78", "role": "body" }
      ]
    },
    { "t": "text", "content": "1", "role": "body" },
    { "t": "text", "content": "$95.40", "role": "body" }
  ]
}
```

**豆包落盘对照**：

| 维度 | 机器 `ast-row-5` | 豆包 `row-3` |
|------|------------------|--------------|
| row 子结构 | `image` → `stack`（仅文案）→ `text` × 2 | `stack`（**图+标题同包**）→ `text` × 2 |
| 图片 parent | row **直接子节点** | 在 `stack-7`「商品信息块」**内部** |
| 宽 | `fixed` **72px** | **`fill`** |
| 高 | **72px** | **60px** |

机器版：`deriveRowInlineImageBox(72, 1:1)` → 72×72 fixed。  
豆包版：`inHorizontalRow=false` → fill 宽 + 高 60px（JSON 中的 `height`，且未受益于 row 内联 aspect）。

### 根因分析

| 环节 | 说明 |
|------|------|
| **豆包 JSON（主因）** | ① 缩略图未作为 row 直接 child（与标题包进 `stack`）；② `height` 量成 60 而非 72；③ 可能未写 `aspect`（嵌套时即使写了也不走 row 内联尺寸）。 |
| **Prompt（诱因）** | 已要求 row 内图写 `height` + `aspect`，但**未强调**左图右文商品行：`image` 必须是 row **直接**子节点，文案放并列 `stack`，勿把图与标题包进同一 stack。 |
| **组装器** | `buildImage` 依 `parent.inHorizontalRow` 分支；`deriveRowInlineImageBox`（`src/restore-ast-contract/rowInlineImageBox.ts`）行为符合契约，**非 bug**。 |
| **机器夹具** | 结构与尺寸正确，可作为对照真源。 |

相关代码：`buildImage`（`src/restore-ast-contract/buildNode.ts`）、`deriveRowInlineImageBox`（`src/restore-ast-contract/rowInlineImageBox.ts`）。

### 建议修复方向

1. **Prompt / User text**：左图右文订单行/商品行——`row.children` 顺序：`image`（直接 child，`height`+`aspect`）→ `stack`（仅文案列）→ 数量/价格等 `text`；**禁止**把 `image` 与标题包进同一 `stack`。
2. **示例**：在 prompt 或 docs 补一条 huckberry 式 mini 缩略图（如 72px + 1:1）与编辑类大肖像（更高 `height` + 3:4）的对比示例。
3. **（可选）校验**：AST 审计——`row` 下若存在「含 `image` 子节点的 `stack`」且同 row 另有 `text` 列，提示可能结构错误。

### 状态

- [x] 已记录
- [ ] 已修 Prompt / User text
- [ ] 已重跑豆包版式验证

---

## 问题 6：九宫格推荐商品图高度参差不齐

### 基本信息

| 项 | 值 |
|---|---|
| 夹具 | `huckberry-template48` |
| 豆包版式 | `豆包还原huckberry-template48-1`（落盘 id：`huckberry-template48-1-2`） |
| 机器对照版式 | `huckberry-template48-1` |
| 对照依据 | 落盘 `template.json` vs 机器版式 + 夹具 `restore-ast.json` |
| 发现日期 | 2026-06-17 |

### 共性现象

设计稿中 **3×3 推荐商品宫格**内，各格商品摄影图通常**等高**（统一缩略图盒）；RestoreAst 中每格为 `grid` → `stack` → `image`，图高由 AST 的 **`image.height.px`** 决定。

- **grid 内 `image` 不是 row 直接子节点** → 组装器走 `fill` 宽 + **原样使用** `height.px`，**不会**自动把同 grid 的 9 张图拉成同一高度。
- 豆包若对每格**分别量高**并写出不同 `height.px`（如 80 / 100 / 160 / 180 混用），落盘即高低不齐。
- 机器夹具对 9 格统一写 `{ "px": 160 }` → 预览整齐。

### 示例 A：推荐商品区（豆包 `stack-10` vs 机器 `ast-grid-1`）

| 项 | 值 |
|---|---|
| 模板（豆包） | `data/emails/template-mqhos2xu/layouts/huckberry-template48-1-2/template.json` |
| 区块 ID（豆包） | `…-stack-10`「推荐商品区模块」（内含 `grid-1`～`grid-3` 三个三列 grid） |
| 模板（机器） | `data/emails/template-mqhos2xu/layouts/huckberry-template48-1/template.json` |
| 区块 ID（机器） | `ast-grid-1`「三列推荐宫格」（单个 grid × 9 格） |
| 表现 | 豆包 9 张商品图高度 80～180px 不等；机器 9 张均为 160px |

**机器夹具合法写法**（9 格统一 `height`）：

```json
{
  "t": "grid",
  "title": "三列推荐宫格",
  "columns": 3,
  "gap": "gap",
  "children": [
    {
      "t": "stack",
      "title": "推荐商品卡",
      "align": "center",
      "gap": "gap",
      "children": [
        {
          "t": "image",
          "query": "tan utility field jacket mens outdoor product",
          "height": { "px": 160 }
        },
        { "t": "text", "content": "Our Most Requested Jacket", "role": "body", "bold": true }
      ]
    }
  ]
}
```

> 夹具中 9 个 `stack` 单元的 `image.height` 均为 `{ "px": 160 }`。

**豆包落盘对照**（`stack-10` 内 9 张商品图 `wrapperStyle.height` 统计）：

| 维度 | 机器 `ast-grid-1` | 豆包 `stack-10` |
|------|-------------------|-----------------|
| grid 结构 | 1 个 grid × 9 children | 3 个 grid（分三行）× 每行 3 格 |
| 9 图高度 | 均为 **160px** | **80 / 100 / 160 / 180** 等混用（9 个值不一致） |
| 宽 | `fill`（grid 内通栏格宽） | `fill`（一致） |

结构拆成 3 个 grid 是次要差异；**图高不齐的直接原因**是各格 AST `height.px` 不统一。

### 根因分析

| 环节 | 说明 |
|------|------|
| **豆包 JSON（主因）** | 9 张商品图分别输出不同 `height.px`（逐格量高、未取统一档）。 |
| **Prompt（诱因）** | 要求 grid/通栏 `image` 写 `height`，但**未强调**同一推荐宫格内所有商品卡应使用**相同** `height.px`。 |
| **机器夹具** | 9×160，可作为对照真源。 |
| **组装器** | grid 内 `image` 按 JSON 逐图落盘高度，不做了 grid 内统一；**符合契约**，非 bug。 |

相关代码：`buildImage`（`src/restore-ast-contract/buildNode.ts`）；grid 内不走 `deriveRowInlineImageBox`。

### 建议修复方向

1. **Prompt / User text**：同一 `grid` 内推荐/商品宫格——所有 `image.height.px` **全格统一**（按设计图取一个代表值，如 160px）；禁止逐格随意写不同高度。
2. **示例**：在 prompt 补「3×3 等高商品卡」正例（9 格相同 `height`）与「逐格不同 height」反例。
3. **（可选）归一化/校验**：对同一 `grid` 下所有商品卡 `image.height.px` 取众数或 max 统一，或审计告警高度离散度过大。

### 状态

- [x] 已记录
- [ ] 已修 Prompt / User text
- [ ] 已重跑豆包版式验证

---

## 追加说明

- 新问题请在本文件末尾按「问题 N」递增追加，并更新文首**问题索引**表。
- 若属**同一根因、不同区块**，在对应问题下用「示例 A / B / …」追加，勿拆成多条。
- 每条尽量附上：夹具、版式 id、日志 runId、`02-restore-ast.json` 片段、落盘 `template.json` 路径、与机器版式对照。
