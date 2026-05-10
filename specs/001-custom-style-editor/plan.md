# Implementation Plan: 自定义排版样式编辑器

**Branch**: `001-custom-style-editor` | **Date**: 2026-05-03 | **Spec**: [spec.md](spec.md)

## Summary

为 Obsidian 插件 Local WeChat Publisher 新增"样式编辑器 Modal"，让用户通过 Obsidian 设置页打开一个两栏 Modal，左侧编辑 39 个样式配置字段（H1–H6 各级独立、段落、引用块、代码块），右侧实时预览效果；支持加载内置预设作为起点后再自定义；保存后渲染输出全部以 `customStyle` 为准。

核心技术方案：扩展 `CustomStyle` 类型为 39 字段平铺对象，持久化至 settings；重构 `buildElementStyles` 接受 `CustomStyle` 而非 `ThemeDefinition + FontSize`；新增 `StyleEditorModal`（两栏布局 + 200ms debounce 预览刷新）；移除 view.ts 工具栏旧主题/字号下拉，改为"样式编辑"入口按钮。

---

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 22  
**Primary Dependencies**: Obsidian Plugin API（Modal, Setting, App）; unified/remark/rehype 管线（已有）; esbuild 0.25  
**Storage**: Obsidian `loadData()` / `saveData()`（data.json），单一用户本地持久化  
**Testing**: `scripts/test-render.mjs`（Node.js 离线渲染测试）；DOM-dependent 代码（Modal、sanitize）需在 Obsidian 内手动验证  
**Target Platform**: Obsidian Desktop + Mobile（isDesktopOnly: false）；Modal 布局以桌面端为主  
**Project Type**: Obsidian 插件（Electron 应用扩展）  
**Performance Goals**: 预览刷新 ≤ 200ms debounce 触发，用户感知 ≤ 1s；无网络请求，无耗时 I/O  
**Constraints**: 所有 HTML 输出使用 inline style（公众号不支持外部 CSS）；不引入新 npm 依赖；不改变现有复制/导出主流程  
**Scale/Scope**: 单用户单设备；39 个设置字段；1 个新文件（`style-editor-modal.ts`）；6 个文件改动

---

## Constitution Check

constitution.md 为空白模板（未填充项目规则），无已建立的门控约束。按项目现有惯例检查：

| 检查项 | 结论 |
|---|---|
| 不新增 npm 依赖 | ✅ 无新依赖 |
| 不破坏现有渲染流程 | ✅ renderWechatArticle 入口不变，仅 buildElementStyles 内部签名变更 |
| inline style 输出 | ✅ buildElementStyles 输出结构 ElementStyles 不变，inline style 写法不变 |
| 不改变复制/导出主流程 | ✅ copy/export 入口函数不变，只是 settings.customStyle 替代了原来的 settings.theme |
| TypeScript strict 通过 | ✅ 所有字段有显式类型，无隐式 any |

**Gate 结果：无违规，可进入实现。**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-custom-style-editor/
├── plan.md              ← 本文件
├── spec.md              ← 功能规格
├── research.md          ← Phase 0 研究决策
├── data-model.md        ← Phase 1 数据模型
├── contracts/
│   └── internal-style-api.md  ← Phase 1 内部接口契约
├── checklists/
│   └── requirements.md ← Spec 质量 checklist
└── tasks.md             ← Phase 2 输出（/speckit-tasks 生成）
```

### Source Code（根目录平铺结构）

```text
# 现有文件（修改）
types.ts                 新增 CustomStyle 接口（39 字段）
settings.ts              LocalWechatSettings 新增 customStyle 字段，更新 DEFAULT_SETTINGS
theme.ts                 新增 presetToCustomStyle()；重构 buildElementStyles(style: CustomStyle)
render-preview.ts        调用改为 buildElementStyles(settings.customStyle)
render-export.ts         调用改为 buildElementStyles(settings.customStyle)
main.ts                  loadSettings 加初始化逻辑；设置页 Tab 新增"打开样式编辑器"按钮
view.ts                  工具栏移除旧主题/字号下拉；新增"样式编辑"按钮
styles.css               新增 StyleEditorModal 专用 CSS 类

# 新增文件
style-editor-modal.ts    StyleEditorModal 类（两栏布局 + debounce 预览）

