# referral-friend-joined · 嵌套列表重复绑定交互优化建议

> **场景**：`data/emails/referral-friend-joined/layouts/default/template.json`  
> **区块**：`rfj-picked-spotlight`（主推单品 SPU + SKU 列表）  
> **变量**：`payload.slots.pickedSpotlightProduct`（2 个 SPU，每项含 `skus` 子列表）  
> **走查目的**：模拟 **首次绑定**（解除已有绑定 → 再走绑定向导），非「恢复上次配置」专用流程  
> **验收方式**：Chrome DevTools MCP 走查本地编辑器 `http://127.0.0.1:5180`（2026-05-21）；代码回归见 `repeatNestedBinding.test.ts`

---

## 0. 实现状态速览（与文档同步）

| 项 | 状态 | 代码入口 |
|----|------|----------|
| 嵌套解除后物化 `sku-strip-*` 误露子级「绑定列表」 | **已修复** | `removeUnifiedRepeatBinding` → 对物化根整棵子树 `clearRepeatsInSubtree` |
| 物化态重绑：`cell-1`→`cell`、删 `cell-2`、折叠 `sku-1-1…5`→`sku-1` | **已修复** | `normalizeTemplateBeforeUnifiedRepeatBinding`（`applyUnifiedRepeatBinding` 入口自动调用） |
| 子级 repeat 宿主/行模板误选（strip 当行模板、误选 `sku-1-img`） | **已修复（应用时纠正）** | `resolveChildRepeatBindTargets` + `repeatRowTemplateChildId` |
| 物化 id 解析（`sku-1` 不被误判为 `sku` 的物化行） | **已修复** | `isMaterializedRepeatRowBlockId` / `parseMaterializedRepeatRowBlockId`（`repeatRegion.ts`） |
| 解除物化：`parentId` 回写、多 SPU 下 SKU id 去重、嵌套 `skus.*` 绑定剥离 | **已修复** | `repeatRegion.ts`（`scopeMaterializedSubtreeBlockId`、`reconcileBlockParentIdsFromChildren`、`finalizeMaterializedStaticBlock`） |
| 子级向导：禁止选物化 SKU 第 2+ 项副本 | **已修复** | `isDisallowedChildRepeatPrototypeOption` → `listChildRepeatPrototypeOptions` |
| **物化态重绑：`fieldMappings.targetBlockId` 随归一化** | **已修复** | `remapRepeatFieldMappingTargets`（`repeatMaterializedNormalize.ts`） |
| 绑定向导：默认 `pickedSpotlightProduct`、子级默认 `sku-strip`、父级映射藏 SKU 树 | **已修复** | `pickRepeatCollectionCandidateForHost`、`preferredChildRepeatPrototypeOptionKey`、`filterParentRepeatMappingTargets` |
| 顶栏校验条折叠、物化中间态 warning 汇总 | **已修复** | `ValidationIssuesBanner.tsx` |
| 物化行模板树默认折叠、原型 id 副文案、步骤 ✓、toast、区块树「静态」标签等 | **已修复** | `RepeatRegionBindModal.tsx`、`BlockTree.tsx`、`Inspector.tsx`、`app.css` |

自动化回归（已实现）：

- `applyUnifiedRepeatBinding 物化态重绑归一化：2 SPU × 各自一行 SKU`
- `applyUnifiedRepeatBinding 物化态重绑时 fieldMappings 的 targetBlockId 随归一化`

Agent 索引技能：**`.cursor/skills/easy-email-repeat-binding/SKILL.md`**（`npm run sync:claude` 镜像至 `.claude/skills/`）。

---

## 1. 实测操作流程（复现路径）

### 1.1 目标

对 **父级 layout 容器** `rfj-picked-spotlight`：

1. **解除** 已有列表绑定（`pickedSpotlightProduct`）
2. **重新绑定** 同一变量，并配置 **父级 + 子级都循环**（2 个 SPU × 各自 `skus`）

### 1.2 推荐操作路径（当前产品）

