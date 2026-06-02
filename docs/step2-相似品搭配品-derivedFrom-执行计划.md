# 执行计划：商品列表 A/B + 相似品/搭配品（Step 2 变量层 + Step 3 repeat 感知赋值）

> 前置：Step 1 已完成（绑哪层复制哪层、子容器可绑子列表或独立顶层变量、`validate:all` 全绿）。
> **Step 1 列表绑定唯一真源**：`src/repeat-binding-contract/`（本文 Step 2/3 不得与之冲突）。
> **本计划仅描述 Step 2/3 方案，不含执行。**

## 0. 端到端目标（需求方定稿）

最终交付的业务场景：

```text
父 block 循环变量 A（商品列表）
  └─ 子 block 循环变量 B（商品列表；B 在变量层声明「相似品/搭配品，目标 = A」）

展开结果（每组各自不同）：
  A1  +  B1 B2 B3 B4   ← B 按 A1 算出的相似品/搭配品
  A2  +  B5 B6 B7 B8   ← B 按 A2 算出的相似品/搭配品
```

架构分三层，职责固定：

| 层 | 职责 | 本计划对应 |
|----|------|-----------|
| **变量层** | 声明 B 与 A 的**逻辑关系**（相似品/搭配品 + 目标列表）；提供**无 repeat 上下文**时的默认整槽预览 | **Step 2** |
| **赋值层** | 每次渲染时，按**当前 A 行**（或发信当时 A 数据）**重新执行**逻辑，再驱动子 block 复制 | **Step 3** |
| **Block 层** | 结构复制（self-repeat、嵌套 bind）；不承载「相似于谁」的业务语义 | Step 1（已完成） |

核心原则：**复制是复制，赋值是赋值**；**存关系，不算死结果**。

- Block 只决定「绑哪个槽、复制哪一层容器」；
- 「B 跟 A 什么关系、每组 B 取什么」在 **payload.slots 逻辑声明 + 运行时解析** 里完成；
- **不**把 per-row 推导结果当作关系真源写进 template；
- **不**在 Inspector 绑定向导里堆一次性特例。

---

## 1. 整体数据流（大白话）

### 1.1 持久化 vs 运行时

| 阶段 | 存什么（逻辑/真源） | 算什么（取值） |
|------|---------------------|----------------|
| **绑定 block 当场** | `template.repeat`（绑 A/B）、`payload.slots[B]`（B→A 策略） | ❌ **不算**最终商品列表 |
| **编辑画布每次预览** | 不变 | ✅ 用**当前** `values[A]` + 逻辑，算出每组 B 并展开 |
| **实际发信/导出** | 不变（关系仍在 slots/template） | ✅ 用**发信当时** `values[A]`（可能已变）**再算一遍** |

绑定 block **不是**「创建画布当场算好存起来」；预览与发信共用**同一条解析管道**，只是**输入 payload 可能不同**。

### 1.2 统一渲染管道（预览 = 发信，接口一致）

```text
输入：template + payload（slots + values）+ tokenPresets（主题）

① payload.slots：B 配置「排序策略 = 相似品，targetSlotId = A」     ← 逻辑真源（Step 2）
② applyBuiltinCollectionResolves：
     对无 repeat 上下文的槽，算出 values[B] 默认预览（锚 A 首项）   ← Step 2
③ buildRepeatPreviewModel（repeat-runtime 虚拟视图）：
     展开 A 第 i 项 → 上下文带上 A[i]
     嵌套 B repeat → 若 B target=A 且有 A[i] 上下文：
         现场 resolve(B, anchor=A[i])                             ← Step 3（逻辑重算）
④ 按 VirtualBlockRef 逐节点 merge / snapshot：把本次算出的值填进行模板
⑤ resolveThemeInTemplate（若含 $themeRef）

输出：可用于画布 HTML 预览 / 发信 HTML 的 merged 视图
```

- **编辑器**：`buildPreviewPayload` → 上述管道（`App.tsx`、Inspector 已近似此链路）。
- **发信方**：传入当次 `payload.values`（尤其 A 可能已与编辑期不同），走**同一套** ②③④；**不得**依赖编辑期算好并落盘的 per-row B。
- **落盘**：`payload.json` 存 `slots`（关系）+ `values`（输入/预览种子）；`template.json` 存结构与 repeat 绑定。**不**把「A1→B1234」推导结果作为 B→A 关系的唯一定义写入磁盘（用户主动「解除绑定并物化」除外）。

Step 2 **alone** 只做到 ①② 的整槽默认：全邮件一份 B。  
Step 2 + Step 3 才在 ③ 实现「A 循环每一组，B 自动跟当前 A 项走」。

