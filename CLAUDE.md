# Easy-Email — Claude Code Rules

> 本文件由 `npm run sync:claude` 根据 `.cursor/skills` 与 `.cursor/rules` 生成；请优先修改 Cursor 侧源文件。

## Skills（按需读取）

| Skill | 路径 | 触发场景 |
|---|---|---|
| easy-email-concepts | [.claude/skills/easy-email-concepts.md](.claude/skills/easy-email-concepts.md) | Easy-Email 当前维护概念（template 结构真源、tokenPresets 样式预设、payload 变量值、render-defaults 渲染默认）与口语↔技术路径对照；含「每个 block 自己的容器 / 宽高模式 / contentAlign 容器内摆放」等必读公共定义。 当用户讨论「还原邮件该改哪一层」「配置面 vs template」「样式预设 vs 结构」或需要一句话说清维护入口时读取；常与「按图还原邮件」类需求下的 business-components / block-architecture 技能一起出现。 |
| easy-email-storage-api | [.claude/skills/easy-email-storage-api.md](.claude/skills/easy-email-storage-api.md) | 邮件数据落盘目录、`emailKey` 约定、本地 API（`/api/v1`）与 Agent 写文件流程。 当用户问「模板存哪」「怎么新建邮件目录」「API 路径」「EMAIL_DATA_ROOT」「payload 409」或对接 server 读写时使用；与 easy-email-concepts、email-config-motherboard 配套。 |
| email-config-motherboard | [.claude/skills/email-config-motherboard.md](.claude/skills/email-config-motherboard.md) | 配置母版与邮件 JSON Block 架构：template 为结构真源，tokenPresets/payload 分工； block 白名单见 src/block-contract/。当用户说配置母版、新建或重构 template.json、 按设计图落地模板、统一 block 类型/命名、废弃「意图分层」口语时使用；按图还原须与 email-template-restore-check 一并首读。 |
| email-template-yaml-check | [.claude/skills/email-template-yaml-check.md](.claude/skills/email-template-yaml-check.md) | 邮件模板 YAML 夹具：经 scripts/email-template-yaml-to-template.mjs 展开为 template.json 后对照 validateTemplate 与 Golden 期望值，用于契约回归与非法字段检查，非业务维护入口。 当用户说 YAML 夹具、template-yaml golden、YAML 展开检查、手写检查用 YAML、非法字段应失败 时使用。 按设计图还原整封邮件走 email-config-motherboard / email-template-restore-guide，勿把 YAML 当主交付格式。 |
| easy-email-json-unified-migration | [.claude/skills/easy-email-json-unified-migration.md](.claude/skills/easy-email-json-unified-migration.md) | 邮件 JSON basejson 迭代须统一覆盖、全量迁移、禁止多 schema 并存。 在改动 template.json 形态、迁移脚本、Inspector/编辑器对齐、校验逻辑，或用户提到结构迭代、迁移、废弃字段、旧版兼容、交付检查时使用。 |
| email-template-restore-guide | [.claude/skills/email-template-restore-guide.md](.claude/skills/email-template-restore-guide.md) | 按设计图还原邮件的一站式指南：白话执行顺序、交付物清单、模块壳与 token 绑定（三条原则与圆角放哪）。 当用户说按图还原、像素还原、新建邮件目录、交付模板、白话步骤、模块壳、token 绑定、对图排版时使用； 易漏案例与反模式见 email-template-restore-check；配置母版与 block 白名单见 email-config-motherboard。 |
| email-template-restore-check | [.claude/skills/email-template-restore-check.md](.claude/skills/email-template-restore-check.md) | 根据设计图/截图还原 Easy-Email 邮件时的易遗漏点与交付前自检清单（叠放层对齐、`wrapperStyle.contentAlign`、禁止 crossAlign 与已废弃 overlay 撑高/空 layout 推右、堆叠模块与根 gap 上的圆角反模式、模块壳内内容贴边与 pageInline 分工等）。 当用户用口语说「还原邮件模板」「按设计稿/Png/截图做邮件」「用我的还原邮件 skills」「实现这封邮件模板」「邮件学习模板」「project-plan 里对话要做模板」「模板还原检查」「还原遗漏」「像素还原自检」或迭代任意邮件模板 JSON 时，应在动手改结构/样式前**优先读取**本技能，避免返工。 |
| easy-email-frontend-chrome-verify | [.claude/skills/easy-email-frontend-chrome-verify.md](.claude/skills/easy-email-frontend-chrome-verify.md) | 在前端渲染或应用行为变更后，须先在 Cursor 中创建与本技能验收顺序逐项对应的任务清单并据此执行； 再用 user-chrome-devtools MCP 打开本地页（默认 5180）、快照/截图、走关键流程并查看控制台与网络。 在用户要求 UI 验收、用 Chrome DevTools MCP 手动测试，或收尾涉及 src/components、EmailPreview、Inspector、画布、模板渲染时使用； 修改邮件模板数据且影响预览效果时同样须浏览器验收。若 MCP 报 browser is already running / chrome-profile 占用，见本技能附录。 |
| user-chrome-devtools-screenshot-page | [.claude/skills/user-chrome-devtools-screenshot-page.md](.claude/skills/user-chrome-devtools-screenshot-page.md) | 使用 user-chrome-devtools MCP 采集**整页视口**截图并落盘（navigate、emulate 视口、等待就绪、 take_screenshot；可选 evaluate_script 采集多区域坐标供红框标注）。在用户要求 PRD/文档全页配图、 邮件编辑器整屏截图、四宫格顶栏+左中右标注原图，或 Chrome DevTools MCP 页面级截图时使用。 弹窗/下拉等**单组件局部图**见 user-chrome-devtools-screenshot-region。profile 冲突见 chromedevtools-mcp-conflict。 |
| user-chrome-devtools-screenshot-region | [.claude/skills/user-chrome-devtools-screenshot-region.md](.claude/skills/user-chrome-devtools-screenshot-region.md) | 使用 user-chrome-devtools MCP 对弹窗、下拉、面板等**单个 UI 区域**配图：视口 take_screenshot + evaluate_script 取 getBoundingClientRect，再用 scripts/prd-crop-screenshot-rect.py 按 innerWidth 比例裁切。 在用户要求 PRD 弹窗配图、只截对话框/下拉、组件截图、不要整页灰底白边，或 project-prd-topbar 类局部图时使用。 整页视口图见 user-chrome-devtools-screenshot-page。profile 冲突见 chromedevtools-mcp-conflict。 |
| image-red-box-annotate | [.claude/skills/image-red-box-annotate.md](.claude/skills/image-red-box-annotate.md) | 在 PRD/文档截图上按 CSS 视口坐标绘制红色圆角矩形框（Pillow 脚本 prd-annotate-image-regions.py）。 在用户要求红框、圈选、标注区域、四宫格标注顶栏+左中右，或已有 user-chrome-devtools 截图与 evaluate_script 返回的 regions 时使用。整页原图采集见 user-chrome-devtools-screenshot-page； 弹窗/区域裁切图见 user-chrome-devtools-screenshot-region。 |
| easy-email-payload-contract | [.claude/skills/easy-email-payload-contract.md](.claude/skills/easy-email-payload-contract.md) | Easy-Email payload 变量赋值契约唯一真源：`src/payload-contract/`。 定义 payload.json 顶层形态、variable 槽 valueType（string/url/image/color/number/boolean/collection）、interpolate 原子槽、 collection 的 itemFields 与 values 值级校验。 槽目录真源在 payload.slots、取值在 payload.values；template 仅保留绑定关系（repeat / bindings / visibility）。 当用户问「payload 契约」「列表字段类型」「slot valueType」「业务变量校验」时使用。 |
| easy-email-repeat-binding | [.claude/skills/easy-email-repeat-binding.md](.claude/skills/easy-email-repeat-binding.md) | Easy-Email 列表 repeat 绑定唯一真源：src/repeat-binding-contract/（REPEAT_BINDING_RULES）。 运行时 src/repeat-runtime/（虚拟预览）、src/lib/repeatRegion.ts（物化/绑定）、repeatMaterializedNormalize.ts、repeatNestedBinding.ts； UI：Inspector、RepeatRegionBindModal（两步向导）。派生列表 A/B 见 docs/step2-相似品搭配品-derivedFrom-执行计划.md。 |
| easy-email-render-defaults | [.claude/skills/easy-email-render-defaults.md](.claude/skills/easy-email-render-defaults.md) | Easy-Email「渲染默认 / 禁止持久化」唯一真源：`src/render-defaults-contract/`。 定义画布会生效但不写入 template.json 的固定规则、禁止字段、以及底图 padding 等特殊渲染语义。 与 block-contract（允许写什么 JSON）、token-preset-contract（样式预设键）并列。 当用户问「哪些配置不进 JSON」「项目默认规则」「底图内边距语义」「render defaults schema」时读取。 |
| email-remote-asset-urls | [.claude/skills/email-remote-asset-urls.md](.claude/skills/email-remote-asset-urls.md) | 邮件模板中的远程占位图源约定：摄影默认 Pexels（images.pexels.com）；图标默认 jsDelivr 锁版本的 npm 包（Tabler / Simple Icons / lucide-static）。禁止编造 URL；交付前验证可访问性。当用户说「占位图」「Pexels」「图标 CDN」「远程图源」「类似模板43」或 Agent 填写邮件素材 URL 时使用。 |
| email-token-preset-standard-scope | [.claude/skills/email-token-preset-standard-scope.md](.claude/skills/email-token-preset-standard-scope.md) | 定义本仓库「样式预设」在 tokenPresets.json 中约定的标准 family / scale 集合，以及模板里 $themeRef 与 bindings.tokenPath 的合法写法； 含「组件/字段应绑到哪一条标准 token」的决策思维（设计意图、胶囊类型、白名单与刻意不绑的边界）； 以 data/emails/coupon-available 为对齐样例。当用户或 Agent 新建/扩展 tokenPresets、批量绑定 $themeRef、核对模板是否引用未声明 token、或要求「与 coupon-available 同一套预设范围」时使用。 |

