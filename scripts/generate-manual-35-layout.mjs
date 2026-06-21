#!/usr/bin/env node
/**
 * 手工还原「客户服务 3（模板 35）」citizenM 预订确认 — 模拟 pipeline 产物形态，不经 LLM。
 * 图源：Pexels；图标：jsDelivr Tabler / Simple Icons。
 */
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EMAIL = 'service_customer_care_template35';
const P = 'scc35';
const EMAIL_DIR = join(__dirname, `../data/emails/${EMAIL}`);
const OUT = join(EMAIL_DIR, 'layouts/default');
const DESIGN_SRC = '/Users/hengliheng/Downloads/邮件学习模板/客户服务 3（模板 35）.png';
const DESIGN_DST = join(__dirname, '../public/test-assets/customer-care-template-35.png');

const COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  purple: '#7B2CBF',
  red: '#FF0033',
  grey: '#6B7280',
  divider: '#E5E7EB',
  lightGrey: '#9CA3AF',
};

const PEXELS = {
  heroMascot: 'https://images.pexels.com/photos/3768114/pexels-photo-3768114.jpeg?auto=compress&cs=tinysrgb&w=280',
  appPhones: 'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=600',
  helpAvatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120',
};

const ICON = {
  calendar: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/calendar.svg',
  plus: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/plus.svg',
  parking: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/parking.svg',
  building: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/building.svg',
  chevronRight: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/chevron-right.svg',
  arrowRight: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.19.0/icons/outline/arrow-right.svg',
  facebook: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/facebook.svg',
  instagram: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/instagram.svg',
  linkedin: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/linkedin.svg',
  twitter: 'https://cdn.jsdelivr.net/npm/simple-icons@13.16.0/icons/x.svg',
};

const RESERVATION_ROWS = [
  ['name', 'Smiles Davis'],
  ['hotel', 'London Shoreditch hotel'],
  ['guests', '1'],
  ['nights', '1'],
  ['cancellation', 'cancel for free until 2PM day of arrival'],
];

const EXTRAS_ROWS = [
  { label: 'breakfast', value: 'not yet booked', action: '(add now)' },
  { label: 'late check-out', value: 'not yet booked', action: '(add now)' },
  { label: 'room', value: 'standard room', action: null },
];

function borderNone() {
  return { style: "solid", color: "rgba(0,0,0,0)", top: "0", right: "0", bottom: "0", left: "0" };
}

function padSeparate({ top = '0', right = '0', bottom = '0', left = '0' }) {
  return { top, right, bottom, left };
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
    borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
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
  const { fit = 'cover', position = 'center' } = opts;
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
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
      height,
      backgroundImage: {
        src,
        alt,
        fit,
        position,
        border: borderNone(),
        borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
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
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
    },
    bindings,
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
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
    },
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const { alignH = 'left', bg = COLORS.red, textColor = COLORS.white } = opts;
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
        borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        bold: true,
        italic: false,
      },
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
    },
    bindings: themeBinding('props.buttonStyle.fontSize', 'tokens.typography.body'),
  };
}

function dividerBlock(id, color = COLORS.divider) {
  return {
    id,
    type: 'divider',
    blockMeta: { blockType: 'separator.divider', name: '分隔线' },
    props: { color, height: '1px', lineWidthMode: 'fill' },
    wrapperStyle: {
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
      contentAlign: { horizontal: 'center', vertical: 'top' },
    },
  };
}

function circleIconBadge(id, src, iconColor = COLORS.white) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '图标' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'center' },
      widthMode: 'fixed',
      heightMode: 'fixed',
      width: '36px',
      height: '36px',
      backgroundColor: COLORS.black,
      border: borderNone(),
      borderRadius: { topLeft: '18px', topRight: '18px', bottomRight: '18px', bottomLeft: '18px' },
      padding: { top: "6px", right: "6px", bottom: "6px", left: "6px" },
    },
    children: [iconBlock(`${id}-ic`, src, iconColor, '22px')],
  };
}

