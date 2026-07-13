# Switchboard data model

Switchboard stores its configuration and call history in SQLite, a small
self-contained database that lives in a single file, so there is no external
database to run. The core tables are `trunks`, `numbers`, `routes`, and `calls`,
with `fault_profiles` added at the fault-injection milestone and a small
`settings` table for dashboard-configurable global options.

Acronyms: E.164 is the international phone-number format, for example
`+14155550123`. CPS means calls per second. DTMF is Dual-Tone Multi-Frequency
(touch-tone keypad digits). SRTP is Secure Real-time Transport Protocol
(encrypted audio). SIP is the Session Initiation Protocol. IP is Internet
Protocol (a network address).

## Direction, defined

Throughout these tables, direction is described from the point of view of your
system-under-test, not from Switchboard:

- Outbound means your system places a call out through Switchboard. Switchboard
  receives the call setup and rings the softphone.
- Inbound means a call comes in to your system. The softphone places it and
  Switchboard delivers it to your system.

## `trunks`

A trunk is a connection between Switchboard and your system, with its own
credentials and behavior. This row is what the dashboard renders as "here is your
endpoint and credentials."

| Column             | Type      | Meaning                                                             |
| ------------------ | --------- | ------------------------------------------------------------------- |
| `id`               | text      | Unique identifier.                                                  |
| `name`             | text      | Human-readable label. Also what the dialler shows.                  |
| `direction`        | text      | `inbound`, `outbound`, or `both` (system-under-test point of view). |
| `enabled`          | boolean   | When false, the trunk rejects and is hidden from the dialler.       |
| `auth_mode`        | text      | `none`, `digest`, `ip`, or `register`. See architecture.md.         |
| `username`         | text      | Digest username, when `auth_mode` is `digest`.                      |
| `password`         | text      | Digest password, when `auth_mode` is `digest`.                      |
| `auth_username`    | text      | Auth username when it differs from the SIP username.                |
| `realm`            | text      | Optional digest realm.                                              |
| `allowed_ips`      | json      | Source IP addresses to trust, when `auth_mode` is `ip`.             |
| `register`         | boolean   | When true, the trunk registers to a remote server.                  |
| `registrar`        | text      | Registrar address, when `register` is true.                         |
| `register_expiry`  | integer   | Registration interval in seconds, when registering.                 |
| `transport`        | text      | `udp`, `tcp`, `tls`, or `auto`. Controls transport strictness.      |
| `target_host`      | text      | For inbound delivery: the host of your system's SIP endpoint.       |
| `target_port`      | integer   | For inbound delivery: the port of your system's SIP endpoint.       |
| `outbound_proxy`   | text      | Optional proxy address to route signaling through.                  |
| `dial_rewrite`     | json      | Technical prefix and pattern rewrites applied to the dialed number. |
| `caller_id_name`   | text      | Display name presented on outgoing calls (the From header).         |
| `caller_id_number` | text      | Number presented on outgoing calls.                                 |
| `codecs`           | json      | Ordered allow-list of audio codecs; order is preference.            |
| `dtmf_mode`        | text      | `rfc2833`, `info`, or `inband`.                                     |
| `media_encryption` | text      | `none` or `srtp`.                                                   |
| `record`           | boolean   | When true, calls on this trunk are recorded by default.             |
| `max_cps`          | integer   | Optional calls-per-second cap. Null means no limit.                 |
| `max_channels`     | integer   | Optional concurrent-call cap. Null means no limit.                  |
| `source`           | text      | `ui` or `env`. `env` trunks are seeded from the environment.        |
| `created_at`       | timestamp | Creation time.                                                      |

Note on `target_host` and `target_port`: these are only meaningful for trunks
that carry inbound calls, because that is the direction where Switchboard needs
to know where to send the call. For a purely outbound trunk, Switchboard is the
receiver and these are unused.

Note on the field set: the columns beyond the original core (auth, registration,
caller identity, codecs, DTMF, encryption, and limits) exist so a trunk can match
what commercial and regional SIP trunk providers expose during onboarding, which
is what the Advanced trunk form in [dashboard.md](dashboard.md) presents. The
Quick-add path sets only `name`, `target_host`, `target_port`, and leaves the
rest at defaults. Trunks with `source` `env` are seeded from the environment and
re-applied on restart.

