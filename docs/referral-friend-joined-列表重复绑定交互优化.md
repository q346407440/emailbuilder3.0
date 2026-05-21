# referral-friend-joined · 嵌套列表重复绑定交互优化建议

> **场景**：`data/emails/referral-friend-joined/layouts/default/template.json`  
> **区块**：`rfj-picked-spotlight`（主推单品 SPU + SKU 列表）  
> **变量**：`payload.slots.pickedSpotlightProduct`（2 个 SPU，每项含 `skus` 子列表）  
> **走查目的**：模拟 **首次绑定**（解除已有绑定 → 再走绑定向导），非「恢复上次配置」专用流程  
> **验收方式**：Chrome DevTools MCP 走查本地编辑器 `http://127.0.0.1:5180`（2026-05-21，第二轮完整走查）

---

## 1. 实测操作流程（复现路径）

### 1.1 目标

对 **父级 layout 容器** `rfj-picked-spotlight`：

1. **解除** 已有列表绑定（`pickedSpotlightProduct`）
2. **重新绑定** 同一变量，并配置 **父级 + 子级都循环**（2 个 SPU × 各自 `skus`）——用于观察 **首次绑定** 向导体验与嵌套配置是否顺畅

### 1.2 推荐操作路径（当前产品）

| 步骤 | 操作 | 界面位置 |
|------|------|----------|
| 1 | 打开模板 `referral-friend-joined` | 顶栏邮件下拉 |
| 2 | 在区块树选中 **主推单品（SPU + SKU 列表）** | 左侧树 |
| 3 | Inspector → **列表** 子 Tab | 右侧（layout 区块会出现「列表」Tab） |
| 4 | 点击 **解除列表绑定** | 列表重复区底部 |
| 5 | 点击 **绑定列表重复** | 同上 |
| 6 | 在弹窗中 **自行选择** 列表变量 **主推单品 / pickedSpotlightProduct**（勿误选「精选商品列表」） | 父级列表变量表 |
| 7 | 向导第 1 步：**父级与子级都循环** | 循环范围 |
| 8 | 确认父级行模板 = **主推商品卡**（理想为原型 `rfj-picked-spotlight-cell`；解除后物化态下往往只能选 `cell-1`） | 父级列表 |
| 9 | 父级字段映射：SPU 字段 → `imageSrc` / `name` / `salePrice` 等 | 父级字段映射 |
| 10 | 子级列表 = **SKU 列表 / skus**；子级行模板 = **SKU 规格列表** 宿主（理想 `rfj-picked-spotlight-sku-strip`；物化态下常为 `sku-strip-1`） | 子级列表 |
| 11 | 子级字段映射：`imageSrc` / `imageAlt` / `title` / `href` | 子级字段映射 |
| 12 | **应用** | 弹窗底部 |

### 1.3 第二轮走查结论摘要（2026-05-21）

| 维度 | 结果 |
|------|------|
| 磁盘模板（走查前） | `npm run validate:all` **通过**；落盘无 `rfj-picked-spotlight` 相关错误 |
| 解除绑定 | 可完成；物化静态树保留；**物化 `sku-strip-1/2` 不再误露子级「绑定列表」**（`removeUnifiedRepeatBinding` 已修） |
| 解除后校验 | 顶栏仍 **超长单行**（约 58+ 条）：`parentId` 不一致、环检测、静态行上的 `pickedSpotlightProduct[0].*` / `skus.*` 类 `slotPath` |
| 解除后画布 | Aura 主图下出现 **Pulse 规格图** 等串组（与物化残留 + 非法 `parentId` 一致） |
| 重绑向导 | **5 步可走完**；循环范围预览正确（「2 行 SPU × 每行最多 5 SKU」）；重绑入口下父级列表变量 **已锁定回显**（「进入绑定时已确定，不可更换」） |
| 重绑后 Inspector | 父级 **已绑定** `pickedSpotlightProduct`；行模板显示 **主推商品卡（第 1 项）**（物化 id，非原型 `cell`） |
| 重绑后区块树 | **严重异常**：`主推商品卡（第 1 项）（第 1 项）`；其下出现 **5 个** `SKU 规格列表（第 1 项）（第 1–5 项）· 布局重复1–5`，每份下再挂 5 张规格卡；第 2 个 SPU 仍为 **普通布局** `主推商品卡（第 2 项）`，子级 SKU 区 **无** repeat |
| 重绑后画布 | 第 1 个 SPU 下 **大量重复 SKU 行**（含跨 SPU 图混排）；第 2 个 SPU（Pulse）仅 **2 个 SKU**，相对正常；整体 **未** 恢复为磁盘真源「2 SPU × 各自 skus」 |
| 重绑后校验 | 仍 **刷屏**（`parentId`、`slotPath`、collection 类型不兼容、`itemFields` 未声明 `title` 等） |

