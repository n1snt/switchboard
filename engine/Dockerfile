# Copyright 2026 Nishant Bhandari
# SPDX-License-Identifier: Apache-2.0
#
# switchboard-engine: Asterisk configured as the SIP signaling stack, audio
# bridge, and browser-facing WebRTC endpoint (documentation/dev/architecture.md,
# component 1). It holds almost no static configuration by design — trunks are
# provisioned at runtime over ARI (implementation.md feature 11) — so this
# image is a single stage: a pinned upstream Asterisk build plus the small
# fixed set of config files the walking skeleton needs (feature 9).
#
# Base image: andrius/asterisk, chosen because it ships a production-built
# Asterisk with PJSIP, ARI, and the WebSocket transport already compiled in
# (menuselect enables chan_pjsip/res_pjsip*/res_rtp_asterisk; res_ari and
# res_http_websocket build by default since their only dependency,
# libjansson, is present) across both linux/amd64 and linux/arm64. Pinned to
# an exact version+distro tag (not a floating major or `latest`) for
# reproducible builds; see documentation/dev/containers.md for how to move
# to a newer Asterisk release deliberately.
FROM andrius/asterisk:21.12.3_debian-trixie

# No Dockerfile ENV defaults for the SWITCHBOARD_* variables: `docker build`
# flags ENV-baked credentials (even this well-known sandbox default) as a
# layer-history secrets smell. Defaults instead live in
# docker-entrypoint.sh (bash parameter expansion), so the image is still
# self-sufficient run outside Compose (`docker run` style);
# docker-compose.yml overrides all of them to keep them in sync with
# switchboard-api and the published ports.

# Plain, non-templated config.
COPY engine/config/http.conf /etc/asterisk/http.conf
COPY engine/config/extensions.conf /etc/asterisk/extensions.conf

# PJSIP realtime plumbing (implementation.md feature 11, Decision D1): also
# plain/non-templated, since none of these three reference an environment
# variable — only the shared dbfile path, which is a fixed in-container mount
# point (see docker-compose.yml and documentation/dev/engine-provisioning.md).
COPY engine/config/sorcery.conf /etc/asterisk/sorcery.conf
COPY engine/config/extconfig.conf /etc/asterisk/extconfig.conf
COPY engine/config/res_config_sqlite3.conf /etc/asterisk/res_config_sqlite3.conf

# Templated config, rendered from environment at container start (see
# docker-entrypoint.sh) so the RTP range and advertised address have exactly
# one source of truth: docker-compose.yml's environment.
COPY engine/config/ari.conf.template /etc/asterisk/ari.conf.template
COPY engine/config/pjsip.conf.template /etc/asterisk/pjsip.conf.template
COPY engine/config/rtp.conf.template /etc/asterisk/rtp.conf.template

# gettext-base (envsubst) already ships in the base image's runtime stage;
# only our own rendering step needs adding.
COPY engine/docker-entrypoint.sh /usr/local/bin/switchboard-entrypoint.sh
USER root
RUN chmod +x /usr/local/bin/switchboard-entrypoint.sh \
    && chown asterisk:asterisk /etc/asterisk/*.conf /etc/asterisk/*.conf.template \
    # Mount point for the shared SQLite file (docker-compose.yml mounts the
    # switchboard-db-data volume here — the SAME volume switchboard-api
    # mounts at /app/data, per Decision D2's one file). Deliberately
    # world-writable (0777), not chowned to the asterisk user: the API
    # container writes the actual file as its own non-root "switchboard"
    # user (uid 1001, apps/server/Dockerfile), which has no shared uid/gid
    # with this image's "asterisk" user (uid 1000) and no bind-mount
    # entrypoint reconciles the two. Docker seeds a fresh named volume's
    # permissions from whichever container's image directory first mounts
    # an empty volume (verified empirically while building this feature);
    # this image is guaranteed to mount first (switchboard-api's
    # docker-compose.yml depends_on: condition: service_healthy waits on
    # this engine), so baking 0777 in here is what makes the volume writable
    # by both containers regardless of mount order. This directory is
    # intentionally NOT under /var/lib/asterisk: the upstream entrypoint
    # (/usr/local/bin/entrypoint.sh, execed below) recursively chowns that
    # path (and a fixed list of others) to the PUID/PGID-adapted asterisk
    # user on every container start, which would silently undo this and
    # lock switchboard-api back out. Acceptable for a localhost, single-user,
    # no-auth sandbox (CLAUDE.md, "First version scope"); see
    # documentation/dev/engine-provisioning.md for the full reasoning.
    && mkdir -p /var/lib/switchboard/db \
    && chmod 0777 /var/lib/switchboard/db

# The base image's ENTRYPOINT (/usr/local/bin/entrypoint.sh) does the
# PUID/PGID adaptation and privilege drop; ours runs first to render the
# templates while still root, then execs straight into it.
ENTRYPOINT ["/usr/local/bin/switchboard-entrypoint.sh"]

# Docker resets an inherited CMD to empty as soon as a derived Dockerfile
# sets a new ENTRYPOINT (a documented but easy-to-miss interaction — see
# "Understand how CMD and ENTRYPOINT interact" in the Dockerfile reference).
# Without restating it here, `docker run switchboard-engine` with no
# explicit command starts our entrypoint script with no arguments, which
# execs nothing and exits 0 instantly — confirmed by hitting exactly that
# while testing this image. Kept byte-for-byte identical to the base
# image's own CMD.
CMD ["/usr/sbin/asterisk", "-vvvdddf", "-T", "-W", "-U", "asterisk", "-p"]

# EXPOSE is documentation only (Compose's `ports:` is what actually
# publishes anything); ARI + browser WebSocket signaling share one port.
EXPOSE 8088/tcp
EXPOSE 10000-10099/udp
