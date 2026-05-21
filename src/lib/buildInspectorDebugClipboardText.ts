import { blockTypeLabel } from "./blockTypeLabel";

/** 生成属性面板「复制调试定位」所用的多行文案（仓库内 template.json 路径、blocks 键、类型等） */
export function buildInspectorDebugClipboardText(params: {
  templatePathKey: string | null | undefined;
  /** 版式变体 id；有则路径为 layouts/<id>/template.json */
  layoutVariantId?: string | null;
  templateId: string;
  blockId: string;
  blockType: string;
  blockMetaName?: string | null;
  /** 画布设置面板（邮件根节点） */
  isCanvasRoot?: boolean;
}): string {
  const key = params.templatePathKey?.trim();
  const layoutId = params.layoutVariantId?.trim();
  const lines: string[] = [];
  lines.push(
    key
      ? layoutId
        ? `模板文件: data/emails/${key}/layouts/${layoutId}/template.json`
        : `模板文件: data/emails/${key}/template.json`
      : `模板标识: templateId=${params.templateId}`
  );
  if (params.isCanvasRoot) {
    lines.push("面板: 画布设置（邮件根节点）");
  }
  lines.push(`区块 ID: ${params.blockId}`);
  lines.push(`JSON 路径: blocks[${JSON.stringify(params.blockId)}]`);
  const cn = blockTypeLabel(params.blockType);
  lines.push(
    cn !== params.blockType
      ? `区块类型: ${params.blockType}（${cn}）`
      : `区块类型: ${params.blockType}`
  );
  const name = params.blockMetaName?.trim();
  if (name) lines.push(`区块名称: ${name}`);
  return lines.join("\n");
}
