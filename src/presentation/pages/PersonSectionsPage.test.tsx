import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { usePeopleStore } from '../../store';
import { mockFetch } from '../../testing/mockFetch';
import PersonSectionsPage from './PersonSectionsPage';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/people/:id/sections" element={<PersonSectionsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PersonSectionsPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    usePeopleStore.setState({ people: [], selectedPerson: null, loading: false, error: null });
  });

  it('names the person and links to the four section routes', async () => {
    mockFetch((method, path) =>
      method === 'GET' && path === '/api/v1/people/7'
        ? { status: 200, body: { id: 7, fullName: 'Jane Doe', email: 'jane@example.com' } }
        : undefined,
    );

    renderAt('/people/7/sections');

    expect(await screen.findByRole('heading', { name: 'Jane Doe — CV sections' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'CV sections' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Experience' })).toHaveAttribute('href', '/people/7/experiences');
    expect(screen.getByRole('link', { name: 'Education' })).toHaveAttribute('href', '/people/7/educations');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/people/7/projects');
    expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('href', '/people/7/skills');
    expect(screen.getByRole('link', { name: 'Edit person details' })).toHaveAttribute('href', '/people/7');
  });

  it('shows an alert when the person fails to load', async () => {
    mockFetch(() => ({ status: 404, body: 'Not found' }));

    renderAt('/people/999/sections');

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load person');
  });
});