**走查路径说明**：本轮为 **解除 → 在物化树上重绑**（模拟用户未刷新、未从磁盘还原的中间态），**不是**从干净 `template.json` 直接点「绑定列表重复」。该路径更贴近真实痛点，也更容易暴露重绑逻辑与树展示问题。

---

## 2. 交互流程问题（非纯样式）

### 2.1 解除绑定后的校验风暴与预览错乱（P0）——对照既有契约，非新产品形态

**现象**：点击「解除列表绑定」后、在重新绑定完成前：

- 顶栏出现 **数十条** `blocks.rfj-picked-spotlight-*` 校验错误；
- 画布仍渲染 **物化后的静态克隆**（如 `*-cell-1`、`*-sku-1-1`…），且 SKU 数据 **串到错误 SPU**；
- 区块树子节点显示多份「第 N 项」静态副本。

**既有产品/实现约定（非本次新增）**：

`removeRepeatRegionBinding`（`src/lib/repeatRegion.ts`）注释与实现明确：

- payload 中当前数组有 **N 项** → 按合并预览 **物化为 N 组静态子树**，**保留画布内容与 collection 下标绑定**（block 不删，id 变为 `prototypeId-{itemIndex+1}` 等）；
- 数组为空 → 恢复 `fallbackChildIds`。

嵌套场景走 `removeUnifiedRepeatBinding`：先对父级宿主执行上述物化，再 `clearRepeatsInSubtree` **删除**子树内 `repeat` 字段，**不删块**。

因此：**不应**再引入「软解除 / 硬重置 / 画布遮罩未绑定」等第二套解除语义；用户预期是 **解除后仍保留解除前展开的数据形态**（只是从 repeat 变为静态行），与契约一致。

**根因定位（研发）**：

1. **落盘真源正常**：全量 `validate:all` 对当前 `referral-friend-joined` 模板通过。  
2. **解除路径仍不完整**：物化后 `parentId`、静态行 `slotPath`、子级 `repeat.prototypeChildIds` 与 `children` 不一致等问题仍在；本地 `removeUnifiedRepeatBinding` 后校验约 **58 条** spotlight 相关错误（较修复前 62 条略减）。  
3. **已修复（2026-05-21）**：父级物化后，对 `host.children`（物化根 `cell-1`、`cell-2`）**整棵子树**清 `repeat`，物化 `sku-strip-1/2` **不再**误露子级「绑定列表」；回归见 `repeatNestedBinding.test.ts`。  
4. **重绑路径（新暴露 P0）**：在物化树上以 `cell-1` / `sku-strip-1` 为行模板执行 `applyUnifiedRepeatBinding` 后，编辑器态树 **膨胀**（单 SPU 下 5 份 SKU 列表 repeat），与磁盘原型 `cell` + `sku-strip` + `sku-1` 结构 **不一致**——属 **重绑/归一化** 缺陷，不是用户选错变量。

**交互侧仍可做的通用改进（不改变解除语义）**：

