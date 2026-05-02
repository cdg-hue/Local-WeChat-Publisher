# 调试日志 (DEBUG LOG)

> 本文件记录每次测试的操作、发现的问题和修复进度。
> 每次调试完请在「测试记录」中追加一条，不要删除历史条目。

---

## 测试方法

### 方法一：Node.js 渲染测试（快速验证，无需 Obsidian）

```bash
node scripts/test-render.mjs
```

**覆盖范围**：
- normalize 正则层（wiki link、callout 降级、不支持语法检测）
- remark / rehype 渲染管线（GFM 表格、代码块、frontmatter 剥离等）
- 输出预览文件：`fixtures/basic/output.html`（可在浏览器打开）

**不覆盖**：
- `sanitize.ts`（依赖浏览器 DOM `document.createElement`）
- Obsidian embed 真实展开（`![[文件名]]` 在 Node 测试中只产生占位符）
- 剪贴板、视图层、插件设置等 Obsidian UI 行为

### 方法二：Obsidian 真机测试（完整验证）

1. 先构建插件：

   ```bash
   npm run build
   ```

2. 将整个项目目录软链接（或复制）到 Obsidian 的插件目录：

   ```bash
   # 把 <vault> 替换为你的 Obsidian 仓库路径
   ln -s "$(pwd)" "<vault>/.obsidian/plugins/local-wechat-publisher"
   ```

3. 在 Obsidian 中：设置 → 社区插件 → 启用 **Local WeChat Publisher**

4. 打开 `fixtures/verification/` 目录下的样例文件，按 `VERIFICATION_GUIDE.md` 逐步验证

---

## 日志格式

每条记录使用如下模板：

```
### [YYYY-MM-DD] 测试 #N
**测试方式**: Node.js / Obsidian 插件
**测试文件**: 
**测试结果**: PASS / FAIL / PARTIAL
**通过项**:
**发现问题**:
  - [ ] 问题描述（代码位置 / 复现步骤）
**根因分析**: 
**修复状态**: 未修复 / PR #N / 已合并
```

---

## 测试记录

<!-- 新记录追加在此区域顶部（最新在前） -->

### [2026-05-02] 测试 #9

**测试方式**: Obsidian 插件真机  
**测试文件**: `测试文件/04-边界情况.md`  
**测试结果**: PASS

**通过项**:
- 04-边界情况文章验证通过
- 当前未发现需要新增修复的问题

**结论**: `04-边界情况.md` 验证通过，边界情况测试完成。

---

### [2026-05-01] 测试 #8

**测试方式**: Obsidian 插件真机  
**测试文件**: `测试文件/03-真实文章模拟.md`  
**测试结果**: PASS

**通过项**:
- frontmatter（title / date / tags）正确剥离，不出现在右侧预览和导出 HTML 中
- 标题 h1 `为什么我把写作工具切换到了 Obsidian` ���染正确
- 段落正文正常显示
- 行内加粗 `**本地优先**` → `<strong>` 渲染正确
- 有序列表（1. 2. 3. 4.）渲染为 `<ol>` 正确
- 发布前检查：**绿色「发布检查通过」**，当前未发现导出风险

**备注**: 复制状态栏显示「已复制，但有 7 项风险」为上一个文件（02-Obsidian语法.md）的遗留状态，本文件发布前检查独立判断为通过。

---

### [2026-05-01] 测试 #7

**测试方式**: Obsidian 插件真机  
**测试文件**: `测试文件/02-Obsidian语法.md`（全量验证）  
**测试结果**: PASS

**通过项**:
- 复制状态：「已复制公众号 HTML，但仍有 7 项风险」（正常，风险均为预期行为）
- 未支持语法 · 2：Mermaid 代码块 + 块级数学公式警告正确触发（测试文件故意包含，公众号不支持，提示用户手动处理）
- 本地图片 · 2：2 张本地图片各触发 1 条警告，提示手动上传，正常
- 缺失附件 · 2：`不存在的图片.png`、`不存在的文档.md` 各触发 1 条缺失警告，正常
- 已清理内容 · 1：代码块 `class="language-ts"` 被 sanitize 移除，正常（措辞待优化，已记录为警告措辞 #1）
- embed 文档正常展开，`![[embed-note.md]]` 和 `![[embed-note.md#目标段落]]` 不再误报循环引用
- wiki 链接在导出 HTML 中为纯文字，不含 `<a>` 标签，预览层蓝色样式为 Obsidian CSS 渗透，不影响导出

**结论**: `02-Obsidian语法.md` 全量验证通过，所有警告均为预期行为，核心功能正常。

