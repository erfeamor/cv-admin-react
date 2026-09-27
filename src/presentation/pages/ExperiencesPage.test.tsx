import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useExperiencesStore } from '../../store';
import { mockFetch, recordedRequests } from '../../testing/mockFetch';
import ExperiencesPage from './ExperiencesPage';

const BASE = '/api/v1/people/7/experiences';

// Served newest-first with a higher id first: any client re-sort by id or
// date-ascending would reorder these.
const current = {
  id: 2,
  company: 'Initech',
  role: 'Lead',
  location: null,
  startDate: '2024-01-01',
  endDate: null,
  description: null,
};
const past = {
  id: 1,
  company: 'ACME',
  role: 'Backend Engineer',
  location: 'Remote',
  startDate: '2020-01-01',
  endDate: '2023-12-31',
  description: 'APIs',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/people/7/experiences']}>
      <Routes>
        <Route path="/people/:id/experiences" element={<ExperiencesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function rowLabels() {
  return within(screen.getByRole('list', { name: 'Experience entries' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
}

async function fillRequired() {
  fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Globex' } });
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'CTO' } });
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2025-02-01' } });
}

describe('ExperiencesPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    sessionStorage.clear();
    jest.restoreAllMocks();
    useExperiencesStore.setState({ personId: null, items: [], loading: false, error: null, notice: null });
  });

  it('lists the entries in server order — no client sort', async () => {
    mockFetch((method, path) => (method === 'GET' && path === BASE ? { status: 200, body: [current, past] } : undefined));

    renderPage();

    await screen.findByText(/Lead at Initech/);
    expect(rowLabels()[0]).toMatch(/Lead at Initech/);
    expect(rowLabels()[1]).toMatch(/Backend Engineer at ACME/);
  });

  it('creates with POST: "Current" sends endDate null, blank optionals null, with the token', async () => {
    sessionStorage.setItem('cv-admin.token', 'test-token');
    sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() + 60_000));
    const created = { id: 3, company: 'Globex', role: 'CTO', location: null, startDate: '2025-02-01', endDate: null, description: null };
    let listed = [current, past];
    const fetchMock = mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: listed };
      if (method === 'POST' && path === BASE) {
        listed = [created, current, past];
        return { status: 201, body: created };
      }
      return undefined;
    });

    renderPage();
    await screen.findByText(/Lead at Initech/);
    await fillRequired();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Current' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText(/CTO at Globex/);
    const [post] = recordedRequests(fetchMock, 'POST');
    expect(post.body).toEqual({
      company: 'Globex',
      role: 'CTO',
      location: null,
      startDate: '2025-02-01',
      endDate: null,
      description: null,
    });
    expect(post.headers.Authorization).toBe('Bearer test-token');
    expect(rowLabels()[0]).toMatch(/CTO at Globex/);
    expect(screen.getByLabelText('Company')).toHaveValue('');
  });

  it('refuses a blank end date without "Current" — never sent as ongoing', async () => {
    const fetchMock = mockFetch((method, path) => (method === 'GET' && path === BASE ? { status: 200, body: [] } : undefined));

    renderPage();
    await screen.findByText('No experience entries yet.'); // forms stay disabled until the load settles
    await fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('End date is required unless "Current" is checked.');
    expect(recordedRequests(fetchMock, 'POST')).toHaveLength(0);
  });

  it('editing a null-endDate row pre-checks "Current" and PUTs endDate null', async () => {
    const fetchMock = mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [current, past] };
      if (method === 'PUT' && path === `${BASE}/2`) return { status: 200, body: { ...current, role: 'Director' } };
      return undefined;
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Lead at Initech' }));

    expect(screen.getByRole('heading', { name: 'Edit experience' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Current' })).toBeChecked();
    expect(screen.getByLabelText('End date')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Director' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(recordedRequests(fetchMock, 'PUT')).toHaveLength(1));
    expect(recordedRequests(fetchMock, 'PUT')[0].body).toMatchObject({ role: 'Director', endDate: null, location: null });
  });

  it('deletes with DELETE and drops the row', async () => {
    let listed = [current, past];
    const fetchMock = mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: listed };
      if (method === 'DELETE' && path === `${BASE}/1`) {
        listed = [current];
        return { status: 204 };
      }
      return undefined;
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Backend Engineer at ACME' }));

    await waitFor(() => expect(screen.queryByText(/Backend Engineer at ACME/)).not.toBeInTheDocument());
    expect(recordedRequests(fetchMock, 'DELETE')).toHaveLength(1);
    expect(window.confirm).toHaveBeenCalled();
  });

  it('does not delete when the confirmation is declined', async () => {
    (window.confirm as jest.Mock).mockReturnValue(false);
    const fetchMock = mockFetch((method, path) => (method === 'GET' && path === BASE ? { status: 200, body: [past] } : undefined));

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Backend Engineer at ACME' }));

    expect(recordedRequests(fetchMock, 'DELETE')).toHaveLength(0);
    expect(screen.getByText(/Backend Engineer at ACME/)).toBeInTheDocument();
  });

  it('renders a 400 inline as a readable error and keeps the draft', async () => {
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [] };
      if (method === 'POST' && path === BASE) return { status: 400, body: { status: 400, error: 'Bad Request', path: BASE } };
      return undefined;
    });

    renderPage();
    await screen.findByText('No experience entries yet.'); // forms stay disabled until the load settles
    await fillRequired();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Current' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server rejected this experience as invalid (400). Check the required fields and dates.',
    );
    expect(screen.getByLabelText('Company')).toHaveValue('Globex');
  });

  it('a PUT answered 404 (deleted meanwhile) shows an error and leaves no stale row', async () => {
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [current, past] };
      if (method === 'PUT' && path === `${BASE}/1`) return { status: 404, body: 'Not found' };
      return undefined;
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Backend Engineer at ACME' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This experience no longer exists');
    expect(screen.queryByText(/Backend Engineer at ACME/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New experience' })).toBeInTheDocument();
  });

  it('a POST answered 404 (person deleted) says so and keeps the draft', async () => {
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [past] };
      if (method === 'POST' && path === BASE) return { status: 404, body: 'Not found' };
      return undefined;
    });

    renderPage();
    await screen.findByText(/Backend Engineer at ACME/);
    await fillRequired();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Current' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This person no longer exists — it was probably deleted elsewhere, so the experience could not be saved.',
    );
    expect(screen.getByLabelText('Company')).toHaveValue('Globex');
    expect(screen.getByRole('checkbox', { name: 'Current' })).toBeChecked();
    expect(screen.getByText(/Backend Engineer at ACME/)).toBeInTheDocument();
  });

  it('marks Start date as required', async () => {
    mockFetch((method, path) => (method === 'GET' && path === BASE ? { status: 200, body: [] } : undefined));

    renderPage();

    expect(screen.getByLabelText('Start date')).toHaveAttribute('aria-required', 'true');
    await screen.findByText('No experience entries yet.');
  });

  it('shows an alert when the list fails to load', async () => {
    mockFetch(() => ({ status: 500 }));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load experience');
  });
});
