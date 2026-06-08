// 在页面内执行：返回 ShopSectionModal 白底面板或版式下拉的裁切框
export function getShopSectionModalRect() {
  const panel = document.querySelector(".shop-section-modal");
  if (!panel) return null;
  const r = panel.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

export function getLayoutSelectDropdownRect() {
  const list = document.querySelector('[role="listbox"]');
  if (!list) return null;
  const dd =
    list.closest(".sds-select-dropdown") ??
    list.closest(".sds-select-dropdown-wrap") ??
    list.parentElement?.closest("[class*='select-dropdown']");
  const target = dd ?? list.parentElement?.parentElement;
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}
