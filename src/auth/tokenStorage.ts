// Single owner of the session token keys. CognitoContext writes through here,
// and the http layer reads the token through getStoredToken without touching
// React context — that seam is what lets the data layer stay framework-free.

const TOKEN_KEY = 'cv-admin.token';
const EXPIRES_AT_KEY = 'cv-admin.tokenExpiresAt';

export function storeToken(token: string, expiresAt: number): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRES_AT_KEY, String(expiresAt));
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_AT_KEY);
}

export function getStoredToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(sessionStorage.getItem(EXPIRES_AT_KEY));
  return token && expiresAt > Date.now() ? token : null;
}
