# AI 以图还原邮件版式 —— 第 1 步：DSL builders + `astToTemplate` 组装器（设计稿）

> 配套第 0 步词汇表：[AI以图还原-AST契约-第0步词汇表.md](AI以图还原-AST契约-第0步词汇表.md)。
> 本文是**设计稿**（签名 + 职责 + 派生规则），不含实现。目标：把 AST 接到合规 `template.json`。
> 机器真源待落地于 `src/restore-ast-contract/`（builders）与组装入口；block 形态真源见 `src/block-contract/`。

---

## 0. 它做什么

```
RestoreAstDocument { theme, tree }     ← AI 输出（JSON 数据）
        │  astToTemplate(doc)          ← 纯 TS，进程内，无 mjs / 无 node 子进程
        ├─ tree  → builders → block 树 → template.json (nested 4.0.0)
        └─ theme ─────────────────────→ tokenPresets.json
```

- **builders = DSL 原语**：一组纯函数，把一个 AST 节点变成一段合规 block JSON；**结构在这里被管死**。
- **`astToTemplate` = 解释器**：遍历 AST、逐节点派发给 builder、做跨节点派生、拼成模板。
- AI 不写代码，只吐 AST 数据；DSL 是程序内部消费 AST 的积木，AI 看不见。

---

## 1. 顶层签名

```ts
function astToTemplate(
  doc: RestoreAstDocument,
  opts: { emailId: string; templateId: string; locale: string; idPrefix: string }
): { template: EmailTemplate; tokenPresets: TokenPresets };
```

- 输入：第 0 步的 `{ theme, tree }` + 运行参数（id/locale/前缀，程序已知）。
- 输出：`template.json`（nested 4.0.0：`schemaVersion` + `root`）与 `tokenPresets.json`。
- **纯函数、可单测**；同一输入永远同一输出。

---

## 2. 三遍流水（pass）

结构派生需要父子关系就位，故分遍而非单遍：

| Pass | 名称 | 做什么 |
|---|---|---|
| 1 | **build** | 递归把 AST 节点变草稿 block：分配 id、写 blockMeta（**`name` 由 `deriveBlockDisplayName` 从 `title`/叶子语义派生**）、props/content、box（除 fill/hug）；**值解析**（档位→`$themeRef`+登记 binding，原始→字面量）；由标量构造 border/padding/borderRadius 对象；补 contentAlign 两轴 |
| 2 | **派生 fill/hug** | 自顶向下遍历已建树，按父子关系定每个节点的 `widthMode`/`heightMode`，父 hug→子同轴回退 hug，推到不动点（复用 `wrapperFillConstraint`） |
| 3 | **emit** | 包成 nested 4.0.0（`schemaVersion`/`root`/`locale`/ids）；`theme` → `tokenPresets.json` |

---

## 3. `BuildCtx`（贯穿 pass 1 的上下文）

```ts
type BuildCtx = {
  nextId(tag: string): string;        // 计数器生成静态 id，如 `${idPrefix}-s3-2`
  theme: RestoreTheme;                // 解析档位时取值兜底用
  assets: AssetSlotCollector;         // 收集 image/icon 的 query，留待第 3 步回填 src
  // bindings 由各 block 自带的 bindings map 承载，无需全局收集器
};
```

---

## 4. Builder 清单

每个 builder：`build<X>(node, ctx, parentCtx?) → EmailBlock`。下表给**映射 / 写哪些字段 / 派生与管死 / 可能的绑定**。

