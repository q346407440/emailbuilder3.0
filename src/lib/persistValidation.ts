import type { EmailPayload, EmailTemplate } from "../types/email";
import { validatePayloadAgainstTemplate, validateTemplate, type ValidationIssue } from "./validate";

/** 落盘前校验：与 server PUT payload / PUT template 职责对齐 */
export function collectPersistValidationIssues(
  template: EmailTemplate,
  payload: EmailPayload,
  options?: { payloadOnly?: boolean }
): ValidationIssue[] {
  const payloadIssues = validatePayloadAgainstTemplate(template, payload);
  if (options?.payloadOnly) {
    return payloadIssues;
  }
  return [...validateTemplate(template), ...payloadIssues];
}
