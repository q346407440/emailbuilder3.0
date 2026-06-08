#!/usr/bin/env node
/**
 * 手工还原「购买后 4 豆包测试 V3」Sundays 狗粮邮件 — 模拟 pipeline 产物形态，不经 LLM。
 * 图源：Pexels；图标：jsDelivr Tabler / Simple Icons。
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'engagement_post_purchase_4_doubao_v3';
const P = 'engageme';
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/购买后 4（模板 56）.png';
const DESIGN_DST = '/Users/hengliheng/Easy-Email/public/test-assets/engagement_post_purchase_4_doubao_v3-design.png';

const PEXELS = {
  "heroDog1": "https://images.pexels.com/photos/8229898/pexels-photo-8229898.jpeg?auto=compress&cs=tinysrgb&h=130",
  "heroDog2": "https://images.pexels.com/photos/8500893/pexels-photo-8500893.jpeg?auto=compress&cs=tinysrgb&h=130",
  "testimonialDog": "https://images.pexels.com/photos/27046439/pexels-photo-27046439.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "igCollageLeft": "https://images.pexels.com/photos/8473264/pexels-photo-8473264.jpeg?auto=compress&cs=tinysrgb&h=130",
  "igCollageCenter": "https://images.pexels.com/photos/17790750/pexels-photo-17790750.jpeg?auto=compress&cs=tinysrgb&h=130",
  "igCollageRightTop": "https://images.pexels.com/photos/16168097/pexels-photo-16168097.jpeg?auto=compress&cs=tinysrgb&h=130",
  "igCollageRightBottom": "https://images.pexels.com/photos/14616957/pexels-photo-14616957.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {

};

const COLORS = {
  cream: '#F9F1E7',
  black: '#000000',
  white: '#FFFFFF',
  yellow: '#F5D36D',
  lightBeige: '#F5E9D9',
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
    : { mode: 'separate', top: '0', right: '0', bottom: padBottom === '0' ? '0' : '20px', left: '0' };

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

function imageContainer(id, name, src, alt, height, overlayChildren, alignV = 'bottom', alignH = 'center') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'fixed',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '12px' },
      height,
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '12px' },
      },
    },
    children: overlayChildren,
  };
}

function quoteOverlay(id, quoteText) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '图内证言' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: COLORS.white,
      padding: { mode: 'separate', top: '8px', right: '8px', bottom: '8px', left: '8px' },
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '6px' },
    },
    children: [textBlock(`${id}-t`, '证言', quoteText, { alignH: 'left', widthMode: 'fill', fontSize: '12px' })],
  };
}

function badgeOverlay(id, text) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '圆形徽章' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      width: '80px',
      heightMode: 'fixed',
      height: '80px',
      backgroundColor: COLORS.white,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '999px' },
    },
    children: [
      textBlock(`${id}-t1`, '徽章行1', 'AS SEEN', { alignH: 'center', fontSize: '10px', bold: true, widthMode: 'hug' }),
      textBlock(`${id}-t2`, '徽章行2', 'ON IG', { alignH: 'center', fontSize: '10px', bold: true, widthMode: 'hug' }),
    ],
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
    widthMode = 'fill',
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
        widthMode,
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
      widthMode: widthMode === 'fill' ? 'fill' : 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings,
  };
}

function dividerBlock(id, color = COLORS.black) {
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
  const sec = sectionShell(`${P}-s1`, '品牌头部', { bg: COLORS.cream, padTop: '24px', padBottom: '16px' });
  sec.children.push(
    textBlock(`${P}-s1-logo`, '品牌名', 'SUNDAYS', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      color: themeRef('colors.primary'),
      bold: true,
    }),
  );
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '主标题区', { bg: COLORS.cream, padBottom: '16px' });
  sec.children.push(
    textBlock(`${P}-s2-h1`, '大标题', 'We get\ndog people', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: themeRef('colors.primary'),
      bold: true,
    }),
    textBlock(`${P}-s2-sub`, '副标题', 'because we ARE dog people.', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      color: themeRef('colors.primary'),
    }),
  );
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '首图双栏区', { bg: COLORS.cream, padBottom: '24px' });
  sec.children.push(
    textBlock(`${P}-s3-intro`, '介绍文字', 'Dog parenting is wonderful, weird, and full of "is this my life?" moments. Sundays is here with you through all of it.', {
      fontSize: themeRef('tokens.typography.body'),
      color: themeRef('colors.primary'),
    }),
    {
      id: `${P}-s3-grid`,
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
          id: `${P}-s3-col1`,
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
            imageContainer(`${P}-s3-img1`, '左图', PEXELS.heroDog1, 'Dachshund with dog food', '180px', [
              quoteOverlay(`${P}-s3-quote1`, 'His digestion is amazing\nsince switching to Sundays')
            ], 'bottom'),
            textBlock(`${P}-s3-cap1`, '图注', '@tupacwiththelittlelegs when his mom\nsuggests going back to traditional kibble.', {
              fontSize: themeRef('tokens.typography.caption'),
              fontSizePath: 'tokens.typography.caption',
              color: themeRef('colors.primary'),
              alignH: 'left',
            }),
          ],
        },
        {
          id: `${P}-s3-col2`,
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
            imageContainer(`${P}-s3-img2`, '右图', PEXELS.heroDog2, 'Two corgis eating food', '180px', [
              quoteOverlay(`${P}-s3-quote2`, 'No additives, just\nhuman-grade ingredients')
            ], 'bottom'),
            textBlock(`${P}-s3-cap2`, '图注', '@ourhomeonmanorlane knows patience is\na virtue but MUST EAT CHICKEN RECIPE.', {
              fontSize: themeRef('tokens.typography.caption'),
              fontSizePath: 'tokens.typography.caption',
              color: themeRef('colors.primary'),
              alignH: 'left',
            }),
          ],
        },
      ],
    },
  );
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, 'Instagram CTA 区', { bg: COLORS.cream, padBottom: '24px' });
  sec.children.push(
    buttonBlock(`${P}-s4-cta`, '按钮', 'Join Us On Instagram', {
      radius: '8px',
      bindRadius: false,
    }),
  );
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '品牌理念区', { bg: COLORS.cream, padBottom: '24px' });
  sec.children.push(
    textBlock(`${P}-s5-text1`, '理念文字1', 'At Sundays, we take the science behind our food, the health\nof our dogs, and our customer\'s happiness very seriously.', {
      fontSize: themeRef('tokens.typography.body'),
      color: themeRef('colors.primary'),
    }),
    textBlock(`${P}-s5-text2`, '理念文字2', 'But that\'s about it.', {
      fontSize: themeRef('tokens.typography.body'),
      color: themeRef('colors.primary'),
    }),
  );
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '证言大图区', { bg: COLORS.cream, padBottom: '24px' });
  sec.children.push(
    imageContainer(`${P}-s6-img`, '证言大图', PEXELS.testimonialDog, 'Senior dog eating food outdoors', '220px', [
      quoteOverlay(`${P}-s6-quote`, 'She can eat and digest it\nwell and clearly likes the taste!')
    ], 'top'),
    textBlock(`${P}-s6-cap`, '图注', 'Flick Connection on YouTube talks Sundays benefits while Peanut faceplants into a bowl.', {
      fontSize: themeRef('tokens.typography.caption'),
      fontSizePath: 'tokens.typography.caption',
      color: themeRef('colors.primary'),
      alignH: 'left',
    }),
  );
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '品牌故事区', { bg: COLORS.cream, padBottom: '24px' });
  sec.children.push(
    textBlock(`${P}-s7-text1`, '故事文字1', 'Sundays was started by two (super skilled) dog people, aka\npeople who know that dogs are family, that time with our dogs\nis precious, and that being a dog parent can be WILD.', {
      fontSize: themeRef('tokens.typography.body'),
      color: themeRef('colors.primary'),
    }),
    textBlock(`${P}-s7-text2`, '故事文字2', 'We use our social media to share fun, educational,\nand interesting content that embraces everything it\nmeans to be a dog parent today.', {
      fontSize: themeRef('tokens.typography.body'),
      color: themeRef('colors.primary'),
    }),
  );
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, 'Instagram 拼贴区', { bg: COLORS.cream, padBottom: '24px' });
  sec.children.push({
    id: `${P}-s8-grid`,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name: '拼贴栅格' },
    props: { columns: 3, gap: '8px', cellWidthMode: 'auto', cellHeightMode: 'content-max' },
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
        id: `${P}-s8-col1`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '左列' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'bottom' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          badgeOverlay(`${P}-s8-badge`, 'IG 徽章'),
          imageContainer(`${P}-s8-img1`, '左图', PEXELS.igCollageLeft, 'Small fluffy dog on bed', '150px', [], 'bottom'),
        ],
      },
      {
        id: `${P}-s8-col2`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '中列' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          imageContainer(`${P}-s8-img2`, '中图', PEXELS.igCollageCenter, 'Golden doodle taking food', '250px', [
            quoteOverlay(`${P}-s8-quote`, 'I\'m helping, I\'m helping,\nthis is me helping.')
          ], 'bottom'),
        ],
      },
      {
        id: `${P}-s8-col3`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '右列' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '0' },
        },
        children: [
          imageContainer(`${P}-s8-img3`, '右上', PEXELS.igCollageRightTop, 'Two dogs with package', '120px', [
            quoteOverlay(`${P}-s8-quote1`, 'Alika & Kiki highly\nrecommend trying\nthe Turkey recipe.')
          ], 'bottom'),
          imageContainer(`${P}-s8-img4`, '右下', PEXELS.igCollageRightBottom, 'Dog next to food bag', '120px', [], 'bottom'),
        ],
      },
    ],
  });
  return sec;
}

function buildS9() {
  const sec = sectionShell(`${P}-s9`, 'IG 标签区', { bg: COLORS.cream, padBottom: '24px' });
  sec.children.push({
    id: `${P}-s9-badge`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '标签容器' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'hug',
      heightMode: 'hug',
      backgroundColor: COLORS.yellow,
      padding: { mode: 'separate', top: '6px', right: '16px', bottom: '6px', left: '16px' },
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '20px' },
    },
    children: [
      textBlock(`${P}-s9-text`, '标签文字', '@sundaysfordogs', {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: themeRef('colors.primary'),
        bold: true,
        widthMode: 'hug',
      }),
    ],
  });
  return sec;
}

function buildS10() {
  const sec = sectionShell(`${P}-s10`, '社区号召区', { bg: COLORS.cream, padBottom: '24px' });
  sec.children.push(
    textBlock(`${P}-s10-h1`, '号召标题', 'Join 30K+ of our closest\nfriends (and their\nhumans.)', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: themeRef('colors.primary'),
      bold: true,
    }),
    textBlock(`${P}-s10-body`, '号召正文', 'Dog pics AND you\'ll be the first to know about giveaways,\npromotions, and new product releases? Right this way!', {
      fontSize: themeRef('tokens.typography.body'),
      color: themeRef('colors.primary'),
    }),
    buttonBlock(`${P}-s10-cta1`, 'FB 按钮', 'Follow Us On Facebook', {
      radius: '8px',
      bindRadius: false,
    }),
    {
      id: `${P}-s10-spacer`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '间距' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'fixed',
        height: '12px',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        backgroundColor: 'transparent',
      },
      children: [],
    },
    buttonBlock(`${P}-s10-cta2`, 'TikTok 按钮', 'Don\'t Miss Our TikTok', {
      radius: '8px',
      bindRadius: false,
    }),
  );
  return sec;
}

function buildS11() {
  const sec = sectionShell(`${P}-s11`, '页脚区', { bg: COLORS.lightBeige, padTop: '24px', padBottom: '24px' });
  sec.children.push(
    textBlock(`${P}-s11-logo`, '页脚品牌名', 'SUNDAYS', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      color: themeRef('colors.primary'),
      bold: true,
    }),
    {
      id: `${P}-s11-prefs`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '偏好设置框' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.black },
        borderRadius: { mode: 'unified', radius: '8px' },
        padding: { mode: 'separate', top: '16px', right: '16px', bottom: '16px', left: '16px' },
        backgroundColor: COLORS.lightBeige,
      },
      children: [
        textBlock(`${P}-s11-prefs-title`, '偏好标题', 'COMMUNICATION IS KEY', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: themeRef('colors.primary'),
        }),
        textBlock(`${P}-s11-prefs-text`, '偏好文字', 'Get only the emails your want and none\nyou don\'t. Manage Preferences', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: themeRef('colors.primary'),
          decoration: 'underline',
        }),
      ],
    },
    {
      id: `${P}-s11-spacer`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '间距' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'fixed',
        height: '16px',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        backgroundColor: 'transparent',
      },
      children: [],
    },
    {
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
      },
      children: [
        textBlock(`${P}-s11-link1`, '链接1', 'Ingredients', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: themeRef('colors.primary'),
          decoration: 'underline',
          widthMode: 'hug',
        }),
        textBlock(`${P}-s11-link2`, '链接2', 'Free Sample', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: themeRef('colors.primary'),
          decoration: 'underline',
          widthMode: 'hug',
        }),
        textBlock(`${P}-s11-link3`, '链接3', 'FAQ', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: themeRef('colors.primary'),
          decoration: 'underline',
          widthMode: 'hug',
        }),
        textBlock(`${P}-s11-link4`, '链接4', 'Compare', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: themeRef('colors.primary'),
          decoration: 'underline',
          widthMode: 'hug',
        }),
      ],
    },
    {
      id: `${P}-s11-spacer2`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '间距' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'fixed',
        height: '16px',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        backgroundColor: 'transparent',
      },
      children: [],
    },
    {
      id: `${P}-s11-bottom`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '底部文字' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '4px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
      },
      children: [
        {
          id: `${P}-s11-bottom-row`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '底部行' },
          props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
          wrapperStyle: {
            contentAlign: { horizontal: 'space-between', vertical: 'top' },
            widthMode: 'fill',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            textBlock(`${P}-s11-addr`, '地址', '675 Alpha Dr. Cleveland, OH 44143', {
              fontSize: '10px',
              color: themeRef('colors.primary'),
              alignH: 'left',
              widthMode: 'hug',
            }),
            textBlock(`${P}-s11-browser`, '浏览器查看', 'View In Browser', {
              fontSize: '10px',
              color: themeRef('colors.primary'),
              alignH: 'right',
              decoration: 'underline',
              widthMode: 'hug',
            }),
          ],
        },
        textBlock(`${P}-s11-unsub`, '退订', 'Update your email preferences or unsubscribe', {
          fontSize: '10px',
          color: themeRef('colors.primary'),
          alignH: 'left',
          decoration: 'underline',
        }),
        textBlock(`${P}-s11-legal`, '法律文字', 'You received this email because you either purchased a product\nor provided your email address to sundaysfordogs.com', {
          fontSize: '10px',
          color: themeRef('colors.primary'),
          alignH: 'left',
        }),
      ],
    },
  );
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '购买后 4 豆包测试 V3（Sundays）',
      description: 'Sundays 狗粮购买后邮件设计图手工还原；图源 Pexels，图标 jsDelivr，模拟 pipeline 产物。',
      tokens: {
        colors: {
          primary: COLORS.black,
          secondary: COLORS.white,
          surface: COLORS.cream,
        },
        spacing: { section: '20px', gap: '16px', pageInline: '24px' },
        typography: { display: '42px', h1: '20px', body: '14px', caption: '12px' },
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
  locale: 'en-US',
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
  displayName: '购买后 4 豆包测试 V3',
  description:
    'Sundays 狗粮购买后邮件：品牌标语、双栏UGC图、证言大图、IG拼贴、社媒号召与页脚。图源 Pexels，图标 jsDelivr。',
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
      label: '购买后 4 豆包测试 V3',
      description: 'Sundays 狗粮购买后邮件 — 按设计图手工还原',
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
