import { test } from "node:test";
import assert from "node:assert/strict";
import { assertMjsBodyComplete } from "./extractMjsFromLlm";
import { buildMotherMjsBody } from "./mjsMotherBody";
import { mjsSlotBeginMarker, mjsSlotEndMarker } from "../../../mjs-patch-contract";

test("buildMotherMjsBody 产出带 slot 锚点且可校验的 body", () => {
  const body = buildMotherMjsBody();
  assert.ok(body.includes(mjsSlotBeginMarker("COLORS")));
  assert.ok(body.includes(mjsSlotEndMarker("template")));
  assert.ok(body.includes("function buildS8"));
  assert.doesNotThrow(() => assertMjsBodyComplete(body));
});
