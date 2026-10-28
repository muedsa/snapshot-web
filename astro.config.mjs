// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import markdoc from "@astrojs/markdoc";
import starlightLlmsTxt from "@rttnd/starlight-llms-txt";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";
import cloudflareScriptCompat from "./integrations/cloudflare-script-compat.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://snapshot.muedsa.com",
  integrations: [
    markdoc(),
    starlight({
      title: "Snapshot",
      description: "用 Kotlin Widget 树和 Skia 构建结构化图片。",
      plugins: [
        starlightLlmsTxt({
          projectName: "Snapshot",
          description: "Snapshot 的 Kotlin/JVM 图片渲染与 Parser 文本 DSL 中文文档。",
          details:
            "Kotlin DSL 与 Parser 文本模板共用渲染引擎，但属性名、默认值和颜色写法不完全相同。文档跟随 Snapshot 快照更新，在线 Playground 的渲染能力取决于已部署的 Open Snapshot 服务版本。",
          generatePageMarkdown: true,
          markdownFilePattern: "replace",
          rawContent: false,
          // 标题旁的辅助链接只对网页交互有用，不应重复进入 Markdown 正文。
          customSelectors: { all: [".sl-anchor-link"] },
          promote: ["guides/overview", "guides/quickstart", "guides/parser"],
          excludePages: ["404", "search"],
          exclude: ["index", "reference/source-index", "guides/visual-reference"],
          // 保留提示、实现限制、折叠说明和代码换行；精简版只按页面选择内容。
          minify: { note: false, tip: false, details: false, whitespace: false },
          customSets: [
            {
              label: "Kotlin",
              description: "Kotlin 接入、布局绘制、Widget 与公共配置参考。",
              paths: [
                "guides/{overview,installation,quickstart,rendering,concepts,layout,widgets,painting,media-text,fonts,data-templates,testing}",
                "widgets/**",
                "reference/{text-style,text-layout,box-decoration,borders,box-shadow,decoration-image,gradients,enums,faq}",
              ],
            },
            {
              label: "DSL",
              description: "Parser 模板语法、标签属性、错误处理与语言服务。",
              paths: [
                "guides/{overview,parser,examples,language-server,fonts,data-templates}",
                "reference/{parser-tags,parser-text,parser-errors,enums,faq}",
              ],
            },
          ],
        }),
      ],
      favicon: "/logo_mark_mono.png",
      defaultLocale: "root",
      locales: {
        root: { label: "简体中文", lang: "zh-CN" },
      },
      customCss: ["./src/styles/global.css"],
      components: {
        Head: "./src/components/Head.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/muedsa/snapshot",
        },
      ],
      sidebar: [
        {
          label: "开始使用",
          items: [
            { label: "概览", slug: "index" },
            { label: "文档导读", slug: "guides/overview" },
            { label: "在线 Playground", link: "/playground/" },
            { label: "快速开始", slug: "guides/quickstart" },
            { label: "安装与构建", slug: "guides/installation" },
            { label: "完整模板示例", slug: "guides/examples" },
            { label: "参数效果对比", slug: "guides/visual-reference" },
          ],
        },
        {
          label: "核心原理",
          items: [
            { label: "渲染入口与输出", slug: "guides/rendering" },
            { label: "核心概念", slug: "guides/concepts" },
            { label: "约束、布局与调试", slug: "guides/layout" },
          ],
        },
        {
          label: "Widget 指南",
          items: [
            { label: "Widget 与布局", slug: "guides/widgets" },
            { label: "绘制、装饰与效果", slug: "guides/painting" },
            { label: "图片、文本与富文本", slug: "guides/media-text" },
            { label: "字体与跨平台文字", slug: "guides/fonts" },
            { label: "用业务数据生成图片", slug: "guides/data-templates" },
          ],
        },
        {
          label: "公共配置参考",
          collapsed: true,
          items: [
            { label: "TextStyle 与文本装饰", slug: "reference/text-style" },
            { label: "段落、行高与行内对齐", slug: "reference/text-layout" },
            { label: "BoxDecoration", slug: "reference/box-decoration" },
            { label: "Border、BorderSide 与圆角", slug: "reference/borders" },
            { label: "BoxShadow", slug: "reference/box-shadow" },
            { label: "DecorationImage", slug: "reference/decoration-image" },
            { label: "渐变与渐变变换", slug: "reference/gradients" },
          ],
        },
        {
          label: "布局 Widget API",
          collapsed: true,
          items: [{ autogenerate: { directory: "widgets/layout" } }],
        },
        {
          label: "绘制与效果 Widget API",
          collapsed: true,
          items: [{ autogenerate: { directory: "widgets/painting" } }],
        },
        {
          label: "图片 Widget API",
          collapsed: true,
          items: [{ autogenerate: { directory: "widgets/image" } }],
        },
        {
          label: "文本 Widget API",
          collapsed: true,
          items: [{ autogenerate: { directory: "widgets/text" } }],
        },
        {
          label: "类 DOM 解析器",
          items: [
            { label: "类 DOM 解析器", slug: "guides/parser" },
            { label: "标签与属性参考", slug: "reference/parser-tags" },
            { label: "文本属性详解", slug: "reference/parser-text" },
            { label: "错误处理与扩展", slug: "reference/parser-errors" },
            { label: "DSL 语言服务", slug: "guides/language-server" },
          ],
        },
        {
          label: "测试",
          items: [{ label: "测试与 Golden", slug: "guides/testing" }],
        },
        {
          label: "参考",
          items: [
            { label: "枚举速查", slug: "reference/enums" },
            { label: "FAQ", slug: "reference/faq" },
            { label: "源码索引", slug: "reference/source-index" },
          ],
        },
      ],
    }),
    react(),
    cloudflareScriptCompat(),
  ],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      // snapshot-lsp worker 只在运行时加载，预构建它可避免 dev server 中途重新优化导致 504。
      include: ["@muedsa/snapshot-lsp/browser"],
    },
  },
});
