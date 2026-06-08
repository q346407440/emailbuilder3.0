import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateDesignImageBuffer,
  withLayoutVariantAiTimeout,
} from "./layoutVariantAiFromImage";
import { createMockLlmClient } from "../src/lib/ai-pipeline/adapters/mockLlmClient";
import { runImageToLayoutVariantPipeline } from "../src/lib/ai-pipeline/runImageToLayoutVariantPipeline";
import { createDefaultAssetResolver } from "../src/lib/ai-pipeline/assetResolve";
import { validatePipelineOutput } from "../src/lib/ai-pipeline/validatePipelineOutput";
import { createConsolePipelineLogger } from "../src/lib/ai-pipeline/ports/PipelineLogger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
  __dirname,
  "../src/lib/ai-pipeline/__fixtures__/minimal-one-section.json"
);
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

const mockLlm = createMockLlmClient({
  grounding_result_v1: [
    {
      id: "s1",
      region: fixture.grounding.sections[0].name,
      components: "Hero banner with overlay text and button",
      hasImage: true,
      imageQuery: fixture.grounding.sections[0].imageQuery ?? "city skyline",
      hasOverlay: true,
    },
  ],
  style_tokens_v1: {
    colors: fixture.styleTokens.tokens.colors,
    spacingPreset: "standard",
    typographyPreset: "standard",
    radiusPreset: "standard",
    emailBackground: fixture.styleTokens.canvas.emailBackground,
    contentSurface: fixture.styleTokens.canvas.contentSurface,
  },
  icon_query_list_v1: [],
  text_extract_v1: [
    {
      regionId: "s1",
      texts: ["Summer Collection", "SHOP NOW"],
    },
  ],
  compact_section_tree_v1: {
    root: fixture.sections[0].root,
  },
});

describe("validateDesignImageBuffer", () => {
  it("拒绝不支持的 MIME", () => {
    assert.equal(
      validateDesignImageBuffer(Buffer.from("x"), "image/gif"),
      "仅支持 JPG、PNG、WebP 格式的设计图"
    );
  });

  it("接受 png", () => {
    assert.equal(validateDesignImageBuffer(Buffer.from("png"), "image/png"), null);
  });
});

describe("withLayoutVariantAiTimeout", () => {
  it("超时后抛出 AI_GENERATION_TIMEOUT", async () => {
    await assert.rejects(
      () =>
        withLayoutVariantAiTimeout(
          new Promise((resolve) => {
            setTimeout(resolve, 50);
          }),
          10
        ),
      (e: unknown) => {
        assert.equal((e as Error & { code?: string }).code, "AI_GENERATION_TIMEOUT");
        assert.equal((e as Error).message, "生成超时，请稍后重试");
        return true;
      }
    );
  });
});

describe("runImageToLayoutVariantPipeline mock", () => {
  it("mock LLM fixture 端到端产出合法 template", async () => {
    const png1x1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const result = await runImageToLayoutVariantPipeline(
      {
        emailKey: "mock-email",
        layoutVariantId: "ai-mock",
        imageBuffer: png1x1,
        mimeType: "image/png",
      },
      {
        llm: mockLlm,
        assets: createDefaultAssetResolver(),
        logger: createConsolePipelineLogger(),
      }
    );
    validatePipelineOutput(result);
    assert.ok(result.template.blocks[result.template.rootBlockId!]);
  });
});
