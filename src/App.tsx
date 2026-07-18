import { Route, Routes } from 'react-router-dom';
import { CognitoProvider } from './auth/CognitoContext';
import AuthGate from './presentation/components/AuthGate';
import PeopleListPage from './presentation/pages/PeopleListPage';
import PersonFormPage from './presentation/pages/PersonFormPage';

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