---

## Rule 1: 语言规范（简体中文）

> 来源：`.cursor/rules/easy-email-language-zh-cn.mdc`

## 适用范围

以下**一律使用简体中文**（简体汉字与中文标点；专有名词如 API 路径、HTTP 方法、字段名、品牌英文名可保留原文）：

1. **代码注释**：单行/多行注释、JSDoc 说明、`TODO`/`FIXME` 等备注。
2. **前端用户可见文案**：页面标题、按钮、标签、占位符、空状态、下拉项、分段标题等常驻文案。
3. **交互提示**：`title` / `aria-label` / `placeholder`、`alt`（对用户有意义的说明）、Tooltip / Hover 说明。
4. **反馈与报错**：`alert` / Toast / 行内错误提示、表单校验提示、加载中/成功/失败等状态文案。
5. **面向用户的控制台或开发提示**（若会展示给本仓库使用者）：脚本输出、CLI 提示等，与产品文档语言保持一致时用中文。

## 不要求翻译为中文的例外

- 代码标识符：`变量名`、`函数名`、`type` 名、文件名、路由 path、环境变量 key。
- 第三方库 API、URL、日志中的英文错误栈原文（可在其**外层**用中文补充说明）。
- `docs/` 内已存在的英文技术文档：新写段落优先中文；整篇改写需单独任务。

