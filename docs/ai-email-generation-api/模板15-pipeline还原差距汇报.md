# 模板 15（废弃购物车 3）AI Pipeline 还原差距汇报

> **验收日期**：2026-06-04  
> **设计图**：`/Users/hengliheng/Downloads/邮件学习模板/废弃购物车 3（模板 15）.png`（仓库副本：`public/test-assets/abandoned-cart-template-15.png`）  
> **Pipeline 版式**：`step23x2-2` / `15-mcp`（显示名「模板15 MCP验收」）  
> **手工基线版式**（不经 LLM，模拟 pipeline 形态）：`step23x2-2` / `manual-15`（显示名「模板15 手工还原」）  
> **Pipeline RunId**：`aa6af920-6380-402e-a639-66fbc17d2ea9`  
> **耗时**：约 1.5 分钟（07:14:44 → 07:16:05 UTC，日志见 `logs/ai-pipeline-llm.jsonl`）

### 对比用双轨产物

| 版式 id | 来源 | 落盘路径 |
|---------|------|----------|
| `15-mcp` | 豆包 pipeline A→E | `layouts/15-mcp/` |
| `manual-15` | Agent 手工写 JSON（生成脚本 `scripts/generate-manual-15-layout.mjs`） | `layouts/manual-15/` |

编辑器切换：`?emailKey=step23x2-2&layout=15-mcp` vs `&layout=manual-15`

**双轨深度对比（前端 + JSON + 优化路线图）**：见 [`模板15-pipeline-vs手工还原对比报告.md`](./模板15-pipeline-vs手工还原对比报告.md)

## 验收方式

1. `./start.sh` 重启本地 dev（5180）+ API（8787）
2. 编辑器顶栏 → 版式结构 → 新建 → **以图创建 AI**
3. 上传设计图，版式名「模板15 MCP验收」，点击「开始生成」
4. 生成完成后切换至 `layout=15-mcp`，浏览器快照 + 全页截图对照

**截图存档**

| 文件 | 说明 |
|------|------|
| `docs/ai-email-generation-api/template-15-design-reference.png` | 原设计图 |
| `docs/prd-assets/_verify-ai-pipeline-15-mcp-result.png` | 编辑器内生成结果（含 UI  chrome） |

**落盘产物**

- `data/emails/step23x2-2/layouts/15-mcp/template.json`
- `data/emails/step23x2-2/layouts/15-mcp/tokenPresets.json`

---

## 总体结论

Pipeline **在宏观结构上还原度较高**：Stage A 正确切出 7 个区段（顶栏 / 首屏 CTA / 商品 / 金融 / 社交 4 宫格 / 服务保障 / 页脚），B3 文案 OCR 基本完整，B4 Pexels **5/5 搜图成功**，社交叠放层（背景图 + icon + 平台名）结构正确。

与设计图相比，**主要差距集中在四类**：

1. **Stage B3 文案分区串区** → 区块树归属错误  
2. **Stage A 栅格列数误判** → 信任区 3 列 vs 设计 4 列  
3. **后置 `$themeRef` 过度绑定 primary** → 大量标题/正文/Logo 变成黄色  
4. **品牌资产与图标识别不足** → Affirm / UL / TÜV 等 logo、金融区圆形图标缺失  

综合像素/语义还原度（主观）：**约 55–65%**——「能看懂同一封邮件」，但离可交付的像素级还原仍有明显距离。

---

## 分区对照

### s1 顶部导航

| 维度 | 设计图 | Pipeline 还原 | 差距 |
|------|--------|---------------|------|
| 布局 | 左 Logo + 右引导文案（两行，链式） | 左 text + 右 layout（text + **button**） | 「Book a test ride.» 被建成 **黄色 CTA 按钮**，非灰色内联链接 |
| Logo 颜色 | 黑色粗体 wordmark | **黄色**（`colors.primary`） | 后置 themeRef 将 Logo 误绑主色 |
| 对齐 | space-between | 外层 center + 内层 right | 基本可用，但与设计左右撑开略有差异 |

### s2 首屏提示

