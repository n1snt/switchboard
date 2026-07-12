# Switchboard implementation plan

This document turns the conceptual docs into a concrete build sequence. It is the
"how to build it" companion to [README.md](README.md) (what it is),
[architecture.md](architecture.md) (how it fits together), and
[roadmap.md](roadmap.md) (the milestone order).

Acronyms used here, expanded on first use in each section where they appear: SIP
is the Session Initiation Protocol (call signaling). RTP is the Real-time
Transport Protocol (the audio stream). ARI is the Asterisk REST Interface (the
control surface for the engine). ARA is the Asterisk Realtime Architecture (a way
for Asterisk to read its configuration from a database at runtime). PJSIP is the
SIP stack that ships inside Asterisk. WebRTC is Web Real-Time Communication
(browser-native audio). WS is WebSocket. WSS is WebSocket Secure. REST is
Representational State Transfer. E.164 is the international phone-number format,
for example `+14155550123`. NAT is Network Address Translation. CI is continuous
integration.

## How to use this document

- Each milestone below is buildable and testable on its own, in order.
- Every milestone lists: its goal, the concrete tasks, the key files or modules
  it touches, and the acceptance test that proves it is done.
- The "Foundations" section is built incrementally across M0 through M2. It is
  described once, up front, so the milestone sections can refer to it.
- Where a real technical decision is still open, it is called out explicitly as a
  Decision with a recommendation, rather than pretending it is settled.

## Repository layout (target)

Switchboard is a single pnpm workspace monorepo. `pnpm` is the package manager.
The layout below is the target; M0 creates the parts it needs and later
milestones fill in the rest.

```text
switchboard/
  apps/
    server/        # Fastify control plane: REST API, WS event stream, ARI client, SQLite
    web/           # React + Vite: admin dashboard and web softphone (SIP.js)
  packages/
    shared/        # Domain types, Zod schemas, and the ts-rest API contract
    cli/           # Command-line interface (M5)
  engine/          # Asterisk container: Dockerfile, config templates, bootstrap scripts
  docker-compose.yml
  pnpm-workspace.yaml
  package.json           # workspace root: shared scripts, dev tooling only
  tsconfig.base.json     # shared TypeScript compiler options, extended by each package
  eslint.config.ts       # flat ESLint config for the whole workspace (TypeScript, via jiti)
  .prettierrc            # formatting rules
  .editorconfig          # editor-level whitespace and charset rules
  CLAUDE.md              # project rules for AI-assisted work
  documentation/         # README, architecture, data-model, roadmap, implementation
```

Why a monorepo: the server, the web app, and the CLI all share the same domain
types (a trunk, a call, an event) and the same API contract. Keeping them in one
workspace with a shared `packages/shared` means those types are defined once and
imported everywhere, with no version drift. All code is TypeScript. There is no
JavaScript source; config files are TypeScript wherever the tool supports it
(`eslint.config.ts`, `vite.config.ts`, `vitest.config.ts`), and only data files
stay as JSON or YAML.

The detailed server and web layouts appear after the technology stack.

## Technology stack

The rationale for Asterisk and the two-container split lives in
[architecture.md](architecture.md). The concrete library choices for this build:

| Area             | Choice                                 | Note                                                                      |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| Runtime          | Node.js (LTS)                          | Battle-tested native modules and ARI libraries; runs TypeScript directly. |
| Package manager  | pnpm (workspace)                       | Fast, disk-efficient, first-class monorepo support.                       |
| Language         | TypeScript, strict mode                | Pure TypeScript, no JavaScript source, across every package.              |
| Server framework | Fastify                                | Fast, plugin-based, built-in WebSocket support.                           |
| API contract     | ts-rest, in `packages/shared`          | One typed REST contract types the Fastify routes and the client.          |
| Validation       | Zod, in `packages/shared`              | Backs the ts-rest contract and validates all boundary input.              |
| Database         | `better-sqlite3` + Kysely              | Type-safe SQL query builder; hand-written TypeScript migrations at boot.  |
| Frontend build   | Vite + React + TypeScript              | Fast dev server, matches the workspace language.                          |
| Server state     | TanStack Query                         | Caching, mutations, and refetch for all REST data.                        |
| Session state    | Zustand                                | One small store for the SIP.js call session and registration.             |
| UI               | Tailwind + Radix (via shadcn/ui)       | Headless, accessible primitives styled in Tailwind.                       |
| Softphone        | SIP.js                                 | Browser SIP over WSS with WebRTC audio.                                   |
| Engine           | Asterisk (PJSIP, ARI, WebRTC)          | Single container, controlled at runtime. See Decision D1.                 |
| ARI client       | `ari-client` (Node)                    | WebSocket event stream plus REST control of channels and bridges.         |
| Tests            | Vitest                                 | Unit and integration tests across all packages.                           |
| Lint / format    | ESLint (`eslint.config.ts`) + Prettier | Enforced in CI and pre-commit.                                            |

