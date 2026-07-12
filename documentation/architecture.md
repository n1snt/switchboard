# Switchboard architecture

This document describes how Switchboard is put together, the technology choices
behind it, how audio flows, and the two core call paths.

Acronyms used here: SIP is the Session Initiation Protocol (call signaling). RTP
is the Real-time Transport Protocol (the actual audio stream). WebRTC is Web
Real-Time Communication (browser-native audio). DTMF is Dual-Tone
Multi-Frequency, the touch-tone digits from a phone keypad. NAT is Network
Address Translation, the address rewriting that routers and Docker perform. E.164
is the international standard format for phone numbers, for example
`+14155550123`.

## Design goals

- One command to start: `docker compose up`.
- Nothing external to install or configure. Storage is a local file.
- Accept any credentials by default, so first contact just works, with optional
  strict modes for realistic testing.
- Reproduce real carrier behavior, including the failure modes, not just the
  happy path.

## Components

Switchboard is two containers.

### 1. `switchboard-engine` (Asterisk)

This is the SIP signaling stack, the audio bridge, and the browser-facing WebRTC
endpoint. It is what behaves like a real carrier on the wire and connects the two
legs of every call.

It holds almost no static configuration. The control application programs it at
runtime through the Asterisk REST Interface (ARI), creating and removing
endpoints and bridging calls as trunks and routes change in the dashboard.

Why Asterisk: it provides mature browser calling over secure WebSockets, built-in
audio bridging, DTMF handling, and a clean REST control surface, all in a single
container. This avoids writing a SIP stack from scratch, which is a multi-year
effort and the wrong place to spend energy for a developer tool. FreeSWITCH, or a
combination of Kamailio and rtpengine, are viable alternatives, but Asterisk
gives the most working behavior out of the box.

### 2. `switchboard-app` (Node.js with TypeScript, plus a React with TypeScript frontend)

This is the part a developer interacts with. It bundles three things.

- The admin dashboard: create trunks and numbers, view and copy credentials,
  define routes, and watch live calls.
- The web softphone: the browser dial pad that plays the far-end human. It talks
  directly to the engine over a secure WebSocket for audio, using the SIP.js
  library.
- The control plane: a REST (Representational State Transfer) application
  programming interface plus a WebSocket event stream, backed by SQLite so there
  is nothing external to install. It translates dashboard actions into engine
  configuration and reads call state back out.

Because the first version is single-user on localhost, the application binds to
the local loopback address `127.0.0.1` and does not implement authentication.

### Container diagram

```
                          your machine (localhost)
  +-------------------------------------------------------------------+
  |                                                                   |
  |   Browser                                                         |
  |   +---------------------------+                                   |
  |   |  Switchboard web app      |                                   |
  |   |  - admin dashboard        |  REST + WebSocket (control/events)|
  |   |  - web softphone (SIP.js) |----------------------+            |
  |   +------------+--------------+                       |            |
  |                |  secure WebSocket (SIP + audio)      |            |
  |                v                                      v            |
  |   +---------------------------+        +----------------------------+
  |   |  switchboard-engine       |        |  switchboard-app           |
  |   |  (Asterisk)               |<------>|  (Node.js control plane)   |
  |   |  - SIP signaling          |  ARI   |  - REST API + WS events    |
  |   |  - audio bridge           |        |  - SQLite store            |
  |   |  - WebRTC endpoint        |        +----------------------------+
  |   +------------+--------------+                                    |
  |                | SIP over UDP/TCP/TLS + RTP audio                  |
  +----------------|--------------------------------------------------+
                   v
        your system-under-test
        (voice agent or SIP application)
```

## The media and networking model

This is the one genuinely hard part and is worth stating plainly. SIP audio (RTP)
combined with container networking is the classic source of "the call connects
but there is no sound" problems. The cause is that the engine advertises an IP
address for the audio stream, and that address has to be reachable by whoever is
sending audio.

- On Linux, the engine container runs with host networking and this works
  directly.
- On macOS and Windows, Docker cannot use host networking cleanly, so Switchboard
  publishes a bounded RTP port range and sets the engine's advertised address
  explicitly. Keeping the browser-to-engine media path effectively local avoids
  the worst of the NAT problems.

