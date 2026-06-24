# AI 以图还原邮件版式 —— AST 契约（第 0 步：词汇表冻结）

> 本文是「AI 以图还原」新架构的**第 0 步交付物**：冻结 AI 的输出词汇表。
> 机器真源：[`src/restore-ast-contract/`](../src/restore-ast-contract/)（types/tokens/index + 防漂移测试）。
> 后续第 1~6 步（组装器、出口校验、资产回填、prompt、修复、保真度检测）尚未实现，本文末列出。

---

## 0. 一句话

AI **不直接写最终 template JSON**，而是输出一个又短又只含语义的对象：

```
RestoreAstDocument = { theme, tree }
```

- `theme` = 你的 **13 个标准 token 值**（4 色 + 3 间距 + 4 字号 + 2 圆角），从设计图读出 → emit 成 `tokenPresets.json`，并作为**主题切换的绑定目标**：tree 里用档位的值会绑到它，切一套新 theme 即整封跟随变化（见第 2 节「绑定语义」）。
- `tree` = 一棵**语义 AST**（9 基元嵌套）→ 由组装器变成 `template.json`。

两块里**零结构字段**——`blockMeta`（含编辑器展示用 `name` 的**最终格式**）/ `type` / `id` / `widthMode` / `heightMode` / `contentAlign` 对象 / `border`·`padding`·`borderRadius` 对象形态 / `schemaVersion` / `tokenPresets` 形态，全部由组装器确定性派生，**AI 没有输入入口**。

容器上的可选 **`title`** 是**业务语义**（「这块叫什么」），不是 template 结构字段；AI 可写，组装器据此拼 `blockMeta.name`（见 §2「`title`」与第 1 步命名规则）。

> 设计哲学（前序讨论结论）：**管死结构，放开值。** 记忆中反复烧轮次的失败（hug/fill 冲突、缺 blockMeta、非法 type、id 拼接、对象形态错）**全是结构错，没有一个是「叶子值精度错」**。所以结构由程序独占，叶子值给 AI 全自由（含像素级逃生口），安全与保真度同时拿到。

---

## 1. AI 的完整输出形态

```jsonc
{
  "theme": {
    "colors":     { "primary": "#111111", "accent": "#C8102E", "secondary": "#8A8A8A", "surface": "#FFFFFF" },
    "spacing":    { "section": "22px", "gap": "13px", "pageInline": "22px" },
    "typography": { "display": "28px", "h1": "26px", "body": "14px", "caption": "12px" },
    "radius":     { "panel": "8px", "cta": "24px" }
  },
  "tree": {
    "t": "email",
    "children": [
      { "t": "row", "align": "between", "children": [
        { "t": "text", "content": "Free shipping over $50", "role": "caption", "tone": "secondary" },
        { "t": "text", "content": "View in browser",        "role": "caption", "tone": "secondary" }
      ]},
      { "t": "stack", "title": "首屏英雄区", "box": { "pad": "section" }, "gap": "gap", "children": [
        { "t": "icon",  "query": "nike", "pack": "simple-icons", "tone": "accent", "required": true },
        { "t": "text",  "content": "NEW COLLECTION", "role": "display" },
        { "t": "image", "query": "modern living room, warm light", "height": { "px": 320 }, "required": true },
        { "t": "button","label": "Shop the look", "href": "#" }
      ]},
      { "t": "grid", "title": "双列商品", "columns": 2, "gap": "gap", "children": [
        { "t": "stack", "title": "商品卡", "children": [
          { "t": "image", "query": "white paint can", "height": { "px": 200 } },
          { "t": "text",  "content": "PAINTING ESSENTIALS", "role": "body" },
          { "t": "text",  "content": "$29.99", "role": "h1", "tone": "accent" }
        ]},
        { "t": "stack", "title": "商品卡", "children": [ /* 第二格，结构同上 */ ] }
      ]},
      { "t": "stack", "title": "推荐商品列表", "gap": "gap", "children": [
        { "t": "row", "title": "推荐商品行", "gap": "gap", "align": "start", "crossAlign": "center", "children": [
          { "t": "image", "query": "tan fleece cargo joggers product", "height": { "px": 200 }, "aspect": { "w": 3, "h": 4 } },
          { "t": "stack", "title": "商品信息", "gap": "gap", "align": "center", "children": [
            { "t": "text", "content": "FLEECE CARGO JOGGERS", "role": "body", "bold": true },
            { "t": "text", "content": "$39.99", "role": "h1", "tone": "accent" }
          ]}
        ]}
      ]}
    ]
  }
}
```

