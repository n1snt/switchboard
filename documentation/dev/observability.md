# Switchboard calls and observability (Part D and Part E runtime)

This document describes how a call is actually run and observed at runtime: the
call coordinator that turns an incoming channel into a bridged, recorded,
traced call (implementation.md features 16, 17, 23, and 24). It is the runtime
companion to [control-plane.md](control-plane.md) (the foundations) and
[engine-provisioning.md](engine-provisioning.md) (how a trunk becomes a live
endpoint).

Acronyms, expanded on first use: ARI is the Asterisk REST Interface. SIP is the
Session Initiation Protocol. RTP is the Real-time Transport Protocol (audio).
DID is a Direct Inward Dialing number. WAV is the Waveform Audio File format.

## The call coordinator

`apps/server/src/ari/coordinator.ts` owns the choreography for every call. A
caller channel enters the Stasis application, the coordinator plans the call,
answers the caller, creates a mixing bridge, originates the callee leg back into
Stasis, bridges the two legs, and publishes the lifecycle on the event bus. Both
call directions share this one choreography; only the plan differs.

### Who is calling, and what did they dial

The coordinator reads three things off the caller's channel:

- The dialed target, from the channel's dialplan extension
  (`channel.dialplan.exten`). The dialplan (`engine/config/extensions.conf`)
  routes every dial into Stasis and does no routing of its own.
- The dialplan context (`channel.dialplan.context`). A call entering from the
  trunk context (`switchboard-trunk`) is a system-under-test call even when the
  trunk itself cannot be identified (an anonymous `none`-auth INVITE), which is
  what keeps such a call from being misread as a softphone dial.
- The caller's PJSIP endpoint, parsed from the channel name
  (`endpointFromChannelName`, e.g. `PJSIP/1001-00000abc` gives `1001`), used to
  identify which trunk a call arrived on when it can be matched.

A call is treated as a trunk call when its context is the trunk context or its
endpoint matches a provisioned trunk; that selects the direction (see
[data-model.md](data-model.md), "Direction, defined"):

- **Trunk caller: outbound** (feature 16). The system-under-test placed a call
  that arrived on one of its trunks. The coordinator matches an outbound route
  (`matchRoute`) to a destination, defaulting to the browser softphone, and
  rings it. The trunk id is recorded when identifiable, else null.
- **Softphone caller: inbound** (feature 17). The browser placed the call. The
  coordinator resolves what was dialed (`planOutgoing` in `calls/dialing.ts`): a
  saved number is sent through its inbound trunk with the trunk's dial rewrite
  applied, a trunk name is dialed through that trunk, a `sip:` URI is dialed
  as-is, and anything else is a bare endpoint (the browser-to-browser walking
  skeleton, feature 9).

The pure decision is `planCall` in `calls/call-plan.ts`; it returns the
direction, the parties, the trunk, the callee endpoint to originate, and whether
to record. Keeping it pure makes both directions exhaustively unit-testable; the
coordinator only performs the resulting ARI operations.

### The softphone endpoint

An inbound trunk call rings the browser at the `SOFTPHONE_ENDPOINT` constant
(`1001`, a static WebRTC endpoint in `engine/config/pjsip.conf.template`). An
explicit outbound route may name a different destination for testing.

### Negotiated codec

Once both legs are bridged, the coordinator reads the callee channel's
`CHANNEL(audionativeformat)` over ARI (`ops.getChannelVar`), normalizes it to a
codec name, and records it on the call, so the call log and detail show the codec
the engine actually negotiated. The read is best-effort: an unset or unreadable
value simply leaves the codec null.

## SIP trace capture (feature 23)

The call detail endpoint reads a call's SIP ladder from an in-memory store
(`calls/trace-store.ts`); `SipTraceCapture` (`calls/sip-trace-capture.ts`) fills
it at runtime. It is an event-bus subscriber: when a call is created it opens a
buffer, and when the call ends it parses the buffered text
(`sip-trace-parser.ts`) into the store.

The raw text is Asterisk's PJSIP message log, tailed off the shared log volume by
`ari/pjsip-log-source.ts` and fed in with `feed()`. The engine side is:

- `engine/config/logger.conf` writes the log to `/var/log/asterisk/messages`.
- `engine/docker-entrypoint.sh` turns the PJSIP logger on at start, so the
  `<--- Received/Transmitting SIP ... --->` frames actually reach it.
