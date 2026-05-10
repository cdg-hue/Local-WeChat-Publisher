# 我做了一个 Obsidian 插件：本地写完，直接复制到公众号

  

大家好，我是阿成。

  

如果你平时用 Obsidian 写公众号，应该会遇到一个很烦的问题：

  

**Markdown 写得很舒服，但复制到微信公众号后台之后，排版经常要重新调。**

  

所以我做了一个 Obsidian 插件：

  

**Local WeChat Publisher**

  

它的作用很简单：

  

**把 Obsidian 里的 Markdown 笔记，在本地转换成适合微信公众号编辑器粘贴的 HTML。**

  

你可以继续在 Obsidian 里写文章，写完后打开预览面板检查排版，然后一键复制到公众号后台。

  

项目地址：

  

https://github.com/cdg-hue/Local-WeChat-Publisher

  

这个插件不依赖远程 API，所有转换都在本地完成。

  

对经常写公众号的人来说，主要就是省掉“Markdown 转公众号排版”这一步。

  

## 它能做什么？

  

目前主要功能有这些：

  

- 本地渲染 Markdown

- 打开右侧公众号预览面板

- 一键复制公众号 HTML

- 导出当前笔记为 HTML 文件

- 支持主题切换

- 支持字号切换

- 支持标题、列表、引用、代码块、表格、加粗、链接等常见 Markdown 语法

- 支持部分 Obsidian 语法，比如 `[[Wiki 链接]]`、`![[嵌入文档]]`、Callout

- 发布前检查本地图片、缺失附件、不支持语法等问题

- 支持直接打开微信公众号后台

  

这里要注意一点：

  

**本地图片不能直接复制到微信公众号后台发布。**

  

插件可以在预览里显示本地图片，但复制到公众号后台之后，图片还是需要你手动上传。

  

这个限制主要来自微信公众号编辑器本身。

  

所以如果文章里有图片，建议流程是：

  

```text

先复制正文

再进入公众号后台

最后手动上传图片

```

  

## 安装方式一：下载 Release 文件安装

  

目前插件还没有上架 Obsidian 社区插件市场，所以需要手动安装。

  

先到项目 Release 页面下载 3 个文件：

  

```text

main.js

manifest.json

styles.css

```

  

然后在你的 Obsidian 仓库里创建插件目录：

  

```text

<vault>/.obsidian/plugins/local-wechat-publisher/

```

  

把刚才下载的 3 个文件放进去。

  

最终目录应该是这样：

  

```text

<vault>/.obsidian/plugins/local-wechat-publisher/

├── main.js

├── manifest.json

└── styles.css

```

  

这里的 `<vault>` 是你的 Obsidian 仓库目录。

  

常见路径示例：

  

macOS：

  

```text

/Users/<user>/Documents/<vault>/.obsidian/plugins/local-wechat-publisher/

```

  

Windows：

  

```text

C:\Users\<user>\Documents\<vault>\.obsidian\plugins\local-wechat-publisher\

```

  

Linux：

  

```text

/home/<user>/Documents/<vault>/.obsidian/plugins/local-wechat-publisher/

```

  

放好文件后，打开 Obsidian：

  

1. 进入「设置」

2. 打开「社区插件」

3. 关闭「安全模式」或「受限模式」

4. 刷新已安装插件列表

5. 启用 `Local WeChat Publisher`

  

这样就安装好了。

  

## 安装方式二：源码构建

  

如果你想自己从源码构建，也可以这样操作：

  

```bash

git clone https://github.com/cdg-hue/Local-WeChat-Publisher.git

cd Local-WeChat-Publisher

npm install

npm run build

```

  

构建完成后，把下面 3 个文件复制到插件目录：

  

```text

main.js

manifest.json

styles.css

```

  

目标目录还是：

  

```text

<vault>/.obsidian/plugins/local-wechat-publisher/

```

  

然后重启 Obsidian，或者在社区插件里禁用后重新启用插件。

  

## 使用方法

  

安装完成后，使用流程很简单。

  

第一步，在 Obsidian 里打开一篇 Markdown 文章。

  

第二步，点击左侧命令：

  

```text

Local WeChat：打开预览面板（不复制）

```

  

第三步，在右侧预览面板检查公众号排版。

  

你可以看一下：

  

- 标题层级是否正常

- 引用样式是否正常

- 代码块是否清楚

- 表格有没有变形

- 图片或附件有没有风险提示

  

第四步，根据需要切换主题或字号。

  

第五步，点击：

  

```text

复制到公众号

```

  

第六步，打开微信公众号后台，直接粘贴到编辑器里。

  

整体流程就是：

  

```text

Obsidian 写文章

↓

打开插件预览

↓

检查排版

↓

一键复制 HTML

↓

粘贴到微信公众号后台

↓

手动处理图片

↓

发布

```

  

## 更新方式

  

如果后面插件更新了，也很简单。

  

重新下载新版的这 3 个文件：

  

```text

main.js

manifest.json

styles.css

```

  

替换原来插件目录里的旧文件。

  

然后在 Obsidian 里禁用并重新启用插件。

  

如果没有生效，就重启 Obsidian。

  

## 后续计划

  

目前这个插件主要解决的是：

  

**把 Obsidian 里的 Markdown 内容，本地转换成适合微信公众号编辑器粘贴的 HTML。**

  

后面我会继续研究两个方向。

  

第一个是图片处理。

  

现在本地图片还不能直接复制到微信公众号后台，需要手动上传。

  

后续我会看看能不能把图片这一步做得更顺一点，比如在复制时更清楚地提示哪些图片需要处理，或者进一步研究能不能实现图片处理后再一键复制。

  

第二个是自动化发布。

  

目前插件还是“复制到公众号后台，再手动发布”。

  

后面如果条件允许，我也会研究更自动化的发布流程，让它从“辅助复制排版”慢慢变成更完整的公众号发布工具。

  

当然，这部分会比较谨慎。

  

因为微信公众号后台对图片、样式和接口权限都有一些限制，所以我会优先保证稳定性，再考虑自动化程度。

  

## 最后

  

这个插件没有做得很复杂。

  

它不是自动发布工具，也不是公众号运营后台。

  

它只解决一个很具体的问题：

  

**让你在 Obsidian 里写完 Markdown 后，可以更方便地复制到微信公众号编辑器。**

  

如果你平时也是 Obsidian 写作，然后再发公众号，可以试一下。

  

项目地址：

  

https://github.com/cdg-hue/Local-WeChat-Publisher

  

现在这个版本先把最常见、最刚需的一步做好：

  

**Obsidian 写完，一键复制到公众号。**

  

后续再慢慢补上图片处理和自动化发布能力。