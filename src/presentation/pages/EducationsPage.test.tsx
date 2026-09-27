import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useEducationsStore } from '../../store';
import { mockFetch, recordedRequests } from '../../testing/mockFetch';
import EducationsPage from './EducationsPage';

const BASE = '/api/v1/people/7/educations';

const master = { id: 4, institution: 'UPM', degree: 'MSc', fieldOfStudy: null, startDate: '2021-09-01', endDate: null };
const bachelor = {
  id: 1,
  institution: 'UNED',
  degree: 'BSc',
  fieldOfStudy: 'Computer Science',
  startDate: '2015-09-01',
  endDate: '2019-06-30',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/people/7/educations']}>
      <Routes>
        <Route path="/people/:id/educations" element={<EducationsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EducationsPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    useEducationsStore.setState({ personId: null, items: [], loading: false, error: null });
  });

  it('lists the entries in server order', async () => {
    mockFetch((method, path) => (method === 'GET' && path === BASE ? { status: 200, body: [master, bachelor] } : undefined));

    renderPage();

    await screen.findByText(/MSc, UPM/);
    const rows = within(screen.getByRole('list', { name: 'Education entries' })).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/MSc, UPM/),
      expect.stringMatching(/BSc, UNED/),
    ]);
  });

  it('creates with POST, a blank field of study sent as null and a dated end', async () => {
    const fetchMock = mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [] };
      if (method === 'POST' && path === BASE) return { status: 201, body: { ...bachelor, id: 9, fieldOfStudy: null } };
      return undefined;
    });

    renderPage();
    fireEvent.change(screen.getByLabelText('Institution'), { target: { value: 'UNED' } });
    fireEvent.change(screen.getByLabelText('Degree'), { target: { value: 'BSc' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2015-09-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2019-06-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(recordedRequests(fetchMock, 'POST')).toHaveLength(1));
    expect(recordedRequests(fetchMock, 'POST')[0].body).toEqual({
      institution: 'UNED',
      degree: 'BSc',
      fieldOfStudy: null,
      startDate: '2015-09-01',
      endDate: '2019-06-30',
    });
  });

  it('deletes with DELETE and drops the row', async () => {
    let listed = [master, bachelor];
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: listed };
      if (method === 'DELETE' && path === `${BASE}/4`) {
        listed = [bachelor];
        return { status: 204 };
      }
      return undefined;
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete MSc, UPM' }));

    await waitFor(() => expect(screen.queryByText(/MSc, UPM/)).not.toBeInTheDocument());
  });

  it('a DELETE answered 404 shows an error and leaves no stale row', async () => {
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [master, bachelor] };
      if (method === 'DELETE') return { status: 404, body: 'Not found' };
      return undefined;
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete MSc, UPM' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This education entry no longer exists');
    expect(screen.queryByText(/MSc, UPM/)).not.toBeInTheDocument();
  });

  it('renders a 400 inline', async () => {
    mockFetch((method, path) => {
      if (method === 'GET' && path === BASE) return { status: 200, body: [master] };
      if (method === 'PUT') return { status: 400, body: { status: 400, error: 'Bad Request' } };
      return undefined;
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit MSc, UPM' }));
    expect(screen.getByRole('checkbox', { name: 'Current' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('rejected this education entry as invalid (400)');
    expect(screen.getByText(/MSc, UPM/)).toBeInTheDocument();
  });
});
