import { Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { antdOverlayEdge } from "../../lib/antdOverlayEdge";

type Props = {
  content: string;
  ariaLabel?: string;
};

/** 属性面板统一提示触发器：Ant Design Tooltip + 问号图标 */
export function TopTip({ content, ariaLabel }: Props) {
  return (
    <Tooltip title={content} {...antdOverlayEdge("top")}>
      <span className="inspector-field__hint-trigger" aria-label={ariaLabel ?? `提示：${content}`}>
        <QuestionCircleOutlined />
      </span>
    </Tooltip>
  );
}
