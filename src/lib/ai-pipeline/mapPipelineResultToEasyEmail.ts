import type { EmailBlock, EmailTemplate } from "../../types/email";
import { isThemeRef } from "../../types/themeRef";
import { EMAIL_TEMPLATE_SCHEMA_VERSION } from "../../types/email";
import type { TokenPresets } from "../../types/tokenPreset";
import { layoutVariantBlockIdPrefix, buildDefaultTokenPresets } from "../scaffoldNewEmail";
import { normalizeTokenPresetTokens } from "../../token-preset-contract/standard-keys";
import { AI_PIPELINE_PLACEHOLDER_IMAGE_URL } from "./constants";
import {
  resolveImageContainerPreset,
} from "./compile/imageContainerPresets";
import { completeLoweringWrapperDimensions } from "./compile/loweringWrapperDefaults";
import {
  ctaBorderRadius,
  isColoredWrapperBackground,
  resolveImageBorderRadiusFromB1,
  zeroBorderRadius,
} from "./compile/blockRadiusLowering";
import { resolveSectionRootPadding } from "./compile/sectionRootSpacing";
import {
  resolveBlockMetaDisplayName,
  resolveSectionShellDisplayName,
} from "./compile/resolveBlockMetaName";
import type { ImageSlotRole } from "../../layout-variant-ai-contract/compactIr";
import {
  COMPACT_KIND_TO_RUNTIME_TYPE,
  EMAIL_ROOT_FIXED_WIDTH,
} from "./compactTypes";
import {
  applyStyleKeysToBlockFields,
  attachAgentThemeBindingsToBlock,
  resolveFontSizeOrBodyDefault,
  coerceBoolean,
} from "./literalStyleExpand";
import { normalizeWrapperContentAlign } from "./applySectionContentAlign";
import { parsePxValue } from "./b1StyleTierPresets";
import {
  createLoweringSemanticStats,
  defaultBodyTextColor,
  defaultCtaTextOnPrimary,
  type LoweringSemanticStats,
} from "./semanticStyleDefaults";
import { listImageSlots } from "./groundingImage";
import type {
  AssetManifest,
  CompactNode,
  MapPipelineInput,
  MapPipelineOutput,
  MergedEmailDraft,
  TextExtractParagraph,
} from "./types";

type BlockAcc = {
  blocks: Record<string, EmailBlock>;
  blockMeta: NonNullable<EmailTemplate["blockMeta"]>;
};

function defaultShellBorder() {
  return {
    mode: "unified" as const,
    width: "0",
    style: "solid" as const,
    color: "rgba(0,0,0,0)",
  };
}

function defaultBorderRadius() {
  return zeroBorderRadius();
}

function applyColoredContainerBorderRadius(
  wrapperStyle: Record<string, unknown>,
  draft: MergedEmailDraft
): void {
  const panel = draft.styleTokens.radius.panel;
  if (parsePxValue(panel) <= 0) return;
  if (
    !isColoredWrapperBackground(
      wrapperStyle.backgroundColor,
      draft.canvas.contentSurface,
      draft.styleTokens.colors.surface
    )
  ) {
    return;
  }
  wrapperStyle.borderRadius = { mode: "unified", radius: panel };
}

function findTextParagraph(
  draft: MergedEmailDraft,
  textId: string | undefined
): TextExtractParagraph | undefined {
  if (!textId) return undefined;
  for (const region of draft.textExtract.regions) {
    const p = region.paragraphs.find((x) => x.textId === textId);
    if (p) return p;
  }
  return undefined;
}

function runsToPlainText(p: TextExtractParagraph): string {
  return p.textBody.paragraphs
    .map((para) => para.runs.map((r) => r.text).join(""))
    .join("\n");
}

