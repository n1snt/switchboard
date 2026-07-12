# Switchboard dashboard and features

This document describes the dashboard: its navigation, every screen, the
softphone experience, and the configuration surface. It is the product and
user-experience companion to [architecture.md](architecture.md) (how the system
works) and [implementation.md](implementation.md) (how it gets built). Where a
feature adds or changes stored data, that is noted and reflected in
[data-model.md](data-model.md).

Acronyms used here, expanded on first use: SIP is the Session Initiation Protocol
(call signaling). URI is a Uniform Resource Identifier, and a SIP URI looks like
`sip:agent@192.168.1.10:5060`. DID is a Direct Inward Dialing number (an ordinary
phone number). DTMF is Dual-Tone Multi-Frequency, the touch-tone digits from a
keypad. RTP is the Real-time Transport Protocol (the audio stream). SRTP is Secure
RTP (encrypted audio). CPS is calls per second. E.164 is the international
phone-number format, for example `+14155550123`. WS is WebSocket. Env means
environment variable.

## Call direction: two points of view

This is the single most important thing to get right, because two valid points of
view run in opposite directions.

- **The data model's point of view is your system-under-test.** There, "outbound"
  means your system places a call out through Switchboard (Switchboard rings the
  softphone), and "inbound" means a call arrives at your system (the softphone
  places it and Switchboard delivers it). This is what [data-model.md](data-model.md)
  uses, and it is what trunk and route configuration uses.
- **The dashboard's point of view is the person holding the softphone.** They
  either place a call or receive one.

The mapping between them is a mirror:

| The dashboard user does this                       | The softphone...    | In data-model terms this is               |
| -------------------------------------------------- | ------------------- | ----------------------------------------- |
| Places a call from the dialler to a SIP server     | originates the call | the system-under-test's **inbound** call  |
| Receives an incoming-call notification and accepts | answers the call    | the system-under-test's **outbound** call |

To keep everyone sane, the rule is: **the dashboard never shows the words
"inbound" or "outbound" for a live call or in the call log.** It uses plain
language: "Place a call," "Incoming call," and "Placed" or "Received" in the log.
The inbound/outbound vocabulary appears only on the Trunks and Routes screens,
where it configures the data model directly, and there it carries a one-line
tooltip explaining the direction.

## Navigation

A persistent left sidebar with these destinations. A docked call bar (see the
Phone section) sits above or below the main content whenever a call is active, so
call control is reachable from every screen.

1. **Phone**: the dialler and the active-call experience.
2. **Trunks**: SIP servers and connections, with full carrier-style options.
3. **Numbers**: phone numbers (DIDs) mapped to trunks.
4. **Routes**: routing rules; a secondary, advanced screen.
5. **Call log**: call history, recordings, and per-call detail.
6. **Fault profiles**: carrier fault injection (arrives with milestone M3).
7. **Settings**: recording, engine status, environment-managed items, and a
   read-only overview of credentials.

## Phone

The Phone screen is the softphone. It has three parts: the dialler, the
incoming-call notification, and the in-call interface.

### Dialler

- A destination picker at the top. It lists everything you can call: dialable
  trunks (by name), saved numbers (by label and E.164), and an option to type an
  ad-hoc SIP URI or number directly. Recently-called destinations surface first.
- A standard keypad (digits 0 to 9, star, and pound) plus a text field, so you
  can dial a number or paste a SIP URI.
- A green Call button places the call to the selected destination.
- While dialling and ringing, the screen shows the destination name, the address
  being called, and a Cancel control.

Placing a call from here maps to the system-under-test's inbound direction (see
the direction section). The server looks up the chosen trunk or number, applies
any dial rewrite or technical prefix, and originates the call to that server's
address.

### Incoming-call notification

When the softphone rings (the system-under-test placed a call, which is its
outbound direction), a notification appears. It is modeled on the macOS FaceTime
call notification, deliberately not a full-screen takeover.

- A compact card in a fixed corner (top-right by default), floating above
  whatever screen you are on. It never blocks the rest of the dashboard.
- It shows the caller identity (the calling number or SIP URI), the trunk or
  route the call arrived on, and a ringing indicator.
- Two buttons: **Accept** (green) and **Decline** (red). Accept transitions
  straight into the in-call interface; Decline rejects the call with a normal
  busy or declined cause.
- A ringtone plays while it is visible, and it times out on no-answer.
- Multiple simultaneous incoming calls stack as a small pile of cards rather than
  fighting for the same spot.

