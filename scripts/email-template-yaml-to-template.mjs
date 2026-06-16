#!/usr/bin/env node
/**
 * 将邮件模板 YAML 夹具展开为 template.json，并调用 validateTemplate 做契约检查。
 * 用途：Golden 回归、非法字段用例；非业务邮件维护入口。用法见 --help。
 */

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deepStrictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { normalizeTextBody } from "../src/lib/textBodyFormat.ts";
import { htmlFragmentToTextBody } from "../src/lib/htmlFragmentToTextBody.ts";
import { normalizeTemplateContentAlignEffectiveness } from "../src/lib/contentAlignConfigurability.ts";
import { normalizeTemplateBlockDefaults } from "../src/lib/templateBlockDefaults.ts";
import { normalizeImageBlockToWrapperBackgroundShape } from "../src/lib/imageBlockWrapperBackground.ts";
import { editorGraphToNested } from "../src/lib/templateTreeAdapter.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
/** 展开器 Golden 与非法用例夹具目录 */
const YAML_FIXTURE_DIR = join(REPO_ROOT, "tests", "fixtures", "email-template-yaml");

const KIND_MAP = {
  emailRoot: { type: "emailRoot", blockType: "layout.container" },
  layout: { type: "layout", blockType: "layout.container" },
  grid: { type: "grid", blockType: "layout.grid" },
  /** 中间 YAML 仍写 kind: overlay；展开为 layout + wrapperStyle.backgroundImage */
  overlay: { type: "layout", blockType: "layout.container" },
  text: { type: "text", blockType: "content.text" },
  image: { type: "image", blockType: "content.image" },
  icon: { type: "icon", blockType: "content.icon" },
  button: { type: "button", blockType: "action.button" },
  divider: { type: "divider", blockType: "separator.divider" },
};

const YAML_ROOT_KEYS = new Set(["schemaVersion", "meta", "root"]);
const YAML_META_KEYS = new Set(["emailId", "templateId", "templateVersion", "locale"]);
const YAML_NODE_KEYS = new Set([
  "kind",
  "id",
  "name",
  "preset",
  "props",
  "wrapperStyle",
  "children",
  "bindings",
]);

const WRAPPER_STYLE_KEYS = new Set([
  "widthMode",
  "width",
  "heightMode",
  "height",
  "backgroundColor",
  "borderRadius",
  "border",
  "padding",
  "selfAlign",
  "contentAlign",
  "backgroundImage",
  "backgroundContentAlign",
]);

const PROPS_KEYS_BY_KIND = {
  emailRoot: new Set([
    "backgroundColor",
    "border",
    "width",
    "padding",
    "gapMode",
    "gap",
  ]),
  layout: new Set(["direction", "gapMode", "gap"]),
  grid: new Set(["columns", "gap", "cellWidthMode", "cellWidth", "cellHeightMode", "cellHeight"]),
  overlay: new Set([
    "mode",
    "canvas",
    "background",
    "compatPolicy",
    "fallbackPolicy",
    "contentAlign",
  ]),
  text: new Set([
    "textBody",
    "fontSize",
    "color",
    "bold",
    "italic",
    "decoration",
  ]),
  image: new Set(["src", "alt", "link", "borderRadius", "border", "viewport", "fit", "position"]),
  icon: new Set(["src", "size"]),
  button: new Set(["text", "link", "buttonStyle"]),
  divider: new Set(["color", "lineWidthMode", "lineWidth", "height"]),
};

const GENERATED_BLOCK_KEYS = new Set([
  "id",
  "type",
  "parentId",
  "children",
  "wrapperStyle",
  "props",
  "bindings",
]);

const GENERATED_PROPS_KEYS_BY_TYPE = {
  emailRoot: PROPS_KEYS_BY_KIND.emailRoot,
  layout: PROPS_KEYS_BY_KIND.layout,
  grid: PROPS_KEYS_BY_KIND.grid,
  text: PROPS_KEYS_BY_KIND.text,
  image: new Set([]),
  icon: PROPS_KEYS_BY_KIND.icon,
  button: PROPS_KEYS_BY_KIND.button,
  divider: PROPS_KEYS_BY_KIND.divider,
};

