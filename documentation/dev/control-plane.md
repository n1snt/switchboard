# Switchboard control plane (as built: Part A and Part B)

This document describes how the control plane and its foundations are built, as a
companion to [architecture.md](architecture.md) (the component-level picture) and
[implementation.md](implementation.md) (the feature-by-feature plan). It covers
the work in Part A (Foundations, features 1 to 8) and the server side of Part B
(the two-way-audio walking skeleton, feature 9).

Acronyms, expanded on first use: REST is Representational State Transfer. ARI is
the Asterisk REST Interface. SIP is the Session Initiation Protocol. RTP is the
Real-time Transport Protocol (the audio stream). WS is WebSocket. SQL is
Structured Query Language. JSON is JavaScript Object Notation. CI is continuous
integration.

## Workspace shape

Switchboard is a single pnpm workspace monorepo. The packages built so far:

```text
packages/shared   Zod schemas, domain types, event shapes, and the ts-rest contract
apps/server       Fastify control plane: config, database, HTTP, WS, ARI, call logic
apps/web          React dashboard and browser softphone (built in a companion pass)
packages/cli      Command-line interface placeholder (built in feature 29)
```

One `pnpm install` at the root installs every package. The toolchain is pure
TypeScript in strict mode: type-checking with `tsc`, linting with ESLint (flat
config), formatting with Prettier, and testing with Vitest. The root scripts
(`typecheck`, `lint`, `test`, `test:cov`) run across all packages, and the root
Vitest configuration aggregates coverage with the 100% thresholds the project
requires.

### The shared package resolves to source

`@switchboard/shared` exports point at `src/index.ts` rather than a built folder.
The server (through the tsup bundler) and the web app (through Vite) inline the
shared source at build time, so there is no separate build step to keep in sync
during development, and both consumers always see the same types the tests run
against.

## The shared contract (feature 2)

Everything on the wire is defined once in `packages/shared` and imported
everywhere else. Nothing redefines an entity or an endpoint shape.

- `src/schemas/` holds one file per entity (trunk, number, route, call,
  fault-profile, settings) plus `common.ts` for shared primitives (identifier,
  timestamp, E.164 phone number, the error envelope, health, codec). Each entity
  is split into a `Base` schema, a `Create` input schema, an `Update` (partial)
  schema, and the full stored schema, matching [data-model.md](data-model.md).
  Field-level `.describe()` text feeds the generated API documentation. The trunk
  create schema also enforces cross-field rules (digest needs credentials, IP
  allowlist needs an address, registration needs a registrar, an inbound-capable
  trunk needs a target host).
- `src/events.ts` is the discriminated union of call lifecycle events
  (`call.created`, `call.ringing`, `call.answered`, `call.ended`,
  `call.state_changed`). Each event carries a full call snapshot so subscribers
  never have to re-fetch. This is the shape the WS stream and the webhooks emit.
- `src/contract.ts` is the ts-rest contract, grouped by resource and composed
  into one root contract. Every route declares its method, full path under
  `/api/v1`, path and query schemas, request body, response schemas (including the
  shared error envelope), and a human-readable summary for the API documentation.

## The database layer (feature 3)

The server is the only writer to a single SQLite file (Decision D2, one file). It
is reached only through repository modules; routes and services never build
queries directly.

- `db/index.ts` opens the `better-sqlite3` connection, sets `journal_mode = WAL`
  and `foreign_keys = ON`, and constructs a typed Kysely instance.
- `db/schema.ts` is the Kysely database interface: one table interface per table,
  expressed in SQLite column types. Booleans are stored as integers (0 or 1) and
  JSON columns as text; `db/mappers.ts` converts both at the repository edge and
  validates JSON columns with the owning entity's Zod schema, so nothing past the
  boundary is untyped or untrusted.
- `db/migrate.ts` runs ordered, forward-only migrations from `db/migrations/`,
  each in its own transaction, recording applied migrations by name so re-running
  is a no-op. It runs once at boot before the server listens. `0001_init.ts`
  creates `trunks`, `numbers`, `routes`, `calls`, and `settings`. The
  `fault_profiles` table and the PJSIP realtime tables are added by their own
  features (26 and 11), so the schema interface only ever describes tables a
  migration has created.

## The server (feature 4)

- `config.ts` parses `process.env` with a Zod schema into a typed configuration
  and fails fast with a single readable message listing every invalid field. The
  HTTP host defaults to the loopback address `127.0.0.1` for the single-user local
  story; Docker sets it to `0.0.0.0` so the web container can reach the API.
