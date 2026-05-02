# 待做事项

## P0：一键复制时自动上传本地图片

### 背景

当前项目已经可以将 Markdown 渲染为适合微信公众号粘贴的 HTML，但本地图片不能直接完成复制发布流程。

原因是微信公众号编辑器无法访问 Obsidian vault 里的本地文件路径；剪贴板中的 `text/html` 通常只携带 `<img src="...">`，不会可靠携带图片二进制。`data:image/base64` 方案体积大，也容易被公众号编辑器清理或拒绝，因此不作为主方案。

### 目标

实现“点击复制到公众号 → 自动上传本地图片 → 替换为公网 HTTPS 图片地址 → 复制富文本 HTML → 粘贴到公众号即可完成”的流程。

推荐第一版采用 **Cloudflare R2 / 对象存储 / 自建图床上传服务**，不直接对接微信公众号素材 API。

### 推荐架构

```text
Obsidian Markdown
→ normalize 阶段识别本地图片
→ 复制前读取本地图片文件
→ 上传到图床 / Cloudflare R2 / 自建上传服务
→ 得到公网 HTTPS URL
→ 写入图片 URL 缓存
→ render-export 阶段输出真实 <img src="https://...">
→ copyWechatHtml 复制富文本
→ 用户粘贴到微信公众号编辑器
```

### 第一版范围

- 新增图片上传配置：
  - 图片处理模式：`manual` / `auto-upload`
  - 上传服务地址：`uploadEndpoint`
  - 访问令牌：`uploadToken`
  - 可选公开访问前缀：`publicBaseUrl`
- 新增上传接口抽象：
  - 输入：本地图片文件内容、文件名、MIME type、内容 hash
  - 输出：公网 HTTPS 图片 URL
- 新增上传缓存：
  - 以图片内容 hash 作为 key
  - 同一张图片重复复制时不重复上传
  - 缓存字段至少包含：`hash`、`localPath`、`remoteUrl`、`uploadedAt`
- 修改复制流程：
  - 点击“复制到公众号”时，先扫描 `normalized.assets` 中的 `local-image`
  - 对未缓存图片执行上传
  - 上传成功后将 `exportSrc` 设置为远程 URL
  - 重新生成 export HTML 后再复制
  - 任一图片上传失败时阻止“成功复制”提示，并展示明确错误
- 保留手动模式：
  - 未开启自动上传时，维持当前“本地图片需要手动上传”的发布前检查

### 上传服务约定

第一版建议使用通用 HTTP 上传接口，避免把插件强绑定到某一家服务。

请求：

```http
POST /upload
Authorization: Bearer <uploadToken>
Content-Type: multipart/form-data

file=<binary>
hash=<sha256>
path=<vault-relative-path>
```

响应：

```json
{
  "url": "https://img.example.com/obsidian/<hash>.png"
}
```

要求：

- 返回 URL 必须是公网可访问的 HTTPS 地址
- 图片服务不能启用会拦截微信公众号编辑器的防盗链规则
- URL 应长期稳定，文章发布后不应失效

### Cloudflare R2 推荐部署

- 使用 R2 bucket 存储图片
- 绑定自定义域名或子域名，例如 `img.example.com`
- 上传服务负责接收插件上传请求，再写入 R2
- 插件不直接保存 R2 Secret Key，避免密钥暴露在 Obsidian 本地配置里
- 若只是本地个人使用，也可以先用本机/轻量后端保存令牌，但长期方案仍建议后端代理

### 不推荐方案

- 不推荐直接复制本地图片路径：公众号无法访问
- 不推荐将图片转成 `data:image/base64`：体积大，兼容性差，容易被清理
- 不推荐第一版直接对接微信公众号素材 API：需要 `access_token`、公众号权限、后端代理和素材管理，复杂度过高
- 不推荐依赖公共免费图床：可能限流、删图、防盗链或域名失效

### 涉及文件

- `settings.ts`：新增图片上传相关设置
- `types.ts`：扩展 `ResolvedAsset`、新增上传缓存类型
- `normalize.ts`：继续识别本地图片，并保留 `resolvedPath`
- `render-export.ts`：本地图片存在远程 URL 时输出 `<img>`，否则输出警告
- `view.ts`：复制前触发上传流程，并展示上传进度 / 失败原因
- `main.ts`：保存设置和缓存，提供读取本地图片能力
- `clipboard.ts`：保持现有富文本复制 fallback，不在这里处理图片上传

### 验收标准

- 包含本地图片的文章点击“复制到公众号”后，自动上传图片并复制富文本 HTML
- 粘贴到微信公众号编辑器后，图片正常显示
- 同一张图片第二次复制不重复上传
- 上传失败时不误报“复制成功”，并明确指出失败图片和原因
- 未配置上传服务时，当前手动上传警告逻辑保持不变
- 远程图片 `https://...` 不重复上传，仍按原 URL 输出