| 步骤 | 操作 | 界面位置 |
|------|------|----------|
| 1 | 打开模板 `referral-friend-joined` | 顶栏邮件下拉 |
| 2 | 选中 **主推单品（SPU + SKU 列表）** | 左侧树 |
| 3 | Inspector → **列表** 子 Tab | 右侧 |
| 4 | **解除列表绑定** | 列表重复区底部 |
| 5 | **绑定列表重复** | 同上 |
| 6 | 自行选择列表变量 **主推单品 / pickedSpotlightProduct**（勿误选 `pickedProducts`） | 父级列表变量表 |
| 7 | 向导第 1 步：**父级与子级都循环** | 循环范围 |
| 8 | 父级行模板：向导里可能只能点 **主推商品卡（第 1 项）** `cell-1`；点 **应用** 后会归一为原型 `cell` | 父级列表 |
| 9 | 父级字段映射：SPU 标量字段 | 父级字段映射 |
| 10 | 子级：`skus`；行模板可选 **SKU 规格列表（第 1 项）** `sku-strip-1`；**应用** 后归一为 `sku-strip` + 行模板 `sku-1` | 子级列表 |
| 11 | 子级字段映射 | 子级字段映射 |
| 12 | **应用** | 弹窗底部 |

> **说明**：步骤 8–10 在向导里仍可能显示物化 id（`cell-1`、`sku-strip-1`）；界面会提示「应用后将归一为 …」。**写入模板前** `applyUnifiedRepeatBinding` 会执行归一化并重写 `fieldMappings`（见 §0、技能 `easy-email-repeat-binding`）。

### 1.3 浏览器走查结论（2026-05-21，修复前 UI 态）

以下为 **归一化代码落地前** 的 MCP 走查记录，用于保留交互痛点；**应用绑定后的结构异常** 已由 §0 自动化回归覆盖。

| 维度 | 走查时（修复前） |
|------|------------------|
| 解除绑定 | 可完成；物化静态树保留 |
| 解除后 | `sku-strip-2` 曾误露子级「绑定列表」（**已修**）；校验仍约 58+ 条（`parentId` / `slotPath` 等，**仍待办**） |
| 解除后画布 | Aura 下出现 Pulse 规格图等 **串组**（物化残留，**仍待办**） |
| 重绑向导 | 5 步可走完；解除后重绑时变量 **锁定回显**（合理） |
| 重绑后（修复前） | 树膨胀：单 SPU 下多份 SKU 列表 repeat；末尾多出静态 **cell-2**（第 2 个 SPU）；画布 SKU 行过多 |

### 1.4 修复后预期（当前代码 + 单元测试）

| 维度 | 修复后 |
|------|--------|
| 父级 repeat | `prototypeChildIds: [rfj-picked-spotlight-cell]`；宿主下仅 **1** 个行模板子节点 |
| 子级 repeat | 宿主 `rfj-picked-spotlight-sku-strip`，`itemPath: skus`，行模板 `rfj-picked-spotlight-sku-1` |
| 展开 | **2** 个 SPU；Aura 横向 strip **5** SKU；Pulse strip **2** SKU |
| 末尾静态 `cell-2` | **删除**（`pruneParentHostMaterializedSiblings`） |

### 1.5 曾出现的画布异常根因（便于对照 diff）

**「像 1 个 SPU、多行 SKU」**（修复前）：

- 用户在物化态把 **`sku-strip-1` 整段 layout** 当成子级「行模板」，或父级行模板用了 **`cell-1` 且其下已有 5 张物化 SKU 卡**；
- `applyUnifiedRepeatBinding` 在物化副本上再叠 repeat → 每个 `skus` 项克隆一整条 strip（每条里还有物化卡），画布变成多行。

**「末尾多 1 个 SPU + 2 个 SKU」**（修复前）：

- 解除父级后 `spotlight.children = [cell-1, cell-2]`；
- 重绑只认 `cell-1` 为行模板时，`buildRepeatHostExpandedChildren` 把 **`cell-2` 留在 after 静态兄弟**，未进入 repeat → 多出一套 Pulse 静态卡。

