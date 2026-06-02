export type { EmailMeta, EmailMetaDelivery } from "./types";
export { META_SCHEMA_VERSION } from "./types";
export { META_REMOVED_DELIVERY_KEYS, META_REMOVED_ROOT_KEYS } from "./removed-fields";
export { normalizePersistedEmailMeta } from "./normalize";
export { validateEmailMeta, type MetaValidationIssue } from "./validate";
