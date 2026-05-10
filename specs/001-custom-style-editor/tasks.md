# Tasks: 自定义排版样式编辑器

**Input**: `specs/001-custom-style-editor/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Organization**: 任务按 User Story 分组，每个阶段均可独立交付和验证。

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: 可并行（不同文件，无未完成依赖）
- **[Story]**: 对应 spec.md 中的用户故事（US1–US4）
- Setup / Foundational / Polish 阶段无 Story 标签

---

## 环境准备（已完成）

- [x] 创建并切换到功能分支 `001-custom-style-editor`（从 `main` 切出）
  ```bash
  git checkout -b 001-custom-style-editor
  ```
  - 本地 `main` 分支保留原始代码，随时可用 `git diff main` 对比改动
  - 功能完成后执行 `git push -u origin 001-custom-style-editor` 推送到 GitHub

---

## Phase 1: Setup

**Purpose**: 将新文件纳入构建系统

- [ ] T001 将 `style-editor-modal.ts` 追加到 `tsconfig.json` 的 `include` 数组 — `tsconfig.json`

---

## Phase 2: Foundational（阻塞所有 User Story 的前置条件）

**Purpose**: 建立 CustomStyle 类型系统并将渲染管线切换到新数据模型

**⚠️ CRITICAL**: 所有 User Story 均依赖此阶段完成

- [ ] T002 在 `types.ts` 中定义 `CustomStyle` 接口（39 个字段：h1–h6 各 Color/BackgroundColor/Padding/Center，段落 7 字段，引用块 5 字段，代码块 3 字段）— `types.ts`
- [ ] T003 [P] 在 `settings.ts` 的 `LocalWechatSettings` 接口中新增 `customStyle: CustomStyle` 字段；在 `DEFAULT_SETTINGS` 中添加 `customStyle: {} as CustomStyle` 占位值 — `settings.ts`
- [ ] T004 在 `theme.ts` 中新增 `presetToCustomStyle(preset: ThemeDefinition): CustomStyle` 纯函数，按 research.md R-03 映射表将 ThemeTokens 转换为全部 39 个 CustomStyle 字段（空字符串表示无值，boolean 字段默认 false）— `theme.ts`
- [ ] T005 重构 `theme.ts` 中的 `buildElementStyles`：签名改为 `(style: CustomStyle): ElementStyles`；H1–H6 各自读取 `hNColor`/`hNBackgroundColor`/`hNPadding`/`hNCenter` 字段；空字符串字段跳过对应 CSS 属性；`hNCenter === true` 时输出 `text-align: center` — `theme.ts`
- [ ] T006 [P] 更新 `render-preview.ts`：将 `buildElementStyles(getThemeById(settings.theme), settings.fontSize)` 改为 `buildElementStyles(settings.customStyle)`；移除不再使用的 `getThemeById`/`FontSize` import — `render-preview.ts`
- [ ] T007 [P] 更新 `render-export.ts`：同 T006，将调用改为 `buildElementStyles(settings.customStyle)`；移除不再使用的 import — `render-export.ts`
- [ ] T008 更新 `main.ts` 的 `loadSettings()`：`Object.assign` 之后检查 `this.settings.customStyle` 是否为空对象或 falsy，若是则调用 `presetToCustomStyle(getThemeById("default"))` 初始化并 `await this.saveSettings()` — `main.ts`
- [ ] T009 从 `main.ts` 的 `LocalWechatSettingTab.display()` 中删除"默认主题"和"默认字号"两个 `Setting` 控件及其 `onChange` 回调 — `main.ts`

**Checkpoint**: `npm run build` 编译通过；执行"复制到公众号"功能正常（使用 Default 预设样式输出）

---

## Phase 3: User Story 1 — 通过预设快速切换排版风格（Priority: P1）🎯 MVP

**Goal**: 用户可从设置页打开 Modal，选择预设，保存后复制/导出使用新样式

**Independent Test**: 设置页点击按钮 → Modal 打开 → 选 Clean 预设 → 点保存 → 执行复制 → 粘贴到公众号验证段落颜色/标题颜色已变化

- [ ] T010 [US1] 创建 `style-editor-modal.ts`：`StyleEditorModal` 继承 `Modal`，构造函数 `(app: App, plugin: LocalWechatPlugin)`，声明 `private draft: CustomStyle`，实现 `buildDraft()` 从 `plugin.settings.customStyle` 深拷贝，`onOpen()` 中调用 `buildDraft()` 并搭建 containerEl 骨架（header / body / footer 三个 div） — `style-editor-modal.ts`
- [ ] T011 [P] [US1] 在 `onOpen()` 中实现 modal-header：使用 Obsidian `Setting` 创建预设下拉框，选项包含所有内置主题 id/name 加"自定义"选项；`onChange` 调用 `presetToCustomStyle(preset)` 覆盖 `draft`，刷新字段区域并调用 `updatePresetDropdown()` — `style-editor-modal.ts`
- [ ] T012 [P] [US1] 在 `onOpen()` 中实现 modal-footer："保存"按钮 `onClick` 执行 `plugin.settings.customStyle = this.draft; await plugin.saveSettings(); this.close()`；"取消"按钮 `onClick` 直接 `this.close()` — `style-editor-modal.ts`
- [ ] T013 [US1] 在 `main.ts` 的 `LocalWechatSettingTab.display()` 末尾新增 `Setting`，按钮文案"打开样式编辑器"，`onClick` 调用 `new StyleEditorModal(this.app, this.plugin).open()` — `main.ts`
- [ ] T014 [P] [US1] 在 `styles.css` 中新增 Modal 容器 CSS：`.wechat-style-editor`（Modal 宽度 `min(80vw, 960px)`）、`.wechat-style-editor-header`（padding-bottom + border-bottom）、`.wechat-style-editor-footer`（display flex, justify-content flex-end, gap 8px, padding-top, border-top） — `styles.css`

**Checkpoint**: 设置页出现按钮 → 点击打开 Modal → 选择预设 → 保存 → 再次复制验证样式切换生效

---

## Phase 4: User Story 2 — 在预设基础上微调样式字段（Priority: P2）

**Goal**: 用户可编辑全部 39 个字段；修改后预设下拉自动显示"自定义"

**Independent Test**: 加载 Default 预设 → 将 H2 颜色改为 `#e63946` → 不保存 → 确认预设下拉显示"自定义" → 保存 → 导出 HTML → 验证 `<h2>` style 含 `color: #e63946`