Getting a clean two-way-audio "hello world" is the real first risk of the
project, ahead of any dashboard work. It is milestone zero in
[roadmap.md](roadmap.md) for that reason.

## Trust and credentials

A trunk in Switchboard supports the same trust models a real carrier uses. Each
trunk picks one:

- None: accept any request. This is the default so first contact just works.
- Digest: a username and password, using SIP digest authentication.
- IP allowlist: trust based on the source IP address of the sender.

Switchboard accepts any credentials you enter, rather than validating them
against an external system. The strict modes exist to let you test that your own
system sends the right credentials and originates from the right address.

## Reproducing real carrier behavior

Real carriers are not clean pipes. Switchboard can reproduce their rough edges on
demand, which is what makes it useful beyond a simple echo test. These are
configurable per trunk or per route:

- Transport strictness. Some carriers accept only TCP (Transmission Control
  Protocol) for signaling and silently drop calls sent over UDP (User Datagram
  Protocol). A dropped call surfaces as a setup timeout roughly 32 seconds later
  rather than a clean rejection. Switchboard can be set to "TCP only, drop
  everything else silently" to reproduce this.
- Dial-string rewriting. Carriers often require a technical prefix or a specific
  number format. A per-trunk rewrite rule lets you catch formatting bugs locally.
- Asynchronous rejections. Rejections such as busy, unreachable, or declined
  frequently arrive after the call is already in progress rather than
  synchronously at setup time. Switchboard can reproduce that timing so retry and
  error-handling logic gets exercised.
- Rate limiting. A calls-per-second cap per trunk lets you test throttling and
  backoff.
- Codec selection. Force a specific audio codec (for example PCMU, PCMA, G.722,
  or Opus) to test negotiation and compatibility.
- Media faults. Inject one-way audio, a delayed answer, or a no-answer timeout.

## Observability

Because debugging telephony is painful without visibility, the dashboard shows:

- A live call log with state transitions, timestamps, the negotiated codec, and
  the hangup cause.
- A live SIP trace and call-ladder diagram, so you can see exactly why a call
  failed without reaching for separate packet-capture tools.
- A call-event stream over WebSocket that other tools can subscribe to.

## Automation

For use in automated tests and continuous integration (the practice of running
tests automatically on every code change), Switchboard exposes:

- The REST API and a command-line interface (CLI) to create trunks and numbers
  and to place calls without the dashboard.
- An auto-answer bot: a scripted far-end that answers automatically and can play
  audio, so tests do not need a human clicking accept.
- Webhooks, meaning outbound HTTP callbacks that notify your system when call
  events occur.

## Call flows

There are two core flows. In both, "your system" is the SIP application or voice
agent being tested, and "softphone" is the Switchboard browser phone.

### Outbound: your system places a call to a phone

This is the "receive a call in the browser" story.

```
your system            switchboard-engine           softphone (browser)
    |                          |                            |
    | INVITE (dial +1...) ----->|  (auth on outbound trunk) |
    |                          |                            |
    |                          |-- match route: number ---> |
    |                          |    to web softphone        |
    |                          |------ ring the phone ----->|
    |                          |                            |
    |                          |<----- user clicks accept --|
    |<----- 200 OK ------------|                            |
    | ACK -------------------->|                            |
    |=== two-way audio (RTP) ==|=== audio (WebRTC) =========|
```

Steps: your system sends a call setup request (an INVITE) to Switchboard's
outbound trunk, authenticating with the credentials the dashboard gave you.
Switchboard matches the dialed number to a route and rings the web softphone. You
click accept and talk. Audio is bridged in both directions.

### Inbound: a phone calls your system

This is the "call your agent from the browser" story.

```
softphone (browser)      switchboard-engine            your system
    |                          |                            |
    | dial a number ---------->|                            |
    |                          |-- look up number --------->|
    |                          |   find its inbound trunk   |
    |                          |------ INVITE to your ------>|
    |                          |       system's SIP endpoint |
    |                          |<----- 200 OK --------------|
    |<----- call answered -----|                            |
    |=== audio (WebRTC) =======|=== two-way audio (RTP) ====|
```

Steps: you dial a phone number in the softphone. Switchboard looks up that
number, finds the inbound trunk it is assigned to, and sends the call to your
system's SIP endpoint, exactly as a carrier would deliver an inbound call. Your
system answers and you talk to it.
