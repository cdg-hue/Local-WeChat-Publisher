import type { CustomStyle, ElementStyles, ThemeDefinition } from "./types";

const baseThemes: ThemeDefinition[] = [
  {
    id: "default",
    name: "Default",
    description: "温和的默认文章样式",
    tokens: {
      colorText: "#2a2a2a",
      colorMuted: "#6b7280",
      colorPrimary: "#0f766e",
      colorBorder: "#d6d3d1",
      colorQuoteBg: "#f7f7f5",
      colorCodeBg: "#f3f4f6",
      colorHeading: "#111827",
      fontFamilyBase: "\"PingFang SC\", \"Helvetica Neue\", Arial, sans-serif",
      fontFamilyHeading: "\"PingFang SC\", \"Helvetica Neue\", Arial, sans-serif",
      fontSizeBase: "16px",
      lineHeightBase: "1.8",
      spacingSm: "8px",
      spacingMd: "16px",
      spacingLg: "24px",
      radiusSm: "4px",
      radiusMd: "8px",
    },
  },
  {
    id: "clean",
    name: "Clean",
    description: "更轻更白的排版风格",
    tokens: {
      colorText: "#1f2937",
      colorMuted: "#64748b",
      colorPrimary: "#2563eb",
      colorBorder: "#cbd5e1",
      colorQuoteBg: "#f8fafc",
      colorCodeBg: "#eff6ff",
      colorHeading: "#0f172a",
      fontFamilyBase: "\"Source Han Sans SC\", \"PingFang SC\", sans-serif",
      fontFamilyHeading: "\"Source Han Sans SC\", \"PingFang SC\", sans-serif",
      fontSizeBase: "16px",
      lineHeightBase: "1.75",
      spacingSm: "8px",
      spacingMd: "16px",
      spacingLg: "24px",
      radiusSm: "4px",
      radiusMd: "8px",
    },
  },
  {
    id: "tech",
    name: "Tech",
    description: "更强调代码与结构的技术风格",
    tokens: {
      colorText: "#d1d5db",
      colorMuted: "#94a3b8",
      colorPrimary: "#38bdf8",
      colorBorder: "#334155",
      colorQuoteBg: "#0f172a",
      colorCodeBg: "#111827",
      colorHeading: "#f8fafc",
      fontFamilyBase: "\"IBM Plex Sans\", \"PingFang SC\", sans-serif",
      fontFamilyHeading: "\"IBM Plex Sans\", \"PingFang SC\", sans-serif",
      fontSizeBase: "16px",
      lineHeightBase: "1.8",
      spacingSm: "8px",
      spacingMd: "16px",
      spacingLg: "24px",
      radiusSm: "4px",
      radiusMd: "8px",
    },
  },
];

function joinStyles(styles: Record<string, string | undefined>): string {
  return Object.entries(styles)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}

export function getBuiltInThemes(): ThemeDefinition[] {
  return baseThemes;
}

export function getThemeById(themeId: string): ThemeDefinition {
  return baseThemes.find((theme) => theme.id === themeId) ?? baseThemes[0];
}

export function presetToCustomStyle(preset: ThemeDefinition): CustomStyle {
  const { tokens } = preset;
  return {
    h1Color: tokens.colorHeading,
    h1BackgroundColor: "",
    h1Padding: "",
    h1Center: false,
    h2Color: tokens.colorHeading,
    h2BackgroundColor: "",
    h2Padding: "",
    h2Center: false,
    h3Color: tokens.colorHeading,
    h3BackgroundColor: "",
    h3Padding: "",
    h3Center: false,
    h4Color: tokens.colorHeading,
    h4BackgroundColor: "",
    h4Padding: "",
    h4Center: false,
    h5Color: tokens.colorHeading,
    h5BackgroundColor: "",
    h5Padding: "",
    h5Center: false,
    h6Color: tokens.colorHeading,
    h6BackgroundColor: "",
    h6Padding: "",
    h6Center: false,
    paragraphColor: tokens.colorText,
    paragraphFontSize: tokens.fontSizeBase,
    paragraphLineHeight: tokens.lineHeightBase,
    paragraphMargin: `${tokens.spacingMd} 0`,
    paragraphBackgroundColor: "",
    paragraphPadding: "",
    paragraphBorderRadius: "",
    blockquoteBackgroundColor: tokens.colorQuoteBg,
    blockquoteBorderColor: tokens.colorPrimary,
    blockquoteColor: tokens.colorText,
    blockquoteFontSize: tokens.fontSizeBase,
    blockquoteLineHeight: tokens.lineHeightBase,
    blockquoteMargin: `${tokens.spacingLg} 0`,
    blockquoteBorderRadius: tokens.radiusSm,
    blockquotePadding: `${tokens.spacingSm} ${tokens.spacingMd}`,
    inlineCodeColor: tokens.colorPrimary,
    inlineCodeBackgroundColor: tokens.colorCodeBg,
    inlineCodeFontSize: "0.92em",
    inlineCodePadding: "0.15em 0.35em",
    inlineCodeBorderRadius: tokens.radiusSm,
    codeColor: tokens.colorText,
    codeBackgroundColor: tokens.colorCodeBg,
    codeFontSize: "",
    codeLineHeight: "1.6",
    codePadding: tokens.spacingMd,
    codeMargin: `${tokens.spacingLg} 0`,
    codeBorderRadius: tokens.radiusMd,
  };
}