## Detailed layout

### Server (`apps/server/src/`)

Domain-oriented modules, each a vertical slice: routes handle HTTP and
validation, services hold logic, repositories are the only code that touches the
database.

```text
src/
  server.ts                 # entrypoint: load config, bind 127.0.0.1, listen
  app.ts                    # build the Fastify instance, register plugins and /api/v1
  config.ts                 # environment parsed and validated with Zod
  db/
    index.ts                # better-sqlite3 connection plus the Kysely instance
    schema.ts               # table interfaces (the typed shape of every table)
    migrate.ts              # run migrations at boot
    migrations/             # 0001_init.ts, 0002_fault_profiles.ts, ...
  modules/
    trunks/                 # trunks.routes.ts | .service.ts | .repo.ts | .test.ts
    numbers/
    routes/
    calls/
    faults/
  ari/
    client.ts               # ARI WebSocket connection plus the Stasis application
    handlers.ts             # channel and bridge event handlers
    provisioning.ts         # maps a trunk row to PJSIP Realtime rows (Decision D1)
  events/
    bus.ts                  # internal event bus (F4)
    ws.ts                   # WebSocket event-stream plugin for the dashboard
  plugins/                  # error handler, CORS, request logging
  api/
    v1.ts                   # mounts every module's routes under /api/v1 (F3b)
```

### Web (`apps/web/src/`)

Feature-first. Each feature owns its components and its TanStack Query hooks.

```text
src/
  main.tsx  App.tsx
  routes/                   # top-level pages (dashboard, trunks, numbers, calls, phone)
  features/
    trunks/                 # components plus query hooks (useTrunks, useCreateTrunk)
    numbers/
    calls/                  # live call log, subscribes to the WebSocket stream
    softphone/              # SIP.js session logic plus its Zustand store
  components/ui/            # Radix-based primitives styled with Tailwind (shadcn/ui)
  lib/
    api.ts                  # typed ts-rest client built from the shared contract
    query.ts                # TanStack Query client and defaults
    ws.ts                   # WebSocket subscription hook feeding the Query cache
  stores/                   # Zustand stores (softphone and session state)
  styles/                   # Tailwind entry
```

State ownership on the web side: TanStack Query holds all server data (trunks,
numbers, routes, call log). A single Zustand store holds the imperative SIP.js
call session and registration status. Local component state uses `useState`. The
WebSocket hook pushes live call events into the TanStack Query cache so the call
log updates without polling.

## Foundations (built across M0 to M2)

These are the cross-cutting pieces the milestones lean on. They are introduced
here so each milestone can reference them by name.

### F1. The engine and how the control plane drives it

The engine is Asterisk in one container. The control plane (`apps/server`) drives
it two ways:

1. **ARI over WebSocket**, for live call control and events. The server opens a
   long-lived WS connection to Asterisk's ARI, subscribes to a Stasis
   application, and receives channel and bridge events (a new call arriving, a
   channel answered, a hangup). Through the same interface it answers channels,
   creates bridges, and starts playback. This is how live calls are handled.

2. **Configuration of SIP endpoints (trunks)**, which ARI does *not* manage. ARI
   controls channels and bridges, not the existence of PJSIP endpoints. So
   creating and removing trunks needs one of the approaches in Decision D1 below.