---

### [2026-05-01] 测试 #6

**测试方式**: Node.js + Obsidian 插件真机（修复后复测）  
**测试文件**: `测试文件/02-Obsidian语法.md`，回归用例  
**测试结果**: PASS（Bug #1 #2 #3 全部修复，待确认 #1 确认为预览层 CSS 问题不影响导出）

---

#### Bug #1 修复记录 — 仅复制纯文本

**根因**：`clipboard.ts` 优先调用 `navigator.clipboard.write` + `ClipboardItem`，该 API 在 Obsidian Electron 渲染进程中因权限受限静默失败，最终降级为 `navigator.clipboard.writeText`（纯文本），导致粘贴到公众号编辑器时丢失 HTML 格式。

**修复**：在 `clipboard.ts` 的 `ClipboardItem` 失败路径后，增加 `document.execCommand('copy')` fallback：
1. 创建 `position:fixed; left:-9999px` 的隐藏 `contenteditable` div
2. 将 `params.html` 写入 `innerHTML`
3. `document.createRange().selectNodeContents(el)` + `window.getSelection().addRange(range)`
4. `document.execCommand('copy')` 完成富文本复制
5. `finally` 块确保 div 从 DOM 移除

**验证**：复制状态从「仅复制纯文本」变为「已复制公众号 HTML」。

**涉及文件**：`clipboard.ts`（全文重写 copyWechatHtml）

---

#### Bug #2 修复记录 — `<del>` 标签被 sanitize 移除

**根因**：`sanitize.ts` 的 `ALLOWED_TAGS` 白名单未包含 `del`，GFM 删除线 `~~文字~~` 生成的 `<del>` 标签被当作不安全标签移除，文字裸露、警告提示"已移除不安全标签 `<del>`"。

**修复**：在 `sanitize.ts` 的 `ALLOWED_TAGS` 中补充语义标签：
```typescript
"del",        // 删除线 ~~text~~
"figure",     // 图片容器
"figcaption", // 图片说明
```

**验证**：删除线文字在预览中正常显示，`<del>` 警告消失。

**涉及文件**：`sanitize.ts`（ALLOWED_TAGS 第 19–26 行）

---

#### Bug #3 修复记录 — 循环引用误报（两次修复）

**背景**：`测试文件/02-Obsidian语法.md` 对 `embed-note.md` 同时使用了 `![[embed-note.md]]` 和 `![[embed-note.md#目标段落]]`，两次 embed 均触发循环引用警告。

**第一次修复（不足）**：  
误判根因为行内代码 `` `![[embed-note.md]]` `` 被当作真实 embed 处理。  
- 将 `CODE_FENCE_PATTERN` 从 `` /(```[\s\S]*?```|~~~[\s\S]*?~~~)/g `` 扩展为 `` /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g ``  
- `replaceOutsideCodeFences` 跳过条件补充 `segment.startsWith("`")`  
- Node.js 测试通过，但 Obsidian 真机仍误报。

**真正根因**：  
`activeEmbeds` 原本是挂在共享 `NormalizeState` 上的可变 `Set<string>`。`replaceOutsideCodeFences` 内部通过 `Promise.all` 并发处理各段，两个 embed `![[embed-note.md]]` 和 `![[embed-note.md#目标段落]]` 几乎同时进入 `expandMarkdownEmbed`：
- 第一个 embed 展开：`state.activeEmbeds.add("embed-note.md")`，开始异步读取文件
- 第二个 embed 展开：在第一个 `finally` 清理前执行 `state.activeEmbeds.has("embed-note.md")`，命中 → 误报循环引用

**最终修复**：  
将 `activeEmbeds` 从 `NormalizeState` 完全移除，改为沿调用链向下传递的不可变 `ReadonlySet<string>` 参数：
- `normalizeDocument` 传入 `new Set<string>()`（空集合）
- `normalizeMarkdown` / `normalizeSegment` 接收并透传 `activeEmbeds: ReadonlySet<string>`
- `expandMarkdownEmbed` 在进入时创建子集合 `const childEmbeds = new Set([...activeEmbeds, file.path])`，仅传给递归调用
- 同级多次引用同一文件各自拥有独立调用链，不互相污染；真正的 A→B→A 循环引用仍可检测

**不再需要** `finally` 块来清理 `activeEmbeds`，竞争条件从根本上消除。

**涉及文件**：`normalize.ts`（NormalizeState 接口、normalizeDocument、normalizeMarkdown、normalizeSegment、expandMarkdownEmbed）

