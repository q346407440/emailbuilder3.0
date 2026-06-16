import type { BindingCollectionField } from "../../types/email";
import {
  BUILTIN_ALBUM_ITEM_FIELDS,
  BUILTIN_PRODUCT_SPU_ITEM_FIELDS,
} from "../builtin-collection-item-fields";
import type { BuiltinStructureDefinition, BuiltinStructureSummary } from "./types";

const similarSpuFields: BindingCollectionField[] = [
  ...BUILTIN_PRODUCT_SPU_ITEM_FIELDS.filter((field) => field.key !== "skus"),
  {
    key: "similarSpus",
    label: "相似商品列表",
    valueType: "collection",
    itemFields: BUILTIN_PRODUCT_SPU_ITEM_FIELDS.filter((field) => field.key !== "skus"),
    minItems: 0,
    maxItems: 5,
  },
];

const complementSpuFields: BindingCollectionField[] = [
  ...BUILTIN_PRODUCT_SPU_ITEM_FIELDS.filter((field) => field.key !== "skus"),
  {
    key: "complementSpus",
    label: "搭配商品列表",
    valueType: "collection",
    itemFields: BUILTIN_PRODUCT_SPU_ITEM_FIELDS.filter((field) => field.key !== "skus"),
    minItems: 0,
    maxItems: 5,
  },
];

const MOCK_CHILD_LIST_LENGTHS = [5, 4, 3, 2, 1, 0, 1, 2, 3, 4] as const;

const MOCK_PEXELS_IMAGE_URLS = [
  "https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1181676/pexels-photo-1181676.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/2983468/pexels-photo-2983468.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1181717/pexels-photo-1181717.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1181722/pexels-photo-1181722.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=400",
] as const;

function mockImageUrl(index: number): string {
  return MOCK_PEXELS_IMAGE_URLS[index % MOCK_PEXELS_IMAGE_URLS.length]!;
}

function buildMockSku(parentIndex: number, childIndex: number): Record<string, unknown> {
  const skuNo = childIndex + 1;
  return {
    imageSrc: mockImageUrl(parentIndex + childIndex),
    title: `规格 ${skuNo}`,
    href: `https://example.com/products/mock-${parentIndex + 1}?sku=${skuNo}`,
    salePrice: `$${(29 + parentIndex * 3 + childIndex).toFixed(2)}`,
    originalPrice: `$${(39 + parentIndex * 3 + childIndex).toFixed(2)}`,
    inventoryQuantity: 100 - parentIndex * 3 - childIndex,
    totalSales: 20 + parentIndex * 5 + childIndex,
  };
}

function buildMockProductBase(index: number): Record<string, unknown> {
  const no = index + 1;
  return {
    imageSrc: mockImageUrl(index),
    name: `Mock 商品 ${no}`,
    salePrice: `$${(49 + index * 4).toFixed(2)}`,
    originalPrice: `$${(69 + index * 4).toFixed(2)}`,
    badge: index % 2 === 0 ? "热卖" : "新品",
    href: `https://example.com/products/mock-${no}`,
  };
}

function buildMockProductWithSkus(index: number): Record<string, unknown> {
  return {
    ...buildMockProductBase(index),
    skus: Array.from({ length: MOCK_CHILD_LIST_LENGTHS[index]! }, (_item, childIndex) =>
      buildMockSku(index, childIndex)
    ),
  };
}

function buildMockRelatedProduct(parentIndex: number, childIndex: number): Record<string, unknown> {
  const no = childIndex + 1;
  return {
    imageSrc: mockImageUrl(parentIndex + childIndex + 1),
    name: `Mock 关联商品 ${parentIndex + 1}-${no}`,
    salePrice: `$${(39 + parentIndex * 3 + childIndex).toFixed(2)}`,
    originalPrice: `$${(59 + parentIndex * 3 + childIndex).toFixed(2)}`,
    badge: childIndex % 2 === 0 ? "推荐" : "搭配",
    href: `https://example.com/products/mock-related-${parentIndex + 1}-${no}`,
  };
}

