#!/usr/bin/env node
/**
 * 手工还原「废弃购物车 3（模板 15）」— 模拟 pipeline 产物形态，不经 LLM。
 * 输出：data/emails/step23x2-2/layouts/manual-15/
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../data/emails/step23x2-2/layouts/manual-15');
const P = 'step23x2-2-manual-15';
const EMAIL = 'step23x2-2';

const PEXELS = {
  product: 'https://images.pexels.com/photos/15009948/pexels-photo-15009948.jpeg?auto=compress&cs=tinysrgb&w=600',
  social: [
    'https://images.pexels.com/photos/15020556/pexels-photo-15020556.jpeg?auto=compress&cs=tinysrgb&w=300',
    'https://images.pexels.com/photos/32564943/pexels-photo-32564943.jpeg?auto=compress&cs=tinysrgb&w=300',
    'https://images.pexels.com/photos/13738398/pexels-photo-13738398.jpeg?auto=compress&cs=tinysrgb&w=300',
    'https://images.pexels.com/photos/30173534/pexels-photo-30173534.jpeg?auto=compress&cs=tinysrgb&w=300',
  ],
};

const ICON = {
  twitter: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/x.svg',
  instagram: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg',
  facebook: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg',
  tiktok: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/tiktok.svg',
  store: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/building-store.svg',
  shield: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/shield.svg',
  dollarOff: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/currency-dollar-off.svg',
  clock: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.31.0/icons/outline/clock.svg',
};

const SOCIAL = [
  { icon: ICON.twitter, color: '#1DA1F2', label: 'TWITTER' },
  { icon: ICON.instagram, color: '#E4405F', label: 'INSTAGRAM' },
  { icon: ICON.facebook, color: '#1877F2', label: 'FACEBOOK' },
  { icon: ICON.tiktok, color: '#000000', label: 'TIKTOK' },
];

let seq = 0;
const nid = (suffix) => `${P}-${suffix}-${++seq}`.replace(/-+/g, '-');

function themeRef(path) {
  return { $themeRef: path };
}

function themeBinding(fieldPath, tokenPath) {
  const slotId = tokenPath.replace(/^tokens\./, 'tokens.').replace(/^colors\./, 'colors.');
  return {
    [fieldPath]: {
      slotId: tokenPath.startsWith('tokens.') ? tokenPath : tokenPath,
      mode: 'theme',
      tokenPath,
      fieldKind: 'style',
    },
  };
}

function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
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

function hLayout(id, alignH = 'center', children = []) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: {
      direction: 'horizontal',
      gapMode: 'fixed',
      gap: themeRef('tokens.spacing.gap'),
    },
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

function vLayout(id, alignH = 'center', gap = themeRef('tokens.spacing.gap'), children = []) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings: typeof gap === 'object' && gap.$themeRef ? themeBinding('props.gap', 'tokens.spacing.gap') : {},
    children,
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
  } = opts;
  const bindings = {};
  if (typeof fontSize === 'object' && fontSize.$themeRef) {
    Object.assign(bindings, themeBinding('props.fontSize', fontSizePath));
  }
  if (typeof color === 'object' && color.$themeRef) {
    Object.assign(bindings, themeBinding('props.color', colorPath));
  }
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
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    bindings,
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const { alignH = 'center' } = opts;
  return {
    id,
    type: 'button',
    blockMeta: { blockType: 'action.button', name },
    props: {
      text: label,
      link: '',
      buttonStyle: {
        widthMode: 'hug',
        backgroundColor: themeRef('colors.primary'),
        textColor: '#1A1A1A',
        fontSize: themeRef('tokens.typography.body'),
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: themeRef('tokens.radius.cta') },
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
      ...themeBinding('props.buttonStyle.backgroundColor', 'colors.primary'),
      ...themeBinding('props.buttonStyle.fontSize', 'tokens.typography.body'),
      ...themeBinding('props.buttonStyle.borderRadius.radius', 'tokens.radius.cta'),
    },
  };
}

function iconBlock(id, src, color, size = '32px', alignH = 'center') {
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

function bgImageBlock(id, src, alt, height, overlayChildren = [], vertical = 'center') {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name: '配图' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: themeRef('tokens.spacing.gap') },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical },
      widthMode: 'fill',
      heightMode: 'fixed',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: themeRef('tokens.radius.panel') },
      height,
      backgroundImage: {
        src,
        alt,
        fit: 'cover',
        position: 'center',
        border: borderNone(),
        borderRadius: { mode: 'unified', radius: themeRef('tokens.radius.panel') },
      },
    },
    bindings: {
      ...themeBinding('props.gap', 'tokens.spacing.gap'),
      ...themeBinding('wrapperStyle.backgroundImage.borderRadius.radius', 'tokens.radius.panel'),
      ...themeBinding('wrapperStyle.borderRadius.radius', 'tokens.radius.panel'),
    },
    children: overlayChildren,
  };
}

function gridBlock(id, columns, children, gap = '8px') {
  return {
    id,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name: '栅格' },
    props: { columns, gap, cellWidthMode: 'auto', cellHeightMode: 'content-max' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
      padding: { mode: 'unified', unified: '0' },
    },
    children,
  };
}

// --- sections ---

function buildS1() {
  const sec = sectionShell(`${P}-s1-sec`, '顶部导航');
  sec.wrapperStyle.contentAlign = { horizontal: 'center', vertical: 'top' };
  const row = hLayout(`${P}-s1-row`, 'center', [
    textBlock(`${P}-s1-logo`, '标题', 'AVENTON', {
      alignH: 'left',
      fontSize: themeRef('tokens.typography.h1'),
      color: '#1A1A1A',
      bold: true,
      italic: true,
      fontSizePath: 'tokens.typography.h1',
    }),
    vLayout(
      `${P}-s1-right`,
      'right',
      '4px',
      [
        textBlock(`${P}-s1-hint`, '说明', 'Looking for free thrills?', {
          alignH: 'right',
          fontSize: themeRef('tokens.typography.caption'),
          color: themeRef('colors.secondary'),
          fontSizePath: 'tokens.typography.caption',
          colorPath: 'colors.secondary',
        }),
        textBlock(`${P}-s1-link`, '链接', 'Book a test ride.', {
          alignH: 'right',
          fontSize: themeRef('tokens.typography.caption'),
          color: '#1A1A1A',
          bold: true,
          decoration: 'underline',
          fontSizePath: 'tokens.typography.caption',
        }),
      ],
    ),
  ]);
  row.props.direction = 'horizontal';
  row.wrapperStyle.contentAlign = { horizontal: 'center', vertical: 'top' };
  // space-between via nested fill
  row.children[0].wrapperStyle.widthMode = 'hug';
  row.children[1].wrapperStyle.widthMode = 'fill';
  row.children[1].wrapperStyle.contentAlign = { horizontal: 'right', vertical: 'top' };
  sec.children.push(row);
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2-sec`, '首屏提示');
  sec.children.push(
    vLayout(`${P}-s2-inner`, 'center', themeRef('tokens.spacing.gap'), [
      textBlock(`${P}-s2-h1`, '标题', 'Still thinking about it?', {
        fontSize: themeRef('tokens.typography.h1'),
        color: '#1A1A1A',
        bold: true,
        fontSizePath: 'tokens.typography.h1',
      }),
      textBlock(`${P}-s2-sub`, '说明', 'We made it easy to pick up where you left off.', {
        color: themeRef('colors.secondary'),
        colorPath: 'colors.secondary',
      }),
      buttonBlock(`${P}-s2-cta`, '按钮', 'SHOP NOW'),
    ]),
  );
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3-sec`, '商品推荐');
  sec.children.push(
    vLayout(`${P}-s3-inner`, 'center', themeRef('tokens.spacing.gap'), [
      textBlock(`${P}-s3-title`, '标题', 'TAKE ANOTHER LOOK:', {
        fontSize: themeRef('tokens.typography.body'),
        color: '#1A1A1A',
        bold: true,
      }),
      bgImageBlock(
        `${P}-s3-img`,
        PEXELS.product,
        'Modern foldable black electric bicycle displayed in a studio setting.',
        '280px',
      ),
      textBlock(`${P}-s3-name`, '标题', 'Aventure M Ebike - Regular / Camouflage', {
        color: '#1A1A1A',
        bold: true,
      }),
      buttonBlock(`${P}-s3-cta`, '按钮', "DON'T MISS OUT"),
    ]),
  );
  return sec;
}

function buildFinancingFeature(id, iconSrc, title, body) {
  return vLayout(`${id}-col`, 'center', '8px', [
    iconBlock(`${id}-icon`, iconSrc, '#2563EB', '40px'),
    textBlock(`${id}-title`, '标题', title, { color: '#1A1A1A', bold: true }),
    textBlock(`${id}-body`, '正文', body, {
      fontSize: themeRef('tokens.typography.caption'),
      color: themeRef('colors.secondary'),
      fontSizePath: 'tokens.typography.caption',
      colorPath: 'colors.secondary',
    }),
  ]);
}

function buildS4() {
  const sec = sectionShell(`${P}-s4-sec`, '金融服务说明');
  sec.children.push(
    vLayout(`${P}-s4-inner`, 'center', themeRef('tokens.spacing.gap'), [
      textBlock(`${P}-s4-h1`, '标题', 'FINANCING AVAILABLE', {
        fontSize: themeRef('tokens.typography.h1'),
        color: '#1A1A1A',
        bold: true,
        fontSizePath: 'tokens.typography.h1',
      }),
      textBlock(`${P}-s4-sub1`, '说明', 'Easy financing available through Affirm:', {
        color: themeRef('colors.secondary'),
        colorPath: 'colors.secondary',
      }),
      textBlock(`${P}-s4-plus`, '说明', '+', { color: '#1A1A1A', bold: true }),
      textBlock(`${P}-s4-affirm`, '标题', 'affirm', {
        fontSize: themeRef('tokens.typography.h1'),
        color: '#4A4AF4',
        bold: false,
        italic: false,
        fontSizePath: 'tokens.typography.h1',
      }),
      textBlock(`${P}-s4-h2`, '标题', 'FINANCING AVAILABLE', {
        fontSize: themeRef('tokens.typography.h1'),
        color: '#1A1A1A',
        bold: true,
        fontSizePath: 'tokens.typography.h1',
      }),
      textBlock(`${P}-s4-sub2`, '说明', 'Easy financing available through Affirm:', {
        color: themeRef('colors.secondary'),
        colorPath: 'colors.secondary',
      }),
      gridBlock(`${P}-s4-grid`, 2, [
        buildFinancingFeature(
          `${P}-s4-f1`,
          ICON.dollarOff,
          'QUICK & EASY',
          "Enter a few pieces of information for real-time decision. Checking your eligibility won't affect your credit score.",
        ),
        buildFinancingFeature(
          `${P}-s4-f2`,
          ICON.clock,
          'NO HIDDEN FEES',
          "Know up front exactly what you'll owe, with no hidden costs and no surprises.",
        ),
      ]),
    ]),
  );
  return sec;
}

function buildSocialCell(id, idx) {
  const s = SOCIAL[idx];
  return bgImageBlock(
    `${id}-img`,
    PEXELS.social[idx],
    `Social lifestyle photo ${idx + 1}`,
    '120px',
    [
      iconBlock(`${id}-icon`, s.icon, s.color, '24px'),
      textBlock(`${id}-label`, '标题', s.label, {
        color: themeRef('colors.surface'),
        bold: true,
        colorPath: 'colors.surface',
      }),
    ],
    'center',
  );
}

function buildS5() {
  const sec = sectionShell(`${P}-s5-sec`, '社交平台入口');
  sec.children.push(
    gridBlock(
      `${P}-s5-grid`,
      4,
      [0, 1, 2, 3].map((i) => buildSocialCell(`${P}-s5-c${i}`, i)),
      '0px',
    ),
  );
  return sec;
}

function buildTrustCol(id, children) {
  return vLayout(`${id}`, 'center', '8px', children);
}

function buildS6() {
  const sec = sectionShell(`${P}-s6-sec`, '服务保障说明');
  sec.children.push(
    vLayout(`${P}-s6-inner`, 'center', themeRef('tokens.spacing.gap'), [
      gridBlock(`${P}-s6-grid`, 4, [
        buildTrustCol(`${P}-s6-c1`, [
          iconBlock(`${P}-s6-i1`, ICON.store, '#1A1A1A', '32px'),
          textBlock(`${P}-s6-t1a`, '标题', '1,800+', { color: '#1A1A1A', bold: true }),
          textBlock(`${P}-s6-t1b`, '说明', '1,800+ Shops For Service & Test Rides', {
            fontSize: themeRef('tokens.typography.caption'),
            color: themeRef('colors.secondary'),
            fontSizePath: 'tokens.typography.caption',
            colorPath: 'colors.secondary',
          }),
        ]),
        buildTrustCol(`${P}-s6-c2`, [
          textBlock(`${P}-s6-ul`, '标题', 'UL CERTIFIED', {
            fontSize: themeRef('tokens.typography.caption'),
            color: '#1A1A1A',
            bold: true,
            fontSizePath: 'tokens.typography.caption',
          }),
        ]),
        buildTrustCol(`${P}-s6-c3`, [
          textBlock(`${P}-s6-tuv`, '标题', 'TÜV Rheinland CERTIFIED', {
            fontSize: themeRef('tokens.typography.caption'),
            color: '#1A1A1A',
            bold: true,
            fontSizePath: 'tokens.typography.caption',
          }),
        ]),
        buildTrustCol(`${P}-s6-c4`, [
          iconBlock(`${P}-s6-i4`, ICON.shield, '#1A1A1A', '32px'),
          textBlock(`${P}-s6-t4a`, '标题', '2', { color: '#1A1A1A', bold: true }),
          textBlock(`${P}-s6-t4b`, '说明', '2-Year Warranty On All Ebike Purchases', {
            fontSize: themeRef('tokens.typography.caption'),
            color: themeRef('colors.secondary'),
            fontSizePath: 'tokens.typography.caption',
            colorPath: 'colors.secondary',
          }),
        ]),
      ]),
      textBlock(
        `${P}-s6-cert`,
        '正文',
        'Safety Certified by UL Solutions or TÜV Rheinland',
        {
          fontSize: themeRef('tokens.typography.caption'),
          color: themeRef('colors.secondary'),
          fontSizePath: 'tokens.typography.caption',
          colorPath: 'colors.secondary',
        },
      ),
    ]),
  );
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7-sec`, '页脚信息');
  sec.children.push(
    vLayout(`${P}-s7-inner`, 'center', themeRef('tokens.spacing.gap'), [
      textBlock(
        `${P}-s7-disclaimer`,
        '正文',
        '*The federal minimum recommended age to ride electric bicycles is 16. If questions arise, consult with your local regulations to determine the safe, legal minimum age to operate Class I, II, or III electric bicycles like Aventon.',
        {
          fontSize: '10px',
          color: themeRef('colors.secondary'),
          colorPath: 'colors.secondary',
        },
      ),
      textBlock(`${P}-s7-unsub`, '正文', 'No longer want to receive these emails? Unsubscribe.', {
        fontSize: themeRef('tokens.typography.caption'),
        color: themeRef('colors.secondary'),
        fontSizePath: 'tokens.typography.caption',
        colorPath: 'colors.secondary',
      }),
      textBlock(`${P}-s7-addr`, '正文', 'Aventon Bikes 3040 Saturn St Suite 202 Brea, California 92821', {
        fontSize: themeRef('tokens.typography.caption'),
        color: themeRef('colors.secondary'),
        fontSizePath: 'tokens.typography.caption',
        colorPath: 'colors.secondary',
      }),
    ]),
  );
  return sec;
}

const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: '模板15手工还原',
      description: '按设计图手工还原 Aventon 废弃购物车邮件；模拟 pipeline 产物形态。',
      tokens: {
        colors: {
          primary: '#E3D026',
          secondary: '#6B7280',
          surface: '#FFFFFF',
        },
        spacing: {
          section: '20px',
          gap: '16px',
          pageInline: '24px',
        },
        typography: {
          display: '28px',
          h1: '24px',
          body: '16px',
          caption: '12px',
        },
        radius: {
          panel: '8px',
          cta: '24px',
        },
      },
    },
  },
  scopeSelections: {},
};

const template = {
  schemaVersion: '4.0.0',
  emailId: EMAIL,
  templateId: `${EMAIL}-manual-15`,
  templateVersion: 1,
  locale: 'zh-CN',
  root: {
    id: `${P}-root`,
    type: 'emailRoot',
    blockMeta: { blockType: 'layout.container', name: '画布根' },
    props: {
      backgroundColor: '#F3F4F6',
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

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tokenPresets.json'), `${JSON.stringify(tokenPresets, null, 2)}\n`);
writeFileSync(join(OUT, 'template.json'), `${JSON.stringify(template, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