---

#### 待确认 #1 — wiki 链接蓝色样式（已结案：预览层 CSS，不影响导出）

**调查过程**：
1. 读取 `view.ts`：预览 HTML 通过 `this.previewEl.innerHTML = result.preview.html` 注入，无特殊链接处理
2. 读取 `styles.css`：无链接相关样式
3. Node.js 内联验证：将 normalize 后的纯文字（`01-基础排版`、`点这里`、`01-基础排版 > 表格`）经 remark→rehype 渲染，输出为 `<p>01-基础排版</p>` 等，**不含任何 `<a>` 标签**

**结论**：蓝色下划线样式来自 Obsidian 全局 CSS 对 `innerHTML` 注入内容的样式渗透（或左侧编辑面板的 native wiki link 渲染），**导出 HTML 中不含 `<a>` 标签，复制到公众号不会出现蓝色链接**，无需修复。

**修复状态**: Bug #1 #2 #3 已修复并验证；待确认 #1 已结案

---

### [2026-05-01] 测试 #5

**测试方式**: Obsidian 插件真机  
**测试文件**: `测试文件/02-Obsidian语法.md`  
**测试结果**: PARTIAL（5 项正确，1 个 Bug，1 个待确认）

**通过项**:
- 本地图片警告正确（2 张图片各触发 1 条）
- 缺失附件警告正确（2 个缺失文件各触发 1 条）
- Mermaid / 数学公式产生"未支持语法"警告
- embed-note 文档内容正常展开
- 复制状态为"已复制公众号 HTML"

**发现问题**:
- [ ] **Bug #3 — 行内代码内 embed 语法误解析导致循环引用假警报**  
  `embed-note.md` 的正文里有 `` `![[embed-note.md]]` ``（行内代码），`normalize.ts` 的 `replaceOutsideCodeFences` 只跳过三反引号代码围栏，不跳过行内代码（单反引号），导致行内代码内的 `![[embed-note.md]]` 被当作真实嵌入处理，触发循环引用检测。  
  涉及文件：`normalize.ts` → `replaceOutsideCodeFences` 函数  
  修复方向：在对 segment 应用 `normalizeSegment` 前，先将行内代码内容替换为占位符保护，处理完再还原  
  **已修复（第一次）**：`CODE_FENCE_PATTERN` 扩展为 `` /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g ``，跳过判断同步补充 `` segment.startsWith("`") ``  
  **真正根因（测试 #6 补充）**：同一文件被多次 embed 时，`activeEmbeds` 是挂在共享 `state` 上的可变 Set，第一个 `![[embed-note.md]]` 展开时 `add` 了路径，第二个 `![[embed-note.md#目标段落]]` 在第一个 `finally` 清理前就命中了 `has`，误报循环引用。行内代码修复无法解决此问题。  
  **最终修复**：将 `activeEmbeds` 从 `NormalizeState` 移除，改为沿调用链向下传递的不可变 `ReadonlySet<string>`，每次进入 embed 展开时创建新 Set（`new Set([...activeEmbeds, file.path])`），同级多次引用同一文件不再误报，真正循环引用（A→B→A）仍能正确检测。

- [ ] **待确认 #1 — wiki 链接在预览中显示为蓝色链接样式**  
  右侧预览中 wiki link 的展示文字（`01-基础排版`、`点这里`、`01-基础排版 > 表格`）呈蓝色带下划线，外观与 `<a>` 标签一致。按 `normalize.ts` 逻辑，wiki link 应替换为纯文字，不含 `<a>` 标签。待调查：`view.ts` 全局样式是否污染，或 remark/rehype 管线是否意外生成了链接标签。

**修复状态**: Bug #3 已修复（见测试 #6），待确认 #1 已结案（见测试 #6）

### [2026-05-01] 测试 #4

**测试方式**: Obsidian 插件真机  
**测试文件**: `测试文件/01-基础排版.md`  
**测试结果**: PASS

**结论**: 01-基础排版测试成功，基础排版功能验证完毕。

### [2026-05-01] 测试 #3

**测试方式**: Obsidian 插件真机  
**测试文件**: `测试文件/01-基础排版.md`（修复后复测）  
**测试结果**: PARTIAL（Bug #1 #2 已修复，但发现 2 项待优化的警告问题）

**通过项**:
- 复制状态从「仅复制纯文本」变为「已复制公众号 HTML」，剪贴板 Bug 修复确认
- `<del>` 警告消失，删除线文字在预览中正常显示，sanitize Bug 修复确认
- 剩余警告从 3 项降至 2 项

