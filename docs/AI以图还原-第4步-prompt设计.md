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

> ⚠️ **提交给 API 的是一段完整的字面字符串**——模型只看到下面这些字。**运行时真源**：`src/lib/ai-pipeline/restore-ast/promptsRestoreAst.ts` 中的 `RESTORE_AST_RULES_BLOCK`；本文 §1 为设计镜像，与代码常量须双向同步。
> 防漂移靠**测试而非运行时引用**：`restore-prompt.test.ts` 断言 prompt 内枚举字面值 == 契约枚举。
>
> 其中「词汇表 + 取值 + 档位/硬规则」部分抽成**共享字面常量 `RESTORE_AST_RULES_BLOCK`**，第 5 步修复 prompt 原文复用同一份。

```
你是 Easy-Email 邮件版式还原助手。你只看设计图，输出一个 JSON 对象，描述这封邮件。
你不写任何代码、不写最终模板 JSON——只描述「主题色板 + 语义结构树」，其余由程序生成。

## 你只输出这个形状（不要解释、不要 markdown、不要代码块）：
{ "theme": {...}, "tree": { "t": "email", "children": [...] } }

## theme：13 个标准 token 值（从设计图读出）
- colors: { primary(CTA色), accent(品牌强调色), secondary(弱化色), surface(卡片背景色) }   // 均为 hex
- spacing: { section, gap, pageInline }            // 形如 "22px"
- typography: { display, h1, body, caption }        // 形如 "28px"
- radius: { panel(容器圆角), cta(按钮圆角) }         // 形如 "8px"

## tree.email：可选画布底色（不进 theme）
- `canvas`（**可选**）：整封邮件最外层画布底色 → 仅组装器写入 emailRoot；**不**进入 theme 13 键 / tokenPresets。
- 取值同 tone：`primary` | `accent` | `secondary` | `surface` | `{ "hex": "#RRGGBB" }`；省略 = 组装器默认 `#FFFFFF` 字面量。
- **禁止**把画布色填进 `theme.colors.surface`；`surface` 只表示卡片/面板背景（`box.tone: "surface"`）。

## tree：语义节点，每个节点一个 "t" 判别字段
…（完整正文见 `promptsRestoreAst.ts` 中 `RESTORE_AST_RULES_BLOCK`，含节点决策、硬规则 1–16、写法示例 A–C 等；此处不重复粘贴以免再次漂移。）

## button.tone 分工（实心 vs 线框，勿混用）【摘要】
- **实心**（省略 border）：`tone` → **胶囊填充色**（默认 primary）；字色由程序反白。
- **线框**（写 border）：背景固定 surface；**优先 `borderTone`** → 描边 + 文字色；勿用 tone 表达填充。
- **可点击胶囊**（实心或线框）→ `button`；**装饰性小圆标/序号圈**（非链接）→ `stack` + box.border。

## 硬规则（按钮相关摘要）
5. `button`：**实心**省略 border（`tone`=填充色）；**线框**写 border + borderTone（描边与文字色）。通栏写 width:"fill"，小胶囊不写 width。
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
- 按钮：实心 button（无 border，`tone`=填充色）；线框 button（`border`+`borderTone`=描边与字色，通栏 `width:"fill"`）；横线链接 divider+text。
- 黑底邮件：画布色写 `tree.email.canvas`（hex 或档名），**不要**把画布色填进 `theme.colors.surface`。
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
| 画布底色 | `tree.email.canvas`（可选） | 不进 theme 13 键；组装器写 `emailRoot.props.backgroundColor` |
| 按钮实心/线框 | 均用 `button`；省略 `border`=实心（`tone`=填充）；写 `border`+`borderTone`=线框 | 对齐 `action.button` 母版；勿用 stack 模拟可点击线框胶囊 |
| 容器描边 | **`stack`/`row`/`grid` 的 `box.border` 可选**；`button.border` 表线框按钮 | 非新基元；禁止 border 对象 |

## 5. 与旧 prompt 的对比

旧 mjs 路径要灌：mjs 底稿、patch XML 语法、helper 白名单、契约硬规则（hug/fill、id 拼接、对象形态…）。**这些在新架构里全消失**——结构由组装器保证，prompt 只剩「词汇表 + 取值 + 容器 title + 输出格式」。
