# Switchboard project rules

Switchboard is a local telephony sandbox: a fake phone carrier plus a fake
far-end phone plus an admin panel, so developers can place and receive real audio
calls on localhost with no carrier account. Documentation is split into
[documentation/user/](documentation/user/README.md) (using the tool) and
[documentation/dev/](documentation/dev/README.md) (building it). Read
[architecture.md](documentation/dev/architecture.md) for how it fits together,
[data-model.md](documentation/dev/data-model.md) for the schema,
[roadmap.md](documentation/dev/roadmap.md) for the milestone order, and
[implementation.md](documentation/dev/implementation.md) for the feature-by-feature
build plan and open decisions.

Acronyms, expanded once here: SIP is the Session Initiation Protocol (call
signaling). RTP is the Real-time Transport Protocol (audio). ARI is the Asterisk
REST Interface. WebRTC is Web Real-Time Communication. WS is WebSocket. REST is
Representational State Transfer.

## Repository shape

This is a single pnpm workspace monorepo. Do not add a second package manager or
a nested lockfile.

```text
apps/server     Fastify control plane: REST API, WS events, ARI client, SQLite
apps/web        React + Vite: admin dashboard and web softphone (SIP.js)
packages/shared Zod schemas, domain types, and the ts-rest API contract
packages/cli    Command-line interface (M5)
engine/         Asterisk container: Dockerfile, config templates, bootstrap
```

Rules:

- Domain types (trunk, number, route, call, event) and the REST API contract are
  defined once in `packages/shared` (Zod schemas plus a ts-rest contract). Never
  redefine an entity type or an endpoint shape in `apps/server` or `apps/web`;
  import it from the contract.
- `apps/server` is the only writer to SQLite. The web app and CLI reach data only
  through the server's REST API and WS stream.
- Cross-package imports go through package names (workspace protocol), never deep
  relative paths across package boundaries.

## Tech stack (do not swap without updating implementation.md)

- Runtime: Node.js LTS. Not Bun, not Deno (native modules and ARI libraries are
  Node-first; see the decisions log in implementation.md).
- Package manager: pnpm workspaces.
- Language: pure TypeScript, strict mode, across every package. No JavaScript
  source files. Config files are TypeScript where the tool allows
  (`eslint.config.ts`, `vite.config.ts`, `vitest.config.ts`); only JSON and YAML
  data files are exempt.
- Server: Fastify. Routes implement a ts-rest contract from `packages/shared`;
  input is validated with the contract's Zod schemas.
- API: REST, versioned under `/api/v1`. Additive changes stay in `v1`; a breaking
  change mints `/api/v2`.
- Database: SQLite via `better-sqlite3`, queried through Kysely (type-safe SQL).
  Hand-written TypeScript migrations run at boot. No object-relational mapper.
  Only repository modules touch the database.
- Web: Vite + React + TypeScript. Routing via TanStack Router (file-based, typed
  search params); server data via TanStack Query; the SIP.js call session via a
  Zustand store; local UI via `useState`. UI is Tailwind with Radix headless
  primitives (shadcn/ui). Softphone uses SIP.js over WSS with WebRTC. The shell is
  a left sidebar with contextual section tabs (see ux.md). Do not hand-edit
  `routeTree.gen.ts`.
- Engine: Asterisk (PJSIP, ARI, WebRTC), one container, controlled at runtime.
- ARI client: `ari-client`.
- Tests: Vitest.

## Coding conventions

- TypeScript strict mode everywhere. No `any`; use `unknown` and narrow. Prefer
  explicit return types on exported functions.
- Validate all external input (REST bodies, ARI events, config) at the boundary
  with Zod, via the shared contract. Trust nothing past that line.
- In the server, keep the vertical-slice split: routes handle HTTP and
  validation, services hold logic, repositories are the only code that queries
  the database. Do not build queries in a route or service.
