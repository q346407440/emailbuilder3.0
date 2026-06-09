/** 由 mother 日志派生的 helpers 片段（勿手改 ${...} 转义）。 */
export const MJS_MOTHER_COLORS_STUB = `const COLORS = {
  primary: '#111111',
  secondary: '#CCCCCC',
  surface: '#F6F6F6',
  cardBg: '#FFFFFF',
  textLight: '#888888',
  white: '#FFFFFF',
};`;

export const MJS_MOTHER_HELPERS = `function borderNone() {
  return { mode: 'unified', width: '0', style: 'solid', color: 'rgba(0,0,0,0)' };
}

function sectionShell(id, name, opts = {}) {
  const {
    bg = COLORS.surface,
    pageInline = true,
    padTop = '24px',
    padBottom = '24px',
    borderRadius = '0',
    stroke,
  } = opts;
  const border = stroke
    ? { mode: 'unified', width: stroke.width ?? '1px', style: 'solid', color: stroke.color ?? COLORS.primary }
    : borderNone();
  const padding = pageInline
    ? { mode: 'separate', top: padTop, right: '20px', bottom: padBottom, left: '20px' }
    : { mode: 'separate', top: padTop, right: '0', bottom: padBottom, left: '0' };
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '16px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'hug',
      backgroundColor: bg,
      padding,
      border,
      borderRadius: { mode: 'unified', radius: borderRadius },
    },
    children: [],
  };
}

function textBlock(id, name, content, opts = {}) {
  const {
    alignH = 'center',
    fontSize = '16px',
    color = COLORS.primary,
    bold = false,
    widthMode = 'fill',
  } = opts;
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
      decoration: 'none',
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'top' },
      widthMode,
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function buttonBlock(id, name, label, opts = {}) {
  const {
    alignH = 'center',
    bg = COLORS.secondary,
    textColor = COLORS.primary,
    fontSize = '16px',
    radius = '9999px',
    widthMode = 'hug',
    width,
    stroke,
  } = opts;
  const border = stroke
    ? {
        mode: 'unified',
        width: stroke.width ?? '1px',
        style: 'solid',
        color: stroke.color ?? textColor,
      }
    : borderNone();
  return {
    id,
    type: 'button',
    blockMeta: { blockType: 'action.button', name },
    props: {
      text: label,
      link: { href: '#', type: 'external' },
      buttonStyle: {
        fontSize,
        textColor,
        backgroundColor: bg,
        bold: false,
        italic: false,
        border,
        borderRadius: { mode: 'unified', radius },
      },
    },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: 'center' },
      widthMode,
      ...(widthMode === 'fixed' && width ? { width } : {}),
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function iconBlock(id, name, src, opts = {}) {
  const { size = '24px', color = COLORS.primary } = opts;
  return {
    id,
    type: 'icon',
    blockMeta: { blockType: 'content.icon', name },
    props: { src: src ?? '', size, color },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
  };
}

function coverImage(id, name, src, alt, height) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'fill',
      heightMode: 'fixed',
      height,
      border: borderNone(),
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

/** height 须由 buildS* 按设计图传入，助手内不写默认 px */
function barcodeImage(id, name, height) {
  return coverImage(id, name, '#', 'barcode', height);
}

function imageContainer(id, name, src, alt, height, overlayChildren, alignH, alignV) {
  return {
    id,
    type: 'image',
    blockMeta: { blockType: 'content.image', name },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'fixed',
      height,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '8px' },
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

function colorBadge(id, name, color, textColor) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '色名角标' },
    wrapperStyle: {
      widthMode: 'hug',
      heightMode: 'hug',
      backgroundColor: color,
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '9999px' },
    },
    children: [
      textBlock(\`\${id}-text\`, '角标文字', name, {
        fontSize: '12px',
        color: textColor ?? COLORS.primary,
        widthMode: 'hug',
      }),
    ],
  };
}

/** blobSize 为色块直径（宽高相同），须按设计图传入 */
function colorSwatch(id, name, color, blobSize) {
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: '色卡项' },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '8px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: \`\${id}-blob\`,
        type: 'layout',
        blockMeta: { blockType: 'layout.container', name: '色卡blob' },
        wrapperStyle: {
          widthMode: 'fixed',
          width: blobSize,
          heightMode: 'fixed',
          height: blobSize,
          backgroundColor: color,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '9999px' },
        },
        children: [],
      },
      textBlock(\`\${id}-name\`, '色卡名称', name, { fontSize: '14px', widthMode: 'hug' }),
    ],
  };
}

function gridBlock(id, name, columns, children, opts = {}) {
  const { gap = '16px', alignH = 'center', alignV = 'top' } = opts;
  return {
    id,
    type: 'grid',
    blockMeta: { blockType: 'layout.grid', name },
    props: { columns, gap, cellWidthMode: 'auto', cellHeightMode: 'content-max' },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children,
  };
}

function rowLayout(id, name, children, opts = {}) {
  const { gap = '16px', alignH = 'center', alignV = 'top' } = opts;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name },
    props: { direction: 'horizontal', gapMode: 'fixed', gap },
    wrapperStyle: {
      contentAlign: { horizontal: alignH, vertical: alignV },
      widthMode: 'fill',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children,
  };
}

/** imgWidth/imgHeight 须按设计图产品缩略图区域传入，助手内不写默认 px */
function productCard(id, cardName, productName, imageSrc, imageAlt, imgWidth, imgHeight) {
  const alt = imageAlt ?? productName;
  return {
    id,
    type: 'layout',
    blockMeta: { blockType: 'layout.container', name: cardName },
    props: { direction: 'vertical', gapMode: 'fixed', gap: '12px' },
    wrapperStyle: {
      contentAlign: { horizontal: 'center', vertical: 'top' },
      widthMode: 'hug',
      heightMode: 'hug',
      border: borderNone(),
      borderRadius: { mode: 'unified', radius: '0' },
    },
    children: [
      {
        id: \`\${id}-img\`,
        type: 'image',
        blockMeta: { blockType: 'content.image', name: \`\${productName}图\` },
        wrapperStyle: {
          contentAlign: { horizontal: 'center', vertical: 'top' },
          widthMode: 'fixed',
          width: imgWidth,
          heightMode: 'fixed',
          height: imgHeight,
          border: borderNone(),
          borderRadius: { mode: 'unified', radius: '8px' },
          backgroundImage: {
            src: imageSrc,
            alt,
            fit: 'cover',
            position: 'center',
            border: borderNone(),
            borderRadius: { mode: 'unified', radius: '8px' },
          },
        },
      },
      textBlock(\`\${id}-name\`, '产品名称', productName, { fontSize: '14px' }),
      buttonBlock(\`\${id}-cta\`, '购买按钮', 'Shop now', { fontSize: '12px', widthMode: 'hug' }),
    ],
  };
}`;