export function normalizeCustomStyle(style: Partial<CustomStyle> | null | undefined): CustomStyle {
  return {
    ...presetToCustomStyle(getThemeById("default")),
    ...(style ?? {}),
  };
}

export function buildElementStyles(style: CustomStyle): ElementStyles {
  return {
    article: joinStyles({
      color: style.paragraphColor,
      "font-family": "\"PingFang SC\", \"Helvetica Neue\", Arial, sans-serif",
      "font-size": style.paragraphFontSize,
      "line-height": style.paragraphLineHeight,
      "word-break": "break-word",
    }),
    p: joinStyles({
      margin: style.paragraphMargin,
      "background-color": style.paragraphBackgroundColor,
      padding: style.paragraphPadding,
      "border-radius": style.paragraphBorderRadius,
    }),
    h1: headingStyle(style, "h1", "1.85em"),
    h2: headingStyle(style, "h2", "1.55em"),
    h3: headingStyle(style, "h3", "1.3em"),
    h4: headingStyle(style, "h4", "1.15em"),
    h5: headingStyle(style, "h5", "1.05em"),
    h6: headingStyle(style, "h6", "1em"),
    blockquote: joinStyles({
      margin: style.blockquoteMargin,
      padding: style.blockquotePadding,
      "border-left": style.blockquoteBorderColor ? `4px solid ${style.blockquoteBorderColor}` : undefined,
      "background-color": style.blockquoteBackgroundColor,
      color: style.blockquoteColor,
      "font-size": style.blockquoteFontSize,
      "line-height": style.blockquoteLineHeight,
      "border-radius": style.blockquoteBorderRadius,
    }),
    ul: joinStyles({
      margin: "16px 0",
      padding: "0 0 0 1.4em",
    }),
    ol: joinStyles({
      margin: "16px 0",
      padding: "0 0 0 1.4em",
    }),
    li: joinStyles({
      margin: "8px 0",
    }),
    a: joinStyles({
      color: style.blockquoteBorderColor,
      "text-decoration": "none",
    }),
    img: joinStyles({
      display: "block",
      "max-width": "100%",
      margin: "16px auto",
      "border-radius": "4px",
    }),
    figure: joinStyles({
      margin: "24px 0",
    }),
    figcaption: joinStyles({
      color: "#6b7280",
      "font-size": "0.9em",
      "text-align": "center",
      margin: "8px 0 0",
    }),
    table: joinStyles({
      width: "100%",
      "border-collapse": "collapse",
      margin: "24px 0",
      "font-size": "0.95em",
    }),
    th: joinStyles({
      border: "1px solid #d6d3d1",
      padding: "8px 16px",
      "background-color": style.blockquoteBackgroundColor,
      "text-align": "left",
    }),
    td: joinStyles({
      border: "1px solid #d6d3d1",
      padding: "8px 16px",
      "text-align": "left",
    }),
    hr: joinStyles({
      border: "none",
      "border-top": "1px solid #d6d3d1",
      margin: "24px 0",
    }),
    pre: joinStyles({
      "background-color": style.codeBackgroundColor,
      color: style.codeColor,
      padding: style.codePadding,
      "border-radius": style.codeBorderRadius,
      "font-size": style.codeFontSize,
      "line-height": style.codeLineHeight,
      overflow: "auto",
      margin: style.codeMargin,
    }),
    codeInline: joinStyles({
      "background-color": style.inlineCodeBackgroundColor,
      color: style.inlineCodeColor,
      padding: style.inlineCodePadding,
      "border-radius": style.inlineCodeBorderRadius,
      "font-size": style.inlineCodeFontSize,
    }),
    codeBlock: joinStyles({
      background: "transparent",
      color: "inherit",
      padding: "0",
    }),
    strong: joinStyles({
      color: style.h1Color,
      "font-weight": "700",
    }),
    em: joinStyles({
      color: style.paragraphColor,
    }),
    warning: joinStyles({
      color: "#9a3412",
      background: "#fff7ed",
      border: "1px solid #fdba74",
      padding: "8px 16px",
      "border-radius": "4px",
      margin: "16px 0",
    }),
  };
}

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

function headingStyle(style: CustomStyle, level: HeadingLevel, size: string): string {
  return joinStyles({
    color: style[`${level}Color`],
    "background-color": style[`${level}BackgroundColor`],
    padding: style[`${level}Padding`],
    "text-align": style[`${level}Center`] ? "center" : undefined,
    "font-family": "\"PingFang SC\", \"Helvetica Neue\", Arial, sans-serif",
    "font-size": size,
    "font-weight": "700",
    margin: "24px 0 16px",
    "line-height": "1.35",
  });
}
