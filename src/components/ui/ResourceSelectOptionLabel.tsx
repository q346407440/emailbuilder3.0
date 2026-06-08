/** 顶栏资源下拉（邮件模板 / 版式结构）选项行：名称 + 已发布标签 */
export function ResourceSelectOptionLabel({
  label,
  published,
}: {
  label: string;
  published: boolean;
}) {
  return (
    <span className="resource-select-option">
      <span className="resource-select-option__label" title={label}>
        {label}
      </span>
      {published ? (
        <span className="resource-select-option__tag resource-select-option__tag--published">
          已发布
        </span>
      ) : null}
    </span>
  );
}
