/** 商家邮件活动列表演示数据（对齐 CRM-OPS staging 页面列与样例行） */
export type EmailCampaignRow = {
  id: string;
  name: string;
  updatedAt: string;
  targetShops: number;
  targetEmails: number;
  sentShops: number;
  sentEmails: number;
  openRate: string | null;
  clickRate: string | null;
  enabled: boolean;
};

export const EMAIL_CAMPAIGN_TOTAL = 84;

export const EMAIL_CAMPAIGN_MOCK_ROWS: EmailCampaignRow[] = [
  {
    id: "646296590989926560",
    name: "曾试用未卸载有正向，还能试用",
    updatedAt: "2026.05.19 18:31:55",
    targetShops: 11,
    targetEmails: 11,
    sentShops: 11,
    sentEmails: 11,
    openRate: "27.27%",
    clickRate: null,
    enabled: true,
  },
  {
    id: "645893958341240807",
    name: "2318649-安装未领试用-已卸载",
    updatedAt: "2026.05.18 15:52:00",
    targetShops: 1,
    targetEmails: 1,
    sentShops: 1,
    sentEmails: 1,
    openRate: null,
    clickRate: null,
    enabled: true,
  },
  {
    id: "645893881023440871",
    name: "2318649-安装未领试用-未卸载",
    updatedAt: "2026.05.18 15:51:41",
    targetShops: 1,
    targetEmails: 1,
    sentShops: 1,
    sentEmails: 1,
    openRate: null,
    clickRate: null,
    enabled: true,
  },
  {
    id: "645893767194224615",
    name: "2318649-结账页折叠移动端订单摘要",
    updatedAt: "2026.05.18 15:51:14",
    targetShops: 1,
    targetEmails: 1,
    sentShops: 1,
    sentEmails: 1,
    openRate: null,
    clickRate: null,
    enabled: true,
  },
  {
    id: "645893471277688807",
    name: "2318649-试用中有正向数据",
    updatedAt: "2026.05.18 15:50:04",
    targetShops: 1,
    targetEmails: 2,
    sentShops: 1,
    sentEmails: 2,
    openRate: "50%",
    clickRate: "100%",
    enabled: true,
  },
  {
    id: "645893372526995431",
    name: "2318649-试用中无正向数据",
    updatedAt: "2026.05.18 15:49:40",
    targetShops: 1,
    targetEmails: 1,
    sentShops: 1,
    sentEmails: 1,
    openRate: null,
    clickRate: null,
    enabled: true,
  },
  {
    id: "645893309557909479",
    name: "2318649-试用中配置不合理",
    updatedAt: "2026.05.18 15:49:25",
    targetShops: 1,
    targetEmails: 1,
    sentShops: 1,
    sentEmails: 1,
    openRate: "100%",
    clickRate: "100%",
    enabled: true,
  },
  {
    id: "645893241228503015",
    name: "2318649-当前主题未开启LP应用",
    updatedAt: "2026.05.18 15:49:09",
    targetShops: 1,
    targetEmails: 2,
    sentShops: 1,
    sentEmails: 2,
    openRate: "50%",
    clickRate: "100%",
    enabled: true,
  },
  {
    id: "645893150207911911",
    name: "2318649-试用中未完成配置",
    updatedAt: "2026.05.18 15:48:47",
    targetShops: 1,
    targetEmails: 1,
    sentShops: 1,
    sentEmails: 1,
    openRate: null,
    clickRate: null,
    enabled: true,
  },
  {
    id: "644381458495979391",
    name: "安装未领试用一已卸载",
    updatedAt: "2026.05.18 15:52:04",
    targetShops: 99895,
    targetEmails: 99895,
    sentShops: 99895,
    sentEmails: 99895,
    openRate: "0.4%",
    clickRate: null,
    enabled: false,
  },
];

export function formatCampaignCount(value: number): string {
  return value.toLocaleString("en-US");
}
