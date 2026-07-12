# Switchboard implementation plan (feature by feature)

This document is the build specification for Switchboard, organized as a sequence
of self-contained features rather than time-based milestones, so that an AI agent
(or a person) can pick up any feature, read everything needed to build it in one
place, and verify it independently. It starts from an empty repository and ends
at a shippable tool.

It is the "how to build it" companion to the other documents. Read them for
context: [the project README](../../README.md) (what it is),
[architecture.md](architecture.md)
(how the system fits together), [data-model.md](data-model.md) (the storage
schema), [dashboard.md](dashboard.md) (the dashboard screens and behavior),
[ux.md](ux.md) (the visual system, shell, routing, and flows), and
[roadmap.md](roadmap.md) (the milestone view, which this document maps back to in
an appendix).

Acronyms, expanded on first use: SIP is the Session Initiation Protocol (call
signaling). RTP is the Real-time Transport Protocol (the audio stream). ARI is
the Asterisk REST Interface. ARA is the Asterisk Realtime Architecture (Asterisk
reading configuration from a database at runtime). PJSIP is the SIP stack inside
Asterisk. WebRTC is Web Real-Time Communication (browser audio). WS is WebSocket.
WSS is WebSocket Secure. REST is Representational State Transfer. CRUD is create,
read, update, delete. DTMF is Dual-Tone Multi-Frequency (keypad tones). E.164 is
the international phone-number format, for example `+14155550123`. NAT is Network
Address Translation. CI is continuous integration. DID is a Direct Inward Dialing
number.

## How to read a feature

Every feature below uses the same template so it can be built in isolation:

- **Goal**: one sentence describing the observable outcome.
- **Depends on**: features that must exist first.
- **Data model**: tables and columns touched (see [data-model.md](data-model.md)).
- **Shared contract**: types, Zod schemas, ts-rest endpoints, and event shapes
  added to `packages/shared`.
- **Server**: modules, logic, and ARI interactions in `apps/server`.
- **Engine**: any Asterisk configuration or ARI behavior in `engine/`.
- **Web**: routes, components, hooks, and state in `apps/web`.
- **Files**: the concrete files to create or modify.
- **Tests**: the unit and integration tests that prove it and keep coverage at
  100% (see Global conventions).
- **Docs**: the documentation written in the same change, developer-facing under
  `documentation/dev/` and, for any user-facing capability, a first-class,
  example-driven guide under `documentation/user/`.
- **Acceptance**: the check that means "done," which includes tests and docs.

Subsections that do not apply to a feature are omitted. Build features in the
numbered order; the numbering is the dependency order.

## Global conventions

These apply to every feature and are not repeated in each one.

- **Language and runtime**: pure TypeScript in strict mode on Node.js LTS. No
  JavaScript source. Config files are TypeScript where the tool allows
  (`eslint.config.ts`, `vite.config.ts`, `vitest.config.ts`).
- **One source of truth for the wire**: all entity types, Zod schemas, and the
  ts-rest contract live in `packages/shared`. The server and web import them;
  neither redefines an entity or endpoint shape.
- **Validation at the boundary**: every REST request body and response, every ARI
  event, and all parsed configuration is validated with Zod at the edge. Nothing
  past that line is trusted.
- **Server shape**: vertical-slice modules. `*.routes.ts` handles HTTP and
  validation, `*.service.ts` holds logic, `*.repo.ts` is the only code that
  queries the database.
- **API versioning**: every REST route is mounted under `/api/v1`. Additive
  changes stay in `v1`; a breaking change mints `/api/v2`.
- **Self-documenting API**: the API serves an OpenAPI 3 document at
  `/api/v1/openapi.json` and interactive Swagger UI at `/api/docs`, both generated
  from the ts-rest contract so they never drift. Endpoint summaries, descriptions,
  and examples are written in the contract as endpoints are added.
- **Identifiers**: entity `id` values are short unique strings generated with
  `nanoid`. Timestamps are ISO 8601 strings stored as text.
- **Errors**: a single Fastify error handler returns a consistent JSON shape
  `{ error: { code, message, details? } }`. The contract declares error responses
  per endpoint.
- **Logging**: the server uses Fastify's built-in `pino` logger. The server and
  CLI log intentionally; `no-console` is off there.
- **Direction vocabulary**: the data model uses inbound and outbound from the
  system-under-test's point of view. The dashboard shows "Place a call,"
  "Incoming call," and "Placed" or "Received." Honor the mapping in
  [dashboard.md](dashboard.md); never surface inbound or outbound to the user for
  a live call or in the call log.
- **Testing**: Vitest with the v8 coverage provider, thresholds at 100% for
  statements, branches, functions, and lines across `apps/server`,
  `packages/shared`, `packages/cli`, and the logic in `apps/web`. Server tests use
  `fastify.inject` for HTTP and a temporary SQLite file for the database. Web
  tests use the React Testing Library. The engine and media paths are proven by
  integration tests against a running engine, not by a coverage number. An
  untestable seam is isolated and marked with a one-line `istanbul ignore` reason
  rather than lowering the global threshold.
- **Documentation**: every feature is documented in the same change that builds
  it. Developer-facing behavior goes in `documentation/dev/`; any user-facing
  capability gets a first-class, example-driven guide in `documentation/user/`.
  Docs are part of the definition of done, not a follow-up.
- **Packaging**: Switchboard ships as three Docker images, `switchboard-engine`
  (Asterisk), `switchboard-api` (the Node control plane), and `switchboard-web`
  (the static React dashboard served by nginx, which reverse-proxies `/api` and
  the event WebSocket to `switchboard-api` so the browser stays single-origin).
  All three have a Dockerfile from the start. The canonical way to run the
  project, in development and for users, is `docker compose up` with the root
  `docker-compose.yml`, and it must keep working at every feature.

## Technology stack