**正确心智（磁盘真源）**：1 个 SPU → 1 张商品卡 → **1 条横向** `sku-strip` → repeat 复制 **1 张** `sku-1` 规格卡最多 5 次。

---

## 2. 交互流程问题（非纯样式）

### 2.1 解除绑定后的校验风暴与预览错乱（P0）——对照既有契约，非新产品形态

**现象**：解除后、重绑完成前：顶栏大量校验；画布物化静态树可能 **串组**；树中多份「第 N 项」副本。

**既有约定（不新增第二套解除语义）**：

`removeRepeatRegionBinding`：有 N 项 payload → 物化为 N 组静态子树，保留内容与 collection 下标绑定；空数组 → `fallbackChildIds`。嵌套走 `removeUnifiedRepeatBinding`：父级物化 + 子树清 `repeat`（不删块）。

**研发状态**：

| 子项 | 状态 |
|------|------|
| 物化 `sku-strip-1/2` 不再误露子级「绑定列表」 | **已修复**（`repeatNestedBinding.test.ts`「嵌套主推区物化后 sku-strip 无 repeat」） |
| 物化态 **重绑** 归一化（§1.5） | **已修复**（`repeatMaterializedNormalize.ts`） |
| 解除时修 `parentId`、剥离静态行 collection `slotPath`（§2.8） | **待办** |

**交互侧仍可改进（不改解除语义）**：

- 校验条按模块折叠（§3.1）；
- 解除后存在结构性错误时，Inspector 弱提示：「当前为解除后的展开副本，请完成重绑或放弃未保存更改」。

### 2.2 绑定弹窗默认勾选第一项列表变量（P1，通用交互）

**现象**：从未绑定打开弹窗时，默认勾选表中第一项（本模板为 `pickedProducts`），非 `pickedSpotlightProduct`。

**约束**：须兼容任意自定义 collection；**不做**按模块上下文预选变量。

**建议**：表头强调「请确认列表变量与当前模块一致」；或默认不勾选、强制显式选择。  
**已解除待重绑** 时变量锁定回显 — 宜保留。

### 2.3 嵌套「首次绑定」向导：步骤多、父级映射树噪音（P1）

**现象**：5 步向导；父级列表/映射步仍展示整棵物化 SKU 子树；父级映射表混有 `skus.*` 字段。

**建议（待办 UI）**：

1. 父级映射步左侧树 **隐藏** `SKU 规格列表` 及以下（`parentScalarItemFieldsFromItemFields` 已有，UI 未对齐）。
2. 子级列表步示意图 + **仅允许选 repeat 宿主**（应用层已纠正 strip/行模板，向导树仍可误点）。
3. ~~物化态重绑归一化~~ → **已在应用时自动归一化**；可选增强：向导树 **展示原型 id** 并默认选中（`cell` 而非 `cell-1`）。
4. 仅父级循环时避免「不循环「」」」空文案。

### 2.4 子级行模板选择容易误选（P0 流程 / 部分已缓解）

**现象**：子级步同时有「规格列表宿主」「规格卡」「物化 sku-1-N 副本」。

| 层面 | 状态 |
|------|------|
| 应用绑定时宿主=`sku-strip`、行模板=`sku-1` | **已实现**（`resolveChildRepeatBindTargets`） |
| 向导仅允许选宿主、禁止选物化副本 | **待办**（`RepeatRegionBindModal`） |

### 2.5 Inspector 与子级宿主的信息分工（P1）

选中子级宿主时的只读提示合理；建议摘要 `skus · 最多 N 项 · 行模板：SKU 规格卡`，按钮 **「编辑 SPU+SKU 整体绑定」** — **待办**。

### 2.6 双入口「解除绑定」文案不一致（P2）

Inspector「解除列表绑定」vs 弹窗「解除绑定」— 建议统一并说明会清除子级 `skus` — **待办**。

### 2.7 区块树命名：双重「第 N 项」（P1）— **已修复**