function wrapperFromCompact(
  kind: CompactNode["kind"],
  wrapper: CompactNode["wrapper"] | undefined,
  tokens: MergedEmailDraft["styleTokens"]
): Record<string, unknown> {
  const dims = completeLoweringWrapperDimensions(kind, wrapper);
  const ws: Record<string, unknown> = {
    contentAlign: normalizeWrapperContentAlign(wrapper?.contentAlign),
    widthMode: dims.widthMode,
    heightMode: dims.heightMode,
    border: defaultShellBorder(),
    borderRadius: defaultBorderRadius(),
  };
  if (dims.width) ws.width = dims.width;
  if (dims.height) ws.height = dims.height;
  if (wrapper?.backgroundColor) ws.backgroundColor = wrapper.backgroundColor;
  if (wrapper?.padding) {
    const pad = wrapper.padding;
    if (pad.mode === "separate") {
      ws.padding = {
        mode: "separate",
        top: pad.top ?? "0",
        right: pad.right ?? "0",
        bottom: pad.bottom ?? "0",
        left: pad.left ?? "0",
      };
    } else if (pad.mode === "unified" && (pad.unified || pad.value)) {
      ws.padding = { mode: "unified", unified: pad.unified ?? pad.value };
    }
  }
  void tokens;
  return ws;
}

