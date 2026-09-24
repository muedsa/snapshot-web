# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

ENV CI=true

RUN corepack enable \
    && corepack prepare pnpm@10.33.0 --activate

# 先复制依赖清单，使源码变化时可以复用依赖安装层。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# @muedsa/snapshot-lsp 来自 GitHub Packages。该 registry 即使对公开包也要求令牌，
# 令牌由 BuildKit secret 注入（见 .github/workflows/publish-container.yml 的 secrets）。
# 凭据写入用户级 $HOME/.npmrc 而非项目级 .npmrc：从 pnpm 10.34.2 / 11.5.3 起，出于安全考虑
# 仓库内 .npmrc 的 ${...} 变量不再展开、相关设置会被忽略（GHSA-3qhv-2rgh-x77r），
# 用户级配置才是凭据的可靠位置。文件在同一条 RUN 内创建并删除，不会进入镜像层或构建缓存。
RUN --mount=type=secret,id=npm_token \
    sh -c 'printf "@muedsa:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n" "$(cat /run/secrets/npm_token)" > "${HOME:-/root}/.npmrc" \
      && pnpm install --frozen-lockfile \
      && rm -f "${HOME:-/root}/.npmrc"'

COPY . .
RUN pnpm build


FROM nginx:alpine AS runtime

# 安装 tzdata 并设置系统时区为 Asia/Shanghai
ENV TZ=Asia/Shanghai
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
