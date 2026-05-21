import type { EmailPayload, EmailTemplate } from "../types/email";
import type { ConfigField, ConfigScope } from "../types/configSchema";
import type { TokenPresets, TokenScaleSelection } from "../types/tokenPreset";
import { writeConfigTargetValue } from "./configSchemaTargets";
import { resolveTokenScaleSelection } from "./resolveTokenPreset";

export type ApplyConfigState = {
  template: EmailTemplate;
  payload: EmailPayload;
  tokenPresets: TokenPresets | null;
};

export function getTokenScaleSelection(
  tokenPresets: TokenPresets | null,
  scopeId: string,
  fieldKey: string
): TokenScaleSelection | undefined {
  return tokenPresets?.scopeSelections?.[scopeId]?.[fieldKey];
}

export function setTokenScaleSelection(
  tokenPresets: TokenPresets,
  scopeId: string,
  fieldKey: string,
  selection: TokenScaleSelection
): void {
  tokenPresets.scopeSelections = tokenPresets.scopeSelections ?? {};
  tokenPresets.scopeSelections[scopeId] = tokenPresets.scopeSelections[scopeId] ?? {};
  tokenPresets.scopeSelections[scopeId]![fieldKey] = selection;
}

export function applyConfigValue(
  state: ApplyConfigState,
  scope: ConfigScope,
  field: ConfigField,
  value: unknown
): ApplyConfigState {
  const next: ApplyConfigState = {
    template: structuredClone(state.template),
    payload: structuredClone(state.payload),
    tokenPresets: state.tokenPresets ? structuredClone(state.tokenPresets) : null,
  };

  if (field.control === "tokenScale" && field.tokenFamily && next.tokenPresets) {
    const selection = value as TokenScaleSelection;
    setTokenScaleSelection(next.tokenPresets, scope.scopeId, field.key, selection);
    const resolved = resolveTokenScaleSelection(
      next.tokenPresets,
      field.tokenFamily,
      selection,
      field.defaultScale ?? "md"
    );
    if (resolved !== undefined && field.target.kind !== "tokenPreset") {
      writeConfigTargetValue(field.target, resolved, next);
    }
    return next;
  }

  writeConfigTargetValue(field.target, value, next);
  return next;
}