- [ ] T015 [US2] 在 `style-editor-modal.ts` 中实现 `renderAllFields()`：在 modal-body 左栏创建 4 个分区（标题样式 / 正文段落 / 引用块 / 代码块）；字符串字段渲染为 `<input type="text">`，boolean 字段渲染为 toggle；每个控件 `onChange`/`onChanged` 更新 `this.draft[field]`；`onOpen()` 末尾调用此方法 — `style-editor-modal.ts`
- [ ] T016 [US2] 在 `style-editor-modal.ts` 中实现 `detectPresetMatch(draft: CustomStyle): string` 函数：遍历 `getBuiltInThemes()`，对每个预设调用 `presetToCustomStyle()` 后逐字段 `===` 比较；完全一致返回 preset.id，否则返回 `"自定义"` — `style-editor-modal.ts`
- [ ] T017 [US2] 在 `style-editor-modal.ts` 中实现 `updatePresetDropdown()`：调用 `detectPresetMatch(this.draft)` 并更新预设下拉框当前显示值（preset.id 或"自定义"）；将此方法调用加入每个字段的 onChange 和预设下拉的 onChange — `style-editor-modal.ts`
- [ ] T018 [P] [US2] 在 `styles.css` 中新增字段面板 CSS：`.wechat-style-editor-body`（display flex, gap）、`.wechat-style-editor-fields`（flex 0 0 360px, overflow-y auto, padding-right）���`.wechat-style-editor-section`（margin-bottom 16px）、`.wechat-style-editor-section-title`（font-weight 600, padding-bottom 6px, border-bottom, margin-bottom 8px） — `styles.css`

**Checkpoint**: 全部 39 个字段可见且可编辑；改任意字段后预设下拉切换为"自定义"；重新选择预设恢复所有字段值

---

## Phase 5: User Story 3 — 实时预览当前配置效果（Priority: P2）

**Goal**: 编辑字段时右侧预览在 200ms 内自动刷新

**Independent Test**: 修改段落背景色字段值（如 `#f0f4ff`）→ 停止输入约 200ms → 预览区域背景色变化，无需点保存