- 校验条 **按模块折叠**（见 §3.1），避免单行刷屏。  
- 解除后若存在 **结构性校验错误**，在 Inspector「绑定列表重复」旁增加 **弱提示**：「当前为解除后的展开副本，建议完成重绑或放弃未保存更改后从磁盘重新加载」，避免用户在错误树上继续配置。

### 2.2 绑定弹窗默认勾选第一项列表变量（P1，通用交互）

**现象**：从未绑定状态打开弹窗，**父级列表变量** 默认勾选表中 **第一项**（本模板为 **精选商品列表 `pickedProducts`**），而非 `pickedSpotlightProduct`。

**约束（产品）**：

- 交互须同时兼容 **用户绑定任意自定义 collection** 与 **内部 mock 商品数据** 等同一套 UI；  
- **不做**「按当前选中区块 / 模块上下文预选变量」或「推荐：与当前模块相关的变量」分组。

**建议（仍保持通用）**：

- 表头/说明强调：**请确认列表变量与当前模块业务一致**；或默认 **不勾选**、强制显式选择（需评估多一步点击）。  
- 本走查在步骤 6 **手动改选** `pickedSpotlightProduct`；从 **已解除、待重绑** 的宿主再打开向导时，变量 **锁定回显**（实测文案：「列表变量在进入绑定时已确定，此处仅回显结构，不可更换」）——该行为合理，宜在解除后重绑场景保留。

### 2.3 嵌套「首次绑定」向导：步骤多、父级映射树噪音（P1）

**现象**：`pickedSpotlightProduct` 含子列表时，向导为：

`循环范围 → 父级列表 → 父级字段映射 → 子级列表 → 子级字段映射`

**第二轮实测补充**：

| 步骤 | 表现 |
|------|------|
| 循环范围 | 预览文案正确；三档 radio 可理解 |
| 父级列表 | 行模板树为 **整棵物化树**（含 `cell-1/2`、其下已展开的 5 张 SKU 卡）；用户只能选 **主推商品卡（第 1 项）** `cell-1`，**无法**选磁盘原型 `rfj-picked-spotlight-cell` |
| 父级字段映射 | 左侧仍展开 **SKU 规格列表（第 1 项）** 及多张 **规格卡（行模板）（第 1–5 项）**；右侧映射表同时出现 **SPU 字段** 与 **skus 子列表字段**，噪音大 |
| 子级列表 | 子级变量 `skus` 可选；行模板树在 **cell-1** 子树内，默认需选 **SKU 规格列表（第 1 项）** `sku-strip-1` |
| 子级字段映射 | 仅针对 SKU 卡映射；下拉中曾出现 **父级标量字段**（`name`、`salePrice` 等）与 `skus.*` 混排，易误绑 |

**建议（不含「恢复上次绑定」）**：

1. **父级映射步只展示 SPU 标量字段**  
   - 左侧导航树 **隐藏** `SKU 规格列表` 及以下（数据层已有 `parentScalarItemFieldsFromItemFields`，UI 树应对齐）。  

2. **子级列表步强化「选宿主」**  
   - 示意图：`[SPU 行] → [SKU 规格列表 ▼ 选这个] → [SKU 卡 行模板]`；  
   - 仅允许 repeat **宿主** layout/grid；规格卡 prototype **自动推断**，勿让用户在物化出的 `sku-1-2`…`sku-1-5` 上点选。  

3. **物化态重绑：归一化行模板 id（P0，研发）**  
   - 绑定向导行模板选择器应 **优先展示并可默认选中** 与物化 id 对应的 **原型 id**（`cell` ← `cell-1`，`sku-strip` ← `sku-strip-1`），或在应用绑定时将物化 id **映射回原型** 再展开，避免在 `cell-1` 上再叠一层 repeat 导致树膨胀。  

4. **循环范围预览**  
   - 仅父级循环时避免 **「不循环「」」** 空文案；改为「仅循环主推单品，不展开 SKU 子列表」。

