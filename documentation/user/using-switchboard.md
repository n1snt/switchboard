# Using Switchboard: trunks, numbers, calls, and the call log

This guide covers the everyday workflow once Switchboard is running: connecting a
system-under-test with a trunk, giving it a phone number, placing and receiving
calls from the browser softphone, and reading the call log. Every dashboard action
is also available over the REST (Representational State Transfer) API, which is
self-documenting, so this guide shows both.

Acronyms, expanded on first use: SIP is the Session Initiation Protocol (call
signaling). DID is a Direct Inward Dialing number (an ordinary phone number).
E.164 is the international phone-number format, for example `+14155550123`. API is
an application programming interface. JSON is JavaScript Object Notation.

Prerequisites: Switchboard is running (see
[running with Docker](running-with-docker.md)). The dashboard is at the address
printed on startup (by default `http://localhost:8080`). The examples below call
the API through that same origin, so no separate address or cross-origin setup is
needed.

## The self-documenting API

The API describes itself. Interactive documentation (Swagger UI) is at
`/api/docs`, and the machine-readable OpenAPI 3 document is at
`/api/v1/openapi.json`. Everything the dashboard does is there, so you can explore
and try each endpoint, or generate a client from the specification. All routes live
under `/api/v1`; errors always come back as
`{ "error": { "code": ..., "message": ... } }`.

## 1. Create a trunk (connect your system)

A trunk is the connection between Switchboard and your system-under-test, with its
own address and credentials, exactly as a real carrier would hand you.

In the dashboard, open **Trunks**. Use **Quick add** for the common case (a name
and an address, no authentication):

- Name: `agent-dev`
- Address: `host.docker.internal:5060`

For provider-style options (authentication, transport, codecs, dial rewriting,
limits), use **New** and open the relevant sections of the Advanced form. Trunks
seeded from the environment show an "env" badge and reset on restart.

The same over the API:

```bash
curl -X POST http://localhost:8080/api/v1/trunks \
  -H 'content-type: application/json' \
  -d '{ "name": "agent-dev", "target_host": "host.docker.internal", "target_port": 5060 }'
```

The response includes the trunk's `id` and the defaults it was given. List trunks
with `curl http://localhost:8080/api/v1/trunks`.

## 2. Give it a number

A number (DID) is what the softphone dials to reach your system. Open **Numbers**,
enter an E.164 value, and pick the inbound trunk that delivers it. The trunk must
exist and carry inbound calls.

```bash
curl -X POST http://localhost:8080/api/v1/numbers \
  -H 'content-type: application/json' \
  -d '{ "e164": "+14155550123", "trunk_id": "<trunk id from step 1>" }'
```

## 3. Place and receive calls

Open **Phone**. To **place a call** (your system's inbound direction), pick a
destination (a dialable trunk, a saved number, or an ad-hoc SIP URI), optionally
key in digits, and press Call. On answer the screen becomes the in-call view and
the docked call bar activates on every screen, with mute, hold, a keypad for
touch-tones, a record toggle, and end.

To **receive a call** (your system's outbound direction), point any SIP sender at a
trunk. A compact incoming-call card slides in at the top-right (it never takes over
the screen); Accept connects with two-way audio, Decline rejects it. The dashboard
always uses plain language ("Place a call", "Incoming call", "Placed", "Received")
and never shows inbound or outbound for a live call.

## 4. Read the call log

Open **Call log** for a live-updating table of every call: whether it was Placed or
Received, the party, the trunk, the state, duration, and hangup cause. Filters
(direction, trunk, state, date range) live in the URL, so a filtered view is
shareable and survives reload.

```bash
# Calls the softphone received, most recent first:
curl 'http://localhost:8080/api/v1/calls?direction=received&limit=20'
```

Select a call for its detail: the state timeline, the negotiated media, the hangup
cause, and a SIP trace rendered as a call-ladder diagram, so you can see exactly
why a call behaved the way it did without a separate packet capture.

## 5. Recordings

Recording is decided most-specific-first: the per-call Record toggle in the in-call
interface, then the per-trunk default, then the global "record all calls" setting
(or the `SWITCHBOARD_RECORD_ALL` environment variable). A finished recording shows
an inline player and a Download button on the call row and in the call detail; the
file streams from `/api/v1/calls/<id>/recording`.

## 6. Settings

Open **Settings** for four tabs: Recording (the record-all toggle and storage
directory), Engine (whether the control plane is connected to the engine and the
advertised media address), Environment (a read-only list of items seeded from the
environment), and Credentials (a copyable overview of every trunk's address and
credentials).

## Pre-configure without the dashboard

For automated and continuous-integration use, trunks can be seeded from
`SWITCHBOARD_SIP_SERVERS` at boot (see
[running with Docker](running-with-docker.md) for the full example), so an instance
comes up ready with no clicking. Environment-seeded trunks are re-applied on every
restart, so the environment is their source of truth.
