import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findAssetKeyRefs,
  findUnknownAssetKeyRefs,
  parseAssetKeysFromConstBlock,
  screenPatchesForUnknownAssetKeys,
} from "./mjsAssetKeyGuard";
import type { InjectedMjsAssets } from "./injectedMjsAssets";

const INJECTED: InjectedMjsAssets = {
  pexelsBlock: `const PEXELS = {
  heroBanner: 'https://images.pexels.com/photos/1.jpeg',
  products: ['https://images.pexels.com/photos/2.jpeg'],
};`,
  iconBlock: `const ICON = {
  adidasLogo: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/adidas.svg',
  adidasAppIcon: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/adidas.svg',
  'icon-instagram': 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.0.0/icons/brand-instagram.svg',
};`,
  slotGuide: "",
};

test("parseAssetKeysFromConstBlock 解析多行/单行/引号键，忽略嵌套层", () => {
  assert.deepEqual(parseAssetKeysFromConstBlock(INJECTED.iconBlock), [
    "adidasLogo",
    "adidasAppIcon",
    "icon-instagram",
  ]);
  // 单行形态（测试桩常用）
  assert.deepEqual(
    parseAssetKeysFromConstBlock("const PEXELS = { hero: 'u1', side: 'u2' };"),
    ["hero", "side"]
  );
  // 嵌套对象的内层键不计入第一层
  assert.deepEqual(
    parseAssetKeysFromConstBlock("const X = { a: { inner: 1 }, b: 'v' };"),
    ["a", "b"]
  );
});

test("findAssetKeyRefs 识别方括号与点号引用", () => {
  const src = `iconBlock(x, n, ICON["icon-instagram"]); coverImage(y, n, PEXELS.heroBanner, alt, h); ICON.adidasLogo`;
  assert.deepEqual(findAssetKeyRefs(src), [
    { ns: "ICON", key: "icon-instagram" },
    { ns: "PEXELS", key: "heroBanner" },
    { ns: "ICON", key: "adidasLogo" },
  ]);
});

test("findUnknownAssetKeyRefs 捕捉 2026-06-10 测试 5/6 的编造键", () => {
  // 真实事故：模型把 ICON["adidasAppIcon"] 改写成包名形式的编造键
  const src = `iconBlock(\`\${P}-s6-app\`, 'App', ICON["simple-icons:adidas"], { size: '40px' })`;
  assert.deepEqual(findUnknownAssetKeyRefs(src, INJECTED), ['ICON["simple-icons:adidas"]']);
  // 合法引用不误报
  assert.deepEqual(
    findUnknownAssetKeyRefs(`ICON["adidasAppIcon"] PEXELS.heroBanner`, INJECTED),
    []
  );
});

test("screenPatchesForUnknownAssetKeys 拒绝含未知键的补丁并给出合法键清单", () => {
  const result = screenPatchesForUnknownAssetKeys(
    [
      { kind: "slot", id: "buildS6", replace: `ICON["simple-icons:adidas"]` },
      { kind: "slot", id: "buildS7", replace: `ICON["icon-instagram"]` },
      { kind: "search", search: "a", replace: "b" },
    ],
    INJECTED
  );
  assert.equal(result.accepted.length, 2);
  assert.equal(result.rejections.length, 1);
  assert.ok(result.rejections[0]!.includes("simple-icons:adidas"));
  assert.ok(result.rejections[0]!.includes("adidasAppIcon"));
});