Because the notification is global, it is implemented as an overlay subscribed to
the WS event stream, independent of the active tab.

### In-call interface

Once a call is connected (whether you placed it or accepted it), the interface
looks and behaves like a real phone. It is available full-size on the Phone
screen and as a compact docked bar on every other screen.

- Call state and a running duration timer, plus the negotiated audio codec (a
  small but genuinely useful detail for a telephony developer).
- **End call** (red), the primary action.
- **Mute** and unmute the microphone.
- **Hold** and resume, which puts the far end on hold.
- **Keypad** for sending DTMF digits mid-call (needed to drive phone-tree menus
  on the system-under-test).
- **Record** toggle, when per-call recording control is enabled (see Recording).
- Speaker or output volume control.
- A link to the live SIP trace for this call (see Call log), so a developer can
  watch signaling as it happens.

Transfer and multi-call handling are deliberately out of scope for the first
version and are noted as later additions.

## Trunks

A trunk is a SIP server or connection. This screen is where a saved SIP server
and a fully-configured carrier trunk are the same entity at two levels of detail.

- The list shows each trunk's name, address, direction, auth mode, whether it is
  enabled, and whether it was created in the dashboard or seeded from the
  environment (an "env-managed" badge).
- **Quick add** captures only a name and an address (host and port, or a SIP
  URI), with auth set to none. This is the fast path for "save this SIP server so
  I can dial it later."
- **Advanced** exposes the full field set below, matching what commercial and
  regional SIP trunk providers expose during onboarding.

### Trunk field reference

Grouped the way the form presents them. Fields marked "core" exist from milestone
M1; the rest fill in provider parity and may land alongside related milestones.

Identity and status:

- **Name** (core): human-readable label, also what the dialler shows.
- **Direction** (core): inbound, outbound, or both, in the data model's
  system-under-test sense, with a tooltip. Determines whether the trunk is
  dialable from the softphone, deliverable to, or both.
- **Enabled** (core): a disabled trunk rejects and is hidden from the dialler.

Server and transport:

- **Host or IP address** (core): the SIP server address (the data model's
  `target_host`).
