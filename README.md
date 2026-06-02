# Easy-Email

邮件模板与编辑相关的本地优先项目：用 **nested 4.0.0 JSON（`root` 嵌套 block 树）** 描述邮件结构，配合 **样式预设 + 变量赋值**，按目录隔离存储，便于前端编辑与本地 Agent 批量产出模板。

---

## 契约真源（Agent / 维护者入口）

**`.cursor/skills/`** 为唯一规格与工作流真源；`npm run sync:claude` 会同步到 `.claude/skills/` 并生成 **[CLAUDE.md](./CLAUDE.md)**。

| 技能 | 内容 |
|------|------|
| [easy-email-concepts](./.cursor/skills/easy-email-concepts/SKILL.md) | 概念、三层 JSON、编辑器 MVP |
| [easy-email-storage-api](./.cursor/skills/easy-email-storage-api/SKILL.md) | `data/emails/` 落盘、本地 API |
| [email-config-motherboard](./.cursor/skills/email-config-motherboard/SKILL.md) | 配置母版与 block 架构 |
| [email-template-restore-guide](./.cursor/skills/email-template-restore-guide/SKILL.md) | 按图还原流程与模块壳/token |
| [email-template-restore-check](./.cursor/skills/email-template-restore-check/SKILL.md) | 还原自检清单 |

**落盘 artifact 版本索引**：[`src/schema-registry/`](./src/schema-registry/)（引用各 `*-contract` 常量；`npm run validate:all` 经 registry 校验 meta / tokenPresets / layoutManifest 等）。

完整技能表见 [CLAUDE.md](./CLAUDE.md)。`docs/project-plan.md` 仅为历史备忘，**不是**契约。

**结构批量迁移**：`npm run migrate:text-body -- --write`、`npm run validate:all`、`npm run migrate:content-align-hug-neutral:write` 等见 `package.json`；交付前 **`npm run validate:all`**。

---

## 本地开发与预览

| 场景 | 命令 | 说明 |
|------|------|------|
| **日常改前端（推荐）** | `npm run dev` | Vite 热更新；需要 API 时用 `npm run dev:all` 或 `./start.sh`。 |
| **验收构建产物** | `npm run build` 后 `npm run preview` | 读 **`dist/`**，改源码后须重新 build。 |

### SMTP 测试发信（画布预览 → 邮箱）

1. 复制 `.env.example` 为 `.env`，填入 `EMAIL_SMTP_*`（测试邮箱的 SMTP 主机、账号、授权码）。
2. `./start.sh` 或 `npm run dev:all` 启动后，在编辑器侧栏 **邮件元信息** 中填写测试收件人，点击 **发送测试邮件**。
3. 邮件 HTML 来自当前画布 `.email-preview-scope` 的渲染结果；发件人固定为 `.env` 中的 `EMAIL_SMTP_FROM`，与 meta 里「发件人」表单项无关。

---

## 数据目录

```
data/emails/<emailKey>/
  payload.json              # 场景级共用
  layout-manifest.json      # 多版式时
  meta.json                 # 可选
  layouts/<layoutVariantId>/
    template.json
    tokenPresets.json
```

详见技能 **[easy-email-storage-api](./.cursor/skills/easy-email-storage-api/SKILL.md)**。

---

## 辅助脚本

| 场景 | 命令 |
|------|------|
| YAML 夹具展开调试 | `npm run template-yaml:expand -- --in <夹具.yaml> --out <输出.json>`（见 `email-template-yaml-check` 技能） |

长期维护入口：`template.json` + `tokenPresets.json` + `payload.json` + `meta.json`（版式场景下 template/tokenPresets 在 `layouts/<id>/`）。

---

## 许可

未声明前默认为项目私有；需要时再添加 `LICENSE`。
