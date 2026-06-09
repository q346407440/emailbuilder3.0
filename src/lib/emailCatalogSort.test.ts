import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailListItem } from "../types/email";
import {
  EMAIL_META_PLACEHOLDER_CREATED_AT,
  resolveEmailListCreatedAt,
  sortEmailItemsByCreatedDesc,
} from "./emailCatalogSort";

describe("resolveEmailListCreatedAt", () => {
  it("缺省 createdAt 时使用目录 birthtime", () => {
    assert.equal(
      resolveEmailListCreatedAt(undefined, "2026-06-08T01:46:34.440Z"),
      "2026-06-08T01:46:34.440Z"
    );
  });

  it("占位 createdAt 且目录更晚时使用目录 birthtime", () => {
    assert.equal(
      resolveEmailListCreatedAt(
        EMAIL_META_PLACEHOLDER_CREATED_AT,
        "2026-06-08T01:46:34.440Z"
      ),
      "2026-06-08T01:46:34.440Z"
    );
  });

  it("真实 createdAt 保留 meta", () => {
    assert.equal(
      resolveEmailListCreatedAt("2026-06-10T00:00:00.000Z", "2026-06-08T01:46:34.440Z"),
      "2026-06-10T00:00:00.000Z"
    );
  });
});

describe("sortEmailItemsByCreatedDesc", () => {
  const item = (partial: Partial<EmailListItem> & Pick<EmailListItem, "emailKey">): EmailListItem => ({
    displayName: partial.emailKey,
    publishStatus: "draft",
    templateId: partial.emailKey,
    templateVersion: 1,
    hasPayload: false,
    ...partial,
  });

  it("按创建时间倒序", () => {
    const sorted = sortEmailItemsByCreatedDesc([
      item({ emailKey: "a", createdAt: "2026-01-01T00:00:00.000Z" }),
      item({ emailKey: "b", createdAt: "2026-03-01T00:00:00.000Z" }),
    ]);
    assert.deepEqual(sorted.map((x) => x.emailKey), ["b", "a"]);
  });

  it("创建时间相同时按更新时间倒序", () => {
    const sorted = sortEmailItemsByCreatedDesc([
      item({
        emailKey: "older-edit",
        createdAt: EMAIL_META_PLACEHOLDER_CREATED_AT,
        updatedAt: "2026-06-05T01:00:00.000Z",
      }),
      item({
        emailKey: "newer-edit",
        createdAt: EMAIL_META_PLACEHOLDER_CREATED_AT,
        updatedAt: "2026-06-08T06:00:00.000Z",
      }),
    ]);
    assert.deepEqual(sorted.map((x) => x.emailKey), ["newer-edit", "older-edit"]);
  });
});
