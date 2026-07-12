# Copyright 2026 Nishant Bhandari
# SPDX-License-Identifier: Apache-2.0
#
# switchboard-api: the Node.js control plane (documentation/dev/architecture.md,
# component 2). Build context is the repository ROOT, not apps/server, so the
# pnpm workspace, the lockfile, and the sibling packages/shared source are all
# available (see documentation/dev/containers.md). Build with:
#   docker build -f apps/server/Dockerfile -t switchboard-api .
#
# tsup (apps/server/tsup.config.ts) bundles @switchboard/shared straight into
# dist/server.js; every other dependency (fastify, ts-rest, zod, kysely,
# better-sqlite3, ari-client, ...) stays external by tsup's default and so
# must exist as real node_modules at runtime. `pnpm deploy` (below) is what
# produces that self-contained, production-only node_modules without hand-
# rolling pnpm's workspace symlink layout.

# ---- base: pinned Node + pinned pnpm (matches root package.json's
# "packageManager" field, so the lockfile is always read by the exact
# version that wrote it) -------------------------------------------------
FROM node:22.23.1-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
# better-sqlite3 is a native module. A prebuilt binary usually exists for
# this exact base image, but when it doesn't, pnpm falls back to compiling
# it here (never in the runtime stage below) — hence the toolchain. Root
# package.json's `pnpm.onlyBuiltDependencies: ["better-sqlite3", "esbuild"]`
# is what allows its install script to run at all under pnpm's default
# "no lifecycle scripts" security posture.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace

# ---- deps: full workspace install (incl. devDependencies), scoped to the
# server and its workspace dependency (@switchboard/shared) via --filter.
# Manifests are copied before the rest of the source so this slow layer is
# cached across source-only changes. ------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN pnpm install --frozen-lockfile --filter "@switchboard/server..."

# ---- build: the shared package, then the server bundle -----------------
FROM deps AS build
COPY . .
RUN pnpm --filter @switchboard/shared build \
    && pnpm --filter @switchboard/server build

# ---- prod-deploy: a self-contained, production-only copy of the server
# package (dist/ plus a flattened node_modules with workspace deps copied
# in, not symlinked — see `pnpm deploy` docs). Runs from the `build` stage
# so it reuses the same pnpm store (and any native binary already
# built/fetched for this exact base) instead of reinstalling from scratch.
# --legacy: this workspace does not set `inject-workspace-packages`, which
# `pnpm deploy` requires unless legacy mode is requested. -----------------
FROM build AS prod-deploy
RUN pnpm --filter @switchboard/server deploy --prod --legacy /prod/server

# ---- runtime: slim, non-root, only the deployed output ------------------
FROM node:22.23.1-bookworm-slim AS runtime
ENV NODE_ENV=production
RUN groupadd --gid 1001 switchboard \
    && useradd --uid 1001 --gid switchboard --shell /usr/sbin/nologin --create-home switchboard
WORKDIR /app
COPY --from=prod-deploy --chown=switchboard:switchboard /prod/server ./
# Defaults match apps/server/src/config.ts; docker-compose.yml sets the
# volume-backed paths explicitly to keep this Dockerfile decoupled from
# compose's volume layout.
RUN mkdir -p /app/data /app/recordings && chown -R switchboard:switchboard /app
USER switchboard
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.SWITCHBOARD_PORT||3000)+'/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
