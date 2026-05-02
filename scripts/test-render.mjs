/**
 * 渲染管线测试脚本（无需 Obsidian 环境）
 *
 * 覆盖范围：normalize（正则层）→ remark/rehype 管线
 * 不覆盖：sanitize.ts（依赖 DOM），Obsidian embed 真实解析
 *
 * 运行方式：node scripts/test-render.mjs
 * 输出：
 *   - 控制台 PASS/FAIL 摘要
 *   - fixtures/basic/output.html（可在浏览器打开预览）
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkBreaks from "remark-breaks";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── 颜色输出 ────────────────────────────────────────────────────────────────
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

// ─── normalize：镜像 normalize.ts 正则层（不含 Obsidian 依赖） ─────────────────
const CODE_FENCE_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g;
const WIKI_EMBED_PATTERN = /!\[\[([^\]]+)\]\]/g;
const WIKI_LINK_PATTERN = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;
const CALLOUT_PATTERN = /^>\s*\[!([A-Za-z0-9_-]+)\]([^\n]*)$/gm;
const CALLOUT_TYPES = {
  note: "说明", tip: "提示", warning: "注意", success: "成功",
  danger: "危险", info: "信息", abstract: "摘要", question: "问题",
};

function normalizeMarkdown(md) {
  const warnings = [];
  const unsupported = [
    { re: /^\s*```(?:mermaid|dataview|dataviewjs)\s*$/m, label: "Mermaid / Dataview 代码块" },
    { re: /^\s*\$\$[\s\S]*?\$\$\s*$/m, label: "块级数学公式" },
    { re: /\{\{renderer\s+.*?\}\}/, label: "自定义渲染语法" },
  ];
  for (const item of unsupported) {
    if (item.re.test(md)) warnings.push(`UNSUPPORTED_SYNTAX: ${item.label}`);
  }

  const parts = md.split(CODE_FENCE_PATTERN);
  const transformed = parts.map((part) => {
    if (part.startsWith("```") || part.startsWith("~~~") || part.startsWith("`")) return part;

    // Wiki embed → 测试占位（无 vault 可读）
    part = part.replace(WIKI_EMBED_PATTERN, (_, inner) => {
      warnings.push(`MISSING_ATTACHMENT: ![[${inner}]] 在测试环境跳过 embed 展开`);
      return `> **嵌入文档**\n> ${inner}（测试环境跳过）`;
    });

    // Wiki link → 纯文字
    part = part.replace(WIKI_LINK_PATTERN, (_, target, alias) => {
      if (alias) return alias.trim();
      const [pathPart, heading] = target.trim().split("#");
      const base = pathPart.split("/").at(-1) || target;
      return heading ? `${base} > ${heading}` : base;
    });

    // Callout → blockquote
    part = part.replace(CALLOUT_PATTERN, (_, type, titleText) => {
      const label = CALLOUT_TYPES[type.toLowerCase()] ?? "说明";
      const custom = titleText.trim();
      return `> **${custom ? `${label} · ${custom}` : label}**`;
    });

    return part;
  });

  return { normalizedMarkdown: transformed.join(""), warnings };
}

// ─── remark/rehype 渲染 ───────────────────────────────────────────────────────
async function renderToHtml(markdown) {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkBreaks)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeStringify)
    .process(markdown);
  return String(result);
}

// ─── 测试断言 ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failLog = [];

function assert(name, condition, detail = "") {
  if (condition) {
    console.log(`  ${green("✓")} ${name}`);
    passed++;
  } else {
    const msg = detail ? `${name} — ${detail}` : name;
    console.log(`  ${red("✗")} ${msg}`);
    failed++;
    failLog.push(msg);
  }
}

// ─── 测试用例 ─────────────────────────────────────────────────────────────────

async function testBasicFixture() {
  console.log(bold("\n[1] 基础 fixture (fixtures/basic/input.md)"));
  const raw = readFileSync(join(ROOT, "fixtures/basic/input.md"), "utf8");
  const { normalizedMarkdown, warnings } = normalizeMarkdown(raw);
  const html = await renderToHtml(normalizedMarkdown);

  // 写入预览文件
  const preview = wrapPreview("basic/input.md", html, warnings);
  writeFileSync(join(ROOT, "fixtures/basic/output.html"), preview, "utf8");
  console.log(`  ${yellow("→")} 预览已写入 fixtures/basic/output.html`);

  assert("包含 <h1>", html.includes("<h1>"), `实际: ${html.slice(0, 200)}`);
  assert("包��� <strong>（加粗）", html.includes("<strong>"));
  assert("包含 <em>（斜体）", html.includes("<em>"));
  assert("包含 <ul>（无序列表）", html.includes("<ul>"));
  assert("callout 转为 <blockquote>", html.includes("<blockquote>"));
  assert("callout 标题出现（说明）", html.includes("说明"));
  assert("包含 <code>（行内代码）", html.includes("<code>"));
  assert("包含 <hr>", html.includes("<hr"));
  assert("不含原始 [[", !html.includes("[["));
  assert("不含原始 > [!note]", !html.includes("[!note]"));
}

async function testWikiLink() {
  console.log(bold("\n[2] Wiki 链接转换"));
  const cases = [
    ["[[笔记名]]", "笔记名"],
    ["[[文件夹/笔记名]]", "笔记名"],
    ["[[笔记名|别名]]", "别名"],
    ["[[笔记名#章节]]", "笔记名 > 章节"],
  ];
  for (const [input, expected] of cases) {
    const { normalizedMarkdown } = normalizeMarkdown(input);
    assert(`"${input}" → "${expected}"`, normalizedMarkdown.trim() === expected);
  }
}

async function testCallout() {
  console.log(bold("\n[3] Callout 降级"));
  const cases = [
    ["> [!note]", "> **说明**"],
    ["> [!tip] 提示内容", "> **提示 · 提示内容**"],
    ["> [!warning]", "> **注意**"],
    ["> [!unknown]", "> **说明**"],
  ];
  for (const [input, expected] of cases) {
    const { normalizedMarkdown } = normalizeMarkdown(input);
    assert(`"${input}" → "${expected}"`, normalizedMarkdown.trim() === expected);
  }
}

async function testGfm() {
  console.log(bold("\n[4] GFM 扩展语法"));
  const md = `
| 列A | 列B |
|-----|-----|
| 1   | 2   |

~~删除线~~

- [x] 已完成
- [ ] 未完成
  `.trim();
  const html = await renderToHtml(md);
  assert("包含 <table>（GFM 表格）", html.includes("<table>"));
  assert("包含 <del>（删除线）", html.includes("<del>"));
  assert("包含 checkbox", html.includes('type="checkbox"'));
}

async function testFrontmatter() {
  console.log(bold("\n[5] Frontmatter 剥离"));
  const md = `---
title: 测试文章
date: 2026-05-01
---

正文内容`;
  const html = await renderToHtml(md);
  assert("frontmatter 不出现在 HTML 输出中", !html.includes("title:") && !html.includes("date:"));
  assert("正文内容正常渲染", html.includes("正文内容"));
}

async function testCodeBlock() {
  console.log(bold("\n[6] 代码块"));
  const md = "```javascript\nconsole.log('hello');\n```";
  const html = await renderToHtml(md);
  assert("包含 <pre> 和 <code>（代码块）", html.includes("<pre>") && html.includes("<code"));
  assert("代码内容保留", html.includes("console.log"));
  // mermaid warning
  const { warnings } = normalizeMarkdown("```mermaid\ngraph TD;\n```");
  assert("mermaid 产生 UNSUPPORTED_SYNTAX 警告", warnings.some((w) => w.includes("Mermaid")));
}

async function testUnsupportedSyntax() {
  console.log(bold("\n[7] 不支持语法检测"));
  const { warnings: w1 } = normalizeMarkdown("$$\nE=mc^2\n$$");
  assert("块级数学公式产生警告", w1.some((w) => w.includes("数学公式")));

  const { warnings: w2 } = normalizeMarkdown("{{renderer dataview, TABLE}}");
  assert("自定义渲染语法产生警告", w2.some((w) => w.includes("自定义渲染")));

  const { warnings: w3 } = normalizeMarkdown("![[missing-file.md]]");
  assert("![[embed]] 在测试环境产生 MISSING_ATTACHMENT 警告", w3.some((w) => w.includes("MISSING_ATTACHMENT")));
}

async function testInlineCodeProtection() {
  console.log(bold("\n[8] 行内代码保护（Bug #3 回归测试）"));
  // 行内代码内的 wiki link/embed 不应被处理
  const cases = [
    ["`[[笔记名]]`", "`[[笔记名]]`"],
    ["`![[embed.md]]`", "`![[embed.md]]`"],
    ["普通文字 `[[link]]` 后续文字", "普通文字 `[[link]]` 后续文字"],
  ];
  for (const [input, expected] of cases) {
    const { normalizedMarkdown } = normalizeMarkdown(input);
    assert(`行内代码内容不被转换: "${input}"`, normalizedMarkdown.trim() === expected);
  }
  // 行内代码外的 wiki link 仍然应该被处理
  const { normalizedMarkdown } = normalizeMarkdown("前 [[笔记名]] 后 `[[保留]]`");
  assert("行内代码外的 wiki link 正常转换", normalizedMarkdown === "前 笔记名 后 `[[保留]]`");
}
function wrapPreview(title, articleHtml, warnings) {
  const warningSection = warnings.length > 0
    ? `<details open style="margin-top:24px;padding:12px;background:#fef9c3;border-radius:8px">
         <summary style="font-weight:bold;cursor:pointer">⚠ 警告（${warnings.length}）</summary>
         <ul style="margin:8px 0 0;padding-left:20px">${warnings.map((w) => `<li>${w}</li>`).join("")}</ul>
       </details>`
    : `<p style="margin-top:24px;color:#16a34a">✓ 无警告</p>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>渲染预览 · ${title}</title>
  <style>
    body { margin: 0; padding: 24px; background: #f5f5f4; font-family: "PingFang SC", Arial, sans-serif; }
    .shell { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 12px;
             box-shadow: 0 4px 20px rgba(0,0,0,.08); padding: 32px; }
    h1,h2,h3 { color: #111; } blockquote { border-left: 4px solid #d6d3d1; margin: 0; padding-left: 16px; color: #555; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; }
    th,td { border: 1px solid #d6d3d1; padding: 8px 12px; }
    th { background: #f3f4f6; }
    hr { border: none; border-top: 1px solid #e5e7eb; }
    .meta { font-size: 12px; color: #9ca3af; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="shell">
    <p class="meta">测试渲染输出 · ${new Date().toISOString()} · node scripts/test-render.mjs</p>
    ${articleHtml}
    ${warningSection}
  </div>
</body>
</html>`;
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(bold("obsidian-md2wechat 渲染管线测试"));
  console.log("涵盖：normalize 正则层 + remark/rehype 管线");
  console.log("不涵盖：sanitize.ts（依赖 DOM），Obsidian embed 真实解析\n");

  await testBasicFixture();
  await testWikiLink();
  await testCallout();
  await testGfm();
  await testFrontmatter();
  await testCodeBlock();
  await testUnsupportedSyntax();
  await testInlineCodeProtection();

  console.log("\n" + "─".repeat(50));
  console.log(`结果：${green(`${passed} 通过`)}  ${failed > 0 ? red(`${failed} 失败`) : "0 失败"}`);
  if (failLog.length > 0) {
    console.log(red("\n失败项："));
    failLog.forEach((f) => console.log(`  - ${f}`));
  }
  console.log("─".repeat(50) + "\n");

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(red("运行出错："), err);
  process.exit(1);
});