function sectionTitleRow(id, iconSrc, title) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '10px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
      padding: padSeparate({ bottom: '12px' }),
    },
    children: [
      circleIconBadge(`${id}-badge`, iconSrc),
      textBlock(`${id}-title`, '标题', title, {
        fontSize: themeRef('tokens.typography.h1'),
        fontSizePath: 'tokens.typography.h1',
        bold: true,
      }),
    ],
  };
}

function detailRow(id, label, value, opts = {}) {
  const { action = null, actionColor = COLORS.red } = opts;
  const valueChildren = [
    textBlock(`${id}-val`, '正文', value, {
      alignH: 'right',
      fontSize: themeRef('tokens.typography.body'),
      color: themeRef('colors.primary'),
    }),
  ];
  if (action) {
    valueChildren.push(
      textBlock(`${id}-act`, '链接', action, {
        alignH: 'right',
        fontSize: themeRef('tokens.typography.body'),
        color: actionColor,
        bold: true,
        decoration: 'underline',
      }),
    );
  }
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '明细行' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
      padding: padSeparate({ top: '10px', bottom: '10px' }),
    },
    children: [
      {
        id: `${id}-row`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '布局' },
        props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        },
        children: [
          textBlock(`${id}-lbl`, '正文', label, {
            fontSize: themeRef('tokens.typography.body'),
            bold: true,
            color: COLORS.black,
          }),
          {
            id: `${id}-right`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '布局' },
            props: { direction: 'vertical', gapMode: 'fixed', gap: '2px' },
            wrapperStyle: {
              contentAlign: { horizontal: 'right', vertical: 'top' },
              widthMode: 'fill',
              heightMode: 'hug',
              border: borderNone(),
              borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
            },
            children: valueChildren,
          },
        ],
      },
      dividerBlock(`${id}-div`),
    ],
  };
}

function dateBox(id, title, dayName, dayNum, monthYear, timeNote, linkText = null) {
  const children = [
    textBlock(`${id}-title`, '标题', title, {
      fontSize: themeRef('tokens.typography.caption'),
      fontSizePath: 'tokens.typography.caption',
      color: COLORS.black,
      bold: true,
    }),
    {
      id: `${id}-box`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '日期卡' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '4px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'fixed',
        height: '140px',
        backgroundColor: COLORS.black,
        border: borderNone(),
        borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        padding: { top: "12px", right: "12px", bottom: "12px", left: "12px" },
      },
      children: [
        textBlock(`${id}-dow`, '说明', dayName, {
          alignH: 'center',
          fontSize: themeRef('tokens.typography.caption'),
          color: COLORS.white,
        }),
        textBlock(`${id}-num`, '标题', dayNum, {
          alignH: 'center',
          fontSize: themeRef('tokens.typography.display'),
          fontSizePath: 'tokens.typography.display',
          color: COLORS.white,
          bold: true,
        }),
        textBlock(`${id}-my`, '说明', monthYear, {
          alignH: 'center',
          fontSize: themeRef('tokens.typography.caption'),
          color: COLORS.white,
        }),
        textBlock(`${id}-time`, '说明', timeNote, {
          alignH: 'center',
          fontSize: themeRef('tokens.typography.caption'),
          color: COLORS.white,
        }),
      ],
    },
  ];
  if (linkText) {
    children.push(
      textBlock(`${id}-link`, '链接', linkText, {
        fontSize: themeRef('tokens.typography.caption'),
        color: COLORS.red,
        decoration: 'underline',
      }),
    );
  }
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: title === 'check-in' ? '入住' : '退房' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
    },
    children,
  };
}

function quickLinkRow(id, iconSrc, label) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '快捷链接' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
      padding: padSeparate({ top: '10px', bottom: '10px' }),
    },
    children: [
      circleIconBadge(`${id}-badge`, iconSrc),
      textBlock(`${id}-lbl`, '链接', label, {
        fontSize: themeRef('tokens.typography.body'),
        bold: true,
        decoration: 'underline',
      }),
      iconBlock(`${id}-arrow`, ICON.chevronRight, COLORS.black, '20px'),
    ],
  };
}

