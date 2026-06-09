/**
 * 首次 MR:MjsGenerate 用的通用 mjs body 底稿（助手函数 + 占位模块）。
 * 各 slot 带 @mjs-slot 锚点；豆包输出 XML patch，程序按 id merge。
 */

import { wrapMjsSlot, type MjsPatchSlotId } from "../../../mjs-patch-contract";
import {
  MJS_MOTHER_COLORS_STUB,
  MJS_MOTHER_HELPERS,
  MJS_MOTHER_TEMPLATE_STUB,
  MJS_MOTHER_TOKEN_PRESETS_STUB,
} from "./mjsMotherSnippets";

const BUILD_S_SLOT_IDS = [
  "buildS1",
  "buildS2",
  "buildS3",
  "buildS4",
  "buildS5",
  "buildS6",
  "buildS7",
  "buildS8",
] as const satisfies readonly MjsPatchSlotId[];

function buildStubBuildFunctions(): string {
  return BUILD_S_SLOT_IDS.map((id) => {
    const n = id.replace("buildS", "");
    const fn = `function ${id}() {
  const sec = sectionShell(\`\${P}-s${n}\`, '__MOTHER_MODULE_${n}__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s${n}-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}`;
    return wrapMjsSlot(id, fn);
  }).join("\n\n");
}

/** 通用 body 底稿：slot 锚点 + 全套助手 + 占位 buildS + tokenPresets/template 壳。 */
export function buildMotherMjsBody(): string {
  return [
    wrapMjsSlot("COLORS", MJS_MOTHER_COLORS_STUB),
    MJS_MOTHER_HELPERS,
    buildStubBuildFunctions(),
    wrapMjsSlot("tokenPresets", MJS_MOTHER_TOKEN_PRESETS_STUB),
    wrapMjsSlot("template", MJS_MOTHER_TEMPLATE_STUB),
  ].join("\n\n");
}