| AST `t` | runtime / blockType | props（本体） | box（wrapperStyle） | 派生 & 管死 | 可绑定字段 |
|---|---|---|---|---|---|
| `email` | `emailRoot` / `email.root` | **盒子在 props**：`backgroundColor`/`padding`/`border`/`width`/`gapMode`/`gap` | 仅 `widthMode`/`heightMode` | id、blockMeta、padding 默认 0、width 默认 600px；**禁** visibility/repeat | `props.backgroundColor`→`colors.*` |
| `stack` | `layout` / `layout.container` | `direction:'vertical'`、`gapMode`、`gap` | contentAlign/bg/padding/border/borderRadius | blockMeta（**name 由 `title` 派生**）；contentAlign 两轴必填；borderRadius 缺省补 0；border 缺省 `borderNone()` | `gap`、`backgroundColor`、`padding`、`borderRadius` |
| `row` | `layout` / `layout.container` | `direction:'horizontal'`、`gapMode`、`gap` | 同上；`align`→`contentAlign.horizontal`；**`crossAlign`→`contentAlign.vertical`**（省略=start/贴顶）；**`align:between`→`gapMode:'auto'`**（space-between，子块须 hug） | 同 stack | 同 stack |
| `grid` | `grid` / `layout.grid` | `columns`、`gap`、`cellWidthMode`/`cellWidth`、`cellHeightMode`/`cellHeight` | contentAlign/padding | **AST child 直接落为 grid 子块**（无额外 layout 壳）；columns 夹 1..6 | `gap`、`padding` |
| `text` | `text` / `content.text` | `textBody.paragraphs`（**正文唯一真源**，非 `props.content`）、`fontSize`/`color`/`bold`/`italic` | contentAlign（**`align` 优先**，否则继承父 stack horizontal） | blockMeta；role→fontSize、tone→color | `fontSize`→`tokens.typography.*`、`color`→`colors.*` |
| `image` | `image` / `content.image` | 资源在 `wrapperStyle.backgroundImage.src`（**占位，待第 3 步回填**）；叠字用 `direction`/`gap` | **通栏/非 row**：`widthMode:'fill'`、`heightMode:'fixed'`、`height`；**横排 row 内** + 有 `aspect` → `fixed` 宽（`widthPx = heightPx × w/h`，下限 72px）+ 右侧兄弟 `fill`；row 内无 `aspect` → 兜底 3:4 再算；**有 overlay children** → `contentAlign` 由 `align` + `crossAlign` 经 `mapImageOverlayAlign`（双轴缺省 center/center） | **`height`(px) 必填语义**；**row 内可选 `aspect:{w,h}`**；**叠放可选 `align` + `crossAlign`**（九宫格双轴）；**禁止 AI 写宽 px**；query 入 `ctx.assets`；overlay children | `backgroundImage.src` 为 content（非主题） |
| `icon` | `icon` / `content.icon` | `src`（占位待回填）、`color`、`size`、`link` | contentAlign | query 入 `ctx.assets`；tone→color、size 档→px | `color`→`colors.*`、`size`→可绑 |
| `button` | `button` / `action.button` | `text`、`link`、`buttonStyle.{backgroundColor,textColor,fontSize,border,borderRadius,widthMode,heightMode,height,...}` | contentAlign；外层 **`widthMode:'fill'`**/`heightMode:'hug'` | **无 variant**：默认 pill；`width`→`buttonStyle.widthMode`（缺省 hug）；`height`→`buttonStyle.heightMode`（缺省 hug；`relaxed`→`fixed`+48px）；`tone`/`radius` 覆盖；**禁 buttonStyle.padding** | `buttonStyle.backgroundColor`→`colors.primary`(CTA)、`buttonStyle.borderRadius`→`radius.cta` |
| `divider` | `divider` / `separator.divider` | `color`、`lineWidthMode`、`lineWidth`、`height` | 占位/留白 | tone→color | `color`→`colors.*` |
| `progress` | `progress` / `indicator.progress` | `value`、`max`、`trackColor`、`fillColor`、`barWidth*`/`barHeight`/`barBorderRadius` | contentAlign | value 夹 0..100；max 默认 100 | `fillColor`/`trackColor`→`colors.*`、`barBorderRadius`→`radius.*` |

**组件默认绑定**（AI 不写也自动绑，见第 0 步文档）：按钮背景→`colors.primary`、按钮圆角→`radius.cta`、Logo/价格/徽章→`colors.accent`、容器圆角→`radius.panel`。

### 4.1 builder 具体默认取值（按常规已定，附来源）

**① 按钮（无 variant，默认 pill CTA）**——`props.text`=label、`props.link`=`{href, type:'external'}`；`buttonStyle`：

| buttonStyle 字段 | 默认 | emit |
|---|---|---|
| `backgroundColor` | CTA 色 | 绑 `colors.primary`（`tone` 可覆盖） |
| `textColor` | 反白 | 绑 `colors.surface` |
| `fontSize` | 正文档 | 绑 `tokens.typography.body` |
| `borderRadius` | CTA 圆角 | 绑 `radius.cta`（`radius` 可覆盖） |
| `border` | 无 | `borderNone()` 字面量 |
| `bold` / `italic` | `false` | 字面量 |
| `widthMode` | `hug` | 字面量；`width:fill` → `fill` |
| `heightMode` | `hug` | 字面量；`height:relaxed` → `fixed` + `48px` |