读法：Logo 与价格用 `tone:"accent"`（品牌强调），按钮**默认即 pill 样式、背景绑 CTA 色**（无需写 variant），顶栏小字用 `tone:"secondary"`（弱化）；正文 `NEW COLLECTION` / 商品标题**不写 tone，用默认墨色**。**通栏/栅格内大图**只写 `height`（px），宽由组装器 `fill`（占满父容器，版心约 600px）；**横排 row 内的缩略图**另写 `aspect: { w, h }`（宽:高，如竖图 `3:4`），宽由组装器按 `height × (w/h)` 算出，**禁止 AI 写宽 px**。`grid.children` 每一元素即一格内容（无 cell 节点），容器写 `title` 供区块树命名。整段里 image 的 `height`/`aspect` 为 px 与比例语义，其余无 hex（除 theme）、无 widthMode/blockMeta/borderRadius 对象/URL/id。

---

## 2. 节点清单（= 参数范围，已定死）

判别字段统一为 `t`。

| `t` | 必填 | 可选 | 映射 block |
|---|---|---|---|
| `email` | `children` | `canvas`（画布底色，可选） | emailRoot |
| `stack` | `children` | `title` `gap` `align` `box` | layout.container（竖排） |
| `row` | `children` | `title` `gap` `align` `crossAlign` `box` | layout.container（横排） |
| `grid` | `columns` `children` | `title` `gap` `box` | layout.grid |

> **`grid.children` 语义**：数组里每个元素 = **一格里的直接内容**（常为 `stack`，也可 `image`/`text` 等）。**AST 没有 `cell` 类型**；组装器落盘时 **grid 子块与 AST 一一对应**，不再插入额外 layout 壳。

| `text` | `content` `role` | `tone` `bold` `italic` `align` | content.text |
| `image` | `query` | `height`(px) `aspect` `{w,h}` `align` `crossAlign` `required` `box` `children`(叠字) | content.image（**商品/场景摄影，非 Logo**） |
| `icon` | `query` `pack` | `tone` `size` `required` | content.icon（**Logo、社媒、页脚小标**） |
| `button` | `label` | `href` `tone` `radius` `width` `height` `border` `borderTone` | action.button（实心/线框由 `border` 判别） |
| `divider` | — | `tone` `thickness` | separator.divider |
| `progress` | `value` | — | indicator.progress |

### 令牌取值（与 `src/token-preset-contract/` 同源）

| 维度 | 参数 | 档位值 |
|---|---|---|
| 字号 | `role` | `display` `h1` `body` `caption` |
| 颜色 | `tone` | `primary` `accent` `secondary` `surface` |
| 间距 | `gap` / `box.pad` | `section` `gap` `pageInline` |
| 圆角 | `box.radius` | `panel` `cta` |
| 描边 | `box.border` / `button.border` | `hairline` `dashed-hairline` `thin`（**可选**；见下节） |
| 描边色 | `box.borderTone` / `button.borderTone` | `primary` `accent` `secondary` `surface`（可选；缺省 `secondary`） |

### 四个颜色档的语义

| key | 中文标签 | 一句话语义 | 典型绑定 |
|---|---|---|---|
| `primary` | CTA 色 | 行动 / 转化色 | 按钮背景、与 CTA 同色的强调块 |
| `accent` | 品牌强调色 | 品牌识别与点缀 | Logo、主标题链接、价格 / 徽章、有色强调条 |
| `secondary` | 弱化色 | 降权信息色 | 页脚、辅助说明、分隔线 |
| `surface` | 卡片/面板背景色 | 承载内容的底（卡片、面板） | 内层 `box.tone`、线框 button 底 |

