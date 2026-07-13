# Engine provisioning: PJSIP Realtime

How `switchboard-engine` picks up the trunks `switchboard-api` provisions at
runtime, with no reload — Decision D1 (implementation.md), resolved to PJSIP
Realtime, and the engine side of implementation.md features 11 (trunk
provisioning), 16 (receive a call), and 17 (make a call). Companion to
[control-plane.md](control-plane.md) (the server side: the `trunks` table and
the future `ari/provisioning.ts`) and [containers.md](containers.md) (the
images and Compose wiring this depends on).

Acronyms, expanded on first use beyond [CLAUDE.md](../../CLAUDE.md)'s list:
ARA is the Asterisk Realtime Architecture, Asterisk's mechanism for reading
configuration objects from a database at runtime instead of (or alongside) a
static file. DID is a Direct Inward Dialing number. WAL is Write-Ahead
Logging, the SQLite journal mode that allows concurrent readers alongside one
writer.

## The one-sentence version

`switchboard-engine` and `switchboard-api` share one SQLite file (Decision
D2); the control plane writes trunks into that file's `ps_endpoints`,
`ps_auths`, and `ps_aors` tables using Asterisk's own standard realtime
column names, and three new engine config files (`sorcery.conf`,
`extconfig.conf`, `res_config_sqlite3.conf`) tell PJSIP to read those tables
directly, layered underneath the existing static `pjsip.conf` so the two
walking-skeleton browser endpoints (1001/1002) keep working unchanged.

## The shared SQLite file

`docker-compose.yml`'s `switchboard-db-data` named volume is now mounted on
**both** containers:

| Service | Mount path | Role |
| --- | --- | --- |
| `switchboard-api` | `/app/data` (`SWITCHBOARD_DATABASE_PATH=/app/data/switchboard.sqlite`) | Owns the schema; the only writer (CLAUDE.md, "apps/server is the only writer to SQLite"). |
| `switchboard-engine` | `/var/lib/switchboard/db` (`config/res_config_sqlite3.conf`'s `dbfile => /var/lib/switchboard/db/switchboard.sqlite`) | Reads `ps_endpoints`/`ps_auths`/`ps_aors` via `res_config_sqlite3`. |

Both paths resolve to the identical underlying file — same volume, same
`switchboard.sqlite` filename, different mount point per container. That
filename match is the one thing to keep in sync by hand if either side's
path ever changes; both compose-file locations carry a comment cross-
referencing this doc for exactly that reason.

Asterisk only ever runs `SELECT` against these tables in this design — the
control plane's Kysely migrations own the schema and its repository layer
owns every write (`config/res_config_sqlite3.conf`'s `requirements = warn`
reflects this: it logs if an expected column is missing but never attempts
to `ALTER` the table itself). SQLite's WAL journal mode (which
`apps/server/src/db/index.ts` sets) is what makes a second process safely
reading the same file, live, work at all; WAL is why the engine's mount is
read-write rather than `:ro` — even a pure reader needs write access to the
database's `-shm` (shared-memory index) file, not just the main file.

### Why the mount directory is `chmod 0777`

`switchboard-api`'s container writes as its own non-root `switchboard` user
(uid 1001, `apps/server/Dockerfile`); `switchboard-engine`'s container writes
(indirectly, via `res_config_sqlite3`) as its own non-root `asterisk` user
(uid 1000, the `andrius/asterisk` base image). Neither uid/gid matches the
other, and nothing in the compose file reconciles them. Verified empirically
while building this feature: a fresh named volume mounted with no ownership
adjustment defaults to `root:root`, mode `0755` — writable only by its
owner — which would lock one side out entirely.