function buildS1() {
  const sec = sectionShell(`${P}-s1`, '预订确认头图', {
    pageInline: false,
    bg: COLORS.purple,
    padTop: '24px',
    padBottom: '24px',
  });
  sec.wrapperStyle.padding = {
    top: '24px',
    right: '20px',
    bottom: '24px',
    left: '20px',
  };
  sec.bindings = {};
  sec.children.push({
    id: `${P}-s1-row`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
    },
    children: [
      {
        id: `${P}-s1-copy`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '布局' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '10px' },
        wrapperStyle: {
          contentAlign: { horizontal: 'left', vertical: 'top' },
          widthMode: 'fill',
          heightMode: 'hug',
          border: borderNone(),
          borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        },
        children: [
          textBlock(`${P}-s1-citizen`, '标题', 'citizen', {
            fontSize: themeRef('tokens.typography.caption'),
            fontSizePath: 'tokens.typography.caption',
            color: COLORS.white,
            bold: false,
          }),
          textBlock(`${P}-s1-m`, '标题', 'M', {
            fontSize: themeRef('tokens.typography.display'),
            fontSizePath: 'tokens.typography.display',
            color: COLORS.red,
            bold: true,
          }),
          textBlock(`${P}-s1-hi`, '标题', 'hi Smiles Davis', {
            fontSize: themeRef('tokens.typography.display'),
            fontSizePath: 'tokens.typography.display',
            color: COLORS.white,
            bold: true,
          }),
          textBlock(
            `${P}-s1-conf`,
            '正文',
            'Your booking at London Shoreditch hotel is confirmed!',
            {
              fontSize: themeRef('tokens.typography.body'),
              color: COLORS.white,
            },
          ),
          {
            id: `${P}-s1-code`,
            type: 'layout',
            blockMeta: { blockType: 'layout.container', name: '布局' },
            props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
            wrapperStyle: {
              contentAlign: { horizontal: 'left', vertical: 'top' },
              widthMode: 'hug',
              heightMode: 'hug',
              backgroundColor: COLORS.black,
              border: borderNone(),
              borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
              padding: padSeparate({ top: '8px', right: '12px', bottom: '8px', left: '12px' }),
            },
            children: [
              textBlock(`${P}-s1-code-t`, '说明', 'booking code: 8MLSDV5', {
                fontSize: themeRef('tokens.typography.caption'),
                color: COLORS.white,
                bold: true,
                widthMode: 'hug',
              }),
            ],
          },
          buttonBlock(`${P}-s1-manage`, '按钮', 'manage booking ›', {
            bg: COLORS.red,
            textColor: COLORS.white,
          }),
        ],
      },
      {
        id: `${P}-s1-img-wrap`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '布局' },
        props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          heightMode: 'hug',
          width: '160px',
          border: borderNone(),
          borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        },
        children: [
          coverImage(
            `${P}-s1-mascot`,
            PEXELS.heroMascot,
            'Guest wrapped in white duvet mascot substitute',
            '200px',
            { fit: 'contain', position: 'bottom' },
          ),
        ],
      },
    ],
  });
  return sec;
}

function buildS2() {
  const sec = sectionShell(`${P}-s2`, '入住退房', { padTop: '24px', padBottom: '8px' });
  sec.children.push({
    id: `${P}-s2-row`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
    },
    children: [
      dateBox(`${P}-s2-in`, 'check-in', 'Tuesday', '30', 'may 2023', 'from 2:00 PM', 'can I check in early?'),
      dateBox(`${P}-s2-out`, 'check-out', 'Wednesday', '31', 'may 2023', 'before 11:00 AM'),
    ],
  });
  return sec;
}

function buildS3() {
  const sec = sectionShell(`${P}-s3`, '预订明细', { padTop: '16px' });
  const rows = RESERVATION_ROWS.map(([label, value], i) =>
    detailRow(`${P}-s3-r${i}`, label, value),
  );
  sec.children.push(
    sectionTitleRow(`${P}-s3-head`, ICON.calendar, 'reservation details'),
    {
      id: `${P}-s3-table`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '布局' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
      },
      children: rows,
    },
    {
      id: `${P}-s3-total`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '布局' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        padding: padSeparate({ top: '16px' }),
      },
      children: [
        textBlock(`${P}-s3-total-l`, '标题', 'total', { bold: true }),
        textBlock(`${P}-s3-total-v`, '价格', '£ 209.00', {
          alignH: 'right',
          fontSize: themeRef('tokens.typography.h1'),
          fontSizePath: 'tokens.typography.h1',
          bold: true,
        }),
      ],
    },
  );
  return sec;
}

