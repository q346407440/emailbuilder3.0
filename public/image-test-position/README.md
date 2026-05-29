# 画面位置（position）测试图

白底 + 九宫格数字 **1–9**（与 `imageObjectPosition` 预设一致：1=左上 … 9=右下），用于 `backgroundImage.position` / cover 裁切对照。

| 文件 | 尺寸 | 说明 |
|------|------|------|
| `position-markers-square.png` | 900×900 | 正方，9 个数字 |
| `position-markers-pad-lr.png` | 1800×900 | 左右各半幅宽留白（横向 2:1） |
| `position-markers-pad-tb.png` | 900×1800 | 上下各半幅高留白（纵向 1:2） |
| `position-markers-span-lr.png` | 1800×900 | 2:1 全宽三列数字（第 2 章 2A） |
| `position-markers-span-tb.png` | 900×1800 | 1:2 全高三行数字（第 2 章 2B） |

## 重新生成

```bash
npm run generate:image-test-position-assets
```

## 预览 URL（本地 dev，`npm run dev:all`）

- http://127.0.0.1:5180/image-test-position/position-markers-square.png
- http://127.0.0.1:5180/image-test-position/position-markers-pad-lr.png
- http://127.0.0.1:5180/image-test-position/position-markers-pad-tb.png

`image-test` 模板第 2 章默认写入上述链接。若端口或 host 不同，构建时可设：

```bash
IMAGE_TEST_ASSET_BASE=http://127.0.0.1:5180 npm run build:email:image-test
```

发信到外部邮箱前，请将 PNG 部署到可公网访问的 HTTPS 地址，并替换 template 中的 `src`。
