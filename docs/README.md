# Easy-Email 文档

## 契约与索引

**规格与 Agent 工作流说明** 的撰写入口：**`.cursor/skills/`**（运行 `npm run sync:claude` 后同步至 `.claude/skills/` 与根目录 `CLAUDE.md`）。技能正文以 **引用代码** 为主，**不**重复维护完整字段表。

| 技能 | 用途 |
|------|------|
| [easy-email-concepts](../.cursor/skills/easy-email-concepts/SKILL.md) | 概念索引、口语 ↔ 路径 |
| [easy-email-storage-api](../.cursor/skills/easy-email-storage-api/SKILL.md) | 落盘目录、本地 API、`emailKey` |
| [email-config-motherboard](../.cursor/skills/email-config-motherboard/SKILL.md) | 配置母版与 block 架构 |
| [email-template-restore-guide](../.cursor/skills/email-template-restore-guide/SKILL.md) | 按图还原：白话流程 + 模块壳/token |
| [email-template-restore-check](../.cursor/skills/email-template-restore-check/SKILL.md) | 还原易错案例与自检 |
| [email-token-preset-standard-scope](../.cursor/skills/email-token-preset-standard-scope/SKILL.md) | 样式预设标准键索引 |
| 其余技能 | 见 [CLAUDE.md](../CLAUDE.md) 技能表 |

**实现真源（机器校验）**：`src/block-contract/`、`src/schema-registry/`、`src/lib/validate.ts`、`src/types/email.ts`、`src/payload-contract/`、`src/repeat-binding-contract/`、`src/repeat-runtime/`、`src/render-defaults-contract/`、`src/token-preset-contract/`、`src/visibility-contract/`、`src/lib/validateTokenPresets.ts`、`server/index.ts`。

索引技能：**`easy-email-payload-contract`**（变量 slots/values 分工）、**`easy-email-repeat-binding`**（列表 repeat 绑定）。

## 本目录其他文件

| 文件 | 说明 |
|------|------|
| [源头驱动的契约式开发.md](./源头驱动的契约式开发.md) | 方法论：四层模型、五条主张、与 skills/rules 的关系 |
| [变更先改源头执行规范.md](./变更先改源头执行规范.md) | 操作层：8 步流程、分场景指引、完成标准与评审 |
| [AI Coding 硬约束落地清单.md](./AI%20Coding%20硬约束落地清单.md) | 工程约束 P0/P1/P2 检查项与成熟度判断 |
| [可拔插式代码开发规范.md](./可拔插式代码开发规范.md) | 通用方法论：函数级可拔插（单一职责、显式 IO、组合优于堆分支）；与源头驱动配套 |
| [prd.md](./prd.md) | 邮件编辑器产品需求说明（PRD） |
| [step2-相似品搭配品-derivedFrom-执行计划.md](./step2-相似品搭配品-derivedFrom-执行计划.md) | 派生列表 A/B 执行计划（`easy-email-repeat-binding` 技能索引） |
| [ai-email-generation-api/](./ai-email-generation-api/) | 以图 AI 创建版式方案与 API 参考 |

## 方法论文档与 Cursor Rules

| 文档 | 粒度 | Cursor Rule | alwaysApply |
|------|------|-------------|-------------|
| [可拔插式代码开发规范.md](./可拔插式代码开发规范.md) | 函数 / 小功能 | `easy-email-pluggable-code.mdc` | ✅ |
| [源头驱动的契约式开发.md](./源头驱动的契约式开发.md) | 契约 / 方法论 | `easy-email-source-first-contract.mdc` | ✅ |
| [变更先改源头执行规范.md](./变更先改源头执行规范.md) | 变更流程 | ↑ 同上 | ✅ |
| [AI Coding 硬约束落地清单.md](./AI%20Coding%20硬约束落地清单.md) | 工程底座 | ↑ 同上 | ✅ |
| — | 仓库分层与复用 | `easy-email-design-reuse.mdc` | ✅ |

日常写码：**可拔插** → **分层复用**；改共享契约：**源头驱动** rule。Agent 默认加载上述 `alwaysApply` rules。

## 结构迁移脚本

与 skills 及 `validateTemplate` 对齐时，使用 `package.json` 中的 `migrate:*` / `normalize:*`；交付前执行 **`npm run validate:all`**。
