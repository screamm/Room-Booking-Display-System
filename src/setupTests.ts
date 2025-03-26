// Polyfills för TextEncoder och TextDecoder
// import { TextEncoder, TextDecoder } from 'util';  // Kommentera ut problematiska importer
// Implementera våra egna mock-versioner som är kompatibla med förväntat type interface

// Mock TextEncoder
global.TextEncoder = function TextEncoder() {
  return {
    encode: (str: string): Uint8Array => new Uint8Array([]),
  };
} as any;

// Mock TextDecoder
global.TextDecoder = function TextDecoder() {
  return {
    decode: (): string => '',
  };
} as any;

// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mocka localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => {
      return store[key] || null;
    }),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mocka window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mocka ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mocka IntersectionObserver med mer fullständig implementation
global.IntersectionObserver = class MockIntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [0];
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as any;

// Tysta konsolvarningar under tester
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Rensa mocks efter varje test
afterEach(() => {
  jest.clearAllMocks();
});
