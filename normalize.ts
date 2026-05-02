import { TFile } from "obsidian";
import type {
  NormalizedDocument,
  RenderContext,
  RenderSettings,
  RenderWarning,
  ResolvedAsset,
} from "./types";

const CODE_FENCE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
const WIKI_EMBED_PATTERN = /!\[\[([^\]]+)\]\]/g;
const WIKI_LINK_PATTERN = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;
const CALLOUT_PATTERN = /^>\s*\[!([A-Za-z0-9_-]+)\]([^\n]*)$/gm;
const UNSUPPORTED_BLOCK_PATTERNS = [
  { pattern: /^\s*```(?:mermaid|dataview|dataviewjs)\s*$/m, label: "Mermaid / Dataview 代码块" },
  { pattern: /^\s*\$\$[\s\S]*?\$\$\s*$/m, label: "块级数学公式" },
  { pattern: /\{\{renderer\s+.*?\}\}/, label: "自定义渲染语法" },
];
const MAX_EMBED_DEPTH = 3;

interface NormalizeState {
  assets: ResolvedAsset[];
  warnings: RenderWarning[];
  warningKeys: Set<string>;
  assetCounter: number;
}

export async function normalizeDocument(
  markdown: string,
  context: RenderContext,
  settings: RenderSettings
): Promise<NormalizedDocument> {
  const state: NormalizeState = {
    assets: [],
    warnings: [],
    warningKeys: new Set<string>(),
    assetCounter: 0,
  };

  collectUnsupportedSyntaxWarnings(markdown, state);
  const normalizedMarkdown = await normalizeMarkdown(markdown, context, settings, state, 0, new Set<string>());

  return {
    markdown,
    normalizedMarkdown,
    assets: state.assets,
    warnings: state.warnings,
  };
}

async function normalizeMarkdown(
  markdown: string,
  context: RenderContext,
  settings: RenderSettings,
  state: NormalizeState,
  depth: number,
  activeEmbeds: ReadonlySet<string>
): Promise<string> {
  return replaceOutsideCodeFences(markdown, (segment) =>
    normalizeSegment(segment, context, settings, state, depth, activeEmbeds)
  );
}

async function normalizeSegment(
  segment: string,
  context: RenderContext,
  settings: RenderSettings,
  state: NormalizeState,
  depth: number,
  activeEmbeds: ReadonlySet<string>
): Promise<string> {
  let output = await replaceAsync(segment, WIKI_EMBED_PATTERN, async (_match, rawInner) => {
    const parsed = parseEmbedSpec(String(rawInner));
    const resolved = resolveAbstractTarget(parsed.target, context);

    if (resolved instanceof TFile && isMarkdownFile(resolved)) {
      return expandMarkdownEmbed(parsed.target, resolved, context, settings, state, depth, activeEmbeds);
    }

    if (resolved instanceof TFile && !isImageFile(resolved) && !isMarkdownFile(resolved)) {
      pushWarning(state, {
        code: "UNSUPPORTED_SYNTAX",
        message: `附件 ${resolved.name} 当前不会内嵌渲染。`,
        source: parsed.target,
      });
      return `> **附件引用**\n> ${resolved.name}（当前不会内嵌渲染）`;
    }

    const asset = resolveAsset(
      parsed.target,
      context,
      parsed.width,
      parsed.altText,
      resolved instanceof TFile ? resolved : null,
      `asset-${state.assetCounter++}`
    );

    state.assets.push(asset);
    if (asset.warning) {
      pushWarning(state, {
        code: asset.kind === "missing-file" ? "MISSING_ATTACHMENT" : "LOCAL_IMAGE_NOT_EXPORTABLE",
        message: asset.warning,
        source: parsed.target,
      });
    }

    return `![${asset.alt ?? parsed.target}](obsidian-asset://${asset.id})`;
  });

  output = output.replace(WIKI_LINK_PATTERN, (_match, linkTarget, alias) => {
    const cleanedTarget = String(linkTarget).trim();
    const display = formatWikiDisplay(cleanedTarget, alias ? String(alias).trim() : undefined);
    state.assets.push({
      id: `wiki-${state.assetCounter++}`,
      original: cleanedTarget,
      kind: "wiki-link",
      alt: display,
      displayText: display,
    });
    return display;
  });

  output = output.replace(CALLOUT_PATTERN, (_match, type, titleText) => {
    const title = calloutTitle(String(type));
    const customTitle = String(titleText).trim();
    const label = customTitle ? `${title} · ${customTitle}` : title;
    return `> **${label}**`;
  });

  return output;
}

