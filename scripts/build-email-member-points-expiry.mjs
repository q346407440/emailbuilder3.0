#!/usr/bin/env node

import { contentAlignFromAxes, axesAlignRecord } from "./lib/content-align-axis.mjs";
/**
 * 生成「积分过期提醒」学习模板到 data/emails/member-points-expiry/
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeTokenPresetTokens } from "./lib/token-preset-standard-order.mjs";
import { defaultLayoutDir } from "./lib/email-layout-output.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "data", "emails", "member-points-expiry");
const LAYOUT_DIR = defaultLayoutDir(OUT_DIR);
const PREFIX = "pe";

const TABLER = (name) =>
  `https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/${name}.svg`;
const PEX = (id, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

const STORE_LOGO_SRC = TABLER("building-store");
const HERO_EXPIRY_SRC = PEX(1181533, 800);

const border0 = () => ({
  mode: "unified",
  width: "0",
  style: "solid",
  color: "rgba(0,0,0,0)",
});

const radius0 = () => ({ mode: "unified", radius: "0" });

const themeRef = (path) => ({ $themeRef: path });

const themeBinding = (path) => ({
  slotId: path,
  mode: "theme",
  tokenPath: path,
  fieldKind: "style",
});

const padSectionInline = () => ({
  mode: "separate",
  top: themeRef("tokens.spacing.section"),
  right: themeRef("tokens.spacing.pageInline"),
  bottom: themeRef("tokens.spacing.section"),
  left: themeRef("tokens.spacing.pageInline"),
});

const padBindings = () => ({
  "wrapperStyle.padding.top": themeBinding("tokens.spacing.section"),
  "wrapperStyle.padding.bottom": themeBinding("tokens.spacing.section"),
  "wrapperStyle.padding.left": themeBinding("tokens.spacing.pageInline"),
  "wrapperStyle.padding.right": themeBinding("tokens.spacing.pageInline"),
});

const modShellBindings = () => ({
  "wrapperStyle.backgroundColor": themeBinding("colors.surface"),
  ...padBindings(),
  "props.gap": themeBinding("tokens.spacing.gap"),
});

const wsBase = (extra = {}) => ({
  contentAlign: contentAlignFromAxes("start", "start"),
  contentAlign: { horizontal: "left", vertical: "top" },
  widthMode: "fill",
  heightMode: "hug",
  border: border0(),
  borderRadius: radius0(),
  ...extra,
});

const textBodyRuns = (runs) => ({
  paragraphs: [{ runs }],
});

const snapshotFromRuns = (runs) => {
  const inner = runs
    .map((r) => {
      if (r.link) return `<a href="${r.link}">${r.text}</a>`;
      if (r.bold) return `<strong>${r.text}</strong>`;
      return r.text;
    })
    .join("");
  return `<p>${inner}</p>`;
};

function build() {
  const blockMeta = {};
  const blocks = {};
  const reg = (id, blockType, name, block) => {
    blockMeta[id] = { blockType, name };
    blocks[id] = block;
  };

  const ROOT_ID = `${PREFIX}-root`;
  const modIds = [];

  const addMod = (modId, title, innerIds, extraWs = {}, extraBindings = {}) => {
    modIds.push(modId);
    reg(modId, "layout.container", title, {
      id: modId,
      type: "layout",
      parentId: ROOT_ID,
      children: innerIds,
      wrapperStyle: wsBase({
        backgroundColor: themeRef("colors.surface"),
        padding: padSectionInline(),
        ...extraWs,
      }),
      props: {
        direction: "vertical",
        gapMode: "fixed",
        gap: themeRef("tokens.spacing.gap"),
      },
      bindings: { ...modShellBindings(), ...extraBindings },
    });
  };

  // --- Logo ---
  const modLogo = `${PREFIX}-mod-logo`;
  const logoRow = `${PREFIX}-logo-row`;
  const logoImg = `${PREFIX}-logo-img`;
  addMod(modLogo, "模块 · 店铺 Logo", [logoRow]);

  reg(logoRow, "layout.container", "Logo 居中行", {
    id: logoRow,
    type: "layout",
    parentId: modLogo,
    children: [logoImg],
    wrapperStyle: wsBase({
      contentAlign: contentAlignFromAxes("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
    }),
    props: { direction: "horizontal", gapMode: "fixed", gap: "0" },
    bindings: {},
  });

  reg(logoImg, "content.image", "店铺 Logo", {
    id: logoImg,
    type: "image",
    parentId: logoRow,
    children: [],
    wrapperStyle: {
      contentAlign: contentAlignFromAxes("center", "center"),
      contentAlign: { horizontal: "center", vertical: "center" },
      widthMode: "fixed",
      width: "140px",
      heightMode: "fixed",
      height: "48px",
      border: border0(),
      borderRadius: radius0(),
      backgroundImage: {
        src: STORE_LOGO_SRC,
        alt: "Store logo",
        link: "",
        fit: "contain",
        position: "center",
        borderRadius: radius0(),
        border: border0(),
      },
    },
    props: {},
    bindings: {
      "wrapperStyle.backgroundImage.src": {
        slotId: "storeLogoSrc",
        mode: "variable",
        valueType: "image",
        defaultValue: STORE_LOGO_SRC,
        allowExternal: true,
        fieldKind: "content",
        label: "店铺 Logo 地址",
      },
      "wrapperStyle.backgroundImage.alt": {
        slotId: "storeLogoAlt",
        mode: "variable",
        valueType: "string",
        defaultValue: "Store logo",
        allowExternal: true,
        fieldKind: "content",
        label: "店铺 Logo 替代文字",
      },
    },
  });

  // --- 主视觉 ---
  const modHero = `${PREFIX}-mod-hero`;
  const heroImg = `${PREFIX}-hero-img`;
  const heroSub = `${PREFIX}-hero-sub`;
  const heroTitle = `${PREFIX}-hero-title`;
  addMod(modHero, "模块 · 积分过期主视觉", [heroImg, heroSub, heroTitle]);

  reg(heroImg, "content.image", "过期提醒头图", {
    id: heroImg,
    type: "image",
    parentId: modHero,
    children: [],
    wrapperStyle: {
      contentAlign: contentAlignFromAxes("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
      widthMode: "fill",
      heightMode: "fixed",
      height: "180px",
      border: border0(),
      borderRadius: {
        mode: "unified",
        radius: themeRef("tokens.radius.panel"),
      },
      backgroundImage: {
        src: HERO_EXPIRY_SRC,
        alt: "Points expiration",
        link: "",
        fit: "cover",
        position: "center",
        borderRadius: {
          mode: "unified",
          radius: themeRef("tokens.radius.panel"),
        },
        border: border0(),
      },
    },
    props: {},
    bindings: {
      "wrapperStyle.backgroundImage.src": {
        slotId: "heroExpiryImageSrc",
        mode: "variable",
        valueType: "image",
        defaultValue: HERO_EXPIRY_SRC,
        allowExternal: true,
        fieldKind: "content",
        label: "积分过期头图",
      },
      "wrapperStyle.backgroundImage.alt": {
        slotId: "heroExpiryImageAlt",
        mode: "variable",
        valueType: "string",
        defaultValue: "Points expiration",
        allowExternal: true,
        fieldKind: "content",
        label: "过期头图替代文字",
      },
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
      "wrapperStyle.backgroundImage.borderRadius.radius": themeBinding("tokens.radius.panel"),
    },
  });

  reg(heroSub, "content.text", "过期提醒副标题", {
    id: heroSub,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Points Expiration Reminder</p>",
      textBody: textBodyRuns([{ text: "Points Expiration Reminder" }]),
      fontSize: themeRef("tokens.typography.body"),
      color: "#8B2942",
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "heroSubtitle",
        mode: "variable",
        valueType: "string",
        defaultValue: "Points Expiration Reminder",
        allowExternal: true,
        fieldKind: "content",
        label: "过期提醒副标题",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
    },
  });

  reg(heroTitle, "content.text", "过期大标题", {
    id: heroTitle,
    type: "text",
    parentId: modHero,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Expired</p>",
      textBody: textBodyRuns([{ text: "Expired", bold: true }]),
      fontSize: themeRef("tokens.typography.display"),
      color: "#C0392B",
      bold: true,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "heroTitleText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Expired",
        allowExternal: true,
        fieldKind: "content",
        label: "过期大标题",
      },
      "props.fontSize": themeBinding("tokens.typography.display"),
    },
  });

  // --- 问候与过期说明 ---
  const modGreeting = `${PREFIX}-mod-greeting`;
  const greetingHi = `${PREFIX}-greeting-hi`;
  const greetingExpiry = `${PREFIX}-greeting-expiry`;
  addMod(modGreeting, "模块 · 问候与过期说明", [greetingHi, greetingExpiry]);

  reg(greetingHi, "content.text", "问候称呼", {
    id: greetingHi,
    type: "text",
    parentId: modGreeting,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>Hi Member Name</p>",
      textBody: textBodyRuns([{ text: "Hi Member Name" }]),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.0.text": {
        slotId: "greetingHiText",
        mode: "variable",
        valueType: "string",
        defaultValue: "Hi Member Name",
        allowExternal: true,
        fieldKind: "content",
        label: "问候称呼",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  const expiryRuns = [
    { text: "Your points will expire on " },
    { text: "2026-01-01 00:00:00", bold: true },
  ];
  reg(greetingExpiry, "content.text", "过期时间说明", {
    id: greetingExpiry,
    type: "text",
    parentId: modGreeting,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(expiryRuns),
      textBody: textBodyRuns(expiryRuns),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.text": {
        slotId: "pointsExpiryDate",
        mode: "variable",
        valueType: "string",
        defaultValue: "2026-01-01 00:00:00",
        allowExternal: true,
        fieldKind: "content",
        label: "积分过期时间",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  // --- 积分余额展示 ---
  const modPoints = `${PREFIX}-mod-points`;
  const pointsBox = `${PREFIX}-points-box`;
  const pointsValue = `${PREFIX}-points-value`;
  addMod(modPoints, "模块 · 积分余额", [pointsBox]);

  reg(pointsBox, "layout.container", "积分余额高亮盒", {
    id: pointsBox,
    type: "layout",
    parentId: modPoints,
    children: [pointsValue],
    wrapperStyle: wsBase({
      backgroundColor: "#EEF4FF",
      borderRadius: {
        mode: "unified",
        radius: themeRef("tokens.radius.panel"),
      },
      padding: {
        mode: "separate",
        top: "16px",
        right: "28px",
        bottom: "16px",
        left: "28px",
      },
      contentAlign: contentAlignFromAxes("center", "start"),
      contentAlign: { horizontal: "center", vertical: "top" },
    }),
    props: { direction: "vertical", gapMode: "fixed", gap: "0" },
    bindings: {
      "wrapperStyle.borderRadius.radius": themeBinding("tokens.radius.panel"),
    },
  });

  reg(pointsValue, "content.text", "积分余额", {
    id: pointsValue,
    type: "text",
    parentId: pointsBox,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "center", vertical: "top" } }),
    props: {
      content: "<p>points: <strong>888</strong></p>",
      textBody: textBodyRuns([
        { text: "points: " },
        { text: "888", bold: true },
      ]),
      fontSize: themeRef("tokens.typography.h1"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.text": {
        slotId: "pointsBalance",
        mode: "variable",
        valueType: "string",
        defaultValue: "888",
        allowExternal: true,
        fieldKind: "content",
        label: "积分余额",
      },
      "props.fontSize": themeBinding("tokens.typography.h1"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  // --- 账户说明 ---
  const modAccount = `${PREFIX}-mod-account`;
  const accountPara1 = `${PREFIX}-account-para-1`;
  const accountPara2 = `${PREFIX}-account-para-2`;
  addMod(modAccount, "模块 · 账户说明", [accountPara1, accountPara2]);

  const accountRuns1 = [
    {
      text: "You need to log into your store account to enjoy member services and savings. I don't have an account. ",
    },
    { text: "Create an account", link: "https://example.com/register", decoration: "underline" },
  ];
  reg(accountPara1, "content.text", "账户说明 1", {
    id: accountPara1,
    type: "text",
    parentId: modAccount,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(accountRuns1),
      textBody: textBodyRuns(accountRuns1),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "createAccountUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/register",
        allowExternal: true,
        fieldKind: "content",
        label: "注册账户链接",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  const accountRuns2 = [
    {
      text: "If you agree to join the membership during Checkout, we have created an account for you. ",
    },
    { text: "Reset password", link: "https://example.com/reset-password", decoration: "underline" },
  ];
  reg(accountPara2, "content.text", "账户说明 2", {
    id: accountPara2,
    type: "text",
    parentId: modAccount,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(accountRuns2),
      textBody: textBodyRuns(accountRuns2),
      fontSize: themeRef("tokens.typography.body"),
      color: themeRef("colors.primary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "resetPasswordUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/reset-password",
        allowExternal: true,
        fieldKind: "content",
        label: "重置密码链接",
      },
      "props.fontSize": themeBinding("tokens.typography.body"),
      "props.color": themeBinding("colors.primary"),
    },
  });

  // --- 分隔线 ---
  const modDivider = `${PREFIX}-mod-divider`;
  const dividerLine = `${PREFIX}-divider-line`;
  addMod(
    modDivider,
    "模块 · 分隔线",
    [dividerLine],
    {
      padding: {
        mode: "separate",
        top: "8px",
        right: themeRef("tokens.spacing.pageInline"),
        bottom: "8px",
        left: themeRef("tokens.spacing.pageInline"),
      },
    },
    {
      "wrapperStyle.padding.left": themeBinding("tokens.spacing.pageInline"),
      "wrapperStyle.padding.right": themeBinding("tokens.spacing.pageInline"),
    },
  );

  reg(dividerLine, "separator.divider", "分隔线", {
    id: dividerLine,
    type: "divider",
    parentId: modDivider,
    children: [],
    wrapperStyle: {
      widthMode: "fill",
      heightMode: "hug",
      contentAlign: contentAlignFromAxes("center", "center"),
      border: border0(),
      borderRadius: radius0(),
    },
    props: {
      color: themeRef("colors.secondary"),
      height: "1px",
    },
    bindings: {
      "props.color": themeBinding("colors.secondary"),
    },
  });

  // --- 页脚联系 ---
  const modFooter = `${PREFIX}-mod-footer`;
  const footerContact = `${PREFIX}-footer-contact`;
  addMod(modFooter, "模块 · 页脚联系", [footerContact]);

  const footerRuns = [
    {
      text: "We are committed to making your experience enjoyable. For questions or feedback, please contact the ",
    },
    { text: "zyzshop1", link: "https://example.com/store", decoration: "underline" },
    { text: " Team at " },
    {
      text: "lintingting516@gmail.com",
      link: "mailto:lintingting516@gmail.com",
      decoration: "underline",
    },
  ];
  reg(footerContact, "content.text", "联系说明", {
    id: footerContact,
    type: "text",
    parentId: modFooter,
    children: [],
    wrapperStyle: wsBase({ contentAlign: { horizontal: "left", vertical: "top" } }),
    props: {
      content: snapshotFromRuns(footerRuns),
      textBody: textBodyRuns(footerRuns),
      fontSize: themeRef("tokens.typography.caption"),
      color: themeRef("colors.secondary"),
      bold: false,
      italic: false,
      decoration: "none",
    },
    bindings: {
      "props.textBody.paragraphs.0.runs.1.text": {
        slotId: "storeName",
        mode: "variable",
        valueType: "string",
        defaultValue: "zyzshop1",
        allowExternal: true,
        fieldKind: "content",
        label: "店铺名称",
      },
      "props.textBody.paragraphs.0.runs.1.link": {
        slotId: "storeUrl",
        mode: "variable",
        valueType: "url",
        defaultValue: "https://example.com/store",
        allowExternal: true,
        fieldKind: "content",
        label: "店铺链接",
      },
      "props.textBody.paragraphs.0.runs.3.text": {
        slotId: "supportEmail",
        mode: "variable",
        valueType: "string",
        defaultValue: "lintingting516@gmail.com",
        allowExternal: true,
        fieldKind: "content",
        label: "客服邮箱",
      },
      "props.textBody.paragraphs.0.runs.3.link": {
        slotId: "supportEmailMailto",
        mode: "variable",
        valueType: "url",
        defaultValue: "mailto:lintingting516@gmail.com",
        allowExternal: true,
        fieldKind: "content",
        label: "客服邮箱 mailto 链接",
      },
      "props.fontSize": themeBinding("tokens.typography.caption"),
      "props.color": themeBinding("colors.secondary"),
    },
  });

  reg(ROOT_ID, "layout.container", "画布根节点", {
    id: ROOT_ID,
    type: "emailRoot",
    parentId: null,
    children: modIds,
    wrapperStyle: {
      contentAlign: contentAlignFromAxes("center", "start"),
      widthMode: "fill",
      heightMode: "hug",
    },
    props: {
      border: border0(),
      backgroundColor: themeRef("colors.surface"),
      width: "600px",
      padding: { mode: "unified", unified: "0" },
      gapMode: "fixed",
      gap: "0",
    },
    bindings: {
      "props.backgroundColor": themeBinding("colors.surface"),
    },
  });

  return {
    schemaVersion: "3.0.0",
    emailId: "member_points_expiry",
    templateId: "member_points_expiry",
    templateVersion: 1,
    locale: "en-US",
    rootBlockId: ROOT_ID,
    blockMeta,
    blocks,
  };
}

function writePayload() {
  return {
    schemaVersion: "1.0.0",
    values: {
      storeLogoSrc: STORE_LOGO_SRC,
      storeLogoAlt: "Store logo",
      heroExpiryImageSrc: HERO_EXPIRY_SRC,
      heroExpiryImageAlt: "Points expiration",
      heroSubtitle: "Points Expiration Reminder",
      heroTitleText: "Expired",
      greetingHiText: "Hi Member Name",
      pointsExpiryDate: "2026-01-01 00:00:00",
      pointsBalance: "888",
      createAccountUrl: "https://example.com/register",
      resetPasswordUrl: "https://example.com/reset-password",
      storeName: "zyzshop1",
      storeUrl: "https://example.com/store",
      supportEmail: "lintingting516@gmail.com",
      supportEmailMailto: "mailto:lintingting516@gmail.com",
    },
  };
}

function writeTokenPresets() {
  return {
    schemaVersion: "1.0.0",
    activePresetId: "default",
    presets: {
      default: {
        label: "积分过期提醒预设",
        description: "过期提醒：蓝强调色、浅灰纸面与标准间距档位。",
        tokens: normalizeTokenPresetTokens({
          colors: {
            primary: "#1D4ED8",
            secondary: "#9CA3AF",
            surface: "#FFFFFF",
          },
          spacing: {
            section: "24px",
            gap: "12px",
            pageInline: "24px",
          },
          typography: {
            display: "34px",
            h1: "24px",
            body: "15px",
            caption: "13px",
          },
          radius: {
            panel: "10px",
            cta: "6px",
          },
        }),
      },
    },
    scopeSelections: {},
  };
}

function writeMeta() {
  return {
    displayName: "积分过期提醒（Points Expiry 学习模板）",
    description:
      "店铺 Logo、积分过期主视觉、问候与过期说明、积分余额、账户说明、分隔线与页脚联系；样式经 tokenPresets 统一管理。",
    source: "agent",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultStylePresetSelection: "local",
  };
}


mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(LAYOUT_DIR, { recursive: true });
writeFileSync(join(LAYOUT_DIR, "template.json"), `${JSON.stringify(build(), null, 2)}\n`);
writeFileSync(join(OUT_DIR, "payload.json"), `${JSON.stringify(writePayload(), null, 2)}\n`);
writeFileSync(
  join(LAYOUT_DIR, "tokenPresets.json"),
  `${JSON.stringify(writeTokenPresets(), null, 2)}\n`,
);
writeFileSync(join(OUT_DIR, "meta.json"), `${JSON.stringify(writeMeta(), null, 2)}\n`);
const norm = spawnSync(
  "npx",
  [
    "tsx",
    "scripts/normalize-template-defaults.ts",
    "--write",
    "data/emails/member-points-expiry/layouts/default/template.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);
if (norm.status !== 0) process.exit(norm.status ?? 1);

console.log(`Wrote member-points-expiry template to ${OUT_DIR}`);