| 维度 | 设计图 | Pipeline 还原 | 差距 |
|------|--------|---------------|------|
| 内容 | 标题 + 副标题 + SHOP NOW | 同上 + **多出「TAKE ANOTHER LOOK:」** | B3 将 s3 小标题 OCR 进 s2，Stage C 一并生成 |
| 按钮 | 黄底 **黑字** 胶囊 | 黄底 **白字**（`textColor: colors.surface`） | 按钮文字色策略与设计相反 |
| 字号 | 标题明显大于副标题 | 24px / 16px，层次有但标题偏小 | 轻微 |

### s3 商品推荐

| 维度 | 设计图 | Pipeline 还原 | 差距 |
|------|--------|---------------|------|
| 结构 | 小标题 → 产品图 → 名称 → CTA | **缺小标题**，直接 图 → 名 → 按钮 | 小标题被错放在 s2 |
| 产品图 | 白底棚拍侧视图（Camouflage 款） | Pexels 户外草地实景（photoId 32366003） | 语义接近但 **场景/背景/产品型号** 不符 |
| 商品名颜色 | 黑色 | **黄色**（primary 绑定） | 同 themeRef 过度绑定 |
| CTA | DON'T MISS OUT 黄底黑字 | 黄底白字 | 同 s2 按钮色 |

### s4 金融服务说明

| 维度 | 设计图 | Pipeline 还原 | 差距 |
|------|--------|---------------|------|
| 标题区 | FINANCING AVAILABLE + Affirm 一行（+ logo） | **重复两组** FINANCING + 说明 +「+」「affirm」文字 | B3 OCR 重复；Affirm **无 logo 图/icon** |
| 标题颜色 | 黑色大写 | **黄色** primary | themeRef |
| 特性栅格 | 2 列，各含 **蓝色圆形图标** + 标题 + 说明 | 2 列 **纯文本**，**无 icon** | B2 未识别金融特性图标；Stage C 未补 icon |
| 文案 | QUICK & EASY / NO HIDDEN FEES 等 | 文案完整 | ✅ |

### s5 社交平台入口

| 维度 | 设计图 | Pipeline 还原 | 差距 |
|------|--------|---------------|------|
| 栅格 | 4 列 lifestyle 卡片 | 4 列 grid + 叠放 image/icon/text | ✅ 结构正确 |
| 图标 | 各平台品牌色 logo | simple-icons（twitter/instagram/facebook/tiktok）+ 正确色 | ✅ 较好 |
| 配图 | 4 张不同生活场景 | Pexels 4 张，但 **slot0 与 slot3 同一 photoId（15020556）** | 重复图 |
| 叠放对齐 | 图标+文字居中于卡片 | `vertical: center` | ✅（近期 P0 修复生效） |

### s6 服务保障说明

| 维度 | 设计图 | Pipeline 还原 | 差距 |
|------|--------|---------------|------|
| 栅格列数 | **4 列**（门店 / UL / TÜV / 质保） | **3 列** | Stage A `gridColumns: 3` 误判 |
| UL / TÜV | **认证 logo 图片** | 纯文本「UL CERTIFIED」「TÜV Rheinland CERTIFIED」 | 未识别为 image/icon 资产 |
| 门店 / 质保 | 门店图标 + 1,800+；盾牌「2」+ 质保文案 | tabler `building-store` / `shield` + 文本 | 通用图标替代品牌图形 |
| 底部说明 | Safety Certified… 居中 | 有独立 text 块 | ✅ |

### s7 页脚信息

| 维度 | 设计图 | Pipeline 还原 | 差距 |
|------|--------|---------------|------|
| 免责声明 | 小号灰色居中 | 有，10px 级 | ✅ 基本 |
| 退订 + 地址 | Unsubscribe. + 地址 | Unsubscribe **缺句号** + 地址 | 标点细节 |
| 颜色 | 浅灰 secondary | secondary 绑定 | ✅ |

---

## 跨区共性问题

### 1. 后置 `$themeRef` 过度绑定 primary（高优先级）

- 落盘 template 中约 **87 处** `$themeRef`
- Logo「AVENTON」、金融标题、商品名等多处 text 的 `color` 被绑到 `colors.primary`（`#E3D026`）
- 设计图主色 **仅用于 CTA 按钮背景**，正文/标题应为 `#1A1A1A` 或 secondary 灰
- **建议**：`bindThemeRefsAfterAiLowering` 对 heading/body 角色增加「禁止绑 primary 除非 Stage C 显式指定」；Logo wordmark 默认 `#000000`

### 2. 按钮文字色固定为 surface（高优先级）