`engine/Dockerfile` bakes `/var/lib/switchboard/db` into the image at mode
`0777` before any volume is attached. Docker's own "copy-up" behavior (also
verified empirically) means the **first** container to mount a still-empty
named volume seeds that volume's on-disk permissions from its own image
directory at that path — mode bits included, not just ownership.
`switchboard-api`'s `depends_on: switchboard-engine: condition:
service_healthy` guarantees the engine starts (and mounts the volume) first,
so this 0777 is what ends up on the actual volume, and both uids can then
create/open the file regardless of who gets there first. This directory is
deliberately **not** placed under `/var/lib/asterisk`: the upstream image's
own `entrypoint.sh` recursively `chown`s a fixed list of paths — including
`/var/lib/asterisk` — to the PUID/PGID-adapted `asterisk` user on every
container start, which would silently undo the 0777 and re-lock
`switchboard-api` out.

This is a deliberate, documented trade-off appropriate to a localhost,
single-user, no-auth sandbox (CLAUDE.md, "First version scope"), not a
pattern to carry into a multi-tenant or network-exposed deployment.

### Known gap: the dev override

`docker-compose.override.yml` (the default hot-reload dev experience) runs
`switchboard-api` via `pnpm --filter @switchboard/server dev` with no
`SWITCHBOARD_DATABASE_PATH` override, so it falls back to its relative-path
default and writes to `apps/server/data/switchboard.sqlite` on the bind-
mounted host source tree — **not** the `switchboard-db-data` named volume
`switchboard-engine` reads. Realtime-provisioned trunks are therefore not
visible to the engine under the plain `docker compose up` dev path today.
Running the built images instead (`docker compose -f docker-compose.yml up`)
does share the file correctly, as verified below. Closing this gap (pointing
the dev override's API process at a path visible to the engine too) is
noted here for whoever next touches `apps/server`'s dev configuration; it is
out of this feature's scope (engine-only).

## Sorcery, extconfig, and the realtime engine

Three new files, all plain (non-templated — nothing in them depends on an
environment variable):

- **`engine/config/sorcery.conf`** — maps PJSIP's `endpoint`, `auth`, and
  `aor` object types to **two** wizards each, consulted in order:
  1. `config,pjsip.conf,criteria=type=<type>` — the existing static file
     (feature 9's two webrtc endpoints).
  2. `realtime,<table>` — the table `extconfig.conf` points at
     `res_config_sqlite3`.

  This "config first, realtime second, same object type" mapping is
  Asterisk's own documented pattern for mixing static-file PJSIP objects with
  database-provisioned ones; it is not Switchboard-specific. Static config
  wins on an id collision (it is listed first), though this never actually
  matters here: trunk ids are always the shared package's `trunk_`-prefixed
  nanoid identifiers (`packages/shared/src/schemas/trunk.ts`), so they can
  never collide with the four-digit `1001`/`1002` webrtc endpoint ids.

  Also maps `identify` (used by `res_pjsip_endpoint_identifier_ip` to match
  an inbound request to an endpoint by source IP alone) the same way, backed
  by the `ps_endpoint_id_ips` table — see "Source-IP identification" below.

- **`engine/config/extconfig.conf`** — maps each realtime family name
  (`ps_endpoints`, `ps_auths`, `ps_aors`, `ps_endpoint_id_ips`) to the
  `sqlite3` driver and the `[switchboard]` database name.

- **`engine/config/res_config_sqlite3.conf`** — the `[switchboard]` database
  itself: `dbfile => /var/lib/switchboard/db/switchboard.sqlite`, plus
  `requirements = warn` (see "The shared SQLite file" above for why).

Modules confirmed present and autoloading (unblocked in the base image's
`modules.conf`) by actually building and running this image while
implementing this feature: `res_config_sqlite3.so`, `res_sorcery_realtime.so`,
`res_sorcery_config.so`, and `res_pjsip.so` all loaded `Running`. The base
image (`andrius/asterisk:21.12.3_debian-trixie`, already pinned per
containers.md) does ship `res_config_sqlite3` — the ODBC fallback the
project brief flagged as a possible need was not required.

## The exact realtime columns assumed (for the control-plane migration)

The control plane's future migration and `ari/provisioning.ts` should write
these standard Asterisk column names — nothing custom is needed on the
engine side:

- **`ps_endpoints`**: `id`, `transport`, `aors`, `auth`, `context`,
  `disallow`, `allow`, `direct_media`, `dtmf_mode`. (Verified additional
  standard columns work with no engine-side change if the control plane
  wants finer control later: `media_encryption`, `outbound_proxy`,
  `from_domain`, `callerid`, `identify_by`.)
- **`ps_auths`**: `id`, `auth_type`, `username`, `password`, `realm`.
- **`ps_aors`**: `id`, `max_contacts`, `contact`, `qualify_frequency`.

Confirmed by actually inserting a representative row into a scratch database
and mounting it into a running container (see "How this was verified"
below):

- `disallow = 'all'` plus `allow = 'ulaw,alaw'` (comma-separated) renders
  exactly as `pjsip show endpoint` reports a config-file endpoint's codec
  list — the control plane can join `trunks.codecs` (data-model.md's ordered
  array) with commas and write it straight into `ps_endpoints.allow`.
- `dtmf_mode` accepts the trunk schema's values directly: Asterisk treats
  `rfc2833` as a synonym for its own `rfc4733`, so `trunks.dtmf_mode`
  (`rfc2833`/`info`/`inband`) needs no translation.
- `direct_media` and boolean-shaped columns accept SQLite's `0`/`1` (the
  same convention `apps/server/src/db/mappers.ts` already uses for the
  application's own boolean columns) as well as `yes`/`no`.
- `ps_endpoints.transport` is a **name reference** to a transport declared in
  `pjsip.conf` (transports cannot come from realtime — they bind a socket at
  Asterisk startup, before any dynamic reconfiguration is possible). Use
  `transport-udp` or the new `transport-tcp` (added by this feature,
  alongside `transport-udp`, for trunks with `transport: tcp`); `tls` is a
  known gap (see below).
- `ps_endpoints.context` is what routes a trunk's inbound calls into the
  dialplan — see "Dialplan contexts" below. An inbound-capable trunk
  (`direction` `inbound` or `both`) should set `context = switchboard-trunk`.

### Source-IP identification: `auth_mode: ip`

An inbound call arriving on a trunk has to be attributed to that trunk for the
control plane to route it (feature 16). A digest trunk is matched by username;
an `auth_mode: ip` trunk is matched by the sender's source address through a
PJSIP `identify` object. Migration `0003_pjsip_identify` creates the
`ps_endpoint_id_ips` table (standard columns `id`, `endpoint`, `match`), and the
trunk provisioner (`realtime-provisioner.ts`) writes one row per `ip`-mode trunk
with `match` set to the trunk's `allowed_ips` (comma-joined). The
`sorcery.conf`/`extconfig.conf` mappings that were already in place now resolve
against a real table.

The historical verification run below predates this table; the "no such table"
warning it records no longer applies once migration `0003` has run.

### What is a known gap: `transport: tls`

Only `transport-udp` and the new `transport-tcp` are declared. TLS needs a
certificate mounted into the container, which nothing here does yet — this
mirrors the already-documented `wss://` gap in `http.conf`/`containers.md`.
A trunk provisioned with `transport: tls` and no matching PJSIP transport
would fail to bind, logged as an error, not a crash.

