/** Fixed nav height + breathing room when scrolling to in-page anchors. */
export const ANCHOR_SCROLL_OFFSET_PX = 80;

export function scrollToAnchor(id: string, behavior: ScrollBehavior = "smooth") {
  const el = document.getElementById(id);
  if (!el) return false;

  const top = el.getBoundingClientRect().top + window.scrollY - ANCHOR_SCROLL_OFFSET_PX;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

export function scrollToAnchorFromHash(hash: string, behavior: ScrollBehavior = "smooth") {
  const id = hash.replace(/^#/, "");
  if (!id) return false;
  return scrollToAnchor(id, behavior);
}
