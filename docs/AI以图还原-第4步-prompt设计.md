# AI 以图还原邮件版式 —— 第 4 步：system prompt（实现级设计）

> 承接 [总编排](AI以图还原-第2-6步-管线收尾设计.md)、[第 0 步词汇表](AI以图还原-AST契约-第0步词汇表.md)。
> 教 AI **只看图、只输出 `{theme, tree}` JSON**。结构/绑定/默认全由组装器派生，prompt 规则集中在 `RESTORE_AST_RULES_BLOCK` 常量。

---

## 0. 调用形态

```ts
const raw = await callLlmStageWithRetry(() =>
  client.complete(
    [
      { role: "system", content: RESTORE_AST_SYSTEM_PROMPT },
      { role: "user", content: [
        { type: "image_url", image_url: { url: imageDataUrl } },
        { type: "text", text: buildRestoreAstUserText({ emailKey, locale }) },
      ]},
    ],
    { type: "json_object" }   // 要求 JSON 输出
  )
);
const doc: RestoreAstDocument = JSON.parse(raw);  // 经 zod 校验形态后入第 1 步
```

- 复用：`callLlmStageWithRetry`、`LlmMessage`、`client.complete(messages, responseFormat)`。
- `RESTORE_AST_SYSTEM_PROMPT` 是一段**固定字面常量**（见 §1）——提交即原样发送，prompt 里**不引用任何外部文件**；枚举字面值靠漂移测试守与契约同源（见 §1 注）。
- 超时/重试沿用管线档位（建议 timeout 180s、重试 2 次）。

---

## 1. System prompt（正文）

> ⚠️ **提交给 API 的是一段完整的字面字符串**——模型只看到下面这些字，**prompt 里不出现任何「引用外部文件/契约」的表达**（无 `${...}`、无「见 xxx-contract」）。枚举值**写死在文本里**。
> 防漂移靠**测试而非运行时引用**：把这段 prompt 存为常量，写一个 `restore-prompt.test.ts` 断言其中的枚举字面值 == `restore-ast-contract` / `token-preset-contract` 的枚举（与 `tokens.test.ts` 同法）。契约加档（如这次加 `accent`）→ 测试变红 → 逼你改 prompt 常量。**单一真源 + 固定字面**两者兼得。
>
> 其中「词汇表 + 取值 + 档位/硬规则」部分抽成**共享字面常量 `RESTORE_AST_RULES_BLOCK`**，第 5 步修复 prompt 原文复用同一份（代码只一份、两处 prompt 都是固定字面、无外部引用）。

