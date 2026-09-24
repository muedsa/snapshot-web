# Snapshot 文档站

这是 [Snapshot](https://github.com/muedsa/snapshot) 的中文落地页与文档站。Snapshot 是一个基于 Kotlin、JVM 与 Skia 的声明式图片生成库，可以通过 Widget DSL 或类 DOM 文本构建布局，并输出 PNG、JPEG 与 WebP 图片。

- 在线站点：[snapshot.muedsa.com](https://snapshot.muedsa.com)
- Snapshot 源码：[github.com/muedsa/snapshot](https://github.com/muedsa/snapshot)

本仓库只包含网站和文档，不包含 Snapshot 的 Kotlin 实现。开发文档时，可以将 Snapshot 源码放在本项目的相邻目录 `../snapshot`，方便对照当前 API、测试和示例。

## 文档内容

站点目前包含：

- 产品落地页与能力展示；
- 安装、快速开始、渲染、布局、绘制、图片、文本与测试指南；
- 34 个独立 Widget API 页面，包含源码签名、参数、行为、示例和限制；
- 类 DOM Parser 的标签、属性、错误处理与扩展说明；
- 枚举速查、FAQ 和源码索引。

Widget API 按布局、绘制与效果、图片、文本四组自动生成侧边栏。

## 技术栈

- [Astro](https://astro.build/) 7
- [Starlight](https://starlight.astro.build/)
- [Markdoc](https://markdoc.dev/)
- Tailwind CSS 4
- [Monaco Editor](https://github.com/microsoft/monaco-editor) 0.56，用于在线 Playground
- [snapshot-lsp](https://github.com/muedsa/snapshot-lsp)，Playground 的 DSL 语言服务（LSP over Web Worker）
- pnpm

文档以 `.mdoc` 编写，并通过 `@astrojs/starlight-markdoc` 使用 Starlight 的 Aside、Tabs、Steps、Card、LinkCard 等组件。

## 环境要求

- Node.js `>= 22.12.0`
- pnpm `>= 7.1.0`

建议使用较新的 pnpm 版本，并保留仓库中的 `pnpm-lock.yaml` 以获得一致的依赖结果。

## 本地开发

安装依赖：

```bash
pnpm install
```

`@muedsa/snapshot-lsp` 发布在 GitHub Packages。该 registry 即使对公开包也要求认证，所以需要先配置一个具有 `read:packages` 权限的令牌（写入用户级 `~/.npmrc` 或 pnpm 全局配置）：

```ini
@muedsa:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<令牌>
```

用户级配置里可以写成环境变量（例如 `_authToken=${GITHUB_TOKEN}`）。但不要把这些设置提交到仓库的项目级 `.npmrc`：从 pnpm 10.34.2 / 11.5.3 起，出于安全考虑（[GHSA-3qhv-2rgh-x77r](https://github.com/pnpm/pnpm/security/advisories/GHSA-3qhv-2rgh-x77r)），仓库内 `.npmrc` 的 `${...}` 变量不再展开，带占位符的设置会被整体忽略。

启动开发服务器：

```bash
pnpm dev
```

默认访问地址为 <http://localhost:4321>。

执行生产构建：

```bash
pnpm build
```

构建结果输出到 `dist/`。在本地预览生产构建：

```bash
pnpm preview
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm install` | 安装项目依赖 |
| `pnpm dev` | 启动本地开发服务器 |
| `pnpm build` | 构建静态站点并生成搜索索引与 Sitemap |
| `pnpm preview` | 预览 `dist/` 中的生产构建 |
| `pnpm astro -- --help` | 查看 Astro CLI 帮助 |

## 目录结构

```text
.
├── public/
│   ├── favicon.svg
│   └── showcase/                 # 首页展示图片
├── src/
│   ├── components/               # Playground 与主题初始化组件
│   ├── content/
│   │   └── docs/
│   │       ├── index.mdoc        # 首页
│   │       ├── guides/           # 使用指南
│   │       ├── reference/        # Parser、枚举、FAQ 与源码索引
│   │       └── widgets/          # 独立 Widget API 页面
│   ├── pages/playground.astro    # /playground/ 路由
│   ├── playground/               # Monaco 编辑器与 snapshot-lsp 集成
│   ├── content.config.ts         # Starlight 内容集合
│   └── styles/global.css         # 主题和全局样式
├── astro.config.mjs              # 站点、导航和集成配置
├── markdoc.config.mjs            # Starlight Markdoc 组件配置
├── package.json
└── pnpm-lock.yaml
```

## 在线 Playground

`/playground/` 使用 Monaco 编辑器，并通过 Web Worker 接入 snapshot-lsp，提供标签/属性/枚举补全、悬停说明与实时诊断；点击“运行”会把 DSL 发送到公开的 Open Snapshot 服务生成图片。

```text
src/playground/
├── playground.ts             # 编辑器、示例、运行与诊断计数等主逻辑
├── snapshot-language.ts      # snapshot 语言的 Monarch 词法、注释/括号配置与深浅两套主题
├── snapshot-lsp-client.ts    # 用 Monaco 自带的 monaco.lsp 客户端连接语言服务
└── snapshot-lsp.worker.ts    # 在 Worker 中启动 @muedsa/snapshot-lsp/browser
```

Monaco 与语言服务只在访问 `/playground/` 时懒加载；编辑器主题跟随站点的深色/浅色切换。

## 编写和维护文档

### 新增 Widget API 页面

在对应分类目录中创建 `.mdoc` 文件：

```text
src/content/docs/widgets/
├── layout/
├── painting/
├── image/
└── text/
```

页面 frontmatter 示例：

```yaml
---
title: Container
description: 组合尺寸、约束、间距、装饰与变换的单子节点 Widget。
sidebar:
  order: 1
---
```

这四个目录已在 `astro.config.mjs` 中配置自动侧边栏。使用 `sidebar.order` 控制同一分类内的显示顺序，无需手动新增导航项。

每个 Widget 页面应尽量包含：

1. 用途和适用场景；
2. 与当前 Snapshot 源码一致的函数签名；
3. 参数及默认值；
4. 布局或绘制行为；
5. 可以独立理解的 Kotlin 示例；
6. 父节点要求、约束条件和常见错误。

### 使用 Starlight Markdoc 组件

`.mdoc` 文件不能直接依赖任意 HTML 或 MDX 组件。应使用当前 Markdoc 配置提供的标签，例如：

```mdoc
{% aside type="caution" title="注意" %}
这里填写需要突出显示的限制或风险。
{% /aside %}
```

提醒类型包括 `note`、`tip`、`caution` 和 `danger`。此外还可以使用 `tabs`、`tabitem`、`steps`、`cardgrid`、`card`、`linkcard`、`badge` 与 `filetree`。组件应服务于信息结构，普通说明不必全部包装成组件。

### 与 Snapshot 源码保持一致

文档中的版本、默认参数和行为应以 Snapshot 当前源码为准，尤其需要检查：

- `core/src/main/kotlin/com/muedsa/snapshot/widget/`
- `core/src/main/kotlin/com/muedsa/snapshot/widget/text/`
- `core/src/main/kotlin/com/muedsa/snapshot/rendering/`
- `core/src/main/kotlin/com/muedsa/snapshot/tools/`
- `parser/src/main/kotlin/com/muedsa/snapshot/parser/`

不要仅依据旧 README 或旧版发布包推断当前行为。涉及网络图片时，应明确说明内置实现不是可直接用于生产环境的安全网络访问方案。

## 提交前检查

至少执行：

```bash
pnpm build
```

构建应成功生成全部静态页面、Pagefind 搜索索引和 Sitemap。提交前还应检查：

- 新增页面是否出现在正确的侧边栏分类；
- 所有站内链接和静态资源路径是否有效；
- 深色与浅色主题下内容是否可读；
- `.mdoc` 中没有残留未解析的 Markdoc 标签；
- 示例签名、参数和限制与 Snapshot 源码一致；
- 没有提交 `dist/`、`.astro/`、`node_modules/` 或本地凭据。

## 部署

`pnpm build` 生成纯静态站点，站点地址在 `astro.config.mjs` 中配置为 `https://snapshot.muedsa.com`。部署时发布 `dist/` 目录即可。

### 使用 Docker 与 Nginx

仓库提供多阶段构建的 `Dockerfile`：第一阶段使用 Node.js 和 pnpm 构建站点，第二阶段只保留 Nginx 与静态文件。

构建镜像：

```bash
docker build -t snapshot-web .
```

在本机启动：

```bash
docker run --rm -p 8080:80 snapshot-web
```

浏览器访问 <http://localhost:8080>。正式部署时可由宿主机 Nginx、Traefik、Caddy 或云负载均衡器负责 HTTPS，再将流量转发到容器的 80 端口。

容器内的 Nginx 配置位于 `deploy/nginx.conf`，已经处理：

- Starlight 的目录式静态路由；
- 自定义 404 页面及正确的 404 状态；
- Astro 哈希资源的长期缓存；
- Pagefind 搜索资源的短期缓存；
- Gzip 压缩和基础响应头；
- 容器健康检查。

### 使用 GitHub Actions 发布到 GHCR

工作流 `.github/workflows/publish-container.yml` 会自动构建 Docker 镜像并发布到 GitHub Container Registry：

- 推送到 `main` 分支时，发布 `latest`、`main` 和 `sha-<提交哈希>` 标签；
- 向 `main` 分支提交 Pull Request 时，仅验证镜像能够构建，不会推送；
- 也可以在 GitHub 仓库的 Actions 页面手动运行。

工作流登录 GHCR 使用 GitHub 自动提供的 `GITHUB_TOKEN`。但镜像构建阶段会从 GitHub Packages 安装 `@muedsa/snapshot-lsp`，而 `GITHUB_TOKEN` 只能访问当前仓库的包，因此还需要在仓库 **Settings → Secrets and variables → Actions** 中添加 `SNAPSHOT_LSP_TOKEN`：一个对该包有读取权限（classic token 的 `read:packages`）的 Personal Access Token。

Dockerfile 通过 BuildKit secret 读取该令牌，写入用户级 `$HOME/.npmrc` 后执行安装，并在同一条 `RUN` 指令里删除。构建层只记录该指令前后的文件系统差异，所以令牌不会出现在镜像层、镜像历史或构建缓存中；它只用于安装依赖，不参与站点构建。

需要注意：来自 fork 的 Pull Request 拿不到仓库 Secrets，这类 PR 的镜像构建会因缺少令牌而失败；同仓库分支的 PR 不受影响。

仓库的 Actions 权限需要允许工作流写入 Packages；如果组织策略覆盖了仓库设置，还需要由组织管理员开放相应权限。

首次推送 `main` 分支并等待工作流完成后，可以运行：

```bash
docker pull ghcr.io/muedsa/snapshot-web:latest
docker run --rm -p 8080:80 ghcr.io/muedsa/snapshot-web:latest
```

GHCR 软件包首次发布后可能是私有状态。如果需要匿名拉取镜像，请在 GitHub 软件包设置中将其可见性改为 Public。生产部署建议使用明确的版本标签或 `sha-<提交哈希>`，避免 `latest` 更新后部署内容发生不可预期的变化。
