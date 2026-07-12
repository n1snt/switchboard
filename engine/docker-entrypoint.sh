#!/bin/bash
# Copyright 2026 Nishant Bhandari
# SPDX-License-Identifier: Apache-2.0
#
# Renders the engine's *.conf.template files (ari.conf, pjsip.conf, rtp.conf)
# with envsubst, then hands off to the base andrius/asterisk image's own
# entrypoint, which adapts the `asterisk` user to PUID/PGID and execs the
# CMD (see documentation/dev/containers.md).
#
# Only files ending in .conf.template are touched, and only the variable
# names listed below are substituted (envsubst's variable-list form) rather
# than every `$...` in the file. extensions.conf and http.conf are plain
# .conf files with no .template counterpart, so dialplan variables such as
# ${EXTEN} are never at risk of being mistaken for shell variables and
# blanked out.

set -euo pipefail

# Defaults live here (bash parameter expansion), not as Dockerfile ENV
# instructions, on purpose: `docker build` flags `ENV`-baked credentials
# (even a well-known sandbox default like this one) as a layer-history
# secrets smell. docker-compose.yml overrides all five for a real run; this
# is only the fallback for a bare `docker run` of the image.
: "${SWITCHBOARD_ARI_USERNAME:=switchboard}"
: "${SWITCHBOARD_ARI_PASSWORD:=switchboard}"
: "${SWITCHBOARD_ADVERTISED_ADDRESS:=127.0.0.1}"
: "${SWITCHBOARD_RTP_START:=10000}"
: "${SWITCHBOARD_RTP_END:=10099}"
export SWITCHBOARD_ARI_USERNAME SWITCHBOARD_ARI_PASSWORD SWITCHBOARD_ADVERTISED_ADDRESS SWITCHBOARD_RTP_START SWITCHBOARD_RTP_END

VARS='${SWITCHBOARD_ARI_USERNAME} ${SWITCHBOARD_ARI_PASSWORD} ${SWITCHBOARD_ADVERTISED_ADDRESS} ${SWITCHBOARD_RTP_START} ${SWITCHBOARD_RTP_END}'

for template in /etc/asterisk/*.conf.template; do
  [ -e "$template" ] || continue
  envsubst "$VARS" < "$template" > "${template%.template}"
done

exec /usr/local/bin/entrypoint.sh "$@"
