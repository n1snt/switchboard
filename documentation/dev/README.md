# Switchboard developer documentation

Documentation for people building Switchboard. For using the tool, see the
[user documentation](../user/README.md).

## Contents

- [architecture.md](architecture.md): components, technology choices, the media
  and networking model, and the two core call flows.
- [control-plane.md](control-plane.md): how the control plane and its foundations
  are built (Part A and the server side of Part B): the shared contract, the
  database layer, the Fastify server, the event bus and WebSocket stream, and the
  Asterisk REST Interface connection and call bridging.
- [containers.md](containers.md): the three Docker images, their build stages, and
  the media and networking settings for Docker Compose.
- [engine-provisioning.md](engine-provisioning.md): how trunks become live Asterisk
  endpoints through PJSIP Realtime (the shared SQLite file, sorcery, and the
  trunk-call dialplan).
- [observability.md](observability.md): how a call is run and observed at runtime:
  the call coordinator (both directions), the SIP trace capture, and recording.
- [data-model.md](data-model.md): the SQLite storage schema for trunks, numbers,
  routes, calls, settings, and fault profiles.
- [dashboard.md](dashboard.md): the dashboard screens, the softphone experience,
  the trunk field set, recording, and environment configuration.
- [ux.md](ux.md): the visual system, the sidebar shell, routing, and the
  screen-by-screen flows and wireframes.
- [implementation.md](implementation.md): the feature-by-feature build plan,
  starting from an empty repository, with the technology stack and design
  decisions.
- [roadmap.md](roadmap.md): the milestone view that the implementation features
  map back to.

## The "document as you build" rule

Every feature in [implementation.md](implementation.md) includes a Docs step and
is not done until it is written up:

- Developer-facing behavior (architecture, data model, internal contracts) is
  documented here in `dev/`.
- Any user-facing capability is documented in [user/](../user/README.md) as a
  first-class, example-driven guide.

Keep these docs in sync with the code in the same change, never in a follow-up.
