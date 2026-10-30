import "./landing.css";
import { manifestUrl } from "./site-links";
const field = document.querySelector<HTMLInputElement>("#manifest-url");
const copyButton = document.querySelector<HTMLButtonElement>("#copy-manifest");
const feedback = document.querySelector<HTMLElement>("#copy-feedback");
const url = manifestUrl(window.location.origin);
if (field) field.value = url;
copyButton?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(url);
    if (feedback)
      feedback.textContent =
        "已复制。前往 Owlbear 的扩展管理，粘贴这个安装链接。";
    copyButton.textContent = "已复制 ✓";
  } catch {
    field?.focus();
    field?.select();
    if (feedback)
      feedback.textContent =
        "浏览器未允许自动复制。链接已选中，请使用 Ctrl+C 或 ⌘C 复制。";
  }
});