> **画布底色**不进 `theme.colors.surface`：整封外层底色写 `tree.email.canvas`（可选），组装器映射 `emailRoot.props.backgroundColor`，不进入 tokenPresets 13 键。

> **正文文字色不占 token 槽**：用固定默认墨色（不随主题切换）。营销邮件换肤一般只换 CTA / 品牌 / 背景，正文恒为深色；需要变色时用原始值 `{hex}` 覆盖。

### 其余枚举

- `align`（row 主轴 / 水平）：`start` `center` `end` `between`
- `crossAlign`（row 交叉轴 / **竖直**，**可选**）：`start` `center` `end` — 省略 = 贴顶；左图右文且右侧相对图片竖直居中 → `center`
- `align`（stack 交叉轴 / 水平）：`start` `center` `end`
- `align` + `crossAlign`（**image 叠放**，仅 `children` 非空）：双轴九宫格 — `align` 管**水平**，`crossAlign` 管**竖直**（均 `start|center|end`）；两轴省略 = 双轴居中（见下节）
- `icon.pack`：`tabler` `simple-icons` `lucide`
- `icon.size`：`sm` `md` `lg`（或 px 逃生口）
- `divider.thickness`：`hairline` `thin`
- `grid.columns`：`1`..`6`
- `progress.value`：`0`..`100`
- `image.height`：px 逃生口 `{px}`（**必填语义**：块在版面上的视觉高度）
- `image.aspect`：可选 `{ w, h }`（**宽:高** 比例，均为正整数；如竖长缩略图 `{ "w": 3, "h": 4 }`）。**不写宽 px**——宽由组装器推导（见下节）
- `button`：**无 variant**；**省略 `border` = 实心底**（bg→`colors.primary`，`tone` 可覆盖填充色）；**写 `border` = 线框**（bg→`colors.surface` + `buttonStyle.border`，`borderTone` 管描边与文字色）
- `button.tone`：**仅实心底**表示填充色；线框勿用 `tone` 当填充，用 `borderTone`
- `button.border`（**可选**）：`hairline` `thin` `dashed-hairline` — 写了即线框按钮
- `button.borderTone`（**可选**）：线框描边与文字色；省略时默认 `primary`
- `button.width`（**可选**）：`fill` \| `hug` — 胶囊本体宽（→ `buttonStyle.widthMode`）；未写 = `hug` 小胶囊；通栏大条写 `fill`
- `button.height`（**可选**）：`hug` \| `relaxed` — 胶囊高度档；未写 = `hug` 常规小胶囊；设计图明显偏高写 `relaxed`（→ 组装器 `heightMode:fixed` + 固定 48px）

### `image` 高度与比例（AI 写语义，组装器写宽）

| 场景 | AI 写什么 | 组装器怎么定宽 |
|---|---|---|
| **通栏 / 栅格内 / 单列 stack 内**（横幅、hero、商品主图） | 只写 `height: { px: N }` | `widthMode: fill`，宽占满父容器（邮件版心约 **600px**，再扣 `pageInline`/模块 `pad`） |
| **横排 `row` 内的缩略图**（左图右文、商品行） | 写 `height` + **`aspect: { w, h }`** | `widthMode: fixed`；`widthPx = heightPx × (w / h)`（过窄时下限 72px）；右侧兄弟块 `fill` |
| row 内缩略图漏写 `aspect` | 只写 `height` | 组装器兜底默认 **`{ w: 3, h: 4 }`**（竖图），宽仍由 `height × w/h` 推导 |

**为何不让 AI 写宽 px**：版心 600、padding、row 内兄弟块会改变可用宽；AI 写绝对宽易超出或与右侧文案抢空间。**高 + 比例**表达视觉意图即可，像素宽交给组装器。

**禁止**：`widthMode` / 任意 block 的 `width` **px 字段** / `"3:4"` 字符串比例——**例外**：`button.width` 仅允许档名 `fill`|`hug`；`button.height` 仅允许 `hug`|`relaxed`（见下节）；image 比例统一 `{ w, h }` 对象。

### 按钮宽度（`width`，**可选**）