```
你是 Easy-Email 邮件版式还原助手。你只看设计图，输出一个 JSON 对象，描述这封邮件。
你不写任何代码、不写最终模板 JSON——只描述「主题色板 + 语义结构树」，其余由程序生成。

## 你只输出这个形状（不要解释、不要 markdown、不要代码块）：
{ "theme": {...}, "tree": { "t": "email", "children": [...] } }

## theme：13 个标准 token 值（从设计图读出）
- colors: { primary(CTA色), accent(品牌强调色), secondary(弱化色), surface(背景色) }   // 均为 hex
- spacing: { section, gap, pageInline }            // 形如 "22px"
- typography: { display, h1, body, caption }        // 形如 "28px"
- radius: { panel(容器圆角), cta(按钮圆角) }         // 形如 "8px"

## tree：语义节点，每个节点一个 "t" 判别字段
容器（有 children）：
- stack  纵向排列   可选 title / gap / align(start|center|end) / box
- row    横向排列   可选 title / gap / align(start|center|end|between) / crossAlign(start|center|end) / box
- grid   栅格        必填 columns(1..6)；可选 title / gap / box
  children = 每一格的**直接内容**（常见为 stack，或 image/text 等）；**没有「单元格」节点类型**，不要包一层 cell
内容（无 children，除 image 可叠字）：
- text     必填 content, role；可选 tone / bold / italic / align(start|center|end)
- image    必填 query(搜索意图，不是URL)；可选 height({px:N}) / aspect({w,h} 宽:高比例) / align(start|center|end) / crossAlign(start|center|end，**仅叠放 children 时**) / required / box / children(叠字)  // 商品图、场景图、横幅摄影；**不是 Logo**
- icon     必填 query, pack(tabler | simple-icons | lucide)；可选 tone / size(sm|md|lg) / required  // **Logo、社媒、App 图标、页脚小标**
- button   必填 label；可选 href / tone / radius / width(fill|hug)  // 默认小胶囊；通栏大条写 width:fill
- divider  可选 tone / thickness(hairline|thin)
- progress 必填 value(0..100)

## 令牌取值（只能用这些档名）
- role(字号): display | h1 | body | caption
- tone(颜色): primary | accent | secondary | surface
- gap / box.pad(间距): section | gap | pageInline
- box.radius(圆角): panel | cta
- box.border(描边，**可选**): hairline | dashed-hairline | thin
- box.borderTone(描边色，**可选**): primary | accent | secondary | surface
- box = { tone?, radius?, pad?, border?, borderTone? }（容器/块的外壳；**除 title/gap/align 外均为可选键，缺省=程序默认**）

## 容器 box 与描边（可选，非必填）
- **只有 `stack` / `row` / `grid` 三类容器**可在 `box` 里按需加描边；**不是**新 `t` 类型。
- **默认不写** `box.border` = 无描边；**仅当**设计稿里该容器有明显边框/虚线框时才写。
  - 实线细框 → `border: "hairline"` 或 `"thin"`
  - 虚线框（如食材清单）→ `border: "dashed-hairline"`
  - 描边颜色需跟主题时用 `borderTone: "secondary"` 等档名；省略则程序用弱化色。
- **禁止**写 template 形态的 border 对象（如 `{ mode, width, style, color }`）；只写上面的**档名字符串**。
- 示例：`"box": { "pad": "section", "tone": "surface", "border": "dashed-hairline" }`

## theme 是用来「一键换肤」的；档位 vs 原始值决定一个值跟不跟随换肤
- 上面 13 个档（theme）= 这封邮件的「可切换样式集合」。一个值**只有同时满足「需要随主题切换」且「对得上某个档」时**，才用**档名**（role:"h1"、tone:"primary"、box.radius:"cta"…）→ 绑定主题，换肤时整封跟随变化。
- **其余一律写具体值**：role/gap/pad/radius/size 写 {"px":N}，tone 写 {"hex":"#RRGGBB"} → 固定不变、不随换肤。
- 包括两种情况都直接写具体 px/hex，不要硬塞进档位：① 这张图特有的一次性颜色/尺寸；② 对不上任何档名的值。

## 硬规则
1. 只输出上面那个 JSON，无任何额外文字。
2. 禁止输出：id、blockMeta、type、widthMode/heightMode、contentAlign 对象、**border/padding/borderRadius 的 template 对象形态**、任何 https:// URL（这些都由程序生成）。**允许**在 stack/row/grid 的 `box` 写 `border` / `borderTone` **语义档**（见「容器 box 与描边」）。
3. 图片/图标只写 query（英文搜索词），绝不写 URL。
   - **Logo（顶栏品牌标、页脚小图标）用 `icon`，不要用 `image`**；`required:true`。
   - 社媒、App 图标同样用 `icon`。
   - `image` 只用于商品摄影、场景横幅、人物产品图等。
4. 正文文字不用写 tone（默认深墨色）；只有要换肤跟随的文字才标 tone。
5. 按钮不写样式，默认就是品牌 CTA 小胶囊；只有偏离时才用 tone/radius 覆盖。
   - **宽度（可选）**：占满内容区宽的通栏大条 → `width: "fill"`；小胶囊（商品旁 Shop now 等）**不写**或 `width: "hug"`。禁止写 widthMode 对象。
6. 图片尺寸（只写高 + 可选比例，**禁止写宽 px**）：
   - **通栏 / 栅格 / 单列 stack 内**的大图、横幅、hero：只写 `height: { "px": N }`；宽由程序 fill 占满（版心约 600px）。
   - **横排 row 内的图**（商品缩略图、编辑类肖像等）：写 `height` + `aspect: { "w": 3, "h": 4 }`（**宽:高**）；宽由程序按 `height × w/h` 计算，**大肖像写更高 height**（如 300–360px），小商品图写 120–200px。不要写宽。
   - 比例只用 `{ "w": number, "h": number }` 对象，**不要**写 `"3:4"` 字符串。
   - row 内漏写 `aspect` 时程序兜底 3:4。
7. tree 自上而下覆盖完整邮件；模块数与设计图一致。
8. 容器 title（中文业务模块名，供编辑器区块树展示，不参与渲染）：
   - **凡 `stack` / `row` / `grid` 都必须写 `title`**（简短中文，2~12 字）。
   - `email` 下每个直接子节点**必须是 `stack`**，且必须有 `title`（整封邮件各大模块，如「顶部品牌导航」「首屏英雄区」）。
   - 叶子节点（text / image / icon / button / divider / progress）**不写** `title`：用 content / label / query。
   - 不要写 id、不要写「模块」二字（程序会给 email 下直接子 stack 自动加「模块」后缀）。
9. grid 结构（无单元格层）：
   - `grid.children` 长度 = 格位数（如三列宫格通常 3 个元素）；每个 child 就是一格里的 block。
   - **一格只有图 + 图内字**：直接 `image` + `children`（叠字），`align:"center"` 或不写（程序默认图内双轴居中）；**不要**多包一层 `stack`。
   - **一格图下 caption**：`stack` 纵排 `image` + `text`（图外文案，非叠字）。
   - 禁止输出 `t:"cell"` 或任何「单元格」包装；AST 只有 stack/row/grid 三种容器。
10. image 叠放（图内字 / 角标，非图下 caption）：
   - 字在照片**内部** → `image` + `children`；用 `align`（水平）+ `crossAlign`（竖直，**可选**）组合九宫格定位。
   - 两轴均省略或均 center → 双轴居中（hero / 宫格叠字）。
   - 横幅左栏标题 + CTA（竖直居中、水平贴左）→ `align:"start"` + `crossAlign:"center"`。
   - 角标贴左上角 → `align:"start"` + `crossAlign:"start"`；贴右下 → `align:"end"` + `crossAlign:"end"`。
   - 禁止把图内字写成 image **下方**并列 text。
11. row 双轴对齐：
   - `align`：主轴（**水平**）— 左图右文用 `start`；两端分布用 `between`。
   - `crossAlign`（**可选**）：交叉轴（**竖直**）— 省略 = 贴顶；**左图 + 右侧 stack（标题/按钮）相对图片竖直居中** → `crossAlign: "center"`。
   - 右栏内标题/按钮的**水平**对齐写内层 `stack.align`：设计图居中 → `"center"`；贴左 → `"start"`。
12. text 水平对齐（可选）：
   - `align`（**可选**）：覆盖直接父 stack 的 `align`；省略 = 继承父 stack（非 stack 子级默认居中）。
   - **同 stack 混排**（如居中标题 + 左对齐导语）：父 stack 写整体节奏（常 `center`），导语逐条写 `align:"start"`；或拆内层 stack。
```

