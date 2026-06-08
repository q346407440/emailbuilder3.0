import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { EmailTemplate } from "../../types/email";
import {
  evaluateGoldenStructure,
  extractLayoutStructureMetrics,
  TEMPLATE_15_MANUAL_GOLDEN,
} from "./layoutStructureMetrics";

const manual15Path = join(
  process.cwd(),
  "data/emails/step23x2-2/layouts/manual-15/template.json"
);

function loadManual15(): EmailTemplate {
  return JSON.parse(readFileSync(manual15Path, "utf8")) as EmailTemplate;
}

describe("layoutStructureMetrics", () => {
  it("manual-15 满足模板 15 黄金结构期望", () => {
    const metrics = extractLayoutStructureMetrics(loadManual15());
    const issues = evaluateGoldenStructure(metrics, TEMPLATE_15_MANUAL_GOLDEN);
    assert.deepEqual(issues, [], `golden 断言失败: ${issues.join("; ")}`);
  });

  it("extractLayoutStructureMetrics 统计按钮与区段", () => {
    const metrics = extractLayoutStructureMetrics(loadManual15());
    assert.ok(metrics.totalButtons >= 1);
    assert.ok(metrics.sections.length >= 5);
    assert.equal(metrics.logoTextUsesPrimary, false);
    assert.equal(metrics.ctaWhiteOnLightPrimary, false);
  });
});
