import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Element, Root } from "hast";
import { buildElementStyles, getThemeById } from "./theme";
import type { NormalizedDocument, PreviewRenderResult, RenderSettings, ResolvedAsset } from "./types";

export async function renderPreviewHtml(
  normalized: NormalizedDocument,
  settings: RenderSettings
): Promise<PreviewRenderResult> {
  const styles = buildElementStyles(getThemeById(settings.theme), settings.fontSize);
  const assetMap = new Map(normalized.assets.map((asset) => [asset.id, asset]));

  const processor = unified().use(remarkParse).use(remarkFrontmatter).use(remarkGfm);

  if (settings.forceLineBreaks) {
    processor.use(remarkBreaks);
  }

  processor
    .use(remarkRehype)
    .use(rehypeResolveAssets(assetMap, "preview", styles.warning))
    .use(rehypeTransformImagesToFigures())
    .use(rehypeApplyStyles(styles))
    .use(rehypeStringify);

  const file = await processor.process(normalized.normalizedMarkdown);
  return {
    html: `<article style="${styles.article}">${String(file)}</article>`,
    warnings: normalized.warnings,
  };
}

function rehypeResolveAssets(
  assetMap: Map<string, ResolvedAsset>,
  mode: "preview" | "export",
  warningStyle: string
): Plugin<[], Root> {
  return () => (tree) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "img" || typeof index !== "number" || !parent) {
        return;
      }

      const src = typeof node.properties?.src === "string" ? node.properties.src : "";
      const match = src.match(/^obsidian-asset:\/\/(.+)$/);
      if (!match) {
        return;
      }

      const asset = assetMap.get(match[1]);
      if (!asset) {
        return;
      }

      if (mode === "preview" && asset.previewSrc) {
        node.properties = {
          ...node.properties,
          src: asset.previewSrc,
          alt: asset.alt ?? asset.original,
        };
        if (asset.width) {
          node.properties.width = asset.width;
        }
        return;
      }

      const replacement: Element = {
        type: "element",
        tagName: "p",
        properties: {
          style: warningStyle,
        },
        children: [
          {
            type: "text",
            value: asset.warning ?? `资源 ${asset.original} 无法处理。`,
          },
        ],
      };

      parent.children[index] = replacement;
    });
  };
}

function rehypeApplyStyles(styles: ReturnType<typeof buildElementStyles>): Plugin<[], Root> {
  return () => (tree) => {
    visit(tree, "element", (node: Element, _index, parent) => {
      const style = styleForTag(node.tagName, styles, parent);
      if (!style) {
        return;
      }

      node.properties = {
        ...node.properties,
        style: [node.properties?.style, style].filter(Boolean).join(" "),
      };
    });
  };
}

function rehypeTransformImagesToFigures(): Plugin<[], Root> {
  return () => (tree) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "img" || typeof index !== "number" || !parent) {
        return;
      }

      const alt = typeof node.properties?.alt === "string" ? node.properties.alt.trim() : "";
      const width = node.properties?.width;
      if (width) {
        node.properties = {
          ...node.properties,
          style: [node.properties?.style, `width: ${width}px;`].filter(Boolean).join(" "),
        };
        delete node.properties.width;
      }

      if (!alt) {
        return;
      }

      parent.children[index] = {
        type: "element",
        tagName: "figure",
        properties: {},
        children: [
          node,
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: alt }],
          },
        ],
      };
    });
  };
}

function styleForTag(
  tagName: string,
  styles: ReturnType<typeof buildElementStyles>,
  parent?: Root | Element
): string {
  switch (tagName) {
    case "p":
      return styles.p;
    case "h1":
      return styles.h1;
    case "h2":
      return styles.h2;
    case "h3":
      return styles.h3;
    case "h4":
      return styles.h4;
    case "h5":
      return styles.h5;
    case "h6":
      return styles.h6;
    case "blockquote":
      return styles.blockquote;
    case "ul":
      return styles.ul;
    case "ol":
      return styles.ol;
    case "li":
      return styles.li;
    case "a":
      return styles.a;
    case "img":
      return styles.img;
    case "figure":
      return styles.figure;
    case "figcaption":
      return styles.figcaption;
    case "table":
      return styles.table;
    case "th":
      return styles.th;
    case "td":
      return styles.td;
    case "hr":
      return styles.hr;
    case "pre":
      return styles.pre;
    case "code":
      return parent && "tagName" in parent && parent.tagName === "pre"
        ? styles.codeBlock
        : styles.codeInline;
    case "strong":
      return styles.strong;
    case "em":
      return styles.em;
    default:
      return "";
  }
}
