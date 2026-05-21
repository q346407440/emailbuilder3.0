# referral-friend-joined · 列表绑定前端走查与交互优化（2026-05-21）

> **模板**：`data/emails/referral-friend-joined/layouts/default/template.json`  
> **区块**：`rfj-picked-spotlight`（主推单品 SPU + SKU 列表）  
> **变量**：`pickedSpotlightProduct`（2 个 SPU，各自 `skus` 子列表）  
> **走查方式**：Chrome DevTools MCP · `http://127.0.0.1:5180`  
> **场景**：模拟「首次绑定」——先 **解除列表绑定**，再 **重绑** 为「父级 + 子级都循环」

与研发向文档 [`referral-friend-joined-列表重复绑定交互优化.md`](./referral-friend-joined-列表重复绑定交互优化.md) 互补：该文档偏契约与 §8 任务表；**本文聚焦浏览器走查 + F1–F13 清单**。

**Agent 行为真源（代码 + 技能，勿在本文重复键表）**：`.cursor/skills/easy-email-repeat-binding/SKILL.md` · `src/lib/repeatMaterializedNormalize.ts` · `src/lib/repeatNestedBinding.ts`。

---

## 1. 走查结论摘要

| 阶段 | 画布 | 区块树 | 顶栏校验 | 结论 |
|------|------|--------|----------|------|
| 绑定前（磁盘已绑） | Aura 5 SKU + Pulse 2 SKU，正常 | `布局列表` / `布局重复` 标签清晰 | 无 | 基线正确 |
| 解除后 | 仍为 2 SPU 物化静态预览（内容保留） | `主推商品卡（第 1/2 项）` 静态 `布局`，SKU 为静态副本 | **14 条** warning（SPU 级 `0.xxx` slotPath） | 无硬错误；校验条过长 |
| 重绑后（向导走完） | **Pulse 区 SKU 图错成 Aura 规格**（见 §3.3） | **2 SPU × 各自 SKU repeat** 结构正确 | **20+ 条**「映射目标区块不存在」 | 拓扑对、映射/预览仍错 |

**一句话**：解除 → 重绑的**树结构**在应用归一化后已能回到「2 SPU × 各自一行 SKU」；当前最大痛点是 **物化态重绑后 `fieldMappings` 仍指向 `*-1` 物化 blockId**，导致校验风暴与画布串图。

---

## 2. 标准操作路径（本次实际执行）

| 步 | 操作 | 界面 |
|----|------|------|
| 1 | 打开 `referral-friend-joined` | 顶栏邮件下拉 |
| 2 | 选中 **主推单品（SPU + SKU 列表）** | 左侧区块树 |
| 3 | Inspector → **列表** | 右侧 Tab |
| 4 | **解除列表绑定** | 列表重复区底部 |
| 5 | **绑定列表重复** | 同上 |
| 6 | 列表变量选 **主推单品 / pickedSpotlightProduct**（勿选精选商品 `pickedProducts`） | 向导步骤 1 |
| 7 | **父级与子级都循环** | 步骤「循环范围」 |
| 8 | 父级行模板：**主推商品卡（第 1 项）** `cell-1` | 步骤「父级列表」 |
| 9 | 父级字段映射：保持默认 SPU 字段映射 | 步骤「父级字段映射」 |
| 10 | 子级列表：**SKU 列表 / skus** | 步骤「子级列表」 |
| 11 | 子级行模板：**SKU 规格列表（第 1 项）** `sku-strip-1`（勿选价格行） | 步骤「子级列表」 |
| 12 | 子级字段映射：SKU 字段 | 步骤「子级字段映射」 |
| 13 | **应用** | 弹窗底部 |

应用层会在写入前执行 `normalizeTemplateBeforeUnifiedRepeatBinding`（`cell-1`→`cell`、折叠 `sku-1-N`→`sku-1`），与 [`referral-friend-joined-列表重复绑定交互优化.md`](./referral-friend-joined-列表重复绑定交互优化.md) §0 一致。

---

## 3. 分阶段现象（交互 vs 缺陷）

### 3.1 解除后（重绑前）

**符合预期**

- 列表 Tab 变为「未绑定」，出现 **绑定列表重复**。
- 区块树变为物化静态树：`主推商品卡（第 1 项）`、`（第 2 项）`，其下各 5 / 2 张 **SKU 规格卡（行模板）** 为静态 `布局`（非 `布局列表`）。
- 画布仍显示 Aura + Pulse 两套 SPU 内容（物化保留预览）。
- **未**在物化 `sku-strip-2` 上误露子级「绑定列表」（`removeUnifiedRepeatBinding` 已修）。

**仍困扰用户（交互表达）**

