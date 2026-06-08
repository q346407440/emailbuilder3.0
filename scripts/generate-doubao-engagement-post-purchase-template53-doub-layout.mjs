#!/usr/bin/env node
/**
 * 手工还原「购买后 1（模板 53）」IMBŌDHI — 豆包手工还原版。
 * 图源：Pexels；图标：jsDelivr Tabler / Simple Icons。
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'engagement_post_purchase_template53_doubao';
const P = 'engageme';
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/购买后 1（模板 53）.png';
const DESIGN_DST = '/Users/hengliheng/Easy-Email/public/test-assets/engagement_post_purchase_template53_doubao-design.png';

const PEXELS = {
  hero: 'https://images.pexels.com/photos/32564943/pexels-photo-32564943.jpeg?auto=compress&cs=tinysrgb&w=600',
  products: [
    'https://images.pexels.com/photos/6975415/pexels-photo-6975415.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/30500798/pexels-photo-30500798.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/10979206/pexels-photo-10979206.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/6516172/pexels-photo-6516172.jpeg?auto=compress&cs=tinysrgb&w=400',
  ],
};

const ICON = {
  leaf: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/leaf.svg',
  truck: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/truck-delivery.svg',
  shopPay: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/shopify.svg',
  instagram: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg',
  pinterest: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/pinterest.svg',
  facebook: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg',
};

const COLORS = {
  cream: '#F2E9E4',
  chocolate: '#6D4C41',
  terracotta: '#D4A373',
  terracottaHeading: '#D4A373',
  white: '#FFFFFF',
};

const PRODUCTS = [
  'Bōdhi Jumper, Teal',
  'Sleeved Bōdhi Jumper, Midnight Black',
  'Bōdhi Jumper, Clay',
  'Bōdhi Jumper, Raisin',
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

function buttonBlock(id, name, label, opts = {}) {
  const {
    alignH = 'center',
    bg = COLORS.terracotta,
    textColor = COLORS.chocolate,
    radius = themeRef('tokens.radius.cta'),
    radiusPath = 'tokens.radius.cta',
    bindRadius = true,
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
        widthMode: 'hug',
        backgroundColor: bg,
        textColor,
        fontSize: themeRef('tokens.typography.caption'),
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
      ...bindings,
      ...themeBinding('props.buttonStyle.fontSize', 'tokens.typography.caption'),
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

function dividerBlock(id, color = COLORS.white) {
  return {
    id,
    type: 'divider',
    blockMeta: { blockType: 'separator.divider', name: '分隔线' },
    props: { color, height: '1px', lineWidthMode: 'fixed', lineWidth: '280px' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      contentAlign: { horizontal: 'center', vertical: 'top' },
    },
  };
}

function productCell(id, imgSrc, title, idx) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: `商品${idx + 1}` },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      coverImage(`${id}-img`, imgSrc, `Product ${idx + 1} lifestyle`, '280px'),
      textBlock(`${id}-name`, '标题', title, {
        fontSize: themeRef('tokens.typography.body'),
        color: themeRef('colors.primary'),
        bold: true,
      }),
      buttonBlock(`${id}-cta`, '按钮', 'Shop & Save', {
        bg: COLORS.terracotta,
        textColor: COLORS.white,
        radius: '20px',
        bindRadius: false,
      }),
    ],
  };
}

function trustCol(id, iconSrc, lines) {
  const children = [iconBlock(`${id}-ico`, iconSrc, COLORS.white, '28px')];
  for (let i = 0; i < lines.length; i++) {
    children.push(
      textBlock(`${id}-t${i}`, '标题', lines[i], {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        color: COLORS.white,
        bold: i === 0,
      }),
    );
  }
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children,
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '品牌头部', { bg: COLORS.cream, padTop: '24px', padBottom: '24px' });
  sec.children.push(
    textBlock(`${P}-s1-logo`, '标题', 'IMBŌDHI', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: themeRef('colors.primary'),
      bold: true,
    }),
  );
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '首屏促销', { pageInline: false, padBottom: '0' });
  sec.children.push(
    coverImage(
      `${P}-s2-hero`,
      PEXELS.hero,
      'Three women in athletic wear laughing together in warm natural light',
      '280px',
    ),
  );
  const promo = sectionShell(`${P}-s2-promo`, '促销文案区', {
    pageInline: false,
    bg: COLORS.chocolate,
    padTop: '32px',
    padBottom: '32px',
  });
  promo.wrapperStyle.padding = {
    mode: 'separate',
    top: '32px',
    right: '24px',
    bottom: '32px',
    left: '24px',
  };
  promo.bindings = {};
  promo.children.push({
    id: `${P}-s2-inner`,
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
      textBlock(`${P}-s2-h1`, '标题', '15% Off', {
        fontSize: '64px',
        color: COLORS.white,
        bold: true,
      }),
      textBlock(`${P}-s2-h2`, '标题', 'is A Text Away.', {
        fontSize: themeRef('tokens.typography.display'),
        fontSizePath: 'tokens.typography.display',
        color: COLORS.terracottaHeading,
        bold: true,
      }),
      textBlock(
        `${P}-s2-body`,
        '正文',
        'Let early moments find you first. Sign up for text alerts, take 15% off your next order, and be first to shop sales, hear about the newest silhouettes coming to life, and more.',
        {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.white,
        },
      ),
      buttonBlock(`${P}-s2-cta`, '按钮', 'Join the List', {
        bg: COLORS.terracotta,
        textColor: COLORS.chocolate,
        radius: '24px',
        bindRadius: false,
      }),
    ],
  });
  sec.children.push(promo);
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '精选商品', { bg: COLORS.cream, padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s3-title`, '标题', 'Curated for You.', {
      fontSize: themeRef('tokens.typography.display'),
      fontSizePath: 'tokens.typography.display',
      color: themeRef('colors.primary'),
      bold: true,
    }),
    {
      id: `${P}-s3-grid`,
      type: 'grid',
      blockMeta: { blockType: 'layout.grid', name: '栅格' },
      props: { columns: 2, gap: '24px', cellWidthMode: 'auto', cellHeightMode: 'content-max' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: '0' },
        padding: { mode: 'unified', unified: '0' },
      },
      children: PRODUCTS.map((title, i) =>
        productCell(`${P}-s3-p${i}`, PEXELS.products[i], title, i),
      ),
    },
  );
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '服务保障', {
    bg: COLORS.chocolate,
    padTop: '32px',
    padBottom: '24px',
  });
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '32px',
    right: '16px',
    bottom: '24px',
    left: '16px',
  };
  sec.bindings = {};
  sec.children.push({
    id: `${P}-s4-grid`,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name: '栅格' },
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
      trustCol(`${P}-s4-c1`, ICON.leaf, ['Clean Fabrics +', 'CA Made']),
      trustCol(`${P}-s4-c2`, ICON.shopPay, ['Buy Now, Pay Later', 'with Shop Pay']),
      trustCol(`${P}-s4-c3`, ICON.truck, ['Free Shipping', '(U.S. $150+)']),
    ],
  });
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '页脚信息', {
    bg: COLORS.chocolate,
    padTop: '16px',
    padBottom: '32px',
  });
  sec.wrapperStyle.padding = {
    mode: 'separate',
    top: '16px',
    right: '24px',
    bottom: '32px',
    left: '24px',
  };
  sec.bindings = {};
  const socialRow = {
    id: `${P}-s5-social`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '24px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      iconBlock(`${P}-s5-ig`, ICON.instagram, COLORS.white, '22px'),
      iconBlock(`${P}-s5-pin`, ICON.pinterest, COLORS.white, '22px'),
      iconBlock(`${P}-s5-fb`, ICON.facebook, COLORS.white, '22px'),
    ],
  };
  sec.children.push(
    dividerBlock(`${P}-s5-div1`),
    socialRow,
    dividerBlock(`${P}-s5-div2`),
    {
      id: `${P}-s5-copy`,
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
        textBlock(`${P}-s5-brand`, '标题', 'IMBŌDHI', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.white,
          bold: true,
        }),
        textBlock(`${P}-s5-addr`, '正文', '2443 Fillmore St #380 - 8481 San Francisco, California 94115', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.white,
        }),
        textBlock(`${P}-s5-unsub`, '链接', 'Unsubscribe', {
          fontSize: themeRef('tokens.typography.caption'),
          fontSizePath: 'tokens.typography.caption',
          color: COLORS.white,
          decoration: 'underline',
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
      label: '模板53手工还原（IMBŌDHI · 豆包）',
      description: '购买后 1 设计图手工还原；图源 Pexels、图标 jsDelivr，模拟 pipeline 产物。',
      tokens: {
        colors: {
          primary: COLORS.chocolate,
          secondary: COLORS.white,
          surface: COLORS.cream,
        },
        spacing: { section: '24px', gap: '16px', pageInline: '24px' },
        typography: { display: '36px', h1: '24px', body: '15px', caption: '13px' },
        radius: { panel: '0', cta: '24px' },
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
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5()],
  },
};

const meta = {
  schemaVersion: '1.0.0',
  displayName: '购买后 1（模板 53 · IMBŌDHI · 豆包手工还原）',
  description:
    '购买后 1 营销邮件：品牌头、15% OFF 促销区、2x2 商品栅格、服务保障、页脚社媒与信息。图源 Pexels，图标 jsDelivr。',
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
      label: '购买后 1（模板 53 · 豆包版）',
      description: 'IMBŌDHI 购买后营销邮件 — 按设计图手工还原',
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