## 自检

提交或收尾前快速检查：`src/`、`server/` 中面向用户的字符串与注释是否混用英文；若有，改为简体中文或中英分开展示（中文为主）。
---

## Rule 2: 代码设计与公共复用

> 来源：`.cursor/rules/easy-email-design-reuse.mdc`

## 总原则

- **可演进、非临时**：禁止「只为当前 PR 糊一下」的命名、魔法数、复制粘贴大段逻辑。简单可以，但必须**有清晰边界、可测试、可替换**（端口、数据根、路径走环境变量或集中配置，不写死散落多处）。
- **先找后写**：动手前先在仓库内搜索是否已有 **契约 / `src/lib` / 组件 / hook / server 模块 / 迁移脚本**；能扩展则扩展，避免平行造第二套相似实现。
- **全栈同一套领域逻辑**：合并、校验、路径解析、repeat/派生列表解析等**只写一份**（`src/lib` + `src/*-contract/`），前端、server、脚本**共用**；禁止在 route handler 或页面里重写等价规则。

与 **`easy-email-pluggable-code`** 分工：本 rule 管**放哪一层**；可拔插 rule 管**函数怎么写**（单一职责、纯函数、组合优于堆分支）。详文 `docs/可拔插式代码开发规范.md`。

## 分层与职责