- 顶栏 **校验提示** 一次性展示 **14 条** warning（`main-img-1`、`name-1` 等 `0.xxx` slotPath），单行极长，用户会以为「解除坏了」。
- 树中同时存在 `sku-1-1` … `sku-1-5` 与第二 SPU 下 `cell-2-sku-1-1` 等 **scoped 物化 id**，技术正确但 **对运营不友好**。

### 3.2 绑定向导（物化态重绑）

**流程可走完**，但有多处 **易误导**：

| 步骤 | 现象 | 类型 |
|------|------|------|
| 父级列表变量 | 默认勾选 **精选商品 `pickedProducts`**，需手动改 **主推单品** | **交互** |
| 父级列表 · 行模板树 | 默认展开 **整棵物化树**（含 5 张 SKU 卡、第二套 cell-2 子树），只能点 `cell-1` | **交互** |
| 父级字段映射 · 左侧字段树 | 仍展示 **SKU 规格卡 1～5** 及图片/链接子字段，与「子级再映射」重复 | **交互** |
| 子级列表 · 行模板 | 默认选中 **主推商品价格行**，应选 **SKU 规格列表 `sku-strip-1`** | **交互** |
| 子级字段映射 | 左侧仍按 **物化 SKU 卡 1～5** 分组，而非单一原型 `sku-1` | **交互** |
| 步骤条 | 5 步 + 无「应用成功」toast；应用后弹窗未自动关闭（校验未过时） | **样式/反馈** |

**说明文案较好**：步骤 2 起有 live region「将按主推单品生成 2 行；每行内再按 SKU 列表生成最多 5 项」——建议保留并前置到步骤 1。

### 3.3 重绑应用后

**结构正确（区块树）**

- `rfj-picked-spotlight` → `布局列表`
- `主推商品卡（第 1/2 项）` → `布局重复1/2`
- 各自 `SKU 规格列表` → `布局列表`；`SKU 规格卡（行模板）` → `布局重复1…5`（Aura）/ `1…2`（Pulse）

**预览/校验异常（需修）**

- 顶栏校验变为多条 **「映射目标区块 `rfj-picked-spotlight-main-img-1` 不存在」** 等——因 `fieldMappings` 仍引用物化 id，归一化后真实 id 为 `main-img`、`sku-1-img` 等。
- 画布 **Pulse** 下 SKU 横向条出现 **Aura 的「曜石黑」重复**，与 Pulse「42mm 星空灰/玫瑰金」不符——与上述映射失配一致。

---

## 4. 交互流程优化建议（按优先级）

> 原则：不新增「软/硬解除」「恢复上次绑定」「按模块预选变量」；沿用 `removeRepeatRegionBinding` 物化契约。

### P0 — 不改会「绑上了但预览/校验仍错」

| ID | 建议 | 说明 | 建议改动 |
|----|------|------|----------|
| F1 | **物化态重绑时重写 `fieldMappings.targetBlockId`** | 应用归一化时同步把 `main-img-1`→`main-img`、`sku-1-img-3`→`sku-1-img` 等 | `applyUnifiedRepeatBinding` / 归一化与 `fieldMappings` 同步 |
| F2 | **同模块多列表变量时默认选中「与当前区块语义一致」的变量** | 打开向导勿默认 `pickedProducts` | `RepeatRegionBindModal`：按 host 区块名/已有 binding 回显 `pickedSpotlightProduct` |
| F3 | **父级字段映射树隐藏 `skus` 子树** | 父级只映 SPU 标量；SKU 仅在子级步骤出现 | `filterParentRepeatMappingTargets` + 左侧导航生成 |
| F4 | **子级行模板步骤：默认选中 `sku-strip` 宿主** | 物化态下高亮 `sku-strip-1`，禁用 `sku-1-2…5`、禁用「价格行」 | 已有 `isDisallowedChildRepeatPrototypeOption`，需补 **默认选项** 逻辑 |

### P1 — 显著降低认知负担

| ID | 建议 | 说明 |
|----|------|------|
| F5 | **解除后校验条：折叠 +「物化中间态」** | 14 条 warning 收成「主推区物化中间态（14）」可展开；文案说明「重绑完成后会消失」 |
| F6 | **父级/子级「行模板」树：物化态默认折叠 SKU 子树** | 只展开到 `cell-1` / `sku-strip-1` 一层，避免一屏 5 张 SKU 卡 |
| F7 | **行模板选择展示「原型 id」副标题** | 选中 `cell-1` 时副文案：「应用后将归一为 **主推商品卡 / cell**」 |
| F8 | **子级步骤增加只读摘要** | 「子级循环宿主：SKU 规格列表 · 行模板：SKU 规格卡 · 变量路径：skus」 |
| F9 | **区块树：物化静态行与 repeat 行视觉区分** | 物化 `布局` vs `布局列表` 用不同图标/灰底 |

