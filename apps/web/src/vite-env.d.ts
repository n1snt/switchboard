/// <reference types="vite/client" />

// Softphone SIP session overrides (features/softphone/config.ts). All optional;
// sensible localhost defaults apply when unset.
interface ImportMetaEnv {
  readonly VITE_SIP_WS_URL?: string;
  readonly VITE_SIP_EXTENSION?: string;
  readonly VITE_SIP_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
