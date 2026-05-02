import type { App, TFile } from "obsidian";
import type { LocalWechatSettings } from "./settings";

export type FontSize = "small" | "medium" | "large";

export interface RenderContext {
  app: App;
  file?: TFile | null;
}

export interface RenderSettings extends LocalWechatSettings {}

export interface ResolvedAsset {
  id: string;
  original: string;
  kind: "local-image" | "remote-image" | "missing-file" | "wiki-link";
  resolvedPath?: string;
  previewSrc?: string;
  exportSrc?: string;
  alt?: string;
  displayText?: string;
  width?: number;
  warning?: string;
}

export interface RenderWarning {
  code:
    | "LOCAL_IMAGE_NOT_EXPORTABLE"
    | "UNSUPPORTED_SYNTAX"
    | "MISSING_ATTACHMENT"
    | "UNSAFE_HTML_REMOVED";
  message: string;
  source?: string;
}

export interface NormalizedDocument {
  markdown: string;
  normalizedMarkdown: string;
  assets: ResolvedAsset[];
  warnings: RenderWarning[];
}

export interface PreviewRenderResult {
  html: string;
  warnings: RenderWarning[];
}

export interface ExportRenderResult {
  html: string;
  plainText: string;
  warnings: RenderWarning[];
}

export interface RenderWechatArticleOptions {
  markdown: string;
  context: RenderContext;
  settings: RenderSettings;
}

export interface RenderWechatArticleResult {
  normalized: NormalizedDocument;
  preview: PreviewRenderResult;
  exportResult: ExportRenderResult;
}

export interface ThemeTokens {
  colorText: string;
  colorMuted: string;
  colorPrimary: string;
  colorBorder: string;
  colorQuoteBg: string;
  colorCodeBg: string;
  colorHeading: string;
  fontFamilyBase: string;
  fontFamilyHeading: string;
  fontSizeBase: string;
  lineHeightBase: string;
  spacingSm: string;
  spacingMd: string;
  spacingLg: string;
  radiusSm: string;
  radiusMd: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description?: string;
  tokens: ThemeTokens;
}

export interface ElementStyles {
  article: string;
  p: string;
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  h5: string;
  h6: string;
  blockquote: string;
  ul: string;
  ol: string;
  li: string;
  a: string;
  img: string;
  figure: string;
  figcaption: string;
  table: string;
  th: string;
  td: string;
  hr: string;
  pre: string;
  codeInline: string;
  codeBlock: string;
  strong: string;
  em: string;
  warning: string;
}
