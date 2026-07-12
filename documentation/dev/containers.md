# Containers and Docker Compose

How Switchboard's three images are built, how `docker-compose.yml` wires them
together, and — the part worth reading carefully — how the media and
networking settings are kept in sync so audio actually flows. This is
[architecture.md](architecture.md)'s "media and networking model" made
concrete in Dockerfiles and Compose. See also
[implementation.md](implementation.md) feature 6 (containers) and feature 9
(the two-way-audio walking skeleton), and the user-facing
[running-with-docker.md](../user/running-with-docker.md) guide.

Acronyms, expanded on first use: ARI is the Asterisk REST Interface. RTP is
the Real-time Transport Protocol (the audio stream). WS is WebSocket. NAT is
Network Address Translation. DTLS-SRTP is Datagram Transport Layer
Security-secured Secure Real-time Transport Protocol, the encryption WebRTC
audio uses.

## The three images

| Image                | From                | Built by                | Runs                                    |
| --------------------- | ------------------- | ------------------------ | ---------------------------------------- |
| `switchboard-engine`  | `engine/Dockerfile`  | pinned Asterisk base     | Asterisk (PJSIP, ARI, WS)                 |
| `switchboard-api`     | `apps/server/Dockerfile` | pnpm + tsup workspace build | the Fastify control plane (`node dist/server.js`) |
| `switchboard-web`     | `apps/web/Dockerfile`   | pnpm + Vite workspace build | nginx, serving the SPA and proxying `/api` |

Every image build uses the **repository root** as its build context (not the
package's own directory), because `apps/server` and `apps/web` both depend on
the workspace `packages/shared` package and need the pnpm lockfile to install
deterministically:

```bash
docker build -f apps/server/Dockerfile -t switchboard-api .
docker build -f apps/web/Dockerfile -t switchboard-web .
docker build -f engine/Dockerfile -t switchboard-engine .
```

`docker compose build` (or plain `docker compose up`, see below) does this
automatically for all three.

## `switchboard-engine`

`engine/Dockerfile` is a single stage `FROM andrius/asterisk:21.12.3_debian-trixie`
— a pinned, exact version-and-distribution tag (not a floating major like `21`
or `latest`), chosen because that project ships a production Asterisk build
with PJSIP, ARI, and the WS/WSS transport already compiled in (`chan_pjsip`,
`res_pjsip*`, `res_rtp_asterisk` are explicitly enabled by its build script;
`res_ari` and `res_http_websocket` build by default since their one
dependency, `libjansson`, is present) for both `linux/amd64` and
`linux/arm64`. Bump the pinned tag deliberately when a newer Asterisk release
is wanted; check `https://hub.docker.com/r/andrius/asterisk/tags` for
available `{version}_{os}-{distribution}` tags first.

Per [CLAUDE.md](../../CLAUDE.md) ("keep the engine's static configuration
minimal"), the image adds only what the two-way-audio walking skeleton
(implementation.md feature 9) needs, layered onto the base image's own sample
configuration:

- `engine/config/http.conf` — enables Asterisk's HTTP server on `8088`. Both
  ARI and the browser's SIP-signaling WS ride on this one port (see
  "Two ports, sort of" below).
- `engine/config/extensions.conf` — a Stasis-only dialplan: `_10XX` (matching
  extensions 1000-1099) enters `Stasis(switchboard)` and nothing else. No
  `Dial()` — the control plane reads the dialed extension off the caller
  channel (`channel.dialplan.exten`) on `StasisStart` and originates the
  callee leg itself, back into the same Stasis app (see
  `apps/server/src/ari/coordinator.ts`). This is why trunk-specific dialplan
  never needs to exist: everything past "enter Stasis" is the control
  plane's job, and trunks (feature 10/11) are provisioned into PJSIP at
  runtime, never into this file.
- `engine/config/pjsip.conf.template`, `ari.conf.template`,
  `rtp.conf.template` — rendered into their `.conf` counterparts at container
  start by `engine/docker-entrypoint.sh`, which runs `envsubst` (shipped in
  the base image) over an explicit variable list before handing off to the
  base image's own entrypoint (which does its usual PUID/PGID adaptation and
  execs the `asterisk` process). Only files literally named `*.conf.template`
  are touched, and only the five `SWITCHBOARD_*` variables listed in that
  script are substituted — `extensions.conf` (no `.template` file exists for
  it) is never at risk of `envsubst` mistaking a dialplan variable like
  `${EXTEN}` for a shell variable and blanking it out.

  Templating exists so exactly one thing has to change to move the RTP range
  or the advertised address: `docker-compose.yml`'s environment. Defaults for
  all five variables live in `docker-entrypoint.sh` itself (bash's
  `${VAR:=default}` parameter expansion), not as Dockerfile `ENV`
  instructions — `docker build` flags an `ENV`-baked credential (even this
  well-known sandbox default password) as a layer-history secrets smell.
  This keeps the image self-sufficient run outside Compose (`docker run`
  with no environment set at all) without tripping that check.

