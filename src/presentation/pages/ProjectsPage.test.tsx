import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useProjectsStore } from '../../store';
import { mockFetch, recordedRequests } from '../../testing/mockFetch';
import ProjectsPage from './ProjectsPage';

const BASE = '/api/v1/people/7/projects';

const dated = { id: 1, name: 'cv-project', description: null, repoUrl: null, startDate: '2026-07-01', endDate: null };
// Undated projects come last from the server; the page must keep them there.
const undated = { id: 2, name: 'side-quest', description: 'Toy', repoUrl: null, startDate: null, endDate: '2025-01-01' };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/people/7/projects']}>
      <Routes>
        <Route path="/people/:id/projects" element={<ProjectsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectsPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    useProjectsStore.setState({ personId: null, items: [], loading: false, error: null, notice: null });
  });

  it('lists the entries in server order, undated last', async () => {
    mockFetch((method, path) => (method === 'GET' && path === BASE ? { status: 200, body: [dated, undated] } : undefined));

    renderPage();

    await screen.findByText('cv-project');
    const rows = within(screen.getByRole('list', { name: 'Projects entries' })).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^cv-project/),
      expect.stringMatching(/^side-quest/),
    ]);
  });

  it('creates an undated project with POST: only the name, every blank optional (both dates too) sent as null', async () => {
    const fetchMock = mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [] };
      if (method === 'POST' && path === BASE) return { status: 201, body: { ...dated, id: 5, name: 'new', startDate: null } };
      return undefined;
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(recordedRequests(fetchMock, 'POST')).toHaveLength(1));
    expect(recordedRequests(fetchMock, 'POST')[0].body).toEqual({
      name: 'new',
      description: null,
      repoUrl: null,
      startDate: null,
      endDate: null,
    });
  });

  it('deletes with DELETE and drops the row', async () => {
    let listed = [dated, undated];
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: listed };
      if (method === 'DELETE' && path === `${BASE}/2`) {
        listed = [dated];
        return { status: 204 };
      }
      return undefined;
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete side-quest' }));

    await waitFor(() => expect(screen.queryByText('side-quest')).not.toBeInTheDocument());
  });

  it('a PUT answered 404 shows an error and leaves no stale row', async () => {
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [dated, undated] };
      if (method === 'PUT') return { status: 404, body: 'Not found' };
      return undefined;
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit side-quest' }));
    expect(screen.getByRole('checkbox', { name: 'Current' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This project no longer exists');
    expect(screen.queryByText('side-quest')).not.toBeInTheDocument();
  });

  it('an undated project shows no period, is not pre-checked Current, and saves both dates as null', async () => {
    const bare = { id: 3, name: 'bare', description: null, repoUrl: null, startDate: null, endDate: null };
    const fetchMock = mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [dated, bare] };
      if (method === 'PUT' && path === `${BASE}/3`) return { status: 200, body: { ...bare, name: 'bare 2' } };
      return undefined;
    });

    renderPage();
    const row = (await screen.findByText('bare')).closest('li') as HTMLElement;
    expect(row.textContent).not.toMatch(/current/i);
    expect(within(screen.getByText('cv-project').closest('li') as HTMLElement).getByText('2026-07-01 – current')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit bare' }));
    expect(screen.getByRole('checkbox', { name: 'Current' })).not.toBeChecked();
    expect(screen.getByLabelText('Start date')).not.toHaveAttribute('aria-required');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'bare 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(recordedRequests(fetchMock, 'PUT')).toHaveLength(1));
    expect(recordedRequests(fetchMock, 'PUT')[0].body).toMatchObject({ name: 'bare 2', startDate: null, endDate: null });
  });

  it('Current without a start date is refused client-side', async () => {
    const fetchMock = mockFetch((method, path) => (method === 'GET' && path === BASE ? { status: 200, body: [] } : undefined));

    renderPage();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Current' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A current project needs a start date.');
    expect(recordedRequests(fetchMock, 'POST')).toHaveLength(0);
  });

  it('renders a 400 inline', async () => {
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [] };
      if (method === 'POST') return { status: 400, body: { status: 400, error: 'Bad Request' } };
      return undefined;
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'x'.repeat(200) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('rejected this project as invalid (400)');
  });
});
