import { App, DropdownComponent, Modal, Setting } from "obsidian";
import type LocalWechatPlugin from "./main";
import { renderPreviewHtml } from "./render-preview";
import { getBuiltInThemes, getThemeById, presetToCustomStyle } from "./theme";
import type { CustomStyle, NormalizedDocument } from "./types";

const CUSTOM_PRESET_VALUE = "custom";

const SAMPLE_MARKDOWN = [
  "# H1 标题示例",
  "",
  "这是一段正文内容，用来观察字号、颜色、行高和段落间距。这里包含一段 `inline code` 作为行内代码示例。",
  "",
  "## H2 标题示例",
  "",
  "> 这是一段引用块内容，用来观察背景色、边框、文字颜色、圆角和内边距。",
  "",
  "### H3 标题示例",
  "",
  "第二段正文用于确认连续段落之间的距离和背景设置。",
  "",
  "```ts",
  "const message = \"Hello WeChat\";",
  "console.log(message);",
  "```",
].join("\n");

const SAMPLE_NORMALIZED_DOCUMENT: NormalizedDocument = {
  markdown: SAMPLE_MARKDOWN,
  normalizedMarkdown: SAMPLE_MARKDOWN,
  assets: [],
  warnings: [],
};

type StyleField = {
  key: keyof CustomStyle;
  label: string;
  kind: "color" | "select" | "toggle";
  placeholder?: string;
  options?: StyleOption[];
};

type StyleOption = {
  label: string;
  value: string;
};

type ColorSwatch = {
  label: string;
  value: string;
};

type ThemeColorColumn = {
  base: ColorSwatch;
  shades: ColorSwatch[];
};

const THEME_COLOR_COLUMNS: ThemeColorColumn[] = [
  {
    base: { label: "白色", value: "#ffffff" },
    shades: [
      { label: "灰 1", value: "#f3f4f6" },
      { label: "灰 2", value: "#d1d5db" },
      { label: "灰 3", value: "#9ca3af" },
      { label: "灰 4", value: "#4b5563" },
      { label: "灰 5", value: "#111827" },
    ],
  },
  {
    base: { label: "黑色", value: "#000000" },
    shades: [
      { label: "黑 1", value: "#374151" },
      { label: "黑 2", value: "#1f2937" },
      { label: "黑 3", value: "#111827" },
      { label: "黑 4", value: "#030712" },
      { label: "黑 5", value: "#000000" },
    ],
  },
  {
    base: { label: "蓝灰", value: "#334155" },
    shades: [
      { label: "蓝灰 1", value: "#e2e8f0" },
      { label: "蓝灰 2", value: "#cbd5e1" },
      { label: "蓝灰 3", value: "#94a3b8" },
      { label: "蓝灰 4", value: "#475569" },
      { label: "蓝灰 5", value: "#0f172a" },
    ],
  },
  {
    base: { label: "天蓝", value: "#0ea5e9" },
    shades: [
      { label: "天蓝 1", value: "#e0f2fe" },
      { label: "天蓝 2", value: "#bae6fd" },
      { label: "天蓝 3", value: "#38bdf8" },
      { label: "天蓝 4", value: "#0284c7" },
      { label: "天蓝 5", value: "#075985" },
    ],
  },
  {
    base: { label: "橙色", value: "#ea580c" },
    shades: [
      { label: "橙 1", value: "#ffedd5" },
      { label: "橙 2", value: "#fed7aa" },
      { label: "橙 3", value: "#fb923c" },
      { label: "橙 4", value: "#c2410c" },
      { label: "橙 5", value: "#7c2d12" },
    ],
  },
  {
    base: { label: "中灰", value: "#52525b" },
    shades: [
      { label: "中灰 1", value: "#f4f4f5" },
      { label: "中灰 2", value: "#d4d4d8" },
      { label: "中灰 3", value: "#a1a1aa" },
      { label: "中灰 4", value: "#3f3f46" },
      { label: "中灰 5", value: "#18181b" },
    ],
  },
  {
    base: { label: "黄色", value: "#ca8a04" },
    shades: [
      { label: "黄 1", value: "#fef9c3" },
      { label: "黄 2", value: "#fef08a" },
      { label: "黄 3", value: "#facc15" },
      { label: "黄 4", value: "#a16207" },
      { label: "黄 5", value: "#713f12" },
    ],
  },
  {
    base: { label: "蓝色", value: "#2563eb" },
    shades: [
      { label: "蓝 1", value: "#dbeafe" },
      { label: "蓝 2", value: "#bfdbfe" },
      { label: "蓝 3", value: "#60a5fa" },
      { label: "蓝 4", value: "#1d4ed8" },
      { label: "蓝 5", value: "#1e3a8a" },
    ],
  },
  {
    base: { label: "绿色", value: "#16a34a" },
    shades: [
      { label: "绿 1", value: "#dcfce7" },
      { label: "绿 2", value: "#bbf7d0" },
      { label: "绿 3", value: "#4ade80" },
      { label: "绿 4", value: "#15803d" },
      { label: "绿 5", value: "#14532d" },
    ],
  },
];

