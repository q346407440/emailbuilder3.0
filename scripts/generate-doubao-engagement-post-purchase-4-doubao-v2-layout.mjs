#!/usr/bin/env node
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'engagement_post_purchase_4_doubao_v2';
const P = 'engageme';
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/购买后 4（模板 56）.png';
const DESIGN_DST = '/Users/hengliheng/Easy-Email/public/test-assets/engagement_post_purchase_4_doubao_v2-design.png';

const PEXELS = {
  "ugc-dachshund": "https://images.pexels.com/photos/8229898/pexels-photo-8229898.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc-corgi": "https://images.pexels.com/photos/8939264/pexels-photo-8939264.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc-senior-dog": "https://images.pexels.com/photos/27046439/pexels-photo-27046439.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "ugc-small-dog": "https://images.pexels.com/photos/8473264/pexels-photo-8473264.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc-goldendoodle": "https://images.pexels.com/photos/7310128/pexels-photo-7310128.jpeg?auto=compress&cs=tinysrgb&h=350",
  "ugc-two-dogs": "https://images.pexels.com/photos/16168097/pexels-photo-16168097.jpeg?auto=compress&cs=tinysrgb&h=130",
  "ugc-dog-with-turkey-food": "https://images.pexels.com/photos/15418271/pexels-photo-15418271.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {

};

