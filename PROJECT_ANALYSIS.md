# Local WeChat Publisher 功能介绍与安装说明

## 功能介绍

`Local WeChat Publisher` 是一个 Obsidian 插件，可以在本地把 Markdown 笔记转换成适合微信公众号编辑器粘贴的 HTML。

它主要解决的问题是：你可以继续在 Obsidian 里写文章，写完后通过插件预览排版效果，并一键复制到微信公众号后台。

主要功能包括：

- 本地渲染 Markdown，不依赖远程 API；
- 打开右侧公众号预览面板，提前检查文章排版；
- 一键复制公众号 HTML，粘贴到微信公众号编辑器；
- 支持导出当前笔记为 HTML 文件；
- 支持内置主题切换；
- 支持字号切换；
- 支持常见 Markdown 语法，如标题、列表、引用、代码块、表格、加粗、斜体、链接等；
- 支持部分 Obsidian 语法转换，如 `[[Wiki 链接]]`、`![[嵌入文档]]`、Callout 等；
- 对本地图片、缺失附件、不支持语法等问题提供发布前检查提示；
- 支持打开微信公众号后台，方便复制后直接粘贴。

当前需要注意的是，本地图片不能直接复制到微信公众号编辑器里发布。插件会在预览中显示本地图片，但复制或导出时会提示需要手动上传图片。

## 安装方式

当前插件还没有上架 Obsidian 社区插件市场，需要手动安装。

### 方式一：下载 Release 文件安装

从 GitHub Release 页面下载这 3 个文件：

```text
main.js
manifest.json
styles.css
```

然后在你的 Obsidian 仓库中创建插件目录：

```text
<vault>/.obsidian/plugins/local-wechat-publisher/
```

把下载的 3 个文件放进去，最终目录结构应为：

```text
<vault>/.obsidian/plugins/local-wechat-publisher/
├── main.js
├── manifest.json
└── styles.css
```

其中 `<vault>` 是你的 Obsidian 仓库目录。

常见路径示例：

```text
macOS:
/Users/<user>/Documents/<vault>/.obsidian/plugins/local-wechat-publisher/

Windows:
C:\Users\<user>\Documents\<vault>\.obsidian\plugins\local-wechat-publisher\

Linux:
/home/<user>/Documents/<vault>/.obsidian/plugins/local-wechat-publisher/
```

安装后，在 Obsidian 中启用插件：

1. 打开 Obsidian 设置；
2. 进入「社区插件」；
3. 关闭「安全模式」或「受限模式」；
4. 刷新已安装插件列表；
5. 启用 `Local WeChat Publisher`。

### 方式二：从源码构建安装

如果你是开发者，也可以从源码构建：

```bash
git clone <repo-url>
cd obsidian-md2wechat-local
npm install
npm run build
```

构建完成后，把下面 3 个文件复制到 Obsidian 插件目录：

```text
main.js
manifest.json
styles.css
```

目标目录仍然是：

```text
<vault>/.obsidian/plugins/local-wechat-publisher/
```

## 使用方法

1. 在 Obsidian 中打开一篇 Markdown 文件；
2. 点击左侧 `Local WeChat：打开预览面板（不复制）`；
3. 在右侧预览面板检查文章排版；
4. 根据需要切换主题或字号；
5. 点击「复制到公众号」；
6. 打开微信公众号后台；
7. 粘贴到微信公众号编辑器中；
8. 如果右侧面板提示本地图片或附件风险，发布前手动处理。

## 更新方式

手动安装时，更新插件只需要替换这 3 个文件：

```text
main.js
manifest.json
styles.css
```

替换后，在 Obsidian 中禁用并重新启用插件，或者直接重启 Obsidian。
