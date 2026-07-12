# Running Switchboard with Docker

The only supported way to run Switchboard, in development and in production,
is `docker compose up` from the repository root. This guide walks through
what starts, where to point your browser, how the development variant
differs, and what to check if calls connect but you cannot hear anything.
See the [developer notes on the three images](../dev/containers.md) for how
they are built, if you are curious or something needs changing.

Acronyms, expanded on first use: RTP is the Real-time Transport Protocol (the
audio stream). NAT is Network Address Translation, the address rewriting
routers and Docker perform. SIP is the Session Initiation Protocol.

## Prerequisites

Docker and Docker Compose. Nothing else — no Node.js, no Asterisk, no
database to install.

## Start it

```bash
git clone <repository-url> switchboard
cd switchboard
docker compose up
```

This builds (the first time; cached after that) or pulls three containers
and starts them together:

- `switchboard-engine` — the Asterisk-based fake carrier: SIP signaling, the
  audio bridge, and the browser softphone's WebRTC (Web Real-Time
  Communication) endpoint.
- `switchboard-api` — the control plane: the REST API, the SQLite database,
  and the connection to the engine.
- `switchboard-web` — the dashboard and the browser softphone.

Once the logs settle, open the dashboard:

```text
http://localhost:8080
```

That is the one address you need. The dashboard's own nginx server proxies
API and event-stream traffic to `switchboard-api` for you, so nothing else
needs to be reachable directly — except the browser softphone's audio
signaling, which talks to the engine's own port, `8088`, straight from your
browser (that port is published on your machine too; you never type it into
anything, but it does need to be free).

Stop everything with `Ctrl-C`, or from another terminal:

```bash
docker compose down
```

Add `-v` to also delete the named volumes (the SQLite database and any
recordings), for a clean-slate restart:

```bash
docker compose down -v
```

## The development variant

If you cloned the full source repository (as opposed to just downloading
`docker-compose.yml` on its own), plain `docker compose up` also picks up
`docker-compose.override.yml`, which sits right next to it — this is Docker
Compose's own convention for merging an override file automatically, not
something you have to ask for. Under the override, `switchboard-api` and
`switchboard-web` run from your live source with hot reload instead of the
built images, and the dashboard's dev server is reachable directly at
`http://localhost:5173` (Vite's own dev server, with hot module reload) in
addition to `http://localhost:8080`.

To skip the override and run the built images from a full checkout:

```bash
docker compose -f docker-compose.yml up
```

## Configure trunks from the environment (useful for CI)

You can pre-create SIP servers without touching the dashboard, which is
handy in continuous integration. Add to `docker-compose.yml`'s
`switchboard-api` service (or override it in a
`docker-compose.override.yml` of your own):

```yaml
services:
  switchboard-api:
    environment:
      SWITCHBOARD_SIP_SERVERS: >
        [
          { "name": "agent-dev", "host": "host.docker.internal", "port": 5060,
            "transport": "udp", "authMode": "none" }
        ]
```

See the [user guide's list of guides](README.md) for the environment
configuration reference (feature 13), once it lands, for the full field set.

## Troubleshooting: no audio, or one-way audio

This is the single most common problem with any SIP-plus-Docker setup, and
it is almost always the same root cause: the engine advertised an address
for its audio (RTP) stream that the other side cannot actually reach.
Symptoms:

- The call connects (you see it ring and answer) but you hear nothing in
  either direction.
- You can hear one side but not the other ("one-way audio").

What to check, in order:

1. **The RTP port range must be published and match the engine's config.**
   `docker-compose.yml` publishes `10000-10099/udp` for `switchboard-engine`
   and sets `SWITCHBOARD_RTP_START`/`SWITCHBOARD_RTP_END` to the same
   values, which the engine renders into `rtp.conf`'s `rtpstart`/`rtpend` at
   container start. If you changed one of these three without changing the
   other two, audio breaks. Keep them identical (see
   [containers.md](../dev/containers.md) for exactly where each one lives).
2. **The advertised address must be reachable by the browser.**
   `SWITCHBOARD_ADVERTISED_ADDRESS` (default `127.0.0.1`) is what the engine
   tells the far end to send audio to. The default is correct for the
   sandbox's whole story — the far end is always the browser on the same
   machine — so you should only need to change this if you are deliberately
   reaching the engine from a different device on your network, in which
   case set it to this machine's LAN IP address instead.
3. **Something else is already using a port Switchboard needs.** `8088` (SIP
   signaling and ARI) or the RTP range might be held by another process
   (another Asterisk, another Switchboard instance, or a stale container).
   `docker compose down` any stale stack first, and check
   `lsof -i :8088` (macOS/Linux) if the port still will not bind.
4. **On Linux**, prefer host networking for the engine
   (`network_mode: host`, see [containers.md](../dev/containers.md)'s
   Linux/macOS/Windows split) rather than published ports — it sidesteps
   Docker's NAT for RTP entirely and is the more reliable option when it is
   available to you.

If you are still stuck, the dashboard's live call log and SIP trace (once
those features land) show exactly what codec was negotiated and what each
leg reported, which narrows this down far faster than guessing.

## Explore the API

The control plane is self-documenting. From the dashboard's origin (so no
extra configuration is needed):

- Interactive Swagger UI: `http://localhost:8080/api/docs`
- The raw OpenAPI 3 document: `http://localhost:8080/api/v1/openapi.json`
- A quick health check: `curl http://localhost:8080/api/v1/health`