const STANDARD_COLORS: ColorSwatch[] = [
  { label: "深红", value: "#b91c1c" },
  { label: "红色", value: "#dc2626" },
  { label: "金色", value: "#f59e0b" },
  { label: "亮黄", value: "#d9f99d" },
  { label: "草绿", value: "#65a30d" },
  { label: "绿色", value: "#15803d" },
  { label: "青色", value: "#0891b2" },
  { label: "蓝色", value: "#1d4ed8" },
  { label: "深蓝", value: "#111827" },
  { label: "紫色", value: "#581c87" },
];

const PADDING_OPTIONS: StyleOption[] = [
  { label: "无", value: "" },
  { label: "小 4px 8px", value: "4px 8px" },
  { label: "中 8px 12px", value: "8px 12px" },
  { label: "大 12px 16px", value: "12px 16px" },
  { label: "宽松 16px 20px", value: "16px 20px" },
];

const MARGIN_OPTIONS: StyleOption[] = [
  { label: "紧凑 8px 0", value: "8px 0" },
  { label: "默认 16px 0", value: "16px 0" },
  { label: "宽松 24px 0", value: "24px 0" },
];

const RADIUS_OPTIONS: StyleOption[] = [
  { label: "无", value: "" },
  { label: "小 4px", value: "4px" },
  { label: "中 8px", value: "8px" },
  { label: "大 12px", value: "12px" },
  { label: "圆润 16px", value: "16px" },
];

const PARAGRAPH_FONT_SIZE_OPTIONS: StyleOption[] = [
  { label: "小 15px", value: "15px" },
  { label: "默认 16px", value: "16px" },
  { label: "大 17px", value: "17px" },
  { label: "特大 18px", value: "18px" },
];

const CODE_FONT_SIZE_OPTIONS: StyleOption[] = [
  { label: "继承", value: "" },
  { label: "小 13px", value: "13px" },
  { label: "默认 14px", value: "14px" },
  { label: "大 15px", value: "15px" },
];

const LINE_HEIGHT_OPTIONS: StyleOption[] = [
  { label: "紧凑 1.5", value: "1.5" },
  { label: "默认 1.75", value: "1.75" },
  { label: "舒适 1.8", value: "1.8" },
  { label: "宽松 2", value: "2" },
];

