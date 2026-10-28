# Snapshot 文档站

这是 [Snapshot](https://github.com/muedsa/snapshot) 的中文落地页与文档站。Snapshot 是一个基于 Kotlin、JVM 与 Skia 的声明式图片生成库，可以通过 Widget DSL 或类 DOM 文本构建布局，并输出 PNG、JPEG 与 WebP 图片。

- 在线站点：[snapshot.muedsa.com](https://snapshot.muedsa.com)
- Snapshot 源码：[github.com/muedsa/snapshot](https://github.com/muedsa/snapshot)

本仓库只包含网站和文档，不包含 Snapshot 的 Kotlin 实现。开发文档时，可以将 Snapshot 源码放在本项目的相邻目录 `../snapshot`，方便对照当前 API、测试和示例。

## 文档内容

站点目前包含：

- 产品落地页与能力展示；
- 安装、快速开始、渲染、布局、绘制、图片、文本、字体配置、业务数据模板与测试指南；
- 39 个独立 Widget API 页面，包含源码签名、参数、行为、示例和限制；
- TextStyle、段落与行高、装饰、边框、阴影、背景图片和渐变的公共配置参考；
- 类 DOM Parser 的标签、属性、文本样式详解、错误处理与扩展说明；
- 可复制的完整模板，以及真实渲染的图片适配、渐变、行内对齐与裁剪对比图；
- 枚举速查、FAQ 和源码索引。

Widget API 按布局、绘制与效果、图片、文本四组自动生成侧边栏。

## 技术栈

- [Astro](https://astro.build/) 7
- [Starlight](https://starlight.astro.build/)
- [Markdoc](https://markdoc.dev/)
- Tailwind CSS 4
- [Monaco Editor](https://github.com/microsoft/monaco-editor) 0.57，用于在线 Playground
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
pnpm exec astro dev --background
```

默认访问地址为 <http://localhost:4321>。用 `pnpm exec astro dev status` 查看状态，`pnpm exec astro dev logs` 查看日志，`pnpm exec astro dev stop` 停止后台服务。

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
| `pnpm exec astro dev --background` | 启动本地开发服务器 |
| `pnpm build` | 构建静态站点并生成搜索索引与 Sitemap |
| `pnpm preview` | 预览 `dist/` 中的生产构建 |
| `pnpm docs:test` | 运行参数覆盖检查器的单元测试 |
| `pnpm docs:coverage` | 对照相邻 Snapshot 源码检查公共配置与 Parser 文本/渐变的参数表覆盖 |
| `pnpm docs:links` | 检查已构建页面的站内链接、锚点和资源路径 |
| `pnpm playground:test` | 验证 LSP Worker 协议、补全、高亮及服务端属性诊断适配 |
| `pnpm astro -- --help` | 查看 Astro CLI 帮助 |

## 目录结构

```text
.
├── public/
│   ├── favicon.svg
│   ├── examples/                 # 模板与参数对比的真实渲染输出
│   └── showcase/                 # 首页展示图片
├── scripts/                      # 文档覆盖、链接与示例验证
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
├── playground.ts               # 编辑器、示例、运行与诊断计数等主逻辑
├── render-diagnostics.ts       # 服务端错误协议、属性提示与请求版本绑定的定位
├── snapshot-language.ts        # snapshot 语言的 Monarch 词法、注释/括号配置与深浅两套主题
├── snapshot-lsp-client.ts      # 用 Monaco 自带的 monaco.lsp 客户端连接语言服务
├── snapshot-lsp-capabilities.ts # 显式补充 LSP snippet 能力声明
└── snapshot-lsp.worker.ts      # 在 Worker 中启动 @muedsa/snapshot-lsp/browser
```

Monaco 与语言服务只在访问 `/playground/` 时懒加载；编辑器主题跟随站点的深色/浅色切换。

当前使用 `@muedsa/snapshot-lsp@0.2.1`。升级包时同步更新 `package.json`、`pnpm-lock.yaml` 和 `pnpm-workspace.yaml` 中的 `minimumReleaseAgeExclude`，不要仅修改版本号而保留旧锁文件。

0.2.1 按客户端能力决定是否返回 snippet。本项目在初始化报文中显式补充 `snippetSupport`，确保语言服务知道编辑器支持占位符。补全结果仍交给 Monaco 原生处理，包括多行属性值的 `additionalTextEdits`；不要再注册一套重复的补全提供器。升级 Monaco 时需重新确认此适配是否仍有必要。

无引号 URL 中的 `/` 是属性值的一部分。自闭合标签应写成 `<Image url=https://example.com/a.png />`，或使用引号 `<Image url="https://example.com/a.png"/>`。高亮只负责着色，语法与取值诊断由 LSP 提供，最终渲染仍以服务端 Parser 为准。

### 服务端属性诊断

运行失败时按响应的 `code` 显示错误类型，并保留 `message` 和请求 ID。服务端返回可选的 `diagnostic` 时，额外展示属性、标签、值状态、期望格式、可选项和填写示例；`truncated: true` 会提示内容不完整。复合格式中的可选项可能只描述某个字段，不会直接作为整个属性值自动替换。`IMAGE_LOAD_ERROR` 即使附带属性提示，仍显示为图片加载失败。

完整有效的位置会在 Monaco 中添加来源为 `Open Snapshot` 的错误标记，点击“定位到错误”跳转到本次提交的对应位置。偏移从 0 开始，行列从 1 开始，按 UTF-16 代码单元计算。服务端只返回一个点，前端不推断属性值范围；缺少位置时仍可阅读诊断。编辑代码后立即移除服务端标记，并提示重新运行；请求期间的编辑同样使旧位置失效。LSP 的实时诊断独立保留。

旧版服务、结构错误和组件约束错误可能没有 `diagnostic`，此时继续展示普通错误，不从消息中提取字段或位置。每次服务响应只报告首个错误；修正后需要重新运行。前端默认请求 JSON 错误，不启用 `errorImage`。这些能力取决于实际服务返回的数据，本地适配通过不代表线上服务已经部署了相应版本。

### 验证编辑体验

`pnpm playground:test` 使用 Node 的 TypeScript 类型剥离功能加载本地配置；测试覆盖真实包的浏览器入口（Node Worker + MessagePort）、snippet 能力协商、补全编辑范围、诊断更新及 Monaco Monarch 词法引擎，也覆盖服务端新旧错误协议、UTF-16 位置、请求版本变化、复合属性提示和文本安全输出。属性面板测试使用文本槽位和事件替身；该命令不启动浏览器，不验证真实 DOM 布局或 UI 接受补全的行为，也不请求渲染服务。

修改编辑器集成后，还应在 `/playground/` 手动验证下表。`|` 仅表示光标位置，不要输入；可用 `Ctrl+Space` 唤起补全。

| 输入与操作 | 预期结果 |
| --- | --- |
| `<Snapshot><Container wi\|`，接受 `width`，输入 `100` | 得到 `width="100"`，光标位于引号内，无字面量 `${1}` |
| `<Snapshot><Container wi\|dht="100"/></Snapshot>`，接受 `width` | 仅修正属性名，保留原赋值 |
| `textDirection="` 后换行输入 `R\|`，再换行输入 `BAD"`，接受 `RTL` | 整个属性值替换为 `"RTL"`，旧值及内部换行全部移除 |
| `<Snapshot><Text></Te\|` 后换行输入 `</Snapshot>`，接受 `Text` | 补齐 `</Text>`，不吞掉下一行 |
| `<Snapshot><Image url=https://example.com/a.png fit="CO\|" /></Snapshot>` | 可补全 `CONTAIN` / `COVER`，URL 与后续属性正确着色 |

测试前保存自己的编辑器草稿，完成后恢复；不必点击“运行”。浏览器语言服务与 Open Snapshot 的部署版本相互独立，前端测试通过不代表后端已同步支持全部特性。

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

读者应先看到“这个组件能解决什么问题”和一个常用例子，再查签名与参数。内部实现和少见边界放在后面。不要用“写入 parentData”等实现术语代替用途说明；先解释效果，再按需要介绍术语。每个 Widget 页面应包含：

1. 用途和适用场景；
2. 与当前 Snapshot 源码一致的函数签名；
3. 参数及默认值；
4. 布局或绘制行为；
5. 可以独立理解的 Kotlin 示例：说明放在哪里运行、外部变量从哪里来，以及输出尺寸或可见效果；
6. 父节点要求、约束条件和常见错误。

对象型参数不应只写类型名。TextStyle、BoxDecoration 等公共配置单独放在 `reference/`，组件页链接到对应参考，避免复制多份容易漂移的长表。公共配置页应包含：

- 全部参数的类型、默认值，以及 null 表示继承、自动选择还是禁用；
- 数值单位、推荐范围、实际校验范围和相互依赖；
- 布局、绘制、裁剪与资源生命周期的区别；
- Kotlin 与 Parser 的名称、默认值和能力差异；
- 可运行的组件片段，效果不直观时补充真实渲染对比图。

不要将同名 Flutter / CSS 属性的行为直接套到 Snapshot。当前实现限制应显式写出，例如 TextOverflow.FADE 尚未渐隐，而 VISIBLE 在检测到溢出时仍会裁剪。

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
pnpm docs:test
pnpm docs:coverage
pnpm playground:test
pnpm build
pnpm docs:links
git diff --check
```

`docs:coverage` 默认读取 `../snapshot`，也可以运行 `node scripts/check-doc-coverage.mjs <snapshot源码目录>`。目前覆盖 10 个配置类的构造参数，以及 Parser 的文本/渐变属性；只核对指定表格列中是否有条目，不验证默认值、语义，也不是整个库的 API 完整性证明。上游声明格式改变时需要同步调整检查器。

构建应成功生成全部静态页面、Pagefind 搜索索引和 Sitemap。提交前还应检查：

- 新增页面是否出现在正确的侧边栏分类；
- 所有站内链接和静态资源路径是否有效；
- 深色与浅色主题下内容是否可读；
- `.mdoc` 中没有残留未解析的 Markdoc 标签；
- 示例签名、参数和限制与 Snapshot 源码一致；
- 没有提交 `dist/`、`.astro/`、`node_modules/` 或本地凭据。

### 验证公共配置示例与更新对比图

当前提供 Windows x64 / Java 17 的本地验证入口，需要 Node.js、PowerShell、相邻 Snapshot 源码以及已缓存的 Kotlin / Skiko / JUnit 依赖。默认读取最新 core / parser JAR（先在 Snapshot 项目构建 `:core:jar :parser:jar`）；也可用 `-FromSource` 直接在本项目的 `.astro/` 中编译当前源码。脚本不联网，不修改相邻仓库；testkit 未发布，因此测试示例始终从它的源码编译。

首次运行前，按[字体指南](https://snapshot.muedsa.com/guides/fonts/#准备字体文件)获取 `Sans2.004` 的 `NotoSansCJKsc-Regular.otf`、`NotoSansCJKsc-Bold.otf` 和许可证，保存到 `.astro/docs-verification/fonts/`，也可用 `-FontDirectory <目录>` 指定已有文件。它们用于验证正文中的多字重注册与 DSL 示例，不提交字体二进制文件。

```powershell
# 默认使用 GRADLE_USER_HOME，未设置时使用用户目录下的 .gradle。
# 按实际路径填写 -GradleCache；例如 D:/.gradle。
./scripts/verify-doc-examples.ps1 -GradleCache D:/.gradle

# 不依赖上游 JAR，直接验证当前源码；仍需要本地缓存齐全。
./scripts/verify-doc-examples.ps1 -GradleCache D:/.gradle -FromSource

# 确认需要更新文档配图时，才覆盖 public/examples 中的六张参数对比图。
./scripts/verify-doc-examples.ps1 -GradleCache D:/.gradle -UpdateImages
```

也可指定 `-SnapshotRoot` 和 `-SnapshotVersion`。`-FromSource -CompilerVersion <缓存版本>` 可用于工具链未缓存齐全时的兼容性核对，会明确提示与上游声明版本不同；这种运行不等于使用上游 Gradle 工具链的完整验证。Kotlin / Skiko 版本读取上游版本目录；编译器的辅助依赖目前按 Kotlin 2.4.20 的本地缓存配置，升级工具链时需同步核对。其他系统需要适配对应的 Skiko 原生 runtime，不能直接使用 Windows JAR。

脚本直接抽取公共配置、效果对比及基线指南中的 17 段 Kotlin、Parser 文本页的 4 段 XML，并扩展到组件/指南片段、完整程序和带 Snapshot 根标签的 DSL 模板（包括标签参考中的装饰、紧约束与 Raw 内嵌 WidgetSpan 示例）。它会实际编译和渲染，并验证关键子节点尺寸/位置、像素断言、CDATA 文本保留，以及 Golden 的 record / verify / update。当前输出在 `.astro/docs-verification/reference/`、`walkthroughs/` 和 `run/`；`walkthroughs/manifest.json` 记录实际抽取数量与清单。

这不是全站任意代码块执行器：函数签名、配置片段、故意错误示例、网络访问和自定义接口示意不自动执行。新增例子时同步维护抽取清单与运行入口。完整程序保留正文 import 和函数定义，以发现读者复制时会遇到的编译错误。

运行成功只代表这些示例可以执行，不等于视觉正确。更新图片后仍需打开输出检查文字缺字、对齐、裁剪和效果说明，并在网页中检查深浅主题与窄屏阅读。固定字体环境以减少图片差异；本地成功不代表线上 Open Snapshot 已部署同样版本。

## 部署

`pnpm build` 生成纯静态站点，站点地址在 `astro.config.mjs` 中配置为 `https://snapshot.muedsa.com`。部署时发布 `dist/` 目录即可。

### 使用 Docker 与 Nginx

仓库提供多阶段构建的 `Dockerfile`：第一阶段使用 Node.js 和 pnpm 构建站点，第二阶段只保留 Nginx 与静态文件。

先在当前终端环境中配置具有包读取权限的 `GITHUB_TOKEN`，再用 BuildKit secret 构建镜像；不要通过 build-arg 或直接写入 Dockerfile 传递令牌：

```bash
docker build --secret id=npm_token,env=GITHUB_TOKEN -t snapshot-web .
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
- Gzip 压缩和基础响应头。

当前 Dockerfile 未配置 HEALTHCHECK。如部署平台需要健康探测，可为容器的 HTTP 根路径另行配置探针。

### 使用 GitHub Actions 发布到 GHCR

工作流 `.github/workflows/publish-container.yml` 会自动构建 Docker 镜像并发布到 GitHub Container Registry：

- 推送到 `main` 分支时，发布 `latest`、`main` 和 `sha-<提交哈希>` 标签；
- 向 `main` 分支提交 Pull Request 时，运行质量检查并验证镜像能够构建，不会推送；
- 也可以在 GitHub 仓库的 Actions 页面手动运行。

所有触发方式都会先运行 `quality` 作业：安装锁文件中的依赖后，依次执行 `docs:test`、`docs:coverage`、`playground:test`、`build` 和 `docs:links`。链接检查读取本次构建的 `dist/`。`build` 镜像作业通过 `needs: quality` 等待这些检查全部成功，检查失败时不会构建或发布镜像。

`docs:coverage` 对照工作流中 `SNAPSHOT_DOCS_REF` 指定的 Snapshot 提交，源码检出到 `.ci/snapshot`，只读取 Kotlin 源文件，不运行 Gradle。同步上游 API 文档时，应一起更新该提交并运行覆盖检查；这不包含使用方安装流程或 Kotlin 示例编译验证。CI 使用 Node.js 22 和 pnpm 10.33.0，与 Dockerfile 的构建环境保持一致。

工作流登录 GHCR 和从 GitHub Packages 安装 `@muedsa/snapshot-lsp` 均使用 GitHub 自动提供的 `GITHUB_TOKEN`，不再依赖自定义的 `SNAPSHOT_LSP_TOKEN`。`GITHUB_TOKEN` 可以读取明确授权给当前仓库的其他包：在 **LSP npm 包的 Package settings → Manage Actions access** 中添加本仓库，并授予至少 **Read** 权限。仅拥有 LSP 源码仓库的访问权限不等于拥有包的 Actions 读取权限，详见 [GitHub Packages 的访问控制说明](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility#ensuring-workflow-access-to-your-package)。

质量检查作业只申请 `contents: read` 和 `packages: read`。`setup-node` 把 GitHub Packages 的 scoped registry 和认证占位符写入 `NPM_CONFIG_USERCONFIG` 指向的临时配置文件，只有安装依赖步骤提供 `NODE_AUTH_TOKEN`，不向仓库写入 `.npmrc`。

Dockerfile 通过 BuildKit secret 读取该令牌，写入用户级 `$HOME/.npmrc` 后执行安装，并在同一条 `RUN` 指令里删除。构建层只记录该指令前后的文件系统差异，所以令牌不会出现在镜像层、镜像历史或构建缓存中；它只用于安装依赖，不参与站点构建。

Dependabot PR 的质量检查和镜像构建也使用自动提供的 `GITHUB_TOKEN`，无需在 Actions 或 Dependabot Secrets 中另配包读取令牌。下载依赖只需要 `packages: read` 和包对本仓库的 Read 授权；PR 不登录或推送 GHCR。

镜像作业声明的 `packages: write` 包含读取权限，并用于非 PR 运行时发布 GHCR 镜像。如果组织策略限制工作流的 Packages 权限，需要由组织管理员配置相应权限。

首次推送 `main` 分支并等待工作流完成后，可以运行：

```bash
docker pull ghcr.io/muedsa/snapshot-web:latest
docker run --rm -p 8080:80 ghcr.io/muedsa/snapshot-web:latest
```

GHCR 软件包首次发布后可能是私有状态。如果需要匿名拉取镜像，请在 GitHub 软件包设置中将其可见性改为 Public。生产部署建议使用明确的版本标签或 `sha-<提交哈希>`，避免 `latest` 更新后部署内容发生不可预期的变化。