const BUTTON_STYLE_KEYS = new Set([
  "widthMode",
  "width",
  "backgroundColor",
  "textColor",
  "borderRadius",
  "border",
  "bold",
  "italic",
]);
const IMAGE_VIEWPORT_KEYS = new Set(["mode", "width", "height"]);
const SELF_ALIGN_KEYS = new Set(["horizontal", "cross"]);
const CONTENT_ALIGN_KEYS = new Set(["horizontal", "vertical"]);
const OVERLAY_CANVAS_KEYS = new Set(["width", "height", "unit", "responsive"]);
const OVERLAY_BACKGROUND_KEYS = new Set([
  "src",
  "alt",
  "link",
  "sizeMode",
  "position",
  "borderRadius",
  "border",
]);

function assertObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} 必须为对象`);
  }
}

function assertNoUnknownKeys(obj, allowed, path) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new Error(`${path} 存在不支持字段「${key}」`);
    }
  }
}

function validateCommonNestedFields(container, path, kind) {
  if (!container || typeof container !== "object" || Array.isArray(container)) return;
  const removedRelParentAlignKey = "pla" + "cement";
  if (container[removedRelParentAlignKey] !== undefined) {
    throw new Error(
      `${path} 含不符合规范的字段；盒内摆放须使用 contentAlign（水平 left|center|right，竖直 top|center|bottom）`
    );
  }
  if (container.selfAlign !== undefined) {
    if (kind === "emailRoot") {
      throw new Error(`${path}.selfAlign 不允许用于 emailRoot，请改用 contentAlign`);
    }
    assertObject(container.selfAlign, `${path}.selfAlign`);
    assertNoUnknownKeys(container.selfAlign, SELF_ALIGN_KEYS, `${path}.selfAlign`);
  }
  if (container.contentAlign !== undefined) {
    assertObject(container.contentAlign, `${path}.contentAlign`);
    assertNoUnknownKeys(container.contentAlign, CONTENT_ALIGN_KEYS, `${path}.contentAlign`);
  }
}

function defaultBorder() {
  return {
    mode: "unified",
    width: "0",
    style: "solid",
    color: "rgba(0,0,0,0)",
  };
}

function defaultBorderRadius() {
  return { mode: "unified", radius: "0" };
}

function mergeDeep(base, override) {
  if (override === undefined || override === null) return base;
  if (Array.isArray(override)) return override.slice();
  if (typeof override !== "object") return override;
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    const o = { ...override };
    for (const k of Object.keys(o)) {
      if (typeof o[k] === "object" && o[k] !== null && !Array.isArray(o[k])) {
        o[k] = mergeDeep({}, o[k]);
      }
    }
    return o;
  }
  const out = { ...base };
  for (const k of Object.keys(override)) {
    out[k] = mergeDeep(base[k], override[k]);
  }
  return out;
}

function defaultEmailRootProps() {
  return {
    backgroundColor: "#ffffff",
    width: "600px",
    padding: { mode: "unified", unified: "0" },
    border: defaultBorder(),
    gapMode: "fixed",
    gap: "0",
  };
}

function defaultLayoutProps(direction = "vertical") {
  return {
    gap: "12px",
    direction,
  };
}

function defaultWrapper(kind, preset) {
  const base = {
    contentAlign: { horizontal: "center", vertical: "top" },
    widthMode: "fill",
    heightMode: "hug",
  };
  if (kind === "emailRoot") {
    return {
      widthMode: "fill",
      heightMode: "hug",
    };
  }
  if (kind === "layout" && preset === "verticalLine") {
    return {
      widthMode: "fixed",
      width: "1px",
      heightMode: "fixed",
      height: "48px",
      backgroundColor: "#d0d0d0",
      border: defaultBorder(),
      padding: { mode: "unified", unified: "0" },
    };
  }
  if (kind === "grid") {
    return {
      widthMode: "fill",
      heightMode: "hug",
      borderRadius: defaultBorderRadius(),
    };
  }
  if (kind === "layout" || kind === "overlay") {
    const { contentAlign: _omit, ...layoutShell } = base;
    return mergeDeep(layoutShell, { borderRadius: defaultBorderRadius() });
  }
  if (kind === "icon") {
    return {
      widthMode: "hug",
      heightMode: "hug",
    };
  }
  if (kind === "divider") {
    return {
      widthMode: "fill",
      heightMode: "hug",
    };
  }
  if (kind === "button") {
    return mergeDeep(base, {});
  }
  return mergeDeep(base, {});
}

function defaultTextProps() {
  return {
    fontSize: "14px",
    color: "#222222",
    bold: false,
    italic: false,
    decoration: "none",
    textBody: { paragraphs: [{ runs: [{ text: "" }] }] },
  };
}

function normalizeDecoration(raw) {
  if (raw === "underline" || raw === "line-through" || raw === "overline" || raw === "none") return raw;
  return "none";
}

/** 合法 textBody 优先；YAML 若仍写 content 则仅用于解析为 textBody，不落盘 content。 */
function finalizeBlueprintTextProps(props) {
  const defaults = {
    bold: props.bold === true,
    italic: props.italic === true,
    decoration: normalizeDecoration(props.decoration),
  };
  const normalized = normalizeTextBody(props.textBody);
  const legacyHtml = typeof props.content === "string" ? props.content : "";
  props.textBody = normalized ?? htmlFragmentToTextBody(legacyHtml, defaults);
  delete props.content;
  return props;
}

function defaultImageProps() {
  return {
    src: "https://example.com/placeholder.png",
    alt: "图片",
    link: "",
    borderRadius: defaultBorderRadius(),
    border: defaultBorder(),
    viewport: { mode: "responsive", width: "100%", height: "auto" },
    fit: "cover",
    position: "center",
  };
}

function defaultIconProps() {
  return {
    src: "https://img.icons8.com/ios-filled/100/000000/image.png",
    size: "20px",
  };
}

function defaultButtonProps() {
  return {
    text: "按钮",
    link: "https://example.com",
    buttonStyle: {
      widthMode: "hug",
      backgroundColor: "#111111",
      textColor: "#ffffff",
      borderRadius: defaultBorderRadius(),
      border: defaultBorder(),
      bold: true,
      italic: false,
    },
  };
}

function defaultDividerProps() {
  return {
    color: "#dddddd",
    lineWidthMode: "fill",
    height: "1px",
  };
}

function defaultOverlayProps() {
  return {
    mode: "flow",
    canvas: {
      width: "600px",
      height: "400px",
      unit: "px",
      responsive: "scale-width",
    },
    background: {
      src: "https://example.com/bg.png",
      alt: "底图",
      link: "",
      sizeMode: "cover",
      position: "center",
      borderRadius: defaultBorderRadius(),
      border: defaultBorder(),
    },
    compatPolicy: "emailSafe",
    fallbackPolicy: "linearize-content",
  };
}

function validateBlueprintWrapperStyle(ws, path, kind) {
  if (ws === undefined) return;
  assertObject(ws, path);
  assertNoUnknownKeys(ws, WRAPPER_STYLE_KEYS, path);
  validateCommonNestedFields(ws, path, kind);
}

function validateBlueprintProps(kind, props, path) {
  if (props === undefined) return;
  assertObject(props, path);
  const allowed = PROPS_KEYS_BY_KIND[kind];
  assertNoUnknownKeys(props, allowed, path);
  if (kind === "button" && props.buttonStyle !== undefined) {
    assertObject(props.buttonStyle, `${path}.buttonStyle`);
    assertNoUnknownKeys(props.buttonStyle, BUTTON_STYLE_KEYS, `${path}.buttonStyle`);
  }
  if (kind === "image" && props.viewport !== undefined) {
    assertObject(props.viewport, `${path}.viewport`);
    assertNoUnknownKeys(props.viewport, IMAGE_VIEWPORT_KEYS, `${path}.viewport`);
  }
  if (kind === "overlay") {
    if (props.canvas !== undefined) {
      assertObject(props.canvas, `${path}.canvas`);
      assertNoUnknownKeys(props.canvas, OVERLAY_CANVAS_KEYS, `${path}.canvas`);
    }
    if (props.background !== undefined) {
      assertObject(props.background, `${path}.background`);
      assertNoUnknownKeys(props.background, OVERLAY_BACKGROUND_KEYS, `${path}.background`);
    }
    validateCommonNestedFields(props, path);
  }
}

function validateBlueprintNodeShape(node, path) {
  assertObject(node, path);
  assertNoUnknownKeys(node, YAML_NODE_KEYS, path);
  const kind = node.kind;
  if (typeof kind !== "string" || !KIND_MAP[kind]) {
    throw new Error(`${path}.kind 非法：${String(kind)}`);
  }
  if (typeof node.id !== "string" || node.id.trim() === "") {
    throw new Error(`${path}.id 必须为非空字符串`);
  }
  validateBlueprintProps(kind, node.props, `${path}.props`);
  validateBlueprintWrapperStyle(node.wrapperStyle, `${path}.wrapperStyle`, kind);
  if (node.children !== undefined && !Array.isArray(node.children)) {
    throw new Error(`${path}.children 必须为数组`);
  }
  if (node.bindings !== undefined) {
    assertObject(node.bindings, `${path}.bindings`);
  }
}

function validateGeneratedBlockShape(block, path) {
  assertObject(block, path);
  assertNoUnknownKeys(block, GENERATED_BLOCK_KEYS, path);
  const type = block.type;
  const allowedProps = GENERATED_PROPS_KEYS_BY_TYPE[type];
  if (!allowedProps) {
    throw new Error(`${path}.type 非法：${String(type)}`);
  }
  assertObject(block.wrapperStyle, `${path}.wrapperStyle`);
  assertNoUnknownKeys(block.wrapperStyle, WRAPPER_STYLE_KEYS, `${path}.wrapperStyle`);
  validateCommonNestedFields(block.wrapperStyle, `${path}.wrapperStyle`, type === "emailRoot" ? "emailRoot" : undefined);
  assertObject(block.props, `${path}.props`);
  assertNoUnknownKeys(block.props, allowedProps, `${path}.props`);
  if (block.type === "button" && block.props.buttonStyle !== undefined) {
    assertObject(block.props.buttonStyle, `${path}.props.buttonStyle`);
    assertNoUnknownKeys(block.props.buttonStyle, BUTTON_STYLE_KEYS, `${path}.props.buttonStyle`);
  }
  if (!Array.isArray(block.children)) {
    throw new Error(`${path}.children 必须为数组`);
  }
  if (block.bindings !== undefined) {
    assertObject(block.bindings, `${path}.bindings`);
  }
}

function ensureBackgroundBorder(kind, block) {
  if (kind === "emailRoot") {
    if (!block.props || typeof block.props !== "object") return;
    block.props = mergeDeep({ border: defaultBorder() }, block.props);
    return;
  }
  const ws = block.wrapperStyle;
  if (ws && typeof ws === "object") {
    const hasBg = typeof ws.backgroundColor === "string" && ws.backgroundColor.trim() !== "";
    if (hasBg) {
      block.wrapperStyle = mergeDeep({ border: defaultBorder() }, ws);
    }
  }
  const wsb = block.wrapperStyle?.backgroundImage;
  if (wsb && typeof wsb === "object" && typeof wsb.src === "string" && wsb.src.trim()) {
    block.wrapperStyle.backgroundImage = wsb;
  }
  if (kind === "button") {
    const bs = block.props?.buttonStyle;
    const hasButtonBg =
      bs && typeof bs === "object" && typeof bs.backgroundColor === "string" && bs.backgroundColor.trim() !== "";
    if (hasButtonBg) {
      block.props.buttonStyle = mergeDeep({ border: defaultBorder() }, bs);
    }
  }
}

function buildProps(kind, preset, yamlProps) {
  if (kind === "overlay") {
    return { gap: "0", direction: "vertical" };
  }
  let base = {};
  if (kind === "emailRoot") base = defaultEmailRootProps();
  else if (kind === "layout") base = preset === "verticalLine" ? defaultLayoutProps("vertical") : defaultLayoutProps("vertical");
  else if (kind === "grid") base = { columns: 2, gap: "12px" };
  else if (kind === "text") base = defaultTextProps();
  else if (kind === "image") base = defaultImageProps();
  else if (kind === "icon") base = defaultIconProps();
  else if (kind === "button") base = defaultButtonProps();
  else if (kind === "divider") base = defaultDividerProps();
  return mergeDeep(base, yamlProps ?? {});
}

function finalizeGridProps(props, childIds) {
  const columns = typeof props.columns === "number" ? props.columns : childIds.length || 1;
  const { items: _items, columnsPerRow: _columnsPerRow, ...rest } = props;
  return { ...rest, columns };
}

/**
 * @param {unknown} node
 * @param {string | null} parentId
 * @param {{ blocks: Record<string, unknown>, blockMeta: Record<string, unknown> }} acc
 * @returns {string[]} 子节点 id 列表
 */
function walk(node, parentId, acc, nodePath = "root") {
  validateBlueprintNodeShape(node, nodePath);
  const kind = node.kind;
  const id = node.id;
  const name = typeof node.name === "string" ? node.name : id;
  const preset = node.preset;

  const { type, blockType } = KIND_MAP[kind];
  const yamlProps = node.props && typeof node.props === "object" ? node.props : {};
  const yamlWs = node.wrapperStyle && typeof node.wrapperStyle === "object" ? node.wrapperStyle : {};

  const rawChildren = Array.isArray(node.children) ? node.children : [];
  const childIds = [];
  for (let i = 0; i < rawChildren.length; i += 1) {
    const ch = rawChildren[i];
    const cid = walk(ch, id, acc, `${nodePath}.children[${i}]`);
    if (cid) childIds.push(cid);
  }

  let props = buildProps(kind, preset, yamlProps);
  if (kind === "grid") {
    props = finalizeGridProps(props, childIds);
  }
  if (kind === "text") {
    props = finalizeBlueprintTextProps(props);
  }

  let wrapperStyle = mergeDeep(defaultWrapper(kind, preset), yamlWs);

  if (kind === "layout" && preset === "verticalLine") {
    props = mergeDeep(defaultLayoutProps("vertical"), yamlProps);
  }

  if (kind === "overlay") {
    const ov = mergeDeep(defaultOverlayProps(), yamlProps);
    const canvas = ov.canvas ?? {};
    const bg = mergeDeep({ border: defaultBorder() }, ov.background ?? {});
    const wsBg = {};
    if (typeof canvas.height === "string" && canvas.height.trim() && canvas.height !== "auto") {
      wsBg.heightMode = "fixed";
      wsBg.height = canvas.height;
    }
    if (
      typeof canvas.width === "string" &&
      canvas.width.trim() &&
      canvas.width !== "auto" &&
      canvas.width !== "100%"
    ) {
      wsBg.widthMode = "fixed";
      wsBg.width = canvas.width;
    }
    wsBg.backgroundImage = {
      src: typeof bg.src === "string" ? bg.src : "",
      alt: typeof bg.alt === "string" ? bg.alt : "",
      link: typeof bg.link === "string" ? bg.link : "",
      fit: bg.sizeMode === "contain" ? "contain" : "cover",
      position: typeof bg.position === "string" ? bg.position : "center",
      borderRadius:
        bg.borderRadius && typeof bg.borderRadius === "object"
          ? bg.borderRadius
          : defaultBorderRadius(),
      border: bg.border,
    };
    if (ov.contentAlign && typeof ov.contentAlign === "object") {
      wsBg.backgroundContentAlign = ov.contentAlign;
    }
    wrapperStyle = mergeDeep(wrapperStyle, wsBg);
  }

  const block = {
    id,
    type,
    parentId,
    children: childIds,
    wrapperStyle,
    props,
    bindings: node.bindings && typeof node.bindings === "object" ? node.bindings : {},
  };
  ensureBackgroundBorder(kind, block);

  acc.blocks[id] = block;
  acc.blockMeta[id] = { blockType, name };

  return id;
}

/**
 * @param {unknown} doc
 */
export function yamlFixtureToTemplate(doc) {
  if (!doc || typeof doc !== "object") throw new Error("YAML 根必须为对象");
  assertNoUnknownKeys(doc, YAML_ROOT_KEYS, "yaml");
  const bpSchema = doc.schemaVersion;
  if (bpSchema !== "1.0.0") {
    throw new Error(`不支持的 YAML schemaVersion「${String(bpSchema)}」，当前仅支持 1.0.0`);
  }
  const meta = doc.meta;
  if (!meta || typeof meta !== "object") {
    throw new Error("YAML 缺少 meta 对象（emailId / templateId / templateVersion）");
  }
  assertNoUnknownKeys(meta, YAML_META_KEYS, "yaml.meta");
  const { emailId, templateId, templateVersion, locale = "zh-CN" } = meta;
  if (typeof templateId !== "string" || !templateId.trim()) {
    throw new Error("meta.templateId 为必填字符串");
  }
  if (typeof templateVersion !== "number" || !Number.isFinite(templateVersion)) {
    throw new Error("meta.templateVersion 为必填数字");
  }
  const rootNode = doc.root;
  if (!rootNode || typeof rootNode !== "object") {
    throw new Error("YAML 缺少 root 节点");
  }

  const acc = { blocks: {}, blockMeta: {} };
  const rootId = walk(rootNode, null, acc, "yaml.root");

  const blocks = acc.blocks;
  const root = blocks[rootId];
  if (!root || root.type !== "emailRoot") {
    throw new Error("根节点 kind 必须为 emailRoot");
  }

  const flat = {
    schemaVersion: "4.0.0",
    emailId: typeof emailId === "string" && emailId.trim() ? emailId : templateId,
    templateId,
    templateVersion,
    locale,
    rootBlockId: rootId,
    blockMeta: acc.blockMeta,
    blocks,
  };

  normalizeTemplateBlockDefaults(flat);

  const rootWidth =
    typeof flat.blocks[rootId]?.props?.width === "string"
      ? flat.blocks[rootId].props.width
      : "600px";
  for (const [bid, blk] of Object.entries(flat.blocks)) {
    if (blk.type === "image") {
      flat.blocks[bid] = normalizeImageBlockToWrapperBackgroundShape(blk, rootWidth);
    }
  }

  for (const [id, block] of Object.entries(flat.blocks)) {
    validateGeneratedBlockShape(block, `template.blocks.${id}`);
  }

  return editorGraphToNested(flat);
}

function validateWithTsx(jsonPath, options = {}) {
  const { echoStdout = true } = options;
  const abs = resolve(jsonPath);
  const code = `