async function expandMarkdownEmbed(
  originalTarget: string,
  file: TFile,
  context: RenderContext,
  settings: RenderSettings,
  state: NormalizeState,
  depth: number,
  activeEmbeds: ReadonlySet<string>
): Promise<string> {
  if (depth >= MAX_EMBED_DEPTH) {
    pushWarning(state, {
      code: "UNSUPPORTED_SYNTAX",
      message: `嵌入文档 ${file.path} 超过最大展开层级，已停止递归。`,
      source: originalTarget,
    });
    return `> **嵌入文档**\n> ${file.basename}（超过最大展开层级）`;
  }

  if (activeEmbeds.has(file.path)) {
    pushWarning(state, {
      code: "UNSUPPORTED_SYNTAX",
      message: `检测到嵌入文档循环引用：${file.path}。`,
      source: originalTarget,
    });
    return `> **嵌入文档**\n> ${file.basename}（检测到循环引用）`;
  }

  // 每次 embed 展开创建一个新 Set，不影响同级的其他 embed 展开
  const childEmbeds = new Set<string>([...activeEmbeds, file.path]);

  const rawMarkdown = await context.app.vault.cachedRead(file);
  const embeddedMarkdown = extractEmbedMarkdown(rawMarkdown, originalTarget, state);
  collectUnsupportedSyntaxWarnings(embeddedMarkdown, state);
  const normalized = await normalizeMarkdown(
    embeddedMarkdown,
    { ...context, file },
    settings,
    state,
    depth + 1,
    childEmbeds
  );

  return [
    "",
    `> **嵌入文档 · ${embedDisplayTitle(file, originalTarget)}**`,
    ">",
    ...normalized.split("\n").map((line) => `> ${line}`),
    "",
  ].join("\n");
}

async function replaceOutsideCodeFences(
  markdown: string,
  transform: (segment: string) => Promise<string>
): Promise<string> {
  const parts = markdown.split(CODE_FENCE_PATTERN);
  const transformed = await Promise.all(
    parts.map(async (segment) => {
      if (segment.startsWith("```") || segment.startsWith("~~~") || segment.startsWith("`")) {
        return segment;
      }
      return transform(segment);
    })
  );
  return transformed.join("");
}

async function replaceAsync(
  input: string,
  pattern: RegExp,
  replacer: (...args: string[]) => Promise<string>
): Promise<string> {
  const matches = Array.from(input.matchAll(pattern));
  if (matches.length === 0) {
    return input;
  }

  let result = "";
  let lastIndex = 0;

  for (const match of matches) {
    const index = match.index ?? 0;
    result += input.slice(lastIndex, index);
    result += await replacer(...(match as unknown as string[]));
    lastIndex = index + match[0].length;
  }

  result += input.slice(lastIndex);
  return result;
}

function resolveAsset(
  target: string,
  context: RenderContext,
  width?: number,
  altText?: string,
  resolvedFile: TFile | null = null,
  assetId = `asset-${Date.now()}`
): ResolvedAsset {
  if (isRemoteUrl(target)) {
    return {
      id: assetId,
      original: target,
      kind: "remote-image",
      previewSrc: target,
      exportSrc: target,
      alt: altText ?? target,
      width,
    };
  }

  const resolved = resolvedFile ?? resolveAbstractTarget(target, context);

  if (resolved instanceof TFile) {
    return {
      id: assetId,
      original: target,
      kind: "local-image",
      resolvedPath: resolved.path,
      previewSrc: context.app.vault.getResourcePath(resolved),
      alt: altText ?? resolved.basename,
      width,
      warning: `本地图片 ${resolved.name} 无法直接导出到公众号，请手动上传。`,
    };
  }

  return {
    id: assetId,
    original: target,
    kind: "missing-file",
    alt: altText ?? target,
    width,
    warning: `未找到附件 ${target}。`,
  };
}

