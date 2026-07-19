import { ReactNode } from 'react';
import { useAuth } from '../../auth/CognitoContext';
import styles from './AuthGate.module.css';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <section className={styles.gate}>
        <h1>Admin sign in</h1>
        <p>Sign in with your Cognito account to manage the CV data.</p>
        <button type="button" className={styles.signIn} onClick={login}>
          Sign in
        </button>
      </section>
    );
  }

  return <>{children}</>;
}
