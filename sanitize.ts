import type { RenderWarning } from "./types";

const ALLOWED_TAGS = new Set([
  "article",
  "section",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "del",
  "code",
  "pre",
  "a",
  "img",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "br",
  "span",
]);

const ALLOWED_ATTRS = new Set(["style", "href", "src", "alt", "title", "width"]);

export function sanitizeExportHtml(html: string): { html: string; warnings: RenderWarning[] } {
  const warnings: RenderWarning[] = [];
  const container = document.createElement("div");
  container.innerHTML = html;

  const elements = Array.from(container.querySelectorAll("*"));
  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      warnings.push({
        code: "UNSAFE_HTML_REMOVED",
        message: `已移除不安全标签 <${tag}>。`,
      });
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith("on") || !ALLOWED_ATTRS.has(name)) {
        element.removeAttribute(attr.name);
        warnings.push({
          code: "UNSAFE_HTML_REMOVED",
          message: `已移除属性 ${attr.name}。`,
        });
        continue;
      }

      if ((name === "href" || name === "src") && !isSafeUrl(value)) {
        element.removeAttribute(attr.name);
        warnings.push({
          code: "UNSAFE_HTML_REMOVED",
          message: `已移除不安全链接 ${value}。`,
        });
      }
    }
  }

  return {
    html: container.innerHTML,
    warnings,
  };
}

function isSafeUrl(value: string): boolean {
  return /^(https?:\/\/|data:image\/|#|\/)/i.test(value);
}
