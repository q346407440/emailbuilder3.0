#!/usr/bin/env node
/**
 * 手工还原「后续 3（模板 47）」Salesforce Connections 2018 邮件
 * 图源：Pexels；图标：jsDelivr Simple Icons
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'engagement_followup_template47_doubao_v1';
const P = 'engageme';
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/后续 3（模板 47）.png';
const DESIGN_DST = '/Users/hengliheng/Easy-Email/public/test-assets/engagement_followup_template47_doubao_v1-design.png';

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

const COLORS = {
  skyBlue: '#71C5EE',
  connectionsBlue: '#172E5E',
  deepNavy: '#09344F',
  goldenYellow: '#F4C249',
  slateBlue: '#4A7396',
  mintGreen: '#98C9C2',
  cloudWhite: '#FFFFFF',
  lightText: '#333333',
  buttonBlue: '#032E61',
};

let seq = 0;
const nid = (suffix) => `${P}-${suffix}-${++seq}`.replace(/-+/g, '-');

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
  const {
    bg = null,
    pageInline = true,
    padTop = '0',
    padBottom = themeRef('tokens.spacing.section'),
  } = opts;
  const padding = pageInline
    ? {
        mode: 'separate',
        top: padTop,
        right: themeRef('tokens.spacing.pageInline'),
        bottom: padBottom,
        left: themeRef('tokens.spacing.pageInline'),
      }
    : { mode: 'unified', unified: padBottom === '0' ? '0' : '0 0 20px 0' };

  const bindings = {};
  if (pageInline) {
    Object.assign(
      bindings,
      themeBinding('wrapperStyle.padding.bottom', 'tokens.spacing.section'),
      themeBinding('wrapperStyle.padding.left', 'tokens.spacing.pageInline'),
      themeBinding('wrapperStyle.padding.right', 'tokens.spacing.pageInline'),
    );
  }

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

function imageContainer(id, name, src, alt, height, overlayChildren, alignV = 'top', alignH = 'left') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
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
    children: overlayChildren,
  };
}

function photoFrame(id, src, alt, opts = {}) {
  const { alignH = 'right' } = opts;
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '照片框' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '220px',
      heightMode: 'fixed',
      height: '200px',
      border: {
        mode: 'unified',
        width: '8px',
        style: 'solid',
        color: COLORS.cloudWhite,
      },
      borderRadius: { mode: 'unified', radius: '0' },
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

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'left',
    fontSize = themeRef('tokens.typography.body'),
    color = themeRef('colors.primary'),
    bold = false,
    decoration = 'none',
    fontSizePath = 'tokens.typography.body',
    colorPath = 'colors.primary',
    widthMode = 'fill',
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
      widthMode,
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings,
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const {
    alignH = 'left',
    bg = COLORS.buttonBlue,
    textColor = COLORS.cloudWhite,
    radius = '0px',
  } = opts;
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
        fontSize: themeRef('tokens.typography.body'),
        border: borderNone(),
        borderRadius: { mode: 'unified', radius },
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
    bindings: {
      ...themeBinding('props.buttonStyle.fontSize', 'tokens.typography.body'),
    },
  };
}

function iconBlock(id, src, color, size = '24px') {
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

function dividerBlock(id, color = COLORS.cloudWhite) {
  return {
    id,
    type: 'divider',
    blockMeta: { blockType: 'separator.divider', name: '分隔线' },
    props: { color, height: '1px', lineWidthMode: 'fill' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      contentAlign: { horizontal: 'center', vertical: 'top' },
    },
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '品牌头部', { bg: COLORS.skyBlue, padTop: '24px', padBottom: '0' });
  const textWrap = {
    id: nid('s1-text-wrap'),
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '文字容器' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: { mode: 'separate', top: '0', right: '160px', bottom: '0', left: '0' }
    },
    children: [
      textBlock(nid('s1-title'), '标题', 'connections', {
        fontSize: themeRef('tokens.typography.display'),
        fontSizePath: 'tokens.typography.display',
        color: COLORS.connectionsBlue,
        bold: true,
        alignH: 'center',
      }),
      textBlock(nid('s1-subtitle'), '副标题', 'Chicago 2018', {
        fontSize: themeRef('tokens.typography.h1'),
        fontSizePath: 'tokens.typography.h1',
        color: COLORS.connectionsBlue,
        alignH: 'center',
      }),
      textBlock(nid('s1-p1'), '正文', 'Thank you for attending this year\'s Connections!', {
        color: COLORS.lightText,
      }),
      textBlock(nid('s1-p2'), '正文', 'Here are just a few resources to learn how Salesforce can help you connect with your customers in a whole new way.', {
        color: COLORS.lightText,
      }),
    ]
  };
  sec.children.push(textWrap);
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首屏插画', { pageInline: false, padBottom: '0' });
  sec.children.push(
    imageContainer(
      `${P}-s2-hero`,
      '首屏插画',
      PEXELS.hero,
      'Salesforce Connections Chicago 2018 illustration with Trailhead characters',
      '300px',
      [],
      'bottom',
      'center'
    ),
  );
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '资源模块1', { bg: COLORS.goldenYellow, padTop: '32px', padBottom: '32px' });
  const row = {
    id: nid('s2-row'),
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '两列布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: nid('s2-col1'),
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文字' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(nid('s2-h1'), '标题', 'Transform customer engagement with deeper insights', {
            fontSize: themeRef('tokens.typography.h1'),
            fontSizePath: 'tokens.typography.h1',
            color: COLORS.lightText,
            bold: true,
          }),
          textBlock(nid('s2-body'), '正文', 'Learn how consumer goods companies can leverage data-fueled insights to meet the rising expectations of today\'s customers.', {
            color: COLORS.lightText,
          }),
          buttonBlock(nid('s2-cta'), '按钮', 'GET REPORT'),
        ],
      },
      photoFrame(nid('s2-photo'), PEXELS.block1, 'Attendees at Connections conference'),
    ],
  };
  sec.children.push(row);
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '资源模块2', { bg: COLORS.slateBlue, padTop: '32px', padBottom: '32px' });
  const row = {
    id: nid('s3-row'),
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '两列布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      photoFrame(nid('s3-photo'), PEXELS.block2, 'Attendees listening to presentation', { alignH: 'left' }),
      {
        id: nid('s3-col2'),
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右侧文字' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(nid('s3-h1'), '标题', 'See why leading CG companies choose Salesforce', {
            fontSize: themeRef('tokens.typography.h1'),
            fontSizePath: 'tokens.typography.h1',
            color: COLORS.cloudWhite,
            bold: true,
          }),
          textBlock(nid('s3-body'), '正文', 'Across the globe, consumer goods companies are choosing Salesforce to help increase sales productivity and effectiveness, respond faster to new business needs, and gain greater visibility across the value chain.', {
            color: COLORS.cloudWhite,
          }),
          buttonBlock(nid('s3-cta'), '按钮', 'GET REPORT', { bg: COLORS.cloudWhite, textColor: COLORS.slateBlue }),
        ],
      },
    ],
  };
  sec.children.push(row);
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '资源模块3', { bg: COLORS.mintGreen, padTop: '32px', padBottom: '32px' });
  const row = {
    id: nid('s4-row'),
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '两列布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: nid('s4-col1'),
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左侧文字' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(nid('s4-h1'), '标题', 'Need a guide on your Salesforce journey?', {
            fontSize: themeRef('tokens.typography.h1'),
            fontSizePath: 'tokens.typography.h1',
            color: COLORS.lightText,
            bold: true,
          }),
          textBlock(nid('s4-body'), '正文', 'Find out how Success Cloud\'s experts and services can get you where you want to go, faster.', {
            color: COLORS.lightText,
          }),
          buttonBlock(nid('s4-cta'), '按钮', 'GET E-BOOK'),
        ],
      },
      photoFrame(nid('s4-photo'), PEXELS.block3, 'Salesforce team members at booth'),
    ],
  };
  sec.children.push(row);
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, 'Keynote模块', { bg: COLORS.skyBlue, padTop: '0', padBottom: '0', pageInline: false });
  sec.children.push(
    imageContainer(
      `${P}-s6-keynote`,
      'Keynote插画',
      PEXELS.keynote,
      'Keynote illustration with Salesforce character',
      '180px',
      [
        textBlock(nid('s6-keynote-text'), '正文', 'WATCH THE KEYNOTE with your teams to get everyone inspired.', {
          color: COLORS.lightText,
          alignH: 'center',
          decoration: 'underline',
        }),
      ],
      'center',
      'center'
    ),
  );
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '页脚', { bg: COLORS.deepNavy, padTop: '24px', padBottom: '24px' });
  sec.bindings = {};
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '24px',
    right: '24px',
    bottom: '24px',
    left: '24px',
  };

  const socialRow = {
    id: nid('s6-social'),
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '社交图标' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      iconBlock(nid('s6-twitter'), ICON.twitter, COLORS.cloudWhite, '20px'),
      iconBlock(nid('s6-facebook'), ICON.facebook, COLORS.cloudWhite, '20px'),
      iconBlock(nid('s6-linkedin'), ICON.linkedin, COLORS.cloudWhite, '20px'),
      iconBlock(nid('s6-instagram'), ICON.instagram, COLORS.cloudWhite, '20px'),
    ],
  };

  const linksWrap = {
    id: nid('s6-links'),
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '页脚链接' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      textBlock(nid('s6-addr1'), '地址', 'Salesforce.com, inc. The Landmark @ One Market, Suite 300, San Francisco, CA, 94105, United States', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.cloudWhite,
      }),
      textBlock(nid('s6-addr2'), '联系方式', 'General Inquiries: 647-258-3800 | Fax: 415-901-7040 | Sales: 1-800-NO-SOFTWARE', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.cloudWhite,
      }),
      textBlock(nid('s6-copyright'), '版权', '© 2018 salesforce.com, inc. All rights reserved.', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.cloudWhite,
      }),
      textBlock(nid('s6-sent'), '收件人', 'This email was sent to hello@SmilesDavis.yeah', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.cloudWhite,
        decoration: 'underline',
      }),
      {
        id: nid('s6-legal'),
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '法律链接' },
        props: { direction: 'horizontal', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'hug',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          textBlock(nid('s6-manage'), '链接', 'Manage Preferences', {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.cloudWhite,
            decoration: 'underline',
            widthMode: 'hug',
          }),
          textBlock(nid('s6-pipe'), '分隔符', '|', {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.cloudWhite,
            widthMode: 'hug',
          }),
          textBlock(nid('s6-unsub'), '链接', 'to Unsubscribe', {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.cloudWhite,
            decoration: 'underline',
            widthMode: 'hug',
          }),
          textBlock(nid('s6-pipe2'), '分隔符', '|', {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.cloudWhite,
            widthMode: 'hug',
          }),
          textBlock(nid('s6-privacy'), '链接', 'Privacy Statement', {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.cloudWhite,
            decoration: 'underline',
            widthMode: 'hug',
          }),
        ],
      },
    ],
  };

  const poweredRow = {
    id: nid('s6-powered'),
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '技术支持' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'right', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: { mode: 'separate', top: '12px', right: '0', bottom: '0', left: '0' },
    },
    children: [
      textBlock(nid('s6-powered-text'), '文字', 'Powered by', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.cloudWhite,
        widthMode: 'hug',
      }),
      iconBlock(nid('s6-powered-icon'), ICON.salesforce, COLORS.cloudWhite, '20px'),
      textBlock(nid('s6-powered-product'), '文字', 'marketing cloud', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.cloudWhite,
        widthMode: 'hug',
      }),
    ],
  };

  sec.children.push(
    socialRow,
    linksWrap,
    poweredRow,
  );
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '后续3模板47手工还原（Salesforce）',
      description: 'Salesforce Connections 2018 后续邮件，按设计图手工还原；图源 Pexels、图标 jsDelivr。',
      tokens: {
        colors: {
          primary: COLORS.lightText,
          secondary: COLORS.cloudWhite,
          surface: COLORS.skyBlue,
        },
        spacing: { section: '20px', gap: '16px', pageInline: '24px' },
        typography: { display: '36px', h1: '22px', body: '14px', caption: '12px' },
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
  locale: 'en-US',
  root: {
    id: `${P}-root`,
    type: 'emailRoot',
    blockMeta: { blockType: 'layout.container', name: '画布根' },
    props: {
      backgroundColor: COLORS.skyBlue,
      width: '600px',
      padding: { mode: 'unified', unified: '0' },
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7()],
  },
};

const meta = {
  schemaVersion: '1.0.0',
  displayName: '后续 3 豆包测试 V1',
  description: 'Salesforce Connections 2018 后续跟进邮件，含资源下载与 keynote 入口。图源 Pexels，图标 jsDelivr。',
  source: 'human',
  createdAt: '2026-06-06T00:00:00.000Z',
  updatedAt: '2026-06-06T00:00:00.000Z',
  defaultStylePresetSelection: 'local',
  publishStatus: 'published',
};

const layoutManifest = {
  schemaVersion: '1.0.0',
  activeLayoutVariantId: 'default',
  variants: [
    {
      id: 'default',
      label: '后续 3（模板 47）',
      description: 'Salesforce Connections 2018 后续邮件 — 按设计图手工还原',
      publishStatus: 'published',
    },
  ],
};

const payload = {
  schemaVersion: '1.0.0',
  slots: {},
  values: {},
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
writeFileSync(join(EMAIL_DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
writeFileSync(join(EMAIL_DIR, 'layout-manifest.json'), `${JSON.stringify(layoutManifest, null, 2)}\n`);
writeFileSync(join(EMAIL_DIR, 'payload.json'), `${JSON.stringify(payload, null, 2)}\n`);

try {
  copyFileSync(DESIGN_SRC, DESIGN_DST);
} catch {
  console.warn('设计图未复制到 public/test-assets（源路径不可读则跳过）');
}

console.log(`Wrote ${OUT}`);
