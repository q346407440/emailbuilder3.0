import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rebalanceTextExtractRegions } from "./rebalanceTextExtractRegions";

describe("rebalanceTextExtractRegions", () => {
  it("将 TAKE ANOTHER LOOK 从 s2 挪到商品区", () => {
    const payload = {
      regions: [
        {
          regionId: "s2",
          paragraphs: [
            {
              textId: "s2-t0",
              role: "heading" as const,
              textBody: { paragraphs: [{ runs: [{ text: "Still thinking?" }] }] },
            },
            {
              textId: "s2-t1",
              role: "heading" as const,
              textBody: { paragraphs: [{ runs: [{ text: "TAKE ANOTHER LOOK:" }] }] },
            },
          ],
        },
        {
          regionId: "s3",
          paragraphs: [
            {
              textId: "s3-t0",
              role: "body" as const,
              textBody: { paragraphs: [{ runs: [{ text: "Aventure M Ebike" }] }] },
            },
          ],
        },
      ],
    };
    const sections = [
      { sectionId: "s2", name: "首屏提示", components: "标题+按钮" },
      { sectionId: "s3", name: "商品推荐", components: "商品图+名称" },
    ];
    const out = rebalanceTextExtractRegions(payload, sections);
    const s2 = out.regions.find((r) => r.regionId === "s2");
    const s3 = out.regions.find((r) => r.regionId === "s3");
    assert.ok(s2);
    assert.ok(s3);
    assert.equal(
      s2!.paragraphs.some((p) => /TAKE ANOTHER LOOK/i.test(p.textBody.paragraphs[0].runs[0].text)),
      false
    );
    assert.equal(
      s3!.paragraphs[0].textBody.paragraphs[0].runs[0].text,
      "TAKE ANOTHER LOOK:"
    );
  });
});
