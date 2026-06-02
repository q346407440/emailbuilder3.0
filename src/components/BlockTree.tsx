import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { VirtualBlockRef } from "../repeat-binding-contract";
import type { EmailTemplate } from "../types/email";
import type { RepeatPreviewModel } from "../repeat-binding-contract";
import { blockTypeLabel } from "../lib/blockTypeLabel";
import {
  isRepeatExpansionGroupSelected,
  refToStableKey,
  resolvePhysicalBlockId,
} from "../repeat-runtime";
import {
  buildRepeatRegionTreeTagIndex,
  formatRepeatItemDisplayName,
  repeatTreeTagForBlock,
  repeatTreeTagPalette,
  repeatTreeTagRoleLabel,
  repeatTreeTagTitle,
  repeatTreeRowDisplayTag,
  type RepeatTreeBlockTag,
} from "../lib/repeatRegionTreeTags";
import { ShopSecondaryButton } from "./ui/ShopFormControls";

type Props = {
  /** 磁盘 template（repeat tag 索引） */
  sourceTemplate: EmailTemplate;
  previewModel: RepeatPreviewModel;
  selectedBlockRef: VirtualBlockRef | null;
  syncNonce: number;
  onSelect: (ref: VirtualBlockRef | null) => void;
  variant?: "panel" | "embedded";
  title?: string;
};

function RepeatTreeTag({ template, tag }: { template: EmailTemplate; tag: RepeatTreeBlockTag }) {
  const palette = repeatTreeTagPalette(tag.colorIndex);
  const style: CSSProperties = {
    borderColor: palette.border,
    backgroundColor: palette.background,
    color: palette.text,
  };
  const label = repeatTreeTagRoleLabel(tag.role);

  return (
    <span className="block-tree__repeat-tag" style={style} title={repeatTreeTagTitle(template, tag)}>
      {label}
    </span>
  );
}

function Row({
  blockTreeRowId,
  depth,
  label,
  selected,
  onClick,
  hasChildren,
  open,
  onToggle,
  repeatTag,
  repeatGroupStripe,
  template,
}: {
  blockTreeRowId: string;
  depth: number;
  label: string;
  selected: boolean;
  onClick: () => void;
  hasChildren: boolean;
  open: boolean;
  onToggle: () => void;
  repeatTag: RepeatTreeBlockTag | null;
  repeatGroupStripe: RepeatTreeBlockTag | null;
  template: EmailTemplate;
}) {
  const stripePalette = repeatGroupStripe ? repeatTreeTagPalette(repeatGroupStripe.colorIndex) : null;

  return (
    <div
      className={`block-tree__row ${selected ? "block-tree__row--selected" : ""} ${
        repeatGroupStripe ? "block-tree__row--repeat-group" : ""
      }`}
      data-block-tree-row={blockTreeRowId}
      style={{
        paddingLeft: 8 + depth * 14,
        ...(stripePalette
          ? ({ "--block-tree-repeat-stripe": stripePalette.border } as CSSProperties)
          : undefined),
      }}
    >
      {hasChildren ? (
        <ShopSecondaryButton
          className="block-tree__toggle"
          onClick={onToggle}
          aria-label={open ? "折叠子节点" : "展开子节点"}
        >
          {open ? "▼" : "▶"}
        </ShopSecondaryButton>
      ) : (
        <span className="block-tree__toggle block-tree__toggle--spacer" />
      )}
      <ShopSecondaryButton className="block-tree__label" onClick={onClick}>
        <span className="block-tree__label-inner">
          <span className="block-tree__label-text">{label}</span>
          {repeatTag ? <RepeatTreeTag template={template} tag={repeatTag} /> : null}
        </span>
      </ShopSecondaryButton>
    </div>
  );
}

function repeatTagForRef(
  ref: VirtualBlockRef,
  tagIndex: ReturnType<typeof buildRepeatRegionTreeTagIndex>,
  template: EmailTemplate
): RepeatTreeBlockTag | null {
  if (ref.kind === "repeat-item") {
    const host = tagIndex.hosts.find((h) => h.hostId === ref.hostId);
    if (!host) return null;
    return {
      groupKey: ref.hostId,
      role: "repeat-item",
      colorIndex: host.colorIndex,
      slotId: host.slotId,
      slotLabel: host.slotLabel,
      prototypeChildIds: host.prototypeChildIds,
      itemIndex: ref.itemIndex,
    };
  }
  return tagIndex.byBlockId.get(ref.blockId) ?? repeatTreeTagForBlock(tagIndex, template, ref.blockId);
}