### P2 — 体验打磨

| ID | 建议 |
|----|------|
| F10 | 统一 **解除列表绑定** / 弹窗 **解除绑定** 文案，并注明「将同时清除子级 skus 循环」 |
| F11 | **应用** 成功 toast；有校验错误时禁止关闭并定位到步骤 |
| F12 | 步骤 4 旁注：「已选父+子循环时，子级映射不可跳过」 |
| F13 | 列表变量表、映射表 **长 URL ellipsis** + `title` 全文 |

---

## 5. 纯样式 / 展示层问题（与流程弱相关）

| ID | 现象 | 建议 |
|----|------|------|
| S1 | 顶栏校验 **单行撑满**，无法扫读 | 最高 3 行 +「展开全部 (N)」+ 按 `rfj-picked-spotlight` 分组 |
| S2 | 绑定向导 **双列表头**「选择/名称/标识」在窄屏下挤 | 弹窗最小宽度或列可横向滚动 |
| S3 | 物化 blockId（`rfj-picked-spotlight-cell-2-sku-1-1`）**换行顶开表格** | 标识列 `ellipsis` + hover 展示全名 |
| S4 | Inspector 列表卡片「2 项」「1–2 项」**重复感** | 合并为「2 项（目录 1–2）」 |
| S5 | 步骤导航 5 步 **无完成态勾选** | 已完成步骤显示 ✓ |

---

## 6. 与已实现代码的关系（2026-05-21 已落地）

| ID | 建议 | 实现状态 | 代码/组件 |
|----|------|----------|-----------|
| F1 | `fieldMappings` 随归一化 | **已完成** | `remapRepeatFieldMappingTargets` |
| F2 | 默认 `pickedSpotlightProduct` | **已完成** | `pickRepeatCollectionCandidateForHost` |
| F3 | 父级映射藏 SKU 子树 | **已完成** | `filterParentRepeatMappingTargets` |
| F4 | 子级默认 `sku-strip` | **已完成** | `preferredChildRepeatPrototypeOptionKey` |
| F5 | 校验条折叠 + 物化中间态 | **已完成** | `ValidationIssuesBanner` |
| F6 | 物化树默认折叠 SKU | **已完成** | `defaultExpandedRepeatPrototypePickerBranches(..., template)` |
| F7 | 原型 id 副文案 | **已完成** | `repeatPrototypePickerCanonicalHint` |
| F8 | 子级只读摘要 | **已完成** | `RepeatRegionBindModal` |
| F9 | 区块树物化「静态」 | **已完成** | `BlockTree` |
| F10–F13、S1–S5 | 文案 / toast / 步骤 ✓ / ellipsis 等 | **已完成** | `Inspector`、`RepeatRegionBindModal`、`app.css` |

走查时已验证、此前已修（无需再立项）：解除后 `sku-strip-*` 不暴露子级绑定；多 SPU scoped id；解除后无 parentId 硬错误；重绑后 repeat 拓扑 2×(5+2)。

**技能索引**：`easy-email-repeat-binding`（与 [`列表重复绑定交互优化.md`](./referral-friend-joined-列表重复绑定交互优化.md) §0、§8 同步）。

---

## 7. 回归（改 lib/UI 后必跑）

```bash
npm run test:unit -- src/lib/repeatNestedBinding.test.ts src/lib/repeatRegion.test.ts
npm run validate:all
```

浏览器：本文 §2 路径；技能 **`easy-email-frontend-chrome-verify`** · 确认 Pulse 区 2 个 Pulse SKU、无「映射目标区块 *-1 不存在」类错误。

---

## 8. 附录：关键截图与校验原文（节选）

**解除后校验（14 条 warning，节选）**  
`collection 列表项字段（带数字下标的 slotPath）只能写在列表重复行模板内…`  
涉及 `main-img-1`、`name-1`、`sale-1` 等（SPU 物化行）。

**重绑后校验（节选）**  
`映射目标区块「rfj-picked-spotlight-main-img-1」不存在`  
`映射目标区块「rfj-picked-spotlight-sku-1-img-3」不存在`  
…（父级 repeat 与子级 `sku-strip.repeat` 的 fieldMappings 均可能受影响）

---

*走查日期：2026-05-21 · MCP：`user-chrome-devtools` · 本地 `npm run dev:all`（5180 + 8787）· F1–F13 实现状态于同日写入 §6，并与技能 `easy-email-repeat-binding` 对齐。*