### 2.4 子级行模板选择容易误选（P0）

**现象**：子级列表步的行模板树中，同时存在：

- 「SKU **规格列表**（layout）」— repeat **宿主**（原型 `rfj-picked-spotlight-sku-strip`）  
- 「SKU **规格卡**（行模板）」— repeat **prototype** `rfj-picked-spotlight-sku-1`  
- 解除后物化残留：`sku-1-1` … `sku-1-5` 静态副本  

用户若选 **规格卡** 而非 **规格列表宿主**，子级 repeat 挂在错误 block 上，易出现 **子级字段映射步被跳过** 且预览 SKU 错乱。

**第二轮**：在物化态下选 `sku-strip-1` 可完成向导，但 **应用后树结构仍错误**（见 §1.3），说明仅靠文案引导不够，需 **宿主白名单 + 原型归一化**。

**建议**：

- 子级步 **仅允许选择** 带「列表循环容器」标记的 layout/grid；  
- 选中规格卡时阻断并提示：「应选上一级的 SKU 规格列表容器」；  
- 应用绑定时禁止以 **已物化 repeat 副本**（`sku-strip-2` 等）作为长期行模板 id 写入。

### 2.5 Inspector 与子级宿主的信息分工（P1）

**现象**：选中子级 repeat 宿主 `rfj-picked-spotlight-sku-strip` 时，Inspector 提示：

> 子级列表循环已在父级行绑定中统一配置；此处仅展示状态，请点「在整体列表绑定中修改」。

**建议**：

- 父级已绑定时，子级宿主卡片展示 **只读摘要**：`skus · 最多 5 项 · 行模板：SKU 规格卡`；  
- 按钮文案改为 **「编辑 SPU+SKU 整体绑定」**，与父级「编辑列表绑定」统一。

### 2.6 双入口「解除绑定」文案不一致（P2）

| 位置 | 文案 |
|------|------|
| Inspector | 解除**列表**绑定 |
| 弹窗 footer | 解除绑定 |

建议统一为 **「解除列表绑定」**，并在弹窗内说明会同时清除子级 `skus` 循环。

### 2.7 区块树命名：双重「第 N 项」（P1）

**现象**：重绑后树节点出现  
`主推商品卡（第 1 项）（第 1 项）`、`SKU 规格列表（第 1 项）（第 3 项）`、`SKU 规格图（第 2 项）（第 1 项）` 等 **双重序号**；且同一 SPU 下挂 **多份**「布局重复 N」的 SKU 列表。

**建议**：

- 外层仅显示 SPU 序号，内层仅显示 SKU 序号，例如：  
  - `主推商品卡 · SPU 1`  
  - `SKU 规格图 · SPU1-SKU2`  
- repeat 展开层 **不要**对物化副本再套一层「第 N 项」后缀；展开逻辑与展示标签应共用一套「层级深度」规则。

### 2.8 解除后物化副本上的 collection 绑定未清理（P0，研发）

**现象**：解除后，物化块（如 `rfj-picked-spotlight-sku-1-img-1`）仍保留 `bindings.*.slotPath` 指向 `pickedSpotlightProduct[0].skus[0].*` 或整表 `pickedSpotlightProduct`，校验报：

- collection 类型与图片/文本字段不兼容；  
- 「带数字下标的 slotPath 只能写在列表重复行模板内」。

**建议**：

- `removeRepeatRegionBinding` / `removeUnifiedRepeatBinding` 物化时，对脱离 repeat 上下文的块 **剥离** 或 **降级** collection 下标绑定（保留标量预览值或清空为未绑定），使解除后校验条 **可收敛**，而不是把契约错误全部甩给用户。

---

## 3. 纯样式 / 展示层优化（与流程弱相关）

### 3.1 校验提示条

- 错误过多时挤成 **单行不可读**（本轮重绑后仍是一整段横向滚动文本）；建议：最高 3 行 +「展开全部 (N)」抽屉，按 `rfj-picked-spotlight` 分组。  
- 解除/重绑中间态用 `warning` 色条 + 图标，与 **保存前致命错误** 区分。

