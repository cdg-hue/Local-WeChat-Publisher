# Feature Specification: 自定义排版样式编辑器

**Feature Branch**: `001-custom-style-editor`  
**Created**: 2026-05-03  
**Status**: Draft  

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 通过预设快速切换公众号排版风格 (Priority: P1)

用户在 Obsidian 插件设置页中点击"打开样式编辑器"按钮，进入样式编辑器 Modal。Modal 顶部有预设选择下拉框，用户选择一个预设（如"简洁主题"），各样式字段立即更新为该预设的值，右侧实时预览同步刷新，展示该风格下的标题、段落、引用块和代码块效果。用户点击"保存"，关闭 Modal，之后执行"复制到公众号"或"导出 HTML"，输出 HTML 使用新选择的预设样式。

**Why this priority**: 选预设是零成本的风格切换，无需手动调字段，覆盖最多用户的核心使用场景。

**Independent Test**: 仅实现预设选择和保存流程即可独立验证：用户选一个非当前预设 → 保存 → 执行复制 → 粘贴到公众号编辑器验证样式已变化。

**Acceptance Scenarios**:

1. **Given** 用户打开样式编辑器 Modal，**When** 从预设下拉框选择 "Clean"，**Then** Modal 内所有样式字段的值更新为 Clean 预设对应值，预设下拉框显示 "Clean"，实时预览刷新为 Clean 风格。
2. **Given** 用户选择预设并点击"保存"，**When** 执行"复制到公众号"，**Then** 复制的 HTML 中各元素 inline style 与所选预设的样式值一致。
3. **Given** 用户选择预设后点击"取消"，**When** 再次打开 Modal，**Then** 样式���段值仍为取消前已保存的配置，未应用取消前选中的预设。

---

### User Story 2 — 在预设基础上微调个别样式字段 (Priority: P2)

用户打开样式编辑器 Modal，选择一个预设作为起点，然后修改其中若干字段（如将 H2 标题颜色改为品牌色、开启 H2 居中对齐）。预设下拉框自动切换显示"自定义"，右侧预览实时更新。用户点击"保存"，之后导出的 HTML 使用合并了自定义值的样式。

**Why this priority**: 大多数账号有固定品牌色或特定标题风格，微调比从零配置效率更高，是预设功能的自然延伸。

**Independent Test**: 选预设 → 修改至少一个字段 → 保存 → 验证预设下拉显示"自定义"且导出 HTML 中对应元素 inline style 反映修改后的值。

**Acceptance Scenarios**:

1. **Given** 用户已加载某预设，**When** 修改任意样式字段，**Then** 预设下拉框立即切换显示"自定义"。
2. **Given** 用户将 H2 颜色改为 `#e63946` 并保存，**When** 执行导出 HTML，**Then** 输出 HTML 中所有 `<h2>` 元素的 `style` 属性包含 `color: #e63946`。
3. **Given** 用户修改了多个字段并保存，**When** 关闭并重新打开 Obsidian，**Then** 样式编辑器 Modal 中所有字段值与保存时一致，配置未丢失。

---

### User Story 3 — 实时预览当前配置的视觉效果 (Priority: P2)

用户在样式编辑器 Modal 中修改任意字段（如行高、段落背景色），Modal 右侧（或下方）的预览区域在短暂延迟后自动刷新，展示一段包含各类元素的示例内容，供用户即时判断视觉效果，无需保存后再去执行渲染才能看到结果。

**Why this priority**: 没有实时预览时，用户需要反复"保存 → 复制 → 粘贴"才能确认效果，体验割裂。实时预览显著降低试错成本。

**Independent Test**: 修改段落背景色字段值 → 不点保存 → 观察预览区域背景色是否变化。

**Acceptance Scenarios**:

1. **Given** Modal 已打开并显示示例内容，**When** 用户修改任意样式字段，**Then** 预览区域在字段修改停止后约 200ms 内自动刷新，反映最新字段值。
2. **Given** Modal 预览区域正在显示，**When** 用户连续快速修改多个字段，**Then** 预览不会因频繁修改而闪烁或出错，最终稳定展示最后一次修改后的效果。
3. **Given** Modal 已打开，**Then** 预览区域始终包含以下所有元素的示例：H1/H2/H3 标题、正文段落、引用块、行内代码、代码块。

