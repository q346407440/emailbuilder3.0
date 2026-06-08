/** 活动创建/编辑页 URL 上的已保存 V2 绑定（Mock：真实活动落盘后由活动 id 解析）。 */
export function readCampaignV2BindingFromUrl(): {
  emailKey: string | null;
  layoutVariantId: string | null;
} {
  try {
    const q = new URLSearchParams(window.location.search);
    const emailKey = q.get("emailKey")?.trim() || null;
    const layoutVariantId = q.get("layout")?.trim() || null;
    return { emailKey, layoutVariantId };
  } catch {
    return { emailKey: null, layoutVariantId: null };
  }
}