重绑/展开后曾出现 `（第 1 项）（第 1 项）`、名称与「重复 N」pill 叠字。现由 `repeatRegionTreeTags.formatRepeatItemDisplayName` 统一去重后缀；虚拟展开行仅在名称中带「第 N 项」（第 1 项不加），不再额外显示 repeat-item pill。

### 2.8 解除后物化副本上的 collection 绑定未清理（P0，研发，**已修复**）

物化块曾带 `0.skus.N.*` 类 `slotPath`，校验报 collection 与图片/文本类型不兼容；多 SPU 时 `sku-1-1` 等 id 互相覆盖导致 `parentId` 错乱。

**已实现**：`scopeMaterializedSubtreeBlockId`（第二组 SPU 用 `cell-2-sku-1-1` 等）、`reconcileBlockParentIdsFromChildren`、`finalizeMaterializedStaticBlock`（仅剥离嵌套 `skus` 下标绑定，SPU 级 `0.xxx` 保留）。解除后硬错误 **0** 条，约 14 条 warning（SPU 级 `0.xxx`，与 `row-1` 单测行为一致）。

---

## 3. 纯样式 / 展示层优化（与流程弱相关）

### 3.1 校验提示条

最高 3 行 +「展开全部 (N)」、按 `rfj-picked-spotlight` 分组；解除/重绑中间态用 `warning` — **待办**。

### 3.2 绑定向导

步骤 4 旁注「可能跳过子级映射」；URL ellipsis；循环范围卡片式；父级列表步物化树默认折叠 SKU — **待办**。

### 3.3 Inspector 列表卡片

业务名主标题、合并「2 项（目录 1–2）」— **待办**。

### 3.4 区块树

物化静态行与 repeat 展开行样式区分 — **待办**。

### 3.5 弹窗关闭与反馈

应用成功 toast；有结构错误时留在当前步并提示 — **待办**。

---

## 4. 数据模型与 UI 对齐（给研发的对照）

当前磁盘真源（节选）：

```text
rfj-picked-spotlight          repeat → pickedSpotlightProduct（SPU，min 1 max 2）
  └ rfj-picked-spotlight-cell   行模板（prototype）
       └ rfj-picked-spotlight-sku-strip   repeat → itemPath: skus（SKU，横向）
            └ rfj-picked-spotlight-sku-1    行模板（prototype，仅 1 张规格卡）
```

用户心智：

```text
列表变量 pickedSpotlightProduct
  ├─ 第 1 个 SPU（Aura）→ skus[] 最多 5 个规格（同一行）
  └─ 第 2 个 SPU（Pulse）→ skus[] 2 个规格
```

**说明**：落盘 **没有** `rfj-picked-spotlight-sku-strip-2`；`sku-strip-2`、`*-cell-2`、`*-sku-1-2` 等为 **解除父级绑定后物化** 的副本。父+子合一绑定时，原型 `sku-strip` 上 `repeat.itemPath: skus` 合法，**不是**第二套独立绑定入口。

---

## 5. 建议优先级汇总

### 已实现（2026-05-21）

| 优先级 | 项 | 位置 |
|--------|-----|------|
| P0 | 嵌套解除后清物化子树内子级 `repeat` | `repeatNestedBinding.ts` → `removeUnifiedRepeatBinding` |
| P0 | 物化态重绑归一化 + 删多余 `cell-2` + 子级宿主/行模板纠正 | `repeatMaterializedNormalize.ts` |
| P0 | 物化 id 识别（`sku-1` 不等于物化行 `sku`） | `repeatRegion.ts` |
| P0 | 自动化回归：物化态重绑 → 2 SPU × 各自一行 SKU | `repeatNestedBinding.test.ts` |
| P0 | 解除物化：`parentId` 回写、多 SPU SKU id 作用域、嵌套 `skus.*` 绑定剥离 | `repeatRegion.ts` |
| P0 | 子级向导过滤物化 SKU 第 2+ 项 | `repeatNestedBinding.ts` |

### 已实现（2026-05-21 · 绑定向导与校验 UI，见走查文档 F1–F13）

