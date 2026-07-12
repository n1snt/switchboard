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
