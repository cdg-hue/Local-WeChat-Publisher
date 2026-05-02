import type { ElementStyles, FontSize, ThemeDefinition, ThemeTokens } from "./types";

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

function fontSizeValue(size: FontSize): string {
  switch (size) {
    case "small":
      return "15px";
    case "large":
      return "17px";
    default:
      return "16px";
  }
}

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

export function buildElementStyles(theme: ThemeDefinition, fontSize: FontSize): ElementStyles {
  const tokens: ThemeTokens = {
    ...theme.tokens,
    fontSizeBase: fontSizeValue(fontSize),
  };

  return {
    article: joinStyles({
      color: tokens.colorText,
      "font-family": tokens.fontFamilyBase,
      "font-size": tokens.fontSizeBase,
      "line-height": tokens.lineHeightBase,
      "word-break": "break-word",
    }),
    p: joinStyles({
      margin: `${tokens.spacingMd} 0`,
    }),
    h1: headingStyle(tokens, "1.85em"),
    h2: headingStyle(tokens, "1.55em"),
    h3: headingStyle(tokens, "1.3em"),
    h4: headingStyle(tokens, "1.15em"),
    h5: headingStyle(tokens, "1.05em"),
    h6: headingStyle(tokens, "1em"),
    blockquote: joinStyles({
      margin: `${tokens.spacingLg} 0`,
      padding: `${tokens.spacingSm} ${tokens.spacingMd}`,
      "border-left": `4px solid ${tokens.colorPrimary}`,
      background: tokens.colorQuoteBg,
      color: tokens.colorText,
      "border-radius": tokens.radiusSm,
    }),
    ul: joinStyles({
      margin: `${tokens.spacingMd} 0`,
      padding: "0 0 0 1.4em",
    }),
    ol: joinStyles({
      margin: `${tokens.spacingMd} 0`,
      padding: "0 0 0 1.4em",
    }),
    li: joinStyles({
      margin: `${tokens.spacingSm} 0`,
    }),
    a: joinStyles({
      color: tokens.colorPrimary,
      "text-decoration": "none",
    }),
    img: joinStyles({
      display: "block",
      "max-width": "100%",
      margin: `${tokens.spacingMd} auto`,
      "border-radius": tokens.radiusSm,
    }),
    figure: joinStyles({
      margin: `${tokens.spacingLg} 0`,
    }),
    figcaption: joinStyles({
      color: tokens.colorMuted,
      "font-size": "0.9em",
      "text-align": "center",
      margin: `${tokens.spacingSm} 0 0`,
    }),
    table: joinStyles({
      width: "100%",
      "border-collapse": "collapse",
      margin: `${tokens.spacingLg} 0`,
      "font-size": "0.95em",
    }),
    th: joinStyles({
      border: `1px solid ${tokens.colorBorder}`,
      padding: `${tokens.spacingSm} ${tokens.spacingMd}`,
      background: tokens.colorQuoteBg,
      "text-align": "left",
    }),
    td: joinStyles({
      border: `1px solid ${tokens.colorBorder}`,
      padding: `${tokens.spacingSm} ${tokens.spacingMd}`,
      "text-align": "left",
    }),
    hr: joinStyles({
      border: "none",
      "border-top": `1px solid ${tokens.colorBorder}`,
      margin: `${tokens.spacingLg} 0`,
    }),
    pre: joinStyles({
      background: tokens.colorCodeBg,
      color: tokens.colorText,
      padding: `${tokens.spacingMd}`,
      "border-radius": tokens.radiusMd,
      overflow: "auto",
      margin: `${tokens.spacingLg} 0`,
    }),
    codeInline: joinStyles({
      background: tokens.colorCodeBg,
      color: tokens.colorPrimary,
      padding: "0.15em 0.35em",
      "border-radius": tokens.radiusSm,
      "font-size": "0.92em",
    }),
    codeBlock: joinStyles({
      background: "transparent",
      color: "inherit",
      padding: "0",
    }),
    strong: joinStyles({
      color: tokens.colorHeading,
      "font-weight": "700",
    }),
    em: joinStyles({
      color: tokens.colorText,
    }),
    warning: joinStyles({
      color: "#9a3412",
      background: "#fff7ed",
      border: "1px solid #fdba74",
      padding: `${tokens.spacingSm} ${tokens.spacingMd}`,
      "border-radius": tokens.radiusSm,
      margin: `${tokens.spacingMd} 0`,
    }),
  };
}

function headingStyle(tokens: ThemeTokens, size: string): string {
  return joinStyles({
    color: tokens.colorHeading,
    "font-family": tokens.fontFamilyHeading,
    "font-size": size,
    "font-weight": "700",
    margin: `${tokens.spacingLg} 0 ${tokens.spacingMd}`,
    "line-height": "1.35",
  });
}
