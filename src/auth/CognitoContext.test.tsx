import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CognitoProvider, useAuth } from './CognitoContext';
import { redirectTo } from './browser';

jest.mock('./browser', () => ({ redirectTo: jest.fn() }));

function Probe() {
  const { token, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <p>{isAuthenticated ? `token:${token}` : 'anonymous'}</p>
      <button type="button" onClick={login}>
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  );
}

describe('CognitoProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    sessionStorage.clear();
    window.history.replaceState({}, '', '/admin/');
    jest.clearAllMocks();
  });

  it('starts unauthenticated', () => {
    render(
      <CognitoProvider>
        <Probe />
      </CognitoProvider>,
    );

    expect(screen.getByText('anonymous')).toBeInTheDocument();
  });

  it('login stores a PKCE verifier and redirects to the Hosted UI', async () => {
    render(
      <CognitoProvider>
        <Probe />
      </CognitoProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(redirectTo).toHaveBeenCalledTimes(1));
    const url = new URL((redirectTo as jest.Mock).mock.calls[0][0]);
    expect(url.origin).toBe('https://auth.test.example.com');
    expect(url.pathname).toBe('/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost/admin/');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(sessionStorage.getItem('cv-admin.pkceVerifier')).toBeTruthy();
  });

  it('exchanges the callback code for a token and cleans the URL', async () => {
    sessionStorage.setItem('cv-admin.pkceVerifier', 'test-verifier');
    window.history.replaceState({}, '', '/admin/?code=auth-code-123');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'jwt-abc', expires_in: 3600 }),
    });

    render(
      <CognitoProvider>
        <Probe />
      </CognitoProvider>,
    );

    expect(await screen.findByText('token:jwt-abc')).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.test.example.com/oauth2/token',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = (global.fetch as jest.Mock).mock.calls[0][1].body as string;
    const params = new URLSearchParams(body);
    expect(params.get('grant_type')).toBe('authorization_code');
    expect(params.get('code')).toBe('auth-code-123');
    expect(params.get('code_verifier')).toBe('test-verifier');
    expect(params.get('redirect_uri')).toBe('http://localhost/admin/');

    expect(window.location.search).toBe('');
    expect(sessionStorage.getItem('cv-admin.token')).toBe('jwt-abc');
    expect(sessionStorage.getItem('cv-admin.pkceVerifier')).toBeNull();
  });

  it('restores an unexpired token from sessionStorage', () => {
    sessionStorage.setItem('cv-admin.token', 'stored-token');
    sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() + 60_000));

    render(
      <CognitoProvider>
        <Probe />
      </CognitoProvider>,
    );

    expect(screen.getByText('token:stored-token')).toBeInTheDocument();
  });

  it('ignores an expired stored token', () => {
    sessionStorage.setItem('cv-admin.token', 'stale-token');
    sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() - 1));

    render(
      <CognitoProvider>
        <Probe />
      </CognitoProvider>,
    );

    expect(screen.getByText('anonymous')).toBeInTheDocument();
  });

  describe('with VITE_AUTH_ENABLED=false', () => {
    beforeEach(() => {
      process.env.VITE_AUTH_ENABLED = 'false';
    });

    afterEach(() => {
      delete process.env.VITE_AUTH_ENABLED;
    });

    it('reports authenticated without a token', () => {
      render(
        <CognitoProvider>
          <Probe />
        </CognitoProvider>,
      );

      expect(screen.getByText('token:null')).toBeInTheDocument();
    });

    it('login and logout never touch the Hosted UI', () => {
      render(
        <CognitoProvider>
          <Probe />
        </CognitoProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'login' }));
      fireEvent.click(screen.getByRole('button', { name: 'logout' }));

      expect(redirectTo).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('cv-admin.pkceVerifier')).toBeNull();
    });

    it('does not exchange a callback code', () => {
      sessionStorage.setItem('cv-admin.pkceVerifier', 'test-verifier');
      window.history.replaceState({}, '', '/admin/?code=auth-code-123');
      global.fetch = jest.fn();

      render(
        <CognitoProvider>
          <Probe />
        </CognitoProvider>,
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('logout clears the session and redirects to the Hosted UI logout', () => {
    sessionStorage.setItem('cv-admin.token', 'stored-token');
    sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() + 60_000));

    render(
      <CognitoProvider>
        <Probe />
      </CognitoProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));

    expect(screen.getByText('anonymous')).toBeInTheDocument();
    expect(sessionStorage.getItem('cv-admin.token')).toBeNull();
    const url = new URL((redirectTo as jest.Mock).mock.calls[0][0]);
    expect(url.pathname).toBe('/logout');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('logout_uri')).toBe('http://localhost/admin/');
  });
});
