import { ReactNode } from 'react';
import { useAuth } from '../../auth/CognitoContext';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <section>
        <h1>Admin sign in</h1>
        <p>Sign in with your Cognito account to manage the CV data.</p>
        <button type="button" onClick={login}>
          Sign in
        </button>
      </section>
    );
  }

  return <>{children}</>;
}
