# Data Model: 自定义排版样式编辑器

**Phase**: 1 — Design  
**Date**: 2026-05-03  
**Feature**: specs/001-custom-style-editor/spec.md

---

## 实体总览

```
LocalWechatSettings          ← 持久化（Obsidian data.json）
  └─ customStyle: CustomStyle  ← 新增核心字段

CustomStyle                  ← 39 个样式字段，驱动全部 inline style 输出
PresetTheme (ThemeDefinition) ← 只读，用于生成 CustomStyle 初始值
StyleDraft                   ← Modal 内临时状态，保存前不写入 settings
```

---

## CustomStyle

**存储位置**: `LocalWechatSettings.customStyle`（序列化为 Obsidian data.json）  
**生命周期**: 插件加载时读取，用户通过 Modal 保存时更新  
**初始值**: 首次加载且 `customStyle` 不存在时，由 `presetToCustomStyle(DEFAULT_PRESET)` 生成

### 字段定义

所有颜色/尺寸字段均为 CSS 值字符串，空字符串 `""` 表示该属性不写入 inline style。

#### 标题 H1–H6（每级 4 个字段，共 24 个）

| 字段名 | 类型 | 说明 | 示例值 |
|---|---|---|---|
| `h1Color` | `string` | H1 文字颜色 | `"#111827"` |
| `h1BackgroundColor` | `string` | H1 背景色，空 = 无背景 | `""` / `"#f0f4ff"` |
| `h1Padding` | `string` | H1 内边距，空 = 无内边距 | `""` / `"8px 12px"` |
| `h1Center` | `boolean` | H1 是否居中（false = 左对齐） | `false` |
| `h2Color` | `string` | H2 文字颜色 | `"#111827"` |
| `h2BackgroundColor` | `string` | H2 背景色 | `""` |
| `h2Padding` | `string` | H2 内边距 | `""` |
| `h2Center` | `boolean` | H2 是否居中 | `false` |
| `h3Color` ~ `h6Color` | `string` | H3–H6 文字颜色（同模式） | `"#111827"` |
| `h3BackgroundColor` ~ `h6BackgroundColor` | `string` | H3–H6 背景色 | `""` |
| `h3Padding` ~ `h6Padding` | `string` | H3–H6 内边距 | `""` |
| `h3Center` ~ `h6Center` | `boolean` | H3–H6 是否居中 | `false` |

#### 正文段落（7 个字段）

| 字段名 | 类型 | 说明 | 示例值 |
|---|---|---|---|
| `paragraphColor` | `string` | 正文文字颜色 | `"#2a2a2a"` |
| `paragraphFontSize` | `string` | 正文字号 | `"16px"` |
| `paragraphLineHeight` | `string` | 行高 | `"1.8"` |
| `paragraphMargin` | `string` | 段落上下间距（margin） | `"16px 0"` |
| `paragraphBackgroundColor` | `string` | 段落背景色，空 = 无背景 | `""` |
| `paragraphPadding` | `string` | 段落内边距，空 = 无内边距 | `""` |
| `paragraphBorderRadius` | `string` | 段落圆角，空 = 无圆角 | `""` |

#### 引用块（5 个字段）

| 字段名 | 类型 | 说明 | 示例值 |
|---|---|---|---|
| `blockquoteBackgroundColor` | `string` | 引用块背景色 | `"#f7f7f5"` |
| `blockquoteBorderColor` | `string` | 左侧边框颜色 | `"#0f766e"` |
| `blockquoteColor` | `string` | 引用文字颜色 | `"#2a2a2a"` |
| `blockquoteBorderRadius` | `string` | 圆角 | `"4px"` |
| `blockquotePadding` | `string` | 内边距 | `"8px 16px"` |

#### 代码块（3 个字段）