const PARAGRAPH_FIELDS: StyleField[] = [
  {
    key: "paragraphColor",
    label: "文字颜色",
    kind: "color",
    placeholder: "#2a2a2a",
  },
  {
    key: "paragraphFontSize",
    label: "字号",
    kind: "select",
    placeholder: "16px",
    options: PARAGRAPH_FONT_SIZE_OPTIONS,
  },
  {
    key: "paragraphLineHeight",
    label: "行高",
    kind: "select",
    placeholder: "1.8",
    options: LINE_HEIGHT_OPTIONS,
  },
  {
    key: "paragraphMargin",
    label: "段落间距",
    kind: "select",
    placeholder: "16px 0",
    options: MARGIN_OPTIONS,
  },
  {
    key: "paragraphBackgroundColor",
    label: "背景色",
    kind: "color",
    placeholder: "#f0f4ff",
  },
  {
    key: "paragraphPadding",
    label: "内边距",
    kind: "select",
    placeholder: "8px 12px",
    options: PADDING_OPTIONS,
  },
  {
    key: "paragraphBorderRadius",
    label: "圆角",
    kind: "select",
    placeholder: "6px",
    options: RADIUS_OPTIONS,
  },
];

const BLOCKQUOTE_FIELDS: StyleField[] = [
  {
    key: "blockquoteBackgroundColor",
    label: "背景色",
    kind: "color",
    placeholder: "#f7f7f5",
  },
  {
    key: "blockquoteBorderColor",
    label: "左侧边框颜色",
    kind: "color",
    placeholder: "#0f766e",
  },
  {
    key: "blockquoteColor",
    label: "文字颜色",
    kind: "color",
    placeholder: "#2a2a2a",
  },
  {
    key: "blockquoteFontSize",
    label: "字号",
    kind: "select",
    placeholder: "16px",
    options: PARAGRAPH_FONT_SIZE_OPTIONS,
  },
  {
    key: "blockquoteLineHeight",
    label: "行高",
    kind: "select",
    placeholder: "1.8",
    options: LINE_HEIGHT_OPTIONS,
  },
  {
    key: "blockquoteMargin",
    label: "外边距",
    kind: "select",
    placeholder: "24px 0",
    options: MARGIN_OPTIONS,
  },
  {
    key: "blockquoteBorderRadius",
    label: "圆角",
    kind: "select",
    placeholder: "4px",
    options: RADIUS_OPTIONS,
  },
  {
    key: "blockquotePadding",
    label: "内边距",
    kind: "select",
    placeholder: "8px 16px",
    options: PADDING_OPTIONS,
  },
];

const INLINE_CODE_FIELDS: StyleField[] = [
  {
    key: "inlineCodeColor",
    label: "文字颜色",
    kind: "color",
    placeholder: "#0f766e",
  },
  {
    key: "inlineCodeBackgroundColor",
    label: "背景色",
    kind: "color",
    placeholder: "#f3f4f6",
  },
  {
    key: "inlineCodeFontSize",
    label: "字体大小",
    kind: "select",
    placeholder: "0.92em",
    options: [
      { label: "继承", value: "" },
      { label: "偏小 0.9em", value: "0.9em" },
      { label: "默认 0.92em", value: "0.92em" },
      { label: "等同正文 1em", value: "1em" },
    ],
  },
  {
    key: "inlineCodePadding",
    label: "内边距",
    kind: "select",
    placeholder: "0.15em 0.35em",
    options: [
      { label: "无", value: "" },
      { label: "紧凑 0.1em 0.25em", value: "0.1em 0.25em" },
      { label: "默认 0.15em 0.35em", value: "0.15em 0.35em" },
      { label: "宽松 0.2em 0.45em", value: "0.2em 0.45em" },
    ],
  },
  {
    key: "inlineCodeBorderRadius",
    label: "圆角",
    kind: "select",
    placeholder: "4px",
    options: RADIUS_OPTIONS,
  },
];