export function BlockTree({
  sourceTemplate,
  previewModel,
  selectedBlockRef,
  syncNonce,
  onSelect,
  variant = "panel",
  title = "区块结构",
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const repeatTagIndex = useMemo(
    () => buildRepeatRegionTreeTagIndex(sourceTemplate),
    [sourceTemplate]
  );
  const blockMeta = useMemo(
    () => previewModelToBlockMeta(previewModel, sourceTemplate),
    [previewModel, sourceTemplate]
  );

  const defaultOpen = useMemo(() => {
    const o: Record<string, boolean> = {};
    const visit = (node: (typeof previewModel)["root"]) => {
      o[node.block.id] = true;
      node.children.forEach(visit);
    };
    visit(previewModel.root);
    return o;
  }, [previewModel]);

  const isOpen = (id: string) => open[id] ?? defaultOpen[id] ?? true;

  function toggle(id: string) {
    setOpen((prev) => ({ ...defaultOpen, ...prev, [id]: !isOpen(id) }));
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (selectedBlockRef !== null) {
      const ancestors: string[] = [];
      let found = false;
      const walk = (node: (typeof previewModel)["root"], trail: string[]): boolean => {
        if (isRepeatExpansionGroupSelected(selectedBlockRef, node.ref)) {
          ancestors.push(...trail);
          found = true;
          return true;
        }
        for (const child of node.children) {
          if (walk(child, [...trail, node.block.id])) return true;
        }
        return false;
      };
      walk(previewModel.root, []);
      if (found && ancestors.length) {
        setOpen((prev) => {
          const next = { ...prev };
          for (const aid of ancestors) next[aid] = true;
          return next;
        });
      }
    }

    const rowId = selectedBlockRef ? refToStableKey(selectedBlockRef) : previewModel.root.block.id;
    const safe = typeof CSS !== "undefined" && "escape" in CSS ? CSS.escape(rowId) : rowId.replace(/"/g, '\\"');

    const timer = window.setTimeout(() => {
      const scrollToRow = () => {
        const row = scrollRef.current?.querySelector(`[data-block-tree-row="${safe}"]`);
        row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      scrollToRow();
      requestAnimationFrame(() => requestAnimationFrame(scrollToRow));
    }, 120);
    return () => window.clearTimeout(timer);
  }, [selectedBlockRef, syncNonce, previewModel]); // eslint-disable-line react-hooks/exhaustive-deps

  function renderNode(node: (typeof previewModel)["root"], depth: number): ReactNode {
    const { ref, block, children } = node;
    const blockId = block.id;
    const physicalId = resolvePhysicalBlockId(ref);
    const blockName = blockMeta[blockId]?.name?.trim();
    const label = blockName
      ? `${blockName} · ${blockTypeLabel(block.type)}`
      : `${blockTypeLabel(block.type)} · ${physicalId.slice(0, 8)}`;
    const hasKids = children.length > 0;
    const selected =
      selectedBlockRef === null
        ? block.type === "emailRoot"
        : isRepeatExpansionGroupSelected(selectedBlockRef, ref);
    const handleClick = () => {
      if (block.type === "emailRoot") onSelect(null);
      else onSelect(ref);
    };

    const directTag = repeatTagForRef(ref, repeatTagIndex, sourceTemplate);
    const groupTag =
      ref.kind === "physical"
        ? repeatTreeTagForBlock(repeatTagIndex, sourceTemplate, ref.blockId)
        : directTag;
    const repeatTag = repeatTreeRowDisplayTag(ref, directTag, repeatTagIndex);
    const repeatGroupStripe =
      directTag?.role === "host"
        ? directTag
        : groupTag && groupTag.role !== "host"
          ? groupTag
          : null;

    return (
      <div key={blockId}>
        <Row
          blockTreeRowId={blockId}
          depth={depth}
          label={label}
          selected={selected}
          onClick={handleClick}
          hasChildren={hasKids}
          open={isOpen(blockId)}
          onToggle={() => toggle(blockId)}
          repeatTag={repeatTag}
          repeatGroupStripe={repeatGroupStripe}
          template={sourceTemplate}
        />
        {hasKids && isOpen(blockId)
          ? children.map((child) => renderNode(child, depth + 1))
          : null}
      </div>
    );
  }

  const treeSubtreeIds = useMemo(() => {
    const ids: string[] = [];
    const visit = (node: (typeof previewModel)["root"]) => {
      ids.push(node.block.id);
      node.children.forEach(visit);
    };
    visit(previewModel.root);
    return ids;
  }, [previewModel]);

  const expandAllNodes = () => {
    setOpen((prev) => {
      const next = { ...defaultOpen, ...prev };
      for (const id of treeSubtreeIds) next[id] = true;
      return next;
    });
  };

  const collapseToFirstLevel = () => {
    setOpen((prev) => {
      const next = { ...defaultOpen, ...prev };
      for (const id of treeSubtreeIds) next[id] = false;
      next[previewModel.root.block.id] = true;
      return next;
    });
  };

  const treeBody = (
    <div ref={scrollRef} className="block-tree__scroll">
      {renderNode(previewModel.root, 0)}
    </div>
  );

  if (variant === "embedded") {
    return treeBody;
  }

  return (
    <aside className="block-tree">
      {title ? (
        <div className="block-tree__title">
          <span className="block-tree__title-text">{title}</span>
          <div className="block-tree__title-actions" role="group" aria-label="区块树操作">
            <button type="button" className="resource-text-action block-tree__title-action" onClick={expandAllNodes}>
              全部展开
            </button>
            <button type="button" className="resource-text-action block-tree__title-action" onClick={collapseToFirstLevel}>
              折叠至首层
            </button>
          </div>
        </div>
      ) : null}
      {treeBody}
    </aside>
  );
}

function previewModelToBlockMeta(
  model: RepeatPreviewModel,
  sourceTemplate: EmailTemplate
): NonNullable<EmailTemplate["blockMeta"]> {
  const meta: NonNullable<EmailTemplate["blockMeta"]> = {};
  const visit = (node: (typeof model)["root"]) => {
    const physicalId = resolvePhysicalBlockId(node.ref);
    const src = sourceTemplate.blockMeta?.[physicalId];
    if (src) {
      meta[node.block.id] =
        node.ref.kind === "repeat-item" && src.name
          ? { ...src, name: formatRepeatItemDisplayName(src.name, node.ref.itemIndex) }
          : src;
    }
    node.children.forEach(visit);
  };
  visit(model.root);
  return meta;
}
