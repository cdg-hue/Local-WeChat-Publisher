# 测试指南

## 测试方式一：Node.js 渲染测试（快速，无需 Obsidian）

适合验证渲染管线逻辑，不依赖 Obsidian 环境。

```bash
npm test
```

**覆盖范围**：normalize 正则层、remark/rehype 渲染管线、GFM 扩展、frontmatter 剥离、警告检测  
**不覆盖**：sanitize.ts（依赖浏览器 DOM）、`![[embed]]` 真实展开、剪贴板/视图层 UI 行为

跑完后会在 `fixtures/basic/output.html` 生成渲染预览，可直接在浏览器打开查看。

---

## 测试方式二：Obsidian 插件真机测试（完整验证）

### 前置信息

- **Vault 路径**：`/Users/cdg/Documents/个人知识库/公众号写作`
- **插件目录**：`.obsidian/plugins/local-wechat-publisher/`
- 插件已安装并启用，每次修改代码后按以下步骤更新即可。

---

### 步骤一：构建最新代码

```bash
cd /Users/cdg/Documents/ai-project/obsidian/obsidian-md2wechat-local
npm run build
```

构建成功后项目根目录的 `main.js` 会更新。

---

### 步骤二：将构建产物复制到插件目录

```bash
PLUGIN_DIR="/Users/cdg/Documents/个人知识库/公众号写作/.obsidian/plugins/local-wechat-publisher"
cp main.js "$PLUGIN_DIR/main.js"
cp manifest.json "$PLUGIN_DIR/manifest.json"
cp styles.css "$PLUGIN_DIR/styles.css"
```

---

### 步骤三：在 Obsidian 中重新加载插件

在 Obsidian 中选择以下任一方式：

- **Cmd+P** → 搜索 `Reload app without saving` → 回车
- 或：设置 → 社区插件 → Local WeChat Publisher → 关闭后重新开启

---

### 步骤四：将测试样例复制进 Vault

```bash
cp -r /Users/cdg/Documents/ai-project/obsidian/obsidian-md2wechat-local/fixtures \
  "/Users/cdg/Documents/个人知识库/公众号写作/fixtures-wechat-test"
```

> 如果目录已存在可以跳过，或加 `-f` 覆盖。

---

### 步骤五：在 Obsidian 中按顺序验证

#### 1. 基础渲染

打开 `fixtures-wechat-test/basic/input.md`，点击左侧 ribbon 图标「复制到公众号」，检查：

- 右侧预览面板打开，标题 / 列表 / 代码块 / 表格样式正常
- 状态提示显示「已复制公众号 HTML」
- 粘贴到任意富文本编辑器，结构完整

#### 2. Obsidian 特有语法

打开 `fixtures-wechat-test/verification/obsidian-syntax.md`，检查：

- `[[wiki link]]` 以纯文字展示，不显示双括号
- `![[embed-note.md]]` 内容展开为引用块
- `> [!note]` callout 降级为带标题的引用块
- 本地图片 / 缺失附件 → 右侧出现「发布前检查」警告项
- Mermaid / 数学公式 → 出现警告，不崩溃

#### 3. 真实发布流

打开 `fixtures-wechat-test/verification/publish-sample.md`，点击「复制到公众号」，然后：

1. 查看右侧面板的「发布前检查」有无风险项
2. 粘贴到[微信公众号写作区](https://mp.weixin.qq.com/)
3. 确认标题层级 / 引用块 / 表格 / 加粗斜体在公众号中显示正常

---

### 步骤六：记录测试结果

将每次测试的发现追加到 `DEBUG_LOG.md`，格式参考文件内的模板：

```
### [YYYY-MM-DD] 测试 #N
**测试方式**: Obsidian 插件
**测试文件**: 
**测试结果**: PASS / FAIL / PARTIAL
**通过项**: 
**发现问题**:
  - [ ] 问题描述
**根因分析**: 
**修复状态**: 
```

---

## 快速参考

| 操作 | 命令 |
|---|---|
| Node.js 渲染测试 | `npm test` |
| 构建插件 | `npm run build` |
| 更新 Vault 插件 | `cp main.js manifest.json styles.css "/Users/cdg/Documents/个人知识库/公众号写作/.obsidian/plugins/local-wechat-publisher/"` |
| 查看调试日志 | `DEBUG_LOG.md` |
| 查看验证指南 | `fixtures/verification/VERIFICATION_GUIDE.md` |
