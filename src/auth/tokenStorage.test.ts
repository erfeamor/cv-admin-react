import { clearToken, getStoredToken, storeToken } from './tokenStorage';

describe('tokenStorage', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('round-trips an unexpired token', () => {
    storeToken('jwt-abc', Date.now() + 60_000);
    expect(getStoredToken()).toBe('jwt-abc');
  });

  it('returns null for an expired token', () => {
    storeToken('jwt-abc', Date.now() - 1);
    expect(getStoredToken()).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(getStoredToken()).toBeNull();
  });

  it('clearToken removes both keys', () => {
    storeToken('jwt-abc', Date.now() + 60_000);
    clearToken();
    expect(getStoredToken()).toBeNull();
    expect(sessionStorage.getItem('cv-admin.token')).toBeNull();
    expect(sessionStorage.getItem('cv-admin.tokenExpiresAt')).toBeNull();
  });
});