---

## 2. 逻辑值 vs 快照（企业级关系变量）

### 2.1 什么是「逻辑值」

**逻辑值** = 在 `payload.slots` 里声明「怎么从别的变量推导」，而不是在 `values` 里存一份算死的列表当关系本身。

```text
持久化（逻辑）：
  slots[B].dataSource = { strategy: similarTo, targetSlotId: A }
  template：父 repeat→A，子 repeat→B
  values[A] = 当次输入（编辑预览 seed / 发信接口传入，会变）

运行时（取值）：
  B_rows(i) = compute(B.config, anchor = A[i])    ← 纯函数，可重复调用
```

相似品/搭配品是**派生列表（Derived Collection）**策略的一种；`targetSlotId` + repeat 上下文提供的 **anchor** 是通用机制，后续其它「B 依赖 A 的某一行」场景可复用同一套 `resolveCollection(slotId, payload, context?)`，不必为每种业务单独写 block 特例。

### 2.2 什么不是真源（快照 / 一次性）

| 做法 | 是否采用 | 说明 |
|------|----------|------|
| 绑定 block 时把 B 列表写入 template | ❌ | 关系不应绑死在结构 JSON |
| 把 per-row 的 B1234、B5678 写入 `values[B]` 作为联动真源 | ❌ | A 一变即过期 |
| `values[B]` 整槽默认（锚 A 首项） | ✅ 仅作**预览回退** | 变量面板、无嵌套 repeat 时用 |
| 解除 repeat 物化后的静态行 | ✅ | 用户显式「快照化」，与逻辑绑定无关 |

### 2.3 编辑预览 vs 发信：都要算，输入可不同

```text
编辑期：
  values[A] = 编辑器里 2 个商品
  → 预览：A1→compute(B,A[0])，A2→compute(B,A[1])

发信期（一周后）：
  values[A] = 接口传入 3 个商品（已变）
  → 发信：A1'→compute(B,A'[0])，…，A3'→compute(B,A'[2])
```

这是企业级邮件编辑器的常规做法：

1. **Declarative**：模板 + slots 存关系与结构；
2. **Re-evaluate on render**：预览与发信共用解析器；
3. **Input at send time**：`values` 承载当次业务数据，派生结果每次重算。

### 2.4 `values[B]` 的定位（避免误解）

- **不是** per-row 联动在嵌套 repeat 下的真源；
- **是** Step 2 在无 repeat 上下文时的整槽预览（如变量侧栏、B 未嵌在 A 行内时的画布）；
- Step 3 嵌套场景下，expand 阶段**优先** `resolve(B, anchor=A[i])`，**不**读磁盘上那份 flat `values[B]` 作为每组 B 的来源。

---

## 3. Step 2：变量层——「带目标的排序计算」

### 3.1 要做什么

有两个独立「商品列表」变量 A、B；**B 可选「相似品 / 搭配品」排序策略并指向 A**（**逻辑声明**，非一次性结果）。

把「商品列表变量」分成两层：

1. **数据源层**：catalog / 基础候选池 / 手工 values。
2. **排序/计算层**：输入数据源，经策略计算后返回「新的商品列表排序」。每个策略带 **target（目标）**：
   - **常规排序**（默认 / 名称 / 销量 / 售价 …）：target = **自身**。
   - **相似品 / 搭配品**：target = **另一个商品列表变量 A**（必填）。

「相似品/搭配品」与常规排序**同构**。后续替换真实 Shoplazza 算法，只改排序计算层实现，契约与 UI 形态不变。

### 3.2 Demo mock 规则（Step 2 验证用）

- 在商品 catalog mock 中新增名为 **「相似品」**、**「搭配品」** 的两条商品。
- 选相似品 → 「相似品」商品排第一；选搭配品 → 「搭配品」商品排第一。
- **不是**真实相似度算法，仅验证分层与拓扑解析；算法可后续替换。

### 3.3 Step 2 边界

- **只在变量层写逻辑**：B→A 关系写在 `payload.slots[B].dataSource`。
- **`applyBuiltinCollectionResolves`**：写出 `values[B]` **默认预览**（锚 A 首项），**不**声称其为嵌套 repeat 下 per-row 的真源（见 §2.4）。
- **默认锚点**：无 repeat 上下文时，similarTo/complement 以 **A 的首项** 为锚。
- **禁止**独立 `extract` 与 `anchorItemIndex` 持久化（已内化进 `sort` 策略；`validate` 对 `dataSource.extract` **fail**）。
- **本步不改** repeat 展开与 Inspector 列表绑定向导。

