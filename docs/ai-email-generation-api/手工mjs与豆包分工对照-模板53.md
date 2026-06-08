# 手工 mjs 与豆包分工对照（模板 53）

> 对照真源：`scripts/generate-manual-53-layout.mjs`（598 行）  
> 豆包 demo 产物示例：`scripts/generate-doubao-engagement-post-purchase-template53-doub-layout.mjs`  
> 编排入口：`src/lib/ai-pipeline/manual-restore/runManualRestoreViaDoubao.ts`  
> 本地试跑：`npm run manual-restore:doubao`

本文按**手工 mjs 行号**说明：豆包 demo 流程里每一段是谁写的、谁注入的，便于与 `generate-manual-53-layout.mjs` 逐行对照。

---

## 图例

| 标记 | 含义 |
|------|------|
| **豆包** | `MR:MjsGenerate` 那一次 API 写出来的 mjs 正文 |
| **工程入参** | `imagePath`、`outputEmailKey`、`displayName` 等由调用方传入，写进 prompt 让豆包填常量 |
| **工程注入** | 程序直接插入最终 mjs（豆包不写 URL 字面量） |
| **Prompt 注入** | 拼进 system/user prompt，**不进入** mjs 文件 |
| **另一路 API** | 仅 `resolveAssetsFromDesign: true` 时：`MR:AssetSlots` → 程序 Pexels/CDN |

---

## 手工 mjs 逐段对照（以 53 的行号为准）

| 手工行号 | 内容 | 豆包 demo 里谁负责 | 说明 |
|---------|------|-------------------|------|
| **1–9** | shebang、注释、`import` | **豆包** | 结构照参考脚本写 |
| **10–12** | `EMAIL`、`P` | **工程入参 → 豆包填入** | 手工：`engagement_post_purchase_template53` / `ept53`；demo 默认：`engagement_post_purchase_template53_doubao` / `ept53db` |
| **13** | `OUT = join(...)` | **豆包**（按 prompt 模板写） | 豆包版通常多 `EMAIL_DIR`（约豆包 mjs 13–14 行），手工版只有 `OUT` |
| **14–15** | `DESIGN_SRC`、`DESIGN_DST` | **工程入参 → 豆包填入** | 来自 `imagePath` 与 `deriveDesignCopyPath(repoRoot, outputEmailKey)` |
| **17–23** | `COLORS` | **豆包**（看图取色） | 会随运行变化，例如手工 `chocolate: '#3D2314'`，豆包可能为 `'#725559'` |
| **25–33** | `PEXELS`（含全部 URL） | **工程注入** | demo：从本文件 **25–33 行原样提取**，经 `stitchInjectedAssetsIntoMjs()` 插入；豆包在 buildS* 里只写 `PEXELS.hero`、`PEXELS.products[i]` 等**变量引用** |
| **35–42** | `ICON`（含全部 URL） | **工程注入** | 从本文件 **35–42 行**原样提取；豆包在 buildS4/buildS5 里只引用 `ICON.leaf`、`ICON.instagram` 等 |
| **44–49** | `PRODUCTS` 文案数组 | **豆包**（看图抄文案） | demo 碰巧与手工一致；换设计图时应由豆包重写 |
| **51–52** | `seq` / `nid` | **豆包**（可选） | 手工有；豆包版也可能有，不保证每次都有 |
| **54–119** | `borderNone` … `sectionShell` | **豆包** | 高度仿参考 mjs（prompt 中已剥离 25–42 行的参考脚本） |
| **121–144** | `coverImage` | **豆包** | 函数体豆包写；`src` 参数传 `PEXELS.*`，禁止 `https://` 字面量 |
| **146–180** | `textBlock` | **豆包** | |
| **182–227** | `buttonBlock` | **豆包** | |
| **229–243** | `iconBlock` | **豆包** | `src` 传 `ICON.*` 变量 |
| **245–259** | `dividerBlock` | **豆包** | |
| **261–289** | `productCell` | **豆包** | 细节可能不同，如手工配图高 `'200px'`，豆包可能 `'280px'` |
| **291–317** | `trustCol` | **豆包** | |
| **319–330** | `buildS1` | **豆包** | 区块结构 + 文案 |
| **332–402** | `buildS2` | **豆包** | 约 337 行 `PEXELS.hero`、促销文案、hero 高度等由豆包定 |
| **404–432** | `buildS3` | **豆包** | 约 427 行 `PEXELS.products[i]` + `PRODUCTS.map`：URL 来自注入，标题来自豆包 |
| **434–468** | `buildS4` | **豆包** | 约 462–464 行只引用 `ICON.leaf` / `shopPay` / `truck` |
| **470–540** | `buildS5` | **豆包** | 约 497–499 行只引用 `ICON.instagram` / `pinterest` / `facebook` |
| **542–562** | `tokenPresets` | **豆包** | typography 等档位可能不同 |
| **564–585** | `template` | **豆包** | `root.type: emailRoot`，`children: [buildS1()…buildS5()]` |
| **587–589** | 写 `tokenPresets.json` + `template.json` | **豆包** | 手工版当时只落这两份 |
| *(手工无)* | `meta` / `layout-manifest` / `payload` | **豆包** | prompt 要求补全（样板见 `generate-manual-35-layout.mjs` 末尾） |
| **591–595** | `copyFileSync(DESIGN_SRC, DESIGN_DST)` | **豆包写逻辑，路径来自入参** | try/catch 包裹 |
| **597** | `console.log(\`Wrote ${OUT}\`)` | **豆包** | |

