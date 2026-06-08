---
name: user-chrome-devtools-screenshot-region
description: >-
  使用 user-chrome-devtools MCP 对弹窗、下拉、面板等**单个 UI 区域**配图：视口 take_screenshot +
  evaluate_script 取 getBoundingClientRect，再用 scripts/prd-crop-screenshot-rect.py 按 innerWidth 比例裁切。
  在用户要求 PRD 弹窗配图、只截对话框/下拉、组件截图、不要整页灰底白边，或 project-prd-topbar 类局部图时使用。
  整页视口图见 user-chrome-devtools-screenshot-page。profile 冲突见 chromedevtools-mcp-conflict。
---

# Chrome DevTools MCP — 区域 / 组件截图

产出**仅含目标组件**的 PNG（无大面积页面灰底），适用于 PRD 弹窗、确认框、下拉菜单等。

## 核心方法（勿跳过）

MCP 对 `[role="dialog"]` 的 `take_screenshot` **uid** 往往截到**全屏遮罩**（远大于白底面板）。正确做法：

1. **`take_screenshot`**：当前**视口**整图 → 临时文件（如 `docs/prd-assets/_capture-temp.png`）  
2. **`evaluate_script`**：对**真实可见面板**取 `getBoundingClientRect()`，并带上 `viewportWidth` / `viewportHeight`  
3. **`scripts/prd-capture-crop.sh`**：按 `截图像素 / innerWidth` 比例裁切 → 终稿 PNG  

裁切脚本真源：`scripts/prd-crop-screenshot-rect.py`（依赖 `pip3 install pillow`）。

## 与页面截图技能的分工

| 技能 | 产出 |
|------|------|
| **`user-chrome-devtools-screenshot-page`** | 整页视口（含工作区、灰底） |
| **本技能（region）** | 裁切后的单组件（宽约 500–720px 量级） |

## 何时使用

- PRD § 顶栏弹窗、二次确认、未保存提示等**只要对话框**  
- 版式/模板下拉，且需展示底部「删除」**置灰**等局部状态  
- 用户明确「不要整页」「只截弹窗/下拉/这块区域」

## 执行前

1. 读 MCP schema：`take_screenshot`、`evaluate_script`、`emulate`、`navigate_page`。  
2. 本地 dev 已启动（`http://127.0.0.1:5180`）。  
3. profile 占用 → **`chromedevtools-mcp-conflict`**。

## 标准流程

```
- [ ] navigate_page + emulate（PRD 弹窗推荐 1920x1080x2）
- [ ] 操作 UI 至目标状态（打开弹窗/下拉；破坏性操作最后取消）
- [ ] evaluate_script 写入 rect JSON（含 viewportWidth/Height）
- [ ] take_screenshot → _capture-temp.png（与上一步同一视口、中间勿滚动/改 emulate）
- [ ] bash scripts/prd-capture-crop.sh <temp> <out.png> '<rect json>'
- [ ] file 校验终稿尺寸（非 1920×1080 整页）
- [ ] 删除 _capture-temp.png、_rect.json；勿确认删除/创建
```

### 1. 视口 `emulate`

```text
emulate → viewport: "1920x1080x2"
```

- 实际 `innerWidth` 可能仍大于 1920（Retina/窗口最大化）；**裁切脚本会用 viewportWidth 对齐比例**，勿手写 `devicePixelRatio`。  
- `resize_page` 失败时只用 `emulate`。

### 2. 采集裁切框 `evaluate_script`

**通用 rect 形状**（写入 `filePath` 或返回给 shell）：

```javascript
() => {
  const panel = document.querySelector(".shop-section-modal"); // 按目标改选择器
  if (!panel) return null;
  const r = panel.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}
```

**Easy-Email 常用选择器**

| UI | 选择器 | 说明 |
|----|--------|------|
| 顶栏表单/确认弹窗（SDS Modal 白底） | `.shop-section-modal` | 未保存确认等同理 |
| 版式/模板下拉浮层 | `.sds-select-dropdown` 或含 `[role="listbox"]` 的最近 dropdown 容器 | 参考 `scripts/prd-get-crop-rect.js` |

下拉裁切示例：

```javascript
() => {
  const list = document.querySelector('[role="listbox"]');
  if (!list) return null;
  const dd =
    list.closest(".sds-select-dropdown") ??
    list.closest(".sds-select-dropdown-wrap") ??
    list.parentElement?.closest("[class*='select-dropdown']");
  const target = dd ?? list.parentElement?.parentElement;
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}
```

`evaluate_script` 可将结果写入仓库文件，例如：

```text
arguments: { "function": "() => { ... }", "filePath": "/.../docs/prd-assets/_rect.json" }
```

### 3. 视口截图

```text
take_screenshot → filePath: /.../docs/prd-assets/_capture-temp.png
```

**顺序**：先取 rect，再截图（或紧挨执行、中间勿改视口/滚动）。

### 4. 裁切落盘

```bash
bash scripts/prd-capture-crop.sh \
  /path/to/docs/prd-assets/_capture-temp.png \
  /path/to/docs/prd-assets/project-prd-<主题>.png \
  "$(cat /path/to/docs/prd-assets/_rect.json)"
```

成功时脚本打印如：`project-prd-xxx.png: 720x398`。

### 5. 验收

```bash
file docs/prd-assets/project-prd-*.png
```

| 预期 | 反例 |
|------|------|
| 宽约 500–720px（弹窗）、下拉可更窄 | `1920 x 1080` 整页 |
| 主体为白底面板/下拉，无大面积编辑器灰底 | 整屏遮罩 |

## Easy-Email 顶栏 PRD 示例路径

| 图 | 操作要点 |
|----|----------|
| `project-prd-topbar-modal-*.png` | 模板/版式下拉 → 新建/重命名 → `.shop-section-modal` |
| `project-prd-topbar-confirm-delete-*.png` | 删除 → 确认框 → `.shop-section-modal` |
| `project-prd-topbar-layout-delete-disabled-single-variant.png` | `email=grid-test` 单版式 → 版式下拉 → dropdown rect |
| `project-prd-topbar-confirm-unsaved-changes.png` | 改 Inspector 制造未保存 → 切换版式 → `.shop-section-modal` |

邮件：`referral-friend-joined`（多版式）；单版式置灰：`grid-test`。

## 反模式

- 用 `take_screenshot` 的 **dialog uid** 当终稿 → 全屏遮罩、发糊  
- 裁切 rect 缺少 **viewportWidth/Height** → 比例错位  
- 截图与 rect **不同视口**（中间又 emulate/滚动）  
- 确认删除/创建真执行 → 破坏数据  

## 仓库脚本索引

| 路径 | 作用 |
|------|------|
| `scripts/prd-crop-screenshot-rect.py` | 按比例裁切 |
| `scripts/prd-capture-crop.sh` | 薄封装 |
| `scripts/prd-get-crop-rect.js` | Easy-Email 选择器参考（非运行时入口） |

## 相关技能

| 技能 | 关系 |
|------|------|
| **`user-chrome-devtools-screenshot-page`** | 整页视口 + regions 红框原图 |
| **`image-red-box-annotate`** | 在整页图上画框（非本技能裁切流） |
| **`easy-email-frontend-chrome-verify`** | 改 UI 后的功能验收 |
| **`chromedevtools-mcp-conflict`** | MCP 冲突恢复 |
