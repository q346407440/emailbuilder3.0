# AI 以图还原邮件版式 —— 第 3 步：资产回填（实现级设计）

> 承接 [总编排](AI以图还原-第2-6步-管线收尾设计.md)、[第 1 步组装器](AI以图还原-第1步-DSL组装器设计.md)。
> 把 AST 里 `image`/`icon` 的 `query`（搜索意图）变成**真实可访问 URL**，按节点 id 回填进产物。

---

## 0. 做什么

第 1 步组装时，`image`/`icon` 的 src 留**空串 `""`** 占位，并在 `ctx.assets` 记下 `blockId → 资产请求`。第 3 步：收集请求 → 搜索 → 逐候选验活 → 回填 → 检查必需资产。

```
template(占位 src) + AssetRequest[]
   │  resolveAndBackfillAssets
   ▼
template(真实 src) + unresolvedRequired[]   → 有必需未命中则进第 5 步
```

---

## 1. 数据结构

组装器（第 1 步）产出的资产请求：

```ts
type AssetRequest =
  | { blockId: string; kind: "image"; query: string; targetWidth: number; required: boolean }
  | { blockId: string; kind: "icon";  query: string; pack: IconPack; required: boolean };
```

- `blockId`：第 1 步分配的稳定块 id（回填寻址用，不靠文本替换）。
- `targetWidth`：见 §4 决策（image 宽恒 fill）。

回填字段位置：

| kind | 回填到 |
|---|---|
| image | `wrapperStyle.backgroundImage.src` |
| icon | `props.src` |

---

## 2. 入口签名

```ts
async function resolveAndBackfillAssets(
  template: EmailTemplate,
  requests: AssetRequest[],
  resolver = createDefaultAssetResolver()
): Promise<{
  template: EmailTemplate;          // src 已回填
  resolvedCount: number;
  unresolvedRequired: AssetRequest[]; // 必需但全候选不可达 → 第 5 步
  unresolvedOptional: AssetRequest[]; // 非必需缺失 → 留空串，交第 6 步质量门
}>;
```

---

## 3. 算法

1. **并发解析**（`Promise.all` 批量）：每个请求调 `resolver.resolve({kind, query, targetWidth | pack})`。
2. **候选回退验活**（**已建，直接用**）：`createDefaultAssetResolver` 内部对每槽取 ≤5 候选，逐个 `verifyUrlReachable` HEAD 探活，首个可访问者采用，全挂返回 `*_ALL_CANDIDATES_UNREACHABLE`。
3. **按 blockId 回填**：解析成功 → 写入对应块的 src 字段（image→`backgroundImage.src`，icon→`props.src`）。
4. **必需性检查**：`required:true` 未命中归入 `unresolvedRequired`；非必需归 `unresolvedOptional`，src 留空串。

---

## 4. 决策（已定）

| 项 | 决定 | 理由 |
|---|---|---|
| `targetWidth` 推导 | **= 600**（emailRoot 宽） | image 宽恒为 fill，全宽即画布宽；不按父容器细推，简单且够用 |
| icon 无 targetWidth | 走 CDN 锁版本 svg（矢量） | icon 不需要尺寸候选 |
| 回填寻址 | **按 blockId**，不文本替换 | AST/产物均可寻址，稳 |
| 必需未命中 | 进第 5 步（让 AI 改 query/pack） | 必需资产（logo/社媒）缺失影响还原度 |
| 非必需未命中 | 留空串，不阻断 | 交第 6 步质量门判定是否要紧 |
| 远程图源 | Pexels（图）/ jsDelivr 锁版本（icon），**禁编造 URL** | 技能 `email-remote-asset-urls` |

---

## 5. 复用锚点（禁止双写）

| 能力 | 复用 |
|---|---|
| 批量搜索 + 回填 | `resolveAstAssetRequests` / `backfillTemplateFromManifest`（`src/restore-ast-contract/backfillAssets.ts`） |
| 候选回退 + 验活 | `createDefaultAssetResolver` + `verifyUrlReachable` |
| icon slug 解析 | `resolveIconCdnCandidates`（多候选） |

## 6. 边界 / 落盘

- 日志：`logs/<runId>/03-assets.json`（每槽：query / 命中 URL / 候选数 / 验活结果）。
- 出参 `unresolvedRequired` 非空 → 交第 5 步；空 → 进第 6 步。
