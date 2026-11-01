# Build from the repo root: docker build -f products/data-quality/web/Dockerfile .
# (the shared libs in libs/web are installed from the repo, see package.json)
FROM node:22-alpine AS build
WORKDIR /repo
COPY libs/web/ libs/web/
COPY products/data-quality/web/package.json products/data-quality/web/package-lock.json products/data-quality/web/.npmrc products/data-quality/web/
WORKDIR /repo/products/data-quality/web
RUN npm ci
COPY products/data-quality/web/ ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY products/data-quality/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/products/data-quality/web/dist /usr/share/nginx/html
EXPOSE 8080
