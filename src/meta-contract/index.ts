export type { EmailMeta, EmailMetaDelivery } from "./types";
export { META_SCHEMA_VERSION } from "./types";
export {
  META_DELIVERY_PREHEADER_MAX_LENGTH,
  META_DELIVERY_SUBJECT_MAX_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
  META_DISPLAY_NAME_MAX_LENGTH,
} from "./field-limits";
export { META_REMOVED_DELIVERY_KEYS, META_REMOVED_ROOT_KEYS } from "./removed-fields";
export { normalizePersistedEmailMeta } from "./normalize";
export { validateEmailMeta, type MetaValidationIssue } from "./validate";
