---
name: email-template-yaml-check
description: >-
  邮件模板 YAML 夹具：经 scripts/email-template-yaml-to-template.mjs 展开为 template.json 后对照 validateTemplate 与 Golden 期望值，用于契约回归与非法字段检查，非业务维护入口。
  当用户说 YAML 夹具、template-yaml golden、YAML 展开检查、手写检查用 YAML、非法字段应失败 时使用。
  按设计图还原整封邮件走 email-config-motherboard / email-template-restore-guide，勿把 YAML 当主交付格式。
---

# 邮件模板 YAML 检查（夹具 + Golden）

## 定位（先读）

- **YAML 在本仓库的用途**：**测试与检查**——最小合法夹具、期望 `template.json` 快照、应报错的非法用例；纳入 **`npm run validate:all`**。
- **不是**：业务邮件的日常编辑格式；真源仍是 **`data/emails/<id>/template.json`** 等 JSON。

## 代码真源指针

| 主题 | 路径 |
|------|------|
| kind → type / blockType、YAML 允许键、各 kind 的 props 白名单 | **`scripts/email-template-yaml-to-template.mjs`**（**`KIND_MAP`**、**`YAML_*_KEYS`**、**`PROPS_KEYS_BY_KIND`**） |
| 展开后校验 | 脚本内 **`validateTemplate`**（**`src/lib/validate.ts`**） |
| 展开结果 block 白名单 | **`src/block-contract/`** |
| 按图还原 / 配置母版 | **`email-config-motherboard`**、**`email-template-restore-guide`** |

**说明**：夹具 YAML 中 **`kind: overlay`** 展开为 **`layout` + `wrapperStyle.backgroundImage`**；运行态 template **不应**再含旧 **`type: "overlay"`** 块。

## 命令（以 `package.json` 为准）

```bash
npm run template-yaml:golden              # Golden + 非法用例（validate:all 会跑）
npm run template-yaml:golden:write        # 有意更新 golden-minimal.expected.json
npm run template-yaml:expand -- --in <夹具.yaml> --out <template.json>   # 本地调试展开
```

夹具目录：**`tests/fixtures/email-template-yaml/`**（`golden-minimal.fixture.yaml`、`golden-invalid-unknown-field.fixture.yaml` 等）。

## 扩展展开器时

改 **`email-template-yaml-to-template.mjs`** 须同步 Golden；**禁止**在 skills 复制与脚本 **`PROPS_KEYS_BY_KIND`** 冲突的第二份键表。新增 kind 须先满足 **`block-contract`** + **`validate.ts`**。
