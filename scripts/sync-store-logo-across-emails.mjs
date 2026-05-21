/**
 * 将所有含店铺 Logo（storeLogoSrc）的邮件模板统一为 member-welcome 使用的 lucide store.svg，
 * 并将各模板中 *-mod-logo 布局容器背景设为纯白色 #FFFFFF（移除 colors.surface 绑定以免被预设覆盖）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const emailsRoot = path.join(root, "data/emails");

const STORE_LOGO_SRC = "https://cdn.jsdelivr.net/npm/lucide-static@0.469.0/icons/store.svg";
const LOGO_MODULE_BG = "#FFFFFF";

function patchTemplate(templatePath) {
  const raw = fs.readFileSync(templatePath, "utf8");
  const template = JSON.parse(raw);
  let changed = false;

  for (const [, block] of Object.entries(template.blocks ?? {})) {
    if (!block || typeof block !== "object") continue;
    const id = block.id;
    if (!id) continue;

    if (/-mod-logo$/.test(id) && block.type === "layout") {
      block.wrapperStyle ??= {};
      const hadBgBinding = Boolean(block.bindings?.["wrapperStyle.backgroundColor"]);
      const prevBg = block.wrapperStyle.backgroundColor;
      block.wrapperStyle.backgroundColor = LOGO_MODULE_BG;
      if (block.bindings && "wrapperStyle.backgroundColor" in block.bindings) {
        delete block.bindings["wrapperStyle.backgroundColor"];
      }
      const bgChanged =
        JSON.stringify(prevBg) !== JSON.stringify(LOGO_MODULE_BG) || hadBgBinding;
      if (bgChanged) changed = true;
    }

    const srcBinding = block.bindings?.["wrapperStyle.backgroundImage.src"];
    if (srcBinding?.slotId === "storeLogoSrc") {
      if (srcBinding.defaultValue !== STORE_LOGO_SRC) {
        srcBinding.defaultValue = STORE_LOGO_SRC;
        changed = true;
      }
      const bi = block.wrapperStyle?.backgroundImage;
      if (bi && typeof bi === "object" && bi.src !== STORE_LOGO_SRC) {
        bi.src = STORE_LOGO_SRC;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(templatePath, `${JSON.stringify(template, null, 2)}\n`);
  }
  return changed;
}

function patchPayload(payloadPath) {
  if (!fs.existsSync(payloadPath)) return false;
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  if (!payload.values || !("storeLogoSrc" in payload.values)) return false;
  if (payload.values.storeLogoSrc === STORE_LOGO_SRC) return false;
  payload.values.storeLogoSrc = STORE_LOGO_SRC;
  fs.writeFileSync(payloadPath, `${JSON.stringify(payload, null, 2)}\n`);
  return true;
}

let tCount = 0;
let pCount = 0;

for (const name of fs.readdirSync(emailsRoot)) {
  const dir = path.join(emailsRoot, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const templatePath = path.join(dir, "template.json");
  if (!fs.existsSync(templatePath)) continue;
  if (patchTemplate(templatePath)) tCount += 1;
  if (patchPayload(path.join(dir, "payload.json"))) pCount += 1;
}

console.log(`已更新 template.json: ${tCount} 个目录`);
console.log(`已更新 payload.json storeLogoSrc: ${pCount} 个目录`);
console.log(`Logo URL: ${STORE_LOGO_SRC}`);
console.log(`Logo 模块背景: ${LOGO_MODULE_BG}`);