外层 `wrapperStyle`：`widthMode:'fill'`、`heightMode:'hug'`、`contentAlign` 的 horizontal **继承直接父 stack 的 `align`**（缺省 center）、vertical 恒 `center`；`buttonStyle.widthMode` / `buttonStyle.heightMode` 由 AST `width` / `height` 控制。

**② `icon.size` 档 → px**：`sm`=`16px`、`md`=`24px`、`lg`=`32px`（`md` 源自 `iconBlock` 默认 24px）。

**③ 容器可选字段缺省**：

| 字段 | 缺省 | 说明 |
|---|---|---|
| `gap`（stack/row/grid 未写时） | 绑 `tokens.spacing.gap` | 与 `gap` 档同名，最自然 |
| `box.border`（未写时） | 无描边（`borderNone()`） | 仅 stack/row/grid 可选语义档；见词汇表 §2 容器描边 |
| `contentAlign`（stack/row/grid 等） | `{horizontal:'center', vertical:'top'}` | 源 `sectionShell`；`align` 覆盖对应轴 |
| `contentAlign`（**image 有 overlay children**） | `{horizontal:'center', vertical:'center'}` | `mapImageOverlayAlign(align, crossAlign)`；双轴缺省 center；例 start+center→左中 |
| **Pass 2.5** root 首层壳 seam | 相邻 module padding 叠加 | `collapseRootSiblingPaddingSeams`：同色 + 接缝 padding 一致 → 上块 bottom / 下块 top 各折半；**未写 backgroundColor 视为 `colors.surface`** |
| grid cell 内部 gap | 绑 `tokens.spacing.gap` | 与上一致 |

**④ 资产占位**：未回填的 `wrapperStyle.backgroundImage.src` 用 `#` 占位（`validate` 要求非空）；icon `props.src` 可 `""`。组装器在 `ctx.assets` 记 `id → query`，第 3 步按 id 回填。

### 4.2 `blockMeta.name` 展示名（`deriveBlockDisplayName`）

`blockMeta.blockType` 仍由 `inferBlockMetaFromBlock`；**`blockMeta.name` 给人看**，由组装器统一格式化，**AI 不写最终字符串**。

| AST 节点 | `blockMeta.name` 规则 |
|---|---|
| `email` | `邮件根` |
| `stack`（`email` 直接子节点） | 有 `title` → `{title}模块`；无 → **`垂直布局模块`** |
| `stack`（嵌套） | 有 `title` → `{title}`；无 → **`垂直布局`** |
| `row` | 有 `title` → `{title}`；无 → **`横向布局`** |
| `grid` | 有 `title` → `{title}`；无 → **`栅格`** |
| grid 子块 | 与 AST `grid.children[i]` **一一对应**（stack / row / 叶子等），不再插入「单元格」壳 |
| `text` | `content` 截断（≤28 字） |
| `button` | `label` 截断 |
| `image` | `query` 缩短 |
| `icon` | `query` 缩短（去 `brand-` 前缀） |
| `divider` | `分隔线` |
| `progress` | `进度条` |

- `title` 原样使用，**不**由组装器再拼「模块」二字到嵌套容器（仅 `email` 直接子 `stack` 加 `模块` 后缀）。
- **叶子节点**只看自身 `content` / `label` / `query`，**不**根据父级 `title` 文案做关键词匹配。
- 容器 `title` 写入 `blockMeta.name`，供编辑器区块树展示；跨设计图规则固定，变的只是 AI 填入的 `title`/文案。

---

## 5. 值解析：档位 → 绑定，原始 → 字面量（最承重的一段）

每个会绑主题的字段经一个 `resolve*`，决定 emit 成绑定还是字面量。**绑定是「双写」**：字段值写占位，block 的 `bindings` map 同步登记一条。

### 真实形态（取自 `coupon-available`）

字段值占位：
```jsonc
"backgroundColor": { "$themeRef": "colors.surface" }          // colors 无前缀
"gap":             { "$themeRef": "tokens.spacing.gap" }      // 其余带 tokens. 前缀
```
同 block 的 `bindings`（键 = 字段在 block 内的路径）：
```jsonc
"bindings": {
  "props.backgroundColor": { "slotId": "colors.surface", "mode": "theme", "tokenPath": "colors.surface", "fieldKind": "style" }
}
```

