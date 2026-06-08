#!/usr/bin/env node
/**
 * 手工还原「后续 3（模板 47）」Salesforce Connections — 模拟 pipeline 产物形态，不经 LLM。
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'engagement_followup_template47';
const P = 'eft47';
const OUT = join(__dirname, `../data/emails/${EMAIL}/layouts/default`);
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/后续 3（模板 47）.png';
const DESIGN_DST = join(__dirname, '../public/test-assets/followup-template-47.png');

const COLORS = {
  white: '#FFFFFF',
  lightBlue: '#B8E0F0',
  golden: '#F4D03F',
  slate: '#4A6B8A',
  green: '#D5E8C8',
  navy: '#032E60',
  sfBlue: '#00A1E0',
  darkText: '#3E3E3C',
  lightText: '#6B7280',
};

const PEXELS = {
  hero: 'https://images.pexels.com/photos/417344/pexels-photo-417344.jpeg?auto=compress&cs=tinysrgb&w=600',
  block1: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=400',
  block2: 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=400',
  block3: 'https://images.pexels.com/photos/7413908/pexels-photo-7413908.jpeg?auto=compress&cs=tinysrgb&w=400',
  keynote: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=600',
};

const ICON = {
  salesforce: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/salesforce.svg',
  twitter: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/x.svg',
  facebook: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg',
  linkedin: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/linkedin.svg',
  instagram: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg',
};

let seq = 0;

function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
}

function themeRef(path) {
  return { $themeRef: path };
}

function themeBinding(fieldPath, tokenPath) {
  return {
    [fieldPath]: {
      slotId: tokenPath,
      mode: 'theme',
      tokenPath,
      fieldKind: 'style',
    },
  };
}

function sectionShell(id, name, opts = {}) {
  const { bg = null, pageInline = true, padTop = '0', padBottom = themeRef('tokens.spacing.section') } = opts;
  const padding = {
    mode: 'separate',
    top: padTop,
    right: pageInline ? themeRef('tokens.spacing.pageInline') : '0',
    bottom: padBottom,
    left: pageInline ? themeRef('tokens.spacing.pageInline') : '0',
  };
  const bindings = pageInline
    ? {
        ...themeBinding('wrapperStyle.padding.bottom', 'tokens.spacing.section'),
        ...themeBinding('wrapperStyle.padding.left', 'tokens.spacing.pageInline'),
        ...themeBinding('wrapperStyle.padding.right', 'tokens.spacing.pageInline'),
      }
    : {};
  const ws = {
    contentAlign: { horizontal: 'center', vertical: 'top' },
    widthMode: 'fill',
    heightMode: 'hug',
    border: borderNone(),
    borderRadius: { mode: 'unified', radius: '0' },
    padding,
  };
  if (bg) ws.backgroundColor = bg;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: ws,
    bindings,
    children: [],
  };
}

function coverImage(id, src, alt, height) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '配图' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'fixed',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      height,
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
    },
  };
}

/** 拍立得风格白框图 */
function polaroidImage(id, src, alt, height = '160px') {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '拍立得图' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: { mode: 'unified', width: '8px', style: 'solid', color: COLORS.white },
      borderRadius: { mode: 'unified', radius: '0' },
      backgroundColor: COLORS.white,
      padding: { mode: 'unified', unified: '4px' },
    },
    children: [coverImage(`${id}-inner`, src, alt, height)],
  };
}

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'center',
    fontSize = themeRef('tokens.typography.body'),
    color = themeRef('colors.primary'),
    bold = false,
    decoration = 'none',
    fontSizePath = 'tokens.typography.body',
    colorPath = 'colors.primary',
  } = opts;
  const bindings = {};
  if (fontSize?.$themeRef) Object.assign(bindings, themeBinding('props.fontSize', fontSizePath));
  if (color?.$themeRef) Object.assign(bindings, themeBinding('props.color', colorPath));
  return {
    id,
    type: 'text',
    blockMeta: { blockType: 'content.text', name },
    props: {
      textBody: { paragraphs: [{ runs: [{ text: content }] }] },
      fontSize,
      color,
      bold,
      italic: false,
      decoration,
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings,
  };
}

