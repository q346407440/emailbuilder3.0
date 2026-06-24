import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateDesignImageBuffer,
  withLayoutVariantAiTimeout,
  generateLayoutVariantFromDesignImage,
} from "./layoutVariantAiFromImage";
import { MJS_PATCH_PIPELINE_RESERVED_MESSAGE } from "../src/layout-variant-ai-contract/aiFromImagePipeline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

describe("generateLayoutVariantFromDesignImage · 方案 1 暂留", () => {
  it("mjs-patch 拒绝执行", async () => {
    await assert.rejects(
      () =>
        generateLayoutVariantFromDesignImage({
          emailKey: "ai",
          layoutVariantId: "test-layout",
          layoutLabel: "测试",
          imageBuffer: Buffer.from("png"),
          mimeType: "image/png",
          emailBaseDir: path.join(__dirname, "../data/emails/ai"),
          pipeline: "mjs-patch",
        }),
      (e: unknown) => {
        assert.equal((e as Error).message, MJS_PATCH_PIPELINE_RESERVED_MESSAGE);
        return true;
      }
    );
  });
});
