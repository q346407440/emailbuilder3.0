import { Tooltip } from "@shoplazza/sds";
import QuestionOutlined from "@shoplazza/sds-icons/QuestionOutlined";

type Props = {
  content: string;
  ariaLabel?: string;
};

/** 属性面板统一提示触发器：SDS Tooltip + SDS 问号图标 */
export function TopTip({ content, ariaLabel }: Props) {
  return (
    <Tooltip title={content} placement="top" innerOverflow="wrap">
      <span className="inspector-field__hint-trigger" aria-label={ariaLabel ?? `提示：${content}`}>
        <QuestionOutlined />
      </span>
    </Tooltip>
  );
}