| 优先级 | 项 | 位置 |
|--------|-----|------|
| P0 | `fieldMappings` 物化 id → 原型 id | `repeatMaterializedNormalize.ts` |
| P1 | 默认列表变量、父级映射藏 SKU 子树、子级默认 sku-strip | `repeatNestedBindingUi.ts`、`Inspector.tsx`、`filterParentRepeatMappingTargets` |
| P1 | 顶栏校验折叠、物化中间态汇总 | `ValidationIssuesBanner.tsx` |
| P1 | 物化行模板树默认折叠、原型副文案、子级摘要 | `RepeatRegionBindModal.tsx`、`repeatNestedBinding.ts` |
| P1 | 区块树物化「静态」标签 | `BlockTree.tsx` |
| P2 | 解除文案统一、应用 toast、步骤 ✓、ellipsis | `Inspector.tsx`、`RepeatRegionBindModal.tsx`、`app.css` |

### 仍待办（可选后续）

| 优先级 | 类型 | 项 |
|--------|------|-----|
| P1 | 流程 | 区块树展开后双重「第 N 项」展示规则（`repeatRegionTreeTags`） | 已完成 |
| P1 | 体验 | 解除后画布串组（物化预览数据）需产品决策是否再优化 |

**明确不做**：

- 按模块上下文预选 collection；  
- 「恢复上次绑定」一键；  
- 软/硬解除或画布「未绑定」遮罩（与现有物化契约冲突）。

---

## 6. 附录：回归清单

### 6.1 解除后（重绑前）

- 父级 Inspector：普通「布局」；`sku-strip-2` **无**子级「绑定列表」入口（**已通过**）。
- 画布可能仍串组；校验仍多（**待办 §2.8**）。

### 6.2 物化态重绑后（`applyUnifiedRepeatBinding` + 归一化，当前代码）

- `rfj-picked-spotlight.repeat.prototypeChildIds` → `[rfj-picked-spotlight-cell]`。
- 无 `cell-2` 块；`sku-strip.repeat.itemPath` → `skus`，`prototypeChildIds` → `[rfj-picked-spotlight-sku-1]`。
- `buildRepeatPreviewModel`：2 个 SPU 行；Aura strip 5 SKU；Pulse strip 2 SKU。

### 6.3 建议自动化回归命令

```bash
npm run test:unit -- src/lib/repeatNestedBinding.test.ts
npm run validate:all
```

```text
A. 干净模板：首次 parentAndChild + skus → 2 SPU × 各自 SKU 数与 payload 一致
B. 解除：removeUnifiedRepeatBinding → 物化 sku-strip 无 repeat
C. 物化态重绑：cell-1 + sku-strip-1 计划 → 拓扑同 A（单测已覆盖 C）
```

---

## 7. 相关代码入口

| 模块 | 路径 |
|------|------|
| 物化 id 解析 | `src/lib/repeatRegion.ts`（`isMaterializedRepeatRowBlockId`、`parseMaterializedRepeatRowBlockId`、`resolveMaterializedRowToPrototypeId`） |
| **物化态重绑归一化 + fieldMappings 重写** | `src/lib/repeatMaterializedNormalize.ts`（`normalizeTemplateBeforeUnifiedRepeatBinding`、`remapRepeatFieldMappingTargets`） |
| 顶栏校验展示 | `src/components/ValidationIssuesBanner.tsx` |
| 向导 UI 辅助 | `src/lib/repeatNestedBindingUi.ts` |
| Agent 技能索引 | `.cursor/skills/easy-email-repeat-binding/SKILL.md` |
| 嵌套解除 / 重绑 | `src/lib/repeatNestedBinding.ts`（`removeUnifiedRepeatBinding`、`applyUnifiedRepeatBinding`） |
| 解除物化 | `src/lib/repeatRegion.ts`（`removeRepeatRegionBinding`） |
| Inspector 列表 Tab | `src/components/Inspector.tsx` |
| 绑定向导弹窗 | `src/components/RepeatRegionBindModal.tsx` |
| 已绑定摘要 | `src/components/RepeatRegionInspectorSummary.tsx` |
| 测试 | `src/lib/repeatNestedBinding.test.ts`、`src/lib/repeatRegion.test.ts` |
| 样式 | `src/app.css` |

