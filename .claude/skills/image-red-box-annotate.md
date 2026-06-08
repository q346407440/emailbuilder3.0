---
name: image-red-box-annotate
description: >-
  在 PRD/文档截图上按 CSS 视口坐标绘制红色圆角矩形框（Pillow 脚本 prd-annotate-image-regions.py）。
  在用户要求红框、圈选、标注区域、四宫格标注顶栏+左中右，或已有 user-chrome-devtools 截图与
  evaluate_script 返回的 regions 时使用。整页原图采集见 user-chrome-devtools-screenshot-page；
  弹窗/区域裁切图见 user-chrome-devtools-screenshot-region。
---

# 截图红框标注

## 何时使用

- PRD / **`docs/prd-assets/`** 配图需要**红框圈选**（单区或多区）  
- 已有 **原图 PNG** + **`evaluate_script` 返回的 `viewport` 与 `regions`**（与截图同一视口）  
- 用户要求「顶栏一个、下面左中右三个」等**多区域**标注  

## 前置条件

| 项 | 要求 |
|----|------|
| **原图** | `user-chrome-devtools` 的 `take_screenshot` 落盘路径（见 **`user-chrome-devtools-screenshot-page`**） |
| **坐标系** | 区域为 **CSS 视口** `getBoundingClientRect()`（`x,y,w,h`），**不是**截图像素坐标 |
| **viewport** | 必须与采集坐标时 `window.innerWidth/innerHeight` 一致 |
| **依赖** | `pip3 install pillow`（一次性） |

## 标准流程

```
- [ ] 确认原图在 docs/prd-assets/
- [ ] 准备 regions JSON + viewport 宽高
- [ ] 运行 scripts/prd-annotate-image-regions.py
- [ ] 目视检查红框是否对齐（顶栏/三栏等）
- [ ] PRD 引用标注版路径并写图示说明（区域编号与章节对应）
```

## 脚本（真源）

```bash
python3 scripts/prd-annotate-image-regions.py \
  --input docs/prd-assets/project-prd-editor-layout.png \
  --output docs/prd-assets/project-prd-editor-layout-4regions-highlight.png \
  --viewport 2560,1440 \
  --regions-file /tmp/editor-regions.json
```

### regions JSON 形态

```json
{
  "top": { "x": 0, "y": 0, "w": 2560, "h": 52 },
  "left": { "x": 0, "y": 52, "w": 260, "h": 1388 },
  "center": { "x": 260, "y": 52, "w": 1920, "h": 1388 },
  "right": { "x": 2180, "y": 52, "w": 380, "h": 1388 }
}
```

也可包一层（脚本会自动解包）：

```json
{
  "viewport": { "w": 2560, "h": 1440 },
  "regions": { ... }
}
```

内联 JSON：

```bash
python3 scripts/prd-annotate-image-regions.py \
  -i docs/prd-assets/foo.png \
  -o docs/prd-assets/foo-highlight.png \
  --viewport 1920,1080 \
  --regions-json '{"banner":{"x":0,"y":0,"w":1920,"h":48}}'
```

### 像素换算（脚本内部）

- `sx = 截图宽度 / viewport.w`，`sy = 截图高度 / viewport.h`  
- 截图常为 **设备像素**（如 1920×1080）而 evaluate 返回 **CSS 视口**（如 2560×1440），**必须**传入正确 viewport，禁止手写像素框除非已换算。  

## 默认样式（与现有 PRD 图一致）

| 参数 | 默认 |
|------|------|
| 颜色 | `#E53935`（229,57,53） |
| 线宽 | 5px |
| 内边距 | 6px（框相对区域略缩） |
| 圆角 | 12px |

可选：`--pad`、`--stroke`、`--radius`。

## Easy-Email：邮件编辑器四区

与 **`user-chrome-devtools-screenshot-page`** 中 `evaluate_script` 一致：

| 键 | DOM | PRD 含义 |
|----|-----|----------|
| `top` | `.topbar` | §3.2 顶栏 |
| `left` | `.workspace .block-tree` | 左侧列表（随 Tab 变） |
| `center` | `.canvas-col` | 画布 |
| `right` | `.workspace .inspector, .side-inspector` | 右侧配置 |

产出示例：`project-prd-editor-layout-4regions-highlight.png`。

## PRD 引用约定

```markdown
![邮件编辑器整体布局：顶栏 + 左 / 中 / 右（四个红框）](./prd-assets/project-prd-editor-layout-4regions-highlight.png)

> **图示说明**：红框 ① 顶栏、② 左侧列表、③ 画布、④ 右侧配置……
```

- **原图**可保留无标注版作备档；PRD 正文优先引用 **`-highlight` / `-4regions-highlight`**。  

## 反模式

- 截图与 regions **不同一次导航/视口** → 框错位  
- 省略 `viewport`、按截图像素瞎填 `x,y,w,h`  
- 在技能里用 ImageMagick 临时命令替代仓库脚本（除非脚本不可用且需记录原因）  

## 相关技能

| 技能 | 关系 |
|------|------|
| **`user-chrome-devtools-screenshot-page`** | 采集整页原图与 regions |
| **`user-chrome-devtools-screenshot-region`** | 弹窗/下拉裁切图（非红框流程） |
| **`easy-email-frontend-chrome-verify`** | 功能验收，非配图专用 |
