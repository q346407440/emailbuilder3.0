import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDoubaoResponseFormatBodies,
  isDoubaoResponseFormatUnsupported,
} from "./doubaoResponseFormat";

test("buildDoubaoResponseFormatBodies 无 format 时仅一次普通请求", () => {
  assert.deepEqual(buildDoubaoResponseFormatBodies(undefined), [{}]);
});

test("buildDoubaoResponseFormatBodies 有 format 时三段回退链", () => {
  const format = {
    type: "json_schema" as const,
    json_schema: { name: "x", strict: true, schema: { type: "object" } },
  };
  const bodies = buildDoubaoResponseFormatBodies(format);
  assert.equal(bodies.length, 3);
  assert.equal(bodies[0]!.response_format!.type, "json_schema");
  assert.deepEqual(bodies[1], { response_format: { type: "json_object" } });
  assert.deepEqual(bodies[2], {});
});

test("isDoubaoResponseFormatUnsupported 识别 400 schema 错误", () => {
  assert.equal(
    isDoubaoResponseFormatUnsupported(400, 'invalid response_format json_schema'),
    true
  );
  assert.equal(isDoubaoResponseFormatUnsupported(429, "response_format"), false);
});