---

### User Story 4 — H1–H6 各级标题独立配置样式 (Priority: P3)

用户需要对不同层级的标题应用不同的视觉处理：H2 使用品牌色 + 居中，H3 使用较深背景色作为卡片式标题，H4–H6 保持默认。用户在样式编辑器 Modal 的"标题样式"分区中，分别为每个层级设置文字颜色、背景色、padding 和居中开关，保存后导出 HTML 各层级标题样式独立生效。

**Why this priority**: 标题层级视觉差异化是公众号排版的常见需求，但每层独立配置是细粒度功能，在预设和基础自定义可用后再做最合适。

**Independent Test**: 为 H2 和 H3 分别设置不同背景色 → 保存 → 导出 HTML → 验证 `<h2>` 和 `<h3>` 有各自独立的 `background-color` inline style 值。

**Acceptance Scenarios**:

1. **Given** 用户将 H2 的 padding 设置为 `8px 12px`，**When** 保存并导出，**Then** 输出 HTML 中 `<h2>` 的 style 包含 `padding: 8px 12px`，`<h3>` 的 padding 不受影响。
2. **Given** 用户开启 H2 居中、关闭 H3 居中，**When** 保存并导出，**Then** `<h2>` style 包含 `text-align: center`，`<h3>` style 不包含 `text-align: center`。
3. **Given** 用户为 H2 设置背景色 `#f0f4ff` 但 padding 为空，**When** 保存并导出，**Then** `<h2>` style 包含 `background-color: #f0f4ff`，但不追加任何 padding 规则。

---

### Edge Cases

- 用户在颜色字段输入无效 CSS 值（如 `notacolor`）：该字段的值原样写入 inline style，浏览器忽略无效值，样式退回默认，**MVP 阶段不做前端校验，但字段值仍被保存**。
- 用户将 padding 字段置为空字符串：对应 CSS 属性不写入 inline style，元素使用浏览器默认 padding。
- 用户在 Modal 内选择预设后立即点击"取消"：已加载到 draft 的预设值被丢弃，settings 中 customStyle 不变。
- 首次安装时若 Default 预设 token 发生变化（插件升级）：customStyle 已写入的值不自动跟随预设更新，保留用户已保存的配置。
- 用户同时打开多个 Obsidian 窗口：各窗口共享同一份 settings 存储，最后保存的窗口的值生效（与 Obsidian 插件 settings 的现有行为一致）。

---

## Requirements *(mandatory)*

### Functional Requirements

**入口与 Modal 生命周期**

- **FR-001**: 系统 MUST 在 Obsidian 插件设置页中提供"打开样式编辑器"按钮。
- **FR-002**: 点击该按钮 MUST 弹出样式编辑器 Modal。
- **FR-003**: Modal 打开时 MUST 将当前已保存的 `customStyle` 加载为可编辑草稿（draft），不影响已保存值。
- **FR-004**: Modal MUST 提供"保存"按钮，点击后将 draft 写入 settings 并关闭 Modal。
- **FR-005**: Modal MUST 提供"取消"按钮，点击后丢弃 draft 并关闭 Modal。

**预设选择**

- **FR-006**: Modal MUST 包含一个预设选择下拉框，列出所有内置预设主题（至少：Default、Clean、Tech）。
- **FR-007**: 当 draft 值与某个预设完全一致时，下拉框 MUST 显示该预设名称；否则 MUST 显示"自定义"。
- **FR-008**: 选择任一预设 MUST 将该预设的所有 token 值覆盖写入 draft，并触发实时预览刷新。
- **FR-009**: 预设的 token 定义 MUST 保持只读，用户操作不得修改预设本身的值。

**样式字段**

- **FR-010**: Modal MUST 按以下分区展示所有可编辑字段，字段均为文本输入（接受 CSS 值字符串）或布尔开关：
  - **标题样式**：H1–H6 每级独立的文字颜色、背景色、padding、居中开关（共 24 个字段）
  - **正文段落**：文字颜色、字号、行高、段落间距（margin）、背景色、padding、圆角（共 7 个字段）
  - **引用块**：背景色、左侧边框颜色、文字颜色、圆角、padding（共 5 个字段）
  - **代码块**：背景色、字体大小、圆角（共 3 个字段）
