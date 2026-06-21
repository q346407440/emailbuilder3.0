# AI 以图还原邮件版式 —— 第 5 步：按节点定点修复（实现级设计）

> 承接 [总编排](AI以图还原-第2-6步-管线收尾设计.md)。
> 资产 / 保真度失败时，**只重生成出问题的 AST 节点**，而非整树重写。AST 天然可寻址，远比旧 slot-XML 干净。
> （结构 validate 失败**不进本步**——那是组装器 bug，见第 2 步「改库不修产物」。）

---

## 0. 做什么

```
失败上下文（来自第 3/6 步）
   │  归属到 astPath（节点定位）
   ▼
按节点重生成 prompt → LLM → 修正节点
   │  splice 回原 AST 对应子树
   ▼
重跑第 1~3（必要时 6）→ 仍失败且 <3 轮则再来；否则保底交付
```

---

## 1. 节点寻址：`blockId ↔ astPath`

第 1 步组装器在分配 block id 时，**同时记一张映射** `Map<blockId, astPath>`（`astPath` = AST 树内的路径，如 `tree.children[1].children[3]`）。这样任何以 block 维度报出的失败都能回到 AST 节点：

```
失败 → blockId → astPath → AST 节点子树
```

- validate 报的 `root.children[i]...` 路径 → blockId：复用 `rewriteNestedIssuePathToBlockPath` / `blockIdFromValidateIssueLine`（`mjsValidatePath.ts`）。
- 资产失败：第 3 步的 `AssetRequest` 自带 `blockId`，直接查 astPath。
- 保真度失败：第 6 步的偏差区域映射到所属 section 节点的 blockId。

---

## 2. 失败类型 → 修什么

| 失败来源 | 修复对象 | 怎么修 |
|---|---|---|
| **结构 validate**（第 2 步 blocking） | **不修产物** | 抛 `AstAssemblerBug`，去补 builder/派生。AI 不参与 |
| AI 输出 JSON 形态非法（第 4 步） | 整个 doc | 带「形态错 + zod 报错」重新提示一次（整树重生，少见） |
| 必需资产未命中（第 3 步） | 该 image/icon 节点 | 让 AI 改 `query` / 换 `pack`（不动其余字段） |
| 保真度偏差（第 6 步） | 偏差区域所属节点 | 让 AI 改该节点的 role/tone/height/结构；**容器节点可补/改 `title`**（区块树可读） |

> 核心原则：**谁错修谁，且修的是 AST 节点（语义层），不是产物 JSON/代码。**

---

## 3. 修复循环

```ts
async function repairLoop(doc, failures, maxRounds = 3): Promise<{ doc; ok; residual }> {
  for (let round = 1; round <= maxRounds; round++) {
    const byNode = groupByAstPath(failures);          // 多个失败按节点归并
    const fixes = await Promise.all(
      byNode.map(g => repairNode(doc, g.astPath, g.reasons))  // 每节点一次定点重生成
    );
    doc = spliceFixes(doc, fixes);                    // 替换对应子树
    const r = await rerunFrom(doc);                   // 重跑 1→2→3（→6）
    if (r.ok) return { doc, ok: true, residual: [] };
    failures = r.failures;
  }
  return { doc, ok: false, residual: failures };       // → 保底交付
}
```

- **每节点一次调用、可并行**（同轮多个坏节点互不依赖）。
- **早停**：若某轮失败集合与上一轮**完全相同**（零进展）→ 提前保底（复用旧管线 `sameFailureErrorSet` 思路）。

---

## 4. 修复 prompt（定点重生成）

⚠️ **与第 4 步同约束**：提交给 API 的修复 prompt 也是一段**固定字面串**，**不能出现「遵守第 0 步词汇表」这类外部引用**——词汇表/规则必须**原文嵌进 prompt**。

做法：把「词汇表 + 取值 + 档位/原始值/硬规则」抽成**共享字面常量** `RESTORE_AST_RULES_BLOCK`，第 4 步 system prompt 与本步修复 prompt **都原文拼接它**。代码侧只此一份，枚举靠 `restore-prompt.test.ts` 守与契约同源（见第 4 步 §1 注）。坏节点 JSON、astPath、问题清单是**运行时填入的具体值**（非文件引用，合规）。

```
你在修一封邮件还原稿里的一个节点。下面是它当前的 AST JSON 和发现的问题，
请只输出**修正后的这一个节点 JSON**（同样的 "t"，保留无关字段不变）。

## 节点（astPath: tree.children[1].children[3]）
<原节点 JSON，运行时填入>

## 问题
- <reason 1：如「必需图标 query='nike' 未搜到可访问资源，请换更通用的 query 或改 pack」>
- <reason 2：如「保真度：该标题字号档与设计图偏大，设计图约 18px」>

## 规则（以下为 RESTORE_AST_RULES_BLOCK 原文，与第 4 步 prompt 同一份字面常量）
<原文嵌入：9 基元 + 令牌取值(display|h1|body|caption / primary|accent|secondary|surface / …)
 + 档位 vs 原始值准则 + 禁止结构字段 + 容器 title 规则 + 图标 pack 枚举>
- 额外：只改与问题相关的字段，其余原样保留（含既有 `title`）；只输出这一个节点的 JSON，不要解释。
```

复用 LLM 基建同第 4 步（`callLlmStageWithRetry` + `client.complete`，可不带图或带原图局部）。

---

## 5. 保底交付（≤3 轮仍不过）

- 产物已落盘且 node 可用 → `validationOk:false` + `issues[]`，经 SSE `done` 透传前端 **warning toast**，不空手而归（复用旧管线 degraded 概念）。
- `issues` 只含**非结构**残留（资产缺失 / 保真度偏差）；结构残留不可能到这（第 2 步已断言）。

---

## 6. 决策

| 项 | 决定 |
|---|---|
| 结构错是否进修复 | **否**，抛 AstAssemblerBug（改库） |
| 修复粒度 | 单节点（astPath 定位），非整树 |
| 轮数 | ≤3，含零进展早停 |
| 寻址 | `blockId↔astPath` 映射（组装器维护）+ 复用 `mjsValidatePath` 路径改写 |
| 落盘 | `logs/<runId>/05-repair-round{N}.json`（坏节点 / 原因 / 修正） |
