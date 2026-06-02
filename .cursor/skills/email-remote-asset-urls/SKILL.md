---
name: email-remote-asset-urls
description: >-
  邮件模板中的远程占位图源约定：摄影默认 Pexels（images.pexels.com）；图标默认 jsDelivr 锁版本的 npm 包（Tabler / Simple Icons / lucide-static）。禁止编造 URL；交付前验证可访问性。当用户说「占位图」「Pexels」「图标 CDN」「远程图源」「类似模板43」或 Agent 填写邮件素材 URL 时使用。
---

# 远程占位图源（约定 + 索引）

## 与代码真源的关系

仓库**未**以单独 `*-contract` 包存放「允许的主机名列表」；**占位 URL 政策**由本技能 + **`email-config-motherboard`**（交付检查）+ 浏览器 **`Network`** 共同约束。填写的字段路径仍以 **`src/block-contract/`** 为准。

## 何时读

- 写 **`template.json`**（**nested 4.0.0** 节点 `props`/`wrapperStyle`）或 **`payload`** 中的图片、图标、Logo URL  
- 要求可公开直链、不落本地  
- 与 **`easy-email-frontend-chrome-verify`**（先验资源）配套  

## 摄影（默认 Pexels）

- 形态：`https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg` + 常用查询参数（如 `?auto=compress&cs=tinysrgb&w=`）。  
- **禁止编造 id**；选定后 **`curl -I` 或 DevTools Network** 确认 **200**。

## 图标（默认 jsDelivr + 锁版本）

**原则**：npm 包内路径 + **固定版本号**。

| 用途 | 包路径示例（版本以本文件为例，更新时须仍能 `curl -I` 200） |
|------|----------------------------------------------------------------|
| 序号圆标 | `@tabler/icons@3.19.0/icons/outline/circle-number-1.svg` |
| 品牌/社媒 | `simple-icons@13.16.0/icons/<slug>.svg` |
| 通用 UI | `lucide-static@0.469.0/icons/<name>.svg` |

完整 URL 例：

```text
https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/circle-number-1.svg
https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg
https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/map-pin.svg
```

**`content.icon`**：仅 **`props.src` / `color` / `size`**（契约见 **`src/block-contract/by-type/content.icon.ts`**）。同一邮件图标画风体系统一。

## Agent 必须

1. **不编造**域名或路径。  
2. 写入前 **HTTP 200** 核验。  
3. 不用无版本临时链作为默认交付。  

## 参考

仓库内现成 **`data/emails/**/template.json`** 中的合法 URL 形态。