| 字段名 | 类型 | 说明 | 示例值 |
|---|---|---|---|
| `codeBackgroundColor` | `string` | 代码块背景色 | `"#f3f4f6"` |
| `codeFontSize` | `string` | 代码字号，空 = 继承正文字号 | `""` / `"14px"` |
| `codeBorderRadius` | `string` | 圆角 | `"8px"` |

**总计：24 + 7 + 5 + 3 = 39 个字段**

---

## PresetTheme（ThemeDefinition，只读）

**存储位置**: `theme.ts` 中 `baseThemes` 数组，硬编码，不持久化  
**生命周期**: 插件加载时内存常量，用户操作不修改  
**用途**: 通过 `presetToCustomStyle()` 生成 CustomStyle 初始值；在 Modal 中作为"加载起点"选项

### 新增函数：presetToCustomStyle

```
presetToCustomStyle(preset: ThemeDefinition): CustomStyle
```

输入：ThemeDefinition（含 tokens）  
输出：CustomStyle（39 个字段全部填充，无 undefined）  

映射规则见 research.md R-03。关键约定：
- 标题背景色、padding 默认为 `""`（无背景、无内边距）
- 标题居中默认为 `false`
- 段落背景色、padding、圆角默认为 `""`
- 代码字号默认为 `""`（继承正文）

---

## StyleDraft

**存储位置**: `StyleEditorModal` 实例内存（`private draft: CustomStyle`）  
**生命周期**: Modal 打开时从 `settings.customStyle` 深拷贝创建；保存时写入 settings；取消时丢弃

### 状态转换

```
打开 Modal
  └─ draft = deepCopy(settings.customStyle)

用户修改字段
  └─ draft[field] = newValue
  └─ schedulePreviewRefresh()

用户选择预设
  └─ draft = presetToCustomStyle(preset)
  └─ 字段 UI 全部刷新
  └─ schedulePreviewRefresh()

点击"保存"
  └─ settings.customStyle = draft
  └─ plugin.saveSettings()
  └─ modal.close()

点击"取消"
  └─ draft 丢弃
  └─ modal.close()
```

---

## LocalWechatSettings（扩展后）

```
LocalWechatSettings {
  // 现有字段（保留，但 theme/fontSize 不再用于渲染）
  theme: string              // 保留以兼容已有 data.json，不再读取
  fontSize: "small"|"medium"|"large"  // 同上
  forceLineBreaks: boolean   // 仍用于 renderPreviewHtml
  exportSuffix: string       // 仍用于导出路径
  openAfterExport: boolean   // 仍用于导出后打开

  // 新增字段
  customStyle: CustomStyle   // 驱动全部渲染输出
}
```

---

## inline style 生成规则

`buildElementStyles(style: CustomStyle): ElementStyles` 的核心约定：

1. **空字符串字段不输出**：若 `style.h2BackgroundColor === ""`，则不向 h2 的 style 写入 `background-color` 属性。
2. **boolean → text-align**：`style.h2Center === true` → `"text-align: center;"`，`false` → 不写入 `text-align`。
3. **固定属性**：字号比例（如 `font-size: 1.85em` for H1）、`font-weight: 700`、`line-height: 1.35` 等排版固有属性继续硬编码，不暴露为用户配置项（避免过度复杂化）。
4. **article 容器**：`color`、`font-family`、`font-size`、`line-height`、`word-break` 等顶层属性由 `paragraphColor`、`paragraphFontSize`、`paragraphLineHeight` 控制（与现有 article style 保持一致映射）。

---

## 预设下拉状态检测

Modal 中判断"是否与某预设完全一致"：

```
function detectPresetMatch(draft: CustomStyle): string | "自定义" {
  for (const preset of getBuiltInThemes()) {
    const presetStyle = presetToCustomStyle(preset)
    if (deepEqual(draft, presetStyle)) return preset.id
  }
  return "自定义"
}
```

`deepEqual` 对 CustomStyle 做逐字段比较（39 个 string/boolean 字段，无嵌套对象，可用简单循环实现）。