- `app.ts` builds the Fastify instance: cross-origin resource sharing (a no-op in
  the default single-origin setup, configurable otherwise), the shared error
  handler, the generated API documentation, the event-stream WebSocket, and the
  health endpoint. It does not listen; `server.ts` owns the process lifecycle.
- `plugins/errors.ts` is the single error handler. Every failure becomes the one
  envelope the contract declares: `{ error: { code, message, details? } }`.
  Services throw `HttpError` (with `notFound` and `badRequest` helpers) for
  expected failures; a Zod validation error becomes a 400 with the field issues;
  anything else becomes a 500.
- `plugins/openapi.ts` generates an OpenAPI 3 document from the ts-rest contract
  and serves it at `GET /api/v1/openapi.json`, with interactive Swagger UI at
  `GET /api/docs`. Because the document is generated from the single contract, it
  never drifts and grows automatically as endpoint features land.
- `server.ts` is the composition root: load config, ensure the data and
  recordings directories exist, migrate, build the app, wire the ARI connection,
  listen, and shut down cleanly on a termination signal.

The health endpoint reports both liveness and the live engine-connection state,
which the server reads from the ARI connection manager.

## Event bus and WebSocket stream (feature 8)

- `events/bus.ts` is a small typed publish and subscribe wrapper over Node's
  event emitter, carrying the shared call-event union. It is the one place call
  state changes are announced, designed for many independent subscribers (the WS
  stream now; the call-table writer and webhooks later).
- `events/ws.ts` registers a WebSocket route at `/api/v1/events`. Each connected
  client becomes one bus subscriber and receives every event as JSON; the
  subscription is torn down when the socket closes.

## ARI connection and call bridging (features 7 and 9)

The server never touches the untyped `ari-client` library directly outside a thin,
clearly marked seam. Ambient types cover only the surface Switchboard uses, and
every incoming ARI event is validated with Zod before use.

- `ari/operations.ts` defines the `AriOperations` interface (answer, hang up,
  create and destroy a mixing bridge, add a channel to a bridge, originate a
  channel) and an adapter over a connected client. The call logic depends on this
  interface, so it is testable with a plain mock.
- `ari/events.ts` holds the Zod schemas for the ARI events the call features
  consume (`StasisStart`, `StasisEnd`, `ChannelHangupRequest`, and related).
- `ari/coordinator.ts` is the walking-skeleton call logic. Its dialplan contract:
  a caller channel enters the Stasis application with its dialed target in the
  channel's dialplan extension and no extra arguments. The coordinator answers the
  caller, creates a mixing bridge, publishes `call.created` and `call.ringing`,
  and originates the callee (`PJSIP/<target>`) back into Stasis with the arguments
  `dialed,<bridgeId>`. The callee leg re-enters, is answered and added to the
  bridge, and the coordinator publishes `call.answered`. When either leg hangs up,
  the bridge is torn down, the other leg is ended, and `call.ended` is published.
- `ari/connection.ts` owns the connection lifecycle: it connects (retrying at boot
  with capped backoff in case the engine starts a moment later), joins the Stasis
  application, registers the coordinator's handlers, and reflects the library's
  WebSocket lifecycle events into the engine status the health endpoint reports.
  `ari-client` handles reconnection after a drop on its own.

## Resource APIs and call features (Part C, D, and E)

The REST resources are implemented as vertical slices under `modules/<resource>/`:
a `*.repo.ts` (the only code that queries its table), a `*.service.ts` (logic,
id and timestamp generation, cross-field checks), and a `*.routes.ts` that binds
the resource's slice of the ts-rest contract to Fastify. `http/router.ts` builds
the services once and registers each sub-contract in its own encapsulated Fastify
scope, so the shared error envelope stays in force and request-validation failures
are mapped to it (`http/ts-rest.ts`). Trunks, numbers, routes, calls, and settings
are implemented; faults arrive in Part F.

- **Trunks** (feature 10) are full CRUD. Creating or updating a trunk reflects it
  onto the engine through a `TrunkProvisioner`; deleting removes it.
- **Trunk provisioning** (feature 11, Decision D1) is `realtime-provisioner.ts`:
  it maps a trunk to `ps_endpoints`, `ps_auths`, and `ps_aors` rows (auth only when
  the trunk has credentials, `outbound_auth` only when it registers), idempotently.
  The `0002_pjsip_realtime` migration creates those tables.
