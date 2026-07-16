import { Route, Routes } from 'react-router-dom';
import { CognitoProvider } from './auth/CognitoContext';
import PeopleListPage from './pages/PeopleListPage';
import PersonFormPage from './pages/PersonFormPage';

export default function App() {
  return (
    <CognitoProvider>
      <Routes>
        <Route path="/" element={<PeopleListPage />} />
        <Route path="/people" element={<PeopleListPage />} />
        <Route path="/people/new" element={<PersonFormPage />} />
        <Route path="/people/:id" element={<PersonFormPage />} />
      </Routes>
    </CognitoProvider>
  );
}
