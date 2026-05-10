import {
  App,
  Editor,
  MarkdownView,
  Notice,
  normalizePath,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
} from "obsidian";
import { DEFAULT_SETTINGS, type LocalWechatSettings } from "./settings";
import { renderWechatArticle } from "./renderer";
import { LocalWechatView, LOCAL_WECHAT_VIEW_TYPE } from "./view";
import { copyWechatHtml } from "./clipboard";
import type { RenderWechatArticleResult } from "./types";
import { getBuiltInThemes, normalizeCustomStyle } from "./theme";
import { StyleEditorModal } from "./style-editor-modal";

export default class LocalWechatPlugin extends Plugin {
  settings: LocalWechatSettings = DEFAULT_SETTINGS;
  private lastMarkdownFilePath: string | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      LOCAL_WECHAT_VIEW_TYPE,
      (leaf) => new LocalWechatView(leaf, this)
    );

    this.addRibbonIcon("panel-right-open", "Local WeChat：打开预览面板（不复制）", async () => {
      await this.openPreviewForCurrentFile();
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.rememberCurrentMarkdownFile();
      })
    );

    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (file instanceof TFile && isMarkdownFile(file)) {
          this.lastMarkdownFilePath = file.path;
        }
      })
    );

    this.addCommand({
      id: "copy-current-note-to-wechat-html",
      name: "一键复制当前笔记到公众号",
      editorCallback: async (_editor: Editor) => {
        await this.copyCurrentNoteHtml();
      },
    });

    this.addCommand({
      id: "open-wechat-preview-for-current-note",
      name: "打开当前笔记的公众号预览",
      editorCallback: async (_editor: Editor) => {
        await this.openPreviewForCurrentFile();
      },
    });

    this.addCommand({
      id: "export-current-note-wechat-html-file",
      name: "导出当前笔记为 HTML 文件",
      editorCallback: async (_editor: Editor) => {
        await this.exportCurrentNoteHtml();
      },
    });

    this.addSettingTab(new LocalWechatSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    const normalizedStyle = normalizeCustomStyle(this.settings.customStyle);
    if (JSON.stringify(this.settings.customStyle) !== JSON.stringify(normalizedStyle)) {
      this.settings.customStyle = normalizedStyle;
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async openPreviewForCurrentFile(preferredFilePath?: string | null): Promise<void> {
    const source = await this.getCurrentMarkdownSource(preferredFilePath);
    if (!source) {
      new Notice("请先打开一个 Markdown 文件。");
      return;
    }

    if (!source.markdown.trim()) {
      new Notice("当前文件没有内容。");
      return;
    }

    const result = await this.renderMarkdown(source.markdown, source.file);
    await this.showResult(result, source.markdown, source.file);
    new Notice("已打开公众号预览，未执行复制。");
  }

  async copyCurrentNoteHtml(preferredFilePath?: string | null): Promise<void> {
    const source = await this.getCurrentMarkdownSource(preferredFilePath);
    if (!source) {
      new Notice("请先打开一个 Markdown 文件。");
      return;
    }

    if (!source.markdown.trim()) {
      new Notice("当前文件没有内容。");
      return;
    }

    const result = await this.renderMarkdown(source.markdown, source.file);
    const previewView = await this.showResult(result, source.markdown, source.file);

    const warnings = dedupeWarnings([
      ...result.normalized.warnings,
      ...result.exportResult.warnings,
    ]);

    let copyResult;
    try {
      copyResult = await copyWechatHtml({
        html: result.exportResult.html,
        plainText: result.exportResult.plainText,
      });
    } catch (error) {
      previewView?.setCopyStatus({
        tone: "error",
        message: `复制失败：${error instanceof Error ? error.message : String(error)}`,
      });
      new Notice(`复制失败: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    if (copyResult.mode === "plain-text") {
      previewView?.setCopyStatus({
        tone: "plain",
        message: "当前环境只复制了纯文本，不能直接用于公众号富文本粘贴。",
      });
      new Notice("当前环境只复制了纯文本，不能直接用于公众号富文本粘贴。", 5000);
      return;
    }

    if (warnings.length > 0) {
      previewView?.setCopyStatus({
        tone: "warning",
        message: `已复制公众号 HTML，但仍有 ${warnings.length} 项风险，粘贴前请先查看下面的发布前检查。`,
      });
      new Notice(`已复制公众号 HTML。当前仍有 ${warnings.length} 项风险，请在右侧检查面板确认。`, 5000);
    } else {
      previewView?.setCopyStatus({
        tone: "success",
        message: "已复制公众号 HTML，可直接粘贴到公众号写作区域。",
      });
      new Notice("已复制公众号 HTML，可直接粘贴到公众号写作区域。");
    }
  }

  async exportCurrentNoteHtml(preferredFilePath?: string | null): Promise<void> {
    const source = await this.getCurrentMarkdownSource(preferredFilePath);
    if (!source) {
      new Notice("请先打开一个 Markdown 文件。");
      return;
    }

    if (!source.markdown.trim()) {
      new Notice("当前文件没有内容。");
      return;
    }

    const result = await this.renderMarkdown(source.markdown, source.file);
    const exportPath = await this.exportHtmlFile(result.exportResult.html, source.file);
    await this.openExportedFileIfNeeded(exportPath);
    await this.showResult(result, source.markdown, source.file);
    new Notice(`HTML 已导出到 ${exportPath}`);
  }

  async renderMarkdown(markdown: string, file?: TFile | null): Promise<RenderWechatArticleResult> {
    return renderWechatArticle({
      markdown,
      context: {
        app: this.app,
        file,
      },
      settings: this.settings,
    });
  }

  async showResult(
    result: RenderWechatArticleResult,
    markdown: string,
    file?: TFile | null
  ): Promise<LocalWechatView | null> {
    const leaves = this.app.workspace.getLeavesOfType(LOCAL_WECHAT_VIEW_TYPE);
    const leaf = leaves[0] ?? this.app.workspace.getRightLeaf(false);
    if (!leaf) {
      return null;
    }

    await leaf.setViewState({
      type: LOCAL_WECHAT_VIEW_TYPE,
      active: true,
    });

    this.app.workspace.revealLeaf(leaf);
    const view = leaf.view;
    if (view instanceof LocalWechatView) {
      view.setRenderResult(result, markdown, file?.path ?? null);
      return view;
    }
    return null;
  }

  getAvailableThemes() {
    return getBuiltInThemes();
  }

  resolveFileByPath(path: string | null): TFile | null {
    if (!path) {
      return null;
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : null;
  }

  async getCurrentMarkdownSource(preferredFilePath?: string | null): Promise<{
    markdown: string;
    file: TFile | null;
  } | null> {
    const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeMarkdownView) {
      if (activeMarkdownView.file && isMarkdownFile(activeMarkdownView.file)) {
        this.lastMarkdownFilePath = activeMarkdownView.file.path;
      }
      return {
        markdown: activeMarkdownView.editor.getValue(),
        file: activeMarkdownView.file ?? null,
      };
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile && isMarkdownFile(activeFile)) {
      this.lastMarkdownFilePath = activeFile.path;
      const openView = this.findMarkdownViewForFile(activeFile.path);
      return {
        markdown: openView?.editor.getValue() ?? await this.app.vault.cachedRead(activeFile),
        file: activeFile,
      };
    }

    const rememberedSource = await this.getMarkdownSourceByPath(this.lastMarkdownFilePath);
    if (rememberedSource) {
      return rememberedSource;
    }

    const preferredSource = await this.getMarkdownSourceByPath(preferredFilePath ?? null);
    if (preferredSource) {
      return preferredSource;
    }

    const openMarkdownView = this.findFirstMarkdownView();
    if (openMarkdownView) {
      if (openMarkdownView.file && isMarkdownFile(openMarkdownView.file)) {
        this.lastMarkdownFilePath = openMarkdownView.file.path;
      }
      return {
        markdown: openMarkdownView.editor.getValue(),
        file: openMarkdownView.file ?? null,
      };
    }

    return null;
  }

  private async getMarkdownSourceByPath(path: string | null): Promise<{
    markdown: string;
    file: TFile | null;
  } | null> {
    if (!path) {
      return null;
    }

    const openView = this.findMarkdownViewForFile(path);
    if (openView) {
      return {
        markdown: openView.editor.getValue(),
        file: openView.file ?? this.resolveFileByPath(path),
      };
    }

    const file = this.resolveFileByPath(path);
    if (file && isMarkdownFile(file)) {
      return {
        markdown: await this.app.vault.cachedRead(file),
        file,
      };
    }

    return null;
  }

  private rememberCurrentMarkdownFile(): void {
    const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeMarkdownView?.file && isMarkdownFile(activeMarkdownView.file)) {
      this.lastMarkdownFilePath = activeMarkdownView.file.path;
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile && isMarkdownFile(activeFile)) {
      this.lastMarkdownFilePath = activeFile.path;
    }
  }

  private findMarkdownViewForFile(path: string): MarkdownView | null {
    return this.findMarkdownViews().find((view) => view.file?.path === path) ?? null;
  }

  private findFirstMarkdownView(): MarkdownView | null {
    return this.findMarkdownViews().find((view) => view.file && isMarkdownFile(view.file)) ?? null;
  }

  private findMarkdownViews(): MarkdownView[] {
    const views: MarkdownView[] = [];
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof MarkdownView) {
        views.push(leaf.view);
      }
    });
    return views;
  }

  async exportHtmlFile(html: string, file?: TFile | null): Promise<string> {
    const exportPath = this.buildExportPath(file);
    const existing = this.app.vault.getAbstractFileByPath(exportPath);
    const documentHtml = this.buildExportDocument(html, file);

    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, documentHtml);
      return exportPath;
    }

    await this.app.vault.create(exportPath, documentHtml);
    return exportPath;
  }

  async openExportedFileIfNeeded(exportPath: string): Promise<void> {
    if (!this.settings.openAfterExport || !Platform.isDesktopApp) {
      return;
    }

    const file = this.resolveFileByPath(exportPath);
    if (!file) {
      return;
    }

    const resourcePath = this.app.vault.getResourcePath(file);
    window.open(resourcePath, "_blank");
  }

  private buildExportPath(file?: TFile | null): string {
    const suffix = this.normalizeExportSuffix(this.settings.exportSuffix);

    if (file) {
      const filePathWithoutExt = file.path.replace(/\.[^/.]+$/, "");
      return normalizePath(`${filePathWithoutExt}${suffix}`);
    }

    return normalizePath(`wechat-export-${Date.now()}${suffix}`);
  }

  private normalizeExportSuffix(suffix: string): string {
    const trimmed = suffix.trim() || ".wechat.html";
    return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
  }

  private buildExportDocument(articleHtml: string, file?: TFile | null): string {
    const title = this.escapeHtml(file?.basename ?? "WeChat Export");

    return [
      "<!DOCTYPE html>",
      '<html lang="zh-CN">',
      "<head>",
      '  <meta charset="UTF-8" />',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      `  <title>${title}</title>`,
      "  <style>",
      "    body {",
      "      margin: 0;",
      "      padding: 24px;",
      "      background: #f5f5f4;",
      '      font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;',
      "    }",
      "    .wechat-export-shell {",
      "      max-width: 860px;",
      "      margin: 0 auto;",
      "      background: #ffffff;",
      "      border-radius: 12px;",
      "      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);",
      "      padding: 32px;",
      "    }",
      "  </style>",
      "</head>",
      "<body>",
      '  <div class="wechat-export-shell">',
      `    ${articleHtml}`,
      "  </div>",
      "</body>",
      "</html>",
    ].join("\n");
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

class LocalWechatSettingTab extends PluginSettingTab {
  plugin: LocalWechatPlugin;

  constructor(app: App, plugin: LocalWechatPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Local WeChat Publisher" });

    new Setting(containerEl)
      .setName("样式编辑器")
      .setDesc("管理公众号预设、自定义样式字段和实时预览。")
      .addButton((button) => {
        button.setButtonText("打开样式编辑器").setCta().onClick(() => {
          new StyleEditorModal(this.app, this.plugin).open();
        });
      });

    new Setting(containerEl)
      .setName("单换行转为换行标签")
      .setDesc("启用后会尽量保留单个换行。")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.forceLineBreaks).onChange(async (value) => {
          this.plugin.settings.forceLineBreaks = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("导出文件后缀")
      .setDesc("导出 HTML 文件时追加到原文件名后的后缀。")
      .addText((text) => {
        text
          .setPlaceholder(".wechat.html")
          .setValue(this.plugin.settings.exportSuffix)
          .onChange(async (value) => {
            this.plugin.settings.exportSuffix = value || ".wechat.html";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("导出后自动打开")
      .setDesc("导出 HTML 文件后自动在浏览器中新标签页打开。默认关闭，避免打断直接复制流程。")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.openAfterExport).onChange(async (value) => {
          this.plugin.settings.openAfterExport = value;
          await this.plugin.saveSettings();
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

function isMarkdownFile(file: TFile): boolean {
  return file.extension.toLowerCase() === "md";
}
