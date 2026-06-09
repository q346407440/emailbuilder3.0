import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MJS_GENERATE_MODE,
  parseMjsGenerateMode,
} from "./mjsGenerateMode";

describe("parseMjsGenerateMode", () => {
  it("缺省或非法值回退 delta-first", () => {
    assert.equal(parseMjsGenerateMode(undefined), DEFAULT_MJS_GENERATE_MODE);
    assert.equal(parseMjsGenerateMode(""), DEFAULT_MJS_GENERATE_MODE);
    assert.equal(parseMjsGenerateMode("invalid"), DEFAULT_MJS_GENERATE_MODE);
  });

  it("接受 full-body-first", () => {
    assert.equal(parseMjsGenerateMode("full-body-first"), "full-body-first");
  });
});
