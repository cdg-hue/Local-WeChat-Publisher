# Internal Style Contract

**Scope**: 样式系统的内部接口约定，适用于 `theme.ts`、`render-preview.ts`、`render-export.ts`、`style-editor-modal.ts` 之间的调用边界。

---

## 1. CustomStyle 接口（types.ts 新增）

```typescript
export interface CustomStyle {
  // H1
  h1Color: string;
  h1BackgroundColor: string;
  h1Padding: string;
  h1Center: boolean;
  // H2
  h2Color: string;
  h2BackgroundColor: string;
  h2Padding: string;
  h2Center: boolean;
  // H3
  h3Color: string;
  h3BackgroundColor: string;
  h3Padding: string;
  h3Center: boolean;
  // H4
  h4Color: string;
  h4BackgroundColor: string;
  h4Padding: string;
  h4Center: boolean;
  // H5
  h5Color: string;
  h5BackgroundColor: string;
  h5Padding: string;
  h5Center: boolean;
  // H6
  h6Color: string;
  h6BackgroundColor: string;
  h6Padding: string;
  h6Center: boolean;
  // Paragraph
  paragraphColor: string;
  paragraphFontSize: string;
  paragraphLineHeight: string;
  paragraphMargin: string;
  paragraphBackgroundColor: string;
  paragraphPadding: string;
  paragraphBorderRadius: string;
  // Blockquote
  blockquoteBackgroundColor: string;
  blockquoteBorderColor: string;
  blockquoteColor: string;
  blockquoteBorderRadius: string;
  blockquotePadding: string;
  // Code
  codeBackgroundColor: string;
  codeFontSize: string;
  codeBorderRadius: string;
}
```

---

## 2. buildElementStyles 新签名（theme.ts）

**旧签名（废弃）**:
```typescript
buildElementStyles(theme: ThemeDefinition, fontSize: FontSize): ElementStyles
```

**新签名**:
```typescript
buildElementStyles(style: CustomStyle): ElementStyles
```

**约束**:
- 输入为完整的 CustomStyle 对象（无 undefined 字段）
- 空字符串字段 (`""`) 对应的 CSS 属性不写入 inline style
- `boolean` 类型的 Center 字段：`true` → `text-align: center`，`false` → 不写入
- 标题层级固定属性（font-size 比例、font-weight、line-height）由函数内部硬编码，不由 CustomStyle 控制
- 返回类型 `ElementStyles` 结构不变

---

## 3. presetToCustomStyle（theme.ts 新增）

```typescript
presetToCustomStyle(preset: ThemeDefinition): CustomStyle
```

**约束**:
- 返回值所有 string 字段不含 `undefined`，最小值为 `""`
- 返回值所有 boolean 字段必须有确定值（`true` 或 `false`）
- 对同一个 preset 多次调用，结果完全相同（纯函数）

---

## 4. RenderSettings 变更（types.ts）

**旧接口**:
```typescript
export interface RenderSettings extends LocalWechatSettings {}
// 渲染时通过 settings.theme + settings.fontSize 读取样式
```

**新接口（增量）**:
```typescript
// RenderSettings 继续 extends LocalWechatSettings
// 渲染时通过 settings.customStyle 读取样式
// settings.theme 和 settings.fontSize 在渲染流程中不再读取
```

`render-preview.ts` 和 `render-export.ts` 中：
```typescript
// 旧：buildElementStyles(getThemeById(settings.theme), settings.fontSize)
// 新：buildElementStyles(settings.customStyle)
```

---

## 5. StyleEditorModal 对外接口（style-editor-modal.ts）

```typescript
export class StyleEditorModal extends Modal {
  constructor(app: App, plugin: LocalWechatPlugin)
  // open() 继承自 Modal
}
```

调用方（`main.ts` 设置页按钮）：
```typescript
new StyleEditorModal(this.app, this).open()
```

Modal 内部通过 `plugin.settings.customStyle` 读取初始值，保存时调用 `plugin.saveSettings()`。

---

## 6. 初始化约定（main.ts loadSettings）

```typescript
async loadSettings(): Promise<void> {
  const loaded = await this.loadData()
  this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded)
  // 若 customStyle 缺失（首次安装或旧版本升级），初始化为 Default 预设
  if (!this.settings.customStyle) {
    this.settings.customStyle = presetToCustomStyle(getThemeById("default"))
    await this.saveSettings()
  }
}
```

---

## 7. 调用链总览

```
用户触发"复制/导出"
  → main.ts: renderMarkdown(markdown, file)
    → renderer.ts: renderWechatArticle({ ..., settings })
      → render-preview.ts: renderPreviewHtml(normalized, settings)
          → theme.ts: buildElementStyles(settings.customStyle)   ← 变更点
      → render-export.ts: renderExportHtml(normalized, settings)
          → theme.ts: buildElementStyles(settings.customStyle)   ← 变更点

用户打开 StyleEditorModal
  → 字段变化
    → Modal: buildElementStyles(draft)
      → renderPreviewHtml(SAMPLE_NORMALIZED_DOCUMENT, { ...settings, customStyle: draft })
  → 点击保存
    → settings.customStyle = draft
    → plugin.saveSettings()
```
