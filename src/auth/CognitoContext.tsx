import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

/**
 * Placeholder auth context. Swap the internals for the Cognito Hosted UI
 * redirect flow (or amazon-cognito-identity-js) once the user pool exists;
 * consumers only depend on { token, isAuthenticated, login, logout }.
 */
export interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (nextToken: string) => void;
  logout: () => void;
}

const CognitoContext = createContext<AuthContextValue | null>(null);

export function CognitoProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login: (nextToken) => setToken(nextToken),
      logout: () => setToken(null),
    }),
    [token],
  );

  return <CognitoContext.Provider value={value}>{children}</CognitoContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(CognitoContext);
  if (!ctx) {
    throw new Error('useAuth must be used within a CognitoProvider');
  }
  return ctx;
}