function buildMockRelatedList(childKey: "similarSpus" | "complementSpus"): Record<string, unknown>[] {
  return MOCK_CHILD_LIST_LENGTHS.map((childCount, index) => ({
    ...buildMockProductBase(index),
    [childKey]: Array.from({ length: childCount }, (_item, childIndex) =>
      buildMockRelatedProduct(index, childIndex)
    ),
  }));
}

const mockProductList = MOCK_CHILD_LIST_LENGTHS.map((_childCount, index) =>
  buildMockProductWithSkus(index)
);

const mockAlbumList: Record<string, unknown>[] = MOCK_PEXELS_IMAGE_URLS.slice(0, 3).map(
  (coverSrc, index) => ({
    coverSrc,
    title: `Mock 专辑 ${index + 1}`,
    description: "用于编辑器预览的内置专辑 mock 数据。",
    href: `https://example.com/collections/mock-${index + 1}`,
  })
);

const loyaltyInternalStructures: BuiltinStructureDefinition[] = [
  {
    structureId: "dedicated.loyalty.dataDisplayMetrics",
    scope: "dedicated",
    dedicatedFor: "loyalty-internal-admin",
    defaultSlotId: "loyaltyDataDisplayMetrics",
    label: "数据展示",
    description: "行业商家平均增长表现：三列指标（数值 + 指标名）",
    valueType: "collection",
    lengthPolicy: { kind: "locked", fixedLength: 3 },
    itemFields: [
      { key: "value", label: "数值", valueType: "string", required: true },
      { key: "label", label: "指标名", valueType: "string", required: true },
    ],
    seedValues: [
      { value: "+10%", label: "转化率提升" },
      { value: "+10%", label: "客单价提升" },
      { value: "+10%", label: "复购率提升" },
    ],
  },
  {
    structureId: "dedicated.loyalty.unfinishedConfigItems",
    scope: "dedicated",
    dedicatedFor: "loyalty-internal-admin",
    defaultSlotId: "loyaltyUnfinishedConfigItems",
    label: "未完成配置",
    description: "待开启配置卡片：标题 + 待开启标签 + 说明",
    valueType: "collection",
    lengthPolicy: { kind: "locked", fixedLength: 3 },
    itemFields: [
      { key: "title", label: "配置项名称", valueType: "string", required: true },
      { key: "statusTag", label: "状态标签", valueType: "string", required: true },
      { key: "description", label: "说明", valueType: "string", required: true },
    ],
    seedValues: [
      { title: "积分抵扣金额", statusTag: "待开启", description: "让顾客可用积分抵现，提升支付意愿与复购率" },
      { title: "未注册用户订单优惠", statusTag: "待开启", description: "新客无需注册即可入会享优惠，降低首单转化门槛" },
      { title: "入会/支付奖励积分", statusTag: "待开启", description: "注册或下单即得积分，持续激励消费与复购" },
    ],
  },
  {
    structureId: "dedicated.loyalty.revenueForecast",
    scope: "dedicated",
    dedicatedFor: "loyalty-internal-admin",
    defaultSlotId: "loyaltyRevenueForecast",
    label: "收益预测",
    description: "继续使用预计可获得：每月 / 全年 GMV 两行",
    valueType: "collection",
    lengthPolicy: { kind: "locked", fixedLength: 2 },
    itemFields: [
      { key: "value", label: "金额", valueType: "string", required: true },
      { key: "label", label: "周期说明", valueType: "string", required: true },
    ],
    seedValues: [
      { value: "$10.00", label: "每月 GMV 收益" },
      { value: "$10.00", label: "全年 GMV 收益" },
    ],
  },
  {
    structureId: "dedicated.loyalty.recommendedSubscriptionPlans",
    scope: "dedicated",
    dedicatedFor: "loyalty-internal-admin",
    defaultSlotId: "loyaltyRecommendedSubscriptionPlans",
    label: "推荐订阅套餐",
    description: "整张订阅套餐卡片（标题行、原价、优惠胶囊、ROI 文案）",
    valueType: "object",
    objectFields: [
      { key: "headline", label: "套餐标题行", valueType: "string", required: true },
      { key: "originalPriceText", label: "原价文案", valueType: "string", required: true },
      { key: "discountBadge", label: "优惠胶囊", valueType: "string", required: true },
      { key: "roiText", label: "ROI 文案", valueType: "string", required: true },
    ],
    seedValue: {
      headline: "growth 版本: $10.00 / 月",
      originalPriceText: "原价 $20.00/mo",
      discountBadge: "连续12个月订阅优惠 $10.00",
      roiText: "每月 ROI 预计可达到 1:3",
    },
  },
  {
    structureId: "dedicated.loyalty.positiveGrowthData",
    scope: "dedicated",
    dedicatedFor: "loyalty-internal-admin",
    defaultSlotId: "loyaltyPositiveGrowthData",
    label: "正向数据",
    description: "上方 4 个指标卡片（新增订阅邮箱、转化率、客单价、会员客单价）",
    valueType: "collection",
    lengthPolicy: { kind: "locked", fixedLength: 4 },
    itemFields: [
      { key: "title", label: "指标名", valueType: "string", required: true },
      { key: "value", label: "数值", valueType: "string", required: true },
      { key: "comparisonText", label: "对比说明", valueType: "string" },
    ],
    seedValues: [
      { title: "新增订阅邮箱", value: "10.00", comparisonText: "" },
      { title: "转化率", value: "+10%", comparisonText: "试用期间 VS 使用LP前" },
      { title: "客单价", value: "+10%", comparisonText: "试用期间 VS 使用LP前" },
      { title: "会员客单价", value: "+10%", comparisonText: "试用期间 VS 使用LP前" },
    ],
  },
  {
    structureId: "dedicated.loyalty.positiveGrowthGmvSummary",
    scope: "dedicated",
    dedicatedFor: "loyalty-internal-admin",
    defaultSlotId: "loyaltyPositiveGrowthGmvSummary",
    label: "正向GMV汇总",
    description: "底部汇总卡：使用会员折扣的GMV（累计 GMV + GMV 占比 + 订单占比）",
    valueType: "object",
    objectFields: [
      { key: "title", label: "汇总标题", valueType: "string", required: true },
      { key: "cumulativeGmv", label: "累计 GMV", valueType: "string", required: true },
      { key: "gmvShare", label: "GMV 占比", valueType: "string", required: true },
      { key: "orderShare", label: "订单占比", valueType: "string", required: true },
    ],
    seedValue: {
      title: "使用会员折扣的GMV",
      cumulativeGmv: "$10.00",
      gmvShare: "10%",
      orderShare: "10%",
    },
  },
  {
    structureId: "dedicated.loyalty.abnormalConfigItems",
    scope: "dedicated",
    dedicatedFor: "loyalty-internal-admin",
    defaultSlotId: "loyaltyAbnormalConfigItems",
    label: "异常配置项",
    description: "关键问题卡片：问题标题 + 问题说明",
    valueType: "collection",
    lengthPolicy: { kind: "locked", fixedLength: 4 },
    itemFields: [
      { key: "type", label: "问题类型标识", valueType: "string", required: true },
      { key: "title", label: "问题标题", valueType: "string", required: true },
      { key: "description", label: "问题说明", valueType: "string", required: true },
    ],
    seedValues: [
      { type: "points_threshold", title: "积分使用门槛高", description: "积分抵扣金额门槛过高，用户不愿使用，转化下降" },
      { type: "max_discount", title: "单笔订单积分最大抵扣金额过高", description: "存在利润侵蚀风险，影响利润率" },
      { type: "guest_order_threshold", title: "未注册用户订单优惠门槛过高", description: "用户首次下单意愿下降，拉新转化受阻" },
      { type: "member_points_balance_low", title: "会员可用积分余额过低", description: "会员很难使用积分体系，复购率降低" },
    ],
  },
];