## Static and realtime endpoints coexist

Sorcery's "config first, then realtime" mapping means `pjsip show endpoints`
lists the two static webrtc endpoints and every realtime-provisioned trunk
side by side, with no reload needed when a trunk is created, edited, or
deleted through the control plane — realtime lookups happen per-request, not
at Asterisk startup. Verified directly (see below).

## Dialplan contexts (features 16 and 17)

`engine/config/extensions.conf` now has two contexts, kept separate even
though both ultimately just call `Stasis(switchboard)`:

| Context | Who points at it | Extension pattern | Why |
| --- | --- | --- | --- |
| `switchboard-webrtc` | The two static webrtc endpoints (`pjsip.conf.template`'s `context = switchboard-webrtc`) | `_10XX` | Unchanged from feature 9. |
| `switchboard-trunk` | A provisioned trunk's `ps_endpoints.context` | `_X.` (plus a `_+X.` entry that strips a leading `+` and re-enters at `_X.`) | New, this feature — feature 16, "receive a call." |

A PJSIP endpoint is pointed at exactly one context by name, and Asterisk only
resolves an extension within the calling channel's own context — so a
browser endpoint can never reach a trunk-context extension (or vice versa)
just by coincidentally dialing a matching number.

The `switchboard-trunk` context deliberately uses `_X.`, not Asterisk's true
wildcard `_.`: Asterisk itself logs a startup warning that `_.` is "strongly
discouraged" and "can have unexpected behavior" (encountered directly while
verifying this file, then fixed — see below), because dialplan patterns are
evaluated as digits arrive and `_.` can match before the full number has.
The one thing `_.` would have bought over `_X.` — matching a leading `+`,
how a dialed E.164 number such as `+14155550123` arrives in a Request-URI
user part — is handled explicitly instead:

