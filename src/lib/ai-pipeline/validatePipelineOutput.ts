import { blockingValidationIssues, validateTemplate } from "../validate";
import { validateSchemaArtifact } from "../../schema-registry";
import { AiPipelineError } from "../../layout-variant-ai-contract/errors";
import type { MapPipelineOutput } from "./types";

/** E 末段契约门禁（§15.5）。 */
export function validatePipelineOutput(output: MapPipelineOutput): void {
  const templateIssues = blockingValidationIssues(validateTemplate(output.template));
  if (templateIssues.length) {
    const first = templateIssues[0]!;
    throw new AiPipelineError(
      "VALIDATE_TEMPLATE_FAILED",
      `模板校验失败：${first.reason}（${first.path}）`
    );
  }
  const tokenIssues = validateSchemaArtifact("tokenPresets", output.tokenPresets);
  if (tokenIssues.length) {
    const first = tokenIssues[0]!;
    throw new AiPipelineError(
      "VALIDATE_TEMPLATE_FAILED",
      `样式预设校验失败：${first.reason ?? "未知错误"}`
    );
  }
}