function buildS4() {
  const sec = sectionShell(`${P}-s4`, '附加服务', { padTop: '16px' });
  const rows = EXTRAS_ROWS.map((row, i) =>
    detailRow(`${P}-s4-r${i}`, row.label, row.value, { action: row.action }),
  );
  sec.children.push(
    sectionTitleRow(`${P}-s4-head`, ICON.plus, 'extras'),
    {
      id: `${P}-s4-table`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '布局' },
      props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
      },
      children: rows,
    },
  );
  return sec;
}

function buildS5() {
  const sec = sectionShell(`${P}-s5`, '快捷入口', { padTop: '8px' });
  sec.children.push(
    quickLinkRow(`${P}-s5-park`, ICON.parking, 'park your car'),
    quickLinkRow(`${P}-s5-hotel`, ICON.building, 'find the hotel'),
  );
  return sec;
}

function buildS6() {
  const sec = sectionShell(`${P}-s6`, 'App 推广', { padTop: '24px' });
  sec.children.push(
    textBlock(`${P}-s6-h`, '标题', 'make your stay better', {
      fontSize: themeRef('tokens.typography.h1'),
      fontSizePath: 'tokens.typography.h1',
      bold: true,
    }),
    textBlock(
      `${P}-s6-body`,
      '正文',
      'Download the citizenM app for contactless check-in, digital room keys, and 24/7 support — everything you need for a smoother stay.',
      { fontSize: themeRef('tokens.typography.body'), color: COLORS.grey },
    ),
    coverImage(`${P}-s6-img`, PEXELS.appPhones, 'Smartphones showing hotel app over city night', '180px'),
    buttonBlock(`${P}-s6-cta`, '按钮', 'get the app ›', { alignH: 'center', bg: COLORS.red }),
  );
  return sec;
}

function buildS7() {
  const sec = sectionShell(`${P}-s7`, '客服支持', { padTop: '24px' });
  const avatarWrap = {
    id: `${P}-s7-avatar`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '0' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fixed',
      heightMode: 'hug',
      width: '48px',
      border: borderNone(),
      borderRadius: { topLeft: '24px', topRight: '24px', bottomRight: '24px', bottomLeft: '24px' },
    },
    children: [coverImage(`${P}-s7-photo`, PEXELS.helpAvatar, 'Support agent portrait', '48px')],
  };
  const helpBar = {
    id: `${P}-s7-help`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'left', vertical: 'center' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
      padding: padSeparate({ bottom: '16px' }),
    },
    children: [
      avatarWrap,
      textBlock(`${P}-s7-help-t`, '正文', 'need help? talk to us 24 / 7', {
        fontSize: themeRef('tokens.typography.body'),
        bold: true,
      }),
      iconBlock(`${P}-s7-arrow`, ICON.arrowRight, COLORS.black, '28px'),
    ],
  };
  const btnRow = {
    id: `${P}-s7-btns`,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '布局' },
    props: { direction: 'horizontal', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
    },
    children: [
      buttonBlock(`${P}-s7-b1`, '按钮', 'find the hotel', { bg: COLORS.black }),
      buttonBlock(`${P}-s7-b2`, '按钮', 'park your car', { bg: COLORS.black }),
      buttonBlock(`${P}-s7-b3`, '按钮', 'FAQ', { bg: COLORS.black }),
    ],
  };
  sec.children.push(helpBar, btnRow);
  return sec;
}