### 3.4 Step 2 设计要点

#### 契约（`collection-builtin-sort.ts` 等）

- 排序模型升级为 `{ strategy, targetSlotId? }`。
- 常规策略：`targetSlotId` 省略 = 自身。
- `similarTo` / `complement`：`targetSlotId` **必填**（指向 A）。
- 派生策略 UI 文案见 `collection-builtin-sort-policy.ts`（`builtinSortUiOptionLabel` / `sortPolicySummaryLabel`）；**禁止** payload 读盘 `extract`（见 `validate.ts`）。
- `validate.ts`：similarTo/complement 须合法 targetSlotId（存在、内置商品列表、非自引用）。

#### 解析（`resolveBuiltinCollectionItems.ts`）

- 抽取可复用**纯函数**：`resolveBuiltinCollectionItemsForAnchor({ ..., anchorRow })`（预览与发信、Step 2 与 Step 3 **共用**）。
- `applyBuiltinCollectionResolves`：拓扑序 B 依赖 A；默认 `anchorRow = values[A][0]` → 写入 `values[B]` 仅作整槽预览。
- 维持幂等、拓扑序（`topologicalBuiltinSlotOrder`）。

#### UI（变量 / 数据源面板）

- 「排序」与「提取/衍生」合并为一个「排序方式」下拉（含相似品/搭配品）。
- 选相似品/搭配品时展开「目标列表（选 A）」；去掉「锚点第 N 条」控件。

### 3.5 Step 2 现状真源

| 主题 | 文件 | 现状（2026-05 洁癖后） |
|------|------|------|
| 排序/派生策略 + UI 文案 | `src/payload-contract/collection-builtin-sort-policy.ts` | `sort` 字符串或 `{ strategy, targetSlotId }`；无 `extract` 读盘 |
| 解析落值 | `src/lib/resolveBuiltinCollectionItems.ts` | `ForAnchor` / `resolveCollectionForContext`；目标槽列表 `listDerivedSortTargetSlotIds` |
| mock + 算法 | `src/lib/builtinCollectionCatalog.ts`、`builtinProductListResolve.ts` | projectBuiltinCatalog* |
| 数据源 UI | `CollectionVariablePanel.tsx`、`BuiltinCollectionRulesFields.tsx` 等 | 单一「排序方式」+ 目标列表 |
| 变量契约 | `src/payload-contract/` | payload.slots 槽目录；`extract` 禁止持久化 |

### 3.6 Step 2 完成标准

- 排序模型为带 target 的策略；similarTo/complement 指向 A；无独立 extract/anchorItemIndex 残留。
- mock 生效：变量面板中 B 随策略/目标变化（**逻辑预览**）。
- `npm run validate:all` 全绿；契约/解析/迁移单测通过。
- **此步不要求** per-row B；嵌套 repeat 预览仍可能「每行同一份 B」（Step 3 解决）。

---

## 4. Step 3：赋值层——repeat 上下文感知解析

### 4.1 要做什么

在 **每次** 走渲染管道（编辑预览、发信导出）的 `buildRepeatPreviewModel` 中：当 **同时满足** 以下条件时，子级 B **不**读 flat `values[B]`，而 **按当前外层 A 行重新执行 Step 2 同一套逻辑**：

1. 外层 repeat 绑定槽 **A**（`repeat.slotId === A`）；
2. 内层 repeat 绑定槽 **B**（`repeat.slotId === B`）；
3. B 的 `dataSource` 为 **similarTo 或 complement**，且 **`targetSlotId === A`**；
4. repeat 上下文里已有 A 的当前项 `{ item: A[i], itemIndex: i }`。

满足时：

```text
resolve B rows = resolveBuiltinCollectionItemsForAnchor(B.config, anchorRow = A[i])
→ 用该数组展开 B 的 self-repeat（本次渲染有效，不写回 payload 作 per-row 真源）
```

不满足时：**回退** Step 2，读 `values[B]` 整槽默认。

### 4.2 触发条件（判定表）

| 条件 | 行为 |
|------|------|
| 内层 repeat.slotId = B，B 策略 similarTo/complement，target = A，且处于 A 第 i 行上下文 | **per-row 逻辑重算** B（锚 = A[i]） |
| 内层 repeat.slotId = B，B 为常规列表 | 读 `values[B]` |
| 内层 repeat.slotId = B，B 指向 A 但模板未嵌在 A repeat 行内 | 读 `values[B]`（Step 2 默认预览） |
| 内层用 itemPath 绑 A 的子 collection | **沿用现有 itemPath**，不走本 Step（已是 per-row 数据路径） |

