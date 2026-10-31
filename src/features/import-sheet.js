import { $, escapeHtml } from "../lib/dom.js";
import { parseFriendsCSV, parseFriendsJSON } from "../lib/csv.js";

const MAX_SIZE = 5 * 1024 * 1024;

export function createImportSheet({ sheets, onImport }) {
  const dropzone = $("#dropzone");
  const fileInput = $("#file-input");
  const status = $("#import-status");
  const confirmButton = $("#btn-import-confirm");
  let pending = null;

  function setStatus(html) {
    status.innerHTML = html;
  }

  function reset() {
    pending = null;
    confirmButton.disabled = true;
    fileInput.value = "";
    dropzone.querySelector("strong").textContent = "选择文件或拖入此处";
    setStatus("");
  }

  function open() {
    reset();
    sheets.open("import");
  }

  function summarize(result, fileName) {
    const skipped = result.skipped || [];
    const head = `<b>${escapeHtml(fileName)}</b>：识别到 ${result.total} 条记录，其中 ${result.friends.length} 条有效${
      skipped.length ? `，${skipped.length} 条将被跳过` : ""
    }。`;
    const reasons = skipped
      .slice(0, 3)
      .map((item) => `第 ${item.record} 条：${escapeHtml(item.reason)}`)
      .join("<br/>");
    return `${head}${reasons ? `<br/><span style="opacity:.7">${reasons}${skipped.length > 3 ? "…" : ""}</span>` : ""}`;
  }

  async function handleFile(file) {
    if (!file) return;
    if (file.size > MAX_SIZE) {
      setStatus('<span style="color:var(--red)">文件超过 5MB，请拆分后再导入。</span>');
      confirmButton.disabled = true;
      return;
    }
    const isJson = /\.json$/i.test(file.name);
    const isCsv = /\.(csv|txt)$/i.test(file.name);
    if (!isJson && !isCsv) {
      setStatus('<span style="color:var(--red)">仅支持 .csv / .txt / .json 文件。</span>');
      confirmButton.disabled = true;
      return;
    }

    dropzone.querySelector("strong").textContent = file.name;
    try {
      const text = await file.text();
      const result = isJson ? parseFriendsJSON(text) : parseFriendsCSV(text);
      pending = result;
      if (!result.friends.length) {
        setStatus(`${summarize(result, file.name)}<br/><span style="color:var(--red)">没有可导入的有效记录。</span>`);
        confirmButton.disabled = true;
        return;
      }
      setStatus(summarize(result, file.name));
      confirmButton.disabled = false;
    } catch (error) {
      pending = null;
      confirmButton.disabled = true;
      setStatus(`<span style="color:var(--red)">${escapeHtml(error.message || "文件解析失败")}</span>`);
    }
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));

  ["dragenter", "dragover"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-over");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-over");
    });
  });
  dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  confirmButton.addEventListener("click", () => {
    if (!pending || !pending.friends.length) return;
    const payload = pending;
    reset();
    sheets.close("import");
    onImport(payload);
  });

  return { open };
}
