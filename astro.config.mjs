// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import markdoc from '@astrojs/markdoc';

import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://snapshot.muedsa.com',
  integrations: [markdoc(), starlight({
      title: 'Snapshot',
      description: '用 Kotlin Widget 树和 Skia 构建结构化图片。',
      defaultLocale: 'root',
      locales: {
          root: { label: '简体中文', lang: 'zh-CN' },
      },
      customCss: ['./src/styles/global.css'],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/muedsa/snapshot' }],
      sidebar: [
          {
              label: '开始使用',
              items: [
                  { label: '概览', slug: 'index' },
                  { label: '安装与构建', slug: 'guides/installation' },
                  { label: '快速开始', slug: 'guides/quickstart' },
              ],
          },
          {
              label: '核心原理',
              items: [
                  { label: '渲染入口与输出', slug: 'guides/rendering' },
                  { label: '核心概念', slug: 'guides/concepts' },
                  { label: '约束、布局与调试', slug: 'guides/layout' },
              ],
          },
          {
              label: 'Widget 指南',
              items: [
                  { label: 'Widget 与布局', slug: 'guides/widgets' },
                  { label: '绘制、装饰与效果', slug: 'guides/painting' },
                  { label: '图片、文本与富文本', slug: 'guides/media-text' },
              ],
          },
          {
              label: '布局 Widget API',
              items: [{ autogenerate: { directory: 'widgets/layout' } }],
          },
          {
              label: '绘制与效果 Widget API',
              items: [{ autogenerate: { directory: 'widgets/painting' } }],
          },
          {
              label: '图片 Widget API',
              items: [{ autogenerate: { directory: 'widgets/image' } }],
          },
          {
              label: '文本 Widget API',
              items: [{ autogenerate: { directory: 'widgets/text' } }],
          },
          {
              label: '类 DOM 解析器',
              items: [
                  { label: '类 DOM 解析器', slug: 'guides/parser' },
                  { label: '标签与属性参考', slug: 'reference/parser-tags' },
                  { label: '错误处理与扩展', slug: 'reference/parser-errors' },
              ],
          },
          {
              label: '测试',
              items: [
                  { label: '测试与 Golden', slug: 'guides/testing' },
              ],
          },
          {
              label: '参考',
              items: [
                  { label: '枚举速查', slug: 'reference/enums' },
                  { label: 'FAQ', slug: 'reference/faq' },
                  { label: '源码索引', slug: 'reference/source-index' },
              ],
          },
      ],
  }), react()],

  vite: {
    plugins: [tailwindcss()],
  },
});
