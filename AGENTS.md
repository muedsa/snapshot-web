## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Playground

`/playground/` 是 Monaco 编辑器 + snapshot-lsp 的在线 DSL 编辑器：

- `src/components/SnapshotPlayground.astro`：页面结构、样式与懒加载入口（Monaco 在页面加载后动态 `import`）。
- `src/playground/playground.ts`：编辑器、示例、运行（调用 Open Snapshot 服务）与诊断计数。
- `src/playground/snapshot-language.ts`：`snapshot` 语言的 Monarch 词法、注释/括号配置与深浅两套主题。
- `src/playground/snapshot-lsp-client.ts`：用 Monaco 自带的 `monaco.lsp` 客户端连接 Worker。
- `src/playground/snapshot-lsp.worker.ts`：在 Web Worker 中启动 `@muedsa/snapshot-lsp/browser`。

`@muedsa/snapshot-lsp` 来自 GitHub Packages（`@muedsa:registry=https://npm.pkg.github.com`），安装需要读取令牌：本地配置在全局 npm/pnpm 配置中，容器构建用 `SNAPSHOT_LSP_TOKEN` secret。修改语言目录前请先更新 snapshot-lsp 包版本。
