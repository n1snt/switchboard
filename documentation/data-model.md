# Switchboard data model

Switchboard stores its configuration and call history in SQLite, a small
self-contained database that lives in a single file, so there is no external
database to run. Four tables cover the whole tool, with a fifth added later for
fault injection.

Acronyms: E.164 is the international phone-number format, for example
`+14155550123`. CPS means calls per second. SIP is the Session Initiation
Protocol. IP is Internet Protocol (a network address).

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

| Column         | Type      | Meaning                                                                 |
| -------------- | --------- | ----------------------------------------------------------------------- |
| `id`           | text      | Unique identifier.                                                      |
| `name`         | text      | Human-readable label.                                                   |
| `direction`    | text      | `inbound`, `outbound`, or `both`.                                       |
| `auth_mode`    | text      | `none`, `digest`, or `ip`. See architecture.md for what each means.     |
| `username`     | text      | Digest username, when `auth_mode` is `digest`.                          |
| `password`     | text      | Digest password, when `auth_mode` is `digest`.                          |
| `allowed_ips`  | json      | List of source IP addresses to trust, when `auth_mode` is `ip`.         |
| `transport`    | text      | `udp`, `tcp`, `tls`, or `auto`. Controls transport strictness.          |
| `target_host`  | text      | For inbound delivery: the host of your system's SIP endpoint.           |
| `target_port`  | integer   | For inbound delivery: the port of your system's SIP endpoint.           |
| `dial_rewrite` | json      | Optional prefix or pattern rewrite applied to the dialed number.        |
| `max_cps`      | integer   | Optional calls-per-second cap. Null means no limit.                     |
| `created_at`   | timestamp | Creation time.                                                          |

Note on `target_host` and `target_port`: these are only meaningful for trunks
that carry inbound calls, because that is the direction where Switchboard needs
to know where to send the call. For a purely outbound trunk, Switchboard is the
receiver and these are unused.

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

| Column        | Type | Meaning                                                                       |
| ------------- | ---- | ----------------------------------------------------------------------------- |
| `id`          | text | Unique identifier.                                                            |
| `direction`   | text | `outbound` or `inbound`.                                                       |
| `match`       | text | A number or a pattern to match the dialed number against.                     |
| `destination` | text | Where a matched call goes: `softphone` for outbound, or a trunk for inbound.  |
| `priority`    | integer | Order of evaluation when more than one route could match. Lower runs first. |

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
| `to_number`    | text      | The called number.                                             |
| `trunk_id`     | text      | The trunk the call used.                                        |
| `state`        | text      | Current state, for example `ringing`, `answered`, or `ended`.   |
| `started_at`   | timestamp | When the call setup began.                                      |
| `answered_at`  | timestamp | When the call was answered. Null if never answered.             |
| `ended_at`     | timestamp | When the call ended.                                            |
| `hangup_cause` | text      | Why the call ended, for example `normal`, `busy`, or `timeout`. |
| `codec`        | text      | The negotiated audio codec.                                     |
| `recording`    | text      | Path to the recording file, if recording was enabled.           |

## `fault_profiles` (added later)

A named, reusable bundle of fault-injection settings that can be attached to a
trunk or a route. Introduced with the fault-injection milestone in
[roadmap.md](roadmap.md).

| Column        | Type | Meaning                                                                 |
| ------------- | ---- | ----------------------------------------------------------------------- |
| `id`          | text | Unique identifier.                                                      |
| `name`        | text | Human-readable label.                                                   |
| `reject_code` | integer | Optional SIP rejection code to return, for example `486` for busy.   |
| `reject_after_ms` | integer | Delay before an asynchronous rejection is sent.                  |
| `answer_delay_ms` | integer | Delay before answering, to simulate slow pickup.                 |
| `audio_mode`  | text | `normal`, `one_way`, or `silent`.                                       |
| `force_codec` | text | Optional codec to force, overriding negotiation.                        |