| AST `width` | 组装器 | 典型场景 |
|---|---|---|
| 未写 / `hug` | `wrapperStyle.widthMode: fill` + `buttonStyle.widthMode: hug` | 商品旁「Shop now」、行内小胶囊 |
| `fill` | 同上 wrapper + `buttonStyle.widthMode: fill` | 促销条通栏「Check Out …」大白条 |

> AI **只写** `width` 字符串档，**不写** template 形态的 `widthMode`；外层容器宽由组装器固定 `fill`。

### 按钮高度（`height`，**可选**，二选一）

| AST `height` | 组装器 | 典型场景 |
|---|---|---|
| 未写 / `hug` | `buttonStyle.heightMode: hug` | 商品旁「Shop now」、行内标准小胶囊 |
| `relaxed` | `heightMode: fixed` + `height: "48px"` | 设计图明显偏高的 CTA（约 1.5× 常规胶囊）：通栏主按钮、首屏大 CTA |

> AI **只判断**常规 vs 偏高，**不写 px**；定高像素由组装器写入。非法值归一化后按 `hug` 处理。

### 按钮实心 vs 线框（`border` 判别）

| AST | 组装器 | 典型场景 |
|---|---|---|
| 省略 `border` | `backgroundColor`→`colors.primary`；`textColor` 反白；`border` 无 | 「Shop Now」「Back to cart」实心 CTA |
| 写 `border` + `borderTone` | `backgroundColor`→`colors.surface`；`buttonStyle.border` 四边；文字色同 `borderTone` | Postable「Cards」通栏线框链接；对齐 `action.button` 母版线框样 |

> **可点击胶囊**（实心或线框）用 `button`；**装饰性序号圆标**（非链接）用 `stack` + `box.border` + 子 `text`。

### `row` 双轴对齐（`align` + 可选 `crossAlign`）

横排 `row` 的 `contentAlign` 分两轴：**`align` 管水平（主轴）**，**`crossAlign` 管竖直（交叉轴）**。

| AST | 组装器 `contentAlign` | 典型场景 |
|---|---|---|
| `align: start`（默认竖直贴顶） | `horizontal: left`, `vertical: top` | 顶栏左右分布、左图右文且右侧贴顶 |
| `align: start` + `crossAlign: center` | `horizontal: left`, `vertical: center` | **商品行**：左图 + 右侧标题/按钮竖直居中 |
| `align: between` | `horizontal: center` + **`props.gapMode: "auto"`**（缝隙均分，子块 hug 顶两端；改 fixed 后整组居中） | 标题左、链接右 |
| `align: center`（未写 crossAlign） | 水平 + 竖直均居中 | 图标横排居中 |
| `crossAlign: end` | `vertical: bottom` | 行内子块贴底（少见） |

> 内层 `stack.align` 管**右栏内部**标题/按钮的**水平**对齐（`start` 左 / `center` 中 / `end` 右），与 row 的 `crossAlign`（竖直）分工不同。常见商品行：设计图右栏内容居中 → `stack.align: "center"`。

### `text` 水平对齐（`align`，**可选**）

| AST | 组装器 | 典型场景 |
|---|---|---|
| 未写 `align` | 继承直接父 stack 的 `align`（非 stack 子级 → 居中） | 与父容器同对齐 |
| `align: start` | `horizontal: left` | **居中 stack 内的左对齐导语** |
| `align: center` | `horizontal: center` | 显式居中（父 stack 为 start 时） |

> 同 stack 混排（居中标题 + 左对齐正文）：父 stack 常 `align:"center"`，正文 text 逐条写 `align:"start"`；或拆内层 `stack align:start`。

### `image` 叠放对齐（`align` + `crossAlign`，**可选**）

有 `children`（图内叠字 / 角标）时，`image` 语义等同**带底图的竖向 layout 容器**（`props.direction` + `wrapperStyle.contentAlign`）。**不要**为对齐多包一层 `stack`。

| 水平 `align` | 竖直 `crossAlign` | 组装器 `contentAlign` | 典型场景 |
|---|---|---|---|
| 未写 | 未写 | `center` + `center` | 菜谱宫格、hero 正中叠字 |
| `start` | `center` | `left` + `center` | 横幅左栏标题 + CTA（Trail Ready） |
| `start` | `start` | `left` + `top` | 图内左上角色标（50% OFF） |
| `center` | `center` | `center` + `center` | 明确居中叠字 |
| `end` | `end` | `right` + `bottom` | 图内右下角色标 |