---

## 不进 mjs、但在豆包写之前已注入的

| 阶段 | 内容 | 实现位置 |
|------|------|----------|
| Prompt | restore-guide、restore-check、remote-asset-urls、token-preset、config-motherboard 等 skills + rules | `loadRestoreContext.ts` → `buildMjsGeneratorSystemPrompt()` |
| Prompt | 手工 53 参考脚本（**已去掉 25–42 行 URL**）+ 模板 35 落盘样板 | `loadManual53ReferenceScript()`、`loadEmailScaffoldSnippet()` |
| Prompt | 已解析 PEXELS/ICON 预览 + 槽位说明 | `buildMjsGeneratorUserText()` 的 user 消息 |
| Prompt | 设计图 PNG | user 消息的 `image_url`（来自 `imagePath` 读入） |
| 工程 | 资产常量 stitch | `injectedMjsAssets.ts`：`stitchInjectedAssetsIntoMjs()` 替换 `// __INJECTED_ASSETS__` |
| 工程 | 禁止豆包自编 URL 检查 | `assertNoHallucinatedAssetUrls()` |
| 工程 | `node` 执行 mjs + validate | `runManualRestoreViaDoubao.ts` |

---

## 图片 / 图标（手工 25–42 行）的两条工程路径

### Demo 默认：`referenceMjsPath`

```
读取 generate-manual-53-layout.mjs 第 25–33、35–42 行
  → stitch 进豆包 mjs 的 // __INJECTED_ASSETS__ 占位符
  → 无额外豆包 API
```

相关代码：`loadInjectedAssetsFromReferenceMjs()`、`injectedMjsAssets.ts`

### 上线通用：`resolveAssetsFromDesign: true`

```
豆包 API #1（MR:AssetSlots）
  → 只输出 imageSlots / iconSlots 搜索词 JSON，禁止 URL
  → resolveBlueprintAssets()：Pexels + jsDelivr CDN
  → 生成 PEXELS / ICON 块并 stitch

豆包 API #2（MR:MjsGenerate）
  → 写 COLORS、工具函数、buildS*、tokenPresets、template、meta 等
```

相关代码：`promptsAssetSlots.ts`、`resolveMjsAssetsFromDesign.ts`、`resolveBlueprintAssets.ts`

---

## 落盘目录与入参

| 入参 | 作用 | 默认 demo 值 |
|------|------|-------------|
| `imagePath` | 设计图绝对路径 → `DESIGN_SRC` | 购买后 1（模板 53）.png |
| `outputEmailKey` | 写入 `data/emails/<key>/` | `engagement_post_purchase_template53_doubao` |
| `displayName` | `meta.displayName` | 购买后 1（模板 53 · IMBŌDHI · 豆包手工还原） |
| `designCopyPath` | 设计图副本 | `public/test-assets/<outputEmailKey>-design.png` |
| `referenceMjsPath` | 资产提取真源 | `scripts/generate-manual-53-layout.mjs` |

版式 JSON 路径：

```text
data/emails/<outputEmailKey>/layouts/default/template.json
data/emails/<outputEmailKey>/layouts/default/tokenPresets.json
```

---

## 与手工版是不是「一样」？

| 维度 | 结论 |
|------|------|
| 整体骨架 | 一样：工具函数 + `buildS1`…`buildS5` + `template` 组装 |
| 资产引用 | 一样：用 `PEXELS.*`、`ICON.*` 变量，不用在 buildS* 里写 URL 字面量 |
| 色值 / 字号 / 高度 | 可能不同：豆包看图每次会有偏差 |
| `EMAIL` / 落盘场景 | demo 故意用 `_doubao` 后缀，与手工 `engagement_post_purchase_template53` 分开 |
| meta / manifest / payload | 手工 53 当时未写；豆包 prompt 要求补全 |
| 25–42 行 URL | **不应由豆包编造**；demo 从手工 53 原样工程注入 |

---

## 相关文件索引

| 文件 | 职责 |
|------|------|
| `scripts/generate-manual-53-layout.mjs` | 手工真源（本对照表行号基准） |
| `scripts/generate-doubao-*-layout.mjs` | 豆包 + stitch 后的可执行脚本 |
| `scripts/run-manual-restore-doubao.ts` | 本地 demo CLI（仅提供默认入参） |
| `src/lib/ai-pipeline/manual-restore/promptsMjs.ts` | 豆包写 mjs 的 system/user prompt |
| `src/lib/ai-pipeline/manual-restore/injectedMjsAssets.ts` | 资产提取与 stitch |
| `src/lib/ai-pipeline/manual-restore/types.ts` | `ManualRestoreRunInput` 入参契约 |
| `logs/manual-restore-mjs-*/00-injected-assets.txt` | 当次运行注入的 PEXELS/ICON 记录 |

---

## 修订记录

- 2026-06-05：初版，对齐「手工 mjs 路径」demo（`MR:MjsGenerate` + 工程注入资产）。
