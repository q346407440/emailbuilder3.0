import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInspectorTabAvailability,
  resolveInspectorTabForContext,
} from "./inspectorTabPreference";

describe("buildInspectorTabAvailability", () => {
  it("普通区块含列表与显隐", () => {
    assert.deepEqual(buildInspectorTabAvailability(false, "layout", true), {
      content: true,
      style: true,
      layout: true,
      list: true,
      visibility: true,
    });
  });

  it("画布根无列表与显隐", () => {
    assert.deepEqual(buildInspectorTabAvailability(true, "emailRoot", false), {
      content: true,
      style: true,
      layout: true,
      list: false,
      visibility: false,
    });
  });
});

describe("resolveInspectorTabForContext", () => {
  const availability = buildInspectorTabAvailability(false, "text", true);

  it("偏好 Tab 可用时保留", () => {
    assert.equal(resolveInspectorTabForContext("list", availability), "list");
  });

  it("偏好 Tab 不可用时回退样式", () => {
    const canvasAvailability = buildInspectorTabAvailability(true, "emailRoot", false);
    assert.equal(resolveInspectorTabForContext("list", canvasAvailability), "style");
  });
});
