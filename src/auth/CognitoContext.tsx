import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { redirectTo } from './browser';
import { cognitoConfig, isAuthEnabled, redirectUri } from './cognitoConfig';
import { generateCodeChallenge, generateCodeVerifier } from './pkce';
import { clearToken, getStoredToken, storeToken } from './tokenStorage';

/**
 * Cognito Hosted UI auth via authorization code + PKCE (the app client has no
 * secret). login() redirects to the Hosted UI; Cognito redirects back to
 * redirectUri() with ?code=, which the provider exchanges for an access token.
 * Consumers only depend on { token, isAuthenticated, login, logout }.
 */
export interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const VERIFIER_KEY = 'cv-admin.pkceVerifier';

const CognitoContext = createContext<AuthContextValue | null>(null);

async function startLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: redirectUri(),
    code_challenge: await generateCodeChallenge(verifier),
    code_challenge_method: 'S256',
  });
  redirectTo(`https://${cognitoConfig.hostedUiDomain}/oauth2/authorize?${params.toString()}`);
}

async function exchangeCode(
  code: string,
  verifier: string,
): Promise<{ token: string; expiresAt: number }> {
  const response = await fetch(`https://${cognitoConfig.hostedUiDomain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: cognitoConfig.clientId,
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed with status ${response.status}`);
  }

  const data: { access_token: string; expires_in: number } = await response.json();
  return { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
}

export function CognitoProvider({ children }: { children: ReactNode }) {
  const authEnabled = isAuthEnabled();
  const [token, setToken] = useState<string | null>(getStoredToken);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!authEnabled || token || !code || !verifier) {
      return;
    }

    // Removing the verifier before the exchange makes the effect idempotent:
    // a re-run (StrictMode double-invoke) finds no verifier and skips instead
    // of spending the single-use code twice.
    sessionStorage.removeItem(VERIFIER_KEY);
    exchangeCode(code, verifier)
      .then(({ token: nextToken, expiresAt }) => {
        storeToken(nextToken, expiresAt);
        window.history.replaceState({}, '', window.location.pathname);
        setToken(nextToken);
      })
      .catch(() => {
        // Failed exchange leaves the user on the sign-in screen to retry.
      });
  }, [authEnabled, token]);

  const value = useMemo<AuthContextValue>(() => {
    if (!authEnabled) {
      // Auth bypassed: requests go out with no Authorization header, which
      // only works against a domain service running AUTH_ENABLED=false.
      return {
        token: null,
        isAuthenticated: true,
        login: () => undefined,
        logout: () => undefined,
      };
    }
    return {
      token,
      isAuthenticated: Boolean(token),
      login: () => {
        void startLogin();
      },
      logout: () => {
        clearToken();
        setToken(null);
        const params = new URLSearchParams({
          client_id: cognitoConfig.clientId,
          logout_uri: redirectUri(),
        });
        redirectTo(`https://${cognitoConfig.hostedUiDomain}/logout?${params.toString()}`);
      },
    };
  }, [authEnabled, token]);

  return <CognitoContext.Provider value={value}>{children}</CognitoContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(CognitoContext);
  if (!ctx) {
    throw new Error('useAuth must be used within a CognitoProvider');
  }
  return ctx;
}