- 三个 CTA 均 `textColor: colors.surface`（白字）
- 设计为 **黑字黄底**
- **建议**：B1 若 primary 为高亮黄/绿，button text 默认 `#1A1A1A` 或增加 `buttonTextOnPrimary` token

### 3. Stage B3 文案分区串区（高优先级）

- 「TAKE ANOTHER LOOK:」出现在 s2 的 texts 数组，导致 s3 缺标题、s2 多一行
- **建议**：B3 后增加「跨区重复/边界校验」；或 Stage A 给出更细的 sub-region 锚点

### 4. Stage A 栅格列数（中优先级）

- s6 设计 4 列 → A 输出 3 列 → 后续 C/D/E 无法自愈
- **建议**：对「图标+文字」重复模式做列数后验（数 icon/logo 槽）

### 5. 品牌 / 认证 logo 识别（中优先级）

- Affirm、UL、TÜV 等应走 **image 或 simple-icons**，而非纯 text
- B2 当前只输出社交 + 少量 tabler，**未覆盖认证 logo 与金融圆形图标**
- **建议**：扩展 B2 规则：认证 mark、支付品牌 → image slot 或专用 icon pack

### 6. 商品图与搜图语义（中优先级）

- Pexels query 合理但无法得到 **白底 SKU 棚拍**
- **建议**：product role 增加 `studio product shot white background` 约束；或允许 Stage A 标记 `preferCutout: true`

### 7. 页头链式 CTA vs 按钮（低优先级）

- 右侧「Book a test ride.» 应为 text link（可能带 underline），非 button block
- **建议**：Stage C 提示「单行引导链接用 content.text + link，不用 action.button」

---

## Pipeline 各阶段表现

| 阶段 | 表现 | 主要问题 |
|------|------|----------|
| **A 区域分析** | 7 区顺序与命名准确；gap/grid 大致合理 | s6 列数 3≠4；s2/s3 边界未细分 |
| **B1 全局风格** | primary `#E3D026`、radius rounded、spacing spacious 较准 | 未区分「按钮主色」与「标题色」 |
| **B2 图标** | 社交 4 icon 正确 | 金融圆形 icon、认证 logo、Affirm 缺失 |
| **B3 文案** | 英文 OCR 完整率高 | s2/s3 串区；s4 金融标题重复 |
| **B4 Pexels** | 5/5 成功 | 商品图场景不对；社交图 1 张重复 |
| **C 结构** | compact IR 可编译；社交叠放、金融 2 列 grid 正确 | s4 缺 icon；s1 误用 button |
| **D/E 编译 + themeRef** | 成功落盘、校验通过 | themeRef 过度绑定放大色差 |

---

## 建议优化路线图（按 ROI 排序）

1. **P0 — themeRef 绑定策略**：标题/正文/default 不绑 primary；按钮黑字规则  
2. **P0 — B3 分区校验**：检测跨区重复标题、按 Stage A components 条数对齐  
3. **P1 — B2 扩展**：Affirm / UL / TÜV / 金融特性 icon  
4. **P1 — Stage A 列数**：s6 类「等宽 icon 阵列」用视觉计数修正 gridColumns  
5. **P2 — 商品图 query**：白底棚拍 / cutout 偏好  
6. **P2 — 页头 text link**：compact IR 引导语语义  

---

## 附录：关键数据摘录

**tokenPresets（B1 推导）**

```json
{
  "colors": { "primary": "#E3D026", "secondary": "#6B7280", "surface": "#FFFFFF" },
  "spacingPreset": "spacious",
  "radiusPreset": "rounded"
}
```

**Stage A 区域 id**

`s1` 顶栏 → `s2` 首屏 → `s3` 商品 → `s4` 金融 → `s5` 社交(4列) → `s6` 保障(3列) → `s7` 页脚

**Pexels slots**

| slotId | photoId | 备注 |
|--------|---------|------|
| s3-img-0 | 32366003 | 商品图 |
| s5-img-0 | 15020556 | 社交 1 |
| s5-img-1 | 9156414 | 社交 2 |
| s5-img-2 | 12886722 | 社交 3 |
| s5-img-3 | 15020556 | 与 slot0 **重复** |

---

*本报告基于单次 MCP 验收 run，代码版本含近期 fontSize 回退、对齐继承 P0、叠放 vertical center、后置 themeRef 等改动。*
