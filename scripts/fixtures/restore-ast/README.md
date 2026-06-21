# RestoreAst 测试夹具

每套邮件还原测试的**全部材料**放在同一子目录下，不要散落到 `data/emails` 或其它路径。

## 目录约定（以 `forever21-template46/` 为例）

```
forever21-template46/
  design.png              # 设计图原图（第 4 步输入；须从用户源文件二进制复制，见下）
  restore-ast.json        # AI 输出的 { theme, tree }（第 4 步产出 / 手改夹具）
  assets.json             # 组装器收集的资产槽清单（冒烟脚本自动刷新）
  assets-resolved.json    # Pexels + 图标 CDN 解析结果（第 3 步落盘）
  assets-mirrored.json    # 可选：本地镜像清单（见 mirror 脚本）
  block-id-map.json       # blockId ↔ astPath（冒烟脚本自动刷新）
  media/
    images/*.jpg          # 可选：远程图离线副本
    icons/*.svg           # 可选：远程图标离线副本
  out/
    template.json         # 最近一次组装的本地快照（冒烟脚本自动刷新）
    tokenPresets.json
```

编辑器里预览仍走 `data/emails/ai-2/layouts/restore-run-N/`（`--email ai-2 --new-layout`）；**夹具目录只存输入与中间产物**，`out/` 是本地 golden，不必去 `data/emails` 翻。

## 设计图 `design.png`（重要）

夹具里的 `design.png` 必须是**用户提供的源文件原样复制**（二进制 `cp`，不做压缩/重编码）。

| 做法 | 说明 |
|------|------|
| **推荐** | 从本机源路径复制，如 `~/Downloads/邮件学习模板/客户感谢 2（模板 30）.png` |
| **禁止** | 从 Cursor 聊天 `assets/` 目录复制——多为窄条 JPEG 预览（如 160×1024），不是原图 |

```bash
# 复制到指定夹具（二进制 copyFile，无重编码）
npx tsx scripts/fixtures/copy-restore-ast-design.mjs \
  --fixture methodical-template30 \
  --from "/Users/you/Downloads/邮件学习模板/客户感谢 2（模板 30）.png"
```

验收：与其它夹具对齐，宽度通常约 **680px** 的 PNG（高度随邮件长度变化）。若只有 ~160px 宽或 JPEG 伪装成 `.png`，说明复制源不对。

**批量同步（9 套测试夹具）**：路径清单见 `design-sources.json`，一键从 Downloads 原图覆盖：

```bash
npx tsx scripts/fixtures/sync-restore-ast-designs.mjs
# 只同步某一夹具
npx tsx scripts/fixtures/sync-restore-ast-designs.mjs --fixture forever21-template46
```

## 常用命令

```bash
# 1. 解析远程资产（需 .env 中 PEXELS_API_KEY）
npx tsx scripts/fixtures/resolve-ast-assets.mjs \
  --in scripts/fixtures/restore-ast/forever21-template46/restore-ast.json

# 2. 可选：把图片/图标下载到夹具 media/（离线查阅）
npx tsx scripts/fixtures/mirror-ast-fixture-media.mjs \
  --in scripts/fixtures/restore-ast/forever21-template46/restore-ast.json

# 3. 组装 + 回填 + 刷新夹具侧 JSON，并在 ai-2 新建一版
npx tsx scripts/fixtures/ast-to-template-smoke.mjs \
  --email ai-2 --new-layout \
  --in scripts/fixtures/restore-ast/forever21-template46/restore-ast.json
```

`--in` 指向 `restore-ast.json` 时，`assets-in` / `assets-out` / `map-out` 默认都用同目录下的兄弟文件，无需手写长路径。

`--new-layout` 版式 id / 展示名 = **夹具文件夹名 + 序号**（从 1 起、按夹具分别计数），例如 `forever21-template46-3`、`huckberry-template48-1`。

## 新建另一套夹具

1. 复制 `forever21-template46/` 目录结构（或 `mkdir` 空目录）。
2. 用 **`copy-restore-ast-design.mjs`** 从用户源路径写入 `design.png`（勿用 Cursor assets 预览图）。
3. 手写或生成 `restore-ast.json`。

脚本按 `--in` 自动识别夹具目录。