### resolve 规则

| AST 值 | emit 字段值 | 同时登记 binding |
|---|---|---|
| 档位 `tone:"primary"` | `{ "$themeRef": "colors.primary" }` | `bindings[fieldPath] = {slotId, mode:"theme", tokenPath:"colors.primary", fieldKind:"style"}` |
| 档位 `role:"h1"` | `{ "$themeRef": "tokens.typography.h1" }` | 同上，tokenPath=`tokens.typography.h1` |
| 档位 `gap/pad:"section"` | `{ "$themeRef": "tokens.spacing.section" }` | 同上 |
| 档位 `radius:"cta"` | `{ "$themeRef": "tokens.radius.cta" }` | 同上 |
| 原始 `{px:18}` | `"18px"`（字面量） | **不登记**（固定不动） |
| 原始 `{hex:"#E0322D"}` | `"#E0322D"`（字面量） | **不登记** |

- 路径前缀规则（colors 无前缀 / 其余 `tokens.`）**复用 `themeRefPathForStorage(family, scale)`**，不自己拼。
- `fieldPath` = 该字段在 block 内的点路径，如 `props.backgroundColor` / `wrapperStyle.padding.top` / `props.buttonStyle.borderRadius`。
- ⚠️ **不得把档位值字面量化**——否则切换失效（这与旧 mjs 还原管道相反）。

---

## 6. `theme` → `tokenPresets.json`

`theme` 就是 13 个标准键值，按 `tokenPresets` schema emit：`schemaVersion` + `activePresetId` + `presets.<id>.tokens.{colors,spacing,typography,radius}` + `scopeSelections`。标准键/形态真源 `src/token-preset-contract/`，emit 直接套用，**不另维护键表**。

---

## 7. 复用的现成能力（禁止双写）

| 能力 | 复用 |
|---|---|
| 节点类型 → blockMeta/runtimeType 映射 | `src/block-contract/`（`RUNTIME_TYPE_TO_SEMANTIC` / `normalizeRuntimeTypeAlias`） |
| fill/hug 级联回退 | `src/lib/...wrapperFillConstraint`（FALLBACK_MODE） |
| 主题路径拼写 | `token-preset-contract` 的 `themeRefPathForStorage` / `STANDARD_THEME_REF_PATHS` |
| 出口校验 | `validateTemplateFromDisk` / `validateTemplate` |
| tokenPresets 标准键 | `token-preset-contract`（13 标准键） |

---

## 8. 出口绊线 + 非目标 + 待决

- **绊线**：emit 后跑 `validateTemplate`。**按构造应永过**；报错 = builder/派生的 bug → **改库不修产物**。
- **非目标**（属后续步）：资产检索回填 src（第 3 步，复用候选回退 `verifyUrlReachable`）；AI prompt（第 4 步）；按节点定点修复（第 5 步）；保真度视觉 diff（第 6 步）。
- **默认值已定（均有项目来源，非发明）**：
  1. **正文默认墨色 = `#1A1A1A`** —— 源自 `mjsMotherSnippets` `textBlock` 默认 `color`。不占 token 槽、不随主题切换。
  2. **图片尺寸** —— 通栏/非 row：`height`(px) + `widthMode:fill`（对齐 `coverImage`/`imageContainer`，`heightMode:'fixed'`、`fit:'cover'`）。**横排 row 内**：读 AST `aspect:{w,h}`（缺省 3:4）→ `widthPx = heightPx × (w/h)`（下限 72px）→ `widthMode:fixed`；**宽不由 AI 写 px**。
  3. **grid 子块** = AST `children` 逐项 `buildNode`，直接挂到 `layout.grid`（与 stack/row 同级通用递归，无 cell 包装）。
  4. **button 无 variant 体系** —— 默认即项目 pill 按钮（`buttonBlock` 形状）：背景绑 `colors.primary`(CTA)、圆角绑 `radius.cta`；`tone`/`radius` 可覆盖。
- 注意：以上复用 helper 的**形状/结构默认**，但**颜色角色按新 4 色语义重定**（如按钮 bg 用 `primary`/CTA，而非旧 helper 的 `secondary`）。
