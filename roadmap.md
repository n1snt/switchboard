# Switchboard roadmap

The plan moves from a single proven audio path to a polished, automatable
release. Each milestone is independently useful, and the tool becomes worth using
as early as milestone two.

Acronyms: SIP is the Session Initiation Protocol. RTP is the Real-time Transport
Protocol (the audio stream). NAT is Network Address Translation. CLI is a
command-line interface. CI is continuous integration, the practice of running
tests automatically on every code change.

## M0: prove the pipe

Goal: a clean two-way-audio call between two browser tabs.

- Docker Compose file starting the engine and the app.
- The web softphone registers with the engine.
- A call from one browser tab to another connects with two-way audio.

Why first: this retires the biggest technical risk, which is media and NAT, not
the dashboard. If audio does not flow cleanly here, nothing else matters.

## M1: receive a call (outbound trunk)

Goal: your system places a call and it rings the browser.

- Create an outbound trunk in the dashboard and read back its endpoint and
  credentials.
- Point any SIP sender at that trunk.
- A call from that sender rings the web softphone, with two-way audio on accept.

This is one of the two headline features.

## M2: make a call (inbound trunk and numbers)

Goal: the browser places a call and your system receives it.

- Create phone numbers and assign each to an inbound trunk pointed at your
  system's SIP endpoint.
- Dial a number from the softphone.
- Switchboard delivers the call to your system.

This is the other headline feature. With M0 through M2 done, Switchboard is a
genuinely useful tool on its own.

## M3: observability

Goal: understand why a call did what it did, from the dashboard alone.

- A call log with state transitions, timestamps, negotiated codec, and hangup
  cause.
- A live SIP trace and call-ladder diagram.
- A call-event stream over WebSocket.

This is the feature most likely to earn attention from other developers, because
telephony debugging is otherwise painful.

## M4: fault injection

Goal: reproduce the ugly parts of real carriers on demand.

- Transport strictness, for example TCP-only with silent dropping of other
  transports.
- Custom rejection codes and asynchronous rejection timing.
- No-answer timeouts and slow answers.
- One-way and silent audio.
- Forced codecs.
- Calls-per-second caps.

See the fault profiles in [data-model.md](data-model.md).

## M5: automation

Goal: usable in automated tests without a human.

- REST application programming interface and a CLI to manage trunks and numbers
  and to place calls.
- An auto-answer bot: a scripted far-end that answers and can play audio for CI.
- Webhooks for call events.

## M6: polish and ship

Goal: a first public release.

- One-command quickstart.
- Documentation and copy-paste recipes for common SIP and voice-agent stacks.
- Cross-platform verification of the media path on Linux, macOS, and Windows.