function iconBlock(id, src, color, size = '32px') {
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name: '图标' },
    props: { src, color, size, link: '' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const { alignH = 'center', bg = COLORS.navy, textColor = COLORS.white } = opts;
  return {
    id,
    type: 'button',
    blockMeta: { blockType: 'action.button', name },
    props: {
      text: label,
      link: '',
      buttonStyle: {
        widthMode: 'hug',
        backgroundColor: bg,
        textColor,
        fontSize: themeRef('tokens.typography.caption'),
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        bold: true,
        italic: false,
      },
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings: themeBinding('props.buttonStyle.fontSize', 'tokens.typography.caption'),
  };
}

function copyStack(id, headline, body, btn, textColor, alignH = 'left') {
  const children = [
    textBlock(`${id}-h`, '标题', headline, {
      alignH,
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      color: textColor,
      bold: true,
    }),
    textBlock(`${id}-b`, '正文', body, {
      alignH,
      fontSize: themeRef('tokens.typography.caption'),
      fontSizePath: 'tokens.typography.caption',
      color: textColor,
    }),
  ];
  if (btn) children.push(btn);
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '文案区' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: themeRef('tokens.spacing.gap') },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings: themeBinding('props.gap', 'tokens.spacing.gap'),
    children,
  };
}

function twoColFeature(id, bg, imageFirst, headline, body, btnLabel, btnOpts, imgSrc, textColor) {
  const textCol = copyStack(
    `${id}-text`,
    headline,
    body,
    buttonBlock(`${id}-btn`, '按钮', btnLabel, { alignH: 'left', ...btnOpts }),
    textColor,
    'left',
  );
  const imgCol = polaroidImage(`${id}-img`, imgSrc, headline, '150px');
  const children = imageFirst ? [imgCol, textCol] : [textCol, imgCol];
  const sec = sectionShell(`${id}-sec`, '内容双栏', {
    pageInline: false,
    bg,
    padTop: '24px',
    padBottom: '24px',
  });
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '24px',
    right: '20px',
    bottom: '24px',
    left: '20px',
  };
  sec.bindings = {};
  sec.children.push({
    id: `${id}-row`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '20px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children,
  });
  return sec;
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '活动感谢头图', {
    pageInline: false,
    bg: COLORS.lightBlue,
    padTop: '24px',
    padBottom: '0',
  });
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '24px',
    right: '24px',
    bottom: '0',
    left: '24px',
  };
  sec.bindings = {};
  sec.children.push({
    id: `${P}-s1-inner`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: themeRef('tokens.spacing.gap') },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings: themeBinding('props.gap', 'tokens.spacing.gap'),
    children: [
      iconBlock(`${P}-s1-sf`, ICON.salesforce, COLORS.sfBlue, '40px'),
      textBlock(`${P}-s1-conn`, '标题', 'connections', {
        fontSize: themeRef('tokens.typography.display'),
        fontSizePath: 'tokens.typography.display',
        color: COLORS.navy,
        bold: true,
      }),
      textBlock(`${P}-s1-city`, '说明', 'Chicago 2018', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.lightText,
      }),
      textBlock(`${P}-s1-h1`, '标题', "Thank you for attending this year's Connections!", {
        fontSize: themeRef('tokens.typography.h1'),
        fontSizePath: 'tokens.typography.h1',
        color: COLORS.darkText,
        bold: true,
      }),
      textBlock(
        `${P}-s1-sub`,
        '正文',
        'Here are just a few resources to learn how Salesforce can help you connect with your customers in a whole new way.',
        { fontSize: themeRef('tokens.typography.caption'), fontSizePath: 'tokens.typography.caption', color: COLORS.darkText },
      ),
      coverImage(
        `${P}-s1-hero`,
        PEXELS.hero,
        'Conference landscape with city skyline illustration substitute',
        '200px',
      ),
    ],
  });
  return sec;
}

function buildS2() {
  return twoColFeature(
    `${P}-s2`,
    COLORS.golden,
    false,
    'Transform customer engagement with deeper insights',
    'Learn how consumer goods companies can leverage data-fueled insights to meet the rising expectations of today\'s customers.',
    'GET REPORT',
    { bg: COLORS.navy, textColor: COLORS.white },
    PEXELS.block1,
    COLORS.darkText,
  );
}

function buildS3() {
  return twoColFeature(
    `${P}-s3`,
    COLORS.slate,
    true,
    'See why leading CG companies choose Salesforce',
    'Across the globe, consumer goods companies are choosing Salesforce to help increase sales productivity and effectiveness, respond faster to new business needs, and gain greater visibility across the value chain.',
    'GET REPORT',
    { bg: COLORS.white, textColor: COLORS.slate },
    PEXELS.block2,
    COLORS.white,
  );
}

