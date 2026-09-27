import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import {
  useEducationsStore,
  useExperiencesStore,
  usePeopleStore,
  useProjectsStore,
  useSkillsStore,
} from './store';
import { mockFetch } from './testing/mockFetch';

const jane = { id: 7, fullName: 'Jane Doe', email: 'jane@example.com' };

function signIn() {
  sessionStorage.setItem('cv-admin.token', 'test-token');
  sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() + 60_000));
}

function serveEmptySections() {
  return mockFetch((method, path) => {
    if (method !== 'GET') return undefined;
    if (path === '/api/v1/people/7') return { status: 200, body: jane };
    if (/^\/api\/v1\/people\/7\/(experiences|educations|projects|skills)$/.test(path)) return { status: 200, body: [] };
    if (path === '/api/v1/skills') return { status: 200, body: [] };
    return undefined;
  });
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App section routes', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    sessionStorage.clear();
    usePeopleStore.setState({ people: [], selectedPerson: null, loading: false, error: null });
    useExperiencesStore.setState({ personId: null, items: [], loading: false, error: null });
    useEducationsStore.setState({ personId: null, items: [], loading: false, error: null });
    useProjectsStore.setState({ personId: null, items: [], loading: false, error: null });
    useSkillsStore.setState({ personId: null, catalog: [], assignments: [], loading: false, error: null });
  });

  it.each([
    ['/people/7/sections', 'Jane Doe — CV sections'],
    ['/people/7/experiences', 'Experience'],
    ['/people/7/educations', 'Education'],
    ['/people/7/projects', 'Projects'],
    ['/people/7/skills', 'Skills'],
  ])('renders %s', async (path, heading) => {
    signIn();
    serveEmptySections();

    renderAt(path);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('reaches the hub from the person edit page', async () => {
    signIn();
    serveEmptySections();

    renderAt('/people/7');
    fireEvent.click(await screen.findByRole('link', { name: 'CV sections' }));

    expect(await screen.findByRole('heading', { name: 'Jane Doe — CV sections' })).toBeInTheDocument();
  });
});