`pjsip.conf.template` defines two fixed WebRTC endpoints, `1001` and `1002`,
so two browser tabs can register and call each other. Notable settings:

- `webrtc=yes` is PJSIP's shortcut for ICE, `rtcp_mux`, `use_avpf`, and
  `media_encryption=dtls` all at once.
- `dtls_auto_generate_cert=yes` has Asterisk mint its own self-signed DTLS
  certificate at startup, so no certificate file has to be baked into the
  image or mounted for DTLS-SRTP to come up — this is independent of whether
  SIP signaling itself is `ws://` or `wss://` (see below); the media is
  always encrypted.
- `direct_media=no` is essential, not cosmetic: it forces every call's audio
  through Asterisk's mixing bridge (the one `apps/server/src/ari/coordinator.ts`
  creates over ARI) instead of letting the two endpoints try to exchange RTP
  directly, which would silently bypass the bridge (and, later, recording).

### A CMD gotcha worth knowing about

`engine/Dockerfile` sets `ENTRYPOINT` to our own rendering script. Docker's
documented (but easy to miss) behavior is that **a derived image's `ENTRYPOINT`
resets any `CMD` inherited from the base image to empty**, even though we
never touch `CMD` ourselves. Without restating the base image's exact `CMD`
(`asterisk -vvvdddf -T -W -U asterisk -p`) in `engine/Dockerfile` too, a plain
`docker run switchboard-engine` (or `docker compose up`, since Compose does
not set a `command:` for this service) would invoke our entrypoint script
with zero arguments, which execs nothing and exits `0` instantly with no log
output at all — which is exactly what happened the first time this image was
tested while building this feature, and is why `engine/Dockerfile` explicitly
restates `CMD` right after `ENTRYPOINT`.

### Two ports, sort of

Only two ports matter for the engine:

- **`8088`** — Asterisk's HTTP server. ARI (used only by `switchboard-api`,
  over the internal Docker network) and the browser softphone's SIP-signaling
  WS both ride on it, because Asterisk multiplexes both onto the one HTTP
  server. This means `8088` has to be published to the host even though ARI
  itself is only meant for the control plane — there is no way to split them
  onto separate ports without a second `http.conf` listener.
- **`10000-10099/udp`** — the RTP media range.

Neither `switchboard-web` nor its nginx proxy is in this picture: the browser
softphone connects to the engine's WS endpoint **directly** (see
[architecture.md](architecture.md)'s container diagram — "secure WebSocket
(SIP + audio)" goes straight from the browser to `switchboard-engine`).
`switchboard-web`'s proxy only forwards the REST API and the *application*
event stream (`/api/v1/events`), which is a completely different WebSocket
from the engine's SIP signaling one.

### Plain `ws://` on localhost