### 4.3 设计要点（不改绑定交互）

- **真源仍在 payload.slots**：B→A 关系不在 template.repeat 上重复声明。
- **不落盘 per-row values**：动态结果仅在当次 `buildRepeatPreviewModel` → 逐 ref merge 产生；发信时再算，不依赖编辑期缓存。
- **复用 Step 2 纯函数**：Step 3 只负责提供 **anchor 来源**（repeat context），不复制算法。
- **通用扩展点**：`resolveCollection(slotId, payload, context?)` 中 `context.anchorRow` 可由 repeat、visibility、未来其它场景注入；similarTo/complement 仅为首批策略。
- **repeat 基础设施**：`RepeatRuntimeContext`（`slotId`、`itemIndex`、`item`）在展开 A 时已存在；Step 3 在 `resolveRepeatItemsForExpansion` 内读取。

### 4.4 主要改动点（代码指针）

| 能力 | 路径 | 改动 |
|------|------|------|
| 派生列表判定 + 读 slot 策略 | 新建如 `src/lib/derivedCollectionResolve.ts` | `isTargetDerivedCollection`、读 slots[B] |
| 带 context 的统一入口 | `src/lib/resolveBuiltinCollectionItems.ts` | `resolveCollectionForContext(slotId, payload, context?)` |
| 展开时 per-row 重算 | `src/lib/repeatRegion.ts` · `resolveRepeatItemsForExpansion` | target=A + 有 A 上下文 → 调 ForAnchor |
| 预览 | `App.tsx`、`buildPreviewPayload` | 已走 expand；保持与发信管道一致 |
| 发信/集成 | 文档 + 接入示例 | 明确要求：发信须 expand + merge，且传入**当次** values |

**不在 Step 3 影响面**：Inspector 列表绑定向导、`RepeatRegionBindModal`、itemPath 子列表、物化/解除绑定。

### 4.5 Step 3 验收场景（浏览器 + 单测）

**模板结构：**

```text
layout-outer  repeat → A（商品列表）
  └─ layout-inner  repeat → B（商品列表，B 配置相似品 target=A）
       └─ 行模板字段映射 B 的 name / imageSrc …
```

**数据：**

- `values[A]` 至少 2 项（可区分 SPU）。
- B 配置 similarTo，targetSlotId = A。
- mock：锚不同 SPU 时 B 首位商品不同。

**期望：**

- 第 1 组 A 克隆下，B 与「锚 = A[0]」一致；第 2 组与「锚 = A[1]」一致；两组 B **不相同**；
- 变量面板里 B 仍显示 Step 2 整槽默认（锚 A 首项）——与画布嵌套预览可以不同，属预期；
- **发信模拟**：仅替换 `values[A]` 为另一份数组，不改 slots/template，per-row B 随新 A **整体变化**（证明是逻辑重算而非快照）；
- 解除 A 绑定物化后，行为与 Step 1 一致，无硬错误。

### 4.6 Step 3 完成标准

- 嵌套 A→B（B target=A）在**预览与发信管道** per-row 正确。
- 非嵌套 / 常规 B / itemPath 子列表 **行为不退化**。
- 单测：同一 template+slots，两档 `values[A]` → 两档不同的 expand 结果。
- `npm run validate:all` 全绿。

---

## 5. 与「itemPath 子列表」路线对比

| 路线 | A/B 是否独立顶层变量 | per-row | 逻辑值 | 说明 |
|------|---------------------|---------|--------|------|
| **本计划 Step 2 + Step 3** | ✅ | ✅ | ✅ slots 声明 + 运行时重算 | 两变量 + 循环联动 + 发信可刷新 |
| **A.itemFields 嵌 similarProducts + itemPath** | B 非独立变量 | ✅ | 数据在 A[i] 内 | 今天已有，模型不同 |
| **仅 Step 2** | ✅ | ❌ | 半套（仅整槽 B） | 不够交付 |

本计划选用 **独立变量 A/B + 派生逻辑 + repeat 感知赋值**，与 Step 1 block 模型一致，且符合企业级「存关系、发信重算」。

---

## 6. 执行顺序（源头 → 派生 → 消费 → 验证）

### Phase A — Step 2（变量层 · 逻辑声明）

1. mock：catalog 增「相似品」「搭配品」商品。
2. 契约：排序 + targetSlotId；similarTo/complement；**禁止** extract/anchorItemIndex 持久化；validate fail。
3. 解析：抽出 `ForAnchor` / `resolveCollectionForContext`；`applyBuiltinCollectionResolves` 写整槽预览。
4. UI：合并排序选择器 + 目标列表。
5. 迁移（已完成）：`data/emails/**` extract → sort+target；`migrate:builtin-extract-to-sort-policy:write`（一次性）。
6. 测试 + 变量面板浏览器验收。

