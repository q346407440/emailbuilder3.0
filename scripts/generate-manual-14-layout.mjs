#!/usr/bin/env node
/**
 * 手工还原「废弃购物车 2（模板 14）」Alo Yoga — 模拟 pipeline 产物形态，不经 LLM。
 * 图源：Pexels（与 pipeline B4 一致）；图标：jsDelivr Tabler / Simple Icons（与 iconCdn 一致）。
 * 输出：data/emails/engagement_abandoned_cart_template14/layouts/default/
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'engagement_abandoned_cart_template14';
const P = 'eact14';
const OUT = join(__dirname, `../data/emails/${EMAIL}/layouts/default`);
const SRC_TEMPLATE = join(
  __dirname,
  '../data/emails/step23x2-2/layouts/pexels-3/template.json',
);
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/废弃购物车 2（模板 14）.png';
const DESIGN_DST = join(__dirname, '../public/test-assets/abandoned-cart-template-14.png');

/** pipeline / pexels-3 已验证可访问的瑜伽场景图 */
const PEXELS = {
  grid: [
    'https://images.pexels.com/photos/6975415/pexels-photo-6975415.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/30500798/pexels-photo-30500798.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/10979206/pexels-photo-10979206.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/6516172/pexels-photo-6516172.jpeg?auto=compress&cs=tinysrgb&w=400',
  ],
  product: [
    'https://images.pexels.com/photos/18914156/pexels-photo-18914156.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/6211601/pexels-photo-6211601.jpeg?auto=compress&cs=tinysrgb&w=400',
  ],
};

const ICON = {
  package: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/package.svg',
  returns: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/arrow-back-up.svg',
  afterpay: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/infinity.svg',
  instagram: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg',
  tiktok: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/tiktok.svg',
  youtube: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/youtube.svg',
  facebook: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg',
  square: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/square.svg',
  brandAlo: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/square-letter-a.svg',
  mapPin: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/map-pin.svg',
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

function sectionShell(id, name) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: {
        mode: 'separate',
        top: '0',
        right: themeRef('tokens.spacing.pageInline'),
        bottom: themeRef('tokens.spacing.section'),
        left: themeRef('tokens.spacing.pageInline'),
      },
    },
    bindings: {
      ...themeBinding('wrapperStyle.padding.bottom', 'tokens.spacing.section'),
      ...themeBinding('wrapperStyle.padding.left', 'tokens.spacing.pageInline'),
      ...themeBinding('wrapperStyle.padding.right', 'tokens.spacing.pageInline'),
    },
    children: [],
  };
}

function dividerBlock(id, name = '分隔线') {
  return {
    id,
    type: 'divider',
    blockMeta: { blockType: 'separator.divider', name },
    props: {
      color: themeRef('colors.secondary'),
      height: '1px',
      lineWidthMode: 'fill',
    },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      contentAlign: { horizontal: 'center', vertical: 'top' },
    },
    bindings: themeBinding('props.color', 'colors.secondary'),
  };
}

function coverImage(id, src, alt, height) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '配图' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: themeRef('tokens.spacing.gap') },
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
    bindings: themeBinding('props.gap', 'tokens.spacing.gap'),
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

function iconBlock(id, src, color = '#000000', size = '24px', alignH = 'center') {
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name: '图标' },
    props: { src, color, size, link: '' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function trustCol(id, iconSrc, label) {
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
    children: [
      iconBlock(`${id}-ico`, iconSrc, '#000000', '24px'),
      textBlock(`${id}-lbl`, '标题', label, {
        fontSize: themeRef('tokens.typography.caption'),
        fontSizePath: 'tokens.typography.caption',
        bold: true,
      }),
    ],
  };
}

