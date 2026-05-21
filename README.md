# Easy-Email

邮件模板与编辑相关的本地优先项目：用 **规范化 JSON（block 树）** 描述邮件，配合 **模板 + 配置面 + 样式预设 + 变量赋值**，按目录隔离存储，便于前端编辑与本地 Agent 批量产出模板。

---

## 契约真源（Agent / 维护者入口）

**`.cursor/skills/`** 为唯一规格与工作流真源；`npm run sync:claude` 会同步到 `.claude/skills/` 并生成 **[CLAUDE.md](./CLAUDE.md)**。

| 技能 | 内容 |
|------|------|
| [easy-email-concepts](./.cursor/skills/easy-email-concepts/SKILL.md) | 概念、四层 JSON、编辑器 MVP |
| [easy-email-storage-api](./.cursor/skills/easy-email-storage-api/SKILL.md) | `data/emails/` 落盘、本地 API |
| [email-config-motherboard](./.cursor/skills/email-config-motherboard/SKILL.md) | 配置母版与 block 架构 |
| [email-template-restore-guide](./.cursor/skills/email-template-restore-guide/SKILL.md) | 按图还原流程与模块壳/token |
| [email-template-restore-check](./.cursor/skills/email-template-restore-check/SKILL.md) | 还原自检清单 |

完整技能表见 [CLAUDE.md](./CLAUDE.md)。`docs/project-plan.md` 仅为历史备忘，**不是**契约。

**结构批量迁移**：`npm run migrate:text-body -- --write`、`npm run migrate:placement -- --write` 等见 `package.json`；交付前 **`npm run validate:all`**。

---

## 本地开发与预览

| 场景 | 命令 | 说明 |
|------|------|------|
| **日常改前端（推荐）** | `npm run dev` | Vite 热更新；需要 API 时用 `npm run dev:all`。 |
| **验收构建产物** | `npm run build` 后 `npm run preview` | 读 **`dist/`**，改源码后须重新 build。 |

---

## 数据目录

```
data/emails/<emailKey>/
  template.json
  configSchema.json
  tokenPresets.json
  payload.json
  meta.json          # 可选
```

详见技能 **[easy-email-storage-api](./.cursor/skills/easy-email-storage-api/SKILL.md)**。

---

## 辅助脚本

| 场景 | 命令 |
|------|------|
| 补齐配置面与样式预设 | `npm run migrate:config-surface -- --write` |
| YAML 夹具展开调试 | `npm run template-yaml:expand -- --in <夹具.yaml> --out <输出.json>`（见 `email-template-yaml-check` 技能） |

长期维护入口：`template.json` + `configSchema.json` + `tokenPresets.json` + `payload.json` + `meta.json`。

---

## 许可

未声明前默认为项目私有；需要时再添加 `LICENSE`。
