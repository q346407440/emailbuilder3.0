---
name: easy-email-frontend-chrome-verify
description: >-
  在前端渲染或应用行为变更后，须先在 Cursor 中创建与本技能验收顺序逐项对应的任务清单并据此执行；
  再用 user-chrome-devtools MCP 打开本地页（默认 5180）、快照/截图、走关键流程并查看控制台与网络。
  在用户要求 UI 验收、用 Chrome DevTools MCP 手动测试，或收尾涉及 src/components、EmailPreview、Inspector、画布、模板渲染时使用；
  修改邮件模板数据且影响预览效果时同样须浏览器验收。若 MCP 报 browser is already running / chrome-profile 占用，见本技能附录。
---

# 前端改动后浏览器验收（流程）

## 代码真源指针

| 主题 | 路径 |
|------|------|
| 开发端口与一键启动 | **`./start.sh`**、**`vite.config.*`**、**`package.json`**（`dev:all` 等） |
| API 端口 | **`server/index.ts`** / 环境变量（以运行日志为准） |
| **template 落盘 nested 4.0.0** | GET/PUT wire 为 nested；编辑器内存为 EditorBlockGraph（**`src/lib/templateTreeAdapter.ts`**） |

**默认前端 URL**：以 **`start.sh` / Vite 控制台** 为准（常见 **`http://127.0.0.1:5180`**；拒绝连接时试 **`http://localhost:5180`**）。

## 执行契约（最先）

在首次调用 **`user-chrome-devtools`** 前，先在会话中建立 **Todos**，且与下节顺序**逐项对应**（环境 → 快照 → 业务路径 → 控制台/网络 → 结论）。禁止无清单「随便打开看一眼」。

## 何时使用

- 改了 **`src/components`**、预览、Inspector、画布、与模板相关的加载/保存  
- 改了 **`data/emails/**`** 下任一影响渲染的 JSON  

## 推荐顺序

1. **本地 dev 已启动**（`./start.sh` 或 `npm run dev:all`）；API 若测保存也需起。  
2. **`navigate_page`** 到实际监听 URL（见上节）。  
3. **`take_snapshot` / `take_screenshot`**：首屏与关键区。  
4. **按改动点操作**（切模板、点区块、改 Inspector、保存等）。  
   - **列表 repeat 虚拟视图**（`VirtualBlockRef` + `buildRepeatPreviewModel`）：在 step2 / step23x2 / mcp-20260527 / member-welcome（centered）等含 repeat 的邮件中，确认 BlockTree 多行预览、Inspector 列表 Tab、嵌套 skus 循环、解绑物化后 row-2 落盘语义仍正确；**无** `__repeatClone__` 类 block id 出现在预览 DOM。
5. **`list_console_messages`**；必要时 **`list_network_requests`**（图片 4xx/5xx、保存失败；template PUT 须 204 且 body 为 nested 4.0.0）。
6. **结论**：写明已测项、是否干净、残留风险。

## 局限

MCP 不替代单元测试（**`npm run test:unit`** 等）；登录墙等阻塞如实记录。

## 与 PRD 配图技能的分工

| 技能 | 用途 |
|------|------|
| **`user-chrome-devtools-screenshot-page`** | 视口整页截图、采集 regions 供红框标注 |
| **`user-chrome-devtools-screenshot-region`** | 弹窗/下拉等单组件裁切配图（`prd-capture-crop.sh`） |
| **`image-red-box-annotate`** | 在整页原图上绘制红框标注 |
| **本技能** | 改 UI / 模板后的功能验收（控制台、网络、业务流程） |

---

## 附录：Chrome DevTools MCP profile 冲突

> 无独立 TS 契约包；以 **`user-chrome-devtools`** 报错文本与本节为准。

### 典型报错

`The browser is already running for …/chrome-profile. Use --isolated…` — 同一 **profile 目录**已被其它进程占用。

### 处理顺序

1. **默认不要改 MCP 加 `--isolated`**，除非用户要并行多实例。  
2. macOS/Linux 查进程：`pgrep -fl chrome-devtools-mcp`；`ps aux | grep chrome-devtools-mcp`。  
3. 优先精确结束：  
   `pkill -f ".cache/chrome-devtools-mcp/chrome-profile" || true`  
   无效再：`pkill -f "chrome-devtools-mcp" || true`  
4. 等待 1～2 秒后重试 **`list_pages` / `navigate_page`**。  
5. 仍失败：让用户在 Cursor **重启 MCP** 或退出残留自动化 Chrome。

### Windows

任务管理器 / PowerShell 按 **CommandLine** 匹配上述路径后结束进程。**勿**轻易结束用户日常 Chrome。

### 成功后

`navigate_page` 成功，截图/快照可用 → 继续上文「推荐顺序」验收。
