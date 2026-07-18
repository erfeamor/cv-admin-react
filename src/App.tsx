import { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { CognitoProvider, useAuth } from './auth/CognitoContext';
import PeopleListPage from './pages/PeopleListPage';
import PersonFormPage from './pages/PersonFormPage';

function AuthGate({ children }: { children: ReactNode }) {
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

export default function App() {
  return (
    <CognitoProvider>
      <AuthGate>
        <Routes>
          <Route path="/" element={<PeopleListPage />} />
          <Route path="/people" element={<PeopleListPage />} />
          <Route path="/people/new" element={<PersonFormPage />} />
          <Route path="/people/:id" element={<PersonFormPage />} />
        </Routes>
      </AuthGate>
    </CognitoProvider>
  );
}
