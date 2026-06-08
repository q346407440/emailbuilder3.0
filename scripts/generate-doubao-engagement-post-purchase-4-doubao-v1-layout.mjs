#!/usr/bin/env node
/**
 * 手工还原「购买后 4 豆包测试 v1」Sundays for Dogs — 模拟 pipeline 产物形态，不经 LLM。
 * 图源：Pexels；图标：jsDelivr Simple Icons。
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'engagement_post_purchase_4_doubao_v1';
const P = 'engageme';
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/购买后 4（模板 56）.png';
const DESIGN_DST = '/Users/hengliheng/Easy-Email/public/test-assets/engagement_post_purchase_4_doubao_v1-design.png';

const PEXELS = {
  "testimonial_doxie": "https://images.pexels.com/photos/8229898/pexels-photo-8229898.jpeg?auto=compress&cs=tinysrgb&h=130",
  "testimonial_corgi": "https://images.pexels.com/photos/8939264/pexels-photo-8939264.jpeg?auto=compress&cs=tinysrgb&h=130",
  "testimonial_senior_dog": "https://images.pexels.com/photos/27046439/pexels-photo-27046439.jpeg?auto=compress&cs=tinysrgb&h=350",
  "testimonial_small_dog_bed": "https://images.pexels.com/photos/8473264/pexels-photo-8473264.jpeg?auto=compress&cs=tinysrgb&h=130",
  "testimonial_goldendoodle": "https://images.pexels.com/photos/19982071/pexels-photo-19982071.jpeg?auto=compress&cs=tinysrgb&h=130",
  "testimonial_two_dogs": "https://images.pexels.com/photos/5732438/pexels-photo-5732438.jpeg?auto=compress&cs=tinysrgb&h=130",
  "testimonial_dog_turkey_recipe": "https://images.pexels.com/photos/15418271/pexels-photo-15418271.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
  "facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "tiktok": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/tiktok.svg",
};

const COLORS = {
  beige: '#F9F1E7',
  black: '#000000',
  textGray: '#4A4A4A',
  white: '#FFFFFF',
  borderGray: '#E0D8CF',
  buttonYellow: '#F9D342',
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

function coverImage(id, src, alt, opts = {}) {
  const { height = 'auto', borderRadius = '8px' } = opts;
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '配图' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: height === 'auto' ? 'hug' : 'fixed',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: borderRadius },
      height: height === 'auto' ? undefined : height,
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: borderRadius },
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
    italic = false,
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
      italic,
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
    bindings: {
      ...bindings,
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
  const sec = sectionShell(`${P}-s1`, '品牌头部', { bg: COLORS.beige, padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s1-logo`, '品牌标识', 'SUNDAYS', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: themeRef('colors.primary'),
      bold: false,
    }),
    {
      id: `${P}-s1-inner`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '标题区' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'unified', unified: '0' },
      },
      bindings: themeBinding('props.gap', 'tokens.spacing.gap'),
      children: [
        textBlock(`${P}-s1-h1`, '主标题', 'We get\ndog people', {
          fontSize: themeRef('tokens.typography.h1'),
          fontSizePath: 'tokens.typography.h1',
          color: themeRef('colors.primary'),
          bold: true,
        }),
        textBlock(`${P}-s1-subtitle`, '副标题', 'because we ARE dog people.', {
          fontSize: themeRef('tokens.typography.h2'),
          fontSizePath: 'tokens.typography.h2',
          color: themeRef('colors.primary'),
          bold: true,
        }),
        textBlock(
          `${P}-s1-body`,
          '正文',
          'Dog parenting is wonderful, weird, and full of "is this life?" moments. Sundays is here with you through all of it.',
          {
            fontSize: themeRef('tokens.typography.body'),
            fontSizePath: 'tokens.typography.body',
            color: COLORS.textGray,
          }
        ),
        {
          id: `${P}-s1-grid`,
          type: 'grid',
          blockMeta: { blockType: 'layout.grid', name: '双图推荐栅格' },
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
              id: `${P}-s1-col1`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '左侧推荐' },
              props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
              wrapperStyle: {
                contentAlign: { horizontal: 'center', vertical: 'top' },
                widthMode: 'fill',
                heightMode: 'hug',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '0' },
              },
              children: [
                coverImage(`${P}-s1-img1`, PEXELS.testimonial_doxie, 'Dachshund with Sundays dog food'),
                textBlock(`${P}-s1-cap1`, '推荐文案', '@tupacwiththelittlelegs when his mom suggests going back to traditional kibble.', {
                  fontSize: themeRef('tokens.typography.caption'),
                  fontSizePath: 'tokens.typography.caption',
                  color: COLORS.textGray,
                  alignH: 'left',
                }),
              ],
            },
            {
              id: `${P}-s1-col2`,
              type: 'layout',
              blockMeta: { blockType: 'layout.container', name: '右侧推荐' },
              props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
              wrapperStyle: {
                contentAlign: { horizontal: 'center', vertical: 'top' },
                widthMode: 'fill',
                heightMode: 'hug',
                border: borderNone(),
                borderRadius: { mode: 'unified', radius: '0' },
              },
              children: [
                coverImage(`${P}-s1-img2`, PEXELS.testimonial_corgi, 'Corgi eating Sundays dog food'),
                textBlock(`${P}-s1-cap2`, '推荐文案', '@ourhomeonmanorlane knows patience is a virtue but MUST EAT CHICKEN RECIPE.', {
                  fontSize: themeRef('tokens.typography.caption'),
                  fontSizePath: 'tokens.typography.caption',
                  color: COLORS.textGray,
                  alignH: 'left',
                }),
              ],
            },
          ],
        },
        buttonBlock(`${P}-s1-cta`, 'Instagram 按钮', 'Join Us On Instagram'),
        textBlock(
          `${P}-s1-note`,
          '正文',
          'At Sundays, we take the science behind our food, the health of our dogs, and our customer\'s happiness very seriously.\n\nBut that\'s about it.',
          {
            fontSize: themeRef('tokens.typography.body'),
            fontSizePath: 'tokens.typography.body',
            color: COLORS.textGray,
          }
        ),
      ],
    },
  );
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '大型推荐区', { bg: COLORS.beige, padTop: '0' });
  sec.children.push(
    {
      id: `${P}-s2-inner`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '推荐内容' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'unified', unified: '0' },
      },
      children: [
        coverImage(`${P}-s2-img`, PEXELS.testimonial_senior_dog, 'Senior dog eating Sundays dog food outdoors'),
        textBlock(`${P}-s2-cap`, '推荐文案', 'Flick Connection on YouTube talks Sundays benefits while Peanut faceplants into a bowl.', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          alignH: 'left',
        }),
      ],
    },
    {
      id: `${P}-s2-text`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '品牌介绍' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'separate', top: '20px', right: '0', bottom: '0', left: '0' },
      },
      children: [
        textBlock(
          `${P}-s2-body1`,
          '正文',
          'Sundays was started by two (super skilled) dog people, aka people who know that dogs are family, that time with our dogs is precious, and that being a dog parent can be WILD.',
          {
            fontSize: themeRef('tokens.typography.body'),
            fontSizePath: 'tokens.typography.body',
            color: COLORS.textGray,
          }
        ),
        textBlock(
          `${P}-s2-body2`,
          '正文',
          'We use our social media to share fun, educational, and interesting content that embraces everything it means to be a dog parent today.',
          {
            fontSize: themeRef('tokens.typography.body'),
            fontSizePath: 'tokens.typography.body',
            color: COLORS.textGray,
          }
        ),
      ],
    },
  );
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '多图推荐区', { bg: COLORS.beige, padTop: '24px' });
  sec.children.push(
    {
      id: `${P}-s3-grid`,
      type: 'grid',
      blockMeta: { blockType: 'layout.grid', name: '三列推荐栅格' },
      props: { columns: 3, gap: '12px', cellWidthMode: 'auto', cellHeightMode: 'content-max' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'unified', unified: '0' },
      },
      children: [
        coverImage(`${P}-s3-img1`, PEXELS.testimonial_small_dog_bed, 'Small dog lying in bed'),
        coverImage(`${P}-s3-img2`, PEXELS.testimonial_goldendoodle, 'Goldendoodle taking food from bag'),
        {
          id: `${P}-s3-col3`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '右侧双图' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'top' },
            widthMode: 'fill',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
          },
          children: [
            coverImage(`${P}-s3-img3`, PEXELS.testimonial_two_dogs, 'Two small dogs with dog food package'),
            coverImage(`${P}-s3-img4`, PEXELS.testimonial_dog_turkey_recipe, 'Dog with turkey recipe dog food package'),
          ],
        },
      ],
    },
    {
      id: `${P}-s3-tag`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '标签' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'hug',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '24px' },
        backgroundColor: COLORS.buttonYellow,
        padding: { mode: 'separate', top: '8px', right: '16px', bottom: '8px', left: '16px' },
        margin: { mode: 'separate', top: '16px', right: '0', bottom: '24px', left: '0' },
      },
      children: [
        textBlock(`${P}-s3-tag-text`, '标签文字', '@sundaysfordogs', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.black,
          bold: true,
        }),
      ],
    },
    {
      id: `${P}-s3-text`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '社交号召' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'unified', unified: '0' },
      },
      children: [
        textBlock(`${P}-s3-h2`, '主标题', 'Join 30K+ of our closest\nfriends (and their\nhumans.)', {
          fontSize: themeRef('tokens.typography.h1'),
          fontSizePath: 'tokens.typography.h1',
          color: themeRef('colors.primary'),
          bold: true,
        }),
        textBlock(
          `${P}-s3-body`,
          '正文',
          'Dog pics AND you\'ll be the first to know about giveaways, promotions, and new product releases? Right this way!',
          {
            fontSize: themeRef('tokens.typography.body'),
            fontSizePath: 'tokens.typography.body',
            color: COLORS.textGray,
          }
        ),
        buttonBlock(`${P}-s3-cta1`, 'Facebook 按钮', 'Follow Us On Facebook'),
        {
          id: `${P}-s3-cta2-wrap`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: 'TikTok 按钮容器' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
          wrapperStyle: {
            contentAlign: { horizontal: 'center', vertical: 'top' },
            widthMode: 'fill',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '0' },
            padding: { mode: 'separate', top: '12px', right: '0', bottom: '0', left: '0' },
          },
          children: [
            buttonBlock(`${P}-s3-cta2`, 'TikTok 按钮', 'Don\'t Miss Our TikTok'),
          ],
        },
      ],
    },
  );
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '页脚', { bg: COLORS.white, padTop: '32px', padBottom: '32px' });
  sec.children.push(
    textBlock(`${P}-s4-logo`, '品牌标识', 'SUNDAYS', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: themeRef('colors.primary'),
      bold: false,
    }),
    {
      id: `${P}-s4-preferences`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '偏好设置区' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: { mode: 'unified', width: '1px', style: 'solid', color: COLORS.borderGray },
        borderRadius: { mode: 'unified', radius: '8px' },
        padding: { mode: 'separate', top: '16px', right: '24px', bottom: '16px', left: '24px' },
        margin: { mode: 'separate', top: '24px', right: '0', bottom: '24px', left: '0' },
      },
      children: [
        textBlock(`${P}-s4-pref-title`, '偏好标题', 'COMMUNICATION IS KEY', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          bold: true,
        }),
        textBlock(
          `${P}-s4-pref-body`,
          '偏好正文',
          'Get only the emails your want and none\nyou don\'t. ',
          {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.textGray,
          }
        ),
        textBlock(`${P}-s4-pref-link`, '偏好链接', 'Manage Preferences', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          decoration: 'underline',
        }),
      ],
    },
    {
      id: `${P}-s4-links`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '页脚链接' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'hug',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'unified', unified: '0' },
      },
      children: [
        textBlock(`${P}-s4-link1`, '链接', 'Ingredients', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          widthMode: 'hug',
        }),
        textBlock(`${P}-s4-link2`, '分隔符', '|', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          widthMode: 'hug',
        }),
        textBlock(`${P}-s4-link3`, '链接', 'Free Sample', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          widthMode: 'hug',
        }),
        textBlock(`${P}-s4-link4`, '分隔符', '|', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          widthMode: 'hug',
        }),
        textBlock(`${P}-s4-link5`, '链接', 'FAQ', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          widthMode: 'hug',
        }),
        textBlock(`${P}-s4-link6`, '分隔符', '|', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          widthMode: 'hug',
        }),
        textBlock(`${P}-s4-link7`, '链接', 'Compare', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          widthMode: 'hug',
        }),
      ],
    },
    dividerBlock(`${P}-s4-div`),
    {
      id: `${P}-s4-bottom`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '底部信息' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'space-between', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'separate', top: '16px', right: '0', bottom: '0', left: '0' },
      },
      children: [
        textBlock(`${P}-s4-address`, '地址', '675 Alpha Dr. Cleveland, OH 44143\nUpdate your email preferences or unsubscribe', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          alignH: 'left',
        }),
        textBlock(`${P}-s4-browser`, '浏览器打开', 'View in Browser', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.textGray,
          decoration: 'underline',
          alignH: 'right',
        }),
      ],
    },
    textBlock(
      `${P}-s4-legal`,
      '法律声明',
      'You received this email because you either purchased a product or provided your email address to sundaysfordogs.com',
      {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.textGray,
        alignH: 'left',
      }
    ),
  );
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '购买后 4 豆包测试 v1（Sundays for Dogs）',
      description: 'Sundays 狗粮社交号召邮件，按设计图手工还原；图源 Pexels、图标 jsDelivr，模拟 pipeline 产物。',
      tokens: {
        colors: {
          primary: COLORS.black,
          secondary: COLORS.white,
          surface: COLORS.beige,
        },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '24px', h1: '36px', h2: '18px', body: '15px', caption: '12px' },
        radius: { panel: '8px', cta: '8px' },
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
      backgroundColor: COLORS.beige,
      width: '600px',
      padding: { mode: 'unified', unified: '0' },
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4()],
  },
};

const meta = {
  schemaVersion: '1.0.0',
  displayName: '购买后 4 豆包测试 v1',
  description:
    'Sundays 狗粮社交号召邮件：米色背景、宠物推荐图、社媒按钮、页脚链接。图源 Pexels，图标 jsDelivr。',
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
      label: '购买后 4 豆包测试 v1',
      description: 'Sundays for Dogs 社交推广邮件 — 按设计图手工还原',
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
