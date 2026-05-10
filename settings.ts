import type { CustomStyle } from "./types";

export interface LocalWechatSettings {
  theme: string;
  fontSize: "small" | "medium" | "large";
  forceLineBreaks: boolean;
  exportSuffix: string;
  openAfterExport: boolean;
  customStyle: CustomStyle;
}

export const DEFAULT_SETTINGS: LocalWechatSettings = {
  theme: "default",
  fontSize: "medium",
  forceLineBreaks: false,
  exportSuffix: ".wechat.html",
  openAfterExport: false,
  customStyle: {} as CustomStyle,
};
