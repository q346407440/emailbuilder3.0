import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { isEnvValueUnset, loadEnvFile } from "./loadEnvFile";

describe("loadEnvFile", () => {
  it("isEnvValueUnset 将空字符串视为未设置", () => {
    assert.equal(isEnvValueUnset(undefined), true);
    assert.equal(isEnvValueUnset(""), true);
    assert.equal(isEnvValueUnset("   "), true);
    assert.equal(isEnvValueUnset("key"), false);
  });

  it("空字符串 env 会被 .env 非空值回填", () => {
    const dir = mkdtempSync(join(tmpdir(), "load-env-empty-"));
    const envPath = join(dir, ".env");
    writeFileSync(envPath, "PEXELS_FILL_EMPTY_KEY=from-file\n", "utf8");

    const prev = process.env.PEXELS_FILL_EMPTY_KEY;
    process.env.PEXELS_FILL_EMPTY_KEY = "";
    try {
      loadEnvFile(envPath);
      assert.equal(process.env.PEXELS_FILL_EMPTY_KEY, "from-file");
    } finally {
      if (prev === undefined) delete process.env.PEXELS_FILL_EMPTY_KEY;
      else process.env.PEXELS_FILL_EMPTY_KEY = prev;
    }
  });

  it("加载 .env 且不覆盖已有 process.env", () => {
    const dir = mkdtempSync(join(tmpdir(), "load-env-"));
    const envPath = join(dir, ".env");
    writeFileSync(
      envPath,
      `# comment\nPEXELS_API_KEY=from-file\nDOUBAO_API_KEY=from-file\n`,
      "utf8"
    );

    const prev = process.env.DOUBAO_API_KEY;
    process.env.DOUBAO_API_KEY = "already-set";
    const prevPexels = process.env.PEXELS_TEST_LOAD_KEY;
    delete process.env.PEXELS_TEST_LOAD_KEY;

    try {
      writeFileSync(
        envPath,
        `# comment\nPEXELS_TEST_LOAD_KEY=from-file\nDOUBAO_API_KEY=from-file\n`,
        "utf8"
      );
      loadEnvFile(envPath);
      assert.equal(process.env.DOUBAO_API_KEY, "already-set");
      assert.equal(process.env.PEXELS_TEST_LOAD_KEY, "from-file");
    } finally {
      if (prev === undefined) delete process.env.DOUBAO_API_KEY;
      else process.env.DOUBAO_API_KEY = prev;
      delete process.env.PEXELS_TEST_LOAD_KEY;
      if (prevPexels !== undefined) process.env.PEXELS_TEST_LOAD_KEY = prevPexels;
    }
  });
});
