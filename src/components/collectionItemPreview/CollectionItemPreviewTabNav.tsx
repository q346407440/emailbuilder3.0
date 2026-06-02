import { isCollectionItemVisible } from "../../lib/collectionItemVisibility";
import { resolveCollectionPreviewTabIndices } from "./collectionItemPreviewUtils";

type Props = {
  panelIdPrefix: string;
  total: number;
  activeIndex: number;
  itemVisibility?: boolean[];
  onSelect: (index: number) => void;
};

export function CollectionItemPreviewTabNav({
  panelIdPrefix,
  total,
  activeIndex,
  itemVisibility,
  onSelect,
}: Props) {
  const tabIndices = resolveCollectionPreviewTabIndices(total, activeIndex);
  const maxVisible = 4;
  const showSteppers = total > maxVisible;
  const atStart = activeIndex <= 0;
  const atEnd = activeIndex >= total - 1;

  return (
    <div className="readonly-collection-preview__tab-nav">
      {showSteppers ? (
        <button
          type="button"
          className="readonly-collection-preview__step"
          aria-label="上一项"
          disabled={atStart}
          onClick={() => onSelect(activeIndex - 1)}
        >
          <span aria-hidden>‹</span>
        </button>
      ) : null}
      <div className="payload-collection__tabs" role="tablist" aria-label="数据预览条目">
        {tabIndices.map((index) => {
          const selected = index === activeIndex;
          const hidden = !isCollectionItemVisible(itemVisibility, index);
          return (
            <button
              key={`${panelIdPrefix}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${panelIdPrefix}-panel-${index}`}
              id={`${panelIdPrefix}-tab-${index}`}
              className={[
                "payload-collection__tab",
                selected ? "payload-collection__tab--active" : "",
                hidden ? "readonly-collection-preview__tab--hidden" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      {showSteppers ? (
        <button
          type="button"
          className="readonly-collection-preview__step"
          aria-label="下一项"
          disabled={atEnd}
          onClick={() => onSelect(activeIndex + 1)}
        >
          <span aria-hidden>›</span>
        </button>
      ) : null}
    </div>
  );
}
