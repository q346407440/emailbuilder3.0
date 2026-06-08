#!/usr/bin/env node
/**
 * 手工还原「精选邮件内容 3（模板 27）」Marsh Hen Mill — 模拟 pipeline 产物形态，不经 LLM。
 * 图源：Pexels；图标：jsDelivr Tabler / Simple Icons。
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'curated_email_template27_doubao_v1';
const P = 'curatede';
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/精选邮件内容 3（模板 27）.png';
const DESIGN_DST = '/Users/hengliheng/Easy-Email/public/test-assets/curated_email_template27_doubao_v1-design.png';

const PEXELS = {
  "hero-horchata": "https://images.pexels.com/photos/34477395/pexels-photo-34477395.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
  "product-rice-middlins": "https://images.pexels.com/photos/12560994/pexels-photo-12560994.jpeg?auto=compress&cs=tinysrgb&h=130",
  "recipe-southern": "https://images.pexels.com/photos/34637996/pexels-photo-34637996.jpeg?auto=compress&cs=tinysrgb&h=130",
  "recipe-signature": "https://images.pexels.com/photos/6004145/pexels-photo-6004145.jpeg?auto=compress&cs=tinysrgb&h=130",
  "recipe-under-30-mins": "https://images.pexels.com/photos/8250334/pexels-photo-8250334.jpeg?auto=compress&cs=tinysrgb&h=130",
  "recipe-easy-rice": "https://images.pexels.com/photos/34110276/pexels-photo-34110276.jpeg?auto=compress&cs=tinysrgb&h=130",
  "recipe-sweet": "https://images.pexels.com/photos/34567561/pexels-photo-34567561.jpeg?auto=compress&cs=tinysrgb&h=130",
  "recipe-savory": "https://images.pexels.com/photos/8286751/pexels-photo-8286751.jpeg?auto=compress&cs=tinysrgb&h=130",
  "recipe-johnny-cakes": "https://images.pexels.com/photos/11176258/pexels-photo-11176258.jpeg?auto=compress&cs=tinysrgb&h=130",
  "recipe-seafood": "https://images.pexels.com/photos/9058939/pexels-photo-9058939.jpeg?auto=compress&cs=tinysrgb&h=130",
};

const ICON = {
  "icon-facebook": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg",
  "icon-instagram": "https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg",
  "icon-wheat": "https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/wheat.svg",
};

const COLORS = {
  cream: '#F5F1E9',
  darkGreen: '#1D4A46',
  olive: '#A49679',
  black: '#1A1A1A',
  white: '#FFFFFF',
  red: '#E03E3E',
};

const RECIPES = [
  { id: 'southern', name: 'Southern', src: PEXELS['recipe-southern'] },
  { id: 'signature', name: 'Signature', src: PEXELS['recipe-signature'] },
  { id: 'under-30', name: 'Under 30 Mins', src: PEXELS['recipe-under-30-mins'] },
  { id: 'easy-rice', name: 'Easy Rice', src: PEXELS['recipe-easy-rice'] },
  { id: 'sweet', name: 'Sweet', src: PEXELS['recipe-sweet'] },
  { id: 'savory', name: 'Savory', src: PEXELS['recipe-savory'] },
  { id: 'johnny-cakes', name: 'Johnny Cakes', src: PEXELS['recipe-johnny-cakes'] },
  { id: 'seafood', name: 'Seafood', src: PEXELS['recipe-seafood'] },
];

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
    : { mode: 'separate', top: padTop, right: '0', bottom: padBottom, left: '0' };

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

function imageContainer(id, name, src, alt, height, overlayChildren, alignV = 'center') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: alignV },
      widthMode: 'fill',
      heightMode: 'fixed',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '8px' },
      height,
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '8px' },
      },
    },
    children: overlayChildren,
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
    bg = COLORS.white,
    textColor = COLORS.black,
    radius = '4px',
    padding = { mode: 'separate', top: '12px', right: '24px', bottom: '12px', left: '24px' },
    bold = true,
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
        padding,
        bold,
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
    bindings: themeBinding('props.buttonStyle.fontSize', 'tokens.typography.body'),
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

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '品牌头部', { bg: COLORS.white, padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s1-logo`, '品牌标题', 'MARSH HEN MILL', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      bold: true,
      alignH: 'left',
    }),
    {
      id: nid('s1-badge-row'),
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '徽章行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'space-between', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'separate', top: '16px', right: '0', bottom: '16px', left: '0' },
      },
      children: [
        textBlock(`${P}-s1-badge`, '徽章', 'How To Cook', {
          fontSize: '12px',
          bold: true,
          widthMode: 'hug',
          wrapperStyle: {
            contentAlign: { horizontal: 'left', vertical: 'top' },
            widthMode: 'hug',
            heightMode: 'hug',
            backgroundColor: '#E8E8E8',
            padding: { mode: 'separate', top: '4px', right: '8px', bottom: '4px', left: '8px' },
            borderRadius: { mode: 'unified', radius: '4px' },
          },
        }),
        textBlock(`${P}-s1-cta`, '跳转链接', 'Start Cooking', {
          color: COLORS.red,
          bold: true,
          alignH: 'right',
        }),
      ],
    },
    textBlock(`${P}-s1-title`, '页面标题', 'Horchata', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      bold: true,
      alignH: 'left',
    }),
    imageContainer(
      nid('s1-hero'),
      'Horchata 主图',
      PEXELS['hero-horchata'],
      'horchata drink with cinnamon sticks rice on wooden table',
      '320px',
      []
    ),
  );
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, 'Horchata 介绍', { bg: COLORS.darkGreen, padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s2-p1`, '正文第一段', 'Horchata has a long, delicious history. The earliest version began in Spain, where it was made from tigernuts. As the tradition traveled through Mexico and Central America, the recipe evolved into the beloved rice-based drink many know today — sweet, comforting, and blended with cinnamon and vanilla.', {
      color: COLORS.white,
    }),
    textBlock(`${P}-s2-p2`, '正文第二段', 'Each region added its own touch, but the heart of horchata remained the same: a simple, refreshing drink meant to bring people together. That\'s exactly why we love it for the holidays.', {
      color: COLORS.white,
    }),
    textBlock(`${P}-s2-p3`, '正文第三段', 'Serve it chilled at a cookie swap, warm it gently for a fireside night in, or add a festive splash of your favorite spirit for a holiday twist. However you enjoy it, this recipe brings out the very best of what heirloom grains can do.', {
      color: COLORS.white,
    }),
    textBlock(`${P}-s2-p4`, '正文第四段', 'Ready to make your own? We\'ll walk you through every step.', {
      color: COLORS.white,
    }),
    buttonBlock(`${P}-s2-cta`, '配方按钮', 'See The Festive Recipe!'),
  );
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '食材清单', { bg: COLORS.cream, padTop: '24px' });
  sec.children.push(
    {
      id: nid('s3-ingredients-card'),
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '食材卡' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'left', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: { mode: 'unified', width: '1px', style: 'dashed', color: '#CCCCCC' },
        borderRadius: { mode: 'unified', radius: '8px' },
        padding: { mode: 'separate', top: '24px', right: '24px', bottom: '24px', left: '24px' },
        backgroundColor: COLORS.white,
      },
      children: [
        textBlock(`${P}-s3-title`, '清单标题', 'Ingredients List', {
          bold: true,
          fontSize: themeRef('tokens.typography.h1'),
          fontSizePath: 'tokens.typography.h1',
        }),
        textBlock(`${P}-s3-item1`, '食材项', '☐ 1 cup uncooked Marsh Hen Mill Carolina Gold Rice Middlins', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
        }),
        textBlock(`${P}-s3-item2`, '食材项', '☐ 4 tablespoons vanilla extract', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
        }),
        textBlock(`${P}-s3-item3`, '食材项', '☐ 6 cups cold water', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
        }),
        textBlock(`${P}-s3-item4`, '食材项', '☐ 2 cinnamon stick', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
        }),
        textBlock(`${P}-s3-item5`, '食材项', '☐ 1/4 cup piloncillo (unrefined Mexican sugar)', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
        }),
        textBlock(`${P}-s3-item6`, '食材项', '☐ 1/2 cup evaporated milk', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
        }),
        textBlock(`${P}-s3-item7`, '食材项', '☐ Up to a 1/2 cup sweetened condensed milk (as needed)', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
        }),
      ],
    },
    {
      id: nid('s3-product-row'),
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '商品行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'space-between', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        padding: { mode: 'separate', top: '32px', right: '0', bottom: '0', left: '0' },
      },
      children: [
        imageContainer(
          nid('s3-product-img'),
          '商品图',
          PEXELS['product-rice-middlins'],
          'marsh hen mill carolina gold rice middlins packaging',
          '160px',
          [],
          'center'
        ),
        {
          id: nid('s3-product-info'),
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '商品信息' },
          props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
          wrapperStyle: {
            contentAlign: { horizontal: 'right', vertical: 'center' },
            widthMode: 'fill',
            heightMode: 'hug',
          },
          children: [
            textBlock(`${P}-s3-product-name`, '商品名', 'Carolina Gold Rice Middlins', {
              bold: true,
              alignH: 'right',
            }),
            buttonBlock(`${P}-s3-product-cta`, '商品按钮', 'Shop now', {
              bg: COLORS.darkGreen,
              textColor: COLORS.white,
              alignH: 'right',
            }),
          ],
        },
      ],
    },
  );
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '促销横幅', { pageInline: false, padBottom: '0' });
  sec.children.push(
    {
      id: nid('s4-banner'),
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '促销横幅' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        backgroundColor: COLORS.darkGreen,
        padding: { mode: 'separate', top: '12px', right: '24px', bottom: '12px', left: '24px' },
      },
      children: [
        textBlock(`${P}-s4-banner-1`, '横幅文本', 'GRITS', {
          color: COLORS.white,
          bold: true,
          widthMode: 'hug',
        }),
        iconBlock(`${P}-s4-icon1`, ICON['icon-wheat'], COLORS.white, '16px'),
        textBlock(`${P}-s4-banner-2`, '横幅文本', '$125 - FREE HONEY', {
          color: COLORS.white,
          bold: true,
          widthMode: 'hug',
        }),
        iconBlock(`${P}-s4-icon2`, ICON['icon-wheat'], COLORS.white, '16px'),
        textBlock(`${P}-s4-banner-3`, '横幅文本', '$250 - SKI', {
          color: COLORS.white,
          bold: true,
          widthMode: 'hug',
        }),
      ],
    },
  );
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '蜂蜜促销', { bg: COLORS.olive, padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s5-title`, '促销标题', 'Sweeten Your Horchata', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      color: COLORS.white,
      bold: true,
    }),
    textBlock(`${P}-s5-body`, '促销正文', 'Add a touch of local goodness to your Horchata recipe! We are gifting Edisto Gold Honey with orders over $125, a perfect sweet substitute for piloncillo if you don\'t have any unrefined Mexican sugar on hand.', {
      color: COLORS.white,
    }),
    buttonBlock(`${P}-s5-cta`, '蜂蜜按钮', 'Check Out Edisto Gold', {
      bg: COLORS.white,
      textColor: COLORS.black,
      alignH: 'center',
    }),
  );
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, '菜谱推荐', { bg: COLORS.cream, padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s6-title`, '推荐标题', 'Cook The Marsh Hen Way', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      bold: true,
      alignH: 'center',
    }),
    textBlock(`${P}-s6-subtitle`, '推荐副标题', 'We\'ve gathered plenty of recipes for you to explore.\nFind the one that fits what you\'re looking for!', {
      alignH: 'center',
    }),
    {
      id: nid('s6-recipe-grid'),
      type: 'grid',
      blockMeta: { blockType: 'layout.grid', name: '菜谱栅格' },
      props: { columns: 2, gap: '16px', cellWidthMode: 'auto', cellHeightMode: 'content-max' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'unified', unified: '0' },
      },
      children: RECIPES.map((recipe, idx) =>
        imageContainer(
          nid(`s6-recipe-${recipe.id}`),
          `菜谱${idx + 1}`,
          recipe.src,
          recipe.name,
          '140px',
          [
            textBlock(nid(`s6-recipe-text-${recipe.id}`), '菜谱名', recipe.name, {
              color: COLORS.white,
              bold: true,
              fontSize: themeRef('tokens.typography.h1'),
              fontSizePath: 'tokens.typography.h1',
              widthMode: 'hug',
            }),
          ],
          'center'
        )
      ),
    },
  );
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '页脚', { bg: COLORS.darkGreen, padTop: '32px', padBottom: '32px' });
  sec.children.push(
    textBlock(`${P}-s7-logo`, '品牌标题', 'MARSH HEN MILL', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      color: COLORS.white,
      bold: true,
      alignH: 'center',
    }),
    textBlock(`${P}-s7-slogan`, '品牌标语', 'STRAIGHT FROM EDISTO ISLAND', {
      color: COLORS.white,
      fontSize: themeRef('tokens.typography.caption'),
      fontSizePath: 'tokens.typography.caption',
      alignH: 'center',
    }),
    {
      id: nid('s7-social-row'),
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '社交图标行' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'hug',
        heightMode: 'hug',
        padding: { mode: 'separate', top: '24px', right: '0', bottom: '24px', left: '0' },
      },
      children: [
        iconBlock(`${P}-s7-fb`, ICON['icon-facebook'], COLORS.white, '20px'),
        iconBlock(`${P}-s7-ig`, ICON['icon-instagram'], COLORS.white, '20px'),
      ],
    },
    textBlock(`${P}-s7-tagline`, '品牌标语', 'From the Mill to Your Table', {
      color: COLORS.white,
      fontSize: themeRef('tokens.typography.caption'),
      fontSizePath: 'tokens.typography.caption',
      alignH: 'center',
    }),
    textBlock(`${P}-s7-copyright`, '版权信息', '© 2025 Marsh Hen Mill | All rights reserved.', {
      color: COLORS.white,
      fontSize: '12px',
      alignH: 'center',
    }),
    textBlock(`${P}-s7-links`, '页脚链接', 'Unsubscribe | Manage Preferences | View in Your Browser', {
      color: COLORS.white,
      fontSize: '12px',
      decoration: 'underline',
      alignH: 'center',
      wrapperStyle: {
        padding: { mode: 'separate', top: '12px', right: '0', bottom: '24px', left: '0' },
      },
    }),
    textBlock(`${P}-s7-promo`, '促销说明', 'Promo: No code is necessary, and all offers are automatically applied at checkout with orders.\nOffers are only available at marshhenmill.com.', {
      color: COLORS.white,
      fontSize: '10px',
      alignH: 'center',
    }),
  );
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '模板27手工还原（Marsh Hen Mill）',
      description: '精选邮件内容 3 设计图手工还原；图源 Pexels、图标 jsDelivr，模拟 pipeline 产物。',
      tokens: {
        colors: {
          primary: COLORS.black,
          secondary: COLORS.white,
          surface: COLORS.cream,
        },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '36px', h1: '24px', body: '14px', caption: '13px' },
        radius: { panel: '8px', cta: '4px' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7()],
  },
};

const meta = {
  schemaVersion: '1.0.0',
  displayName: '精选邮件内容 3 豆包测试 V1',
  description:
    'Horchata 食谱：品牌头部、主图介绍、食材清单、商品推荐、蜂蜜促销、菜谱网格、页脚。图源 Pexels，图标 jsDelivr。',
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
      label: '精选邮件内容 3（模板 27）',
      description: 'Marsh Hen Mill Horchata 食谱 — 按设计图手工还原',
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
