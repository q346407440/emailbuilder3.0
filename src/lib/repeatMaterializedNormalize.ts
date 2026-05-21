import type { EmailTemplate, RepeatFieldMapping } from "../types/email";
import type { UnifiedRepeatBindPlan } from "./repeatNestedBinding";
import {
  buildRepeatPrototypeIdSet,
  isMaterializedRepeatRowBlockId,
  isRepeatHostBlock,
  parseMaterializedRepeatRowBlockId,
  resolveMaterializedRowToPrototypeId,
} from "./repeatRegion";

/** 折叠后映射目标：物化 id（如 main-img-1）对齐到已存在的原型块（main-img） */
function remapFieldMappingTargetBlockId(
  targetBlockId: string,
  template: EmailTemplate,
  prototypeSet: Set<string>
): string {
  if (template.blocks[targetBlockId]) return targetBlockId;

  const resolved = resolveMaterializedRowToPrototypeId(targetBlockId, prototypeSet, template);
  if (template.blocks[resolved]) return resolved;

  const suffixMatch = targetBlockId.match(/^(.+)-(\d+)$/);
  const prototypeCandidate = suffixMatch?.[1];
  if (prototypeCandidate && template.blocks[prototypeCandidate]) {
    return prototypeCandidate;
  }

  return resolved;
}

