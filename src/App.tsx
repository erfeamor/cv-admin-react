import { Route, Routes } from 'react-router-dom';
import { CognitoProvider } from './auth/CognitoContext';
import AuthGate from './presentation/components/AuthGate';
import EducationsPage from './presentation/pages/EducationsPage';
import ExperiencesPage from './presentation/pages/ExperiencesPage';
import PeopleListPage from './presentation/pages/PeopleListPage';
import PersonFormPage from './presentation/pages/PersonFormPage';
import PersonSectionsPage from './presentation/pages/PersonSectionsPage';
import ProjectsPage from './presentation/pages/ProjectsPage';
import SkillsPage from './presentation/pages/SkillsPage';

export default function App() {
  return (
    <CognitoProvider>
      <AuthGate>
        <Routes>
          <Route path="/" element={<PeopleListPage />} />
          <Route path="/people" element={<PeopleListPage />} />
          <Route path="/people/new" element={<PersonFormPage />} />
          <Route path="/people/:id" element={<PersonFormPage />} />
          <Route path="/people/:id/sections" element={<PersonSectionsPage />} />
          <Route path="/people/:id/experiences" element={<ExperiencesPage />} />
          <Route path="/people/:id/educations" element={<EducationsPage />} />
          <Route path="/people/:id/projects" element={<ProjectsPage />} />
          <Route path="/people/:id/skills" element={<SkillsPage />} />
        </Routes>
      </AuthGate>
    </CognitoProvider>
  );
}
