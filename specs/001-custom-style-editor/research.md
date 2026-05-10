# Research: 自定义排版样式编辑器

**Phase**: 0 — Pre-design research  
**Date**: 2026-05-03  
**Feature**: specs/001-custom-style-editor/spec.md

---

## R-01 Obsidian Modal API 使用模式

**Decision**: 继承 `Modal` 类（来自 `obsidian` 包），在 `onOpen()` 中构建全部 DOM，不引入任何外部 UI 库。

**Rationale**: Obsidian 官方 API 的标准 Modal 模式；`containerEl` 提供完整 DOM 控制权；Modal 天然具备 overlay + 关闭逻辑，符合"保存/取消"语义；`tsconfig.json` 已包含 `DOM` lib，类型支持完整。

**Alternatives considered**:
- ItemView（右侧面板）：不符合 Save/Cancel 语义，且会占用持久工作区空间，拒绝。
- PluginSettingTab 内展开所有字段（无 Modal）：40 个字段平铺在设置页会极难浏览，拒绝。

---

## R-02 实时预览的防抖策略

**Decision**: 使用 `window.setTimeout` / `window.clearTimeout` 实现 200ms debounce，在 Modal 内作为私有方法管理定时器 ID。

**Rationale**: 零依赖；在 Obsidian Electron 环境和 Mobile WebView 中均可用；逻辑简单，可读性高；200ms 在快速输入时不感知卡顿，在停止输入后即时刷新。

**Alternatives considered**:
- RxJS Observable：引入新依赖，对单一防抖场景过度设计，拒绝。
- 每次 keydown 立即触发渲染：unified 管线是异步的，频繁触发会导致并发渲染竞态，拒绝。

---

## R-03 ThemeDefinition → CustomStyle 的映射策略

**Decision**: 在 `theme.ts` 中新增 `presetToCustomStyle(preset: ThemeDefinition): CustomStyle` 函数，完成从 token 到 39 个 CustomStyle 字段的映射。

**字段映射规则**:

| CustomStyle 字段类型 | 来源 token |
|---|---|
| h1–h6 Color | `colorHeading` |
| h1–h6 BackgroundColor | `""` (空，无背景) |
| h1–h6 Padding | `""` (空，无内边距) |
| h1–h6 Center | `false` |
| paragraphColor | `colorText` |
| paragraphFontSize | `fontSizeBase` |
| paragraphLineHeight | `lineHeightBase` |
| paragraphMargin | `spacingMd + " 0"` |
| paragraphBackgroundColor | `""` |
| paragraphPadding | `""` |
| paragraphBorderRadius | `""` |
| blockquoteBackgroundColor | `colorQuoteBg` |
| blockquoteBorderColor | `colorPrimary` |
| blockquoteColor | `colorText` |
| blockquoteBorderRadius | `radiusSm` |
| blockquotePadding | `spacingSm + " " + spacingMd` |
| codeBackgroundColor | `colorCodeBg` |
| codeFontSize | `""` (继承段落字号) |
| codeBorderRadius | `radiusMd` |

**Rationale**: 映射逻辑集中在 theme.ts，职责清晰；新增字段在预设中给出语义合理的默认值（如标题无背景色/无 padding），符合现有三套主题的视觉习惯。

**Alternatives considered**:
- 在 Modal 构造函数中做映射：职责错位，拒绝。
- 逐字段手动硬编码每套预设的 CustomStyle：维护成本高，与 ThemeTokens 脱节，拒绝。

---

## R-04 buildElementStyles 函数签名重构

**Decision**: 将 `buildElementStyles` 签名从 `(theme: ThemeDefinition, fontSize: FontSize): ElementStyles` 改为 `(style: CustomStyle): ElementStyles`。

**Rationale**: `CustomStyle` 是渲染的单一真相来源（per FR-017）；新签名消除对 ThemeDefinition 和 FontSize 两个独立参数的依赖；调用处（render-preview.ts, render-export.ts）只需传入 `settings.customStyle`，更简洁。

H1–H6 样式生成从单一 `headingStyle()` helper 改为按层级读取各自字段：