### 3.2 绑定向导

- 步骤条在 5 步时标注步骤 4 旁：**「若无子级可映射字段将自动跳过」**。  
- 父级/子级变量表：长 URL **ellipsis + tooltip**，避免撑破 `repeat-region-bind-modal` 宽度。  
- 循环范围三枚 radio 改为 **卡片式** + 一行说明（仅 SPU / SPU+SKU / 仅 SKU 锚定父级一项）。  
- 父级列表步：物化树 **默认折叠** SKU 子树，仅展开到 `cell` / `cell-1` 一层，减少误点。

### 3.3 Inspector 列表卡片

- `RepeatRegionInspectorSummary`：业务名主标题，`pickedSpotlightProduct` code 次要。  
- 「2 项」与「1–2 项」pill 合并为 **「2 项（目录 1–2）」** 一行。

### 3.4 区块树

- 列表宿主 / 重复项色标已有；**物化静态行**与 **repeat 展开行** 用次要样式区分（虚线框或灰字「已物化」），避免与正常「布局重复 N」混淆。

### 3.5 弹窗关闭与反馈

- **应用** 成功后关闭弹窗并 toast **「列表绑定已更新」**；若 `validateTemplate` 仍有 P0 错误，**留在当前步** 并提示「绑定已写入但存在 N 处结构错误，请查看校验条」。  
- 本轮实测应用后弹窗关闭，但树/校验未恢复，用户缺少 **失败感知**。

---

## 4. 数据模型与 UI 对齐（给研发的对照）

当前磁盘真源（节选）：

```text
rfj-picked-spotlight          repeat → pickedSpotlightProduct（SPU，min 1 max 2）
  └ rfj-picked-spotlight-cell   行模板（prototype）
       └ rfj-picked-spotlight-sku-strip   repeat → itemPath: skus（SKU）
            └ rfj-picked-spotlight-sku-1    行模板（prototype）
```

用户心智：

```text
列表变量 pickedSpotlightProduct
  ├─ 第 1 个 SPU（Aura 耳机）→ skus[] 最多 5 个规格
  └─ 第 2 个 SPU（Pulse 手表）→ skus[] 2 个规格
```

**说明**：落盘 `template.json` **没有** `rfj-picked-spotlight-sku-strip-2` 等 id；`sku-strip-2`、`*-sku-1-2` 等为 **解除父级绑定后物化** 的副本。父+子合一绑定时，原型 `sku-strip` 上的 `repeat.itemPath: skus` 是合法数据形态，**不是**第二套可独立操作的绑定入口。

UI 文案应始终使用 **SPU / SKU** 与 **pickedSpotlightProduct / skus**，避免仅写「列表」「repeat」。

---

## 5. 建议优先级汇总

| 优先级 | 类型 | 项 |
|--------|------|-----|
| P0 | 缺陷 | 物化态 **重绑** 时行模板归一化（`cell-1` → `cell`，`sku-strip-1` → `sku-strip`），避免 repeat 叠在物化副本上导致树膨胀 — **已实现**（`normalizeTemplateBeforeUnifiedRepeatBinding` + `applyUnifiedRepeatBinding` 入口） |
| P0 | 缺陷 | 解除物化时修复 `parentId` / 剥离静态行 collection `slotPath`（§2.8） |
| P0 | 缺陷 | `removeUnifiedRepeatBinding` 子树清 repeat（**已做**）；回归保持 |
| P0 | 流程 | 子级行模板必须引导选 `sku-strip` **宿主**（原型 id），禁止物化 `sku-1-N` |
| P1 | 流程 | 父级映射树隐藏 SKU 子树；子级映射下拉仅 `skus.*` |
| P1 | 流程 | 绑定弹窗：未绑定态强化「请确认变量」；已解除待重绑态保留变量锁定 |
| P1 | 流程 | 区块树双重「第 N 项」与多份「布局重复 N」展示规则 |
| P1 | 样式 | 校验条折叠分组 + 中间态 warning |
| P2 | 文案 | 解除/编辑绑定按钮统一；应用成功/失败 toast |
| P2 | 样式 | 向导步骤说明、表格局部 ellipsis、物化树默认折叠 |

