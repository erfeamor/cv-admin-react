// The admin side of the stack-wide AUTH_ENABLED toggle (meta CLAUDE.md):
// only an explicit "false" bypasses Cognito, so production builds default to
// auth on. Read lazily so Jest tests can flip it per test case.
export function isAuthEnabled(): boolean {
  return import.meta.env.VITE_AUTH_ENABLED !== 'false';
}

export const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  hostedUiDomain: import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN,
};

// Must exactly match a callback URL registered on the Cognito app client
// (cv-infra auth.tf). The app is always served under /admin/ (vite.config.ts
// base), so the callback is that prefix regardless of the current route.
export function redirectUri(): string {
  return `${window.location.origin}/admin/`;
}
