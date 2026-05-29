import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareByCreatedAtDesc } from "./sortByCreatedAt";

describe("compareByCreatedAtDesc", () => {
  it("按创建时间倒序", () => {
    assert.ok(
      compareByCreatedAtDesc("2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z") > 0
    );
    assert.ok(
      compareByCreatedAtDesc("2026-03-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z") < 0
    );
  });
});