## `numbers`

A number is a phone number (a DID, meaning Direct Inward Dialing number) that the
softphone can dial to reach your system.

| Column     | Type | Meaning                                                     |
| ---------- | ---- | ----------------------------------------------------------- |
| `id`       | text | Unique identifier.                                          |
| `e164`     | text | The phone number in E.164 format.                           |
| `trunk_id` | text | The inbound trunk that delivers this number to your system. |
| `label`    | text | Optional human-readable label.                              |

## `routes`

A route decides how a dialed number maps to a destination.

| Column        | Type    | Meaning                                                                      |
| ------------- | ------- | ---------------------------------------------------------------------------- |
| `id`          | text    | Unique identifier.                                                           |
| `direction`   | text    | `outbound` or `inbound`.                                                     |
| `match`       | text    | A number or a pattern to match the dialed number against.                    |
| `destination` | text    | Where a matched call goes: `softphone` for outbound, or a trunk for inbound. |
| `priority`    | integer | Order of evaluation when more than one route could match. Lower runs first.  |

- For outbound calls (your system dialing out), a route maps a dialed-number
  pattern to the web softphone.
- For inbound calls (the softphone dialing a number), routing normally follows
  the `numbers` table to the assigned trunk; explicit inbound routes exist for
  overrides and testing.

## `calls`

The call log. One row per call attempt.

| Column         | Type      | Meaning                                                         |
| -------------- | --------- | --------------------------------------------------------------- |
| `id`           | text      | Unique identifier.                                              |
| `direction`    | text      | `inbound` or `outbound`.                                        |
| `from_number`  | text      | The calling number.                                             |
| `to_number`    | text      | The called number.                                              |
| `trunk_id`     | text      | The trunk the call used.                                        |
| `state`        | text      | Current state, for example `ringing`, `answered`, or `ended`.   |
| `started_at`   | timestamp | When the call setup began.                                      |
| `answered_at`  | timestamp | When the call was answered. Null if never answered.             |
| `ended_at`     | timestamp | When the call ended.                                            |
| `hangup_cause` | text      | Why the call ended, for example `normal`, `busy`, or `timeout`. |
| `codec`        | text      | The negotiated audio codec.                                     |
| `recording`    | text      | Path to the recording file, if recording was enabled.           |

The `recording` column already covers call recording: when recording is enabled
for a call (globally, per trunk, or by the per-call toggle in the in-call
interface), the engine writes the audio to a file under the recordings directory
and the path is stored here. The dashboard call log offers playback and download
from this path. In the dashboard, `direction` is shown to the user as "Placed" or
"Received" rather than inbound or outbound, per [dashboard.md](dashboard.md).

## `settings`

A small key-value table for dashboard-configurable global options that must
persist across restarts, so they are not environment-only.

| Column       | Type      | Meaning                                       |
| ------------ | --------- | --------------------------------------------- |
| `key`        | text      | Setting name, for example `record_all_calls`. |
| `value`      | json      | The setting value.                            |
| `updated_at` | timestamp | When the setting was last changed.            |

Environment variables (for example `SWITCHBOARD_RECORD_ALL`) seed and override
the matching settings on boot; the dashboard writes them here when changed at
runtime.

## `fault_profiles` (added later)

A named, reusable bundle of fault-injection settings that can be attached to a
trunk or a route. Introduced with the fault-injection milestone in
[roadmap.md](roadmap.md).

| Column            | Type    | Meaning                                                            |
| ----------------- | ------- | ------------------------------------------------------------------ |
| `id`              | text    | Unique identifier.                                                 |
| `name`            | text    | Human-readable label.                                              |
| `reject_code`     | integer | Optional SIP rejection code to return, for example `486` for busy. |
| `reject_after_ms` | integer | Delay before an asynchronous rejection is sent.                    |
| `answer_delay_ms` | integer | Delay before answering, to simulate slow pickup.                   |
| `audio_mode`      | text    | `normal`, `one_way`, or `silent`.                                  |
| `force_codec`     | text    | Optional codec to force, overriding negotiation.                   |