function brandCol(id, iconSrc, title, subtitle) {
  const children = [iconBlock(`${id}-ico`, iconSrc, '#000000', '28px')];
  if (title) {
    children.push(
      textBlock(`${id}-title`, '标题', title, {
        fontSize: themeRef('tokens.typography.body'),
        fontSizePath: 'tokens.typography.body',
        bold: true,
      }),
    );
  }
  children.push(
    textBlock(`${id}-sub`, '说明', subtitle, {
      fontSize: themeRef('tokens.typography.caption'),
      fontSizePath: 'tokens.typography.caption',
      color: themeRef('colors.primary'),
      colorPath: 'colors.primary',
      bold: true,
    }),
  );
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

function buildS8() {
  const sec = sectionShell(`${P}-s8-sec`, '功能入口');
  sec.children.push({
    id: `${P}-s8-grid`,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name: '栅格' },
    props: { columns: 3, gap: themeRef('tokens.spacing.gap'), cellWidthMode: 'auto', cellHeightMode: 'content-max' },
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
      brandCol(`${P}-s8-c1`, ICON.square, 'alo', 'SHOP THE APP'),
      brandCol(`${P}-s8-c2`, ICON.brandAlo, 'alo moves', 'MOVE AT HOME'),
      brandCol(`${P}-s8-c3`, ICON.mapPin, '', 'FIND A STORE'),
    ],
  });
  return sec;
}

function patchFromPexels3(template) {
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.id === 'string') {
      node.id = node.id.replace(/step23x2-2-pexels-3/g, P);
    }
    for (const c of node.children ?? []) walk(c);
  };
  walk(template.root);

  template.emailId = EMAIL;
  template.templateId = EMAIL;

  const sections = template.root.children;
  const byName = (n) => sections.find((s) => s.blockMeta?.name === n);

  const s2 = byName('瑜伽服展示');
  if (s2?.children?.[0]?.props) {
    s2.children[0].props.gap = '4px';
    const cells = s2.children[0].children ?? [];
    cells.forEach((cell, i) => {
      const bg = cell.wrapperStyle?.backgroundImage;
      if (bg && PEXELS.grid[i]) {
        bg.src = PEXELS.grid[i];
        cell.wrapperStyle.height = '180px';
      }
    });
  }

  const s4 = byName('外套商品展示');
  if (s4?.children?.[0]?.children) {
    const cols = s4.children[0].children;
    cols.forEach((col, i) => {
      const img = col.children?.find((c) => c.type === 'image');
      if (img?.wrapperStyle?.backgroundImage && PEXELS.product[i]) {
        img.wrapperStyle.backgroundImage.src = PEXELS.product[i];
        img.wrapperStyle.height = '220px';
      }
    });
  }

  const s6 = byName('服务说明');
  if (s6) {
    const grid = s6.children?.[0];
    if (grid?.children?.[0]) {
      const icons = [ICON.package, ICON.returns, ICON.afterpay];
      grid.children.forEach((col, i) => {
        const ic = col.children?.find((c) => c.type === 'icon');
        if (ic && icons[i]) ic.props.src = icons[i];
      });
    }
    s6.children = [
      dividerBlock(`${P}-s6-div-top`),
      ...(s6.children ?? []),
      dividerBlock(`${P}-s6-div-bot`),
    ];
  }

  const s9 = byName('页脚信息');
  if (s9?.children?.[0]?.children) {
    for (const t of s9.children[0].children) {
      if (t.type !== 'text') continue;
      const txt = t.props?.textBody?.paragraphs?.[0]?.runs?.[0]?.text ?? '';
      if (txt.startsWith('Copyright')) {
        t.props.textBody.paragraphs[0].runs[0].text =
          'Copyright © 2023 Alo, LLC, All rights reserved.';
      }
      if (txt.includes('Flotilla') || txt.includes('6670') || txt.includes('Commerce')) {
        t.props.textBody.paragraphs[0].runs[0].text =
          '1250 S. Beverly Dr. Los Angeles, CA 90035';
      }
    }
  }

  const s8idx = sections.findIndex((s) => s.blockMeta?.name === '功能入口');
  if (s8idx >= 0) sections[s8idx] = buildS8();

  return template;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '模板14手工还原（Alo Yoga）',
      description: '废弃购物车 2 设计图手工还原；图源 Pexels、图标 jsDelivr，模拟 pipeline 产物。',
      tokens: {
        colors: { primary: '#000000', secondary: '#9CA3AF', surface: '#FFFFFF' },
        spacing: { section: '20px', gap: '16px', pageInline: '24px' },
        typography: { display: '32px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '0', cta: '0' },
      },
    },
  },
  scopeSelections: {},
};

const base = JSON.parse(readFileSync(SRC_TEMPLATE, 'utf8'));
const template = patchFromPexels3(base);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);

try {
  copyFileSync(DESIGN_SRC, DESIGN_DST);
} catch {
  console.warn('设计图未复制到 public/test-assets（源路径不可读则跳过）');
}

console.log(`Wrote ${OUT}`);
