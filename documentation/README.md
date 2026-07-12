# Switchboard

Switchboard is a local telephony sandbox for SIP and voice application
development. It is an open-source, self-hostable tool that stands in for a real
phone carrier so you can place and receive calls on your own machine without a
real phone number, a carrier account, or a deployment.

Note: SIP means Session Initiation Protocol, the signaling protocol used to set
up and tear down voice calls. PSTN means the Public Switched Telephone Network,
the real-world phone network. Other acronyms are expanded the first time they
appear in these docs.

## What it is, in one line

Switchboard is to phone calls what LocalStack is to cloud services and what
Mailpit is to email: a fake version of the external system you would otherwise
need a paid account and a live environment to test against.

## The mental model

A real telephony setup relies on three things your laptop cannot easily provide:

1. A carrier, also called a SIP trunk provider (for example Twilio, Telnyx,
   Plivo, or any regional carrier). It gives you a connection endpoint,
   credentials, and phone numbers, and it carries calls to and from the real
   phone network.
2. The far-end phone, meaning the actual human on the other side of the call.
3. Phone numbers to route calls on.

Switchboard emulates all three. Your system-under-test (any SIP or voice-agent
stack) points its SIP trunk at Switchboard instead of at a real carrier.
Switchboard hands out credentials exactly like a carrier would, and its built-in
web softphone plays the role of the human on the far end.

In short:

```text
Switchboard = fake carrier + fake far-end phone + an admin panel over both
```

## What you can do with it

- Point your voice agent or SIP application at a local trunk and make real audio
  calls to it, and from it, with no external dependencies.
- Get a SIP endpoint, username, and password from a dashboard, the same way a
  real carrier onboarding would give them to you.
- Create trunks, phone numbers, and routing rules through a web admin dashboard.
- Answer and place calls from a browser-based softphone (a software phone).
- Reproduce the ugly parts of real carriers on demand: busy signals, timeouts,
  one-way audio, codec mismatches, and rate limits (see
  [architecture.md](architecture.md)).

## Scope of the first version

These decisions define the initial release and keep it simple:

- Far-end phone: the built-in browser softphone only. Registering external SIP
  clients such as Zoiper or Linphone is a later addition.
- Deployment: single user, running on localhost through Docker Compose. No login
  and no multi-tenancy.
- Audience: general-purpose, for any SIP or telephony developer, not tied to any
  single voice-agent framework.

## Documentation map

- [architecture.md](architecture.md): components, technology choices, the media
  and networking model, call flows, and the feature set.
- [data-model.md](data-model.md): the storage schema for trunks, numbers,
  routes, and calls.
- [roadmap.md](roadmap.md): the milestone plan from first audio to a polished
  release.
- [implementation.md](implementation.md): the build sequence, technology choices,
  repository layout, and open decisions for each milestone.

## A note on the name

The name Switchboard is used by other projects (for example a settings
application in the elementary OS desktop, and some package-registry entries), so
the bare name may be taken on some registries, domains, or the code-hosting
organization. The product can still be called Switchboard; a qualifier such as
`switchboard-sip` may be needed for a package or domain name.