| 区域 | 职责 |
|------|------|
| `src/*-contract/` | 机器真源：字段白名单、枚举、禁止项、规则目录（与 `easy-email-source-first-contract` 对齐）。 |
| `src/lib/` | 与框架解耦的**纯领域逻辑**（合并、校验、repeat、落盘路径解析等）；**前端、server、脚本**均从此 import。 |
| `src/types/` | 共享 TS 类型；API、编辑器、落盘 JSON 共用。 |
| `src/components/` | 可复用 UI；**无**数据获取副作用的纯展示优先抽这里。 |
| `src/hooks/`（可建） | 跨组件状态、订阅、副作用；避免多页面重复相同 `useEffect` + fetch。 |
| `src/api/` | 前端 HTTP 客户端：路径、错误体解析集中在此；页面/组件只调封装 client，不内联 URL。 |
| `server/` | **薄 HTTP 层**：路由、鉴权（若有）、请求/响应映射、**IO**（读写信件目录、SSE、上传）；**不写**本应在 `src/lib` / 契约层的校验与合并核心。 |
| `server/*.ts`（非 index） | 按领域拆的 **server 侧适配/IO 模块**（如 `emailLayoutContext.ts`、`*Store.ts`）：路径解析、watch、第三方 SMTP 等；仍应薄，复杂规则下沉 `src/lib`。 |
| `scripts/` | 迁移与批处理：复用 `src/lib` + 契约；**不**在脚本里维护第二份键表或校验规则。 |

## 公共复用（必须贯彻）

1. **第二次相似即抽象**：两处及以上相同或仅参数不同的逻辑 → 抽 **`lib` 纯函数**、**契约常量**、**小组件**、**hook** 或 **server 模块**，并替换调用方。
2. **Route / 页面保持薄**：`server/index.ts` 与页面容器只做编排（读 body → 调 lib → 写响应 / 落盘）；单文件不应持续堆叠本可下沉的业务分支。
3. **组件粒度（前端）**：优先小而稳定的原子/分子组件，再由页面编排；避免单文件数千行的「上帝组件」。
4. **IO 与领域分离（后端）**：文件读写、路径拼接、环境变量默认值放在 server 或专用 IO 模块；**业务判断**（能否保存、409 原因、合并结果）走 `src/lib/validate` 等已有入口。
5. **API 对称**：新增 HTTP 能力时，**同时**考虑 `src/api/` 客户端封装与 `easy-email-storage-api` 技能索引；错误体形态保持一致、可解析。
6. **命名与导出**：公共模块使用**明确、领域化**命名（`mergeTemplatePayload` 优于 `merge`）；优先**具名导出**便于重构与 tree-shaking。

## 迭代中沉淀

- 新增能力时默认问：**「半年后前端、server 或脚本会复用这段吗？」** 若是，第一次就放在正确层级（契约 → lib → server/UI），而不是「以后再抽」。
- 重构时：**缩小 diff 范围**，先抽公共再改行为，避免行为与结构大挪移混在同一提交。

## 反模式（避免）

- 在多个组件、route handler 或脚本里复制同一 JSON 字段路径、校验规则或 merge 逻辑。
- 在 `App.tsx` 或 `server/index.ts` 持续堆叠本可属于 hook、子组件或 `src/lib` 的逻辑。
- server 为省事 duplicate 一份 `validateTemplate` / payload 契约判断，与 `src/lib` 行为漂移。
- 迁移脚本手写与契约不一致的 JSON 形态，导致「能跑脚本但过不了 `validate:all`」。
- 为省事使用 `any` 绕过类型，或禁用 lint 规则而不补类型/注释说明。
---

## Rule 3: 前端改动与浏览器验收

> 来源：`.cursor/rules/easy-email-frontend-verify-reminder.mdc`