```
exten => _+X.,1,Goto(${EXTEN:1},1)

exten => _X.,1,NoOp(Switchboard: routing trunk call for ${EXTEN} into Stasis(switchboard))
 same => n,Stasis(switchboard)
 same => n,Hangup()
```

Neither context pattern-matches the actual dialed number beyond "is it a
number" — matching it to a route (feature 15) and a destination is entirely
the control plane's job, read off `channel.dialplan.exten` on `StasisStart`,
exactly as the walking skeleton already does
(`apps/server/src/ari/coordinator.ts`, documented in control-plane.md).

**Feature 17 (the softphone dialing out through a trunk) needs no dialplan
at all.** The control plane originates the trunk leg directly over ARI into
the `switchboard` Stasis app (the same "originate with an `app`, not an
extension" pattern the coordinator already uses for browser-to-browser
calls), bypassing the dialplan entirely. This is why `extensions.conf` gains
exactly one new context, not two.

## How this was verified

`docker compose config`, both merged with the dev override and as the base
file alone, parses cleanly with the new volume mount and no warnings.

Because a full trunk-call integration test needs the control-plane migration
and service (`ari/provisioning.ts`, not yet built — this is the engine-only
half of feature 11), this feature was verified by building and running the
actual image and driving it directly, rather than only reviewing the config
by eye:

1. Built `switchboard-engine:local` from `engine/Dockerfile` (a few seconds —
   only the small `COPY`/`RUN` layers build; the base image is already a
   compiled Asterisk).
2. Created a scratch SQLite file with `ps_endpoints`/`ps_auths`/`ps_aors`
   tables (the exact columns listed above) and one representative trunk row,
   using the `sqlite3` CLI on the host — standing in for what the
   control-plane migration and provisioning service will do.
3. Ran the container with that file bind-mounted at
   `/var/lib/switchboard/db` (the same path `docker-compose.yml` mounts the
   named volume at) and confirmed, via `asterisk -rx`:
   - `module show like res_config_sqlite3` / `res_sorcery` / `res_pjsip`:
     all `Running`.
   - `pjsip show endpoints`: listed `1001`, `1002` (static), and the
     scratch trunk's id, side by side, with no reload.
   - `pjsip show endpoint <trunk id>`: `context: switchboard-trunk`,
     `transport: transport-udp`, `allow: (ulaw|alaw)`, `dtmf_mode: rfc4733`,
     `direct_media: false` — all correctly reflecting the scratch row.
   - `pjsip show aor <trunk id>`: `contact`, `max_contacts`,
     `qualify_frequency` all correctly reflecting the scratch row.
   - `pjsip show auth <trunk id>`: `auth_type`, `username`, `password`,
     `realm` all correctly reflecting the scratch row.
   - `dialplan show switchboard-trunk` / `switchboard-webrtc`: both contexts
     load with the expected extensions and priorities, no warnings (the
     `_.` warning mentioned above was caught here, on the first attempt, and
     fixed before this write-up).
   - The container's own `HEALTHCHECK` reported `healthy`.
   - The expected, harmless `no such table: ps_endpoint_id_ips` warning
     appeared exactly as documented above, once per endpoint, and nothing
     else was unexpected in the boot log.

### What was not verified

A live SIP call arriving on a provisioned trunk end to end (feature 16's own
acceptance gate) was not exercised, since it needs a running control plane
that has actually implemented `ari/provisioning.ts` and the trunk service
calling it — the server-side half of feature 11, out of this feature's
engine-only scope. This feature's config was proven correct at the PJSIP/
sorcery/realtime layer directly, as detailed above; the remaining risk is
entirely in the control-plane write path, not in anything documented here.
No RTP/media settings changed (the bounded port range and advertised address
are untouched), so the feature 9 walking skeleton's two-way-audio
acceptance is not implicated and was not re-run for this change.