function mapCompactNode(
  node: CompactNode,
  draft: MergedEmailDraft,
  acc: BlockAcc,
  idPrefix: string,
  parentId: string,
  seqRef: { n: number },
  sectionId: string,
  loweringSemantic: LoweringSemanticStats
): string | null {
  const blockId = `${idPrefix}-${sectionId}-b${seqRef.n++}`;
  const runtimeType = COMPACT_KIND_TO_RUNTIME_TYPE[node.kind];
  const textPara = findTextParagraph(draft, node.props?.textId as string | undefined);
  let imageSlotRole: ImageSlotRole | undefined;

  let props: Record<string, unknown> = { ...(node.props ?? {}) };
  let wrapperStyle = wrapperFromCompact(node.kind, node.wrapper, draft.styleTokens);

  const styled = applyStyleKeysToBlockFields(node.styleKeys, draft.styleTokens, {
    props,
    wrapperStyle,
  });
  props = styled.props;
  wrapperStyle = styled.wrapperStyle;
  const agentStyleBoundPaths = styled.agentBoundPaths;

  const childIds: string[] = [];
  for (const child of node.children ?? []) {
    const childId = mapCompactNode(
      child,
      draft,
      acc,
      idPrefix,
      blockId,
      seqRef,
      sectionId,
      loweringSemantic
    );
    if (childId) childIds.push(childId);
  }

  if (node.kind === "content.icon") {
    const iconRef = props.iconRef as string | undefined;
    const icon = iconRef ? draft.assetManifest.icons[iconRef] : undefined;
    if (!icon?.src) return null;
  }

  switch (node.kind) {
    case "layout.container": {
      props = {
        direction: props.direction ?? "vertical",
        gapMode: props.gapMode ?? "fixed",
        gap: props.gap ?? draft.styleTokens.spacing.gap,
        ...props,
      };
      applyColoredContainerBorderRadius(wrapperStyle, draft);
      break;
    }
    case "layout.grid": {
      const cellHeightMode = props.cellHeightMode === "fixed" ? "fixed" : "content-max";
      props = {
        columns: props.columns ?? props.columnsPerRow ?? 2,
        gap: props.gap ?? draft.styleTokens.spacing.gap,
        cellWidthMode: props.cellWidthMode ?? "auto",
        cellHeightMode,
        ...(cellHeightMode === "fixed"
          ? {
              cellHeight:
                typeof props.cellHeight === "string" && props.cellHeight.trim()
                  ? props.cellHeight.trim()
                  : "120px",
            }
          : {}),
      };
      delete props.columnsPerRow;
      break;
    }
    case "content.text": {
      const role = textPara?.role;
      const runBold =
        textPara?.textBody.paragraphs.some((p) => p.runs.some((r) => r.bold)) ?? false;
      const explicitColor =
        typeof props.color === "string" && props.color.trim()
          ? props.color.trim()
          : isThemeRef(props.color)
            ? props.color
            : undefined;
      if (!explicitColor) loweringSemantic.textColorBodyDefault += 1;
      props = {
        textBody: textPara?.textBody ?? {
          paragraphs: [{ runs: [{ text: "" }] }],
        },
        fontSize: isThemeRef(props.fontSize)
          ? props.fontSize
          : resolveFontSizeOrBodyDefault(props.fontSize, draft.styleTokens),
        color: explicitColor ?? defaultBodyTextColor(draft.styleTokens),
        bold: coerceBoolean(props.bold, runBold),
        italic: coerceBoolean(props.italic, false),
        decoration: coerceBoolean(props.decoration, "none"),
      };
      break;
    }
    case "content.image": {
      const ref = node.wrapper?.backgroundImageRef;
      if (ref) {
        const inManifest = Boolean(ref && draft.assetManifest.images[ref]);
        const section = draft.grounding.sections.find((s) => s.sectionId === sectionId);
        const knownSlot = section
          ? listImageSlots(section).some((s) => s.slotId === ref)
          : false;
        if (!inManifest && !knownSlot) return null;
      }
      const img = ref ? draft.assetManifest.images[ref] : undefined;
      const section = draft.grounding.sections.find((s) => s.sectionId === sectionId);
      const slotSpec = section ? listImageSlots(section).find((s) => s.slotId === ref) : undefined;
      imageSlotRole = slotSpec?.role;
      const imagePreset = resolveImageContainerPreset({
        role: slotSpec?.role,
        layoutTier: slotSpec?.layoutTier,
        containerHeight: slotSpec?.containerHeight,
        cardImageTier: section?.layoutHints?.cardImageTier,
        sectionHasOverlay: section?.hasOverlay,
      });
      if (imagePreset.height) {
        wrapperStyle.height = imagePreset.height;
        wrapperStyle.heightMode = imagePreset.heightMode;
      }
      if (imagePreset.width) {
        wrapperStyle.width = imagePreset.width;
        wrapperStyle.widthMode = imagePreset.widthMode;
      }
      const imageUrl = img?.url ?? AI_PIPELINE_PLACEHOLDER_IMAGE_URL;
      const imageRadius = resolveImageBorderRadiusFromB1(draft.styleTokens.radius.panel, {
        role: slotSpec?.role,
        section,
      });
      wrapperStyle.backgroundImage = {
        src: imageUrl,
        alt: img?.alt ?? slotSpec?.imageQuery ?? section?.imageQuery ?? "",
        fit: imagePreset.backgroundImageFit,
        position: img?.position ?? "center",
        border: defaultShellBorder(),
        borderRadius: imageRadius,
      };
      if (parsePxValue(imageRadius.radius) > 0) {
        wrapperStyle.borderRadius = imageRadius;
      }
      props = {
        direction: props.direction ?? "vertical",
        gapMode: props.gapMode ?? "fixed",
        gap: props.gap ?? draft.styleTokens.spacing.gap,
      };
      break;
    }
    case "action.button": {
      const label = textPara ? runsToPlainText(textPara) : String(props.text ?? "按钮");
      let styledButtonStyle =
        (props.buttonStyle as Record<string, unknown> | undefined) ?? {};

      const wrapperBg = wrapperStyle.backgroundColor;
      if (wrapperBg && !styledButtonStyle.backgroundColor) {
        styledButtonStyle = { ...styledButtonStyle, backgroundColor: wrapperBg };
      }
      if (styledButtonStyle.textColor == null && typeof props.color === "string") {
        styledButtonStyle = { ...styledButtonStyle, textColor: props.color };
      }

      const bg =
        isThemeRef(styledButtonStyle.backgroundColor)
          ? styledButtonStyle.backgroundColor
          : typeof styledButtonStyle.backgroundColor === "string" &&
              styledButtonStyle.backgroundColor.trim()
            ? styledButtonStyle.backgroundColor.trim()
            : draft.styleTokens.colors.primary;
      const explicitBtnText =
        typeof styledButtonStyle.textColor === "string" && styledButtonStyle.textColor.trim()
          ? styledButtonStyle.textColor.trim()
          : isThemeRef(styledButtonStyle.textColor)
            ? styledButtonStyle.textColor
            : undefined;
      if (!explicitBtnText) loweringSemantic.buttonTextColorSemanticDefault += 1;

      props = {
        text: label,
        link: props.link ?? "",
        buttonStyle: {
          widthMode: "hug",
          backgroundColor: bg,
          textColor:
            explicitBtnText ??
            defaultCtaTextOnPrimary(
              typeof bg === "string" ? bg : draft.styleTokens.colors.primary
            ),
          fontSize: styledButtonStyle.fontSize ?? draft.styleTokens.typography.body,
          border: {
            mode: "unified",
            width: "0",
            style: "solid",
            color: "rgba(0,0,0,0)",
          },
          borderRadius: ctaBorderRadius(draft.styleTokens.radius.cta),
          bold: coerceBoolean(props.bold, false),
          italic: coerceBoolean(props.italic, false),
        },
      };
      wrapperStyle = {
        ...wrapperStyle,
        widthMode: wrapperStyle.widthMode === "fill" ? "fill" : "hug",
        heightMode: wrapperStyle.heightMode ?? "hug",
      };
      delete wrapperStyle.backgroundColor;
      break;
    }
    case "content.icon": {
      const iconRef = (node.props?.iconRef ?? props.iconRef) as string | undefined;
      const icon = iconRef ? draft.assetManifest.icons[iconRef] : undefined;
      props = {
        src: icon!.src,
        color: props.color ?? icon!.colorHex,
        size: props.size ?? "24px",
        link: props.link ?? "",
      };
      delete props.iconRef;
      break;
    }
    case "content.divider": {
      props = {
        color: props.color ?? draft.styleTokens.colors.secondary,
        lineWidthMode: props.lineWidthMode ?? "fill",
        height: props.height ?? "1px",
      };
      break;
    }
    default:
      break;
  }

  const block: EmailBlock = {
    id: blockId,
    type: runtimeType,
    parentId,
    children: childIds,
    props,
    wrapperStyle: wrapperStyle as EmailBlock["wrapperStyle"],
    bindings: {},
  };

  attachAgentThemeBindingsToBlock(block, agentStyleBoundPaths);

  acc.blocks[blockId] = block;
  acc.blockMeta[blockId] = {
    blockType: node.kind,
    name: resolveBlockMetaDisplayName({
      kind: node.kind,
      label: node.label,
      textRole: textPara?.role,
      imageSlotRole,
    }),
  };

  return blockId;
}