- [ ] T019 [US3] 在 `style-editor-modal.ts` 顶部定义 `SAMPLE_MARKDOWN` 常量（含 `# H1`/`## H2`/`### H3`、两段正文、一个引用块、行内代码、代码块）和 `SAMPLE_NORMALIZED_DOCUMENT: NormalizedDocument`（`normalizedMarkdown: SAMPLE_MARKDOWN, assets: [], warnings: []`） — `style-editor-modal.ts`
- [ ] T020 [US3] 在 `StyleEditorModal` 中声明 `private previewEl: HTMLElement`；在 `onOpen()` 的 modal-body 右栏创建 `previewEl` 容器 — `style-editor-modal.ts`
- [ ] T021 [US3] 实现 `async refreshPreview()` 方法：调用 `renderPreviewHtml(SAMPLE_NORMALIZED_DOCUMENT, { ...this.plugin.settings, customStyle: this.draft })`，将 `result.html` 赋值给 `this.previewEl.innerHTML` — `style-editor-modal.ts`
- [ ] T022 [US3] 实现 `schedulePreviewRefresh()` 方法：声明 `private debounceTimer: number`；方法体为 `window.clearTimeout(this.debounceTimer); this.debounceTimer = window.setTimeout(() => void this.refreshPreview(), 200)` — `style-editor-modal.ts`
- [ ] T023 [US3] 将 `schedulePreviewRefresh()` 调用加入 `renderAllFields()` 中所有字段的 onChange 回调（与 `updatePresetDropdown()` 并列调用），以及预设下拉的 onChange — `style-editor-modal.ts`
- [ ] T024 [US3] 在 `onOpen()` 最后调用 `void this.refreshPreview()` 以在 Modal 打开时展示初始预览 — `style-editor-modal.ts`
- [ ] T025 [P] [US3] 在 `styles.css` 中新增预览面板 CSS：`.wechat-style-editor-preview`（flex 1 1 auto, overflow auto, padding 16px, border-left 1px solid var(--background-modifier-border), min-width 280px） — `styles.css`

**Checkpoint**: Modal 打开即显示预览；任意字段修改后预览约 200ms 刷新；连续快速输入不报错、最终稳定显示最新效果

---

## Phase 6: User Story 4 — H1–H6 各级标题独立配置（Priority: P3）

**Goal**: 标题样式分区清晰展示每级的 4 个独立控件；导出 HTML 中每级标题样式独立生效

**Independent Test**: H2 背景色设为 `#e8f4fd`、H3 背景色留空 → 保存导出 → `<h2>` style 含 `background-color: #e8f4fd`，`<h3>` style 不含 `background-color`

- [ ] T026 [US4] 在 `renderAllFields()` 的标题样式分区内，为 H1–H6 各自创建带层级标题的子分组（如 `createEl("div", {cls: "wechat-style-editor-heading-level", text: "H1"}`），每组内按顺序渲染文字颜色、背景色、内边距（text input）和居中（toggle）4 个控件，字段 label 包含层级编号（如"H2 背景色"） — `style-editor-modal.ts`
- [ ] T027 [US4] 审查并补全 `theme.ts` 的 `buildElementStyles()`：确认 H1–H6 全部 6 个层级均独立生成各自的 heading style；空 BackgroundColor 不输出 `background-color`；空 Padding 不输出 `padding`；`hNCenter === false` 不输出 `text-align` — `theme.ts`

**Checkpoint**: Modal 标题样式分区呈现 6 个清晰子分组；H2/H3 设置不同背景色后导出 HTML 各层级样式独立、互不影响

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 清理旧工具栏控件；全局构建验证；手动冒烟测试

- [ ] T028 更新 `view.ts` 的 `renderToolbar()`：删除 `themeSetting`（主题下拉）和 `fontSetting`（字号下拉）两个 `Setting` 控件及其 `onChange` 逻辑；在 `actionsWrap` 中新增"样式编辑"按钮，`onClick` 调用 `new StyleEditorModal(this.app, this.plugin).open()` — `view.ts`
- [ ] T029 [P] 在 `styles.css` 中为 view.ts 工具栏新"样式编辑"按钮补充必要样式（如需要与其他 action 按钮视觉一致） — `styles.css`
- [ ] T030 运行 `npm run build`（先 `tsc -noEmit -skipLibCheck`，再 esbuild production）确认零 TypeScript 编译错��� — 构建验证
- [ ] T031 [P] 手动冒烟测试清单：① 插件重新加载后 customStyle 初始化为 Default 预设值；② 选 Clean 预设 → 保存 → 复制 → 粘贴验证颜色变化；③ 修改任意字段后预设下拉显示"自定义"；④ 取消后 customStyle 不变；⑤ H2 居中开关 → 导出 HTML 验证 `text-align: center` — Obsidian 手动验证