> 与 **stack** 不同：stack 的 `align` 只改 horizontal、vertical 恒 `top`；**image 叠放**用 `align` + `crossAlign` 两轴独立组合（九宫格）。`crossAlign` 省略 = `center`（竖直居中）。叠放内 `text` / `button` 直接子级继承同一 horizontal / vertical。

### 容器描边（`box.border`，**可选字段**）

| 项 | 约定 |
|---|---|
| 适用节点 | **`stack` / `row` / `grid`** 的 `box`（三种容器类）；**不是**新基元类型 |
| 是否必填 | **否**；设计稿**看不见**边框时 **整键省略**（组装器默认无描边） |
| AI 写什么 | `box.border`: `hairline` \| `dashed-hairline` \| `thin`；可选 `box.borderTone` 颜色档 |
| AI 禁止写什么 | template 形态：`border` / `padding` / `borderRadius` **对象**（含 `mode`/`width`/`style` 等） |
| 组装器 | 语义档 → `wrapperStyle.border` 对象；未写 `border` → `borderNone()` |
| 典型场景 | 食材清单虚线框 → `"box": { "pad": "section", "tone": "surface", "border": "dashed-hairline" }` |

> `image` 虽也可挂 `box`，但**描边 prompt 只教容器三类**；摄影块一般不用框线，除非设计稿明确给 image 块加框（少见）。

### 容器 `title`（模块业务名）

| 项 | 约定 |
|---|---|
| 谁写 | AI（第 4 步 prompt）；**仅** `stack` / `row` / `grid` |
| 含义 | 编辑器区块树里的**业务模块名**原料，**不参与渲染** |
| 必填粒度 | **所有 `stack` / `row` / `grid` 都必须写** `title` |
| 顶层模块 | **`email` 的每个直接子节点必须是 `stack`**，且必须有 `title` |
| 叶子节点 | **不写** `title`；用 `content` / `label` / `query` |
| 组装器 | 格式化为 `blockMeta.name`（见第 1 步）；email 直接子 stack 自动加「模块」后缀 |
| 漏写兜底 | 不阻断：`stack`→垂直布局、`row`→横向布局、`grid`→栅格（见第 1 步） |

```jsonc
{ "t": "stack", "title": "顶部导航与头图", "children": [
  { "t": "row", "title": "黑色导航栏", "children": [ /* … */ ] }
]}
```

### 档位 vs 原始值 = 绑定 theme vs 写死字面量（本契约最承重的语义）

同一个值写成**档位**还是**原始值**，决定它在主题切换时**跟不跟随**：

| 写法 | 例 | emit 成 | 切 theme 时 |
|---|---|---|---|
| 档位 | `role:"h1"` / `tone:"primary"` / `box.radius:"cta"` | `$themeRef` 绑定到对应 token | **跟随变化** |
| 原始值 | `role:{px:18}` / `tone:{hex:"#E0322D"}` | 字面量 | **固定不动** |

```jsonc
{ "t": "text", "content": "限时", "role": { "px": 18 }, "tone": { "hex": "#E0322D" } }
```

- `{ "px": number }` 覆盖字号/间距/圆角/尺寸；`{ "hex": string }` 覆盖颜色。
- **判断准则**：这个值是「设计系统里那个可切换的值」→ 用档位（绑定 theme）；是「这张图特有的一次性值」→ 用原始值（写死）。
- ⚠️ emit **必须保留 `$themeRef`、不可把档位值也字面量化**，否则切换失效——这与旧还原管道「全字面量化」相反（见第 5 节第 1 步）。

> 所以 **theme 覆盖的正是「可切换集合」**，不是要装下所有值；塞不进档位的一次性值用原始值写死，本就不该跟随主题。

### 组件默认绑定（约定，AI 无需逐个声明）

某些组件样式「天然该绑 theme」，由契约约定默认绑定，AI 不写也自动绑（`radius` 档位 `panel`/`cta` 的命名本就对应其绑定目标）：