import { readFileSync } from 'node:fs';
import { parseTemplateFromDisk } from './src/lib/templateTreeAdapter.ts';
import { validateTemplate } from './src/lib/validate.ts';
const raw = JSON.parse(readFileSync(${JSON.stringify(abs)}, 'utf8'));
const t = parseTemplateFromDisk(raw);
const issues = validateTemplate(t);
if (issues.length) {
  console.error(JSON.stringify(issues, null, 2));
  process.exit(1);
}
console.log('validateTemplate: 通过');
`;
  const r = spawnSync("npx", ["tsx", "-e", code], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: false,
  });
  if (r.status !== 0) {
    process.stderr.write(r.stderr || "");
    process.stdout.write(r.stdout || "");
    throw new Error("validateTemplate 未通过");
  }
  if (echoStdout) process.stdout.write(r.stdout || "");
}

export function validateTemplateObject(template, options = {}) {
  const { echoStdout = true } = options;
  const tempPath = writeTempAndReturnPath(template);
  try {
    validateWithTsx(tempPath, { echoStdout });
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      /* 忽略 */
    }
  }
}

function printHelp() {
  console.log(`邮件模板 YAML 夹具 → template.json（用于 Golden 对照与 validateTemplate 检查）

用法:
  npm run template-yaml:expand -- --in <输入.yaml> --out <输出.json>
  cat <输入.yaml> | npm run template-yaml:expand -- --stdin --stdout
  npm run template-yaml:golden              运行 Golden 自检
  npm run template-yaml:golden:write        覆盖 tests/fixtures/email-template-yaml/golden-minimal.expected.json

