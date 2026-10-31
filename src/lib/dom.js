/** 极简 DOM 工具，避免引入任何框架依赖。 */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

export function delegate(root, selector, type, handler) {
  root.addEventListener(type, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

export function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function show(element) {
  if (!element) return;
  element.hidden = false;
}

export function hide(element) {
  if (!element) return;
  element.hidden = true;
}

/** 简单焦点陷阱：面板打开后把焦点限制在内部，关闭时归还焦点。 */
export function trapFocus(container) {
  const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const previouslyFocused = document.activeElement;

  const onKeydown = (event) => {
    if (event.key !== "Tab") return;
    const items = Array.from(container.querySelectorAll(selector)).filter((node) => node.offsetParent !== null || node === document.activeElement);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener("keydown", onKeydown);
  const firstField = container.querySelector(selector);
  if (firstField) firstField.focus();

  return () => {
    container.removeEventListener("keydown", onKeydown);
    if (previouslyFocused && typeof previouslyFocused.focus === "function" && document.contains(previouslyFocused)) {
      previouslyFocused.focus();
    }
  };
}