**待优化问题（暂不修复，先记录）**:
- [ ] **警告措辞 #1 — `class` 属性提示易误导**：`sanitize.ts` 移除 `<code class="language-ts">` 的 `class` 属性后，在发布前检查中显示「已移除属性 class」。实际上 `class` 对公众号无意义，是正确的清理行为，但措辞让用户误以为有问题。建议：此类清理静默处理，不向用户展示。
- [ ] **警告措辞 #2 — `<input>` 标签提示易误导**：任务列表 `- [x]` 生成 `<input type="checkbox">`，被 sanitize 移除后显示「已移除不安全标签 `<input>`」。`<input>` 在公众号中本就不支持，清理是正确的，但「不安全标签」措辞让用户误以为是安全风险。建议：此类公众号不支持的标签静默清理，或改为「已移除公众号不支持的标签」。

**涉及文件**: `sanitize.ts`（`ALLOWED_TAGS` / `ALLOWED_ATTRS` 过滤逻辑 + 警告文案）  
**修复状态**: 暂缓，待后续统一优化警告文案

### [2026-05-01] 测试 #2

**测试方式**: Obsidian 插件真机  
**测试文件**: `测试文件/01-基础排版.md`  
**测试结果**: PARTIAL（功能可用，但发现 2 个 Bug + 2 个已清理内容值得关注）

**通过项**:
- 右侧预览面板正常打开
- 标题 h1~h4 层级渲染正确，字号递减
- 正文段落、粗体、斜体、分割线显示正常
- 「刷新」「复制到公众号」「导出文件」「打开公众号」按钮均存在

**发现问题**:
- [ ] **Bug #1 — 仅复制纯文本**：`clipboard.ts` 的 `navigator.clipboard.write` + `ClipboardItem` 路径在 Obsidian 桌面环境下不可用，降级为 `writeText`（纯文本），导致无法将富文本 HTML 粘贴到公众号。这是核心功能失效。
- [ ] **Bug #2 — `<del>` 标签被移除**：删除线语法 `~~文字~~` 生成 `<del>` 标签，但 `sanitize.ts` 的 `ALLOWED_TAGS` 白名单里没有 `del`，导致标签被清除、内容裸露。警告提示"已移除不安全标签 `<del>`"。
- [x] **已清理内容 — `class` 属性被移除**：代码块生成 `<code class="language-ts">`，`sanitize.ts` 的 `ALLOWED_ATTRS` 不含 `class`，故被清理。影响语法高亮，但公众号本身不支持语法高亮，可接受。
- [x] **已清理内容 — `<input>` 标签被移除**：GFM 任务列表（`- [x]`）生成 `<input type="checkbox">`，`ALLOWED_TAGS` 不含 `input`，被移除后 checkbox 消失。公众号不支持交互元素，可接受，但警告措辞"不安全标签"容易误导。

**根因分析**:
- Bug #1：`ClipboardItem` 在 Obsidian 的 Electron 上下文中受权限限制，需要改用 `document.execCommand('copy')` 方案或通过隐藏元素选中后复制
- Bug #2：`sanitize.ts:ALLOWED_TAGS` 漏掉了 `del`、`figure`/`figcaption` 等语义标签

**修复状态**: 待修复

### [2026-05-01] 测试 #1

**测试方式**: Node.js (`node scripts/test-render.mjs`)  
**测试文件**: `fixtures/basic/input.md`，内联 case  
**测试结果**: PARTIAL → 修复后 PASS（29/29）

**通过项**:
- h1 / strong / em / ul 基础元素渲染
- callout `> [!note]` 正确降级为 `> **说明**`（含自定义标题）
- wiki link 四种形式全部正确转文字
- GFM 表格 / 删除线 / checkbox
- frontmatter 剥离（不出现在 HTML 输出中）
- 代码块 `<pre><code class="language-*">` 结构正确
- mermaid / 数学公式 / 自定义渲染语法 → 产生 UNSUPPORTED_SYNTAX 警告
- `![[embed]]` → 测试环境产生 MISSING_ATTACHMENT 警告

**发现问题**:
- [x] 断言 `html.includes("<pre><code>")` 误用严格子串，实际输出含 class 属性 `<pre><code class="language-javascript">`，导致误报 FAIL

**根因分析**: 测试断言写法过于严格，未考虑属性的存在  
**修复**: 改为 `html.includes("<pre>") && html.includes("<code")`（`scripts/test-render.mjs` 第 107 行）  
**修复状态**: 已修复

---

<!-- 历史记录保留在下方 -->
