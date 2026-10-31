import { $, escapeHtml, hide, show, trapFocus } from "../lib/dom.js";

/* ---------------------------------------------------------------- Sheets */

export function createSheets() {
  const openStack = [];
  const restoreFocus = new Map();

  const elementOf = (name) => $(`#sheet-${name}`);

  function open(name) {
    const element = elementOf(name);
    if (!element) return;
    show(element);
    const panel = element.querySelector(".sheet__panel");
    if (panel) restoreFocus.set(name, trapFocus(panel));
    document.body.style.overflow = "hidden";
    if (!openStack.includes(name)) openStack.push(name);
  }

  function close(name) {
    const element = elementOf(name);
    if (!element) return;
    hide(element);
    const restore = restoreFocus.get(name);
    if (restore) {
      restore();
      restoreFocus.delete(name);
    }
    const index = openStack.indexOf(name);
    if (index >= 0) openStack.splice(index, 1);
    if (openStack.length === 0) document.body.style.overflow = "";
  }

  function closeTop() {
    if (openStack.length === 0) return false;
    close(openStack[openStack.length - 1]);
    return true;
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-close]");
    if (trigger) close(trigger.dataset.close);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTop();
  });

  return { open, close, closeTop };
}

/* --------------------------------------------------------------- Toasts */

let toastHost = null;

export function showToast(message, options = {}) {
  const { type = "success", actionLabel = "", onAction = null, duration = 4200 } = options;
  toastHost = toastHost || $("#toasts");
  if (!toastHost) return null;

  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " toast--error" : type === "warn" ? " toast--warn" : ""}`;
  toast.innerHTML = `<i class="toast__dot" aria-hidden="true"></i><span>${escapeHtml(message)}</span>`;

  let timer = null;
  const dismiss = () => {
    if (!toast.isConnected) return;
    clearTimeout(timer);
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 240);
  };

  if (actionLabel && onAction) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast__action";
    button.textContent = actionLabel;
    button.addEventListener("click", () => {
      onAction();
      dismiss();
    });
    toast.appendChild(button);
  }

  toastHost.appendChild(toast);
  timer = setTimeout(dismiss, duration);
  return dismiss;
}

/* -------------------------------------------------------------- Confirm */

export function confirmDialog({ title = "确认操作", message = "", confirmLabel = "确定", danger = true } = {}) {
  const dialog = $("#dialog-confirm");
  const okButton = $("#confirm-ok");
  if (!dialog || !okButton) return Promise.resolve(window.confirm(message));

  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  okButton.textContent = confirmLabel;
  okButton.className = danger ? "btn btn--danger" : "btn btn--primary";
  show(dialog);
  const restore = trapFocus(dialog.querySelector(".dialog__panel"));

  return new Promise((resolve) => {
    const finish = (result) => {
      hide(dialog);
      restore();
      okButton.removeEventListener("click", onOk);
      $("#confirm-cancel").removeEventListener("click", onCancel);
      dialog.querySelector(".dialog__scrim").removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (event) => {
      if (event.key === "Escape") finish(false);
    };
    okButton.addEventListener("click", onOk);
    $("#confirm-cancel").addEventListener("click", onCancel);
    dialog.querySelector(".dialog__scrim").addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);
  });
}