---

## 2. User text

```ts
function buildRestoreAstUserText(p: { emailKey: string; locale: string }): string;
```

正文：
```
请根据附带的设计图输出 { theme, tree } JSON。
- 只输出 JSON，不要解释。
- theme 的颜色/间距/字号/圆角从图里量出来填。
- tree 覆盖整封邮件；**所有 stack/row/grid 写 title**；email 下只用直接子 stack 分大模块。
- grid 的 children 直接写每格内容（无单元格节点）；图内叠字用 `image`+`children`，勿多包 stack。
- 图内叠字居中：`image` 不写 `align`/`crossAlign` 或两轴均 `center`；角标左上 `align:"start"` + `crossAlign:"start"`；横幅左栏 CTA `align:"start"` + `crossAlign:"center"`。
- 按钮：通栏大条 `width:"fill"`；小胶囊不写 width。
- 左图右文商品行：`row` 写 `align:"start"` + `crossAlign:"center"`；右栏标题/按钮在设计图里居中时内层 `stack.align:"center"`，贴左则 `"start"`。
- 顶栏居中标题 + 左对齐导语：父 stack `align:"center"`，导语 text 逐条写 `align:"start"`。
- 顶栏/页脚 **Logo 用 icon**（如 simple-icons 品牌 slug 或 tabler 图形名），不要用 image。
- **横排 row 内缩略图**写 `height` + `aspect`（如 `{ "w": 3, "h": 4 }`）；通栏大图只写 `height`。
- **容器虚线/实线框**：仅在 stack/row/grid 的 `box` 按需写 `border`（如 `dashed-hairline`），无框则省略。
- 运行参数 emailKey=<...> / locale=<...> 已由程序掌握，无需输出。
```

（`emailKey`/`locale` 仅作背景，AI 不写进输出；与第 0 步「程序已知字段不进 AI 输出」一致。）

---

## 3. 输出校验（入第 1 步前）

- 用 `restore-ast-contract` 的 zod schema（实现期补）`safeParse` AI 输出：形态非法 → 视为可修复失败，进第 5 步（带「JSON 形态错」原因）。
- 形态合法 → 交第 1 步 `astToTemplate`。

---

## 4. 决策

| 项 | 决定 | 理由 |
|---|---|---|
| 输出格式 | `responseFormat: json_object` + zod 形态校验 | 减少 JSON 噪声 |
| prompt 形态 | **固定字面常量**，无外部引用；枚举写死 | 提交即固定，模型只见字面 |
| 防枚举漂移 | `restore-prompt.test.ts` 断言 prompt 内枚举字面 == 契约 | 单一真源 + 固定字面兼得（同 `tokens.test.ts`） |
| 单封单次调用 | 整树一次产出（非分节并行） | AST 短，无需分片；分节失协调缝 |
| 正文 tone | 默认不写（墨色） | 见第 0 步「正文不占 token 槽」 |
| 容器 title | **stack / row / grid 均必填**；email 下仅直接子 stack | 组装器格式化为 `blockMeta.name`；漏写用固定兜底（垂直/横向/栅格） |
| Logo | **用 `icon`**，不用 `image`；`required:true` | Pexels 搜不到注册商标；icon 走 CDN |
| grid 形态 | AST **无 cell**；`children` 即每格内容 | 组装器 **直接** `buildNode`，与 AST 一一对应 |
| image 尺寸 | 通栏只写 `height`；row 内图写 `height` + `aspect:{w,h}` | 宽 px = `height × w/h`（下限 72）；禁止 AI 写宽 |
| 容器描边 | **`stack`/`row`/`grid` 的 `box.border` 可选**；`hairline`/`dashed-hairline`/`thin` | 非新基元；无框则省略；禁止 border 对象；组装器待实现 |

## 5. 与旧 prompt 的对比

旧 mjs 路径要灌：mjs 底稿、patch XML 语法、helper 白名单、契约硬规则（hug/fill、id 拼接、对象形态…）。**这些在新架构里全消失**——结构由组装器保证，prompt 只剩「词汇表 + 取值 + 容器 title + 输出格式」。