> **Decision D1: how trunks become live Asterisk endpoints.**
> The conceptual docs say the control app "programs the engine through ARI." That
> is true for calls but not for endpoints. Two workable options:
>
> - **(Recommended) PJSIP Realtime (ARA) against the same SQLite file.** Asterisk
>   reads its PJSIP endpoint, auth, and address-of-record configuration directly
>   from database tables. The control plane writes trunk rows; Asterisk sees them
>   without a reload. Cleanest runtime story, no reload races. Cost: the SQLite
>   schema must include the Asterisk realtime tables (`ps_endpoints`, `ps_auths`,
>   `ps_aors`, and so on) alongside the Switchboard tables in
>   [data-model.md](data-model.md), and the two must be kept in sync (the server
>   owns the mapping from a Switchboard `trunks` row to the PJSIP rows).
> - **Config generation plus reload.** The server writes `pjsip.conf` fragments
>   and issues `pjsip reload` (via ARI's `asterisk` resource or the Asterisk CLI).
>   Simpler to reason about per-change, but reloads are coarse and racy under
>   rapid changes.
>
> Recommendation: PJSIP Realtime. Resolve this in M1, since M0 needs only a
> single static WebRTC endpoint and does not exercise dynamic trunks.

The storage choice that D1 implies raises a second question.

> **Decision D2: one SQLite file or two.**
> If D1 chooses PJSIP Realtime, decide whether Asterisk's realtime tables and
> Switchboard's application tables share one database file or use two. Sharing one
> file is simplest for a single-user localhost tool and is the recommendation;
> revisit only if lock contention appears.

### F2. Data access layer

`apps/server` owns all writes. Database access goes through Kysely, a type-safe
SQL query builder, over a synchronous `better-sqlite3` connection. Kysely gives
compile-checked queries against a hand-written table-interface type in
`db/schema.ts`, with no heavy object-relational mapper and no runtime magic, and
it coexists cleanly with the Asterisk-owned PJSIP Realtime tables (which the
application reads or writes only through the provisioning module, not the
per-entity repositories). There is one repository module per table (`trunks`,
`numbers`, `routes`, `calls`, later `fault_profiles`), matching
[data-model.md](data-model.md). Only repositories touch Kysely; services and
routes never build queries directly. Schema is created and migrated by
hand-written TypeScript migrations run at server boot. Identifiers are text (a
short unique id). JSON columns (`allowed_ips`, `dial_rewrite`) are stored as text
and parsed at the boundary.

### F3. Shared types, validation, and the API contract

`packages/shared` is the single source of truth for the wire. It exports Zod
schemas for every entity and event, the TypeScript types inferred from them, and
a ts-rest contract that describes every REST endpoint (its path, method, request
body, and response shape) in terms of those schemas. From that one contract:

- The server implements typed Fastify route handlers, and every request body and
  response is validated against the contract's Zod schemas at the boundary.
- The web app and the CLI consume a fully typed client generated from the same
  contract, so a change to an endpoint is a compile error on every caller rather
  than a runtime surprise.

This keeps the REST API real (the CLI, webhooks, and third-party tools can call
it as plain HTTP) while giving end-to-end type safety inside the workspace.

### F3b. API versioning

Every REST route is mounted under a version prefix, starting at `/api/v1`. The
version is part of the ts-rest contract and registered in Fastify as a plugin
prefix. Policy: additive, backward-compatible changes stay within `v1`; only a
breaking change to an existing endpoint mints `/api/v2`, and `v1` and `v2` can be
served side by side during a deprecation window. This is what the CLI and any
external consumer pin against.

### F4. Event model

A single internal event bus in the server publishes call lifecycle events
(created, ringing, answered, ended, plus state transitions). Two consumers:

- The WS event stream that the dashboard subscribes to for live updates.
- The `calls` table writer, which persists each transition (M3 depends on this).

Webhooks (M5) become a third consumer of the same bus.

### F5. Configuration and networking

The media and NAT model from [architecture.md](architecture.md) is a real risk,
not a detail. The engine container is configured with:

- A bounded RTP port range, published from the container.
- An explicitly set advertised address (`external_media_address` /
  `external_signaling_address` in PJSIP) so the engine advertises an address the
  browser can actually reach.
- Host networking on Linux; published ports plus explicit advertised address on
  macOS and Windows.

This is configured once in `engine/` and `docker-compose.yml` and validated in
M0.

## Milestones

### M0: prove the pipe

Goal: a clean two-way-audio call between two browser tabs, through the engine.
This retires the biggest technical risk before any dashboard work.

Tasks:

1. Initialize the workspace: `pnpm-workspace.yaml`, root `package.json`,
   `tsconfig.base.json`, and the lint/format config (see the project rules).
   Create empty `apps/server`, `apps/web`, `packages/shared`.
2. Author the Asterisk container in `engine/`: Dockerfile, `http.conf` (WSS
   enabled), `ari.conf` (an ARI user for the control plane), `pjsip.conf` with a
   WebRTC transport (WSS, DTLS-SRTP) and one or two static WebRTC endpoints for
   the softphone tabs, and `rtp.conf` with the bounded port range (F5).
3. Write `docker-compose.yml` bringing up `switchboard-engine` and
   `switchboard-app`, wiring ports, the RTP range, and the advertised address per
   platform (F5).
4. Build a minimal softphone page in `apps/web` using SIP.js: register to the
   engine over WSS, dial the other endpoint, render local and remote audio.
5. Stand up `apps/server` with a bare Fastify app and an ARI client (F1) that
   connects, joins its Stasis application, and bridges the two legs of a call so
   audio flows.

Key files: `engine/*`, `docker-compose.yml`, `apps/web/src/softphone/*`,
`apps/server/src/ari/*`.

Acceptance test: open two browser tabs, register both, call one from the other,
accept, and confirm two-way audio for at least 10 seconds with no one-way-audio
or dropout. Document the exact macOS/Windows/Linux media settings that made it
work.

Primary risk: media and NAT (F5). If audio is one-way, the advertised address or
RTP port publishing is wrong. Fix here before moving on.

### M1: receive a call (outbound trunk)

Goal: your system places a call to an outbound trunk and it rings the softphone,
with two-way audio on accept. (Outbound is from your system's point of view, per
[data-model.md](data-model.md).)

Tasks:

1. Resolve Decision D1 (PJSIP Realtime recommended) and add the realtime tables
   to the schema (F2).
2. Implement `trunks` CRUD in the server: REST endpoints plus the data layer,
   validated by shared Zod schemas (F3). Creating a trunk with `direction`
   `outbound` or `both` provisions the matching PJSIP endpoint and auth per D1.
3. Support the three trust models from [architecture.md](architecture.md):
   `none` (accept any), `digest` (username and password), `ip` (source-address
   allowlist). Map each to PJSIP auth configuration.
4. Implement `routes` matching for outbound calls: match the dialed number
   pattern and ring the softphone (F1 bridges the call).
5. Build the dashboard trunk view in `apps/web`: create a trunk, read back its
   SIP endpoint, username, and password, with copy-to-clipboard.
6. On an inbound INVITE to an outbound trunk, the server authenticates per the
   trunk's mode, matches a route, rings the softphone via ARI, and bridges on
   accept.

Acceptance test: create an outbound trunk in the dashboard, point any SIP sender
(for example `sipexer` or a softphone) at it using the shown credentials, place a
call, and confirm it rings the browser softphone with two-way audio on accept.
Verify each auth mode: `none` connects with anything, `digest` rejects wrong
credentials, `ip` rejects an unlisted source.

### M2: make a call (inbound trunk and numbers)

Goal: the softphone dials a number and your system receives the call.

Tasks:

1. Implement `numbers` CRUD: create an E.164 number and assign it to an inbound
   trunk (`trunk_id`), with `target_host` and `target_port` on the trunk pointing
   at your system's SIP endpoint (F2, F3).
2. Implement inbound delivery: when the softphone dials a number, the server
   looks up the number, finds its inbound trunk, applies any `dial_rewrite`, and
   originates an INVITE to `target_host:target_port` via ARI, then bridges the
   softphone leg to it.
3. Support explicit inbound `routes` as overrides, per
   [data-model.md](data-model.md).
4. Build the dashboard numbers view and a softphone dial pad in `apps/web`.

Acceptance test: create an inbound trunk pointed at a local SIP endpoint (for
example a `baresip` or a second Asterisk), assign it a number, dial that number
from the softphone, and confirm your endpoint receives the call with two-way
audio. With M0 through M2 done, Switchboard is genuinely useful on its own.

### M3: observability

Goal: understand why a call did what it did, from the dashboard alone.

Tasks:

1. Persist every call and every state transition to the `calls` table from the
   event bus (F4): `started_at`, `answered_at`, `ended_at`, `hangup_cause`,
   negotiated `codec`.
2. Build the live call log in the dashboard, updating over the WS event stream
   (F4): state, timestamps, codec, hangup cause.
3. Capture a SIP trace per call (from Asterisk, for example via PJSIP logging or
   `pjsip set logger on`, parsed by the server) and render a call-ladder diagram
   in the dashboard.
4. Expose the call-event WS stream as a documented public interface other tools
   can subscribe to.

Acceptance test: place several calls including a failure, then from the dashboard
alone read each call's state timeline, negotiated codec, hangup cause, and SIP
ladder without reaching for a separate packet capture.

### M4: fault injection

Goal: reproduce the ugly parts of real carriers on demand. Introduces the
`fault_profiles` table from [data-model.md](data-model.md).

Tasks:

1. Add the `fault_profiles` table and CRUD, and allow attaching a profile to a
   trunk or a route.
2. Implement each fault, applied when a call matches:
   - **Transport strictness**: for example TCP-only with silent dropping of other
     transports, so the caller sees a setup timeout near 32 seconds rather than a
     clean rejection.
   - **Custom rejection code and timing**: return a SIP code such as `486` (busy),
     optionally after `reject_after_ms` to model asynchronous rejection.
   - **Answer delay** (`answer_delay_ms`) and no-answer timeout.
   - **Audio faults**: one-way audio and silent audio (`audio_mode`).
   - **Forced codec** (`force_codec`), overriding negotiation.
   - **Calls-per-second cap** (`max_cps` on the trunk), throttling setup.
3. Build the dashboard controls to create profiles and attach them.

Acceptance test: attach a profile that rejects with `486` after 5 seconds and
confirm the caller observes a delayed busy; force a codec and confirm negotiation
lands on it; set `max_cps` to 1 and confirm a burst is throttled.

### M5: automation

Goal: usable in automated tests without a human.

Tasks:

1. Ensure the REST API covers everything the dashboard does (trunks, numbers,
   routes, fault profiles, and placing a call). The dashboard should already
   consume this API, so this is mostly hardening and documentation.
2. Build `packages/cli`: a command-line interface over the same REST API to
   create trunks and numbers and place calls headlessly.
3. Build an auto-answer bot: a scripted far-end that answers automatically and can
   play an audio file, so CI tests need no human clicking accept. Implement it as
   an ARI application leg the server can attach in place of the softphone.
4. Add webhooks as a third consumer of the event bus (F4): outbound HTTP POST on
   call events, configurable per trunk or globally.

Acceptance test: a shell script using only the CLI and the REST API creates a
trunk and a number, places a call answered by the auto-answer bot, and asserts on
the resulting webhook payloads, with no browser and no human.

### M6: polish and ship

Goal: a first public release.

Tasks:

1. One-command quickstart verified from a clean checkout: `docker compose up` to
   a working softphone.
2. User documentation and copy-paste recipes for common SIP and voice-agent
   stacks (for example how to point a given stack's trunk at Switchboard).
3. Cross-platform verification of the media path on Linux, macOS, and Windows,
   with the platform-specific settings documented.
4. Resolve the naming question from [README.md](README.md) for any published
   package or domain (for example `switchboard-sip`).

Acceptance test: a new user on each of the three platforms follows the quickstart
and completes a two-way call within a few minutes.

## Testing strategy

- **Unit tests (Vitest)** for the data layer, route matching, dial-string
  rewriting, and fault-profile logic. These need no engine.
- **Integration tests** that run the engine container and drive real calls via
  the CLI and the auto-answer bot (available from M5, but the harness can be
  stood up earlier with a scripted SIP client). These are the tests that catch
  media regressions.
- **CI**: lint, typecheck, unit tests on every change; integration tests on a
  Linux runner using host networking where the media path is most reliable.

## Decisions log

Resolved (these are settled and reflected throughout this document):

- **Runtime**: Node.js LTS, not Bun or Deno. Native modules (`better-sqlite3`)
  and the ARI client are Node-first, the performance gain is irrelevant for a
  single-user localhost tool, and Node maximizes the open-source contributor
  pool. Node LTS also runs TypeScript directly, so no build step is needed to
  execute the server in development.
- **Language**: pure TypeScript, strict mode, no JavaScript source.
- **API layer**: ts-rest contract in `packages/shared` (typed REST), not tRPC,
  because the CLI, webhooks, and external tools require plain REST.
- **Database access**: Kysely on `better-sqlite3` (type-safe SQL), not raw SQL
  and not a full object-relational mapper.
- **Frontend state**: TanStack Query for server data, Zustand for the SIP.js
  session, `useState` for local UI.
- **UI**: Tailwind with Radix headless primitives (via shadcn/ui).
- **License**: Apache-2.0.

Still open:

- **D1** (M1): PJSIP Realtime vs config-generation for dynamic trunks.
  Recommendation: PJSIP Realtime.
- **D2** (M1): one SQLite file vs two for Asterisk realtime plus application
  tables. Recommendation: one file.
- **Naming** (M6): published package or domain qualifier, per the README.