- **Port** (core): the SIP port (the data model's `target_port`), default 5060,
  or 5061 for TLS.
- **Transport** (core): UDP, TCP, TLS, or auto. Controls transport strictness.
- **Outbound proxy**: send signaling through this address regardless of the
  request address.

Authentication:

- **Auth mode** (core): none, digest, IP allowlist, or registration.
- **Username** and **Password** (core): digest credentials.
- **Auth username** and **Realm**: when they differ from the SIP username.
- **Allowed IP addresses** (core for the IP mode): the source-address allowlist.
- **Register**, **Registrar**, and **Registration expiry**: when the trunk should
  register to a remote server rather than being statically addressed.

Number and caller handling:

- **Technical prefix** (core): a prefix prepended to the dialed number, which
  many carriers require. Stored as part of the dial-rewrite rule.
- **Dial rewrite rules**: pattern-to-replacement rules applied to the dialed
  number, for catching number-format bugs locally.
- **Caller ID name** and **Caller ID number**: the identity presented on
  outgoing calls (the From header).

Media:

- **Codecs**: an ordered allow-list of audio codecs (for example PCMU, PCMA,
  G.722, Opus, G.729). Order expresses preference.
- **DTMF mode**: RFC 2833, SIP INFO, or inband.
- **Media encryption**: none or SRTP.

Limits:

- **Maximum calls per second**: a CPS cap for throttling tests.
- **Maximum concurrent calls**: a channel cap.

Several of these extend the current `trunks` table; see the data-model impact
section.

## Numbers

Phone numbers (DIDs) the softphone can dial to reach a system-under-test.

- The list shows each number's E.164 value, its assigned trunk, and an optional
  label.
- Create a number by entering an E.164 value and choosing the inbound trunk that
  delivers it. Dialling this number in the softphone routes the call to that
  trunk's server address.

## Routes

An advanced screen for routing rules, for users who need behavior beyond the
default (a number goes to its assigned trunk; the dialler reaches the chosen
destination). Routes let you match a dialed pattern and send it somewhere
specific, and set evaluation priority when several could match. Most users never
open this screen; it exists for overrides and testing.

## Call log and recording

### Call log

- A table with, per call: whether it was Placed or Received (plain language, no
  inbound/outbound), the far party, the trunk or destination, the state, the
  start time, the duration, the hangup cause, and the negotiated codec.
- Filters by date range, direction, trunk, and state.
- Live updates over the WS event stream, so an in-progress call appears and
  changes state without a refresh.
- Selecting a call opens its detail: the full state timeline, the negotiated
  media, the hangup cause, and the SIP trace and call-ladder diagram (from
  milestone M2).

### Recording

- Recording is performed by the engine (Asterisk records the bridged audio) and
  written to a file on disk, in a directory mounted into the container so it
  survives restarts and is reachable from the host.
- The recording's path is stored on the call record. In the call log, a call with
  a recording shows an inline audio player and a **Download** button.
- Recording is controllable at three levels, most specific wins: a global
  "record all calls" setting, a per-trunk default, and a per-call Record toggle in
  the in-call interface.
- Settings expose the storage directory, a running total of disk used by
  recordings, and a manual delete action per recording. Automatic retention (for
  example delete after N days) is noted as a later addition.

## Fault profiles

The carrier fault-injection screen, arriving with milestone M3. It lets you build
named bundles of fault settings (rejection codes and timing, answer delays,
one-way or silent audio, forced codec, transport strictness, CPS cap) and attach
them to a trunk or a route. Detailed behavior is in
[architecture.md](architecture.md) and the fault-profile fields are in
[data-model.md](data-model.md).

## Settings

- **Recording**: the record-all toggle, the storage directory, and disk usage.
- **Engine status**: whether the control plane is connected to the engine over
  the Asterisk REST Interface, and the advertised media address in use.
- **Environment-managed items**: a read-only list of trunks and options seeded
  from the environment, with a note that they are re-applied on restart.
- **Credentials overview**: a read-only, copyable summary of every trunk's
  address and credentials, the same values a real carrier's dashboard would show.

## Configuration via environment

Everything that can be created in the dashboard can also be provisioned from the
`docker-compose.yml` environment, so a Switchboard instance can come up
pre-configured with no clicking. This matters for automated and continuous-
integration use.

- **`SWITCHBOARD_SIP_SERVERS`**: a JSON array of trunk definitions, seeded at
  boot. Each entry accepts the trunk fields above (at least `name`, `host`,
  `port`; optionally `transport`, `authMode`, `username`, `password`,
  `techPrefix`, `codecs`, and so on). Multiple servers are just multiple array
  entries, so more than one SIP server is supported directly.
- Seeded trunks are matched by `name`, marked with source `env`, and re-applied on
  every restart, so the environment is the source of truth for them. They appear
  in the dashboard with an env-managed badge. Editing one in the dashboard is
  allowed but is overwritten on the next restart, which the UI states plainly.
- **`SWITCHBOARD_RECORD_ALL`**: when true, record every call by default.
- **`SWITCHBOARD_RECORDINGS_DIR`**: the on-disk directory for recordings, mounted
  as a volume.

An example, abbreviated:

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

## Data-model impact

These features extend [data-model.md](data-model.md):

- **`trunks`** gains columns for the provider-parity fields: `enabled`,
  `outbound_proxy`, `register`, `registrar`, `register_expiry`, `auth_username`,
  `realm`, `caller_id_name`, `caller_id_number`, `codecs` (a JSON ordered list),
  `dtmf_mode`, `media_encryption`, `max_channels`, and `source` (`ui` or `env`).
  The existing `dial_rewrite` holds the technical prefix and rewrite rules.
- **`calls`** already carries a `recording` path column, so recording needs no
  new call column; it needs the storage directory and the record-decision logic.
- A small **`settings`** key-value table holds dashboard-configurable global
  options such as "record all calls," so they persist without an environment
  restart. Environment values seed and override these on boot.

## Milestone mapping

Where each piece is built, aligned with [implementation.md](implementation.md)
and [roadmap.md](roadmap.md):

- **M1 (calls in both directions)**: the dialler, the incoming-call notification,
  the in-call interface, core trunk fields with Quick add and Advanced, numbers,
  and environment provisioning of SIP servers.
- **M2 (observability)**: the call log, per-call detail with the SIP trace and
  ladder, and call recording with disk storage and download.
- **M3 (fault injection)**: the fault-profiles screen and provider-parity trunk
  fields that overlap with fault behavior (transport strictness, forced codec,
  CPS cap).
- **M4 (automation)**: parity between the dashboard and the REST and command-line
  interfaces, so anything clickable is also scriptable.
