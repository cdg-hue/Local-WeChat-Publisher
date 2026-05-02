import { ItemView, Setting, WorkspaceLeaf } from "obsidian";
import type LocalWechatPlugin from "./main";
import type { RenderWechatArticleResult } from "./types";

export const LOCAL_WECHAT_VIEW_TYPE = "local-wechat-preview-view";

export class LocalWechatView extends ItemView {
  private plugin: LocalWechatPlugin;
  private previewEl!: HTMLElement;
  private warningsEl!: HTMLElement;
  private toolbarEl!: HTMLElement;
  private copyStatusEl!: HTMLElement;
  private contentScrollEl!: HTMLElement;
  private currentMarkdown = "";
  private currentFilePath: string | null = null;
  private lastResult: RenderWechatArticleResult | null = null;
  private copyStatus:
    | {
        tone: "idle" | "success" | "warning" | "plain" | "error";
        message: string;
      }
    | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: LocalWechatPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return LOCAL_WECHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "WeChat Preview";
  }

  getIcon(): string {
    return "newspaper";
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass("wechat-plugin-view");

    this.toolbarEl = this.contentEl.createDiv({ cls: "wechat-plugin-toolbar" });
    this.copyStatusEl = this.contentEl.createDiv({ cls: "wechat-plugin-copy-status" });
    this.contentScrollEl = this.contentEl.createDiv({ cls: "wechat-plugin-content-scroll" });
    this.previewEl = this.contentScrollEl.createDiv({ cls: "wechat-plugin-preview" });
    this.warningsEl = this.contentScrollEl.createDiv({ cls: "wechat-plugin-warnings" });

    this.renderToolbar();
    this.renderCopyStatus();
    this.renderPlaceholder();
  }

  setRenderResult(
    result: RenderWechatArticleResult,
    markdown: string,
    filePath: string | null
  ): void {
    this.lastResult = result;
    this.currentMarkdown = markdown;
    this.currentFilePath = filePath;
    this.renderToolbar();
    this.renderCopyStatus();
    this.renderWarnings();
    this.previewEl.innerHTML = result.preview.html;
  }

  setCopyStatus(status: {
    tone: "idle" | "success" | "warning" | "plain" | "error";
    message: string;
  }): void {
    this.copyStatus = status;
    this.renderCopyStatus();
  }

  private renderToolbar(): void {
    this.toolbarEl.empty();

    const controlWrap = this.toolbarEl.createDiv({ cls: "wechat-plugin-toolbar-controls" });
    const actionsWrap = this.toolbarEl.createDiv({ cls: "wechat-plugin-toolbar-actions" });

    const themeSetting = new Setting(controlWrap);
    themeSetting.setName("主题");
    themeSetting.addDropdown((dropdown) => {
      this.plugin.getAvailableThemes().forEach((theme) => {
        dropdown.addOption(theme.id, theme.name);
      });
      dropdown.setValue(this.plugin.settings.theme).onChange(async (value) => {
        this.plugin.settings.theme = value;
        await this.plugin.saveSettings();
        await this.plugin.openPreviewForCurrentFile();
      });
    });

    const fontSetting = new Setting(controlWrap);
    fontSetting.setName("字号");
    fontSetting.addDropdown((dropdown) => {
      dropdown
        .addOption("small", "小")
        .addOption("medium", "中")
        .addOption("large", "大")
        .setValue(this.plugin.settings.fontSize)
        .onChange(async (value) => {
          this.plugin.settings.fontSize = value as typeof this.plugin.settings.fontSize;
          await this.plugin.saveSettings();
          await this.plugin.openPreviewForCurrentFile();
        });
    });

    const refreshButton = actionsWrap.createEl("button", {
      cls: "mod-cta",
      text: "刷新",
    });
    refreshButton.addEventListener("click", () => {
      void this.plugin.openPreviewForCurrentFile();
    });

    const copyButton = actionsWrap.createEl("button", {
      cls: "mod-cta",
      text: "复制到公众号",
    });
    copyButton.addEventListener("click", () => {
      this.setCopyStatus({
        tone: "idle",
        message: "正在读取当前 Markdown、刷新排版并复制公众号 HTML。",
      });
      void this.plugin.copyCurrentNoteHtml();
    });

    const exportButton = actionsWrap.createEl("button", {
      text: "导出文件",
    });
    exportButton.addEventListener("click", () => {
      void this.plugin.exportCurrentNoteHtml();
    });

    const openWechatButton = actionsWrap.createEl("button", {
      text: "打开公众号",
    });
    openWechatButton.addEventListener("click", () => {
      window.open("https://mp.weixin.qq.com", "_blank");
    });
  }

  private renderPlaceholder(): void {
    this.renderCopyStatus();
    this.warningsEl.empty();
    this.previewEl.empty();
    const empty = this.previewEl.createDiv({ cls: "wechat-plugin-placeholder" });
    empty.createEl("h3", { text: "Local WeChat Preview" });
    empty.createEl("p", { text: "打开 Markdown 文件后，使用命令或左侧按钮开始本地排版。" });
  }

  private renderCopyStatus(): void {
    this.copyStatusEl.empty();

    const status = this.copyStatus ?? {
      tone: "idle" as const,
      message: "最近还没有复制操作。点击“复制到公众号”后，这里会显示最近一次复制结果。",
    };

    const item = this.copyStatusEl.createDiv({
      cls: `wechat-plugin-copy-status-item wechat-plugin-copy-status-${status.tone}`,
    });
    item.createEl("strong", { text: copyStatusLabel(status.tone) });
    item.createSpan({ text: ` ${status.message}` });
  }

  private renderWarnings(): void {
    this.warningsEl.empty();
    const warnings = this.lastResult
      ? dedupeWarnings([
          ...this.lastResult.normalized.warnings,
          ...this.lastResult.exportResult.warnings,
        ])
      : [];

    if (warnings.length === 0) {
      const okPanel = this.warningsEl.createDiv({ cls: "wechat-plugin-check-panel wechat-plugin-check-ok" });
      okPanel.createEl("strong", { text: "发布检查通过" });
      okPanel.createEl("p", { text: "当前未发现导出风险，可以直接复制 HTML 并粘贴到公众号编辑器。" });
      return;
    }

    const groupedWarnings = groupWarnings(warnings);
    const header = this.warningsEl.createDiv({ cls: "wechat-plugin-check-panel wechat-plugin-check-summary" });
    header.createEl("strong", { text: "发布前检查" });
    header.createEl("p", {
      text: `当前发现 ${warnings.length} 项风险，复制前建议先确认下面的问题。`,
    });

    groupedWarnings.forEach((group) => {
      const section = this.warningsEl.createDiv({ cls: "wechat-plugin-check-panel wechat-plugin-check-group" });
      section.createDiv({
        cls: "wechat-plugin-check-group-title",
        text: `${group.title} · ${group.items.length}`,
      });

      const list = section.createEl("ul", { cls: "wechat-plugin-check-list" });
      group.items.forEach((warning) => {
        const item = list.createEl("li");
        item.createSpan({ text: warning.message });
        if (warning.source) {
          item.createEl("code", { text: ` ${warning.source}` });
        }
      });
    });
  }

}