`http.conf` enables plain `ws://`, not `wss://`. This is a deliberate,
localhost-only trade-off: every browser treats `http(s)://localhost` (and
`127.0.0.1`) as a secure context, so `getUserMedia`/WebRTC work over it
without TLS on the signaling channel, and DTLS-SRTP (configured per endpoint,
independent of the signaling transport) still encrypts the audio itself. Do
not carry this past localhost.

To enable `wss://` for anything reached over a real network: mount a
certificate and key into the engine container, uncomment the `tlsenable` /
`tlsbindaddr` / `tlscertfile` / `tlsprivatekey` lines in
`engine/config/http.conf`, add a matching `[transport-wss]` block to
`pjsip.conf.template` (protocol `wss`, same `bind`), and point the softphone's
SIP.js configuration at `wss://` instead of `ws://`.

## `switchboard-api`

`apps/server/Dockerfile` is a five-stage build:

1. **`base`** — `node:22.23.1-bookworm-slim`, with `corepack` activating the
   exact `pnpm` version pinned in the root `package.json`'s `packageManager`
   field, plus a C++ toolchain (`python3 make g++`). The toolchain exists for
   `better-sqlite3`: it ships prebuilt native bindings for common platforms,
   but when none matches this exact base image, pnpm falls back to compiling
   it here. Root `package.json`'s `pnpm.onlyBuiltDependencies` is what allows
   `better-sqlite3` (and `esbuild`) to run their install scripts at all,
   under pnpm's default "no lifecycle scripts" security posture.