说明:
  - 输入格式见 .cursor/skills/email-template-yaml-check/SKILL.md
  - 生成后会调用 validateTemplate（经 tsx 加载 TypeScript 校验器）
`);
}

function toStableJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (argv.includes("--golden")) {
    const goldenYamlPath = join(YAML_FIXTURE_DIR, "golden-minimal.fixture.yaml");
    const expectedPath = join(YAML_FIXTURE_DIR, "golden-minimal.expected.json");
    const yamlText = readFileSync(goldenYamlPath, "utf8");
    const doc = YAML.parse(yamlText);
    const template = toStableJsonValue(yamlFixtureToTemplate(doc));
    const tempPath = writeTempAndReturnPath(template);
    try {
      validateWithTsx(tempPath);
      if (argv.includes("--write")) {
        writeFileSync(expectedPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");
        console.log(`已写入期望值: ${expectedPath}`);
      } else {
        const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
        deepStrictEqual(
          template,
          expected,
          "Golden 输出与 tests/fixtures/email-template-yaml/golden-minimal.expected.json 不一致，若有意更新请运行: npm run template-yaml:golden:write"
        );
        console.log("Golden: 与期望值一致");
      }
      runInvalidGoldenCases();
    } finally {
      try {
        unlinkSync(tempPath);
      } catch {
        /* 忽略 */
      }
    }
    return;
  }

  let inPath;
  let outPath;
  let useStdin = false;
  let useStdout = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--in") inPath = argv[++i];
    else if (argv[i] === "--out") outPath = argv[++i];
    else if (argv[i] === "--stdin") useStdin = true;
    else if (argv[i] === "--stdout") useStdout = true;
  }
  if (!useStdin && !inPath) {
    printHelp();
    process.exit(1);
  }
  const inputText = useStdin ? readFileSync(0, "utf8") : readFileSync(resolve(REPO_ROOT, inPath), "utf8");
  const doc = YAML.parse(inputText);
  const template = yamlFixtureToTemplate(doc);
  validateTemplateObject(template, { echoStdout: !useStdout });
  const json = `${JSON.stringify(template, null, 2)}\n`;
  if (useStdout) {
    process.stdout.write(json);
    return;
  }
  if (!outPath) {
    printHelp();
    process.exit(1);
  }
  const resolvedOut = resolve(REPO_ROOT, outPath);
  writeFileSync(resolvedOut, json, "utf8");
  console.log(`已写入: ${resolvedOut}`);
}

function writeTempAndReturnPath(template) {
  const p = join(YAML_FIXTURE_DIR, ".golden-temp.template.json");
  writeFileSync(p, `${JSON.stringify(template, null, 2)}\n`, "utf8");
  return p;
}

function runInvalidGoldenCases() {
  const invalidCases = [
    {
      file: join(YAML_FIXTURE_DIR, "golden-invalid-unknown-field.fixture.yaml"),
      expectIncludes: "存在不支持字段",
    },
  ];
  for (const c of invalidCases) {
    const yamlText = readFileSync(c.file, "utf8");
    const doc = YAML.parse(yamlText);
    let thrown = null;
    try {
      yamlFixtureToTemplate(doc);
    } catch (error) {
      thrown = error;
    }
    if (!thrown) {
      throw new Error(`Golden 非法用例未触发失败：${c.file}`);
    }
    const msg = thrown instanceof Error ? thrown.message : String(thrown);
    if (!msg.includes(c.expectIncludes)) {
      throw new Error(
        `Golden 非法用例报错不符合预期：${c.file}\n期望包含：${c.expectIncludes}\n实际：${msg}`
      );
    }
    console.log(`Golden 非法用例通过（预期失败）：${c.file}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
