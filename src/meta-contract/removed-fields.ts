/** meta.json 根级已下线字段（落盘与校验均不得保留）。 */
export const META_REMOVED_ROOT_KEYS = [
  "owner",
  "designSource",
  "status",
  "supersededBy",
] as const;

/** delivery 内已下线字段。 */
export const META_REMOVED_DELIVERY_KEYS = ["senderName", "senderEmail", "campaignTag"] as const;

export type MetaRemovedRootKey = (typeof META_REMOVED_ROOT_KEYS)[number];
export type MetaRemovedDeliveryKey = (typeof META_REMOVED_DELIVERY_KEYS)[number];
