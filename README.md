# Switchboard

**A local telephony sandbox for SIP and voice application development.**

Switchboard is an open-source, self-hostable tool that stands in for a real phone
carrier, so you can place and receive real audio calls on your own machine with
no phone number, no carrier account, and no deployment.

> Switchboard is to phone calls what LocalStack is to cloud services and what
> Mailpit is to email: a fake version of the external system you would otherwise
> need a paid account and a live environment to test against.

SIP is the Session Initiation Protocol, the signaling used to set up and tear
down voice calls. PSTN is the Public Switched Telephone Network, the real-world
phone network. Other acronyms are expanded the first time they appear in the
[documentation](documentation/).

## Why

A real telephony setup needs three things your laptop cannot easily provide: a
carrier (a SIP trunk provider such as Twilio, Telnyx, or Plivo), the human on the
far end of the call, and phone numbers to route on. Testing a voice agent or SIP
application against all three is slow, costs money, and is hard to automate.

Switchboard emulates all three locally:

```text
Switchboard = fake carrier + fake far-end phone + an admin panel over both
```

Point your system-under-test at a local trunk, and Switchboard hands out
credentials exactly like a carrier would. Its built-in browser softphone plays
the human on the far end.

## Features

- **Place and receive real audio calls** locally, with no external dependencies.
- **Carrier-style onboarding**: get a SIP endpoint, username, and password from a
  web dashboard, just like a real carrier would give you.
- **A browser softphone** that answers and places calls, so no second device or
  physical phone is needed.
- **Reproduce the ugly parts of real carriers on demand**: busy signals,
  timeouts, one-way audio, codec mismatches, transport strictness, and rate
  limits.
- **Observability built in**: a live call log, a SIP trace and call-ladder
  diagram, and a call-event stream, so you can see exactly why a call behaved the
  way it did.
- **Automation friendly**: a REST (Representational State Transfer) application
  programming interface, a command-line interface, an auto-answer bot for
  continuous integration, and webhooks.

## Status

Switchboard is in early development. It is being built in milestones, from a
proven two-way-audio path to a polished release. See the
[roadmap](documentation/dev/roadmap.md) for what is planned and where things
stand.

## Quickstart

> Prerequisites: Docker and Docker Compose.

```bash
git clone <repository-url> switchboard
cd switchboard
docker compose up
```

Then open the dashboard in your browser (the address is printed on startup),
create a trunk, and point your SIP application or voice agent at it. Full setup
and platform notes will live in the documentation as the milestones land.

## How it works

Switchboard is three containers:

- **`switchboard-engine`** runs Asterisk: the SIP signaling stack, the audio
  bridge, and the browser-facing WebRTC (Web Real-Time Communication) endpoint. It
  behaves like a real carrier on the wire.
- **`switchboard-api`** runs the control plane: a REST API plus WebSocket event
  stream backed by SQLite, which drives the engine over its REST interface. There
  is nothing external to install.
- **`switchboard-web`** serves the dashboard and browser softphone (a static React
  app behind nginx), which reverse-proxies API and event traffic to
  `switchboard-api` so the browser stays on one origin.

The full picture, including the media and networking model and the two core call
flows, is in [architecture.md](documentation/dev/architecture.md).

## Documentation

Documentation is split by audience (see [documentation/](documentation/README.md)):

- **[User guide](documentation/user/README.md)**: how to run Switchboard and use
  it, first-class and example-driven. Start here to use the tool.
- **[Developer docs](documentation/dev/README.md)**: how it is built. Includes
  [architecture.md](documentation/dev/architecture.md) (components and call flows),
  [data-model.md](documentation/dev/data-model.md) (storage schema),
  [dashboard.md](documentation/dev/dashboard.md) and
  [ux.md](documentation/dev/ux.md) (dashboard and UX specs),
  [implementation.md](documentation/dev/implementation.md) (feature-by-feature
  build plan), and [roadmap.md](documentation/dev/roadmap.md) (milestones).

## Tech stack

TypeScript throughout, in a pnpm workspace monorepo. The control plane is a
Fastify server with a typed REST contract (ts-rest and Zod) over SQLite (via
Kysely). The web dashboard and softphone are React with Vite, TanStack Query, and
SIP.js. The engine is Asterisk. See
[implementation.md](documentation/dev/implementation.md) for the full rationale.

## Contributing

Contributions are welcome. Please read the project conventions in
[CLAUDE.md](CLAUDE.md) and the build plan in
[implementation.md](documentation/dev/implementation.md) before opening a pull
request. A dedicated contributing guide will follow.

## A note on the name

The name Switchboard is used by other projects, so a qualifier such as
`switchboard-sip` may be needed for a package name or domain. The product is still
called Switchboard.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Switchboard runs Asterisk (licensed under the GNU General Public License version
2) as a separate container over its REST interface, not linked into Switchboard's
own code, which keeps the two at arm's length.