- **Environment provisioning** (feature 13) parses `SWITCHBOARD_SIP_SERVERS` at
  boot, maps each camelCase entry to the trunk schema, and upserts it by name with
  `source: env`, so the environment stays the source of truth across restarts.
- **Numbers** (feature 14) validate that their trunk exists and carries inbound
  calls. **Routes** (feature 15) are CRUD plus the pure `matchRoute` (pattern match
  with priority) the call features call.
- **Running a call** (features 16 and 17) is the coordinator's job: it reads the
  caller's endpoint and dialed target off the channel, decides the direction and
  target with the pure `planCall` (`calls/call-plan.ts`, composing `matchRoute`
  and `calls/dialing.ts`'s `planOutgoing`/`applyDialRewrite`), and originates and
  bridges over ARI. A call on a trunk rings the softphone (outbound); the
  softphone dialling a number, trunk, or SIP URI reaches the system-under-test
  (inbound). See [observability.md](observability.md).
- **Call persistence** (feature 21) is `CallWriter`, a bus subscriber that upserts
  the full call snapshot carried by every event, so the `calls` table always
  reflects the current timeline.
- **The call log** (feature 22) is the `calls` list endpoint, filterable by
  direction (placed/received, mapped to inbound/outbound), trunk, state, and time.
- **The SIP trace** (feature 23): `sip-trace-parser.ts` turns Asterisk's PJSIP
  logger output into ladder entries, and `SipTraceCapture` fills the per-call
  `InMemorySipTraceStore` the detail endpoint reads by tailing the engine's PJSIP
  log (`ari/pjsip-log-source.ts`, `SWITCHBOARD_PJSIP_TRACE_FILE`). See
  [observability.md](observability.md).
- **Recording** (feature 24): `resolveRecordEnabled` decides most-specific-first
  (per-call, then per-trunk, then the global setting or `SWITCHBOARD_RECORD_ALL`),
  the coordinator records the mixing bridge over ARI when a call should be
  recorded, and a binary download route streams the finished file from the
  recordings directory (with a path-traversal guard). See
  [observability.md](observability.md).
- **Settings** (feature 25) read and write the global options, with defaults from
  the schema and an environment override applied on boot.

## Configuration (environment variables)

| Variable | Default | Meaning |
| --- | --- | --- |
| `SWITCHBOARD_HOST` | `127.0.0.1` | HTTP bind address (Docker sets `0.0.0.0`). |
| `SWITCHBOARD_PORT` | `3000` | HTTP port. |
| `SWITCHBOARD_DATABASE_PATH` | `./data/switchboard.sqlite` | SQLite file path. |
| `SWITCHBOARD_ARI_URL` | `http://127.0.0.1:8088` | Engine ARI base URL. |
| `SWITCHBOARD_ARI_USERNAME` | `switchboard` | ARI user. |
| `SWITCHBOARD_ARI_PASSWORD` | `switchboard` | ARI password. |
| `SWITCHBOARD_ARI_APP` | `switchboard` | Stasis application name (matches the dialplan). |
| `SWITCHBOARD_RECORDINGS_DIR` | `./recordings` | Recording output directory. |
| `SWITCHBOARD_RECORD_ALL` | `false` | Record every call by default. |
| `SWITCHBOARD_PJSIP_TRACE_FILE` | unset | Asterisk PJSIP log to tail for SIP traces (feature 23). |
| `SWITCHBOARD_SIP_SERVERS` | `[]` | JSON array of trunks to seed (feature 13). |
| `SWITCHBOARD_CORS_ORIGIN` | unset | Set only for the direct-origin alternative. |

## Testing and coverage

The TypeScript packages are held at 100% coverage (statements, branches,
functions, lines) by Vitest. Server HTTP tests use Fastify's `inject`; the
database tests use a temporary SQLite file; the WebSocket test runs a real
listening server and a WebSocket client. The ARI call logic is proven with a mock
of the `AriOperations` interface.

Two files are isolated as untestable seams rather than lowering the global
threshold, each carrying a one-line reason:

- `server.ts`, the composition root (it listens, wires signal handlers, and calls
  `process.exit`), exercised by running the server.
- `ari/connect.ts`, the thin call into the real `ari-client` library, exercised
  against a running engine.

The engine and media paths (Asterisk, RTP, WebRTC) are proven by running a real
engine, not by a coverage number. The two-way-audio acceptance for the walking
skeleton (feature 9) is verified by `docker compose up` and two browser tabs; see
[containers.md](containers.md) and [running-with-docker](../user/running-with-docker.md).
