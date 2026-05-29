import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { EmailTemplate } from "../types/email";
import { blockTypeLabel } from "../lib/blockTypeLabel";
import { isMaterializedRepeatRowBlockId, sourceBlockIdFromRepeatClone } from "../lib/repeatRegion";
import {
  buildRepeatRegionTreeTagIndex,
  repeatTreeTagForBlock,
  repeatTreeTagPalette,
  repeatTreeTagRoleLabel,
  repeatTreeTagTitle,
  type RepeatTreeBlockTag,
} from "../lib/repeatRegionTreeTags";
import { ShopSecondaryButton } from "./ui/ShopFormControls";

type Props = {
  template: EmailTemplate;
  selectedBlockId: string | null;
  syncNonce: number;
  onSelect: (id: string | null) => void;
  startBlockId?: string;
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
  const label =
    tag.role === "repeat-item" && tag.itemIndex !== undefined
      ? `${repeatTreeTagRoleLabel(tag.role)}${tag.itemIndex + 1}`
      : repeatTreeTagRoleLabel(tag.role);

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
  materializedStatic,
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
  materializedStatic: boolean;
  template: EmailTemplate;
}) {
  const stripePalette = repeatGroupStripe ? repeatTreeTagPalette(repeatGroupStripe.colorIndex) : null;

  return (
    <div
      className={`block-tree__row ${selected ? "block-tree__row--selected" : ""} ${
        repeatGroupStripe ? "block-tree__row--repeat-group" : ""
      }${materializedStatic ? " block-tree__row--materialized" : ""}`}
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
          {materializedStatic ? (
            <span className="block-tree__materialized-tag" title="解除绑定后的物化静态行，重绑列表后将恢复为循环">
              静态
            </span>
          ) : null}
        </span>
      </ShopSecondaryButton>
    </div>
  );
}

export function BlockTree({
  template,
  selectedBlockId,
  syncNonce,
  onSelect,
  startBlockId,
  variant = "panel",
  title = "区块结构",
}: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const repeatTagIndex = useMemo(() => buildRepeatRegionTreeTagIndex(template), [template]);

  const defaultOpen = useMemo(() => {
    const o: Record<string, boolean> = {};
    for (const id of Object.keys(template.blocks)) o[id] = true;
    return o;
  }, [template]);

  const isOpen = (id: string) => open[id] ?? defaultOpen[id] ?? true;

  function toggle(id: string) {
    setOpen((prev) => ({ ...defaultOpen, ...prev, [id]: !isOpen(id) }));
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (selectedBlockId !== null) {
      const ancestors: string[] = [];
      let cur = template.blocks[selectedBlockId];
      while (cur?.parentId) {
        ancestors.push(cur.parentId);
        cur = template.blocks[cur.parentId];
      }
      if (ancestors.length) {
        setOpen((prev) => {
          const next = { ...prev };
          for (const aid of ancestors) next[aid] = true;
          return next;
        });
      }
    }

    const id = selectedBlockId ?? startBlockId ?? template.rootBlockId;
    const safe = typeof CSS !== "undefined" && "escape" in CSS ? CSS.escape(id) : id.replace(/"/g, '\\"');

    const timer = window.setTimeout(() => {
      const scrollToRow = () => {
        const row = scrollRef.current?.querySelector(`[data-block-tree-row="${safe}"]`);
        row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      scrollToRow();
      requestAnimationFrame(() => requestAnimationFrame(scrollToRow));
    }, 120);
    return () => window.clearTimeout(timer);
  }, [selectedBlockId, syncNonce, template.rootBlockId, startBlockId]); // eslint-disable-line react-hooks/exhaustive-deps

  function renderNode(id: string, depth: number): ReactNode {
    const b = template.blocks[id];
    if (!b) return null;
    const blockName = template.blockMeta?.[id]?.name?.trim();
    const label = blockName
      ? `${blockName} · ${blockTypeLabel(b.type)}`
      : `${blockTypeLabel(b.type)} · ${id.slice(0, 8)}`;
    const hasKids = b.children.length > 0;
    const selected = selectedBlockId === id || selectedBlockId === sourceBlockIdFromRepeatClone(id);
    const handleClick = () => {
      if (b.type === "emailRoot") onSelect(null);
      else onSelect(id);
    };

    const directTag = repeatTagIndex.byBlockId.get(id) ?? null;
    const groupTag = repeatTreeTagForBlock(repeatTagIndex, template, id);
    const repeatTag = directTag?.role === "repeat-item" ? directTag : null;
    const repeatGroupStripe =
      directTag?.role === "host"
        ? directTag
        : groupTag && groupTag.role !== "host"
          ? groupTag
          : null;
    const materializedStatic = !repeatTag && isMaterializedRepeatRowBlockId(id, template);

    return (
      <div key={id}>
        <Row
          blockTreeRowId={sourceBlockIdFromRepeatClone(id)}
          depth={depth}
          label={label}
          selected={b.type === "emailRoot" ? selectedBlockId === null : selected}
          onClick={handleClick}
          hasChildren={hasKids}
          open={isOpen(id)}
          onToggle={() => toggle(id)}
          repeatTag={repeatTag}
          repeatGroupStripe={repeatGroupStripe}
          materializedStatic={materializedStatic}
          template={template}
        />
        {hasKids && isOpen(id) ? b.children.map((cid) => renderNode(cid, depth + 1)) : null}
      </div>
    );
  }

  const treeRootId = startBlockId ?? template.rootBlockId;
  const treeSubtreeIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    const visit = (blockId: string) => {
      if (seen.has(blockId)) return;
      const block = template.blocks[blockId];
      if (!block) return;
      seen.add(blockId);
      ids.push(blockId);
      block.children.forEach(visit);
    };
    visit(treeRootId);
    return ids;
  }, [template, treeRootId]);

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
      next[treeRootId] = true;
      return next;
    });
  };

  const treeBody = (
    <div ref={scrollRef} className="block-tree__scroll">
      {renderNode(treeRootId, 0)}
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