export const BUILTIN_STRUCTURE_REGISTRY: BuiltinStructureDefinition[] = [
  {
    structureId: "scalar.username",
    scope: "general",
    defaultSlotId: "username",
    label: "用户名",
    description: "接入方传入的用户展示名。",
    valueType: "string",
    seedValue: "Alice",
  },
  {
    structureId: "scalar.storeUrl",
    scope: "general",
    defaultSlotId: "storeUrl",
    label: "店铺链接",
    description: "接入方传入的店铺访问链接。",
    valueType: "url",
    seedValue: "https://example.com",
  },
  {
    structureId: "scalar.storeName",
    scope: "general",
    defaultSlotId: "storeName",
    label: "店铺名称",
    description: "接入方传入的店铺名称。",
    valueType: "string",
    seedValue: "Mock Store",
  },
  {
    structureId: "collection.productSpuWithSkus",
    scope: "general",
    defaultSlotId: "productList",
    label: "商品列表",
    description: "通用商品结构：SPU 行下嵌套规格 skus；选品与排序由上游接入方处理。",
    valueType: "collection",
    itemFields: BUILTIN_PRODUCT_SPU_ITEM_FIELDS,
    seedValues: mockProductList,
    lengthPolicy: { kind: "editable", defaultLength: 10 },
  },
  {
    structureId: "collection.similarSpuPairing",
    scope: "general",
    defaultSlotId: "similarSpuList",
    label: "相似品列表",
    description: "通用相似品结构：主 SPU 行下嵌套 similarSpus；相似品计算由上游接入方处理。",
    valueType: "collection",
    itemFields: similarSpuFields,
    seedValues: buildMockRelatedList("similarSpus"),
    lengthPolicy: { kind: "editable", defaultLength: 10 },
  },
  {
    structureId: "collection.complementSpuPairing",
    scope: "general",
    defaultSlotId: "complementSpuList",
    label: "搭配品列表",
    description: "通用搭配品结构：主 SPU 行下嵌套 complementSpus；搭配关系由上游接入方处理。",
    valueType: "collection",
    itemFields: complementSpuFields,
    seedValues: buildMockRelatedList("complementSpus"),
    lengthPolicy: { kind: "editable", defaultLength: 10 },
  },
  {
    structureId: "collection.productAlbum",
    scope: "general",
    defaultSlotId: "albumList",
    label: "商品专辑列表",
    description: "通用专辑结构；专辑选择与排序由上游接入方处理。",
    valueType: "collection",
    itemFields: BUILTIN_ALBUM_ITEM_FIELDS,
    seedValues: mockAlbumList,
    lengthPolicy: { kind: "editable", defaultLength: 3 },
  },
  ...loyaltyInternalStructures,
];

export function listBuiltinStructureDefinitions(): BuiltinStructureDefinition[] {
  return BUILTIN_STRUCTURE_REGISTRY;
}

export function getBuiltinStructureDefinition(
  structureId: string | undefined
): BuiltinStructureDefinition | undefined {
  if (!structureId) return undefined;
  return BUILTIN_STRUCTURE_REGISTRY.find((item) => item.structureId === structureId);
}

export function toBuiltinStructureSummary(
  definition: BuiltinStructureDefinition
): BuiltinStructureSummary {
  return {
    structureId: definition.structureId,
    scope: definition.scope,
    dedicatedFor: definition.dedicatedFor,
    defaultSlotId: definition.defaultSlotId,
    label: definition.label,
    description: definition.description,
    valueType: definition.valueType,
    defaultPreviewRowCount:
      definition.valueType === "collection"
        ? definition.lengthPolicy?.kind === "locked"
          ? definition.lengthPolicy.fixedLength
          : definition.lengthPolicy?.defaultLength ?? definition.seedValues?.length ?? 0
        : undefined,
    objectFieldCount:
      definition.valueType === "object" ? definition.objectFields?.length : undefined,
    lengthPolicy: definition.lengthPolicy,
  };
}