const COLORS = {
  cream: '#F9F2E9',
  black: '#000000',
  white: '#FFFFFF',
  textGray: '#555555',
  yellow: '#F8D557',
  borderGray: '#E0E0E0',
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

function coverImage(id, src, alt, height, opts = {}) {
  const { radius = '12px', fit = 'cover' } = opts;
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
      borderRadius: { mode: 'unified', radius },
      height,
      backgroundImage: {
        src,
        alt,
        fit,
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius },
      },
    },
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
    alignH = 'center',
    bg = COLORS.black,
    textColor = COLORS.white,
    radius = themeRef('tokens.radius.cta'),
    radiusPath = 'tokens.radius.cta',
    bindRadius = true,
    fullWidth = true,
  } = opts;
  const bindings = {
    ...themeBinding('props.buttonStyle.fontSize', 'tokens.typography.body'),
  };
  if (bindRadius && radius?.$themeRef) {
    Object.assign(bindings, themeBinding('props.buttonStyle.borderRadius.radius', radiusPath));
  }
  return {
    id,
    type: 'button',
    blockMeta: { blockType: 'action.button', name },
    props: {
      text: label,
      link: '',
      buttonStyle: {
        widthMode: fullWidth ? 'fill' : 'hug',
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
      widthMode: fullWidth ? 'fill' : 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings,
  };
}

function dividerBlock(id, color = COLORS.borderGray) {
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
  const sec = sectionShell(`${P}-s1`, '品牌头部', { bg: COLORS.cream, padTop: '24px', padBottom: '24px' });
  sec.children.push(
    textBlock(`${P}-s1-logo`, '品牌Logo', 'SUNDAYS', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      color: themeRef('colors.primary'),
      bold: true,
    }),
  );
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '标题区', { bg: COLORS.cream });
  sec.children.push(
    textBlock(`${P}-s2-title`, '主标题', 'We get dog people', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: themeRef('colors.primary'),
      bold: true,
    }),
    textBlock(`${P}-s2-subtitle`, '副标题', 'because we ARE dog people.', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      color: themeRef('colors.primary'),
      bold: true,
    }),
  );
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '引言区', { bg: COLORS.cream });
  sec.children.push(
    textBlock(`${P}-s3-body`, '正文', 'Dog parenting is wonderful, weird, and full of "is this my life?" moments. Sundays is here with you through all of it.', {
      color: COLORS.textGray,
      colorPath: null,
    }),
  );
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, 'UGC双图区', { bg: COLORS.cream });
  const grid = {
    id: `${P}-s4-grid`,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name: '双图栅格' },
    props: { columns: 2, gap: '16px', cellWidthMode: 'auto', cellHeightMode: 'content-max' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: { mode: 'unified', unified: '0' },
    },
    children: [
      {
        id: `${P}-s4-col1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左图列' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          coverImage(`${P}-s4-img1`, PEXELS['ugc-dachshund'], 'dachshund dog with dog food package', '240px'),
          textBlock(`${P}-s4-cap1`, '图片说明', '@tupacwiththelittlelegs when his mom suggests going back to traditional kibble.', {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.textGray,
            alignH: 'left',
          }),
        ],
      },
      {
        id: `${P}-s4-col2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右图列' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          coverImage(`${P}-s4-img2`, PEXELS['ugc-corgi'], 'corgi dogs eating from bowl with dog food bag', '240px'),
          textBlock(`${P}-s4-cap2`, '图片说明', '@ourhomeonmanorlane knows patience is a virtue but MUST EAT CHICKEN RECIPE.', {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.textGray,
            alignH: 'left',
          }),
        ],
      },
    ],
  };
  sec.children.push(
    grid,
    buttonBlock(`${P}-s4-cta`, '按钮', 'Join Us On Instagram'),
  );
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '品牌理念区', { bg: COLORS.cream, padTop: '12px' });
  sec.children.push(
    textBlock(`${P}-s5-text1`, '理念正文', 'At Sundays, we take the science behind our food, the health of our dogs, and our customer\'s happiness very seriously.', {
      color: COLORS.textGray,
      colorPath: null,
    }),
    textBlock(`${P}-s5-text2`, '理念副标题', 'But that\'s about it.', {
      color: COLORS.textGray,
      colorPath: null,
      bold: true,
    }),
  );
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '大图UGC区', { bg: COLORS.cream });
  sec.children.push(
    coverImage(`${P}-s6-img`, PEXELS['ugc-senior-dog'], 'senior dog eating from bowl outdoors with dog food package', '320px'),
    textBlock(`${P}-s6-cap`, '图片说明', 'Flick Connection on YouTube talks Sundays benefits while Peanut faceplants into a bowl.', {
      fontSize: themeRef('tokens.typography.caption'),
      fontSizePath: 'tokens.typography.caption',
      color: COLORS.textGray,
      alignH: 'left',
    }),
  );
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '品牌起源区', { bg: COLORS.cream, padTop: '12px' });
  sec.children.push(
    textBlock(`${P}-s7-text1`, '起源正文', 'Sundays was started by two (super skilled) dog people, aka people who know that dogs are family, that time with our dogs is precious, and that being a dog parent can be WILD.', {
      color: COLORS.textGray,
      colorPath: null,
    }),
    textBlock(`${P}-s7-text2`, '社交理念', 'We use our social media to share fun, educational, and interesting content that embraces everything it means to be a dog parent today.', {
      color: COLORS.textGray,
      colorPath: null,
    }),
  );
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, 'UGC拼图区', { bg: COLORS.cream });
  
  const badge = {
    id: `${P}-s8-badge`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: 'IG标签' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '999px' },
      backgroundColor: COLORS.white,
      padding: { mode: 'separate', top: '8px', right: '16px', bottom: '8px', left: '16px' },
    },
    children: [
      textBlock(`${P}-s8-badge-text`, '标签文本', 'AS SEEN ON IG', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.black,
        bold: true,
        widthMode: 'hug',
      }),
    ],
  };

  const leftCol = {
    id: `${P}-s8-left`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '左列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      badge,
      coverImage(`${P}-s8-img1`, PEXELS['ugc-small-dog'], 'small fluffy dog lying on bed', '120px'),
    ],
  };

  const centerCol = {
    id: `${P}-s8-center`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '中列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      coverImage(`${P}-s8-img2`, PEXELS['ugc-goldendoodle'], 'goldendoodle dog taking food from bag with human hand', '260px'),
    ],
  };

  const rightCol = {
    id: `${P}-s8-right`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '右列' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      coverImage(`${P}-s8-img3`, PEXELS['ugc-two-dogs'], 'two dogs with turkey flavor dog food package', '120px'),
      coverImage(`${P}-s8-img4`, PEXELS['ugc-dog-with-turkey-food'], 'dog holding turkey recipe dog food package', '120px'),
    ],
  };

  const grid = {
    id: `${P}-s8-grid`,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name: '拼图栅格' },
    props: { columns: 3, gap: '12px', cellWidthMode: 'auto', cellHeightMode: 'content-max' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: { mode: 'unified', unified: '0' },
    },
    children: [leftCol, centerCol, rightCol],
  };

  const handleWrap = {
    id: `${P}-s8-handle-wrap`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '账号标签容器' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '999px' },
      backgroundColor: COLORS.yellow,
      padding: { mode: 'separate', top: '6px', right: '16px', bottom: '6px', left: '16px' },
    },
    children: [
      textBlock(`${P}-s8-handle`, '账号文本', '@sundaysfordogs', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.black,
        widthMode: 'hug',
      }),
    ],
  };

  sec.children.push(
    grid,
    handleWrap,
  );
  return sec;
}

