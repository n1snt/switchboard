# Switchboard roadmap

This project is built with AI assistance, so the plan is organized by capability
and dependency order, not by how long each piece would take a human team. Code
gets written quickly; what still matters is the order, because later capabilities
depend on earlier ones, and because one early risk must be retired before any
feature work.

Acronyms: SIP is the Session Initiation Protocol. RTP is the Real-time Transport
Protocol (the audio stream). NAT is Network Address Translation. CLI is a
command-line interface. CI is continuous integration, the practice of running
tests automatically on every code change.

## The one risk that fast coding does not remove

The hardest part of Switchboard is getting clean two-way audio through the engine
over WebRTC and RTP, across the network address translation that Docker performs.
This is a networking and configuration problem, not a volume-of-code problem, so
generating code quickly does not make it any easier. It must work before feature
work begins.

For that reason there is no separate "prove the pipe" milestone anymore. Instead,
a two-way-audio walking skeleton (two browser tabs calling each other through the
engine) is the first task and the first acceptance gate of Milestone 1. If audio
does not flow cleanly there, nothing downstream matters.

## Testing requirement (applies to every milestone)

Every milestone ships with its tests, not tests added later.

- 100% test coverage is enforced in CI on the TypeScript packages (the control
  plane, the shared contract, the CLI, and the web app logic). A milestone is not
  done if coverage drops below 100%.
- The engine and media paths (Asterisk, RTP, WebRTC) are proven by integration
  tests that run against a real engine, since a line-coverage number is
  meaningless there. Each call-handling milestone adds the integration tests that
  exercise its flows end to end.

## M1: calls in both directions

Goal: place and receive real audio calls. This merges the two headline features,
because with AI assistance they are one chunk of work, not two milestones.

- **Walking skeleton first**: two browser tabs call each other through the engine
  with clean two-way audio. This is the acceptance gate before anything else in
  M1.
- **Receive a call (outbound trunk)**: create an outbound trunk in the dashboard,
  read back its endpoint and credentials, point any SIP sender at it, and have
  the call ring the web softphone with two-way audio on accept.
- **Make a call (inbound trunk and numbers)**: create phone numbers, assign each
  to an inbound trunk pointed at your system's SIP endpoint, dial a number from
  the softphone, and have Switchboard deliver the call to your system.

When M1 is done, Switchboard is a genuinely useful tool on its own.

## M2: observability

Goal: understand why a call did what it did, from the dashboard alone.

- A call log with state transitions, timestamps, negotiated codec, and hangup
  cause.
- A live SIP trace and call-ladder diagram.
- A call-event stream over WebSocket.

This is the feature most likely to earn attention from other developers, because
telephony debugging is otherwise painful.

## M3: fault injection

Goal: reproduce the ugly parts of real carriers on demand.

- Transport strictness, for example TCP-only with silent dropping of other
  transports.
- Custom rejection codes and asynchronous rejection timing.
- No-answer timeouts and slow answers.
- One-way and silent audio.
- Forced codecs.
- Calls-per-second caps.

See the fault profiles in [data-model.md](data-model.md).

## M4: automation

Goal: usable in automated tests without a human.

- REST application programming interface and a CLI to manage trunks and numbers
  and to place calls.
- An auto-answer bot: a scripted far-end that answers and can play audio for CI.
- Webhooks for call events.

## M5: polish and ship

Goal: a first public release.

- One-command quickstart.
- Documentation and copy-paste recipes for common SIP and voice-agent stacks.
- Cross-platform verification of the media path on Linux, macOS, and Windows.