function buildS4() {
  return twoColFeature(
    `${P}-s4`,
    COLORS.green,
    false,
    'Need a guide on your Salesforce journey?',
    "Find out how Success Cloud's experts and services can get you where you want to go, faster.",
    'GET E-BOOK',
    { bg: COLORS.navy, textColor: COLORS.white },
    PEXELS.block3,
    COLORS.darkText,
  );
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '主题演讲号召', {
    pageInline: false,
    bg: COLORS.lightBlue,
    padTop: '24px',
    padBottom: '24px',
  });
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '24px',
    right: '24px',
    bottom: '24px',
    left: '24px',
  };
  sec.bindings = {};
  sec.children.push({
    id: `${P}-s5-inner`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: themeRef('tokens.spacing.gap') },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings: themeBinding('props.gap', 'tokens.spacing.gap'),
    children: [
      textBlock(`${P}-s5-cta`, '链接', 'WATCH THE KEYNOTE with your teams to get everyone inspired.', {
        fontSize: themeRef('tokens.typography.body'),
        color: COLORS.darkText,
        bold: true,
        decoration: 'underline',
      }),
      coverImage(`${P}-s5-img`, PEXELS.keynote, 'Keynote presentation scene', '160px'),
      textBlock(`${P}-s5-sign`, '说明', 'KEYNOTE', {
        fontSize: themeRef('tokens.typography.h1'),
        fontSizePath: 'tokens.typography.h1',
        color: COLORS.navy,
        bold: true,
      }),
    ],
  });
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '页脚信息', {
    pageInline: false,
    bg: COLORS.navy,
    padTop: '24px',
    padBottom: '24px',
  });
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '24px',
    right: '20px',
    bottom: '24px',
    left: '20px',
  };
  sec.bindings = {};
  const social = {
    id: `${P}-s6-social`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      iconBlock(`${P}-s6-tw`, ICON.twitter, COLORS.white, '20px'),
      iconBlock(`${P}-s6-fb`, ICON.facebook, COLORS.white, '20px'),
      iconBlock(`${P}-s6-li`, ICON.linkedin, COLORS.white, '20px'),
      iconBlock(`${P}-s6-ig`, ICON.instagram, COLORS.white, '20px'),
    ],
  };
  sec.children.push({
    id: `${P}-s6-inner`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(
        `${P}-s6-addr`,
        '正文',
        'Salesforce.com, inc. The Landmark @ One Market, Suite 300, San Francisco, CA, 94105, United States. General Inquiries: 847-258-3800 | Fax: 415-901-7040 | Sales: 1-800-NO-SOFTWARE',
        {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.white,
        },
      ),
      social,
      textBlock(`${P}-s6-copy`, '正文', '© 2018 salesforce.com, inc. All rights reserved.', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.white,
      }),
      textBlock(`${P}-s6-to`, '正文', 'This email was sent to hello@SmilesDavis.yeah', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.white,
      }),
      textBlock(`${P}-s6-prefs`, '链接', 'Manage Preferences to Unsubscribe | Privacy Statement', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.white,
        decoration: 'underline',
      }),
      textBlock(`${P}-s6-mc`, '说明', 'Powered by salesforce marketing cloud', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.white,
        bold: true,
      }),
    ],
  });
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '模板47手工还原（Salesforce Connections）',
      description: '后续 3 设计图手工还原；图源 Pexels、图标 jsDelivr。',
      tokens: {
        colors: { primary: '#3E3E3C', secondary: '#6B7280', surface: '#FFFFFF' },
        spacing: { section: '16px', gap: '12px', pageInline: '24px' },
        typography: { display: '28px', h1: '18px', body: '14px', caption: '12px' },
        radius: { panel: '0', cta: '0' },
      },
    },
  },
  scopeSelections: {},
};

const template = {
  schemaVersion: '4.0.0',
  emailId: EMAIL,
  templateId: EMAIL,
  templateVersion: 1,
  locale: 'zh-CN',
  root: {
    id: `${P}-root`,
    type: 'emailRoot',
    blockMeta: { blockType: 'layout.container', name: '画布根' },
    props: {
      backgroundColor: COLORS.white,
      width: '600px',
      padding: { mode: 'unified', unified: '0' },
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6()],
  },
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);

try {
  copyFileSync(DESIGN_SRC, DESIGN_DST);
} catch {
  console.warn('设计图未复制到 public/test-assets（源路径不可读则跳过）');
}

console.log(`Wrote ${OUT}`);