- Keep the engine's static configuration minimal. Trunks and endpoints are
  provisioned at runtime by the control plane (see Decision D1 in
  implementation.md); do not hard-code trunk-specific config into `engine/`.
- Format with Prettier, lint with ESLint (flat config at the repo root). Both run
  in CI and must pass. Do not disable rules inline without a one-line reason.
- Name files and identifiers to match the surrounding code. Match existing
  comment density; comment the "why", not the "what".

## Networking and media

The media/NAT path is the project's biggest risk (see architecture.md and the M1
walking skeleton in implementation.md). When touching engine config,
`docker-compose.yml`, or RTP settings:

- Keep the bounded RTP port range and the explicit advertised address in sync
  between `docker-compose.yml` and the engine's PJSIP config.
- Preserve the platform split: host networking on Linux; published ports plus
  explicit advertised address on macOS and Windows.
- Any change here must be re-verified with a real two-way-audio call, not just a
  passing unit test.

## Testing (not optional)

This project is built with AI assistance, so tests are the primary check that
generated code does what it should.

- Every change ships with its tests. No "add tests later."
- 100% coverage is enforced on the TypeScript packages (`apps/server`,
  `packages/shared`, `packages/cli`, and the logic in `apps/web`) via Vitest
  statement, branch, function, and line thresholds set to 100. CI fails below
  100%. Do not lower the global threshold to make a change pass; isolate the
  untestable seam and mark it with a one-line `istanbul ignore` reason instead.
- The engine and media paths (Asterisk, RTP, WebRTC) are proven by integration
  tests that run a real engine, not by a coverage number.
- A change to call handling, routing, or media is not "done" until exercised with
  a real call. Unit tests do not prove audio flows.

## Documentation (document as you build)

Everything, developer-facing or user-facing, is documented in the same change that
builds it, never in a follow-up. A feature is not done until its docs exist.

- Developer-facing behavior goes in [documentation/dev/](documentation/dev/).
- Any user-facing capability goes in [documentation/user/](documentation/user/) as
  a first-class, example-driven guide. User docs are a priority, not an
  afterthought: every user-facing feature ships with a guide that includes
  runnable examples (dashboard steps, `curl`, CLI, or Compose snippets).
- Each feature in implementation.md carries a Docs step; treat it as part of the
  definition of done alongside its tests.

## Packaging and deployment

Switchboard ships as Docker images and is run with Docker Compose from day one.

- Three images: `switchboard-engine` (Asterisk), `switchboard-api` (the Node
  control plane), and `switchboard-web` (the static React dashboard served by
  nginx). All three have a Dockerfile from the first milestone, not bolted on at
  release.
- `switchboard-web` is the browser entry point; its nginx reverse-proxies `/api`
  and the event WebSocket to `switchboard-api`, so the browser stays single-origin
  and no cross-origin configuration is needed.
- The canonical way to run the project, in development and for users, is
  `docker compose up` using the `docker-compose.yml` at the repository root. Keep
  it working at every milestone.
- The API and web images are multi-stage builds (install, build, then a slim
  runtime stage: Node slim for the API, nginx for the web). Keep images small and
  pin base versions.
- CI builds all three images; release publishes them.

## Workflow

- Build in milestone order (M1 to M5 in roadmap.md and implementation.md). The
  M1 walking skeleton (clean two-way audio between two browser tabs) must work
  before any trunk, number, or dashboard feature. Generating code fast does not
  reduce the media and network-address-translation risk.
- Update implementation.md's decisions log when a Decision (D1, D2, naming) is
  resolved.

## License

Switchboard is Apache-2.0. New source files carry the standard Apache-2.0 header.
Do not add a dependency under a copyleft license (for example GPL or AGPL) into
`apps/*` or `packages/*`; the Asterisk engine is GPL but runs as a separate
container over ARI, which keeps it at arm's length from our code.

## First version scope (do not exceed without a reason)

Single user, localhost, `docker compose up`, no authentication, browser softphone
only. External SIP client registration and multi-tenancy are later additions.