- **FR-011**: 修改任意字段 MUST 仅更新 draft，不自动写入 settings。
- **FR-012**: 字段值 MUST 在 Modal 关闭后（保存时）持久化，Obsidian 重启后可还原。

**实时预览**

- **FR-013**: Modal MUST 包含一个实时预览区域，渲染一段固定的示例 Markdown 内容（含 H1/H2/H3 标题、正文段落、引用块、行内代码、代码块各至少一处）。
- **FR-014**: 任意字段修改后，预览区域 MUST 在约 200ms（debounce）内自动刷新，展示当前 draft 样式下的效果。
- **FR-015**: 预览使用与"复制到公众号"相同的渲染逻辑（renderPreviewHtml），保证预览所见与输出一致。

**首次安装初始化**

- **FR-016**: 插件首次加载时若 `customStyle` 不存在，系统 MUST 自动将 Default 预设的 token 值写入 `customStyle` 作为初始配置。

**渲染输出**

- **FR-017**: "复制到公众号"和"导出 HTML 文件"的渲染流程 MUST 使用 `customStyle` 中的值生成各元素的 inline style，不再直接依赖内置预设 token。
- **FR-018**: 若 `customStyle` 中某字段值为空字符串，对应 CSS 属性 MUST 不写入 inline style（不输出空值属性）。

### Key Entities

- **CustomStyle**：用户当前生效的样式配置对象，存储于插件 settings。包含约 39 个字段，涵盖 H1–H6 各级标题（文字颜色、背景色、padding、居中）、正文段落（颜色、字号、行高、间距、背景、padding、圆角）、引用块（背景色、边框色、文字颜色、圆角、padding）、代码块（背景色、字号、圆角）。
- **PresetTheme**：只读的内置主题定义，包含主题 id、显示名称和对应的 token 值集合。用于为 CustomStyle 提供初始值，不参与渲染输出。
- **StyleDraft**：Modal 内的临时编辑状态，保存与取消时分别写入或丢弃，不与持久化 CustomStyle 直接绑定。

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户从设置页打开样式编辑器、选择预设、保存并复制到公众号，全流程可在 **60 秒内** 独立完成，无需查阅文档。
- **SC-002**: 样式字段修改后，实时预览在 **1 秒内** 完成刷新，无明显卡顿。
- **SC-003**: 所有已保存的 customStyle 字段在 Obsidian **重启后 100% 还原**，无任何字段丢失或重置为默认值。
- **SC-004**: 导出或复制的 HTML 中，**每个配置了非空值的样式字段**均能在对应 HTML 元素的 inline style 中找到对应的 CSS 属性，准确率 100%。
- **SC-005**: 在样式编辑器 Modal 内进行任意操作（修改字段、切换预设）后点击"取消"，**已保存的 customStyle 不受任何影响**，100% 保持取消前的值。
- **SC-006**: 插件首次安装后，用户无需打开样式编辑器即可直接执行"复制到公众号"，输出样式与 Default 预设效果 **视觉上无差异**。

---

## Assumptions

- 颜色字段 MVP 阶段不做 CSS 值格式校验，用户输入的字符串原样写入 inline style；无效值由浏览器/公众号编辑器静默忽略。
- 现有三套内置预设（Default、Clean、Tech）的 token 结构不变，CustomStyle 字段集合是对现有 ThemeTokens 的扩展超集（增加了标题逐级独立控制、段落背景、圆角等字段）。
- 实时预览的示例 Markdown 内容固定（硬编码），不需要用户自定义预览内容。
- Modal 布局优先保证功能可用性，不做复杂的响应式适配；假设用户在桌面端 Obsidian 使用此功能。
- `isDesktopOnly` 当前为 false，但本次样式编辑器功能以桌面端体验为主，移动端 Modal 布局可能不理想（视为已知限制，不在本次范围内优化）。
- 本次不新增预设主题，预设列表维持现有三套；新增预设作为后续增强。
- 公众号编辑器对部分 CSS 属性（如 `border-radius`）的支持因客户端而异，用户需自行验证在目标公众号编辑器中的效果；插件不做公众号编辑器兼容性兜底。
- 颜色选择器（color picker UI）不在本次 MVP 范围内，推到后续版本。
- 多套自定义主题的命名与保存不在本次范围内，CustomStyle 只维护一份当前配置。
