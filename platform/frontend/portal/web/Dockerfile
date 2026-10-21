# Build from the repo root: docker build -f platform/frontend/portal/web/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo
COPY libs/web/ libs/web/
COPY platform/frontend/portal/web/package.json platform/frontend/portal/web/package-lock.json platform/frontend/portal/web/.npmrc platform/frontend/portal/web/
WORKDIR /repo/platform/frontend/portal/web
RUN npm ci
COPY platform/frontend/portal/web/ ./
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
ENV PORTAL_ENV=dev \
    NGINX_RESOLVER=kube-dns.kube-system.svc.cluster.local
COPY platform/frontend/portal/web/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY platform/frontend/portal/web/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
# Replaced by the ConfigMap in the cluster.
COPY platform/frontend/portal/web/nginx/remotes.json /etc/portal/remotes.json
COPY --from=build /repo/platform/frontend/portal/web/dist /usr/share/nginx/html
EXPOSE 8080
