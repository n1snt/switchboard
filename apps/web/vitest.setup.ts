import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia, which the theme provider reads on mount.
// Default to the light preference; individual tests override window.matchMedia
// when they need to assert the dark branch.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom does not implement scrollTo, which TanStack Router calls during scroll
// restoration on navigation. A no-op keeps the router quiet in tests.
window.scrollTo = () => {};

// Node ships a real global WebSocket that would attempt a live network
// connection the moment a component mounts the events subscription. Replace it
// with an inert stub so component and router tests never touch the network; the
// ws hook's own test overrides this with a controllable fake.
class InertWebSocket {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  constructor(public readonly url: string) {}
  close(): void {}
  send(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}
globalThis.WebSocket = InertWebSocket as unknown as typeof WebSocket;

// jsdom does not implement ResizeObserver, which some Radix primitives (Switch,
// Select, Dialog) observe on mount. A no-op observer lets them render in tests.
class NoopResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = NoopResizeObserver;