### Phase B — Step 3（赋值层 · 运行时重算）

7. 文档化 Derived Collection + repeat context 契约；实现判定 helper。
8. `resolveRepeatItemsForExpansion`：per-row 调 `ForAnchor`。
9. 单测：两档 A 输入 → expand 结果不同；证明非快照。
10. 浏览器：嵌套 repeat 画布 + **改 values[A] 后预览刷新**（逻辑跟随）。
11. 更新 **`easy-email-payload-contract`** 技能与 `src/payload-contract/`：增补「派生列表逻辑值」「预览/发信共用管道」说明（若需）。
12. 接入文档/示例：发信方须 expand + merge，传入当次 values。

**Phase B 依赖 Phase A**（须先有 target 策略与 `ForAnchor` API）。

---

## 7. 影响面汇总

### Step 2

- 契约：`collection-builtin-sort-policy.ts`、`validate.ts`、`collection-data-source.ts`（**无** payload `extract`）
- 解析 + mock：`resolveBuiltinCollectionItems.ts`（`listDerivedSortTargetSlotIds`）、`builtinProductListResolve.ts`、`builtinCollectionCatalog.ts`
- UI：`CollectionVariablePanel.tsx`、`BuiltinCollectionRulesFields.tsx`、`CollectionDataSourceBindModal.tsx`
- 数据迁移 + **`src/payload-contract/`** / 相关技能

### Step 3

- 解析：`repeatRegion.ts`、`resolveBuiltinCollectionItems.ts`（共用 ForAnchor / ForContext）
- 可选：`derivedCollectionResolve.ts`
- 测试：`repeatRegion.test.ts`、`resolveBuiltinCollectionItems.test.ts`、双档 payload 集成测
- 预览/发信：`App.tsx` 链路；集成 API 文档补充发信管道要求

---

## 8. 风险

| 风险 | 缓解 |
|------|------|
| B 依赖 A 拓扑序 | 沿用 `topologicalBuiltinSlotOrder` |
| 弃用 anchorItemIndex | 迁移脚本 + 单测覆盖 `referral-friend-joined` 等 |
| Step 3 与 itemPath 子列表混淆 | 判定表：有 itemPath 走现有分支 |
| 误把 `values[B]` 当 per-row 真源 | 文档 §2.4 + 真源文档；代码注释 |
| mock 无法区分两档 anchor | Step 3 验收前扩展 mock |
| 性能（每 A 行现场算 B） | expand 内 memoize `(slotId, anchorKey)` |
| 变量面板 B 与嵌套画布 B 不一致 | 文档说明：面板=整槽默认，画布嵌套=per-row 重算 |
| 发信方只 merge 不 expand | 接入文档明确要求完整管道 |

---

## 9. 总完成标准（Step 2 + Step 3 一并交付）

- [x] B 在 `slots` 声明「相似品/搭配品 → A」**逻辑关系**；无 extract/anchorItemIndex 持久化残留（读盘 fail）。
- [x] 变量面板：B 整槽预览随策略/目标变化（**非 per-row 真源**；`CollectionVariablePanel` + builtin 解析）。
- [x] 父 repeat A + 子 repeat B（B target=A）：画布**每次预览** per-row 正确（`shouldResolveDerivedCollectionPerRow` + `repeatItemResolve`；浏览器抽检 step23x2 已通过，见 `docs/step2-浏览器验收-bugs.md`）。
- [ ] **发信模拟**：不改 slots/template，仅换发信 `values[A]`，per-row B 整体更新（逻辑重算，非快照）— 需对接方走完整 merged/预览管道验收。
- [x] itemPath 子列表、常规 B、非嵌套 B 行为不退化（`repeatNestedBinding` / `repeatRegion.derived` 单测）。
- [x] 预览与发信文档化**同一解析管道**（`src/repeat-runtime/` + `easy-email-repeat-binding`）；`values[B]` 定位仅为预览回退。
- [x] `npm run validate:all` 全绿；契约/解析/repeat 单测通过。
- [x] 真实相似/搭配算法接入时，仅替换排序计算层；契约、repeat 分支、发信管道不变。
- [x] 落盘 artifact 门禁对称：`payload` / `layout-manifest` PUT 与 `validate:all` 均走 `schema-registry`。
- [x] 区块树 repeat 行展示：`formatRepeatItemDisplayName` 统一命名，展开行不再双重「第 N 项」+「重复 N」pill 叠字。
