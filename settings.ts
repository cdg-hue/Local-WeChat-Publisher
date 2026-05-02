export interface LocalWechatSettings {
  theme: string;
  fontSize: "small" | "medium" | "large";
  forceLineBreaks: boolean;
  exportSuffix: string;
  openAfterExport: boolean;
}

export const DEFAULT_SETTINGS: LocalWechatSettings = {
  theme: "default",
  fontSize: "medium",
  forceLineBreaks: false,
  exportSuffix: ".wechat.html",
  openAfterExport: false,
};