| Area             | Choice                                   | Note                                                                      |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Runtime          | Node.js (LTS)                            | Battle-tested native modules and ARI libraries; runs TypeScript directly. |
| Package manager  | pnpm (workspace)                         | Fast, disk-efficient, first-class monorepo support.                       |
| Language         | TypeScript, strict mode                  | Pure TypeScript, no JavaScript source, across every package.              |
| Server framework | Fastify                                  | Fast, plugin-based, built-in WebSocket support.                           |
| API contract     | ts-rest, in `packages/shared`            | One typed REST contract types the Fastify routes and the client.          |
| API docs         | OpenAPI (@ts-rest/open-api) + Swagger UI | Generated from the contract; interactive docs served at `/api/docs`.      |
| Validation       | Zod, in `packages/shared`                | Backs the ts-rest contract and validates all boundary input.              |
| Database         | `better-sqlite3` + Kysely                | Type-safe SQL query builder; hand-written TypeScript migrations at boot.  |
| Frontend build   | Vite + React + TypeScript                | Fast dev server, matches the workspace language.                          |
| Routing          | TanStack Router                          | Type-safe routes and validated search params; pairs with TanStack Query.  |
| Server state     | TanStack Query                           | Caching, mutations, and refetch for all REST data.                        |
| Session state    | Zustand                                  | One small store for the SIP.js call session and registration.             |
| UI               | Tailwind + Radix (via shadcn/ui)         | Headless, accessible primitives styled in Tailwind.                       |
| Softphone        | SIP.js                                   | Browser SIP over WSS with WebRTC audio.                                   |
| Engine           | Asterisk (PJSIP, ARI, WebRTC)            | Single container, controlled at runtime. See Decision D1.                 |
| ARI client       | `ari-client` (Node)                      | WebSocket event stream plus REST control of channels and bridges.         |
| Tests            | Vitest                                   | Unit and integration tests across all packages.                           |
| Lint / format    | ESLint (`eslint.config.ts`) + Prettier   | Enforced in CI and pre-commit.                                            |

## Build order at a glance

Part A, Foundations: 1 workspace, 2 shared contract, 3 database, 4 server
skeleton, 5 web skeleton, 6 containers and Docker Compose, 7 ARI connection, 8
event bus and WS stream.

Part B, Media core: 9 two-way-audio walking skeleton.

Part C, Configuration entities: 10 trunks CRUD, 11 trunk provisioning, 12 trunks
UI, 13 environment provisioning, 14 numbers, 15 routes.

Part D, Calls: 16 receive a call, 17 make a call, 18 dialler, 19 incoming-call
notification, 20 in-call interface and call bar.

Part E, Observability: 21 call persistence, 22 call log, 23 call detail and SIP
trace, 24 recording, 25 settings.

Part F, Fault injection: 26 fault profiles, 27 fault application.

Part G, Automation: 28 public REST API, 29 CLI, 30 auto-answer bot, 31 webhooks.

Part H, Release: 32 quickstart and recipes, 33 cross-platform media verification.

---

## Part A: Foundations

### 1. Monorepo workspace

**Goal**: a pnpm workspace that installs, type-checks, lints, formats, and tests
cleanly with empty packages in place.

**Files**:

- `pnpm-workspace.yaml`: `packages: ["apps/*", "packages/*"]`.
- `package.json` (root, private): workspace scripts only, no runtime dependencies.
  Scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:cov`. Dev
  dependencies: `typescript`, `eslint`, `jiti`, `typescript-eslint`,
  `eslint-config-prettier`, `eslint-plugin-react`, `eslint-plugin-react-hooks`,
  `prettier`, `vitest`, `@vitest/coverage-v8`.
- `tsconfig.base.json`: already present; each package extends it.
- `eslint.config.ts`, `.prettierrc`, `.editorconfig`: already present.
- `apps/server/package.json`, `apps/web/package.json`,
  `packages/shared/package.json`, `packages/cli/package.json`: each with `name`
  (`@switchboard/server`, `@switchboard/web`, `@switchboard/shared`,
  `@switchboard/cli`), `type: module`, and a `tsconfig.json` extending the base.
- Each package: a `src/` directory and a `vitest.config.ts`.
- Root `vitest.config.ts` (or a workspace file) that runs all package suites and
  aggregates coverage with the 100% thresholds.

**Details**:

- Cross-package imports use the package name and the workspace protocol
  (`"@switchboard/shared": "workspace:*"`), never deep relative paths across
  package boundaries.
- Path aliases inside a package (for example `@/`) are configured in that
  package's `tsconfig.json` and mirrored in its Vite or Vitest config.

**Tests**: a trivial smoke test in each package (for example the shared package
exports a version constant) so the coverage harness has something to run and CI is
green from the first commit.

**Acceptance**: `pnpm install`, `pnpm typecheck`, `pnpm lint`, and `pnpm test`
all pass at the root.

### 2. Shared contract package

**Goal**: `packages/shared` exports the domain schemas, inferred types, the
event shapes, and the ts-rest contract skeleton that the server and web build
against.

**Shared contract**:

- `src/schemas/` one file per entity (`trunk.ts`, `number.ts`, `route.ts`,
  `call.ts`, `fault-profile.ts`, `settings.ts`), each exporting the Zod schema and
  the inferred type, matching [data-model.md](data-model.md). Split each entity
  into `Base`, `Create` (input), and full (`with id and timestamps`) schemas.
- `src/events.ts`: a discriminated union of call lifecycle events
  (`call.created`, `call.ringing`, `call.answered`, `call.ended`,
  `call.state_changed`), each with its payload schema. This is what the WS stream
  and webhooks emit.
- `src/contract.ts`: the ts-rest contract. Group by resource
  (`trunksContract`, `numbersContract`, `routesContract`, `callsContract`,
  `faultsContract`, `settingsContract`) and compose into a root contract. Every
  endpoint declares method, path (under `/api/v1`), path params, query schema,
  body schema, and response schemas including the shared error shape.
- Each endpoint also carries OpenAPI metadata: a `summary`, a `description`, and
  example request and response values. This metadata is what makes the generated
  OpenAPI document and Swagger UI (feature 4) readable, so it is written alongside
  every endpoint, not later. Zod schemas use `.describe()` on fields so parameters
  and models are self-documenting.
- `src/index.ts`: re-export everything.

**Details**: an example endpoint shape, for reference:

```text
trunksContract = c.router({
  list:   { method: 'GET',    path: '/trunks', responses: { 200: z.array(TrunkSchema) } },
  create: { method: 'POST',   path: '/trunks', body: TrunkCreateSchema,
            responses: { 201: TrunkSchema, 400: ErrorSchema } },
  get:    { method: 'GET',    path: '/trunks/:id',
            responses: { 200: TrunkSchema, 404: ErrorSchema } },
  update: { method: 'PATCH',  path: '/trunks/:id', body: TrunkUpdateSchema,
            responses: { 200: TrunkSchema, 404: ErrorSchema } },
  remove: { method: 'DELETE', path: '/trunks/:id', responses: { 204: c.noBody() } },
})
```

**Tests**: schema tests for each entity (valid input parses, invalid input is
rejected with the expected issue), and a test that every contract path begins with
`/api/v1`.

**Acceptance**: importing `@switchboard/shared` gives typed schemas, events, and
the contract; the package type-checks and its tests pass at 100% coverage.

### 3. Database layer

**Goal**: a typed SQLite layer that creates and migrates the schema at boot and
exposes a Kysely instance to repositories.

**Data model**: creates `trunks`, `numbers`, `routes`, `calls`, and `settings`
per [data-model.md](data-model.md). `fault_profiles` is added by its own feature.
If Decision D1 resolves to PJSIP Realtime, the Asterisk realtime tables
(`ps_endpoints`, `ps_auths`, `ps_aors`, and related) are created here too, in the
same database file (Decision D2).

**Server**:

- `db/index.ts`: opens the `better-sqlite3` connection (path from config), sets
  pragmatic pragmas (`journal_mode = WAL`, `foreign_keys = ON`), and constructs
  the Kysely instance with the SQLite dialect.
- `db/schema.ts`: the Kysely `Database` interface, one table interface per table,
  aligned with the Zod schemas but expressed as database column types.
- `db/migrate.ts`: runs ordered migrations in `db/migrations/` inside a
  transaction, tracking applied migrations in a `migrations` table. Called once at
  server boot before listening.
- `db/migrations/0001_init.ts`: the initial schema.

**Details**: JSON columns (`allowed_ips`, `dial_rewrite`, `codecs`) are stored as
text; repositories parse and serialize them with the shared Zod schemas so the
boundary stays typed. Booleans are stored as integers 0 or 1 and mapped at the
repository edge.

**Tests**: a migration test that a fresh temporary database ends with the
expected tables and columns; a re-run test that migrating twice is a no-op; a
round-trip test for the JSON and boolean column mapping.

**Acceptance**: booting against a fresh file creates the schema; a repository can
read and write a row through Kysely with full type-checking.

### 4. Server skeleton

**Goal**: a Fastify application that boots, migrates the database, mounts an empty
`/api/v1`, serves health, and shuts down cleanly.

**Server**:

- `config.ts`: parse `process.env` with a Zod schema into a typed config
  (HTTP host and port bound to `127.0.0.1`, database path, ARI connection settings,
  recordings directory, record-all flag, the raw SIP-servers JSON). Fail fast with
  a clear message on invalid config.
- `app.ts`: build the Fastify instance, register plugins (error handler, request
  logging, and CORS, which is a no-op in the default setup because
  `switchboard-web` reverse-proxies to the API so the browser stays single-origin,
  but is configurable for the direct-origin alternative), register the ts-rest
  server
  router for the (initially empty) contract under `/api/v1`, and a
  `GET /api/v1/health` returning engine-connection status.
- `server.ts`: load config, run migrations, build the app, listen, and wire signal
  handlers for graceful shutdown (close ARI, close the database, close Fastify).
- `plugins/errors.ts`: the single error handler producing the shared error shape.
- `plugins/openapi.ts`: generate an OpenAPI 3 document from the ts-rest contract
  with `@ts-rest/open-api` (title, version, servers, and the endpoint metadata
  from feature 2), serve it at `GET /api/v1/openapi.json`, and mount an interactive
  Swagger UI at `GET /api/docs`. Because the document is generated from the single
  contract, it is always in sync and grows automatically as endpoint features land,
  with no separate maintenance. Users reach it through the `switchboard-web` proxy
  as well as directly on the API.

**Details**: the OpenAPI document and Swagger UI are live from this feature with
just the health endpoint, and every later resource feature (trunks, numbers,
routes, calls, faults, settings) appears in them automatically once its contract
is added. Feature 28 hardens completeness and examples for public release.

**Tests**: `fastify.inject` tests for health (200 with the expected body), an
unknown route (404 in the error shape), a validation failure (400 in the error
shape), that `GET /api/v1/openapi.json` returns a valid OpenAPI 3 document whose
paths match the contract, and that `GET /api/docs` serves the Swagger UI. A config
test that invalid environment values are rejected.

**Docs**: a user-guide note that the API is self-documenting, with the interactive
Swagger UI at `/api/docs` and the raw spec at `/api/v1/openapi.json`.

**Acceptance**: `pnpm --filter @switchboard/server dev` boots, migrates, answers
`GET /api/v1/health`, serves the OpenAPI document, and renders Swagger UI at
`/api/docs`.

### 5. Web skeleton

**Goal**: a Vite React application with the sidebar shell, TanStack Router file
routes, the TanStack Query client, Tailwind, and shadcn/ui, showing empty screens
for every top-level destination.

**Web**: build the structure from [ux.md](ux.md).

```text
apps/web/src/
  main.tsx                   # mount the router, the Query client, the theme provider
  routes/
    __root.tsx               # app shell: header, sidebar, contextual tab outlet, call bar, call overlay
    index.tsx                # redirect to /phone
    phone.tsx  trunks.tsx  trunks.index.tsx  trunks.new.tsx  trunks.$trunkId.tsx
    numbers.tsx  numbers.new.tsx  numbers.$numberId.tsx
    routes.tsx  calls.tsx  calls.$callId.tsx  settings.tsx  faults.tsx
  routeTree.gen.ts           # generated by the TanStack Router Vite plugin (do not edit)
  components/shell/          # header, sidebar, contextual tab strip, theme toggle
  components/ui/             # shadcn/ui primitives
  lib/api.ts                 # ts-rest client from the shared contract (added in feature 10)
  lib/query.ts               # TanStack Query client and defaults
  lib/ws.ts                  # WS subscription hook (added in feature 8/21)
  stores/                    # Zustand stores (added in feature 19/20)
  styles/                    # Tailwind entry