const CODE_FIELDS: StyleField[] = [
  {
    key: "codeColor",
    label: "文字颜色",
    kind: "color",
    placeholder: "#2a2a2a",
  },
  {
    key: "codeBackgroundColor",
    label: "背景色",
    kind: "color",
    placeholder: "#f3f4f6",
  },
  {
    key: "codeFontSize",
    label: "字体大小",
    kind: "select",
    placeholder: "14px",
    options: CODE_FONT_SIZE_OPTIONS,
  },
  {
    key: "codeLineHeight",
    label: "行高",
    kind: "select",
    placeholder: "1.6",
    options: [
      { label: "紧凑 1.4", value: "1.4" },
      { label: "默认 1.6", value: "1.6" },
      { label: "舒适 1.8", value: "1.8" },
      { label: "宽松 2", value: "2" },
    ],
  },
  {
    key: "codePadding",
    label: "内边距",
    kind: "select",
    placeholder: "16px",
    options: [
      { label: "无", value: "" },
      { label: "小 8px", value: "8px" },
      { label: "默认 16px", value: "16px" },
      { label: "宽松 20px", value: "20px" },
    ],
  },
  {
    key: "codeMargin",
    label: "外边距",
    kind: "select",
    placeholder: "24px 0",
    options: MARGIN_OPTIONS,
  },
  {
    key: "codeBorderRadius",
    label: "圆角",
    kind: "select",
    placeholder: "8px",
    options: RADIUS_OPTIONS,
  },
];

const CUSTOM_STYLE_KEYS: Array<keyof CustomStyle> = [
  "h1Color",
  "h1BackgroundColor",
  "h1Padding",
  "h1Center",
  "h2Color",
  "h2BackgroundColor",
  "h2Padding",
  "h2Center",
  "h3Color",
  "h3BackgroundColor",
  "h3Padding",
  "h3Center",
  "h4Color",
  "h4BackgroundColor",
  "h4Padding",
  "h4Center",
  "h5Color",
  "h5BackgroundColor",
  "h5Padding",
  "h5Center",
  "h6Color",
  "h6BackgroundColor",
  "h6Padding",
  "h6Center",
  "paragraphColor",
  "paragraphFontSize",
  "paragraphLineHeight",
  "paragraphMargin",
  "paragraphBackgroundColor",
  "paragraphPadding",
  "paragraphBorderRadius",
  "blockquoteBackgroundColor",
  "blockquoteBorderColor",
  "blockquoteColor",
  "blockquoteFontSize",
  "blockquoteLineHeight",
  "blockquoteMargin",
  "blockquoteBorderRadius",
  "blockquotePadding",
  "inlineCodeColor",
  "inlineCodeBackgroundColor",
  "inlineCodeFontSize",
  "inlineCodePadding",
  "inlineCodeBorderRadius",
  "codeColor",
  "codeBackgroundColor",
  "codeFontSize",
  "codeLineHeight",
  "codePadding",
  "codeMargin",
  "codeBorderRadius",
];

export class StyleEditorModal extends Modal {
  private plugin: LocalWechatPlugin;
  private draft!: CustomStyle;
  private fieldsEl!: HTMLElement;
  private previewEl!: HTMLElement;
  private presetDropdown!: DropdownComponent;
  private debounceTimer: number | null = null;
  private previewVersion = 0;

