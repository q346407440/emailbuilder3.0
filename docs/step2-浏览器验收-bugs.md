# Step 2/3 浏览器验收 — 问题记录

> 验收场景：空模板 → **场景变量**主商品列表(3) + 相似品列表(2，similarTo→主) → 嵌套 repeat 绑定。  
> 日期：2026-05-31

## 状态说明

| 状态 | 含义 |
|------|------|
| 待验证 | 尚未走到该步骤 |
| 通过 | 已验证无问题 |
| 阻塞 | 无法继续，需修复 |
| 已修复 | 曾阻塞，已按真源修复 |

---

## 问题列表

### BUG-001 · 验收路径错误（操作失误，非产品缺陷）

- **现象**：添加列表变量时误选「自定义」，创建了无 `itemFields` 的 `mainSpuList`，触发校验报错。
- **正确路径**：**场景变量** → loyalty 商家端 → **商品列表** ×2（A 主列表、B 第二份商品列表）；B 在变量详情配置 **排序方式 = 相似品 → 目标 = A**。
- **状态**：已修复（删除错误变量，改走场景变量）

### BUG-002 · 同一场景「商品列表」无法添加第二份（A/B 两变量）

- **现象**：`loyalty-merchant-product-list` 预设写死 `slotId`，`createCollectionPayloadSlotFromPreset` 拒绝重复创建；Step 2 需要两个独立商品列表变量 A/B。
- **错误补救（已撤销）**：曾新增 `similar-product-list.json` 作为第二个场景预设——**偏离 Step 2 设计**（B 应是商品列表 + similarTo 配置，不是新预设类型）。
- **状态**：已修复 — `proposeScenePresetInstanceSlotId` + `createCollectionPayloadSlotFromPreset` 支持同 preset 多次实例化（如 `loyaltyMerchantProductList2`）

---

## 验收结论

- Repeat 已切 **VirtualBlockRef + buildRepeatPreviewModel** 虚拟视图；无运行时 block 克隆。
- 浏览器回归（2026-05-31）：step2、step23x2、mcp-20260527（4 行 repeat）、member-welcome centered（5 行权益 repeat）BlockTree 与画布预览均正常；控制台无 repeat 相关报错。
- 收尾洁癖（2026-05-31）：`payload`/`layout-manifest` PUT 走 `schema-registry`；移除 `salesDesc`/`salesAsc` 排序别名与 deprecated re-export shim；区块树 repeat 行命名去重（`formatRepeatItemDisplayName`）。