---

## 8. 迭代任务清单（Cursor / 人工可勾选）

> 状态与 §5 同步；完成一项即在表中改为 **已完成** 并跑 `npm run validate:all`。

| ID | 优先级 | 任务 | 主要文件 | 验收标准 | 状态 |
|----|--------|------|----------|----------|------|
| T1 | P0 | 解除物化：`parentId` 按 children 回写；多 SPU 时 SKU 块 id 加 `cell-N-` 作用域避免覆盖 | `repeatRegion.ts` | 解除 `rfj-picked-spotlight` 后 **0** 条 `parentId`/环硬错误；单测 `removeUnifiedRepeatBinding 嵌套主推区物化后 parentId…` 通过 | **已完成** |
| T2 | P0 | 物化静态行剥离嵌套 `skus.N.*` collection 绑定（保留 SPU 级 `0.xxx` 与预览值） | `repeatRegion.ts` | 解除后无 `sku-1-img`/`sku-1-title` valueType 硬错误；`row-1` 仍保留 `0.title` 绑定（`repeatRegion.test`） | **已完成** |
| T3 | P0 | 子级绑定向导：过滤物化 SKU 第 2+ 项选项 | `repeatNestedBinding.ts` | `listChildRepeatPrototypeOptions` 不含 `sku-1-2`… 作行模板；重绑仍走 `resolveChildRepeatBindTargets` | **已完成** |
| T4 | P1 | 父级映射树隐藏 SKU 子树；子级映射下拉仅 `skus.*` | `filterParentRepeatMappingTargets` + `RepeatRegionBindModal` | 父级步骤不见 `skus` 下钻 | **已完成** |
| T5 | P1 | 物化态展示原型 id 副文案；默认列表变量 | `repeatPrototypePickerCanonicalHint`、`pickRepeatCollectionCandidateForHost` | 打开向导默认 `pickedSpotlightProduct` | **已完成** |
| T6 | P1 | 区块树：避免双重「第 N 项」 | `repeatRegionTreeTags.ts` 等 | 展开后树节点无重复「第 1 项」 | 已完成 |
| T7 | P1 | 顶栏校验条：折叠 + 物化中间态 `warning` | `ValidationIssuesBanner.tsx` | 长列表可展开；物化中间态可汇总 | **已完成** |
| T8 | P2 | 「解除列表绑定」文案统一；应用 toast | `Inspector.tsx`、`RepeatRegionBindModal.tsx` | 含子级 skus 说明；应用成功 toast | **已完成** |
| T9 | P2 | 向导步骤说明、ellipsis、物化树默认折叠 SKU | `RepeatRegionBindModal.tsx`、`app.css` | 子级映射旁注；标识列 ellipsis；物化树默认折叠 | **已完成** |
| T10 | P0 | 物化重绑同步 `fieldMappings.targetBlockId` | `remapRepeatFieldMappingTargets` | 重绑后无「映射目标区块 *-1 不存在」 | **已完成** |

**建议实施顺序**：T1–T5、T7–T10（已完成）→ T6（树标签文案，可选）。

**技能真源**：`.cursor/skills/easy-email-repeat-binding/SKILL.md`（与 §7 代码表同步维护，勿在技能内重复字段键表）。

**回归命令**：

```bash
npm run test:unit -- src/lib/repeatNestedBinding.test.ts src/lib/repeatRegion.test.ts
npm run validate:all
```

浏览器（改 UI 后）：`referral-friend-joined` → `rfj-picked-spotlight` 解除 → 重绑 `pickedSpotlightProduct`（技能 `easy-email-frontend-chrome-verify`）。

---

*文档含 2026-05-21 浏览器走查、归一化/物化/绑定向导 UI 实现说明；§8 任务表与 §0 速览、技能 `easy-email-repeat-binding` 同步维护（2026-05-21 第二轮 UI+F1）。*