| 组件字段 | 默认绑定 | 说明 |
|---|---|---|
| `button` 圆角 | `radius.cta` | `cta` 档为按钮（call-to-action）而设 |
| `button` 实心背景 | `colors.primary`（CTA 色） | 省略 `border` 时；`tone` 可覆盖填充色 |
| `button` 线框背景 | `colors.surface` | 写 `border` 时；`borderTone` 管描边与文字色 |
| Logo / 价格 / 徽章 / 强调条 | `colors.accent`（品牌强调色） | 品牌识别元素默认绑 accent |
| 容器 / 卡片圆角 | `radius.panel` | `panel` 档为容器而设 |

想要脱离绑定的一次性样式，用原始值显式覆盖即可。

### 可切换集合的边界（重要）

**能被主题切换的，恰好就是这 13 个 token 槽（4 色 + 3 间距 + 4 字号 + 2 圆角），一个不多。** 若要让更多组件样式可切换（如第二种圆角、第三档间距……），须**扩 `token-preset-contract` 的标准 scale**——那是动「跨模板主题接口」的更大决定，须单独权衡，不在本 AST 契约内解决。

---

## 3. 永远不在 AST 里的字段（被锁死的结构）

| 字段 | 由谁定 |
|---|---|
| `blockMeta.blockType` | 组装器按节点 `t` 推断（复用 `inferBlockMetaFromBlock`） |
| `blockMeta.name`（编辑器展示名） | 组装器由 `title` + 叶子语义字段 + 父级上下文**确定性格式化**（见第 1 步）；**不由 AI 直接写** |
| `type` / runtimeType | 由 `t` 固定映射 |
| `id` | 组装器计数器生成 |
| `widthMode` / `heightMode`（fill/hug） | 组装器按父子关系级联派生（复用 `wrapperFillConstraint`） |
| `contentAlign` 对象 | 由 `align` + 缺省派生；**image 叠放**缺省 `center/center`，普通容器缺省 `center/top` |
| `border` / `padding` / `borderRadius` 对象形态 | 由标量（档位或 px）构造；**`box.border` 语义档除外**（见 §2 容器描边） |
| `schemaVersion` / `tokenPresets` 形态 | 由唯一 emit 出口产出 |

---

## 4. 防漂移保证

- 字面量类型（`RoleToken` 等）在 `types.ts` 写一次；运行时值数组（`ROLE_TOKENS` 等）从 `TOKEN_PRESET_SCALE_ORDER` **派生**。
- `tokens.test.ts` 用「编译期 `MutualExtends` 断言 + 运行期 `deepEqual`」把**字面量类型 ⟷ 期望集合 ⟷ token 契约**三方绑死。任一侧漂移（如 token 契约新增字号档）→ 编译或测试失败，强制同步。
- 不在本契约维护第二份 token 键表（遵守 `easy-email-design-reuse`「禁止双写」）。

---

## 5. 后续步骤（未实现，仅备忘）

| 步 | 内容 |
|---|---|
| 1 | **组装器** `astToTemplate(doc)`：AST → 合规 block 树；结构派生复用 `inferBlockMetaFromBlock` / `wrapperFillConstraint`；**`title` → `blockMeta.name` 展示名**；`theme` → tokenPresets.json；**档位值 emit 成 `$themeRef` 绑定（保留主题切换，不字面量化）、原始值 emit 成字面量**；组件默认绑定（按钮圆角→`radius.cta` 等）在此落地 |
| 2 | **出口绊线**：emit 后跑 `validateTemplate`，按构造应永过；报错=组装器 bug，改库不修产物 |
| 3 | **资产回填**：收集 `image`/`icon` 的 `query` → 搜索 + `verifyUrlReachable`（候选回退已建）→ 回填 src |
| 4 | **system prompt**：只教本词汇表 + 令牌枚举 + 容器 `title` 规则 + 「只输出 `{theme, tree}` JSON」 |
| 5 | **修复**：validate/资产/保真度失败 → 按节点定点重生成（AST 可寻址） |
| 6 | **保真度检测**：渲染出图 vs 原图视觉 diff（真正的硬骨头） |
