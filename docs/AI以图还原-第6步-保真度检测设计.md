# AI 以图还原邮件版式 —— 第 6 步：保真度检测（实现级设计）

> 承接 [总编排](AI以图还原-第2-6步-管线收尾设计.md)。
> 判断「渲染出来像不像原设计图」。**前 5 步都不依赖本步**；它最后做、可独立迭代，也是决定产品上限的硬骨头。
> 落地分两档：**A 启发式门（先上，弱信号）** 与 **B 视觉 diff（后做，强信号）**。

---

## 0. 做什么

```
回填后的 template + 原设计图
   │  A 启发式门（结构/数值规则）        ← 先落地
   │  B 渲染 → 截图 → 区域 diff           ← 后落地
   ▼
保真度报告：通过 / 偏差区域[] → 第 5 步
```

- **入参**：回填后的 `template`、原设计图、第 2 步的 `qualityIssues`。
- **出参**：`{ pass: boolean; deviations: { blockId; kind; detail }[] }`，`deviations` → 第 5 步定点修复。

---

## A. 启发式门（先上，无需渲染）

直接在 `template` 上跑规则（实现时在 `src/lib/` 落地 `restoreAstVisualLint` 或等价模块），issue code 参考下表：

| code | 检查 | 级别 |
|---|---|---|
| `asset.placeholderSrc` | src 为空串 / `#` | error（必需）/ warning（非必需） |
| `asset.missingRequiredLogo/Icon` | required 资产未命中 | error |
| `typography.footerTooLarge` | 页脚/合规字号 > caption | warning |
| `layout.heroTooTall` | 首屏图高 > 阈值 | warning |
| `layout.defaultSizeLikelyCopied` | 命中可疑默认大值 | warning |
| `icon.missingBox` / `emptyAppGlyph` | 该有框无框 / app glyph 空 | warning |

- 分级判定沿用 `isVisualGateAcceptable` 语义：有 error → 不过；无 error 且（无 warning 或已到末轮）→ 过。
- **这是过渡方案**：在 B 落地前，启发式门即「保真度」的弱版信号，足以先让管线端到端跑通交付。

---

## B. 视觉 diff（后做，强信号）

### B.1 渲染 template → 图

复用现有展示层把 template 渲成像素，**不另写渲染器**：

- 路径：起本地 dev（`http://127.0.0.1:5180`）→ 切到目标 emailKey → 用 `chrome-devtools` MCP（或 puppeteer）`take_screenshot` 整封。
- 渲染真源：`EmailPreview` / `emailPresentationLayout` / `emailTableLayout` / `render-defaults-contract/deliveryExport`——与编辑器所见一致。
- 产出：渲染整图 + 每个 section 块的 `getBoundingClientRect`（按 blockId 取，供区域切分）。

### B.2 比对（区域级，而非整图 PSNR）

邮件还原关注「版式对不对」，不是逐像素。按 **section/块**切区域比：

| 维度 | 比什么 | 偏差信号 |
|---|---|---|
| 区域几何 | 各 section 的相对顺序 / 高度占比 | 顺序错、某块过高过矮 |
| 主色 | 区域主背景色 / 文字色 vs 原图采样 | 色相明显偏 |
| 字号层级 | 标题/正文相对大小关系 | 层级倒置或缺失 |
| 资产 | 该区域是否有图/图标到位 | 占位 / 缺失 |

- 偏差按所属 `blockId` 归属 → 第 5 步定点修复。
- 不追求像素级一致（AI 还原本就近似）；阈值见待决。

---

## 1. 入口签名

```ts
async function checkFidelity(input: {
  template: EmailTemplate;
  designImagePath: string;
  qualityIssues: ValidationIssue[];
  mode: "heuristic" | "visual";   // A | B
  attempt: number;                // 末轮放宽 warning（同旧 gate）
}): Promise<{ pass: boolean; deviations: Deviation[] }>;

type Deviation = { blockId: string; kind: string; detail: string; level: "error" | "warning" };
```

---

## 2. 决策

| 项 | 决定 |
|---|---|
| 落地顺序 | **先 A 启发式门**端到端跑通；**B 视觉 diff 后做** |
| 比对粒度 | 区域级（按 section/blockId），非整图像素 |
| 渲染 | 复用展示层 + 无头截图，**不另写渲染器** |
| 末轮放宽 | 沿用 `isVisualGateAcceptable`：末轮无 error 即交付 |
| 偏差归属 | 按 blockId → 第 5 步 |

## 3. 待决（实现期定）

1. B.2 各维度的**量化阈值**（色差 ΔE？高度占比容差？）与区域切分粒度。
2. **golden 评测集**：以 `scripts/fixtures/restore-ast/**` 与 `data/emails/**` 中 RestoreAst 还原样例为基准，建一组「设计图 ↔ 期望 template」做回归。
3. 截图环境：CI/headless 下 `chrome-devtools` MCP 可用性（旧技能提过 profile 冲突）——可能要 puppeteer 兜底。

## 4. 复用锚点

| 能力 | 复用 |
|---|---|
| 启发式规则 | 新建/落地 restoreAst 视觉门 + `isVisualGateAcceptable` 语义 |
| 渲染 | `EmailPreview` / `emailPresentationLayout` / `emailTableLayout` / `deliveryExport` |
| 截图 | `chrome-devtools` MCP `take_screenshot` + `evaluate_script` 取 rect |