function buildS8() {
  const sec = sectionShell(`${P}-s8`, '页脚信息', { padTop: '24px', padBottom: '24px' });
  sec.children.push(
    dividerBlock(`${P}-s8-top`),
    {
      id: `${P}-s8-row1`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '布局' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'center' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        padding: padSeparate({ top: '16px', bottom: '16px' }),
      },
      children: [
        {
          id: `${P}-s8-logo`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '布局' },
          props: { direction: 'horizontal', gapMode: 'fixed', gap: '0' },
          wrapperStyle: {
            contentAlign: { horizontal: 'left', vertical: 'center' },
            widthMode: 'fill',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
          },
          children: [
            textBlock(`${P}-s8-cit`, '标题', 'citizen', {
              fontSize: themeRef('tokens.typography.caption'),
              color: COLORS.black,
            }),
            textBlock(`${P}-s8-m`, '标题', 'M', {
              fontSize: themeRef('tokens.typography.h1'),
              fontSizePath: 'tokens.typography.h1',
              color: COLORS.red,
              bold: true,
            }),
          ],
        },
        {
          id: `${P}-s8-social`,
          type: 'layout',
          blockMeta: { blockType: 'layout.container', name: '布局' },
          props: { direction: 'horizontal', gapMode: 'fixed', gap: '12px' },
          wrapperStyle: {
            contentAlign: { horizontal: 'right', vertical: 'center' },
            widthMode: 'hug',
            heightMode: 'hug',
            border: borderNone(),
            borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
          },
          children: [
            textBlock(`${P}-s8-fb`, '链接', 'Facebook', {
              alignH: 'right',
              fontSize: themeRef('tokens.typography.caption'),
              decoration: 'underline',
              widthMode: 'hug',
            }),
            textBlock(`${P}-s8-ig`, '链接', 'Instagram', {
              alignH: 'right',
              fontSize: themeRef('tokens.typography.caption'),
              decoration: 'underline',
              widthMode: 'hug',
            }),
            textBlock(`${P}-s8-li`, '链接', 'LinkedIn', {
              alignH: 'right',
              fontSize: themeRef('tokens.typography.caption'),
              decoration: 'underline',
              widthMode: 'hug',
            }),
            textBlock(`${P}-s8-tw`, '链接', 'Twitter', {
              alignH: 'right',
              fontSize: themeRef('tokens.typography.caption'),
              decoration: 'underline',
              widthMode: 'hug',
            }),
          ],
        },
      ],
    },
    dividerBlock(`${P}-s8-mid`),
    {
      id: `${P}-s8-row2`,
      type: 'layout',
      blockMeta: { blockType: 'layout.container', name: '布局' },
      props: { direction: 'horizontal', gapMode: 'fixed', gap: '8px' },
      wrapperStyle: {
        contentAlign: { horizontal: 'center', vertical: 'top' },
        widthMode: 'fill',
        heightMode: 'hug',
        border: borderNone(),
        borderRadius: { topLeft: "0", topRight: "0", bottomRight: "0", bottomLeft: "0" },
        padding: padSeparate({ top: '12px' }),
      },
      children: [
        textBlock(`${P}-s8-copy`, '说明', '© citizenM hotels 2023. All rights reserved.', {
          fontSize: themeRef('tokens.typography.caption'),
          color: COLORS.lightGrey,
        }),
        textBlock(`${P}-s8-links`, '链接', 'contact us · privacy policy · terms & conditions', {
          alignH: 'right',
          fontSize: themeRef('tokens.typography.caption'),
          color: COLORS.lightGrey,
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
      label: '模板35手工还原（citizenM 预订确认）',
      description: '客户服务 3 设计图手工还原；图源 Pexels、图标 jsDelivr。',
      tokens: {
        colors: { primary: '#000000', accent: '#1A1A1A', secondary: '#6B7280', surface: '#FFFFFF' },
        spacing: { section: '16px', gap: '12px', pageInline: '24px' },
        typography: { display: '36px', h1: '18px', body: '14px', caption: '12px' },
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
      padding: { top: "0", right: "0", bottom: "0", left: "0" },
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8()],
  },
};

const meta = {
  schemaVersion: '1.0.0',
  displayName: '客户服务 3（模板 35 · citizenM）',
  description:
    '预订确认：紫色头图、入住退房黑卡、预订/附加明细表、App 推广、客服条与页脚。图源 Pexels，图标 jsDelivr。',
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
      label: '客户服务 3（模板 35）',
      description: 'citizenM London Shoreditch 预订确认 — 按设计图手工还原',
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
