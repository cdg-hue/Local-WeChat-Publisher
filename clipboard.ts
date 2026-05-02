export interface ClipboardCopyResult {
  mode: "html" | "plain-text";
}

export async function copyWechatHtml(params: {
  html: string;
  plainText: string;
}): Promise<ClipboardCopyResult> {
  // 优先尝试现代 Clipboard API（含 ClipboardItem）
  if (
    navigator.clipboard &&
    "write" in navigator.clipboard &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      const item = new ClipboardItem({
        "text/html": new Blob([params.html], { type: "text/html" }),
        "text/plain": new Blob([params.plainText], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return { mode: "html" };
    } catch {
      // Obsidian Electron 环境下此路径可能因权限受限而失败，继续 fallback
    }
  }

  // Fallback：通过隐藏的 contenteditable 元素 + execCommand('copy') 复制富文本
  // 这是 Obsidian 插件中最可靠的 HTML 复制方式
  if (document.execCommand) {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;";
    el.contentEditable = "true";
    el.innerHTML = params.html;
    document.body.appendChild(el);

    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const ok = document.execCommand("copy");
      if (ok) {
        return { mode: "html" };
      }
    } finally {
      document.body.removeChild(el);
    }
  }

  // 最后兜底：纯文本
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(params.plainText);
    return { mode: "plain-text" };
  }

  throw new Error("Clipboard API is not available.");
}
