---
name: user-chrome-devtools-screenshot-page
description: >-
  使用 user-chrome-devtools MCP 采集**整页视口**截图并落盘（navigate、emulate 视口、等待就绪、
  take_screenshot；可选 evaluate_script 采集多区域坐标供红框标注）。在用户要求 PRD/文档全页配图、
  邮件编辑器整屏截图、四宫格顶栏+左中右标注原图，或 Chrome DevTools MCP 页面级截图时使用。
  弹窗/下拉等**单组件局部图**见 user-chrome-devtools-screenshot-region。profile 冲突见 chromedevtools-mcp-conflict。
---

# Chrome DevTools MCP — 页面（视口）截图

采集**当前视口整屏** PNG，用于 PRD 全页配图或为 **`image-red-box-annotate`** 提供原图与 `regions` 坐标。

## 与区域截图技能的分工

| 技能 | 产出 | 典型场景 |
|------|------|----------|
| **本技能（page）** | 视口整图（含灰底/工作区） | 编辑器四宫格、全页说明、红框标注原图 |
| **`user-chrome-devtools-screenshot-region`** | 裁切后的单组件/单区域 | 弹窗白底面板、下拉菜单、仅按钮条 |

## 何时使用

- **`docs/project-prd.md`** / **`docs/prd-assets/`** 需要**整屏**界面图  
- 用户说「全页截图」「整页配图」「视口截图」  
- 下一步要对整图做**红框圈选**（多 `regions`）  
- 用户指定 **`user-chrome-devtools`**（勿擅自改用 cursor-ide-browser）

## 执行前

1. 读 MCP schema：`mcps/user-chrome-devtools/tools/`（`navigate_page`、`emulate`、`take_screenshot`、`evaluate_script`）。  
2. 本地 dev 已启动（本仓库 `./start.sh` 或 `npm run dev:all`，常见 `http://127.0.0.1:5180`）。  
3. profile 占用 → **`chromedevtools-mcp-conflict`**。

## 标准流程

```
- [ ] list_pages → navigate_page(url)
- [ ] emulate 视口（失败则勿反复 resize_page）
- [ ] evaluate_script 等待关键 DOM 就绪
- [ ] （可选）evaluate_script 采集 viewport + regions
- [ ] take_screenshot → 仓库绝对路径（docs/prd-assets/）
- [ ] 确认 PNG 已落盘；需要红框时交给 image-red-box-annotate
```

### 1. 打开页面

```text
navigate_page → http://127.0.0.1:5180/editor?email=<key>&layout=default
```

### 2. 视口 `emulate`

```text
emulate → viewport: "1920x1080x1"   # 全页说明常用 1x
```

- `resize_page` 报「Restore window…」时**只用 `emulate`**。  
- 高分辨率全页可试 `1920x1080x2`；以能完整露出目标 UI 为准。

### 3. 等待就绪

按页面改选择器，例如邮件编辑器：

```javascript
async () => {
  for (let i = 0; i < 40; i++) {
    if (document.querySelector(".workspace .block-tree")) return "ready";
    await new Promise((r) => setTimeout(r, 150));
  }
  return "timeout";
}
```

### 4. 采集 regions（红框标注用）

与 **`image-red-box-annotate`** 同一次导航、同一视口下执行：

```javascript
() => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };
  const ws = document.querySelector(".workspace");
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    regions: {
      top: box(document.querySelector(".topbar")),
      left: box(ws?.querySelector(".block-tree")),
      center: box(document.querySelector(".canvas-col")),
      right: box(ws?.querySelector(".inspector, .side-inspector")),
    },
  };
}
```

### 5. `take_screenshot` 落盘

| 约定 | 说明 |
|------|------|
| **路径** | 仓库**绝对路径**，优先 `docs/prd-assets/` |
| **命名** | `project-prd-<主题>.png` |
| **校验** | `file` 或 Read 确认尺寸合理（全页宽约等于视口×DPR） |

## Easy-Email 常用 URL

| 场景 | URL |
|------|-----|
| 邮件编辑器 | `http://127.0.0.1:5180/editor?email=<emailKey>&layout=default` |
| 创建邮件活动 | `http://127.0.0.1:5180/emailCampaign/create` |

## 反模式

- 需要**仅弹窗/下拉**局部图却用本技能整页截图 → 改用 **`user-chrome-devtools-screenshot-region`**  
- 对 `[role="dialog"]` 用 `take_screenshot` 的 `uid` → 常截到全屏遮罩，非白底面板  
- 截图与 `regions` **不在同一视口**下采集 → 红框错位  
- 未起 dev 就截图  

## 相关技能

| 技能 | 关系 |
|------|------|
| **`user-chrome-devtools-screenshot-region`** | 视口图 + rect 裁切为组件/区域图 |
| **`image-red-box-annotate`** | 整页原图 + regions 画红框 |
| **`easy-email-frontend-chrome-verify`** | 功能验收（控制台/网络），不仅配图 |
| **`chromedevtools-mcp-conflict`** | MCP 浏览器冲突恢复 |