**明确不做（本次走查反馈）**：

- 按模块上下文预选 collection 变量；  
- 「恢复上次绑定」一键；  
- 解除绑定的软/硬重置或画布「未绑定」遮罩（与现有物化契约重复或冲突）。

---

## 6. 附录：第二轮走查异常表现（供回归）

### 6.1 解除后（重绑前）

- Inspector：父级为普通「布局」，无列表 Tab 的「已绑定」态。  
- 选中物化 **SKU 规格列表（第 2 项）** `sku-strip-2`：**无**独立「绑定列表」入口（repeat 清除修复 **生效**）。  
- 画布：Aura 主图下 Pulse 规格图等 **串组**。  
- 校验：约 **58+** 条，含 `parentId`、`slotPath`、环检测。

### 6.2 重绑后（应用 `parentAndChild` + `pickedSpotlightProduct` + `skus`）

- Inspector：父级 **已绑定**；行模板 **主推商品卡（第 1 项）**（物化 id）。  
- 区块树：第 1 个 SPU 下 **5 个** `SKU 规格列表 · 布局重复1–5`，每份 5 张规格卡；第 2 个 SPU **无**子级 repeat，仅静态 `sku-strip-2` + 2 张卡。  
- 画布：第 1 SPU **SKU 行过多**；第 2 SPU（Pulse）**2 SKU** 相对正常。  
- 校验：仍 **刷屏**（与 §2.8、树膨胀一致）。

### 6.3 建议自动化回归

```text
A. 干净模板：rfj-picked-spotlight 首次绑定 parentAndChild + skus
   → validate:all 通过 → 树 2×（cell repeat + sku-strip repeat）→ 画布 Aura 5 SKU / Pulse 2 SKU

B. 解除：removeUnifiedRepeatBinding
   → sku-strip-1/2 无 repeat；物化块无子级「绑定列表」UI
   → validateTemplate spotlight 错误数持续下降（目标：0 或仅可接受 warning）

C. 物化态重绑：同浏览器路径 cell-1 + sku-strip-1
   → 应用后树不得出现「单 SPU 下 5 份 sku-strip repeat」
   → 与 A 的树结构等价（允许物化展示名，但 repeat 拓扑须一致）
```

---

## 7. 相关代码入口（便于落地）

| 模块 | 路径 |
|------|------|
| 解除物化 | `src/lib/repeatRegion.ts`（`removeRepeatRegionBinding` / `materializeRepeatExpandedSubtree`） |
| 嵌套解除 | `src/lib/repeatNestedBinding.ts`（`removeUnifiedRepeatBinding`） |
| 嵌套重绑 | `src/lib/repeatNestedBinding.ts`（`applyUnifiedRepeatBinding` 等，待补物化 id 归一化） |
| Inspector 列表 Tab | `src/components/Inspector.tsx`（`repeatRegionPanel` / `removeRepeat`） |
| 绑定向导弹窗 | `src/components/RepeatRegionBindModal.tsx` |
| 已绑定摘要卡片 | `src/components/RepeatRegionInspectorSummary.tsx` |
| 嵌套展开 Golden | `src/lib/repeatRegion.test.ts`、`src/lib/repeatNestedBinding.test.ts` |
| 样式 | `src/app.css`（`.inspector-repeat-card*`、`.repeat-region-bind-modal*`） |

---

*文档由 Agent 在真实浏览器操作中归纳（含 2026-05-21 第二轮完整走查：解除 → 5 步向导重绑 → 树/画布/校验观测），并经产品反馈修订；落地前请与设计与契约校验一并评审。*