function dedupeWarnings(
  warnings: RenderWechatArticleResult["normalized"]["warnings"]
): RenderWechatArticleResult["normalized"]["warnings"] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.code}:${warning.source ?? ""}:${warning.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function groupWarnings(
  warnings: RenderWechatArticleResult["normalized"]["warnings"]
): Array<{
  title: string;
  items: RenderWechatArticleResult["normalized"]["warnings"];
}> {
  const groups = new Map<string, RenderWechatArticleResult["normalized"]["warnings"]>();

  warnings.forEach((warning) => {
    const title = warningGroupTitle(warning.code);
    const current = groups.get(title) ?? [];
    current.push(warning);
    groups.set(title, current);
  });

  return Array.from(groups.entries()).map(([title, items]) => ({ title, items }));
}

function warningGroupTitle(code: RenderWechatArticleResult["normalized"]["warnings"][number]["code"]): string {
  switch (code) {
    case "LOCAL_IMAGE_NOT_EXPORTABLE":
      return "本地图片";
    case "MISSING_ATTACHMENT":
      return "缺失附件";
    case "UNSUPPORTED_SYNTAX":
      return "未支持语法";
    case "UNSAFE_HTML_REMOVED":
      return "已清理内容";
    default:
      return "其他风险";
  }
}

function copyStatusLabel(tone: "idle" | "success" | "warning" | "plain" | "error"): string {
  switch (tone) {
    case "success":
      return "复制成功";
    case "warning":
      return "已复制，但有风险";
    case "plain":
      return "仅复制纯文本";
    case "error":
      return "复制失败";
    default:
      return "复制状态";
  }
}
