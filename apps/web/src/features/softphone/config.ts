// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// Resolves how the browser softphone registers to the engine. The SIP signaling
// WebSocket is a second, direct origin (not proxied through the dashboard's
// nginx — see apps/web/nginx.conf and engine/config/http.conf), so by default it
// points at the engine's published ws:// port on the page's own host. The
// softphone registers as one of the engine's static WebRTC endpoints
// (engine/config/pjsip.conf.template); which one is pickable with `?ext=` so two
// browser tabs can be 1001 and 1002 for a browser-to-browser call. Everything
// here is overridable by build-time env for non-localhost setups.

/** The subset of `import.meta.env` this reads. */
export interface SoftphoneEnv {
  VITE_SIP_WS_URL?: string;
  VITE_SIP_EXTENSION?: string;
  VITE_SIP_PASSWORD?: string;
}

/** The subset of `window.location` this reads. */
export interface SoftphoneLocation {
  protocol: string;
  hostname: string;
  search: string;
}

export interface SoftphoneConfig {
  /** The engine's SIP-over-WebSocket URL, e.g. ws://localhost:8088/ws. */
  server: string;
  /** SIP domain used to build request URIs for a dialled extension/number. */
  domain: string;
  /** The endpoint the softphone registers as, e.g. 1001. */
  extension: string;
  /** The softphone's Address of Record, e.g. sip:1001@localhost. */
  aor: string;
  authorizationUsername: string;
  authorizationPassword: string;
  displayName: string;
}

/** Default engine SIP-over-WebSocket port (Asterisk http.conf bindport). */
const ENGINE_WS_PORT = 8088;

export function resolveSoftphoneConfig(
  location: SoftphoneLocation,
  env: SoftphoneEnv,
): SoftphoneConfig {
  const extension =
    new URLSearchParams(location.search).get('ext') ??
    env.VITE_SIP_EXTENSION ??
    '1001';
  const password = env.VITE_SIP_PASSWORD ?? `switchboard${extension}`;
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  const server =
    env.VITE_SIP_WS_URL ??
    `${scheme}://${location.hostname}:${String(ENGINE_WS_PORT)}/ws`;
  const domain = new URL(server).hostname;

  return {
    server,
    domain,
    extension,
    aor: `sip:${extension}@${domain}`,
    authorizationUsername: extension,
    authorizationPassword: password,
    displayName: `Switchboard ${extension}`,
  };
}