# 不修改
renderer.ts              renderWechatArticle 入口函数不变
normalize.ts             Obsidian 语法预处理不变
sanitize.ts              HTML 清理不变
clipboard.ts             剪贴板复制不变
```

**Structure Decision**: 项目采用根目录平铺的单层 TypeScript 结构，无 `src/` 子目录。新增的 `style-editor-modal.ts` 与 `view.ts` 并列放置，符合现有约定。

---

## Complexity Tracking

> Constitution Check 无违规，无需填写此表。

---

## 关键实现要点（供 /speckit-tasks 参考）

### 1. types.ts — CustomStyle 类型

新增 `CustomStyle` 接口（39 字段）。更新 `RenderSettings`（继承自 `LocalWechatSettings`，无需额外改动，`customStyle` 字段通过 settings 自然携带）。

### 2. settings.ts — DEFAULT_SETTINGS 扩展

`DEFAULT_SETTINGS` 中新增 `customStyle` 字段，值设为空对象（`{}` 强制转型为 `CustomStyle`）。实际默认值在 `loadSettings` 时由 `presetToCustomStyle` 生成，不在 `DEFAULT_SETTINGS` 中硬编码 39 个字段（避免 DEFAULT_SETTINGS 膨胀）。

> **注意**：`Object.assign({}, DEFAULT_SETTINGS, loaded)` 若 `loaded.customStyle` 存在则使用 loaded 值，若不存在则 customStyle 为空对象；`loadSettings` 中随后检测空对象并执行初始化。

### 3. theme.ts — 两个关键函数变更

**`presetToCustomStyle(preset: ThemeDefinition): CustomStyle`（新增）**  
纯函数，无副作用。详见 data-model.md 和 research.md R-03。

**`buildElementStyles(style: CustomStyle): ElementStyles`（重构）**  
H1–H6 不再共用单一 `headingStyle()` helper，改为按层级分别读取 `hNColor`、`hNBackgroundColor` 等字段。空字符串字段跳过对应 CSS 属性。`article` style 由 `paragraphColor`、`paragraphFontSize`、`paragraphLineHeight` 驱动（保持与现有 article 样式的等价映射）。

### 4. render-preview.ts / render-export.ts — 调用点更新

将：
```
buildElementStyles(getThemeById(settings.theme), settings.fontSize)
```
改为：
```
buildElementStyles(settings.customStyle)
```

`getThemeById` 和 `FontSize` 相关的 import 可随之移除。

### 5. main.ts — 设置页 + 初始化

`loadSettings` 末尾加 customStyle 初始化判断（见 contracts/internal-style-api.md 第 6 条）。

`LocalWechatSettingTab.display()` 末尾新增一个 Setting，按钮文案"打开样式编辑器"，`onClick` 调用 `new StyleEditorModal(this.app, this.plugin).open()`。

移除旧的"默认主题"和"默认字号"两个 Setting 控件（其功能已由 Modal 承接）。

### 6. view.ts — 工具栏更新

`renderToolbar()` 中移除 `themeSetting` 和 `fontSetting` 两个 Setting 控件。在 `actionsWrap` 新增"样式编辑"按钮，onClick 打开 StyleEditorModal。

### 7. style-editor-modal.ts — Modal 主体

**布局（onOpen）**:
```
containerEl
  └─ modal-header: 标题文字 + 预设选择下拉框（含"自定义"选项）
  └─ modal-body（两栏 flex）
       ├─ modal-fields（左，可滚动）
       │    ├─ 分区：标题样式（H1–H6 各 4 个控件）
       │    ├─ 分区：正文段落（7 个控件）
       │    ├─ 分区：引用块（5 个控件）
       │    └─ 分区：代码块（3 个控件）
       └─ modal-preview（右，固定宽度）
            └─ previewEl（innerHTML = renderPreviewHtml 输出）
  └─ modal-footer: "保存" + "取消" 按钮
```

**关键方法**:
- `buildDraft()`: 从 `plugin.settings.customStyle` 深拷贝到 `this.draft`
- `renderAllFields()`: 遍历所有字段，对字符串字段创建 `<input type="text">`，对 boolean 字段创建 toggle，绑定 onChange 更新 draft 并调用 `schedulePreviewRefresh()`
- `schedulePreviewRefresh()`: 清除旧定时器，设置 200ms 后调用 `refreshPreview()`
- `refreshPreview()`: `await renderPreviewHtml(SAMPLE_NORMALIZED_DOCUMENT, { ...plugin.settings, customStyle: this.draft })` → `previewEl.innerHTML = result.html`
- `updatePresetDropdown()`: 调用 `detectPresetMatch(this.draft)`，更新下拉框显示值
- `onSave()`: `plugin.settings.customStyle = this.draft; await plugin.saveSettings(); this.close()`

**SAMPLE_NORMALIZED_DOCUMENT** 常量（模块级）:
```
{
  markdown: SAMPLE_MD,
  normalizedMarkdown: SAMPLE_MD,
  assets: [],
  warnings: [],
}
```

`SAMPLE_MD` 包含 H1/H2/H3、两段正文、一个引用块、行内代码、代码块。

### 8. styles.css — Modal 样式

新增类：
- `.wechat-style-editor` — Modal 根容器，设置宽度（`min(80vw, 960px)`）
- `.wechat-style-editor-body` — 两栏 flex 容器
- `.wechat-style-editor-fields` — 左栏，`overflow-y: auto`，`flex: 0 0 360px`
- `.wechat-style-editor-preview` — 右栏，`flex: 1 1 auto`，`overflow: auto`
- `.wechat-style-editor-section` — 字段分区容器
- `.wechat-style-editor-section-title` — 分区标题
- `.wechat-style-editor-footer` — 底部按钮区，`justify-content: flex-end`

---

## 风险点

| 风险 | 概率 | 影响 | 缓解方案 |
|---|---|---|---|
| `renderPreviewHtml` 在 Modal 中调用时依赖 DOM（`document.createElement`）但 Modal 已挂载到 DOM，应无问题 | 低 | 低 | 手动在 Obsidian 中验证 Modal 预览渲染 |
| 旧 `theme`/`fontSize` 字段在 view.ts 工具栏移除后，已习惯工具栏切换主题的用户需重新适应 | 中 | 中 | 在 Modal 入口处提示"在此处管理所有样式" |
| H1–H6 共 24 个字段在 Modal 左栏显示时较长，需充分分区+间距保证可读性 | 中 | 低 | styles.css 中给分区添加视觉分隔 |
| `deepEqual` 实现对 boolean 字段的比较需精确（`===` 而非 `==`），否则预设检测会误判 | 低 | 低 | 逐字段 `===` 比较，无隐式转换 |
