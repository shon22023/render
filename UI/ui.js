// UI専用の軽量スクリプト（既存 main.js/timer.js/pomoTimer.js とは独立）
// - サイドバーの開閉
// - ドラッグ&ドロップ/ファイル選択のアップロード（/uploadVideo）
// - waitVideo ダイアログとトースト通知

const API_BASE_URL = (window.API_BASE_URL ?? "").toString();

function qs(id) {
  return document.getElementById(id);
}

function supportsDialog(el) {
  return !!el && typeof el.showModal === "function";
}

function openDialog(dialogEl) {
  if (!dialogEl) return;
  if (supportsDialog(dialogEl)) dialogEl.showModal();
  else dialogEl.setAttribute("open", "");
}

function closeDialog(dialogEl) {
  if (!dialogEl) return;
  if (supportsDialog(dialogEl)) dialogEl.close();
  else dialogEl.removeAttribute("open");
}

let toastTimer = null;
function toast(message, type = "info") {
  const host = qs("toastHost");
  if (!host) return;

  host.innerHTML = "";
  const el = document.createElement("div");
  el.className = `toast ${type === "error" ? "error" : type === "warn" ? "warn" : ""}`.trim();
  el.innerHTML = `<span class="toastIcon" aria-hidden="true"></span><span>${escapeHtml(message)}</span>`;
  host.appendChild(el);

  requestAnimationFrame(() => el.classList.add("show"));

  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.remove("show");
    window.setTimeout(() => {
      if (host.contains(el)) host.removeChild(el);
    }, 220);
  }, 2600);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return c;
    }
  });
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function setStatus(text, variant = "ok") {
  const badge = qs("statusBadge");
  if (!badge) return;
  badge.lastChild && (badge.lastChild.nodeType === Node.TEXT_NODE)
    ? (badge.lastChild.textContent = ` ${text}`)
    : (badge.textContent = text);

  const dot = badge.querySelector(".dot");
  if (!dot) return;
  if (variant === "busy") {
    dot.style.background = "rgba(255,203,77,.95)";
    dot.style.boxShadow = "0 0 0 4px rgba(255,203,77,.14)";
  } else if (variant === "error") {
    dot.style.background = "rgba(255,77,77,.95)";
    dot.style.boxShadow = "0 0 0 4px rgba(255,77,77,.14)";
  } else {
    dot.style.background = "rgba(39,227,179,.95)";
    dot.style.boxShadow = "0 0 0 4px rgba(39,227,179,.12)";
  }
}

function setupSidebar() {
  const btn = qs("sideBarButton");
  const sidebar = qs("sidebar");
  const overlay = qs("sidebarOverlay");
  const closeBtn = qs("sidebarClose");
  if (!btn || !sidebar || !overlay || !closeBtn) return;

  const root = document.documentElement;

  function open() {
    root.classList.add("isSidebarOpen");
    document.body.classList.add("noScroll");
    btn.setAttribute("aria-expanded", "true");
    sidebar.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    closeBtn.focus({ preventScroll: true });
  }
  function close() {
    root.classList.remove("isSidebarOpen");
    document.body.classList.remove("noScroll");
    btn.setAttribute("aria-expanded", "false");
    sidebar.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    btn.focus({ preventScroll: true });
  }

  btn.addEventListener("click", () => {
    if (root.classList.contains("isSidebarOpen")) close();
    else open();
  });
  overlay.addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("isSidebarOpen")) close();
  });
}

function setupUpload() {
  const input = qs("uploadInput");
  const dropzone = qs("uploadDropzone");
  const button = qs("uploadButton");
  const meta = qs("uploadMeta");
  const waitVideo = qs("waitVideo");
  const waitTitle = qs("waitVideoTitle");

  if (!input || !dropzone || !button || !meta) return;

  /** @type {File|null} */
  let selected = null;

  function setFile(file) {
    selected = file;
    if (!file) {
      meta.textContent = "未選択";
      button.disabled = true;
      return;
    }
    meta.textContent = `${file.name} (${formatBytes(file.size)})`;
    button.disabled = false;
  }

  setFile(null);

  input.addEventListener("change", () => {
    const file = input.files && input.files[0] ? input.files[0] : null;
    setFile(file);
  });

  function onDragOver(e) {
    e.preventDefault();
    dropzone.classList.add("isDragOver");
  }
  function onDragLeave() {
    dropzone.classList.remove("isDragOver");
  }
  function onDrop(e) {
    e.preventDefault();
    dropzone.classList.remove("isDragOver");
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
    if (!file) return;
    setFile(file);
  }

  dropzone.addEventListener("dragover", onDragOver);
  dropzone.addEventListener("dragleave", onDragLeave);
  dropzone.addEventListener("drop", onDrop);
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });
  dropzone.addEventListener("click", () => input.click());

  async function uploadFile() {
    if (!selected) {
      toast("アップロードするファイルを選択してください", "warn");
      return;
    }
    if (!navigator.onLine) {
      toast("オフラインです。ネットワーク接続を確認してください。", "error");
      return;
    }

    try {
      setStatus("アップロード中…", "busy");
      button.disabled = true;
      if (waitTitle) waitTitle.textContent = "アップロードしています...";
      openDialog(waitVideo);

      const fd = new FormData();
      fd.append("video", selected, selected.name || "video.mp4");

      const res = await fetch(`${API_BASE_URL}/uploadVideo`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
      }

      const json = await res.json().catch(() => null);
      closeDialog(waitVideo);
      setStatus("完了", "ok");
      toast(json && json.success ? "アップロード完了" : "アップロード完了（レスポンス確認）", "info");
    } catch (e) {
      closeDialog(waitVideo);
      setStatus("エラー", "error");
      console.error(e);
      toast("アップロードに失敗しました。", "error");
    } finally {
      button.disabled = !selected;
      window.setTimeout(() => setStatus("準備OK", "ok"), 1800);
    }
  }

  button.addEventListener("click", uploadFile);
}

document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  setupUpload();
});


