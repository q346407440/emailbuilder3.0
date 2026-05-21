import type { TokenPresets } from "../types/tokenPreset";
import type { ValidationIssue } from "./validate";
import { validateTokenPresets as validateTokenPresetsContract } from "../token-preset-contract/validate";

/** @see `src/token-preset-contract/validate.ts` */
export function validateTokenPresets(
  tokenPresets: TokenPresets | null | undefined
): ValidationIssue[] {
  return validateTokenPresetsContract(tokenPresets);
}