若本次改动影响**模板预览、画布、区块树、Inspector、加载/保存**等可在浏览器中验证的行为，或修改了 **`data/emails/**` 下邮件数据**（`template.json`、`tokenPresets.json`、`payload.json`、`meta.json` 等）从而改变预览中的版式/图片/文案，收尾前在本地已运行 `./start.sh`（或 `npm run dev:all`）的前提下，按技能 **`easy-email-frontend-chrome-verify`**（`.cursor/skills/easy-email-frontend-chrome-verify/SKILL.md`）使用 **`user-chrome-devtools`** MCP 打开 `http://127.0.0.1:5180` 并走验收步骤（含切换到目标邮件、粗查图片加载与控制台/网络）。涉及**保存 template** 时，确认 `PUT` body 与磁盘 `template.json` 均为 **nested 4.0.0**（`schemaVersion` + `root`，无顶层 `blocks`）。

MCP 报 profile 占用冲突时，按技能 **`easy-email-frontend-chrome-verify`** 附录「MCP profile 冲突」处理。
---

## Rule 4: 可拔插式编码（Easy-Email）

> 来源：`.cursor/rules/easy-email-pluggable-code.mdc`

## 与本仓库其他 rule 的分工

| Rule | 粒度 | 回答的问题 |
|------|------|------------|
| **本 rule** | **函数 / 小功能 / 装配** | 这段逻辑怎么写才可加、可换、可删？ |
| **`easy-email-design-reuse`** | 仓库分层与复用 | 放哪一层、先找谁、禁止双写？ |
| **`easy-email-source-first-contract`** | 契约变更与真源 | 共享事实改哪、按什么顺序改全链路？ |

详文：`docs/可拔插式代码开发规范.md`。与源头驱动配套：**可拔插**管日常怎么写函数；**源头驱动**管改 schema/契约时怎么不漏改。

## 写每一个函数时默认遵守

1. **一个函数一件事**；名称与签名 honest 反映职责。
2. **输入输出显式**：参数 + 返回值；避免隐式全局、隐式环境依赖。
3. **规则写纯函数，IO 写薄 wrapper**：业务判断进 `src/lib`；HTTP/落盘/React 副作用在边界。
4. **新逻辑 Prefer 新函数 + 装配**，不在旧函数里无限加 `if` / `switch`；重复分支收敛为策略表/查表。
5. **删逻辑要删干净**：移除调用 → 删函数与测试 → 编译/lint/单测暴露残留；禁止留 dead branch 或未使用 helper。

## 写每一个功能时默认遵守

- 功能 = **若干小函数 + 一处装配**（页面 handler、route、脚本入口），不是单个巨函数。
- **新增功能** Prefer 新增代码；**修改规则** Prefer 换/改纯函数，而不是让旧函数承担两套语义。
- 入口（`App.tsx`、`server/index.ts`、页面容器）**只调度**；变长时先怀疑是否该下沉为 `src/lib` 纯函数。

## 动手前四个问题（答不清先别堆代码）

1. 这个函数是否只做一件事？
2. 输入输出是否显式？
3. 核心规则能否脱离全系统单测？
4. 删除它时影响范围是否清晰？

## 禁止（AI 与人工均适用）

- 在现有函数末尾「继续追加」几十行完成任务，而不拆函数。
- 为一个小需求改共享 helper 语义，波及其他调用方。
- 删功能只删 UI/入口，留下 helper、分支或空壳测试。
- 在 route / 页面 / `App.tsx` 写大段本属 `src/lib` 的业务规则。

## 完成标准（函数级任务）

- 关键规则有可单独测试的纯函数（或薄 wrapper + 纯函数）。
- 删该功能时可列举要删的函数与装配点，且无已知隐式依赖。
- 不只「当前路径能跑」；必要时补对应单测。

以下**不算完成**：逻辑堆在入口大函数；删功能后残留 dead code；修 A 场景误伤 B 场景且无测试约束。
---

## Rule 5: 源头驱动契约式变更（Easy-Email）

> 来源：`.cursor/rules/easy-email-source-first-contract.mdc`

## 与本仓库其他 rule 的分工

- **`easy-email-pluggable-code`**：日常**怎么写函数/小功能**（单一职责、纯函数与 IO 分离、组合优于堆分支、删干净）。
- **`easy-email-design-reuse`**：代码**放哪一层**（分层、复用、先找后写、禁止双写）。
- **本 rule**：改动**按什么路径走完**（先真源 → 派生 → 消费层 → 验证），避免只修报错点。
- **领域细节**（按图还原、block 语义、落盘 API）：读对应 **`.cursor/skills/`**，不在此重复字段表。