```

**Details**:

- Configure the TanStack Router Vite plugin so `routeTree.gen.ts` regenerates on
  change; do not hand-edit it.
- The shell renders the sidebar (collapsible to an icon rail), the header with the
  engine indicator (wired to `GET /api/v1/health`), the contextual tab strip via
  `<Outlet />`, the docked call bar (inert until feature 20), and the global call
  overlay slot (inert until feature 19).
- Theme: system preference plus a manual toggle, applied by a `data-theme`
  attribute on the root.
- The API client and the events hook use a relative base (`/api/v1` and
  `/api/v1/events`), so the same code works in production behind the
  `switchboard-web` nginx proxy and in development behind the Vite dev server's
  proxy to the API. The web is a static build with no server of its own; nginx
  serves it in the `switchboard-web` image (feature 6).

**Tests**: React Testing Library tests that the shell renders the sidebar
destinations, that clicking a destination navigates (router test), and that the
theme toggle flips the attribute. Each empty screen renders its heading and an
empty state.

**Acceptance**: `pnpm --filter @switchboard/web dev` serves the shell; every
sidebar item routes to its (empty) screen; the engine indicator reflects health.

### 6. Containers and Docker Compose

**Goal**: both Docker images build, and `docker compose up` from the repository
root runs the engine and the app together, with the media and NAT settings that
make audio flow. This is the canonical way to run Switchboard, in development and
for users, so it exists from the start rather than being added at release.

**Depends on**: 4 (server skeleton), 5 (web skeleton).

**Engine image** (`switchboard-engine`): author `engine/`.

- `engine/Dockerfile`: a pinned Asterisk base image with PJSIP, ARI, and WebSocket
  support, plus the config below.
- `http.conf`: enable the HTTP server and WSS for browser SIP over WebSocket.
- `ari.conf`: define one ARI user for the control plane (credentials from the
  environment) and enable ARI.
- `pjsip.conf`: a WebRTC transport (WSS, DTLS-SRTP, ICE), the settings for browser
  endpoints, and the `external_media_address` and `external_signaling_address` so
  the engine advertises a reachable address (see F-Media below). If Decision D1 is
  PJSIP Realtime, configure the realtime sorcery mappings so endpoints, auths, and
  address-of-records come from the database.
- `rtp.conf`: the bounded RTP port range published by the container.
- `extensions.conf` (or a Stasis-first dialplan): route incoming calls into the
  Stasis application the control plane owns.

**API image** (`switchboard-api`): a multi-stage `apps/server/Dockerfile`.

- Stage 1 installs workspace dependencies with pnpm (using a lockfile and the
  workspace, with build caching).
- Stage 2 builds `packages/shared`, then `apps/server`.
- Stage 3 is a slim runtime image (Node LTS slim) with only the built server and
  its production dependencies, running as a non-root user, starting the Fastify
  server. Pin base versions; keep the runtime stage small; add a container
  healthcheck hitting `GET /api/v1/health`.

**Web image** (`switchboard-web`): a multi-stage `apps/web/Dockerfile`.

- Stage 1 installs dependencies and builds `packages/shared` then `apps/web` into
  static assets with Vite.
- Stage 2 is a small nginx image serving those static assets, with an nginx config
  that reverse-proxies `/api` and the event WebSocket to `switchboard-api` so the
  browser stays single-origin. Include a healthcheck.

**Root files**: `docker-compose.yml` (at the repository root), `.dockerignore`.

- `docker-compose.yml`: three services, `switchboard-engine`, `switchboard-api`,
  and `switchboard-web`, on a shared network. `switchboard-api` gets the ARI
  credentials, the recordings volume, the database volume, and the SIP-servers and
  recording environment variables; `switchboard-web` gets the API service address
  for its proxy; `switchboard-engine` gets the RTP range and advertised address.
  `switchboard-web` is the browser entry point. Support both building locally and
  pulling published images (an image tag with a local build fallback).
- A `docker-compose.override.yml` pattern (or a dev target) mounts source and runs
  the Vite and server dev processes with hot reload for local development, while
  the base compose runs the built images.

**Details on media and NAT** (the project's biggest risk, referenced by later
features as F-Media): a bounded RTP port range published from the container; an
explicitly set advertised address; host networking on Linux, and published ports
plus explicit advertised address on macOS and Windows. Keep the port range and the
advertised address identical between `docker-compose.yml` and the PJSIP config.

**Files**: `engine/*` (including `engine/Dockerfile`), `apps/server/Dockerfile`,
`apps/web/Dockerfile`, the nginx config for the web image, `.dockerignore`,
`docker-compose.yml`, and CI to build (and, at release, publish) all three images.

**Tests**: a container smoke check in CI that all three images build, the engine
starts, ARI answers, the WSS endpoint accepts a connection, the API healthcheck
passes, and the web image serves the dashboard and proxies `/api` to the API.
(Behavioral; not counted in unit coverage.)

**Docs**: a "run with Docker" section in the user guide covering `docker compose
up` and the dev override, and notes in `documentation/dev/` on the three images
and their build stages.

**Acceptance**: `docker compose up` from the repository root builds or pulls all
three images and starts all three services; the API connects to ARI (feature 7);
the browser reaches the dashboard through `switchboard-web`, whose proxy forwards
API and event traffic to `switchboard-api`; the WSS media endpoint on the engine
is reachable; healthchecks are green.

### 7. ARI connection

**Goal**: the server maintains a resilient ARI connection, joins its Stasis
application, and surfaces channel and bridge events to the rest of the server.

**Server**:

- `ari/client.ts`: connect with `ari-client` using config credentials, subscribe
  to the Stasis application, reconnect with backoff on drop, and expose the
  connection state to health.
- `ari/handlers.ts`: typed handlers for the events the call features need
  (`StasisStart`, `StasisEnd`, `ChannelStateChange`, `Dial`, `ChannelHangupRequest`,
  and bridge events). Handlers validate the incoming event shape and translate it
  into internal calls on the event bus (feature 8) and the call features.
- A small typed wrapper over the ARI operations used elsewhere (answer a channel,
  create and destroy a mixing bridge, add and remove channels, originate a channel,
  start and stop recording, play media).

**Details**: all ARI event payloads are validated at the boundary before use. The
Stasis application name is a constant shared by the engine dialplan and the client.

**Tests**: unit tests with a mocked ARI client that connect and reconnect logic
behave, that a malformed event is rejected, and that each handler maps a sample
event to the expected internal action. Live ARI behavior is covered by integration
tests from feature 9 onward.

**Acceptance**: with the engine up, the server logs a successful ARI connection
and the health endpoint reports `engine ok`.

### 8. Event bus and WS stream

**Goal**: a single internal event bus publishes call lifecycle events, and the
dashboard can subscribe to them over a WebSocket.

**Shared contract**: the event union from feature 2.

**Server**:

- `events/bus.ts`: a typed publish and subscribe bus (a small typed
  `EventEmitter` wrapper) carrying the shared event types. It is the one place call
  state changes are announced.
- `events/ws.ts`: a Fastify WebSocket route at `/api/v1/events` that streams bus
  events to connected dashboard clients as validated JSON. Handles subscribe on
  connect and cleanup on disconnect.

**Web**: `lib/ws.ts`, a hook that opens the events WebSocket, parses each message
with the shared event schema, and exposes events to consumers. Later features feed
these into the TanStack Query cache and the call stores.

**Details**: the bus has two more consumers added later, the call-table writer
(feature 21) and webhooks (feature 31); it is designed for multiple independent
subscribers from the start.

**Tests**: a bus test that a published event reaches subscribers with the right
type; a WS test (with `fastify.inject` or a WS test client) that a published event
is delivered as valid JSON and that disconnect cleans up. A web test that the hook
parses and surfaces events and ignores malformed messages.

**Acceptance**: a manually published test event appears in a browser subscribed to
`/api/v1/events`.

---

## Part B: Media core

### 9. Two-way-audio walking skeleton

**Goal**: two browser tabs register to the engine and call each other with clean
two-way audio, bridged by the server through ARI. This is the acceptance gate for
everything after it: it retires the media and NAT risk (F-Media, feature 6) before
any feature work.

**Engine**: the WebRTC endpoints and transport from feature 6; the dialplan sends
calls into the Stasis application.

**Server**: on `StasisStart` for a browser-to-browser call, answer both legs,
create a mixing bridge, and add both channels so audio flows; tear the bridge down
on hangup. Uses the ARI wrapper from feature 7.

**Web**: a minimal SIP.js softphone in `features/softphone/`: register to the
engine over WSS, place a call to the other endpoint, attach local and remote media
streams to audio elements. This is the seed of the dialler and in-call features.

**Files**: `apps/server/src/ari/handlers.ts` (bridge logic),
`apps/web/src/features/softphone/*`, engine config as needed.

**Tests**: an integration test that runs the engine, registers two SIP endpoints
(a scripted client such as `sipp` or a headless SIP.js), places a call, and asserts
that RTP flows both ways for a sustained interval. Document the exact Linux, macOS,
and Windows media settings that made it work.

**Acceptance**: open two browser tabs, register both, call one from the other,
accept, and confirm two-way audio for at least 10 seconds with no one-way audio or
dropout. If audio is one-way, the advertised address or the RTP port publishing is
wrong (F-Media); fix it here before moving on.

---

## Part C: Configuration entities

### 10. Trunks CRUD

**Goal**: create, read, update, and delete trunks through the versioned REST API,
validated by the shared contract, persisted through the repository.

**Data model**: the full `trunks` table from [data-model.md](data-model.md),
including the provider-parity columns (auth modes, registration, caller identity,
codecs, DTMF mode, media encryption, limits, `source`).

**Shared contract**: `trunksContract` and the trunk schemas from feature 2,
including `TrunkCreateSchema` and `TrunkUpdateSchema` with the provider fields and
their validation (for example digest requires username and password; IP mode
requires at least one allowed address).

**Server**: `modules/trunks/` with `trunks.routes.ts` (implements the contract),
`trunks.service.ts` (validation beyond the schema, defaulting, and calling
provisioning in feature 11), and `trunks.repo.ts` (Kysely queries, JSON and
boolean mapping). Creating or updating a dialable or deliverable trunk calls the
provisioning feature so the engine reflects it.

**Web**: the ts-rest client in `lib/api.ts` (built once from the contract) and the
TanStack Query hooks in `features/trunks/` (`useTrunks`, `useTrunk`,
`useCreateTrunk`, `useUpdateTrunk`, `useDeleteTrunk`). UI is feature 12.

**Files**: `apps/server/src/modules/trunks/*`, `apps/web/src/lib/api.ts`,
`apps/web/src/features/trunks/hooks.ts`.

**Tests**: server tests for each endpoint via `fastify.inject` (create valid and
invalid, list, get present and missing, update, delete), repository round-trip and
JSON/boolean mapping tests, and service tests for the cross-field validation.

**Acceptance**: the full trunk lifecycle works over `curl` against `/api/v1/trunks`
with correct validation and error shapes.

### 11. Trunk provisioning (engine)

**Goal**: a saved trunk becomes a live Asterisk endpoint with the right transport
and authentication, and is removed when the trunk is deleted.

**Depends on**: 10, and the resolution of Decision D1.

**Server**: `ari/provisioning.ts` maps a `trunks` row to the engine.

- If D1 is PJSIP Realtime (recommended): write and remove the corresponding
  `ps_endpoints`, `ps_auths`, and `ps_aors` rows in the shared database, so
  Asterisk picks them up without a reload. The trunk service calls this on create,
  update, and delete.
- If D1 is config generation: render `pjsip.conf` fragments and issue a reload
  through ARI; guard against reload races.

Map trust models: `none` to an endpoint with no auth; `digest` to an auth object
with username and password (and `auth_username` and `realm` when set); `ip` to
identify-by-source-address; `register` to an outbound registration. Map transport,
codecs (allow list and order), DTMF mode, and media encryption to the endpoint
configuration.

**Tests**: unit tests that a given trunk row produces the expected realtime rows
or config for each auth mode and transport; an integration test that a created
trunk is reachable on the engine and a deleted one is not.

**Acceptance**: creating a trunk in the API makes the engine accept or originate
on it per its configuration; deleting removes it.

### 12. Trunks UI

**Goal**: the Trunks screen from [dashboard.md](dashboard.md) and
[ux.md](ux.md): a list, a Quick-add dialog, and the grouped Advanced form.

**Depends on**: 5, 10.

**Web**: `routes/trunks.tsx` (section layout with the contextual tabs),
`trunks.index.tsx` (the list with status and env badges),
`trunks.new.tsx` and `trunks.$trunkId.tsx` (the Advanced form with collapsible
sections, using the shared schema for inline validation), and a Quick-add dialog.
Read-back of endpoint and credentials has one-click copy. Uses the hooks from
feature 10.

**Tests**: component tests that the list renders rows and badges, that Quick-add
creates a trunk with name and address and auth none, that the Advanced form shows
per-field validation from the schema, and that copy-to-clipboard works.

**Acceptance**: a user creates a trunk both ways in the dashboard, sees it listed,
edits it, and copies its credentials.

### 13. Environment provisioning

**Goal**: trunks defined in `SWITCHBOARD_SIP_SERVERS` are created at boot, marked
`source: env`, and re-applied on restart.

**Depends on**: 4, 10, 11.

**Server**: on boot, after migrations, parse `SWITCHBOARD_SIP_SERVERS` (a JSON
array) with a Zod schema, and upsert each entry by `name` with `source` `env`,
provisioning the engine (feature 11). Env-managed trunks are re-applied every
restart, so the environment is their source of truth.

**Web**: env-managed trunks show an env badge and a "resets on restart" tooltip in
the list (feature 12); editing is allowed but the UI states it is overwritten on
restart.

**Tests**: a boot test that a sample `SWITCHBOARD_SIP_SERVERS` value yields the
expected trunks with `source: env`; a re-apply test that changing a value and
rebooting updates the trunk; a malformed-value test that a clear error is raised.

**Acceptance**: starting the stack with `SWITCHBOARD_SIP_SERVERS` set pre-creates
those trunks, visible and dialable with no clicks.

### 14. Numbers

**Goal**: manage phone numbers (DIDs) and assign each to an inbound trunk.

**Depends on**: 10.

**Data model**: the `numbers` table.

**Shared contract**: `numbersContract` and the number schemas (E.164 validation,
`trunk_id` referencing an existing trunk).

**Server**: `modules/numbers/` with routes, service (validate the trunk exists and
carries inbound), and repo.

**Web**: `routes/numbers*.tsx` with the list and create form, and the query hooks.

**Tests**: server tests for CRUD and the referential and E.164 validation; web
tests for the list and create form.

**Acceptance**: a number can be created, assigned to a trunk, listed, and deleted;
invalid E.164 and unknown trunks are rejected.

### 15. Routes

**Goal**: routing rules that map a dialed pattern to a destination, with priority,
plus the matching logic the call features use.

**Depends on**: 10, 14.

**Data model**: the `routes` table.

**Shared contract**: `routesContract` and the route schemas.

**Server**: `modules/routes/` with CRUD, plus a pure `matchRoute` function
(pattern matching with priority ordering) that the call features call. Default
behavior when no explicit route matches: an outbound call rings the softphone; an
inbound dialed number follows the `numbers` table to its trunk.

**Web**: `routes/routes.tsx`, a secondary screen with the rule list and editor.

**Tests**: extensive unit tests for `matchRoute` (exact, pattern, priority ties,
no-match fallbacks) since it is pure and central; server CRUD tests; a basic web
test for the editor.

**Acceptance**: routes can be managed, and `matchRoute` returns the correct
destination across the tested cases.

---

## Part D: Calls

### 16. Receive a call (outbound trunk)

**Goal**: an external SIP sender places a call to an outbound trunk, it is
authenticated and routed, the softphone rings, and audio bridges on accept. This is
the system-under-test's outbound direction, shown to the user as an incoming call.

**Depends on**: 9, 11, 15, and the event bus (8).

**Server**: on `StasisStart` for a call arriving on a trunk, authenticate per the
trunk's mode (enforced by the engine configuration from feature 11), match a route
(feature 15) to the softphone, publish `call.created` and `call.ringing` on the
bus, ring the softphone leg, and on accept create a bridge and join both legs,
publishing `call.answered`. On hangup, tear down and publish `call.ended` with the
cause.

**Web**: the softphone receives the incoming call (surfaced by the notification in
feature 19); accepting bridges audio.

**Tests**: an integration test that points a scripted SIP sender at an outbound
trunk with valid credentials and asserts the softphone rings and audio flows on
accept; auth tests that `none` accepts anything, `digest` rejects wrong
credentials, and `ip` rejects an unlisted source; unit tests for the
`StasisStart`-to-bus mapping.

**Acceptance**: pointing any SIP sender at an outbound trunk rings the softphone
with two-way audio on accept, and the three auth modes behave correctly.

### 17. Make a call (inbound trunk)

**Goal**: the softphone dials a number or a trunk, and Switchboard originates the
call to that system's SIP endpoint and bridges it. This is the system-under-test's
inbound direction, shown to the user as placing a call.

**Depends on**: 9, 11, 14, 15.

**Server**: on a dial request from the softphone (over the softphone's SIP session
into Stasis), look up the target: a dialed number resolves through the `numbers`
table to its inbound trunk, or a chosen trunk or ad-hoc SIP URI is used directly.
Apply the trunk's dial rewrite and technical prefix, originate a channel to
`target_host:target_port` over the trunk's transport via ARI, bridge the softphone
leg to it, and publish the lifecycle events.

**Tests**: an integration test that assigns a number to an inbound trunk pointed
at a local SIP endpoint (for example `baresip`), dials it from a headless
softphone, and asserts the endpoint receives the call with two-way audio; unit
tests for target resolution and dial rewriting.

**Acceptance**: dialing a number or trunk from the softphone delivers the call to
the target system with two-way audio.

### 18. Dialler UI

**Goal**: the Phone screen dialler from [ux.md](ux.md): a destination picker, a
keypad, and a Call action.

**Depends on**: 5, 10, 14, 17.

**Web**: `features/softphone/dialler.tsx` with the destination picker (dialable
trunks, saved numbers, ad-hoc SIP URI), the keypad, recent destinations, and the
Call button that starts a call through the softphone session. Placing a call
transitions into the in-call view (feature 20).

**Tests**: component tests that the picker lists destinations, that typing a URI
works, that pressing Call invokes the session with the resolved target, and that
the calling state shows a Cancel control.

**Acceptance**: a user places a call from the dialler and it connects.

### 19. Incoming-call notification

**Goal**: the FaceTime-style global overlay from [ux.md](ux.md): a compact corner
card with Accept and Decline, stacking multiple calls, driven by the event stream.

**Depends on**: 8, 16.

**Web**: `components/call-overlay.tsx` and `features/softphone/incoming-call.tsx`,
driven by a Zustand store (`stores/softphone.ts`) fed by the events hook
(`lib/ws.ts`) and the SIP.js session. It renders above the shell on any route,
plays a ringtone, times out on no-answer, and stacks concurrent calls. Accept moves
to the in-call view; Decline rejects with a cause.

**Tests**: component tests that an incoming-call event renders a card, that Accept
and Decline call the session, that multiple calls stack, and that the card
announces through an ARIA live region.

**Acceptance**: an incoming call raises the corner card (not full screen); Accept
connects, Decline rejects cleanly.

### 20. In-call interface and call bar

**Goal**: the real-phone in-call UI (end, mute, hold, DTMF keypad, record toggle,
volume, duration, negotiated codec) full-size on the Phone screen and as a docked
call bar on every screen.

**Depends on**: 9, 18, 19.

**Web**: `features/softphone/in-call.tsx` and `features/softphone/call-bar.tsx`,
both bound to the softphone Zustand store, which holds the imperative SIP.js
session. Mute and hold act on the session; the keypad sends DTMF; End hangs up.
Duration and codec come from the session and events. The call bar mirrors the core
controls and expands to the Phone screen on click.

**Tests**: component tests that each control invokes the session correctly, that
duration ticks, that the codec renders, and that the call bar mirrors state.

**Acceptance**: during a call, mute, hold, DTMF, and end all work, from both the
full view and the docked bar; the negotiated codec and duration are shown.

---

## Part E: Observability

### 21. Call persistence

**Goal**: every call and every state transition is written to the `calls` table
from the event bus.

**Depends on**: 8, 16, 17.

**Server**: a bus subscriber that, on each lifecycle event, inserts or updates the
`calls` row: `direction`, `from_number`, `to_number`, `trunk_id`, `state`,
`started_at`, `answered_at`, `ended_at`, `hangup_cause`, and negotiated `codec`.

**Tests**: tests that a sequence of bus events produces the expected final row and
timeline, including a failed call with a non-normal hangup cause.

**Acceptance**: after calls, the `calls` table reflects each call's full timeline.

### 22. Call log UI

**Goal**: the Call log screen: a live-updating table with filters encoded in typed
search parameters.

**Depends on**: 5, 21.

**Shared contract**: a `callsContract.list` endpoint with a query schema for the
filters (direction as placed or received, trunk, state, date range, pagination).

**Server**: the list endpoint with filtering and pagination in the repository.

**Web**: `routes/calls.tsx` with the table, filter controls, and TanStack Router
validated search params, updated live from the events hook feeding the Query cache.
Direction renders as Placed or Received.

**Tests**: server tests for each filter and pagination; web tests that filters
write to the URL, that the table renders and updates on a live event, and that
direction shows in plain language.

**Acceptance**: the call log lists calls, filters via shareable URLs, and updates
live.

### 23. Call detail and SIP trace

**Goal**: per-call detail with the state timeline, negotiated media, hangup cause,
and a SIP trace rendered as a call-ladder diagram.

**Depends on**: 22.

**Server**: capture the SIP trace per call from Asterisk (for example PJSIP
logging), parse it, associate it with the call, and expose it on a
`callsContract.get` detail endpoint. Also expose the call-event WS stream as a
documented public interface (it already exists from feature 8; document it here).

**Web**: `routes/calls.$callId.tsx` with the timeline, media, cause, and the
ladder diagram.

**Tests**: a parser test over recorded SIP trace samples that produces the
expected ladder; a detail endpoint test; a web test that the ladder renders.

**Acceptance**: from the dashboard alone, a developer reads a call's timeline,
media, cause, and SIP ladder without a separate packet capture.

### 24. Call recording

**Goal**: record bridged audio to disk, store the path on the call, and offer
playback and download in the call log, controlled globally, per trunk, and per
call.

**Depends on**: 7, 16, 17, 21.

**Data model**: the existing `calls.recording` column and the `settings` table for
the persisted record-all toggle.

**Server**: start Asterisk `MixMonitor` over ARI when recording is enabled for a
call, writing to `SWITCHBOARD_RECORDINGS_DIR` (a mounted volume), and store the
path on the call. Resolve the record decision most-specific-first: the per-call
toggle (feature 20), then the per-trunk default, then the global setting or
`SWITCHBOARD_RECORD_ALL`. Add a `settings` module and a download endpoint that
streams the file.

**Web**: an inline audio player and a Download button on rows and in call detail;
the per-call Record toggle in the in-call interface.

**Tests**: server tests for the three-level record decision and the download
endpoint; an integration test that a recorded call produces a playable file whose
path is stored; a web test for the player and download control.

**Acceptance**: with recording enabled, a finished call shows a downloadable
recording that plays back correctly.

### 25. Settings

**Goal**: the Settings screen with its contextual tabs: recording, engine status,
environment-managed items, and a credentials overview.

**Depends on**: 4, 5, 13, 24.

**Shared contract**: `settingsContract` for reading and writing the global
settings.

**Server**: the settings endpoints backed by the `settings` table, seeded and
overridden by environment values on boot.

**Web**: `routes/settings.tsx` with the four contextual tabs from
[dashboard.md](dashboard.md).

**Tests**: server tests for reading and writing settings and env precedence; web
tests for each tab rendering and the record-all toggle persisting.

**Acceptance**: the Settings screen shows and edits recording options, engine
status, env-managed items (read-only), and a copyable credentials overview.

---

## Part F: Fault injection

### 26. Fault profiles

**Goal**: named, reusable bundles of fault settings that can be attached to a trunk
or a route.

**Depends on**: 10, 15.

**Data model**: the `fault_profiles` table from [data-model.md](data-model.md),
added by a migration here.

**Shared contract**: `faultsContract` and the fault-profile schemas.

**Server**: `modules/faults/` with CRUD and the attachment of a profile to a trunk
or a route.

**Web**: `routes/faults*.tsx` with the profile list and editor.

**Tests**: server CRUD and attachment tests; web tests for the editor.

**Acceptance**: fault profiles can be created and attached to a trunk or route.

### 27. Fault application

**Goal**: when a call matches a trunk or route with a fault profile, the fault is
applied.

**Depends on**: 16, 17, 26.

**Server**: in the call path, apply the attached profile:

- Transport strictness: for example TCP-only, dropping other transports silently so
  the caller sees a setup timeout near 32 seconds.
- Rejection code and timing: return a SIP code such as `486` (busy), optionally
  after `reject_after_ms` to model asynchronous rejection.
- Answer delay (`answer_delay_ms`) and no-answer timeout.
- Audio faults: one-way and silent audio (`audio_mode`).
- Forced codec (`force_codec`), overriding negotiation.
- Calls-per-second cap (`max_cps` on the trunk), throttling setup.

**Tests**: unit tests for the decision logic of each fault; integration tests for
a delayed `486`, a forced codec, and a CPS cap throttling a burst.

**Acceptance**: attaching a profile that rejects with `486` after 5 seconds yields
a delayed busy; a forced codec is honored; a CPS cap of 1 throttles a burst.

---

## Part G: Automation

### 28. Public REST API

**Goal**: the REST API covers everything the dashboard does and is polished for
external consumers, with a complete, example-rich OpenAPI document and Swagger UI.

**Depends on**: 4 (the OpenAPI and Swagger UI serving), 10, 14, 15, 24, 26.

**Server**: confirm every dashboard action has a contract endpoint (the dashboard
already consumes them) and add a place-a-call endpoint for headless origination.
The OpenAPI document and Swagger UI already exist and auto-update from feature 4;
this feature audits them for public release: every endpoint has a clear summary,
description, and realistic request and response examples; error responses are
documented; and the `switchboard-web` proxy exposes `/api/docs` and
`/api/v1/openapi.json` so users can explore and try the API from the dashboard
origin.

**Docs**: a first-class REST API guide in `documentation/user/` that links the
interactive Swagger UI, shows how to download the OpenAPI spec (for generating
client code), and gives copy-paste `curl` examples for the common flows (create a
trunk, create a number, place a call).

**Tests**: a contract-coverage test that every resource has the expected
operations; a test that the generated OpenAPI document validates against the
OpenAPI 3 schema and that every endpoint carries a summary and at least one
example; an endpoint test for headless place-a-call.

**Acceptance**: an external client can drive trunks, numbers, routes, fault
profiles, and calls entirely over `/api/v1`, and can explore and try every
endpoint from Swagger UI at `/api/docs` with working examples.

### 29. CLI

**Goal**: `packages/cli`, a command-line interface over the REST API to manage
entities and place calls headlessly.

**Depends on**: 28.

**Files**: `packages/cli/src/*` with a command framework, subcommands for trunks,
numbers, routes, faults, and calls, and a typed client built from the shared
contract (reusing `lib/api` patterns). Configurable server URL.

**Tests**: command tests against a mocked or in-process server for each subcommand,
including error handling and exit codes.

**Acceptance**: the CLI creates a trunk and a number and places a call without the
dashboard.

### 30. Auto-answer bot

**Goal**: a scripted far-end that answers automatically and can play audio, so CI
tests need no human.

**Depends on**: 7, 16.

**Server**: an ARI application leg the server can attach in place of the softphone,
which answers incoming calls and optionally plays an audio file. Selectable per
route or per call for tests.

**Tests**: an integration test that a call routed to the bot is answered and audio
plays.

**Acceptance**: a call can be answered by the bot with no browser and no human.

### 31. Webhooks

**Goal**: outbound HTTP callbacks on call events, configurable per trunk or
globally.

**Depends on**: 8, 21.

**Server**: a third subscriber on the event bus that posts validated event
payloads to configured webhook URLs, with retry and signing options. Configuration
stored in settings or per trunk.

**Tests**: tests that events produce the expected posts, that retries happen on
failure, and that payloads validate against the shared event schema.

**Acceptance**: a call produces the expected webhook posts with valid payloads.

---

## Part H: Release

### 32. Quickstart and recipes

**Goal**: a one-command start from a clean checkout and copy-paste recipes for
common SIP and voice-agent stacks.

**Depends on**: all core features.

**Files**: verify `docker compose up` from a clean checkout reaches a working
softphone; write user documentation and per-stack recipes (how to point a given
stack's trunk at Switchboard).

**Acceptance**: a new user follows the quickstart and completes a call within a few
minutes.

### 33. Cross-platform media verification

**Goal**: the media path is verified and documented on Linux, macOS, and Windows.

**Depends on**: 9 and the call features.

**Files**: platform-specific media settings documented; an integration run on each
platform (Linux in CI with host networking; macOS and Windows verified manually or
in available runners).

**Acceptance**: a two-way call succeeds on each of the three platforms with the
documented settings.

---

## Decisions log

Resolved (settled and reflected throughout this document):

- **Runtime**: Node.js LTS, not Bun or Deno.
- **Language**: pure TypeScript, strict mode, no JavaScript source.
- **API layer**: ts-rest contract in `packages/shared` (typed REST), not tRPC,
  because the CLI, webhooks, and external tools require plain REST.
- **Database access**: Kysely on `better-sqlite3`.
- **Frontend routing**: TanStack Router (file-based, typed search params).
- **Frontend state**: TanStack Query for server data, Zustand for the SIP.js
  session, `useState` for local UI.
- **UI**: Tailwind with Radix headless primitives (via shadcn/ui).
- **Shell**: left sidebar with contextual section tabs.
- **License**: Apache-2.0.

Still open:

- **D1** (feature 11): PJSIP Realtime vs config generation for dynamic trunks.
  Recommendation: PJSIP Realtime. This shapes feature 11 and the schema in
  feature 3.
- **D2** (feature 3): one SQLite file vs two for the Asterisk realtime and
  application tables. Recommendation: one file.
- **Naming** (feature 32): published package or domain qualifier, per the README.

## Appendix: features mapped to milestones

For readers who want the [roadmap.md](roadmap.md) view:

- **M1, calls in both directions**: features 1 to 20.
- **M2, observability**: features 21 to 25.
- **M3, fault injection**: features 26 and 27.
- **M4, automation**: features 28 to 31.
- **M5, polish and ship**: features 32 and 33.