2. **`deps`** — copies only the workspace manifests (`package.json`,
   `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and every package's own
   `package.json`) and runs `pnpm install --frozen-lockfile --filter
   "@switchboard/server..."`. Manifests-first keeps this (slow) layer cached
   across changes that only touch source.
3. **`build`** — copies the full source and runs
   `pnpm --filter @switchboard/shared build` then
   `pnpm --filter @switchboard/server build` (tsup). tsup bundles
   `@switchboard/shared` straight into `dist/server.js`
   (`apps/server/tsup.config.ts`'s `noExternal`); every other dependency
   (Fastify, ts-rest, Zod, Kysely, `better-sqlite3`, `ari-client`, ...) stays
   external by tsup's default and must exist as real `node_modules` at
   runtime.
4. **`prod-deploy`** — runs `pnpm --filter @switchboard/server deploy --prod
   --legacy /prod/server`. `pnpm deploy` is what makes a monorepo's
   production dependencies portable: it produces a self-contained directory
   with the package's files (including the `dist/` already built in the
   previous stage) plus a **flattened** `node_modules` where workspace
   dependencies are copied in as real files rather than pnpm's usual
   symlinks-into-a-content-store layout — which would otherwise contain
   relative symlinks pointing back into `/workspace/packages/shared`, a path
   that does not exist in the final image. `--legacy` is required because
   this workspace does not set `inject-workspace-packages` (the setting
   `pnpm deploy` normally requires); `--prod` skips `devDependencies`. This
   stage runs from `build`, not a fresh install, so it reuses the same pnpm
   store — including any `better-sqlite3` binary already resolved for this
   base image — instead of reinstalling from scratch.
5. **`runtime`** — a fresh `node:22.23.1-bookworm-slim`, nothing carried over
   from the earlier stages except `/prod/server` (so no compiler toolchain
   ends up in the final image). Creates a non-root `switchboard` user (uid
   1001) and runs as it; a `HEALTHCHECK` hits `GET /api/v1/health` using
   Node's built-in `fetch` (no `curl`/`wget` needed in a slim image).

Verified by actually building and running the image during this feature's
implementation: `pnpm install` (stage 2) resolved `better-sqlite3`'s native
binding in about a second (a prebuilt binary matched this base — the
toolchain from stage 1 is a fallback, not the common path), the full build
completed in under 70 seconds cold, and the running container answered
`GET /api/v1/health` with `{"status":"ok","engine":"connecting", ...}` and
reported `healthy` via `docker inspect`.

## `switchboard-web`

`apps/web/Dockerfile` is three stages (`base` → `deps` → `build`, then a
separate `runtime`): the same manifests-first, `--filter
"@switchboard/web..."` pattern as the API image, then
`pnpm --filter @switchboard/shared build && pnpm --filter @switchboard/web
build` (Vite), then a fresh `nginx:1.28.3-alpine` stage that only copies in
`apps/web/nginx.conf` and the built `apps/web/dist` — no Node at all in the
runtime stage, since the SPA is static output.

`apps/web/nginx.conf` is what keeps the browser single-origin
([architecture.md](architecture.md)): it reverse-proxies `/api` (REST, the
generated OpenAPI document, and Swagger UI) and `/api/v1/events` (the
call-event stream, feature 8) to `switchboard-api`, with `/api/v1/events`
matched by its own `location` block ahead of the generic `/api` one so its
`Upgrade`/`Connection` headers are set — a plain `proxy_pass` without them
fails the WebSocket handshake with a 400. Everything else falls through to
`index.html` for TanStack Router's client-side routes. A `HEALTHCHECK` uses
`wget --spider` (BusyBox `wget` ships in `nginx:alpine`) against a cheap
`/healthz` location that does not depend on the SPA or the API being up.

Also verified by building and running it: the built image served `/`,
`/healthz`, and an arbitrary client route (`/trunks`, via the SPA fallback)
with `200`, and `/api/v1/health` proxied through to a running
`switchboard-api` container and returned its JSON body unchanged.

## `docker-compose.yml`

Three services (`switchboard-engine`, `switchboard-api`, `switchboard-web`)
on one bridge network (`switchboard`), plus two named volumes
(`switchboard-db-data` for the SQLite file, `switchboard-recordings` — shared
between the engine, which will write to it via `MixMonitor`, and the API,
which will serve playback/download — ahead of call recording,
implementation.md feature 24).

Every service sets both `image:` and `build:`. Compose's documented behavior
for that combination, with no `pull_policy` set, is "pull the image first,
build from source only if the image isn't found in the registry or platform
cache" (see the [Compose Build
specification](https://github.com/compose-spec/compose-spec/blob/master/build.md)).
Nothing is published under these image names yet — packaging and naming is
still an open decision (implementation.md's decisions log) — so today every
`docker compose up` or `docker compose build` builds locally. Once images are
published, `docker compose pull && docker compose up` will use them without a
local build.

`docker compose config` (validated during this feature's implementation, both
merged with the dev override and as the base file alone) parses and resolves
cleanly with no warnings.

### Linux vs. macOS/Windows

This is the split from [architecture.md](architecture.md)'s media model, and
it lives entirely at the Compose layer — the engine's static config
(`pjsip.conf.template`, `rtp.conf.template`) is identical on every platform:

- **macOS/Windows (the default in `docker-compose.yml`)**: Docker Desktop
  cannot use host networking cleanly, so the engine publishes its ports
  (`8088/tcp`, `10000-10099/udp`) and advertises
  `SWITCHBOARD_ADVERTISED_ADDRESS=127.0.0.1` for RTP/SIP
  (`external_media_address`/`external_signaling_address` in
  `pjsip.conf.template`). This is correct because the far end is always the
  browser on the same machine — the whole point of the sandbox.
- **Linux**: bind-mount or, more simply, run the engine with
  `network_mode: host` so it shares the host's network namespace directly,
  which sidesteps Docker's NAT entirely. This repository does not ship a
  separate Linux override file; add one (or a
  `docker-compose.linux.yml` layered with `-f`) setting
  `network_mode: host` on `switchboard-engine` and dropping its `ports:`
  block (Compose ignores `ports:` under `network_mode: host` since there is
  no port-mapping concept in host mode) when deploying to Linux. The same
  `127.0.0.1` advertised address is still correct in host mode, since the
  container's loopback now is the host's.

**Keep the RTP range and the advertised address identical** across
`docker-compose.yml`'s environment, the published `ports:` block, and what
`pjsip.conf.template`/`rtp.conf.template` render to. They are driven from the
same two variables (`SWITCHBOARD_RTP_START`/`SWITCHBOARD_RTP_END`) and the
same `SWITCHBOARD_ADVERTISED_ADDRESS` for exactly this reason — one value to
change, not three. If they drift, the symptom is a call that connects with
audio one-way or silent, not a connection failure (see
[running-with-docker.md](../user/running-with-docker.md)'s troubleshooting
section).

### `docker-compose.override.yml`

Compose auto-merges `docker-compose.override.yml` with `docker-compose.yml`
whenever both sit in the same directory and `docker compose up` runs with no
`-f` flags — this is Compose's own file-discovery convention, not something
configured in either file. The override swaps `switchboard-api` and
`switchboard-web` for source-mounted, hot-reloading dev processes (`pnpm dev`
under `tsx watch` / Vite's dev server), stopping their builds at the `deps`
stage (full workspace install, nothing built yet) instead of running through
to the production stages; `switchboard-engine` is untouched. Anonymous
volumes are layered over every `node_modules` path in the bind mount — the
standard Compose idiom for bind-mounting a Node project's source while
keeping its `node_modules` container-native, which matters here specifically
because `better-sqlite3`'s native binding built for the host (e.g. a macOS
laptop) would crash if the bind mount were allowed to shadow the
container's own Linux-built `node_modules`.

Practical effect: from a full source checkout, plain `docker compose up`
gives you the hot-reload dev experience. To run the built images from a full
checkout instead, use `docker compose -f docker-compose.yml up`. Someone who
only has `docker-compose.yml` on its own (no override present — the
situation described in
[running-with-docker.md](../user/running-with-docker.md)) always gets the
built-image behavior, since there is nothing for Compose to auto-merge.

## What was verified while building this feature

All three images were actually built and run (not just reviewed) while this
feature was implemented:

- **`switchboard-api`**: built in about 70 seconds cold; the running
  container answered `GET /api/v1/health` with `{"status":"ok", ...}` and
  reported `healthy` via `docker inspect`, including the ARI reconnect-with-
  backoff logic logging (and continuing to retry, not crashing) against a
  not-yet-running engine.
- **`switchboard-web`**: built in about 12 seconds; the running container
  served `/`, `/healthz`, and an arbitrary client route (`/trunks`, via the
  SPA fallback) with `200`, and correctly proxied `/api/v1/health` through
  to a separately running `switchboard-api` container.
- **`switchboard-engine`**: contrary to the initial assumption that building
  it would be too slow to use as a check — `andrius/asterisk` publishes an
  already-compiled production image, so `FROM`-ing it does not recompile
  Asterisk; only our own small `COPY`/`RUN chmod` layers build, in about 10
  seconds. It was built, run, and exercised directly: `GET
  /ari/asterisk/info` and `GET /ari/endpoints` (authenticated with the
  rendered `switchboard`/`switchboard` credentials) succeeded and listed
  both `PJSIP/1001` and `PJSIP/1002`; a raw WebSocket upgrade request
  against `/ws` returned `101 Switching Protocols`; `dialplan show
  switchboard-webrtc` showed the `_10XX` → `Stasis(switchboard)` route
  loaded exactly as written; `module show like res_ari` / `res_http_websocket`
  / `websocket` showed every needed module `Running`; and the rendered
  `/etc/asterisk/ari.conf`, `rtp.conf`, and `pjsip.conf` matched the
  environment passed in. This is also how the `CMD`-reset bug described
  above ("A CMD gotcha worth knowing about") was caught and fixed.

## What was not verified here

- A real two-way audio call between two browser tabs against this engine
  config has not been exercised yet — that is implementation.md feature 9's
  own acceptance gate, run once the softphone (feature 9's web side) exists.
  Per [CLAUDE.md](../../CLAUDE.md) ("Networking and media"), any change to
  this config must be re-verified with a real two-way-audio call, not just
  `docker compose config` passing.