/** 阶段 E：唯一落盘映射器。 */
export function mapPipelineResultToEasyEmail(draft: MapPipelineInput): MapPipelineOutput {
  const loweringSemantic = createLoweringSemanticStats();
  const idPrefix = layoutVariantBlockIdPrefix(draft.emailKey, draft.layoutVariantId);
  const rootId = `${idPrefix}-root`;
  const templateId =
    draft.layoutVariantId === "default"
      ? draft.emailKey
      : `${draft.emailKey}-${draft.layoutVariantId}`;

  const acc: BlockAcc = { blocks: {}, blockMeta: {} };
  const sectionBlockIds: string[] = [];
  const groundingById = new Map(draft.grounding.sections.map((s) => [s.sectionId, s]));

  for (const section of draft.sections) {
    const seqRef = { n: 0 };
    const sectionShellId = `${idPrefix}-${section.sectionId}-sec`;
    const groundingSection = groundingById.get(section.sectionId);
    const orderIndex = draft.grounding.order.indexOf(section.sectionId);

    const innerRootId = mapCompactNode(
      section.root,
      draft,
      acc,
      idPrefix,
      sectionShellId,
      seqRef,
      section.sectionId,
      loweringSemantic
    );

    if (!innerRootId) continue;

    const shellPadding =
      groundingSection != null
        ? resolveSectionRootPadding({
            section: groundingSection,
            orderIndex: orderIndex >= 0 ? orderIndex : 0,
            spacing: draft.styleTokens.spacing,
          })
        : {
            mode: "separate" as const,
            top: "0",
            right: draft.styleTokens.spacing.pageInline,
            bottom: draft.styleTokens.spacing.section,
            left: draft.styleTokens.spacing.pageInline,
          };

    acc.blocks[sectionShellId] = {
      id: sectionShellId,
      type: "layout",
      parentId: rootId,
      children: [innerRootId],
      wrapperStyle: {
        contentAlign: { horizontal: "center", vertical: "top" },
        widthMode: "fill",
        heightMode: "hug",
        border: defaultShellBorder(),
        borderRadius: defaultBorderRadius(),
        padding: shellPadding,
      },
      props: {
        direction: "vertical",
        gapMode: "fixed",
        gap: "0",
      },
      bindings: {},
    };
    acc.blockMeta[sectionShellId] = {
      blockType: "layout.container",
      name: resolveSectionShellDisplayName(
        groundingSection?.name ?? "",
        section.sectionId
      ),
    };

    const innerBlock = acc.blocks[innerRootId];
    if (innerBlock) {
      innerBlock.parentId = sectionShellId;
    }
    sectionBlockIds.push(sectionShellId);
  }

  acc.blocks[rootId] = {
    id: rootId,
    type: "emailRoot",
    parentId: null,
    children: sectionBlockIds,
    wrapperStyle: { widthMode: "fill", heightMode: "hug" },
    props: {
      // B1 emailBackground = 邮件主体底色 → emailRoot.props.backgroundColor（非禁止的 outerBackgroundColor / 工作区灰）
      backgroundColor: draft.canvas.emailBackground,
      width: EMAIL_ROOT_FIXED_WIDTH,
      padding: { mode: "unified", unified: "0" },
      border: defaultShellBorder(),
      gapMode: "fixed",
      gap: "0",
    },
    bindings: {},
  };
  acc.blockMeta[rootId] = { blockType: "layout.container", name: "画布根" };

  const template: EmailTemplate = {
    schemaVersion: EMAIL_TEMPLATE_SCHEMA_VERSION,
    emailId: draft.emailKey,
    templateId,
    templateVersion: 1,
    locale: "zh-CN",
    rootBlockId: rootId,
    blockMeta: acc.blockMeta,
    blocks: acc.blocks,
  };

  const shell = buildDefaultTokenPresets();
  const tokenPresets: TokenPresets = {
    ...shell,
    presets: {
      ...shell.presets,
      default: {
        ...shell.presets.default,
        tokens: normalizeTokenPresetTokens(
          structuredClone(draft.styleTokens) as TokenPresets["presets"][string]["tokens"]
        ),
      },
    },
  };

  return { template, tokenPresets, loweringSemantic };
}

export function buildAssetManifestFromResolved(
  images: Array<{ slotId: string; url: string; alt?: string }>,
  icons: Array<{ id: string; src: string; colorHex: string; tintable?: boolean }>
): AssetManifest {
  const manifest: AssetManifest = { images: {}, icons: {} };
  for (const img of images) {
    manifest.images[img.slotId] = {
      url: img.url,
      alt: img.alt,
      fit: "cover",
      position: "center",
    };
  }
  for (const icon of icons) {
    manifest.icons[icon.id] = {
      src: icon.src,
      colorHex: icon.colorHex,
      tintable: icon.tintable,
    };
  }
  return manifest;
}
