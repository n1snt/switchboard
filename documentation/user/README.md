# Switchboard user guide

How to run Switchboard and use it to place and receive real calls against your SIP
or voice application, with no phone number and no carrier account. If you are
contributing to Switchboard instead, see the
[developer documentation](../dev/README.md).

Acronyms, expanded on first use: SIP is the Session Initiation Protocol (call
signaling). DID is a Direct Inward Dialing number (an ordinary phone number).
E.164 is the international phone-number format, for example `+14155550123`. REST
is Representational State Transfer. CLI is a command-line interface.

## What Switchboard does for you

Switchboard is a fake phone carrier plus a fake far-end phone plus an admin panel,
running on your machine. You point your system-under-test (a voice agent or any
SIP application) at a local trunk, and Switchboard behaves like a real carrier:
it hands out an endpoint and credentials, routes calls, and lets you answer or
place calls from a browser softphone.

With it you can:

- Receive a call: your application places a call and it rings the browser
  softphone, with two-way audio on accept.
- Make a call: dial from the browser softphone and Switchboard delivers the call
  to your application.
- Reproduce real carrier behavior on demand: busy signals, timeouts, one-way
  audio, codec mismatches, transport strictness, and rate limits.
- See everything: a live call log, a SIP trace, and call recordings you can
  download.
- Automate it: drive everything over a REST API and a CLI, with an auto-answer
  bot and webhooks for continuous integration.

## Quickstart

Prerequisites: Docker and Docker Compose.

```bash
git clone <repository-url> switchboard
cd switchboard
docker compose up
```

This starts three containers: the Asterisk engine, the control-plane API, and the
web dashboard, from their published images. When it is up, open the dashboard at
the address printed on startup (served by `switchboard-web`), create a trunk, and
point your SIP application at the endpoint and credentials the dashboard shows
you.

New here? Follow [Your first call](first-call.md) for a step-by-step walkthrough
of making and receiving a call between the dashboard and your own SIP application.

## Configure servers without the dashboard

You can pre-configure SIP servers from the Compose environment, which is useful
for continuous integration. This example seeds two servers and enables recording:

```yaml
services:
  switchboard-api:
    environment:
      SWITCHBOARD_RECORD_ALL: "false"
      SWITCHBOARD_RECORDINGS_DIR: /data/recordings
      SWITCHBOARD_SIP_SERVERS: >
        [
          { "name": "agent-dev", "host": "host.docker.internal", "port": 5060,
            "transport": "udp", "authMode": "none" },
          { "name": "carrier-sim", "host": "10.0.0.5", "port": 5061,
            "transport": "tls", "authMode": "digest",
            "username": "sw", "password": "secret", "techPrefix": "9011" }
        ]
    volumes:
      - ./recordings:/data/recordings
```

## Guides

These fill in as features are built. Each is first-class and example-driven. The
label in parentheses is the implementation feature that delivers it (see the
[developer roadmap](../dev/roadmap.md)).

- [Your first call](first-call.md): a step-by-step walkthrough of making and
  receiving a call between the dashboard and your own SIP application (for
  example LiveKit), inbound and outbound.
- [Running with Docker](running-with-docker.md): `docker compose up`, the dev
  override, and no-audio troubleshooting (feature 6).
- [Using Switchboard](using-switchboard.md): trunks (quick add and the full form),
  numbers, placing and receiving calls, the call log and SIP trace, recordings, and
  settings, with dashboard steps and `curl` examples (features 10 to 25).
- Environment configuration: every `SWITCHBOARD_*` variable with examples
  (feature 13, and settings in feature 25); see the Docker guide above.
- Fault injection: reproduce carrier failures on demand (features 26 and 27).
- REST API reference: the API is self-documenting. Interactive Swagger UI is
  served at `/api/docs` and the raw OpenAPI 3 spec at `/api/v1/openapi.json` (both
  reachable through the dashboard), so you can explore, try calls, and generate a
  client. This guide adds copy-paste `curl` examples for the common flows
  (features 4 and 28).
- CLI reference: every command with examples (feature 29).
- Recipes: copy-paste setups for common SIP and voice-agent stacks (feature 32).
- Troubleshooting: no audio, one-way audio, and registration problems
  (feature 33).