/** 物化态重绑：将 fieldMappings 的 targetBlockId 与行模板归一化后的原型 id 对齐 */
export function remapRepeatFieldMappingTargets(
  mappings: RepeatFieldMapping[] | undefined,
  template: EmailTemplate,
  prototypeSet?: Set<string>
): RepeatFieldMapping[] {
  if (!mappings?.length) return [];
  const set = prototypeSet ?? buildRepeatPrototypeIdSet(template);
  return mappings.map((mapping) => {
    const targetBlockId = remapFieldMappingTargetBlockId(
      mapping.targetBlockId,
      template,
      set
    );
    if (targetBlockId === mapping.targetBlockId) return mapping;
    return {
      ...mapping,
      targetBlockId,
      id: `${targetBlockId}.${mapping.targetBindPath}:${mapping.sourcePath}`,
    };
  });
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function collectSubtreeBlockIds(template: EmailTemplate, rootIds: string[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const visit = (blockId: string) => {
    if (seen.has(blockId)) return;
    const block = template.blocks[blockId];
    if (!block) return;
    seen.add(blockId);
    ids.push(blockId);
    for (const childId of block.children ?? []) visit(childId);
  };
  for (const rootId of rootIds) visit(rootId);
  return ids;
}

function resolveParentIdForCollapse(
  materializedId: string,
  materializedRootId: string,
  parentHostId: string,
  skipIds: Set<string>,
  idMap: Map<string, string>,
  blocks: EmailTemplate["blocks"]
): string | undefined {
  if (materializedId === materializedRootId) return parentHostId;
  let current: string | null = blocks[materializedId]?.parentId ?? null;
  while (current) {
    if (!skipIds.has(current)) {
      return idMap.get(current);
    }
    if (current === materializedRootId) {
      return idMap.get(materializedRootId);
    }
    current = blocks[current]?.parentId ?? null;
  }
  return idMap.get(materializedRootId);
}

/** 删除父级宿主下其它物化 SPU 行，仅保留将作为行模板的那一行 */
function pruneParentHostMaterializedSiblings(
  template: EmailTemplate,
  parentHostId: string,
  keepRootId: string
): EmailTemplate {
  const next = clone(template);
  const host = next.blocks[parentHostId];
  if (!host) return template;

  for (const childId of host.children ?? []) {
    if (childId === keepRootId) continue;
    for (const id of collectSubtreeBlockIds(next, [childId])) {
      delete next.blocks[id];
      if (next.blockMeta) delete next.blockMeta[id];
    }
  }
  host.children = [keepRootId];
  return next;
}

/**
 * 将物化行子树（如 cell-1）折叠为原型行模板（cell），并去重同原型的多份物化副本（如 sku-1-1…5 → sku-1）。
 */
function blockMetaForCollapsedPrototype(
  canonicalId: string,
  materializedMeta: { blockType?: string; name?: string } | undefined,
  sourceTemplate?: EmailTemplate
): { blockType?: string; name?: string } | undefined {
  if (sourceTemplate?.blockMeta?.[canonicalId]) {
    return { ...sourceTemplate.blockMeta[canonicalId]! };
  }
  if (!materializedMeta) return undefined;
  const name = materializedMeta.name
    ?.replace(/（第\s*\d+\s*项）/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { ...materializedMeta, name: name || materializedMeta.name };
}

function collapseMaterializedRootToPrototype(
  template: EmailTemplate,
  parentHostId: string,
  materializedRootId: string,
  prototypeRootId: string,
  prototypeSet: Set<string>,
  sourceTemplate?: EmailTemplate
): EmailTemplate {
  if (materializedRootId === prototypeRootId && template.blocks[prototypeRootId]) {
    return template;
  }

  const next = clone(template);
  const subtreeIds = collectSubtreeBlockIds(next, [materializedRootId]);
  const idMap = new Map<string, string>();
  for (const id of subtreeIds) {
    idMap.set(id, resolveMaterializedRowToPrototypeId(id, prototypeSet, next));
  }

  const skipIds = new Set<string>();
  const keptCanonical = new Set<string>();
  for (const mid of subtreeIds) {
    const canonical = idMap.get(mid)!;
    if (keptCanonical.has(canonical)) {
      skipIds.add(mid);
      for (const id of collectSubtreeBlockIds(next, [mid])) skipIds.add(id);
      continue;
    }
    keptCanonical.add(canonical);
  }

  for (const mid of subtreeIds) {
    if (skipIds.has(mid)) continue;
    const canonical = idMap.get(mid)!;
    const src = next.blocks[mid];
    if (!src) continue;

    const block = clone(src);
    block.id = canonical;
    block.parentId =
      resolveParentIdForCollapse(mid, materializedRootId, parentHostId, skipIds, idMap, next.blocks) ??
      block.parentId;

    block.children = (block.children ?? [])
      .filter((cid) => !skipIds.has(cid))
      .map((cid) => idMap.get(cid))
      .filter((cid): cid is string => typeof cid === "string" && cid.length > 0)
      .filter((cid, index, arr) => arr.indexOf(cid) === index);

    next.blocks[canonical] = block;
    const meta = blockMetaForCollapsedPrototype(
      canonical,
      next.blockMeta?.[mid],
      sourceTemplate
    );
    if (meta) {
      next.blockMeta = next.blockMeta ?? {};
      next.blockMeta[canonical] = meta;
    }
  }

  for (const id of subtreeIds) {
    delete next.blocks[id];
    if (next.blockMeta) delete next.blockMeta[id];
  }

  const host = next.blocks[parentHostId];
  if (host) {
    host.children = (host.children ?? []).map((c) =>
      c === materializedRootId ? prototypeRootId : c
    );
    if (!host.children.includes(prototypeRootId)) {
      host.children = [prototypeRootId];
    }
  }

  return next;
}

function findParentRowTemplateRoot(
  template: EmailTemplate,
  parentHostId: string,
  prototypeRootId: string,
  prototypeSet: Set<string>
): { keepRootId: string; prototypeRootId: string } {
  const host = template.blocks[parentHostId];
  const children = host?.children ?? [];
  const matches = children.filter(
    (c) => resolveMaterializedRowToPrototypeId(c, prototypeSet, template) === prototypeRootId
  );
  if (matches.length > 0) {
    const sorted = [...matches].sort((a, b) => {
      const ia = parseMaterializedRepeatRowBlockId(a, prototypeSet, template)?.itemIndex ?? 0;
      const ib = parseMaterializedRepeatRowBlockId(b, prototypeSet, template)?.itemIndex ?? 0;
      return ia - ib;
    });
    return { keepRootId: sorted[0]!, prototypeRootId };
  }
  if (template.blocks[prototypeRootId]) {
    return { keepRootId: prototypeRootId, prototypeRootId };
  }
  return { keepRootId: children[0] ?? prototypeRootId, prototypeRootId };
}

/** 列表 repeat 宿主的行模板：优先 layout/grid 子块（非 strip 下第一个叶子） */
function repeatRowTemplateChildId(
  template: EmailTemplate,
  hostId: string
): string | undefined {
  const host = template.blocks[hostId];
  if (!host) return undefined;
  for (const childId of host.children ?? []) {
    const child = template.blocks[childId];
    if (child && (child.type === "layout" || child.type === "grid")) {
      return childId;
    }
  }
  return host.children?.[0];
}

/** 纠正子级 repeat：宿主应为 sku-strip，行模板应为 sku 卡（非整条 strip） */
function resolveChildRepeatBindTargets(
  template: EmailTemplate,
  plan: UnifiedRepeatBindPlan,
  prototypeSet: Set<string>
): Pick<UnifiedRepeatBindPlan, "childHostId" | "childPrototypeChildIds"> {
  let childHostId = plan.childHostId
    ? resolveMaterializedRowToPrototypeId(plan.childHostId, prototypeSet, template)
    : undefined;
  let childPrototypeChildIds = plan.childPrototypeChildIds?.map((id) =>
    resolveMaterializedRowToPrototypeId(id, prototypeSet, template)
  );

  if (!childHostId || !childPrototypeChildIds?.length) {
    return { childHostId, childPrototypeChildIds };
  }

  const protoId = childPrototypeChildIds[0]!;
  const protoBlock = template.blocks[protoId];

  if (protoBlock && isRepeatHostBlock(protoBlock)) {
    childHostId = protoId;
    const rowTemplateId = repeatRowTemplateChildId(template, protoId);
    if (rowTemplateId) {
      childPrototypeChildIds = [
        resolveMaterializedRowToPrototypeId(rowTemplateId, prototypeSet, template),
      ];
    }
  }

  return { childHostId, childPrototypeChildIds };
}

function parentHostHasMaterializedChildren(
  template: EmailTemplate,
  parentHostId: string
): boolean {
  const children = template.blocks[parentHostId]?.children ?? [];
  return children.some((id) => isMaterializedRepeatRowBlockId(id, template));
}

/**
 * 在物化态（解除绑定后）重绑前：归一化行模板/子级宿主 id，删除多余物化 SPU 行，折叠为原型子树。
 */
export function normalizeTemplateBeforeUnifiedRepeatBinding(
  template: EmailTemplate,
  plan: UnifiedRepeatBindPlan,
  /** 解除绑定前的模板，用于恢复原型 blockMeta 名称（如 sku-1 行模板） */
  sourceTemplate?: EmailTemplate
): { template: EmailTemplate; plan: UnifiedRepeatBindPlan } {
  let next = template;
  const prototypeSet = buildRepeatPrototypeIdSet(next);

  let normalizedPlan: UnifiedRepeatBindPlan = {
    ...plan,
    parentPrototypeChildIds: plan.parentPrototypeChildIds.map((id) =>
      resolveMaterializedRowToPrototypeId(id, prototypeSet, next)
    ),
    ...resolveChildRepeatBindTargets(next, plan, prototypeSet),
  };

  if (!parentHostHasMaterializedChildren(next, normalizedPlan.parentHostId)) {
    const set = buildRepeatPrototypeIdSet(next);
    return {
      template: next,
      plan: {
        ...normalizedPlan,
        parentFieldMappings: remapRepeatFieldMappingTargets(
          normalizedPlan.parentFieldMappings,
          next,
          set
        ),
        childFieldMappings: normalizedPlan.childFieldMappings
          ? remapRepeatFieldMappingTargets(normalizedPlan.childFieldMappings, next, set)
          : normalizedPlan.childFieldMappings,
      },
    };
  }

  const prototypeRootId = normalizedPlan.parentPrototypeChildIds[0];
  if (!prototypeRootId) {
    return { template: next, plan: normalizedPlan };
  }

  const { keepRootId, prototypeRootId: protoRoot } = findParentRowTemplateRoot(
    next,
    normalizedPlan.parentHostId,
    prototypeRootId,
    prototypeSet
  );

  next = pruneParentHostMaterializedSiblings(next, normalizedPlan.parentHostId, keepRootId);
  next = collapseMaterializedRootToPrototype(
    next,
    normalizedPlan.parentHostId,
    keepRootId,
    protoRoot,
    prototypeSet,
    sourceTemplate
  );

  const refreshedSet = buildRepeatPrototypeIdSet(next);
  normalizedPlan = {
    ...normalizedPlan,
    parentPrototypeChildIds: normalizedPlan.parentPrototypeChildIds.map((id) =>
      resolveMaterializedRowToPrototypeId(id, refreshedSet, next)
    ),
    ...resolveChildRepeatBindTargets(next, normalizedPlan, refreshedSet),
    parentFieldMappings: remapRepeatFieldMappingTargets(
      normalizedPlan.parentFieldMappings,
      next,
      refreshedSet
    ),
    childFieldMappings: normalizedPlan.childFieldMappings
      ? remapRepeatFieldMappingTargets(normalizedPlan.childFieldMappings, next, refreshedSet)
      : normalizedPlan.childFieldMappings,
  };

  return { template: next, plan: normalizedPlan };
}