function resolveAbstractTarget(target: string, context: RenderContext): TFile | null {
  const [linkpath] = target.split("#");
  const cleanedTarget = linkpath.trim();
  const resolved = context.app.metadataCache.getFirstLinkpathDest(
    cleanedTarget,
    context.file?.path ?? ""
  );
  return resolved instanceof TFile ? resolved : null;
}

function extractEmbedMarkdown(
  markdown: string,
  originalTarget: string,
  state: NormalizeState
): string {
  const [, heading] = splitTargetAndHeading(originalTarget);
  if (!heading) {
    return markdown;
  }

  const section = extractMarkdownSectionByHeading(markdown, heading);
  if (section) {
    return section;
  }

  pushWarning(state, {
    code: "UNSUPPORTED_SYNTAX",
    message: `未在嵌入文档中找到标题“${heading}”，已回退为整篇展开。`,
    source: originalTarget,
  });
  return markdown;
}

function extractMarkdownSectionByHeading(markdown: string, heading: string): string | null {
  const lines = markdown.split("\n");
  const normalizedHeading = normalizeHeadingText(heading);
  let startIndex = -1;
  let startLevel = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.*)$/);
    if (!match) {
      continue;
    }

    const currentHeading = normalizeHeadingText(match[2]);
    if (currentHeading === normalizedHeading) {
      startIndex = index;
      startLevel = match[1].length;
      break;
    }
  }

  if (startIndex === -1) {
    return null;
  }

  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.*)$/);
    if (!match) {
      continue;
    }

    const level = match[1].length;
    if (level <= startLevel) {
      endIndex = index;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join("\n").trim();
}

function embedDisplayTitle(file: TFile, originalTarget: string): string {
  const [, heading] = splitTargetAndHeading(originalTarget);
  return heading ? `${file.basename} > ${heading}` : file.basename;
}

function splitTargetAndHeading(target: string): [string, string | null] {
  const [pathPart, ...headingParts] = target.split("#");
  return [pathPart, headingParts.length > 0 ? headingParts.join("#").trim() : null];
}

function normalizeHeadingText(text: string): string {
  return text
    .trim()
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_match, linkTarget, alias) =>
      formatWikiDisplay(String(linkTarget).trim(), alias ? String(alias).trim() : undefined)
    )
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseEmbedSpec(rawInner: string): { target: string; width?: number; altText?: string } {
  const parts = rawInner
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const [target = "", ...rest] = parts;
  let width: number | undefined;
  let altText: string | undefined;

  for (const part of rest) {
    if (/^\d+$/.test(part)) {
      width = Number(part);
      continue;
    }
    if (!altText) {
      altText = part;
    }
  }

  return { target, width, altText };
}

function formatWikiDisplay(target: string, alias?: string): string {
  if (alias) {
    return alias;
  }

  const [pathPart, headingPart] = target.split("#");
  const pathSegments = pathPart.split("/");
  const base = pathSegments[pathSegments.length - 1] || target;
  return headingPart ? `${base} > ${headingPart}` : base;
}

function collectUnsupportedSyntaxWarnings(markdown: string, state: NormalizeState): void {
  for (const item of UNSUPPORTED_BLOCK_PATTERNS) {
    if (item.pattern.test(markdown)) {
      pushWarning(state, {
        code: "UNSUPPORTED_SYNTAX",
        message: `${item.label} 当前会降级显示或被忽略。`,
      });
    }
  }
}

function pushWarning(state: NormalizeState, warning: RenderWarning): void {
  const key = `${warning.code}:${warning.source ?? ""}:${warning.message}`;
  if (state.warningKeys.has(key)) {
    return;
  }
  state.warningKeys.add(key);
  state.warnings.push(warning);
}

function isRemoteUrl(target: string): boolean {
  return /^https?:\/\//i.test(target);
}

function isMarkdownFile(file: TFile): boolean {
  return file.extension.toLowerCase() === "md";
}

function isImageFile(file: TFile): boolean {
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(
    file.extension.toLowerCase()
  );
}

function calloutTitle(type: string): string {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case "note":
      return "说明";
    case "tip":
      return "提示";
    case "warning":
      return "注意";
    case "success":
      return "成功";
    case "danger":
      return "危险";
    case "info":
      return "信息";
    case "abstract":
      return "摘要";
    case "question":
      return "问题";
    default:
      return "说明";
  }
}