理念与检查清单详文：`docs/源头驱动的契约式开发.md`、`docs/变更先改源头执行规范.md`、`docs/AI Coding 硬约束落地清单.md`。函数级编码习惯见 `docs/可拔插式代码开发规范.md` 与 **`easy-email-pluggable-code`**。

## 五条核心（执行时默认遵守）

1. **任何变更先定位源头**：同一业务事实只在一处定义；未改源头前，不先改下游消费层。
2. **派生优于双写**：类型、校验、生成物、映射尽量从契约/模板派生，禁止在多处手写等价结构。
3. **按固定路径展开**：源头 → 派生产物 → 消费层实现 → 自动化验证（见下节顺序）。
4. **不完整修改应尽早失败**：优先 `npm run validate:all` 与类型检查，而非「能编译/能打开页面」即停。
5. **只消当前报错不算完成**：须对照影响面清单，补齐同源消费者与边缘路径。

## Easy-Email：本次改动的「源头」对照

动手前用一句话回答：**这次改动的真源是什么？** 按下表选主源头（可多选，但须先改主源头）：

| 变更类型 | 优先真源（先改这里） | 常见派生 / 消费层 |
|----------|----------------------|-------------------|
| block 字段白名单、类型能力 | `src/block-contract/`（`registry.ts`、`by-type/*.ts`） | `src/lib/validate.ts`、Inspector、渲染 |
| 模板结构、bindings、`$themeRef` | **落盘**：`src/template-disk-contract/` + `src/lib/templateTreeAdapter.ts`；**文件**：`layouts/<layoutVariantId>/template.json` + `layout-manifest.json` | 同版式 `tokenPresets.json`、`EmailPreview`、导出；编辑器内存为 EditorBlockGraph |
| 场景版式清单、路径解析 | `src/layout-variant-contract/` + `src/lib/emailLayoutVariant.ts` | `server/emailLayoutContext.ts`、`src/api/client.ts`（`?layout=`）、`run-validate-all.mjs` |
| 样式档位、标准 token 键 | `tokenPresets.json` + `src/token-preset-contract/` | template 中 `$themeRef` / `bindings.tokenPath` |
| 变量槽目录、取值、collection 列 | `payload.json`（`slots` + `values`）+ `blocks.*.repeat`；契约 `src/payload-contract/` | `template.bindings`（仅 slotId/路径，无 defaultValue）、`mergeTemplatePayload`、校验；技能 **`easy-email-payload-contract`** |
| 禁止持久化、渲染默认语义 | `src/render-defaults-contract/` | 渲染层；**勿**把默认写进 template |
| visibility 表达式合法性 | `src/visibility-contract/` | template 中的 visibility |
| 共享 TS 类型、合并逻辑 | `src/types/`、`src/lib/`（与 React 解耦） | `src/components/`、`server/`（**server 不写双份校验核心**） |
| HTTP 路径、落盘 IO | `server/index.ts` + `easy-email-storage-api` 技能 | `src/api/` 客户端 |
| 全仓库 JSON 形态迭代 | 迁移脚本 `package.json` 中 `migrate:*` / `normalize:*`；索引 **`src/schema-registry/`** | 全量 `data/emails/**`、校验与测试 |
| 列表 repeat 虚拟预览 | **`src/repeat-binding-contract/`** + **`src/repeat-runtime/`** | `App.tsx`、BlockTree、EmailPreview、Inspector；物化/解绑 **`repeatRegion.ts`** |

概念索引与口语路由：技能 **`easy-email-concepts`**。

## 标准执行顺序（默认 8 步，可合并说明）

