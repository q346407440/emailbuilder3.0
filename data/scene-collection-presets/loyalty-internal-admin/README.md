# loyalty-internal-admin 内置列表变量

每个 `*.json` 对应「创建列表变量 → 场景变量」里的一项；`seedValues` 为创建时写入 `payload.values` 的预览行，**须与产品截图条数一致**。

| 文件 | 界面名称 | seed 行数 | 对应截图内容 |
|------|----------|-----------|----------------|
| `data-display-metrics.json` | 数据展示 | 3 | +10% 转化率/客单价/复购率提升 |
| `unfinished-config-items.json` | 未完成配置 | 3 | 积分抵扣、未注册优惠、入会奖励积分 |
| `revenue-forecast.json` | 收益预测 | 2 | 每月/全年 GMV 收益 $10.00 |
| `recommended-subscription-plans.json` | 推荐订阅套餐 | 1 | growth 版本整卡 |
| `positive-growth-data.json` | 正向数据 | 4 | 上方 4 个指标卡 |
| `positive-growth-gmv-summary.json` | 正向GMV汇总 | 1 | 底部累计 GMV 汇总卡 |
| `abnormal-config-items.json` | 异常配置项 | 4 | 四条异常配置卡片 |

维护时只改本目录 JSON；前端通过 `import.meta.glob` 打包，改后需刷新 dev 页面。