function buildS9() {
  const sec = sectionShell(`${P}-s9`, '社群号召区', { bg: COLORS.cream, padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s9-title`, '号召标题', 'Join 30K+ of our closest friends (and their humans.)', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: themeRef('colors.primary'),
      bold: true,
    }),
    textBlock(`${P}-s9-body`, '号召正文', 'Dog pics AND you\'ll be the first to know about giveaways, promotions, and new product releases? Right this way!', {
      color: COLORS.textGray,
      colorPath: null,
    }),
  );
  return sec;
}

function buildS10() {
  const sec = sectionShell(`${P}-s10`, '社交按钮区', { bg: COLORS.cream });
  sec.children.push(
    buttonBlock(`${P}-s10-cta1`, 'Facebook按钮', 'Follow Us On Facebook'),
    buttonBlock(`${P}-s10-cta2`, 'TikTok按钮', 'Don\'t Miss Our TikTok'),
  );
  return sec;
}

function buildS11() {
  const sec = sectionShell(`${P}-s11`, '页脚区', { bg: COLORS.white, padTop: '24px' });
  
  const logo = textBlock(`${P}-s11-logo`, '页脚Logo', 'SUNDAYS', {
    fontSize: themeRef('tokens.typography.h1'),
    fontSizePath: 'tokens.typography.h1',
    color: themeRef('colors.primary'),
    bold: true,
  });

  const prefBox = {
    id: `${P}-s11-pref-box`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '偏好设置框' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.borderGray },
      borderRadius: { mode: 'unified', radius: '12px' },
      padding: { mode: 'separate', top: '20px', right: '16px', bottom: '20px', left: '16px' },
      backgroundColor: COLORS.cream,
    },
    children: [
      textBlock(`${P}-s11-pref-title`, '偏好标题', 'COMMUNICATION IS KEY', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.textGray,
        bold: true,
      }),
      textBlock(`${P}-s11-pref-text`, '偏好文本', 'Get only the emails your want and none you don\'t. ', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.textGray,
      }),
      textBlock(`${P}-s11-pref-link`, '偏好链接', 'Manage Preferences', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.black,
        decoration: 'underline',
      }),
    ],
  };

  const links = {
    id: `${P}-s11-links`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '页脚链接' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: { mode: 'separate', top: '24px', right: '0', bottom: '0', left: '0' },
    },
    children: [
      textBlock(`${P}-s11-link1`, '链接1', 'Ingredients', { fontSize: themeRef('tokens.typography.caption'), fontSizePath: 'tokens.typography.caption', color: COLORS.black, widthMode: 'hug' }),
      textBlock(`${P}-s11-link2`, '链接2', 'Free Sample', { fontSize: themeRef('tokens.typography.caption'), fontSizePath: 'tokens.typography.caption', color: COLORS.black, widthMode: 'hug' }),
      textBlock(`${P}-s11-link3`, '链接3', 'FAQ', { fontSize: themeRef('tokens.typography.caption'), fontSizePath: 'tokens.typography.caption', color: COLORS.black, widthMode: 'hug' }),
      textBlock(`${P}-s11-link4`, '链接4', 'Compare', { fontSize: themeRef('tokens.typography.caption'), fontSizePath: 'tokens.typography.caption', color: COLORS.black, widthMode: 'hug' }),
    ],
  };

  const bottom = {
    id: `${P}-s11-bottom`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '页脚底部' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'space-between', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: { mode: 'separate', top: '24px', right: '0', bottom: '0', left: '0' },
    },
    children: [
      textBlock(`${P}-s11-copyright`, '版权信息', '675 Alpha Dr. Cleveland, OH 44143\nUpdate your email preferences or unsubscribe\n\nYou received this email because you either purchased a product or provided your email address to sundaysfordogs.com', {
        fontSize: '11px',
        color: COLORS.textGray,
        alignH: 'left',
      }),
      textBlock(`${P}-s11-browser`, '浏览器查看', 'View in Browser', {
        fontSize: '11px',
        color: COLORS.textGray,
        decoration: 'underline',
        alignH: 'right',
      }),
    ],
  };

  sec.children.push(logo, prefBox, links, bottom);
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '购买后 4 豆包测试 v2',
      description: 'Sundays狗粮社交邀请邮件模板，按设计图手工还原',
      tokens: {
        colors: {
          primary: COLORS.black,
          secondary: COLORS.white,
          surface: COLORS.cream,
        },
        spacing: { section: '20px', gap: '16px', pageInline: '24px' },
        typography: { display: '40px', h1: '20px', body: '15px', caption: '12px' },
        radius: { panel: '12px', cta: '8px' },
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
      backgroundColor: COLORS.cream,
      width: '600px',
      padding: { mode: 'unified', unified: '0' },
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8(), buildS9(), buildS10(), buildS11()],
  },
};

const meta = {
  schemaVersion: '1.0.0',
  displayName: '购买后 4 豆包测试 v2',
  description: 'Sundays狗粮社交邀请邮件，包含UGC展示、品牌理念、社交关注按钮。图源Pexels，按设计图手工还原。',
  source: 'human',
  createdAt: '2026-06-05T00:00:00.000Z',
  updatedAt: '2026-06-05T00:00:00.000Z',
  defaultStylePresetSelection: 'local',
  publishStatus: 'published',
};

const layoutManifest = {
  schemaVersion: '1.0.0',
  activeLayoutVariantId: 'default',
  variants: [
    {
      id: 'default',
      label: '默认版式',
      description: 'Sundays狗粮社交邀请邮件标准版式',
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