export const MJS_MOTHER_BUILD_S_STUB = `function buildS1() {
  const sec = sectionShell(\`\${P}-s1\`, '__MOTHER_MODULE_1__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s1-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}

function buildS2() {
  const sec = sectionShell(\`\${P}-s2\`, '__MOTHER_MODULE_2__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s2-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}

function buildS3() {
  const sec = sectionShell(\`\${P}-s3\`, '__MOTHER_MODULE_3__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s3-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}

function buildS4() {
  const sec = sectionShell(\`\${P}-s4\`, '__MOTHER_MODULE_4__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s4-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}

function buildS5() {
  const sec = sectionShell(\`\${P}-s5\`, '__MOTHER_MODULE_5__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s5-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}

function buildS6() {
  const sec = sectionShell(\`\${P}-s6\`, '__MOTHER_MODULE_6__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s6-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}

function buildS7() {
  const sec = sectionShell(\`\${P}-s7\`, '__MOTHER_MODULE_7__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s7-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}

function buildS8() {
  const sec = sectionShell(\`\${P}-s8\`, '__MOTHER_MODULE_8__', { bg: COLORS.surface });
  sec.children = [
    textBlock(\`\${P}-s8-placeholder\`, '占位', '__REPLACE_FROM_DESIGN__'),
  ];
  return sec;
}`;

export const MJS_MOTHER_TOKEN_PRESETS_STUB = `const tokenPresets = {
  schemaVersion: '1.0.0',
  activePresetId: 'default',
  presets: {
    default: {
      label: displayName,
      description: '__MOTHER_DESCRIPTION__',
      tokens: {
        colors: { primary: COLORS.primary, secondary: COLORS.secondary, surface: COLORS.surface },
        spacing: { section: '24px', gap: '16px', pageInline: '20px' },
        typography: { display: '36px', h1: '24px', body: '16px', caption: '12px' },
        radius: { panel: '8px', cta: '9999px' },
      },
    },
  },
  scopeSelections: {},
};`;

export const MJS_MOTHER_TEMPLATE_STUB = `const template = {
  schemaVersion: '4.0.0',
  emailId: EMAIL,
  templateId: EMAIL,
  templateVersion: 1,
  locale: '__MOTHER_LOCALE__',
  root: {
    id: \`\${P}-root\`,
    type: 'emailRoot',
    blockMeta: { blockType: 'layout.container', name: '画布根' },
    props: {
      padding: { mode: 'unified', unified: '0' },
      backgroundColor: COLORS.surface,
      width: '600px',
      border: borderNone(),
      gapMode: 'fixed',
      gap: '0',
    },
    wrapperStyle: { widthMode: 'fill', heightMode: 'hug' },
    children: [buildS1(), buildS2(), buildS3(), buildS4(), buildS5(), buildS6(), buildS7(), buildS8()],
  },
};`;
