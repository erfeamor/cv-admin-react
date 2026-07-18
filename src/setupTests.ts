import '@testing-library/jest-dom';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';

// jsdom ships neither WebCrypto nor TextEncoder; the PKCE helpers need both.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

// Vite env values for the code under test (see babel.config.cjs: import.meta
// .env is rewritten to process.env in Jest).
process.env.VITE_COGNITO_USER_POOL_ID = 'eu-west-3_test';
process.env.VITE_COGNITO_CLIENT_ID = 'test-client-id';
process.env.VITE_COGNITO_HOSTED_UI_DOMAIN = 'auth.test.example.com';
