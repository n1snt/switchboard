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

The coordinator reads two things off the caller's channel:

- The dialed target, from the channel's dialplan extension
  (`channel.dialplan.exten`). The dialplan (`engine/config/extensions.conf`)
  routes every dial into Stasis and does no routing of its own.
- The caller's PJSIP endpoint, parsed from the channel name
  (`endpointFromChannelName`, e.g. `PJSIP/1001-00000abc` gives `1001`). If that
  endpoint matches a provisioned trunk's id, the call arrived on a trunk;
  otherwise the browser softphone is the caller.

That single distinction selects the direction (see
[data-model.md](data-model.md), "Direction, defined"):

- **Trunk caller: outbound** (feature 16). The system-under-test placed a call
  that arrived on one of its trunks. The coordinator matches an outbound route
  (`matchRoute`) to a destination, defaulting to the browser softphone, and
  rings it.
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

### Not captured yet

The negotiated codec is not read from the channel, so `calls.codec` is left null
by the coordinator; the in-call interface still shows the codec the browser's own
SIP.js session negotiated. Reading it server-side is a follow-up that needs an
ARI channel-variable read, verified against a live engine.

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

**Single-call-window attribution.** The parser works on a whole block of text
and the log is not split by SIP Call-ID, so a live call is attributed every
message logged during its window. In the single-user localhost sandbox (CLAUDE.md,
"First version scope") a call at a time is the norm; concurrent calls share the
window's text. Per-call correlation is a later refinement.

## Recording (feature 24)

`resolveRecordEnabled` decides most-specific-first: the per-call toggle, then the
per-trunk default, then the global setting or `SWITCHBOARD_RECORD_ALL`. Only the
global level is wired at runtime today (the per-call and per-trunk levels have no
storage or transport yet); the decision function already takes all three so the
other levels drop in without a change here.

When a call should be recorded, the coordinator records the mixing bridge over
ARI once both legs are bridged (`startBridgeRecording`), writing
`<call-id>.wav`, and stops it on hangup (`stopRecording`). The engine writes the
file to `/var/spool/asterisk/recording`, shared with the API at `/app/recordings`
(`SWITCHBOARD_RECORDINGS_DIR`), so the download route
(`GET /api/v1/calls/:id/recording`) streams it back with a path-traversal guard.

## Verification

The coordinator, the trace capture, the record decision, and the ARI operations
wrapper are unit-tested to the project's 100% threshold with a mock of the
`AriOperations` interface, a fake `CallDirectory`, and plain PJSIP log text. Per
CLAUDE.md, the media and signaling paths themselves (two-way audio, a real
recording file, a real SIP ladder from the engine log) are proven only by a real
call against a running engine, not by those unit tests; that end-to-end check is
the acceptance step for these features.
