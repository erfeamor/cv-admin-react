import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Placeholder auth context. Swap the internals for the Cognito Hosted UI
 * redirect flow (or amazon-cognito-identity-js) once the user pool exists;
 * consumers only depend on { token, isAuthenticated, login, logout }.
 */
const CognitoContext = createContext(null);

export function CognitoProvider({ children }) {
  const [token, setToken] = useState(null);

  const value = useMemo(
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

export function useAuth() {
  const ctx = useContext(CognitoContext);
  if (!ctx) {
    throw new Error('useAuth must be used within a CognitoProvider');
  }
  return ctx;
}
