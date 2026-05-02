import { normalizeDocument } from "./normalize";
import { renderPreviewHtml } from "./render-preview";
import { renderExportHtml } from "./render-export";
import { sanitizeExportHtml } from "./sanitize";
import type { RenderWechatArticleOptions, RenderWechatArticleResult } from "./types";

export async function renderWechatArticle(
  options: RenderWechatArticleOptions
): Promise<RenderWechatArticleResult> {
  const normalized = await normalizeDocument(options.markdown, options.context, options.settings);
  const preview = await renderPreviewHtml(normalized, options.settings);
  const exportResult = await renderExportHtml(normalized, options.settings);
  const sanitized = sanitizeExportHtml(exportResult.html);

  return {
    normalized,
    preview,
    exportResult: {
      ...exportResult,
      html: sanitized.html,
      warnings: [...exportResult.warnings, ...sanitized.warnings],
    },
  };
}
