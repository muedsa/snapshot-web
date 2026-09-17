# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

ENV CI=true

RUN corepack enable \
    && corepack prepare pnpm@10.33.0 --activate

# 先复制依赖清单，使源码变化时可以复用依赖安装层。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

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
