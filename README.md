# Local WeChat Publisher

在 Obsidian 本地将 Markdown 渲染为适合微信公众号粘贴的 HTML。

## 功能

- 本地渲染，不依赖远端 API
- 右侧预览
- 内置主题切换
- 字号切换
- HTML 复制
- Obsidian 图片嵌入的预览占位与导出提示

## 安装

> 当前插件尚未上架 Obsidian 社区插件市场，需要通过 GitHub 下载文件后手动安装。

### 方式一：下载 Release 文件（推荐普通用户）

从 GitHub Release 页面下载以下 3 个文件：

- `main.js`
- `manifest.json`
- `styles.css`

在你的 Obsidian 仓库中创建插件目录：

```text
<vault>/.obsidian/plugins/local-wechat-publisher/
  ├── main.js
  ├── manifest.json
  └── styles.css
```

其中 `<vault>` 是你的 Obsidian 仓库目录，不是本插件源码目录。

常见路径示例：

```text
macOS:
/Users/<user>/Documents/<vault>/.obsidian/plugins/local-wechat-publisher/

Windows:
C:\Users\<user>\Documents\<vault>\.obsidian\plugins\local-wechat-publisher\

Linux:
/home/<user>/Documents/<vault>/.obsidian/plugins/local-wechat-publisher/
```

安装后在 Obsidian 中启用插件：

1. 打开 Obsidian 设置
2. 进入「社区插件」
3. 关闭「安全模式」或「受限模式」
4. 点击刷新已安装插件列表
5. 启用 `Local WeChat Publisher`

### 方式二：从源码构建（推荐开发者）

```bash
git clone <repo-url>
cd obsidian-local-wechat-publisher
npm install
npm run build
```

构建完成后，把以下文件复制到你的 vault 插件目录：

```text
main.js
manifest.json
styles.css
```

## 更新

手动安装时，更新插件只需要替换这 3 个文件：

```text
main.js
manifest.json
styles.css
```

替换后在 Obsidian 中禁用并重新启用插件，或重启 Obsidian。

## 使用

1. 打开一篇 Markdown 文件
2. 点击左侧 `Local WeChat：打开预览面板（不复制）`
3. 在右侧预览面板检查排版效果
4. 点击右侧「复制到公众号」
5. 粘贴到微信公众号编辑器

## 开发

```bash
npm install
npm run build
```

## 测试

```bash
npm test
```

## 发布版本

当前插件版本需要保持以下文件一致：

- `manifest.json`
- `package.json`
- `package-lock.json`
- `versions.json`

Obsidian 实际运行只需要 `main.js`、`manifest.json`、`styles.css`。

## 常见问题

### 为什么 Obsidian 里看不到插件？

- 确认插件目录名是 `local-wechat-publisher`
- 确认 3 个文件直接放在该目录下，不要多套一层文件夹
- 确认已在 Obsidian 中刷新插件列表
- 确认 `manifest.json` 内容有效

### 是否需要安装 `node_modules`？

普通用户不需要。Obsidian 运行插件只需要：

```text
main.js
manifest.json
styles.css
```

只有开发者从源码构建时才需要执行 `npm install`。