---

## Dependencies & Execution Order

### Phase 依赖关系

- **Phase 1（Setup）**: 无依赖，立即可开始
- **Phase 2（Foundational）**: 依赖 Phase 1 完成，**阻塞所有 User Story**
- **Phase 3（US1）**: 依赖 Phase 2 完成
- **Phase 4（US2）**: 依赖 Phase 3 完成（需 Modal 骨架 T010 存在）
- **Phase 5（US3）**: 依赖 Phase 4 完成（需 renderAllFields T015 已实现）
- **Phase 6（US4）**: 依赖 Phase 4 完成（需 renderAllFields T015 已实现）
- **Phase 7（Polish）**: 依赖 Phase 3 完成（需 StyleEditorModal T010 存在）

### Phase 2 内部依赖

```
T002 (CustomStyle 类型)
  ├─ T003 (settings.ts 新增字段)
  ├─ T004 (presetToCustomStyle) ── T008 (loadSettings 初始化)
  │                                └─ T009 (移除旧 Setting 控件)
  └─ T005 (buildElementStyles 重构)
       ├─ T006 [P] (render-preview.ts)
       └─ T007 [P] (render-export.ts)
```

### Phase 3 内部依赖

```
T010 (Modal 骨架)
  ├─ T011 [P] (header 预设下拉)
  ├─ T012 [P] (footer 保存/取消)
  └─ T013 (main.ts 按钮入口)
T014 [P] (styles.css Modal 容器)  ← 可与 T010–T013 并行
```

### 并行机会

| 可并行的任务组 | 条件 |
|---|---|
| T006 + T007 | T005 完成后，两文件独立 |
| T011 + T012 | T010 完成后，逻辑独立 |
| T011 + T014 | 无依赖关系，文件不同 |
| T018 + T025 | 纯 CSS，无代码依赖 |
| T029 + T031 | Polish 阶段，相互独立 |

---

## Parallel Example: Phase 2（Foundational）

```
# 第一步（串行）：
T002 → 定义 CustomStyle 类型

# 第二步（并行启动，T002 完成后）：
同时执行：
  T003 (settings.ts)
  T004 (theme.ts presetToCustomStyle)

# 第三步（T004 完成后）：
T005 (buildElementStyles 重构)

# 第四步（并行，T005 完成后）：
同时执行：
  T006 (render-preview.ts)
  T007 (render-export.ts)

# 第五步（串行，T003+T004 完成后）：
T008 → T009
```

---

## Implementation Strategy

### MVP（仅 User Story 1）

1. Phase 1: Setup（T001）
2. Phase 2: Foundational（T002–T009）— **关键，不可跳过**
3. Phase 3: US1（T010–T014）
4. **停止并验证**：设置页按钮 → 选预设 → 保存 → 复制验证样式切换
5. 可在此阶段部署/展示

### 逐步交付

1. Setup + Foundational → 构建通过，基础渲染正常
2. + US1 → 预设��换可用（MVP）
3. + US2 → 字段微调可用
4. + US3 → 实时预览可用
5. + US4 → 标题分级独立配置
6. + Polish → 工具栏清理，构建验证完成

---

## Notes

- `[P]` 任务涉及不同文件，无未完成依赖，可并行执行
- Story 标签（[US1]–[US4]）对应 `spec.md` 中��用户故事优先级
- Phase 2 为强阻塞阶段，任何 User Story 均不可提前开始
- T030（构建验证）应在每个 Phase 完成后执行一次，不只在 Polish 阶段
- 无测试任务（spec 未要求 TDD）；冒烟测试通过 T031 手动验证覆盖
- `style-editor-modal.ts` 所有渲染逻辑依赖 DOM，须在 Obsidian 内手动验证，`test-render.mjs` 不覆盖 Modal 行为