  constructor(app: App, plugin: LocalWechatPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen(): void {
    this.buildDraft();
    this.modalEl.addClass("wechat-style-editor");
    this.contentEl.empty();

    const headerEl = this.contentEl.createDiv({ cls: "wechat-style-editor-header" });
    headerEl.createEl("h2", { text: "样式编辑器" });
    this.renderPresetSelector(headerEl);

    const bodyEl = this.contentEl.createDiv({ cls: "wechat-style-editor-body" });
    this.fieldsEl = bodyEl.createDiv({ cls: "wechat-style-editor-fields" });
    const previewWrap = bodyEl.createDiv({ cls: "wechat-style-editor-preview" });
    this.previewEl = previewWrap.createDiv({ cls: "wechat-style-editor-preview-content" });

    const footerEl = this.contentEl.createDiv({ cls: "wechat-style-editor-footer" });
    new Setting(footerEl)
      .addButton((button) => {
        button.setButtonText("取消").onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setButtonText("保存")
          .setCta()
          .onClick(() => {
            void this.saveAndClose();
          });
      });

    this.renderAllFields();
    this.updatePresetDropdown();
    void this.refreshPreview();
  }

  onClose(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.contentEl.empty();
  }

  private buildDraft(): void {
    this.draft = { ...this.plugin.settings.customStyle };
  }

  private renderPresetSelector(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("预设")
      .setDesc("选择内置预设会覆盖当前草稿字段，保存前不会写入设置。")
      .addDropdown((dropdown) => {
        this.presetDropdown = dropdown;
        dropdown.addOption(CUSTOM_PRESET_VALUE, "自定义");
        getBuiltInThemes().forEach((theme) => {
          dropdown.addOption(theme.id, theme.name);
        });
        dropdown.onChange((value) => {
          if (value === CUSTOM_PRESET_VALUE) {
            this.updatePresetDropdown();
            return;
          }
          this.draft = presetToCustomStyle(getThemeById(value));
          this.renderAllFields();
          this.updatePresetDropdown();
          this.schedulePreviewRefresh();
        });
      });
  }

  private renderAllFields(): void {
    this.fieldsEl.empty();
    const headingsEl = this.createSection("标题样式");
    for (let level = 1; level <= 6; level += 1) {
      const levelEl = headingsEl.createDiv({ cls: "wechat-style-editor-heading-level" });
      levelEl.createDiv({ cls: "wechat-style-editor-heading-level-title", text: `H${level}` });
      this.renderFieldGroup(levelEl, [
        {
          key: `h${level}Color` as keyof CustomStyle,
          label: `H${level} 文字颜色`,
          kind: "color",
          placeholder: "#111827",
        },
        {
          key: `h${level}BackgroundColor` as keyof CustomStyle,
          label: `H${level} 背景色`,
          kind: "color",
          placeholder: "#f0f4ff",
        },
        {
          key: `h${level}Padding` as keyof CustomStyle,
          label: `H${level} 内边距`,
          kind: "select",
          placeholder: "8px 12px",
          options: PADDING_OPTIONS,
        },
        {
          key: `h${level}Center` as keyof CustomStyle,
          label: `H${level} 居中`,
          kind: "toggle",
        },
      ]);
    }

    this.renderFieldGroup(this.createSection("正文段落"), PARAGRAPH_FIELDS);
    this.renderFieldGroup(this.createSection("引用块"), BLOCKQUOTE_FIELDS);
    this.renderFieldGroup(this.createSection("行内代码"), INLINE_CODE_FIELDS);
    this.renderFieldGroup(this.createSection("代码块"), CODE_FIELDS);
  }

  private createSection(title: string): HTMLElement {
    const sectionEl = this.fieldsEl.createDiv({ cls: "wechat-style-editor-section" });
    sectionEl.createDiv({ cls: "wechat-style-editor-section-title", text: title });
    return sectionEl;
  }

  private renderFieldGroup(containerEl: HTMLElement, fields: StyleField[]): void {
    fields.forEach((field) => {
      const setting = new Setting(containerEl).setName(field.label);
      if (field.kind === "toggle") {
        setting.addToggle((toggle) => {
          toggle.setValue(Boolean(this.draft[field.key])).onChange((value) => {
            this.setDraftField(field.key, value);
            this.updatePresetDropdown();
            this.schedulePreviewRefresh();
          });
        });
        return;
      }

      if (field.kind === "color") {
        this.renderColorControl(setting, field);
        return;
      }

      this.renderSelectControl(setting, field);
    });
  }

  private renderColorControl(setting: Setting, field: StyleField): void {
    const controlEl = setting.controlEl.createDiv({ cls: "wechat-style-editor-color-control" });
    const triggerEl = controlEl.createEl("button", {
      cls: "wechat-style-editor-color-trigger",
      attr: {
        type: "button",
      },
    });
    const previewEl = triggerEl.createSpan({ cls: "wechat-style-editor-color-preview" });
    const valueEl = triggerEl.createSpan({ cls: "wechat-style-editor-color-value" });
    triggerEl.createSpan({ cls: "wechat-style-editor-color-arrow", text: "⌄" });

    const panelEl = controlEl.createDiv({ cls: "wechat-style-editor-color-panel" });
    panelEl.hide();

    const themeTitleEl = panelEl.createDiv({
      cls: "wechat-style-editor-color-panel-title",
      text: "主题颜色",
    });
    const themeGridEl = panelEl.createDiv({ cls: "wechat-style-editor-theme-colors" });
    const swatchButtons: Array<{ button: HTMLButtonElement; value: string }> = [];
    THEME_COLOR_COLUMNS.forEach((column) => {
      const columnEl = themeGridEl.createDiv({ cls: "wechat-style-editor-theme-color-column" });
      swatchButtons.push(this.createColorSwatchButton(columnEl, column.base, "theme-base"));
      column.shades.forEach((shade) => {
        swatchButtons.push(this.createColorSwatchButton(columnEl, shade, "theme-shade"));
      });
    });

    panelEl.createDiv({
      cls: "wechat-style-editor-color-panel-title",
      text: "标准颜色",
    });
    const standardGridEl = panelEl.createDiv({ cls: "wechat-style-editor-standard-colors" });
    STANDARD_COLORS.forEach((swatch) => {
      swatchButtons.push(this.createColorSwatchButton(standardGridEl, swatch, "standard"));
    });

    const actionsEl = panelEl.createDiv({ cls: "wechat-style-editor-color-actions" });
    const noColorButton = actionsEl.createEl("button", {
      cls: "wechat-style-editor-color-action",
      text: "无颜色",
      attr: { type: "button" },
    });
    const moreColorButton = actionsEl.createEl("button", {
      cls: "wechat-style-editor-color-action",
      text: "更多颜色...",
      attr: { type: "button" },
    });
    const eyedropperButton = actionsEl.createEl("button", {
      cls: "wechat-style-editor-color-action",
      text: "取色器",
      attr: { type: "button" },
    });

    const customEl = panelEl.createDiv({ cls: "wechat-style-editor-color-custom" });
    const pickerEl = customEl.createEl("input", {
      cls: "wechat-style-editor-color-picker",
      attr: {
        type: "color",
      },
    }) as HTMLInputElement;
    const textEl = customEl.createEl("input", {
      cls: "wechat-style-editor-value-input",
      attr: {
        type: "text",
        placeholder: field.placeholder ?? "#000000",
      },
    }) as HTMLInputElement;

    const syncFromValue = (value: string): void => {
      const normalized = value.trim();
      textEl.value = value;
      const isHex = isHexColor(normalized);
      pickerEl.value = isHex ? normalizeHexColor(normalized) : "#000000";
      previewEl.style.backgroundColor = isHex ? normalized : "transparent";
      previewEl.toggleClass("wechat-style-editor-color-preview-empty", !normalized || !isHex);
      valueEl.textContent = normalized || "无颜色";
      noColorButton.toggleClass("is-active", normalized === "");
      swatchButtons.forEach(({ button, value }) => {
        button.toggleClass("is-active", normalizeHexColor(value) === normalizeHexColor(normalized));
      });
    };

    const commitValue = (value: string): void => {
      this.setDraftField(field.key, value);
      syncFromValue(value);
      this.updatePresetDropdown();
      this.schedulePreviewRefresh();
    };

    triggerEl.addEventListener("click", (event) => {
      event.preventDefault();
      if (panelEl.style.display === "none") {
        panelEl.show();
        return;
      }
      panelEl.hide();
    });
    noColorButton.addEventListener("click", (event) => {
      event.preventDefault();
      commitValue("");
    });
    moreColorButton.addEventListener("click", (event) => {
      event.preventDefault();
      pickerEl.click();
    });
    eyedropperButton.addEventListener("click", (event) => {
      event.preventDefault();
      void this.pickScreenColor(commitValue);
    });
    swatchButtons.forEach(({ button, value }) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        commitValue(value);
      });
    });
    pickerEl.addEventListener("input", () => {
      commitValue(pickerEl.value);
    });
    textEl.addEventListener("input", () => {
      commitValue(textEl.value);
    });

    syncFromValue(String(this.draft[field.key] ?? ""));
  }

  private createColorSwatchButton(
    containerEl: HTMLElement,
    swatch: ColorSwatch,
    variant: string
  ): { button: HTMLButtonElement; value: string } {
    const button = containerEl.createEl("button", {
      cls: `wechat-style-editor-color-swatch wechat-style-editor-color-swatch-${variant}`,
      attr: {
        type: "button",
        title: `${swatch.label} ${swatch.value}`,
      },
    });
    button.style.backgroundColor = swatch.value;
    return { button, value: swatch.value };
  }

  private async pickScreenColor(commitValue: (value: string) => void): Promise<void> {
    const EyeDropperCtor = (window as Window & {
      EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
    }).EyeDropper;
    if (!EyeDropperCtor) {
      return;
    }
    const result = await new EyeDropperCtor().open();
    commitValue(result.sRGBHex);
  }

  private renderSelectControl(setting: Setting, field: StyleField): void {
    const options = field.options ?? [];
    const customValue = "__custom__";
    const controlEl = setting.controlEl.createDiv({ cls: "wechat-style-editor-select-control" });
    const selectEl = controlEl.createEl("select", {
      cls: "wechat-style-editor-value-select",
    }) as HTMLSelectElement;
    const textEl = controlEl.createEl("input", {
      cls: "wechat-style-editor-value-input",
      attr: {
        type: "text",
        placeholder: field.placeholder ?? "",
      },
    }) as HTMLInputElement;
    const clearButton = controlEl.createEl("button", {
      cls: "wechat-style-editor-clear-button",
      text: "清空",
    });

    options.forEach((option) => {
      selectEl.createEl("option", {
        text: option.label,
        value: option.value,
      });
    });
    selectEl.createEl("option", {
      text: "自定义",
      value: customValue,
    });

    const syncFromValue = (value: string): void => {
      textEl.value = value;
      selectEl.value = options.some((option) => option.value === value) ? value : customValue;
    };

    const commitValue = (value: string): void => {
      this.setDraftField(field.key, value);
      syncFromValue(value);
      this.updatePresetDropdown();
      this.schedulePreviewRefresh();
    };

    selectEl.addEventListener("change", () => {
      if (selectEl.value === customValue) {
        return;
      }
      commitValue(selectEl.value);
    });
    textEl.addEventListener("input", () => {
      commitValue(textEl.value);
    });
    clearButton.addEventListener("click", (event) => {
      event.preventDefault();
      commitValue("");
    });

    syncFromValue(String(this.draft[field.key] ?? ""));
  }

  private setDraftField(field: keyof CustomStyle, value: string | boolean): void {
    const draft = this.draft as Record<keyof CustomStyle, string | boolean>;
    draft[field] = value;
  }

  private detectPresetMatch(): string {
    for (const preset of getBuiltInThemes()) {
      const presetStyle = presetToCustomStyle(preset);
      const matches = CUSTOM_STYLE_KEYS.every((key) => this.draft[key] === presetStyle[key]);
      if (matches) {
        return preset.id;
      }
    }
    return CUSTOM_PRESET_VALUE;
  }

  private updatePresetDropdown(): void {
    this.presetDropdown.setValue(this.detectPresetMatch());
  }

  private schedulePreviewRefresh(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      void this.refreshPreview();
    }, 200);
  }

  private async refreshPreview(): Promise<void> {
    const version = this.previewVersion + 1;
    this.previewVersion = version;
    const result = await renderPreviewHtml(SAMPLE_NORMALIZED_DOCUMENT, {
      ...this.plugin.settings,
      customStyle: this.draft,
    });
    if (version !== this.previewVersion) {
      return;
    }
    this.previewEl.innerHTML = result.html;
  }

  private async saveAndClose(): Promise<void> {
    this.plugin.settings.customStyle = { ...this.draft };
    await this.plugin.saveSettings();
    this.close();
  }
}

function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}