- `docker-compose.yml` shares `/var/log/asterisk` (volume `switchboard-pjsip-log`)
  with the API read-only and points `SWITCHBOARD_PJSIP_TRACE_FILE` at the file.

When `SWITCHBOARD_PJSIP_TRACE_FILE` is unset (bare local dev), capture is inert
and traces stay empty; the pipeline is otherwise unchanged.

**Per-dialog attribution.** The parser extracts each message's `Call-ID` header,
and the coordinator registers each leg's SIP Call-ID with the capture (read from
the channel over ARI, alongside the codec). At commit the ladder is filtered to
the call's own dialogs, so concurrent calls no longer share each other's
messages. When no Call-ID has been registered for a call (for example the engine
did not surface one), it falls back to attributing the whole window, which is
correct in the single-user localhost sandbox where one call runs at a time.

## Recording (feature 24)

`resolveRecordEnabled` decides most-specific-first: the per-call toggle, then the
per-trunk default (`trunks.record`), then the global setting or
`SWITCHBOARD_RECORD_ALL`. At call setup `planCall` resolves the per-trunk and
global levels; the per-call level is applied live, below.

When a call should be recorded, the coordinator records the mixing bridge over
ARI once both legs are bridged (`startBridgeRecording`), writing `<call-id>.wav`,
and stops it on hangup (`stopRecording`). The engine writes the file to
`/var/spool/asterisk/recording`, shared with the API at `/app/recordings`
(`SWITCHBOARD_RECORDINGS_DIR`), so the download route
(`GET /api/v1/calls/:id/recording`) streams it back with a path-traversal guard.

**The in-call Record toggle** (per-call) reaches the running call over
`PUT /api/v1/calls/:id/recording` with `{ enabled }`. The route calls
`CallService.setRecording`, which delegates to whichever coordinator is currently
connected (`LiveRecordingControl`, wired in `server.ts`): the coordinator looks
the call up by id, starts or stops the bridge recording, and republishes the call
so the log reflects the change. It returns 404 for an unknown call and 409 for a
call that has already ended (nothing live to record).

## Connecting an external SIP app (for example a LiveKit SIP service)

Switchboard plays the carrier; the app under test is the far end. Direction is
named from the app's point of view, matching how the app names its own trunks:

- **The app receives a call** (inbound to it): the browser softphone places it,
  Switchboard delivers it out the trunk to the app's SIP endpoint. Create a
  trunk with `direction: inbound` (or `both`) and `target_host`/`target_port`
  pointing at the app's SIP listener, plus a Number assigned to it; dial that
  number from the dashboard's Phone screen.
- **The app places a call** (outbound from it): the app dials out through a trunk
  whose address is Switchboard's engine, the INVITE arrives on that trunk, and
  Switchboard rings the browser softphone. Create a trunk with
  `direction: outbound` (or `both`); the app's outbound trunk points at the
  engine's SIP port.

Two things have to line up for this to work:

1. **Reachability.** The engine publishes SIP on port 5060 (UDP and TCP) and the
   RTP media range (`docker-compose.yml`). An app on the same Docker network
   dials the engine by service name; an app crossing the host boundary uses the
   published ports, and `SWITCHBOARD_ADVERTISED_ADDRESS` must be an address the
   app can route back to for audio (the default `127.0.0.1` only works when the
   far end is on this host). A wrong advertised address is the classic one-way or
   no-audio failure.

2. **Trunk identification.** A call from the trunk context is always handled as
   an inbound-to-your-app (outbound-direction) call, even anonymously. To also
   attribute it to a specific trunk (so the call log shows the trunk, and its
   per-trunk recording default applies), the sender must be identifiable: use
   `auth_mode: digest` (matched by username) or `auth_mode: ip` (matched by
   source address, provisioned as an `identify` row from the trunk's
   `allowed_ips`; see [engine-provisioning.md](engine-provisioning.md)).
   `auth_mode: none` still connects, but the call records no trunk id.

## Verification

The coordinator, the trace capture, the record decision, and the ARI operations
wrapper are unit-tested to the project's 100% threshold with a mock of the
`AriOperations` interface, a fake `CallDirectory`, and plain PJSIP log text. Per
CLAUDE.md, the media and signaling paths themselves (two-way audio, a real
recording file, a real SIP ladder from the engine log) are proven only by a real
call against a running engine, not by those unit tests; that end-to-end check is
the acceptance step for these features.
