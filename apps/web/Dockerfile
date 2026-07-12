# Copyright 2026 Nishant Bhandari
# SPDX-License-Identifier: Apache-2.0
#
# switchboard-web: the dashboard and browser softphone (documentation/dev/
# architecture.md, component 3) — a static build served by nginx, which also
# reverse-proxies the control plane (apps/web/nginx.conf) so the browser
# stays single-origin. Build context is the repository ROOT so the pnpm
# workspace, the lockfile, and the sibling packages/shared source are all
# available (see documentation/dev/containers.md). Build with:
#   docker build -f apps/web/Dockerfile -t switchboard-web .

# ---- base: pinned Node + pinned pnpm --------------------------------------
FROM node:22.23.1-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace

# ---- deps: full workspace install (incl. devDependencies — vite, tailwind,
# the TanStack Router plugin, etc. are all devDependencies), scoped to the
# web app and its workspace dependency (@switchboard/shared). -------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN pnpm install --frozen-lockfile --filter "@switchboard/web..."

# ---- build: the shared package, then the Vite production build ----------
FROM deps AS build
COPY . .
RUN pnpm --filter @switchboard/shared build \
    && pnpm --filter @switchboard/web build

# ---- runtime: static assets behind nginx; no Node at all in this stage ---
FROM nginx:1.28.3-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/healthz || exit 1
