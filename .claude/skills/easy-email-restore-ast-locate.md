---
name: easy-email-restore-ast-locate
description: >-
  由 Inspector「复制定位信息」（模板路径 + 区块 ID）反查 AI 以图还原日志中的 restore-ast.json
  AST 节点：解析 logs/restore-ast-*/07-block-id-map.json，输出 astPath 与对应 JSON 片段。
  当用户粘贴区块定位文案、问「这个模块 AI 还原的 restore json 在哪」「astPath」「block-id-map」
  或排查以图还原某区块语义问题时使用；配套脚本 scripts/restore-ast-locate.mjs。
---

# RestoreAst 区块 → restore.json 快速定位

## 何时读本技能

用户粘贴或引用 **Inspector「复制定位信息」** 多行文案，并询问某模块在 **AI 以图还原** 中的语义来源、restore AST 片段、或还原为何如此结构化时。

典型定位文案形态（字段名须一致）：

```text
模板文件: data/emails/<emailKey>/layouts/<layoutVariantId>/template.json
面板: 区块设置
区块 ID: <emailKey>-<layoutVariantId>-<tag>-<n>
JSON 路径: blocks["..."]
区块类型: ...
区块名称: ...
```

## 核心规则（勿与 template 路径混淆）

| 概念 | 说明 |
|------|------|
| **桥接文件** | `logs/restore-ast-<runId>/07-block-id-map.json`：`blockId → astPath` |
| **语义真源** | 同目录 `02-restore-ast.json`：`{ theme, tree }` |
| **astPath** | 如 `tree.children[3].children[0].children[2]`，**不是** `blocks["id"]` |
| **block 计数 id** | `grid-3` 是组装器第 3 个 grid，**不等于** `tree.children[3]` |

`template.json` **不含** restore 索引；必须从日志 map 查表（或跑本脚本）。

## 执行顺序（Agent 默认）

1. **优先跑脚本**（比手写 grep 可靠）：

```bash
npx tsx scripts/restore-ast-locate.mjs --locator '<用户粘贴的完整定位文案>'
```

或拆开传参：

```bash
npx tsx scripts/restore-ast-locate.mjs \
  --template data/emails/template-mqhos2xu/layouts/10/template.json \
  --block-id template-mqhos2xu-10-grid-3
```

2. 将脚本输出的 **astPath、日志目录、AST 节点 JSON** 呈现给用户；分析还原问题时对照该节点与 `template.json` 同区块。

3. 若脚本报「未找到 restore 日志」：
   - 列出现有 run：`npx tsx scripts/restore-ast-locate.mjs --template <path> --all-runs`
   - 或用户指定：`--log-dir logs/restore-ast-<前缀>`

4. 若 map 中无该 blockId：说明版式在还原后被**增删改**过，或 run 不对；换 `--all-runs` 试其它 run，并说明 map 可能已过期。

## 脚本选项

| 选项 | 用途 |
|------|------|
| `--locator` | 粘贴 Inspector 多行定位文案 |
| `--template` / `--block-id` | 显式场景 + 区块 |
| `--log-dir` | 跳过按场景搜日志，直指某次 run |
| `--all-runs` | 列出该版式所有 restore run |
| `--json` | 机器可读完整结果 |

## 手动兜底（无脚本时）

```bash
# 1. 从模板路径得 emailKey、layoutVariantId
# 2. 找 run
grep -l '"layoutVariantId": "10"' logs/restore-ast-*/00-run-meta.json

# 3. 查 map（将 BLOCK_ID 换成用户给的区块 ID）
node -e "console.log(JSON.parse(require('fs').readFileSync('logs/restore-ast-XXX/07-block-id-map.json','utf8'))['BLOCK_ID'])"
```

## 回复用户时的结构

1. **定位摘要表**：区块 ID、astPath、日志目录、还原时间  
2. **AST 节点片段**（`t` / `title` / 关键字段）  
3. **与 template 的差异说明**（若用户问「为何多包一层 layout」等）：对照 `src/lib/ai-pipeline/restore-ast/promptsRestoreAst.ts` 与 `src/restore-ast-contract/buildNode.ts`（`stack`→`layout`，`grid`→`grid`）  
4. **局限**：日志在 `logs/` 未入版式目录；手改 template 后 map 可能过时  

## 测试夹具（非日常版式）

`scripts/fixtures/restore-ast/<夹具名>/` 含 `restore-ast.json` + `block-id-map.json`，供冒烟脚本；**用户场景 `data/emails/...` 仍走 `logs/restore-ast-*`**。

## 相关真源

| 主题 | 路径 |
|------|------|
| 组装与 map 写入 | `src/restore-ast-contract/buildCtx.ts`、`runRestoreAstFromDesignImage.ts` |
| 定点修复设计（blockId↔astPath） | `docs/AI以图还原-第5步-定点修复设计.md` |
| Restore 提示词与 grid/stack 示例 | `src/lib/ai-pipeline/restore-ast/promptsRestoreAst.ts` |
