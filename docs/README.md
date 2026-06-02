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
| [project-plan.md](./project-plan.md) | 项目规划与历史对话备忘（**非** API/JSON 契约） |

Agent 默认执行摘要见 Cursor rule：**`.cursor/rules/easy-email-source-first-contract.mdc`**（`alwaysApply`）。

## 结构迁移脚本

与 skills 及 `validateTemplate` 对齐时，使用 `package.json` 中的 `migrate:*` / `normalize:*`；交付前执行 **`npm run validate:all`**。