```
h1: joinStyles({
  color: style.h1Color || undefined,
  "background-color": style.h1BackgroundColor || undefined,
  padding: style.h1Padding || undefined,
  "text-align": style.h1Center ? "center" : undefined,
  "font-size": "1.85em",
  ...其余固定属性
})
```

**Alternatives considered**:
- 保留旧签名 + 新增重载：两条代码路径并行维护，拒绝。
- 将 CustomStyle 展开为单独字段参数：调用处冗长，拒绝。

---

## R-05 现有 settings.theme / fontSize 字段的迁移策略

**Decision**: 在 `LocalWechatSettings` 中**保留** `theme` 和 `fontSize` 字段定义（避免 `loadData()` 反序列化出现未知字段），但渲染流程**不再读取**这两个字段；新增 `customStyle: CustomStyle`，首次加载时若 `customStyle` 为空则从 Default 预设初始化（FR-016）。

**Rationale**: Obsidian 的 `loadData()` 返回的是 JSON.parse 结果，不会因旧字段存在而报错；保留字段定义避免 TypeScript 类型报错，且不影响任何逻辑；用户旧配置的 `theme`/`fontSize` 字段静默保留在 data.json 中但不被使用。

**Alternatives considered**:
- 从旧 `theme` 字段迁移：读取旧 `theme` 值，找到对应预设，写入 `customStyle`。比直接使用 Default 更友好，但 spec FR-016 明确指定 Default 预设，保持一致性，拒绝。
- 完全删除旧字段：需要同步修改 tsconfig 等，收益不大，拒绝。

---

## R-06 view.ts 工具栏的主题/字号下拉处理

**Decision**: 从 view.ts 工具栏**移除**旧的"主题"和"字号"下拉框；新增"样式编辑"按钮，点击打开 `StyleEditorModal`。

**Rationale**: 渲染改为读取 `customStyle` 后，旧下拉框修改的 `settings.theme` / `settings.fontSize` 不再影响输出，保留会误导用户；以 Modal 为单一入口，避免双重控制混乱。工具栏现有"刷新"/"复制到公众号"/"导出文件"/"打开公众号"四个按钮不变。

**Alternatives considered**:
- 保留下拉框，让其写入 customStyle.paragraphFontSize / 重新加载预设：与 Modal 职责重叠，用户体验不一致，拒绝。

---

## R-07 Modal 预览的样本内容策略

**Decision**: 在 `style-editor-modal.ts` 中定义硬编码的常量 `SAMPLE_NORMALIZED_DOCUMENT: NormalizedDocument`（包含预先处理好的样本 markdown 和空 assets/warnings），每次预览刷新仅重跑 `renderPreviewHtml(SAMPLE_NORMALIZED_DOCUMENT, draftSettings)`。

**样本内容应包含**:
- H1 / H2 / H3 各一条标题
- 两段正文
- 一个引用块
- 一段行内代码 + 一个代码块

**Rationale**: 避免在每次字段变化时重跑 `normalizeDocument`（涉及 vault 文件系统访问和 Obsidian API）；`renderPreviewHtml` 是纯函数（unified pipeline），可在 Modal 中安全调用；样本内容永远固定，无需动态生成。

**Alternatives considered**:
- 使用当前打开的 Markdown 文件作为预览内容：需要走完整管线，且用户在 Modal 内无法清楚判断哪部分样式变化来自内容，拒绝。
- 每次刷新重跑完整 renderWechatArticle：代价高，且 normalizeDocument 依赖 Obsidian App context，Modal 中难以安全调用，拒绝。

---

## R-08 Modal 布局策略

**Decision**: 两栏布局——左栏：预设选择器 + 分区字段编辑（可滚动）；右栏：实时预览（固定宽度）。使用 CSS Grid 或 Flexbox，通过 `styles.css` 提供 Modal 专用类名。

**Rationale**: 左右并排让用户在编辑字段时立即看到效果，是"编辑+预览"场景的标准 UX；Obsidian 的 Modal 默认宽度较窄，需��过自定义 CSS 扩大到 80vw 以容纳两栏。

**Alternatives considered**:
- 字段在上、预览在下（单栏堆叠）：在字段多的情况下需要大量滚动才能看到预览，拒绝。

---

## 所有 NEEDS CLARIFICATION 已解决

本次研究覆盖了技术实现中所有关键不确定点，无遗留待确认项。