1. **确认意图**：改结构 / 规则 / 契约 / 文案？影响哪层业务事实？
2. **识别源头**：记录「本次真源是 X」，禁止跳过直接改页面或 patch handler。
3. **列影响面**：至少扫——契约目录、校验、`data/emails/**`、前端渲染/Inspector、`server/`、迁移脚本、相关测试与 Golden。
4. **先改源头**：契约 / template / schema / migration 先于消费层提交。
5. **更新派生**：类型、校验器、生成物、registry；源头已变则**不得**保留过期派生。
6. **补齐消费层**：按影响面逐项改 UI、API、脚本；不只修主路径。
7. **跑验证**：交付前 **`npm run validate:all`**；涉及契约/迁移时补对应测试或 `migrate:*` 后全量校验。
8. **发布前（高风险）**：历史数据兼容、breaking API、异步/三方边界——见 `docs/变更先改源头执行规范.md` §8。

## 禁止（AI 与人工均适用）

- 未动 `block-contract` / 契约目录，先在多个组件里散落补字段或校验。
- 未动 `template.json`，先改预览样式或 Inspector 特例绕过结构。
- 在 `server/` 或页面重复实现本应在 `src/lib` + 契约层的合并/校验逻辑。
- 源头已改，跳过 `validate:all` 或保留未更新的生成/类型结果。
- 因一处报错消失即结束，未检查同类消费者与 `data/emails/**` 其它模板（若属全量迁移）。

## 完成标准（缺一不可）

- 已识别并修改真源；影响面已显式排查。
- 派生与消费层与真源一致；无平行双写的新增字段/状态。
- 已运行与变更匹配的验证（至少 **`npm run validate:all`**）。
- 改动预览/画布/Inspector 或 `data/emails/**` 时，按 **`easy-email-frontend-verify-reminder`** 做浏览器验收。

以下**不算完成**：仅编译通过、仅当前文件无报错、仅主路径能打开预览。

## 本仓库 P0 硬约束（对照《硬约束落地清单》）

- **单一真源**：字段与禁止项以 `src/*-contract/`、`validate.ts` 为准，技能与 docs 不维护第二份键表。
- **类型与校验**：结构变更须触发类型/校验失败或修复，禁止 `any` 糊弄契约层。
- **全量迁移**：template 形态迭代须统一覆盖 `data/emails/**`，禁止多 schema 并存（见技能 **`easy-email-json-unified-migration`**）。
- **CI 级自检**：提交前 `npm run validate:all`；改 rules/skills 后 `npm run sync:claude` + `npm run sync:claude:check`。

中大型改动或立项级治理：对照 `docs/AI Coding 硬约束落地清单.md` 的 P1/P2（契约测试、迁移测试、发布门禁等）逐项勾选。

## 场景快查

| 场景 | 顺序要点 | 技能 |
|------|----------|------|
| 按设计图还原邮件 | tokenPresets → template → payload → validate → 浏览器 | `email-template-restore-guide`、`email-template-restore-check` |
| 仅改业务文案/链接 | `payload.json`（槽在 template.bindings） | `easy-email-payload-contract` |
| 列表绑定 / 解除 / 物化重绑 / 嵌套 skus 循环 | **`src/repeat-runtime/`** + `repeatRegion.ts` → Inspector/弹窗；**勿**在 skills 重复键表 | `easy-email-repeat-binding` |
| block 类型/字段新增、配置母版 | `block-contract` → `validate.ts` → 模板/Inspector/渲染 | `email-config-motherboard` |
| 落盘/API | 先契约与 `server/`，再 `src/api/` | `easy-email-storage-api` |
| 场景版式（含单版式 `default`） | `layout-manifest.json` + `layouts/<id>/`（template + tokenPresets）；新建场景须自带 manifest | 顶栏版式切换（多版式时）、`useEmailDiskPersist` 多版式 payload 预检 |
---

## Rule 6: 同步 Claude 规则与技能

> 来源：`.cursor/rules/sync-claude-after-cursor-guidance-change.mdc`

当本次改动涉及 `.cursor/rules/` 或 `.cursor/skills/` 时，收尾前执行：

```bash
npm run sync:claude
npm run sync:claude:check
```

例外：只修改当前规则文件 `.cursor/rules/sync-claude-after-cursor-guidance-change.mdc` 时，不需要触发同步。

同步以 Cursor 侧为蓝本，会覆盖 `.claude/skills/*.md` 并重新生成 `CLAUDE.md`。若同步后出现变更，应把这些 Claude 镜像文件与本次 Cursor 源文件一起纳入同一轮改动。
